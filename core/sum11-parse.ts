/**
 * SPEC 63 GG-7 — СУМ-11 article parser (the owner's DjVu scans «sum11_tNN.djvu»; text = `djvutxt`, one form feed per page). Pure (no node imports).
 * Layout: running head «Перше / стор. / Останнє» (the page number is printed on one page of a spread only). The early volumes print a headword in bold lower case with a capital
 * («Вага, и, ж. 1. …») at a line start, the later ones in CAPITALS («ПЕРЕТРИМУВАННЯ, я, с.»): a capitalized headword is taken only at a line start AND only with a grammar block right
 * after it (inflections + POS or «а, е.»), so quotation lines that begin with a capital word do not qualify. © policy: core/sum-article.ts.
 */
import { GRAM_SRC, HEAD_CAPS, articlesOf, joinLines, newStats, pageHead, type Cand, type SumStats } from './sum-article.ts'
import type { SumArticleIn } from './sum-import.ts'

export { SUM_LABELS as SUM11_LABELS, senseOf as senseOf11 } from './sum-article.ts'
const MARK = '\u0001'
const HEAD11 = new RegExp(String.raw`\u0001([А-ЯІЇЄҐ][а-яіїєґ'’\-́]{1,40})[¹²³⁴]?${GRAM_SRC}`, 'gu')
const LINE11 = /^[А-ЯІЇЄҐ][а-яіїєґ'’\-́]{1,40}[¹²³⁴]?,\s/u
export type Sum11Stats = SumStats

/** one volume's text (pages split by a form feed) → articles in the import format; `firstPage` numbers the first page when no page of the volume has a readable running head */
export function parseSum11(text: string, vol: number, firstPage?: number, minScore = 0.7): { articles: SumArticleIn[]; stats: SumStats } {
  const st = newStats(), articles: SumArticleIn[] = []
  let last: number | undefined
  text.split('\f').forEach((raw, pi) => {
    if (raw.trim().length < 60) { st.pagesNoText++; return }
    st.pages++
    const ph = pageHead(raw)
    const page = ph.page ?? (last !== undefined ? last + 1 : firstPage === undefined ? undefined : firstPage + pi); last = page ?? last
    const t = joinLines(ph.rest.map(l => (LINE11.test(l) ? MARK + l : l)))
    // the markers are removed from the text: every candidate shifts by the markers before it (its own included)
    const before = (pos: number): number => (t.slice(0, pos).match(/\u0001/g) ?? []).length
    const clean = t.replaceAll(MARK, '')
    const low: Cand[] = [...t.matchAll(HEAD11)].map(m => ({ head: m[1]!, gram: m[2]!, start: m.index! - before(m.index!), end: m.index! + m[0].length - before(m.index! + m[0].length) }))
    const caps: Cand[] = [...clean.matchAll(HEAD_CAPS)].map(m => ({ head: m[1]!, gram: m[2]!, start: m.index!, end: m.index! + m[0].length }))
    const cands = [...low, ...caps].sort((a, b) => a.start - b.start)
    articles.push(...articlesOf(clean, cands, ph, vol, page, st, minScore))
  })
  return { articles, stats: st }
}
