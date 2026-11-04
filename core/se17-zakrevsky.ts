/**
 * SPEC 63 SE-17 — Закревський, «Старосвѣтскій бандуриста», кн. 3, «Словарь малороссійскихъ идіомовъ» (Москва 1861; author † 1871, public domain: the text may be stored). Pure (no node imports).
 * Source: the owner's scan (bandurista3.pdf, 385 pp.), OCR on the worker (ops/worker/ocr-se17.sh, ukr+rus). Printed page = scan index + 244 (the introduction opens the book's own pagination at 247,
 * the dictionary runs on 256–624; the scan's last pages are the publisher's list of books). Two columns of the OCR come out in reading order.
 * Entry: «Headword, [variants,] [labels] Russian gloss. [illustration] (author)»; the headword is capitalised, the next capitalised words before the gloss are variants.
 * Recall design as SE-15: an article is NOT dropped for a garbled gloss (the row keeps the headword with `oq`), and not for an off-spine headword (the row is kept for labelling an existing lemma
 * with `unv`; only `unv`-free rows may make dictionary-only cards, which the GG-2 corroboration still has to confirm because the dictionary is OCR).
 */
import { headwordOk, ocrScore } from './se-parse.ts'
import type { SeRow } from './se.ts'
import { clip } from './sum-import.ts'

export const ZAK_DICT = 'zakrevsky', ZAK_OFFSET = 244, ZAK_SHORT = 'Закревський, Словарь малороссійскихъ идіомовъ (Москва 1861)'
export interface ZakPage { text: string; no: number }
export interface ZakRow { head: string; variants: string[]; gloss: string; oq: boolean; quote?: string; page: number; xref: boolean; seq: boolean; ev: number }
export interface ZakStats { pages: number; candidates: number; badHead: number; xref: number; noGloss: number; entries: number; garbled: number; offSpine: number; cardOk: number; withQuote: number }
export const newZakStats = (): ZakStats => ({ pages: 0, candidates: 0, badHead: 0, xref: 0, noGloss: 0, entries: 0, garbled: 0, offSpine: 0, cardOk: 0, withQuote: 0 })

const UP = 'А-ЯІЇЄҐЫѢ', LOW = 'а-яіїєґыѣъь'
const START = new RegExp(`^([${UP}][${LOW}'’ʼ\\-]{2,24})(?=\\s*[,.(]|\\s+[${UP}][.,])`, 'u')
const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const keyOf = (h: string): number[] => [...h.toLowerCase().normalize('NFC').replace(/[ыѣ]/g, m => (m === 'ы' ? 'и' : 'е')).replace(/[ъ'’ʼ-]/g, '')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
const cmpKey = (a: number[], b: number[]): number => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }
/** the longest non-decreasing subsequence of the headwords in page order = the verified spine of the volume */
export function zakSpine(rows: { head: string }[]): Set<number> {
  const ks = rows.map(r => keyOf(r.head)), n = rows.length, tails: number[] = [], prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpKey(ks[tails[mid]!]!, ks[i]!) <= 0) lo = mid + 1; else hi = mid }
    if (lo > 0) prev[i] = tails[lo - 1]!
    tails[lo] = i
  }
  const spine = new Set<number>()
  for (let i = tails[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) spine.add(i)
  return spine
}

const joinLines = (lines: string[]): string => lines.join('\n').replace(/([\p{L}])[-¬]\s*\n\s*(?=\p{L})/gu, '$1').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
const AUTHORS = /\((?:[А-ЯІЇЄ][\p{L}.\s,]{2,40}|Пен|Ис|Ис\.)\.?\)\.?\s*$/u
/** one article text (after the headword) → variants, gloss, first illustration */
function split(body: string): { variants: string[]; gloss: string; quote?: string } {
  let rest = body.trim(); const variants: string[] = []
  for (;;) {   // «Таньчити, Таньцювати, -цюю, …»: capitalised words straight after the headword are variants
    const m = new RegExp(`^,?\\s*([${UP}][${LOW}'’ʼ\\-]{2,24})\\s*(?=,)`, 'u').exec(rest)
    if (!m || /^(?:Галиц|Галицк|Польск|Лат|Нѣм|Нем|Ц|Р|Чигирин|Малор|Тоже|См)/u.test(m[1]!)) break
    variants.push(m[1]!); rest = rest.slice(m[0].length).replace(/^,\s*/, '')
  }
  const qi = rest.search(/[\[|]/u), q = qi >= 0 ? rest.slice(qi).replace(/^[\[|]\s*/, '').replace(/[\]|)]\s*\(.*$/u, '').replace(/\s*[\]|]+\s*$/u, '') : ''
  let gloss = (qi >= 0 ? rest.slice(0, qi) : rest).replace(AUTHORS, '')
  gloss = gloss.replace(/^(?:\s*\([^)]{0,30}\)\s*|\s*(?:[А-ЯІЇЄ][а-яіїєѣ]{0,7}\.)(?:\s*и\s*[А-ЯІЇЄ][а-яіїєѣ]{0,7}\.)?\s*(?=[\p{L},(]))+/u, '').replace(/^[\s,.;:–-]+|[\s,;:–-]+$/gu, '')
  return { variants, gloss, ...(q.length >= 8 ? { quote: clip(q, 200) } : {}) }
}

export function parseZakrevsky(pages: ZakPage[], st: ZakStats = newZakStats()): ZakRow[] {
  const raw: { head: string; lines: string[]; page: number }[] = []
  let cur: (typeof raw)[number] | undefined
  for (const p of pages) {
    st.pages++
    for (const line of p.text.split('\n')) {
      const l = line.trim(); if (!l || /^\d{3}$/.test(l) || /^[А-ЯІЇЄ]\.?$/u.test(l)) continue
      const m = START.exec(l)
      if (m && (!cur || /[.!?\])]\s*$/.test(cur.lines[cur.lines.length - 1] ?? '') || cmpKey(keyOf(cur.head), keyOf(m[1]!)) < 0)) { cur = { head: m[1]!, lines: [l.slice(m[0].length).replace(/^[\s,]+/, '')], page: p.no }; raw.push(cur) } else if (cur) cur.lines.push(l)
    }
  }
  const rows: ZakRow[] = []
  for (const r of raw) {
    st.candidates++
    const head = r.head.toLowerCase()
    if (!headwordOk(head.replace(/[ыѣъ]/g, 'и'))) { st.badHead++; continue }
    const s = split(joinLines(r.lines)), xref = /^[.\s]*(?:См\.|Смотри|см\.)/u.test(s.gloss)
    if (xref) st.xref++
    if (s.gloss.length < 2 && !xref) st.noGloss++
    const g = cleanGloss(s.gloss), clean = g.ok
    s.gloss = g.text
    if (!clean && s.gloss.length >= 2) st.garbled++
    rows.push({ head, variants: s.variants.map(v => v.toLowerCase()).filter(v => headwordOk(v.replace(/[ыѣъ]/g, 'и'))), gloss: clip(s.gloss, 200), oq: !clean, ...(s.quote ? { quote: s.quote } : {}), page: r.page + ZAK_OFFSET, xref, seq: false, ev: clean ? 2 : 1 })
    st.entries++
  }
  const spine = zakSpine(rows)
  rows.forEach((r, i) => { r.seq = spine.has(i) && r.head.replace(/['’ʼ-]/g, '').length >= 3 && ocrScore(r.head) >= 1 && r.ev >= 1; if (!r.seq) st.offSpine++; else st.cardOk++ })
  rows.forEach(r => { if (r.quote) st.withQuote++ })
  return rows
}

export const zakLoc = (page: number): string => `Закревський 1861, с. ${page}`
/** the SeRow of an article: a garbled gloss is kept as `oq` (headword and page stay), an off-spine headword as `unv` */
export function zakSeRows(r: ZakRow): [string, SeRow][] {
  const out: [string, SeRow][] = []
  for (const h of [r.head, ...r.variants]) {
    const unv = r.xref || !(r.seq && (h === r.head || ocrScore(h) >= 1))
    out.push([h, { d: ZAK_DICT, g: r.oq ? '' : r.gloss, n: 1, l: zakLoc(r.page), ...(r.quote && !r.oq ? { q: r.quote } : {}), ...(r.oq ? { oq: 1 as const } : {}), ...(unv ? { unv: 1 as const } : {}) }])
  }
  return out
}

/** the Russian gloss with the OCR debris of the Polish / German / Latin etymology and the stray marks taken out; `ok` = enough clean Cyrillic words remain to show it */
export function cleanGloss(g: string): { text: string; ok: boolean } {
  const toks = g.split(/\s+/).filter(Boolean)
  const keep = toks.filter(t => {
    const w = t.replace(/^[(\[«"„,;:.\-—–]+|[)\]»",;:.!?\-—–]+$/gu, '')
    return w.length >= 2 && /^[а-яіїєґыѣъьА-ЯІЇЄҐЫѢ'’ʼ-]+$/u.test(w) && !/[а-яіїєґыѣъь][А-ЯІЇЄҐЫѢ]/u.test(w) && !/^[А-ЯІЇЄҐЫѢ]{3,}$/u.test(w)
  })
  const text = keep.join(' ').replace(/\s+([,;.])/g, '$1')
  const letters = text.replace(/[^а-яіїєґыѣъь]/giu, '').length
  const ok = letters >= 4 && keep.length >= Math.ceil(toks.length * 0.45) && ocrScore(text.replace(/ѣ/g, 'е').replace(/ъ(?=[\s,.;]|$)/g, '')) >= 0.6 && !/(?<![\d])1[3-9]\d\d(?!\d)/.test(text)
  return { text, ok }
}
