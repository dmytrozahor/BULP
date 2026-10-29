/**
 * SPEC 63 MM-38 (owner remark 2026-10-29, no file): «їсть» may be the copula єсть in Galician print (ікавізм є → ї), but їсти must never be linked to єсть / бути by a rule.
 */
import { describe, it, expect } from 'vitest'
import { fold } from '../core/orthography.ts'
import { withGal, GAL_FOLDS } from '../core/gal-folds.ts'
import { ZHEL_FOLDS } from '../core/zhel-folds.ts'
import { VARIANT_FAMILIES } from '../core/variant-families.ts'
import { copulaReading } from '../core/copula-ikavism.ts'
import { wordRules } from '../core/word-rules.ts'
import { queryKeys } from '../src/lib/search.ts'
import { unknown } from '../core/evidence.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'

const GAL = { orth: 'желехівка', authorRegion: 'Галичина' }
const tags: Record<string, string[]> = { хліб: ['noun:inanim:m:v_naz', 'noun:inanim:m:v_zna'], кашу: ['noun:inanim:f:v_zna'], добрий: ['adj:m:v_naz'], шукати: ['verb:inf'] }
const data = (): AnnotateData => {
  const lemmas: [string, string[]][] = [['їсти', ['їсть', 'їсти', 'їм']], ['бути', ['є', 'єсть']], ['хліб', ['хліб']], ['каша', ['кашу']], ['добрий', ['добрий']], ['то', ['то']]]
  const pairs = lemmas.flatMap(([l, fs]) => [l, ...fs].map((f): [string, string] => [f, l]))
  return { ...emptyLex(), search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] },
    cards: new Map(lemmas.map(([l]) => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const lemmaOf = (text: string, ctx = {}) => annotate(text, data(), undefined, ctx).find(t => t.key === 'їсть')!

describe('MM-38 the disambiguator (shared copulaReading / wordRules)', () => {
  it('«то їсть» (= тобто) in a Galician witness → бути, the eating reading kept as the alternative', () => {
    const r = copulaReading('їсть', { ...GAL, prev: 'то', next: 'добрий', tagsOf: k => tags[k] ?? [] })!
    expect(r.verdict).toBe('copula'); expect(r.readings.map(x => x.lemma)).toEqual(['бути', 'їсти']); expect(r.copulaForm).toBe('єсть')
  })
  it('«їсть хліб» → їсти only (no second reading); accusative-only object → їсти', () => {
    expect(copulaReading('їсть', { ...GAL, next: 'хліб', tagsOf: k => tags[k] ?? [] })).toBeUndefined()
    expect(copulaReading('їсть', { ...GAL, next: 'кашу', tagsOf: k => tags[k] ?? [] })).toBeUndefined()
  })
  it('Galician witness without a cue → both readings, «неоднозначно», default їсти (never a silent бути)', () => {
    const r = copulaReading('їсть', { ...GAL })!
    expect(r.verdict).toBe('ambiguous'); expect(r.readings[0]).toMatchObject({ lemma: 'їсти', default: true }); expect(r.chip.text).toContain('неоднозначно')
  })
  it('sentence-initial «Їсть у мене …» → ambiguous (existential cue), not decided', () => {
    expect(copulaReading('їсть', { ...GAL, sentStart: true, next: 'у' })!.verdict).toBe('ambiguous')
  })
  it('the chip: «ікавізм (галицьке)», no source found, no dialect group (MM-16)', () => {
    const c = copulaReading('їсть', { ...GAL })!.chip
    expect(c.feature).toBe('ікавізм (галицьке)'); expect(c.qualifier).toBe('galician'); expect(c.dialect).toBeUndefined()
    expect(c.text).toContain('джерела не знайдено'); expect(c.cite.note).toContain('Огоновський')
  })
  it('modern-orthography / unknown-orthography text: їсть → їсти only, also «то їсть» with no Galician gate stays ambiguous at most', () => {
    expect(copulaReading('їсть', { orth: '1928', prev: 'вона' })).toBeUndefined()
    expect(copulaReading('їсть', { next: 'хліб', tagsOf: k => tags[k] ?? [] })).toBeUndefined()
    expect(copulaReading('їсти', GAL)).toBeUndefined(); expect(copulaReading('їм', GAL)).toBeUndefined()
    expect(copulaReading('їсть', { orth: 'сучасна', prev: 'то' })!.verdict).toBe('copula')   // an explicit copula cue is still shown (with the alternative), not a silent switch
  })
  it('Аналіз слова / search: an isolated word gets both readings, ambiguous; wordRules is the single entry', () => {
    const w = wordRules('їсть', { known: () => true }, { isolated: true })
    expect(w.copula!.verdict).toBe('ambiguous'); expect(w.copula!.readings.map(r => r.lemma)).toEqual(['їсти', 'бути'])
    expect(wordRules('їсти', { known: () => true }, { isolated: true }).copula).toBeUndefined()
    expect(queryKeys('їсть')).toEqual(['їсть', 'єсть']); expect(queryKeys('їсти')).not.toContain('єсть')
  })
})

describe('MM-38 the annotator (token level)', () => {
  it('«то їсть» in a Galician witness links to бути (derived hypothesis through єсть), keeps the їсти alternative and the chip rule', () => {
    const t = lemmaOf('То їсть добрий хліб', GAL)
    expect(t.lemma).toBe('бути'); expect(t.provenance).toBe('derived'); expect(t.derivedFrom!.form).toBe('єсть'); expect(t.features).toEqual(['IKAV-JE-YI'])
    expect(t.copula!.readings.map(r => r.lemma)).toEqual(['бути', 'їсти'])
  })
  it('«їсть хліб» → їсти; the token carries no copula reading', () => {
    const t = lemmaOf('Він їсть хліб', GAL)
    expect(t.lemma).toBe('їсти'); expect(t.provenance).toBe('attested'); expect(t.copula).toBeUndefined()
  })
  it('Galician gating: the same bare token is ambiguous in a Галичина witness, plain їсти in modern text', () => {
    const g = lemmaOf('Він їсть', GAL), m = lemmaOf('Він їсть', { orth: '1928' })
    expect(g.lemma).toBe('їсти'); expect(g.copula!.verdict).toBe('ambiguous')
    expect(m.lemma).toBe('їсти'); expect(m.copula).toBeUndefined()
  })
  it('the other forms of їсти (їсти, їм, їсте) are never given a copula reading in any context', () => {
    for (const w of ['їсти', 'їм', 'їси', 'їсте', 'їдять', 'їмо']) for (const prev of ['то', 'се', 'що'])
      expect(annotate(`${prev} ${w}`, data(), undefined, GAL).every(t => !t.copula)).toBe(true)
  })
})

describe('MM-38 the reverse guard: no rule links їсти (or its forms) to єсть / бути', () => {
  const forms = ['їсти', 'їсть', 'їм', 'їси', 'їсте', 'їмо', 'їдять', 'їв', 'їла', 'їсти', 'їж']
  it('no orthography fold, Желехівка fold or Galician extra fold turns a form of їсти into єсть / бути (build candidates are folds only)', () => {
    for (const orth of [undefined, 'желехівка', 'кулішівка', 'максимовичівка', 'ярижка', '1928']) for (const f of forms)
      expect(withGal(fold(f, orth)).map(c => c.form), `${orth}:${f}`).not.toContain('єсть')
    for (const f of [...ZHEL_FOLDS, ...GAL_FOLDS]) for (const w of forms) expect(f.apply(w), `${f.id}:${w}`).not.toBe('єсть')
  })
  it('no variant family has їсть / єсть as a head or member: nothing in the build or the search keys links the two lemmas', () => {
    const all = VARIANT_FAMILIES.flatMap(v => [v.head, ...v.members.map(m => m.form)])
    for (const x of ['їсть', 'єсть', 'їсти', 'бути']) expect(all).not.toContain(x)
  })
})
