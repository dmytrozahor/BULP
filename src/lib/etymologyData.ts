/** Per-lemma loader of the etymology sidecar (ET-1; PF-1: lm/etymology/<bucket>.json holds the entries of the lemmas hashing to the bucket, not the whole file). */
import type { Etymology, EtymologyFile } from '../../core/etymology.ts'
import { lmLoad } from './parts.ts'

export async function etymologyOf(lemma: string): Promise<{ entry?: Etymology; file?: EtymologyFile }> {
  const file = await lmLoad<EtymologyFile>('etymology', lemma)
  return { entry: file?.entries[lemma], file }
}
