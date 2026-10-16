/**
 * SPEC 63 PV / PF-1: TOROT name cards + ORV-only lemma cards (tc/names, tc/orv), light cards (tc/light) and archaic cards (tc/arch) are fetched PER CARD from their bucket shard
 * (core/parts.ts tcBucket), never as whole files. Plus the in-site links of a text-shard `ref` column.
 * Readers are reactive: `ready` is false while the shard loads, then the card (or undefined when there is none).
 */
import type { NameCard, OrvCard } from '../../core/torot.ts'
import type { LightFile } from '../../pipelines/build-torot.ts'
import { archId, type ArchEntry } from '../../core/archaic.ts'
import { key } from '../../core/text.ts'
import { tcBucket } from '../../core/parts.ts'
import { store } from './parts.ts'

type LightRow = LightFile['lemmas'][number]
const names = store<{ names: NameCard[] }>(b => `./data/tc/names/${b}.json`, j => j as { names: NameCard[] })
const orv = store<{ orv: OrvCard[] }>(b => `./data/tc/orv/${b}.json`, j => j as { orv: OrvCard[] })
const light = store<{ lemmas: LightRow[] }>(b => `./data/tc/light/${b}.json`, j => j as { lemmas: LightRow[] })
const arch = store<{ entries: ArchEntry[]; alias: Record<string, string> }>(b => `./data/tc/arch/${b}.json`, j => j as { entries: ArchEntry[]; alias: Record<string, string> })
export interface Found<T> { ready: boolean; value?: T }

/** a TOROT name (kind 'name') or ORV-only lemma (kind 'orv') card by id */
export function torotCard(kind: 'name' | 'orv', id: string): Found<NameCard | OrvCard> {
  const b = String(tcBucket(id)), f = kind === 'name' ? names.peek(b)?.names : orv.peek(b)?.orv
  return { ready: kind === 'name' ? names.has(b) : orv.has(b), value: f?.find(c => c.id === id) }
}
/** the light card row [lemma, VESUM tags, f, example] of a lemma (exact, else by key) */
export function lightRow(lemma: string): Found<LightRow> {
  const b = String(tcBucket(key(lemma))), rows = light.peek(b)?.lemmas
  return { ready: light.has(b), value: rows?.find(l => l[0] === lemma) ?? rows?.find(l => key(l[0]) === key(lemma)) }
}
/** the archaic card that owns a spelling (case-insensitive archId; other spellings of an entry are aliases of its id) */
export function archEntryOf(form: string, peek = true): Found<ArchEntry> {
  const a = archId(form), b = String(tcBucket(a)), s = (peek ? arch.peek(b) : undefined)
  if (!arch.has(b)) return { ready: false }
  const own = s?.entries.find(e => e.id === a)
  if (own) return { ready: true, value: own }
  const id = s?.alias[a]; if (!id) return { ready: true }
  const b2 = String(tcBucket(id)), s2 = arch.peek(b2)
  return { ready: arch.has(b2), value: s2?.entries.find(e => e.id === id) }
}
/** async variant for non-reactive callers (the analyser's attestation lines) */
export async function loadArchEntry(form: string): Promise<ArchEntry | undefined> {
  const a = archId(form), s = await arch.load(String(tcBucket(a)))
  const own = s?.entries.find(e => e.id === a)
  if (own) return own
  const id = s?.alias[a]; if (!id) return undefined
  return (await arch.load(String(tcBucket(id))))?.entries.find(e => e.id === id)
}

const e = encodeURIComponent
export const nameTo = (id: string) => `/name/${e(id)}`
export const orvTo = (id: string) => `/orv/${e(id)}`
/** 'n:<id>' → /name/:id, 'o:<id>' → /orv/:id, 'w:<lemma>' → /w/:lemma; anything else → undefined */
export function refTo(ref?: string): string | undefined {
  if (!ref) return undefined
  const id = ref.slice(2)
  return ref.startsWith('n:') ? nameTo(id) : ref.startsWith('o:') ? orvTo(id) : ref.startsWith('w:') ? `/w/${e(id)}` : ref.startsWith('a:') ? `/ar/${e(id)}` : undefined
}
