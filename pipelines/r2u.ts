/**
 * r2u.org.ua — Словниковий портал (Russian–Ukrainian and Ukrainian–Russian dictionaries 1886–1933): search-result parser (research/30).
 * Pure functions only; there is deliberately no fetcher (robots.txt disallows /s); the witness ingester pipelines/ingest-r2u.ts.
 *
 * The portal has no open data dump and no licence statement (research/30 §1): the project reads search results only for its own kept lemmas and keeps,
 * per article, the dictionary id, the headword/equivalent SPELLINGS (facts) and ≤ 300 characters of the article as the verbatim quote — never the article.
 *
 * Result markup (verified 2026-10-14, fixture tests/fixtures/r2u-vyhliadaty.html): one `<table class="main_tbl" id='table_<dict>'>` per dictionary, one
 * `<tr><td id="<dict>_<rowId>" class="result_row[_main]">` per article; spans carry the typography class (KrymRusBold = Russian headword, KrymUkr = Ukrainian text,
 * KrymUkrBold = Ukrainian headword, KrymRusPlain = Russian gloss, *Italic = example/label, KrymUkAux = author sigla, `u.quote` = example quotation, `num` = sense number).
 */
import { stripStress } from '../core/text.ts'

export type R2uDir = 'ru-uk' | 'uk-ru' | 'uk-de' | 'orth'
export interface R2uDict {
  id: number; unitId: string; short: string; title: string; authors: string; years: [number, number]; dir: R2uDir
  /** SPEC 63 / manifest orth: spelling system of the edition (core/orthography.ts) */
  orth: 'желехівка' | 'r2u'; page: string; listed: string
}
const PAGE = (p: string) => `https://r2u.org.ua/html/${p}`
const LISTED = (t: string) => `https://r2u.org.ua/main/dicts — «${t}»`

/** The dictionaries ingested as `dictionary` witnesses. Phraseological, technical, modern («народний», Караванський 2012) and loanword dictionaries are not (research/30 §3). */
export const R2U_DICTS: R2uDict[] = [
  { id: 9, unitId: 'r2u_umanets', short: 'Уманець–Спілка', title: 'Словарь росийсько-український', authors: 'М. Уманець, А. Спілка', years: [1893, 1898], dir: 'ru-uk', orth: 'желехівка', page: PAGE('umanets_pered.html'), listed: LISTED('Словарь росийсько-український М.Уманець, А.Спілка. 1893—1898') },
  { id: 21, unitId: 'r2u_zheleh', short: 'Желехівський', title: 'Малорусько-німецький словар', authors: 'Є. Желехівський', years: [1886, 1886], dir: 'uk-de', orth: 'желехівка', page: 'https://r2u.org.ua/html/zheleh_details.html', listed: LISTED('Малорусько-німецький словар Євгеній Желеховський 1886') },
  { id: 12, unitId: 'r2u_hrinch09', short: 'Грінченко 1907–09', title: 'Словарь української мови', authors: 'Б. Грінченко', years: [1907, 1909], dir: 'uk-ru', orth: 'r2u', page: PAGE('hrinchenko_pro.html'), listed: LISTED('Словарь української мови Б.Грінченко 1907—1909') },
  { id: 8, unitId: 'r2u_nikovsky', short: 'Ніковський', title: 'Словник українсько-російський', authors: 'А. Ніковський', years: [1927, 1927], dir: 'uk-ru', orth: 'r2u', page: PAGE('nikovsky_pered.html'), listed: LISTED('Словник українсько-російський А. Ніковський 1927') },
  { id: 18, unitId: 'r2u_hrinch27', short: 'Грінченко 3-тє вид.', title: 'Словник української мови (3-тє вид.)', authors: 'Б. Грінченко, за ред. С. Єфремова, А. Ніковського', years: [1927, 1928], dir: 'uk-ru', orth: 'r2u', page: 'https://r2u.org.ua/dicts/hrinchenko_3ed', listed: LISTED('Словник української мови Б.Грінченко, за ред. С. Єфремова, А. Ніковського 1927—1928') },
  { id: 11, unitId: 'r2u_holoskevych', short: 'Голоскевич', title: 'Правописний словник', authors: 'Г. Голоскевич', years: [1929, 1929], dir: 'orth', orth: 'r2u', page: PAGE('goloskevych_pered.html'), listed: LISTED('Правописний словник Г. Голоскевич 1929') },
  { id: 1, unitId: 'r2u_krymsky', short: 'Кримський–Єфремов', title: 'Російсько-український академічний словник', authors: 'А. Кримський, С. Єфремов', years: [1924, 1933], dir: 'ru-uk', orth: 'r2u', page: PAGE('krym_details.html'), listed: LISTED('Російсько-український академічний словник А. Кримський, С. Єфремов 1924—1933') },
  { id: 2, unitId: 'r2u_izyumov', short: 'Ізюмов', title: 'Російсько-український словник', authors: 'О. Ізюмов', years: [1930, 1930], dir: 'ru-uk', orth: 'r2u', page: PAGE('isum_pered.html'), listed: LISTED('Російсько-український словник О. Ізюмов 1930') },
  { id: 5, unitId: 'r2u_doroshenko', short: 'Дорошенко–Станиславський', title: 'Російсько-український словник ділової мови', authors: 'М. Дорошенко, М. Станиславський, В. Страшкевич', years: [1930, 1930], dir: 'ru-uk', orth: 'r2u', page: PAGE('dorosh_pered.html'), listed: LISTED('Російсько-український словник ділової мови М. Дорошенко, М. Станиславський, В. Страшкевич 1930') },
  { id: 13, unitId: 'r2u_yakubski', short: 'Якубські', title: 'Російсько-український словник військової термінології', authors: 'С. та О. Якубські', years: [1928, 1928], dir: 'ru-uk', orth: 'r2u', page: PAGE('vijskovy_pro.html'), listed: LISTED('Російсько-український словник військової термінології С. та О. Якубські 1928') },
]
export const r2uDictById = Object.fromEntries(R2U_DICTS.map(d => [d.id, d])) as Record<number, R2uDict>

export const r2uQueryUrl = (q: string, scope: string, dicts = 'all') => `https://r2u.org.ua/s?w=${encodeURIComponent(q)}&scope=${scope}&dicts=${dicts}`

// ── tokenising one result cell ──────────────────────────────────────────────────────────────────
interface Node { cls: string; text: string }
const ENT: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'" }
const unent = (s: string) => s.replace(/&(?:nbsp|amp|lt|gt|quot|#0?39);/g, m => ENT[m]!)

/** Text nodes of a cell with the class of their innermost span (`u.quote` for example quotations, `b`/`i` for the plain-tag dictionaries). `<br>` becomes a node of class `br`. */
export function nodesOf(html: string): Node[] {
  const out: Node[] = [], stack: string[] = []
  for (const m of html.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) { out.push({ cls: stack[stack.length - 1] ?? '', text: unent(m[4]) }); continue }
    const [, close, tag, attrs] = m
    if (!['span', 'u', 'b', 'i', 'br'].includes(tag!)) continue   // links (<a>) and the like: their text stays, the tag is dropped
    if (tag === 'br') { out.push({ cls: 'br', text: '\n' }); continue }
    if (close) { stack.pop(); continue }
    if (/\/\s*$/.test(attrs!)) continue
    const c = /class\s*=\s*["']([^"']+)["']/.exec(attrs!)?.[1]
    stack.push(tag === 'u' ? (c === 'quote' ? 'quote' : 'u') : tag === 'span' ? (c ?? 'span') : tag!)
  }
  return out
}

/** Plain text of a cell (nodes joined, whitespace collapsed): the verbatim quote source. */
export const plainOf = (nodes: Node[]) => nodes.map(n => (n.cls === 'br' ? ' / ' : n.text)).join('').replace(/\s+/g, ' ').trim()

// ── word lists ──────────────────────────────────────────────────────────────────────────────────
const WORD = /^[\p{L}́'’ʼ]+(?:-[\p{L}́'’ʼ]+)*$/u
const NOISE = new Set(['см', 'ср', 'чого', 'кого', 'чому', 'кому', 'що', 'чим', 'ким', 'від', 'з', 'до', 'на', 'у', 'в', 'про'])
/** A Ukrainian/Russian word list ("видава́ти ся, здава́ти ся; вигляда́ти") → single words; detached reflexive «ся» is joined as «-ся» (research/30 §4: the raw hyphen form, folded by ORTH-SYA). */
export function wordList(s: string, max = 12): string[] {
  const out: string[] = []
  const cleaned = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/[«»"“”„]/g, ' ')
  for (const part of cleaned.split(/[,;]/)) {
    if (/^\s*-(?!\s*ся\s*$)/.test(part)) continue   // an inflection ending («-да́ю»), not a word
    const t = part.replace(/^[\s.:–—-]+|[\s.:–—-]+$/g, '').replace(/\s+/g, ' ')
    if (!t || NOISE.has(t.toLowerCase())) continue
    if (/^-?ся$/.test(t)) { const p = out[out.length - 1]; if (p && !/-ся$/.test(p)) out.push(p + '-ся'); continue }
    const w = t.replace(/\s+ся$/, '-ся').replace(/\s*-\s*ся$/, '-ся')
    if (WORD.test(w) && !/^-/.test(w) && stripStress(w).length >= 2) out.push(w)
    if (out.length >= max) break
  }
  return [...new Set(out)]
}

export interface R2uRow {
  dict: number; rowId: number
  /** headword spellings (Russian for ru-uk dictionaries, Ukrainian otherwise) */
  head: string[]
  /** ru-uk: Ukrainian equivalents (the article's translation); uk-ru: Russian glosses; orth/uk-de: empty */
  eq: string[]
  /** ≤ 300 characters of the article, verbatim (whitespace collapsed) */
  text: string
}

const SKIP_EQ = new Set(['quote', 'KrymUkAux', 'KrymRusItalic', 'KrymUkrItalic', 'i', 'u'])
const TAIL = /\s[—–]\s.*$/s

/** Senses of Ukrainian text in a ru-uk article: the KrymUkr nodes after the headword, example quotations, sigla and labels dropped, cut at the first bullet (phraseology) and at « — » (running examples, Umanets). */
function ukEquivalents(nodes: Node[], from: number): string[] {
  let cur = '', cut = false
  const senses: string[] = []
  const push = () => { if (cur.trim()) senses.push(cur.trim()); cur = '' }
  for (const n of nodes.slice(from)) {
    if (cut) break
    if (n.cls === 'br' || n.cls === '') { if (/•/.test(n.text)) { cut = true; break } ; if (n.cls === 'br') cur += ' '; continue }
    if (/•/.test(n.text)) { cut = true; break }
    if (n.cls === 'KrymRusBold') { push(); continue }
    if (SKIP_EQ.has(n.cls) || n.cls.startsWith('KrymRus')) continue
    if (n.cls === 'KrymUkr' || n.cls === 'KrymUkrBold' || n.cls === 'b') cur += n.text
  }
  push()
  return senses.flatMap(s => wordList(s.replace(/^\s*[=–—-]\s*/, '').replace(/\d+\)/g, ';').replace(TAIL, ''))).filter((w, i, a) => a.indexOf(w) === i).slice(0, 24)
}

/** Russian headword spellings: the leading KrymRusBold run ("Высма́тривать, ся, вы́смотрѣть, ся" → высматривать-ся, высмотрѣть-ся). */
function ruHeads(nodes: Node[]): { head: string[]; next: number } {
  let i = 0, s = ''
  while (i < nodes.length && (nodes[i]!.cls === 'KrymRusBold' || (!nodes[i]!.text.trim() && nodes[i]!.cls !== 'KrymUkr'))) s += nodes[i++]!.text
  return { head: wordList(s.replace(/\d+\.\s*$/, '')), next: i }
}

/** One result cell → row (null when the cell yields no usable headword). */
export function parseCell(dict: number, rowId: number, html: string): R2uRow | null {
  const d = r2uDictById[dict]; if (!d) return null
  const nodes = nodesOf(html), text = plainOf(nodes).slice(0, 300)
  if (d.dir === 'ru-uk') {
    const { head, next } = ruHeads(nodes)
    return head.length ? { dict, rowId, head, eq: ukEquivalents(nodes, next), text } : null
  }
  if (d.dir === 'orth') {   // Голоскевич: «вигляда́ти, -да́ю, -да́єш; ви́глянути, -гляну, -неш, -не» — one headword per «;» group
    const head = plainOf(nodes).split(';').map(g => wordList(g.split(',')[0] ?? '', 1)[0]).filter((w): w is string => !!w)
    return head.length ? { dict, rowId, head, eq: [], text } : null
  }
  // uk-ru, uk-de: the leading bold run is the Ukrainian headword; the Russian gloss (uk-ru) is the plain Russian text after the first sense number
  const boldCls = d.dir === 'uk-de' ? 'b' : 'KrymUkrBold'
  let head: string[] = [], i = 0
  for (; i < nodes.length; i++) {
    const n = nodes[i]!
    if (n.cls === 'num' || n.cls === 'br' || n.cls === 'quote') break
    if (n.cls === boldCls) head.push(...wordList(n.text.replace(/^\s*[IVX]+\.\s*/, '').split(/[,;]/).filter(x => !/^\s*-/.test(x)).join(',')))
    else if (n.text.trim() && !/^\s*(сов|несов|в|гл|м|ж|с|мн|пр|нар|v|a|n|praep|adv|подв|одн|многокр)\.?\s*[ав,.]*\s*$/i.test(n.text) && n.cls !== boldCls && head.length) break
  }
  head = [...new Set(head)].slice(0, 6)
  if (!head.length) return null
  let eq: string[] = []
  if (d.dir === 'uk-ru') {
    let cur = '', cut = false, taken = false   // only the FIRST Russian run of a sense is the gloss; later Russian-typed runs are source sigla («Ном. № 337.»)
    const senses: string[] = []
    for (const n of nodes.slice(i)) {
      if (cut) break
      if (/•/.test(n.text)) { cut = true; break }
      if (n.cls === 'num') { if (cur.trim()) senses.push(cur); cur = ''; taken = false; continue }
      // a Russian gloss ends at the first sentence stop (what follows is a source siglum such as «Ном. № 337.»); usage labels («сов. в.») are not part of it
      if (n.cls === 'KrymRusPlain' && !taken && n.text.trim()) { taken = true; cur += n.text.replace(/\b(?:сов|несов|только|разг|прост)\.\s*(?:в\.\s*)?/gi, '').replace(/\.\s.*$/s, '') + ';' }
    }
    if (cur.trim()) senses.push(cur)
    eq = senses.flatMap(s => wordList(s.replace(/^\s*[;:]\s*/, ''))).filter((w, k, a) => a.indexOf(w) === k).slice(0, 24)
  }
  return { dict, rowId, head, eq, text }
}

/** A whole search-result page → rows of the ingested dictionaries. */
export function parseSearch(html: string): R2uRow[] {
  const out: R2uRow[] = []
  for (const m of html.matchAll(/<td id="(\d+)_(\d+)" class="result_row[a-z_]*">([\s\S]*?)<\/td>/g)) {
    const r = parseCell(+m[1]!, +m[2]!, m[3]!)
    if (r) out.push(r)
  }
  return out
}

/** Stable URL of a stored row: the query that found it + the cell anchor. */
export const rowUrl = (q: string, scope: string, r: Pick<R2uRow, 'dict' | 'rowId'>) => `${r2uQueryUrl(q, scope, 'all')}#${r.dict}_${r.rowId}`
