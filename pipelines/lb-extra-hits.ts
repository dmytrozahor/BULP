/**
 * SPEC 63 LB-16 — the dictionary hits of the label tables that are NOT in the live build yet, read from the r2u dump (data/raw/r2u) without a build: run it where the dump is (the harvester box)
 * and give the result to pipelines/lb-measure.ts (LB_EXTRA_HITS). Every key of every article is kept (`known` = all), the measurement filters to the entries it knows.
 * Env: LB_ROOT (repo root holding data/raw/r2u, default .), LB_EXTRA_TABLES (comma list of table ids, default the tables of LB-16), LB_EXTRA_OUT (JSON, default lb-extra-hits.json).
 * Crash-tolerant: reads only, one atomic write at the end (writeJsonAtomic).
 */
import { resolve } from 'node:path'
import { scanR2u } from './build-labels.ts'
import { writeJsonAtomic } from './robust.ts'
import { DICT_LABEL_TABLES, EXTRA_LABEL_TABLES } from '../core/dict-labels.ts'
import { existsSync, readFileSync } from 'node:fs'

export const LB16_TABLES = ['hrinch-sources']

export function extraHits(root = process.env.LB_ROOT ?? '.', tables: string[] = (process.env.LB_EXTRA_TABLES ?? LB16_TABLES.join(',')).split(',').filter(Boolean)) {
  const scan = scanR2u(resolve(root, 'data/raw/r2u'), () => true, new Set(tables))
  const out: Record<string, unknown[]> = {}
  for (const [k, v] of scan.hits) out[k] = v
  return { out, per: scan.per }
}
if (process.argv[1]?.endsWith('lb-extra-hits.ts') && process.env.LB_EXTRA_NEW) {
  const bp = process.env.LB_EXTRA_BASE ?? '', base = bp && existsSync(bp) ? JSON.parse(readFileSync(bp, 'utf8')) : {}
  const out = newHits(base); writeJsonAtomic(process.env.LB_EXTRA_OUT ?? 'lb-extra-hits.json', JSON.stringify(out)); console.log(JSON.stringify({ lemmas: Object.keys(out).length }))
} else if (process.argv[1]?.endsWith('lb-extra-hits.ts')) {
  const { out, per } = extraHits()
  writeJsonAtomic(process.env.LB_EXTRA_OUT ?? 'lb-extra-hits.json', JSON.stringify(out))
  console.log(JSON.stringify({ lemmas: Object.keys(out).length, per }, null, 1))
}

/**
 * SPEC 63 LB-17 — the hits that a change of the readers ADDS to a baseline: scan every table of the dump and keep a hit only if it marks an area or a dialect (kind area / dialectal, the kinds that make
 * the class «діалектне за словником») and is absent from `base` (a JSON of key → hits written by this script with LB_EXTRA_TABLES=all before the change). Same output shape as extraHits.
 * Env: LB_EXTRA_BASE (JSON, optional), LB_EXTRA_TABLES=all|ids.
 */
export function newHits(base: Record<string, { t: string; a: string; u: string }[]>, root = process.env.LB_ROOT ?? '.', tables?: string[]) {
  const ids = new Set((tables ?? [...DICT_LABEL_TABLES, ...EXTRA_LABEL_TABLES].map(t => t.id)))
  const scan = scanR2u(resolve(root, 'data/raw/r2u'), () => true, ids)
  const out: Record<string, unknown[]> = {}
  for (const [k, v] of scan.hits) {
    const add = v.filter(h => (h.kind === 'area' || h.kind === 'dialectal') && !(base[k] ?? []).some(x => x.t === h.t && x.a === h.a && x.u === h.u))
    if (add.length) out[k] = add
  }
  return out
}
