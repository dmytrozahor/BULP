/**
 * SPEC 63 SE-14 — parser for the «Етимологічний словник української мови» (ЕСУМ, Київ: Наукова думка, т. 1 1982, т. 2 1985, т. 3 1989, т. 4 2003, т. 5 2006, т. 6 2012; owner-supplied scans, Tesseract
 * `ukr+rus+lat+grc+deu` on the worker). Pure (no node imports).
 * © policy (as for СУМ, GG-7, and research/47): the output keeps ONLY the headword, the volume/page and ONE excerpt of at most 200 characters (word boundary, «…») that starts at the etymological statement
 * («запозичення з польської мови; …», «псл. *…», «утворене від …») and so holds the language / source-form chain; the cognate lists, the bibliography, the glosses of foreign forms beyond the excerpt and
 * the article text are NEVER stored. The OCR text itself stays on the worker / local disk (never git, never CDN).
 *
 * Layout: two columns; the running head (the first and the last headword of the page) is the first two lines of the page text, the page number the last line. An article is
 * `headword[, derived words] «gloss» [dialect sigla]; — cognates; — the statement; — literature. — Пор. … — Див. ще …` and the next article follows after the full stop. A dialect headword is bracketed `[драйка]`
 * (the OCR prints «Ідрагіль», «|драйка|»). The OCR reads Latin / Greek forms badly, so the article is only used when its headword is on the alphabetical spine of the volume, inside the page's running-head range,
 * and the excerpt is word-like (the Cyrillic part passes the OCR score, almost no stray symbols).
 */
import { headwordOk, ocrScore, wordish } from './se-parse.ts'
import { inPageRange } from './sum-article.ts'

export const ESUM_MAX = 200
export const ESUM_VOLS: Record<number, { title: string; letters: string; year: number }> = {
  1: { title: 'А–Г', letters: 'А–Г', year: 1982 }, 2: { title: 'Д–Копці', letters: 'Д–Копці', year: 1985 }, 3: { title: 'Кора–М', letters: 'Кора–М', year: 1989 },
  4: { title: 'Н–П', letters: 'Н–П', year: 2003 }, 5: { title: 'Р–Т', letters: 'Р–Т', year: 2006 }, 6: { title: 'У–Я', letters: 'У–Я', year: 2012 },
}
export interface EsumPage { text: string; idx: number }
export interface EsumStats {
  pages: number; bodyPages: number; candidates: number; badHead: number; outOfRange: number; noStatement: number; badExcerpt: number; seqDropped: number; duplicates: number; boundaries?: number
  entries: number; clipped: number; withBorrowing: number; withProto: number
}
export const newEsumStats = (): EsumStats => ({ pages: 0, bodyPages: 0, candidates: 0, badHead: 0, outOfRange: 0, noStatement: 0, badExcerpt: 0, seqDropped: 0, duplicates: 0, entries: 0, clipped: 0, withBorrowing: 0, withProto: 0 })
/** passed / candidates that had a gloss (an article head found by the pattern) */
export const esumPassRate = (s: EsumStats): number => (s.candidates ? Math.round((s.entries / s.candidates) * 1000) / 1000 : 0)

const LATIN_LIKE: Record<string, string> = { a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', i: 'і', k: 'к', m: 'м', t: 'т', B: 'В', H: 'Н', T: 'Т', K: 'К', M: 'М', A: 'А', E: 'Е', O: 'О', P: 'Р', C: 'С', X: 'Х', I: 'І' }
/** Latin look-alikes inside a word that has Cyrillic letters are Cyrillic («p. драть», «сlова») */
export const fixScript = (s: string): string => s.replace(/[\p{L}'’]+/gu, w => (/[а-яіїєґА-ЯІЇЄҐ]/u.test(w) && /[A-Za-z]/.test(w) ? w.replace(/[A-Za-z]/g, c => LATIN_LIKE[c] ?? c) : w))

// ── page text ─────────────────────────────────────────────────────────────────────────────────────────
const HEADTOK = /^[\[|]?([а-яіїєґ][а-яіїєґ'’ʼ-]{1,})[0-9¹²³]?[\]|]?[.,:;]?$/u
export interface PageHead { lo: string; hi: string; body: string; no?: number }
/** the running head (the first two lines are single lowercase words), the printed page number (the last line) and the body; undefined = not a dictionary page */
export function pageHead(text: string): PageHead | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 6) return undefined
  const a = HEADTOK.exec(lines[0]!), b = HEADTOK.exec(lines[1]!)
  if (!a || !b) return undefined
  let end = lines.length, no: number | undefined
  const last = /^\[?(\d{1,4})\]?$/.exec(lines[lines.length - 1]!); if (last) { no = Number(last[1]); end-- }
  return { lo: a[1]!, hi: b[1]!, body: lines.slice(2, end).join('\n'), ...(no !== undefined ? { no } : {}) }
}
/** the page number is the scan index minus a constant per volume: the median of (index − printed number) over the pages whose last line is a plain number */
export function pageOffset(pages: EsumPage[]): number {
  const d: number[] = []
  for (const p of pages) { const h = pageHead(p.text); if (h?.no !== undefined && Math.abs(p.idx - h.no) < 80) d.push(p.idx - h.no) }
  if (!d.length) return 0
  d.sort((a, b) => a - b); return d[Math.floor(d.length / 2)]!
}

// ── articles ──────────────────────────────────────────────────────────────────────────────────────────
const LANG_ABBR = /(?:^|[\s(—–;,])(?:р|рос|бр|п|пол|ч|чес|слц|слн|болг|м|макед|схв|стсл|псл|дінд|гр|лат|лит|лтс|нім|двн|снн|гот|англ|фр|ісп|іт|тур|ар|перс|рум|алб|вірм|дфр|дісл|гол|нн|ст|ав|д|ін|ц|др|слц|слн|стпол|стч|вл|нл|полаб|шв|дан|норв|фін|угор|тат|монг|євр|ак|ц|тс|пор|див|ще|зб|напр|н|в|з|ж|ш|с)$/u
/** an article: headword (bracketed for a dialect word), derived words, then the gloss in «» */
const ART = /(?:^|(?<=[.!?\]»)]\s)|(?<=[.]—\s)|(?<=[.]\n))([\[|ІЇГl(]?[а-яіїєґ][а-яіїєґ'’ʼ-]{1,}[0-9¹²³]?[\]|\\]?)((?:,?\s*[\[|]?[а-яіїєґ][а-яіїєґ'’ʼ-]{1,}[0-9¹²³]?[\]|]?(?:\s+[ЖЛЯДМАБВГТСОН]{1,3}(?![а-яіїєґ]))?){0,6})(?:\s*\([^()]{1,18}\))?\s*;?\s*(«[^»]{1,170}»)/gu

export interface EsumArticle { head: string; derived: string[]; gloss: string; bracket: boolean; body: string; page: number; lo: string; hi: string }
/** the headword of the article as a lemma: no bracket, no homonym digit */
const headOf = (raw: string): { head: string; bracket: boolean } => {
  const lead = /^[\[|ІЇГl(]/u.test(raw) && !/^[а-яіїєґ]/u.test(raw)
  return { head: (lead ? raw.slice(1) : raw).replace(/[\]|\\0-9¹²³]+$/u, '').replace(/[’ʼ]/g, "'"), bracket: lead }
}

/** one volume: the stream of the body texts of its pages (a tail of an article continues over the page break) → articles with the page of their start */
export function splitEsum(pages: EsumPage[], off: number, st: EsumStats): EsumArticle[] {
  let stream = '', marks: { at: number; page: number; lo: string; hi: string }[] = []
  for (const p of pages) {
    st.pages++
    const h = pageHead(p.text); if (!h) continue
    st.bodyPages++
    marks.push({ at: stream.length, page: p.idx - off, lo: h.lo, hi: h.hi })
    stream += repairText(h.body.replace(/([\p{L}])[-­]\n(?=[\p{Ll}])/gu, '$1').replace(/\n/g, ' ')) + '\n'
  }
  const pageAt = (pos: number) => { let m = marks[0]!; for (const x of marks) if (x.at <= pos) m = x; else break; return m }
  // boundaries: a match that is no cognate (not after a language abbreviation), has a plausible headword and lies inside the running-head range of its page
  const out: EsumArticle[] = [], all = [...stream.matchAll(ART)]
  const hits = all.filter(m => {
    const pre = stream.slice(Math.max(0, m.index! - 14), m.index!).replace(/\s+$/, '')
    if (LANG_ABBR.test(pre)) return false   // «р. драть «чистити»»: a cognate after a language abbreviation, not an article
    const { head } = headOf(m[1]!), pg = pageAt(m.index!)
    return /^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(head) && inPageRange(head, pg.lo, pg.hi)
  })
  st.boundaries = (st.boundaries ?? 0) + hits.length
  hits.forEach((m, i) => {
    const { head, bracket } = headOf(m[1]!)
    const pg = pageAt(m.index!), endAt = hits[i + 1]?.index ?? stream.length
    const bodyStart = m.index! + m[0].length
    const derived = (m[2] ?? '').split(/[,\s]+/).filter(w => /^[\[|]?[а-яіїєґ]/u.test(w)).map(w => w.replace(/^[\[|]|[\]|0-9¹²³]+$/gu, ''))
    out.push({ head, derived, gloss: m[3]!, bracket, body: stream.slice(bodyStart, Math.max(bodyStart, endAt)), page: pg.page, lo: pg.lo, hi: pg.hi })
  })
  return out
}

// ── the statement ─────────────────────────────────────────────────────────────────────────────────────
const STRONG = /(?:^|[;:—–.]\s*|-{1,2}\s*)(запозичен|запозичуван|п[сe][лп]\.|прасл|праслов|результат|утворен|утвор|звуконаслід|ономатоп|суфікс|префікс|складн|походить|калька|скорочен|видозміна|експресивн|зближен|похідн|успадкован|перенесен|спільнослов|дав\.-?\s?рус|друс\.)/iu
const WEAK = /(?:^|[;:—–.]\s*|-{1,2}\s*)(споріднен|пов['’]яз|неясн|очевидно|можливо|стсл\.)/iu
/** SE-16: an article with no strong / weak marker has its statement after the cognate list: «; — від лат. …», «; — походять від …», «; — назва, засвоєна з …» */
const FALLBACK = /(?:;\s*[—–-]{1,2}\s*)(від\s|походять|походить|назва|засвоєн|слово\s|виведен|виник|вживан|з\s+[а-яіїєґ]+(?:ськ|цьк|зьк)[а-яіїєґ]*\s+(?:мов|діал)|через\s)/iu
/** where the literature begins: «— Фасмер І 534;», «— ЭСРЯ …», «— Пор. …», «— Див. ще …» */
const BIBL = /(?:\s|(?<=[.»)]))(?:[—–]|-{1,2})\s*(?:(?:Пор|Див|Зіст)\.|[A-ZА-ЯІЇЄҐ0-9][\p{L}.\-?²]*[\s,]+(?:[IVXІ]+|\d)\b|[A-ZА-ЯІЇЄҐ0-9][\p{L}.\-?²]{1,12}\s+[A-ZА-ЯІЇЄҐ])/u
/** the abbreviations of the languages the OCR reads as Latin look-alikes: «rp.» for «гр.», «p.» for «р.» */
const LANG_FIX: [RegExp, string][] = [[/(?<![\p{L}])rp\./gu, 'гр.'], [/(?<![\p{L}])p\./gu, 'р.'], [/(?<![\p{L}])n\./gu, 'п.'], [/(?<![\p{L}])cr\./gu, 'ст.'], [/(?<![\p{L}])bp\./gu, 'бр.'], [/(?<![\p{L}])[НHΗ]\./gu, 'н.'], [/(?<![\p{L}])ykp\./gu, 'укр.'], [/(?<![\p{L}])[чЧ]\./gu, 'ч.'], [/(?<![\p{L}])[MМ]\./gu, 'м.']]
/** a digit that stands for the preposition «з» between Cyrillic words («запозичення 3 польської мови») */
const DIGIT_Z = /(?<=[а-яіїєґ,]\s)[38](?=\s+[а-яіїєґ])/gu
/** a token the OCR has mangled: mixed scripts, a letter-digit mix, an inner capital, five consonants in a row, a Latin token with a stray accent */
export const badToken = (w: string): boolean => {
  const t = w.replace(/^[«»"'(\[*]+|[»"')\].,;:!?]+$/g, '')
  if (t.length < 3) return false
  if (/[а-яіїєґА-ЯІЇЄҐ]/u.test(t) && /[A-Za-zͰ-Ͽ]/u.test(t)) return true
  if (/\p{L}\d|\d\p{L}/u.test(t)) return true
  if (/[\p{Ll}][\p{Lu}]/u.test(t)) return true
  if (/[^aeiouyäöüéèáàíóúąęłńśźżěčšřžáéíóúýAEIOUY\d\W]{6,}/i.test(t) && /^[A-Za-z]+$/.test(t)) return true
  if (/[A-Za-z][^\x00-\x7Fа-яіїєґА-ЯІЇЄҐͰ-Ͽἀ-῿ʼ’'ʹäöüßéèçëñłąęśźżćńóšžčřěáíúýôâêîûāēīōūãõ¹²³]/u.test(t)) return true
  return false
}
/** the OCR repairs applied to the page text before the articles are cut: Latin look-alikes in Cyrillic words, language abbreviations, the digit for «з» */
export function repairText(t: string): string {
  let b = fixScript(t)
  for (const [re, to] of LANG_FIX) b = b.replace(re, to)
  return b.replace(DIGIT_Z, 'з')
}
export interface Statement { t: string; kind: 'bor' | 'proto' | 'other'; cut?: boolean }
/**
 * the excerpt of an article body: from the etymological statement on (the strong markers first: «запозичення», «псл.», «утворене», «результат»; the weak ones only when no strong marker exists), without the literature,
 * ≤ 200 characters, «…» at a word boundary. The language / source-form chain is kept as far as the OCR reads it: the excerpt stops before the first mangled token.
 */
export function statementOf(body: string, max = ESUM_MAX, fallback = false): Statement | undefined {
  const b = repairText(body.replace(/\s+/g, ' ').trim())
  const m = STRONG.exec(b) ?? WEAK.exec(b) ?? (fallback ? FALLBACK.exec(b) : null); if (!m) return undefined
  let at = m.index + m[0].length - m[1]!.length
  const pre = /(?:очевидно|можливо|мабуть),?\s*$/iu.exec(b.slice(Math.max(0, at - 14), at)); if (pre) at -= pre[0].length
  let s = b.slice(at)
  const bib = BIBL.exec(s); if (bib) s = s.slice(0, bib.index)
  s = s.replace(/\s+/g, ' ').replace(/[\s;,—–-]+$/, '').trim()
  // a mangled token (mixed scripts, letter-digit mix, an impossible consonant run: the reconstructed Proto-Slavic forms and the Greek are usually such) is replaced by «[…]», never guessed
  const toks = s.split(' ').filter(t => !/^d{3}$/.test(t)), outT: string[] = []; let bad = 0   // a stray page number inside the text
  for (const t of toks) { if (badToken(t)) { bad++; if (outT[outT.length - 1] !== '[…]') outT.push('[…]') } else outT.push(t) }
  const cut = bad > 0
  if (bad / toks.length > 0.35) return undefined
  s = outT.join(' ').replace(/(\[…\])(?:[\s,;:]+\[…\])+/g, '$1')
  if (s.length < 25 || (s.match(/[а-яіїєґ]{3,}/gu)?.length ?? 0) < 3) return undefined
  const kind = /^(?:очевидно,|можливо,)?\s*запозич/iu.test(s) ? 'bor' : /^п[сe][лп]\./iu.test(s) || /^прасл/iu.test(s) ? 'proto' : 'other'
  if (s.length > max) { const cutAt = s.slice(0, max - 1), sp = cutAt.lastIndexOf(' '); s = (sp > max * 0.6 ? cutAt.slice(0, sp) : cutAt).replace(/[\s,;:—–(-]+$/, '') + '…' }
  return { t: s, kind, ...(cut ? { cut } : {}) }
}
/** the excerpt reads as text: its Cyrillic words pass the OCR score and almost no stray symbols are left */
export function excerptClean(t: string): boolean {
  const cy = (t.match(/[а-яіїєґА-ЯІЇЄҐ'’-]{3,}/gu) ?? []).join(' ')
  if (!cy || (cy.match(/\p{L}+/gu)?.length ?? 0) < 3) return false
  const junk = (t.match(/[|£§¢¥©®°^~=<>{}\\@#$%]/g) ?? []).length
  // debris: one- and two-letter tokens that are no preposition / abbreviation («пси а пл nn пб п»)
  const SHORT = new Set(['з', 'в', 'у', 'і', 'й', 'а', 'о', 'та', 'до', 'на', 'не', 'як', 'чи', 'по', 'за', 'од', 'зі', 'із', 'ще', 'же', 'ті', 'це', 'то', 'що', 'ж', 'ні', 'ми', 'ви', 'я'])
  const words = t.replace(/\[…\]/g, ' ').split(/[\s,;:()«»]+/).filter(Boolean)
  const shortBad = words.filter(w => /^\p{L}{1,2}$/u.test(w) && !SHORT.has(w.toLowerCase())).length
  return ocrScore(cy) >= 0.9 && junk === 0 && shortBad / Math.max(1, words.length) <= 0.12
}

// ── rows ──────────────────────────────────────────────────────────────────────────────────────────────
export interface EsumRow { head: string; vol: number; page: number; t: string; kind: Statement['kind']; seq?: boolean; n?: number }
/** a lowercase Cyrillic word of 3+ letters that OCR has not mangled */
export const strictEsumHead = (h: string): boolean => h.replace(/['\-]/g, '').length >= 3 && ocrScore(h.replace(/[-']/g, ' ')) >= 1 && !/[^а-яіїєґ'\-]/u.test(h) && !/ьть$|іь|ьь/.test(h)

const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const keyOf = (h: string): number[] => [...h.toLowerCase().normalize('NFC').replace(/[́'’ʼ-]/g, '')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
const cmpKey = (a: number[], b: number[]): number => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }
/** the longest non-decreasing subsequence of the headwords of a volume (page order) is the verified spine; others get `seq = false` */
export function markEsumSequence(rows: EsumRow[], st?: EsumStats): void {
  const ks = rows.map(r => keyOf(r.head)), n = rows.length, tails: number[] = [], prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpKey(ks[tails[mid]!]!, ks[i]!) <= 0) lo = mid + 1; else hi = mid }
    if (lo > 0) prev[i] = tails[lo - 1]!
    tails[lo] = i
  }
  const spine = new Set<number>()
  for (let i = tails[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) spine.add(i)
  rows.forEach((r, i) => { r.seq = spine.has(i); if (!r.seq && st) st.seqDropped++ })
}

/** the rows of one volume */
export function parseEsum(pages: EsumPage[], vol: number): { rows: EsumRow[]; stats: EsumStats } {
  const st = newEsumStats(), off = pageOffset(pages), rows: EsumRow[] = []
  for (const a of splitEsum(pages, off, st)) {
    st.candidates++
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(a.head) || !headwordOk(a.head) || a.bracket) { st.badHead++; continue }   // a bracketed (dialect) headword has no standard card to attach to
    if (!inPageRange(a.head, a.lo, a.hi)) { st.outOfRange++; continue }
    const s = statementOf(a.body)
    if (!s) { st.noStatement++; continue }
    if (!excerptClean(s.t)) { st.badExcerpt++; continue }
    rows.push({ head: a.head, vol, page: a.page, t: s.t, kind: s.kind })
  }
  markEsumSequence(rows, st)
  const seen = new Map<string, number>()
  const kept = rows.filter(r => r.seq && strictEsumHead(r.head)).filter(r => { const n = (seen.get(r.head) ?? 0) + 1; seen.set(r.head, n); if (n > 1) { st.duplicates++; return false } return true })
  for (const r of kept) { st.entries++; if (r.t.endsWith('…')) st.clipped++; if (r.kind === 'bor') st.withBorrowing++; if (r.kind === 'proto') st.withProto++ }
  return { rows: kept, stats: st }
}

// ═══ SE-16: column-aware pages, paragraph articles, graded rows ═══════════════════════════════════════════
/**
 * SPEC 63 SE-16. SE-14 kept ≈ 12 % of the ЕСУМ: the two-column page was read line by line (about a third of the pages), an article was cut only where `headword «gloss»` followed a full stop, and an article without a
 * clear etymological statement or with a garbled excerpt was dropped. Now the pages are the column-aware re-OCR (`ops/worker/ocr-se16.mjs`: head L, head R, blank line, left column, blank line, right column, printed
 * number), an article = a paragraph that starts with a lowercase headword after a paragraph that ended with a full stop / bracket / quote, inside the running-head range of its page; and every confirmed headword yields a row:
 *   grade `a` = a clean excerpt from the etymological statement; `b` = an excerpt with parts the OCR mangled shown as «[…]», or from a weak marker only («споріднене», «очевидно»), or cut back to its clean prefix;
 *   `c` = a page pointer only («ЕСУМ, т. N, с. M»), which is true and useful by itself. The wrong-lemma risk stays low: the headword must be in the page's running-head range, on the volume's alphabetical spine
 *   and strict; a bracketed (dialect) headword makes no row. © policy as SE-14: headword, volume, page and ≤ 200 characters at a word boundary; nothing else is stored.
 */
export type EsumGrade = 'a' | 'b' | 'c'
export interface Esum16Page { lo?: string; hi?: string; body: string; no?: number }
const HEAD16 = /^[\[|(]?([а-яіїєґ][а-яіїєґ'’ʼ-]{1,})[0-9¹²³]?[\]|)]?[.,:;]?$/u
/** the page of the column-aware OCR: two running-head lines (either may be empty), a body, the printed number as the last line when read */
export function pageHead16(text: string): Esum16Page | undefined {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines.length < 8) return undefined
  const h = (s: string | undefined): string | undefined => { const t = fixScript((s ?? '').trim().toLowerCase()); const m = HEAD16.exec(t); return m ? m[1]!.replace(/[’ʼ]/g, "'") : undefined }
  const lo = h(lines[0]), hi = h(lines[1])
  let end = lines.length; while (end > 2 && !lines[end - 1]!.trim()) end--
  let no: number | undefined
  const last = /^\s*\[?(\d{1,4})\]?\s*$/.exec(lines[end - 1] ?? ''); if (last) { no = Number(last[1]); end-- }
  const body = lines.slice(2, end).join('\n')
  if (body.replace(/\s/g, '').length < 200) return undefined
  return { ...(lo ? { lo } : {}), ...(hi ? { hi } : {}), body, ...(no !== undefined ? { no } : {}) }
}
export function pageOffset16(pages: EsumPage[]): number {
  const d: number[] = []
  for (const p of pages) { const h = pageHead16(p.text); if (h?.no !== undefined && Math.abs(p.idx - h.no) < 80) d.push(p.idx - h.no) }
  if (!d.length) return 0
  d.sort((a, b) => a - b); return d[Math.floor(d.length / 2)]!
}
export interface Esum16Article { head: string; bracket: boolean; body: string; page: number; lo?: string; hi?: string; gloss: boolean }
/** a paragraph starts an article: [bracket] lowercase word, then «,» «;» «(» ««» a bracket, a dash or a blank */
const START16 = /^([\[|(ІЇl]?)([а-яіїєґ][а-яіїєґ'’ʼ-]{2,})[0-9¹²³]?[\]|]?(?=\s*[,;«(\[|—–-]|\s)/u
/** an article that follows a «— Див. ще X.» / «— Пор. X.» line inside the same paragraph (the OCR lost the blank line) */
const MID = /(?<=(?:Пор|Див|Зіст)\.[^.]{1,70}\.)\s+(?=[\[|]?[а-яіїєґ]{3,}[0-9¹²³]?[\]|]?\s*(?:[,;«(]|\s[(«]))/u
/** the last line of an article is a pointer («— Див. ще жити, об, оба,»): the OCR often loses its full stop */
const REF_END = /(?:Див|Пор|Зіст)\.?\s*(?:ще|me)?\s+[^.«»]{0,70}[,\s.—–-]*$/u
const TERM_END = /[.»)\]!?]["'”’]?\s*$/u
export interface Esum16Stats { pages: number; bodyPages: number; paragraphs: number; starts: number; notStart: number; badHead: number; bracketed: number; outOfRange: number; noSignal: number; offSpine: number; seqDropped: number; duplicates: number; entries: number; a: number; b: number; c: number; clipped: number; withBorrowing: number; withProto: number }
export const newEsum16Stats = (): Esum16Stats => ({ pages: 0, bodyPages: 0, paragraphs: 0, starts: 0, notStart: 0, badHead: 0, bracketed: 0, outOfRange: 0, noSignal: 0, offSpine: 0, seqDropped: 0, duplicates: 0, entries: 0, a: 0, b: 0, c: 0, clipped: 0, withBorrowing: 0, withProto: 0 })
/** an article has the shape of the book: a gloss in «», a «; —» section break, a literature line or a language chain */
const SIGNAL = /«[^»]{1,170}»|;\s*[—–-]{1,2}\s|[—–]\s*(?:Фасмер|Преобр|Шанский|Brückner|Bern|Mikl|Machek|Пор\.|Див\.)|\b(?:р|бр|п|ч|болг|схв|псл|гр|лат|нім)\.\s/u
export function splitEsum16(pages: EsumPage[], off: number, st: Esum16Stats): Esum16Article[] {
  const out: Esum16Article[] = []
  let cur: Esum16Article | undefined, prevTerm = true
  for (const p of pages) {
    st.pages++
    const h = pageHead16(p.text); if (!h) continue
    st.bodyPages++
    const paras = h.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
    const pieces = paras.flatMap(raw => repairText(raw.replace(/([\p{L}])[-­]\n(?=[\p{Ll}])/gu, '$1').replace(/\n/g, ' ').replace(/\s+/g, ' ')).split(MID))
    for (const t of pieces) {
      st.paragraphs++
      const m = START16.exec(t)
      const joined = !!cur && /[\p{L}][-­]$/u.test(cur.body) && /^\p{Ll}/u.test(t)   // a blank line inside an article after a hyphen at a line end: the halves of a word
      if (m && (prevTerm || !cur) && !joined) {
        st.starts++
        cur = { head: m[2]!.replace(/[’ʼ]/g, "'"), bracket: /^[\[|]/.test(m[1]!), body: t.slice(m[0].length), page: p.idx - off, ...(h.lo ? { lo: h.lo } : {}), ...(h.hi ? { hi: h.hi } : {}), gloss: /^\s*[,;]?\s*(?:\([^()]{1,18}\)\s*)?«/u.test(t.slice(m[0].length)) }
        out.push(cur)
      } else if (cur) { cur.body = joined ? cur.body.slice(0, -1) + t : cur.body + ' ' + t; if (m) st.notStart++ }   // a blank line inside an article is a continuation
      prevTerm = TERM_END.test(t) || REF_END.test(t)
    }
  }
  return out
}
/** a token of an excerpt the OCR has probably mangled (a Cyrillic non-word, a Latin token with no vowel / a long consonant run, a digit-letter mix, a stray number) */
export function suspiciousToken(w: string): boolean {
  const t = w.replace(/^[«»"'(\[*„“]+|[»"')\].,;:!?…]+$/gu, '')
  if (/^\d{1,2}$/.test(t)) return true   // a stray digit between words («посередництво 8 …»)
  if (t.length < 3) return false
  if (t === '[…]') return false
  if (/\d/.test(t)) return !/^\d{3,4}$/.test(t)   // a year is fine, «8.539» is not
  return t.split(/[-–]/).filter(p => p.length >= 3).some(p => {
    if (/^[а-яіїєґА-ЯІЇЄҐ'’ʼ]+$/u.test(p)) return !wordish(p)
    if (/^[A-Za-zäöüßéèêëáàâíìîóòôúùûýçñłąęśźżćńšžčřěůÄÖÜ'’*-]+$/u.test(p)) {
      const q = p.replace(/^\*/, '').toLowerCase()
      if (q.length < 3) return false
      if (q.length >= 12) return true   // «fhnanmvyarnunt»: a foreign form this long is nearly always debris
      const v = (q.match(/[aeiouyäöüéèêëáàâíìîóòôúùûýąęěů]/g) ?? []).length
      return v === 0 || /[^aeiouyäöüéèêëáàâíìîóòôúùûýąęěů]{5,}/.test(q) || (q.length >= 5 && v / q.length < 0.2)
    }
    return false   // Greek and the like: not judged
  })
}
/** the excerpt tidied: a lone suspicious token becomes «[…]», a run of them (2 in a window of 4) cuts the excerpt before it with «…»; a lone «3» before «[…]» is «з» */
export function tidyExcerpt(t: string): { t: string; changed: boolean } | undefined {
  const toks = t.replace(/(?<=[а-яіїєґ,])\s3(?=\s+\[…\])/gu, ' з').split(' ').filter(Boolean), out: string[] = []
  let changed = false
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i]!
    if ((w === '3' || w === '8') && /^(?:запозичен\S*|утворен\S*|виведен\S*|походить|пов'язан\S*|споріднен\S*|зближен\S*|виник\S*)$/u.test(out[out.length - 1] ?? '') && i + 1 < toks.length && suspiciousToken(toks[i + 1]!) && !suspiciousToken(toks[i + 2] ?? '')) { out.push('з'); changed = true; continue }   // the OCR of the preposition «з» before a mangled form
    if (suspiciousToken(w)) {
      if (toks.slice(i + 1, i + 4).some(suspiciousToken)) {
        const s = out.join(' ').replace(/[\s,;:—–(\[-]+$/u, '')
        if (s.length < 25) return undefined
        return { t: s + '…', changed: true }
      }
      if (out[out.length - 1] !== '[…]') out.push('[…]')
      changed = true
    } else out.push(w)
  }
  const s = out.join(' ').replace(/(?<=[а-яіїєґ,]) [38] (?=[…])/gu, ' з ')
  if (s.length < 25 || (s.match(/[а-яіїєґ]{3,}/gu)?.length ?? 0) < 3) return undefined
  return { t: s, changed: changed || s !== t }
}
/** the excerpt of an article with its grade; a statement the OCR garbled is cut back to its longest clean prefix, else the row is a pointer only */
export function gradeExcerpt(body: string): { t: string; kind: Statement['kind']; grade: 'a' | 'b' } | undefined {
  // an article whose own start the OCR lost (a garbled headword) is appended to the previous one: only the text before the first literature line belongs to this article
  const lit = BIBL.exec(body), own = lit && lit.index > 60 ? body.slice(0, lit.index) : body
  const s = statementOf(own, ESUM_MAX, true); if (!s) return undefined
  const flat = body.replace(/\s+/g, ' '), weak = !STRONG.test(flat) && WEAK.test(flat)
  let t = s.t
  if (!excerptClean(t)) {   // cut at the last «;» / «,» that leaves a clean prefix of at least 25 characters
    let found: string | undefined
    for (let i = t.length - 1; i >= 25; i--) if (/[;,]/.test(t[i]!) && excerptClean(t.slice(0, i))) { found = t.slice(0, i) + '…'; break }
    if (!found) return undefined
    t = found
  }
  const td = tidyExcerpt(t); if (!td) return undefined
  t = td.t
  return { t: t.length > ESUM_MAX ? t.slice(0, ESUM_MAX - 1).replace(/\s+\S*$/, '') + '…' : t, kind: s.kind, grade: s.cut || td.changed || weak || t !== s.t ? 'b' : 'a' }
}
export interface Esum16Row { head: string; vol: number; page: number; grade: EsumGrade; t?: string; kind?: Statement['kind']; seq?: boolean; n?: number }
export function parseEsum16(pages: EsumPage[], vol: number): { rows: Esum16Row[]; stats: Esum16Stats } {
  const st = newEsum16Stats(), off = pageOffset16(pages), rows: Esum16Row[] = []
  for (const a of splitEsum16(pages, off, st)) {
    if (a.bracket) { st.bracketed++; continue }
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(a.head) || !headwordOk(a.head) || !strictEsumHead(a.head)) { st.badHead++; continue }
    if (!inPageRange(a.head, a.lo, a.hi)) { st.outOfRange++; continue }
    const ex = gradeExcerpt(a.body)
    if (!ex && !a.gloss && !SIGNAL.test(a.body.slice(0, 500))) { st.noSignal++; continue }
    rows.push(ex ? { head: a.head, vol, page: a.page, grade: ex.grade, t: ex.t, kind: ex.kind } : { head: a.head, vol, page: a.page, grade: 'c' })
  }
  const probe = rows as unknown as EsumRow[], sp = { seqDropped: 0 } as EsumStats
  markEsumSequence(probe, sp); st.seqDropped = sp.seqDropped
  const seen = new Map<string, Esum16Row>(), kept: Esum16Row[] = []
  for (const r of rows) {
    if (!r.seq) { st.offSpine++; continue }
    const prev = seen.get(r.head)
    if (prev) { prev.n = (prev.n ?? 1) + 1; st.duplicates++; if (prev.grade === 'c' && r.grade !== 'c') Object.assign(prev, { grade: r.grade, t: r.t, kind: r.kind, page: r.page }); continue }
    seen.set(r.head, r); kept.push(r)
  }
  for (const r of kept) { st.entries++; st[r.grade]++; if (r.t?.endsWith('…')) st.clipped++; if (r.kind === 'bor') st.withBorrowing++; if (r.kind === 'proto') st.withProto++ }
  return { rows: kept, stats: st }
}
