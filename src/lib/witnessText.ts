/** Running text of a witness (public/data/texts/<id>.json = { tokens: [raw, loc, s][] }) + annotation of a token slice; shared by /texts and the /witness card. */
import { annotate, type AnnotateData } from './annotate.ts'

export type Tok = [string, string, string | boolean]
export interface Row { raw: string; loc: string; sep: string; lemma?: string; status: string; provenance?: string }

export async function loadTokens(id: string): Promise<Tok[] | null> {
  try {
    const r = await fetch(`./data/texts/${encodeURIComponent(id)}.json`)
    if (!r.ok) return null
    const j = await r.json()
    return Array.isArray(j?.tokens) ? j.tokens : null
  } catch { return null }
}

export function rowsOf(toks: Tok[], from: number, to: number, data: AnnotateData): Row[] {
  return toks.slice(from, to).map(([raw, loc, s]) => {
    const a = annotate(raw, data)[0]
    return { raw, loc, sep: typeof s === 'string' ? s : s === false ? '' : ' ', lemma: a?.lemma, status: a?.status ?? 'unknown', provenance: a?.provenance }
  })
}

/** index of the first token of a locator (exact, then prefix «стб. 3» ~ «стб. 3 р. 2»); -1 when none */
export function findLoc(toks: Tok[], loc: string): number {
  const i = toks.findIndex(t => t[1] === loc)
  return i >= 0 ? i : toks.findIndex(t => t[1].startsWith(loc))
}
