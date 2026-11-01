/**
 * SPEC 63 GG-19 (phraseology gap) — two public-domain proverb collections read from the archive.org OCR text layer (harvest/proverbs.ts):
 *  - Номис 1864, «Українські приказки, прислів'я і таке інше» (archive.org/details/nomis1864; Номис † 1866),
 *  - Франко, «Галицько-руські народні приповідки», Етнографічний збірник 10, 16, 24, 27, 28 (archive.org/details/etnohr_10 …; Франко † 1916; т. 23 has no text layer).
 * Pure (no node imports): text → candidate rows. The OCR is NOT proof-read: a row is kept only when it passes `charGate` (alphabet, length) and the build step's vocabulary gate; the rest is counted and dropped, never repaired.
 * Nothing is inferred: the place note of a Franko row is the abbreviation the print gives, resolved ONLY through the print's own register («Наг. — Нагуєвичі, село дрогобицького пов.»).
 */
import { toIish, toTsya, toUvati } from './gal-folds.ts'

export type ProvSource = 'nomis' | 'franko'
/** a row as the OCR gives it, before lemma linking */
export interface ProvCand {
  src: ProvSource
  /** archive.org item */ ia: string
  /** the proverb as printed (original orthography), whitespace and line-break hyphens normalised */ text: string
  /** other forms the same entry prints after « — » (Номис) */ variants?: string[]
  /** Франко: headword the entry is filed under, and the number inside it («Азбука. 2.») */ hw?: string; no?: number
  /** printed page (Франко: the next «— N —» foot line; undefined = no foot line found) */ page?: number
  /** Номис: the printed number of the entry (every tenth is printed), or the last printed number before it and the count since */ nomis?: { n: number; exact: boolean; since: number }
  /** the place / source abbreviation(s) printed after the text */ note: string[]
  /** verbatim OCR slice (≤ 280 chars) */ quote: string
}

const CYR = /[А-Яа-яІіЇїЄєҐґ]/
/** characters a clean proverb line may contain: Cyrillic, Ukrainian punctuation, apostrophes, digits are NOT allowed */
const OK_CHARS = /^[\p{Script=Cyrillic}\s.,;:!?…—–\-„“”«»"'’ʼ`()ѣ]+$/u

export const normWs = (s: string): string => s.normalize('NFC').replace(/¬\s*/g, '').replace(/([\p{L}])-\n\s*([\p{L}])/gu, '$1$2').replace(/\s+/g, ' ').trim()

/** alphabet / length gate: ≥ 2 words, 8–300 chars, only Cyrillic letters and punctuation, no stray capitals in the middle of a word (OCR junk), not mostly punctuation */
export function charGate(s: string): boolean {
  const t = s.trim()
  if (t.length < 8 || t.length > 300) return false
  if (!OK_CHARS.test(t)) return false
  const words = t.split(/[\s—–]+/).filter(w => /\p{L}/u.test(w))
  if (words.length < 2) return false
  if (words.some(w => /\p{Ll}\p{Lu}|\p{Lu}{2,}\p{Ll}/u.test(w.replace(/^.*?[-'’ʼ]/, '')))) return false
  const letters = (t.match(/\p{L}/gu) ?? []).length
  return letters / t.length > 0.7 && CYR.test(t)
}

// ── Франко: the register of abbreviations ─────────────────────────────────────────────────────────
export interface RegEntry { abbr: string; name: string; kind: 'place'; /** the county as the print gives it, adjective nominative («дрогобицький») */ county?: string; desc: string }
export const abbrKey = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[^а-яіїєґ]/g, '').replace(/[іи]/g, 'і')
const PLACE_WORD = '(?:село|місто|міеточко|місточко|містечко|міст|слобода|хутір|осада)'
/** the adjective of a county from the genitive the print uses («дрогобицького» → «дрогобицький») */
export const countyAdj = (gen: string): string => gen.replace(/ого$/, 'ий').replace(/ього$/, 'ій').replace(/ського$/, 'ський')
/** a closed list of the Austrian counties (повіти) of Galicia and Bukovyna, used ONLY to repair one OCR letter of the county the register prints (the print's own summary, т. III вип. 2, counts the counties of the 477 places): it asserts nothing by itself, a county is shown only when the register of the print names it */
export const POVITS = ['бережанський', 'березівський', 'бжеський', 'бобрецький', 'богородчанський', 'борщівський', 'брідський', 'бучацький', 'вижницький', 'горлицький', 'городенківський', 'городоцький', 'грибівський', 'гусятинський', 'добромильський', 'долинський', 'дрогобицький', 'жидачівський', 'жовківський', 'заліщицький', 'збаразький', 'золочівський', 'калуський', 'кам’янецький', 'коломийський', 'косівський', 'лісський', 'львівський', 'мостиський', 'надвірнянський', 'перемишлянський', 'підгаєцький', 'радехівський', 'рогатинський', 'рудецький', 'самбірський', 'сколівський', 'снятинський', 'сокальський', 'станіславівський', 'старосамбірський', 'стрийський', 'сяніцький', 'теребовельський', 'тернопільський', 'тлумацький', 'турецький', 'скалатський', 'чортківський', 'ярославський', 'кіцманський', 'сторожинецький', 'чернівецький', 'заставнівський', 'рава-руський', 'сабінівський', 'яворівський', 'ліський', 'кам’янко-струмилівський', 'болехівський', 'товмацький', 'перемиський', 'підволочиський', 'волочиський', 'бродівський']
const lev1 = (a: string, b: string): boolean => {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0; while (i < a.length && a[i] === b[i]) i++
  const x = a.slice(i + 1), y = b.slice(i + 1)
  return x === y || a.slice(i) === y || x === b.slice(i)
}
/** the county as one of POVITS, or undefined (garbled OCR is never guessed beyond one letter, and only when exactly one county fits) */
export function fixCounty(c: string): string | undefined {
  const s = c.toLowerCase().replace(/[^а-яіїєґ’-]/g, '').replace(/ʼ|'/g, '’')
  if (POVITS.includes(s)) return s
  const hit = POVITS.filter(p => lev1(s, p))
  return hit.length === 1 ? hit[0] : undefined
}
/** a place name as the register prints it: the leading dash and spaced letters («Ж и дачі в») cleaned; undefined when nothing readable is left */
export function cleanName(n: string): string | undefined {
  let s = n.replace(/[^\p{L}’' -]/gu, ' ').replace(/^[\s-]+/, '').trim()
  if (/^(?:\p{L} ){2,}/u.test(s + ' ')) s = s.replace(/(?<=\p{L}) (?=\p{L}(?: |$))/gu, '')
  s = s.replace(/\s+/g, ' ').trim()
  return /^\p{Lu}[\p{L}’' -]{2,40}$/u.test(s) ? s : undefined
}
/**
 * the registers of abbreviations printed in the volumes: «Наг. — Нагуєвичі, село дрогобицького пов.»; also «Коб. Кобил. — Кобилоловя, село теребовельського пов.» (two abbreviations, one place).
 * A line whose description names a village/town and a county is a place; any other description (a book, a manuscript, a person) is a collection.
 */
export function parseRegistry(text: string): Map<string, RegEntry> {
  const out = new Map<string, RegEntry>()
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^[\s|!'’:;\[\]‘І\-ЇІ]+(?=[А-ЯІЇЄҐ])/u, '').trim()
    const m = /^([А-ЯІЇЄҐ][\p{L}. ]{0,20}?)\s*[—–-]{1,3}\s*[гГ-]?\s*(.{3,160})$/u.exec(line)
    if (!m) continue
    const abbrs = m[1]!.split(/(?<=\.)\s+/).map(s => s.trim()).filter(Boolean)
    if (!abbrs.length || abbrs.some(a => abbrKey(a).length < 1 || abbrKey(a).length > 12)) continue
    const desc = m[2]!.trim()
    const pm = new RegExp(`^(.{2,60}?),?\\s*${PLACE_WORD}\\s+([\\p{L}]+?(?:ського|цького|зького|ького|ого))\\s+пов`, 'iu').exec(desc)
    const lm = new RegExp(`^(.{2,60}?)\\s*[—–-]\\s*${PLACE_WORD}\\s+([\\p{L}]+(?:ського|цького|зького))\\s+пов`, 'iu')
    const pm2 = pm ?? lm.exec(desc)
    if (!pm2) continue
    for (const a of abbrs) {
      const k = abbrKey(a); if (!k) continue
      const county = fixCounty(countyAdj(pm2[2]!.toLowerCase())), name = cleanName(pm2[1]!)
      if (!name) continue
      const old = out.get(k)
      if (!old || (!old.county && county)) out.set(k, { abbr: a.replace(/\.$/, ''), name, kind: 'place', ...(county ? { county } : {}), desc })
    }
  }
  return out
}

// ── Франко: the entries ───────────────────────────────────────────────────────────────────────────
const ENTRY_START = /^(?:([А-ЯІЇЄҐ][\p{L}'’ʼ—–. -]{1,34}?)[.;:]\s*)?(\d{1,3})\s?[.,]\s+(?=\S)/u
const PAGE_MARK = /^\s*[—–-]{1,2}\s*(\d{1,3})\s*[—–-]{1,2}\s*$/
const NOTE = /\(\s*([А-ЯІЇЄҐ][\p{L}'’ʼ. -]{0,22}?)\s*\)/u
/** Франко: candidates of one volume. `vol` = the number printed on the title (10, 16, 24, 27, 28), `ia` the archive.org item. */
export function parseFranko(text: string, ia: string): ProvCand[] {
  const lines = text.split('\n')
  const marks: { line: number; n: number }[] = []
  let prev = 0
  const all: { line: number; n: number }[] = []
  lines.forEach((l, i) => { const m = PAGE_MARK.exec(l); if (m) all.push({ line: i, n: +m[1]! }) })
  all.forEach((c, i) => { const nx = all[i + 1], ok = !!nx && nx.n > c.n && nx.n - c.n <= 6; if (c.n > prev && (prev === 0 ? ok : c.n - prev <= 6 || ok)) { marks.push(c); prev = c.n } })
  const pageAt = (line: number): number | undefined => { let lo = 0, hi = marks.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (marks[mid]!.line >= line) hi = mid; else lo = mid + 1 } const m = marks[lo]; return m && m.line - line <= 120 ? m.n : undefined }
  const out: ProvCand[] = []
  let hw = ''
  let cur: { start: number; hw: string; no: number; parts: string[] } | undefined
  const flush = () => {
    if (!cur) return
    const joined = cur.parts.join('\n'), flat = normWs(joined)
    const m = NOTE.exec(flat)
    if (m && m.index > 0) {
      const body = flat.slice(0, m.index).trim()
      const notes = m[1]!.split(/\.\s+|,\s*/).map(x => x.replace(/\.$/, '').trim()).filter(Boolean)
      if (body && cur.no >= 1) out.push({ src: 'franko', ia, text: body.replace(/\s+([.,;:!?])/g, '$1'), hw: cur.hw, no: cur.no, page: pageAt(cur.start), note: notes.slice(0, 3), quote: flat.slice(0, 280) })
    }
    cur = undefined
  }
  lines.forEach((raw, i) => {
    const l = raw.trim()
    if (!l) { flush(); return }
    const m = ENTRY_START.exec(l)
    if (m && /\p{L}/u.test(l.slice(m[0].length, m[0].length + 3))) {
      flush()
      if (m[1]) hw = normWs(m[1]).replace(/[.;:]$/, '')
      cur = { start: i, hw, no: +m[2]!, parts: [l.slice(m[0].length)] }
    } else if (cur) cur.parts.push(l)
  })
  flush()
  return out
}

// ── Номис ─────────────────────────────────────────────────────────────────────────────────────────
const TAIL_TOKEN = /^\[?[А-ЯІЇЄҐ0-9][\p{L}0-9]{0,6}\.?\]?[,;]?$/u
/** the line range of the proverbs in the 1864 print: from the first numbered entry «1. Хто за ВІРУ» up to the heading «Загадки» (riddles) */
export function nomisBody(text: string): string[] {
  const lines = text.split('\n')
  const a = lines.findIndex(l => /^1\.\s+Хто за ВІРУ/i.test(l)), b = lines.findIndex((l, i) => i > a && /^Загадки\s+1\W+505/.test(l.trim()))
  return a < 0 ? [] : lines.slice(a, b < 0 ? undefined : b)
}
/** the trailing source abbreviations of an entry: «… , а Біг кулі носить. Ил., Бан., Б.» → ['Ил','Бан','Б'] and the text before them */
export function splitTail(s: string): { body: string; note: string[] } | undefined {
  const toks = s.trim().split(/\s+/)
  let i = toks.length
  // from the end: an abbreviation (or its page number); a further one only while it ends in «,» / «;» (a list «Ил., Бан., Б.»), so a capitalised last word of the text («… або Турка. Просте.») stays in the text
  while (i > 0) {
    const t = toks[i - 1]!, isNum = /^\d+\.?$/.test(t)
    if (!isNum && !TAIL_TOKEN.test(t)) break
    if (i < toks.length && !/[,;]$/.test(t) && !isNum) break
    i--
  }
  const tail = toks.slice(i).filter(t => !/^\d+\.?$/.test(t)), body = toks.slice(0, i).join(' ')
  if (!tail.length || !/[\p{Ll}!?…».,)]$/u.test(body)) return undefined
  return { body, note: tail.map(t => t.replace(/[\[\].,;]/g, '')).filter(Boolean) }
}
/** Номис: entries of the body. An entry ends at the line that ends in source abbreviations; «( 1 )» / «(*)» footnote lines, entries with a footnote mark and entries without a tail are dropped. */
export function parseNomis(text: string, ia = 'nomis1864'): ProvCand[] {
  const out: ProvCand[] = []
  let buf: string[] = [], anchor = 0, since = 0, exactNo: number | undefined
  const reset = () => { buf = []; exactNo = undefined }
  for (const raw of nomisBody(text)) {
    const l = raw.trim()
    if (!l) { reset(); continue }
    if (/^\(\s*[*\d!1]\s*[\])]|\(\s*[*]\s*\)/u.test(l)) { reset(); continue }   // footnote line
    const num = /^(\d{1,5})\s?\.\s+(?=\S)/u.exec(l)
    let line = l
    if (num) { const n = +num[1]!; if (n > anchor && (n - anchor <= 60 || (n % 10 === 0 && n - anchor <= 200))) { if (buf.length) { buf = [] } anchor = n; since = 0; exactNo = n; line = l.slice(num[0].length) } }
    buf.push(line)
    const joined = normWs(buf.join('\n'))
    if (joined.length > 520) { reset(); continue }
    const t = splitTail(joined)
    if (!t || /[,;]$/.test(joined)) continue   // «Ил.,» ends a line inside a list of sources: the list goes on in the next line
    since += exactNo === undefined ? 1 : 0
    if (!/\(\s*[*\d]\s*\)|\(\*\)/.test(t.body)) {
      const parts = t.body.split(/\s[—–]\s/).map(s => s.trim()).filter(Boolean)
      const first = parts[0] ?? ''
      out.push({ src: 'nomis', ia, text: first.replace(/\s+([.,;:!?])/g, '$1').replace(/^\.\.\.\s*/, ''), ...(parts.length > 1 ? { variants: parts.slice(1, 4) } : {}), nomis: { n: anchor, exact: exactNo !== undefined, since: exactNo !== undefined ? 0 : since }, note: t.note, quote: joined.slice(0, 280) })
    }
    reset()
  }
  return out
}

// ── lemma linking ─────────────────────────────────────────────────────────────────────────────────
/** spelling candidates of an old-orthography word, most literal first (the build step takes the first one VESUM knows) */
export function foldCandidates(w: string): string[] {
  const l = w.normalize('NFC').toLowerCase().replace(/['`ʼ]/g, '’')
  const c = new Set<string>([l])
  const base = [l, l.replace(/ї(?=[^\p{L}]|$)/gu, 'і').replace(/(?<=[бвгґджзклмнпрстфхцчшщ])ї/gu, 'і'), l.replace(/ѣ/g, 'і').replace(/ы/g, 'и').replace(/ъ$/g, '')]
  for (const b of base) {
    c.add(b)
    c.add(b.replace(/цця$/, 'ться').replace(/юцця$/, 'ються').replace(/уцця$/, 'уться').replace(/ицця$/, 'иться'))
    c.add(b.replace(/(цьця|цця)$/, 'ться'))
    c.add(toTsya(b)); c.add(toIish(b)); c.add(toUvati(b))
    c.add(b.replace(/є$/, 'е').replace(/ії$/, 'ії'))
    c.add(b.replace(/(^|[^аеиіоуяюєї])ь(?=[^\p{L}]|$)/gu, '$1ь'))
    c.add(b.replace(/ннє$/, 'ння').replace(/ньє$/, 'ння'))
    c.add(b.replace(/ою$/, 'ою').replace(/ої$/, 'ої'))
    c.add(b.replace(/ий$/, 'ий').replace(/ій$/, 'ий'))
    c.add(b.replace(/е$/, 'є'))
  }
  return [...c].filter(Boolean)
}
/** words of a proverb: letters with apostrophes/hyphens, and the reflexive «ся» written apart («кінчить ся») glued to the verb */
export function proverbWords(text: string): string[] {
  const raw = text.normalize('NFC').split(/[^\p{L}'’ʼ`-]+/u).map(w => w.replace(/^[-'’ʼ`]+|[-'’ʼ`]+$/g, '')).filter(Boolean)
  const out: string[] = []
  for (const w of raw) {
    const lw = w.toLowerCase()
    if ((lw === 'ся' || lw === 'сь' || lw === 'си' || lw === 'сї') && out.length) out[out.length - 1] += lw === 'сь' ? 'сь' : 'ся'
    else out.push(w)
  }
  return out
}

/** the 'place of recording' of a Франко row, graded. gr: p = the abbreviation is a village/town of the print's register (county printed); c = names a book, manuscript or collector (not a place); u = not in the register (OCR damage or a source the registers do not list) */
export interface PlaceNote { a: string; n?: string; c?: string; gr: 'p' | 'u'; /** region of the place: id in AREAS (core/dict-labels.ts); the print is of Eastern Galicia and Bukovyna only */ ar?: string }
export function placeNote(abbr: string, reg: Map<string, RegEntry>): PlaceNote {
  const e = reg.get(abbrKey(abbr))
  if (!e) return { a: abbr, gr: 'u' }
  return { a: abbr, n: e.name, c: e.county, gr: 'p', ar: 'halychyna' }
}

/** short locator: «т. 10, с. 5, Азбука 1» / «Ном. №80» / «Ном. після №80, +4» */
export function locatorOf(c: ProvCand): string {
  if (c.src === 'franko') return `${c.ia.replace(/^(?:nplu-)?etnohr_/, 'ЕЗ т. ')}${c.page ? `, с. ${c.page}` : ''}, «${c.hw || '—'}» ${c.no}`
  const n = c.nomis!
  return n.exact ? `Ном. №${n.n}` : `Ном. після друкованого №${n.n}, ще ~${n.since} записів (лічба за OCR, наближена)`
}
