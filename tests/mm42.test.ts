/**
 * SPEC 63 MM-42 («"го" в старих українських пам'ятках це може бути єго») and MM-43 («ну коли редукцію робить мовець»): the enclitic го = його, the apostrophe elision ’го, the
 * speaker's colloquial reductions (шо, шоб, ше, тра, тре). Both ways: every reading is tested together with the cases that must NOT be misread.
 */
import { describe, it, expect } from 'vitest'
import { claim, unknown } from '../core/evidence.ts'
import { key, tokenize } from '../core/text.ts'
import { goReading, treReading, reducedReading, shortReading, isShortCandidate, shortKeys, shortQualifier } from '../core/short-forms.ts'
import { splitHyphenParticle } from '../core/gal-folds.ts'
import { variantFor, corrEvidence } from '../core/correspondences.ts'
import { wordRules } from '../core/word-rules.ts'
import { queryKeys } from '../src/lib/search.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import type { VesumHit } from '../core/types.ts'

const GAL = { orth: 'желехівка', authorRegion: 'Галичина', year: 1837 }
const tags: Record<string, string[]> = { пускає: ['verb:imperf:pres:s:3'], сѣпає: ['verb:imperf:pres:s:3'], имили: ['verb:imperf:past:p'], йти: ['verb:imperf:inf'], терти: ['verb:imperf:inf'] }
const tagsOf = (k: string) => tags[k] ?? []
const data = (): AnnotateData => {
  const lemmas: [string, string[]][] = [['він', ['він', 'його']], ['го', ['го']], ['що', ['що']], ['треба', ['треба']], ['терти', ['тре']], ['мати', ['мати']], ['пускати', ['пускає', 'сѣпає']], ["м'ясо", ["м'ясо"]], ["п'ять", ["п'ять"]]]
  const pairs = lemmas.flatMap(([l, fs]) => [l, ...fs].map((f): [string, string] => [key(f), l]))
  const lex = emptyLex(); for (const [w, ts] of Object.entries(tags)) lex.paradigmMap.set(key(w), ts.map(t => ({ lemma: w, tags: t })))
  return { ...lex, search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] },
    cards: new Map(lemmas.map(([l]) => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const tok = (text: string, k: string, ctx = {}, year?: number) => annotate(text, data(), year, ctx).find(t => t.key === k)!

describe('MM-42 «го» = його: the disambiguator (shared goReading / wordRules)', () => {
  it('Rusalka 1837 / Шекерик 1910: next to a verb or after a clitic host in a Galician text → він (його), the interjection kept as the alternative; no cue → both readings', () => {
    expect(goReading('го', { ...GAL, prev: 'мати', next: 'не', tagsOf })!.verdict).toBe('ambiguous')   // «не» is no verb, «мати» no verb: no cue
    const a = goReading('го', { ...GAL, prev: 'воўня', next: 'сѣпає', tagsOf })!
    expect(a.verdict).toBe('full'); expect(a.readings.map(x => x.lemma)).toEqual(['він', 'го']); expect(a.fullLemma).toBe('він'); expect(a.full).toBe('його')
    expect(goReading('го', { ...GAL, prev: 'би', next: 'имили', tagsOf })!.verdict).toBe('full')
  })
  it('hyphenated clitic «видів-го», «дай-го» → він in ANY text, also modern standard', () => {
    for (const w of ['видів-го', 'дай-го', 'хотів-го']) { const r = goReading(w, {})!; expect(r.verdict, w).toBe('full'); expect(r.fullLemma).toBe('він'); expect(r.form).toBe('го') }
    expect(splitHyphenParticle('видів-го')).toEqual({ host: 'видів', particle: 'го' })
  })
  it('interjections are not a host + clitic: го-го, ого-го, гей-го, го го, «го!»', () => {
    for (const w of ['го-го', 'ого-го', 'гей-го']) { expect(splitHyphenParticle(w), w).toBeUndefined(); expect(goReading(w, GAL), w).toBeUndefined() }
    expect(goReading('го', { ...GAL, next: 'го' })).toBeUndefined(); expect(goReading('го', { ...GAL, prev: 'го' })).toBeUndefined()
    expect(goReading('го', { ...GAL, after: '! ' })).toBeUndefined()
  })
  it('not the pronoun: after a preposition («в го родинно»), an ordinal («5-го квітня»), a capitalised fragment («Го ловач»)', () => {
    expect(goReading('го', { ...GAL, prev: 'в', next: 'родинно' })).toBeUndefined()
    expect(goReading('го', { ...GAL, before: '5-' })).toBeUndefined()
    expect(goReading('го', { ...GAL, raw: 'Го', prev: 'у', next: 'ловач' })).toBeUndefined()
    expect(goReading('го', { ...GAL, raw: 'Го', next: 'ловач' })).toBeUndefined()
  })
  it('gate: a modern standard text keeps the current reading; an old (≤ 1800) text, Галичина or Гуцульщина, or an isolated word gets the branching reading', () => {
    expect(goReading('го', { orth: '1928', authorRegion: 'Київ', year: 1920, next: 'сѣпає', tagsOf })).toBeUndefined()
    expect(goReading('го', { year: 1650, next: 'пускає', tagsOf })!.verdict).toBe('full')
    expect(goReading('го', { witnessRegion: 'Гуцульщина', prev: 'би', next: 'имили', tagsOf })!.verdict).toBe('full')
    const iso = goReading('го', { isolated: true })!
    expect(iso.verdict).toBe('ambiguous'); expect(iso.readings[0]).toMatchObject({ lemma: 'го', default: true }); expect(iso.chip.text).toContain('неоднозначно')
  })
  it('the chip: «енклітична форма займенника (го = його)», MM-16 qualifier, «джерела не знайдено», no dialect group, evidence passes claim()', () => {
    const c = goReading('го', { ...GAL, prev: 'воўня', next: 'сѣпає', tagsOf })!.chip
    expect(c.feature).toBe('енклітична форма займенника (го = його)'); expect(c.dialect).toBeUndefined(); expect(c.text).toContain('джерела не знайдено')
    expect(c.qualifier).toBe('author')                                      // 1837 > 1800, Галичина: the author's / record's region, no dialect claimed
    expect(goReading('го', { year: 1650, next: 'пускає', tagsOf })!.chip.qualifier).toBe('older')
    expect(goReading('видів-го', { witnessRegion: 'Гуцульщина' })!.chip.qualifier).toBe('author')
    expect(goReading('видів-го', { orth: 'желехівка' })!.chip.qualifier).toBe('edition')
    expect(goReading('видів-го', {})!.chip.qualifier).toBe('neutral')
    expect(() => claim(true, goReading('видів-го')!.evidence)).not.toThrow()
    expect(goReading('видів-го')!.evidence.quote).toBe('"го" в старих українських пам\'ятках це може бути єго')
  })
  it('search / Аналіз слова: «го» also searches його; wordRules is the single entry', () => {
    expect(queryKeys('го')).toEqual(['го', 'його']); expect(shortKeys('видів-го')).toEqual(['його']); expect(queryKeys('він')).not.toContain('його')
    expect(wordRules('го', { known: () => true }, { isolated: true }).short!.verdict).toBe('ambiguous')
    expect(wordRules('він', { known: () => true }, { isolated: true }).short).toBeUndefined()
  })
})

describe('MM-42 the annotator (token level) and the він card', () => {
  it('Galician «воўня го сѣпає» → він (derived through його); the interjection reading is listed beside it', () => {
    const t = annotate('воўня го сѣпає', data(), 1837, GAL).find(x => x.key === 'го')!
    expect(t.lemma).toBe('він'); expect(t.provenance).toBe('derived'); expect(t.derivedFrom!.form).toBe('його'); expect(t.short!.readings.map(r => r.lemma)).toEqual(['він', 'го'])
  })
  it('the він card does not absorb interjections: «Го!», «го го», «Го-го!», a bare «го» in a Galician text with no cue, a modern text', () => {
    for (const text of ['Го! Що там?', 'го го го', 'Го-го!', 'Вона сказала: го!']) expect(annotate(text, data(), 1837, GAL).filter(t => t.key.startsWith('го')).every(t => t.lemma !== 'він'), text).toBe(true)
    const bare = tok('Ось го.', 'го', GAL, 1837); expect(bare.lemma).toBe('го'); expect(bare.short!.verdict).toBe('ambiguous')
    expect(tok('воўня го сѣпає', 'го', { orth: '1928', authorRegion: 'Київ' }, 1920).lemma).toBe('го')
  })
  it('’го with an apostrophe (all four marks) → він, chip «скорочена (елідована) форма»; м’ясо / п’ять stay intact', () => {
    for (const ap of ["'", '’', 'ʼ', '`']) { const t = tok(`Ой ${ap}го бачив`, 'го', {}, 1900); expect(t.lemma, ap).toBe('він'); expect(t.short!.chip.feature).toBe('скорочена (елідована) форма') }
    expect(tokenize("м'ясо п'ять ’го").map(x => x.raw)).toEqual(["м'ясо", "п'ять", 'го']); expect(tokenize('’го')[0]!.lead).toBe('’'); expect(tokenize("м'ясо")[0]!.lead).toBeUndefined()
    expect(annotate("м'ясо і п'ять", data()).filter(t => t.short).length).toBe(0)
    expect(annotate("м'ясо", data())[0]!.lemma).toBe("м'ясо")
  })
  it('hyphen «видів-го» carries the pronoun reading', () => {
    const t = annotate('видів-го', data(), 1900)[0]!
    expect(t.short!.fullLemma).toBe('він'); expect(t.short!.verdict).toBe('full')
  })
})

describe('MM-42 the build variant row го → він (orth желехівка only, yields to VESUM)', () => {
  const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
  const e: Env = { hits: new Map([['він', [H('він', 'noun:anim:m:v_naz:&pron:pers:3')]]]), derive: (s, oldI) => deriveRaw(s, { oldI }), fold: (s, o) => foldRaw(s, o) }
  const link = (t: Partial<TypeCtx>, env: Env = e) => { const r = linkOptions({ lang: 'uk', oldI: false, raw: '', ...t } as TypeCtx, env); return r ? chooseLemma(r.opts, new Map()) : undefined }
  it('row: uncited, owner quote verbatim, no dialect; Желехівка witness links го → він, others / capitalised do not', () => {
    const v = variantFor('го')!; expect(v.modern).toBe('він'); expect(v.uncited).toBe(true); expect(corrEvidence(v, 'го').source).toContain('джерела не знайдено')
    expect(link({ raw: 'го', orth: 'желехівка' })?.lemma).toBe('він'); expect(link({ raw: 'го' })?.lemma).not.toBe('він'); expect(link({ raw: 'Го', orth: 'желехівка' })?.lemma).not.toBe('він')
  })
  it('a VESUM reading of the spelling itself wins (yields)', () => {
    const e2: Env = { ...e, hits: new Map([...e.hits, ['го', [H('го', 'intj')]]]) }
    expect(link({ raw: 'го', orth: 'желехівка' }, e2)?.lemma).not.toBe('він')
  })
})

describe('MM-43 the speaker’s reductions', () => {
  it('шо / шоб / ше / тра link to their full lemma through the variant family; the chip is «розмовна редукція (мовця)»', () => {
    for (const [w, head] of [['шо', 'що'], ['шоб', 'щоб'], ['ше', 'ще'], ['тра', 'треба']] as const) {
      const r = reducedReading(w, { genre: 'folklore' })!; expect(r.fullLemma, w).toBe(head); expect(r.chip.feature).toBe('розмовна редукція (мовця)'); expect(r.chip.qualifier).toBe('folklore')
      expect(isShortCandidate(w)).toBe(true); expect(() => claim(true, r.evidence)).not.toThrow()
    }
    expect(reducedReading('шо')!.chip.cite.source).toContain('Вікісловник'); expect(reducedReading('ше')!.chip.text).toContain('джерела не знайдено'); expect(reducedReading('ше')!.chip.dialect).toBeUndefined()
    const t = tok('Шо ти кажеш', 'шо', {}, 1940)
    expect(t.lemma).toBe('що'); expect(t.short!.chip.feature).toBe('розмовна редукція (мовця)')
  })
  it('qualifiers (MM-16): folklore / character speech / author region / old / neutral', () => {
    expect(shortQualifier({ genre: 'folklore' }).qualifier).toBe('folklore'); expect(shortQualifier({ genre: 'speech' }).qualifier).toBe('speaker')
    expect(shortQualifier({ authorRegion: 'Гуцульщина' }).qualifier).toBe('author'); expect(shortQualifier({ year: 1700 }).qualifier).toBe('older'); expect(shortQualifier({}).qualifier).toBe('neutral')
  })
  it('«тре» is a real word too (3sg of терти): «тре йти» → треба, «він тре» → терти only, bare → both readings, VESUM reading first', () => {
    expect(treReading('тре', { next: 'йти', tagsOf })!.verdict).toBe('full')
    expect(treReading('тре', { prev: 'він', next: 'сало', tagsOf })).toBeUndefined()
    const b = treReading('тре', { tagsOf })!; expect(b.verdict).toBe('ambiguous'); expect(b.readings[0]).toMatchObject({ lemma: 'терти', default: true })
    expect(tok('тре йти', 'тре').lemma).toBe('треба'); expect(tok('він тре', 'тре').lemma).toBe('терти')
  })
  it('editorial abbreviations and real homographs are not misread: г., ст., т. зв., ма, ка, ди, сте get no reduction chip', () => {
    for (const w of ['г', 'ст', 'т', 'зв', 'р', 'ма', 'ка', 'ди', 'сте', 'смо', 'що', 'ще', 'треба']) { expect(shortReading(w, { genre: 'speech' }), w).toBeUndefined(); expect(isShortCandidate(w), w).toBe(false) }
    expect(annotate('ст. 5, т. зв. г.', data()).every(t => !t.short)).toBe(true)
  })
})
