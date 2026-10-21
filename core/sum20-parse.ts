/**
 * SPEC 63 GG-7 — СУМ-20 article parser (the owner's PDFs «sum20_tNN.pdf»: a real, if imperfect, text layer, one form feed per page). Pure (no node imports).
 * Layout: running head «ПЕРШЕ / стор. / ОСТАННЄ», headwords in CAPITALS inside the running text («МАСЛЕЧКО, а, с. Пестл. до масло 1. …»). © policy: core/sum-article.ts.
 * Stress marks do not survive this text layer (ó is read as «б» or «ь»), so a stress is kept only where a combining acute really is in the headword.
 */
import { HEAD_CAPS, articlesOf, joinLines, newStats, pageHead, type Cand, type SumStats } from './sum-article.ts'
import type { SumArticleIn } from './sum-import.ts'

/** one volume's text (pages split by a form feed) → articles in the import format (core/sum-import.ts) */
export function parseSum20(text: string, vol: number, minScore = 0.7): { articles: SumArticleIn[]; stats: SumStats } {
  const st = newStats(), articles: SumArticleIn[] = []
  let last: number | undefined
  text.split('\f').forEach((raw, pi) => {
    if (raw.trim().length < 60) { st.pagesNoText++; return }
    st.pages++
    const ph = pageHead(raw), t = joinLines(ph.rest)
    const page = ph.page ?? (last !== undefined ? last + 1 : pi + 1); last = page
    const cands: Cand[] = [...t.matchAll(HEAD_CAPS)].map(m => ({ head: m[1]!, gram: m[2]!, start: m.index!, end: m.index! + m[0].length }))
    articles.push(...articlesOf(t, cands, ph, vol, page, st, minScore))
  })
  return { articles, stats: st }
}
