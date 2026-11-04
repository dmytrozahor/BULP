/**
 * SPEC 63 PF-2: slim the vetting records of an EXISTING <dir>/boot.json (evidence and note → <dir>/authors.json, core/authors-boot.ts) without running build-parts again.
 * `npx tsx pipelines/boot-authors.ts [dir]` (default public/data). Idempotent (a slim boot.json is left alone), atomic (RS-1): authors.json is written before boot.json, so a crash in between leaves a full boot.json.
 * build-parts does the same for a fresh build; this exists to bring a finished build to the new format without redoing the data.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { authorsEvidence, slimAuthors } from '../core/authors-boot.ts'
import type { Author } from './authors.ts'
import { writeJsonAtomic } from './robust.ts'

export function patchBootAuthors(dir: string): { slimmed: number } | null {
  const p = `${dir}/boot.json`
  if (!existsSync(p)) return null
  const b = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown> & { authors: Author[] }
  const todo = b.authors.filter(a => !a.lazyEv && (a.evidence.length || a.note)).length
  if (!todo) return { slimmed: 0 }
  writeJsonAtomic(`${dir}/authors.json`, JSON.stringify(authorsEvidence(b.authors)))
  b.authors = slimAuthors(b.authors)
  writeJsonAtomic(p, JSON.stringify(b))
  return { slimmed: todo }
}

if (process.argv[1]?.endsWith('boot-authors.ts')) {
  const dir = resolve(process.argv[2] ?? 'public/data'), r = patchBootAuthors(dir)
  console.log(r ? `boot-authors: ${r.slimmed} records slimmed in ${dir}/boot.json` : `boot-authors: no ${dir}/boot.json`)
}
