/**
 * BUILD step GG-14: stress from the sources that print it (core/stress-src.ts) → data/work/stsrc/<bucket>.json (not committed), copied by build-parts into public/data/lm/st/.
 * Inputs (each optional; a missing one is reported, not guessed): data/work/se-parsed/{sum11,sum20}.json (headword + stress, GG-7), data/work/r2u-rows.json (r2u dictionaries), data/raw/kaikki/uk.jsonl (en.wiktionary, CC BY-SA).
 * Crash-tolerant (RS-1): shards are written atomically into stsrc.next, which replaces stsrc only after the pass has finished.
 *   npx tsx pipelines/build-stress-src.ts     (env: none; reads the repo's data directories)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { StBuilder, kaikkiCands, r2uCands, sumCand, type StShard } from '../core/stress-src.ts'
import { r2uDictById } from './r2u.ts'
import { fileLines } from './vesum.ts'
import { writeJsonAtomic } from './robust.ts'
import type { SeRow } from '../core/se.ts'
import type { RowsFile } from './ingest-r2u.ts'

export interface StressSrcStats { shards: number; lemmas: number; variants: number; forms: number; bySrc: Record<string, number>; skipped: Record<string, number>; worstGz: number }

export async function collectStress(root: string, b = new StBuilder(), stats: Pick<StressSrcStats, 'bySrc' | 'skipped'> = { bySrc: {}, skipped: {} }): Promise<StBuilder> {
  const hit = (s: string) => { stats.bySrc[s] = (stats.bySrc[s] ?? 0) + 1 }, skip = (s: string) => { stats.skipped[s] = (stats.skipped[s] ?? 0) + 1 }
  for (const d of ['sum11', 'sum20']) {
    const f = resolve(root, 'data/work/se-parsed', d + '.json'); if (!existsSync(f)) { skip(d + ': немає файлу'); continue }
    let j: { rows: [string, SeRow][] }; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch { skip(d + ': пошкоджений файл'); continue }
    for (const [head, row] of j.rows) { const c = sumCand(head, row); if (c) { b.add(c); hit(d) } }
  }
  const rf = resolve(root, 'data/work/r2u-rows.json')
  if (existsSync(rf)) {
    try {
      const rows = (JSON.parse(readFileSync(rf, 'utf8')) as RowsFile).rows
      for (const r of rows) {
        const d = r2uDictById[r.dict]; if (!d || !r.eq?.length && d.dir === 'ru-uk') continue
        const cs = r2uCands([r.dict, r.rowId, r.q, r.scope, r.head, r.eq, r.text], d.dir, d.orth, d.short)
        if (!cs.length && /́/.test(d.dir === 'ru-uk' ? r.eq.join(' ') : r.text.split(/[,.;/]/)[0] ?? '')) skip('r2u: орфографія неоднозначна / не зіставлено')
        for (const c of cs) { b.add(c); hit('r2u') }
      }
    } catch { skip('r2u: пошкоджений файл') }
  } else skip('r2u: немає файлу')
  const kf = resolve(root, 'data/raw/kaikki/uk.jsonl')
  if (existsSync(kf)) {
    let n = 0
    for await (const line of fileLines(kf)) {
      n++; if (!line.includes('́')) continue
      let e; try { e = JSON.parse(line) } catch { continue }
      const k = kaikkiCands(e, n); for (const c of k.lemma) { b.add(c); hit('kaikki') } for (const f of k.forms) { b.addForm(f); hit('kaikki-форма') }
    }
  } else skip('kaikki: немає файлу')
  return b
}

export function writeStressSrc(root: string, b: StBuilder, stats: Pick<StressSrcStats, 'bySrc' | 'skipped'>): StressSrcStats {
  const shards: Map<number, StShard> = b.finish(), dir = resolve(root, 'data/work/stsrc'), tmp = dir + '.next'
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  let lemmas = 0, worstGz = 0
  for (const [n, s] of shards) { const t = JSON.stringify(s); worstGz = Math.max(worstGz, gzipSync(t, { level: 6 }).length); writeJsonAtomic(resolve(tmp, `${n}.json`), t); lemmas += Object.keys(s.entries).length }
  rmSync(dir, { recursive: true, force: true }); renameSync(tmp, dir)
  return { shards: shards.size, lemmas, variants: b.n, forms: b.nForms, worstGz, ...stats }
}
export const stressSrcFiles = (root: string): string[] => { const d = resolve(root, 'data/work/stsrc'); return existsSync(d) ? readdirSync(d).filter(f => /^\d+\.json$/.test(f)).map(f => resolve(d, f)) : [] }

if (process.argv[1]?.endsWith('build-stress-src.ts')) {
  const root = resolve(import.meta.dirname, '..'), st = { bySrc: {}, skipped: {} }, t0 = Date.now()
  const s = writeStressSrc(root, await collectStress(root, new StBuilder(), st), st)
  console.log(`stsrc: ${s.lemmas} lemmas, ${s.variants} variants, ${s.forms} forms in ${s.shards} shards (worst ${(s.worstGz / 1024).toFixed(1)} KB gz), by source ${JSON.stringify(s.bySrc)}, skipped ${JSON.stringify(s.skipped)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
