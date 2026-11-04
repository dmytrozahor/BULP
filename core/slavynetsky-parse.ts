/**
 * SPEC 63 SE-15 — Славинецький, «Лексикон латинський» (the earliest dated copy 1642) and «Лексикон словено-латинський» (Славинецький and Корецький-Сатановський; the Moscow copy of 1650), as printed in
 * «Пам'ятки української мови XVII ст.» (Київ: Наукова думка, 1973; ed. В. В. Німчук; OCR of the owner's scan, ops/worker/ocr-se15.sh `slavynetsky`). Pure (no node imports).
 * Copyright: the XVII-century TEXT of the two lexica is public domain and its entries are stored; the 1973 editors' preface, notes and footnotes («К І …», «В оригіналі …») are in copyright and are NEVER stored:
 * the parser reads only the two lexicon bodies (scan pages 62–419 and 423–541) and cuts every column at its first footnote line.
 * Dates are the ones the editor's preface states for the manuscripts it prints: the oldest list of the «Лексикон латинський» is dated 1642 (7150 from the creation of the world), the Moscow list of the
 * word-pair lexicon 1650; the «Оглавленіе книгь» gives 7151 (1643) for the Latin one, which the editor does not follow. A row is dated by the manuscript, not by the print year 1973.
 * Layout (looked at on real pages): two columns (the page file = LEFT + «<<COL>>» + RIGHT). Latin part: «latin, gloss, gloss.» — the Latin headword in ASCII, the church-slavonic glosses in Cyrillic with the editor's
 * completions of abbreviated letters in parentheses («шн(ш)ка», «ва(л)са(м)ная»: the letter in the parentheses belongs to the word). Word-pair part: «Закалатель. Lanio. Carnifex.» — the Slavonic headword, the Latin words.
 */
import { GLOSS_MAX } from './se-parse.ts'
import type { SeRow } from './se.ts'
import { clip } from './sum-import.ts'

export const SLA_DICT = 'slavynetsky'
export const SLA_LAT_YEAR: [number, number] = [1642, 1642], SLA_SLOV_YEAR: [number, number] = [1650, 1650]
export const SLA_LAT_LOC = 'Славинецький, Лексикон латинський (список 1642)', SLA_SLOV_LOC = 'Славинецький та Корецький-Сатановський, Лексикон словено-латинський (список 1650)'
export interface SlaPage { text: string; no: number }
export interface SlaLatinEntry { head: string; gloss: string[]; page: number }
export interface SlaSlovEntry { head: string; latin: string[]; page: number }
export interface SlaStats { spineDropped?: number; pages: number; candidates: number; kept: number; keyed: number; badGloss: number; footnoteCuts: number }

const CYR = 'а-яіїєґѣѳѵъьыэёў'
const FOOT = /^[\W\d]{0,4}\s*(?:К\s*[ІI1l!|]\b|К\s+[ІI1l!|]\s|В\s+оригіналі|[¹²³⁴⁵⁶⁷⁸⁹]\s)/u
/** the column up to its first footnote line (the editors' notes stand under the rule at the foot of the column) */
function body(col: string, st?: SlaStats): string[] {
  const out: string[] = []
  for (const raw of col.split('\n')) {
    const l = raw.trim()
    if (!l) { out.push(''); continue }
    if (FOOT.test(l)) { if (st) st.footnoteCuts++; break }
    out.push(l)
  }
  return out
}
const clean = (s: string): string => s.replace(/[\[\]()|!¦]/g, '').replace(/[0-9¹²³⁴⁵⁶⁷⁸⁹*?‘’'"`]/g, '').replace(/\s+/g, ' ').trim()
const cyrWord = (w: string): boolean => new RegExp(`^[${CYR}]{3,24}$`, 'u').test(w) && /[аеєиіїоуюяѣыэ]/u.test(w) && !/[^аеєиіїоуюяѣыэ]{6}/u.test(w)
/** a Latin word as the OCR gives it (ASCII letters, a vowel, no consonant run of 6) */
export const latinWord = (w: string): boolean => /^[a-z]{3,22}$/.test(w) && /[aeiouy]/.test(w) && !/[^aeiouy]{6}/.test(w)

/** Latin part: entries start with a Latin word at the beginning of a line; a line that starts with Cyrillic or punctuation continues the previous entry */
export function parseLatinPages(pages: SlaPage[], st: SlaStats = { pages: 0, candidates: 0, kept: 0, keyed: 0, badGloss: 0, footnoteCuts: 0 }): SlaLatinEntry[] {
  const out: SlaLatinEntry[] = []
  for (const p of pages) {
    st.pages++
    for (const col of p.text.split(/\n?<<COL>>\n?/)) {
      let cur: { head: string; text: string } | undefined
      const flush = () => {
        if (!cur) return
        st.candidates++
        const glossRaw = cur.text.split(/[,.;]/).map(x => x.replace(/[A-Za-z]{2,}/g, ' ')).map(clean).filter(x => /[а-яіїєґѣѳѵъыэ]/u.test(x)), gloss = glossRaw.map(x => x.replace(/\s+/g, ' ')).filter(x => x.split(' ').every(w => cyrWord(w.toLowerCase().replace(/ь$/, 'ь'))) && x.length >= 3 && x.length <= 60)
        if (!gloss.length) st.badGloss++
        else { out.push({ head: cur.head, gloss: [...new Set(gloss)].slice(0, 8), page: p.no }); st.kept++ }
        cur = undefined
      }
      for (const l of body(col, st)) {
        if (!l) continue
        const m = /^([A-Za-z][A-Za-z()[\]|!]{1,24})(?=[\s.,;:]|$)/.exec(l)
        if (m) {
          const head = m[1]!.replace(/[()[\]|!]/g, '').toLowerCase()
          if (latinWord(head) && /[а-яіїєґѣѳѵъыэ]/iu.test(l.slice(m[0].length))) { flush(); cur = { head, text: l.slice(m[0].length) }; continue }
        }
        if (cur) cur.text += ' ' + l
      }
      flush()
    }
  }
  return out
}
/** Word-pair part: the Slavonic headword starts a line with a capital; the Latin words follow after the first full stop */
export function parseSlovPages(pages: SlaPage[], st: SlaStats = { pages: 0, candidates: 0, kept: 0, keyed: 0, badGloss: 0, footnoteCuts: 0 }): SlaSlovEntry[] {
  const out: SlaSlovEntry[] = []
  for (const p of pages) {
    st.pages++
    for (const col of p.text.split(/\n?<<COL>>\n?/)) {
      let cur: { head: string; text: string } | undefined
      const flush = () => {
        if (!cur) return
        st.candidates++
        const latin = cur.text.split(/[.;,]/).map(x => x.replace(/[^A-Za-z() ]/g, '').replace(/[()]/g, '').trim().toLowerCase()).filter(x => x && x.split(' ').every(latinWord)).filter(x => x.split(' ').length <= 3)
        if (!latin.length) st.badGloss++
        else { out.push({ head: cur.head, latin: [...new Set(latin)].slice(0, 6), page: p.no }); st.kept++ }
        cur = undefined
      }
      for (const l of body(col, st)) {
        if (!l) continue
        const m = new RegExp(`^([А-ЯІЇЄҐѢѲѴ][${CYR}()\\[\\]]{2,30})(?=[\\s.,;:]|$)`, 'u').exec(l)
        if (m) {
          const head = clean(m[1]!).toLowerCase()
          if (cyrWord(head)) { flush(); cur = { head, text: l.slice(m[0].length) }; continue }
        }
        if (cur) cur.text += ' ' + l
      }
      flush()
    }
  }
  return out
}

/** the entries whose headword is on the longest non-decreasing run of the volume (both lexica are alphabetical: an off-order headword is an OCR slip, and the row would quote a garbled Latin word) */
export function onSpine<T extends { head: string }>(xs: T[], fold: (h: string) => string): T[] {
  const ks = xs.map(x => fold(x.head)), n = xs.length, tails: number[] = [], prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ks[tails[mid]!]! <= ks[i]!) lo = mid + 1; else hi = mid }
    if (lo > 0) prev[i] = tails[lo - 1]!
    tails[lo] = i
  }
  const keep = new Set<number>(); for (let i = tails[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) keep.add(i)
  return xs.filter((_, i) => keep.has(i))
}
export const foldLatin = (h: string): string => h.replace(/j/g, 'i').replace(/v/g, 'u')
export const foldSlav = (h: string): string => h.replace(/ѣ|ё|є/g, 'е').replace(/ѳ/g, 'ф').replace(/ѵ|ї|і|ы/g, 'и').replace(/ъ|ь/g, '')
/** function words and fragments the OCR makes of long glosses («тожъ», «ела»): never a key */
export const SLA_STOP = new Set(['тожъ', 'тожде', 'ела', 'рады', 'сиг', 'же', 'или', 'како', 'тако', 'нъкій', 'тамо', 'зде', 'того'])
/** Latin part → SE rows keyed by the church-slavonic gloss word (a modern lemma through the old-spelling folds, branch-only): one row per single-word gloss; the row shows the Latin headword and the glosses */
export function slaGlossRows(entries: SlaLatinEntry[], st?: SlaStats): [string, SeRow][] {
  const rows: [string, SeRow][] = []
  for (const e of entries) {
    const shown = clip(`лат. «${e.head}» = ${e.gloss.join(', ')}`, GLOSS_MAX)
    for (const g of e.gloss) {
      if (g.includes(' ') || SLA_STOP.has(g.toLowerCase())) continue
      rows.push([g.toLowerCase(), { d: SLA_DICT, g: shown, e: SLA_LAT_YEAR, l: `${SLA_LAT_LOC}, с. ${e.page}` }])
      if (st) st.keyed++
    }
  }
  return rows
}
/** word-pair part → SE rows keyed by the Slavonic headword; the gloss is the Latin words */
export function slaSlovRows(entries: SlaSlovEntry[], st?: SlaStats): [string, SeRow][] {
  return entries.map(e => { if (st) st.keyed++; return [e.head, { d: SLA_DICT, g: clip('лат. ' + e.latin.join(', '), GLOSS_MAX), e: SLA_SLOV_YEAR, l: `${SLA_SLOV_LOC}, с. ${e.page}` } as SeRow] as [string, SeRow] })
}
