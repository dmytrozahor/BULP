/** SPEC 63 DB-1: share of cards by badge grade over the built lm/lb shards (the first chip decides; spelling and CR-1 signals are not available offline, so `hyp` is a lower bound). `npx tsx pipelines/badge-shares.ts [lb dir]` */
import { readdirSync, readFileSync } from 'node:fs'
import { badgeChips } from '../core/dialect-badge.ts'
import type { LbEntry } from '../core/labels.ts'

const dir = process.argv[2] ?? 'public/data/lm/lb'
const all: Record<string, number> = {}, corp: Record<string, number> = {}
let n = 0, nc = 0
for (const f of readdirSync(dir)) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Record<string, LbEntry>
  for (const [k, e] of Object.entries(j)) {
    const g = badgeChips({ d: e.d, regionName: c => c, lemma: k })[0]?.grade ?? 'none'
    all[g] = (all[g] ?? 0) + 1; n++
    if (e.corpus) { corp[g] = (corp[g] ?? 0) + 1; nc++ }
  }
}
const pct = (o: Record<string, number>, t: number) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, `${v} (${((v / t) * 100).toFixed(1)} %)`]))
console.log('all lemmas', n, pct(all, n)); console.log('corpus cards', nc, pct(corp, nc))
