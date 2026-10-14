/** Lazy, cached loader for public/data/cognates.json (BL-15; one file, fetched when the first word card opens). */
import type { CognateEntry, CognateFile } from '../../core/cognates.ts'

let p: Promise<CognateFile | undefined> | undefined
export function loadCognates(): Promise<CognateFile | undefined> {
  p ??= fetch('./data/cognates.json').then(r => (r.ok ? (r.json() as Promise<CognateFile>) : undefined)).catch(() => undefined)
  return p
}
export async function cognatesOf(lemma: string): Promise<{ entry?: CognateEntry; file?: CognateFile }> {
  const file = await loadCognates()
  return { entry: file?.entries[lemma], file }
}
