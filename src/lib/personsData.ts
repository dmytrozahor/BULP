/** SPEC 63 PS: lazy loaders of the persons sidecar (public/data/persons/: index.json, s<N>.json full records, mentions/m<N>.json). Never in the first-load bundle. */
import { shallowReactive, shallowRef } from 'vue'
import { fetchJson } from './fetchJson.ts'
import { shardOf, SHARDS, type Person, type PersonsIndex } from '../../core/persons.ts'

export interface MentionRec { t: number; n: number; loc: string; f: string; p: string; why: string }
export const personsIndex = shallowRef<PersonsIndex | null>()
export const personsLoaded = shallowRef(false)
let started = false
export function loadPersonsIndex(): void {
  if (started) return
  started = true
  fetchJson('./data/persons/index.json').then(j => { personsIndex.value = (j as PersonsIndex | null) ?? null; personsLoaded.value = true }).catch(() => { started = false })
}
const shards = shallowReactive(new Map<number, Record<string, Person> | null>()), pending = new Set<number>()
/** the full record of a person (any of its author ids); undefined while loading, null = absent */
export function personOf(id: string): Person | null | undefined {
  const s = shardOf(id) % SHARDS
  if (!shards.has(s) && !pending.has(s)) {
    pending.add(s)
    fetchJson(`./data/persons/s${s}.json`).then(j => shards.set(s, (j as Record<string, Person> | null) ?? null)).catch(() => pending.delete(s))
  }
  const m = shards.get(s); return m === undefined ? undefined : (m?.[id] ?? null)
}
const mentions = shallowReactive(new Map<number, Record<string, MentionRec[]> | null>()), mpending = new Set<number>()
/** the high-confidence person mentions of one witness (build-time; [] while loading or when none) */
export function mentionsOf(witness: string): MentionRec[] {
  const s = shardOf(witness) % SHARDS
  if (!mentions.has(s) && !mpending.has(s)) {
    mpending.add(s)
    fetchJson(`./data/persons/mentions/m${s}.json`).then(j => mentions.set(s, (j as Record<string, MentionRec[]> | null) ?? null)).catch(() => mpending.delete(s))
  }
  return mentions.get(s)?.[witness] ?? []
}
export const personTipOf = (id: string, why: string): string => {
  loadPersonsIndex() // the tooltip names the person: the index is fetched on first need (CP-10.10: a KWIC card never loaded it, so the tip lost the name and years)
  const ix = personsIndex.value, r = ix ? (ix.rows.find(x => x.id === id) ?? ix.rows.find(x => x.id === ix.alias[id])) : undefined
  return r ? `постать: ${r.name} (${r.b ?? '?'}–${r.d ?? ''}) — підстава: ${why}` : `постать — підстава: ${why}`
}
