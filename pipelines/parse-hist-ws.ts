/**
 * SPEC 63 SE-12: data/raw/hist-ws/<id>/<n>.json (pipelines/fetch-hist-ws.ts) → data/work/se-parsed/<id>.json { kind: 'heads' }: the headword (a modern-lemma key, folded by `wsKey`) with the Russian gloss,
 * dated by the print year (1798 / 1818). The build attaches the row to a card through the exact key, then the first derivation candidate (parsedRows); dx-hist-load takes the headwords for GG-2.
 * RS-1: idempotent (an output whose srcBytes equals the inputs is kept), tmp + rename; a missing glossary is skipped.
 *   tsx pipelines/parse-hist-ws.ts [rawRoot] [outDir]
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { WS_SPECS, parseWsFlow, parseWsTable, wsRows, type WsArticle, type WsStats } from '../core/hist-ws.ts'
import { writeJsonAtomic } from './robust.ts'

export interface WsResult { id: string; stats: WsStats; rows: number; reused: boolean }
export function parseHistWs(rawRoot: string, outDir: string): WsResult[] {
  mkdirSync(outDir, { recursive: true }); const res: WsResult[] = []
  for (const spec of WS_SPECS) {
    const files = spec.titles.map((_, n) => resolve(rawRoot, spec.id, `${n}.json`)); if (!files.every(existsSync)) continue
    const texts = files.map(f => readFileSync(f, 'utf8')), srcBytes = texts.reduce((n, t) => n + t.length, 0), out = resolve(outDir, `${spec.id}.json`)
    if (existsSync(out)) { try { const j = JSON.parse(readFileSync(out, 'utf8')); if (j.srcBytes === srcBytes) { res.push({ id: spec.id, stats: j.stats, rows: j.rows.length, reused: true }); continue } } catch { /* torn: reparse */ } }
    const articles: WsArticle[] = [], stats: WsStats = { candidates: 0, passed: 0, skippedHead: 0, skippedGloss: 0, passRate: 0 }, revs: number[] = []
    texts.forEach((t, n) => {
      const j = JSON.parse(t) as { html: string; revid?: number }; if (j.revid) revs.push(j.revid)
      const r = spec.layout === 'flow' ? parseWsFlow(j.html) : parseWsTable(j.html, n); articles.push(...r.articles)
      for (const k of ['candidates', 'passed', 'skippedHead', 'skippedGloss'] as const) stats[k] += r.stats[k]
    })
    stats.passRate = stats.candidates ? Math.round((stats.passed / stats.candidates) * 1000) / 1000 : 0
    const rows = wsRows(articles, spec, revs.join('+'))
    writeJsonAtomic(out, JSON.stringify({ id: spec.id, dict: spec.dict, kind: 'heads', srcBytes, stats, source: spec.license, rows }))
    res.push({ id: spec.id, stats, rows: rows.length, reused: false })
  }
  return res
}
if (process.argv[1] && /parse-hist-ws\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const r = parseHistWs(resolve(process.argv[2] ?? 'data/raw/hist-ws'), resolve(process.argv[3] ?? 'data/work/se-parsed'))
  for (const x of r) console.log(`${x.id}: ${x.stats.candidates} candidates, ${x.stats.passed} articles (${(x.stats.passRate * 100).toFixed(1)} %; no head ${x.stats.skippedHead}, no gloss ${x.stats.skippedGloss}), rows ${x.rows}${x.reused ? ' (reused)' : ''}`)
  if (!r.length) console.log('no Wikisource glossaries found (run fetch-hist-ws first)')
}
