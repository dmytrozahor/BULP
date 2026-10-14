/** SPEC 63 PV: lazy loader of public/data/torot.json (name cards + ORV-only lemma cards) and the in-site links of a text-shard `ref` column. */
import type { TorotFile } from '../../core/torot.ts'
import type { LightFile } from '../../pipelines/build-torot.ts'

let p: Promise<TorotFile> | undefined
export function loadTorot(): Promise<TorotFile> {
  p ??= fetch('./data/torot.json').then(r => { if (!r.ok) throw new Error(`torot.json: HTTP ${r.status}`); return r.json() as Promise<TorotFile> }).catch(e => { p = undefined; throw e })
  return p
}
let lp: Promise<LightFile> | undefined
/** PV-6: public/data/light.json — lemmas dropped by KEEP_MIN_F (lemma, VESUM tags, f, first example) */
export function loadLight(): Promise<LightFile> {
  lp ??= fetch('./data/light.json').then(r => { if (!r.ok) throw new Error(`light.json: HTTP ${r.status}`); return r.json() as Promise<LightFile> }).catch(e => { lp = undefined; throw e })
  return lp
}
const e = encodeURIComponent
export const nameTo = (id: string) => `/name/${e(id)}`
export const orvTo = (id: string) => `/orv/${e(id)}`
/** 'n:<id>' → /name/:id, 'o:<id>' → /orv/:id, 'w:<lemma>' → /w/:lemma; anything else → undefined */
export function refTo(ref?: string): string | undefined {
  if (!ref) return undefined
  const id = ref.slice(2)
  return ref.startsWith('n:') ? nameTo(id) : ref.startsWith('o:') ? orvTo(id) : ref.startsWith('w:') ? `/w/${e(id)}` : undefined
}
