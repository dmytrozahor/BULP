/** Sophia graffiti catalogue + inscription ids (MV-1). Texts are separate witnesses sophia-<id> since the NW-6 amendment (metadata + IIIF links here). */
import { MEDIA_FIXTURE } from '../data/media-fixture.ts'
import { mediaOfSophia, sophiaIdOf, type SophiaData, type WitnessMedia } from './media.ts'

let p: Promise<SophiaData> | undefined
export function loadSophia(): Promise<SophiaData> {
  p ??= fetch('./data/sophia.json').then(r => { if (!r.ok) throw new Error(`sophia.json: HTTP ${r.status}`); return r.json() as Promise<SophiaData> }).catch(e => { p = undefined; throw e })
  return p
}

type WithMedia = { media?: WitnessMedia } | undefined
/** MV-1: does this witness have a media view? (witness.media from the build, the song fixture, or a Sophia inscription witness id) */
export const hasMedia = (w: string, wit?: WithMedia): boolean => !!(wit?.media ?? MEDIA_FIXTURE[w]) || sophiaIdOf(w) !== undefined
export async function resolveMedia(w: string, wit?: WithMedia): Promise<WitnessMedia | undefined> {
  const m = wit?.media ?? MEDIA_FIXTURE[w]
  if (m) return m
  const id = sophiaIdOf(w)
  if (id === undefined) return undefined
  const it = (await loadSophia()).items.find(i => i.id === id)
  return it && mediaOfSophia(it)
}
