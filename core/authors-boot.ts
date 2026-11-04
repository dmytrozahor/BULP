/**
 * SPEC 63 PF-2 — the vetting records of boot.json without their evidence. Every harvested author carries a provisional record (the evidence is the source's own header line + a note), so
 * 1263 records were 72 KB gzip of EVERY first load (home page and deep link); the name, label, status, life and region are what the pages show, the evidence only opens on a popover or on /author/:id.
 * boot.json keeps `evidence: []` and `lazyEv: true` for a record that has evidence or a note; authors.json = { format: 1, rows: { id: { evidence, note? } } } carries them, fetched on demand (useData.loadAuthorEvidence).
 */
import type { Author } from '../pipelines/authors.ts'

export interface AuthorEvidenceFile { format: 1; rows: Record<string, { evidence: Author['evidence']; note?: string }> }

export function slimAuthors(authors: readonly Author[]): Author[] {
  return authors.map(a => {
    if (!a.evidence.length && !a.note) return a
    const { note: _n, ...rest } = a
    return { ...rest, evidence: [], lazyEv: true }
  })
}
export function authorsEvidence(authors: readonly Author[]): AuthorEvidenceFile {
  const rows: AuthorEvidenceFile['rows'] = {}
  for (const a of authors) if (a.evidence.length || a.note) rows[a.id] = { evidence: a.evidence, ...(a.note ? { note: a.note } : {}) }
  return { format: 1, rows }
}
/** the full record back from a slim one + the evidence file (lossless: tested) */
export function fullAuthor(a: Author, f: AuthorEvidenceFile | undefined): Author {
  if (!a.lazyEv || !f) return a
  const { lazyEv: _l, ...rest } = a, r = f.rows[a.id]
  return r ? { ...rest, evidence: r.evidence, ...(r.note ? { note: r.note } : {}) } : rest
}
