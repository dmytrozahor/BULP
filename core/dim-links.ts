/**
 * SPEC 63 MM-23 (owner: «тоненький теж має лінкуватися до тонкий… як і всі такі форми»): diminutive, endearing, augmentative and intensive derivatives are linked to their base lemma.
 * Primary source: the dictionary statement itself, parsed from the licensed СУМ-11 / СУМ-20 glosses (data/work/se-parsed/<dict>.json, rows with `g`): «Зменш.-пестл. до тонкий», «Пестл. до …»,
 * «Збільш. до …», «Підсил. до …», «Зменш. до …». Second source: the en.wiktionary sense line «diminutive of …» / «endearing diminutive of …» / «augmentative of …» (kaikki, CC BY-SA).
 * No morphological fallback rule is in this module: no source quoting the suffixes -еньк-, -есеньк-, -ісіньк-, -езн-, -ущ- was available when it was written (no cite, no rule).
 * Pure (no node imports).
 */
export type DimRel = 'dim' | 'dim-aff' | 'aff' | 'aug' | 'int'
/** label on the derivative's card: «зменшено-пестливе до тонкий» */
export const DIM_REL_UK: Record<DimRel, string> = { dim: 'зменшене', 'dim-aff': 'зменшено-пестливе', aff: 'пестливе', aug: 'збільшене', int: 'підсилене' }
/** label of the group on the base card */
export const DIM_GROUP_UK: Record<DimRel, string> = { dim: 'зменшені', 'dim-aff': 'зменшено-пестливі', aff: 'пестливі', aug: 'збільшені', int: 'підсилені' }

export type DimSrcId = 'sum11' | 'sum20' | 'wikt'
/** one link as stored under the DERIVATIVE: [base, relation, source id, verbatim quote (≤ 200), locator (volume / page or url)] */
export type DimOf = [base: string, rel: DimRel, src: DimSrcId, quote: string, loc: string]
/** per lemma: `of` = this lemma is a derivative of `base`; `ds` = the derivatives of this lemma [derivative, relation, source id] */
export interface DimEntry { of?: DimOf[]; ds?: [derivative: string, rel: DimRel, src: DimSrcId][] }
export interface DimFile { format: 1; generated: string; entries: Record<string, DimEntry> }

const WORD = /^[а-яіїєґ][а-яіїєґ'’-]*$/u
const clean = (s: string) => s.normalize('NFC').replace(/[́̀]/g, '').trim().toLowerCase()

/** «Зменш.-пестл. до тонкий», «Пестл. до хата», «Збільш. до …», «Підсил. до …», «Зменш. до …», «Зменшено-пестливе до …» → relation + base. The base is the first word after «до». */
const SUM = /^(?:\d+\.\s*)?(зменш(?:\.|ено)?[\s-]*(?:[-–]\s*)?пестл(?:\.|ив\p{L}*)?|зменш(?:\.|ен\p{L}*)|пестл(?:\.|ив\p{L}*)|збільш(?:\.|ен\p{L}*)|підсил(?:\.|ен\p{L}*|юв\p{L}*)?)\s+до\s+(\p{L}[\p{L}'’́-]*)/iu
export function parseSumRel(gloss: string): { rel: DimRel; base: string } | undefined {
  const m = SUM.exec(gloss.normalize('NFC').trim()); if (!m) return undefined
  const k = m[1]!.toLowerCase(), base = clean(m[2]!)
  if (!WORD.test(base)) return undefined
  const rel: DimRel = /^зменш.*пестл/.test(k) ? 'dim-aff' : /^зменш/.test(k) ? 'dim' : /^пестл/.test(k) ? 'aff' : /^збільш/.test(k) ? 'aug' : 'int'
  return { rel, base }
}

/** en.wiktionary glosses: «diminutive of тонки́й (tonkýj)», «endearing diminutive of …», «augmentative of …», «intensive of …» */
const WIKT = /^(endearing diminutive|affectionate diminutive|diminutive|augmentative|intensive|intensifying)\s+of\s+(\p{L}[\p{L}'’́-]*)/iu
export function parseWiktRel(gloss: string): { rel: DimRel; base: string } | undefined {
  const m = WIKT.exec(gloss.normalize('NFC').trim()); if (!m) return undefined
  const base = clean(m[2]!); if (!WORD.test(base)) return undefined
  const k = m[1]!.toLowerCase()
  return { rel: /endearing|affectionate/.test(k) ? 'dim-aff' : k === 'diminutive' ? 'dim' : k === 'augmentative' ? 'aug' : 'int', base }
}

/** accumulate one link into the per-lemma map; a derivative keeps one link per (base, source), the base lists each derivative once */
export function addDim(into: Map<string, DimEntry>, derivative: string, base: string, rel: DimRel, src: DimSrcId, quote: string, loc: string): boolean {
  if (derivative === base) return false
  const d = into.get(derivative) ?? into.set(derivative, {}).get(derivative)!
  const of = d.of ?? (d.of = [])
  if (of.some(x => x[0] === base && x[2] === src)) return false
  of.push([base, rel, src, quote.slice(0, 200), loc])
  const b = into.get(base) ?? into.set(base, {}).get(base)!
  const ds = b.ds ?? (b.ds = [])
  if (!ds.some(x => x[0] === derivative)) ds.push([derivative, rel, src])
  return true
}
