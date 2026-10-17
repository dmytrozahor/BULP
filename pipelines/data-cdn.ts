/**
 * SPEC 63 PF-7 — the big site data (core/data-dirs.ts CDN_DIRS, ~6 GB) is published to S3 (served by CloudFront), versioned by build:
 *   s3://<bucket>/data/<buildId>/<dir>/…        buildId = <yyyymmddHHMM>-<short sha>, objects immutable (Cache-Control: immutable), application/json
 *   src/data/data-version.json                  the committed pointer { base, buildId }: the app and its data switch together when the pointer commit deploys
 *
 *   npx tsx pipelines/data-cdn.ts upload [--dry-run] [--build-id ID] [--new]   sync every dir, gzip the huge files, verify, write manifest.json + the pointer, print the buildId
 *   npx tsx pipelines/data-cdn.ts verify [--build-id ID]                        compare the local files with the bucket (count + size of every object)
 *   npx tsx pipelines/data-cdn.ts prune [--keep 3]                              delete builds older than the newest N (never the live one)
 *   npx tsx pipelines/data-cdn.ts pull [dir …]                                  local dev: sync the live build into public/data (needs read access; gunzips the huge files)
 *
 * RS-1: resumable (the build id and the gzip sizes live in data/work/cdn-upload.json; `aws s3 sync --size-only` skips what is already there, so a re-run
 * continues), idempotent, and nothing is declared done before verify has compared every object. The worker writes through its EC2 instance role (no static keys).
 * Files over BIG_BYTES (newspapers up to 298 MB; CloudFront compresses only up to 10 MB, GitHub Pages used to gzip them) are stored gzipped with Content-Encoding: gzip.
 */
import { execFileSync, execFile } from 'node:child_process'
import { createGunzip, createGzip } from 'node:zlib'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { BUILD_ID_RE, CDN_DIRS, buildIdOf, type DataVersion } from '../core/data-dirs.ts'

const execFileP = promisify(execFile)
export const BUCKET = process.env.DATA_BUCKET ?? 'bulp-site-data-666546914501-euc1'
export const REGION = process.env.AWS_DEFAULT_REGION ?? 'eu-central-1'
export const BIG_BYTES = 9 * 1024 * 1024
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'
export const DATA = resolve('public/data')
export const POINTER = resolve('src/data/data-version.json')
export const STATE = resolve('data/work/cdn-upload.json')

export type Aws = (args: string[]) => string
export const realAws: Aws = args => execFileSync('aws', [...args, '--region', REGION], { encoding: 'utf8', maxBuffer: 1 << 29 }).trim()

export interface LocalFile { dir: string; rel: string; size: number; big: boolean }
/** every file of the CDN dirs under `data` (dot-files such as .pull-old are not data) */
export function localFiles(data: string, dirs: readonly string[] = CDN_DIRS, big = BIG_BYTES): LocalFile[] {
  const out: LocalFile[] = []
  const walk = (dir: string, abs: string, rel: string) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(dir, join(abs, e.name), r)
      else if (e.isFile()) { const size = statSync(join(abs, e.name)).size; out.push({ dir, rel: r, size, big: size >= big }) }
    }
  }
  for (const d of dirs) if (existsSync(join(data, d))) walk(d, join(data, d), '')
  return out
}

export const keyOf = (id: string, f: Pick<LocalFile, 'dir' | 'rel'>) => `data/${id}/${f.dir}/${f.rel}`

export interface UploadState { buildId: string; /** gzip size of every big file already uploaded, by `dir/rel` */ big: Record<string, number> }
export function loadState(path = STATE): UploadState | undefined { try { return JSON.parse(readFileSync(path, 'utf8')) as UploadState } catch { return undefined } }
export function saveState(s: UploadState, path = STATE) {
  mkdirSync(join(path, '..'), { recursive: true })
  const t = `${path}.tmp`; writeFileSync(t, JSON.stringify(s)); renameSync(t, path)   // atomic: a crash never leaves half a state file
}

/** the keys (and sizes) that must exist in the bucket for `files`: a big file is stored gzipped, so its size is the gzip size recorded in the state */
export function expectedObjects(id: string, files: LocalFile[], gz: Record<string, number>): { want: Map<string, number>; unknownBig: string[] } {
  const want = new Map<string, number>(), unknownBig: string[] = []
  for (const f of files) {
    if (f.big) { const g = gz[`${f.dir}/${f.rel}`]; if (g === undefined) { unknownBig.push(`${f.dir}/${f.rel}`); continue }; want.set(keyOf(id, f), g) }
    else want.set(keyOf(id, f), f.size)
  }
  return { want, unknownBig }
}
export interface Diff { missing: string[]; wrongSize: string[]; extra: string[] }
export function diffObjects(want: Map<string, number>, have: Map<string, number>, ignore: (k: string) => boolean = () => false): Diff {
  const d: Diff = { missing: [], wrongSize: [], extra: [] }
  for (const [k, n] of want) { const h = have.get(k); if (h === undefined) d.missing.push(k); else if (h !== n) d.wrongSize.push(`${k} (local ${n}, bucket ${h})`) }
  for (const k of have.keys()) if (!want.has(k) && !ignore(k)) d.extra.push(k)
  return d
}
export const diffOk = (d: Diff) => !d.missing.length && !d.wrongSize.length && !d.extra.length

export function listRemote(aws: Aws, id: string, bucket = BUCKET): Map<string, number> {
  const out = aws(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', `data/${id}/`, '--query', 'Contents[].[Key,Size]', '--output', 'text'])
  const m = new Map<string, number>()
  if (!out || out === 'None') return m
  for (const line of out.split('\n')) { const [k, n] = line.split('\t'); if (k && n !== undefined) m.set(k, Number(n)) }
  return m
}

const GLOB = /[*?[\]]/
/** sync arguments for one dir; big files are excluded (they are gzipped separately) */
export function syncArgs(id: string, dir: string, bigRels: string[], bucket = BUCKET, data = DATA): string[] {
  for (const r of bigRels) if (GLOB.test(r)) throw new Error(`${dir}/${r}: a glob character in a file name cannot be excluded from sync`)
  return ['s3', 'sync', join(data, dir), `s3://${bucket}/data/${id}/${dir}`, '--only-show-errors', '--no-progress', '--size-only',
    '--cache-control', CACHE_CONTROL, '--content-type', 'application/json', ...bigRels.flatMap(r => ['--exclude', r])]
}

/** builds present in the bucket, newest first, minus the ones to keep: the newest `keep` and the live one */
export function pruneList(ids: string[], keep: number, live?: string): string[] {
  const sorted = ids.filter(i => BUILD_ID_RE.test(i)).sort().reverse()
  const kept = new Set([...sorted.slice(0, keep), ...(live ? [live] : [])])
  return sorted.filter(i => !kept.has(i))
}

export function readPointer(path = POINTER): DataVersion { return JSON.parse(readFileSync(path, 'utf8')) as DataVersion }
export function writePointer(buildId: string, path = POINTER) {
  const p = { ...readPointer(path), buildId }
  const t = `${path}.tmp`; writeFileSync(t, JSON.stringify(p, null, 2) + '\n'); renameSync(t, path)
}

async function gzipUpload(f: LocalFile, id: string, data: string, bucket: string): Promise<number> {
  const tmp = join(tmpdir(), `cdn-${process.pid}-${f.rel.replace(/\W/g, '_')}.gz`)
  try {
    await pipeline(createReadStream(join(data, f.dir, f.rel)), createGzip({ level: 6 }), createWriteStream(tmp))
    const size = statSync(tmp).size
    await execFileP('aws', ['s3', 'cp', tmp, `s3://${bucket}/${keyOf(id, f)}`, '--only-show-errors', '--no-progress', '--region', REGION,
      '--content-type', 'application/json', '--content-encoding', 'gzip', '--cache-control', CACHE_CONTROL])
    return size
  } finally { rmSync(tmp, { force: true }) }
}

export interface UploadOpts { dryRun: boolean; buildId?: string; fresh: boolean; data?: string; bucket?: string; state?: string; pointer?: string; dirs?: readonly string[]; aws?: Aws }
export async function upload(o: UploadOpts): Promise<{ buildId: string; ok: boolean; diff?: Diff; files: number; bytes: number }> {
  const data = o.data ?? DATA, bucket = o.bucket ?? BUCKET, aws = o.aws ?? realAws, statePath = o.state ?? STATE
  const dirs = (o.dirs ?? CDN_DIRS).filter(d => existsSync(join(data, d)))
  if (dirs.length < (o.dirs ?? CDN_DIRS).length) throw new Error(`missing under ${data}: ${(o.dirs ?? CDN_DIRS).filter(d => !dirs.includes(d)).join(', ')} (run build:data / data:texts / data:unlinked first)`)
  const files = localFiles(data, dirs), bytes = files.reduce((s, f) => s + f.size, 0)
  const prev = o.fresh ? undefined : loadState(statePath)
  const sha = o.aws ? 'abcdef0' : execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim()
  const buildId = o.buildId ?? prev?.buildId ?? buildIdOf(new Date(), sha)
  if (!BUILD_ID_RE.test(buildId)) throw new Error(`bad build id ${buildId}`)
  const state: UploadState = { buildId, big: prev?.buildId === buildId ? prev.big : {} }
  console.log(`build ${buildId}: ${files.length} files, ${(bytes / 1e9).toFixed(2)} GB in ${dirs.length} dirs → s3://${bucket}/data/${buildId}/ (${files.filter(f => f.big).length} gzipped big files)`)
  if (o.dryRun) {
    for (const d of dirs) console.log('aws', syncArgs(buildId, d, files.filter(f => f.dir === d && f.big).map(f => f.rel), bucket, data).join(' '))
    return { buildId, ok: true, files: files.length, bytes }
  }
  saveState(state, statePath)
  for (const d of dirs) {
    const t0 = Date.now()
    aws(syncArgs(buildId, d, files.filter(f => f.dir === d && f.big).map(f => f.rel), bucket, data))
    console.log(`synced ${d} in ${Math.round((Date.now() - t0) / 1000)}s`)
  }
  // big files: gzip + put, 4 at a time; the gzip size is recorded so a re-run skips what the bucket already holds
  const have = listRemote(aws, buildId, bucket), todo = files.filter(f => f.big && !(state.big[`${f.dir}/${f.rel}`] !== undefined && have.get(keyOf(buildId, f)) === state.big[`${f.dir}/${f.rel}`]))
  let next = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < todo.length) {
      const f = todo[next++]!
      state.big[`${f.dir}/${f.rel}`] = await gzipUpload(f, buildId, data, bucket); saveState(state, statePath)
      console.log(`gzipped ${f.dir}/${f.rel} (${(f.size / 1e6).toFixed(0)} MB → ${(state.big[`${f.dir}/${f.rel}`]! / 1e6).toFixed(0)} MB)`)
    }
  }))
  const res = verify(buildId, { data, bucket, aws, state: statePath, dirs })
  if (!res.ok) return { buildId, ok: false, diff: res.diff, files: files.length, bytes }
  const manifest = { format: 1, buildId, files: files.length, bytes, created: new Date().toISOString(), dirs: Object.fromEntries(dirs.map(d => [d, files.filter(f => f.dir === d).length])) }
  const mf = join(tmpdir(), `cdn-manifest-${process.pid}.json`); writeFileSync(mf, JSON.stringify(manifest))
  try { aws(['s3', 'cp', mf, `s3://${bucket}/data/${buildId}/manifest.json`, '--only-show-errors', '--content-type', 'application/json', '--cache-control', CACHE_CONTROL]) } finally { rmSync(mf, { force: true }) }
  writePointer(buildId, o.pointer ?? POINTER)
  return { buildId, ok: true, files: files.length, bytes }
}

export function verify(buildId: string, o: { data?: string; bucket?: string; aws?: Aws; state?: string; dirs?: readonly string[] } = {}): { ok: boolean; diff: Diff } {
  const data = o.data ?? DATA, bucket = o.bucket ?? BUCKET, aws = o.aws ?? realAws
  const files = localFiles(data, o.dirs ?? CDN_DIRS), st = loadState(o.state ?? STATE)
  const { want, unknownBig } = expectedObjects(buildId, files, st?.buildId === buildId ? st.big : {})
  const diff = diffObjects(want, listRemote(aws, buildId, bucket), k => k === `data/${buildId}/manifest.json`)
  diff.missing.push(...unknownBig.map(k => `${k} (gzip not uploaded)`))
  const ok = diffOk(diff)
  console.log(`verify ${buildId}: ${want.size} expected objects, missing ${diff.missing.length}, wrong size ${diff.wrongSize.length}, extra ${diff.extra.length} → ${ok ? 'OK' : 'FAILED'}`)
  for (const [k, l] of Object.entries(diff)) if ((l as string[]).length) console.log(`  ${k}: ${(l as string[]).slice(0, 5).join('; ')}${(l as string[]).length > 5 ? ' …' : ''}`)
  return { ok, diff }
}

export function prune(keep: number, aws: Aws = realAws, bucket = BUCKET, live = readPointer().buildId): string[] {
  const out = aws(['s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', 'data/', '--delimiter', '/', '--query', 'CommonPrefixes[].Prefix', '--output', 'text'])
  const ids = out && out !== 'None' ? out.split(/\s+/).map(p => p.replace(/^data\/|\/$/g, '')) : []
  const drop = pruneList(ids, keep, live)
  for (const id of drop) { aws(['s3', 'rm', `s3://${bucket}/data/${id}/`, '--recursive', '--only-show-errors']); console.log(`pruned ${id}`) }
  return drop
}

async function pull(dirs: string[]) {
  const id = readPointer().buildId
  if (!id) throw new Error('src/data/data-version.json has no buildId yet: nothing to pull')
  for (const d of dirs.length ? dirs : [...CDN_DIRS]) {
    realAws(['s3', 'sync', `s3://${BUCKET}/data/${id}/${d}`, join(DATA, d), '--only-show-errors', '--no-progress'])
    // the huge files are stored gzipped; `aws s3 sync` writes the stored bytes, so restore plain JSON
    for (const f of localFiles(DATA, [d], 0)) {
      const p = join(DATA, f.dir, f.rel), b = readFileSync(p).subarray(0, 2)
      if (b[0] === 0x1f && b[1] === 0x8b) { await pipeline(createReadStream(p), createGunzip(), createWriteStream(`${p}.tmp`)); renameSync(`${p}.tmp`, p) }
    }
    console.log(`pulled ${d}`)
  }
}

if (process.argv[1]?.endsWith('data-cdn.ts')) {
  const [cmd, ...rest] = process.argv.slice(2), flag = (n: string) => rest.includes(n), val = (n: string) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined }
  const main = async () => {
    if (cmd === 'upload') {
      const r = await upload({ dryRun: flag('--dry-run'), buildId: val('--build-id'), fresh: flag('--new') })
      if (!r.ok) { console.error(`UPLOAD FAILED verify for ${r.buildId}`); process.exit(2) }
      console.log(`BUILD_ID=${r.buildId}`)
    } else if (cmd === 'verify') {
      const id = val('--build-id') ?? loadState()?.buildId ?? readPointer().buildId
      process.exit(verify(id).ok ? 0 : 2)
    } else if (cmd === 'prune') prune(Number(val('--keep') ?? 3))
    else if (cmd === 'pull') await pull(rest.filter(a => !a.startsWith('--')))
    else { console.error('usage: data-cdn.ts upload [--dry-run] [--build-id ID] [--new] | verify [--build-id ID] | prune [--keep N] | pull [dir …]'); process.exit(1) }
  }
  main().catch(e => { console.error(e); process.exit(1) })
}
