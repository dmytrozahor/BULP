/** SPEC 63 NV-3 runtime: look a spelling up in the unlinked-spelling index (core/unlinked.ts) and cut KWIC lines from the text shards. */
import { key } from '../../core/text.ts'
import { occurrencesOf, unlinkedShard, type UnlinkedEntry, type UnlinkedOcc } from '../../core/unlinked.ts'
import { fetchJson } from './fetchJson.ts'
import { loadTokens, type Tok } from './witnessText.ts'

export type ShardFetch = (n: number) => Promise<Record<string, UnlinkedEntry> | null>
const cache = new Map<number, Promise<Record<string, UnlinkedEntry> | null>>()
export const fetchShard: ShardFetch = n => {
  let p = cache.get(n)
  if (!p) cache.set(n, p = fetchJson(`./data/unlinked/${n}.json`).then(j => j as Record<string, UnlinkedEntry> | null, () => { cache.delete(n); return null }))
  return p
}
export async function lookupUnlinked(form: string, get: ShardFetch = fetchShard): Promise<UnlinkedEntry | undefined> {
  const k = key(form); if (!k) return undefined
  return (await get(unlinkedShard(k)))?.[k]
}

export interface UnlinkedKwic { w: string; loc: string; left: string; node: string; right: string }
/** ±`span` tokens around token `i` of a witness (separators from the shard, so the line reads as in the text) */
export function kwicAt(toks: Tok[], i: number, w: string, span = 7): UnlinkedKwic | undefined {
  const t = toks[i]; if (!t) return undefined
  const side = (a: number, b: number) => toks.slice(Math.max(0, a), Math.min(toks.length, b)).map(x => x[0]).join(' ')
  return { w, loc: t[1], left: side(i - span, i), node: t[0], right: side(i + 1, i + 1 + span) }
}
export async function occurrenceKwic(o: UnlinkedOcc, load: (id: string) => Promise<Tok[] | null> = loadTokens): Promise<UnlinkedKwic | undefined> {
  const toks = await load(o.w); return toks ? kwicAt(toks, o.i, o.w) : undefined
}
export { occurrencesOf }
