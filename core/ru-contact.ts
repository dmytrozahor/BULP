/**
 * SPEC 63 MM-25 (owner: «Отношеніє» is not «невідоме»: find out what kind of form it is): a general, evidence-based classifier of Russian-looking forms.
 * Evidence, all from our own data: (1) a Russian HEADWORD of the ru→uk r2u dictionaries (Уманець–Спілка, Кримський–Єфремов, Ізюмов, Дорошенко–Станиславський, Якубські) that is not a Ukrainian lemma;
 * the Ukrainian equivalents printed in the same article are the «літературний відповідник» (quoted with dictionary and locator); (2) the NATIVE DERIVATION TEST: do the project's cited sound rules
 * (core/phonology.ts) turn the etymon into a Ukrainian lemma? (3) the date and region of the text. The type is chosen only when the evidence decides; otherwise every possible type is listed.
 *
 * Types (the chronology reuses the project's own gates, core/rules.ts: 1798 = the first Ukrainian literary edition, 1919 = the end of the old orthography, core/detect.ts `modern`):
 *  - 'surzhyk'  modern text (no year = contemporary input, or year ≥ 1919); the possible older types stay listed when there is no year: «контактне / суржик (русизм)»; the Russian form is shown as «російський варіант», never as a source (MM-9);
 *  - 'yazychie' 1850–1918, region Галичина / Буковина / Закарпаття: язичіє. Wikipedia «Язичіє»: «Основою язичія була церковнослов'янська мова в суміші з російською, але з домішкою українізмів та
 *               полонізмів…», «яку вживали в Галичині, Буковині та Закарпатті із середини XIX до початку XX століть»;
 *  - 'cs'       before 1798: «церковнослов'янська / книжна форма (спільна з рос.)», not surzhyk;
 *  - 'ambiguous' 1798–1918 outside those regions, or no usable region: the possible types are listed, none is chosen.
 * Never labelled: a Ukrainian lemma (VESUM / card), a dialect form with a cited source (`isDialect`).
 * Pure (no node imports).
 */
import { Q, type Evidence } from './evidence.ts'
import { key } from './text.ts'

export type RuKind = 'surzhyk' | 'yazychie' | 'cs' | 'ambiguous'
export const RU_KIND_UK: Record<RuKind, string> = {
  surzhyk: 'контактне / суржик (русизм)', yazychie: 'язичіє (галицько-буковинсько-закарпатська книжна мова XIX–поч. XX ст.)',
  cs: 'церковнослов’янська / книжна форма (спільна з рос.)', ambiguous: 'тип не визначено: можливі типи — див. докази',
}
export const YAZYCHIE_CITE: Evidence[] = [
  Q('WUK', 'https://uk.wikipedia.org/wiki/Язичіє', 'Основою язичія була церковнослов\'янська мова в суміші з російською, але з домішкою українізмів та полонізмів'),
  Q('WUK', 'https://uk.wikipedia.org/wiki/Язичіє', 'яку вживали в Галичині, Буковині та Закарпатті із середини XIX до початку XX століть'),
]
export const YAZYCHIE_FROM = 1850, OLD_ORTH_END = 1919, FIRST_UKR_EDITION = 1798
const YAZ_REGION = /Галич|Львів|Буковин|Чернів|Закарпат|Підкарпат|Прикарпат|Лемківщ/i

/** one r2u ru→uk article whose Russian headword is the form */
export interface RuHit { dict: string; locator: string; equivalents: string[]; quote: string }
export interface RuLookups {
  /** Russian headwords of the r2u ru→uk dictionaries by folded spelling (ruKey) */
  ruHead: (k: string) => RuHit[]
  /** a Ukrainian lemma / VESUM form */
  isUkrainian: (k: string) => boolean
  /** a dialect form with a cited source (core/dialect-lex.ts) */
  isDialect?: (k: string) => boolean
}
export interface RuCtx { year?: number; region?: string }

/** Ukrainian-letter spelling of a Russian word → the Russian headword key: і ї → и, є → е (after a consonant, ending -ніє → -ние), ѣ → е, ъ dropped, ґ → г */
export const ruKey = (w: string): string => key(w).replace(/[ії]/g, 'и').replace(/є/g, 'е').replace(/ѣ/g, 'е').replace(/[ъ]/g, '').replace(/ґ/g, 'г').replace(/ѥ/g, 'е')

export interface RuClass {
  form: string; kind: RuKind; label: string
  /** the Russian headword as «російський варіант» (a variant, never a source) */ ruVariant: string
  /** літературні відповідники printed in the same r2u article, with dictionary and locator */ standard: { lemma: string; dict: string; locator: string }[]
  /** every type the evidence allows (one when decided) */ possible: RuKind[]
  evidence: Evidence[]
}
/** `undefined` = nothing to say (a Ukrainian lemma, a cited dialect form, or no r2u headword) */
export function classifyRu(word: string, ctx: RuCtx, look: RuLookups): RuClass | undefined {
  const k = key(word)
  if (!k || look.isUkrainian(k) || look.isDialect?.(k)) return undefined
  const rk = ruKey(word), hits = look.ruHead(rk)
  if (!hits.length || look.isUkrainian(rk)) return undefined
  const standard = hits.flatMap(h => h.equivalents.map(lemma => ({ lemma, dict: h.dict, locator: h.locator }))).filter((s, i, a) => a.findIndex(x => x.lemma === s.lemma) === i)
  const evidence: Evidence[] = hits.slice(0, 3).map(h => Q(h.dict, h.locator, h.quote.slice(0, 300), `російське слово «${rk}»: українські відповідники статті`))
  const y = ctx.year
  let kind: RuKind, possible: RuKind[]
  if (y === undefined) { kind = 'surzhyk'; possible = ['surzhyk', 'yazychie', 'cs'] }   // no year = a contemporary text / user input (core/detect.ts `modern`); the other types stay listed as possible
  else if (y >= OLD_ORTH_END) { kind = 'surzhyk'; possible = ['surzhyk'] }
  else if (y < FIRST_UKR_EDITION) { kind = 'cs'; possible = ['cs'] }
  else if (y >= YAZYCHIE_FROM && ctx.region && YAZ_REGION.test(ctx.region)) { kind = 'yazychie'; possible = ['yazychie'] }
  else { kind = 'ambiguous'; possible = ['cs', 'surzhyk'] }
  if (kind === 'yazychie' || possible.includes('yazychie')) evidence.push(...YAZYCHIE_CITE)
  return { form: word, kind, label: RU_KIND_UK[kind], ruVariant: rk, standard, possible, evidence }
}

/**
 * The native derivation test: run the cited sound rules forward from the (restored) OES / ЦС etymon and see whether a Ukrainian lemma comes out. `derive` = core/phonology.ts derive
 * (oldI true), `isLemma` = VESUM. A form that shows NEITHER native change (the prefix отъ- > від-, the ending -ниѥ / -ньѥ > -ння) is not a vernacular outcome.
 * The ending -ние / -ніє (OES -ниѥ, i-stem) is not reached by R13 (it needs -ьѥ), so отношеніє keeps both ЦС features.
 */
export function nativePath(word: string, derive: (s: string, oldI: boolean) => { candidates: { form: string; trace: string[] }[] }, isLemma: (k: string) => boolean): { native?: { form: string; trace: string[] }; kept: string[] } {
  const w = key(word), restored = [w, w.replace(/(ні|ньи)[єеѥ]$/, 'нье')], seen = new Set<string>()
  for (const r of restored) for (const c of derive(r, true).candidates) { if (seen.has(c.form)) continue; seen.add(c.form); if (isLemma(key(c.form)) && c.form !== w) return { native: { form: c.form, trace: c.trace }, kept: [] } }
  return { kept: [/^от[ъо]?[а-яіїє]/.test(w) ? 'от-' : '', /ни[єеѥ]$|ні[єе]$/.test(w) ? '-ніє' : ''].filter(Boolean) }
}
