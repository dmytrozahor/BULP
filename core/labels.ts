/**
 * SPEC 63 LB — the «Мітки» of a card, each with its METHOD and EVIDENCE. Pure: no node or DOM imports.
 *
 * > owner 2026-10-22: «всюди має бути зазначено діалект і тип і регістр і значення і сенси і взагалі все що показується … мають бути дані. і діалектну приналежність точно можна визначити для відсотків 80 слів»
 *
 * Four things are decided per lemma, and only from data the project holds:
 *  LB-1 DIALECT, exactly one class (priority a > b > c > d; the corpus numbers are kept for every class):
 *       a «діалектне за словником»        a dictionary label names a dialect or an area (core/dict-labels.ts; Wiktionary / СУМ «діал.» name none: «діалектне, область не названо»)
 *       b «регіонально марковане (корпус)» the witness-region distribution is significantly skewed (G², log ratio, Bonferroni, minimum f, ≥ 2 regions): a REGIONAL ASSOCIATION, not a dialect claim (FD-2)
 *       c «загальновживане»                attested in ≥ K regions with a low Gries DP, and no dictionary dialect label
 *       d «недостатньо даних»              the corpus has too few uses; the card says how many are needed
 *  LB-3 REGISTER per lemma and per sense: СУМ sense labels, VESUM tags, uk/en Wiktionary tags, the r2u dictionaries' own labels; none → «нейтральне (немає позначок у словниках)» + the list of dictionaries checked
 *  LB-4 TYPE: part of speech + morphological class + word type (власна назва / абревіатура / запозичення / церковнослов'янізм / архаїзм / …) where a source says so
 *  Surzhyk is a property of a FORM (MM-9), never of a lemma: the block says so instead of a value.
 */
import { DICT_LABEL_TABLES, AREAS, groupsOfArea, tableById, type DictHit } from './dict-labels.ts'

// ── thresholds (LB-1; every one is printed on the methods page) ───────────────────────────────────────
export const TH = {
  /** (b) and (c): total corpus uses needed */ fMin: 5,
  /** (b) uses in the over-represented region */ fRegionMin: 3,
  /** (b) log2 ratio of the relative frequencies, region vs the rest of the corpus */ lrMin: 1,
  /** (b) family-wise error rate; each region is tested at ALPHA / (regions with material) */ alpha: 0.05,
  /** (b) and (c): regions with material (N > 0) needed to compare at all */ regionsMin: 2,
  /** (c) regions the lemma is attested in */ k: 3,
  /** (c) normalised Gries DP at most (0 = spread exactly like the corpus, 1 = one region) */ dpMax: 0.6,
} as const
export type Thresholds = { -readonly [K in keyof typeof TH]: number }

export interface RegionCount { code: string; f: number; N: number }
export interface Keyness { code: string; f: number; N: number; g2: number; lr: number; p: number }

/** complementary error function (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7) */
export function erfc(x: number): number {
  const z = Math.abs(x), t = 1 / (1 + 0.3275911 * z)
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z)
  return x >= 0 ? y : 2 - y
}
/** p of a G² / χ² statistic with 1 degree of freedom */
export const pOfG2 = (g2: number): number => erfc(Math.sqrt(Math.max(0, g2) / 2))

/** G² (log-likelihood) and log2 ratio of the lemma in each region against the rest of the corpus. */
export function keyness(by: RegionCount[]): Keyness[] {
  const rs = by.filter(r => r.N > 0), N = rs.reduce((a, r) => a + r.N, 0), F = rs.reduce((a, r) => a + r.f, 0)
  const ll = (o: number, e: number) => (o > 0 && e > 0 ? o * Math.log(o / e) : 0)
  return rs.map(r => {
    const a = r.f, b = r.N - r.f, c = F - r.f, d = N - r.N - c
    const n = a + b + c + d, e1 = ((a + b) * (a + c)) / n, e2 = ((a + b) * (b + d)) / n, e3 = ((c + d) * (a + c)) / n, e4 = ((c + d) * (b + d)) / n
    const g2 = 2 * (ll(a, e1) + ll(b, e2) + ll(c, e3) + ll(d, e4)) * (a / r.N > c / Math.max(1, N - r.N) ? 1 : -1)   // signed: > 0 = over-represented
    const lr = Math.log2(((a + 0.5) / r.N) / ((c + 0.5) / Math.max(1, N - r.N)))
    return { code: r.code, f: a, N: r.N, g2, lr, p: pOfG2(Math.abs(g2)) }
  })
}
/** Gries' DP, normalised by 1 − min(expected share): 0 = the lemma is spread like the corpus, 1 = it sits in one region. */
export function dpNorm(by: RegionCount[]): number {
  const rs = by.filter(r => r.N > 0), N = rs.reduce((a, r) => a + r.N, 0), F = rs.reduce((a, r) => a + r.f, 0)
  if (!F || rs.length < 2) return 1
  const dp = 0.5 * rs.reduce((a, r) => a + Math.abs(r.f / F - r.N / N), 0), minS = Math.min(...rs.map(r => r.N / N))
  return dp / (1 - minS)
}

export type DialectClass = 'dict' | 'corpus' | 'general' | 'few'
export const classUk = (d: { c: DialectClass; strict?: boolean }): string => (d.c === 'dict' && d.strict === false ? 'місце запису за словником (не обов’язково діалектне)' : CLASS_UK[d.c])
export const CLASS_UK: Record<DialectClass, string> = {
  dict: 'діалектне за словником', corpus: 'регіонально марковане (корпус)', general: 'загальновживане', few: 'недостатньо даних',
}
export interface CorpusSummary {
  /** total uses */ f: number
  /** regions with material */ nReg: number
  /** regions the lemma is attested in */ att: number
  dp: number
  /** the over-represented region that passes the thresholds, if any */ top?: Keyness
  /** the region table (the evidence of b and c) */ rows: RegionCount[]
}
export interface DialectResult {
  c: DialectClass
  /** (a): true = some label marks the word or sense as dialectal / regional; false = the dictionaries only record WHERE it was noted (county, governorate) */ strict?: boolean
  /** (a) the dictionary hits (area / dialectal kinds) */ dict?: DictHit[]
  /** area ids named by the dictionaries */ areas?: string[]
  /** AC-2 gazetteer group codes of those areas */ groups?: string[]
  /** a register-source «діал.» (Wiktionary / СУМ) that names no area: [source, detail] */ plain?: [string, string][]
  corp?: CorpusSummary
  /** (d) what is missing */ need?: string
}

export function corpusSummary(by: RegionCount[] | undefined, th: Thresholds = TH): CorpusSummary | undefined {
  if (!by?.length) return undefined
  const rs = by.filter(r => r.N > 0), f = rs.reduce((a, r) => a + r.f, 0)
  const ks = keyness(rs), crit = th.alpha / Math.max(1, rs.length)
  const top = ks.filter(k => k.g2 > 0 && k.f >= th.fRegionMin && k.lr >= th.lrMin && k.p < crit).sort((a, b) => b.g2 - a.g2)[0]
  return { f, nReg: rs.length, att: rs.filter(r => r.f > 0).length, dp: dpNorm(rs), ...(top ? { top } : {}), rows: rs }
}

/** The ONE class of a lemma. `dict` = area / dialectal hits of the dictionaries; `plain` = «діал.» marks without an area. */
export function dialectOf(dict: DictHit[], plain: [string, string][], by: RegionCount[] | undefined, th: Thresholds = TH): DialectResult {
  const corp = corpusSummary(by, th)
  const areaHits = dict.filter(h => (h.kind === 'area' && (h.v || h.place)) || h.kind === 'dialectal')
  if (areaHits.length || plain.length) {
    const areas = [...new Set(areaHits.filter(h => h.kind === 'area').map(h => h.v).filter(Boolean))]
    const strict = plain.length > 0 || areaHits.some(h => h.kind === 'dialectal' || !h.p)
    const groups = [...new Set([...areas.flatMap(a => groupsOfArea(a).map(g => g.group)), ...areaHits.map(h => h.g).filter((g): g is string => !!g)])]
    return { c: 'dict', strict, ...(areaHits.length ? { dict: areaHits } : {}), ...(areas.length ? { areas } : {}), ...(groups.length ? { groups } : {}), ...(plain.length ? { plain } : {}), ...(corp ? { corp } : {}) }
  }
  if (corp && corp.nReg >= th.regionsMin && corp.f >= th.fMin) {
    if (corp.top) return { c: 'corpus', corp }
    if (corp.att >= th.k && corp.dp <= th.dpMax) return { c: 'general', corp }
  }
  const f = corp?.f ?? 0
  const need = !corp ? `корпус не містить засвідчень цієї леми; для класу потрібно ≥ ${TH.fMin} уживань у ≥ ${TH.regionsMin} регіонах з матеріалом, або позначка словника`
    : f < TH.fMin ? `у корпусі ${f} ${f === 1 ? 'вживання' : 'вживань'}; потрібно ≥ ${TH.fMin} (ще ${TH.fMin - f}), або позначка словника`
    : corp.nReg < TH.regionsMin ? `регіонів з матеріалом ${corp.nReg}; потрібно ≥ ${TH.regionsMin}`
    : corp.att < TH.k ? `засвідчено в ${corp.att} з ${corp.nReg} регіонів: для «загальновживаного» потрібно ≥ ${TH.k}, а розподіл не відхиляється значущо (регіонального перекосу немає)`
    : `розподіл по регіонах нерівномірний (DP ${corp.dp.toFixed(2)} > ${TH.dpMax}), але жоден регіон не проходить порогів значущості`
  return { c: 'few', ...(corp ? { corp } : {}), need }
}

// ── register / usage (LB-3) ────────────────────────────────────────────────────────────────────────
export interface RegisterDef { id: string; /** as dictionaries print it */ uk: string; /** plain Ukrainian */ full: string; axis: 'стилістична' | 'хронологічна' | 'територіальна' | 'соціолект' | 'нестандартність' | 'тематична' | 'сфера' | 'зміст значення' }
export const REGISTER: RegisterDef[] = [
  { id: 'rozm', uk: 'розм.', full: 'розмовне', axis: 'стилістична' }, { id: 'knyzh', uk: 'книжн.', full: 'книжне', axis: 'стилістична' },
  { id: 'poet', uk: 'поет.', full: 'поетичне', axis: 'стилістична' }, { id: 'urochyste', uk: 'уроч.', full: 'урочисте', axis: 'стилістична' },
  { id: 'iron', uk: 'ірон.', full: 'іронічне', axis: 'стилістична' }, { id: 'zhart', uk: 'жарт.', full: 'жартівливе', axis: 'стилістична' },
  { id: 'znevazh', uk: 'зневажл.', full: 'зневажливе', axis: 'стилістична' }, { id: 'lasky', uk: 'ласк.', full: 'пестливе / ласкаве', axis: 'стилістична' },
  { id: 'euphem', uk: 'евф.', full: 'евфемізм', axis: 'стилістична' }, { id: 'vulg', uk: 'вульг.', full: 'вульгарне', axis: 'стилістична' },
  { id: 'obsc', uk: 'обсц.', full: 'обсценне', axis: 'стилістична' }, { id: 'laiyl', uk: 'лайл.', full: 'лайливе', axis: 'стилістична' },
  { id: 'trivial', uk: 'тривіальне', full: 'тривіальне вираження', axis: 'стилістична' },
  { id: 'zast', uk: 'заст.', full: 'застаріле', axis: 'хронологічна' }, { id: 'arkh', uk: 'арх.', full: 'архаїчне', axis: 'хронологічна' },
  { id: 'istor', uk: 'істор.', full: 'історизм', axis: 'хронологічна' },
  { id: 'dial', uk: 'діал.', full: 'діалектне', axis: 'територіальна' }, { id: 'lemk', uk: 'лемк.', full: 'лемківське', axis: 'територіальна' },
  { id: 'zharh', uk: 'жарг. / сленг', full: 'жаргонне / сленг', axis: 'соціолект' }, { id: 'arho', uk: 'арго', full: 'арго', axis: 'соціолект' },
  { id: 'narpoet', uk: 'нар.-поет.', full: 'народнопоетичне', axis: 'тематична' }, { id: 'cerkslov', uk: 'церк.-слов.', full: 'церковнослов’янське', axis: 'тематична' },
  { id: 'folk', uk: 'фольк.', full: 'фольклорне', axis: 'тематична' },
  { id: 'spec', uk: 'спец.', full: 'спеціальне (термін галузі)', axis: 'сфера' },
  { id: 'rare', uk: 'рідко', full: 'рідковживане', axis: 'стилістична' },
  { id: 'bad', uk: 'покруч', full: 'покруч (нелітературна форма)', axis: 'нестандартність' }, { id: 'subst', uk: 'нестандартна форма', full: 'нестандартна форма', axis: 'нестандартність' },
  { id: 'alt', uk: 'альт. напис.', full: 'альтернативне написання (не за чинним правописом)', axis: 'нестандартність' }, { id: 'err', uk: 'помилкове', full: 'помилкове написання', axis: 'нестандартність' },
  { id: 'fig', uk: 'перен.', full: 'переносне значення', axis: 'зміст значення' },
]
export const regDef = Object.fromEntries(REGISTER.map(r => [r.id, r])) as Record<string, RegisterDef>
/** СУМ-11/20 labels as printed → register id (SeRow.lb); unknown labels are shown as printed */
export const SUM_LABEL: Record<string, string> = {
  'розм.': 'rozm', 'заст.': 'zast', 'книжн.': 'knyzh', 'спец.': 'spec', 'діал.': 'dial', 'перен.': 'fig', 'ірон.': 'iron', 'зневажл.': 'znevazh', 'жарт.': 'zhart',
  'вульг.': 'vulg', 'поет.': 'poet', 'уроч.': 'urochyste', 'фольк.': 'folk', 'нар.-поет.': 'narpoet', 'рідко': 'rare', 'пестл.': 'lasky', 'ласк.': 'lasky',
  'лайл.': 'laiyl', 'евф.': 'euphem', 'арх.': 'arkh', 'істор.': 'istor', 'церк.': 'cerkslov', 'розм': 'rozm', 'заст': 'zast', 'книжн': 'knyzh',
}
/** VESUM lemma tags (dict_uk doc/tags.txt, fetched 2026-10-22) that are labels, with the tag file's own words */
export const VESUM_TAGS: Record<string, { reg: string; def: string }> = {
  slang: { reg: 'zharh', def: 'slang сленг та (проф)жаргонізми' }, arch: { reg: 'arkh', def: 'arch  застаріле/архаїчне/(інколи) діалектне' },
  vulg: { reg: 'vulg', def: 'vulg  вульгарне' }, obsc: { reg: 'obsc', def: 'obsc  обсценне' },
  rare: { reg: 'rare', def: 'rare  другий зн. в. для істот (в президенти), плюс декілька рідкісних форм - матір v_naz тощо' },
  bad: { reg: 'bad', def: 'bad   покруч' }, subst: { reg: 'subst', def: 'subst нестандартні форма' },
  alt: { reg: 'alt', def: 'alt   альтернативне написання (не за чинним правописом)' }, err: { reg: 'err', def: 'err (+bad)  помилкове написання (яке часто зустрічається в текстах)' },
}
export const VESUM_TAGS_URL = 'https://github.com/brown-uk/dict_uk/blob/master/doc/tags.txt'

/** [register id, source, detail, url?, sense n?]: src v = VESUM tag, w = uk.wiktionary category, k = en.wiktionary tag, r = r2u dictionary label (detail = abbr, quote), d = a dictionary label parsed here (detail = table id, abbr, quote), s = СУМ sense label */
export type RegItem = [id: string, src: 'v' | 'w' | 'k' | 'r' | 'd' | 's', detail: string, url?: string, sense?: number]
export const REG_SRC_UK: Record<RegItem[1], string> = {
  v: 'ВЕСУМ (тег леми)', w: 'uk.Вікісловник (категорія статті)', k: 'en.Вікісловник (тег значення, kaikki)', r: 'словник r2u (позначка у статті)', d: 'словник (позначка у статті)', s: 'СУМ (позначка значення)',
}
export const CHECKED_REGISTER = [
  'ВЕСУМ: теги slang, arch, vulg, obsc, rare, bad, subst, alt, err',
  'uk.Вікісловник: категорії розмовних, жаргонних, застарілих, поетичних, книжних, діалектних, лайливих, зневажливих виразів',
  'en.Вікісловник (kaikki): теги colloquial, dialectal, dated, obsolete, archaic, historical, slang, vulgar, derogatory, poetic',
  'Грінченко, Уманець–Спілка, Кримський–Єфремов, Желехівський, Голоскевич: власні позначки статей',
  'СУМ-11/СУМ-20: позначки значень (там, де їх імпортовано)',
]

/** register items from the usage.json rows, VESUM tags and the dictionary hits */
export function registerItems(usage: [string, string, string][], tags: string[], dict: DictHit[], se: { n?: number; d: string; lb: string[] }[]): RegItem[] {
  const out: RegItem[] = [], seen = new Set<string>()
  const add = (it: RegItem) => { const k = `${it[0]}|${it[1]}|${it[4] ?? ''}|${it[2].slice(0, 40)}`; if (!seen.has(k)) { seen.add(k); out.push(it) } }
  for (const [id, src, detail] of usage) {
    if (!regDef[id] || src === 'r') continue
    add([id, src as RegItem[1], detail])
  }
  for (const t of new Set(tags)) { const v = VESUM_TAGS[t]; if (v) add([v.reg, 'v', t]) }
  for (const h of dict) if (h.kind === 'register' && regDef[h.v]) add([h.v, 'd', `${h.t}\t${h.a}\t${h.q}`, h.u])
  for (const r of se) for (const lb of r.lb) { const id = SUM_LABEL[lb.trim().toLowerCase()] ?? SUM_LABEL[lb.trim()]; add([id ?? `~${lb}`, 's', `${r.d}\t${lb}`, undefined, r.n]) }
  return out
}
export const regUk = (id: string): string => regDef[id]?.full ?? id.replace(/^~/, '')
export const regAbbr = (id: string): string => regDef[id]?.uk ?? id.replace(/^~/, '')

// ── type (LB-4) ────────────────────────────────────────────────────────────────────────────────────
export const WORD_TYPES: Record<string, string> = {
  proper: 'власна назва', fname: 'власна назва: ім’я', lname: 'власна назва: прізвище', pname: 'власна назва: по батькові', geo: 'власна назва: топонім',
  abbr: 'абревіатура', loan: 'запозичення', cs: 'церковнослов’янізм (за словником)', arkh: 'архаїзм', istor: 'історизм', neo: 'неологізм', rusism: 'русизм (за словником)',
  dim: 'зменшена форма', aug: 'збільшена форма', 'loan-pl': 'запозичення з польської (за словником)', 'loan-ro': 'запозичення з румунської (за словником)',
  'loan-sr': 'запозичення з сербської (за словником)', 'loan-tt': 'запозичення з татарської (за словником)',
}
/** VESUM tag → word type, with the tag file's own words */
export const VESUM_TYPE: Record<string, { typ: string; def: string }> = {
  prop: { typ: 'proper', def: 'prop       власна назва' }, geo: { typ: 'geo', def: 'geo        топонім' }, fname: { typ: 'fname', def: "fname      ім'я" },
  lname: { typ: 'lname', def: 'lname      прізвище' }, pname: { typ: 'pname', def: 'pname       по батькові' }, abbr: { typ: 'abbr', def: 'abbr  абревіатура' },
}
/** [type id, source, detail, url?]: src v = VESUM tag, d = dictionary label (detail = table\tabbr\tquote), c = card claim (detail = what the claim says), l = loan analysis label, k = card kind */
export type TypeItem = [typ: string, src: 'v' | 'd' | 'c' | 'l' | 'k', detail: string, url?: string]
export const TYPE_SRC_UK: Record<TypeItem[1], string> = { v: 'ВЕСУМ (тег)', d: 'словник (позначка у статті)', c: 'твердження картки з доказом', l: 'аналіз запозичень (мітка донора)', k: 'вид картки' }

export const POS_UK: Record<string, string> = {
  noun: 'іменник', verb: 'дієслово', adj: 'прикметник', adv: 'прислівник', numr: 'числівник', prep: 'прийменник', conj: 'сполучник', part: 'частка', intj: 'вигук', pron: 'займенник',
  insert: 'вставне слово', predic: 'предикатив', noninfl: 'незмінне слово',
}
export const KIND_UK: Record<string, string> = { noun: 'іменник (відмінювання)', verb: 'дієслово (дієвідмінювання)', adj: 'прикметник (відмінювання)', numr: 'числівник', pron: 'займенник', uninflected: 'незмінне слово' }

/** a morphological summary from one VESUM tag line («noun:inanim:m:v_naz» → «неістота, чол. рід») */
export function morphOf(tags: string): string {
  const t = new Set(tags.split(':')), p: string[] = []
  if (t.has('anim')) p.push('істота'); if (t.has('inanim')) p.push('неістота')
  if (t.has('m')) p.push('чол. рід'); if (t.has('f')) p.push('жін. рід'); if (t.has('n')) p.push('сер. рід'); if (t.has('p')) p.push('лише множина')
  if (t.has('imperf')) p.push('недоконаний вид'); if (t.has('perf')) p.push('доконаний вид'); if (t.has('rev')) p.push('зворотне')
  if (t.has('compb')) p.push('вищий ступінь')
  return p.join(', ')
}

// ── the entry stored in lm/lb and rendered by the card ────────────────────────────────────────────────
export interface LbEntry {
  v: 1
  d: DialectResult
  r: RegItem[]
  t: TypeItem[]
  /** the labels printed on each sense: [sense n, dictionary, labels] */ s?: [number | undefined, string, string[]][]
  /** the lemma has a card of the corpus (its region table was read) */ corpus?: boolean
  /** VESUM tags carried by only SOME paradigm forms: [tag, forms with it, all forms] — a property of those forms, not of the lemma */ f?: [string, number, number][]
  /** part of speech as the card prints it, paradigm kind, morphological summary of the lemma's tag line */ p?: string; k?: string; m?: string
}
export const emptyEntry = (): LbEntry => ({ v: 1, d: { c: 'few', need: `корпус не містить засвідчень цієї леми; для класу потрібно ≥ ${TH.fMin} уживань у ≥ ${TH.regionsMin} регіонах з матеріалом, або позначка словника` }, r: [], t: [] })

/** plain-Ukrainian «як визначено» of each class, for the tooltip and the methods page */
export const HOW: Record<DialectClass, string> = {
  dict: 'Словник, який ми прочитали, сам позначає це слово діалектним або називає край, де його записано. Мітка і її розшифровка цитуються з самого словника.',
  corpus: `Слово засвідчене в пам’ятках переважно одного регіону: різниця з рештою корпусу значуща (G² з поправкою Бонферроні на число регіонів) і щонайменше вдвічі за відносною частотою. Це асоціація з регіоном пам’яток, а не діалектна мітка.`,
  general: `Слово засвідчене щонайменше в ${TH.k} регіонах, розподіл близький до розподілу всього корпусу (DP ≤ ${TH.dpMax}), діалектної мітки у словниках немає.`,
  few: `У корпусі замало уживань (потрібно ≥ ${TH.fMin}), а позначки словника немає: клас не визначено, і ми не вгадуємо.`,
}
export const areaUk = (id: string): string => AREAS[id] ?? id
export { DICT_LABEL_TABLES, tableById }

// ── assembling one lemma's entry (used by pipelines/build-labels.ts and the tests) ──────────────────────
export interface AssembleIn {
  by?: RegionCount[]
  dict: DictHit[]
  usage: [string, string, string][]
  /** VESUM tag → number of the lemma's paradigm forms carrying it */ tagCount?: Record<string, number>
  nForms?: number
  se?: { n?: number; d: string; lb: string[] }[]
  pos?: string
  paradigmKind?: string
  /** SPEC 60 NP-1 proper-name kind claim, with the evidence quote */ proper?: { kind: string; quote: string; locator: string }
  /** origin claim «church_slavonic» with its evidence */ cs?: { quote: string; locator: string }
  loan?: [donor: string, text: string]
  /** dialect claims of the card whose evidence is a dictionary quote (hand-cited ЕУМ / books): [group code, quote, locator] */ claimDict?: [string, string, string][]
  /** card kind: 'full' | 'dict' | 'archaic' | … */ kind: string
  /** the tag line of one VESUM entry (cv) or of the first paradigm form */ tagLine?: string
}
const DIALECT_REG = new Set(['dial', 'lemk'])
export function assembleEntry(i: AssembleIn): LbEntry {
  const dict = [...i.dict]
  for (const [g, q, loc] of i.claimDict ?? []) dict.push({ t: 'claim', a: g, kind: 'area', v: '', q, u: loc, g, place: g })
  const tags: string[] = [], formTags: string[] = []
  const n = i.nForms ?? 0
  for (const [t, c] of Object.entries(i.tagCount ?? {})) if (VESUM_TAGS[t] || VESUM_TYPE[t]) ((n && c < n) ? formTags : tags).push(t)
  if (i.tagLine) for (const t of i.tagLine.split(':')) if (VESUM_TAGS[t] || VESUM_TYPE[t]) tags.push(t)
  const usage = i.usage.filter(u => u[1] !== 'r')
  const plain: [string, string][] = []
  for (const [id, src, detail] of usage) if (DIALECT_REG.has(id)) plain.push([src, detail])
  for (const r of i.se ?? []) for (const lb of r.lb) if (SUM_LABEL[lb.trim()] === 'dial') plain.push(['s', `${r.d}\t${lb}`])
  const regUsage = usage.filter(u => !DIALECT_REG.has(u[0]))
  const reg = registerItems(regUsage, tags.filter(t => VESUM_TAGS[t]), dict.filter(h => h.kind === 'register'), (i.se ?? []).map(r => ({ ...r, lb: r.lb.filter(l => SUM_LABEL[l.trim()] !== 'dial') })))
  const ft: [string, number, number][] = formTags.filter(t => VESUM_TAGS[t]).map(t => [t, i.tagCount![t]!, n])
  const ty: TypeItem[] = []
  for (const t of new Set(tags)) { const v = VESUM_TYPE[t]; if (v) ty.push([v.typ, 'v', t]) }
  if (i.proper && !ty.some(x => x[0] === 'proper' || x[0] === i.proper!.kind)) ty.push(['proper', 'c', i.proper.quote, i.proper.locator])
  if (i.cs) ty.push(['cs', 'c', i.cs.quote, i.cs.locator])
  if (i.loan) ty.push(['loan', 'l', `${i.loan[0]}\t${i.loan[1]}`])
  for (const h of dict) if (h.kind === 'type') ty.push([h.v, 'd', `${h.t}\t${h.a}\t${h.q}`, h.u])
  if (i.kind === 'archaic') ty.push(['arkh', 'k', 'архаїчна картка: слово відсутнє у ВЕСУМ, засвідчене лише у старих джерелах'])
  for (const r of reg) if (r[0] === 'arkh' && !ty.some(x => x[0] === 'arkh')) ty.push(['arkh', r[1] === 'd' ? 'd' : 'v', r[2], r[3]]); else if (r[0] === 'istor' && !ty.some(x => x[0] === 'istor')) ty.push(['istor', 'd', r[2], r[3]])
  const d = dialectOf(dict.filter(h => h.kind === 'area' || h.kind === 'dialectal'), plain, i.by)
  const sense: NonNullable<LbEntry['s']> = (i.se ?? []).filter(r => r.lb.length).map(r => [r.n, r.d, r.lb])
  const m = i.tagLine ? morphOf(i.tagLine) : '', pos = i.pos ?? (i.tagLine ? POS_UK[i.tagLine.split(':')[0]!] : undefined)
  return { v: 1, d, r: reg, t: ty, ...(sense.length ? { s: sense } : {}), ...(ft.length ? { f: ft } : {}), ...(i.by?.length ? { corpus: true } : {}), ...(pos ? { p: pos } : {}), ...(i.paradigmKind ? { k: i.paradigmKind } : {}), ...(m ? { m } : {}) }
}
