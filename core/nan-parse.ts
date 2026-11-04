/**
 * SPEC 63 SE-14 — article parser for Чабаненко В. А. «Словник говірок Нижньої Наддніпрянщини», т. 1–4 (Запоріжжя: Запорізький державний університет, 1992). Pure (no node imports).
 * © policy (as for СУМ, GG-7 and Аркушин, LB-11): the output keeps ONLY the headword (+ stress when the text layer shows it), POS/grammar, the register labels, the settlements the entry names
 * (by the book's own lists of abbreviations, т. 1 pp. 11-43), sense numbers, a gloss of at most 200 characters (word boundary, «…») and the volume/page. The dialect transcription in
 * slashes, the illustrative sentences (field recordings), proverbs and the Latin names are NEVER taken. No full-definition field exists here.
 *
 * Layout (preface «Оформлення словникових статей», т. 1 pp. 5-9): HEADWORD in capitals · [/transcription/] · grammar (endings, gender, aspect: «а, ч.», «аю, аєш, недок.») · labels (бот., перен., ірон. …) ·
 * the gloss · [illustration] · /settlement abbreviations/ in alphabetical order. `*` before the headword = a word of the 19th-early 20th c. sources only (then «/ЯСл,48 - Лбм./» = source siglum, page, settlement),
 * `**` = both old and new records. The book is a differential dictionary; its register also holds words that differ from the literary ones only in sound, meaning or form (preface items 2-10).
 * The text comes from two readings of the scan: Tesseract (`-l ukr`, the page text: letters are good) and the broken-encoding text layer (`tl_NNNN.txt`: the lists of abbreviations and the printed page numbers are clean).
 */
import { GLOSS_MAX, glossClean, headwordOk, ocrScore } from './se-parse.ts'
import { clip } from './sum-import.ts'
import { textLayerGlossOk, tokensOf } from './text-layer.ts'

export const NAN_DICT = 'chabanenko'
/** the labels the project's label table reads (core/dict-labels.ts NAN_LABELS): word-level (a word of the area) and place-only (a standard word recorded in the area) */
export const NAN_LABEL = 'ниж.-наддн.'
export const NAN_PLACE = 'ниж.-наддн. (місце запису)'
export const NAN_SHORT = 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)'

/** register labels of the preface list that the project already knows; sphere labels (бот., зол. …) are no register and stay out of `lb` */
const REG_LABELS: Record<string, string> = { 'жарт': 'жарт.', 'ірон': 'ірон.', 'зневажл': 'зневажл.', 'пестл': 'пестл.', 'евф': 'евф.', 'лайл': 'лайл.', 'вульг': 'вульг.', 'заст': 'заст.', 'фам': 'розм.', 'глузл': 'зневажл.' }
const SPHERE = ['акт', 'анат', 'бджіл', 'безос', 'бонд', 'бот', 'вет', 'вин', 'дит', 'етн', 'зол', 'іст', 'іхт', 'кул', 'лоцм', 'мед', 'метеор', 'міф', 'орн', 'пас', 'перен', 'риб', 'спец', 'ткац', 'фізіол', 'збільш', 'згруб', 'зменш', 'збірн', 'підсил', 'зрід', 'заг', 'пор', 'присудк', 'прик', 'пр', 'порівн', 'примов', 'рідко', 'діал', 'розм', 'книжн', 'поет']
const LABS = [...Object.keys(REG_LABELS), ...SPHERE].sort((a, b) => b.length - a.length)
const LAB_RE = new RegExp(`^[\\s,;]*(${LABS.join('|')})(?:[.\\-][а-яіїєґ]{0,8}\\.?)?(?=[\\s,;.]|$)`, 'u')

// ── settlements ────────────────────────────────────────────────────────────────────────────────────────
export interface Settle { abbr: string; name: string; old?: boolean }
export interface Settlements { modern: Map<string, string>; old: Map<string, string> }
const KIND = /^(?:смт\.?|селище|с\.|с(?=[А-ЯІЇЄҐ])|м\.|м(?=[А-ЯІЇЄҐ])|х\.|х(?=[А-ЯІЇЄҐ])|о\.|о(?=[А-ЯІЇЄҐ])|урочище|хутір)\s*/u
/** one entry of the book's lists: «Аб.   - с.Абрикосівка Михайлівського р-ну Запорізької обл.» (continuation lines are indented) */
const SLINE = /^\s*([А-ЯІЇЄҐ][А-Яа-яіїєґ'’]{0,6}\.?)\s{1,40}-\s*(.+)$/u
/**
 * The lists in the text layer of т. 1: «УМОВНІ СКОРОЧЕННЯ НАЗВ НАСЕЛЕНИХ ПУНКТІВ … 2-ІЙ ПОЛОВИНІ ХІХ …» (old, 1856-1938) and the same «… ХХ СТ. /1953-1990рр./» (modern). The headings split the pages into the two lists;
 * the region list («Берд.пов. …») is a list of counties, not villages, and is kept apart as place-only abbreviations of the old sources. A list with fewer than 100 modern entries is not trusted (empty map).
 */
export function parseSettlements(tlPages: string[]): Settlements {
  const modern = new Map<string, string>(), old = new Map<string, string>()
  let cur: Map<string, string> | undefined, last: string | undefined, head = 0
  for (const p of tlPages) for (const raw of p.split('\n')) {
    const l = raw.replace(/\s+$/, '')
    if (/УМОВНІ СКОРОЧЕННЯ НАЗВ (?:НАСЕЛЕНИХ ПУНКТІВ|РЕГІОНІВ)/u.test(l)) { cur = undefined; last = undefined; head = /РЕГІОНІВ/u.test(l) ? -1 : 4; continue }
    if (head !== 0) {   // the heading goes on for a few lines: the years decide which list follows (the region list is not read)
      if (head > 0 && SLINE.test(l)) head = 0
      else {
        const ly = l.replace(/[ІI]/g, '1')   // the scan prints «/1856-1938рр./» with a Cyrillic І for 1
        if (head > 0 && /195\d|1990|1953/u.test(ly)) { cur = modern; head = 0; continue }
        if (head > 0 && /1856|1938|18\d\d/u.test(ly)) { cur = old; head = 0; continue }
        if (head > 0) head--; else if (!l.trim()) head = 0
        continue
      }
    }
    if (!cur) continue
    if (/^\s*\d{1,3}\s*$/.test(l)) continue
    const m = SLINE.exec(l)
    if (m && (/(?:обл|губ|пов|р-ну|р~ну|повіт|окр|округ)/u.test(m[2]!) || KIND.test(m[2]!))) {
      const abbr = m[1]!.replace(/\.$/, ''), name = m[2]!.replace(/\s+/g, ' ').replace(KIND, '').trim()
      if (!cur.has(abbr)) cur.set(abbr, name); last = abbr; continue
    }
    if (last && /^\s{6,}\S/.test(raw) && !/^\s*-/.test(raw)) cur.set(last, (cur.get(last)! + ' ' + l.trim()).replace(/\s+/g, ' '))   // a wrapped line
  }
  return { modern: modern.size >= 100 ? modern : new Map(), old }
}
/** «Єлизаветівка Запорізького р-ну Запорізької обл.» → «Єлизаветівка (Запорізький р-н)» (the place as the dictionary names it, shortened to the village and its district) */
export const placeName = (s: string): string => s.replace(/\s+/g, ' ').replace(/[-­]\s+(?=[а-яіїєґ])/gu, '-').replace(/\s+\d{1,3}$/, '').replace(/\s+[А-ЯІЇЄҐ][а-яіїєґб]{4,}ої\s+(?:обл|губ)\.?.*$/u, '').replace(/\s+(?:обл|губ)\.?$/u, '').replace(/(?<![\p{L}])Басил/gu, 'Васил').trim()

// ── entry splitting ────────────────────────────────────────────────────────────────────────────────────
export interface NanPage { text: string; tl?: string; no: number }
export interface NanStats {
  pages: number; candidates: number; xref: number; badHead: number; noGram: number; noSense: number; badGloss: number; seqDropped: number; unconfirmed: number; single: number
  entries: number; senses: number; clipped: number; withPlaces: number; placeHits: number; allPlaces: number; old: number; wordLevel: number; placeOnly: number
}
export const newNanStats = (): NanStats => ({ pages: 0, candidates: 0, xref: 0, badHead: 0, noGram: 0, noSense: 0, badGloss: 0, seqDropped: 0, unconfirmed: 0, single: 0, entries: 0, senses: 0, clipped: 0, withPlaces: 0, placeHits: 0, allPlaces: 0, old: 0, wordLevel: 0, placeOnly: 0 })
export const nanPassRate = (s: NanStats): number => (s.candidates ? Math.round((s.entries / (s.candidates - s.xref)) * 1000) / 1000 : 0)

const UP = 'А-ЯІЇЄҐ', UPL = 'А-ЯІЇЄҐ\'’ʼ\\-'
/** a headword at the start of a line: ≤ 2 junk characters (the star), capitals, then «/», «,», «.», a digit or «див.» */
const START = new RegExp(String.raw`^[^\p{L}\n]{0,2}([\p{L}'’ʼ\-]{3,34}?)(\d?)(?=\s*(?:/|,|\.\s|\.$|\s+див\.|\s+(?:ч|ж|с|мн)\.))`, 'u')
const upperShare = (t: string): number => { const l = [...t].filter(c => /\p{L}/u.test(c)); return l.length ? l.filter(c => c !== c.toLowerCase() || /[ІЇЄҐ]/.test(c)).length / l.length : 0 }
const isPageNo = (l: string): boolean => /^\d{1,3}$/.test(l)

export interface NanEntryRaw { text: string; page: number; star?: boolean }
/** the page texts → raw entries (a line continued on the next page joins; a hyphen at a line break joins). `tl`: the text layer, whose articles start with an indent of ≥ 3 blanks and keep the `*` / `**` of the old sources */
export function splitNanEntries(pages: NanPage[], st: NanStats | undefined, tl = false): NanEntryRaw[] {
  const out: NanEntryRaw[] = []
  let cur: NanEntryRaw | undefined
  for (const p of pages) {
    const raw = (tl ? p.tl ?? '' : p.text).split('\n').filter(l => l.trim())
    if (raw.length < 2) continue
    if (st) st.pages++
    for (const r of raw) {
      const l = r.trim()
      if (isPageNo(l)) continue
      const m = START.exec(l)
      if (m && (!tl || /^\s{3,}/.test(r)) && upperShare(m[1]!.replace(/^[^\p{L}]+/u, '')) >= 0.75 && !/^(?:ЗМІСТ|СЛОВНИК)/u.test(l)) {
        if (cur) out.push(cur)
        cur = { text: l.replace(/^[*^]+/, ''), page: p.no, ...(/^[*^]/.test(l) ? { star: true } : {}) }
      } else if (cur) {
        const t = cur.text
        cur.text = /[\p{L}][-­]$/u.test(t) && /^\p{Ll}/u.test(l) ? t.replace(/[-­]$/, '') + l : t + '\n' + l
      }
    }
  }
  if (cur) out.push(cur)
  return out
}

// ── grammar ────────────────────────────────────────────────────────────────────────────────────────────
const END = String.raw`[-а-яіїєґ'’ʼ]{1,7}`
/** the grammar block: noun («а, ч.», «и, ж.», «ів, мн.»), verb («аю, аєш, недок.»), adjective («а, е.», «ий, а, е.»), the particles and the like */
const GRAMS: RegExp[] = [
  new RegExp(String.raw`(?:${END},\s*){0,2}(?:ч|ж|с|мн|спільн)\.(?:\s*(?:і|й)\s*(?:ч|ж|с)\.)?`, 'u'),
  new RegExp(String.raw`(?:${END},\s*){1,2}(?:недок|док|однокр)\.(?:,?\s*(?:перех|неперех|безос|зворот)\.)?`, 'u'),
  new RegExp(String.raw`(?:${END},\s*){0,2}${END},\s*[еєо]\.`, 'u'),
  /(?:виг|присл|прийм|спол|част|займ|числ|вставн\.\s*сл|присудк|незм|дієсл|прикм|ім)\./u,
]
/** the grammar block → the part of speech and gender as the book abbreviates them (the endings «аю, аєш» are the inflection, not stored) */
export const posOf = (g: string): string | undefined => {
  const t = g.replace(/\s+/g, ' ')
  const asp = /(недок|док|однокр)\./u.exec(t), tr = /(?:^|\W)(неперех|перех|безос)\./u.exec(t)
  if (asp) return asp[1] + '.' + (tr ? ' ' + tr[1] + '.' : '')
  const gen = /(?:^|[\s,])(ч|ж|с|мн|спільн)\.(?:\s*(?:і|й)\s*(ч|ж|с)\.)?/u.exec(t)
  if (gen) return gen[1] + '.' + (gen[2] ? ' і ' + gen[2] + '.' : '')
  if (/[еєо]\.\s*$/u.test(t) && /,/.test(t)) return 'прикм.'
  const w = /(виг|присл|прийм|спол|част|займ|числ|вставн\.\s*сл|присудк|незм|дієсл|прикм|ім)\./u.exec(t)
  return w ? w[0].replace(/\s+/g, ' ') : undefined
}
const POS_UK = posOf

interface GramHit { start: number; end: number; text: string }
function findGram(rest: string): GramHit | undefined {
  const lim = rest.slice(0, 120)
  let best: GramHit | undefined
  for (const re of GRAMS) { const m = re.exec(lim); if (m && (!best || m.index < best.start)) best = { start: m.index, end: m.index + m[0].length, text: m[0] } }
  return best
}

// ── senses ─────────────────────────────────────────────────────────────────────────────────────────────
/** numbered senses start a line: «2. перен., ірон. Щось …» (OCR: «І.» for «1.»); consecutive numbers only */
function splitSenses(body: string): { n: number; text: string }[] {
  const lines = body.split('\n'), out: { n: number; text: string }[] = []
  let want = 2, cur = { n: 1, text: '' }
  for (const l of lines) {
    const m = /^\s*(\d)\.\s+(?=\S)/u.exec(l)
    if (m && Number(m[1]) === want) { out.push(cur); cur = { n: want, text: l.slice(m[0].length) }; want++ }
    else cur.text += (cur.text ? ' ' : '') + l
  }
  out.push(cur)
  return out
}
/** the first sentence of a sense (labels already taken): up to «. » + capital that is not an abbreviation. «Те саме, що КАРАБЕЛЬ І.» ends at the Roman numeral. */
const ABBR_END = /(?:^|[\s(])(?:т|д|ін|тощо|напр|пор|див|мн|одн|ч|ж|с|рос|пол|тур|нім|лат|гр|англ|франц|порівн|заст|діал|перен|ірон|розм|зменш|пестл|збільш|збірн|та|і|й)$/u
function firstSentence(t: string): { gloss: string; tail: string } {
  let i = 0
  while (i < t.length) {
    const j = t.indexOf('.', i); if (j < 0) break
    const before = t.slice(0, j), after = t.slice(j + 1)
    if (/^\s*$/.test(after) || /^\s+[-–—]\s+\S/u.test(after) || (/^\s+[А-ЯІЇЄҐ«"“'‘(]/u.test(after) && !ABBR_END.test(before) && !/\s[А-ЯІЇЄҐ]$/u.test(before) || /^\s+[А-ЯІЇЄҐ«"“'‘(]/u.test(after) && /\b[ІI]{1,3}$/.test(before))) return { gloss: before, tail: after }
    i = j + 1
  }
  return { gloss: t, tail: '' }
}
const slashToParen = (g: string): string => g.replace(/\s*\/\s*/g, (m, off: number, s: string) => { const pre = s.slice(0, off); return (pre.match(/\//g)?.length ?? 0) % 2 === 0 ? ' (' : ') ' }).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim()

function labelsOf(t: string): { labels: string[]; spheres: string[]; rest: string } {
  const labels: string[] = [], spheres: string[] = []
  let rest = t
  for (let i = 0; i < 5; i++) {
    const m = LAB_RE.exec(rest); if (!m) break
    const k = m[1]!; if (REG_LABELS[k]) { if (!labels.includes(REG_LABELS[k]!)) labels.push(REG_LABELS[k]!) } else spheres.push(k)
    rest = rest.slice(m[0].length)
  }
  return { labels, spheres, rest: rest.replace(/^[\s,;.]+/, '') }
}

/** a gloss starts with a letter, has ≥ 4 letters and is not a bare abbreviation or the debris of a mis-split grammar line («губ. (», «» бот») */
export const glossShape = (g: string): boolean => /^[\p{L}«(]/u.test(g) && (g.match(/\p{L}/gu)?.length ?? 0) >= 4 && !/\s(?:до|що|з|і|та|й|див)$/u.test(g) && !/^(?:губ|пов|р-ну|обл|субст|субот|перех|дерех|лерех|пелех|неперех|док|недок)(?![\p{L}])/u.test(g) && settlementShare(g) < 0.4
/** the share of tokens that look like the book's settlement abbreviations («НІвО», «БалВ», «Ом.»): two capitals in a short token */
const settlementShare = (g: string): number => { const t = g.split(/[\s,;()]+/).filter(Boolean); return t.length ? t.filter(w => w.length <= 6 && (w.match(/\p{Lu}/gu)?.length ?? 0) >= 2 && !/^\p{Lu}+$/u.test(w.replace(/[.']/g, ''))).length / t.length : 1 }
/** a gloss is kept when it reads as Ukrainian words (OCR gate) and has no digit debris */
export const nanGlossClean = (g: string): boolean => g.length >= 3 && glossClean(g) && /\p{L}{2}/u.test(g) && ocrScore(g.replace(/\([^)]{0,40}\)/g, ' ').replace(/[А-ЯІЇЄҐ]{3,}/g, ' ')) >= 0.8 && !/\d/.test(g.replace(/\([^)]*\)/g, ''))

// ── settlements of an entry ────────────────────────────────────────────────────────────────────────────
const ALL_RE = /(?:Так само )?(?:в усіх|у всіх)\s+(?:інших\s+)?(?:обстежених\s+)?насел/u
/**
 * The settlement abbreviations that stand in the article AFTER its gloss: a capitalised token of the book's modern list followed by «,» «.» or «/» («/Єлз., ВДан./, Куш., Прим.»). The old sources print
 * «/ЯСл,48 - Лбм./» (siglum, page, settlement): the part after the dash is read against the old list. Order of first occurrence, no repeats.
 */
export function placesOf(tail: string, s: Settlements): { names: string[]; abbrs: string[]; all: boolean; old: boolean } {
  const all = ALL_RE.test(tail), names: string[] = [], abbrs: string[] = []
  let isOld = false
  for (const m of tail.matchAll(/\/\s*[А-ЯІЇЄҐ][\p{L}]{0,5}\.?,?\s*\d{1,4}[^/]{0,12}?\s[-–—]\s*([А-ЯІЇЄҐ][\p{L}.]{0,10}(?:[.,]\s*[А-ЯІЇЄҐ][\p{L}.]{0,10})*)\s*\//gu)) {
    for (const a of m[1]!.split(/[,\s]+/).map(x => x.replace(/\.$/, '')).filter(Boolean)) { const n = s.old.get(a); if (n && !abbrs.includes(a)) { abbrs.push(a); names.push(placeName(n)); isOld = true } }
  }
  const body = tail.replace(/\/\s*[А-ЯІЇЄҐ][\p{L}]{0,5}\.?,?\s*\d{1,4}[^/]{0,12}?\s[-–—][^/]{0,60}\//gu, ' ')
  for (const m of body.matchAll(/(?<![\p{L}\d'’-])([А-ЯІЇЄҐ][\p{L}'’]{0,6})\.?(?=\s*[,./;)]|\s*$)/gu)) {
    const a = m[1]!; if (abbrs.includes(a)) continue
    const n = s.modern.get(a); if (n) { abbrs.push(a); names.push(placeName(n)) }
  }
  return { names, abbrs, all, old: isOld }
}

// ── the parsed article ─────────────────────────────────────────────────────────────────────────────────
export interface NanRow {
  head: string
  /** headword with the stress mark, when the text layer shows it */ a?: string
  pos?: string
  vol: number
  page: number
  senses: { n: number; labels: string[]; gloss: string; oq?: 1 }[]
  /** settlements named by the entry (the book's lists, first up to three), their number, «в усіх обстежених» */ v?: string[]; vn?: number; all?: boolean
  /** 19th-early 20th c. source only */ old?: boolean
  /** one reading of the scan only (the Tesseract text); the others are confirmed by the text layer */ one?: boolean
  /** word-level (the headword is no standard word) or a standard word recorded in the area */ wl?: boolean
  /** passed the alphabetical-sequence gate for the volume (new cards) */ seq?: boolean
  /** the settlement abbreviations of the entry, used by the gates only, never written */ ab?: string[]
  /** SE-16: a cross-reference article «X див. Y»; confirmed by the text layer; pieces of evidence for a card */ xr?: boolean; conf?: boolean; ev?: number
}

const fold = (h: string): string => h.toLowerCase().replace(/й/g, 'и').replace(/ї/g, 'і').replace(/[’ʼ]/g, "'")
const lev = (a: string, b: string): number => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0]![j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length]![b.length]! }

/** one reading of the scan (the OCR page text, or the text layer) → articles; no sequence gate, no known-word test yet */
function readSide(pages: NanPage[], vol: number, settlements: Settlements, tl: boolean, st: NanStats): NanRow[] {
  const rows: NanRow[] = []
  for (const e of splitNanEntries(pages, tl ? undefined : st, tl)) {
    if (!tl) st.candidates++
    const cnt = (k: 'xref' | 'badHead' | 'noGram' | 'noSense' | 'badGloss') => { if (!tl) st[k]++ }
    const m = START.exec(e.text)!
    const h = m[1]!.replace(/^[^\p{L}]+/u, '').replace(/[’ʼ]/g, "'").toLowerCase()
    const rest0 = e.text.slice(m[0].length).replace(/^\s+/, '')
    if (/^[.,\s]*див\./u.test(rest0)) { cnt('xref'); continue }
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(h) || !headwordOk(h)) { cnt('badHead'); continue }
    let rest = rest0
    // the transcription «/…/» (never kept)
    const tr = /^\/[^/]{0,80}\//u.exec(rest) ?? /^\/[^,/]{0,50}(?=,)/u.exec(rest)
    if (tr) rest = rest.slice(tr[0].length)
    // phonetic / accentual variants of the headword: «ЗЛАЗИТЬ /…/ і ІЗЛАЗИТЬ /…/, …» (the variants are not kept)
    for (let k = 0; k < 4; k++) { const v = /^\s*(?:і|й|та)\s+[ІЇ]?[А-ЯІЇЄҐ'’ʼ-]{3,}\s*(?:\/[^/]{0,80}(?:\/|(?=,)))?/u.exec(rest); if (!v) break; rest = rest.slice(v[0].length) }
    rest = rest.replace(/^[\s7]+(?=[,\s])/, '')
    const g = findGram(rest)
    let body: string, pos: string | undefined
    if (g && g.start <= 60) { body = rest.slice(g.end); pos = POS_UK(g.text) }
    else if (/^[.\s]*[А-ЯІЇЄҐ]/u.test(rest)) { body = rest.replace(/^[.\s]+/, '') }   // «КАРАВАН. Винокурня.»: an article of the old sources has no grammar
    else { cnt('noGram'); continue }
    const senses: NanRow['senses'] = []
    let tailAll = ''
    for (const s of splitSenses(body.replace(/^[\s,;.]+/, '')).slice(0, 10)) {
      const lb = labelsOf(s.text.replace(/^\s*[1І]\.\s+/u, '').replace(/^\s+/, ''))
      const fs = firstSentence(lb.rest)
      tailAll += ' ' + fs.tail
      let gloss = slashToParen(fs.gloss).replace(/\s*\([А-ЯІЇЄҐ][\p{L}]{0,4}[,.\s]*\d[^)]*\)/gu, '').replace(/\s*\((?:[\p{Lu}][\p{L}]{0,6}\.?[,\s]*)+\)?\s*\.?$/u, '').replace(/\s*\(\s*$/, '').replace(/[\s,;:.]+$/, '')   // a trailing «(НІвО, Ом.)» is the settlements, not the gloss; a source citation «(ЯСл,64 - Кпл.)» inside the gloss is not a gloss
      if (!gloss) continue
      if (!glossShape(gloss)) { cnt('badGloss'); senses.push({ n: s.n, labels: lb.labels, gloss: '', oq: 1 }); continue }
      gloss = clip(gloss, GLOSS_MAX)
      if (!nanGlossClean(gloss.replace(/…$/, ''))) { cnt('badGloss'); senses.push({ n: s.n, labels: lb.labels, gloss: '', oq: 1 }); continue }
      senses.push({ n: s.n, labels: lb.labels, gloss })
    }
    if (!senses.length) { cnt('noSense'); continue }
    if (senses.every(s => s.oq)) continue
    const pl = placesOf(tailAll + ' ' + body.slice(-260), settlements)
    rows.push({ head: h, ...(pos ? { pos } : {}), vol, page: e.page, senses, ...(pl.names.length ? { v: pl.names.slice(0, 3), vn: pl.names.length } : {}), ...(pl.all ? { all: true } : {}), ...(pl.old || e.star ? { old: true } : {}), ab: pl.abbrs })
  }
  return rows
}
const glossScore = (r: NanRow): number => { const g = r.senses.filter(s => s.gloss).map(s => ocrScore(s.gloss)); return g.length ? g.reduce((a, b) => a + b, 0) / g.length - (r.senses.some(s => s.oq) ? 0.05 : 0) : 0 }

/**
 * The entries of one volume from TWO independent readings of the scan: the Tesseract text (letters, headwords) and the broken-encoding text layer (paragraph structure, `*`, capitals after full stops).
 * An article is kept only when both readings have it on the same page with the same headword (folded й/и, ї/і; ≤ 1 letter apart, ≤ 2 for 8+ letters); the Tesseract headword is taken, the gloss of the reading that
 * scores better (a tie → the text layer), the settlements of both. `known(head)`: the headword is a standard word (VESUM through the corpus folds), so the label records only the place.
 */
export function parseNan(pages: NanPage[], vol: number, settlements: Settlements, known: (h: string) => boolean = () => false, wordKnown?: (w: string) => boolean): { rows: NanRow[]; stats: NanStats; cands: Set<string> } {
  const st = newNanStats()
  const ocr = readSide(pages, vol, settlements, false, st), tl = readSide(pages, vol, settlements, true, st)
  const byPage = new Map<number, NanRow[]>(); for (const t of tl) (byPage.get(t.page) ?? byPage.set(t.page, []).get(t.page)!).push(t)
  const rows: NanRow[] = [], used = new Set<NanRow>(), cands = new Set<string>()
  for (let o of ocr) {
    const pool = (byPage.get(o.page) ?? []).filter(t => !used.has(t))
    const fo = fold(o.head), lim = fo.length >= 8 ? 2 : 1
    const t = pool.map(c => ({ c, d: lev(fo, fold(c.head)) })).filter(x => x.d <= lim).sort((a, b) => a.d - b.d)[0]?.c
    if (!t) {   // one reading only: kept when the headword is strict and every gloss is fully word-like; it must also sit on the alphabetical spine (below)
      if (strictNanHead(o.head) && o.senses.every(x => x.gloss && ocrScore(x.gloss.replace(/…$/, '')) >= 1)) rows.push({ head: o.head, ...(o.pos ? { pos: o.pos } : {}), vol, page: o.page, senses: o.senses, ...(o.v ? { v: o.v, vn: o.vn } : {}), ...(o.all ? { all: true } : {}), ...(o.old ? { old: true } : {}), wl: !known(o.head), ab: o.ab ?? [], one: true })
      else st.unconfirmed++
      continue
    }
    used.add(t)
    for (const c of [o.head, t.head, o.head.slice(1)]) cands.add(c)
    // the Tesseract headword unless it is no word and the other reading (or the headword without a stray first letter: the OCR of «*») is
    if (!known(o.head)) { const alt = [t.head, o.head.slice(1)].find(c => c.length >= 3 && c !== o.head && known(c)); if (alt) o = { ...o, head: alt } }
    const best = glossScore(o) > glossScore(t) + 0.0001 ? o : t
    const names = [...new Set([...(best.v ?? []), ...(o === best ? t.v ?? [] : o.v ?? [])])]
    const vn = Math.max(o.vn ?? 0, t.vn ?? 0)
    const ab = [...new Set([...(o.ab ?? []), ...(t.ab ?? [])])]
    const pos = best.pos ?? o.pos ?? t.pos
    const wl = !known(o.head)
    rows.push({ head: o.head, ...(pos ? { pos } : {}), vol, page: o.page, senses: best.senses, ...(names.length ? { v: names.slice(0, 3), vn: Math.max(vn, names.length) } : {}), ...(o.all || t.all ? { all: true } : {}), ...(o.old || t.old ? { old: true } : {}), wl, ab })
  }
  for (const r of rows) for (const x of r.senses) for (const t of tokensOf(x.gloss)) cands.add(t.w)
  if (wordKnown) for (const r of rows) for (const x of r.senses) if (x.gloss && !textLayerGlossOk(x.gloss.replace(/…$/, ''), wordKnown, r.head)) { x.gloss = ''; x.oq = 1; st.badGloss++ }
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.senses.every(x => x.oq)) { rows.splice(i, 1); st.unconfirmed++ }
  markNanSequence(rows, st)
  // a headword that is off the alphabetical spine of the volume is a misread headword (a lost first letter, the OCR of «*»): such a row could label the WRONG lemma, so it is not emitted at all
  for (let i = rows.length - 1; i >= 0; i--) if (!rows[i]!.seq) { const r = rows[i]!; rows.splice(i, 1); if (r.one) st.unconfirmed++ }
  for (const r of rows) {
    if (r.one) st.single++
    st.entries++; st.senses += r.senses.length; st.clipped += r.senses.filter(s => s.gloss.endsWith('…')).length
    if (r.v?.length) { st.withPlaces++; st.placeHits += r.vn ?? r.v.length }
    if (r.all) st.allPlaces++
    if (r.old) st.old++
    if (r.wl) st.wordLevel++; else st.placeOnly++
  }
  return { rows, stats: st, cands }
}

/** parsed articles → SE rows [headword, row] (d `chabanenko`, lb = the area label + the registers the sense prints) */
export function nanRows(a: NanRow): [string, import('./se.ts').SeRow][] {
  return a.senses.map(s => [a.head, {
    d: NAN_DICT, g: s.gloss, ...(a.pos ? { p: a.pos } : {}), n: s.n, l: `т.${a.vol} с.${a.page}`, lb: [a.wl ? NAN_LABEL : NAN_PLACE, ...s.labels],
    ...(a.a ? { a: a.a } : {}), ...(s.oq ? { oq: 1 as const } : {}), ...(a.seq === false ? { unv: 1 as const } : {}), ...(a.v ? { v: a.v, vn: a.vn } : {}), ...(a.all ? { va: 1 as const } : {}),
  }])
}

// ── gates for the alphabetical sequence ────────────────────────────────────────────────────────────────
const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const keyOf = (h: string): number[] => [...h.toLowerCase().normalize('NFC').replace(/[́'’ʼ-]/g, '')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
const cmpKey = (a: number[], b: number[]): number => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }
/** strict headword: ≥ 3 letters, one script, a plausible word */
export const strictNanHead = (h: string): boolean => h.replace(/['\-]/g, '').length >= 3 && ocrScore(h.replace(/[-']/g, ' ')) >= 1 && !/[^а-яіїєґ'\-]/u.test(h) && !/ьть$|іь|ьь/.test(h)
/** the headwords of a volume in page order are non-decreasing; the longest non-decreasing subsequence is the verified spine, the others get `seq = false` (the row still labels an existing lemma) */
export function markNanSequence(rows: NanRow[], st?: NanStats): void {
  const ks = rows.map(r => keyOf(r.head)), n = rows.length
  const tails: number[] = [], prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpKey(ks[tails[mid]!]!, ks[i]!) <= 0) lo = mid + 1; else hi = mid }
    if (lo > 0) prev[i] = tails[lo - 1]!
    tails[lo] = i
  }
  const spine = new Set<number>()
  for (let i = tails[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) spine.add(i)
  rows.forEach((r, i) => { r.seq = spine.has(i) && strictNanHead(r.head); if (!r.seq && st) st.seqDropped++ })
}

// ═══ SE-16: recall design (as SE-15) ═══════════════════════════════════════════════════════════════════
/**
 * SPEC 63 SE-16. SE-14 kept ≈ 25 % of the book: an article was dropped for a garbled grammar block (2,558 of 9,683), a garbled gloss (2,258), no second reading (764) or an off-spine headword (1,013). Here an article
 * whose HEADWORD is read is kept: a garbled gloss → the headword with `oq`; no readable grammar → the gloss starts at the first Capitalised word after the garbled block; a cross-reference «ЗАБЛАКУВАТЬ див. ЗАБЛАКОВУВАТЬ»
 * is a headword too (no gloss stored); a headword off the alphabetical spine is kept as `unv` (it labels an existing lemma, makes no card). A headword makes a CARD only when it is strict, on the spine and has two of three
 * pieces of evidence: the text layer reads the same article on the same page, a settlement group, a clean gloss. Only the Tesseract reading yields headwords (the text layer's letters are broken); it confirms and supplies settlements.
 */
export interface NanStats16 extends NanStats { garbledGram: number; oqRows: number; xrefRows: number; unv: number; cardOk: number; repaired: number; tlOnly: number; headOnly: number }
export const newNanStats16 = (): NanStats16 => ({ ...newNanStats(), garbledGram: 0, oqRows: 0, xrefRows: 0, unv: 0, cardOk: 0, repaired: 0, tlOnly: 0, headOnly: 0 })
/** where the gloss starts when the grammar block is unreadable: the first Capitalised word after a full stop / comma / dash within the first 90 characters */
const GLOSS_AT = /(?:^|[.;:,]\s+|\s[-–—]\s)(?:[1І]\.\s+)?(?=[А-ЯІЇЄҐ][а-яіїєґ'’]{2})/u
const LONG_WORD = /[а-яіїєґ]{7,}/u

/** the share of the tokens of a gloss that are the book's own settlement abbreviations («Кір., Коп., Про, Чуб., Юр») */
const abbrShare = (g: string, s: Settlements): number => { const t = g.split(/[\s,;.()]+/).filter(Boolean); return t.length ? t.filter(w => s.modern.has(w) || s.old.has(w)).length / t.length : 0 }

/** one reading → rows, none dropped for the gloss or the grammar (counters: only the Tesseract side is counted) */
function readSide16(pages: NanPage[], vol: number, settlements: Settlements, tl: boolean, st: NanStats16): NanRow[] {
  const rows: NanRow[] = []
  for (const e of splitNanEntries(pages, tl ? undefined : st, tl)) {
    if (!tl) st.candidates++
    const m = START.exec(e.text)!
    const h = m[1]!.replace(/^[^\p{L}]+/u, '').replace(/[’ʼ]/g, "'").toLowerCase()
    const rest0 = e.text.slice(m[0].length).replace(/^\s+/, '')
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(h) || !headwordOk(h)) { if (!tl) st.badHead++; continue }
    if (/^[.,\s\-–—]*(?:ТМ\s*)?див\.?/u.test(rest0)) {
      if (!tl) { st.xref++; st.xrefRows++ }
      rows.push({ head: h, vol, page: e.page, senses: [{ n: 1, labels: [], gloss: '', oq: 1 }], xr: true, ab: [], ...(e.star ? { old: true } : {}) })
      continue
    }
    let rest = rest0
    const tr = /^\/[^/]{0,80}\//u.exec(rest) ?? /^\/[^,/]{0,50}(?=,)/u.exec(rest)
    if (tr) rest = rest.slice(tr[0].length)
    for (let k = 0; k < 4; k++) { const v = /^\s*(?:і|й|та)\s+[ІЇ]?[А-ЯІЇЄҐ'’ʼ-]{3,}\s*(?:\/[^/]{0,80}(?:\/|(?=,)))?/u.exec(rest); if (!v) break; rest = rest.slice(v[0].length) }
    rest = rest.replace(/^[\s7]+(?=[,\s])/, '')
    const g = findGram(rest)
    let body: string | undefined, pos: string | undefined
    if (g && g.start <= 60) { body = rest.slice(g.end); pos = POS_UK(g.text) }
    else if (/^[.\s]*[А-ЯІЇЄҐ]/u.test(rest)) body = rest.replace(/^[.\s]+/, '')
    else {   // the grammar block is garbled («8,2;», «и, х.», «ДА:»): the gloss starts at the first Capitalised word after it, when the block before it is short and holds no long word
      if (!tl) st.garbledGram++
      const ga = GLOSS_AT.exec(rest.slice(0, 90))
      if (ga && ga.index + ga[0].length <= 70 && !LONG_WORD.test(rest.slice(0, ga.index + ga[0].length))) body = rest.slice(ga.index + ga[0].length)
    }
    const senses: NanRow['senses'] = []
    let tailAll = ''
    if (body !== undefined) {
      for (const s of splitSenses(body.replace(/^[\s,;.]+/, '')).slice(0, 10)) {
        const lb = labelsOf(s.text.replace(/^\s*[1І]\.\s+/u, '').replace(/^\s+/, ''))
        const fs = firstSentence(lb.rest)
        tailAll += ' ' + fs.tail
        let gloss = slashToParen(fs.gloss).replace(/\s*\([А-ЯІЇЄҐ][\p{L}]{0,4}[,.\s]*\d[^)]*\)/gu, '').replace(/\s*\((?:[\p{Lu}][\p{L}]{0,6}\.?[,\s]*)+\)?\s*\.?$/u, '').replace(/\s*\(\s*$/, '').replace(/[\s,;:.]+$/, '')
        if (!gloss) continue
        if (!glossShape(gloss) || !/^[А-ЯІЇЄҐ«(]/u.test(gloss) || abbrShare(gloss, settlements) >= 0.5) { senses.push({ n: s.n, labels: lb.labels, gloss: '', oq: 1 }); continue }   // the book capitalises every gloss; a run of settlement abbreviations is no gloss
        gloss = clip(gloss, GLOSS_MAX)
        if (!nanGlossClean(gloss.replace(/…$/, ''))) { senses.push({ n: s.n, labels: lb.labels, gloss: '', oq: 1 }); continue }
        senses.push({ n: s.n, labels: lb.labels, gloss })
      }
    }
    if (!senses.length) { senses.push({ n: 1, labels: [], gloss: '', oq: 1 }); if (!tl) st.headOnly++ }
    const pl = placesOf(tailAll + ' ' + (body ?? rest).slice(-260), settlements)
    rows.push({ head: h, ...(pos ? { pos } : {}), vol, page: e.page, senses, ...(pl.names.length ? { v: pl.names.slice(0, 3), vn: pl.names.length } : {}), ...(pl.all ? { all: true } : {}), ...(pl.old || e.star ? { old: true } : {}), ab: pl.abbrs })
  }
  return rows
}

/** a headword off the spine whose first letter is the debris of the book's `*` (Ж, Я, У, Ш, І …) and which fits between its spine neighbours without it is repaired */
export function repairStarHeads(rows: NanRow[], st?: NanStats16): void {
  const spineIdx = rows.map((r, i) => (r.seq ? i : -1)).filter(i => i >= 0)
  let p = 0
  rows.forEach((r, i) => {
    if (r.seq) return
    while (p < spineIdx.length && spineIdx[p]! < i) p++
    const prev = rows[spineIdx[p - 1] ?? -1], next = rows[spineIdx[p] ?? -1]
    const alt = r.head.slice(1)
    if (!/^[жяушзі]/u.test(r.head) || alt.length < 3 || !/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(alt)) return
    const k = keyOf(alt)
    if ((!prev || cmpKey(keyOf(prev.head), k) <= 0) && (!next || cmpKey(k, keyOf(next.head)) <= 0)) { r.head = alt; r.seq = strictNanHead(alt); if (st) { st.repaired++; if (r.seq) st.seqDropped-- } }
  })
}

/**
 * The articles of one volume, recall design. The Tesseract reading gives the rows; the text layer confirms (same page, folded headword ≤ 1–2 letters apart) and adds its settlements and a better gloss. Evidence `ev` = confirmed +
 * a settlement group + a clean gloss; `seq` (a CARD) = strict headword, on the alphabetical spine, `ev ≥ 2`.
 */
export function parseNanRecall(pages: NanPage[], vol: number, settlements: Settlements, known: (h: string) => boolean = () => false, wordKnown?: (w: string) => boolean): { rows: NanRow[]; stats: NanStats16; cands: Set<string> } {
  const st = newNanStats16(), cands = new Set<string>()
  const ocr = readSide16(pages, vol, settlements, false, st), tl = readSide16(pages, vol, settlements, true, st)
  const byPage = new Map<number, NanRow[]>(); for (const t of tl) (byPage.get(t.page) ?? byPage.set(t.page, []).get(t.page)!).push(t)
  const used = new Set<NanRow>(), rows: NanRow[] = []
  for (const o of ocr) {
    cands.add(o.head)
    const pool = (byPage.get(o.page) ?? []).filter(t => !used.has(t) && !t.xr)
    const fo = fold(o.head), lim = fo.length >= 8 ? 2 : 1
    const t = o.xr ? undefined : pool.map(c => ({ c, d: lev(fo, fold(c.head)) })).filter(x => x.d <= lim).sort((a, b) => a.d - b.d)[0]?.c
    let row: NanRow = { ...o }
    if (t) {
      used.add(t); cands.add(t.head)
      const best = glossScore(t) > glossScore(o) + 0.0001 ? t : o
      const names = [...new Set([...(o.v ?? []), ...(t.v ?? [])])]
      const pos = best.pos ?? o.pos ?? t.pos
      row = { ...o, ...(pos ? { pos } : {}), senses: best.senses, ...(names.length ? { v: names.slice(0, 3), vn: Math.max(o.vn ?? 0, t.vn ?? 0, names.length) } : {}), ...(o.all || t.all ? { all: true } : {}), ...(o.old || t.old ? { old: true } : {}), ab: [...new Set([...(o.ab ?? []), ...(t.ab ?? [])])], conf: true }
    }
    row.wl = !known(row.head)
    rows.push(row)
  }
  st.tlOnly = tl.filter(t => !used.has(t) && !t.xr).length
  for (const r of rows) for (const x of r.senses) for (const t of tokensOf(x.gloss)) cands.add(t.w)
  if (wordKnown) for (const r of rows) for (const x of r.senses) if (x.gloss && !textLayerGlossOk(x.gloss.replace(/…$/, ''), wordKnown, r.head)) { x.gloss = ''; x.oq = 1; st.badGloss++ }
  const evOf = (r: NanRow): number => (r.conf ? 1 : 0) + (r.v?.length || r.all ? 1 : 0) + (r.senses.some(s => !s.oq && s.gloss) ? 1 : 0)
  for (const r of rows) r.ev = evOf(r)
  markNanSequence(rows, st)
  repairStarHeads(rows, st)
  for (const r of rows) if (r.seq && r.ev! < 2) r.seq = false
  for (const r of rows) {
    st.entries++; st.senses += r.senses.length; st.clipped += r.senses.filter(s => s.gloss.endsWith('…')).length
    if (r.senses.every(s => s.oq)) st.oqRows++
    if (r.seq) st.cardOk++; else st.unv++
    if (r.v?.length) { st.withPlaces++; st.placeHits += r.vn ?? r.v.length }
    if (r.all) st.allPlaces++
    if (r.old) st.old++
    if (r.wl) st.wordLevel++; else st.placeOnly++
  }
  return { rows, stats: st, cands }
}
/** SE rows of a recall-design article: `unv` unless it passed the card gates; a cross-reference is a headword with no gloss (`oq`) */
export function nanRows16(a: NanRow): [string, import('./se.ts').SeRow][] {
  return a.senses.map(s => [a.head, {
    d: NAN_DICT, g: s.gloss, ...(a.pos ? { p: a.pos } : {}), n: s.n, l: `т.${a.vol} с.${a.page}`, lb: [a.wl ? NAN_LABEL : NAN_PLACE, ...s.labels],
    ...(s.oq ? { oq: 1 as const } : {}), ...(!a.seq ? { unv: 1 as const } : {}), ...(a.v ? { v: a.v, vn: a.vn } : {}), ...(a.all ? { va: 1 as const } : {}),
  }])
}
