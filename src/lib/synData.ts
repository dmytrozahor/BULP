/** SPEC 63 GG-12 / GG-13: lazy loaders of the sidecars lm/syn/<bucket>.json (synonyms, antonyms, …) and lm/phr/<bucket>.json (Wiktionary phraseology), key lk(headword); fetched only by the components that show them (never in the first load). */
import { lk } from '../../core/cv.ts'
import { phrBucket, synBucket } from '../../core/parts.ts'
import type { PhrRow, SynRow } from '../../core/synphr.ts'
import { store } from './parts.ts'

const syn = store<Record<string, SynRow[]>>(b => `./data/lm/syn/${b}.json`, j => j as Record<string, SynRow[]>)
const phr = store<Record<string, PhrRow[]>>(b => `./data/lm/phr/${b}.json`, j => j as Record<string, PhrRow[]>)
/** the relation rows of a headword; undefined while the shard loads, [] when the open sources say nothing */
export const synOf = (word: string): SynRow[] | undefined => {
  if (!word) return []
  const k = lk(word), b = String(synBucket(k)), s = syn.peek(b)
  return s === undefined ? (syn.has(b) ? [] : undefined) : (s[k] ?? [])
}
export const phrOf = (word: string): PhrRow[] | undefined => {
  if (!word) return []
  const k = lk(word), b = String(phrBucket(k)), s = phr.peek(b)
  return s === undefined ? (phr.has(b) ? [] : undefined) : (s[k] ?? [])
}
