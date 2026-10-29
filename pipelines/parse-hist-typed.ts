/**
 * SPEC 63 SRC-4: the typed pages (data/raw/hist-typed/<id>/*.htm, pipelines/fetch-hist-typed.ts) → SE rows in data/work/se-parsed/ (read by the stage `senses` and dx-hist-load):
 *   <id>.json        { kind: 'heads' }      the old headword with its East Slavic equivalents → dictionary-only / archaic cards (GG-2 corroboration)
 *   <id>-gloss.json  { kind: 'hist-gloss' } the sense of the one-word gloss, dated by the manuscript / the period → the modern lemma through the exact key and the folds
 * RS-1: idempotent (an output whose srcBytes equals the current input size is kept), tmp + rename; a missing list is skipped, not an error.
 *   tsx pipelines/parse-hist-typed.ts [rawRoot] [outDir]
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TYPED_LEX_SPECS, TYPED_SOURCE, parseTypedLexicon, typedGlossRows, typedHeadRows } from '../core/hist-typed.ts'
import type { LexArticle, LexStats } from '../core/hist-lex.ts'
import { writeJsonAtomic } from './robust.ts'

export interface TypedResult { id: string; stats: LexStats; heads: number; gloss: number; reused: boolean }
export function parseHistTyped(rawRoot: string, outDir: string): TypedResult[] {
  mkdirSync(outDir, { recursive: true }); const res: TypedResult[] = []
  for (const spec of TYPED_LEX_SPECS) {
    const files = spec.pages.map(p => resolve(rawRoot, spec.id, p)); if (!files.every(existsSync)) continue
    const bufs = files.map(f => readFileSync(f)), srcBytes = bufs.reduce((n, b) => n + b.length, 0)
    const hf = resolve(outDir, `${spec.id}.json`), gf = resolve(outDir, `${spec.id}-gloss.json`)
    if (existsSync(hf) && existsSync(gf)) { try { const j = JSON.parse(readFileSync(hf, 'utf8')); if (j.srcBytes === srcBytes) { res.push({ id: spec.id, stats: j.stats, heads: j.rows.length, gloss: JSON.parse(readFileSync(gf, 'utf8')).rows.length, reused: true }); continue } } catch { /* torn: reparse */ } }
    const articles: LexArticle[] = [], stats: LexStats = { pages: 0, lines: 0, candidates: 0, skippedHead: 0, skippedGloss: 0, skippedScore: 0, skippedVerify: 0, passed: 0, glossWords: 0, passRate: 0 }
    for (const b of bufs) {
      const r = parseTypedLexicon(new TextDecoder('windows-1251').decode(b), spec); articles.push(...r.articles)
      for (const k of ['pages', 'lines', 'candidates', 'skippedHead', 'skippedGloss', 'skippedScore', 'skippedVerify', 'passed', 'glossWords'] as const) stats[k] += r.stats[k]
    }
    stats.passRate = stats.candidates ? Math.round((stats.passed / stats.candidates) * 1000) / 1000 : 0
    const heads = typedHeadRows(articles, spec), gloss = typedGlossRows(articles, spec)
    writeJsonAtomic(hf, JSON.stringify({ id: spec.id, dict: spec.dict, kind: 'heads', srcBytes, stats, source: TYPED_SOURCE, rows: heads }))
    writeJsonAtomic(gf, JSON.stringify({ id: spec.id, dict: spec.dict, kind: 'hist-gloss', srcBytes, stats, source: TYPED_SOURCE, rows: gloss }))
    res.push({ id: spec.id, stats, heads: heads.length, gloss: gloss.length, reused: false })
  }
  return res
}
if (process.argv[1] && /parse-hist-typed\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const r = parseHistTyped(resolve(process.argv[2] ?? 'data/raw/hist-typed'), resolve(process.argv[3] ?? 'data/work/se-parsed'))
  for (const x of r) console.log(`${x.id}: ${x.stats.candidates} candidates, ${x.stats.passed} articles (${(x.stats.passRate * 100).toFixed(1)} %; no head ${x.stats.skippedHead}, no gloss ${x.stats.skippedGloss}), head rows ${x.heads}, gloss rows ${x.gloss}${x.reused ? ' (reused)' : ''}`)
  if (!r.length) console.log('no typed lists found (run fetch-hist-typed first)')
}
