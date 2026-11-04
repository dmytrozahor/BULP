/**
 * SPEC 63 GG-7: imports a licensed СУМ-11 / СУМ-20 dump (JSONL, see core/sum-import.ts) into data/work/se-parsed/<dict>.json, the folder the build already reads for the SE block and the GG headwords.
 * Usage: tsx pipelines/sum-import.ts <sum11|sum20> <dump.jsonl> [out dir]     Full text only when core/rights.ts holds a `granted` entry for the dictionary (RG-1; no environment flag).
 * Atomic and idempotent: rerunning on the same dump rewrites the same bytes.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SUM_DICTS, fullSensesOn, importSum, type SumDict } from '../core/sum-import.ts'
import { maxChars } from '../core/rights.ts'
import { writeJsonAtomic } from './robust.ts'

export function runSumImport(dict: SumDict, file: string, outDir: string): string {
  const full = fullSensesOn(dict), r = importSum(dict, readFileSync(file, 'utf8'), full)
  mkdirSync(outDir, { recursive: true })
  const out = resolve(outDir, `${dict}.json`)
  writeJsonAtomic(out, JSON.stringify({ id: dict, dict, kind: 'sum-licensed', full, stats: r.stats, rows: r.rows }))
  console.log(`${dict}: ${r.stats.articles} articles, ${r.stats.senses} senses, ${r.stats.clipped} glosses clipped to ${maxChars(dict)}, ${r.stats.droppedFull} full texts/quotes dropped, ${r.stats.bad} bad lines; full text ${full ? 'on (granted in core/rights.ts)' : 'off'}`)
  return out
}

if (process.argv[1] && /sum-import\.ts$/.test(process.argv[1].replaceAll('\\', '/'))) {
  const d = process.argv[2] as SumDict, f = process.argv[3]
  if (!SUM_DICTS.includes(d) || !f) { console.error('usage: tsx pipelines/sum-import.ts <sum11|sum20> <dump.jsonl> [out dir]'); process.exit(2) }
  runSumImport(d, resolve(f), resolve(process.argv[4] ?? 'data/work/se-parsed'))
}
