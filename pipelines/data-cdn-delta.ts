/**
 * SPEC 63 IN-7: delta CDN upload. PF-7's prefixes are immutable (data/<buildId>/…, one new prefix per build), but most objects of a build equal the previous build's. The manifest of a build
 * (format 2) records `objects: { "<dir>/<rel>": [sha1 of the local bytes, stored size, 1 if stored gzipped] }`. The next upload
 *   · hashes the local files, fetches the manifest of the BASE build (the live pointer, or --base ID),
 *   · copies every unchanged object INSIDE S3 (`aws s3 sync s3://…/<base>/<dir> s3://…/<new>/<dir>`, server side: no bytes leave the bucket, no upload bandwidth, the new prefix is complete and immutable),
 *   · uploads only the new and changed files, and leaves deleted ones out (they are excluded from the copy).
 * AWS CLI limits shape the plan: an exclude list is matched against every key, so a dir with more than MAX_EXCLUDE changed/deleted files is uploaded whole (the old path); names with glob characters
 * force the same. Multipart server-side copies DROP metadata, so every copy states Cache-Control / Content-Type explicitly and the gzipped big files get Content-Encoding: gzip in their own call;
 * after the copy the encodings of the copied big objects are checked with head-object.
 */
import { createHash } from 'node:crypto'
import { closeSync, openSync, readSync } from 'node:fs'
import { join } from 'node:path'
import type { LocalFile } from './data-cdn.ts'

export const MAX_EXCLUDE = 1500
export const BATCH = 300
const GLOB = /[*?[\]]/
export type ObjectRec = [hash: string, stored: number, big?: 1]
export type ObjectMap = Record<string, ObjectRec>

export function fileSha1(path: string): string {
  const h = createHash('sha1'), fd = openSync(path, 'r'), buf = Buffer.alloc(4 << 20)
  try { for (;;) { const n = readSync(fd, buf, 0, buf.length, null); if (n <= 0) break; h.update(buf.subarray(0, n)) } } finally { closeSync(fd) }
  return h.digest('hex')
}
export const objKey = (f: Pick<LocalFile, 'dir' | 'rel'>) => `${f.dir}/${f.rel}`
export function hashFiles(files: LocalFile[], data: string): Map<string, string> {
  return new Map(files.map(f => [objKey(f), fileSha1(join(data, f.dir, f.rel))]))
}

export interface DirPlan { mode: 'delta' | 'full'; why?: string; /** excluded from the copy: changed + deleted rels */ exclude: string[]; /** small rels to upload */ upload: string[]; /** changed big rels (the caller gzips and puts them) */ uploadBig: string[]; /** unchanged small rels copied */ copy: number; /** unchanged big rels (copied with Content-Encoding gzip) */ copyBig: string[] }
export interface DeltaPlan { base: string; dirs: Map<string, DirPlan>; changedFiles: number; changedBytes: number; copiedFiles: number; copiedBytes: number; deleted: number }

/** pure planner: no I/O */
export function planDelta(base: string, files: LocalFile[], hashes: Map<string, string>, prev: ObjectMap, dirs: readonly string[]): DeltaPlan {
  const plan: DeltaPlan = { base, dirs: new Map(), changedFiles: 0, changedBytes: 0, copiedFiles: 0, copiedBytes: 0, deleted: 0 }
  for (const d of dirs) {
    const mine = files.filter(f => f.dir === d), upload: string[] = [], uploadBig: string[] = [], copyBig: string[] = [], exclude: string[] = []
    let copy = 0
    for (const f of mine) {
      const k = objKey(f), p = prev[k]
      if (p && p[0] === hashes.get(k) && !!p[2] === f.big) { if (p[2]) copyBig.push(f.rel); else copy++; plan.copiedFiles++; plan.copiedBytes += f.size }
      else { (f.big ? uploadBig : upload).push(f.rel); exclude.push(f.rel); plan.changedFiles++; plan.changedBytes += f.size }
    }
    const here = new Set(mine.map(f => f.rel))
    for (const k of Object.keys(prev)) if (k.startsWith(d + '/') && !here.has(k.slice(d.length + 1))) { exclude.push(k.slice(d.length + 1)); plan.deleted++ }
    const bad = [...exclude, ...copyBig].find(r => GLOB.test(r))
    // a dir with nothing to copy (new dir) or too many exceptions is uploaded whole: that is the PF-7 path
    const why = !Object.keys(prev).some(k => k.startsWith(d + '/')) ? 'dir not in the base build' : exclude.length > MAX_EXCLUDE ? `${exclude.length} changed/deleted files (> ${MAX_EXCLUDE})` : bad ? `glob character in ${bad}` : undefined
    plan.dirs.set(d, why ? { mode: 'full', why, exclude: [], upload: [], uploadBig: [], copy: 0, copyBig: [] } : { mode: 'delta', exclude, upload, uploadBig, copy, copyBig })
  }
  // a dir that fell back to a full upload uploads all its files: count them as changed
  for (const [d, dp] of plan.dirs) if (dp.mode === 'full') for (const f of files.filter(x => x.dir === d)) { /* counted above as changed or copied; the full path re-sends the copied ones */ if (prev[objKey(f)] && prev[objKey(f)]![0] === hashes.get(objKey(f))) { plan.copiedFiles--; plan.copiedBytes -= f.size; plan.changedFiles++; plan.changedBytes += f.size } }
  return plan
}

export function manifestObjects(files: LocalFile[], hashes: Map<string, string>, gz: Record<string, number>): ObjectMap {
  const o: ObjectMap = {}
  for (const f of files) { const k = objKey(f); o[k] = f.big ? [hashes.get(k)!, gz[k] ?? 0, 1] : [hashes.get(k)!, f.size] }
  return o
}

export type Aws = (args: string[]) => string
export function fetchObjects(aws: Aws, bucket: string, base: string): ObjectMap | undefined {
  try {
    const m = JSON.parse(aws(['s3', 'cp', `s3://${bucket}/data/${base}/manifest.json`, '-', '--only-show-errors'])) as { format?: number; objects?: ObjectMap }
    return m.format === 2 && m.objects ? m.objects : undefined
  } catch { return undefined }
}

const chunks = <T>(xs: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < xs.length; i += n) o.push(xs.slice(i, i + n)); return o }
const META = (cc: string) => ['--cache-control', cc, '--content-type', 'application/json']

/** run the copy + upload of one dir of a delta plan; returns the number of aws calls */
export function runDeltaDir(aws: Aws, o: { bucket: string; base: string; id: string; dir: string; data: string; plan: DirPlan; cacheControl: string }): number {
  const { bucket, base, id, dir, plan } = o, src = `s3://${bucket}/data/${base}/${dir}`, dst = `s3://${bucket}/data/${id}/${dir}`
  const common = ['--only-show-errors', '--no-progress']
  let calls = 0
  // 1. server-side copy of everything unchanged, small objects (big ones are excluded here: they need Content-Encoding)
  aws(['s3', 'sync', src, dst, ...common, ...META(o.cacheControl), ...[...plan.exclude, ...plan.copyBig].flatMap(r => ['--exclude', r])]); calls++
  // 2. unchanged gzipped big objects, in batches, with the encoding stated
  for (const b of chunks(plan.copyBig, BATCH)) { aws(['s3', 'sync', src, dst, ...common, ...META(o.cacheControl), '--content-encoding', 'gzip', '--exclude', '*', ...b.flatMap(r => ['--include', r])]); calls++ }
  // 3. new and changed small files (big ones are gzipped and put by the caller)
  for (const b of chunks(plan.upload, BATCH)) { aws(['s3', 'sync', join(o.data, dir), dst, ...common, '--size-only', ...META(o.cacheControl), '--exclude', '*', ...b.flatMap(r => ['--include', r])]); calls++ }
  return calls
}

/** the copied big objects must still be gzip-encoded (a multipart copy would have dropped it) */
export function checkEncodings(aws: Aws, bucket: string, id: string, dir: string, rels: string[]): string[] {
  const bad: string[] = []
  for (const r of rels) { const e = aws(['s3api', 'head-object', '--bucket', bucket, '--key', `data/${id}/${dir}/${r}`, '--query', 'ContentEncoding', '--output', 'text']); if (e !== 'gzip') bad.push(`${dir}/${r} (Content-Encoding ${e || 'none'})`) }
  return bad
}
