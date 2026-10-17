/** SPEC 63 CV-4: unlinked corpus spellings are searchable «неперевірена лема» cards (нѣгдѣ). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { UV_SHARDS, UvScan, isCleanSpelling, planUvPrefixes, uvLeafFile, uvLeafOf, uvLeavesFor, uvOccurrences, uvPrefixFile, uvShard, uvSplitOf, type UvGroup, type UvPrefixShard } from '../core/uv.ts'
import { readdirSync } from 'node:fs'
import { foldSpelling } from '../core/phrasemes.ts'
import { key } from '../core/text.ts'
import { loadUvGroup, uvOfSpelling, uvSearch, type UvFetch } from '../src/lib/uvData.ts'
import { makeRouter } from '../src/router.ts'
import { citedFormsOf, userHypothesesOf } from '../core/uv-hypotheses.ts'
import { deriveWithSteps } from '../src/lib/derive.ts'
import { buildCv } from '../pipelines/build-cv.ts'
import { cvBucket, lk, pickByContext } from '../core/cv.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const have = existsSync('public/data/uv/g/0.json') && existsSync('public/data/uv/p')
const real = have ? describe : describe.skip
const fold = (k: string) => foldSpelling(k)

describe('CV-4 grouping and filtering', () => {
  it('CV-4 spellings are grouped by the fold key; the headword is the most frequent spelling; all spellings, witnesses and occurrences are kept', () => {
    const s = new UvScan()
    s.add('нѣгдѣ', 'w1', 3, false); s.add('нѣгдѣ', 'w2', 8, false); s.add('негде', 'w3', 1, false); s.add('нѣгдѣ', 'w2', 9, false)
    const g = [...s.groups(fold)]
    expect(g).toHaveLength(1)
    const [gk, { g: grp }] = g[0]!
    expect(gk).toBe(fold(key('нѣгдѣ'))); expect(grp[0]).toBe('нѣгдѣ'); expect(grp[1]).toBe(4); expect(grp[2]).toBe(3)
    expect(grp[3]).toEqual([['нѣгдѣ', 3], ['негде', 1]]); expect(uvOccurrences(grp).map(o => o.w)).toEqual(['w1', 'w2', 'w3'])
  })
  it('CV-4 OCR garbage is excluded: digits, Latin and mixed script, repeated letters, and spellings seen only in OCR scans', () => {
    for (const bad of ['ab3д', 'слово1', 'кnига', 'word', 'ооо', 'ав']) expect(isCleanSpelling(bad), bad).toBe(false)
    for (const ok of ['нѣгдѣ', 'рушничний', "м'ясо", 'ѿ-тоую']) expect(isCleanSpelling(ok), ok).toBe(true)
    const s = new UvScan(); s.add('шумъ', 'ocr1', 0, true); s.add('гамъ', 'w', 0, true); s.add('гамъ', 'w2', 0, false)
    expect([...s.groups(fold).values()].map(x => x.g[0])).toEqual(['гамъ'])
  })
  it('CV-4 a spelling that already owns a card is skipped; an ORV card is attached by lemma or form key', () => {
    const s = new UvScan(); s.add('нѣгдѣ', 'w', 0, false); s.add('вода', 'w', 1, false)
    const m = s.groups(fold, k => k === 'вода', sks => (sks.includes('нѣгдѣ') ? 'нѣгдѣ' : ''))
    expect([...m.values()].map(x => x.g[0])).toEqual(['нѣгдѣ']); expect([...m.values()][0]!.g[4]).toBe('нѣгдѣ')
  })
  it('CV-4 shards: stable hash, prefix file = hex of the first two letters', () => {
    expect(uvShard('негде')).toBeLessThan(UV_SHARDS); expect(uvShard('негде')).toBe(uvShard('негде')); expect(uvPrefixFile('нѣгдѣ')).toBe('43d-463')
  })
})

describe('CV-4 prefix leaves (every file ≤ 256 KiB, lossless)', () => {
  const keys = ['по', 'пов', 'повіт', 'повість', 'полк', 'полки', 'полковник', 'пр', 'прав', 'право', 'нѣгдѣ', 'негде'].flatMap(k => [k + 'а', k + 'б', k + 'в'])
  const bytes = (ks: string[]) => ks.length * 40
  it('CV-4 a prefix above the limit is split deeper; every key lands in exactly one leaf; small prefixes stay two-letter shards', () => {
    const plan = planUvPrefixes(keys, bytes, 200), all = [...plan.values()].flat()
    expect(all.sort()).toEqual([...keys].sort()); expect(new Set(all).size).toBe(keys.length)
    expect([...plan.keys()].some(l => [...l].length > 2)).toBe(true); expect(plan.has('не')).toBe(true)
    for (const [leaf, ks] of plan) { for (const k of ks) expect(k.startsWith(leaf.replace(/_+$/, ''))).toBe(true); if ([...leaf].length < 14 && ks.length > 1 && new Set(ks.map(k => [...k].slice(0, [...leaf].length + 1).join(''))).size > 1) expect(bytes(ks)).toBeLessThanOrEqual(200) }
  })
  it('CV-4 uvLeafOf finds the leaf of a key and uvLeavesFor every leaf a prefix query can hit (2-letter, deeper and exact queries)', () => {
    const plan = planUvPrefixes(keys, bytes, 200), split = uvSplitOf(plan.keys()), files = new Map([...plan].map(([l, ks]) => [uvLeafFile(l), ks]))
    for (const k of keys) { expect(files.get(uvLeafOf(k, split))!, k).toContain(k) }
    for (const q of ['по', 'пов', 'повіт', 'повітб', 'пол', 'пр', 'не', 'нѣ']) {
      const want = new Set(keys.filter(k => k.startsWith(q))), got = new Set(uvLeavesFor(q, split).flatMap(f => (files.get(f) ?? []).filter(k => k.startsWith(q))))
      expect([...got].sort(), q).toEqual([...want].sort())
    }
    expect(uvLeavesFor('нѣ', null)).toEqual([uvPrefixFile('нѣ')]); expect(uvLeafOf('нѣгдѣ', null)).toBe(uvPrefixFile('нѣгдѣ'))
  })
  it('CV-4 search and the spelling lookup follow p/_split.json into the deeper leaves', async () => {
    const plan = planUvPrefixes(keys, bytes, 200), split = uvSplitOf(plan.keys()), files: Record<string, unknown> = { 'p/_split': split }
    for (const [l, ks] of plan) files[`p/${uvLeafFile(l)}`] = Object.fromEntries(ks.map(k => [k, ['g' + k, k]]))
    const get: UvFetch = async p => files[p] ?? null
    expect((await uvSearch('пов', 100, get)).map(h => h.matched).sort()).toEqual(keys.filter(k => k.startsWith('пов')).sort())
    expect(await uvOfSpelling('повіта', get)).toEqual({ group: 'gповіта', head: 'повіта' })
  })
})

describe('CV-4 search and card', () => {
  const g: UvGroup = ['нѣгдѣ', 4, 3, [['нѣгдѣ', 3], ['негде', 1]], '', 'w1', 3]
  const files: Record<string, unknown> = {
    [`p/${uvPrefixFile('нѣгдѣ')}`]: { 'нѣгдѣ': ['негде', 'нѣгдѣ'], 'нѣгдѣсь': ['негдесь', 'нѣгдѣсь'] } satisfies UvPrefixShard,
    [`g/${uvShard('негде')}`]: { 'негде': g },
  }
  const get: UvFetch = async p => files[p] ?? null
  it('CV-4 search finds a spelling case-insensitively by exact key or prefix (≥ 2 letters), exact first; a one-letter query finds nothing', async () => {
    const r = await uvSearch('НѢГДѢ', 30, get)
    expect(r.map(x => [x.group, x.exact])).toEqual([['негде', true], ['негдесь', false]]); expect(await uvSearch('н', 30, get)).toEqual([])
    expect((await uvSearch('нѣг', 30, get)).length).toBe(2)
  })
  it('CV-4 the card and the spelling→card link load through the same shards', async () => {
    expect(await loadUvGroup('негде', get)).toEqual(g); expect(await uvOfSpelling('Нѣгдѣ', get)).toEqual({ group: 'негде', head: 'нѣгдѣ' })
  })
  it('CV-4 /uv/:id is routed; search lists the unverified block AFTER the verified results, labelled «неперевірена»; the spelling page links the card', () => {
    expect(makeRouter(true).resolve('/uv/негде').matched.at(-1)!.path).toBe('/uv/:id')
    const v = rd('src/views/SearchView.vue'); expect(v.indexOf('data-testid="uv-hits"')).toBeGreaterThan(v.indexOf('Усі леми')); expect(v).toMatch(/неперевірена/)
    expect(rd('src/components/UnlinkedSpelling.vue')).toMatch(/\/uv\//)
    const c = rd('src/views/UnverifiedView.vue')
    for (const s of ['неперевірена лема', 'Написання в тексті', 'Вживання', 'ThinCard', 'Пам’ятки', 'реконструкція (гіпотеза)', 'Давньоруська лема']) expect(c, s).toContain(s)
  })
  it('CV-4 uv/ is shipped on the data branch (DIRS) and ignored by git like lex/ and cv/', () => {
    expect(rd('pipelines/data-branch.ts')).toMatch(/DIRS = \['lex', 'texts', 'cv', 'uv'[,\]]/); expect(rd('.gitignore')).toMatch(/public\/data\/uv/)
  })
})

real('CV-4 the real data', () => {
  it('CV-4 нѣгдѣ has a card with its spellings, occurrences and a search hit', async () => {
    const get: UvFetch = async p => (existsSync(`public/data/uv/${p}.json`) ? JSON.parse(rd(`public/data/uv/${p}.json`)) : null)
    const hit = await uvOfSpelling('нѣгдѣ', get); expect(hit).toBeTruthy()
    const g = (await loadUvGroup(hit!.group, get))!; expect(g[3].some(s => key(s[0]) === key('нѣгдѣ'))).toBe(true); expect(g[1]).toBeGreaterThanOrEqual(3); expect(uvOccurrences(g).length).toBeGreaterThan(0)
    expect((await uvSearch('Нѣгдѣ', 30, get)).some(h => h.group === hit!.group)).toBe(true)
  })
  it('CV-4 no card has digits / Latin letters, and no spelling in a card also owns a verified card', () => {
    const idx = JSON.parse(rd('public/data/cardindex.json')) as { lw: string[] }, owned = new Set(idx.lw.map(w => key(w)))
    let n = 0
    for (let i = 0; i < UV_SHARDS; i++) for (const [gk, g] of Object.entries(JSON.parse(rd(`public/data/uv/g/${i}.json`)) as Record<string, UvGroup>)) {
      n++; for (const [raw] of g[3]) { expect(isCleanSpelling(raw), raw).toBe(true); expect(owned.has(key(raw)), raw).toBe(false) } if (n > 3000) return
      void gk
    }
  })
  it('CV-4 the card files stay small: every file ≤ 256 KiB', () => {
    for (let i = 0; i < UV_SHARDS; i++) expect(readFileSync(`public/data/uv/g/${i}.json`).length, `g/${i}`).toBeLessThan(256 * 1024)
    for (const f of readdirSync('public/data/uv/p')) expect(readFileSync(`public/data/uv/p/${f}`).length, `p/${f}`).toBeLessThan(256 * 1024)
  })
})

describe('CV-4 (a) нѣгдѣ → нігди: a cited rule (YT-2), else a labelled user hypothesis', () => {
  it('CV-4 нѣгдѣ gets нігди with its CITED rule YT-FIN-I (final -ѣ > -и, зап. діал.), labelled hypothesis; a word without ѣ gets none', () => {
    const c = citedFormsOf(['нѣгдѣ']).find(x => x.form === 'нігди')!
    expect(c.rule).toBe('YT-FIN-I'); expect(c.cite.length).toBeGreaterThan(0); expect(c.cite[0]!.quote.length).toBeGreaterThan(10); expect(c.group).toBe('SW')
    expect(citedFormsOf(['вода'])).toEqual([]); expect(userHypothesesOf(['нѣгдѣ'])).toEqual([])
    expect(deriveWithSteps('нѣгдѣ').candidates.map(x => x.form)).toContain('нігді')
  })
  it('CV-4 the card, the spelling page and the analyser show the cited forms and the «гіпотеза користувача» slot (no uncited rule: the user list is empty now)', () => {
    expect(rd('src/components/UserHypotheses.vue')).toContain('гіпотеза користувача'); expect(rd('src/components/UserHypotheses.vue')).toContain('гіпотеза')
    for (const p of ['src/views/UnverifiedView.vue', 'src/components/UnlinkedSpelling.vue', 'src/views/AnalyzeView.vue']) expect(rd(p), p).toMatch(/<UserHypotheses/)
  })
})

describe('CV-5 thin cards render the full card components and every VESUM analysis', () => {
  const an: [string, string][] = [['риночок', 'noun:inanim:m:v_mis'], ['риночка', 'noun:inanim:f:v_zna']]
  it('CV-5 a preceding на / в / у / по / при picks the locative analysis only when exactly one analysis is a locative', () => {
    expect(pickByContext('на', an)).toBe('риночок'); expect(pickByContext('На', an)).toBe('риночок'); expect(pickByContext('при', an)).toBe('риночок')
    expect(pickByContext('і', an)).toBeUndefined(); expect(pickByContext(undefined, an)).toBeUndefined()
    expect(pickByContext('на', [['а', 'noun:v_mis'], ['б', 'noun:v_mis']])).toBeUndefined(); expect(pickByContext('на', [['риночок', 'noun:m:v_mis']])).toBeUndefined()
  })
  it('CV-5 риночку: both analyses get a card with all analyses listed, the context pick is stored, the example is kept', () => {
    const r = buildCv([], () => undefined, new Set(), () => false, undefined, { analyses: () => an, light: [{ lemma: 'риночка', tags: 'noun:inanim:f:v_naz', w: 'song_zazhuryla', loc: 'в. 1', raw: 'рыночку', form: 'риночку', prev: 'на' }] })
    const m = new Map(r.entries)
    expect(m.get('риночка')![4]).toMatchObject({ an, prev: 'на', pick: 'риночок' }); expect(m.get('риночок')![4]).toMatchObject({ an, pick: 'риночок' })
    expect(m.get('риночок')![3][0]![0]).toBe('song_zazhuryla')
  })
  it('CV-5 LightWordView lists all analyses and mounts ThinCard (KWIC, dialect, derivation, senses, etymology, cognates); UnverifiedView mounts it too', () => {
    const l = rd('src/views/LightWordView.vue'), t = rd('src/components/ThinCard.vue')
    expect(l).toContain('data-testid="vesum-analyses"'); expect(l).toMatch(/<ThinCard/); expect(rd('src/views/UnverifiedView.vue')).toMatch(/<ThinCard/)
    for (const c of ['<Kwic', '<DialectBlock', '<DerivationSteps', '<SensesBlock', '<EtymologyBlock', '<CognatesPanel', '<UsageChips']) expect(t, c).toContain(c)
  })
})

real('CV-5 the real data: риночку', () => {
  it('CV-5 /lw/риночка lists риночок (v_mis) and риночка (v_zna) as analyses of the attested spelling', () => {
    const k = (w: string) => JSON.parse(rd(`public/data/cv/${cvBucket(w)}.json`))[lk(w)]
    const a = k('риночка'), b = k('риночок')
    expect(a?.[4]?.an?.map((x: string[]) => x[0])).toEqual(expect.arrayContaining(['риночка', 'риночок'])); expect(b).toBeTruthy()
  })
})

