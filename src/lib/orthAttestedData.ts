/** Per-lemma loader of the attested initial-и sidecar (MM-45; lm/oa/<bucket>.json). Lazy: asked only when a старий правопис with such a table (кулішівка, желехівка) is chosen. */
import type { OaEntry, OaFile } from '../../core/orth-attested.ts'
import { lmLoad } from './parts.ts'

export async function orthAttestedOf(lemma: string): Promise<OaEntry | undefined> {
  const f = await lmLoad<OaFile>('oa', lemma.toLowerCase())
  return f?.entries?.[lemma.toLowerCase()]
}
