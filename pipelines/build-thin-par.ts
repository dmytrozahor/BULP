/**
 * BUILD step CP-9: the VESUM paradigm of every lemma that has no full card → data/work/thinpar/<bucket>.json (not committed), copied by build-parts into public/data/lm/par/ (core/thin-par.ts).
 * One streaming pass over VESUM. Crash-tolerant (RS-1): every shard is written atomically; a directory from an earlier run is replaced only after the pass has finished.
 *   npx tsx pipelines/build-thin-par.ts   (needs public/data/lexicon.json for the set of full cards; build.ts calls writeThinPar directly with its cards)
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { ParBuilder } from '../core/thin-par.ts'
import { lk } from '../core/cv.ts'
import { fileLines, scanVesum, VESUM_TXT } from './vesum.ts'
import { writeJsonAtomic } from './robust.ts'

export interface ThinParStats { shards: number; lemmas: number; forms: number; rawBytes: number; gzBytes: number; worstGz: number }

export async function writeThinPar(root: string, lines: AsyncIterable<string> | Iterable<string>, fullLemmas: Iterable<string>): Promise<ThinParStats> {
  const b = new ParBuilder(new Set([...fullLemmas].map(lk)))
  await scanVesum(lines, e => b.add(e))
  const shards = b.finish(), dir = resolve(root, 'data/work/thinpar'), tmp = dir + '.next'
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  let lemmas = 0, rawBytes = 0, gzBytes = 0, worstGz = 0
  for (const [n, s] of shards) {
    const t = JSON.stringify(s), g = gzipSync(t, { level: 6 }).length
    writeJsonAtomic(resolve(tmp, `${n}.json`), t)
    lemmas += Object.values(s.entries).reduce((a, es) => a + es.length, 0); rawBytes += Buffer.byteLength(t); gzBytes += g; worstGz = Math.max(worstGz, g)
  }
  rmSync(dir, { recursive: true, force: true }); renameSync(tmp, dir)
  return { shards: shards.size, lemmas, forms: b.n, rawBytes, gzBytes, worstGz }
}

export const thinParFiles = (root: string): string[] => { const d = resolve(root, 'data/work/thinpar'); return existsSync(d) ? readdirSync(d).filter(f => /^\d+\.json$/.test(f)).map(f => resolve(d, f)) : [] }

if (process.argv[1]?.endsWith('build-thin-par.ts')) {
  const root = resolve(import.meta.dirname, '..')
  const { unpackCore } = await import('../core/pack.ts'), { readFileSync } = await import('node:fs')
  const cards = unpackCore(JSON.parse(readFileSync(resolve(root, process.env.PUB_DATA ?? 'public/data', 'lexicon.json'), 'utf8')))
  const t0 = Date.now(), s = await writeThinPar(root, fileLines(process.env.VESUM_TXT ?? VESUM_TXT), cards.map(c => c.lemma))
  console.log(`thinpar: ${s.lemmas} lemmas, ${s.forms} forms in ${s.shards} shards, raw ${(s.rawBytes / 1048576).toFixed(1)} MB, gz ${(s.gzBytes / 1048576).toFixed(1)} MB, worst ${(s.worstGz / 1024).toFixed(1)} KB gz, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
