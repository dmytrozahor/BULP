/**
 * SPEC 63 GG-7: imports a licensed СУМ-11 / СУМ-20 dump (JSONL, see core/sum-import.ts) into data/work/se-parsed/<dict>.json, the folder the build already reads for the SE block and the GG headwords.
 * Usage: tsx pipelines/sum-import.ts <sum11|sum20> <dump.jsonl> [out dir]     FULL_SENSES_SUM11 / FULL_SENSES_SUM20 = 1 only with written permission (default off).
 * Atomic and idempotent: rerunning on the same dump rewrites the same bytes.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SUM_DICTS, fullSensesFlag, fullSensesOn, importSum, type SumDict } from '../core/sum-import.ts'
import { writeJsonAtomic } from './robust.ts'

export function runSumImport(dict: SumDict, file: string, outDir: string, env: Record<string, string | undefined> = process.env): string {
  const full = fullSensesOn(dict, env), r = importSum(dict, readFileSync(file, 'utf8'), full)
  mkdirSync(outDir, { recursive: true })
  const out = resolve(outDir, `${dict}.json`)
  writeJsonAtomic(out, JSON.stringify({ id: dict, dict, kind: 'sum-licensed', full, stats: r.stats, rows: r.rows }))
  console.log(`${dict}: ${r.stats.articles} articles, ${r.stats.senses} senses, ${r.stats.clipped} glosses clipped to 200, ${r.stats.droppedFull} full texts/quotes dropped, ${r.stats.bad} bad lines; ${fullSensesFlag(dict)}=${full ? 1 : 0}`)
  return out
}

if (process.argv[1] && /sum-import\.ts$/.test(process.argv[1].replaceAll('\\', '/'))) {
  const d = process.argv[2] as SumDict, f = process.argv[3]
  if (!SUM_DICTS.includes(d) || !f) { console.error('usage: tsx pipelines/sum-import.ts <sum11|sum20> <dump.jsonl> [out dir]'); process.exit(2) }
  runSumImport(d, resolve(f), resolve(process.argv[4] ?? 'data/work/se-parsed'))
}
