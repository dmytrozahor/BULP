/**
 * SPEC 63 SRC-4 input: the typed pages of the four oldest word lists on litopys.org.ua (core/hist-typed.ts) → data/raw/hist-typed/<id>/<page>.htm (windows-1251 bytes as served).
 * Not committed (an edition, 1964); robots.txt of litopys.org.ua disallows only /dos /mac /koi (http: its https certificate is wrong). Neutral research User-Agent, no personal data.
 * RS-1: an existing page is kept, tmp + rename, 0.7 s between requests, a failed download is a warning (build:data then has no rows of that list), never a build error.
 *   tsx pipelines/fetch-hist-typed.ts
 */
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { TYPED_BASE, TYPED_LEX_SPECS } from '../core/hist-typed.ts'
import { writeJsonAtomic } from './robust.ts'

export const TYPED_ROOT = 'data/raw/hist-typed'
export async function fetchTyped(root = TYPED_ROOT, base = TYPED_BASE, get: typeof fetch = fetch): Promise<Record<string, number>> {
  const out: Record<string, number> = { kept: 0, fetched: 0, failed: 0 }
  for (const spec of TYPED_LEX_SPECS) for (const p of spec.pages) {
    const dest = resolve(root, spec.id, p)
    if (existsSync(dest)) { out.kept!++; continue }
    try {
      const res = await get(base + p, { headers: { 'user-agent': 'BULP-research/1.0 (Ukrainian historical lexicon; non-commercial)' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer()); if (buf.length < 5000) throw new Error(`too small: ${buf.length} B`)
      mkdirSync(resolve(root, spec.id), { recursive: true }); writeJsonAtomic(dest, buf as unknown as string)   // tmp + rename; the bytes are written as they are
      out.fetched!++; await new Promise(r => setTimeout(r, 700))
    } catch (e) { console.warn(`✗ ${base + p}: ${(e as Error).message} (no ${spec.short} rows in this build)`); out.failed!++ }
  }
  return out
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-hist-typed.ts')) console.log('hist-typed:', JSON.stringify(await fetchTyped()))
