/**
 * SPEC 63 RU-1: a `ru` provenance flag for every source whose EDITION or DESCRIPTION is Russian (owner 2026-10-21: «mark every russian source as such because they may
 * overwrite or ignore ukrainian features»). The flag says nothing about the Ukrainian text itself: it says that the edition / dictionary / apparatus passed through a Russian
 * institution, Russian-language editing or Russian glosses. Pure (no node / DOM imports): shared by the build (WitnessMeta.ru), the UI badge and the tests.
 *
 * Kinds (decided from the source's own metadata only — place, publisher, edition statement, declared gloss language; nothing is guessed):
 *  - edition    = published by a Russian imperial or Russian institution / editor (СПб., Москва, Археографічна комісія, ПСРЛ, РИБ …)
 *  - dictionary = a Russian-language dictionary or one with Russian glosses (DICT_COVER.lang = 'ru', Russian Wiktionary rows)
 *  - apparatus  = a source whose description / commentary is Russian-language only
 * Evidence for the warning text: research/46-russian-sources.md (only quotes that were opened; where none was found the file says «no evidence found»).
 */
import { dictById, DICT_COVER } from './se.ts'

export type RuKind = 'edition' | 'dictionary' | 'apparatus'
export interface RuFlag { kind: RuKind; why: string }

export const RU_EVIDENCE_URL = 'https://github.com/dmytrozahor/BULP/blob/mvp/research/46-russian-sources.md'
export const RU_TIP = 'Російське видання/джерело: можливе нівелювання або ігнорування українських рис'
export const RU_LABEL: Record<RuKind, string> = { edition: 'рос. видання', dictionary: 'рос. джерело', apparatus: 'рос. джерело' }
export const RU_KIND_UK: Record<RuKind, string> = { edition: 'російське видання', dictionary: 'словник з російськими тлумаченнями', apparatus: 'російськомовний апарат' }

/** place / institution markers of a Russian edition statement (matched on `edition` + `title`); each rule says why */
const EDITION_RULES: { re: RegExp; why: string }[] = [
  { re: /(^|[\s,(«])(СПб\.?|Санкт-?Петербург\p{L}*|Петербург\p{L}*|Петроград\p{L}*)(?=[\s.,;)»]|$)/u, why: 'місце видання — Санкт-Петербург (Російська імперія)' },
  { re: /(^|[\s,(«])Москв\p{L}*(?=[\s.,;)»]|$)/u, why: 'місце видання — Москва' },
  { re: /Археографическ\p{L}+|Археографічн\p{L}+|[Кк]оммисс?і\p{L}*|[Кк]омісі\p{L}* для розгляду давніх актів|Временн\p{L}+ коммисс/u, why: 'видання Археографічної / Тимчасової комісії (імперська установа)' },
  { re: /Русская\s+[Ии]сторическая\s+[Бб]иблиотека|Русск\p{L}+ исторической библиотек\p{L}*|\bРИБ\b/u, why: 'Русская историческая библиотека (СПб., Археографічна комісія)' },
  { re: /Памятники полемической литературы/u, why: 'РИБ: «Памятники полемической литературы в Западной Руси» (СПб.)' },
  { re: /Архив\p{L}*\s+Юго-Западной России|\bАЮЗР\b|Акты Южной и Западной России/u, why: 'АЮЗР / Акты ЮЗР (Київська Археографічна комісія, російськомовне видання)' },
  { re: /Летопись событий в Юго-Западной России/u, why: 'Величко, вид. Київської Археографічної комісії 1848–64' },
  { re: /\bПСРЛ\b|Полное собрание русских летописей/u, why: 'ПСРЛ (Полное собрание русских летописей, СПб.)' },
  { re: /Исторія Русовъ|Историю Русов/u, why: '«Исторія Русовъ», Москва 1846 (видання О. Бодянського)' },
  { re: /Императорск\p{L}+|Імператорськ\p{L}+/u, why: 'видання імператорської установи' },
]

/** editions whose text is Ukrainian and whose edition statement says the apparatus (preface, notes) is Russian-language: kind \`apparatus\` (e.g. Potebnja's Kharkiv 1887 Kvitka: the text keeps Ukrainian phonetics, the preface is Russian) */
const APPARATUS_RULES: { re: RegExp; why: string }[] = [
  { re: /(?:передмов\p{L}*|примітк\p{L}*|предисловие|примечани\p{L}*)[^.;]{0,60}(?:російськ\p{L}*|по-русски|русск\p{L}*)/iu, why: 'передмова й примітки видавця російською; сам текст — українська мова (перевірте орфографію видання)' },
]
/** dictionary-like witnesses are decided by their declared gloss language (DICT_COVER.lang) */
export function ruOfDict(id: string): RuFlag | undefined {
  const d = dictById(id)
  return d && d.lang === 'ru' ? { kind: 'dictionary', why: `словник «${d.short}» має російські тлумачення (мова глос: ru; ${d.edition[0]}–${d.edition[1]})` } : undefined
}

export interface WitnessLike { id: string; title?: string; edition?: string; url?: string; ru?: RuFlag }
/** the `ru` flag of one witness: an explicit `ru` wins, then a dictionary id, then the place / institution rules over `edition` + `title` */
export function ruOfWitness(w: WitnessLike | undefined): RuFlag | undefined {
  if (!w) return undefined
  if (w.ru) return w.ru
  const base = w.id.replace(/_\d.*$/, '')
  const dict = ruOfDict(w.id) ?? ruOfDict(base) ?? ruOfDict(base.replace(/^r2u_?/, 'r2u_'))
  if (dict) return dict
  const s = `${w.edition ?? ''} ${w.title ?? ''}`
  for (const r of EDITION_RULES) if (r.re.test(s)) return { kind: 'edition', why: r.why }
  for (const r of APPARATUS_RULES) if (r.re.test(s)) return { kind: 'apparatus', why: r.why }
  if (/(^|[/.\s])ru\.wiktionary\.org|ruwikt|wikt[._]ru/i.test(`${w.id} ${w.url ?? ''}`)) return { kind: 'dictionary', why: 'ru.wiktionary: російськомовне джерело' }
  return undefined
}

/** registry sources (core/sources.ts ids) decided from their own title / publisher */
const SOURCE_RU: Record<string, RuFlag> = {
  R2U: { kind: 'dictionary', why: 'r2u.org.ua: російсько-українські та українсько-російські словники 1886–1933 з російськими тлумаченнями' },
  HRINCH: { kind: 'dictionary', why: 'Грінченко 1907–09: тлумачення російською (DICT_COVER r2u_hrinch09, lang ru)' },
  MAKSYM1834: { kind: 'edition', why: 'Максимович, Украинскія народныя пѣсни, Москва 1834' },
  OPENCORPORA: { kind: 'dictionary', why: 'OpenCorpora: російський морфологічний словник' },
  FBRU: { kind: 'apparatus', why: 'російськомовна стаття (fb.ru)' },
  LONKIN: { kind: 'apparatus', why: 'російськомовна стаття (Ломоносов-2025, МДУ)' },
  AVDEEVA: { kind: 'dictionary', why: 'Авдеева, Словарь украинских говоров Воронежской области: Воронеж, російськомовні тлумачення' },
}
export const ruOfSource = (id: string): RuFlag | undefined => SOURCE_RU[id] ?? ruOfDict(id)
/** every id the flag table knows by itself (research/46 lists the decisions) */
export const RU_SOURCE_IDS = Object.keys(SOURCE_RU)
export const RU_DICT_IDS = DICT_COVER.filter(d => d.lang === 'ru').map(d => d.id)
/** one evidence / citation: a witness id resolves through the witness table, a registry id through the table above */
export const ruOfEvidence = (source: string, wit?: WitnessLike): RuFlag | undefined => ruOfWitness(wit) ?? ruOfSource(source)
