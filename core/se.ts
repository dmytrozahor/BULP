/**
 * SPEC 63 SE: sense evolution. Pure (no node / DOM imports): shared by the build stage (pipelines/build-se.ts), the shard writer and the card block (src/components/SenseEpochs.vue).
 *
 * Owner 2026-10-17: «у кожній картці послідовно має бути видно як змінювався сенс залежно від епохи». A claim about meaning needs the same rigour as a sound law:
 *  - a SENSE ROW is one dictionary's sense line of a lemma, with the dictionary, its edition years and its COVERAGE PERIOD (the language the dictionary describes, not its print year);
 *  - a quoted, dated source of the row (the dictionary's own dated quotation) outranks the coverage period;
 *  - rows of the same language are ALIGNED into groups by gloss similarity (match score; «inferred» unless a dictionary cross-references the other);
 *  - a TRANSITION A → B is typed only when a source names the type; otherwise «зміна значення (тип не вказано джерелом)»; its status is cited / inferred / hypothesis;
 *  - an epoch without evidence stays a gap. Nothing is guessed (P-1.1).
 */
import { assignEpoch, EPOCHS } from './epochs.ts'
import { articleStart, glossOf, stripMarks, type DictDir } from './sn.ts'
import { key } from './text.ts'

// ── SE-1: dictionaries and their coverage periods ─────────────────────────────────────────────────
export type GlossLang = 'ru' | 'uk' | 'de' | 'en' | 'none'
/** period = the dictionary describes an earlier period than its print year · own-time = it describes the language of its edition years · modern = current usage, the source does not date its senses */
export type CoverBasis = 'period' | 'own-time' | 'modern'
export interface DictCover {
  id: string; short: string; title: string
  /** print years of the edition */ edition: [number, number]
  /** years of the language the dictionary describes; null = the source does not date its senses */ cover: [number, number] | null
  basis: CoverBasis; lang: GlossLang; dir?: DictDir
  /** a sense line of this dictionary may carry the date of a quoted source (the witness date of a dated row) */ quoteDates?: boolean
  /** true = the build reads it today; false = declared so that its harvester only has to emit rows (SE-9) */ harvested: boolean
  note: string
}
const R = (id: string, short: string, title: string, edition: [number, number], lang: GlossLang, dir: DictDir, note = ''): DictCover => ({ id, short, title, edition, cover: edition, basis: 'own-time', lang, dir, harvested: true, note: note || 'описує мову свого часу (роки видання)' })
export const DICT_COVER: DictCover[] = [
  R('r2u_zheleh', 'Желехівський', 'Малорусько-німецький словар', [1886, 1886], 'de', 'uk-de'),
  R('r2u_umanets', 'Уманець–Спілка', 'Словарь росийсько-український', [1893, 1898], 'ru', 'ru-uk'),
  R('r2u_hrinch09', 'Грінченко', 'Словарь української мови', [1907, 1909], 'ru', 'uk-ru'),
  R('r2u_nikovsky', 'Ніковський', 'Словник українсько-російський', [1927, 1927], 'ru', 'uk-ru'),
  R('r2u_hrinch27', 'Грінченко 3-тє вид.', 'Словник української мови (3-тє вид.)', [1927, 1928], 'ru', 'uk-ru'),
  R('r2u_krymsky', 'Кримський–Єфремов', 'Російсько-український академічний словник', [1924, 1933], 'ru', 'ru-uk'),
  R('r2u_izyumov', 'Ізюмов', 'Російсько-український словник', [1930, 1930], 'ru', 'ru-uk'),
  R('r2u_doroshenko', 'Дорошенко–Станиславський', 'Російсько-український словник ділової мови', [1930, 1930], 'ru', 'ru-uk'),
  R('r2u_yakubski', 'Якубські', 'Російсько-український словник військової термінології', [1928, 1928], 'ru', 'ru-uk'),
  { id: 'dsu14', short: 'Словник староукр. мови XIV–XV ст.', title: 'Словник староукраїнської мови XIV–XV ст.', edition: [1977, 1978], cover: [1301, 1500], basis: 'period', lang: 'uk', quoteDates: true, harvested: true,
    note: 'історичний словник: описує XIV–XV ст., а не роки друку; у проєкті прочитано лише рядки заголовних слів (значення не копіюються), цитата з роком дає дату засвідчення' },
  { id: 'wikt.uk', short: 'Вікісловник (uk)', title: 'uk.wiktionary.org, розділ «Значення»', edition: [2026, 2026], cover: null, basis: 'modern', lang: 'uk', harvested: true, note: 'сучасне вживання; джерело не датує значень (рік видання не є датою значення)' },
  { id: 'wikt.en', short: 'Wiktionary (en, kaikki)', title: 'en.wiktionary.org via kaikki.org', edition: [2026, 2026], cover: null, basis: 'modern', lang: 'en', harvested: true, note: 'сучасне вживання; джерело не датує значень' },
  // SRC-28: the two Ruthenian bilingual dictionaries (CS headword → «проста мова» gloss), public domain; their print year is the date of the gloss word's sense
  { id: 'zyzanii-lexis', short: 'Зизаній, Лексис', title: 'Лексис, сиречь реченія, вкратце собраны и из словенска языка на простый рускій діалект истолкованы (Вільно 1596)', edition: [1596, 1596], cover: [1596, 1596], basis: 'own-time', lang: 'uk', quoteDates: true, harvested: true, note: 'церковнослов’янське слово з тлумаченням «простою мовою» 1596 р.; вичитаний друкований текст В. Німчука (К., 1964; litopys.org.ua/zyzlex/zyz99.htm)' },
  { id: 'berynda', short: 'Беринда, Лексікон', title: 'Лексікон славенороссійскій и именъ тлъкованіє (Київ 1627; Памво Беринда)', edition: [1627, 1627], cover: [1627, 1627], basis: 'own-time', lang: 'uk', quoteDates: true, harvested: true, note: 'церковнослов’янське слово з тлумаченням «простою мовою» 1627 р.; словник Беринди, не Зизанія; рядки з OCR друку, за порогом якості OQ' },
  // declared for the harvesters of SE-9 (nothing reads them yet); periods as stated by the dictionaries themselves
  { id: 'timchenko', short: 'Тимченко', title: 'Історичний словник українського язика', edition: [1930, 1932], cover: [1301, 1800], basis: 'period', lang: 'uk', quoteDates: true, harvested: true, note: 'лише А–Жял (надруковано два зошити); цитати XIV–XVIII ст. за століттями словника («ХУП.»); дата цитати важливіша за період' },
  { id: 'sum16', short: 'СУМ XVI – 1-ї пол. XVII ст.', title: 'Словник української мови XVI – першої половини XVII ст.', edition: [1994, 1994], cover: [1500, 1650], basis: 'period', lang: 'uk', quoteDates: true, harvested: true, note: 'НАН України, Інститут української мови (видання тривало; роки видання випусків уточнити?)' },
  { id: 'timchenko-materials', short: 'Тимченко, Матеріали XV–XVIII ст.', title: 'Матеріали до словника писемної та книжної української мови XV–XVIII ст.', edition: [2002, 2003], cover: [1401, 1800], basis: 'period', lang: 'ru', quoteDates: true, harvested: true, note: 'видання Німчука й Лисої з матеріалів Є. Тимченка; цитати датовані' },
  { id: 'biletsky-nosenko', short: 'Білецький-Носенко', title: 'Словник української мови (1840–1842)', edition: [1966, 1966], cover: [1840, 1842], basis: 'period', lang: 'ru', harvested: true, note: 'укладено в 1840-х, надруковано 1966 (вид. Німчука): описує мову 1840-х, а не 1966' },
  { id: 'zakrevsky', short: 'Закревський', title: 'Словарь малороссийских идиомов', edition: [1861, 1861], cover: [1861, 1861], basis: 'own-time', lang: 'ru', harvested: true, note: 'мова середини XIX ст.; мову глос перевірити (?)' },
  { id: 'shevchenko', short: 'Словник мови Шевченка', title: 'Словник мови Шевченка', edition: [1964, 1964], cover: [1837, 1861], basis: 'period', lang: 'uk', quoteDates: true, harvested: true, note: 'мова творів Т. Шевченка; дата цитати = дата твору; межі 1837–1861 ?' },
  { id: 'arkushyn', short: 'Аркушин (2000)', title: 'Словник західнополіських говірок', edition: [2000, 2000], cover: [1980, 1999], basis: 'own-time', lang: 'uk', harvested: true, note: 'діалектний словник (західнополіські говірки, записи 1980–1999); © — зберігаються лише слово, граматика, місця, глоса ≤ 200 знаків, том/сторінка (LB-11)' },
  { id: 'sum11', short: 'СУМ-11', title: 'Словник української мови в 11 томах', edition: [1970, 1980], cover: [1970, 1980], basis: 'own-time', lang: 'uk', harvested: false, note: 'сучасна літературна мова' },
  { id: 'sum20', short: 'СУМ-20', title: 'Словник української мови (СУМ-20)', edition: [2010, 2026], cover: [2010, 2026], basis: 'own-time', lang: 'uk', harvested: false, note: 'НАН України, Інститут української мови; сучасна літературна мова; видання триває; ліцензія — SPEC 63 GG-7' },
]
export const dictOfWitness = (wid: string): DictCover | undefined => DICT_COVER.find(d => d.id === wid) ?? (wid.startsWith('dsu14_') ? DICT_COVER.find(d => d.id === 'dsu14') : undefined)
export const dictById = (id: string): DictCover | undefined => DICT_COVER.find(d => d.id === id)
/** `dsu14_2_1450` = entries whose dated quotation falls in the decade 1450–1459; `dsu14_2_nd` = undated entries (coverage period only) */
export const isQuoteDated = (wid: string): boolean => /^dsu14_\d+_\d{4}$/.test(wid)

// ── rows ──────────────────────────────────────────────────────────────────────────────────────────
/** One sense line. d = dictionary id (DICT_COVER); g = gloss ('' = the source attests the word but its sense text is not kept); e = [from, to] of the dictionary's own dated quotation. */
export interface SeRow {
  d: string; g: string; p?: string
  /** verbatim quote of the line, ≤ 200 characters */ q?: string
  /** locator inside the dictionary */ l?: string
  e?: [number, number]
  /** sense number in the article (SE-11) */ n?: number
  /** sigla of the quotations as printed (SE-11) */ s?: string
  /** the key was reached through a derivation candidate of the headword, not its exact spelling (SE-11) */ m?: 'd'
  /** the type names the source gives to this sense (SE-4): [type id, the label as printed] */ t?: [string, string][]
  /** SPEC 63 GG-7: stable link to the article on the official site */ u?: string
  /** GG-7: the headword with its stress mark as the article shows it */ a?: string
  /** GG-7: the labels printed on the sense (розм., заст., діал., перен. …) */ lb?: string[]
  /** OCR quality gate: the dictionary's gloss was garbled and is not kept (1) */ oq?: 1
  /** Аркушин (LB-11): villages the entry names (the book list verbatim, ≤ 3), their number, and «усі н. пп.» */ v?: string[]; vn?: number; va?: 1
  /** LB-11: the headword failed the OCR gates for NEW cards (alphabetical sequence, strict score); the row still labels an existing lemma */ unv?: 1
  /** the Russian headword of a ru→uk article in which the lemma is the Ukrainian equivalent: a labelled cross-language note, NEVER the meaning of the Ukrainian word */ ru?: string
}
export interface SeAt { a: number | null; b: number | null; basis: 'quote' | CoverBasis }
export const MAX_ROWS = 30, MAX_QUOTE = 200

/** SE-1: the date of a row: its own dated quotation, else the dictionary's coverage period (never the print year of a historical dictionary). */
export function atOf(r: SeRow): SeAt {
  if (r.e) return { a: r.e[0], b: r.e[1], basis: 'quote' }
  const c = dictById(r.d)
  if (!c) return { a: null, b: null, basis: 'modern' }
  return c.cover ? { a: c.cover[0], b: c.cover[1], basis: c.basis } : { a: null, b: null, basis: 'modern' }
}

// ── SE-1: rows from the dictionary lines the corpus already holds ────────────────────────────────
/** the header line of an old-dictionary locator («т.2 ряд. 1572: НАДОБНОЄ с. (2) належне …») → the text after the part-of-speech mark, if any */
const AFTER_POS = /\s(?:ч|ж|с|мн|прикм|дієсл|присл|прийм|спол|част|займ|числ|вигук|виг|дієпр|незм)\.\s*(?:\(\d+\)\s*)*(.*)$/
const SEP_RU = /\s[=–—]\s|\s:\s/
/**
 * A ru→uk article («Усмотрение – розгляд, розсуд. На ваше -ние – на вашу думку …»): the part before the separator is the RUSSIAN headword, the rest is Ukrainian. The Ukrainian lemma documented by the
 * line is an equivalent in the Ukrainian part, so its sense row carries the clause of the Ukrainian part that holds the lemma (or the whole equivalent list when the quote is a single clause);
 * the Russian headword goes to `ru` as a labelled cross-language note, never to the gloss.
 */
export function ruUkSide(text: string, word: string, raw = ''): { g: string; ru?: string } {
  const t = stripMarks(text).replace(/^\*+/, '').trim()
  const m = SEP_RU.exec(t); if (!m) return { g: '' }
  const ru = t.slice(0, m.index).replace(/[.,;\s]+$/, '').trim().slice(0, 60), uk = t.slice(m.index + m[0].length).replace(/\s*\([^)]*\)/g, '').trim()
  const clauses = uk.split(/;|\.\s|\s[–—]\s/).map(x => x.replace(/[.;,\s]+$/, '').trim()).filter(Boolean)
  const ks = [key(word), key(raw)].filter(Boolean)
  const notRu = (x: string) => !/[ыэёЫЭЁ]/.test(x) && key(x) !== key(ru)   // Russian-only letters or the headword itself: that clause is not Ukrainian text
  const hit = clauses.filter(notRu).find(x => wordsOf(x).some(w => ks.includes(key(w)))) ?? (clauses.length === 1 && notRu(clauses[0]!) ? clauses[0] : undefined)
  return { g: hit && hit.length >= 2 ? hit.slice(0, 80) : '', ...(ru ? { ru } : {}) }
}

const DE_POS = /^(?:v|vb|vt|vi|vr|vrefl|m|f|n|s|a|adj|adv|prep|conj|interj|pron|num|pl|ж|м|с|мн|гл|прикм|присл)\.?,?$/i
const SEP_ONLY = /^[–—=:-]+$/
/** Желехівський (uk→de): «Робити, -блю, -биш, v. arbeiten, machen. …» → the German gloss after the headword, the inflection endings and the part-of-speech mark («arbeiten, machen»). '' when there is none. */
export function deGloss(text: string, word: string): string {
  const toks = stripMarks(text).replace(/^\*+/, '').trim().split(/\s+/), w = key(word); let i = 0
  while (i < toks.length) {
    const x = toks[i]!.replace(/[,.;]+$/, '')
    if (i === 0 || key(x) === w || /^-/.test(x) || DE_POS.test(toks[i]!) || SEP_ONLY.test(x) || /^\d+[.)]?$/.test(x)) i++
    else break
  }
  const g = toks.slice(i).join(' ').replace(/\s*\(.*$/, '').split(/\.\s/)[0]!.replace(/[.;,\s]+$/, '').trim()
  return g.length >= 2 && /\p{L}{2}/u.test(g) ? g.slice(0, 80) : ''
}


/**
 * A row from one dictionary attestation line (witness id, locator «…: article start», attested spelling, witness date). Returns undefined for a witness that is no sense dictionary.
 * The gloss is the one core/sn.ts glossOf reads (SN-1); Желехівський (uk-de) is read like a uk→ru article: the foreign gloss follows the headword.
 */
export function rowOfLine(wid: string, loc: string, raw: string, word: string, witnessDate?: [number, number]): SeRow | undefined {
  const c = dictOfWitness(wid)
  if (!c || c.basis === 'modern') return undefined
  const text = articleStart(loc)
  let g = '', ru: string | undefined
  if (c.id === 'dsu14') { const m = AFTER_POS.exec(text); g = m ? m[1]!.replace(/\(.*?\)/g, '').trim().slice(0, 80) : '' }   // only the header line is kept: a gloss exists only where the header has text after the part-of-speech mark
  else if (c.dir === 'ru-uk') { const x = ruUkSide(text, word, raw); g = x.g; ru = x.ru }   // the Russian headword is a note, the Ukrainian side is the gloss
  else if (c.dir === 'uk-de') g = deGloss(text, word)
  else g = glossOf(loc, word, c.dir) ?? ''
  const row: SeRow = { d: c.id, g }
  const q = text.slice(0, MAX_QUOTE); if (q) row.q = q
  const l = /(?:#|^)((?:т\.\d+ ряд\. \d+)|(?:\d+_\d+))(?::|$)/.exec(loc)?.[1] ?? /#([^:]+):/.exec(loc)?.[1]; if (l) row.l = l
  if (ru) row.ru = ru
  if (c.quoteDates && witnessDate && isQuoteDated(wid)) row.e = witnessDate
  const t = typeLabels(`${g} ${text}`); if (t.length) row.t = t
  void raw
  return row
}

// ── SE-4: type names given by a source ───────────────────────────────────────────────────────────
/** Labels that NAME a kind of sense change. The project adds none of its own: a row gets a type only if its own text (gloss, label, tag) carries one of these. */
export const TYPE_LABELS: { id: string; uk: string; re: RegExp }[] = [
  { id: 'figurative', uk: 'переносне значення', re: /(?:^|[\s(,;])(?:перен(?:\.|осн\w*)|figurative(?:ly)?)(?=[\s),;.]|$)/iu },
  { id: 'metaphor', uk: 'метафора', re: /метафор|\bmetaphor/iu },
  { id: 'metonymy', uk: 'метонімія', re: /метонім|\bmetonym/iu },
  { id: 'narrowing', uk: 'звуження значення', re: /звуж\w*\s+значення|\bnarrowing\b/iu },
  { id: 'broadening', uk: 'розширення значення', re: /розшир\w*\s+значення|\bbroadening\b/iu },
  { id: 'pejoration', uk: 'зневажливе (погіршення)', re: /(?:^|[\s(,;])(?:зневажл\w*|пейор\w*|pejorative|derogatory)(?=[\s),;.]|$)/iu },
  { id: 'amelioration', uk: 'поліпшення значення', re: /поліпшення\s+значення|\bamelioration\b/iu },
  { id: 'calque', uk: 'калька / запозичене значення', re: /(?:^|[\s(,;])(?:калька|кальк\w+|calque)(?=[\s),;.]|$)/iu },
]
export function typeLabels(text: string): [string, string][] {
  const out: [string, string][] = []
  for (const t of TYPE_LABELS) { const m = t.re.exec(text); if (m && !out.some(o => o[0] === t.id)) out.push([t.id, m[0].replace(/^[\s(,;]+/, '').replace(/[\s),;.]+$/, '')]) }
  return out
}
export const typeName = (id: string): string => TYPE_LABELS.find(t => t.id === id)?.uk ?? id

// ── SE-2: alignment of senses ────────────────────────────────────────────────────────────────────
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w.length > 3 ? w.slice(0, w.length - 1) : w)
const wordsOf = (s: string) => key(s).replace(/\([^)]*\)/g, ' ').split(/[^\p{L}']+/u).filter(w => w.length > 1)
const stemSet = (s: string) => new Set(wordsOf(s).map(stem))
/** Dice coefficient of the stem sets of two glosses; two identical first terms count 1. */
export function glossSim(a: string, b: string): number {
  if (!a || !b) return 0
  const ta = key(a.split(/[,;]/)[0]!).trim(), tb = key(b.split(/[,;]/)[0]!).trim()
  if (ta && ta === tb) return 1
  const A = stemSet(a), B = stemSet(b); if (!A.size || !B.size) return 0
  let n = 0; for (const x of A) if (B.has(x)) n++
  return Math.round((2 * n / (A.size + B.size)) * 100) / 100
}
const trigrams = (s: string): Set<string> => { const w = wordsOf(s), out = new Set<string>(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out }
/** a quotation shared by two rows: three consecutive words in common */
export const sharedQuote = (a: string, b: string): boolean => { if (!a || !b) return false; const A = trigrams(a); for (const x of trigrams(b)) if (A.has(x)) return true; return false }
export const MATCH_MIN = 0.5

export interface SeGroup {
  /** indices into rows */ rows: number[]
  /** match score of the alignment (mean of the matched pairs); null = a single row, nothing was matched */ sc: number | null
  /** 'inferred' unless a dictionary cross-references the other (SE-2) */ link: 'inferred' | 'xref'
  why?: 'gloss' | 'quote'
}
/** Rows of the same gloss language whose glosses are similar (≥ MATCH_MIN) or that share a quotation go into one group. Rows without a gloss never match (they attest the word only). `xref` = a dictionary cross-reference between two rows. */
export function align(rows: SeRow[], xref: (a: SeRow, b: SeRow) => boolean = () => false): SeGroup[] {
  const lang = (r: SeRow) => dictById(r.d)?.lang ?? 'none'
  /** score of a row against a group: its first row is the representative (no chaining: A~B and B~C do not make A~C), a shared quotation of any member counts 1 */
  const fit = (r: SeRow, g: number[]): { s: number; q: boolean } => {
    const rep = rows[g[0]!]!
    if (!r.g && !rep.g && r.d === rep.d) return { s: 1, q: false }   // attestations without a sense text of one dictionary: one group («слово засвідчене»)
    for (const i of g) if (rows[i]!.d !== r.d && sharedQuote(rows[i]!.q ?? '', r.q ?? '') && rows[i]!.g && r.g) return { s: 1, q: true }
    if (!r.g || !rep.g || lang(r) !== lang(rep) || lang(r) === 'none') return { s: 0, q: false }
    return { s: glossSim(r.g, rep.g), q: false }
  }
  const members: number[][] = [], scores: number[][] = [], quote: boolean[] = [], cross: boolean[] = []
  rows.forEach((r, i) => {
    let gi = -1, f = { s: 0, q: false }
    for (let k = 0; k < members.length; k++) { const x = fit(r, members[k]!); if (x.s >= MATCH_MIN) { gi = k; f = x; break } }
    if (gi < 0) { members.push([i]); scores.push([]); quote.push(false); cross.push(false); return }
    if (r.g) scores[gi]!.push(f.s)
    if (f.q) quote[gi] = true
    if (members[gi]!.some(j => xref(rows[j]!, r))) cross[gi] = true
    members[gi]!.push(i)
  })
  return members.map((ix, k) => ({
    rows: ix, sc: scores[k]!.length ? Math.round((scores[k]!.reduce((p, c) => p + c, 0) / scores[k]!.length) * 100) / 100 : null,
    link: cross[k] ? ('xref' as const) : ('inferred' as const), ...(ix.length > 1 ? { why: quote[k] ? ('quote' as const) : ('gloss' as const) } : {}),
  }))
}

// ── SE-3: corpus attestation per sense ───────────────────────────────────────────────────────────
export interface SeKwicIn { w: string; loc: string; left: string; node: string; right: string; date: [number, number] }
export interface SeKwic extends SeKwicIn { via: 'quote' | 'cue' }
/** collocation cues named in a gloss: the words of its parentheses («(про воду)» → вод) */
export function cuesOf(gloss: string): string[] {
  const out: string[] = []
  for (const m of gloss.matchAll(/\(([^)]{3,60})\)/g)) for (const w of wordsOf(m[1]!)) if (w.length >= 4 && !['про', 'щось', 'когось', 'кого', 'чого'].includes(w)) out.push(stem(w))
  return [...new Set(out)]
}
/**
 * SE-3: which group a corpus context documents. Only by evidence: (1) three consecutive words of the context stand in the quote of a dictionary row of that group
 * («quote»); (2) a collocation cue named in the gloss of exactly one group occurs next to the node («cue»). Anything else, and every ambiguous case, is `undefined` (unassigned).
 */
export function assignKwic(k: SeKwicIn, rows: SeRow[], groups: SeGroup[]): { group: number; via: 'quote' | 'cue' } | undefined {
  const ctx = `${k.left} ${k.node} ${k.right}`, hit: { group: number; via: 'quote' | 'cue' }[] = []
  groups.forEach((g, gi) => { if (g.rows.some(i => rows[i]!.q && sharedQuote(ctx, rows[i]!.q!))) hit.push({ group: gi, via: 'quote' }) })
  if (hit.length === 1) return hit[0]
  if (hit.length > 1) return undefined
  const near = new Set(wordsOf(`${k.left} ${k.right}`).map(stem))
  groups.forEach((g, gi) => { if (g.rows.some(i => cuesOf(rows[i]!.g).some(c => near.has(c)))) hit.push({ group: gi, via: 'cue' }) })
  return hit.length === 1 ? hit[0] : undefined
}

// ── epochs and the timeline (SE-5) ───────────────────────────────────────────────────────────────
export const SE_EPOCHS = EPOCHS.filter(e => e.scheme === 'shev' && !e.overlay)
export const SE_EPOCH_IDS = SE_EPOCHS.map(e => e.id)
export interface EpochPlace { ids: string[]; conf: 'high' | 'medium' | 'low' }
/** the Shevelov epoch(s) of a date interval by the project's assignment algorithm (core/epochs.ts); a source that does not date its senses (modern) sits in the last epoch, flagged. */
export function epochsOf(at: SeAt): EpochPlace {
  if (at.a === null || at.b === null) return { ids: ['shev.modern'], conf: 'low' }
  const v = assignEpoch([at.a, at.b], 'shev').value as { epochs?: string[]; confidence?: 'high' | 'medium' | 'low' } | undefined
  return v && Array.isArray(v.epochs) ? { ids: v.epochs, conf: v.confidence ?? 'low' } : { ids: [], conf: 'low' }
}

export interface SeTrans { from: number; to: number; type: string | null; label?: string; status: 'cited' | 'inferred' | 'hypothesis'; /** row index that names the type */ by?: number; note: string }
export const UNTYPED = 'зміна значення (тип не вказано джерелом)'
const firstEpoch = (g: SeGroup, rows: SeRow[]): number => {
  let best = 99
  for (const i of g.rows) { const p = epochsOf(atOf(rows[i]!)); if (p.ids.length) best = Math.min(best, SE_EPOCH_IDS.indexOf(p.ids[0]!)) }
  return best
}
/**
 * SE-4: transitions A → B between groups attested in different epochs. B must have exactly ONE group attested in the closest earlier attested epoch (no guessing among several
 * possible origins). Type: only a label that a row of B carries (TYPE_LABELS). Status: cited = a source names the type; inferred = both ends are dated by quotations;
 * hypothesis = at least one end rests on a coverage period / edition year only (the order may only mirror which dictionary covers which period).
 */
export function transitions(rows: SeRow[], groups: SeGroup[]): SeTrans[] {
  const glang = (g: SeGroup) => dictById(rows[g.rows.find(r => rows[r]!.g) ?? g.rows[0]!]!.d)?.lang ?? 'none'
  const fe = groups.map(g => firstEpoch(g, rows)), out: SeTrans[] = []
  const quoteDated = (g: SeGroup) => g.rows.some(i => rows[i]!.e)
  groups.forEach((b, bi) => {
    if (fe[bi]! >= 99 || !b.rows.some(i => rows[i]!.g)) return
    const earlier = groups.map((_, i) => i).filter(i => fe[i]! < fe[bi]! && groups[i]!.rows.some(r => rows[r]!.g) && glang(groups[i]!) === glang(b))   // glosses of different languages cannot be compared: no change is claimed
    if (!earlier.length) return
    const nearest = Math.max(...earlier.map(i => fe[i]!)), cand = earlier.filter(i => fe[i] === nearest)
    if (cand.length !== 1) return
    const ai = cand[0]!, by = b.rows.find(i => rows[i]!.t?.length), lab = by === undefined ? undefined : rows[by]!.t![0]!
    out.push({
      from: ai, to: bi, type: lab ? lab[0] : null, ...(lab ? { label: lab[1], by } : {}),
      status: lab ? 'cited' : quoteDated(groups[ai]!) && quoteDated(b) ? 'inferred' : 'hypothesis',
      note: lab ? `тип названо джерелом: «${lab[1]}»` : UNTYPED,
    })
  })
  return out
}

export interface SeEntry {
  v: 1; rows: SeRow[]; groups: SeGroup[]; trans: SeTrans[]
  /** per group: corpus contexts assigned by evidence (≤ 3 each) */ kw?: { g: number; k: SeKwic }[]
  /** corpus contexts NOT assigned to any sense, per Shevelov epoch (SE-3 «unassigned») */ un?: Record<string, number>
}
export function buildEntry(rows: SeRow[], kwic: SeKwicIn[] = [], xref?: (a: SeRow, b: SeRow) => boolean): SeEntry {
  const rs = rows.slice(0, MAX_ROWS), groups = align(rs, xref), trans = transitions(rs, groups)
  const e: SeEntry = { v: 1, rows: rs, groups, trans }
  const per = new Map<number, number>(), un: Record<string, number> = {}
  for (const k of kwic) {
    const a = assignKwic(k, rs, groups)
    if (a && (per.get(a.group) ?? 0) < 3) { per.set(a.group, (per.get(a.group) ?? 0) + 1); (e.kw ??= []).push({ g: a.group, k: { ...k, via: a.via } }) }
    else if (!a) { const ep = epochsOf({ a: k.date[0], b: k.date[1], basis: 'quote' }).ids[0] ?? 'shev.modern'; un[ep] = (un[ep] ?? 0) + 1 }
  }
  if (Object.keys(un).length) e.un = un
  return e
}

// ── the timeline the card shows ──────────────────────────────────────────────────────────────────
export interface TlItem { group: number; rows: number[]; conf: 'high' | 'medium' | 'low'; /** the row's place spans more than one epoch: shown in each with a «?» */ span: boolean; undated: boolean }
export interface TlCell { epoch: string; items: TlItem[]; /** no evidence: a gap, never filled */ gap: boolean; unassigned: number }
export function timeline(e: SeEntry): TlCell[] {
  const cells: TlCell[] = SE_EPOCH_IDS.map(epoch => ({ epoch, items: [], gap: true, unassigned: e.un?.[epoch] ?? 0 }))
  e.groups.forEach((g, gi) => {
    const byEpoch = new Map<string, { rows: number[]; conf: EpochPlace['conf']; span: boolean; undated: boolean }>()
    for (const i of g.rows) {
      const at = atOf(e.rows[i]!), p = epochsOf(at)
      for (const id of p.ids) {
        const c = byEpoch.get(id) ?? byEpoch.set(id, { rows: [], conf: p.conf, span: p.ids.length > 1, undated: at.a === null }).get(id)!
        c.rows.push(i); if (p.ids.length > 1) c.span = true
      }
    }
    for (const [id, c] of byEpoch) { const cell = cells[SE_EPOCH_IDS.indexOf(id)]; if (cell) { cell.items.push({ group: gi, rows: c.rows, conf: c.conf, span: c.span, undated: c.undated }); cell.gap = false } }
  })
  return cells
}
