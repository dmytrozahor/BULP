/**
 * SPEC 63 LB-11 — article parser for Аркушин Г. «Словник західнополіських говірок» (Луцьк: Вежа, 2000, 2 тт.; archive.org item `slzhdplhv`, OCR text layer of the scan). Pure (no node imports).
 * © policy (as for СУМ, GG-7): the output keeps ONLY the headword, POS/grammar, the dialect region (all entries are «західнополіське»), the villages the entry names (by the book's own
 * numbered «Список населених пунктів», vol. 1 pp. XIV–XXIV), sense numbers, a gloss of at most 200 characters (word boundary, «…») and the volume/page. The dialect transcription in
 * brackets, the illustrative utterances (the author's field recordings) and the proverbs/songs are NEVER taken. No full-definition field exists here.
 *
 * Layout of an article (preface «Структура словникової статті», vol. 1): HEADWORD in capitals · [transcription with stress] · grammar remarks («-и, ж.», «-айу, -айеш, недок.», «3 ос. одн. авкайе,
 * недок.», «прис.», «виг.», «част.», …) · [usage/sphere label: дит., бот., орн., ент., мед., реліг., кулін., їхт.] · the sense(s) in quotation marks, several senses numbered «1. … 2. …» · the illustration
 * · village numbers (the first = the village of the illustration; «усі н. пп.» / «у багатьох н. пп.» = the word is general). OCR of the scan: quotation marks, brackets and the stress are unreliable,
 * so a quote mark is only a hint; every headword passes the quality gates (capitals form, `headwordOk`, the page's running-head range, `ocrScore` of the gloss) and nothing garbled gets in.
 */
import { GLOSS_MAX, headwordOk, ocrScore } from './se-parse.ts'
import { clip } from './sum-import.ts'
import { inPageRange } from './sum-article.ts'

export const ARK_DICT = 'arkushyn'
export const ARK_LABEL = 'зпол.'
export const ARK_SHORT = 'Аркушин, Словник західнополіських говірок (2000)'
export const ARK_ITEM = 'https://archive.org/details/slzhdplhv'
/** usage labels of the preface list that are registers the project already knows (the sphere labels бот., орн., ент., мед., реліг., кулін., їхт. and дит., нар. are kept out of `lb`: they are no register) */
const REG_LABELS: Record<string, string> = { 'жарт': 'жарт.', 'ірон': 'ірон.', 'знев': 'зневажл.', 'пестл': 'пестл.', 'евф': 'евф.', 'лайл': 'лайл.' }
const SPHERE = ['бот', 'орн', 'ент', 'мед', 'реліг', 'кулін', 'їхт', 'дит', 'нар', 'згруб', 'зменш', 'збір', 'перев', 'перен', 'пас', 'безос', 'підсил', 'запереч']
const LABS = [...Object.keys(REG_LABELS), ...SPHERE]
const LAB_RE = new RegExp(`^[\\s,;]*(${LABS.join('|')})\\.(?=[\\s,;"'“«]|$)`, 'u')

export interface ArkStats {
  pages: number; lines: number; candidates: number
  badHead: number; outOfRange: number; noGram: number; noSense: number; badGloss: number
  entries: number; senses: number; clipped: number; withVillages: number; villageHits: number; unknownVillage: number
}
export const newArkStats = (): ArkStats => ({ pages: 0, lines: 0, candidates: 0, badHead: 0, outOfRange: 0, noGram: 0, noSense: 0, badGloss: 0, entries: 0, senses: 0, clipped: 0, withVillages: 0, villageHits: 0, unknownVillage: 0 })
/** pass rate of the candidate articles: entries with a clean headword and at least one clean sense gloss / candidates */
export const arkPassRate = (s: ArkStats): number => (s.candidates ? Math.round((s.entries / s.candidates) * 1000) / 1000 : 0)

// ── villages (vol. 1, «Список населених пунктів») ─────────────────────────────────────────────────────
export interface Villages { byNo: Map<number, string>; names: string[] }
const VILLAGE_LINE = /(району|гміни|повіту|області|воєводства|Польща|Польша|Білорусь)/u
/**
 * The book numbers the villages 1…540. The OCR of the list prints the numbers in blocks and the names in blocks of the same length; the block of 1–50 lost the names 45–50
 * (checked: 44 names in the first block, 92 names for the numbers 327–418, 540 − 6 = 534 names in total, and the home village of the author, the most frequent number 392, is «Сильно Ківерцівського району»
 * at name 386). The names after the sixth lost one are therefore numbered i + 7. A list that does not have exactly this shape yields no villages (the place is then left out, never guessed).
 */
export function parseVillages(prelimLines: string[]): Villages {
  const s = prelimLines.findIndex(l => /^Список населених пунктів/u.test(l.trim()))
  if (s < 0) return { byNo: new Map(), names: [] }
  const names: string[] = []
  for (const raw of prelimLines.slice(s + 1)) {
    const l = raw.trim()
    if (/^А АДЮЧИНА/u.test(l)) break
    if (VILLAGE_LINE.test(l) && l.length > 8 && /^[А-ЯІЇЄҐ]/u.test(l)) names.push(l.replace(/\s+/g, ' ').replace(/\s*(?:Республіки)?$/u, m => m))
  }
  const byNo = new Map<number, string>()
  if (names.length !== 534) return { byNo, names }
  names.forEach((n, i) => byNo.set(i < 44 ? i + 1 : i + 7, n))
  return { byNo, names }
}

// ── entry splitting ────────────────────────────────────────────────────────────────────────────────────
const CAPS = String.raw`[А-ЯІЇЄҐ][А-ЯІЇЄҐ'’ʼ\-]*`
/** an entry starts with the headword in capitals and then a transcription bracket, a quote, or the grammar remark */
const START = new RegExp(String.raw`^(${CAPS}(?: ${CAPS}){0,3})([!?"':¹²³\d]{0,3})\s*(?=[(|\[Гг]?[(|\[]|\s-[а-яіїєґ]|\s(?:ч|ж|с|мн|прис|прий|спол|слол|част|виг|займ|числ|прик|ім|недок|док)\.)`, 'u')
const START1 = /^([А-ЯІЇЄҐ])(?=\s*[(|\[])/u

/** the running head of a page: the first and the last headword (capitals) of the page */
export function runningHead(line0: string): { lo?: string; hi?: string } {
  const w = line0.match(/[А-ЯІЇЄҐ][А-ЯІЇЄҐ'’\-]{1,}/gu) ?? []
  return w.length ? { lo: w[0]!, hi: w.length > 1 ? w[w.length - 1]! : w[0]! } : {}
}
const isPageNo = (l: string): boolean => /^\d{1,3}$/.test(l) || /^[А-ЯІЇЄҐа-яіїєґ]{1,2},\s*\d{1,3}$/u.test(l)
const isLetterHead = (l: string): boolean => /^[А-ЯІЇЄҐ]$/u.test(l)

export interface ArkEntryRaw { text: string; page: number; lo?: string; hi?: string }
/** the page texts of a volume (index = scan page; `firstBody` = the scan page whose number is `firstNo`) → the raw entries, a trailing entry continued on the next page is joined */
export function splitEntries(pages: string[], pageNo: (i: number) => number | undefined, st: ArkStats): ArkEntryRaw[] {
  const out: ArkEntryRaw[] = []
  let cur: ArkEntryRaw | undefined
  pages.forEach((p, i) => {
    const no = pageNo(i); if (no === undefined) return
    const lines = p.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return
    st.pages++
    const rh = runningHead(lines[0]!)
    for (const l of lines.slice(1)) {
      if (isPageNo(l) || isLetterHead(l)) continue
      st.lines++
      if (START.test(l) || START1.test(l)) {
        if (cur) out.push(cur)
        cur = { text: l, page: no, ...rh }
      } else if (cur) {
        const t = cur.text
        cur.text = /[А-Яа-яІіЇїЄєҐґ]-$/u.test(t) && /^[а-яіїєґ]/u.test(l) ? t.slice(0, -1) + l : t + ' ' + l
      }
    }
  })
  if (cur) out.push(cur)
  return out
}

// ── grammar ────────────────────────────────────────────────────────────────────────────────────────────
const END = String.raw`[а-яіїєґ'’ʼ]{1,8}`
const GRAMS: RegExp[] = [
  new RegExp(String.raw`-${END}(?:,\s*-${END})?,?\s*(?:ч|ж|с|мн|у|м)\.(?:\s*і\s*(?:ч|ж|с)\.)?`, 'u'),                                                   // -и, ж.   -а, ч.   -ів, мн.
  new RegExp(String.raw`(?:3\s*ос\.\s*(?:одн|мн)\.\s*[а-яіїєґ'’ʼ]+,\s*)?(?:-${END},\s*-${END},\s*)?(?:недок|док)\.`, 'u'),                       // -айу, -айеш, недок.   3 ос. одн. авкайе, недок.
  new RegExp(String.raw`-${END},\s*-${END}(?=[\s,."'“«]|$)`, 'u'),                                                                                  // -а, -е  (adjective)
  /(?:прис|прий|спол|слол|част|виг|займ|числ|прик|ім|присл|незм|безос)\./u,
]
const POS_FIX: [RegExp, string][] = [[/слол\./u, 'спол.'], [/прик\./u, 'прикм.']]
const QUOTE = /["'“”«»„‘’]/u
const isQuoteMark = (t: string, i: number): boolean => {
  const c = t[i]!
  if (!QUOTE.test(c)) return false
  const a = t[i - 1] ?? ' ', b = t[i + 1] ?? ' '
  return !(/\p{L}/u.test(a) && /\p{L}/u.test(b))   // letter'letter is an apostrophe
}

interface GramHit { start: number; end: number; text: string }
function findGram(rest: string): GramHit | undefined {
  const lim = rest.slice(0, 170)
  let best: GramHit | undefined
  for (const re of GRAMS) {
    const m = re.exec(lim); if (!m) continue
    // the grammar remark must not sit inside a quotation (a gloss that mentions «недок.»)
    let q = 0; for (let i = 0; i < m.index; i++) if (isQuoteMark(lim, i)) q++
    if (q > 1) continue
    if (!best || m.index < best.start) best = { start: m.index, end: m.index + m[0].length, text: m[0] }
  }
  return best
}

// ── senses ─────────────────────────────────────────────────────────────────────────────────────────────
/** sense numbers 1, 2, 3 … in the body (OCR: «/.», «І.» for «1.»; a missing dot): consecutive only */
function splitSenses(body: string): { n: number; text: string }[] {
  const marks: { n: number; at: number; end: number }[] = []
  let want = 1
  const re = /(?:^|[;.\s])\s*(\d{1,2}|[/lІI])[.)]?\s+(?=["'“«„‘]?[а-яіїєґА-ЯІЇЄҐ(])/gu
  for (const m of body.matchAll(re)) {
    const raw = m[1]!, n = /\d/.test(raw) ? Number(raw) : 1
    if (n === want && (want > 1 || m.index! < 6)) { marks.push({ n, at: m.index!, end: m.index! + m[0].length }); want++ }
  }
  if (!marks.length) return [{ n: 1, text: body }]
  return marks.map((m, i) => ({ n: m.n, text: body.slice(m.end, marks[i + 1]?.at ?? body.length) }))
}

/** labels at the start of a sense; the definition up to the closing quotation mark, the village numbers or a «(усі н. пп.)» note. The illustration is never taken. */
function senseOf(text: string): { labels: string[]; gloss: string; tail: string } {
  let t = text.replace(/\s+/g, ' ').replace(/^[\s,;.\\]+/, ''), labels: string[] = []
  for (let i = 0; i < 4; i++) { const l = LAB_RE.exec(t); if (!l) break; const k = REG_LABELS[l[1]!]; if (k && !labels.includes(k)) labels.push(k); t = t.slice(l[0].length) }
  t = t.replace(/^[\s,;.\\]+/, '')
  // an opening quotation mark (when the OCR kept it)
  const open = /^["'“«„‘]\s*/u.exec(t); if (open) t = t.slice(open[0].length)
  // the end of the definition: the first closing quotation mark, else a note about the villages, else a number block, else the end of the first sentence
  let end = t.length
  for (let i = 1; i < t.length; i++) if (isQuoteMark(t, i) || t[i] === '!' && /\s|$/.test(t[i + 1] ?? ' ') && /[\p{L})]/u.test(t[i - 1] ?? '')) { end = i; break }
  const cut = [t.search(/\s\((?:усі|всі|у багатьох|у кількох|у деяких)\s*н\.\s*пп?\.|\s\(\d/u), t.search(/\s\d{1,3}(?:\s*[,;.]\s*\d{1,3})*\s*[.;,]?\s*$/u), t.search(/[.]\s+(?=[А-ЯІЇЄҐ])/u)].filter(x => x > 0)
  end = Math.min(end, ...cut)
  let gloss = t.slice(0, end).replace(/\s+/g, ' ').replace(/[\s,;:.]+$/, '').trim()
  // the Latin binomial after «;» is OCR-garbled Cyrillic: clauses are kept from the left while they read as words
  const parts = gloss.split(/;\s*/), keep: string[] = []
  for (const p of parts) { if (ocrScore(p) >= 0.8 && !/[А-ЯІЇЄҐ]{3,}/.test(p.replace(/[А-ЯІЇЄҐ]{3,}(?=[\s,]|$)/g, '')) || /^(?:те,? що|тс,? що|те саме)/iu.test(p)) keep.push(p); else break }
  gloss = keep.filter(p => !/^[А-ЯІЇЄҐ][а-яіїєґ]+ [а-яіїєґ]+(?: [А-ЯІЇЄҐ]\.?)?$/u.test(p)).join('; ').replace(/^[^(]*\)\s*/u, m => (m.includes('(') ? m : '')).replace(/\s+[ІI]$/u, '')
  return { labels, gloss: clip(gloss, GLOSS_MAX), tail: t.slice(end) }
}

const glossClean = (g: string): boolean => g.length >= 3 && /\p{L}{2}/u.test(g) && ocrScore(g.replace(/\([^)]{0,40}\)/g, ' ').replace(/[А-ЯІЇЄҐ]{3,}/g, ' ')) >= 0.8 && !/\d/.test(g.replace(/\([^)]*\)/g, ''))

/** the village numbers of an entry (after the definition; «Холм 35» is a page of the author's article, not a village) */
export function villageNumbers(tail: string): { nums: number[]; all: boolean; holm: boolean } {
  const holm = /Холм\s*\d/u.test(tail), all = /(?:усі|всі|у багатьох|у кількох|у деяких)\s*н\.\s*пп?\./u.test(tail)
  const t = tail.replace(/Холм\s*\d+/gu, ' ').replace(/\([^)]{0,60}\)/g, ' ')
  const nums: number[] = []
  for (const m of t.matchAll(/(?<![\p{L}\d.'’-])(\d{1,3})(?![\d\p{L}])/gu)) { const n = Number(m[1]); if (n >= 1 && n <= 540 && !nums.includes(n)) nums.push(n) }
  return { nums, all, holm }
}

export interface ArkRow {
  head: string
  pos?: string
  vol: number
  page: number
  senses: { n: number; labels: string[]; gloss: string; oq?: 1 }[]
  /** villages named by the entry (the book's own list, verbatim), the first up to three */ v?: string[]
  /** number of villages named */ vn?: number
  /** the entry says «усі н. пп.» / «у багатьох н. пп.» */ all?: boolean
  /** recorded from Холмщина emigrants */ holm?: boolean
}

/** the entries of one volume */
export function parseArkushyn(pages: string[], vol: number, pageNo: (i: number) => number | undefined, villages: Villages = { byNo: new Map(), names: [] }): { rows: ArkRow[]; stats: ArkStats } {
  const st = newArkStats(), rows: ArkRow[] = []
  for (const e of splitEntries(pages, pageNo, st)) {
    st.candidates++
    const m = START.exec(e.text) ?? START1.exec(e.text)!
    const head = m[1]!.replace(/[!?"':]+$/, '').replace(/[’ʼ]/g, "'").toLowerCase()
    if (!/^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(head) || !headwordOk(head)) { st.badHead++; continue }
    if (!inPageRange(head, e.lo, e.hi)) { st.outOfRange++; continue }
    const rest = e.text.slice(m[0].length).trim()
    const g = findGram(rest)
    // the body: after the grammar remark; without one, from the first quotation mark after the transcription
    let body: string, pos: string | undefined
    if (g) { body = rest.slice(g.end); pos = POS_FIX.reduce((s, [r, v]) => s.replace(r, v), g.text).replace(/\s+/g, ' ').slice(0, 40) }
    else {
      let q = -1; for (let i = 0; i < rest.length; i++) if (isQuoteMark(rest, i) && (i === 0 || /\s|[|)]/.test(rest[i - 1]!))) { q = i; break }
      if (q < 0) { st.noGram++; continue }
      body = rest.slice(q)
    }
    // the transcription may still stand in front of the first sense when the grammar remark is missing: skip a leading bracket group
    body = body.replace(/^[\s,;]*(?:[|(\[][^|)\]]{0,60}[|)\]])?/u, m2 => m2)
    const senses: ArkRow['senses'] = []
    let tailAll = ''
    for (const s of splitSenses(body).slice(0, 12)) {
      const x = senseOf(s.text); tailAll += ' ' + x.tail
      if (!x.gloss) continue
      if (!glossClean(x.gloss.replace(/…$/, ''))) { st.badGloss++; senses.push({ n: s.n, labels: x.labels, gloss: '', oq: 1 }); continue }
      senses.push({ n: s.n, labels: x.labels, gloss: x.gloss })
    }
    if (!senses.length) { st.noSense++; continue }
    if (senses.every(s => s.oq)) continue   // all glosses garbled: the headword alone is not emitted either (nothing to stand behind)
    const vn = villageNumbers(tailAll + ' ' + body.slice(-120))
    const names = vn.nums.map(n => villages.byNo.get(n)).filter((x): x is string => !!x)
    st.unknownVillage += vn.nums.length - names.length
    if (names.length) { st.withVillages++; st.villageHits += names.length }
    st.entries++; st.senses += senses.length; st.clipped += senses.filter(s => s.gloss.endsWith('…')).length
    rows.push({ head, ...(pos ? { pos } : {}), vol, page: e.page, senses, ...(names.length ? { v: names.slice(0, 3), vn: names.length } : {}), ...(vn.all ? { all: true } : {}), ...(vn.holm ? { holm: true } : {}) })
  }
  return { rows, stats: st }
}

/** parsed articles → SE rows [headword, row] in the shape of core/se.ts (d `arkushyn`, lb `зпол.` + the registers the entry prints) */
export function arkRows(a: ArkRow): [string, import('./se.ts').SeRow][] {
  return a.senses.map(s => [a.head, {
    d: ARK_DICT, g: s.gloss, ...(a.pos ? { p: a.pos } : {}), n: s.n, l: `т.${a.vol} с.${a.page}`, lb: [ARK_LABEL, ...s.labels],
    ...(s.oq ? { oq: 1 as const } : {}), ...(a.v ? { v: a.v, vn: a.vn } : {}), ...(a.all ? { va: 1 as const } : {}),
  }])
}
