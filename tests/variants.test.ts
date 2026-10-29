/**
 * SPEC 63 MM-29..MM-36 (owner remarks 2026-10-29): variant families (межи / мендзи, уві / ві / у / в, увесь / ввесь, тілько / тилько, како), the dative -ові, the -ова- ~ -ува- pair in both
 * directions in «Аналіз слова», and the wiring of the MM-25 Russian-headword classifier (r2u index) into the app. One shared rule function (core/word-rules.ts) serves the annotator,
 * the search keys and «Аналіз слова».
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { key } from '../core/text.ts'
import { withGal, toOvati, toUvati, toDatStem, splitHyphenParticle } from '../core/gal-folds.ts'
import { featureChips, FEATURE_RULE_IDS } from '../core/feature-chips.ts'
import { CORRESPONDENCES, correspondenceFor, corrEvidence, variantFor } from '../core/correspondences.ts'
import { VARIANT_FAMILIES, familyOfLemma } from '../core/variant-families.ts'
import { featurePairs, variantHit, variantKeys, wordRules } from '../core/word-rules.ts'
import { buildRuHeadEntries, ruHitsOf } from '../core/ru-head.ts'
import { LM_NAMES } from '../core/parts.ts'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { buildRuHead } from '../pipelines/build-r2u.ts'
import type { VesumHit } from '../core/types.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { queryKeys } from '../src/lib/search.ts'
import { featureMarks } from '../src/lib/featureMarks.ts'
import { unknown } from '../core/evidence.ts'
import type { CoreCard } from '../core/types.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
const E = (t: Record<string, VesumHit[]>): Env => ({ hits: new Map(Object.entries(t).map(([k, v]) => [key(k), v])), derive: (s, oldI) => { const d = deriveRaw(s, { oldI }); return { ...d, candidates: withGal(d.candidates) } }, fold: (s, o) => withGal(foldRaw(s, o)) })
const T = (o: Partial<TypeCtx>): TypeCtx => ({ lang: 'uk', oldI: false, raw: '', ...o })
const link = (e: Env, t: TypeCtx) => { const r = linkOptions(t, e); return r ? chooseLemma(r.opts, new Map()) : undefined }
const mk = (lemma: string) => ({ lemma, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [] }) as unknown as CoreCard
const data = (pairs: [string, string][], extra: object = {}) => ({ ...emptyLex(), search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] }, cards: new Map(pairs.map(([, l]) => [l, mk(l)])), ...extra }) as unknown as AnnotateData

describe('MM-29 міст-ові / містові: the Western dative -ові on the unchanged stem links to міст and carries a «західна форма» feature chip', () => {
  const e = E({ міст: [H('міст', 'noun:inanim:m:v_naz')], мостові: [H('міст', 'noun:inanim:m:v_dav')] })
  it('the fold: -ові / -еві / -єві (with or without a hyphen) gives the stem; a short stem and a non-dative are untouched', () => {
    expect(toDatStem('міст-ові')).toBe('міст'); expect(toDatStem('містові')).toBe('міст'); expect(toDatStem('батьків-еві')).toBe('батьків'); expect(toDatStem('нові')).toBe('нові'); expect(toDatStem('вода')).toBe('вода')
  })
  it('the build link: «міст-ові» and «містові» → міст (trace ORTH-DAT-OVI); the standard dative мостові keeps its own VESUM link', () => {
    for (const raw of ['містові', 'міст-ові']) { const c = link(e, T({ raw }))!; expect(c.lemma, raw).toBe('міст'); expect(c.cand.trace, raw).toContain('ORTH-DAT-OVI') }
    expect(link(e, T({ raw: 'мостові' }))!.lemma).toBe('міст')
  })
  it('the chip: «західна форма» with the cite (Вікіпедія W-WPL, the uncited part disclosed), for a Galician witness, an edition and a neutral text', () => {
    expect(FEATURE_RULE_IDS).toContain('ORTH-DAT-OVI')
    for (const ctx of [{ authorRegion: 'Галичина' }, { orth: 'желехівка', edition: 'Львів 1893, НТШ' }, { authorRegion: 'Київ', year: 1900 }]) {
      const c = featureChips(['ORTH-DAT-OVI'], ctx)[0]!; expect(c.text).toMatch(/західна/); expect(c.cite.quote).toContain('-ови, -еви'); expect(c.cite.note).toContain('не підтверджено')
    }
  })
  it('the client: the annotator links «міст-ові», marks the feature, and the lemma header mark finds it', () => {
    const t = annotate('міст-ові', data([['міст', 'міст']]))[0]!
    expect(t.lemma).toBe('міст'); expect(t.provenance).toBe('derived'); expect(t.features).toEqual(['ORTH-DAT-OVI']); expect(t.derivedFrom!.trace.map(s => s.rule)).toEqual(['ORTH-DAT-OVI'])
    expect(featureMarks('містові', {}, k => k === 'міст').map(c => c.rule)).toEqual(['ORTH-DAT-OVI'])
    expect(queryKeys('містові')).toContain('міст'); expect(queryKeys('міст-ові')).toContain('міст')
  })
})

describe('MM-30 між ~ межи, меж, міжи, мендзи: one family; the cited members carry their line, the others say «джерела не знайдено»', () => {
  const e = E({ між: [H('між', 'prep')], межа: [H('межа', 'noun:inanim:f:v_naz')], меж: [H('межа', 'noun:inanim:f:v_rod:p'), H('меж', 'prep:arch')], межи: [] })
  it('межи / міжи / мендзи link to між; меж with a non-archaic VESUM reading (gen. pl. of межа) is NOT overridden', () => {
    for (const raw of ['межи', 'міжи', 'мендзи']) expect(link(e, T({ raw }))!.lemma, raw).toBe('між')
    expect(link(e, T({ raw: 'меж' }))!.lemma).toBe('межа')
    expect(link(E({ між: [H('між', 'prep')], меж: [H('меж', 'prep:arch')] }), T({ raw: 'меж' }))!.lemma).toBe('між')   // only the archaic prepositional lemma: the family decides
  })
  it('sources: межи / меж cite en.wiktionary; міжи / мендзи are uncited and say so; no feature or dialect is claimed for them', () => {
    const f = VARIANT_FAMILIES.find(x => x.head === 'між')!, by = (w: string) => f.members.find(m => m.form === w)!
    expect(by('межи').cite!.quote).toBe('alternative form of між'); expect(by('меж').cite!.quote).toContain('меж, межи'); expect(by('міжи').cite).toBeUndefined(); expect(by('мендзи').cite).toBeUndefined()
    const row = (w: string) => variantFor(w)!
    expect(row('мендзи').uncited).toBe(true); expect(corrEvidence(row('мендзи'), 'мендзи').note).toContain('джерела не знайдено'); expect(row('межи').uncited).toBeUndefined()
  })
  it('the shared function: the family on the token, the search keys, the lemma header', () => {
    expect(variantHit('мендзи')!.head).toBe('між'); expect(variantHit('мендзи')!.uncited).toBe(true); expect(variantHit('межи')!.uncited).toBe(false)
    expect(variantKeys('межи')).toEqual(['між']); expect(queryKeys('мендзи')).toContain('між')
    const t = annotate('межи', data([['між', 'між']]))[0]!; expect(t.lemma).toBe('між'); expect(t.provenance).toBe('derived'); expect(t.variant!.head).toBe('між'); expect(t.derivedFrom!.trace[0]!.rule).toBe('VF-MIZH')
    expect(familyOfLemma('між')!.members.map(m => m.form)).toEqual(['межи', 'меж', 'міжи', 'мендзи'])
  })
})

describe('MM-31 ві / уві / вві / у / в: the prothetic / alternating preposition family records which variant it is', () => {
  it('в is the euphonic partner of у (a peer: it keeps its own card); уві / вві are the expanded forms; ві / во / ув rare; each with its en.wiktionary line', () => {
    const f = VARIANT_FAMILIES.find(x => x.head === 'у')!, by = (w: string) => f.members.find(m => m.form === w)!
    expect(by('в').role).toBe('euphonic'); expect(by('в').peer).toBe(true); expect(by('уві').role).toBe('expanded'); expect(by('вві').cite!.quote).toContain('сні'); expect(by('ві').role).toBe('rare')
    expect(variantHit('в')!.roleUk).toContain('у / в'); expect(variantKeys('в')).toEqual([])   // a peer is never redirected
    expect(variantHit('уві')!.roleUk).toBe('розширена форма'); expect(familyOfLemma('в')).toBe(f)
  })
  it('the build link: уві / вві / ві → у (preposition); a one-letter в / у keep their own cards', () => {
    const e = E({ у: [H('у', 'prep')], в: [H('в', 'prep')], ві: [H('ві', 'prep:arch')] })
    for (const raw of ['уві', 'вві', 'ві']) expect(link(e, T({ raw }))!.lemma, raw).toBe('у')
    expect(link(e, T({ raw: 'в' }))!.lemma).toBe('в')
  })
})

describe('MM-32 увесь / ввесь / весь (and the forms усе, уся, усі … of the same pattern)', () => {
  it('увесь and ввесь link to весь; the cited declension forms are quiet members (link and search, no chip)', () => {
    const e = E({ весь: [H('весь', 'adj:m:v_naz:pron:def')] })
    for (const raw of ['увесь', 'ввесь']) expect(link(e, T({ raw }))!.lemma, raw).toBe('весь')
    expect(variantHit('усього')!.member.quiet).toBe(true); expect(variantHit('увесь')!.member.quiet).toBeUndefined(); expect(variantHit('увесь')!.roleUk).toContain('протетичн')
    expect(queryKeys('увесь')).toContain('весь'); expect(variantHit('увесь')!.evidence.quote).toContain('alternative form of весь')
  })
})

describe('MM-33 тілько / тилько → тільки (and тілько-що): a family with a cited dialect feature of the head', () => {
  const e = E({ тільки: [H('тільки', 'adv')], тілько: [H('тілько', 'adv:arch'), H('тілько', 'conj:subord:arch')] })
  it('тілько (a VESUM arch lemma) and тилько link to тільки; тілько-що / тилько-що link through the host', () => {
    for (const raw of ['тілько', 'тилько', 'тілько-що', 'тилько-що']) expect(link(e, T({ raw }))!.lemma, raw).toBe('тільки')
    expect(splitHyphenParticle('тілько-що')!.host).toBe('тілько'); expect(splitHyphenParticle('хто-що')).toBeUndefined()   // «що» is a tail only after a family member that allows tails
    expect(variantHit('тілько-що')!.tail).toBe('що')
  })
  it('the feature: the Western Ukraine pronunciation of тільки is cited (en.wiktionary); тилько is uncited and claims nothing', () => {
    const f = VARIANT_FAMILIES.find(x => x.head === 'тільки')!
    expect(f.feature!.cite.quote).toContain('Western Ukraine'); expect(f.members.find(m => m.form === 'тілько')!.cite!.quote).toContain('adv:arch'); expect(f.members.find(m => m.form === 'тилько')!.cite).toBeUndefined()
    const t = annotate('тілько-що', data([['тільки', 'тільки']]))[0]!; expect(t.lemma).toBe('тільки'); expect(t.variant!.tail).toBe('що'); expect(queryKeys('тілько-що')).toContain('тільки')
  })
})

describe('MM-34 како: the sense «як / яко» beside кака, and the POS gate keeps adverb / conjunction tokens off the noun', () => {
  const e = E({ як: [H('як', 'adv:&pron:int'), H('як', 'conj:subord')], кака: [H('кака', 'noun:inanim:f:v_naz')], како: [H('кака', 'noun:inanim:f:v_kly')] })
  it('a TOROT lemma «како» tagged Du / Dq / Df / G- links to як (adverb / conjunction), never to the noun кака; the row is an uncited ЦС correspondence', () => {
    for (const gate of ['P:Du', 'P:Dq', 'P:Df', 'P:G-']) { const c = link(e, T({ lang: 'orv', oldI: true, raw: 'како', lemma: 'како', gate }))!; expect(c.lemma, gate).toBe('як'); expect(c.cls).not.toBe('noun') }
    const row = correspondenceFor('како')!; expect(row.modern).toBe('як'); expect(row.kind).toBe('cs'); expect(row.uncited).toBe(true); expect(corrEvidence(row, 'како').note).toContain('джерела')
  })
  it('an un-lemmatised orv witness also goes to як; a MODERN Ukrainian token «како» is not hijacked (the vocative of кака stays); the annotator lists the sense beside it', () => {
    expect(link(e, T({ lang: 'orv', oldI: true, raw: 'како' }))!.lemma).toBe('як')
    expect(link(e, T({ lang: 'uk', raw: 'како' }))!.lemma).toBe('кака')
    const t = annotate('како', data([['како', 'кака'], ['як', 'як']]))[0]!; expect(t.lemma).toBe('кака'); expect(t.variant!.sense).toBe(true); expect(t.variant!.head).toBe('як'); expect(t.variant!.uncited).toBe(true)
  })
  it('яко is cited (en.wiktionary + VESUM arch) and links to як', () => {
    expect(link(E({ як: [H('як', 'conj:subord')], яко: [H('яко', 'conj:subord:arch')] }), T({ raw: 'яко' }))!.lemma).toBe('як')
    expect(variantHit('яко')!.uncited).toBe(false)
  })
})

describe('MM-35 керовати ↔ керувати in «Аналіз слова»: the -ова- ~ -ува- feature, BOTH directions, one cited rule (ORTH-VERB-OVATI, Огоновський 1889 § 38)', () => {
  it('the folds are inverse on the verb family', () => {
    expect(toUvati('керовати')).toBe('керувати'); expect(toOvati('керувати')).toBe('керовати'); expect(toOvati(toUvati('шановав'))).toBe('шановав'); expect(toOvati('вода')).toBe('вода')
  })
  it('керовати → керувати (forward) and керувати → керовати (reverse): same rule, same cite, the direction named', () => {
    const known = (k: string) => k === 'керувати'
    const f = featurePairs('керовати', known)[0]!, r = featurePairs('керувати', k => k === 'керувати' || k === 'керовати')[0]!
    expect(f.rule).toBe('ORTH-VERB-OVATI'); expect(f.direction).toBe('forward'); expect(f.to).toBe('керувати'); expect(f.known).toBe(true); expect(f.text).toContain('давніша')
    expect(r.rule).toBe('ORTH-VERB-OVATI'); expect(r.direction).toBe('reverse'); expect(r.to).toBe('керовати'); expect(r.text).toContain('сучасна'); expect(r.cite).toBe(f.cite)
    expect(f.cite.source).toBe('OGON'); expect(f.cite.quote).toContain('-ува-ти')
    expect(featureChips(['ORTH-VERB-OVATI'], {})[0]!.feature).toContain('-овати')
  })
  it('the SAME function serves «Аналіз слова», the annotator and the search keys', () => {
    expect(wordRules('керувати', { known: k => k === 'керувати' }).pairs.map(p => p.direction)).toEqual(['reverse'])
    const t = annotate('керувати', data([['керувати', 'керувати']]))[0]!; expect(t.pairs!.map(p => p.direction)).toEqual(['reverse'])
    expect(annotate('керовати', data([['керувати', 'керувати']]))[0]!.pairs!.map(p => p.direction)).toEqual(['forward'])
    expect(queryKeys('керувати')).toContain('керовати'); expect(queryKeys('керовати')).toContain('керувати')
    const av = rd('src/views/AnalyzeView.vue'); expect(av).toContain('wordRules(word.value'); expect(av).toContain('<WordRuleChips')
  })
})

describe('MM-36 MM-25 wiring: the r2u Russian-headword index feeds the app; отношеніє gets a form-type class; search, «Аналіз слова» and the annotator share the function', () => {
  const rows: [number, number, string, string, string[], string[], string][] = [
    [2, 27492468, 'лист', 'ukr', ['Отношение'], ['стосу́нок', 'ста́влення', 'лист'], 'Отношение – / 1) стосу́нок, -нку; / 2) ста́влення, -ння; / 3) (в канц.) лист, -та́.'],
    [12, 1, 'x', 'ukr', ['Вода'], ['вода'], 'Вода – вода'],   // a uk-ru dictionary: not a Russian headword
  ]
  const dicts = new Map([[2, { short: 'Ізюмов', dir: 'ru-uk' }], [12, { short: 'Грінченко', dir: 'uk-ru' }]])
  it('the index: only ru→uk rows, filed under the folded headword, equivalents key()ed, locator and quote kept', () => {
    const idx = buildRuHeadEntries(rows, dicts)
    expect(Object.keys(idx)).toEqual(['отношение']); const h = ruHitsOf(idx, 'отношение')[0]!
    expect(h.dict).toBe('Ізюмов'); expect(h.equivalents).toEqual(['стосунок', 'ставлення', 'лист']); expect(h.locator).toContain('#2_27492468'); expect(h.quote.length).toBeLessThanOrEqual(200)
  })
  it('the sidecar is registered (lm/ru), written by the r2u build step and split by build-parts; the app hands it to the annotator', () => {
    expect(LM_NAMES).toContain('ru'); expect(rd('pipelines/build-r2u.ts')).toContain("'ruhead.json'"); expect(rd('pipelines/build-parts.ts')).toContain("splitMap('ru'")
    expect(rd('src/composables/useData.ts')).toContain('ru: ruLookups'); expect(rd('src/lib/ruIndex.ts')).toContain("lmPeek<RuHeadFile>('ru'")
    const rh = buildRuHead({ format: 1, generated: 'x', lookups: 1, source: { site: '', licence: '', note: '' }, dicts: [{ id: 2, unit: 'u', short: 'Ізюмов', title: '', authors: '', years: [1930, 1930], dir: 'ru-uk', page: '' }], rows, by: {} })
    expect(Object.keys(rh.entries)).toEqual(['отношение'])
  })
  it('отношеніє: суржик in a modern text, ЦС / книжна before 1798, язичіє in 1850–1918 Galicia — through the shared function and through the annotator', () => {
    const ru = { ruHead: (k: string) => ruHitsOf(buildRuHeadEntries(rows, dicts), k) }
    const look = { known: () => false, ru }
    expect(wordRules('Отношеніє', look).ruClass!.kind).toBe('surzhyk'); expect(wordRules('отношеніє', look, { year: 1750 }).ruClass!.kind).toBe('cs')
    expect(wordRules('отношеніє', look, { year: 1870, region: 'Галичина' }).ruClass!.kind).toBe('yazychie')
    expect(wordRules('отношеніє', { known: () => true, ru }).ruClass).toBeUndefined()
    const t = annotate('отношеніє', { ...data([]), ru } as unknown as AnnotateData)[0]!; expect(t.ruClass!.kind).toBe('surzhyk'); expect(t.ruClass!.standard.map(s => s.lemma)).toContain('ставлення')
  })
  it('real data: when public/data/r2u.json is present the index finds отношение with відношення / ставлення', () => {
    if (!existsSync('public/data/r2u.json')) return
    const f = JSON.parse(readFileSync('public/data/r2u.json', 'utf8')), rh = buildRuHead(f)
    expect(ruHitsOf(rh.entries, 'отношение').length).toBeGreaterThan(0); expect(ruHitsOf(rh.entries, 'отношение').flatMap(h => h.equivalents)).toContain('ставлення')
    expect(Object.keys(rh.entries).length).toBeGreaterThan(5000)
  })
})

describe('MM-29..MM-36 the table is consistent', () => {
  it('every family member has a cite or says it has none; every row of the table has a source line or the uncited flag; the heads are not their own members', () => {
    for (const f of VARIANT_FAMILIES) for (const m of f.members) { expect(m.form).not.toBe(f.head); if (m.cite) { expect(m.cite.quote.length, m.form).toBeGreaterThan(8); expect(m.cite.url).toMatch(/^https:\/\//) } }
    for (const c of CORRESPONDENCES) if (c.uncited) expect(corrEvidence(c, c.old[0] ?? c.variants![0]!).note).toContain('джерела')
  })
})
