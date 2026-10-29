/**
 * SPEC 63 SRC-3 input: the proofread Німчук 1964 transcription of Зизаній «Лексис» (1596) → data/raw/hist-lex-ocr/zyzanii1596/zyz99.htm.
 * Not committed (an edition, 1964: the editorial apparatus is not copied into the repo); fetched once, robots.txt of litopys.org.ua disallows only /dos /mac /koi.
 * RS-1: skips an existing file, tmp + rename, and a failed download is a warning (build:data then simply has no Лексис rows), never a build error.
 *   tsx pipelines/fetch-hist-lex.ts
 */
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { NIMCHUK_LEXIS } from '../core/hist-lex.ts'
import { writeJsonAtomic } from './robust.ts'

export const ZYZ_DEST = 'data/raw/hist-lex-ocr/zyzanii1596/zyz99.htm'
export async function fetchZyz(dest = ZYZ_DEST, url = NIMCHUK_LEXIS.url): Promise<'kept' | 'fetched' | 'failed'> {
  if (existsSync(dest)) return 'kept'
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'BULP-research/1.0 (Ukrainian historical lexicon; non-commercial)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer()); if (buf.length < 10000) throw new Error(`too small: ${buf.length} B`)
    mkdirSync(dirname(dest), { recursive: true }); writeJsonAtomic(dest, buf as unknown as string);   /* tmp + rename; the bytes (windows-1251) are written as they are */ return 'fetched'
  } catch (e) { console.warn(`✗ ${url}: ${(e as Error).message} (no Лексис 1596 rows in this build)`); return 'failed' }
}
if (process.argv[1]?.endsWith("fetch-hist-lex.ts")) console.log(`zyz99.htm: ${await fetchZyz()}`)
