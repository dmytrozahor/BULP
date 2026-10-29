/**
 * SPEC 63 MM-40 / MM-41 (owner remarks on OV-14): linking folds for the Transcarpathian marker letters ÿ ü ӱ ô (ЕУМ um162) and for сердце → серце (-рдц- → -рц-).
 * Linking only: a candidate after the plain ones, VESUM / our cards decide, never a dialect claim beyond the source's own statement.
 */
import { describe, it, expect } from 'vitest'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { key, tokenize } from '../core/text.ts'
import { withGal } from '../core/gal-folds.ts'
import { isZakMarked, toRc, RDC_FOLD, ZAK_FOLDS } from '../core/zak-folds.ts'
import { featureChips, FEATURE_RULE_IDS } from '../core/feature-chips.ts'
import { featurePairs, wordRules } from '../core/word-rules.ts'
import { claim, unknown } from '../core/evidence.ts'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import type { VesumHit } from '../core/types.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { queryKeys } from '../src/lib/search.ts'
import { featureMarks } from '../src/lib/featureMarks.ts'
import type { CoreCard } from '../core/types.ts'

const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
const E = (t: Record<string, VesumHit[]>): Env => ({ hits: new Map(Object.entries(t).map(([k, v]) => [key(k), v])), derive: (s, oldI) => { const d = deriveRaw(s, { oldI }); return { ...d, candidates: withGal(d.candidates, s) } }, fold: (s, o) => withGal(foldRaw(s, o), s) })
const T = (o: Partial<TypeCtx>): TypeCtx => ({ lang: 'uk', oldI: false, raw: '', ...o })
const link = (e: Env, t: TypeCtx) => { const r = linkOptions(t, e); return r ? chooseLemma(r.opts, new Map()) : undefined }
const mk = (lemma: string) => ({ lemma, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [] }) as unknown as CoreCard
const data = (pairs: [string, string][]) => ({ ...emptyLex(), search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] }, cards: new Map(pairs.map(([, l]) => [l, mk(l)])) }) as unknown as AnnotateData
const forms = (w: string) => withGal(deriveRaw(w).candidates, w).map(c => c.form)
const ENV = E({ віз: [H('віз', 'noun:inanim:m:v_naz')], кінь: [H('кінь', 'noun:anim:m:v_naz')], хлів: [H('хлів', 'noun:inanim:m:v_naz')], хожу: [H('ходити', 'verb:imperf:pres:s:1')],
  серце: [H('серце', 'noun:inanim:n:v_naz')], серця: [H('серце', 'noun:inanim:n:v_rod')], серцем: [H('серце', 'noun:inanim:n:v_oru')], серцях: [H('серце', 'noun:inanim:p:v_mis')], серцю: [H('серце', 'noun:inanim:n:v_dav')] })

describe('MM-41 ÿ / ü / ӱ / ô inside a Cyrillic word links to the standard lemma (ЕУМ um162 glosses: вÿс «віз», кÿнь, хл’ÿў, хôжу)', () => {
  it.each([['вÿс', 'віз'], ['вüс', 'віз'], ['вӱс', 'віз'], ['кÿн’', 'кінь'], ['кÿнь', 'кінь'], ['хл’ÿў', 'хлів'], ['хôжу', 'хожу']])('%s has the candidate %s', (a, b) => { expect(forms(a)).toContain(b) })
  it('the build link: вÿс → віз, кÿнь → кінь (trace ORTH-ZAK-*), хôжу → ходити; the plain reading stays first', () => {
    const c = link(ENV, T({ raw: 'вÿс' }))!; expect(c.lemma).toBe('віз'); expect(c.cand.trace).toEqual(['ORTH-ZAK-Y-V'])
    expect(link(ENV, T({ raw: 'кÿнь' }))!.lemma).toBe('кінь'); expect(link(ENV, T({ raw: 'хôжу' }))!.lemma).toBe('ходити')
    expect(forms('вÿс')[0]).toBe('вÿс')
  })
  it('never overrides a real reading: a token VESUM knows keeps its own lemma', () => {
    const e = E({ вÿс: [H('вÿс', 'noun:inanim:m:v_naz')], віз: [H('віз', 'noun:inanim:m:v_naz')] })
    expect(link(e, T({ raw: 'вÿс' }))!.lemma).toBe('вÿс')
  })
  it('no false links: Latin words with ü ô ê ÿ (German, Hungarian, French, Dutch) are not marked, have no candidate and are not even tokens', () => {
    for (const w of ['für', 'Müller', 'Mücke', 'hôtel', 'être', 'Tÿd', 'schön', 'büyük', 'rüzgâr', 'lüx']) { expect(isZakMarked(key(w)), w).toBe(false); expect(forms(key(w)).length, w).toBeLessThanOrEqual(1) }
    expect(tokenize('Das ist für Müller, hôtel et être. Ez nagyon szép.').map(t => t.raw)).toEqual([])
    expect(tokenize('кажу вÿс, хôжу і für Müller').map(t => t.raw)).toEqual(['кажу', 'вÿс', 'хôжу', 'і'])
    expect(isZakMarked('вÿс')).toBe(true); expect(isZakMarked('вÿsс')).toBe(false)
  })
  it('chips: «закарпатське ÿ (рефлекс о / ѣ)» with the um162 quote; the source names the dialect group, the text own area only when the witness gives one', () => {
    for (const id of ['ORTH-ZAK-Y', 'ORTH-ZAK-Y-V', 'ORTH-ZAK-Y-E', 'ORTH-ZAK-Y-O']) {
      expect(FEATURE_RULE_IDS).toContain(id)
      const c = featureChips([id], { authorRegion: 'Закарпаття' })[0]!
      expect(c.feature).toBe('закарпатське ÿ (рефлекс о / ѣ)'); expect(c.qualifier).toBe('galician'); expect(c.cite.quote).toContain('[ÿ] в центральних [вÿс]'); expect(c.dialect).toEqual({ group: 'ZAK', source: 'ЕУМ um162' })
      expect(c.text).not.toContain('район за даними свідка')
    }
    const n = featureChips(['ORTH-ZAK-Y'], { authorRegion: 'Київ', year: 1900 })[0]!; expect(n.qualifier).toBe('neutral'); expect(n.text).toContain('район не заявляється')
    expect(featureChips(['ORTH-ZAK-Y'], { authorRegion: 'Закарпаття', area: 'березька говірка' })[0]!.text).toContain('район за даними свідка: березька говірка')
    const o = featureChips(['ORTH-ZAK-O'], { authorRegion: 'Закарпаття' })[0]!; expect(o.feature).toBe('закарпатське ô (закрите о)'); expect(o.cite.quote).toContain('ôс’ін’'); expect(o.cite.note).toContain('ê → е')
  })
  it('the client: the annotator links вÿс → віз as derived with the chip rule, the text-view mark and the search key find it; a known word and a Latin word get nothing', () => {
    const t = annotate('вÿс', data([['віз', 'віз']]))[0]!
    expect(t.lemma).toBe('віз'); expect(t.provenance).toBe('derived'); expect(t.features).toEqual(['ORTH-ZAK-Y-V'])
    expect(featureMarks('вÿс', { authorRegion: 'Закарпаття' }, k => k === 'віз').map(c => c.rule)).toEqual(['ORTH-ZAK-Y-V'])
    expect(featureMarks('für', {}, () => true)).toEqual([]); expect(queryKeys('вÿс')).toContain('віз')
    const w = wordRules('кÿн’', { known: k => k === 'кінь' }); expect(w.pairs.map(p => [p.rule, p.to])).toEqual([['ORTH-ZAK-Y', 'кінь']]); expect(w.pairs[0]!.text).toContain('Район не заявляється')
    expect(featurePairs('кінь', () => true)).toEqual([])
  })
  it('every ZAK fold cite is a valid evidence claim', () => { for (const f of [...ZAK_FOLDS, RDC_FOLD]) expect(() => claim(true, f.cite), f.id).not.toThrow() })
})

describe('MM-40 сердце / сердца / сердцем → серце: the older -рдц- spelling links to the standard word, evidence from our own corpus, no dialect claim', () => {
  it('toRc: -рдц- → -рц- with the old endings modernised; words without -рдц- are untouched', () => {
    expect(toRc('сердце')).toBe('серце'); expect(toRc('сердца')).toBe('серця'); expect(toRc('сердци')).toBe('серці'); expect(toRc('сердцах')).toBe('серцях'); expect(toRc('сердцем')).toBe('серцем'); expect(toRc('сердцю')).toBe('серцю')
    expect(toRc('серце')).toBe('серце'); expect(toRc('сердечко')).toBe('сердечко'); expect(toRc('серденько')).toBe('серденько')
  })
  it('the build link: every form of the thin cards u:сердце / сердца / сердцем / сердци / сердцах / сердцу / сердцю links to серце (trace ORTH-RDC)', () => {
    for (const raw of ['сердце', 'сердца', 'сердцем', 'сердцах', 'сердцю']) { const c = link(ENV, T({ raw }))!; expect(c.lemma, raw).toBe('серце'); expect(c.cand.trace, raw).toContain('ORTH-RDC') }
    expect(link(ENV, T({ raw: 'серце' }))!.cand.trace).toEqual([])
  })
  it('the chip «давніша форма»: evidence kind P with a locator to the witnesses and dates, no dialect, for a Middle Ukrainian witness (older), a Galician witness and an edition', () => {
    expect(FEATURE_RULE_IDS).toContain('ORTH-RDC')
    const c = featureChips(['ORTH-RDC'], { year: 1598, authorRegion: 'Волинь', witnessRegion: 'Волинь' })[0]!
    expect(c.text).toContain('давніша форма'); expect(c.text).toContain('діалект не заявляється'); expect(c.dialect).toBeUndefined()
    expect(c.cite.kind).toBe('P'); expect(c.cite.locator).toContain('i14_17'); expect(c.cite.locator).toContain('1598–1599'); expect(c.cite.locator).toContain('o18_26')
    expect(c.cite.note).toContain('73 токени'); expect(() => claim(true, c.cite)).not.toThrow()
    expect(featureChips(['ORTH-RDC'], { authorRegion: 'Галичина' })[0]!.text).toContain('давніша форма')
    expect(featureChips(['ORTH-RDC'], { orth: 'желехівка', edition: 'Львів 1893' })[0]!.qualifier).toBe('edition')
  })
  it('the card u:сердце points to серце (Аналіз слова / CardRules pair), the annotator, the text mark and the search key', () => {
    const w = wordRules('сердце', { known: k => k === 'серце' }); expect(w.pairs.map(p => [p.rule, p.to, p.known])).toEqual([['ORTH-RDC', 'серце', true]]); expect(w.pairs[0]!.text).toContain('Діалект не заявляється')
    const t = annotate('сердцем', data([['серцем', 'серце']]))[0]!; expect(t.lemma).toBe('серце'); expect(t.features).toEqual(['ORTH-RDC'])
    expect(featureMarks('сердце', { year: 1581 }, k => k === 'серце').map(c => c.rule)).toEqual(['ORTH-RDC']); expect(queryKeys('сердце')).toContain('серце')
    expect(wordRules('серце', { known: () => true }).pairs).toEqual([])
  })
  it('сердечко / серденько are ordinary modern words: no fold touches them', () => {
    for (const w of ['сердечко', 'серденько']) expect(withGal(deriveRaw(w).candidates, w).flatMap(c => c.trace).filter(id => /ZAK|RDC/.test(id)), w).toEqual([])
  })
})
