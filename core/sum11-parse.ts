/**
 * SPEC 63 GG-7 — СУМ-11 article parser STUB for the scans the owner may upload (11 volumes, OCR text with one form feed per page), built on the SE-11 helpers of core/se-parse.ts.
 * Pure (no node imports). Output = SumArticleIn (core/sum-import.ts), so the © policy of importSum applies unchanged: the headword, stress, POS/grammar, sense numbers, labels, volume
 * and page are kept, the gloss is cut to 200 characters, and the full sense text travels in `full` ONLY to be dropped unless FULL_SENSES_SUM11 is on. No quotation is extracted.
 * Stub: tuned on the printed layout «ХАТА, и, ж. 1. розм. Сільський житловий будинок. // …  2. перен. …», not yet run on real scans (stress in OCR'd headwords is rare; OCR quality gate as SE-11).
 */
import { GLOSS_MAX, glossOk, headwordOk, ocrScore, splitArticles, splitSenses } from './se-parse.ts'
import type { SumArticleIn } from './sum-import.ts'

/** usage labels as printed in СУМ-11 (the list is closed on purpose: an unknown abbreviation stays in the gloss) */
export const SUM11_LABELS = ['розм', 'заст', 'діал', 'перен', 'спец', 'рідко', 'книжн', 'поет', 'ірон', 'жарт', 'зневажл', 'пестл', 'вульг', 'уроч', 'фольк', 'проф', 'техн', 'мед', 'бот', 'зоол', 'військ', 'юр', 'церк', 'пошир', 'неол', 'арх', 'присл', 'фам', 'лайл', 'евф'] as const
const LABEL_RE = new RegExp(`^(${SUM11_LABELS.join('|')})\\.[\\s,;]*`, 'u')
const XREF11 = /^[.\s]*(?:[а-яіїє]{1,7}\.\s*)*(?:[Дд]ив\.|Те саме,? що)/u
const GRAM = /^(?:[а-яіїєґ]{1,4},\s*)?((?:[а-яіїє]{1,7}\.(?:\s*[а-яіїє]{1,4}\.)?[,\s]*){1,3})/u

/** the stress mark of a printed headword: «ХА́ТА» in the OCR line → map «хата» → «ха́та» */
function stressedHeads(page: string): Map<string, string> {
  const m = new Map<string, string>()
  for (const line of page.split('\n')) {
    const h = /^([А-ЯІЇЄҐ'’\-́]{2,40})/u.exec(line.trim())?.[1]
    if (h?.includes('́')) m.set(h.replace(/́/g, '').toLowerCase(), h.toLowerCase().normalize('NFC'))
  }
  return m
}

/** labels at the start of a sense text, then the gloss up to the first «:», « // » or sentence end */
export function senseOf11(text: string): { labels: string[]; gloss: string; full: string } {
  let t = text.replace(/\s+/g, ' ').trim()
  const labels: string[] = []
  for (let m = LABEL_RE.exec(t); m && labels.length < 4; m = LABEL_RE.exec(t)) { labels.push(m[1] + '.'); t = t.slice(m[0].length) }
  const cut = t.search(/\s\/\/\s|:\s|(?<=[\p{Ll})])\.\s+(?=[А-ЯІЇЄ«"(])/u)
  const gloss = (cut < 0 ? t : t.slice(0, cut)).replace(/^[\s,.;:–—-]+/, '').replace(/[\s,;:.]+$/, '')
  return { labels, gloss, full: t }
}

export interface Sum11Stats { pages: number; skippedPage: number; candidates: number; crossRefs: number; skippedHead: number; skippedScore: number; skippedNoSense: number; entries: number; senses: number }
/** one OCR text (pages split by a form feed) of volume `vol`; `firstPage` numbers the pages → articles in the import format */
export function parseSum11(text: string, vol: number, firstPage?: number, minScore = 0.72): { articles: SumArticleIn[]; stats: Sum11Stats } {
  const st: Sum11Stats = { pages: 0, skippedPage: 0, candidates: 0, crossRefs: 0, skippedHead: 0, skippedScore: 0, skippedNoSense: 0, entries: 0, senses: 0 }
  const articles: SumArticleIn[] = []
  text.split('\f').forEach((raw, pi) => {
    if (raw.trim().length < 40) return
    st.pages++
    if (ocrScore(raw) < 0.5) { st.skippedPage++; return }
    const stress = stressedHeads(raw), page = firstPage === undefined ? undefined : firstPage + pi
    for (const a of splitArticles(raw.replace(/́/g, ''))) {
      st.candidates++
      const head = a.variants[0]!.toLowerCase().replace(/[\d¹²³]+$/, '')
      if (!headwordOk(head)) { st.skippedHead++; continue }
      let body = a.body
      const gm = GRAM.exec(body), pos = gm ? gm[0].replace(/[,\s]+$/, '').slice(0, 24) : undefined
      if (gm) body = body.slice(gm[0].length)
      if (XREF11.test(body) && body.length < 90) { st.crossRefs++; continue }
      if (ocrScore(a.body) < minScore) { st.skippedScore++; continue }
      const parts = splitSenses(body)
      const senses = parts.filter(p => p.n > 0 || parts.length === 1).map(p => ({ n: p.n || 1, ...senseOf11(p.text) })).filter(s => s.gloss.length >= 2 && glossOk(s.gloss.slice(0, GLOSS_MAX)))
      if (!senses.length) { st.skippedNoSense++; continue }
      st.entries++; st.senses += senses.length
      articles.push({ head, ...(stress.has(head) ? { stress: stress.get(head)! } : {}), ...(pos ? { pos } : {}), vol, ...(page !== undefined ? { page } : {}), senses: senses.slice(0, 12).map(s => ({ n: s.n, labels: s.labels, gloss: s.gloss, full: s.full })) })
    }
  })
  return { articles, stats: st }
}
