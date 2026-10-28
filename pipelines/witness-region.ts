/**
 * SPEC 63 LB-10 — fill the witness region (the «регіон пам'ятки» of FD-2: the place of publication) from the source's own metadata, before the build counts N per region.
 *
 * > "Region = witness region (place of writing/printing, or the milieu a folk collection names on its title page), NOT a dialect claim (SPEC 20 B-3.6)." — pipelines/regions.ts
 *
 * Two sources, nothing else:
 *   1. an archive.org witness (`hv_ia_*`) whose ingester left `region` empty gets the place of data/seed/ia-places.json (pipelines/ia-places.ts: publisher / corporate creator /
 *      imprint line of the description / quoted reference work), with the field and its verbatim value in `regionCite`;
 *   2. a witness whose `region` string names ONE place («Львів», «Нью-Йорк», «Вінніпеґ») is mapped by `regionOf` (pipelines/regions.ts) through core/witness-place.ts.
 * A string naming several places («Київ; Відень») or an area («Галичина; Львів») stays unmapped; nothing is guessed.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Q } from '../core/evidence.ts'
import { placeById } from '../core/witness-place.ts'
import type { WitnessOut } from '../core/types.ts'
import type { IaPlacesFile } from './ia-places.ts'
import { iaIdOf } from './ia-places.ts'
import { regionOf } from './regions.ts'

export const IA_PLACES_PATH = resolve('data/seed/ia-places.json')
export function readIaPlaces(path = IA_PLACES_PATH): IaPlacesFile | undefined {
  try { return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as IaPlacesFile) : undefined } catch { return undefined }
}

export interface FillReport { filled: number; tokens: number; byField: Record<string, number> }
/** Sets `region` / `regionCite` on the witnesses that have none (in place); returns what was filled. A witness that already has a region string is never overwritten. */
export function fillWitnessRegions(ws: Pick<WitnessOut, 'id' | 'url' | 'region' | 'regionCite' | 'tokens'>[], file: IaPlacesFile | undefined = readIaPlaces()): FillReport {
  const rep: FillReport = { filled: 0, tokens: 0, byField: {} }
  if (!file) return rep
  for (const w of ws) {
    if (w.region || !w.id.startsWith('hv_ia_')) continue
    const id = iaIdOf(w.url), p = id ? file.places[id] : undefined
    if (!p || !placeById[p.place]) continue
    w.region = placeById[p.place]!.uk
    w.regionCite = p.field === 'series'
      ? Q('uk.wikipedia', p.url ?? '', p.value, `серія «${w.title}»: archive.org не містить місця; місце — за довідковим виданням`)
      : Q('archive.org', `https://archive.org/metadata/${id}/metadata`, `${p.field}: ${p.value}`, 'поле метаданих предмета archive.org (місце видання, не діалектна мітка)')
    rep.filled++; rep.tokens += w.tokens.length; rep.byField[p.field] = (rep.byField[p.field] ?? 0) + 1
    // a region string the matcher cannot map would be a silent loss: the place name always maps (tests/region.test.ts)
    if (!regionOf(w.region)) throw new Error(`${w.id}: place ${p.place} has no region`)
  }
  return rep
}
