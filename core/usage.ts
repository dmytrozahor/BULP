/**
 * Usage axis (SPEC 60 UL-1; research/14 §2–§5, §8). Pure: no node or DOM imports.
 *
 * > "Unified taxonomy: stylistic, sociolect, territorial, chronological, thematic/ritual … Labels attach to a SENSE, not a lemma … Conflicting labels stay separate Claims." — research/14 §4–5
 * > "Rule from research/08: a pattern match may queue a form for review but must never set a register. Only a dictionary tag or label with quote and locator sets it." — research/14 §4
 * > "uk.wiktionary: API open, CC BY-SA 4.0 … Quality caveat: labels are inconsistent … Treat as weak evidence; every label needs the entry URL as locator." — research/14 §2, §8
 *
 * Sources: VESUM lemma tags (slang, arch, vulg, obsc; D, CC BY-NC-SA) and uk.wiktionary label categories harvested through the API (D, CC BY-SA, attributed).
 * The project does not label by sense (neither source is read per sense here): a usage claim is lemma-level, and says so.
 */
import { claim, D, Q, type Claim, type Evidence } from './evidence.ts'
import { enWiktUrl, kaikkiTag, abbrEvidence, KAIKKI_TAGS } from './autolabel.ts'

export type UsageAxis = 'stylistic' | 'sociolect' | 'territorial' | 'chronological' | 'thematic'
export const AXIS_UK: Record<UsageAxis, string> = { stylistic: 'стилістична', sociolect: 'соціолект', territorial: 'територіальна', chronological: 'хронологічна', thematic: 'тематична / обрядова' }

export interface UsageLabel {
  id: string; axis: UsageAxis
  /** chip text: the abbreviation dictionaries print */
  uk: string
  /** the label's meaning, only where a definition was fetched and quoted */
  def?: Evidence
}

const SUM = (q: string) => Q('SUM20', 'СУМ-20, т. 1, 2010, §2.8 (research/08 рядки 110–125)', q)
const ENC = (n: string, q: string) => Q('ENC', `http://litopys.org.ua/ukrmova/${n}.htm`, q)
const VES = (tag: string, q: string) => Q('VESUM', `dict_uk doc/tags.txt: ${tag}`, q)

export const USAGE_LABELS: UsageLabel[] = [
  { id: 'rozm', axis: 'stylistic', uk: 'розм.', def: SUM('характеризує одиниці, що належать до складу літературної мови, не виходять за рамки літературного слововживання, але використовуються переважно в усній мові') },
  { id: 'knyzh', axis: 'stylistic', uk: 'книжн.' },
  { id: 'poet', axis: 'stylistic', uk: 'поет.', def: ENC('um195', 'слова з додатковим стиліст. забарвленням, вживані в мові фольклору та худож. л-ри.') },
  { id: 'vulg', axis: 'stylistic', uk: 'вульг.', def: VES('vulg', 'вульгарне') },
  { id: 'obsc', axis: 'stylistic', uk: 'обсц.', def: VES('obsc', 'обсценне') },
  { id: 'laiyl', axis: 'stylistic', uk: 'лайл.' },
  { id: 'znevazh', axis: 'stylistic', uk: 'зневажл.' },
  { id: 'iron', axis: 'stylistic', uk: 'іронічн.' },
  { id: 'zharh', axis: 'sociolect', uk: 'жарг. / сленг', def: VES('slang', 'сленг та (проф)жаргонізми') },
  { id: 'arho', axis: 'sociolect', uk: 'арго', def: ENC('um03', 'АРГО (франц. argot — жаргон, первісне — жебрацтво) — один з різновидів соціальних діалектів, штучно створювана умовна говірка якої-небудь вузької замкненої соціальної або профес. групи, незрозуміла для сторонніх.') },
  { id: 'dial', axis: 'territorial', uk: 'діал.', def: ENC('um204', 'ДІАЛЕКТИЗМ (від грец. διάλεκτος — наріччя, говір) — позанормат. елемент літ. мови, що має виражену діалектну (див. Діалект) віднесеність.') },
  { id: 'lemk', axis: 'territorial', uk: 'лемк.' },
  { id: 'zast', axis: 'chronological', uk: 'заст.', def: ENC('um19', 'слова, а також їхні окр. значення та номінат. словосполучення, що на даному етапі розвитку мови вийшли із заг. вжитку.') },
  { id: 'istor', axis: 'chronological', uk: 'істор.' },
  { id: 'arkh', axis: 'chronological', uk: 'арх.', def: VES('arch', 'застаріле/архаїчне/(інколи) діалектне') },
  { id: 'narpoet', axis: 'thematic', uk: 'нар.-поет.' },
  { id: 'cerkslov', axis: 'thematic', uk: 'церк.-слов.' },
  { id: 'folk', axis: 'thematic', uk: 'фольк.' },
]
export const usageLabel = Object.fromEntries(USAGE_LABELS.map(l => [l.id, l])) as Record<string, UsageLabel>

/** uk.wiktionary categories (research/14 §2) → label. Names are as the API lists them (`Категорія:<cat>`). */
export const WIKT_CATEGORIES: { cat: string; label: string }[] = [
  ['Розмовні вирази', 'rozm'], ['Розмовні вирази/uk', 'rozm'], ['Жаргонізми', 'zharh'], ['Жаргонізми/uk', 'zharh'],
  ['Діалектні вирази', 'dial'], ['Діалектні вирази/uk', 'dial'], ['Діалектизми', 'dial'], ['Діалектизми/uk', 'dial'],
  ['Лайливі вирази', 'laiyl'], ['Лайливі вирази/uk', 'laiyl'], ['Лайливі слова/uk', 'laiyl'], ['Вульгарні вирази', 'vulg'], ['Вульгарні вирази/uk', 'vulg'], ['Вульгаризми', 'vulg'],
  ['Зневажливі вирази', 'znevazh'], ['Зневажливі вирази/uk', 'znevazh'], ['Іронічні вирази', 'iron'], ['Іронічні вирази/uk', 'iron'],
  ['Застарілі вирази', 'zast'], ['Застарілі вирази/uk', 'zast'], ['Історизми', 'istor'], ['Історизми/uk', 'istor'], ['Архаїчні вирази', 'arkh'], ['Архаїчні вирази/uk', 'arkh'],
  ['Поетичні вирази', 'poet'], ['Поетичні вирази/uk', 'poet'], ['Народно-поетичні вирази', 'narpoet'], ['Народно-поетичні вирази/uk', 'narpoet'],
  ['Книжні слова', 'knyzh'], ['Книжні слова/uk', 'knyzh'], ["Церковнослов'янізми", 'cerkslov'], ["Церковнослов'янізми/uk", 'cerkslov'],
  ['Лемківські вирази', 'lemk'],
  // LB-8: uk.wiktionary categories that name an area (the label is «dial»; core/dict-labels.ts WIKTUK_REGION says which area)
  ['Західноукраїнський діалект', 'dial'], ['Західноукраїнський діалект/uk', 'dial'], ['Західноукраїнські слова', 'dial'], ['Західноукраїнські слова, що потрапили до словників літературної мови', 'dial'],
  ['Західнополіський говір', 'dial'], ['Закарпатський говір', 'dial'], ['Фольклорні терміни', 'folk'], ['Фольклорні терміни/uk', 'folk'],
].map(([cat, label]) => ({ cat: cat!, label: label! }))

/** VESUM lemma tag → label (slang, arch, vulg, obsc only; `bad`/`subst`/`err` are the surzhyk/nonstandard axes, `rare` is grammatical — research/08). */
export const VESUM_USAGE: Record<string, string> = { slang: 'zharh', arch: 'arkh', vulg: 'vulg', obsc: 'obsc' }

/** wire row of public/data/usage.json: [label id, 'v' + VESUM tag line | 'w' + uk.wiktionary category | 'k' + en.wiktionary sense tag and gloss as "tag<TAB>gloss" (SPEC 63 AC-1)] */
export type UsageRow = [label: string, src: 'v' | 'w' | 'k' | 'r', detail: string]   // 'r' (SPEC 63 R2U-2): a dictionary's own label in an r2u article; detail = "abbr<TAB>quote<TAB>url<TAB>dictionary<TAB>meaning<TAB>table source<TAB>table list"
export interface UsageFile { format: 1; generated: string; vesumLoc: string; wikt: { retrieved: string; licence: string; attribution: string }; lemmas: Record<string, UsageRow[]> }

export const wiktUrl = (lemma: string) => `https://uk.wiktionary.org/wiki/${encodeURIComponent(lemma)}`

/** Rows for one lemma from its VESUM tag line and the harvested Wiktionary category members (index category → set of titles). */
export function usageRows(lemma: string, vesumTags: string, wikt: Map<string, Set<string>>, kaikki?: [tag: string, gloss: string][], r2u?: UsageRow[]): UsageRow[] {
  const rows: UsageRow[] = [], tags = new Set(vesumTags.split(':'))
  for (const [t, label] of Object.entries(VESUM_USAGE)) if (tags.has(t)) rows.push([label, 'v', vesumTags])
  for (const { cat, label } of WIKT_CATEGORIES) if (wikt.get(cat)?.has(lemma)) rows.push([label, 'w', cat])
  for (const [tag, gloss] of kaikki ?? []) { const r = kaikkiTag[tag]; if (r?.usage) rows.push([r.usage, 'k', `${tag}\t${gloss}`]) }   // AC-1: en.wiktionary sense tags through the KAIKKI_TAGS table
  rows.push(...(r2u ?? []))   // R2U-2: the labels of the r2u dictionaries (build-autolabel.ts)
  return rows
}

/**
 * Claims of a lemma, one per label (conflicting labels stay separate claims, research/14 §5); evidence = every row that produced it
 * (+ the label's quoted definition where we have one). Lemma-level, which the `method` says.
 */
export function usageClaims(lemma: string, rows: UsageRow[], vesumLoc: string, retrieved: string): { label: UsageLabel; claim: Claim<string> }[] {
  const by = new Map<string, Evidence[]>()
  for (const [id, src, detail] of rows) {
    if (src === 'k') {   // en.wiktionary (kaikki) sense tag: the dataset row + the glossary definition of the tag
      const [tag, gloss] = detail.split('\t'), r = kaikkiTag[tag!]
      ;(by.get(id) ?? by.set(id, []).get(id)!).push(D('KAIKKI', enWiktUrl(lemma), `[${tag}] ${gloss ?? ''}`.trim(), 'en.wiktionary через kaikki.org, CC BY-SA 4.0; мітка належить значенню, але береться на рівні леми'), ...(r ? [abbrEvidence(KAIKKI_TAGS, r)] : []))
      continue
    }
    if (src === 'r') {   // R2U-2: the dictionary's abbreviation in the article (verbatim slice) + the dictionary's own explanation of it
      const [abbr, quote, url, dict, meaning, tsrc, tlist] = detail.split('\t')
      ;(by.get(id) ?? by.set(id, []).get(id)!).push(D('R2U', url!, quote!, `${dict}: мітка «${abbr}» стоїть у статті`), Q(tsrc!, tlist!, meaning!))
      continue
    }
    const ev = src === 'v' ? D('VESUM', vesumLoc, `${lemma} ${detail}`, 'позначка словника (CC BY-NC-SA 4.0)')
      : D('WIKTUK', wiktUrl(lemma), `Категорія:${detail}`, `uk.wiktionary, CC BY-SA 4.0, отримано ${retrieved}; мітка належить статті, не конкретному значенню`)
    ;(by.get(id) ?? by.set(id, []).get(id)!).push(ev)
  }
  return [...by].flatMap(([id, ev]) => {
    const label = usageLabel[id]; if (!label) return []
    return [{ label, claim: claim(id, label.def ? [...ev, label.def] : ev, { method: 'dictionary-label (lemma-level)' }) }]
  })
}
