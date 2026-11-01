/**
 * SPEC 63 SE-13: Є. Желехівський, С. Недільський, «Малоруско-нїмецкий словар» (Львів 1886, т. 1 А–О, т. 2 П–Я) read from the archive.org OCR text layer (harvest/zhelekhivsky.ts).
 * Pure (no node imports): OCR text -> candidate articles -> gated rows. The OCR is NOT proof-read and is poor: two columns, the stress mark of the headword is read as a stray letter (б, й, &),
 * and the German gloss (Antiqua type) is read by a Cyrillic engine («Кгеиг» for Kreuz). Nothing is repaired by guessing: a row survives only through the gates below, the rest is counted by reason.
 *   1. structure: an article starts on a line whose first token is a capital headword followed by «,» or «.»; spaced bold letters («К  р  е  с  т») are joined; running heads and page numbers are dropped;
 *   2. headword gate: only Cyrillic letters, ' and -, 2–30 letters; a stray stress letter is decoded ONLY when exactly the decoded spelling (not the printed one) is a VESUM headword after the Желехівка folds
 *      (the decoded vowel is then the stress); the headword must be a longest-non-decreasing-order member of the alphabetical sequence of the volume (order gate);
 *   3. modern lemma: the Желехівка folds (core/orthography.ts fold, orth «желехівка») decide, VESUM confirms (branch-only);
 *   4. gloss gate: the German of the first sense is accepted only when every token of the leading comma items is recovered to a word of a German vocabulary (the clean r2u rows of the same dictionary)
 *      through the Cyrillic/Latin look-alikes; a row with a garbled gloss keeps headword and stress and carries no gloss (core/se.ts SeRow.oq).
 */
import { fold } from './orthography.ts'
import { stripStress } from './text.ts'

export type ZhelPos = 'm' | 'f' | 'n' | 'verb' | 'adj' | 'adv'
export interface ZhelRaw { text: string; /** non-space characters before the first line of the article in the whole volume text */ ns: number }
export interface ZhelPagesIn { leafNs: number[]; page: string[]; totalNs: number }
export interface ZhelArticle {
  /** volume 1 | 2 */ v: 1 | 2
  /** printed page ('' = unnumbered) */ p: string
  /** 0-based leaf of the scan (archive.org /page/n<leaf>) */ lf: number
  /** headword as printed after the decode, stress removed, lower case (Желехівка spelling) */ h: string
  /** the same with the stress mark (U+0301) when the OCR kept it recognisably */ a: string
  /** modern lemma confirmed by VESUM through the folds ('' = not linked) */ lm: string
  /** part of speech / gender as printed ('' = not read) */ ps: ZhelPos | ''
  /** German gloss recovered to vocabulary words ('' = garbled, not kept) */ g: string
  /** verbatim OCR slice of the article, ≤ 200 chars */ q: string
  /** area labels printed in the article: [abbr, verbatim slice] */ lb?: [string, string][]
}
export interface ZhelStats {
  candidates: number; kept: number; keptLinked: number; withStress: number; withPos: number; withGloss: number
  rejected: Record<string, number>
}

const CYR_LETTER = /^[\p{Script=Cyrillic}'’-]+$/u
/** a running head «Крест.  378  Кривоплекий.» / a bare page number / a letter heading */
export function isNoise(line: string): boolean {
  const t = line.trim()
  return !t || /^[\d\sIVXLCІ.,*\-—_]+$/.test(t) || /^[\p{Lu}]\.?$/u.test(t) || /^\d{1,4}\s*[\p{L}.]{1,4}\.?$/u.test(t)
}
/** «К  р  е  с  т,» -> «Крест,»: a leading run of ≥ 3 single-character tokens is one word */
export function collapseSpaced(line: string): string {
  const m = /^((?:\S ?)(?:\s{1,3}\S){2,})(?=\s*[,.;]|\s{2,}|$)/.exec(line.trim())
  if (!m) return line.trim()
  const toks = m[1]!.split(/\s+/)
  if (toks.some(t => t.length !== 1)) return line.trim()
  return toks.join('') + line.trim().slice(m[1]!.length)
}
const START = /^(?:[IІV]{1,3}\.\s+)?([\p{Lu}][\p{L}'’&^~-]{1,30}(?: ся)?)\s*[,.]\s+(\S.*)?$/u

const nsOf = (s: string) => s.replace(/\s+/g, '').length

/** lines -> articles; a line that does not start an article continues the previous one (hyphenated line ends are joined) */
export function splitArticles(text: string): ZhelRaw[] {
  const out: { lines: string[]; ns: number }[] = []
  let ns = 0
  for (const raw of text.split('\n')) {
    const lineNs = ns; ns += nsOf(raw)
    if (isNoise(raw)) continue
    const line = collapseSpaced(raw)
    if (START.test(line)) out.push({ lines: [line], ns: lineNs })
    else if (out.length) out[out.length - 1]!.lines.push(line.trim())
  }
  return out.map(a => ({ ns: a.ns, text: a.lines.reduce((s, l) => (/[-¬]$/.test(s) ? s.replace(/[-¬]$/, '') + l : s + ' ' + l), '').replace(/\s+/g, ' ').trim() }))
}

const VOWELS = 'аеиіоуюяєї'
/** stray letters the OCR makes of the stress mark, with the vowels they may stand for (only ever tried when the printed spelling is not a word) */
const STRAY: Record<string, string> = { б: 'оа', й: 'и', '&': 'аеиоу', '^': 'аеиоу', '~': 'аеиоу' }

export interface HeadDecode { head: string; stress: number | null; lemma: string }
/**
 * headword as printed -> the Желехівка spelling and the modern lemma.
 * `isLemma(modern)`: VESUM headword test. The printed spelling is tried first (no stress then); stray stress letters are decoded only if the printed spelling has no modern lemma
 * and exactly one decoding has one.
 */
export function decodeHead(printed: string, isLemma: (modern: string) => boolean): HeadDecode | null {
  const norm = printed.normalize('NFC').replace(/[’ʼ]/g, "'").replace(/ ся$/, 'ся')
  // a capital vowel inside a word is how the OCR prints the accented vowel of the bold headword («БолАчка»): that is the stress
  let capStress: number | null = null
  const chars = [...norm].map((c, i) => { if (i > 0 && c !== c.toLowerCase() && VOWELS.includes(c.toLowerCase())) { capStress = i; return c.toLowerCase() } return c.toLowerCase() })
  const base = chars.join('')
  const link = (h: string): string => { for (const c of fold(h, 'желехівка')) if (isLemma(c.form)) return c.form; return '' }
  const ok = (h: string) => /^[\p{Script=Cyrillic}'-]+$/u.test(h)
  if (ok(base)) { const lm = link(base); if (lm) return { head: base, stress: capStress, lemma: lm } }
  if (capStress !== null) return null
  const found = new Map<string, HeadDecode>()
  chars.forEach((c, i) => {
    for (const v of STRAY[c] ?? '') { const h = chars.slice(0, i).join('') + v + chars.slice(i + 1).join(''); if (!ok(h)) continue; const l = link(h); if (l) found.set(h, { head: h, stress: i, lemma: l }) }
  })
  return found.size === 1 ? [...found.values()][0]! : null
}
export const withStress = (head: string, stress: number | null): string => (stress === null ? head : [...head].map((c, i) => (i === stress && VOWELS.includes(c) ? c + '́' : c)).join(''))

/** part of speech / gender from the first words after the headword (the OCR reads «m.» as «т.»/«ш.», «f.» as «/.», «n.» as «п.») */
export function posOf(rest: string): ZhelPos | '' {
  const t = ' ' + rest.slice(0, 90)
  const pats: [ZhelPos, RegExp][] = [
    ['verb', /[\s,]+(?:[VvИиУу]\.?\s?[аaпn]\.?|v\.\s?refl\.)(?=[\s.,])/], ['adv', /\s(?:adv|аdv)\./], ['adj', /[\s,][aа]\.(?=\s)/],
    ['m', /[\s,][mтш]\.(?=[\s,]|$)/], ['f', /[\s,](?:f|ж|\/|\{)\.(?=[\s,]|$)/], ['n', /[\s,][nп]\.(?=[\s,]|$)/],
  ]
  let best: [number, ZhelPos] | null = null
  for (const [p, re] of pats) { const m = re.exec(t); if (m && (!best || m.index < best[0])) best = [m.index, p] }
  return best ? best[1] : ''
}

// ── the German gloss ──────────────────────────────────────────────────────────────────────────────
/** Cyrillic (and digit) glyphs the engine prints for Latin letters of the German; several candidates per glyph, the vocabulary decides */
const LOOK: Record<string, string[]> = {
  а: ['a'], е: ['e', 'c'], о: ['o'], р: ['p', 'r'], с: ['c', 'e'], х: ['x'], у: ['y', 'u'], і: ['i', 'l'], ї: ['ii'], Ь: ['h', 'b'], ь: ['h', 'b'], г: ['r'], и: ['u', 'n'], п: ['n'], т: ['m', 't'], к: ['k', 'h'],
  в: ['s', 'b'], н: ['h', 'n'], ш: ['m', 'w'], з: ['s', 'z'], л: ['l'], й: ['u', 'ii'], д: ['d'], б: ['b', 'o'], '8': ['s'], ф: ['f'], ґ: ['g'], ы: ['bi'],
}
export interface GermanVocab { trie: Record<string, any>; surface: Map<string, string> }
export function germanVocab(texts: Iterable<string>): GermanVocab {
  const count = new Map<string, Map<string, number>>()
  for (const t of texts) for (const m of t.matchAll(/[A-Za-zÄÖÜäöüß]{3,}/g)) { const w = m[0], k = w.toLowerCase(); const c = count.get(k) ?? count.set(k, new Map()).get(k)!; c.set(w, (c.get(w) ?? 0) + 1) }
  const trie: Record<string, any> = {}, surface = new Map<string, string>()
  for (const [k, c] of count) {
    surface.set(k, [...c.entries()].sort((a, b) => b[1] - a[1])[0]![0])
    let n = trie; for (const ch of k) n = n[ch] ??= {}; n.$ = 1
  }
  return { trie, surface }
}
/** one OCR token -> the vocabulary word it can be read as (unique reading only), or undefined */
export function recoverToken(tok: string, v: GermanVocab): string | undefined {
  const t = tok.toLowerCase(), res = new Set<string>()
  const go = (i: number, n: Record<string, any>, acc: string) => {
    if (res.size > 1) return
    if (i === t.length) { if (n.$) res.add(acc); return }
    const c = t[i]!, cand = /[a-zäöüß]/.test(c) ? [c] : LOOK[c] ?? (c === 'ё' ? [] : [])
    for (const o of cand) { let m: Record<string, any> | undefined = n; for (const ch of o) { m = m?.[ch]; if (!m) break } if (m) go(i + 1, m, acc + o) }
  }
  go(0, v.trie, '')
  return res.size === 1 ? v.surface.get([...res][0]!) : undefined
}
/** the German of the first sense: the leading comma/semicolon items of which EVERY token (≥ 3 letters) is recovered; '' when not even the first item is */
export function recoverGloss(rest: string, v: GermanVocab): string {
  const body = rest.replace(/^[^A-Za-zА-Яа-я]*/, '').replace(/^(?:[VvИиУу]\.?\s?[аaпn]\.?|[mтшnпfж/{]|a|adv|pl|s)\.\s*/u, '').slice(0, 220)
  const items = body.split(/\s*[;,]\s*|\s+\/\s+/), kept: string[] = []
  for (const it of items) {
    const toks = it.split(/[\s.]+/).filter(Boolean)
    if (!toks.length || toks.length > 4) break
    const words: string[] = []
    let ok = true
    for (const t of toks) {
      if (t.length < 3 && !/^[a-zA-Z]{1,2}$/.test(t)) { ok = false; break }
      const w = t.length < 3 ? t : recoverToken(t.replace(/[^\p{L}8]/gu, ''), v)
      if (!w) { ok = false; break }
      words.push(w)
    }
    if (!ok || !words.some(w => w.length >= 4)) break
    kept.push(words.join(' '))
  }
  return kept.join(', ')
}

// ── the alphabetical order gate ───────────────────────────────────────────────────────────────────
const ALPHA = "'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя"
const ORD = new Map([...ALPHA].map((c, i) => [c, i]))
export const orderKey = (h: string): number => { let k = 0; for (const c of h.replace(/-/g, '').slice(0, 3).padEnd(3, "'")) k = k * 40 + (ORD.get(c) ?? 39); return k }
/** indexes (in `keys`) of a longest non-decreasing subsequence: the members of the alphabetical sequence; the others are out of order */
export function inOrder(keys: number[]): Set<number> {
  const tails: number[] = [], tIdx: number[] = [], prev = new Array<number>(keys.length).fill(-1)
  keys.forEach((k, i) => {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid]! <= k) lo = mid + 1; else hi = mid }
    tails[lo] = k; tIdx[lo] = i; prev[i] = lo ? tIdx[lo - 1]! : -1
  })
  const out = new Set<number>()
  for (let i = tIdx[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) out.add(i)
  return out
}

export const leafOf = (ns: number, pg: ZhelPagesIn): number => { let lo = 0, hi = pg.leafNs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pg.leafNs[m]! <= ns) lo = m; else hi = m - 1 } return lo }

export interface ParseOpts { isLemma: (modern: string) => boolean; vocab?: GermanVocab; labels?: (text: string) => [string, string][] }
/** a whole volume: text -> gated articles + stats */
export function parseVolume(text: string, vol: 1 | 2, pages: ZhelPagesIn, o: ParseOpts): { articles: ZhelArticle[]; stats: ZhelStats } {
  const st: ZhelStats = { candidates: 0, kept: 0, keptLinked: 0, withStress: 0, withPos: 0, withGloss: 0, rejected: {} }
  const rej = (why: string) => { st.rejected[why] = (st.rejected[why] ?? 0) + 1 }
  const raws = splitArticles(text), dec: { raw: ZhelRaw; d: HeadDecode; rest: string }[] = []
  for (const raw of raws) {
    st.candidates++
    const m = START.exec(raw.text); if (!m) { rej('structure'); continue }
    const d = decodeHead(m[1]!, o.isLemma)
    if (!d) { rej('headword (alphabet / not a VESUM headword through the folds)'); continue }
    dec.push({ raw, d, rest: m[2] ?? '' })
  }
  const ok = inOrder(dec.map(x => orderKey(x.d.head)))
  const articles: ZhelArticle[] = []
  dec.forEach((x, i) => {
    if (!ok.has(i)) { rej('alphabetical order'); return }
    const lf = leafOf(x.raw.ns, pages), ps = posOf(x.rest), g = o.vocab ? recoverGloss(x.rest, o.vocab) : ''
    const lb = o.labels?.(x.raw.text) ?? []
    articles.push({ v: vol, p: pages.page[lf] ?? '', lf, h: x.d.head, a: withStress(x.d.head, x.d.stress), lm: x.d.lemma, ps, g, q: x.raw.text.slice(0, 200), ...(lb.length ? { lb } : {}) })
    st.kept++; if (x.d.lemma) st.keptLinked++; if (x.d.stress !== null) st.withStress++; if (ps) st.withPos++; if (g) st.withGloss++
  })
  return { articles, stats: st }
}
void stripStress
