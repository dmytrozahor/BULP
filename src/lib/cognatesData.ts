/** Per-lemma loader of the cognates sidecar (BL-15; PF-1: lm/cognates/<bucket>.json, not the whole file). */
import type { CognateEntry, CognateFile } from '../../core/cognates.ts'
import { lmLoad } from './parts.ts'

export async function cognatesOf(lemma: string): Promise<{ entry?: CognateEntry; file?: CognateFile }> {
  const file = await lmLoad<CognateFile>('cognates', lemma)
  return { entry: file?.entries[lemma], file }
}
