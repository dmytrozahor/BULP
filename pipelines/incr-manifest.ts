/**
 * SPEC 63 IN-1/IN-2: incremental ingest. Every witness-producing source keeps a CONTENT MANIFEST next to its work files:
 *   <out>/ingest-manifest/<source>.json   { format, source, params, items: { <item id>: { sig, wid?, url?, content?, rank?, skipped? } } }
 * `sig` is a hash of what the harvester's index says about the item (id, url, date, bytes, title, author, region, file, status): the item file is not opened to decide whether it changed.
 * A rerun processes only the NEW or CHANGED items (an item whose sig is unchanged and whose witness file still exists is never read), appends their witness files to the existing work files, and
 * removes the files of items that disappeared from the index (DELETED, logged explicitly). Parameters that change what an item produces (`params`: language gate version, stride, ...) invalidate the whole source.
 *
 * Overlap: a new item whose witness id, URL or CONTENT hash (the token stream) already belongs to a witness of ANOTHER source (hv4 vs hv5, izbornyk vs the 1974 edition, wikisource vs archive.org ...) is
 * not written twice. The better edition wins (rank: scholarly edition > later/printed edition > anything else > OCR); on a tie the witness that was there first stays. A losing NEW item is skipped
 * (`dup-of <source>/<id>`); when the new item outranks the old one the old witness file is removed and its manifest entry marked `superseded` (both logged).
 * RS-1: manifests are written atomically (tmp + fsync + rename), only after the work files they describe; a crash leaves the previous manifest, so the rerun redoes at most the items of that run.
 */
import { createHash } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeSync } from 'node:fs'

export interface ItemRec { sig: string; wid?: string; url?: string; content?: string; rank?: number; skipped?: string; superseded?: string }
export interface SrcManifest { format: 1; source: string; params: string; items: Record<string, ItemRec> }

export const sha1 = (s: string) => createHash('sha1').update(s).digest('hex')
/** ranks of witness types: the vetted edition wins an overlap */
export const RANK: Record<string, number> = { scholarly_ed: 4, later_ed: 3, ocr: 1 }
export const rankOf = (witnessType: string) => RANK[witnessType] ?? 2

/** signature of an index line: only fields the harvester states about the item */
export function itemSig(it: Record<string, unknown>): string {
  const keys = ['id', 'url', 'date', 'bytes', 'title', 'author', 'region', 'file', 'status', 'licence', 'edition', 'witnessType', 'school', 'volume']
  return sha1(JSON.stringify(keys.map(k => it[k] ?? null)))
}
/** content hash of a token stream: spelling and order, nothing else (the same text in two sources gets the same hash) */
export const contentHash = (raws: Iterable<string>) => { const h = createHash('sha1'); for (const r of raws) { h.update(r); h.update('\n') } return h.digest('hex') }

function writeFileAtomic(path: string, data: string) {
  const tmp = `${path}.${process.pid}.tmp`, fd = openSync(tmp, 'w')
  try { writeSync(fd, data); fsyncSync(fd) } finally { closeSync(fd) }
  renameSync(tmp, path)
}

export interface InWitness { id: string; url?: string; witnessType: string; tokens: { raw: string }[] }
export interface PlanStats { new: number; changed: number; unchanged: number; deleted: number; dup: number; superseded: number }

export class Incr {
  readonly dir: string
  private man = new Map<string, SrcManifest>()
  private seen = new Map<string, Set<string>>()
  readonly stats = new Map<string, PlanStats>()
  private log: (m: string) => void
  /** @param full true: ignore the recorded sigs (every item is processed again), the manifest is still rewritten */
  constructor(private out: string, private full = false, log: (m: string) => void = m => console.log(m)) {
    this.dir = `${out}/ingest-manifest`; this.log = log
  }
  private st(src: string) { let s = this.stats.get(src); if (!s) this.stats.set(src, s = { new: 0, changed: 0, unchanged: 0, deleted: 0, dup: 0, superseded: 0 }); return s }
  manifest(src: string, params = ''): SrcManifest {
    let m = this.man.get(src); if (m) return m
    const p = `${this.dir}/${src}.json`
    let prev: SrcManifest | undefined
    try { prev = JSON.parse(readFileSync(p, 'utf8')) as SrcManifest; if (prev.format !== 1) prev = undefined } catch { /* none or torn: start over */ }
    if (prev && prev.params !== params) { this.log(`[ingest] ${src}: parameters changed (${prev.params || '-'} -> ${params || '-'}), all items are read again`); prev = undefined }
    m = prev ?? { format: 1, source: src, params, items: {} }
    this.man.set(src, m); this.seen.set(src, new Set()); return m
  }
  private others(src: string): SrcManifest[] {
    const out: SrcManifest[] = [...this.man].filter(([n]) => n !== src).map(([, m]) => m)
    if (!existsSync(this.dir)) return out
    for (const f of readdirSync(this.dir)) {
      if (!f.endsWith('.json') || f === `${src}.json`) continue
      const name = f.slice(0, -5), live = this.man.get(name)
      if (live) continue
      try { const j = JSON.parse(readFileSync(`${this.dir}/${f}`, 'utf8')) as SrcManifest; if (j.format === 1) { this.man.set(name, j); out.push(j) } } catch { /* torn */ }
    }
    return out
  }
  /** begin a source: loads its manifest (params decide whether it is still valid) */
  begin(src: string, params = '') { this.manifest(src, params) }
  /** true when the item was already processed with this sig and its outcome is still on disk: do NOT read it */
  unchanged(src: string, id: string, sig: string): boolean {
    const m = this.manifest(src), r = m.items[id]; this.seen.get(src)!.add(id)
    if (this.full || !r || r.sig !== sig) { this.st(src)[r ? 'changed' : 'new']++; return false }
    if (r.wid && !existsSync(`${this.out}/${r.wid}.json`)) { this.st(src).changed++; return false }   // the work file is gone: redo
    this.st(src).unchanged++; return true
  }
  /** record a skipped item (undated, too short, ...): the same sig will not be read again */
  skip(src: string, id: string, sig: string, why: string) { this.manifest(src).items[id] = { sig, skipped: why } }
  /**
   * decide whether witness `w` of item `id` is written. Returns 'take' (write it) or 'skip' (an existing witness of another source has the same id / url / content and is at least as good).
   * Removes a worse witness this one supersedes.
   */
  claim(src: string, id: string, sig: string, w: InWitness): 'take' | 'skip' {
    const rank = rankOf(w.witnessType), content = contentHash(w.tokens.map(t => t.raw)), m = this.manifest(src)
    for (const o of this.others(src)) for (const [oid, r] of Object.entries(o.items)) {
      if (!r.wid || r.superseded) continue
      if (r.wid !== w.id && !(w.url && r.url === w.url) && r.content !== content) continue
      if ((r.rank ?? 2) >= rank) {
        this.st(src).dup++; this.log(`[ingest] ${src}/${id}: duplicate of ${o.source}/${oid} (${r.wid === w.id ? 'witness id' : r.url === w.url ? 'url' : 'content hash'}), kept the existing (rank ${r.rank ?? 2} >= ${rank})`)
        m.items[id] = { sig, skipped: `dup-of ${o.source}/${oid}`, content }; return 'skip'
      }
      this.st(src).superseded++; this.log(`[ingest] ${src}/${id}: supersedes ${o.source}/${oid} (rank ${rank} > ${r.rank ?? 2}); removing ${r.wid}.json`)
      rmSync(`${this.out}/${r.wid}.json`, { force: true }); r.superseded = `${src}/${id}`; delete r.wid
      this.dirty.add(o.source)
    }
    m.items[id] = { sig, wid: w.id, ...(w.url ? { url: w.url } : {}), content, rank }
    return 'take'
  }
  private dirty = new Set<string>()
  /** end of a source run: items that are no longer in the index are DELETED (their work files removed), then the manifest is written. `partial`: a --limit run saw only part of the index, nothing is deleted */
  finish(src: string, partial = false) {
    const m = this.manifest(src), seen = this.seen.get(src)!
    if (!partial) for (const id of Object.keys(m.items)) if (!seen.has(id)) {
      const r = m.items[id]!
      if (r.wid) { rmSync(`${this.out}/${r.wid}.json`, { force: true }); this.log(`[ingest] ${src}/${id}: deleted from the index, removed ${r.wid}.json`) }
      delete m.items[id]; this.st(src).deleted++
    }
    mkdirSync(this.dir, { recursive: true })
    writeFileAtomic(`${this.dir}/${src}.json`, JSON.stringify(m))
    for (const d of this.dirty) { const o = this.man.get(d); if (o) writeFileAtomic(`${this.dir}/${d}.json`, JSON.stringify(o)) }
    this.dirty.clear()
    const s = this.st(src)
    this.log(`[ingest] ${src}: ${s.new} new, ${s.changed} changed, ${s.unchanged} unchanged (not read), ${s.deleted} deleted, ${s.dup} duplicates skipped, ${s.superseded} superseded`)
  }
}

/** vocabulary sources are aggregates (one output file for the whole source): the unit of change is the source. Skip it when its index digest and parameters equal the recorded ones and the output exists. */
export function vocabSig(indexLines: string[], params: string) { return sha1(params + '\n' + indexLines.join('\n')) }
export function sourceUnchanged(out: string, src: string, sig: string, outFile: string, full = false): boolean {
  if (full || !existsSync(outFile)) return false
  try { return (JSON.parse(readFileSync(`${out}/ingest-manifest/${src}.sig.json`, 'utf8')) as { sig: string }).sig === sig } catch { return false }
}
export function recordSource(out: string, src: string, sig: string) { mkdirSync(`${out}/ingest-manifest`, { recursive: true }); writeFileAtomic(`${out}/ingest-manifest/${src}.sig.json`, JSON.stringify({ sig })) }
