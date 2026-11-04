/**
 * SPEC 63 SE-17 — «Говірки Західної Полтавщини: збірник діалектних текстів» (упоряд. Г. І. Мартинова, відп. ред. Т. В. Щербина; НАН України, Черкаський нац. ун-т ім. Б. Хмельницького, Черкаси 2012). IN COPYRIGHT.
 * Pure (no node imports). The owner's file «Глава 1.pdf» is ONE PART of the book (154 pp.: preface «Вступ», the list of the 56 villages, the key to the transcription, and the texts of the first villages only; the
 * text breaks off in the middle of a village on p. 154). Its text layer is a broken phonetic font, so the file is OCRed (ukr, the worker). The texts are in the traditional phonetic transcription of the «Атлас української
 * мови»: a soft consonant is followed by ' or ", ї is a high front vowel, й + vowel stands for я ю є, a vertical bar before the stressed vowel (the OCR reads it as І / Ї / | / !), «/» and «//» are pauses.
 * © policy: the full text is NEVER stored. Per VESUM lemma a row keeps the recorded form (with its stress mark), a quotation of ≤ 200 characters at a word boundary with «…», the page and the village; the preface is used
 * only as cited quotations for dialect rules (core/rules.ts, rows POLT-*).
 * `normPolt` maps a transcribed word to Ukrainian spelling for LOOKUP ONLY (branch-only; a form counts as evidence only when VESUM confirms the normalised word).
 */
import { clip } from './sum-import.ts'
import type { SeRow } from './se.ts'

export const POLT_DICT = 'poltavshchyna', POLT_LABEL = 'зах.-полт.', POLT_PLACE = 'зах.-полт. (місце запису)', POLT_AREA = 'західна Полтавщина'
export const POLT_SHORT = 'Говірки Західної Полтавщини: збірник діалектних текстів (Черкаси 2012)'
const VOW = 'аеєиіїоуюя', BARS = new Set(['І', 'Ї', '|', 'ˈ', '¦', '!'])
const SOFT = new Set(["'", '’', 'ʼ', '`', '"', '”', '“', '′', '´'])
const isLetter = (c: string | undefined): boolean => !!c && /[\p{L}]/u.test(c)

export interface Norm { word: string; /** index into `word` of the stressed vowel, when the transcription carries a bar */ stress?: number; /** the recorded form with the bar as a stress accent on the vowel, in the transcription's own letters */ recorded: string }
/** a transcribed token → Ukrainian spelling (for lookup) + the stress it records */
export function normPolt(raw: string): Norm | undefined {
  const t = raw.normalize('NFC').replace(/[(){}\[\]\d.,;:?*……\-–—]+/gu, m => (m.includes('-') || m.includes('–') || m.includes('—') ? '-' : '')).replace(/\/+/g, '').trim()
  if (!t || !/[а-яіїєґА-ЯІЇЄҐ]/u.test(t)) return undefined
  // pass 1: bars → stress flags on the NEXT letter; everything lower-cased; soft marks kept as \u0001
  const syms: { c: string; st?: 1 }[] = []; let pendingStress = false
  const chars = [...t]
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!
    const prevLetter = isLetter(chars[i - 1]), nextLetter = isLetter(chars[i + 1])
    if (BARS.has(c) && nextLetter && (c !== 'І' && c !== 'Ї' ? true : prevLetter || chars.slice(i + 1).every(x => !/[А-ЯІЇЄҐ]/u.test(x)))) { pendingStress = true; continue }
    if (BARS.has(c) && !isLetter(c)) continue
    if (SOFT.has(c)) { syms.push({ c: '\u0001' }); continue }
    if (!isLetter(c) && c !== '-') continue
    syms.push({ c: c.toLowerCase(), ...(pendingStress && VOW.includes(c.toLowerCase()) ? { st: 1 as const } : {}) }); if (VOW.includes(c.toLowerCase())) pendingStress = false
  }
  // pass 2: softness and й-vowels → spelling
  const out: { c: string; st?: 1 }[] = []
  const isV = (c: string | undefined): boolean => !!c && VOW.includes(c)
  for (let i = 0; i < syms.length; i++) {
    const s = syms[i]!, c = s.c, prev = out[out.length - 1]?.c, next = syms[i + 1]?.c, n2 = syms[i + 2]
    if (c === '\u0001') {
      // soft mark after a consonant: merges with the next vowel (а → я, у → ю, о → ьо, і/ї/и/е stay) or becomes ь
      const nx = syms[i + 1]
      if (!nx || !isV(nx.c)) { if (prev && !'чшжщ'.includes(prev) && !isV(prev)) out.push({ c: 'ь' }); continue }
      if (nx.c === 'а') { out.push({ c: 'я', ...(nx.st ? { st: 1 as const } : {}) }); i++; continue }
      if (nx.c === 'у') { out.push({ c: 'ю', ...(nx.st ? { st: 1 as const } : {}) }); i++; continue }
      if (nx.c === 'о') { out.push({ c: 'ь' }); continue }
      continue
    }
    if (c === 'й' && isV(next) && (out.length === 0 || isV(prev) || prev === 'ь')) {
      const m: Record<string, string> = { а: 'я', у: 'ю', е: 'є', і: 'ї', ї: 'ї' }
      if (m[next!]) { out.push({ c: m[next!]!, ...(n2 && false ? {} : syms[i + 1]!.st ? { st: 1 as const } : {}) }); i++; continue }
    }
    out.push(c === 'ї' && !(out.length === 0 || isV(prev)) ? { c: 'і', ...(s.st ? { st: 1 as const } : {}) } : c === 'ї' ? { c: 'ї', ...(s.st ? { st: 1 as const } : {}) } : s)
  }
  const word = out.map(x => x.c).join('').replace(/^-+|-+$/g, '')
  if (word.length < 1) return undefined
  const si = out.findIndex(x => x.st && isV(x.c))
  const recorded = out.map((x, i) => (i === si ? x.c + '́' : x.c)).join('')
  return { word, ...(si >= 0 ? { stress: si } : {}), recorded }
}

export interface PoltVillage { name: string; district: string; headPage: number }
export interface PoltTok { raw: string; norm: Norm; page: number; village: string; ctx: string }
export interface PoltStats { pages: number; villages: number; tokens: number; normalised: number; informantLines: number }

const HEAD = /^Село\s+([А-ЯІЇЄҐ][\p{L}'’ʼ\-]+(?:\s*\([^)]{2,30}\))?)\s+([А-ЯІЇЄҐ][\p{L}'’ʼ\-]+ського|[А-ЯІЇЄҐ][\p{L}'’ʼ\-]+)\s+району/u
/** a window of the speech around a token, ≤ 200 characters at a word boundary, in the transcription's own letters (the stress bars kept as the OCR gave them, pause marks as «/»); the quote is of the TEXT, never the whole paragraph */
export function quoteAround(words: string[], i: number, max = 110): string {
  let a = i, b = i + 1, len = words[i]!.length
  while ((a > 0 || b < words.length) && len < max) {
    if (a > 0 && len + words[a - 1]!.length + 1 <= max) { a--; len += words[a]!.length + 1 } else if (b < words.length && len + words[b]!.length + 1 <= max) { len += words[b]!.length + 1; b++ } else break
  }
  const s = words.slice(a, b).join(' ')
  return (a > 0 ? '…' : '') + clip(s, 200) + (b < words.length && !/…$/.test(s) ? '…' : '')
}

/** the informants' speech of the OCR pages: village by village; the lines that carry a speaker mark «Інф. N:» or a dash start a turn, everything else continues it */
export function readPolt(pages: { text: string; no: number }[], st?: PoltStats): { villages: PoltVillage[]; toks: PoltTok[] } {
  const villages: PoltVillage[] = [], toks: PoltTok[] = []
  let cur: PoltVillage | undefined, inSpeech = false
  for (const p of pages) {
    if (st) st.pages++
    const lines = p.text.split('\n')
    let buf: string[] = []
    const flush = (): void => {
      if (!cur || !buf.length) { buf = []; return }
      const words = buf.join(' ').replace(/([\p{L}])-\s+(?=\p{L})/gu, '$1').split(/\s+/).filter(Boolean)
      buf = []
      words.forEach((w, i) => {
        if (st) st.tokens++
        const n = normPolt(w); if (!n) return
        if (st) st.normalised++
        toks.push({ raw: w, norm: n, page: p.no, village: cur!.name, ctx: quoteAround(words, i) })
      })
    }
    for (const raw of lines) {
      const l = raw.trim(); if (!l) { continue }
      const h = HEAD.exec(l)
      if (h) { flush(); cur = { name: h[1]!.replace(/\s*\(.*$/, ''), district: h[2]!, headPage: p.no }; villages.push(cur); inSpeech = false; if (st) st.villages++; continue }
      if (!cur) continue
      if (/^Інформант|^Підпорядковане|^Інф\.\s*\d?\s*:?\s*$/u.test(l) || /^\d+\.\s+[А-ЯІЇЄҐ][\p{L}']+\s+[А-ЯІЇЄҐ]/u.test(l) && /р\.\s*н\./u.test(l)) { flush(); inSpeech = false; continue }
      if (/^Інф\.?\s*\d?\s*:/u.test(l)) { flush(); inSpeech = true; if (st) st.informantLines++; buf.push(l.replace(/^Інф\.?\s*\d?\s*:\s*[-–—]*\s*/u, '')); continue }
      if (/^[-–—]\s/.test(l)) { flush(); inSpeech = true; buf.push(l.replace(/^[-–—]\s*/, '')); continue }
      if (inSpeech) buf.push(l)
    }
    flush()
  }
  return { villages, toks }
}

/** the SeRow of a recorded form: a standard lemma (VESUM) → place-only label; a stress mark is kept on the recorded form (`a`) */
export function poltSeRow(t: PoltTok, page: number): SeRow {
  return { d: POLT_DICT, g: '', n: 1, a: t.norm.recorded, q: t.ctx.slice(0, 200), l: `Говірки Західної Полтавщини 2012, с. ${page}`, lb: [POLT_PLACE], v: [`${t.village}`], vn: 1, unv: 1 }
}

/**
 * Spelling candidates for the LOOKUP of a normalised dialect word, most likely first: the word as normalised; the OCR debris of the stress bar (a lower-case ї inside a word) removed; the hard-before-о reflex
 * (л'о → ло: бул'о ← було); the single-letter reflexes of the middle-Dnieper speech that the transcription records (и ← е: типер, нима; и ← і; у ← о) undone one position at a time. VESUM confirms a candidate;
 * a word that no candidate confirms is not evidence.
 */
export function poltCandidates(w: string): string[] {
  const out: string[] = [], add = (x: string): void => { if (x && x.length >= 1 && !out.includes(x)) out.push(x) }
  add(w)
  const bases = [w, w.replace(/(?<=\p{L})ї(?=\p{L})/gu, ''), w.replace(/ьо/g, 'о'), w.replace(/(?<=\p{L})ї(?=\p{L})/gu, '').replace(/ьо/g, 'о')]
  for (const b of bases) add(b)
  for (const b of bases.slice(0, 4)) {
    for (let i = 0; i < b.length; i++) {
      const c = b[i]!
      if (c === 'и') { add(b.slice(0, i) + 'е' + b.slice(i + 1)); add(b.slice(0, i) + 'і' + b.slice(i + 1)) }
      else if (c === 'у') add(b.slice(0, i) + 'о' + b.slice(i + 1))
      else if (c === 'е') add(b.slice(0, i) + 'и' + b.slice(i + 1))
      else if (c === 'ь' && i === b.length - 1) add(b.slice(0, i))
      if (out.length > 60) return out
    }
  }
  return out
}
