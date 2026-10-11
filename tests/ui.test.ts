import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { buildGrids } from '../src/lib/paradigm.ts'
import { buildIndex, search, queryKeys } from '../src/lib/search.ts'
import { annotate, summarize, type AnnotateData } from '../src/lib/annotate.ts'
import { runDetectors, strongest } from '../src/lib/analyze.ts'
import { traceSteps } from '../src/lib/derive.ts'
import { parseSpec } from '../src/lib/md.ts'
import { centuryLabel, fmtDate, stars } from '../src/lib/format.ts'
import { toCards } from '../src/composables/useData.ts'
import { EXAMPLES } from '../src/data/examples.ts'
import { key } from '../core/text.ts'
import type { LemmaCard, LexIndex, VesumHit } from '../core/types.ts'

const FIX = 'public/data/lexicon.json'
const cards: LemmaCard[] = existsSync(FIX) ? toCards(JSON.parse(readFileSync(FIX, 'utf8'))) : []
const lexindex: LexIndex = existsSync('public/data/lexindex.json') ? JSON.parse(readFileSync('public/data/lexindex.json', 'utf8')) : { lt: {}, vesum: {} }
const data = (): AnnotateData => {
  const paradigmMap = new Map<string, VesumHit[]>()
  for (const c of cards) for (const p of c.paradigm) { const k = key(p.form); paradigmMap.set(k, [...(paradigmMap.get(k) ?? []), { lemma: c.lemma, tags: p.tags }]) }
  return { search: buildIndex(cards), cards: new Map(cards.map(c => [c.lemma, c])), lexindex, paradigmMap }
}

describe('paradigm grid from VESUM tags (research/02 §1)', () => {
  const noun = [['рука', 'noun:inanim:f:v_naz'], ['руки', 'noun:inanim:f:v_rod'], ['руки', 'noun:inanim:p:v_naz'], ['рук', 'noun:inanim:p:v_rod'], ['руку', 'noun:inanim:f:v_zna']]
    .map(([form, tags]) => ({ form: form!, tags: tags! }))
  it('noun: 7 case rows × sg/pl, verbatim tags kept', () => {
    const [g] = buildGrids(noun)
    expect(g!.rows.map(r => r.label)).toEqual(['називний', 'родовий', 'давальний', 'знахідний', 'орудний', 'місцевий', 'кличний'])
    expect(g!.rows[0]!.cells[0]![0]).toEqual({ form: 'рука', tags: 'noun:inanim:f:v_naz' })
    expect(g!.rows[1]!.cells.map(c => c.map(x => x.form))).toEqual([['руки'], ['рук']])
    expect(g!.rows[2]!.cells[0]).toEqual([])
  })
  it('verb: inf / pres / past / impr blocks', () => {
    const v = [['писати', 'verb:imperf:inf'], ['пишу', 'verb:imperf:pres:s:1'], ['пишуть', 'verb:imperf:pres:p:3'], ['писав', 'verb:imperf:past:m'], ['пиши', 'verb:imperf:impr:s:2']]
      .map(([form, tags]) => ({ form: form!, tags: tags! }))
    const g = buildGrids(v)
    expect(g.map(x => x.id)).toEqual(['inf', 'pres', 'past', 'impr'])
    expect(g[1]!.rows[0]!.cells[0]![0]!.form).toBe('пишу')
    expect(g[1]!.rows.find(r => r.label === '3 особа')!.cells[1]![0]!.form).toBe('пишуть')
  })
  it('adj: gender × case; comparative forms excluded', () => {
    const a = [['зелений', 'adj:m:v_naz:compb'], ['зеленіший', 'adj:m:v_naz:compc'], ['зелена', 'adj:f:v_naz:compb']].map(([form, tags]) => ({ form: form!, tags: tags! }))
    const [g] = buildGrids(a)
    expect(g!.rows[0]!.cells.map(c => c.map(x => x.form))).toEqual([['зелений'], ['зелена'], [], []])
  })
  it('unknown POS falls back to a flat list', () => expect(buildGrids([{ form: 'вже', tags: 'adv' }])[0]!.id).toBe('list'))
})

describe('search keys (stress/case-insensitive, old letters)', () => {
  it('queryKeys strips stress and lowercases; old letters add a normalised variant', () => {
    expect(queryKeys('Кни́ГА')).toEqual(['книга'])
    expect(queryKeys('Оуже')).toEqual(['оуже', 'уже'])
  })
  it.skipIf(!cards.length)('finds a lemma by lemma, historical spelling, normalised spelling and paradigm form', () => {
    const idx = buildIndex(cards)
    expect(search(idx, 'князь')[0]!.lemma).toBe('князь')
    expect(search(idx, 'КЪНѦЗЬ')[0]).toMatchObject({ lemma: 'князь', via: 'form' })
    expect(search(idx, 'видѣти').map(r => r.lemma)).toContain('видіти')
    expect(search(idx, 'коня')[0]).toMatchObject({ lemma: 'кінь', via: 'paradigm' })
    expect(search(idx, 'ки́їв')[0]!.lemma).toBe('Київ')
    expect(search(idx, 'ззззз')).toEqual([])
  })
})

describe('annotator (pure)', () => {
  it.skipIf(!cards.length)('statuses: attested / lexindex / unknown; summary counts', () => {
    const t = annotate('Князь видѣти кльовий абракадабра', data())
    expect(t.map(x => x.status)).toEqual(['attested', 'attested', 'lexindex', 'unknown'])
    expect(t[0]!.lemma).toBe('князь'); expect(t[0]!.provenance).toBe('attested')
    expect(t[3]!.claims).toEqual({}); expect(t[3]!.mark).toBeUndefined()
    const s = summarize(t); expect(s.total).toBe(4); expect(s.linked).toBe(2); expect(s.unknown).toEqual(['абракадабра'])
  })
  it.skipIf(!cards.length)('year gates rules: ы in a 1798 text is archaic orthography, not russianism', () => {
    const d = data()
    const old = annotate('быти', d, 1798)[0]!, now = annotate('быти', d, undefined)[0]!
    expect(Object.keys(old.claims)).toContain('archaic_orthography'); expect(Object.keys(old.claims)).not.toContain('russianism_orth')
    expect(Object.keys(now.claims)).toContain('russianism_orth')
  })
  it.skipIf(!cards.length)('a church-slavonic form carries its evidence and wins the mark', () => {
    const t = annotate('градъ', data(), 1092)[0]!
    expect(t.claims.church_slavonic!.evidence.length).toBeGreaterThanOrEqual(2)
    expect(t.mark).toBe('cs')
  })
  it('gating: an unknown word does not fire absence-based rules', () => {
    const a = runDetectors('чьтоуюю', { paradigmMap: new Map() })
    expect(a.known).toBe(false); expect(a.gated).toContain('ORT-JO'); expect(Object.keys(a.claims).some(l => l in { CHN: 1, MPL: 1 })).toBe(false)
  })
  it('strongest picks the highest score', () => {
    const ev = [{ source: 's', quote: 'q', locator: 'l', kind: 'Q' as const }]
    expect(strongest({ colloquial: { value: true, evidence: ev, score: 0.9 }, church_slavonic: { value: true, evidence: ev, score: 0.5 } })).toBe('colloquial')
  })
})

describe('examples are real passages', () => {
  it('each has source line fields and non-empty text', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(5)
    for (const e of EXAMPLES) { expect(e.text.length, e.id).toBeGreaterThan(30); expect(e.url, e.id).toMatch(/^https?:/); expect(e.loc && e.author && e.witness).toBeTruthy() }
  })
  it('Archangel Gospel Jn 1:1 is decoded', () => expect(EXAMPLES.find(e => e.id === 'arch-john-1')!.text).toContain('Искони бѣ слово'))
})

describe('helpers', () => {
  it('derivation steps replay the trace', () => expect(traceSteps('видѣти', ['R09'])).toEqual([{ rule: 'R09', from: 'видѣти', to: 'видіти' }]))
  it('formatting', () => { expect(fmtDate([1798, 1798])).toBe('1798'); expect(fmtDate([1056, 1057])).toBe('1056–1057'); expect(centuryLabel(11)).toBe('XI ст.'); expect(stars(0.0005)).toBe('★★★') })
  it('SPEC 00 parses into P sections', () => {
    const s = parseSpec(readFileSync('specs/00-principles.md', 'utf8'))
    expect(s.find(x => x.heading.startsWith('P-2'))!.items.map(i => i.id)).toContain('P-2.4')
  })
})
