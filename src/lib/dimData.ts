/** Per-lemma loader of the diminutive / augmentative sidecar (MM-23; lm/dim/<bucket>.json holds the entries of the lemmas hashing to the bucket). */
import type { DimEntry, DimFile } from '../../core/dim-links.ts'
import { lmLoad } from './parts.ts'

export async function dimOf(lemma: string): Promise<DimEntry | undefined> {
  const f = await lmLoad<DimFile>('dim', lemma)
  return f?.entries?.[lemma]
}
export const DIM_SRC_UK = { sum11: 'СУМ-11', sum20: 'СУМ-20', wikt: 'Вікісловник (en)' } as const
