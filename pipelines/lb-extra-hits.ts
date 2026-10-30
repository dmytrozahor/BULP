/**
 * SPEC 63 LB-16 — the dictionary hits of the label tables that are NOT in the live build yet, read from the r2u dump (data/raw/r2u) without a build: run it where the dump is (the harvester box)
 * and give the result to pipelines/lb-measure.ts (LB_EXTRA_HITS). Every key of every article is kept (`known` = all), the measurement filters to the entries it knows.
 * Env: LB_ROOT (repo root holding data/raw/r2u, default .), LB_EXTRA_TABLES (comma list of table ids, default the tables of LB-16), LB_EXTRA_OUT (JSON, default lb-extra-hits.json).
 * Crash-tolerant: reads only, one atomic write at the end (writeJsonAtomic).
 */
import { resolve } from 'node:path'
import { scanR2u } from './build-labels.ts'
import { writeJsonAtomic } from './robust.ts'

export const LB16_TABLES = ['hrinch-sources']

export function extraHits(root = process.env.LB_ROOT ?? '.', tables: string[] = (process.env.LB_EXTRA_TABLES ?? LB16_TABLES.join(',')).split(',').filter(Boolean)) {
  const scan = scanR2u(resolve(root, 'data/raw/r2u'), () => true, new Set(tables))
  const out: Record<string, unknown[]> = {}
  for (const [k, v] of scan.hits) out[k] = v
  return { out, per: scan.per }
}
if (process.argv[1]?.endsWith('lb-extra-hits.ts')) {
  const { out, per } = extraHits()
  writeJsonAtomic(process.env.LB_EXTRA_OUT ?? 'lb-extra-hits.json', JSON.stringify(out))
  console.log(JSON.stringify({ lemmas: Object.keys(out).length, per }, null, 1))
}
