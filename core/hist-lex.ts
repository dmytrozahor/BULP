/**
 * SPEC 63 SRC-28 part 3: article parser for the two Ruthenian bilingual dictionaries printed with Church Slavonic headwords and «проста мова» glosses:
 *   - Лаврентій Зизаній, «Лексис, сиречь реченія, вкратце собраны и из словенска языка на простый рускій діалект истолкованы» (Вільно 1596; research/44 r10);
 *   - Памво Беринда, «Лексікон славенороссійскій и именъ тлъкованіє» (Київ 1627; NOT Зизаній's: research/45-hv4-old-grammars.md).
 * Both are public domain (prints of 1596 and 1627; the scan of 1627 carries the Public Domain Mark), so full glosses are kept.
 * An article = «Headword: gloss, gloss, …» (the first part a Church Slavonic word, the second one or more words of the simple language). Pure (no node imports).
 *
 * Quality (OQ): the input is Tesseract OCR of 400-year-old print, which is mostly noise. Nothing is guessed: an article is emitted only when its headword is a word-like Cyrillic token (headwordOk) and
 * at least one gloss item is a word-like token, and the OCR score of its gloss text (core/se-parse.ts ocrScore) reaches the dictionary's threshold. Everything else is counted, never emitted. A row
 * is a KEY → card attachment; `verify` (the pipeline passes VESUM through the fold candidates) is a second gate: a gloss word must be a known word, a headword that is not known needs two known glosses; the build never creates a lemma from a row (parsedRows in pipelines/build-se.ts). Dating: the dictionary's own print year (SE-1: `e`), the date the gloss word is
 * documented in this sense.
 */
import { headwordOk, ocrScore, wordish } from './se-parse.ts'
import type { SeRow } from './se.ts'

export interface HistLexSpec { id: string; dict: string; year: number; short: string; minScore: number }
export const HIST_LEX_SPECS: Record<string, HistLexSpec> = {
  zyzanii1596: { id: 'zyzanii1596', dict: 'zyzanii-lexis', year: 1596, short: 'Зизаній, Лексис', minScore: 0.75 },
  berynda1627: { id: 'berynda1627', dict: 'berynda', year: 1627, short: 'Беринда, Лексікон', minScore: 0.75 },
}

/** words shorter than this are never emitted: VESUM knows many 2–3 letter words that OCR debris spells by chance */
export const MIN_WORD = 4
export interface LexArticle { head: string; glosses: string[]; /** the page (scan number) the line stands on */ page: number }
export interface LexStats { pages: number; lines: number; candidates: number; skippedHead: number; skippedGloss: number; skippedScore: number; skippedVerify: number; passed: number; glossWords: number; passRate: number }

const clean = (s: string) => s.normalize('NFC').replace(/[́̀̂̃]/g, '').replace(/[\s ]+/g, ' ').trim()
const stripEdge = (s: string) => s.replace(/^[\s.,;:!?()«»"“”„…\-–—'’*•|]+|[\s.,;:!?()«»"“”„…\-–—'’*•|]+$/g, '')
/** the stable lower-case form of a dictionary word (stress marks gone) */
export const lexForm = (w: string) => clean(stripEdge(w)).toLowerCase()

/** split the gloss text into items (comma / semicolon / «или»); an item with spaces is a phrase (kept as text, never a key) */
export function glossItems(g: string): string[] {
  return g.split(/\s*[,;]\s*|\s+или\s+|\s+аль\s+/).map(x => stripEdge(clean(x))).filter(x => x.length >= 2)
}

/**
 * One page of OCR text → raw (headword, gloss text) candidate lines. A line with «:» starts an article (the text before the FIRST colon is the headword, at most two words); a line without
 * one continues the previous gloss (a word hyphenated at the end of the line is joined).
 */
export function pageCandidates(text: string): { head: string; gloss: string }[] {
  const out: { head: string; gloss: string }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw); if (!line) continue
    const i = line.indexOf(':')
    if (i > 0 && i <= 40) {
      const head = stripEdge(line.slice(0, i)), gloss = line.slice(i + 1).replace(/^[\s:]+/, '')
      if (head && head.split(' ').length <= 2) { out.push({ head, gloss }); continue }
    }
    const last = out[out.length - 1]
    if (last) last.gloss = /[\p{L}]-$/u.test(last.gloss) ? last.gloss.slice(0, -1) + line : `${last.gloss} ${line}`
  }
  return out
}

/** the gate: a headword of one word-like token; a gloss with ≥ 1 word-like item and a text OCR score ≥ minScore */
export function parsePages(pages: { page: number; text: string }[], spec: HistLexSpec, verify?: (w: string) => boolean): { articles: LexArticle[]; stats: LexStats } {
  const st: LexStats = { pages: pages.length, lines: 0, candidates: 0, skippedHead: 0, skippedGloss: 0, skippedScore: 0, skippedVerify: 0, passed: 0, glossWords: 0, passRate: 0 }
  const articles: LexArticle[] = []
  for (const p of pages) {
    for (const c of pageCandidates(p.text)) {
      st.lines++
      if (!c.gloss) continue
      st.candidates++
      const head = lexForm(c.head)
      if (head.includes(' ') || head.length < MIN_WORD || !headwordOk(head)) { st.skippedHead++; continue }
      const items = glossItems(c.gloss), good = items.filter(x => !x.includes(' ') ? wordish(lexForm(x)) : x.split(' ').every(y => wordish(lexForm(y))))
      if (!good.length) { st.skippedGloss++; continue }
      if (ocrScore(c.gloss) < spec.minScore) { st.skippedScore++; continue }
      let glosses = [...new Set(good.map(lexForm))]
      if (verify) {   // second gate: a gloss word must be a known word of the language (VESUM through the folds); an unknown headword needs two such glosses
        const ok = glosses.filter(g => !g.includes(' ') && g.length >= MIN_WORD && verify(g))
        if (ok.length < (verify(head) ? 1 : 2)) { st.skippedVerify++; continue }
        glosses = ok
      }
      articles.push({ head, glosses, page: p.page }); st.passed++; st.glossWords += glosses.filter(g => !g.includes(' ')).length
    }
  }
  st.passRate = st.candidates ? Math.round((st.passed / st.candidates) * 1000) / 1000 : 0
  return { articles, stats: st }
}

/** (b) the Church Slavonic headword row: its «простою мовою» equivalents are the gloss; dated by the print year */
export const headRows = (a: LexArticle[], spec: HistLexSpec): [string, SeRow][] =>
  a.map(x => [x.head, { d: spec.dict, g: `проста мова: ${x.glosses.join(', ')}`.slice(0, 200), e: [spec.year, spec.year], l: `${spec.short}, скан ${x.page}` } as SeRow])

/**
 * (a) the sense of the GLOSS word: one row per single-word equivalent, keyed by the gloss word (the build attaches it to the modern lemma through exact key, then the fold candidates of the word);
 * `g` names the Church Slavonic headword it translated and the other equivalents of the article; dated by the dictionary's print year.
 */
export const glossRows = (a: LexArticle[], spec: HistLexSpec): [string, SeRow][] =>
  a.flatMap(x => x.glosses.filter(g => !g.includes(' ')).map(g => [g, { d: spec.dict, g: `ц.-сл. «${x.head}»${x.glosses.length > 1 ? ` = ${x.glosses.filter(y => y !== g).join(', ')}` : ''}`.slice(0, 200), e: [spec.year, spec.year], l: `${spec.short}, скан ${x.page}` } as SeRow] as [string, SeRow]))
