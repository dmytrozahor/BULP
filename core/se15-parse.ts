/**
 * SPEC 63 SE-15 — the two © dialect dictionaries from the owner-supplied scans (OCR on the worker, ops/worker/ocr-se15.sh). Pure (no node imports).
 *  - Онишкевич М. Й., «Словник бойківських говірок», ч. 1 А–Н, ч. 2 О–Я (Київ: Наукова думка, 1984): ONE column of typescript; entry = HEADWORD, authorial variants, /settlement codes + source/,
 *    'gloss' (the quote marks are lost by the OCR half of the time), «- illustration», «Ще:/Пор.» cross-references, ◊ phraseology. Settlements: the book's own list (ч. 1 pp. 23-27).
 *  - Сабадош І., «Словник закарпатської говірки села Сокирниця Хустського району» (Ужгород 2008): TWO columns (the page file is LEFT + «<<COL>>» + RIGHT), entry = HEADWORD [transcription], endings,
 *    POS (недок./док./а, е./с./ч./ж.), labels, numbered glosses, italic examples, «Див. ще», «Пор.». One locality: Сокирниця.
 * © policy (as SE-14, LB-11): the output keeps ONLY the headword (+ the headwords the same article names), POS, the register labels, the settlements, sense numbers, a gloss of ≤ 200 characters (word
 * boundary, «…») and the volume/page. The transcription, the illustrations, the phraseology and the proverbs are NEVER taken.
 * Recall design (SE-14 reached ≈ 25 %): an article is NOT dropped for a garbled gloss (the row keeps the headword with `oq`), and not for an off-spine headword (the row is kept for labelling an existing lemma with
 * `unv`; only `unv`-free rows may make dictionary-only cards).
 */
import { GLOSS_MAX, headwordOk, ocrScore } from './se-parse.ts'
import type { SeRow } from './se.ts'
import { clip } from './sum-import.ts'

export const ONY_DICT = 'onyshkevych', SAB_DICT = 'sabadosh', BUK_DICT = 'bukovyna', HUT_DICT = 'hutsul'
export const BUK_LABEL = 'букович.', BUK_PLACE = 'букович. (місце запису)', HUT_LABEL = 'гуцул.', HUT_PLACE = 'гуцул. (місце запису)'
export const ONY_LABEL = 'бойк.', ONY_PLACE = 'бойк. (місце запису)'
export const SAB_LABEL = 'закарп. (сокирниця)', SAB_PLACE = 'закарп. (сокирниця, місце запису)'
export const SAB_PLACE_NAME = 'Сокирниця Хустського р-ну'
export const ONY_SHORT = 'Онишкевич, Словник бойківських говірок (1984)', SAB_SHORT = 'Сабадош, Словник закарпатської говірки села Сокирниця (2008)'

export interface DialPage { text: string; no: number }
export interface DialSense { n: number; labels: string[]; gloss: string; oq?: 1 }
export interface DialRow {
  head: string
  /** the other headwords the same article names («ВИДЕРКАУФ і ВІДЕРКАУФ»): rows with the same senses */ extra?: string[]
  pos?: string; vol: number; page: number; senses: DialSense[]
  v?: string[]; vn?: number; all?: boolean
  /** the headword is no standard word (VESUM) → word-level label, else place only */ wl?: boolean
  /** a cross-reference article («див. X»): the row carries the pointer, no sense */ xref?: boolean
  /** passed the headword gates for NEW cards (strict form, alphabetical spine, enough evidence) */ seq?: boolean
  /** pieces of evidence for the headword: places, an authorial variant that matches, a clean gloss */ ev: number
}
export interface DialStats { pages: number; candidates: number; badHead: number; xref: number; noGloss: number; entries: number; senses: number; clipped: number; withPlaces: number; placeHits: number; seqDropped: number; weak: number; extraHeads: number; cardOk: number }
export const newDialStats = (): DialStats => ({ pages: 0, candidates: 0, badHead: 0, xref: 0, noGloss: 0, entries: 0, senses: 0, clipped: 0, withPlaces: 0, placeHits: 0, seqDropped: 0, weak: 0, extraHeads: 0, cardOk: 0 })
export const dialPassRate = (s: DialStats): number => (s.candidates ? Math.round((s.entries / s.candidates) * 1000) / 1000 : 0)

// ── small helpers ────────────────────────────────────────────────────────────────────────────────
const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const keyOf = (h: string): number[] => [...h.toLowerCase().normalize('NFC').replace(/ы/g, 'и').replace(/[́'’ʼ-]/g, '')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
const cmpKey = (a: number[], b: number[]): number => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }
export const lev = (a: string, b: string): number => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0]![j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length]![b.length]!
}
/** the spelling compared: no stress, apostrophes, hyphens, digits; й/и and ї/і folded (the OCR and the transliteration blur them) */
export const foldHead = (h: string): string => h.toLowerCase().normalize('NFC').replace(/[́'’ʼ`"\-\d]/g, '').replace(/й/g, 'и').replace(/ї/g, 'і').replace(/ь/g, '')
const QUOTES = String.raw`"'‘’“”«»` + '`´'
const trimQ = (s: string): string => s.replace(new RegExp(String.raw`^[\s${QUOTES}.,:;\-–—]+|[\s${QUOTES}.,:;\-–—]+$`, 'gu'), '')
/** strict headword for NEW cards: ≥ 3 letters, one script, a plausible word */
export const strictHead = (h: string): boolean => h.replace(/['\-]/g, '').length >= 3 && ocrScore(h.replace(/[-']/g, ' ')) >= 1 && !/[^а-яіїєґ'\-]/u.test(h) && !/ьть$|іь|ьь|[ьъ][аеєиіїоуюя]{2}$|^[ьъ]/.test(h) && headwordOk(h)
/** the longest non-decreasing subsequence of the headwords of a volume in page order = the verified spine */
export function markSpine(rows: DialRow[], st?: DialStats): void {
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
  rows.forEach((r, i) => { r.seq = spine.has(i) && strictHead(r.head) && r.ev >= 2; if (!r.seq && st) st.seqDropped++; else if (st) st.cardOk++ })
}
/** a gloss that is word-like enough to be shown (the OCR of the italics and of the quote marks leaves debris) */
export const dialGlossOk = (g: string): boolean => {
  const t = g.replace(/…$/, '')
  return t.length >= 3 && /\p{L}{3}/u.test(t) && ocrScore(t.replace(/\([^)]{0,40}\)/g, ' ').replace(/(?<![\p{L}])[А-ЯІЇЄҐ]{3,}(?![\p{L}])/gu, ' ')) >= 0.8 && !/[|\\{}<>_=~^]|[а-яіїєґ][А-ЯІЇЄҐ]|[А-ЯІЇЄҐ]{3,}[а-яіїєґ]|\d{2,}/u.test(t) && (t.match(/['"“”‘’«»`]/g) ?? []).length <= 2
}
const LABELS = ['орн.', 'ент.', 'анат.', 'бдж.', 'іст.', 'кушн.', 'вівч.', 'тк.', 'тесл.', 'мисл.', 'церк.', 'обр.', 'спец.', 'фам.', 'згруб.', 'арх.', 'риб.', 'бонд.', 'буд.', 'вет.', 'виш.', 'військ.', 'гонч.', 'ков.', 'крав.', 'міф.', 'шев.', 'стол.', 'техн.', 'текст.', 'заст.', 'фольк.', 'лайл.', 'жарт.', 'зневажл.', 'знев.', 'дит.', 'перен.', 'рідко', 'ірон.', 'пестл.', 'вульг.', 'кул.', 'діал.', 'розм.', 'груб.', 'мед.', 'бот.', 'зоол.', 'збірн.', 'зменш.', 'поет.', 'етн.', 'рел.', 'ім.', 'прикм.', 'присл.', 'виг.']
const LABEL_RE = new RegExp(String.raw`(?<![\p{L}])(${LABELS.map(l => l.replace('.', '\\.')).join('|')})(?=[\s,;:]|$)`, 'gu')
/** the registers printed before / inside the gloss (a closed list; never guessed) */
export const labelsIn = (s: string): string[] => [...new Set([...s.matchAll(LABEL_RE)].map(m => m[1]!).filter(l => !['ім.', 'прикм.', 'присл.', 'виг.'].includes(l)))].slice(0, 3)
const stripLabels = (s: string): string => s.replace(new RegExp(String.raw`^\s*(?:(?:${LABELS.map(l => l.replace('.', '\\.')).join('|')})[\s,;:]*)+`, 'u'), '')

// ═══ Онишкевич ═════════════════════════════════════════════════════════════════════════════════════
/** a settlement code of the book («Б-ля», «Дз-ч Г.», «М.В-ка»): the OCR confusions of the typescript folded so that the list and the entries meet */
export const codeKey = (c: string): string => c.normalize('NFC').toLowerCase().replace(/[\s.,"'’ʼ`]+/g, '').replace(/[–—−_]+/g, '-').replace(/-+/g, '-')
  .replace(/[xх]/g, 'х').replace(/[ao0]/g, 'о').replace(/[ял]/g, 'л').replace(/[iі1l!|ї]/g, 'і').replace(/[6б]/g, 'б').replace(/[bв8]/g, 'в').replace(/[нпц]/g, 'н').replace(/[ґгт]/g, 'г').replace(/[eе]/g, 'е').replace(/[ыи]/g, 'и').replace(/[pр]/g, 'р').replace(/[cс]/g, 'с')
/**
 * The list of the abbreviations of the settlements («Скорочення назв населених пунктів», ч. 1 pp. 23-27): lines «Б-ля - Бітля Турківського р-ну»; the OCR often damages the first letter of the code, so the
 * code is rebuilt on the first letter of the name; when the codes and the names came as two blocks (two-column break of the OCR) they are paired in order. → codeKey → the name as the book prints it (without the district).
 */
export function parseOnyPlaces(pages: string[]): Map<string, string> {
  const m = new Map<string, string>(), amb = new Set<string>()
  const put = (code: string, n: string): void => { const k = codeKey(code); if (!k) return; if (amb.has(k)) return; const o = m.get(k); if (o && o !== n) { m.delete(k); amb.add(k) } else m.set(k, n) }
  const clean = (n: string) => n.replace(/\s*\((?:п\.|АТП|в АТП)[^)]*\)?/gu, '').replace(/,?\s*н\.н\..*$/u, '').replace(/\s+(?:[А-ЯІЇЄҐ][а-яіїєґ']+(?:ого|ького|кого|ївського))\s+р-ну.*$/u, '').replace(/\s+(?:м\.|р-ну).*$/u, '').replace(/,.*$/, '').replace(/^м\.\s*/, '').replace(/[\s.,;]+$/, '').trim()
  for (const text of pages) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const codes: string[] = [], names: string[] = []
    for (const l of lines) {
      const a = /^(\S{1,6}(?:\s?[А-ЯІЇЄҐ]\.)?)\s*-\s+(.{3,})$/u.exec(l)
      if (a && !/^-/.test(l) && /р-ну|н\.н\.|\(п\.|ПНР|Зак\.|19\s*$|ІФ|АТ/u.test(a[2]!)) { const n = clean(a[2]!); if (n.length >= 3) put(a[1]!, n); continue }
      const b = /^-\s+(.{3,})$/u.exec(l); if (b) { names.push(clean(b[1]!)); continue }
      if (/^\S{1,8}(?:\s[А-ЯІЇЄҐ]\.)?$/u.test(l) && /[-.]/.test(l)) codes.push(l)
    }
    if (codes.length && codes.length === names.length) codes.forEach((c, i) => { if (names[i]!.length >= 3) put(c, names[i]!) })
  }
  return m
}

const NOT_HEAD = new Set(['ЛБ', 'ПНР', 'АТП', 'ІФ', 'РСР', 'ЕЗБ', 'КМ', 'ОХР', 'ВАГ', 'ГОЦ', 'МАТ', 'ЗН', 'ПАС', 'ЯВ', 'ЗАК', 'ЛЬВ', 'РЕД'])
const ONY_START = /^\s*[*°•+]?\s*([А-ЯІЇЄҐ][А-ЯІЇЄҐ'’ʼ"`\-]*[А-ЯІЇЄҐ]|[А-ЯІЇЄҐ])(?:\s*\d{1,2})?(?=[\s,.:;/(\[|]|$)/u
const headLike = (t: string): boolean => /[АЕЄИІЇОУЮЯ]/u.test(t) && !/^[ІХУПШЩVХЇ]{1,6}$/u.test(t) && !NOT_HEAD.has(t.replace(/['’"`-]/g, '')) && t.replace(/['’"`-]/g, '').length >= 2
interface RawEntry { text: string; page: number }
export function splitOnyEntries(pages: DialPage[], st?: DialStats): RawEntry[] {
  const out: RawEntry[] = []; let cur: RawEntry | undefined
  for (const p of pages) {
    if (st) st.pages++
    const lines = p.text.split('\n').map(l => l.replace(/\s+$/, ''))
    let blank = true
    for (const raw of lines) {
      const l = raw.trim()
      if (!l) { blank = true; continue }
      if (/^[\d\sІІїЇ.]{1,5}$/u.test(l) && l.length <= 4) { continue }   // the printed page number
      const m = ONY_START.exec(l)
      const isStart = !!m && headLike(m[1]!) && (blank || !cur || /[./;:)\]"'»’”,]$/.test(cur.text.trimEnd()))
      if (isStart) { if (cur) out.push(cur); cur = { text: l, page: p.no } }
      else if (cur) { const t = cur.text; cur.text = /[\p{L}]-$/u.test(t) && /^\p{Ll}/u.test(l) ? t.slice(0, -1) + l : t + ' ' + l }
      blank = false
    }
  }
  if (cur) out.push(cur)
  return out
}

/** a settlement group «/Б-ля, Х-в Км./»: starts at «/» (or «(» followed by a code), ends at the next «/» or «)»; a group the OCR left open ends at the first quote mark or after 100 characters */
function groupAt(s: string, from: number): { start: number; end: number; text: string } | undefined {
  for (let i = from; i < s.length; i++) {
    const c = s[i]!
    if (c !== '/' && c !== '(') continue
    const after = s.slice(i + 1, i + 12)
    if (c === '(' && !/^\s*[А-ЯІЇЄҐA-Z0-9]{1,2}[-.]/u.test(after) && !/^\s*(?:Км|Охр|Ваг|Гоц|Яв|Пас|Мат|ЛБ|ЕЗб)/u.test(after)) continue
    if (c === '/' && !/^\s*[А-ЯІЇЄҐA-Zа-яіїєґ0-9]/u.test(after)) continue
    const rest = s.slice(i + 1, i + 170), e = rest.search(/[/)]/)
    const q = rest.search(/\s[`'"‘’“”«»]\s?[а-яіїєґ]/u)
    let len = e >= 0 ? e + 1 : q >= 0 ? q : Math.min(100, rest.length)
    if (e < 0 && q < 0) len = Math.min(100, rest.length)
    return { start: i, end: i + 1 + len, text: rest.slice(0, e >= 0 ? e : len) }
  }
  return undefined
}
const SIGLA = /(?:Км|Охр|Ваг|Гоц|Яв|Пас|Мат|ЛБ|ЕЗб|Зн|Св|Куз|Гн|Врем|Зап|Зуб|Кб|Коб|Бандр|Панк|Цанк|Тн)\b\.?/u
/** the settlement codes of a group → the names the book's list gives (first-occurrence order, unique) */
function codesOf(g: string, places: Map<string, string>): { names: string[]; seen: number; all: boolean } {
  const names: string[] = []; let seen = 0
  const t = g.replace(/\bп\b|\(п\)|б\.н\.|[ЛL]Б\s*\d[\d,\s]*|(?:ЕЗб|Мат|Зн|Св|Гоц)\.?\s*[IVХУІПШЇ\d]+[\d,\s.–-]*/gu, ' ').replace(SIGLA, ' ')
  for (const part of t.split(/[,;]|\s{2,}/)) {
    const c = part.trim(); if (!c || c.length > 10) continue
    seen++
    const n = places.get(codeKey(c)); if (n && !names.includes(n)) names.push(n)
  }
  return { names, seen, all: /в\s+усіх|усі\s+н\.\s*пп/u.test(g) }
}
const GLOSS_CUT = /\s[-–—]\s|[.:]\s*[-–—]\s|\s[0ОФ◊♦]\s+(?=[а-яіїєґ])|\s(?:Ще|Пор|Див|див|т\.\s?с|Ред)[.:]/u
const SENSE_NUM = /(?:^|[\s;,])([1-9ІI])\s*[.,]\s*(?=[^\s\d])/gu
function numbered(s: string): { n: number; text: string }[] {
  const hits: { n: number; idx: number; len: number }[] = []
  let want = 1
  for (const m of s.matchAll(SENSE_NUM)) { if ((m[1] === 'І' || m[1] === 'I' ? 1 : Number(m[1])) === want) { hits.push({ n: want, idx: m.index!, len: m[0].length }); want++ } }
  if (!hits.length) return [{ n: 0, text: s }]
  return hits.map((h, i) => ({ n: h.n, text: s.slice(h.idx + h.len, hits[i + 1]?.idx ?? s.length) }))
}
/** the gloss at the start of a segment (variants and places already removed): up to the illustration / cross-reference / phraseology, quote marks and debris trimmed, clipped at a word boundary */
function glossOfSegment(seg: string): { gloss: string; labels: string[] } {
  const labels = labelsIn(seg.slice(0, 80))
  let s = stripLabels(seg.replace(/^[\s,;:.]+/, ''))
  const c = GLOSS_CUT.exec(s); if (c) s = s.slice(0, c.index)
  s = s.split(/;\s/)[0]!
  s = trimQ(s.replace(/^[\s,.;:]*\d\s*[.,]\s*/, ''))
  s = s.replace(/\s+/g, ' ').replace(/\s*[`'"‘’“”«»]\s*/g, m => (m.trim() ? ' ' : ' ')).replace(/\s+/g, ' ').trim()
  s = s.replace(/,\s*$/, '')
  return { gloss: s ? clip(s, GLOSS_MAX) : '', labels }
}

export function parseOnyshkevych(pages: DialPage[], vol: number, places: Map<string, string>, known: (h: string) => boolean = () => false): { rows: DialRow[]; stats: DialStats; cands: Set<string> } {
  const st = newDialStats(), rows: DialRow[] = [], cands = new Set<string>()
  for (const e of splitOnyEntries(pages, st)) {
    st.candidates++
    const m = ONY_START.exec(e.text)!
    const head = m[1]!.replace(/["`ʼ’]/g, "'").toLowerCase()
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(head) || head.length < 2) { st.badHead++; continue }
    let rest = e.text.slice(m[0].length)
    const extra: string[] = []
    for (let k = 0; k < 3; k++) { const x = /^[\s,]*(?:і|й|та)\s+([А-ЯІЇЄҐ'’ʼ"-]{2,})(?![а-яіїєґ])/u.exec(rest); if (!x) break; const h2 = x[1]!.replace(/["`ʼ’]/g, "'").toLowerCase(); if (/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(h2)) extra.push(h2); rest = rest.slice(x[0].length) }
    // cross-reference: «див. X», «т. с. що X»
    const g0 = groupAt(rest, 0)
    const afterVariants = (g0 ? rest.slice(0, g0.start) : rest)
    const variantTok = afterVariants.replace(/^[\s,:.]+/, '').split(/[\s,;]/)[0] ?? ''
    // groups, in order; the text outside them is the running text of the article
    const groups: { start: number; end: number; text: string }[] = []
    for (let at = 0; ;) { const g = groupAt(rest, at); if (!g) break; groups.push(g); at = g.end }
    let flat = '', last = 0
    for (const g of groups) { flat += rest.slice(last, g.start) + '\u0001'; last = g.end }
    flat += rest.slice(last)
    const xr = /^[^"'‘’“”«»`]{0,140}?(?:^|[\s.,])(?:див|Див|т\.\s?с)[.,]/u.exec(flat.replace(/\u0001/g, ' ').replace(/^[^а-яіїєґА-ЯІЇЄҐ]+/u, ''))
    const placesAll = groups.map(g => codesOf(g.text, places))
    const names = [...new Set(placesAll.flatMap(p => p.names))]
    const all = placesAll.some(p => p.all)
    const firstG = flat.indexOf('\u0001')
    // sense segments: the numbered senses of the text after the variants
    const afterHead = firstG >= 0 && firstG < (flat.search(/(?:^|[\s;,])1\s*[.,]\s*[^\s\d]/u) >= 0 ? flat.search(/(?:^|[\s;,])1\s*[.,]\s*[^\s\d]/u) : 1e9) ? flat.slice(firstG + 1) : flat
    const variantsText = firstG >= 0 && afterHead !== flat ? flat.slice(0, firstG) : flat.split(/(?:^|[\s;,])1\s*[.,]\s*[^\s\d]/u)[0]!
    const senses: DialSense[] = []
    if (!xr) {
      for (const s of numbered(afterHead.replace(/\u0001/g, ' ')).slice(0, 8)) {
        const { gloss, labels } = glossOfSegment(s.text.replace(/^[\s,;:.'"‘’“”«»`]+/, ''))
        if (!gloss) continue
        const ok = dialGlossOk(gloss)
        senses.push(ok ? { n: Math.max(s.n, 1), labels, gloss } : { n: Math.max(s.n, 1), labels, gloss: '', oq: 1 })
      }
    }
    // variant corroboration: an authorial variant (lower-case word before the first group) that is the headword with the transcription's blur
    const vs = variantsText.split(/[\s,;()]+/).filter(w => /^[а-яіїєґ'’ʼ"`\-]{3,}$/u.test(w))
    const matchV = vs.some(v => lev(foldHead(v), foldHead(head)) <= Math.max(1, Math.floor(head.length / 4)))
    const ev = (groups.length ? 1 : 0) + (matchV || (variantTok === "" && groups.length > 0) ? 1 : 0) + (senses.some(x => x.gloss) || !!xr ? 1 : 0)
    if (!senses.length && !xr) { st.noGloss++; senses.push({ n: 1, labels: [], gloss: '', oq: 1 }) }
    const row: DialRow = { head, vol, page: e.page, senses: xr ? [{ n: 1, labels: [], gloss: ('див. ' + (flat.slice(flat.search(/див|т\.\s?с/u)).replace(/^\S+\s*/, '').replace(/\u0001/g, '').split(/[.;]/)[0] ?? '').trim()).slice(0, 80) }] : senses, ...(xr ? { xref: true } : {}), ...(extra.length ? { extra } : {}), ev, ...(names.length ? { v: names.slice(0, 3), vn: names.length } : {}), ...(all ? { all: true } : {}), wl: !known(head) }
    if (xr) st.xref++
    cands.add(head); extra.forEach(x => cands.add(x))
    rows.push(row)
  }
  markSpine(rows, st)
  for (const r of rows) {
    st.entries++; st.senses += r.senses.length; st.clipped += r.senses.filter(s => s.gloss.endsWith('…')).length; st.extraHeads += r.extra?.length ?? 0
    if (r.v?.length) { st.withPlaces++; st.placeHits += r.vn ?? r.v.length }
    if (r.ev < 2) st.weak++
  }
  return { rows, stats: st, cands }
}

// ═══ two-column dictionaries with CAPITAL headwords: Сабадош, Словник буковинських говірок ═══════════════
const COL_START = /^\s*([А-ЯІЇЄҐ][А-ЯІЇЄҐ'’ʼ`"\-]{1,}[А-ЯІЇЄҐ'’]|[А-ЯІЇЄҐ]{2})(?![а-яіїєґ])/u
const ABBR_BEFORE = /^(?:ін|т|д|п|напр|ч|ж|с|мн|док|недок|рр|див|пор|ст|н|е|тощо|зв|сп|прикм|присл|тис|р|зб|ім)$/u
/** the first sentence of a text: up to «. » + capital where the full stop does not end an abbreviation («та ін.», «Заст.») */
export function firstSentence(s: string): string {
  for (const m of s.matchAll(/[.!?]\s+(?=[А-ЯІЇЄҐA-Z"“«'(])/gu)) {
    const before = s.slice(0, m.index!)
    if (m[0][0] === '.' && ABBR_BEFORE.test((before.replace(/\s+$/, '').split(/\s+/).pop() ?? '').toLowerCase())) continue
    return before
  }
  return s.replace(/[.\s]+$/, '')
}
export interface CapsCfg {
  dict: string
  /** the places a sense names: the district abbreviations of the book, or none */ places?: (text: string) => { names: string[]; all: boolean }
  /** a fixed place for the whole book (one locality) */ fixed?: string
  /** a running head line at the top of a column («БРА», «39 БРО») */ runningHead: RegExp
  /** settlement codes in parentheses («(Бв., Клв.)»): removed from the text before the header is read; the codes go to `codeNames` */ codeGroups?: (text: string) => { text: string; codes: string[] }
  codeNames?: (codes: string[]) => string[]
  /** the OCR of the book's letter «ы» reads «ьй», «ьі», «ьїй»: the headword is repaired before it is tested */ fixHead?: (h: string) => string
}
function splitCapsEntries(pages: DialPage[], cfg: CapsCfg, st?: DialStats): RawEntry[] {
  const out: RawEntry[] = []
  for (const p of pages) {
    if (st) st.pages++
    for (const col of p.text.split(/\n?<<COL>>\n?/)) {
      let cur: RawEntry | undefined, blank = true, first = true
      const lines = col.split('\n').map(l => l.trim())
      for (let i = 0; i < lines.length; i++) {
        let l = lines[i]!
        if (!l) { blank = true; continue }
        if (first) { first = false; if (cfg.runningHead.test(l)) continue }
        if (/^\d{1,3}$/.test(l)) continue
        while (/[А-ЯІЇЄҐ]-$/u.test(l) && /^[А-ЯІЇЄҐ]{2}/u.test(lines[i + 1] ?? '')) { l = l.slice(0, -1) + lines[i + 1]!; i++ }   // «ЗА-» + «КОПАЧИТИ»
        const m = COL_START.exec(l)
        const isStart = !!m && headLike(m[1]!) && (blank || !cur || /[.!?:)\]»”"]$/.test(cur.text.trimEnd()))
        if (isStart) { if (cur) out.push(cur); cur = { text: l, page: p.no } }
        else if (cur) { const t = cur.text; cur.text = /[\p{L}]-$/u.test(t) && /^\p{Ll}/u.test(l) ? t.slice(0, -1) + l : t + ' ' + l }
        blank = false
      }
      if (cur) out.push(cur)
    }
  }
  return out
}
const isCaps = (t: string): boolean => /^[А-ЯІЇЄҐ][А-ЯІЇЄҐ'’ʼ`"\-]*[А-ЯІЇЄҐ'’]?[,.;:]*$/u.test(t) && /[А-ЯІЇЄҐ]{2}/u.test(t)
/** header block (headwords, endings, grammar, labels) → the rest of the article; the headwords found; the first Capitalized word or a sense number starts the gloss */
function splitHeader(text: string): { head: string[]; rest: string; hdr: string } {
  const toks = text.split(/\s+/), heads: string[] = []
  let i = 0
  for (; i < toks.length; i++) {
    const t = toks[i]!
    if (isCaps(t)) { const pv = (toks[i - 1] ?? '').toLowerCase(); if (i > 0 && ['до', 'від', 'що', 'див.', 'пор.', 'зм.', 'жін.'].includes(pv)) break; heads.push(t.replace(/[,.;:]+$/, '')); continue }
    if (/^[\[{]/.test(t)) { while (i < toks.length && !/[\]}][,.;]*$/.test(toks[i]!)) i++; continue }   // [transcription]
    if (/^[1-9ІI][.,]$/u.test(t) && i > 0) break
    if (/^[ІЇ]\p{Ll}{0,7}[,;]$/u.test(t) && i > 0) continue   // the OCR of a stress mark before a verb ending: «Ічу, ічиш,»
    if (/^[("«]?\p{Lu}\p{Ll}/u.test(t) && !/^\([а-яіїєґ]/u.test(t)) break
    if (/^[\p{Ll}\-'’ʼ(),.;:!?/|¦]+$/u.test(t) || /^\(.*\)[,.;]*$/u.test(t) || /^-[\p{L}'’]*[,.;]*$/u.test(t) || /^\(.{0,24}$|^.{0,24}\)[,.;]*$/u.test(t)) continue
    break
  }
  return { head: heads, rest: toks.slice(i).join(' '), hdr: toks.slice(0, i).join(' ') }
}
export function parseCaps(pages: DialPage[], cfg: CapsCfg, vol = 1, known: (h: string) => boolean = () => false): { rows: DialRow[]; stats: DialStats; cands: Set<string> } {
  const st = newDialStats(), rows: DialRow[] = [], cands = new Set<string>()
  const norm = (x: string) => { const y = x.replace(/["`ʼ’]/g, "'").toLowerCase().replace(/[,.;:]+$/, ''); return cfg.fixHead ? cfg.fixHead(y) : y }
  const WORD = /^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u
  for (const e of splitCapsEntries(pages, cfg, st)) {
    st.candidates++
    let flat = e.text.replace(/\s+/g, ' '), codes: string[] = []
    if (cfg.codeGroups) { const cg = cfg.codeGroups(flat); flat = cg.text; codes = cg.codes }
    const { head: hs, rest, hdr } = splitHeader(flat)
    const heads = [...new Set(hs.map(norm))].filter(h => WORD.test(h) && !NOT_HEAD.has(h.toUpperCase()) && h.length >= 2)
    if (!heads.length) { st.badHead++; continue }
    for (const x of flat.matchAll(/(?:Док|Недок)\.\s+([А-ЯІЇЄҐ][А-ЯІЇЄҐ'’ʼ-]{2,})(?![а-яіїєґ])/gu)) { const h2 = norm(x[1]!); if (WORD.test(h2) && !heads.includes(h2)) heads.push(h2) }
    const head = heads[0]!, extra = heads.slice(1, 6)
    const xr = /^(?:[а-яіїєґ'’ʼ.\s,]{0,20})?(?:див|Див)\.\s/u.test(rest) || (!rest && /(?:^|\s)(?:див|Див)\.\s/u.test(flat))
    const senses: DialSense[] = []
    let all = false; const placeNames: string[] = []
    if (!xr) {
      for (const s of numbered(rest).slice(0, 8)) {
        const t = s.text.replace(/^\s+/, '')
        const labels = [...new Set([...(s.n <= 1 ? labelsIn(hdr) : []), ...labelsIn(t.slice(0, 40))])].slice(0, 4), body = stripLabels(t)
        const dcut = /[,.;]?\s*(?<![\p{L}])(?:Заг|Заст|Кіцм|Вижн|Стор|Глиб|Нов|Хот|Кельм|Сок)\.(?=[\s,;)]|$)/u.exec(body)
        let g = firstSentence(cfg.places && dcut ? body.slice(0, dcut.index) : body)
        g = g.replace(/\s+(?:Див|Пор)\.\s.*$/u, '').replace(/^[^\p{L}(«]+/u, '').replace(/[\s,;:]+$/, '')
        if (cfg.places) { const pl = cfg.places(t); for (const n of pl.names) if (!placeNames.includes(n)) placeNames.push(n); if (pl.all) all = true }
        if (!g) continue
        const gl = clip(g, GLOSS_MAX), ok = dialGlossOk(gl)
        senses.push(ok ? { n: Math.max(s.n, 1), labels, gloss: gl } : { n: Math.max(s.n, 1), labels, gloss: '', oq: 1 })
      }
    }
    const names = cfg.fixed ? [cfg.fixed] : cfg.codeNames ? cfg.codeNames(codes) : placeNames
    const ev = 1 + (hs.length > 1 || /^[\[{]|,\s*-/.test(flat.slice(head.length, head.length + 40)) ? 1 : 0) + (senses.some(x => x.gloss) || xr ? 1 : 0)
    if (!senses.length && !xr) { st.noGloss++; senses.push({ n: 1, labels: [], gloss: '', oq: 1 }) }
    const refT = xr ? (flat.replace(/^.*?(?:див|Див)\.\s*(?:ще\s+)?/u, '').split(/[.;]/)[0] ?? '').trim() : ''
    const row: DialRow = { head, vol, page: e.page, senses: xr ? [{ n: 1, labels: [], gloss: ('див. ' + refT).slice(0, 80) }] : senses, ...(xr ? { xref: true } : {}), ...(extra.length ? { extra } : {}), ev, ...(names.length ? { v: names.slice(0, 3), vn: names.length } : {}), ...(all ? { all: true } : {}), wl: !known(head) }
    if (xr) st.xref++
    cands.add(head); extra.forEach(x => cands.add(x))
    rows.push(row)
  }
  markSpine(rows, st)
  for (const r of rows) { st.entries++; st.senses += r.senses.length; st.clipped += r.senses.filter(s => s.gloss.endsWith('…')).length; st.extraHeads += r.extra?.length ?? 0; if (r.v?.length) { st.withPlaces++; st.placeHits += r.vn ?? r.v.length } if (r.ev < 2) st.weak++ }
  return { rows, stats: st, cands }
}
/** Сабадош writes the vowel «ы» (ЗАКЛАДЕНЫЙ): the OCR reads it as «ь» + «і»/«ї»/«й» */
export const sabFixHead = (h: string): string => h.replace(/ь[іїи]й/g, 'ый').replace(/ьй/g, 'ый').replace(/ь[іїи]/g, 'ы')
export const SAB_CFG: CapsCfg = { dict: SAB_DICT, fixed: SAB_PLACE_NAME, fixHead: sabFixHead, runningHead: /^[А-ЯІЇЄҐ'’]{2,}(?:\s+\d{1,3}\s+[А-ЯІЇЄҐ'’]{2,})?$/u }
export const parseSabadosh = (pages: DialPage[], known?: (h: string) => boolean) => parseCaps(pages, SAB_CFG, 1, known)
/** the districts the Словник буковинських говірок names after a gloss («Заст., Кіцм., Стор.»); «Заг.» = known in all the surveyed speech */
export const BUK_DISTRICTS: Record<string, string> = { Вижн: 'Вижницький р-н', Глиб: 'Глибоцький р-н', Заст: 'Заставнівський р-н', Кельм: 'Кельменецький р-н', Кіцм: 'Кіцманський р-н', Нов: 'Новоселицький р-н', Сок: 'Сокирянський р-н', Стор: 'Сторожинецький р-н', Хот: 'Хотинський р-н' }
export function bukPlaces(text: string): { names: string[]; all: boolean } {
  const names: string[] = []
  for (const m of text.matchAll(/(?<![\p{L}])(Вижн|Глиб|Заст|Кельм|Кіцм|Нов|Сок|Стор|Хот)\.(?=[\s,;)]|$)/gu)) { const n = BUK_DISTRICTS[m[1]!]!; if (!names.includes(n)) names.push(n) }
  return { names, all: /(?<![\p{L}])Заг\.(?=[\s,;]|$)/u.test(text) }
}
export const BUK_CFG: CapsCfg = { dict: BUK_DICT, places: bukPlaces, runningHead: /^(?:\d{1,3}\s+)?[А-ЯІЇЄҐ'’]{2,5}(?:\s+\d{1,3})?\.?$|^[А-ЯІЇЄҐ'’]{2,5}\s+[ІI1]\.?$/u }
export const parseBukovyna = (pages: DialPage[], known?: (h: string) => boolean) => parseCaps(pages, BUK_CFG, 1, known)

// ═══ Гуцульські говірки. Короткий словник: lower-case bold headwords, two columns ════════════════════════
const HUT_WORD = /^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u
/** the abbreviations the book prints between the headword and the gloss (list «Перелік умовних скорочень», pp. 15-16): grammar, register, field of knowledge */
const HUT_ABBR = new Set(['зб', 'одн', 'мн', 'перев', 'невідм', 'тільки', 'зневажл', 'перен', 'зоол', 'бот', 'ч', 'ж', 'с', 'заст', 'рідк', 'ріодк', 'виг', 'присл', 'прикм', 'дієсл', 'недок', 'док', 'ірон', 'вульг', 'лайл', 'жарт', 'нар', 'спол', 'част', 'прийм', 'займ', 'числ', 'зменш', 'пестл', 'анат', 'астр', 'буд', 'мед', 'міф', 'ткац', 'стол', 'етн', 'нім', 'угор', 'рум', 'пол', 'безос', 'вигук', 'орн', 'ент', 'ков', 'мист', 'церк', 'рел', 'кул', 'мисл', 'геол', 'геогр', 'тех', 'техн', 'вівч', 'бджіл', 'сільськ', 'ряд', 'спец', 'зменш', 'збільш', 'фам', 'ім'])
const hutAbbr = (t: string): boolean => /^[а-яіїєґ]{1,8}\.[,;]?$/u.test(t) && HUT_ABBR.has(t.replace(/[.,;]+$/, ''))
/** header → the extra headwords («абазь // абирь виг. …», «дєтіль (дятьол), -тла // довбач, -а / жонва …») and the body (the numbered senses); the grammar and the labels are consumed, the endings too */
function hutHeader(rest: string): { extra: string[]; body: string; marked: boolean } {
  const toks = rest.split(/\s+/).filter(Boolean), extra: string[] = []
  let i = 0, marked = false
  const skipVar = () => { if (toks[i]?.startsWith('(')) { let j = i; while (j < toks.length && !/\)[,;.]*$/.test(toks[j]!)) j++; if (j - i <= 5) { i = j + 1; marked = true } } }
  const skipEnd = () => { for (;;) { const t = toks[i]; if (t && /^,?-[^\s]{0,6}[,;]?$/u.test(t) || t === ',') { i++; marked = true; continue } if (t && hutAbbr(t)) { i++; continue } if (t === '(Latin)') break; break } }
  const lat = () => { if (/^\(\p{Lu}/u.test(toks[i] ?? '') && /[a-zA-Z]|\p{Lu}[а-яіїєґ]/u.test(toks[i]!) && !hutAbbr(toks[i]!)) { let j = i; while (j < toks.length && !/\)[,;.]*$/.test(toks[j]!)) j++; if (j - i <= 5) i = j + 1 } }
  skipVar(); skipEnd(); lat(); skipEnd()
  for (let guard = 0; guard < 6 && (toks[i] === '//' || toks[i] === '/' || toks[i] === '/ /'); guard++) {
    const w = (toks[i + 1] ?? '').replace(/[,;]+$/, '').replace(/["`ʼ’]/g, "'")
    if (!HUT_WORD.test(w)) break
    extra.push(w); i += 2; marked = true
    skipVar(); skipEnd(); lat(); skipEnd()
  }
  return { extra, body: toks.slice(i).join(' '), marked }
}
export function parseHutsul(pages: DialPage[], known: (h: string) => boolean = () => false): { rows: DialRow[]; stats: DialStats; cands: Set<string> } {
  const st = newDialStats(), rows: DialRow[] = [], cands = new Set<string>()
  const blocks: RawEntry[] = []
  for (const p of pages) {
    st.pages++
    for (const col of p.text.split(/\n?<<COL>>\n?/)) {
      let cur: string[] = []
      const flush = () => { if (cur.length) blocks.push({ text: cur.join(' ').replace(/\s+/g, ' ').replace(/(\p{L})- (?=\p{Ll})/gu, '$1'), page: p.no }); cur = [] }
      for (const raw of col.split('\n')) { const l = raw.trim(); if (!l) { flush(); continue } if (/^\d{1,3}$/.test(l)) continue; cur.push(l) }
      flush()
    }
  }
  for (const b of blocks) {
    st.candidates++
    const m = /^([а-яіїєґ][а-яіїєґ'’ʼ`"\-]*)(?=[\s,(.]|$)/u.exec(b.text)
    if (!m) { st.badHead++; continue }
    const head = m[1]!.replace(/["`ʼ’]/g, "'")
    if (!HUT_WORD.test(head) || head.length < 2) { st.badHead++; continue }
    const rest = b.text.slice(m[0].length).replace(/^\s*[,.]\s*/, ' ')
    const h = hutHeader(rest), extra = h.extra.filter(x => x !== head)
    const xr = /^(?:перен\.\s*мн\.\s*)?(?:див\.|т\.\s?зв\.)\s/u.test(h.body)
    const senses: DialSense[] = []
    if (!xr) {
      for (const s of numbered(h.body).slice(0, 8)) {
        const labels = labelsIn(s.text.slice(0, 40)), t = stripLabels(s.text.trim())
        let g = t.split(/\s:|:\s?[А-ЯІЇЄҐA-Z]|\s\([А-ЯІЇЄҐ][а-яіїєґ]{1,3}\)/u)[0]!.replace(/;\s*$/, '').split(/\s\/\/?\s/)[0]!.replace(/^[\s,;.]+|[\s,;:]+$/g, '')
        g = g.split(/\s(?=\(\p{Lu}[a-zA-Z]{3,})/u)[0]!.split(/;\s*(?:пор|лор)\./u)[0]!.replace(/[\s;,]+$/, '')
        if (!g) continue
        const gl = clip(g, GLOSS_MAX), ok = dialGlossOk(gl)
        senses.push(ok ? { n: Math.max(s.n, 1), labels, gloss: gl } : { n: Math.max(s.n, 1), labels, gloss: '', oq: 1 })
      }
    }
    const ev = 1 + (h.marked ? 1 : 0) + (senses.some(x => x.gloss) || xr ? 1 : 0)
    if (!senses.length && !xr) { st.noGloss++; senses.push({ n: 1, labels: [], gloss: '', oq: 1 }) }
    const refT = xr ? (h.body.replace(/^.*?(?:див\.|т\.\s?зв\.)\s*/u, '').split(/[.;:]/)[0] ?? '').trim() : ''
    rows.push({ head, vol: 1, page: b.page, senses: xr ? [{ n: 1, labels: [], gloss: ('див. ' + refT).slice(0, 80) }] : senses, ...(xr ? { xref: true } : {}), ...(extra.length ? { extra: extra.slice(0, 5) } : {}), ev, wl: !known(head) })
    if (xr) st.xref++
    cands.add(head); extra.forEach(x => cands.add(x))
  }
  markSpine(rows, st)
  for (const r of rows) { st.entries++; st.senses += r.senses.length; st.clipped += r.senses.filter(s => s.gloss.endsWith('…')).length; st.extraHeads += r.extra?.length ?? 0; if (r.ev < 2) st.weak++ }
  return { rows, stats: st, cands }
}

// ═══ Лисенко, Словник поліських говорів: single column, CAPITAL headwords, settlement codes in parentheses ═══
export const POL_DICT = 'lysenko'
export const POL_LABEL = 'полісс.', POL_PLACE = 'полісс. (місце запису)'
const CODE_TOK = /^(?:[А-ЯІЇЄҐ][а-яіїєґ]{0,5}\.?(?:-[А-ЯІЇЄҐ][а-яіїєґ]?\.?)?|[А-ЯІЇЄҐ]\.[А-ЯІЇЄҐ][а-яіїєґ]?\.?|[А-ЯІЇЄҐ]\.)$/u
/** «(Бв., Клв., Кшв.)» → the codes; the groups are removed from the text. A parenthesis with a lower-case word («(див.)», «(на межі двох сіл)») is no code group. */
export function stripCodeGroups(text: string): { text: string; codes: string[] } {
  const codes: string[] = []
  const t = text.replace(/\(\s*([^()]{1,110}?)\s*\)/gu, (all, inner: string) => {
    const toks = inner.split(/\s*[,;]\s*/).filter(Boolean)
    if (toks.length && toks.every(x => CODE_TOK.test(x.trim()))) { for (const x of toks) codes.push(x.trim()); return ' ' }
    return all
  })
  return { text: t.replace(/\s+/g, ' ').trim(), codes }
}
/** the book's list of the settlements and regions («Бв. — Бовуни Ратнівського р-ну»): code → the name as printed (district dropped) */
export function parsePolPlaces(front: string[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const text of front) for (const raw of text.split('\n')) {
    const l = raw.trim()
    const a = /^([А-ЯІЇЄҐ][а-яіїєґ]{0,5}\.?(?:-[А-ЯІЇЄҐ][а-яіїєґ]?\.?)?|[А-ЯІЇЄҐ]\.[А-ЯІЇЄҐ][а-яіїєґ]?\.?)\s*[-–—=]+\s+(.{3,80})$/u.exec(l)
    if (!a) continue
    const name = a[2]!.replace(/\s*\(.*$/, '').replace(/,.*$/, '').replace(/\s+(?:р-н|р-ну|район|обл|області).*$/u, '').replace(/[^\p{L}\s'’-]+$/u, '').trim()
    if (name.length >= 3) m.set(codeKey(a[1]!), name)
  }
  return m
}
export function parsePolissia(pages: DialPage[], places: Map<string, string>, known?: (h: string) => boolean) {
  const cfg: CapsCfg = {
    dict: POL_DICT, runningHead: /^\x00$/,
    codeGroups: stripCodeGroups,
    codeNames: codes => { const names: string[] = []; for (const c of codes) { const n = places.get(codeKey(c)); if (n && !names.includes(n)) names.push(n) } return names },
  }
  return parseCaps(pages, cfg, 1, known)
}

// ═══ rows ══════════════════════════════════════════════════════════════════════════════════════════
const MARK: Record<string, { word: string; place: string; loc: (r: DialRow) => string }> = {
  [ONY_DICT]: { word: ONY_LABEL, place: ONY_PLACE, loc: r => `ч.${r.vol} с.${r.page}` },
  [SAB_DICT]: { word: SAB_LABEL, place: SAB_PLACE, loc: r => `с.${r.page}` },
  [BUK_DICT]: { word: BUK_LABEL, place: BUK_PLACE, loc: r => `с.${r.page}` },
  [HUT_DICT]: { word: HUT_LABEL, place: HUT_PLACE, loc: r => `с.${r.page}` },
  [POL_DICT]: { word: POL_LABEL, place: POL_PLACE, loc: r => `с.${r.page}` },
}
/** parsed articles → SE rows [headword, row]; a headword that is a standard word (VESUM) only records the PLACE, unless the dictionary itself labels the sense «діал.» */
export function dialRows(dict: string, a: DialRow): [string, SeRow][] {
  const mk = MARK[dict]!, out: [string, SeRow][] = []
  for (const head of [a.head, ...(a.extra ?? [])]) {
    const unv = !(a.seq && (head === a.head || strictHead(head)))
    for (const s of a.senses) {
      const word = a.wl || s.labels.includes('діал.')
      out.push([head, {
        d: dict, g: s.gloss, ...(a.pos ? { p: a.pos } : {}), n: s.n, l: mk.loc(a), lb: [word ? mk.word : mk.place, ...s.labels],
        ...(s.oq ? { oq: 1 as const } : {}), ...(unv ? { unv: 1 as const } : {}), ...(a.v ? { v: a.v, vn: a.vn } : {}), ...(a.all ? { va: 1 as const } : {}),
      }])
    }
  }
  return out
}
