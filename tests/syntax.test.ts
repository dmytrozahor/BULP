/** SPEC 60 SX-1…SX-3: multi-token detectors (core/syntax.ts). Claims need the ЕУМ um159 Q cite; unsourced rows only hint (P-1.3, P-3.1). */
import { describe, it, expect } from 'vitest'
import { detectSyntax, SYNTAX_ROWS, UNDATED } from '../core/syntax.ts'
import { annotateSyntax } from '../src/lib/annotate.ts'
import { emptyLex } from '../src/lib/analyze.ts'

describe('SX-4 annotator / analyze helper', () => {
  it('annotateSyntax uses VESUM tags: «к столу» is a k+dative claim only when столу is tagged v_dav', () => {
    const d = emptyLex()
    expect(annotateSyntax('к столу', d)[0]!.id).toBe('SX-PREP-RED')                 // -у is not decisive without tags → hint only
    d.paradigmMap.set('столу', [{ lemma: 'стіл', tags: 'noun:inanim:m:v_rod' }])
    expect(annotateSyntax('к столу', d)[0]!.id).toBe('SX-PREP-RED')                 // … tagged genitive-only → just the reduced-preposition hint
    d.paradigmMap.set('столу', [{ lemma: 'стіл', tags: 'noun:inanim:m:v_dav' }])
    expect(annotateSyntax('к столу', d)[0]!.id).toBe('SX-K-DAT')
  })
  it('spans are char ranges into the input (for the bracket underline)', () => {
    const t = 'ну, я би-м зробив'
    const s = annotateSyntax(t, emptyLex())[0]!
    expect(t.slice(s.start, s.end)).toBe('би-м')
  })
})

const one = (t: string, o = {}) => detectSyntax(t, o)
const by = (t: string, id: string, o = {}) => one(t, o).find(s => s.id === id)

describe('SX-1 analytic forms', () => {
  it('conditional «я би-м зробив»: би + clitic м → SW claim with um159 Q cite and trigger', () => {
    const s = by('я би-м зробив', 'SX-COND')!
    expect(s.text).toBe('би-м'); expect(s.modern).toBe('я би'); expect(s.dialect).toBe('SW'); expect(s.hint).toBe(false)
    expect(s.claim!.evidence.length).toBe(2)
    expect(s.claim!.evidence[0]!.kind).toBe('Q'); expect(s.claim!.evidence[0]!.locator).toContain('um159')
    expect(s.claim!.evidence[1]!.quote).toBe('би-м'); expect(s.dating).toBe(UNDATED)
  })
  it('merged бим / бись and «був бим робив»', () => {
    expect(by('я бим дав', 'SX-COND')!.modern).toBe('я би')
    expect(by('ти бись дав', 'SX-COND')!.modern).toBe('ти би')
    expect(by('я був бим робив', 'SX-COND-BUV')!.text).toBe('був бим робив')
  })
  it('SW future «буду зробив» → буду зробити', () => {
    const s = by('я буду зробив', 'SX-FUT-BUDU-L')!
    expect(s.text).toBe('буду зробив'); expect(s.modern).toBe('буду зробити'); expect(s.claim!.evidence[0]!.quote).toContain('бýду писáв')
  })
  it('pluperfect «був робив»', () => {
    const s = by('він був робив', 'SX-PLUPERF')!
    expect(s.text).toBe('був робив'); expect(s.claim).toBeTruthy()
  })
  it('no false positives: «був здоров», «був Київ», «було село», «була сила», plain «буду робити»', () => {
    for (const t of ['він був здоров', 'місто, де був Київ', 'там було село', 'була сила', 'я буду робити', 'я зробив би']) expect(one(t), t).toEqual([])
  })
  it('lexicon callback decides the ambiguous feminine: «була сила» stays silent, «була робила» fires with a verb', () => {
    const verbness = (k: string) => (k === 'робила' ? 'verb' as const : k === 'сила' ? 'other' as const : undefined)
    expect(one('була робила', { verbness }).map(s => s.id)).toEqual(['SX-PLUPERF'])
    expect(one('була сила', { verbness })).toEqual([])
  })
  it('past + clitic: робив-єм, носивйем, робилисмо, носили сте', () => {
    expect(by('я робив-єм', 'SX-PAST-CLITIC')!.modern).toBe('я робив')
    expect(by('носивйем', 'SX-PAST-CLITIC')!.modern).toBe('я носив')
    expect(by('ми робилисмо', 'SX-PAST-CLITIC')!.modern).toBe('ми робили')
    expect(by('ви носили сте', 'SX-PAST-CLITIC')!.modern).toBe('ви носили')
  })
  it('к + dative: «к тобі» → до тебе; «к столу» via callback; plain «к» before a non-dative is only a hint', () => {
    const s = by('прийшов к тобі', 'SX-K-DAT')!
    expect(s.modern).toBe('до тебе'); expect(s.claim!.evidence[0]!.quote).toContain('к тóбі')
    expect(by('к столу', 'SX-K-DAT', { isDative: (k: string) => k === 'столу' })).toBeTruthy()
    const h = by('к нам', 'SX-K-DAT')!; expect(h.modern).toBe('до нас')
    const hint = one('к хаті'); expect(hint[0]!.id).toBe('SX-PREP-RED'); expect(hint[0]!.hint).toBe(true)
  })
  it('free ся / си: «як ся маєте» → як маєтеся', () => {
    const s = by('як ся маєте', 'SX-SI-FREE')!
    expect(s.text).toBe('ся маєте'); expect(s.modern).toBe('маєтеся'); expect(s.hint).toBe(false)
    expect(by('маєте ся добре', 'SX-SI-FREE', {})).toBeTruthy()
  })
})

describe('SX-2 enclitic / short pronouns', () => {
  it("«т'я» / «м'а» → тебе / мене with label native_enclitic (Q: «м'а, т'а, с'а»)", () => {
    const s = by("бачу т'я", 'SX-ENCL-PRON')!
    expect(s.modern).toBe('тебе'); expect(s.label).toBe('native_enclitic'); expect(s.claim!.evidence[0]!.quote).toContain("т'а")
    expect(by('він м’а бачив', 'SX-ENCL-PRON')!.modern).toBe('мене')   // curly apostrophe is unified
  })
  it('«дав ми» → дав мені; subject «ми дали» stays silent', () => {
    const s = by('він дав ми книгу', 'SX-ENCL-PRON')!
    expect(s.modern).toBe('дав мені')
    expect(one('ми дали книгу')).toEqual([])
    expect(one('ти знаєш')).toEqual([])
  })
  it('«мні» is a weight-0 hint (not in the ЕУМ quote)', () => {
    const s = by('дай мні', 'SX-ENCL-ORTH')!
    expect(s.hint).toBe(true); expect(s.claim).toBeUndefined(); expect(s.modern).toBe('мені')
  })
})

describe('SX-3 reduced prepositions', () => {
  it('«д місту» → hint д→до, and до+dative contamination hint; never a claim', () => {
    const r = one('йду д місту')
    expect(r.length).toBe(1); expect(r[0]!.id).toBe('SX-DO-DAT'); expect(r[0]!.hint).toBe(true); expect(r[0]!.claim).toBeUndefined()
    expect(by('йду д хаті', 'SX-DO-DAT')).toBeTruthy()
    expect(one('йду д')).toEqual([])
  })
  it('«до великому місту» is a contamination hint; «до великого міста» is silent', () => {
    expect(by('до великому місту', 'SX-DO-DAT')!.hint).toBe(true)
    expect(one('до великого міста')).toEqual([])
  })
  it('од / ув / ді are hints', () => {
    for (const [t, m] of [['од тебе', 'від'], ['ув хаті', 'у/в'], ['ді міста', 'до']] as const) { const s = one(t)[0]!; expect(s.hint, t).toBe(true); expect(s.modern).toBe(m) }
  })
})

describe('rows obey P-1.3', () => {
  it('every row with weight > 0 has a Q cite; unsourced rows have weight 0', () => {
    for (const r of SYNTAX_ROWS) { if (r.weight > 0) { expect(r.cite?.kind, r.id).toBe('Q'); expect(r.cite!.quote.length).toBeLessThanOrEqual(300) } else expect(r.cite, r.id).toBeUndefined() }
  })
  it('overlapping spans collapse to the longest', () => {
    const r = one('я був бим робив')
    expect(r.map(s => s.id)).toEqual(['SX-COND-BUV'])
  })
})
