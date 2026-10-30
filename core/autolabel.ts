/**
 * SPEC 63 AC — automatic classification. Pure: no node or DOM imports.
 *
 * Labels (usage / dialect / contact) are produced by code from what the ingested sources already say; no word is classified by hand.
 *  - AC-1  one abbreviation table per source, each row quoting the source's OWN list (the label's definition); `articleLabels` finds the abbreviations in an
 *          article and returns {row, quote} where the quote is a verbatim slice of the article. No quote → no claim.
 *  - AC-2  region → dialect group through a gazetteer whose every row quotes the dialect's own description (uk.wikipedia, research/04 §0 W-* sources) — never per word.
 *  - AC-3  contact («суржик»): form ∉ VESUM ∧ known to the Russian dictionary ∧ a Russian→Ukrainian dictionary gives a different Ukrainian equivalent (r2u quote).
 * Unknown stays unknown (SPEC 00): a region the gazetteer does not name yields no dialect claim.
 */
import { claim, D, Q, type Claim, type Evidence } from './evidence.ts'
import { key } from './text.ts'

// ── AC-1: abbreviation tables ─────────────────────────────────────────────────────────────────────────
export interface AbbrRow {
  /** the abbreviation exactly as the source prints it («Галиц.», or an en.wiktionary tag) */
  abbr: string
  /** the source's own explanation of the abbreviation, verbatim */
  meaning: string
  /** SPEC 60 usage label id (core/usage.ts USAGE_LABELS) the abbreviation stands for */
  usage?: string
  /** the area the abbreviation names (resolved to a dialect group by the gazetteer, AC-2) */
  region?: string
}
export interface AbbrTable {
  id: string
  /** id in core/sources.ts of the dictionary that owns the abbreviations */
  source: string
  /** where the source prints its list of abbreviations */
  list: string
  rows: AbbrRow[]
}

/** Грінченко, «Словарь української мови», «Списокъ сокращеній» (r2u.org.ua/node/62, fetched 2026-10-14): the regional abbreviations. */
export const HRINCH_ABBR: AbbrTable = {
  id: 'hrinch', source: 'HRINCH', list: 'https://r2u.org.ua/node/62 (Списокъ сокращеній)',
  rows: [
    { abbr: 'Галиц.', meaning: 'Галиц. — Галиція.', region: 'Галиція' },
    { abbr: 'Гуцул.', meaning: 'Гуцул. — Гуцульщина.', region: 'Гуцульщина' },
    { abbr: 'Угор.', meaning: 'Угор. — Угорщина', region: 'Угорщина' },
  ],
}
/** Голоскевич, «Правописний словник» 1929, «Пояснення деяких скорочень» (r2u.org.ua/html/goloskevych_pered.html, fetched 2026-10-15): the labels that name usage or area. */
export const HOLOSK_ABBR: AbbrTable = {
  id: 'holosk', source: 'HOLOSK', list: 'https://r2u.org.ua/html/goloskevych_pered.html (Пояснення деяких скорочень)',
  rows: [
    { abbr: 'діял.', meaning: 'діял. – діялектичний', usage: 'dial' },
    { abbr: 'гал.', meaning: 'гал. – галицький', region: 'Галиція' },
    { abbr: 'стар.', meaning: 'ст., стар. – старий', usage: 'zast' },
  ],
}
/** r2u dictionary id → the abbreviation table of that dictionary (Грінченко 1907–09 and its 3rd edition; Голоскевич 1929). */
export const R2U_ABBR: Record<number, AbbrTable> = { 12: HRINCH_ABBR, 18: HRINCH_ABBR, 11: HOLOSK_ABBR }

const GLOSS = 'https://en.wiktionary.org/wiki/Appendix:Glossary'
/**
 * en.wiktionary sense tags (kaikki.org, data/raw/kaikki/uk.jsonl) → usage label. The `meaning` is the tag's definition in Wiktionary's own glossary
 * (Appendix:Glossary, fetched 2026-10-14); the tag → Ukrainian label pairing is the table row.
 */
export const KAIKKI_TAGS: AbbrTable = {
  id: 'kaikki-tags', source: 'KAIKKI', list: GLOSS,
  rows: [
    { abbr: 'colloquial', usage: 'rozm', meaning: 'Denotes words belonging to a spoken or vernacular variety of a language.' },
    { abbr: 'dialectal', usage: 'dial', meaning: 'Of or relating to a dialect' },
    { abbr: 'dated', usage: 'zast', meaning: 'Formerly in common use, and still in occasional use, but now unfashionable' },
    { abbr: 'obsolete', usage: 'zast', meaning: 'No longer in use, and (of a term) no longer likely to be understood.' },
    { abbr: 'archaic', usage: 'arkh', meaning: 'No longer in general use, but still found in some contemporary texts that aim for an antique style, like historical novels.' },
    { abbr: 'historical', usage: 'istor', meaning: 'Describing an object or concept which is no longer extant or current' },
    { abbr: 'slang', usage: 'zharh', meaning: 'Denotes language that is unique to a particular profession or subject, i.e. jargon.' },
    { abbr: 'vulgar', usage: 'vulg', meaning: 'Language considered distasteful, obscene, profane, or otherwise unsuitable for use in polite or formal speech.' },
    { abbr: 'derogatory', usage: 'znevazh', meaning: 'A word form expressing a negative or belittling attitude towards the person or thing referred to.' },
    // LB-8: regional context labels (category pages fetched 2026-10-22); they name an area, see KAIKKI_REGION in core/dict-labels.ts
    { abbr: 'regional', usage: 'dial', meaning: 'Category:Regional Ukrainian — Categories containing terms in regional varieties of Ukrainian.' },
    { abbr: 'Southwestern', usage: 'dial', meaning: 'Category:Southwestern Ukrainian — Terms or senses in Ukrainian as spoken in Western and Central Ukraine.' },
    { abbr: 'Western', usage: 'dial', meaning: 'Category:Southwestern Ukrainian — Terms or senses in Ukrainian as spoken in Western and Central Ukraine.' },
    { abbr: 'Southeastern', usage: 'dial', meaning: 'Category:Southeastern Ukrainian — Terms or senses in Ukrainian as spoken in Central, Southern (incl. Crimea), Eastern Ukraine.' },
    { abbr: 'Transcarpathian', usage: 'dial', meaning: 'Category:Transcarpathian Ukrainian — Terms or senses in Ukrainian as spoken in Transcarpathia region.' },
    { abbr: 'Slobozhan', usage: 'dial', meaning: 'Category:Slobozhan Ukrainian — Terms or senses in Ukrainian as spoken in Sloboda Ukraine.' },
    { abbr: 'Pokuttia–Bukovina', usage: 'dial', meaning: 'Category:Pokuttia–Bukovina Ukrainian — Terms or senses in Ukrainian as spoken in Western Ukraine.' },
    { abbr: 'Dniestrian', usage: 'dial', meaning: 'Category:Dniestrian Ukrainian — Terms or senses in Ukrainian as spoken in Western Ukraine.' },
    { abbr: 'Middle Dnieprian', usage: 'dial', meaning: 'Category:Middle Dnieprian Ukrainian — Terms or senses in Ukrainian as spoken in Central / Dnieper Ukraine.' },
    { abbr: 'Steppe', usage: 'dial', meaning: 'Category:Steppe Ukrainian — Terms or senses in Ukrainian as spoken in Southern (incl. Crimea), Eastern Ukraine, and Russia.' },
    { abbr: 'poetic', usage: 'poet', meaning: 'Language, commonly associated with poetry, that is typically chosen to have an artistic or cultural impact on the listener.' },
  ],
}
export const kaikkiTag = Object.fromEntries(KAIKKI_TAGS.rows.map(r => [r.abbr, r])) as Record<string, AbbrRow>
/** The tags the harvest keeps (everything else on a sense — case, number, transitivity — is grammar, not a label). */
export const KAIKKI_KEEP = new Set(KAIKKI_TAGS.rows.map(r => r.abbr))

export const enWiktUrl = (word: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Ukrainian`

/** Evidence pair of one abbreviation hit: the article quote (D) + the source's own definition of the abbreviation (Q). */
export const abbrEvidence = (t: AbbrTable, r: AbbrRow): Evidence => Q(t.source, t.list, r.meaning)

/** A label found in an article: the table row and the verbatim slice around it. */
export interface ArticleLabel { row: AbbrRow; quote: string }
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/**
 * AC-1: abbreviations of `table` that occur in an article text (word-initial, case-sensitive as printed, the period included).
 * The quote is a verbatim slice of the text (≤ 120 characters around the hit); the same abbreviation is reported once.
 */
export function articleLabels(table: AbbrTable, text: string): ArticleLabel[] {
  const out: ArticleLabel[] = []
  for (const row of table.rows) {
    const m = new RegExp(`(?<![\\p{L}])${esc(row.abbr)}`, 'u').exec(text)
    if (!m) continue
    out.push({ row, quote: text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + row.abbr.length + 70)).trim() })
  }
  return out
}

// ── AC-2: gazetteer, region → dialect group ───────────────────────────────────────────────────────────
export interface GazRow {
  group: string
  /** lower-case stems of the area's names, each occurring in the quote (checked by the tests) */
  stems: string[]
  /** orthographic / historical variants of the same name that the source of a LABEL may use (Грінченко: «Галиція» = Галичина) */
  aliases?: string[]
  q: string
  loc: string
}
const WU = (t: string) => `https://uk.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`
/** Each row quotes the dialect article's own sentence naming the area (uk.wikipedia intro, fetched 2026-10-14; research/04 §0 W-* keys; CC BY-SA 4.0). */
export const GAZETTEER: GazRow[] = [
  { group: 'BOY', stems: ['бойк'], q: 'Бо́йківський го́вір (північнокарпатський, або північнопідкарпатський говір) — поширений у гірських районах Львівської та Івано-Франківської областей.', loc: WU('Бойківський говір') },
  { group: 'HUT', stems: ['гуцул'], q: 'Гуцульський говір (східнокарпатський говір) — один з архаїчних говорів галицько-буковинської групи південно-західного наріччя.', loc: WU('Гуцульський говір') },
  { group: 'LEM', stems: ['лемк'], q: 'Територіально лемківський говір накладався на етнографічну зону Лемківщини, співвідносну з етнографічною групою українців — лемків.', loc: WU('Лемківський говір') },
  { group: 'NDN', stems: ['галич'], aliases: ['галиц'], q: 'Значною мірою накладається на історичну територію Східної Галичини.', loc: WU('Наддністрянський говір') },
  { group: 'ZAK', stems: ['закарпат'], q: 'Закарпатський говір або закарпатський діалект (середньозакарпатський, підкарпатський, південнокарпатський говір або діалект) — один з архаїчних говорів карпатської групи діалектів південно-західного наріччя української мови.', loc: WU('Закарпатський говір') },
  { group: 'VOL', stems: ['волин'], q: 'Волинський говір — діалект української мови, що належить до волинсько-подільської групи говорів південно-західного наріччя.', loc: WU('Волинський говір') },
  { group: 'WPL', stems: ['волин', 'берест'], q: 'Охоплює територію майже всієї Волинської і північно-західних районів Рівненської областей, а також Берестейщини в Білорусі.', loc: WU('Західнополіський говір') },
  { group: 'POD', stems: ['поділ'], q: 'Подільський говір — говір української мови. Належить до групи волинсько-подільських говорів південно-західного наріччя.', loc: WU('Подільський говір') },
  { group: 'MPL', stems: ['житомир'], q: 'Поширений на півночі Київської, Житомирської та Рівненської областей.', loc: WU('Середньополіський говір') },
  { group: 'CHN', stems: ['чернігів'], q: 'Східнополіський (лівобережнополіський) говір, також Чернігівський діалект', loc: WU('Східнополіський говір') },
  { group: 'MDN', stems: ['полтав', 'черкас'], q: 'поширений у південних районах Київської, південно-західних районах Сумської, Черкаської, Полтавської', loc: WU('Середньонаддніпрянський говір') },
  { group: 'SLB', stems: ['слобожан', 'слобід'], q: 'Слобожанський говір значною мірою накладається на історичну територію Слобідської України', loc: WU('Слобожанський говір') },
  { group: 'STP', stems: ['степ'], q: 'Степови́й го́вір украї́нської мови — один із новожитніх говорів', loc: WU('Степовий говір') },
]
const plain = (s: string) => s.replace(/́/g, '').toLowerCase()
/** Gazetteer rows naming a region (a region name begins with one of the row's stems or aliases). Empty = the gazetteer does not know it → no dialect claim. */
export function gazetteerRows(region: string): GazRow[] {
  const r = plain(region.trim())
  return GAZETTEER.filter(g => [...g.stems, ...(g.aliases ?? [])].some(s => r.startsWith(s)))
}
/** The quote of a gazetteer row as evidence for "region X belongs to dialect group G". */
export const gazEvidence = (g: GazRow): Evidence => Q('WUK', g.loc, g.q)
export { plain as gazPlain }

/**
 * A dialect-group claim from a region label of a dictionary article (AC-1 + AC-2): evidence = article quote, the source's own abbreviation entry, the gazetteer quote.
 * Lemma-level and says so: the label names the area where the dictionary recorded the word.
 */
export function regionDialectClaims(art: Evidence, table: AbbrTable, row: AbbrRow): Record<string, Claim<true>> {
  const out: Record<string, Claim<true>> = {}
  if (!row.region) return out
  for (const g of gazetteerRows(row.region)) {
    out[g.group] = claim(true as const, [art, abbrEvidence(table, row), gazEvidence(g)], { method: `dictionary region label «${row.abbr}» → gazetteer (lemma-level, SPEC 63 AC-1/AC-2)`, score: 0.5 })
  }
  return out
}

// ── AC-3: contact / surzhyk ───────────────────────────────────────────────────────────────────────────
export const SURZHYK_AUTO_METHOD = 'computed: ∉ ВЕСУМ ∧ відоме російському словнику (pymorphy3-ru) ∧ r2u дає інший український відповідник (SPEC 63 AC-3)'
export interface R2uPair { dict: string; url: string; head: string; eq: string[]; text: string }
/**
 * AC-3. `form` is a kept lemma that VESUM does not know (`inVesum` false) and the Russian dictionary does (`ruKnown`); `pairs` are the ru→uk dictionary articles whose
 * RUSSIAN headword is that form. It is flagged only when a dictionary offers a Ukrainian equivalent other than the form itself. Returns undefined otherwise (unknown, not "no").
 */
export function autoContactClaim(form: string, inVesum: boolean, ru: { known: boolean; tag?: string | null } | undefined, pairs: R2uPair[], vesumLoc: string, ruLoc: string): Claim<true> | undefined {
  if (inVesum || !ru?.known) return undefined
  const k = key(form), good = pairs.filter(p => p.eq.some(e => key(e) !== k))
  if (!good.length) return undefined
  const ev: Evidence[] = good.slice(0, 3).map(p => D('R2U', p.url, p.text, `${p.dict}: російське «${p.head}» → ${p.eq.slice(0, 4).join(', ')}`))
  ev.push(D('VESUM', vesumLoc, `${form}: немає в ВЕСУМ`), D('OPENCORPORA', ruLoc, `${form}: ${ru.tag ?? 'відоме'} (pymorphy3-ru)`))
  return claim(true as const, ev, { method: SURZHYK_AUTO_METHOD, score: 0.6 })
}

/** The lemma's surzhyk claim = the rule-derived one (SURZHYK_BASIS) ∪ the computed one (AC-3); either alone suffices, both merge their evidence. */
export function withAutoContact(base: Claim<true>, auto: Claim<true> | undefined): Claim<true> {
  if (!auto) return base
  if (base.value === 'unknown') return auto
  const seen = new Set<string>(), ev = [...base.evidence, ...auto.evidence].filter(e => { const k = `${e.source}|${e.locator}|${e.quote}`; return seen.has(k) ? false : (seen.add(k), true) })
  return claim(true as const, ev.slice(0, 10), { method: `${base.method}+${auto.method}`, score: Math.max(base.score ?? 0, auto.score ?? 0) })
}
