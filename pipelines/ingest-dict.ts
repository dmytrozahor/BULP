/**
 * Historical-dictionary ingester (BL-11): Словник староукраїнської мови XIV–XV ст. (Київ: Наукова думка, 1977–78, 2 т.),
 * archive.org OCR djvu text → headwords as `dictionary` witnesses (research/06 §3.5: the lexicographer's knowledge, weaker than running text).
 *
 * > "Not queryable; OCR text via `/download/{id}/{id}_djvu.txt`" — research/01 §5
 *
 * Only the HEADWORD LINE is read (copyrighted entries are not copied): `АВГУСТЬ, АВГУСТ, АУГОУСТЬ ч. (66) (цсл. …` → variants августь, август, аугоусть.
 * A headword line is UPPERCASE variants + a part-of-speech abbreviation + the citation count `(n)` (or `див.`); everything else (running heads,
 * bibliography, OCR junk) fails it. Date of a headword = earliest 4-digit year 1300–1520 in its entry's citations («Сучава, 1460 ВР»), else the
 * dictionary period; entries are split into one witness per decade (`<unit>_<decade>`, `<unit>_nd` = undated) because a witness has one date.
 * Locator = «т.N ряд. L: <headword line>» (the djvu text has no page marks, so L is the OCR text line).
 */
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { witnessOf } from './ingest-torot.ts'

const UP = 'А-ЯІЇЄҐЬЪ'
const POS = '(?:ч|ж|с|мн|прикм|дієсл|присл|прийм|спол|част|займ|числ|вигук|виг|дієпр|незм|4)'
const VARS = `[${UP}][${UP}'’ʼ()\\-]*[!?1-9]?(?:,\\s*[${UP}][${UP}'’ʼ()\\-]*[!?1-9]?)*`
const HEAD = new RegExp(`^[*"'«“]?\\s*(${VARS})\\s+(?:(?:${POS}\\.\\s*)+\\(([\\dІЇl]+)\\)|див\\.)`)

export interface Headword { line: string; variants: string[]; n?: number; years: number[]; at: number }
const CITE = /\(\s*[^()\d]{2,40},\s*(?:бл\.\s*|п\.\s*)?(1[345]\d\d)/g   // «(Сучава, 1460 …», «(Київ, бл. 1458 …» = a dated citation

/** Pure: one candidate variant → clean lowercase words (parenthesised letters give two readings). */
export function cleanVariant(v: string): string[] {
  const base = v.replace(/[!?1-9]+$/, '')
  const outs = base.includes('(') ? [base.replace(/\([^)]*\)/g, ''), base.replace(/[()]/g, '')] : [base]
  return outs.map(s => s.toLowerCase().replace(/^-+|-+$/g, ''))
    .filter(s => /^[а-яіїєґьъ'’ʼ-]{2,}$/.test(s) && !/(.)\1{3}/.test(s) && (/[аеєиіїоуюяѣ]/.test(s) || (s.length <= 3 && /[ьъ]$/.test(s))))
}

/** Pure: headword lines of the OCR text with the years found in each entry's body (until the next headword). */
export function parseHeadwords(text: string): Headword[] {
  const lines = text.split(/\r?\n/), out: Headword[] = []
  const first = lines.findIndex(l => /^ФОРМИ:/.test(l))
  for (let i = Math.max(0, first - 80); i < lines.length; i++) {
    const m = HEAD.exec(lines[i]!)
    if (!m) continue
    const variants = [...new Set(m[1]!.split(/,\s*/).flatMap(cleanVariant))]
    if (!variants.length) continue
    out.push({ line: lines[i]!.trim(), variants, ...(m[2] ? { n: parseInt(m[2].replace(/[ІЇl]/g, '1'), 10) } : {}), years: [], at: i + 1 })
  }
  out.forEach((h, k) => {
    const end = out[k + 1]?.at ?? lines.length
    if (h.n !== undefined) for (const l of lines.slice(h.at - 1, Math.min(end - 1, h.at + 400)).join(' ').matchAll(CITE)) if (+l[1]! <= 1520) h.years.push(+l[1]!)
  })
  return alphabeticalFilter(out)
}

const ALPHA = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'
const MARK = /[ЗХЧ]/
/**
 * OCR reads the entry marker («*»/«°») before a headword as a letter (ХКРИХОВЬЄ = КРИХОВЬЄ, ЗХОТАРНИКЬ = ХОТАРНИКЬ, ЧБЕСЄДА = БЕСЄДА).
 * The dictionary is alphabetical, so the true initials form a non-decreasing run: Viterbi over the running letter, each headword choosing its
 * first letter as read, the second letter when the first is a marker-like З/Х/Ч (small cost), or being dropped (OCR junk, cost 1.5);
 * a step back in the alphabet costs 1 + 0.3·distance, a forward step 0.1·distance (capped), so isolated outliers are repaired or dropped.
 */
export function alphabeticalFilter(hs: Headword[]): Headword[] {
  const S = ALPHA.length, INF = 1e9
  const ci = (c: string | undefined) => ALPHA.indexOf(c ?? '')
  const step = (p: number, c: number) => c === p ? 0 : c > p ? Math.min(0.1 * (c - p), 1) : 1 + 0.3 * (p - c)
  let cost = new Array<number>(S).fill(0)
  const back: { choice: number; from: number }[][] = []   // per entry, per state: choice 0 raw, 1 stripped, 2 dropped
  for (const h of hs) {
    const w = h.variants[0]!.toUpperCase(), opts = [{ c: ci(w[0]), x: 0, k: 0 }, ...(MARK.test(w[0]!) && ci(w[1]) >= 0 && cleanVariant(w.slice(1)).length ? [{ c: ci(w[1]), x: 0.3, k: 1 }] : [])]
    const next = new Array<number>(S).fill(INF), bk: { choice: number; from: number }[] = new Array(S).fill(null).map(() => ({ choice: 2, from: 0 }))
    for (let p = 0; p < S; p++) {
      if (cost[p]! >= INF) continue
      if (cost[p]! + 1.5 < next[p]!) { next[p] = cost[p]! + 1.5; bk[p] = { choice: 2, from: p } }
      for (const o of opts) if (o.c >= 0 && cost[p]! + o.x + step(p, o.c) < next[o.c]!) { next[o.c] = cost[p]! + o.x + step(p, o.c); bk[o.c] = { choice: o.k, from: p } }
    }
    cost = next; back.push(bk)
  }
  let s = cost.indexOf(Math.min(...cost)); const kept: Headword[] = []
  for (let i = hs.length - 1; i >= 0; i--) {
    const { choice, from } = back[i]![s]!, h = hs[i]!
    if (choice === 1) kept.push({ ...h, variants: [...new Set([...cleanVariant(h.variants[0]!.slice(1)), ...h.variants.slice(1)])] })
    else if (choice === 0) kept.push(h)
    s = from
  }
  return kept.reverse()
}

export const dictDate = (h: Headword): [number, number] | undefined => {
  if (!h.years.length) return undefined
  const d = Math.floor(Math.min(...h.years) / 10) * 10
  return [d, d + 9]
}

export function dictWitnesses(u: Unit, text: string, vol: string): WitnessOut[] {
  const by = new Map<string, TokenRec[]>(), dates = new Map<string, [number, number]>()
  let s = 0
  for (const h of parseHeadwords(text)) {
    const d = dictDate(h), key = d ? String(d[0]) : 'nd'
    if (d) dates.set(key, d)
    const loc = `т.${vol} ряд. ${h.at}: ${h.line}`.slice(0, 110)
    const t = by.get(key) ?? []
    for (const v of h.variants) t.push({ raw: v, loc, s })
    by.set(key, t); s++
  }
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([k, tokens]) =>
    witnessOf(u, tokens, { id: `${u.id}_${k}`, date: dates.get(k) ?? u.date, title: k === 'nd' ? `${u.title} (статті без дати)` : `${u.title}, статті з цитатами ${k}-х рр.` }))
}

export default {
  parse: (u, files) => dictWitnesses(u, files.map(f => f.body.toString('utf8')).join('\n'), u.id.slice(-1)),
} satisfies Ingester
