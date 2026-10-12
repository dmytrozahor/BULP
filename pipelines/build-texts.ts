/**
 * W2-1 / SPEC 20 B-5f: running-text shards for the /texts reader. public/data/texts/<witness>.json = { id, tokens: [raw, loc, s][] }
 * (s = segment index, as in data/work) for every ADMITTED witness (B-1). Edition credit and licence travel in corpus.json (WitnessMeta.edition / .license).
 * `npx tsx pipelines/emit-texts.ts` regenerates them from data/work without the (slow) full build.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WitnessOut } from '../core/types.ts'

export interface TextShard { id: string; tokens: [string, string, number][] }
export const textShard = (w: Pick<WitnessOut, 'id' | 'tokens'>): TextShard => ({ id: w.id, tokens: w.tokens.map(t => [t.raw, t.loc, t.s]) })

/** Writes one file per witness into `<pub>/texts` (replacing the directory); returns total bytes. */
export function writeTexts(ws: Pick<WitnessOut, 'id' | 'tokens'>[], pub: string): number {
  const dir = resolve(pub, 'texts'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  let bytes = 0
  for (const w of ws) { const s = JSON.stringify(textShard(w)); bytes += Buffer.byteLength(s); writeFileSync(resolve(dir, `${w.id}.json`), s) }
  return bytes
}

