/**
 * SPEC 63 PF-1/PF-3 — the browser side of the parts (core/parts.ts): lazy shard stores and Map-like facades over them.
 * Reading a facade inside a computed/render is reactive: a missing shard starts its fetch and reads as "absent"; the arrival re-runs the reader.
 * `settled(fn)` runs a reader until no read started a new fetch (for long texts, where a re-run per arrival would be wasteful).
 */
import { shallowReactive } from 'vue'
import type { CoreCard, VesumHit, WitnessMeta } from '../../core/types.ts'
import { unpackCore } from '../../core/pack.ts'
import { bucketOf } from '../../core/shard.ts'
import {
  IX_MIN, VIA_NAME, dxUrl, ixLeaf, ixName, ixUrl, lmBucket, witBucket, type DxShard, type IxManifest, type IxRow, type IxShard, type LmName,
} from '../../core/parts.ts'
import { fetchJson, onRetry } from './fetchJson.ts'
import type { Hit, Via } from './search.ts'
import type { Attest } from './derive.ts'
import type { RuleForm } from '../../core/form-class.ts'
import type { Evidence } from '../../core/evidence.ts'

// ── shard store ──────────────────────────────────────────────────────────────────────────────────
let scope: Promise<unknown>[] | undefined
export interface Store<T> { peek(name: string): T | undefined; load(name: string): Promise<T | undefined>; has(name: string): boolean }
export function store<T>(urlOf: (name: string) => string, parse: (j: unknown) => T, delays?: readonly number[]): Store<T> {
  // data: name → value, or null when the file is absent (404); a transient failure is in `failed` (not cached as absent: peek() stops re-fetching, retry clears it)
  const data = shallowReactive(new Map<string, T | null>()), pending = new Map<string, Promise<T | undefined>>(), failed = shallowReactive(new Set<string>())
  const load = (name: string): Promise<T | undefined> => {
    let p = pending.get(name)
    if (!p) {
      p = fetchJson(urlOf(name), delays).then(j => (j === null ? null : parse(j)))
        .then(v => { data.set(name, v); return v ?? undefined }, () => { failed.add(name); pending.delete(name); return undefined })
      pending.set(name, p)
    }
    return p
  }
  const peek = (name: string): T | undefined => {
    const v = data.get(name)
    if (v === undefined && !failed.has(name)) { const p = load(name); scope?.push(p) }
    return v ?? undefined
  }
  onRetry(() => { for (const n of [...failed]) { failed.delete(n); pending.delete(n) } })
  return { peek, load, has: n => data.get(n) !== undefined }
}
/** run `fn` until it triggers no new fetch (≤ max rounds); the result is the last run's, with every shard it needed in memory */
export async function settled<T>(fn: () => T, max = 8): Promise<T> {
  for (let i = 0; ; i++) {
    const outer = scope, mine: Promise<unknown>[] = []
    scope = mine
    let r: T
    try { r = fn() } finally { scope = outer }
    if (!mine.length || i >= max) return r
    await Promise.all(mine)
  }
}

// ── ix: lookup index ─────────────────────────────────────────────────────────────────────────────
const manifest = store<{ leaves: Set<string>; list: [string, number][] }>(() => './data/ix/index.json', j => { const m = j as IxManifest; return { leaves: new Set(m.leaves.map(l => l[0])), list: m.leaves } })
const ixShards = store<IxShard>(p => ixUrl(p), j => j as IxShard)
const MANI = 'm'
export const ixReady = () => manifest.load(MANI)

/** the row of a (key()-normalised) key; undefined while its shard is loading or when the key is not indexed */
export function ixRow(k: string): IxRow | undefined {
  const m = manifest.peek(MANI); if (!m) return undefined
  const leaf = ixLeaf(k, m.leaves); if (!leaf) return undefined
  return ixShards.peek(leaf)?.rows[k]
}
const tagOf = (k: string, i: number): string => {   // a failed / loading shard reads as an empty tag, never throws in render
  const m = manifest.peek(MANI), leaf = m && ixLeaf(k, m.leaves)
  return (leaf ? ixShards.peek(leaf)?.tags[i] : undefined) ?? ''
}
const hitsOf = (k: string): Hit[] | undefined => ixRow(k)?.h?.map(([lemma, via, form]) => ({ lemma, via: VIA_NAME[via] as Via, form: form ?? (via === 0 ? lemma : k) }))
const tagged = (k: string, r: [string, number][] | undefined): VesumHit[] | undefined => r?.map(([lemma, t]) => ({ lemma, tags: tagOf(k, t) }))

/** SearchIndex.map facade */
export const ixHitMap = { get: (k: string) => hitsOf(k), has: (k: string) => !!ixRow(k)?.h }
/** the paradigm map of the lexicon lemmas (VESUM forms) — no global map: each lookup reads its prefix shard */
export const ixParadigm = { get: (k: string) => tagged(k, ixRow(k)?.p), has: (k: string) => !!ixRow(k)?.p }
/** LexIndex facade: vesum / lt lookups by property access */
const prox = <T>(f: (k: string) => T | undefined) => new Proxy({} as Record<string, T>, { get: (_, k) => (typeof k === 'string' ? f(k) : undefined), has: (_, k) => typeof k === 'string' && f(k) !== undefined })
export const ixLexIndex = {
  generated: '', vesum: prox(k => tagged(k, ixRow(k)?.v)),
  lt: prox(k => { const l = ixRow(k)?.l; return l ? ([l[0] ? 'soft' : 'replace', l[1]] as ['replace' | 'soft', string]) : undefined }),
}
// ── dx: dictionary-only cards (SPEC 63 DO-6) ─────────────────────────────────────────────────────
const dxManifest = store<{ leaves: Set<string>; list: [string, number][] }>(() => './data/dx/index.json', j => { const m = j as IxManifest; return { leaves: new Set(m.leaves.map(l => l[0])), list: m.leaves } })
const dxShards = store<DxShard>(p => dxUrl(p), j => j as DxShard)
/** the id of the dictionary-only card of a (lk-normalised) key; undefined while its shard loads or when there is none */
export function dxCard(k: string): string | undefined {
  const m = dxManifest.peek(MANI); if (!m) return undefined
  const leaf = ixLeaf(k, m.leaves); if (!leaf) return undefined
  const v = dxShards.peek(leaf)?.rows[k]
  return v === undefined ? undefined : v || k
}
/** non-lexicon card hits (light / CV / archaic) of a key, as cardMap() returned them; a key without such a card falls back to a dictionary-only card (dict: true) */
export const ixCards = {
  get: (k: string) => {
    const c = ixRow(k)?.c
    if (c) return c.map(([a, id, form]) => ({ kind: (a ? 'ar' : 'lw') as 'ar' | 'lw', id, form: form ?? id }))
    const d = dxCard(k)
    return d ? [{ kind: 'lw' as const, id: d, form: d, dict: true as const }] : undefined
  },
  has: (k: string) => !!ixRow(k)?.c || dxCard(k) !== undefined,
}

/** true once the shard of key k is in memory (or the key has no shard at all): a reader can tell "absent" from "still loading" */
export function ixLoaded(k: string): boolean {
  const m = manifest.peek(MANI); if (!m) return false
  const leaf = ixLeaf(k, m.leaves)
  if (!leaf) return true
  ixShards.peek(leaf)
  return ixShards.has(leaf)
}
/** attested historical spelling (raw / norm of a lexicon form) → its lemma; the placeholder KWIC only marks the form as attested (derive.ts AttestLookup) */
export const ixAttest = {
  get: (k: string): Attest | undefined => {
    const h = ixRow(k)?.h?.find(x => x[1] === 1); if (!h) return undefined
    const raw = h[2] ?? k
    return { lemma: h[0], kwic: { w: 'corpus', loc: raw, left: '', node: raw, right: '', date: [0, 0] } }
  },
}


/**
 * rows of the keys starting with `q`: the shard that covers q itself (exact key), then the shards below q in alphabetical order, one at a time, until `want` distinct lemmas / cards
 * are collected — the order the sorted-key scan of the old in-memory index followed, and at most a couple of ≤ 30 KB shards per keystroke.
 */
export async function ixPrefix(q: string, want = 30): Promise<[string, IxRow][]> {
  const m = await manifest.load(MANI); if (!m) return []
  const exact = ixLeaf(q, m.leaves), under = m.list.map(l => l[0]).filter(p => p.startsWith(q)).sort()
  const out: [string, IxRow][] = [], seen = new Set<string>()
  for (const n of [...new Set([...(exact ? [exact] : []), ...under])]) {
    const s = await ixShards.load(n)
    for (const [k, r] of Object.entries(s?.rows ?? {})) if (k.startsWith(q)) { out.push([k, r]); for (const h of r.h ?? []) seen.add(h[0]); for (const c of r.c ?? []) seen.add(c[1]) }
    if (seen.size >= want) break
  }
  return out
}

// ── cd: core cards ───────────────────────────────────────────────────────────────────────────────
const cd = store<Map<string, CoreCard>>(b => `./data/cd/${b}.json`, j => new Map(unpackCore(j).map(c => [c.lemma, c])))
/** the core card of a lemma (reactive; undefined while loading or when there is none) */
export const coreOf = (lemma: string): CoreCard | undefined => cd.peek(String(bucketOf(lemma)))?.get(lemma)
export const loadCore = async (lemma: string): Promise<CoreCard | undefined> => (await cd.load(String(bucketOf(lemma))))?.get(lemma)
/** Map-like view of all lemmas (get / has only) */
export const cardMapView = { get: coreOf, has: (l: string) => !!coreOf(l) }

// ── lm: per-lemma sidecars ───────────────────────────────────────────────────────────────────────
const lmStores = new Map<LmName, Store<unknown>>()
const lmStore = (n: LmName) => { let s = lmStores.get(n); if (!s) lmStores.set(n, s = store<unknown>(b => `./data/lm/${n}/${b}.json`, j => j)); return s }
/** the sidecar shard (same JSON shape as the whole file, restricted to the bucket of `k`) */
export const lmPeek = <T>(n: LmName, k: string): T | undefined => lmStore(n).peek(String(lmBucket(k))) as T | undefined
export const lmLoad = <T>(n: LmName, k: string): Promise<T | undefined> => lmStore(n).load(String(lmBucket(k))) as Promise<T | undefined>

// ── wit: witness records ─────────────────────────────────────────────────────────────────────────
const wit = store<Record<string, WitnessMeta>>(b => `./data/wit/${b}.json`, j => j as Record<string, WitnessMeta>)
export const witnessOf = (id: string): WitnessMeta | undefined => wit.peek(String(witBucket(id)))?.[id]
export const loadWitness = async (id: string) => (await wit.load(String(witBucket(id))))?.[id]

// ── pg / sum: paged lists and precomputed summaries ──────────────────────────────────────────────
const lemmaPages = store<string[]>(n => `./data/pg/lemmas/${n}.json`, j => j as string[])
/** the lemmas of page n (1-based) of the lemma list; undefined while loading */
export const lemmaPage = (n: number): string[] | undefined => lemmaPages.peek(String(n))
const ruleForms = store<RuleForm[]>(n => `./data/sum/ruleforms/${n}.json`, j => (j as [string, string, number][]).map(([form, lemma, f]) => ({ form, lemma, f })))
/** SPEC 63 FD-5: the forms on which a rule / feature fired, by owner lemma f (precomputed by pipelines/build-parts.ts; [] while loading or when none) */
export const ruleFormsOf = (id: string): RuleForm[] => ruleForms.peek(ixName(id)) ?? []
export interface SourceQuote { ev: Evidence; places: { label: string; to: string }[]; nPlaces: number }
const sourceQuotes = store<SourceQuote[]>(n => `./data/sum/sources/${n}.json`, j => j as SourceQuote[])
/** the lemma-card quotes of one source (≤ 200, precomputed); undefined while loading */
export const sourceQuotesOf = (id: string): SourceQuote[] | undefined => sourceQuotes.peek(ixName(id))

// ── search (PF-1): one prefix shard per keystroke ────────────────────────────────────────────────
export interface RemoteResult { lemmas: { lemma: string; matched: string; via: Via; rank: number }[]; cards: { kind: 'lw' | 'ar'; id: string; matched: string; rank: number }[] }
/** exact (tier 0) and prefix (tier 1) matches of every query variant, lemma / form / paradigm hits ranked as search() does; non-lexicon cards beside them */
export async function searchRemote(q: string, queryKeysOf: (q: string) => string[], limit = 30): Promise<RemoteResult> {
  const lem = new Map<string, RemoteResult['lemmas'][number]>(), crd = new Map<string, RemoteResult['cards'][number]>()
  for (const qk of queryKeysOf(q)) {
    for (const [k, row] of await ixPrefix(qk)) {
      const tier = k === qk ? 0 : 1
      for (const [lemma, via, form] of row.h ?? []) {
        const rank = tier * 10 + (via === 3 ? 1 : via), cur = lem.get(lemma)
        if (!cur || rank < cur.rank) lem.set(lemma, { lemma, matched: form ?? (via === 0 ? lemma : k), via: VIA_NAME[via] as Via, rank })
      }
      for (const [a, id, form] of row.c ?? []) {
        const kind = a ? 'ar' : 'lw', ck = kind + ':' + id, cur = crd.get(ck)
        if (!cur || tier < cur.rank) crd.set(ck, { kind, id, matched: form ?? id, rank: tier })
      }
    }
  }
  const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank
  return { lemmas: [...lem.values()].sort((a, b) => byRank(a, b) || a.lemma.localeCompare(b.lemma, 'uk')).slice(0, limit), cards: [...crd.values()].sort(byRank).slice(0, limit) }
}

/** SPEC 63 DO-4: a dictionary-only hit (never mixed into RemoteResult: the corpus-attested results are complete before these are even asked for) */
export interface DictHit { kind: 'lw'; id: string; matched: string; rank: number; dict: true }
/**
 * Dictionary-only cards of the query: exact key first, then keys below it alphabetically, from the dx/ shards (≥ 2 letters). At most `maxShards` shards are read (the exact leaf, then
 * the heaviest-first leaves below a short prefix), so one keystroke stays within the PF-2 keystroke budget together with searchRemote().
 */
export async function searchDict(q: string, queryKeysOf: (q: string) => string[], limit = 20, maxShards = 2): Promise<DictHit[]> {
  const m = await dxManifest.load(MANI); if (!m) return []
  const out = new Map<string, DictHit>()
  for (const qk of queryKeysOf(q)) {
    if ([...qk].length < IX_MIN) continue
    const exact = ixLeaf(qk, m.leaves), under = m.list.map(l => l[0]).filter(p => p.startsWith(qk)).sort()
    for (const n of [...new Set([...(exact ? [exact] : []), ...under])].slice(0, maxShards)) {
      const s = await dxShards.load(n)
      for (const [k, v] of Object.entries(s?.rows ?? {})) if (k.startsWith(qk)) { const id = v || k, cur = out.get(id), rank = k === qk ? 0 : 1; if (!cur || rank < cur.rank) out.set(id, { kind: 'lw', id, matched: k, rank, dict: true }) }
      if (out.size >= limit) break
    }
  }
  return [...out.values()].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id, 'uk')).slice(0, limit)
}
