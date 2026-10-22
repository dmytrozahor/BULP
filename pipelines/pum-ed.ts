/**
 * SPEC 63 RF-11: the later «Пам'ятки української мови» charter editions, read from the owner's scans (pdftotext -layout text layer of «Українські грамоти XV ст.»; Tesseract OCR of «Волинські грамоти XVI ст.»).
 * Pure functions (no I/O): the table of contents gives each charter's number, date, place and page (the edition's own date line); the body is split at the «№ N» headings; in each section the title block,
 * the editor's description, the palaeographic notes and the footnotes (modern Ukrainian, Latin, line-number marks) are apparatus (© Наукова думка) and never enter the text — only the charter text does.
 */
export const MONTH: Record<string, number> = { січня: 1, лютого: 2, березня: 3, квітня: 4, травня: 5, червня: 6, липня: 7, серпня: 8, вересня: 9, жовтня: 10, листопада: 11, грудня: 12,
  січень: 1, лютий: 2, березень: 3, квітень: 4, травень: 5, червень: 6, липень: 7, серпень: 8, вересень: 9, жовтень: 10, листопад: 11, грудень: 12 }

/** OCR confusions in numbers: З→3, О→0, І→1 (Cyrillic letters read for digits) */
export const digits = (s: string) => s.replace(/(?<![\p{L}])[\dЗОоІl|]{1,4}(?![\p{L}])/gu, m => m.replace(/[Зз]/g, '3').replace(/[ОоO]/g, '0').replace(/[І|lI]/g, '1'))
export interface TocEntry { n: number; title: string; dateText: string; place?: string; page: number; date: [number, number]; note?: string }

/** the date of the parenthesis «(8 червня 1499 року)», «(1401/1411 року, Київ)», «(Листопад 1452 року, Луцьк)», «(Середина XV століття, Сучава)», «(1456[?] року)» → year range + the stated text */
export function parseDate(paren: string): { date: [number, number]; text: string; place?: string; note?: string } | null {
  const s = digits(paren.replace(/[\n\r]+/g, ' ').replace(/[|[]\s*\?\s*\]/g, '[?]')).replace(/\s+/g, ' ').trim()
  const place = (s.match(/,\s*([^,()]+?)\s*\.?$/) ?? s.match(/року\.\s*(\S+)$/))?.[1]?.replace(/[.\s]+$/, '')
  const mid = s.match(/^Середина\s+XV\s+століття/i)
  if (mid) return { date: [1440, 1460], text: s.replace(/,.*$/, ''), ...(place ? { place } : {}), note: 'середина XV ст. → [1440, 1460] (конвенція: ±10 років навколо середини, як «Близько X р.»)' }
  const y = s.match(/(\d{4})\s*\/\s*(\d{4})/)
  if (y) return { date: [+y[1]!, +y[2]!], text: s.replace(/,\s*[^,]+$/, ''), ...(place ? { place } : {}), note: `дата видання з двох років ${y[1]}/${y[2]} → діапазон` }
  const one = s.match(/(\d{4})/)
  if (!one) return null
  const yy = +one[1]!; if (yy < 1300 || yy > 1600) return null
  const unsure = /\[\?\]/.test(s)
  return { date: [yy, yy], text: s.replace(/,\s*[^,]+$/, '').replace(/\.\s*\S+$/, ''), ...(place && !/\d/.test(place) ? { place } : {}), ...(unsure ? { note: 'рік у виданні з позначкою сумніву [?]' } : {}) }
}

/** «ЗМІСТ»: «№ 5. title (date, place) page» entries; the section words (ГРАМОТИ …) and page folios are skipped; the numbers are taken in sequence (OCR reads 30 as «ЗО») */
export function parseToc(lines: string[], firstN = 1, max = 99): TocEntry[] {
  const joined = lines.join('\n')
  const parts = joined.split(/(?:^|\n)\s*№\s*[0-9ЗОІlI]{1,3}\s*[.,іi]*\s/g).slice(1)
  const out: TocEntry[] = []
  parts.forEach((p, i) => {
    const n = firstN + i; if (n > max) return
    const body = p.replace(/\n\s*\d{3}\s*\n/g, '\n').replace(/¬\s*\n\s*/g, '').replace(/-\s*\n\s*(\p{Ll})/gu, '$1').replace(/-\s*\n\s*/g, '-')   // a hyphen at the line end before a lower-case letter is the line break («Петр-ков», «мар-шалку»); before a capital it is a real hyphen («Турійськ-Володимирський»)
    const m = body.match(/\(([^()]*(?:\[[^\]]*\][^()]*)*)\)\s*[.\s]*(?:(\d{1,3})\b)?/)   // the last parenthesis group that holds a year
    const all = [...body.replace(/\n/g, ' ').matchAll(/\(([^()]*(?:\d{3,4}|Середина XV)[^()]*)\)/g)]
    const last = all.at(-1) ?? (m && /\d{3,4}/.test(m[1]!) ? m : null)
    if (!last) return
    const d = parseDate(last[1]!); if (!d) return
    const rest = body.replace(/\n/g, ' ').slice(body.replace(/\n/g, ' ').lastIndexOf(last[0]) + last[0].length)
    const pg = digits(rest).match(/(\d{2,3})/)
    const title = body.replace(/\n/g, ' ').slice(0, body.replace(/\n/g, ' ').lastIndexOf(last[0])).replace(/\s+/g, ' ').trim()
    out.push({ n, title, dateText: d.text, ...(d.place ? { place: d.place } : {}), page: pg ? +digits(pg[1]!) : 0, date: d.date, ...(d.note ? { note: d.note } : {}) })
  })
  return out
}

// ── apparatus vs charter text ─────────────────────────────────────────────────────────────────────────
// words of modern Ukrainian (editor's Ukrainian prose) that the charters never use
const MODERN = new Set(['як', 'або', 'вона', 'воно', 'вони', 'буква', 'букви', 'букв', 'літерою', 'рядка', 'рядком', 'крапка', 'крапкою', 'дві', 'що', 'який', 'яка', 'яке', 'які', 'якого', 'якій', 'якими', 'цього', 'цієї', 'цей', 'ця', 'це', 'цим', 'цих', 'також', 'було', 'були', 'був', 'була', 'його', 'її', 'їх', 'текст', 'тексту', 'тексті', 'грамота', 'грамоти', 'грамоту', 'грамоті', 'копія', 'копії', 'слова', 'слово', 'літери', 'літера', 'див', 'стор', 'арк', 'написано', 'написана', 'написаний', 'написані', 'зберігається', 'чорним', 'чорнилом', 'почерк', 'аркуші', 'аркуш', 'оригінал', 'оригіналу', 'оригіналом', 'публікується', 'друкується', 'публікація', 'опублікована', 'опубліковано', 'видання', 'виданні', 'тобто', 'проте', 'після', 'перед', 'між', 'але', 'тут', 'можна', 'можуть', 'може', 'треба', 'слід', 'мови', 'мова', 'письмом', 'півуставом', 'півуставним', 'письма', 'бібліотеці', 'бібліотеки', 'бібліотека', 'відділі', 'відділ', 'рукописів', 'рукописною', 'рукопис', 'пергаментному', 'пергамент', 'печаті', 'шнурком', 'звороті', 'напис', 'напису', 'написи', 'дата', 'дати', 'даному', 'даний', 'цьому', 'ній', 'нею', 'ними', 'них', 'нього', 'тому', 'повинен', 'виправлене', 'виправлено', 'перекреслено', 'надписано', 'надписане', 'написаний', 'слів', 'словах', 'пропущено', 'вжито', 'вжита', 'вжиті', 'копіях', 'списку', 'списки', 'список', 'зроблена', 'зроблено', 'подано', 'подається', 'уміщена', 'уміщено', 'гербова', 'печатка', 'позначка', 'позначено', 'дужки', 'дужках', 'квадратних', 'круглих', 'прим', 'упорядника', 'тільки', 'лише', 'інший', 'іншою', 'іншим', 'іншої', 'своєю', 'нашого', 'вперше', 'раніше', 'опублікована', 'видана', 'виданий', 'за', 'аркуші', 'розміром', 'смх', 'см'])
const AMBIG = new Set(['за', 'між', 'після', 'перед', 'але', 'тут', 'тому', 'його', 'її', 'їх', 'це', 'цей', 'ця', 'було', 'був', 'була', 'були', 'також', 'своєю', 'нашого', 'що', 'тільки', 'лише', 'інший', 'іншою', 'іншим', 'іншої', 'пергамент', 'см', 'смх', 'дата', 'дати'])   // weak (1 point split between them): kept in the set but weighted half
export interface LineClass { words: number; modern: number; latin: number }
export function classify(line: string): LineClass {
  const ws = line.match(/[\p{L}\p{M}'’ʼ]+/gu) ?? []
  let modern = 0, latin = 0
  for (const w of ws) {
    if (/[A-Za-z]/.test(w)) { latin++; continue }
    const l = w.toLowerCase().replace(/[’ʼ]/g, "'")
    if (MODERN.has(l)) modern += AMBIG.has(l) ? 0.5 : 1
  }
  return { words: ws.length, modern, latin }
}
const FOOTNOTE = /^\s{3,}\d{1,3}\s+[\p{Lu}«(]/u   // a footnote is indented; a folio number of the manuscript («38  Арє(н)да …») stands at the left margin
const RUNNING = /^\s*(?:З\s*)?\d{1,3}(?:\s*-\s*\d)?\s*$|^\s*\d{1,3}\s{4,}\d{1,3}\s*$|ЗМІСТ|Ізборник|litopys/u
/** a line is apparatus when it carries enough modern-Ukrainian words (≥ 1 per 9 words, ≥ 1 point) or is mostly Latin-script */
export function apparatusLine(line: string): boolean {
  const c = classify(line)
  if (c.words === 0) return false
  if (c.latin >= 2 && c.latin / c.words >= 0.25) return true
  // a Polish/Latin text read as Cyrillic look-alikes (charter № 2): the Ruthenian letters ь ъ є ѣ ю я ж ш ч щ are almost absent (share 0.01 against 0.10–0.15 in a Ruthenian line)
  if (c.words >= 6 && (line.match(/\p{L}/gu)?.length ?? 0) >= 25 && (line.match(/[ьъєѣѧюяжшчщ]/g)?.length ?? 0) / (line.match(/\p{L}/gu)?.length ?? 1) < 0.04) return true
  return c.modern >= 1 && c.modern / c.words >= 0.08
}

/** words that only the Ruthenian charter text has: a consonant + є (потрєбно, нашєму: modern Ukrainian writes е there), ьі, ъ, ѣ, оу, ѧ, єсм- (єсмо, єсми, єсмьі) */
const OLD_MARK = /[бвгґджзклмнпрстфхцчшщ]є|ьі|ъ|ѣ|ѧ|оу|єсм/iu
export const oldMarks = (line: string) => (line.match(/[\p{L}\p{M}'’ʼ]+/gu) ?? []).filter(w => OLD_MARK.test(w)).length

/** one «№ N» section (the lines from the heading to the next heading, the heading excluded) → the charter text and the number of apparatus words dropped.
 *  A paragraph (blank-line separated) is charter text when at least half of its lines of ≥ 4 words carry an old-orthography mark (OLD_MARK); the editor's description, the palaeographic notes and the footnotes are modern Ukrainian and carry none.
 *  Inside a text paragraph a line is still dropped when it is a footnote, a running head, Latin-script, or heavy with modern words. */
export function charterText(section: string[]): { text: string; apparatus: number } {
  // 1. title block: everything up to and including the line with the date (first line with a year-and-«року|рік|р.» within 14 lines)
  let i = 0, seen = 0
  for (; i < Math.min(section.length, 14); i++) { if (/\d{4}\s*(?:року|рік|р\.|рр)|\d{4}\s*\/\s*\d{4}|XV\s*століття|(?:року|р\.)\s*,?\s*\p{Lu}\p{Ll}+\s*$/u.test(digits(section[i]!))) { seen = 1; i++; break } }
  if (!seen) i = 0
  const lines = section.slice(i)
  // 2. paragraphs
  const paras: string[][] = []; let cur: string[] = []
  for (const l of lines) { if (!l.trim() || /\f/.test(l)) { if (cur.length) paras.push(cur); cur = []; if (/\f/.test(l) && l.trim()) cur.push(l.replace(/\f/g, '')) } else cur.push(l) }
  if (cur.length) paras.push(cur)
  let app = 0; const keep: string[] = []
  for (const p of paras) {
    const long = p.filter(l => classify(l).words >= 4)
    const textual = long.filter(l => oldMarks(l) / classify(l).words >= 0.05 && !(classify(l).latin >= 2 && classify(l).latin / classify(l).words >= 0.25)).length
    const words = p.reduce((n, l) => n + classify(l).words, 0)
    if (!long.length ? p.every(l => RUNNING.test(l) || classify(l).words < 3 || FOOTNOTE.test(l)) && !p.some(l => oldMarks(l)) : textual < long.length / 2) { app += words; continue }
    let inFoot = false
    for (const l of p) {
      if (FOOTNOTE.test(l)) inFoot = true
      if (inFoot || RUNNING.test(l) || (apparatusLine(l) && (oldMarks(l) === 0 || classify(l).modern >= oldMarks(l)))) { app += classify(l).words; continue }
      keep.push(l)
    }
    keep.push('')
  }
  return { text: cleanText(keep.join('\n')), apparatus: app }
}

/** editorial marks out of the text: line numbers [3], «[!]», «[?]», footnote digits glued to a word, expansion brackets «є(с)мо» → «єсмо», soft hyphens joined */
export function cleanText(t: string): string {
  return t.replace(/\[\s*[!?]\s*\]|\[\s*\d{1,2}\s*[\]|)]|\(\s*\d{1,2}\s*\)/g, ' ')
    .replace(/(¬|-)[ \t]*\n[ \t]*/g, '').replace(/(?<=\p{L})\d{1,2}(?=\s|[.,;:]|$)/gu, '')
    .replace(/^[ \t]*\d{1,3}[ \t]+(?=\p{L})/gmu, '')   // the manuscript's folio number at the left margin («38  Арє(н)да …»)
    .replace(/[()[\]{}|\\«»„“”]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
}

// ── dedupe (RF-11): a charter is counted once ─────────────────────────────────────────────────────────
/** the spelling-insensitive skeleton of a word: lower case, ѣ→е, є→е, ѧ→я, і/ї/и/ы→и, ъ ь and the OCR's stray marks dropped — so «потрєбно» (print) = «потребно» (transcription) */
export const skeleton = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ѡ/g, 'о').replace(/[ѣє]/g, 'е').replace(/ѧ/g, 'я').replace(/[іїыѵ]/g, 'и').replace(/[ъь'’ʼ]/g, '').replace(/[^\p{L}]/gu, '')
const grams = (raw: string[], k = 4) => { const w = raw.map(skeleton).filter(x => x.length > 0), s = new Set<string>(); for (let i = 0; i + k <= w.length; i++) s.add(w.slice(i, i + k).join(' ')); return s }
export interface DupWitness { id: string; date: [number, number]; tokens: { raw: string }[] }
/** share of the candidate's word 4-grams that the other text also has (the OCR of a print is noisy, so a tenth already means the same text: the same charter in two editions scored 0.17–0.2 by 4-grams, unrelated charters (shared chancery formulae) stay below 0.05) */
export function containment(cand: DupWitness, other: DupWitness): number {
  const a = grams(cand.tokens.map(t => t.raw)); if (a.size === 0) return 0
  const b = grams(other.tokens.map(t => t.raw)); let n = 0
  for (const g of a) if (b.has(g)) n++
  return n / a.size
}
export const DUP_THRESHOLD = 0.1
/** the vetted witnesses win: `kept` is every candidate with no counterpart (same text, dates ≤ 60 years apart) among the already admitted ones; each duplicate is reported with the witness it duplicates. Candidates of ONE edition are NOT compared with each other: two charters of the same chancery share formulae (№ 6 and № 7 of the XV ст. edition are two distinct oaths with 0.21 in common). */
export function dedupe<T extends DupWitness>(admitted: DupWitness[], cands: T[]): { kept: T[]; duplicates: { id: string; of: string; share: number }[] } {
  const kept: T[] = [], duplicates: { id: string; of: string; share: number }[] = []
  for (const c of cands) {
    let hit: { of: string; share: number } | undefined
    for (const o of admitted) {
      if (Math.abs(o.date[0] - c.date[0]) > 60) continue
      const share = containment(c, o); if (share >= DUP_THRESHOLD && (!hit || share > hit.share)) hit = { of: o.id, share: +share.toFixed(3) }
    }
    if (hit) duplicates.push({ id: c.id, ...hit }); else kept.push(c)
  }
  return { kept, duplicates }
}
