/** Lazy, cached loader for public/data/etymology.json (ET-1; one file for all lemmas, fetched when the first word card opens). */
import type { Etymology, EtymologyFile } from '../../core/etymology.ts'

let p: Promise<EtymologyFile | undefined> | undefined
export function loadEtymology(): Promise<EtymologyFile | undefined> {
  p ??= fetch('./data/etymology.json').then(r => (r.ok ? (r.json() as Promise<EtymologyFile>) : undefined)).catch(() => undefined)
  return p
}
export async function etymologyOf(lemma: string): Promise<{ entry?: Etymology; file?: EtymologyFile }> {
  const file = await loadEtymology()
  return { entry: file?.entries[lemma], file }
}
