/**
 * SPEC 63 CQ-2: date plausibility of archive.org OCR witnesses (no imports: replayed on the worker by the measurement scripts).
 * The archive.org `date` of a translation or a reprint is often the year of the ORIGINAL (Marx, «Капітал» is dated 1867, the Ukrainian text is the Kharkiv edition of 1933). A modern-spelling text must not set a first
 * attestation or an epoch at the date of the original: such a witness is written with `dateUncertain` (build: counted in N, no first attestation, no epoch statistics, text card says why).
 * Order of evidence, never a guess: (1) the edition year STATED in the archive.org metadata (publisher / imprint / notes / description, sidecar `ia-meta.jsonl`); (2) an explicit allow-list entry (`DATE_VERIFIED`);
 * (3) the flag. A composite volume titled «(1914-1918)» whose metadata date is only the first year gets the range and the flag (the issue is unknown).
 */
export interface IaMeta { id: string; date?: string; year?: string; publisher?: string; imprint?: string; notes?: string; description?: string }

/** verified by reading the item (title page spelling / printer in the metadata); each entry says how. witness id -> verification */
export const DATE_VERIFIED: Record<string, string> = {
  hv_ia_german_grammar_lviv_1876: 'title in the spelling of the 1870s (Нѣмецка граматика … шкôл), Lviv 1876 in the item id',
  hv_ia_halycko_volodymyrska_rus_sharanevych: 'title page spelling of 1863 (Исторія … ôтъ найдавнѣйши), Шараневич',
  hv_ia_hramatka_kulisha_1857: 'publisher «въ типографіи П. А. Кулиша», Санкт-Петербурґ, the printing of 1857',
}

/** known wrong dates the spelling heuristic cannot see (dated 1893 / 1894, after its 1890 cut): Marx, «Капітал» vol. 2 and 3, Ukrainian editions of 1930-1936 named in the item metadata (checked 2026-11-04). The metadata then gives the edition year; without it the witness is flagged. */
export const DATE_SUSPECT: RegExp[] = [/^hv_ia_kapitaltom\d/]

/** modern-spelling text under an old date: >= 2000 tokens, (almost) no ъ ѣ, and more than a quarter of the tokens with і ї є ґ, dated before 1890 */
export function modernForDate(date: [number, number], tokens: string[]): boolean {
  const n = tokens.length
  if (date[1] >= 1890 || n < 2000) return false
  let hard = 0, ukl = 0
  for (const t of tokens) { if (/[ъѣ]/.test(t)) hard++; if (/[іїєґ]/.test(t)) ukl++ }
  return hard / n < 0.001 && ukl / n > 0.25
}

const strip = (s: unknown) => (Array.isArray(s) ? s.join(' ') : String(s ?? '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
/** the text of the fields that may state an edition (not `date`, not the creator's life years) */
export const metaText = (m: IaMeta) => [m.publisher, m.imprint, m.notes, m.description].map(strip).filter(Boolean).join(' | ')
export function statedYears(m: IaMeta): number[] {
  return [...new Set([...metaText(m).matchAll(/(?<!\d)(1[5-9]\d\d|20[0-2]\d)(?!\d)/g)].map(x => +x[1]!))].sort((a, b) => a - b)
}
export type DateVerdict = { kind: 'confirmed'; quote: string } | { kind: 'edition'; year: number; quote: string } | { kind: 'none' }
/** confirmed: the metadata states the item's own year, or `year` equals the date and a publisher is named; edition: exactly one stated year later than the date; none: nothing stated or several different years */
export function resolveDate(date: [number, number], m?: IaMeta): DateVerdict {
  if (!m) return { kind: 'none' }
  const text = metaText(m), ys = statedYears(m), at = (y: number) => { const i = text.indexOf(String(y)); return text.slice(Math.max(0, i - 50), i + 60) }
  if (ys.includes(date[0]) || ys.includes(date[1])) return { kind: 'confirmed', quote: at(ys.includes(date[0]) ? date[0] : date[1]) }
  if (m.year && +m.year === date[0] && strip(m.publisher)) return { kind: 'confirmed', quote: `year ${m.year}; publisher ${strip(m.publisher).slice(0, 80)}` }
  const later = ys.filter(y => y > date[1])
  if (later.length === 1 && ys.length === 1) return { kind: 'edition', year: later[0]!, quote: at(later[0]!) }
  return { kind: 'none' }
}

/** the repo's PD rule for archive.org prints: publication year <= 1925 (harvest/archive.ts PD query). A witness whose own date is later is in copyright or of unknown status. */
export const PD_LAST_YEAR = 1925
/**
 * A publication year after the PD cut that the metadata STATES as a publication line, not as a life date, a digitisation note or a range: at the end of the publisher / imprint field («Kiĭv : "Mistetstvo", [1967]»),
 * or in a description line «<place>, <publisher>, 1933 [Ukrainian edition]». Years in parentheses ranges («(1912-1939)»), «Presented ... 1958», «Description based on the issue for 1927» do not count.
 */
export function publicationYearAfterPd(m?: IaMeta): { year: number; quote: string } | null {
  if (!m) return null
  for (const f of [m.publisher, m.imprint]) {
    const t = strip(f), x = t.match(/(?:^|[,:;\s])\[?((?:19[2-9]\d|20[0-2]\d))\]?\s*\.?$/)
    if (x && +x[1]! > PD_LAST_YEAR) return { year: +x[1]!, quote: t.slice(-100) }
  }
  const d = strip(m.description), y = d.match(/[,:]\s*((?:19[2-9]\d|20[0-2]\d))\s*\[[^\]]*(?:edition|видання|издание)[^\]]*\]/i)
  if (y && +y[1]! > PD_LAST_YEAR) { const i = d.indexOf(y[0]); return { year: +y[1]!, quote: d.slice(Math.max(0, i - 60), i + y[0].length) } }
  return null
}

export interface DateDecision {
  date: [number, number]
  /** where a changed date comes from: locator, verbatim quote, note (absent = the index date stands) */
  cite?: { locator: string; quote: string; note: string }
  dateUncertain?: { why: string }
  licenceNote?: string
  /** SPEC 63 CQ-3: the date is after the PD cut: counted, never shown as running text, examples <= 200 characters */
  textRestricted?: { why: string }
}
/** the one decision of witnessFrom for an archive.org OCR item: title range / title year, the publication year after the PD cut, the edition year of a modern-spelling text, the flag, the restriction */
export function resolveWitnessDate(o: { id: string; title: string; date: [number, number]; meta?: IaMeta; modern: () => boolean; /** the last PD year of THIS set's licence: 1925 for the publication-year rule (default), Infinity where PD rests on the author's death (Hrushevsky, linguists) */ pdLast?: number }): DateDecision {
  let date: DateDecision['date'] = o.date, cite: DateDecision['cite'], dateUncertain: DateDecision['dateUncertain'], licenceNote: string | undefined
  // the harvest index keeps only the first year of a metadata range («1889-1939» -> 1889): the sidecar's own date field tells the real range
  const mr = String(o.meta?.date ?? '').match(/^(\d{4})\s*[-–]\s*(\d{4})/), wide: [number, number] = mr && +mr[1]! === date[0] ? [+mr[1]!, +mr[2]!] : date
  const tr = titleRange(o.title, date), ty = tr ? null : titleYear(o.title, wide)
  if (tr) { date = tr; dateUncertain = { why: `складений том ${tr[0]}–${tr[1]} (діапазон з назви); у метаданих архіву лише ${o.date[0]}, номер випуску невідомий` } }
  else if (ty) { date = [ty, ty]; cite = { locator: 'назва в index.jsonl', quote: o.title.slice(0, 200), note: `рік з назви; у метаданих архіву діапазон ${o.date[0]}–${o.date[1]}` } }
  const pub = publicationYearAfterPd(o.meta)
  if (pub && date[0] < pub.year && !dateUncertain) { cite = { locator: 'archive.org /metadata: publisher / description', quote: pub.quote, note: `рік видання, названий у метаданих; дата в полі date (${o.date[0]}) — рік оригіналу` }; date = [pub.year, pub.year] }
  else if (!dateUncertain && !pub && !DATE_VERIFIED[o.id] && (DATE_SUSPECT.some(r => r.test(o.id)) || o.modern())) {
    const v = resolveDate(date, o.meta)
    if (v.kind === 'edition') { cite = { locator: 'archive.org /metadata: publisher / description', quote: v.quote.slice(0, 300), note: `рік видання, названий у метаданих; дата в полі date (${o.date[0]}) — рік оригіналу` }; date = [v.year, v.year] }
    else if (v.kind === 'none') dateUncertain = { why: `текст сучасної орфографії при даті ${date[0]}; рік видання не названо в метаданих архіву (переклад чи передрук оригіналу?)` }
  }
  let textRestricted: DateDecision['textRestricted']
  const pdLast = o.pdLast ?? PD_LAST_YEAR
  if (date[1] > pdLast) {
    if (date[0] <= pdLast && !dateUncertain) dateUncertain = { why: `діапазон дат ${date[0]}–${date[1]} перетинає межу ${pdLast}; рік випуску не названо` }
    textRestricted = { why: date[0] > pdLast ? `видання ${date[0] === date[1] ? date[0] : date[0] + '–' + date[1]}: правило «публічне надбання за датою ≤ ${pdLast}» не застосовується, статус прав не з'ясовано` : `дати ${date[0]}–${date[1]} сягають за ${pdLast}: статус прав частини тому не з'ясовано` }
  }
  if (textRestricted) licenceNote = `${textRestricted.why}. Текст не публікується; слова враховано в лічильниках, приклади — не довші за 200 знаків.`
  return { date, ...(cite ? { cite } : {}), ...(dateUncertain ? { dateUncertain } : {}), ...(licenceNote ? { licenceNote } : {}), ...(textRestricted ? { textRestricted } : {}) }
}

/** «Ранок … (1914-1918)»: a composite volume whose metadata date is only the first year -> the range stated in the title */
export function titleRange(title: string, date: [number, number]): [number, number] | null {
  const m = title.match(/\((\d{4})\s*[-–]\s*(\d{4})\)/)
  if (!m) return null
  const a = +m[1]!, b = +m[2]!
  return b > a && date[0] === date[1] && date[0] === a ? [a, b] : null
}
/** an issue whose title states its year («Rik 1934», «(1897)») while the metadata date is a wide range containing it */
export function titleYear(title: string, date: [number, number]): number | null {
  const m = title.match(/\((\d{4})\)|\bRik\s+(\d{4})\b|\bRočnik\w*\s+\d+\s*\((\d{4})\)/)
  const y = m ? +(m[1] ?? m[2] ?? m[3]!) : 0
  if (y && date[1] - date[0] >= 5 && y >= date[0] && y <= date[1]) return y
  // a periodical marker («Rik 1934», «Ročnik 12 (1900)») names the volume year; the index keeps only the first year of the series («1889»), so a title year 5+ years later wins
  return y && m && (m[2] || m[3]) && y >= date[0] + 5 && y <= 2026 ? y : null
}
