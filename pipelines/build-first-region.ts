/**
 * BUILD step SPEC 63 DB-2: the earliest reliable attestation of every lemma PER REGION -> public/data/lm/fr/<bucket>.json (4096 buckets by lk(lemma), like lm/lb), read lazily by the badge and
 * the search rows (never in a core card, never on the keystroke path). Reads public/data/lex/*.json (forms[].byW) and corpus.json (witness dates, regions, the OQ gate `oq`, CQ-2 `dateUncertain`).
 * Runs after build.ts: `npx tsx pipelines/build-first-region.ts`. Env: PARTS_DATA (public/data), FR_OUT (output dir, default PARTS_DATA/lm/fr).
 * RS-1: shards are written under lm/fr.next and swapped in after all succeeded.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { lk } from '../core/cv.ts'
import { seBucket } from '../core/parts.ts'
import { firstRegions, pickFirst, type FrEntry, type FrWitness } from '../core/first-region.ts'
import { REGIONS, regionOf } from './regions.ts'
import { swapDir, writeJsonAtomic } from './robust.ts'

const PUB = process.env.PARTS_DATA ?? 'public/data', OUT = process.env.FR_OUT ?? `${PUB}/lm/fr`
const nameOf = new Map(REGIONS.map(r => [r.code, r.name] as const))

export function buildFirstRegion(): { lemmas: number; withMain: number; thin: number; shards: number; worstGz: number; totalGz: number } {
  const wits = new Map((JSON.parse(readFileSync(`${PUB}/corpus.json`, 'utf8')) as { witnesses: (FrWitness & { region?: string })[] }).witnesses.map(w => [w.id, w] as const))
  const regOf = (w: FrWitness) => {
    const c = regionOf(w.region); if (!c) return undefined
    return { code: c, place: !REGIONS.some(r => r.match.test((w.region ?? '').trim())) }
  }
  const parts = new Map<number, Record<string, FrEntry>>()
  let lemmas = 0, withMain = 0, thin = 0
  for (const f of readdirSync(`${PUB}/lex`)) {
    if (!f.endsWith('.json')) continue
    const sh = JSON.parse(readFileSync(`${PUB}/lex/${f}`, 'utf8')) as { lemmas: string[]; details: { forms: { byW?: Record<string, number>; ocrOnly?: true }[] }[] }
    sh.lemmas.forEach((lemma, i) => {
      const by: Record<string, number> = {}
      for (const fm of sh.details[i]?.forms ?? []) for (const [w, n] of Object.entries(fm.byW ?? {})) by[w] = (by[w] ?? 0) + n
      const e = firstRegions(by, id => wits.get(id), regOf); lemmas++
      if (!e) return
      const k = lk(lemma), b = seBucket(k); if (!parts.has(b)) parts.set(b, {}); parts.get(b)![k] = e
      const p = pickFirst(e, c => nameOf.get(c) ?? c); if (p) { withMain++; if (p.thin) thin++ }
    })
  }
  const next = `${OUT}.next`; rmSync(next, { recursive: true, force: true }); mkdirSync(next, { recursive: true })
  let worstGz = 0, totalGz = 0
  for (const [b, p] of parts) { const text = JSON.stringify(p), gz = gzipSync(text).length; worstGz = Math.max(worstGz, gz); totalGz += gz; writeJsonAtomic(`${next}/${b}.json`, text) }
  mkdirSync(`${OUT}/..`, { recursive: true }); swapDir(next, OUT)
  return { lemmas, withMain, thin, shards: parts.size, worstGz, totalGz }
}
if (process.argv[1]?.endsWith('build-first-region.ts')) {
  if (!existsSync(`${PUB}/corpus.json`)) throw new Error(`${PUB}/corpus.json missing`)
  const t0 = Date.now(), r = buildFirstRegion()
  console.log(`first-region: ${r.lemmas} lemmas, ${r.withMain} with a main chip (${r.thin} thin = hypothesis style), ${r.shards} shards, worst ${(r.worstGz / 1024).toFixed(1)} KB gz, avg ${(r.totalGz / Math.max(1, r.shards) / 1024).toFixed(1)} KB gz, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
