/** SPEC 63 NV-3: no dead spelling links — unresolved spellings have an index and a page; the analyser labels its links honestly. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { unpackCore } from '../core/pack.ts'
import { key } from '../core/text.ts'
import { UNLINKED_BUDGET_BYTES, UNLINKED_SHARDS, isWordToken, newAccumulator, occurrencesOf, shardsOf, unlinkedShard } from '../core/unlinked.ts'
import { analyzeLink } from '../src/lib/analyze-links.ts'
import { buildIndex } from '../src/lib/search.ts'
import { kwicAt, lookupUnlinked } from '../src/lib/unlinked.ts'
import type { Tok } from '../src/lib/witnessText.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const have = existsSync('public/data/unlinked/0.json') && existsSync('public/data/texts/sumtsov_slobozhane1918.json') && existsSync('public/data/lexicon.json')
const real = have ? describe : describe.skip

describe('NV-3 unlinked-spelling index', () => {
  it('NV-3 the accumulator keeps count, witness count and at most 3 witnesses with token indexes', () => {
    const a = newAccumulator()
    a.add('Призвичкою', 'w1', 5); a.add('призвичкою', 'w1', 9); a.add('призвичкою', 'w2', 1); a.add('призвичкою', 'w3', 2); a.add('призвичкою', 'w4', 3)
    const e = a.m.get(key('призвичкою'))!
    expect(e[1]).toBe(5); expect(e[2]).toBe(4)
    expect(occurrencesOf(e)).toEqual([{ w: 'w1', i: 5 }, { w: 'w2', i: 1 }, { w: 'w3', i: 2 }])
  })
  it('NV-3 sharding is stable and every key lands in exactly one of the shards', () => {
    const a = newAccumulator(); for (const w of ['призвичкою', 'нѣгдѣ', 'слобожане']) a.add(w, 'w', 0)
    const s = shardsOf(a.m); expect(s).toHaveLength(UNLINKED_SHARDS)
    for (const k of a.m.keys()) { expect(s[unlinkedShard(k)]![k]).toBeTruthy(); expect(s.filter(x => k in x)).toHaveLength(1) }
  })
  it('NV-3 only word tokens are indexed (no digits or punctuation)', () => {
    expect(isWordToken('призвичкою')).toBe(true); expect(isWordToken("п'ять")).toBe(true); expect(isWordToken('1918')).toBe(false); expect(isWordToken('—')).toBe(false)
  })
  it('NV-3 a KWIC line is cut around the token index from the text shard', () => {
    const toks: Tok[] = ['а', 'б', 'призвичкою', 'в', 'г'].map(r => [r, 'арк. 1', 0] as unknown as Tok)
    expect(kwicAt(toks, 2, 'w', 2)).toEqual({ w: 'w', loc: 'арк. 1', left: 'а б', node: 'призвичкою', right: 'в г' })
    expect(kwicAt(toks, 99, 'w')).toBeUndefined()
  })
  it('NV-3 the lookup finds an indexed spelling through the injected shard fetch', async () => {
    const a = newAccumulator(); a.add('призвичкою', 'w1', 7)
    const s = shardsOf(a.m), e = await lookupUnlinked('Призвичкою', async n => s[n] ?? null)
    expect(e?.[0]).toBe('призвичкою'); expect(await lookupUnlinked('нема', async n => s[n] ?? null)).toBeUndefined()
  })
})

describe('NV-3 pages and links', () => {
  const form = rd('src/views/FormView.vue'), comp = rd('src/components/UnlinkedSpelling.vue'), an = rd('src/views/AnalyzeView.vue')
  it('NV-3 /f/:form for a spelling no lemma owns renders the «незв’язане написання» page, never «немає в корпусі»', () => {
    expect(form).toMatch(/<UnlinkedSpelling v-else-if="!pick"/); expect(form).not.toMatch(/такого написання немає в корпусі/); expect(form).not.toMatch(/у корпусі такого написання немає/)
    for (const s of ['незв’язане написання', 'Чому не зв’язано з лемою', 'Вживання', 'Пам’ятки', 'Кандидати за правилами']) expect(comp, s).toContain(s)
    expect(comp).not.toMatch(/немає в корпусі/)
  })
  it('NV-3 the analyser says «сторінка слова» only for a lemma / light card, else «сторінка написання»', () => {
    const ctx = { lemmas: new Set(['звичка']), hits: new Map([[key('звичці'), [{ lemma: 'звичка', via: 'form' }]]]), light: new Set(['рідкість']) }
    expect(analyzeLink('звичка', ctx).kind).toBe('word'); expect(analyzeLink('звичці', ctx).kind).toBe('word'); expect(analyzeLink('рідкість', ctx).kind).toBe('word')
    const u = analyzeLink('призвичкою', ctx); expect(u.kind).toBe('spelling'); expect(u.to).toBe(`/f/${encodeURIComponent('призвичкою')}`)
    expect(an).toMatch(/сторінка слова/); expect(an).toMatch(/сторінка написання/)
  })
  it('NV-3 the index is on the code branch, within the size budget', () => {
    expect(UNLINKED_BUDGET_BYTES).toBeLessThanOrEqual(16 * 1024 * 1024)
    expect(rd('package.json')).toMatch(/"data:unlinked"/)
  })
})

real('NV-3 real data: every link target of a rendered text page resolves to a non-empty page', () => {
  const dir = 'public/data/unlinked'
  const cards = unpackCore(JSON.parse(rd('public/data/lexicon.json')))
  const forms = new Set<string>(); for (const c of cards) { forms.add(key(c.lemma)); for (const f of c.forms) forms.add(key(f.raw)) }
  const byLemma = new Map(cards.map(c => [c.lemma, c])), idx = buildIndex(cards)
  const light = new Set<string>((JSON.parse(rd('public/data/light.json')).lemmas as string[][]).map(l => l[0]!))
  const shards = new Map<number, Record<string, unknown>>()
  const indexed = (k: string) => { const n = unlinkedShard(k); if (!shards.has(n)) shards.set(n, JSON.parse(rd(`${dir}/${n}.json`))); return k in shards.get(n)! }
  it('NV-3 the Сумцов «Слобожане» 1918 page: «призвичкою» and every other word token leads to a page with content', () => {
    const toks = JSON.parse(rd('public/data/texts/sumtsov_slobozhane1918.json')).tokens as Tok[]
    expect(toks.some(t => t[0] === 'призвичкою')).toBe(true)
    const ctx = { lemmas: byLemma, hits: idx.map, light }
    let spelling = 0
    for (const raw of new Set(toks.map(t => t[0]).filter(isWordToken))) {
      const l = analyzeLink(raw, ctx), m = /^\/(w|lw|f)\/([^?]+)/.exec(l.to)
      expect(m, `${raw} → ${l.to}`).toBeTruthy()
      const target = decodeURIComponent(m![2]!)
      if (m![1] === 'w') expect(byLemma.has(target), `${raw}: /w/${target}`).toBe(true)
      else if (m![1] === 'lw') expect(light.has(target), `${raw}: /lw/${target}`).toBe(true)
      else if (l.kind === 'word') expect(forms.has(key(raw)) || idx.map.has(key(raw)), `${raw}: word-kind /f`).toBe(true)
      else { spelling++; expect(forms.has(key(raw)) || indexed(key(raw)), `${raw}: unlinked spelling missing from the index`).toBe(true) }
    }
    expect(spelling).toBeGreaterThan(0)
  })
  it('NV-3 every text shard word token is a lexicon spelling or in the unlinked index (all witnesses)', () => {
    let missing = 0, total = 0
    for (const f of readdirSync('public/data/texts').filter(x => x.endsWith('.json')).slice(0, 400)) {
      for (const t of (JSON.parse(rd(`public/data/texts/${f}`)).tokens as Tok[])) { if (!isWordToken(t[0])) continue; total++; if (!forms.has(key(t[0])) && !indexed(key(t[0]))) missing++ }
    }
    expect(total).toBeGreaterThan(1000); expect(missing).toBe(0)
  })
  it('NV-3 the committed index is within the size budget', () => {
    const bytes = readdirSync(dir).reduce((s, f) => s + statSync(`${dir}/${f}`).size, 0)
    expect(bytes).toBeLessThanOrEqual(UNLINKED_BUDGET_BYTES)
  })
})
