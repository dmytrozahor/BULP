/** Test helper: the built lexicon as full LemmaCards = public/data/lexicon.json (core) merged with its lex/<bucket>.json detail shards (SPEC 20 B-5). */
import { existsSync, readFileSync } from 'node:fs'
import { unpackCore } from '../core/pack.ts'
import { bucketOf, mergeCard, unpackShard } from '../core/shard.ts'
import type { LemmaCard, LemmaDetail } from '../core/types.ts'

/** Shards are not on the code branch (SPEC 20 B-5e: ukr-lexicon-data branch, `npm run data:pull`) — real-data tests skip without them. */
export const hasData = (dir = 'public/data') => existsSync(`${dir}/lexicon.json`) && existsSync(`${dir}/lex`)
export function readFull(dir = 'public/data'): LemmaCard[] {
  if (!hasData(dir)) return []   // skipped describes still run their body at collection time
  const core = unpackCore(JSON.parse(readFileSync(`${dir}/lexicon.json`, 'utf8'))), shards = new Map<number, Map<string, LemmaDetail>>()
  return core.map(c => {
    const b = bucketOf(c.lemma); let s = shards.get(b)
    if (!s) shards.set(b, s = unpackShard(JSON.parse(readFileSync(`${dir}/lex/${b}.json`, 'utf8'))))
    return mergeCard(c, s.get(c.lemma)!)
  })
}
