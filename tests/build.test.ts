/** SPEC 20 §Tests: admission (B-1.1), ambiguity order (B-2.1), surzhyk/LT upgrade needs both conditions (B-3.2), tie-break (B-3.5), size budget (B-5), every built claim valid (P-1.1). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { claim, Q, D, isKnown, type Claim } from '../core/evidence.ts'
import type { Ctx } from '../core/detect.ts'
import type { LemmaCard, VesumHit, WitnessOut } from '../core/types.ts'
import { authorById, type Author } from '../pipelines/authors.ts'
import { admit, rankFirst, firstClaim, upgradeLt, selectForms, lemmaRusyn, surzhykClaim, type FirstCand } from '../pipelines/build-annotate.ts'
import { chooseLemma, tierOf, type Option } from '../pipelines/build-link.ts'
import { fitBudget } from '../pipelines/build.ts'
import { REGIONS, regionOf } from '../pipelines/regions.ts'
import { SURZHYK_DEF } from '../core/rules.ts'

const auth = (o: Partial<Author> = {}): Author => ({ id: 'a', name: 'A', life: '', label: 'ukrainian', status: 'vetted', confidence: 'explicit', evidence: [Q('S', 'l', 'q')], ...o })
const w = (o: Partial<WitnessOut> = {}) => ({ id: 'w', author: 'a', authorEvidence: undefined, ...o })

describe('B-1.1 admission', () => {
  it('unknown author → refused', () => expect(admit(w(), undefined)).toMatchObject({ ok: false }))
  it('excluded / unverified status → refused; vetted and provisional → admitted', () => {
    expect(admit(w(), auth({ status: 'excluded' })).ok).toBe(false)
    expect(admit(w(), auth({ status: 'unverified' })).ok).toBe(false)
    expect(admit(w(), auth()).ok).toBe(true)
    expect(admit(w(), auth({ status: 'provisional' })).ok).toBe(true)
  })
  it('author record without evidence needs a Q authorEvidence on the witness', () => {
    const bare = auth({ evidence: [] })
    expect(admit(w(), bare).ok).toBe(false)
    expect(admit(w({ authorEvidence: [D('w', 'l', 'x')] }), bare).ok).toBe(false)
    expect(admit(w({ authorEvidence: [Q('w', 'l', 'x')] }), bare).ok).toBe(true)
  })
  it('a witness the ingester marked as not Ukrainian text is refused, with the evidence in the reason', () => {
    const r = admit(w({ excludeReason: { why: 'російською', evidence: [D('IZB', 'u', 'Поэма Кого, рыдая')] } }), auth())
    expect(r.ok).toBe(false); expect(r.ok === false && r.why).toMatch(/російською.*Поэма/)
  })
  it('every real manifest author id has a record (P-2.2)', () => expect(authorById['shevchenko']).toBeTruthy())
})

const cand = (o: Partial<FirstCand> = {}): FirstCand => ({ witness: 'w1', author: auth(), date: [1100, 1100], witnessType: 'ms_copy', loc: 'l', form: 'f', route: 'direct', ...o })
describe('B-3.5 first-attestation tie-breaks', () => {
  it('earliest date.to wins', () => expect(rankFirst([cand({ witness: 'b', date: [1200, 1200] }), cand({ witness: 'a', date: [1100, 1110] })])!.first.witness).toBe('a'))
  it('tie: vetted > provisional', () => expect(rankFirst([cand({ witness: 'p', author: auth({ status: 'provisional' }) }), cand({ witness: 'v' })])!.first.witness).toBe('v'))
  it('tie: narrower date range', () => expect(rankFirst([cand({ witness: 'wide', date: [1050, 1100] }), cand({ witness: 'narrow', date: [1090, 1100] })])!.first.witness).toBe('narrow'))
  it('tie: autograph > ms_copy > first_ed > scholarly_ed', () => {
    const ts = ['scholarly_ed', 'first_ed', 'ms_copy', 'autograph']
    expect(rankFirst(ts.map(witnessType => cand({ witness: witnessType, witnessType })))!.first.witness).toBe('autograph')
  })
  it('tie: person > institution', () => expect(rankFirst([cand({ witness: 'inst', author: auth({ label: 'institutional' }) }), cand({ witness: 'pers' })])!.first.witness).toBe('pers'))
  it('full tie → first kept, the others are coFirst (never silently dropped)', () => {
    const r = rankFirst([cand({ witness: 'x' }), cand({ witness: 'y' }), cand({ witness: 'z', date: [1300, 1300] })])!
    expect(r.first.witness).toBe('x'); expect(r.coFirst).toEqual(['y'])
  })
  it('firstClaim cites the author vetting quote + the attestation + the date; no evidence → unknown', () => {
    const ws = new Map([['w1', { dateCite: Q('IZB', 'u', 'дата'), authorEvidence: undefined }]])
    const c = firstClaim([cand()], ws, () => 'kwic')
    expect(isKnown(c)).toBe(true); expect(c.evidence.map(e => e.kind)).toEqual(['Q', 'D', 'Q'])
    expect(isKnown(firstClaim([cand({ author: auth({ evidence: [] }) })], ws, () => 'kwic'))).toBe(false)
    expect(isKnown(firstClaim([], ws, () => 'kwic'))).toBe(false)
  })
})

const opt = (lemma: string, branches: number, tags = 'noun:inanim:m:v_naz', form = lemma): Option => {
  const c = { form, trace: [] as string[], branches }
  return { id: lemma.toLowerCase(), lemma, form, hit: { lemma, tags }, cand: c, tier: tierOf(tags), own: c, ownConfirmed: true }
}
describe('B-2.1 ambiguity resolution order', () => {
  it('(tier) an unflagged lemma beats a bad/slang one regardless of branches', () => {
    const c = chooseLemma([opt('кляча', 0, 'noun:anim:f:v_naz:bad'), opt('кобила', 2)], new Map())!
    expect(c.lemma).toBe('кобила'); expect(c.decidedBy).toBe('tier'); expect(c.alternatives).toEqual(['кляча'])
  })
  it('(branches) with no frequency evidence the candidate with fewer branch rules wins', () => {
    const c = chooseLemma([opt('бог', 1), opt('біг', 0)], new Map())!
    expect(c.lemma).toBe('біг'); expect(c.decidedBy).toBe('branches')
  })
  it('(frequency class) богъ → бог, not біг: a lemma in a higher modern frequency class beats fewer branches (ikavism has exceptions)', () => {
    const c = chooseLemma([opt('бог', 1), opt('біг', 0)], new Map([['бог', 340], ['біг', 7]]))!
    expect(c.lemma).toBe('бог'); expect(c.decidedBy).toBe('frequency')
  })
  it('same frequency class → branches decide again', () => expect(chooseLemma([opt('бог', 1), opt('біг', 0)], new Map([['бог', 12], ['біг', 70]]))!.lemma).toBe('біг'))
  it('(first) full tie keeps the first and lists the others', () => {
    const c = chooseLemma([opt('аа', 0), opt('бб', 0)], new Map())!
    expect(c.lemma).toBe('аа'); expect(c.decidedBy).toBe('first'); expect(c.alternatives).toEqual(['бб'])
  })
  it('case variants of one lemma are one lemma; the common-noun spelling is the display form', () => {
    const c = chooseLemma([opt('Князь', 0, 'noun:anim:m:v_naz:prop:lname'), opt('князь', 0)], new Map())!
    expect(c.lemma).toBe('князь'); expect(c.decidedBy).toBe('unique')
  })
  it('nothing → undefined (unresolved tokens are never guessed, B-2.2)', () => expect(chooseLemma([], new Map())).toBeUndefined())
})

describe('B-3.2 LT-only nonnormative → russianism_or_hybrid needs BOTH conditions', () => {
  const lt = claim(true as const, [Q('LT', 'UK_SIMPLE_REPLACE', 'x'), D('LT', 'rules/uk/replace.txt', 'шо=що')], { score: 0.8, method: 'LEX-LT' })
  const ctx = (vesum: VesumHit[] = []): Ctx => ({ form: 'шо', vesum, inLexicon: () => [] })
  const ru = (known: boolean) => ({ шо: { known, normal_form: 'шо', tag: 'CONJ' } })
  it('ru-known AND no normative VESUM analysis → upgraded, with the ru-dictionary evidence', () => {
    const r = upgradeLt({ nonnormative: lt }, ctx(), ru(true))
    expect(r.russianism_or_hybrid!.method).toBe('LEX-LT+ru-dict'); expect(r.russianism_or_hybrid!.evidence.at(-1)!.source).toBe('pymorphy3-dicts-ru')
  })
  it('ru does not know the word → no upgrade', () => expect(upgradeLt({ nonnormative: lt }, ctx(), ru(false)).russianism_or_hybrid).toBeUndefined())
  it('VESUM has a normative analysis → no upgrade', () => expect(upgradeLt({ nonnormative: lt }, ctx([{ lemma: 'що', tags: 'conj:subord' }]), ru(true)).russianism_or_hybrid).toBeUndefined())
  it('only a flagged VESUM analysis is not normative → upgrade still allowed', () => expect(upgradeLt({ nonnormative: lt }, ctx([{ lemma: 'що', tags: 'conj:subord:slang' }]), ru(true)).russianism_or_hybrid).toBeDefined())
  it('a claim not made by LEX-LT is never upgraded', () => expect(upgradeLt({ nonnormative: { ...lt, method: 'LEX-VESUM-SUBST' } }, ctx(), ru(true)).russianism_or_hybrid).toBeUndefined())
})

describe('B-3 lemma-level claims', () => {
  it('surzhyk is derived only from contact labels and always carries SURZHYK_DEF', () => {
    const cl = claim(true as const, [Q('LT', 'l', 'q')], { score: 0.8, method: 'LEX-LT' })
    expect(isKnown(surzhykClaim([{ nonnormative: cl }], {}))).toBe(false)
    const s = surzhykClaim([{ russianism_morph: cl }], {}); expect(isKnown(s)).toBe(true); expect(s.evidence).toContainEqual(SURZHYK_DEF)
  })
  it('lemma rusyn = best of the forms: specific variant beats undetermined, absent → undefined', () => {
    const rc = (v: string, score: number) => ({ claims: { rusyn: claim(v, [Q('RUEWIKI', 'l', 'q')], { score, method: 'RUE-X' }) } })
    expect(lemmaRusyn([{ claims: {} }])).toBeUndefined()
    expect(lemmaRusyn([rc('rusyn', 0.9), rc('rusyn:lemko', 0.3)])!.value).toBe('rusyn:lemko')
  })
  it('selectForms keeps the oldest AND the most frequent spelling even in a 2-form card', () => {
    const fs = [{ n: 'old', f: 1, date: [1000, 1000] as [number, number] }, { n: 'mid', f: 50, date: [1500, 1500] as [number, number] }, { n: 'x', f: 5, date: [1400, 1400] as [number, number] }]
    expect(selectForms(fs, 2).map(x => x.n).sort()).toEqual(['mid', 'old'])
    expect(selectForms(fs, 5)).toHaveLength(3)
  })
})

const cardOf = (lemma: string, f: number, pad: number): LemmaCard => ({ lemma, pos: 'x', paradigm: [], stress: [], forms: [], first: claim('x', Q('S', 'l', 'q')) as never, stats: { f } as never, claims: { pad: 'x'.repeat(pad) } as never })
describe('B-5 size budget', () => {
  it('drops the lowest-frequency lemmas first; pre-1400 outranks a modern lemma of equal frequency; result fits', () => {
    const cards = [cardOf('a', 100, 4e6), cardOf('b', 50, 4e6), cardOf('c', 1, 4e6), cardOf('d', 1, 4e6), cardOf('e', 1, 4e6)]
    const r = fitBudget(cards, ['d'])
    expect(r.bytes).toBeLessThanOrEqual(15 * 1024 * 1024)
    expect(r.cards.map(c => c.lemma)).toEqual(['a', 'b', 'd'])
    expect(r.dropped).toBe(2)
  })
})

describe('regions (research/07 §3.3, SPEC 20 B-3.6)', () => {
  it('maps the manifest region strings; composite or disputed loci stay unknown (P-3.1)', () => {
    expect(regionOf('Київ')).toBe('kyiv'); expect(regionOf('Київщина')).toBe('kyiv'); expect(regionOf('Галичина')).toBe('halychyna'); expect(regionOf('Волинь')).toBe('volyn')
    for (const r of ['Київ або Новгород', 'Галич / Волинь', 'Галичина / Афон', undefined, '']) expect(regionOf(r), String(r)).toBeUndefined()
  })
  it('oblast codes are ISO 3166-2:UA', () => REGIONS.forEach(r => r.oblasts.forEach(o => expect(o).toMatch(/^UA-\d\d$/))))
})

// P-1.1 over the real built data (skipped on a clean checkout without public/data)
const DATA = 'public/data/lexicon.json'
describe.skipIf(!existsSync(DATA))('P-1.1 every claim in the built lexicon passes claim() validation', () => {
  const cards: LemmaCard[] = JSON.parse(readFileSync(DATA, 'utf8'))
  const isClaim = (x: unknown): x is Claim<unknown> => !!x && typeof x === 'object' && 'value' in x && 'evidence' in x && Array.isArray((x as Claim<unknown>).evidence)
  const walk = (x: unknown, path: string, out: { path: string; c: Claim<unknown> }[]) => {
    if (isClaim(x)) { out.push({ path, c: x }); return }
    if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${path}[${i}]`, out))
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${path}.${k}`, out)
  }
  const all: { path: string; c: Claim<unknown> }[] = []
  cards.forEach((c, i) => walk({ first: c.first, stress: c.stress, forms: c.forms, claims: c.claims }, `#${i}:${c.lemma}`, all))
  it('has claims', () => expect(all.length).toBeGreaterThan(1000))
  it('every known claim re-constructs through claim(); unknown ones have no evidence', () => {
    for (const { path, c } of all) {
      if (c.value === 'unknown') { expect(c.evidence, path).toEqual([]); continue }
      expect(() => claim(c.value, c.evidence, { score: c.score, method: c.method }), path).not.toThrow()
    }
  })
  it('rusyn claims name an axis label', () => {
    for (const c of cards) {
      const r = c.claims.rusyn
      if (r) { expect(r.value).toMatch(/^rusyn(:(lemko|presov|pannonian|subcarpathian))?$/) }
    }
  })
  it('byRegion codes exist in corpus.regions and N matches', () => {
    const corpus = JSON.parse(readFileSync('public/data/corpus.json', 'utf8'))
    const N = new Map<string, number>(corpus.regions.map((r: { code: string; N: number }) => [r.code, r.N]))
    for (const c of cards) for (const r of c.stats.byRegion ?? []) { expect(N.get(r.code), r.code).toBe(r.N); expect(r.f).toBeLessThanOrEqual(c.stats.f) }
  })
})

