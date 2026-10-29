/**
 * SPEC 63 SRC-28 part 3: Tesseract OCR pages of Зизаній «Лексис» (1596) and Беринда «Лексікон» (1627) → SE rows.
 *   npx tsx pipelines/parse-hist-lex.ts [ocrRoot] [outDir]
 * ocrRoot (default data/raw/hist-lex-ocr, synced from the worker's ~/work/ocr/): <ocrRoot>/zyzanii1596/page_NNNN.txt, <ocrRoot>/berynda1627/page_NNNN.txt.
 * Output in data/work/se-parsed/ (read by the build stage `senses` via parsedRows, and by dx-hist-load for the headwords):
 *   <id>.json        { id, dict, kind: 'heads', rows: [CS headword, SeRow] }   (b) the Church Slavonic headwords with their «проста мова» equivalents → dictionary-only / archaic cards
 *   <id>-gloss.json  { id, dict, kind: 'hist-gloss', rows: [gloss word, SeRow] } (a) the sense of the gloss word dated by the dictionary's print year → the modern lemma through the folds
 * Second gate (core/hist-lex.ts `verify`): a gloss word counts only when VESUM knows it through the fold candidates (the same keys the corpus linker uses), so OCR noise never becomes a row.
 * RS-1: resumable and idempotent (an output whose srcBytes equals the current OCR size is kept), tmp + rename; a missing OCR directory is skipped, not an error.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { HIST_LEX_SPECS, glossRows, headRows, parsePages, glossItems, pageCandidates, lexForm, type LexStats } from '../core/hist-lex.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold } from '../core/orthography.ts'
import { writeJsonAtomic } from './robust.ts'
import { wantedKeys } from './build-link.ts'
import { vesumIndex } from './vesum.ts'

export function readPages(dir: string): { page: number; text: string }[] {
  return readdirSync(dir).filter(f => /^page_\d+\.txt$/.test(f)).sort().map(f => ({ page: +f.slice(5, 9), text: readFileSync(resolve(dir, f), 'utf8') }))
}

/** known-word predicate over `words`: VESUM through the same fold candidates as the corpus linker (orthography ярижка, then the usual derive) */
export async function vesumVerifier(words: string[]): Promise<(w: string) => boolean> {
  const derive = (x: string, oldI: boolean) => deriveRaw(x, { oldI })
  const keysOf = (w: string) => wantedKeys({ lang: 'uk' as const, oldI: false, orth: 'ярижка', raw: w }, { derive, fold })
  const forms = new Set<string>(); for (const w of new Set(words)) for (const k of keysOf(w)) forms.add(k)
  const hits = (await vesumIndex(forms, new Set())).hits
  const memo = new Map<string, boolean>()
  return (w: string) => { let r = memo.get(w); if (r === undefined) { r = keysOf(w).some(k => hits.has(k)); memo.set(w, r) } return r }
}

export interface HistLexResult { id: string; stats: LexStats; heads: number; gloss: number; reused: boolean }
export async function parseHistLex(ocrRoot: string, outDir: string, verifier: (words: string[]) => Promise<(w: string) => boolean> = vesumVerifier): Promise<HistLexResult[]> {
  mkdirSync(outDir, { recursive: true })
  const res: HistLexResult[] = []
  for (const spec of Object.values(HIST_LEX_SPECS)) {
    const dir = resolve(ocrRoot, spec.id); if (!existsSync(dir)) continue
    const pages = readPages(dir), srcBytes = pages.reduce((n, p) => n + Buffer.byteLength(p.text), 0)
    const hf = resolve(outDir, `${spec.id}.json`), gf = resolve(outDir, `${spec.id}-gloss.json`)
    if (existsSync(hf) && existsSync(gf)) {
      try { const j = JSON.parse(readFileSync(hf, 'utf8')); if (j.srcBytes === srcBytes) { res.push({ id: spec.id, stats: j.stats, heads: j.rows.length, gloss: JSON.parse(readFileSync(gf, 'utf8')).rows.length, reused: true }); continue } } catch { /* torn: reparse */ }
    }
    const cand = new Set<string>()
    for (const p of pages) for (const c of pageCandidates(p.text)) { cand.add(lexForm(c.head)); for (const g of glossItems(c.gloss)) if (!g.includes(' ')) cand.add(lexForm(g)) }
    const verify = await verifier([...cand])
    const { articles, stats } = parsePages(pages, spec, verify), heads = headRows(articles, spec), gloss = glossRows(articles, spec)
    writeJsonAtomic(hf, JSON.stringify({ id: spec.id, dict: spec.dict, kind: 'heads', srcBytes, stats, rows: heads }))
    writeJsonAtomic(gf, JSON.stringify({ id: spec.id, dict: spec.dict, kind: 'hist-gloss', srcBytes, stats, rows: gloss }))
    res.push({ id: spec.id, stats, heads: heads.length, gloss: gloss.length, reused: false })
  }
  return res
}

if (process.argv[1] && /parse-hist-lex\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const r = await parseHistLex(resolve(process.argv[2] ?? 'data/raw/hist-lex-ocr'), resolve(process.argv[3] ?? 'data/work/se-parsed'))
  for (const x of r) console.log(`${x.id}: ${x.stats.pages} pages, ${x.stats.candidates} candidate lines, ${x.stats.passed} passed (${(x.stats.passRate * 100).toFixed(1)} %; verify-rejected ${x.stats.skippedVerify}), head rows ${x.heads}, gloss rows ${x.gloss}${x.reused ? ' (reused)' : ''}`)
  if (!r.length) console.log('no OCR directories found')
}
