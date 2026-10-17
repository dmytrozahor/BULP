/** SPEC 63 NV-3 runtime: look a spelling up in the unlinked-spelling index (core/unlinked.ts) and cut KWIC lines from the text shards. */
import { key } from '../../core/text.ts'
import { occurrencesOf, unlinkedLeaf, unlinkedManifestName, unlinkedName, unlinkedTop, type UnlinkedEntry, type UnlinkedManifest, type UnlinkedOcc } from '../../core/unlinked.ts'
import { fetchJson } from './fetchJson.ts'
import { loadTokens, type Tok } from './witnessText.ts'

/** `name` = unlinkedManifestName(top) (the manifest of a top prefix) or a leaf file name (unlinkedName(prefix)); NV-5 prefix-sharded layout */
export type ShardFetch = (name: string) => Promise<unknown | null>
const cache = new Map<string, Promise<unknown | null>>()
export const fetchShard: ShardFetch = name => {
  let p = cache.get(name)
  if (!p) cache.set(name, p = fetchJson(`./data/unlinked/${name}.json`).then(j => j as unknown, () => { cache.delete(name); return null }))
  return p
}
const leafSets = new WeakMap<object, Set<string>>()
export async function lookupUnlinked(form: string, get: ShardFetch = fetchShard): Promise<UnlinkedEntry | undefined> {
  const k = key(form); if (!k) return undefined
  const m = (await get(unlinkedManifestName(unlinkedTop(k)))) as UnlinkedManifest | null; if (!m?.leaves) return undefined
  let leaves = leafSets.get(m); if (!leaves) leafSets.set(m, leaves = new Set(m.leaves.map(l => l[0])))
  const leaf = unlinkedLeaf(k, leaves); if (!leaf) return undefined
  return ((await get(unlinkedName(leaf))) as Record<string, UnlinkedEntry> | null)?.[k]
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
