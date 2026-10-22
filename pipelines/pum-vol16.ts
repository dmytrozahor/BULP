/**
 * SPEC 63 RF-11: «Волинські грамоти XVI ст.» (упорядники В. Б. Задорожний, А. М. Матвієнко; НАН України, Інститут української мови, Інститут української археографії; К.: Наукова думка, 1995; Пам'ятки української мови)
 * — legal acts out of the books of the Volodymyr land court (ЦДІАК, ф. 27, оп. 1, од. зб. 1 and 3: acts entered 1567–1577, the earliest document of 1540s–1560s). The owner's scan has no text layer; the OCR is Tesseract 5 (ukr+rus).
 * Pure functions: the OCR pages → one entry per numbered charter («14. Дарчий запис …»), its two dates as the edition states them («Акт від 12 січня 1570», «Випис з книг гродських від 18 квітня 1565»), the text.
 * The edition's own apparatus (preface, notes on the books, index of names, glossary, table of contents) lies outside the charter pages and is never read. The text of a charter carries no editorial prose between the heading and the next
 * heading; only running heads, folio marks («144 зв.») and the signature line are removed, and the editor's brackets are cleaned (core of pipelines/pum-ed.ts cleanText).
 */
import { digits } from './pum-ed.ts'

export interface Vol16Charter { n: number; title: string; dates: { kind: 'act' | 'extract'; text: string; year: number }[]; date: [number, number]; text: string; scan: number; page: number; skippedWhy?: string }
const FOLIO = /^\s*\d{1,3}\s*(?:зв\.?|об\.?)?\s*$/i
const SIGNATURE = /^\s*\d{1,2}\*?\s+\d{2}-\d{3,4}\s+\d{1,3}\s*$|^\s*\d{1,2}\*\s+\d{1,3}\s*$|^\s*\d{1,3}\s+\d{2}-\d{3,4}\s*$/
const HEAD = /^\s*(\S{1,4})[.,]\s+([«„"“‚]?\p{Lu}.+)$/u
const MONTHS = 'січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня'
const DATE_RE = new RegExp(String.raw`(\d{1,2}\s+(?:${MONTHS})\s+)?([1І]\s?[5Ѕ]\s?\d\s?\d|\d{4})`, 'iu')

/** «Акт від 12 січня 1570, № 50,1.» / «Випис з книг гродських від 18 квітня 1565.» → the stated dates */
export function parseDates(block: string[]): { kind: 'act' | 'extract'; text: string; year: number }[] {
  const out: { kind: 'act' | 'extract'; text: string; year: number }[] = []
  for (const l of block) {
    const kind = /^\s*Акт(?=\s|$)/u.test(l) ? 'act' : /^\s*Випис(?=\s|$)/u.test(l) || /^\s*Витяг(?=\s|$)/u.test(l) ? 'extract' : null
    if (!kind) continue
    const m = digits(l.replace(/(?<=\d)\s+(?=\d)/g, '')).match(new RegExp(String.raw`від\s+((?:\d{1,2}\s+(?:${MONTHS})\s+)?(\d{4}))`, 'iu')) ?? digits(l).match(new RegExp(String.raw`((?:\d{1,2}\s+(?:${MONTHS})\s+)?(1[3-6]\d\d))`, 'iu'))
    if (m && +m[2]! >= 1450 && +m[2]! <= 1600) out.push({ kind, text: m[1]!.trim(), year: +m[2]! })
  }
  return out
}

/** the editor's brackets and the OCR of the superscript marks: «то(г)[0]» → «того», «Ф(т)» → «от» (omega read as Ф ® @ & ©), line numbers and glued footnote digits dropped */
export function cleanVol16(t: string): string {
  return t.replace(/\[\s*[0OОо]\s*\]/g, 'о').replace(/[Ф®@&©#]\(/g, 'о(').replace(/\[\s*[!?]\s*\]|\(\s*!\s*\)|\{[^}]*\}|\[\.{2,}\]|[ЇІ]\.\.\.[ЇІ]/g, ' ').replace(/\/\/\s*/g, ' ')
    .replace(/(¬|-)[ \t]*\n[ \t]*/g, '').replace(/(?<=\p{L})\d{1,3}(?=\s|[.,;:]|$)/gu, '').replace(/[()[\]{}|\\«»„“”]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
}

/** pages (scan number, OCR text) of the CHARTER part only → the charters in order. Headings must run 1, 2, 3 …: a line «N. Title» with another number is text. `pageOffset`: printed page = scan page − offset. */
/** letters only, lower case, the first 30: the key for matching a body heading with the contents */
const key = (t: string) => t.toLowerCase().replace(/[^а-яіїєґ]/g, '').slice(0, 30)
/** longest-common-subsequence ratio of two keys (OCR garbles single letters, so an exact match would miss most headings) */
export function sim(a: string, b: string): number {
  const A = key(a), B = key(b); if (!A || !B) return 0
  const dp = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0))
  for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++) dp[i]![j] = A[i - 1] === B[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
  return dp[A.length]![B.length]! / Math.max(A.length, B.length)
}
/** `titles`: the titles of the contents; each heading is then searched in order by its title (a heading whose «Акт …» block the OCR lost is still found). Without it a heading is a line «N. Title» with an «Акт»/«Випис» line below. */
export function parseVol16(pages: { n: number; text: string }[], pageOffset = 1, titles?: string[]): Vol16Charter[] {
  const lines: { l: string; scan: number }[] = []
  for (const p of [...pages].sort((a, b) => a.n - b.n)) for (const l of p.text.split('\n')) if (!FOLIO.test(l) && !SIGNATURE.test(l)) lines.push({ l, scan: p.n })
  const out: Vol16Charter[] = []; let cur = 0
  const heads: { i: number; n: number }[] = []
  // a heading: «N. Title» after a blank line with the «Акт …» / «Випис …» block within the next 5 lines; the OCR misreads the digit of N (3 → 8, 5 → 6 …), so the charters are numbered in order and the printed number is only checked
  if (titles) {
    let from = 0
    titles.forEach((t, k) => {
      for (let i = from; i < lines.length; i++) { const m = lines[i]!.l.match(HEAD); if (m && sim(m[2]!, t) >= 0.7) { heads.push({ i, n: k + 1 }); from = i + 1; return } }
    })
    // a title the OCR (or the contents' OCR) spoiled: look for it between its found neighbours, by the first 14 letters, then by the «Акт»/«Випис» block under a heading line
    const found = new Map(heads.map(h => [h.n, h.i])), pass2: { i: number; n: number }[] = []
    titles.forEach((t, k) => {
      if (found.has(k + 1)) return
      let a = k; while (a >= 1 && !found.has(a)) a--
      let b = k + 2; while (b <= titles.length && !found.has(b)) b++
      const lo = a >= 1 ? found.get(a)! + 1 : 0, hi = b <= titles.length ? found.get(b)! : lines.length
      const taken = new Set([...found.values(), ...pass2.map(x => x.i)])
      const cand = (f: (i: number, m: RegExpMatchArray) => boolean) => { for (let i = lo; i < hi; i++) { const m = lines[i]!.l.match(HEAD); if (m && !taken.has(i) && f(i, m)) return i } return -1 }
      const i = cand((_, m) => m[2]!.length > 0 && key(m[2]!).slice(0, 14).length >= 10 && sim(m[2]!.slice(0, 20), t.slice(0, 20)) >= 0.6)
      const j = i >= 0 ? i : cand(i2 => lines.slice(i2 + 1, i2 + 6).some(x => /^\s*(?:Акт|Випис)(?=\s|$)/u.test(x.l)))
      if (j >= 0) pass2.push({ i: j, n: k + 1 })
    })
    heads.push(...pass2); heads.sort((x, y) => x.i - y.i)
  } else lines.forEach(({ l }, i) => { const m = l.match(HEAD); if (m && (i === 0 || !lines[i - 1]!.l.trim()) && lines.slice(i + 1, i + 6).some(x => /^\s*(?:Акт|Випис)(?=\s|$)/u.test(x.l))) { cur++; heads.push({ i, n: cur }) } })
  heads.forEach((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1]!.i : lines.length
    const sec = lines.slice(h.i, end), L = sec.map(x => x.l)
    // title: the heading line and the lines up to the first blank; dates: the next block (Акт … / Випис …); text: the rest
    let j = 0; const title: string[] = []
    for (; j < L.length && L[j]!.trim(); j++) title.push(L[j]!.replace(HEAD, '$2').trim())
    while (j < L.length && !L[j]!.trim()) j++
    const dateBlock: string[] = []
    for (; j < L.length && /^\s*(?:Акт|Випис|Витяг|Книга)(?=\s|$)/u.test(L[j]!); j++) dateBlock.push(L[j]!)
    const dates = parseDates(dateBlock)
    const years = dates.map(d => d.year)
    out.push({ n: h.n, title: title.join(' ').replace(/\s+/g, ' ').trim(), dates, date: years.length ? [Math.min(...years), Math.max(...years)] : [0, 0], text: cleanVol16(L.slice(j).join('\n')), scan: sec[0]!.scan, page: sec[0]!.scan - pageOffset,
      ...(years.length ? {} : { skippedWhy: 'no date line in the edition' }) })
  })
  return out
}

// ── the table of contents: the edition's chronological list; its date is the date of the document itself ──────
export interface Vol16TocEntry { n: number; title: string; date: [number, number] | null; dateText: string | null; page: number | null }
const MONTH_RE = '(?:січ|лют|бер|кві|тра|чер|лип|сер|вер|жов|лис|гру)[а-яіїєґ]{2,6}'
const MONTH_STEMS: [RegExp, string][] = [[/^січ/, 'січня'], [/^лют/, 'лютого'], [/^бер/, 'березня'], [/^кві/, 'квітня'], [/^тра/, 'травня'], [/^чер/, 'червня'], [/^лип/, 'липня'], [/^сер/, 'серпня'], [/^вер/, 'вересня'], [/^жов/, 'жовтня'], [/^лис/, 'листопада'], [/^гру/, 'грудня']]
const toDigits = (s: string) => s.replace(/[Ю]/g, '10').replace(/[ЗзЗ]/g, '3').replace(/[ОоO]/g, '0').replace(/[ІіlI|]/g, '1').replace(/[бБ]/g, '6').replace(/[Ѕ]/g, '5')
/**
 * The contents of the edition, read from a page-layout OCR (Tesseract --psm 6 keeps «N. title … date …… page» on one block): an entry starts at «N.» at the line start, its date is the LAST «day month 15yy» in it, its page the number at its end.
 * The printed numbers are OCR-garbled («М.», «58.», «Ю.»), so the entries are numbered in order. An entry with no year in print (№ 126, № 127) has `date: null`: it is not ingested.
 */
export function parseVol16Toc(text: string): Vol16TocEntry[] {
  const lines = text.replace(/([а-яіїєґ])-[ \t]*\n[ \t]*([а-яіїєґ])/giu, '$1$2').split('\n')
  const entries: string[][] = []
  for (const l of lines) {
    if (/^\s*(?:Іменний|Географічний|Словник|Summary|Знттагу)/u.test(l) || /^\s*ЗМІСТ\s*$/.test(l)) continue
    if (/^\s*[\dІіlЮЗзОбМїЇ|'‘]{1,4}\.\s+[«„"“]?\p{Lu}/u.test(l) && !/^\s*(?:\d+\.\d)/.test(l)) entries.push([l])
    else if (entries.length && l.trim() && !/^\s*\d{3}\s*$/.test(l)) entries[entries.length - 1]!.push(l)   // «м. Володимиром» (a town inside a title) is no entry start: the number is digits, or the digits the OCR garbles (М, Ю, Іб, їз)
  }
  return entries.map((e, i) => {
    const s = e.join(' ').replace(/\s+/g, ' ').replace(/^\s*\S{1,4}\.\s+/, '')
    const re = new RegExp(String.raw`([\dЮЗОІlбО]{1,2})?\s*\.?\s*(${MONTH_RE})\s+(1\s?5\s?[\dІlЗОб]\s?[\dІlЗОб])`, 'giu')
    const all = [...s.matchAll(re)], m = all.at(-1)
    let date: [number, number] | null = null, dateText: string | null = null, title = s
    if (m) {
      const mo = MONTH_STEMS.find(([r]) => r.test(m[2]!.toLowerCase())), yr = toDigits(m[3]!.replace(/\s/g, ''))
      const d = m[1] ? +toDigits(m[1]) : NaN
      if (mo && /^15\d\d$/.test(yr)) { date = [+yr, +yr]; dateText = `${d >= 1 && d <= 31 ? `${d} ` : ''}${mo[1]} ${yr}`; title = s.slice(0, m.index).trim() }
    }
    const tail = m ? s.slice(m.index! + m[0].length) : s, pg = tail.match(/(\d{1,3})\s*$/)
    return { n: i + 1, title: title.replace(/[\s.…:]+$/, ''), date, dateText, page: pg ? +toDigits(pg[1]!) : null }
  })
}

/**
 * The OCR reads single digits of the contents wrongly («1 червня 1566» for 1561, «3 листопада 1570» for 1576), but the edition's list is CHRONOLOGICAL, so a year that breaks the order is an OCR error:
 * the longest non-decreasing run of the printed years is trusted; every other entry (a garbled year, no year read) is dated by its position — between the trusted years of its neighbours — which is stated in the cite.
 * An entry before the first or after the last trusted year, or with a gap wider than \`maxGap\` years, is left undated (null): never guessed.
 */
export function repairDates(toc: Vol16TocEntry[], maxGap = 3): { date: [number, number] | null; basis: 'toc' | 'between' | null }[] {
  const y = toc.map(e => e.date?.[0] ?? null), n = y.length
  // longest non-decreasing subsequence over the entries that have a year (ties: the earliest end)
  const len = new Array<number>(n).fill(0), prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) { if (y[i] === null) continue; len[i] = 1; for (let j = 0; j < i; j++) if (y[j] !== null && y[j]! <= y[i]! && len[j]! + 1 > len[i]!) { len[i] = len[j]! + 1; prev[i] = j } }
  let best = -1; for (let i = 0; i < n; i++) if (y[i] !== null && (best < 0 || len[i]! > len[best]!)) best = i
  const trusted = new Set<number>(); for (let i = best; i >= 0; i = prev[i]!) trusted.add(i)
  return toc.map((_, i) => {
    if (trusted.has(i)) return { date: [y[i]!, y[i]!] as [number, number], basis: 'toc' as const }
    let a = i - 1; while (a >= 0 && !trusted.has(a)) a--
    let b = i + 1; while (b < n && !trusted.has(b)) b++
    if (a < 0 || b >= n) return { date: null, basis: null }
    const lo = y[a]!, hi = y[b]!
    return hi - lo <= maxGap ? { date: [lo, hi] as [number, number], basis: 'between' as const } : { date: null, basis: null }
  })
}
