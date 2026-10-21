/**
 * SPEC 63 DO — dictionary-only light cards (VESUM lemmas, r2u words, Plast headwords that no corpus text attests). Fixture-level: no built data needed.
 * Owner decision 2026-10-17: «увімкнути легкі картки «лише словник» для VESUM і r2u, щоб покриття було як у Гороха, а наша перевага (докази, дати, правила) лишилася видимою на кожній картці».
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { buildCv, writeCv, type DictCtx } from '../pipelines/build-cv.ts'
import { lemmaLines } from '../pipelines/vesum.ts'
import { buildDictRows, buildRows, coverageCounts, dxShardOf, planShards } from '../pipelines/build-parts.ts'
import { CV_BUCKETS, DICT_STATUS, buildCardIndex, cardMap, dictInfo, dictSources, isDictOnly, lk, shardsOfCv, type CvEntry } from '../core/cv.ts'
import { BUCKETS } from '../core/shard.ts'
import { IX_GZ_MAX, dxUrl, ixName, ixUrl } from '../core/parts.ts'
import { queryKeys } from '../src/lib/search.ts'
import { ixCards, searchDict, searchRemote } from '../src/lib/parts.ts'
import { loadCv } from '../src/lib/cardIndex.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const tok = (raw: string, loc: string) => ({ raw, loc, s: 0 })
const dictW = (id: string, ...t: [string, string][]) => ({ id, witnessType: 'dictionary' as const, tokens: t.map(([r, l]) => tok(r, l)) })
const textW = (id: string, ...t: string[]) => ({ id, witnessType: 'text' as never, tokens: t.map((r, i) => tok(r, 'p' + i)) })
const vesum = (...e: [string, string][]) => new Map(e.map(([w, t]) => [lk(w), [w, t] as [string, string]]))
const noLookup = () => undefined
const ctx = (v: Map<string, [string, string]>, owned: string[] = [], attested: string[] = []): DictCtx => ({ vesum: v, owned: new Set(owned.map(lk)), attested: new Set(attested.map(lk)) })
const byKey = (r: { entries: [string, CvEntry][] }) => new Map(r.entries)

describe('DO-1 every VESUM lemma and r2u word without a corpus attestation gets a dictionary-only card', () => {
  it('DO-1 a VESUM-only lemma gets a dictOnly card with no dates, no attestation lines and f = 0', () => {
    const r = buildCv([], noLookup, new Set(), () => false, undefined, undefined, ctx(vesum(['абажур', 'noun:inanim:m:v_naz'], ['Київ', 'noun:inanim:m:v_naz:prop:geo'])))
    const e = byKey(r).get('абажур')!
    expect(e[0]).toBe('абажур'); expect(e[1]).toBe('noun:inanim:m:v_naz'); expect(e[2]).toBe(0); expect(e[3]).toEqual([]); expect(e[4]).toEqual({ d: 1 })
    const i = dictInfo(e)!
    expect(i.dictOnly).toBe(true); expect(i.sources).toEqual(['ВЕСУМ']); expect(i.f).toBe(0); expect(i.earliest).toBeNull(); expect(i.status).toBe('лише словник · без засвідчень у корпусі')
    expect(byKey(r).get('київ')![0]).toBe('Київ')   // the capital stays in the displayed word
    expect(r.stats.dictOnly).toBe(2)
  })
  it('DO-1 an r2u-only headword gets a dictOnly card that names r2u and keeps its dictionary line (a dictionary date, not a first attestation)', () => {
    const w = dictW('r2u_umanets', ['видавати', 'r2u Уманець–Спілка · s?w=выглядеть#1_2: выглядеть'], ['гопкати', 'r2u Уманець–Спілка · s?w=x#1_3: ???'])
    const lookup = (_: number, ti: number) => (ti === 0 ? { lemma: 'видавати', tags: 'verb:imperf:inf', full: false } : undefined)
    const r = buildCv([{ w }], lookup, new Set(), () => false, undefined, undefined, ctx(vesum(['видавати', 'verb:imperf:inf'])))
    const m = byKey(r), a = m.get('видавати')!, b = m.get('гопкати')!
    expect(dictSources(a[4]!.d!)).toEqual(['ВЕСУМ', 'r2u.org.ua']); expect(a[3][0]![0]).toBe('r2u_umanets')
    expect(dictInfo(b)!.sources).toEqual(['r2u.org.ua']); expect(b[1]).toBe(''); expect(b[3][0]![1]).toContain('Уманець–Спілка')   // a spelling VESUM does not know: still r2u only
    expect(r.refs.get('r2u_umanets')).toEqual(['l:видавати', 'l:гопкати'])
  })
  it('DO-1 a VESUM headword that already has a full / light / archaic card gets no second card (ids never collide)', () => {
    const v = vesum(['вода', 'noun'], ['книга', 'noun'], ['мати', 'noun | verb'], ['слово', 'noun'])
    const r = buildCv([], noLookup, new Set(), () => false, undefined, undefined, ctx(v, ['вода', 'Мати'], ['слово']))
    const keys = r.entries.map(e => e[0])
    expect(keys).toEqual(['книга']); expect(new Set(keys).size).toBe(keys.length)
  })
  it('DO-1 lemmaLines reads one headword per word and joins the tags of homonyms', async () => {
    const m = await lemmaLines(['мати noun:anim:f:v_naz', ' матері noun:anim:f:v_rod', 'мати verb:imperf:inf', ' маю verb:imperf:pres:s:1', 'Київ noun:inanim:m:v_naz:prop'])
    expect(m.get('мати')).toEqual(['мати', 'noun:anim:f:v_naz | verb:imperf:inf']); expect(m.get('київ')![0]).toBe('Київ'); expect(m.has('матері')).toBe(false); expect(m.size).toBe(2)
  })
})

describe('DO-2 the status and the dictionary sources are explicit; no fabricated dates', () => {
  it('DO-2 the badge text and the source names are the specified ones', () => {
    expect(DICT_STATUS).toBe('лише словник · без засвідчень у корпусі'); expect(dictSources(1 | 2 | 4)).toEqual(['ВЕСУМ', 'r2u.org.ua', 'Пластові словники'])
    expect(dictInfo(['а', '', 0, []])).toBeUndefined()
  })
  it('DO-2 a Plast headword without any dictionary line is dictionary-only too (Plast)', () => {
    const r = buildCv([], noLookup, new Set(), () => false, { words: ['гайдамацький'], owned: new Set() }, undefined, ctx(vesum()))
    expect(dictInfo(byKey(r).get('гайдамацький'))!.sources).toEqual(['Пластові словники'])
  })
  it('DO-2 the card view shows the status, the sources, f = 0, «Найраніше: —», labels a dictionary year as a dictionary date, and has no first-attestation text', () => {
    const v = rd('src/views/LightWordView.vue')
    expect(v).toMatch(/dict\.status/); expect(v).toMatch(/dict\.sources\.join/); expect(v).toMatch(/f = \{\{ dict\.f \}\}/); expect(v).toMatch(/Найраніше: —/); expect(v).toMatch(/рік словника/)
    expect(v).not.toMatch(/перша фіксація:/)
  })
})

describe('DO-3 the card shows the badge and sources and collapses the empty corpus blocks', () => {
  it('DO-3 ThinCard collapses KWIC with «немає засвідчень у корпусі»; Panel prints emptyText instead of «немає даних»', () => {
    expect(rd('src/components/ThinCard.vue')).toMatch(/немає засвідчень у корпусі/); expect(rd('src/components/Panel.vue')).toMatch(/emptyText \?\? 'немає даних'/)
    expect(rd('src/views/LightWordView.vue')).toMatch(/:dict-only="!!dict"/)
  })
  it('DO-3 a card with a light row (a corpus attestation) is never rendered as dictionary-only', () => {
    expect(rd('src/views/LightWordView.vue')).toMatch(/row\.value \? undefined : dictInfo\(cv\.value\)/)
  })
})

// ── search: served ix/ + dx/ shards ──────────────────────────────────────────────────────────────
const served = new Map<string, unknown>()
const realFetch = globalThis.fetch
beforeAll(() => {
  const ix = { format: 1, tags: [], rows: { 'князь': { h: [['князь', 0]] }, 'книжка': { c: [[0, 'книжка']] }, 'книжний': { h: [['книжний', 0]] } } }
  served.set('./data/ix/index.json', { format: 1, leaves: [['кн', 3]] }); served.set(ixUrl('кн'), ix)
  // dictionary-only: книга, книгарня (id = key) and Книш (capital id), plus «книжка», which a dictionary-only row must never shadow
  served.set('./data/dx/index.json', { format: 1, leaves: [['кн', 3]] }); served.set(dxUrl('кн'), { format: 1, rows: { 'книга': '', 'книгарня': '', 'книш': 'Книш' } })
  globalThis.fetch = (async (u: string) => { const v = served.get(String(u)); return { ok: v !== undefined, json: async () => v } as Response }) as typeof fetch
})
afterAll(() => { globalThis.fetch = realFetch })

describe('DO-4 search, ranking and badges', () => {
  it('DO-4 attested lemmas and cards come from ix/ and never include a dictionary-only card; the dx/ hits come separately', async () => {
    const r = await searchRemote('кни', queryKeys), d = await searchDict('кни', queryKeys)
    expect(r.lemmas.map(x => x.lemma).sort()).toEqual(['книжний']); expect(r.cards.map(c => c.id)).toEqual(['книжка'])
    expect(d.map(x => x.id)).toEqual(['книга', 'книгарня', 'Книш']); expect(d.every(x => x.dict === true)).toBe(true)
  })
  it('DO-4 the page lists every attested result before any dictionary-only one (order of the sections in SearchView)', () => {
    const v = rd('src/views/SearchView.vue')
    const at = (s: string) => v.indexOf(s)
    expect(at('class="results" aria-live="polite">\n    <li v-for="r in pgR.slice(rows)"')).toBeGreaterThan(at('v-for="r in cardHits"'))   // lemma list after the attested «інші картки»
    expect(at('data-testid="dict-hits"')).toBeGreaterThan(at('v-for="r in pgR.slice(rows)"'))                                          // dictionary-only after the lemma list
    expect(at('data-testid="uv-hits"')).toBeGreaterThan(at('data-testid="dict-hits"'))
    expect(v).toMatch(/<span class="badge" :title="DICT_STATUS">лише словник<\/span>/)
  })
  it('DO-4 an exact dictionary-only key is ranked before its prefix matches', async () => {
    const d = await searchDict('книга', queryKeys)
    expect(d[0]).toMatchObject({ id: 'книга', rank: 0 }); expect(d[1]).toMatchObject({ id: 'книгарня', rank: 1 })
  })
  it('DO-4 a key with a dictionary-only card only resolves through ixCards as dict: true; an attested card is not marked', async () => {
    await searchRemote('кни', queryKeys); await searchDict('кни', queryKeys)
    expect(ixCards.get('книга')).toEqual([{ kind: 'lw', id: 'книга', form: 'книга', dict: true }])
    expect(ixCards.get('книш')![0]).toMatchObject({ id: 'Книш', dict: true })
    expect(ixCards.get('книжка')).toEqual([{ kind: 'lw', id: 'книжка', form: 'книжка' }])
  })
  it('DO-4 a key with an attested card AND a dictionary-only card is served by ix/ only (no dx row)', () => {
    const ci = { format: 1 as const, generated: 't', lw: ['книжка'], ar: [], ld: ['книжка', 'книга'] }
    expect([...buildDictRows(ci).keys()]).toEqual(['книга'])
    const ix = buildRows([], undefined, ci)
    expect(ix.has('книга')).toBe(false)   // dictionary-only words never enter the ix/ rows
    expect(ix.get('книжка')!.c!.map(c => c.slice(0, 2))).toEqual([[0, 'книжка']])
  })
})

describe('DO-5 counters are split', () => {
  it('DO-5 the card index keeps dictionary-only words out of lw and boot reports the two counts separately', () => {
    const ci = buildCardIndex('t', ['рідкість'], ['запобігти', 'абажур'], [{ id: 'парада', variants: [] }], [], ['абажур', 'ґанок'])
    expect(ci.lw).toEqual(['запобігти', 'рідкість']); expect(ci.ld).toEqual(['абажур', 'ґанок'])
    expect(coverageCounts(100, ci)).toEqual({ nAttested: 100 + 2 + 1, nDictOnly: 2 }); expect(coverageCounts(100)).toEqual({ nAttested: 100, nDictOnly: 0 })
    expect(cardMap(ci).get('абажур')![0]).toMatchObject({ id: 'абажур', dict: true }); expect(cardMap(ci).get('запобігти')![0]!.dict).toBeUndefined()
  })
  it('DO-5 the home page prints both counters', () => {
    const v = rd('src/views/SearchView.vue'); expect(v).toMatch(/nAttested \?\? corpus\.nLemmas/); expect(v).toMatch(/corpus\.nDictOnly/); expect(v).toMatch(/лише зі словників/)
  })
  it('DO-5 a card the corpus attests is counted as attested, never as dictionary-only', () => {
    const ci = buildCardIndex('t', ['рідкість'], ['запобігти'], [], [], [])
    expect(ci.ld).toBeUndefined(); expect(coverageCounts(1, ci).nDictOnly).toBe(0)
  })
})

describe('DO-7 corpus-attested cards are never downgraded', () => {
  it('DO-7 a light lemma, a GZ-1 lemma and a word a corpus text links to stay ordinary CV cards (no d)', () => {
    const d = dictW('r2u_x', ['рушничний', 'l1'], ['слово', 'l2'], ['парад', 'l3'])
    const t = textW('t', 'Рушничний', 'зайвий')
    const lookup = (wi: number, ti: number) => (wi === 0 ? { lemma: ['рушничний', 'слово', 'парад'][ti]!, tags: 'x', full: false } : undefined)
    const r = buildCv([{ w: d }, { w: t }], lookup, new Set(), () => false, undefined,
      { analyses: () => [], light: [{ lemma: 'слово', tags: 'noun', w: 'o18', loc: 'p', raw: 'слова' }] },
      ctx(vesum(['рушничний', 'adj'], ['слово', 'noun'], ['парад', 'noun']), [], ['парад']))
    const m = byKey(r)
    expect(m.get('рушничний')![4]?.d).toBeUndefined()   // a text token links to it
    expect(m.get('слово')![4]?.d).toBeUndefined()       // ctx.light: a corpus lemma
    expect(m.get('парад')![4]?.d).toBeUndefined()       // GZ-1 / light lemma (attested set)
    expect(r.stats.dictOnly).toBe(0)
    expect(r.entries.every(e => !isDictOnly(e[1]))).toBe(true)
  })
  it('DO-7 without the DO context (DICT_ONLY=0) the build is the old one: nothing is marked', () => {
    const r = buildCv([{ w: dictW('r2u_x', ['гопкати', 'l']) }], noLookup, new Set(), () => false)
    expect(r.entries.every(e => !isDictOnly(e[1]))).toBe(true); expect(r.stats.dictOnly).toBe(0)
    expect(rd('pipelines/build.ts')).toMatch(/process\.env\['DICT_ONLY'\] === '0'/)
  })
})

// ── DO-6 shard math ──────────────────────────────────────────────────────────────────────────────
const LETTERS = 'абвгдежзиіклмнопрстуфхцчшщюяьї'
const TAGS = ['noun:inanim:m:v_naz', 'noun:anim:f:v_naz', 'verb:imperf:inf', 'adj:m:v_naz:compb', 'adv', 'noun:inanim:n:v_naz', 'verb:perf:inf:rev', 'adj:m:v_naz:&adjp:pasv:perf']
function fixtureWords(n: number): [string, string][] {   // ≈ 9 letters on average, like the VESUM headword list
  let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
  const out = new Set<string>()
  while (out.size < n) { const len = 4 + Math.floor(rnd() * 11); let w = ''; for (let i = 0; i < len; i++) w += LETTERS[Math.floor(rnd() * LETTERS.length)]; out.add(w) }
  return [...out].map(w => [w, TAGS[Math.floor(rnd() * TAGS.length)]!])
}
describe('DO-6 shard bytes at ~450k cards', () => {
  const N = 30000, TOTAL = 450_000
  const words = fixtureWords(N)
  const entries = words.map(([w, t]) => [lk(w), [w, t, 0, [], { d: 1 }]] as [string, CvEntry])
  it('DO-6 cv/ shards: bytes per card and per shard at 450k cards stay far below the 256 KiB hard limit of lex/ shards', () => {
    const sh = shardsOfCv(entries), bytes = sh.map(s => Buffer.byteLength(JSON.stringify(s))), total = bytes.reduce((a, b) => a + b, 0)
    const perCard = total / N, avgShard = perCard * TOTAL / CV_BUCKETS
    const maxShare = Math.max(...bytes) / total, projectedMax = maxShare * perCard * TOTAL
    console.log(`DO-6 estimate: cv ${perCard.toFixed(1)} B/card · ${(perCard * TOTAL / 1048576).toFixed(1)} MiB at ${TOTAL} cards · avg shard ${(avgShard / 1024).toFixed(1)} KiB · projected max shard ${(projectedMax / 1024).toFixed(1)} KiB (${CV_BUCKETS} buckets)`)
    expect(perCard).toBeLessThan(90); expect(projectedMax).toBeLessThan(96 * 1024); expect(projectedMax).toBeLessThan(256 * 1024)
    expect(BUCKETS).toBe(32768)   // the lex/ bucket count is NOT raised: dictionary-only cards have no lex/ detail shard and no cd/ core card
  })
  it('DO-6 the compact entry drops the word when it is its own key, and loadCv restores it', async () => {
    const e: CvEntry = ['абажур', 'noun', 0, [], { d: 1 }], sh = shardsOfCv([['абажур', e]]), stored = sh.flatMap(s => Object.values(s))[0]!
    expect(stored[0]).toBe(''); expect(JSON.stringify(stored)).toBe('["","noun",0,[],{"d":1}]')
    const capital: CvEntry = ['Київ', 'noun', 0, [], { d: 1 }], s2 = shardsOfCv([[lk('Київ'), capital]]).flatMap(s => Object.values(s))[0]!
    expect(s2[0]).toBe('Київ')   // a capital / stressed word is not its key: kept as written
    const b = sh.findIndex(s => Object.keys(s).length)
    served.set(`./data/cv/${b}.json`, sh[b]); expect((await loadCv('абажур'))![0]).toBe('абажур'); expect((await loadCv('Абажур'))![4]).toEqual({ d: 1 })
  })
  it('DO-6 dx/ shards: the planner keeps every leaf under IX_GZ_MAX and the per-card cost is reported', () => {
    const ci = buildCardIndex('t', [], [], [], [], words.map(w => w[0])), rows = buildDictRows(ci)
    const leaves = planShards(rows, IX_GZ_MAX, dxShardOf)
    let raw = 0, gz = 0, worst = 0
    for (const items of leaves.values()) { const s = JSON.stringify(dxShardOf(items)), g = gzipSync(s).length; raw += Buffer.byteLength(s); gz += g; worst = Math.max(worst, g) }
    console.log(`DO-6 estimate: dx ${(raw / N).toFixed(1)} B/card raw · ${(gz / N).toFixed(1)} B/card gzip · ${(raw / N * TOTAL / 1048576).toFixed(1)} MiB raw at ${TOTAL} cards · ${leaves.size} leaves for ${N} (worst ${(worst / 1024).toFixed(1)} KiB gzip)`)
    expect(rows.size).toBe(N); expect(worst).toBeLessThanOrEqual(IX_GZ_MAX); expect(raw / N).toBeLessThan(45)
    expect(ixName('кн')).toBe('043a043d')
  })
  it('DO-6 writeCv puts dictionary-only words into ld, not lw (cardindex.json is a build intermediate, never fetched whole)', () => {
    expect(rd('pipelines/build-cv.ts')).toMatch(/isDictOnly\(e\[1\]\)/); expect(typeof writeCv).toBe('function')
  })
})

describe('DO-8 spec and wiring', () => {
  it('DO-8 SPEC 63 lists DO-1…DO-8 and the build wires vesumLemmaList into buildCv', () => {
    const s = rd('specs/63-corpus-dialects.md'); for (let i = 1; i <= 8; i++) expect(s).toContain(`**DO-${i}**`)
    expect(rd('pipelines/build.ts')).toMatch(/vesumLemmaList\(\)/)
  })
})
