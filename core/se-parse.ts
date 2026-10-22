/**
 * SPEC 63 SE-11: article parsers for the OCR text of the historical dictionaries (Тимченко 1930/32, Білецький-Носенко, Закревський, СУМ XVI–XVII, Матеріали XV–XVIII ст., Словник мови Шевченка).
 * Pure (no node imports). Output = SeRow[] per headword (core/se.ts), so the stage `senses` treats them like every other dictionary.
 *
 * Quality first (SE-11b): the OCR is not proofread. Every page and every article gets an OCR score (share of word-like Cyrillic tokens); a headword must itself look like a word;
 * an article below the dictionary's threshold, or with a garbled headword, is SKIPPED and counted, never emitted. A parsed headword is only a KEY: the build attaches rows to cards
 * that exist (core/se.ts rows are looked up by lk(headword)), it never creates a lemma from an OCR line.
 *
 * Dating (SE-1): the date of a dictionary's own dated quotation outranks the coverage period. Order: (1) a four-digit year in the quotation («Краків, 1588»); (2) the dictionary's century label
 * («ХУП.» = XVII, Тимченко) → that century; (3) a siglum resolved through the dictionary's own list of sources, when the list gives a year; (4) none: the row falls back to the coverage period
 * of the dictionary (core/se.ts atOf), which the card labels «період».
 *
 * Copyright (SE-9): for a © dictionary `keepQuotes` is false: the row carries the headword, the sense number, a gloss ≤ 200 characters, the quotation dates and the sigla, no quotation text.
 */
import { epochsOf, type SeRow } from './se.ts'

export type ParseKind = 'timchenko' | 'sum16' | 'materials' | 'shevchenko' | 'bn' | 'zakrevsky'
export interface ParseSpec { kind: ParseKind; dict: string; /** keep ≤ 120 characters of the first quotation of a sense (PD dictionaries only) */ keepQuotes: boolean; /** minimum OCR score of an article */ minScore: number; lang: 'uk' | 'ru' }
export const PARSE_SPECS: Record<ParseKind, ParseSpec> = {
  timchenko: { kind: 'timchenko', dict: 'timchenko', keepQuotes: true, minScore: 0.72, lang: 'uk' },
  bn: { kind: 'bn', dict: 'biletsky-nosenko', keepQuotes: true, minScore: 0.8, lang: 'ru' },
  zakrevsky: { kind: 'zakrevsky', dict: 'zakrevsky', keepQuotes: true, minScore: 0.85, lang: 'ru' },
  sum16: { kind: 'sum16', dict: 'sum16', keepQuotes: false, minScore: 0.72, lang: 'uk' },
  materials: { kind: 'materials', dict: 'timchenko-materials', keepQuotes: false, minScore: 0.72, lang: 'uk' },
  shevchenko: { kind: 'shevchenko', dict: 'shevchenko', keepQuotes: false, minScore: 0.72, lang: 'uk' },
}
export const GLOSS_MAX = 200

// ── OCR quality (SE-11b) ─────────────────────────────────────────────────────────────────────────
const CYR = 'А-Яа-яІіЇїЄєҐґЪъЬьЫыЭэЁёѢѣѲѳѴѵ'
const WORDISH = new RegExp(`^[${CYR}]+(?:['’ʼ\\-][${CYR}]+)*$`)
const VOWEL = /[аеєиіїоуюяыэёѣАЕЄИІЇОУЮЯЫЭЁѢ]/
const CONS_RUN = new RegExp(`[бвгґджзйклмнпрстфхцчшщъь]{6,}`, 'i')
/** a token that is a plausible word: Cyrillic letters only (stress marks and a join stripped), a vowel, no run of 6 consonants */
export function wordish(tok: string): boolean {
  const t = tok.normalize('NFC').replace(/[́̀]/g, '')
  return t.length >= 2 && WORDISH.test(t) && VOWEL.test(t) && !CONS_RUN.test(t)
}
/** share of the alphabetic tokens (≥ 2 characters, digits and punctuation ignored) that are plausible Cyrillic words; 0 for text without tokens */
export function ocrScore(text: string): number {
  const all = text.split(/[\s.,;:!?()«»"“”„…\/\[\]—–]+/).filter(Boolean), numeric = (t: string) => /^[\d\-–]+$/.test(t)
  let n = 0, ok = 0
  all.forEach((t, i) => {
    if (numeric(t) || (t.length < 2 && !/\p{L}/u.test(t))) return
    n++
    // a run of one-letter fragments is OCR debris; a lone one counts only if it is a Ukrainian/Russian one-letter word
    if (t.length === 1) { if (!(all[i - 1]?.length === 1 || all[i + 1]?.length === 1) && 'вузойаяіикс'.includes(t.toLowerCase())) ok++ } else if (wordish(t)) ok++
  })
  return n ? Math.round((ok / n) * 100) / 100 : 0
}
/** a headword that may be emitted: Cyrillic word letters (capitals allowed), 2–32 characters, a vowel, no consonant run of 6, not a century label or Roman numeral */
export function headwordOk(h: string): boolean {
  const t = h.normalize('NFC')
  return t.length >= 3 && t.length <= 32 && wordish(t) && !/^[ХУІЇПШVXЬ]{1,6}$/.test(t.toUpperCase())
}

// ── dates ────────────────────────────────────────────────────────────────────────────────────────
const CENTURY: Record<string, number> = { 'ХІУ': 14, 'ХУ': 15, 'ХУІ': 16, 'ХУП': 17, 'ХУПІ': 18, 'ХУШ': 18, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18 }   // OCR of XIV … XVIII (У = V, П = II, Ш = III), or the Latin numerals
const CEN = 'XVIII|XVII|XIV|XVI|XV|ХІУ|ХУПІ|ХУШ|ХУП|ХУІ|ХУ'
export const centuryRange = (c: number): [number, number] => [(c - 1) * 100 + 1, c * 100]
/** a four-digit year of a quotation, plausible for the 14th–18th c. (or the 19th for Shevchenko's time) */
export function yearIn(text: string, max = 1900): number | undefined {
  for (const m of text.matchAll(/(?<![\d.])(1[3-9]\d\d)(?![\d])/g)) { const y = Number(m[1]); if (y <= max) return y }
}
const MARK = new RegExp(`(?:^|[\\s.])(${CEN})(?:\\s*[—–-]{1,2}\\s*(${CEN}))?\\s*[.:]`, 'g')
/** the century labels («ХУП.» «ХУ—ХУІ.») found in a text, as year ranges */
export function centuryLabels(text: string): [number, number][] {
  const out: [number, number][] = []
  for (const m of text.matchAll(MARK)) {
    const a = CENTURY[m[1]!], b = m[2] ? CENTURY[m[2]!] : a
    if (a && b) out.push([centuryRange(Math.min(a, b))[0], centuryRange(Math.max(a, b))[1]])
  }
  return out
}
/** the dictionary's own list of sources: «Гал. Кл. Раз. — Галятовський, Ключ розуміння, 1665» → siglum → year (only where the line gives a year) */
export function siglaDates(listText: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const line of listText.split('\n')) {
    const m = /^\s*([А-ЯІЇЄ][^—–\n]{1,40}?)\s*[—–]{1,2}\s*(.{3,200})$/.exec(line.replace(/--/g, '—'))
    const y = m && yearIn(m[2]!, 1800)
    if (m && y) out.set(m[1]!.trim().replace(/\s+/g, ' '), y)
  }
  return out
}

// ── articles ─────────────────────────────────────────────────────────────────────────────────────
export interface RawArticle { head: string; variants: string[]; body: string; /** the dictionary's own grammar mark, kept apart from the text (Білецький-Носенко «(и. с. ж. р.)») */ gram?: string }
const UP = 'А-ЯІЇЄҐЪЬЫЭЁѢѲѴ'
const HEAD = new RegExp(`^([${UP}][${UP}'’ʼ\\-]+(?:,\\s*[${UP}][${UP}'’ʼ\\-]+)*)\\s*(?:[\\d¹²³]\\s*)?([,.(].*|\\s.*)?$`)
const joinLines = (lines: string[]): string => lines.join('\n').replace(/([\p{L}])[-¬]\s*\n\s*(?=\p{L})/gu, '$1').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
/** split one page (or a whole file) into articles: a line that starts with an upper-case headword (+ variants) opens one; century labels and Roman numerals never do */
export function splitArticles(text: string): RawArticle[] {
  const out: RawArticle[] = []
  let cur: { head: string; variants: string[]; lines: string[] } | undefined
  const flush = () => { if (cur) out.push({ head: cur.head, variants: cur.variants, body: joinLines(cur.lines) }); cur = undefined }
  for (const line of text.split('\n')) {
    const m = HEAD.exec(line.trim())
    const variants = m ? m[1]!.split(/,\s*/).map(v => v.replace(/[\d¹²³]+$/, '')) : []
    if (m && variants.every(v => !/^[ХУІЇПШVXI]{1,6}$/.test(v)) && (m[2] ?? '').trim().length > 0 && /^[,.(\s]/.test(m[2] ?? '') && /[а-яіїєґ(\d]/.test((m[2] ?? '').trim()[0] === ',' ? (m[2] ?? '').slice(1).trim()[0] ?? '' : (m[2] ?? '').trim()[0] ?? '')) {
      flush(); cur = { head: variants[0]!, variants, lines: [(m[2] ?? '').replace(/^[,\s]+/, '')] }
    } else if (cur) cur.lines.push(line)
  }
  flush()
  return out
}

/** Білецький-Носенко / Закревський: the headword is not upper-case. B-N: «Барбара (и. с. ж. р.) Плеть.» (word + parenthesised grammar); Закревський: «Обидна, обоедна …» (word + comma) */
export function splitCapArticles(text: string, kind: 'bn' | 'zakrevsky'): RawArticle[] {
  const re = kind === 'bn' ? /^([А-ЯІЇЄ][а-яіїєґѣ'’ьъ]{2,22})\s*\(([а-яіїєѣ.,\s]{2,16})\)\s*(.*)$/ : /^([А-ЯІЇЄ][а-яіїєґѣ'’ьъ]{2,22}),\s+(.{6,})$/
  const out: RawArticle[] = []
  let cur: { head: string; gram?: string; lines: string[] } | undefined
  const flush = () => { if (cur) out.push({ head: cur.head, variants: [cur.head], body: joinLines(cur.lines), ...(cur.gram ? { gram: cur.gram } : {}) }); cur = undefined }
  for (const line of text.split('\n')) {
    const m = re.exec(line.trim())
    if (m) { flush(); cur = { head: m[1]!, ...(kind === 'bn' ? { gram: m[2]!.trim() } : {}), lines: [kind === 'bn' ? m[3]! : m[2]!] } } else if (cur) cur.lines.push(line)
  }
  flush()
  return out
}

// ── senses ───────────────────────────────────────────────────────────────────────────────────────
const POS_CAP = /^(?:[А-Яа-яіїє]{1,7}\.(?:[а-яіїє]{1,4}\.)?(?:\s*\(\d+\))?[,\s]*){1,3}/
const POS = new RegExp(POS_CAP.source.replace('[А-Яа-яіїє]', '[а-яіїє]'))   // a capital-initial word («Плеть.») is a gloss, not a grammar mark; only Шевченка prints «Присл.»
const ETYM = /^\((?:пол|лат|нім|гр|тур|чес|франц|італ|ц\.-сл|цсл|ст\.-сл|рос|угор|татар|араб|перс|євр|укр|Ипат|\.пт)[^)]{0,80}\)\s*/
/** a gloss that may be shown: word-like OCR, no run of two upper-case words (front matter, titles), no year */
export const glossOk = (g: string): boolean => ocrScore(g) >= 0.8 && (g.match(/(?:^|\s)[А-ЯІЇЄ]{4,}(?=\s|$)/g) ?? []).length < 2 && !/(?<!\d)1[3-9]\d\d(?!\d)/.test(g)
/** «Див. Цапе.» / «См. …»: a cross-reference line, not a sense */
export const isXrefGloss = (g: string): boolean => /^[.\s]*(?:[а-яіїє]{1,7}\.\s*)*(?:[Дд]ив\.|См\.|См\b|Смотри)/.test(g)
/** the stricter gate for a gloss that is SHOWN (OQ): glossOk plus no stray number token, no capital inside a word («ДДялг», «слОво»), no cross-reference */
export const glossClean = (g: string): boolean => glossOk(g) && !isXrefGloss(g) && !/(?:^|\s)\d{1,3}[.)]?(?=\s|$)/.test(g) && !/[а-яіїєґ][А-ЯІЇЄҐ]|[А-ЯІЇЄҐ]{2,}[а-яіїєґ]/.test(g)
export interface ParsedSense { n: number; gloss: string; dates: [number, number][]; sigla: string[]; quote?: string; period: boolean }
export interface ParsedEntry { head: string; variants: string[]; pos?: string; senses: ParsedSense[]; score: number }
const trimTo = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')
const SIGLUM_SHEV = /(?<![\p{L}\d])((?:І{1,3}|ІV|[1ІПМ]{1,2}|Р))\s?(\d{1,3})\.(\d{1,4})(?!\d)/gu
const SIGLUM_GEN = /(?:^|[\s.])((?:[А-ЯІЇЄ][а-яіїє]{0,5}\.\s?){1,3}(?:[ІІVX]+|\d+)?,?\s?(?:л\.\s?)?\d{1,4})\b/g

/** split a body into numbered senses; the numbers must run 1, 2, 3 … (a page number inside a quotation is not a sense) */
export function splitSenses(body: string, paren = false): { n: number; text: string }[] {
  const re = paren ? /(?:^|\s)(\d{1,2})\)\s+/g : /(?:^|\s)(\d{1,2})\.\s+(?=[(«"А-ЯІЇЄа-яіїє])/g
  const marks: { n: number; at: number; end: number }[] = []
  let want = 1
  for (const m of body.matchAll(re)) if (Number(m[1]) === want) { marks.push({ n: want, at: m.index!, end: m.index! + m[0].length }); want++ }
  if (!marks.length) return [{ n: 1, text: body }]
  const out: { n: number; text: string }[] = []
  if (marks[0]!.at > 12) out.push({ n: 0, text: body.slice(0, marks[0]!.at) })   // text before «1.» (a general gloss)
  marks.forEach((m, i) => out.push({ n: m.n, text: body.slice(m.end, marks[i + 1]?.at ?? body.length) }))
  return out
}

function senseOf(spec: ParseSpec, n: number, text: string, siglaYears: Map<string, number>): ParsedSense {
  let t = text.trim()
  const dates: [number, number][] = [], sigla: string[] = []
  let gloss = '', quote: string | undefined
  if (spec.kind === 'timchenko') {
    const cut = t.search(new RegExp(`(?:^|[\\s.])(?:${CEN})(?:\\s*[—–-]{1,2}\\s*(?:${CEN}))?\\s*[.:]`))
    gloss = (cut < 0 ? t : t.slice(0, cut)).trim()
    for (const r of centuryLabels(t)) dates.push(r)
    quote = cut >= 0 ? t.slice(cut).replace(/^[\s.]+/, '') : undefined
  } else if (spec.kind === 'sum16') {
    const cut = t.search(/:|\((?:[^()]{0,40}?,\s*)?1[3-6]\d\d/)
    gloss = (cut < 0 ? t : t.slice(0, cut)).trim()
    quote = cut >= 0 ? t.slice(cut).replace(/^[:\s]+/, '') : undefined
    for (const m of t.matchAll(/\(([^()]{0,60}?)\b(1[3-6]\d\d)\b([^()]{0,40})\)/g)) { dates.push([Number(m[2]), Number(m[2])]); const sg = (m[3] ?? '').trim(); if (sg && sigla.length < 3) sigla.push(sg.slice(0, 20)) }
  } else if (spec.kind === 'shevchenko') {
    const first = t.split(/(?<=[.!?])\s+/)[0] ?? ''
    // the dictionary is mostly quotations: a sentence is a gloss only when it carries the dictionary's own count «(40)» and no siglum («Мисль, міркування (40).»)
    gloss = !new RegExp(SIGLUM_SHEV.source, 'u').test(first) && /\(\d+\)\s*\.?$/.test(first) ? first.replace(/\s*\(\d+\)\s*\.?$/, '') : ''
    for (const m of t.matchAll(SIGLUM_SHEV)) if (sigla.length < 3) sigla.push(`${m[1]} ${m[2]}.${m[3]}`)
    quote = undefined
  } else {   // materials, bn, zakrevsky: the first sentence is the gloss; the rest quotations
    const sents = t.split(/(?<=[.!?])\s+(?=[А-ЯІЇЄ«"(])/)
    gloss = sents[0] ?? ''
    quote = sents.slice(1).join(' ') || undefined
    if (spec.kind === 'materials') for (const m of t.matchAll(SIGLUM_GEN)) if (sigla.length < 3) sigla.push(m[1]!.trim())
  }
  if (spec.kind === 'materials') { const y = yearIn(t, 1800); if (y) dates.push([y, y]) }   // «Луцьк. 1567, л.57»; bn / zakrevsky quote no dated source: the coverage period applies
  for (const s of sigla) { const y = siglaYears.get(s); if (y && !dates.length) dates.push([y, y]) }
  gloss = trimTo(gloss.replace(/\s+/g, ' ').replace(ETYM, '').replace(/^[\s,.;:–—-]+/, '').replace(/[\s,;:.]+$/, ''), GLOSS_MAX)
  return { n, gloss, dates, sigla, ...(spec.keepQuotes && quote ? { quote: trimTo(quote, 120) } : {}), period: !dates.length }
}

/** parse one article (headword + body); undefined = below the quality gate (the caller counts it as skipped) */
export function parseArticle(spec: ParseSpec, a: RawArticle, siglaYears: Map<string, number> = new Map()): ParsedEntry | 'xref' | undefined {
  const variants = a.variants.map(v => v.toLowerCase().replace(/[\d¹²³]+$/, '')).filter(headwordOk)
  const score = ocrScore(a.body)
  if (!variants.length || score < spec.minScore) return undefined
  let body = a.body.replace(/^\(\d+\)\.?\s*/, '')
  const pm = (spec.kind === 'shevchenko' ? POS_CAP : spec.kind === 'bn' || spec.kind === 'zakrevsky' ? /^$/ : POS).exec(body); const pos = pm ? pm[0].replace(/[,\s]+$/, '').slice(0, 24) : undefined
  if (pm) body = body.slice(pm[0].length)
  body = body.replace(ETYM, '')
  let pos2 = pos
  if (a.gram) pos2 = a.gram   // «(и. с. ж. р.)» = the dictionary's grammar mark
  if (XREF.test(body.trim()) && body.trim().length < 140) return 'xref'   // «Див. Астерія.» (a quotation may follow)
  const parts = splitSenses(body, spec.kind === 'bn' || spec.kind === 'zakrevsky' || spec.kind === 'materials')
  const senses = parts.map(p => senseOf(spec, p.n, p.text, siglaYears)).filter(s => s.gloss.length >= 2 || s.dates.length || s.sigla.length)
  const numbered = senses.filter(s => s.n > 0)
  const out = (numbered.length ? numbered : senses).filter(s => !s.gloss || glossClean(s.gloss))   // a garbled gloss is dropped, never shown
  if (!out.length) return undefined
  return { head: variants[0]!, variants, ...(pos2 ? { pos: pos2 } : {}), senses: out.slice(0, 8), score }
}

export interface ParseStats { pages: number; pagesSkipped: number; candidates: number; crossRefs: number; passed: number; skippedScore: number; skippedHead: number; skippedNoSense: number; entries: number; senses: number; dated: number; rows: number; passRate: number }
const XREF = /^[.\s]*(?:[а-яіїє]{1,7}\.\s*)*(?:[Дд]ив\.|См\.|См\b|Смотри)/
/** SE-11: one row per epoch bucket of the dated quotations of a sense (a sense quoted in the XV and the XVIII century is two rows, never one row spanning the epochs between) */
export function bucketDates(dates: [number, number][]): [number, number][] {
  const by = new Map<string, [number, number]>()
  for (const [a, b] of dates) {
    const k = epochsOf({ a, b, basis: 'quote' }).ids.join('+') || 'x', cur = by.get(k)
    by.set(k, cur ? [Math.min(cur[0], a), Math.max(cur[1], b)] : [a, b])
  }
  return [...by.values()].sort((x, y) => x[0] - y[0])
}
/**
 * one dictionary text → rows by headword spelling (lower case). Pages (form feed, when the OCR has them) below 0.5 are skipped as a whole. Cross-references («Див. X») are counted and left out of the pass rate:
 * passRate = passed / (candidates − crossRefs). `rows` counts the emitted (headword, row) pairs.
 */
export function parseDictionary(spec: ParseSpec, text: string, siglaYears: Map<string, number> = new Map()): { rows: [string, SeRow][]; stats: ParseStats } {
  const rows: [string, SeRow][] = [], st: ParseStats = { pages: 0, pagesSkipped: 0, candidates: 0, crossRefs: 0, passed: 0, skippedScore: 0, skippedHead: 0, skippedNoSense: 0, entries: 0, senses: 0, dated: 0, rows: 0, passRate: 0 }
  for (const page of text.split('\f')) {
    if (page.trim().length < 40) continue
    st.pages++
    if (ocrScore(page) < 0.5) { st.pagesSkipped++; continue }
    const arts = spec.kind === 'bn' || spec.kind === 'zakrevsky' ? splitCapArticles(page, spec.kind) : splitArticles(page)
    for (const a of arts) {
      st.candidates++
      if (!a.variants.some(v => headwordOk(v.toLowerCase()))) { st.skippedHead++; continue }
      if (XREF.test(a.body) && a.body.length < 90) { st.crossRefs++; continue }
      if (ocrScore(a.body) < spec.minScore) { st.skippedScore++; continue }
      const e = parseArticle(spec, a, siglaYears)
      if (e === 'xref') { st.crossRefs++; continue }
      if (!e) { st.skippedNoSense++; continue }
      st.passed++; st.entries++
      for (const s of e.senses) {
        st.senses++
        const base: SeRow = { d: spec.dict, g: s.gloss, ...(e.pos ? { p: e.pos } : {}), n: s.n || 1, ...(s.sigla.length ? { s: s.sigla.join('; ') } : {}), l: e.head, ...(s.quote ? { q: s.quote } : {}) }
        const dated = s.dates.length ? bucketDates(s.dates) : [undefined]
        if (s.dates.length) st.dated++
        for (const e2 of dated) for (const v of e.variants) { rows.push([v, e2 ? { ...base, e: e2 } : base]); st.rows++ }
      }
    }
  }
  const denom = st.candidates - st.crossRefs
  st.passRate = denom > 0 ? Math.round((st.passed / denom) * 1000) / 1000 : 0
  return { rows, stats: st }
}
