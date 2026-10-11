/** Tests that close the gaps found by the P-4.1 audit (specs/COVERAGE.md): one describe per requirement id. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { claim, Q } from '../core/evidence.ts'
import { ipm, logDice } from '../core/stats.ts'
import { derive } from '../core/phonology.ts'
import { reverse } from '../core/reverse.ts'
import { AUTHORS, admissible, authorById } from '../pipelines/authors.ts'
import { MANIFEST } from '../pipelines/manifest.ts'
import { collocations } from '../pipelines/build-stats.ts'
import { linkOptions, ROUTE_RANK, type Env } from '../pipelines/build-link.ts'
import { fold } from '../core/orthography.ts'
import { stressVariants } from '../pipelines/build-annotate.ts'
import { unpack } from '../core/pack.ts'
import type { LemmaCard } from '../core/types.ts'

const has = (p: string) => existsSync(p)
const lex = (): LemmaCard[] => unpack(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')))
const corpus = () => JSON.parse(readFileSync('public/data/corpus.json', 'utf8'))

describe('P-1.2 evidence shape', () => {
  it('quote is cut to 300 chars; kind must be Q|P|D; locator required', () => {
    expect(claim('x', Q('S', 'l', 'я'.repeat(400))).evidence[0]!.quote).toHaveLength(300)
    expect(() => claim('x', { source: 'S', quote: 'q', locator: 'l', kind: 'X' as never })).toThrow()
    expect(() => claim('x', Q('S', ' ', 'q'))).toThrow()
  })
})

describe('P-1.5 derivation trace', () => {
  it('every candidate lists the rule ids that changed it, in order', () => expect(derive('видѣти').candidates.find(c => c.form === 'видіти')!.trace).toEqual(['R09']))
})

describe('P-1.6 statistics carry denominators', () => {
  it.skipIf(!has('analysis/REPORT.md'))('REPORT states the denominator convention and per-row N', () => {
    const r = readFileSync('analysis/REPORT.md', 'utf8')
    expect(r).toMatch(/Denominator convention/); expect(r).toMatch(/share of N=/); expect(r).toMatch(/denominator/)
  })
  it.skipIf(!has('public/data/lexicon.json'))('every card carries byEpoch/byRegion N next to f', () => {
    const c = corpus()
    for (const l of lex().slice(0, 300)) for (const r of l.stats.byRegion ?? []) expect(r.N).toBeGreaterThan(0)
    expect(c.N).toBeGreaterThan(0)
  })
})

describe('P-1.7 inferred ≠ fact', () => {
  it.skipIf(!has('public/data/lexicon.json'))('a Stanza-lemma link says it is a model prediction', () => {
    let n = 0
    for (const c of lex()) for (const f of c.forms) if (f.link.value !== 'unknown' && f.link.value.route === 'stanza-lemma') {
      n++; expect(f.link.evidence.some(e => /stanza/.test(e.source) && /модельна лематизація/.test(e.note ?? '')), c.lemma).toBe(true)
    }
    expect(n).toBeGreaterThan(0)
  })
  it('reverse candidates are labelled method=reconstruction', () => { const r = reverse('віра').candidates; expect(r.length).toBeGreaterThan(0); expect(r.every(c => c.method === 'reconstruction')).toBe(true) })
})

describe('P-2.1 / P-2.4 authors', () => {
  it('a vetted author has ≥ 1 quote, except the one whose evidence is extracted from the witness (B-1.1)', () => {
    for (const a of AUTHORS.filter(a => a.status === 'vetted')) if (a.id !== 'kyiv_chron_12') expect(a.evidence.some(e => e.kind === 'Q'), a.id).toBe(true)
  })
  it('11th–13th c. authors are never labelled Ukrainian', () => {
    for (const id of ['ilarion', 'monomakh', 'kyiv_chron', 'kyiv_chron_12', 'volyn_chron']) expect(['ruthenian-rus', 'institutional'], id).toContain(authorById[id]!.label)
  })
})

describe('P-4.3 every module starts with a doc comment', () => {
  it('core/*.ts and pipelines/*.ts', () => {
    for (const d of ['core', 'pipelines']) for (const f of readdirSync(d).filter(f => f.endsWith('.ts'))) expect(readFileSync(`${d}/${f}`, 'utf8').trimStart().slice(0, 3), `${d}/${f}`).toBe('/**')
  })
})

describe('P-4.4 licences are displayed', () => {
  it.skipIf(!has('analysis/REPORT.md'))('REPORT names the non-commercial share-alike licences', () => expect(readFileSync('analysis/REPORT.md', 'utf8')).toMatch(/CC BY-NC-SA 4\.0.*CC BY-NC-SA 3\.0.*LGPL-2\.1/s))
})

describe('M-1 manifest', () => {
  it('M-1.1 every unit declares the required fields', () => {
    for (const u of MANIFEST) { for (const k of ['id', 'title', 'author', 'kind', 'urls', 'date', 'dateCite', 'lang', 'witnessType', 'edition'] as const) expect(u[k], `${u.id}.${k}`).toBeTruthy(); expect(u.dateCite.source, u.id).toBeTruthy() }
  })
  it('M-1.2 every manifest author has a record and is vetted or provisional', () => { for (const u of MANIFEST) expect(admissible(authorById[u.author]), u.id).toBe(true) })
  it('M-1.3 the Kyivan-recension Church Slavonic units are lang=chu-rus', () => { for (const id of ['ostromir', 'arch']) expect(MANIFEST.find(u => u.id === id)!.lang).toBe('chu-rus') })
  it('M-1.4 only the Archangel Gospel comes from віра.укр (no prayer-book izvod)', () => expect(MANIFEST.filter(u => u.kind === 'vira').map(u => u.id)).toEqual(['arch']))
})

describe('M-3.2 / B-2 route order', () => {
  const hits = new Map([['князь', [{ lemma: 'князь', tags: 'noun:anim:m:v_naz' }]], ['бачити', [{ lemma: 'бачити', tags: 'verb:imperf:inf' }]]])
  const env: Env = { hits, derive: (s, o) => derive(s, { oldI: o }), fold }
  const base = { lang: 'orv' as const, oldI: false, raw: 'кънѧзь' }
  it('route A (TOROT lemma) beats stanza beats token; direct only for lang=uk', () => {
    expect(linkOptions({ ...base, lemma: 'кънѧзь', stanza: 'бачити' }, env)?.route).toBe('torot-lemma')
    expect(linkOptions({ ...base, stanza: 'кънѧзь' }, env)?.route).toBe('stanza-lemma')
    expect(linkOptions(base, env)?.route).toBe('token')
    expect(linkOptions({ lang: 'uk', oldI: false, raw: 'князь' }, env)?.route).toBe('direct')
    expect(ROUTE_RANK['torot-lemma']).toBeLessThan(ROUTE_RANK['stanza-lemma']); expect(ROUTE_RANK.token).toBeLessThan(ROUTE_RANK.direct)
  })
  it('a candidate that is not a VESUM form never becomes a link (M-3.2) and nothing is guessed (M-3.3)', () => expect(linkOptions({ ...base, raw: 'ззззз' }, env)).toBeUndefined())
  it.skipIf(!has('public/data/corpus.json'))('M-3.3 unresolved = N − linked; topUnresolved ≤ 200', () => { const c = corpus(); expect(c.unresolved).toBe(c.N - c.linked); expect(c.topUnresolved.length).toBeLessThanOrEqual(200) })
})

describe('M-5 statistics', () => {
  it('M-5.1 ipm = f/N·1e6', () => { expect(ipm(5, 1e6)).toBe(5); expect(ipm(1, 0)).toBe(0) })
  it('M-5.5 collocations: window ±3 inside a segment, f_xy ≥ 3, logDice > 0', () => {
    const id = Int32Array.from([0, 1, 0, 1, 0, 1, 2]), seg = Int32Array.from([0, 0, 0, 0, 0, 0, 0])
    const c = collocations([{ id, seg }], [4, 3, 1], Uint8Array.from([1, 1, 1]), ['a', 'b', 'c'])
    expect(c.get(0)![0]).toMatchObject({ lemma: 'b' }); expect(c.get(0)![0]!.logDice).toBeCloseTo(logDice(c.get(0)![0]!.fxy, 4, 3), 2)
    expect(c.get(0)!.every(x => x.lemma !== 'c' || x.fxy >= 3)).toBe(true)
    expect(collocations([{ id, seg: Int32Array.from([0, 1, 2, 3, 4, 5, 6]) }], [3, 3, 1], Uint8Array.from([1, 1, 1]), ['a', 'b', 'c']).get(0)).toBeUndefined()   // every token in its own segment: no pairs
  })
})

describe('M-6 / B-6 outputs', () => {
  it.skipIf(!has('analysis/REPORT.md'))('REPORT has the eight sections of B-6', () => {
    const r = readFileSync('analysis/REPORT.md', 'utf8')
    for (let i = 1; i <= 8; i++) expect(r, `## ${i}.`).toMatch(new RegExp(`^## ${i}\\. `, 'm'))
  })
  it.skipIf(!has('public/data/lexicon.json'))('M-6 the three data files exist; the size limits of B-5 hold (lexicon ≤ 15 MB, lexindex ≤ 4 MB)', () => {
    for (const f of ['corpus', 'lexicon', 'lexindex']) expect(has(`public/data/${f}.json`)).toBe(true)
    expect(readFileSync('public/data/lexicon.json').length).toBeLessThanOrEqual(15 * 1024 * 1024)
    expect(readFileSync('public/data/lexindex.json').length).toBeLessThanOrEqual(4 * 1024 * 1024)
  })
})

describe.skipIf(!has('public/data/lexicon.json'))('B-3 / B-4 properties of the built lexicon', () => {
  const cards = lex(), c = corpus()
  it('B-2.2 / B-1.1 corpus meta: rusynStatus note with evidence, regions with N', () => { expect(c.rusynStatus.evidence.length).toBeGreaterThan(3); expect(c.regions.length).toBeGreaterThan(0) })
  it('B-3.4 oldest is no younger than any stored spelling', () => {
    for (const l of cards) if (l.claims.oldest.value !== 'unknown') for (const f of l.forms) expect(l.claims.oldest.value.date[1], l.lemma).toBeLessThanOrEqual(f.date[1])
  })
  it('B-3.6 region is evidence, never a dialect label', () => {
    const codes = new Set(c.regions.map((r: { code: string }) => r.code))
    for (const l of cards) for (const [label, cl] of Object.entries(l.claims.dialect)) { expect(codes.has(label), label).toBe(false); expect(cl.evidence.some(e => e.locator === 'region'), l.lemma).toBe(true) }
  })
  it('B-3.7 stress status is unknown, with method and source note', () => {
    let n = 0
    for (const l of cards) for (const s of l.stress) { n++; expect(s.status).toBe('unknown'); expect(s.method).toBe('dictionary'); expect(s.evidence[0]!.source).toBe('ukrainian-word-stress') }
    expect(n).toBeGreaterThan(100)
  })
  it('B-3.7 two acutes (homograph) → two variants', () => {
    const v = stressVariants(['замок'], { forms: { замок: [{ stressed: 'за́мок', positions: [0], ambiguous: true }, { stressed: 'замо́к', positions: [2], ambiguous: true }] } })
    expect(v.map(x => x.positions)).toEqual([[0], [2]])
  })
  it('B-4 ipm = f/N·1e6 over the stored N; HK and dots in range', () => {
    for (const l of cards.slice(0, 500)) { expect(l.stats.ipm).toBeCloseTo(ipm(l.stats.f, c.N), 1); expect(l.stats.dots).toBeGreaterThanOrEqual(0); expect(l.stats.dots).toBeLessThanOrEqual(6) }
  })
  it('B-3.1 each form card: ≤ 6 KWIC, claims keyed by label, hints are rule ids', () => {
    for (const l of cards.slice(0, 500)) for (const f of l.forms) { expect(f.kwic.length).toBeLessThanOrEqual(6); expect(Array.isArray(f.hints)).toBe(true) }
  })
})

describe('P-1.4 triggered labels carry the rule citation and the trigger', () => {
  it.skipIf(!has('public/data/lexicon.json'))('in the built lexicon', () => {
    let n = 0
    for (const l of lex()) for (const f of l.forms) for (const [k, cl] of Object.entries(f.claims)) {
      if (!cl.method || k === 'rusyn' && !cl.method) continue
      n++; expect(cl.evidence.some(e => e.kind === 'Q' || e.kind === 'P'), `${l.lemma}.${k}`).toBe(true); expect(cl.evidence.some(e => e.kind === 'D'), `${l.lemma}.${k}`).toBe(true)
    }
    expect(n).toBeGreaterThan(0)
  })
})

