/**
 * W2-1 / SPEC 20 B-5f: running-text shards for the /texts reader. public/data/texts/<witness>.json = { id, tokens: [raw, loc, s][] }
 * (s = segment index, as in data/work) for every ADMITTED witness (B-1). Edition credit and licence travel in corpus.json (WitnessMeta.edition / .license).
 * `npx tsx pipelines/emit-texts.ts` regenerates them from data/work without the (slow) full build.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WitnessOut } from '../core/types.ts'

/** PV: optional 4th column = TOROT-based reference of the token: 'n:<name id>' (/name/:id), 'o:<orv lemma id>' (/orv/:id), 'w:<modern lemma>' (/w/:lemma); absent for other witnesses */
export interface TextShard { id: string; tokens: ([string, string, number] | [string, string, number, string])[] }
export const textShard = (w: Pick<WitnessOut, 'id' | 'tokens'>, refs?: string[]): TextShard => ({ id: w.id, tokens: w.tokens.map((t, i) => (refs?.[i] ? [t.raw, t.loc, t.s, refs[i]!] : [t.raw, t.loc, t.s])) })

/** Writes one file per witness into `<pub>/texts` (replacing the directory); returns total bytes. */
export function writeTexts(ws: Pick<WitnessOut, 'id' | 'tokens'>[], pub: string, refs?: Map<string, string[]>): number {
  const dir = resolve(pub, 'texts'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  let bytes = 0
  for (const w of ws) { const s = JSON.stringify(textShard(w, refs?.get(w.id))); bytes += Buffer.byteLength(s); writeFileSync(resolve(dir, `${w.id}.json`), s) }
  return bytes
}

