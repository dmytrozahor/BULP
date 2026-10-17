/**
 * SPEC 63 RS-2: content-addressed stage cache for the data build (pipelines/build.ts).
 *
 * > RS-2 owner, 2026-10-17: «you actually may consider saving expensive states in the building process, as you're likely to recalc it from the beginning although it is not needed»
 *
 * A stage is `cache.run(name, opts, fn)`: fn returns an object (the stage's explicit outputs). The entry key is sha256 of
 *   · the stage's code fingerprint (its own source block + the build glue + the transitive import closure of the modules they reference: pipelines/stage-code.ts),
 *   · the spine = the keys of every stage that ran before it (so a change cascades downstream),
 *   · `opts.inputs` / `opts.files` (inputs the build cannot see by itself: the request files of a Python stage, the nlp/*.py sources),
 *   · the relevant env/flags (BUILD_ENV_KEYS) and the Node major version.
 * Never time. On top of the key every entry records the READ SET of the build up to its end (path → fingerprint of every file/dir the build read through node:fs,
 * ReadTracker below): an entry is a hit only when each recorded file still has its fingerprint. That is what makes "an unlisted input file changed" a miss
 * instead of a stale hit, without a hand-kept list of inputs.
 *
 * Storage (data/work/cache/<stage>/<key>.v8, BUILD_CACHE_DIR): frames of node:v8 serialize, `chunked` Map/Array fields in slices (a huge Map is never one buffer, memory
 * does not double), a trailer with the sha256 of everything before it. Written to *.tmp, renamed, and only then is a manifest line appended (RS-1). A truncated or corrupt
 * entry is a miss, never a crash. GC keeps the last 2 entries per stage (per item for per-item stages); `report()` prints sizes.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { dirname, join, resolve, sep } from 'node:path'
import { deserialize, serialize } from 'node:v8'
import { isDeepStrictEqual } from 'node:util'

/** the real fs functions, captured before ReadTracker patches the module (this file's own I/O never goes through the patch) */
const O = {
  readFileSync: fs.readFileSync, existsSync: fs.existsSync, readdirSync: fs.readdirSync, createReadStream: fs.createReadStream, statSync: fs.statSync,
  writeFileSync: fs.writeFileSync, renameSync: fs.renameSync, openSync: fs.openSync, closeSync: fs.closeSync, readSync: fs.readSync, writeSync: fs.writeSync,
  mkdirSync: fs.mkdirSync, appendFileSync: fs.appendFileSync, unlinkSync: fs.unlinkSync, fsyncSync: fs.fsyncSync,
}

export const CACHE_FORMAT = 'RS2v1'
/** env variables that change what the build computes: part of every key */
export const BUILD_ENV_KEYS = ['KEEP_MIN_F', 'DICT_ONLY', 'HIST_ONLY', 'BULP_ALLOW_UNREADABLE', 'UV_BIN'] as const
const MAGIC = Buffer.from('RS2v1\0\0\0'), END = Buffer.from('END!')

export const sha = (...parts: (string | Buffer | Uint8Array)[]) => {
  const h = createHash('sha256')
  for (const p of parts) { const b = typeof p === 'string' ? Buffer.from(p, 'utf8') : p; const n = Buffer.alloc(8); n.writeBigUInt64LE(BigInt(b.length)); h.update(n); h.update(b) }
  return h.digest('hex')
}
const contentHash = (b: Buffer | string) => createHash('sha1').update(b).digest('hex')
export const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : x) ?? 'undefined'

// ── read tracking ────────────────────────────────────────────────────────────────────────────────

/**
 * Records a fingerprint of every file/directory the build reads through node:fs (readFileSync → content hash, createReadStream → size+mtime, readdirSync → listing hash,
 * existsSync → presence). Files the build itself writes during the run are not inputs and are skipped. Patching node:fs works for the ES-module named imports too
 * (syncBuiltinESMExports updates the live bindings).
 */
export class ReadTracker {
  readonly log = new Map<string, string>()
  readonly written = new Set<string>()
  private memo = new Map<string, string>()
  private installed = false
  private hidden = new Set<string>()
  private filters = new Map<string, (name: string) => boolean>()
  constructor(private ignore: string[] = []) {}

  private skip(abs: string) { return this.hidden.has(abs) || abs.includes(`${sep}node_modules${sep}`) || this.ignore.some(p => abs === p || abs.startsWith(p + sep)) }
  /** a directory listing counts only for the names the build looks at (data/work also receives the build's own request files, logs and the cache) */
  filterDir(dir: string, keep: (name: string) => boolean) { this.filters.set(resolve(dir), keep) }
  private listFp(abs: string, names: string[]) { const f = this.filters.get(abs); return 'D:' + contentHash((f ? names.filter(f) : names).sort().join('\n')) }
  /** paths a stage produces itself: not recorded as its inputs while it runs (its own output is no input of its entry) */
  hide(paths: string[]) { for (const p of paths) this.hidden.add(resolve(p)) }
  unhide(paths: string[]) { for (const p of paths) this.hidden.delete(resolve(p)) }
  private rec(abs: string, fp: string) {
    if (this.skip(abs) || this.written.has(abs)) return
    const cur = this.log.get(abs)
    if (cur && (fp === 'P' || fp === 'A') && cur !== 'A' && cur !== 'P') return   // never downgrade a content fingerprint to a bare existence check
    this.log.set(abs, fp); this.memo.set(abs, fp)
  }
  private static abs(p: unknown): string | undefined { return typeof p === 'string' ? resolve(p) : p instanceof URL ? resolve(p.pathname.replace(/^\/([A-Za-z]:)/, '$1')) : undefined }

  install() {
    if (this.installed) return; this.installed = true
    const self = this
    ;(fs as any).readFileSync = function (p: unknown, o?: unknown) {
      const abs = ReadTracker.abs(p)
      if (abs === undefined) return (O.readFileSync as any)(p, o)
      const enc = typeof o === 'string' ? o : (o as { encoding?: string } | undefined)?.encoding
      const buf = (O.readFileSync as any)(p, o && typeof o === 'object' ? { ...(o as object), encoding: undefined } : undefined) as Buffer
      self.rec(abs, 'H:' + contentHash(buf))
      return enc && enc !== 'buffer' ? buf.toString(enc as BufferEncoding) : buf
    }
    ;(fs as any).existsSync = function (p: unknown) {
      const r = O.existsSync(p as string), abs = ReadTracker.abs(p)
      if (abs !== undefined) self.rec(abs, r ? 'P' : 'A')
      return r
    }
    ;(fs as any).readdirSync = function (p: unknown, o?: unknown) {
      const r = (O.readdirSync as any)(p, o) as (string | { name: string })[], abs = ReadTracker.abs(p)
      if (abs !== undefined) self.rec('dir:' + abs, self.listFp(abs, r.map(x => typeof x === 'string' ? x : x.name)))
      return r
    }
    ;(fs as any).createReadStream = function (p: unknown, o?: unknown) {
      const abs = ReadTracker.abs(p)
      if (abs !== undefined) self.rec(abs, self.streamFp(abs))
      return (O.createReadStream as any)(p, o)
    }
    ;(fs as any).writeFileSync = function (p: unknown, ...a: unknown[]) { const abs = ReadTracker.abs(p); if (abs !== undefined) self.markWritten(abs); return (O.writeFileSync as any)(p, ...a) }
    ;(fs as any).renameSync = function (a: unknown, b: unknown) { const abs = ReadTracker.abs(b); if (abs !== undefined) self.markWritten(abs); return (O.renameSync as any)(a, b) }
    syncBuiltinESMExports()
  }
  uninstall() {
    if (!this.installed) return; this.installed = false
    Object.assign(fs, { readFileSync: O.readFileSync, existsSync: O.existsSync, readdirSync: O.readdirSync, createReadStream: O.createReadStream, writeFileSync: O.writeFileSync, renameSync: O.renameSync })
    syncBuiltinESMExports()
  }
  markWritten(abs: string) { if (!this.skip(abs)) { this.written.add(abs); this.memo.delete(abs) } }

  private streamFp(abs: string) { try { const s = O.statSync(abs); return `S:${s.size}:${Math.round(s.mtimeMs)}` } catch { return 'A' } }
  /** the fingerprint the file has NOW, in the same kind as the recorded one (`prev`) */
  current(path: string, prev: string): string {
    const m = this.memo.get(path); if (m !== undefined && m[0] === prev[0]) return m
    let r: string
    if (path.startsWith('dir:')) { try { r = this.listFp(path.slice(4), O.readdirSync(path.slice(4)) as string[]) } catch { r = 'A' } }
    else if (prev === 'A' || prev === 'P') r = O.existsSync(path) ? 'P' : 'A'
    else if (prev[0] === 'S') r = this.streamFp(path)
    else { try { r = 'H:' + contentHash(O.readFileSync(path)) } catch { r = 'A' } }
    this.memo.set(path, r); return r
  }
  /** first path whose recorded fingerprint no longer holds, or undefined */
  firstChanged(reads: [string, string][]): string | undefined {
    for (const [p, fp] of reads) if (this.current(p, fp) !== fp) return p.startsWith('dir:') ? p.slice(4) + sep : p
    return undefined
  }
  snapshot(): [string, string][] { return [...this.log] }
  adopt(reads: [string, string][]) { for (const [p, fp] of reads) if (!this.log.has(p) && !this.written.has(p)) { this.log.set(p, fp); this.memo.set(p, fp) } }
  /** content fingerprint of a file (a per-item cache key); reuses what the build already hashed while reading it */
  fileFp(abs: string): string { const f = this.log.get(abs) ?? this.memo.get(abs); if (f?.[0] === 'H') return f; return this.current(abs, 'H:') }
}

// ── entry files ──────────────────────────────────────────────────────────────────────────────────

interface FieldMeta { name: string; kind: 'map' | 'array'; chunks: number }
interface EntryMeta { format: string; stage: string; key: string; secs: number; reads: [string, string][]; fields: FieldMeta[] }
export const CHUNK = 4096

function writeAll(fd: number, b: Buffer) { let off = 0; while (off < b.length) off += O.writeSync(fd, b, off, b.length - off) }

/** writes `meta`, the unchunked rest of `value`, then the chunked Map/Array fields; returns the file size and the digest (the trailer) */
export function writeEntry(path: string, meta: Omit<EntryMeta, 'fields' | 'format'>, value: Record<string, unknown>, chunked: string[], chunk = CHUNK): { bytes: number; digest: string } {
  const tmp = `${path}.${process.pid}.tmp`, hash = createHash('sha256')
  O.mkdirSync(dirname(path), { recursive: true })
  const fd = O.openSync(tmp, 'w')
  let bytes = 0
  const put = (b: Buffer) => { writeAll(fd, b); hash.update(b); bytes += b.length }
  const frame = (v: unknown) => { const b = serialize(v); if (b.length > 0xffffffff) throw new RangeError('frame over 4 GiB'); const n = Buffer.alloc(4); n.writeUInt32LE(b.length); put(n); put(b) }
  try {
    const rest: Record<string, unknown> = {}, fields: FieldMeta[] = []
    for (const [k, v] of Object.entries(value)) {
      if (chunked.includes(k) && (v instanceof Map || Array.isArray(v))) fields.push({ name: k, kind: v instanceof Map ? 'map' : 'array', chunks: Math.ceil((v instanceof Map ? v.size : v.length) / chunk) })
      else rest[k] = v
    }
    put(MAGIC); frame({ ...meta, format: CACHE_FORMAT, fields } satisfies EntryMeta); frame(rest)
    for (const f of fields) {
      const v = value[f.name] as Map<unknown, unknown> | unknown[]
      if (v instanceof Map) { let buf: [unknown, unknown][] = []; for (const e of v) { buf.push(e); if (buf.length === chunk) { frame(buf); buf = [] } } if (buf.length) frame(buf) }
      else for (let i = 0; i < v.length; i += chunk) frame(v.slice(i, i + chunk))
    }
    const digest = hash.digest(); writeAll(fd, END); writeAll(fd, digest); bytes += END.length + digest.length
    O.fsyncSync(fd); O.closeSync(fd)
    O.renameSync(tmp, path)
    return { bytes, digest: digest.toString('hex') }
  } catch (e) { try { O.closeSync(fd) } catch { /* already closed */ } try { O.unlinkSync(tmp) } catch { /* gone */ } throw e }
}

class Corrupt extends Error {}
function readFrames(path: string, onFrame: (b: Buffer, i: number) => boolean | void, verify: boolean): void {
  const size = O.statSync(path).size
  if (size < MAGIC.length + 4 + END.length + 32) throw new Corrupt('too short')
  const fd = O.openSync(path, 'r')
  try {
    const rd = (pos: number, n: number) => { const b = Buffer.alloc(n); let got = 0; while (got < n) { const r = O.readSync(fd, b, got, n - got, pos + got); if (r <= 0) throw new Corrupt('truncated'); got += r } return b }
    const tail = rd(size - END.length - 32, END.length + 32)
    if (!tail.subarray(0, END.length).equals(END)) throw new Corrupt('no trailer (killed writer?)')
    const limit = size - END.length - 32, hash = verify ? createHash('sha256') : undefined
    const head = rd(0, MAGIC.length); if (!head.equals(MAGIC)) throw new Corrupt('bad magic'); hash?.update(head)
    let pos = MAGIC.length, i = 0
    while (pos < limit) {
      if (pos + 4 > limit) throw new Corrupt('bad frame'); const n = rd(pos, 4), len = n.readUInt32LE(0)
      if (pos + 4 + len > limit) throw new Corrupt('bad frame length'); const b = rd(pos + 4, len)
      hash?.update(n); hash?.update(b); pos += 4 + len
      if (onFrame(b, i++) === false) return
    }
    if (hash && !hash.digest().equals(tail.subarray(END.length))) throw new Corrupt('digest mismatch')
  } finally { O.closeSync(fd) }
}
/** meta only (cheap, no digest check): used to validate the read set before loading */
export function peekEntry(path: string): EntryMeta {
  let meta: EntryMeta | undefined
  try { readFrames(path, b => { meta = deserialize(b) as EntryMeta; return false }, false) } catch (e) { if (e instanceof Corrupt) throw e; throw new Corrupt((e as Error).message) }
  if (!meta || meta.format !== CACHE_FORMAT) throw new Corrupt('format')
  return meta
}
/** the whole value, digest verified; throws Corrupt on anything wrong */
export function readEntry(path: string): { meta: EntryMeta; value: Record<string, unknown> } {
  let meta!: EntryMeta, value: Record<string, unknown> = {}, cur = -1, left = 0, acc: Map<unknown, unknown> | unknown[] | undefined
  try {
    readFrames(path, (b, i) => {
      if (i === 0) { meta = deserialize(b) as EntryMeta; if (meta.format !== CACHE_FORMAT) throw new Corrupt('format'); return }
      if (i === 1) { value = deserialize(b) as Record<string, unknown>; return }
      if (left === 0) { cur++; const f = meta.fields[cur]; if (!f) throw new Corrupt('extra frame'); left = f.chunks; acc = f.kind === 'map' ? new Map() : []; value[f.name] = acc }
      const part = deserialize(b) as unknown[]
      if (acc instanceof Map) for (const [k, v] of part as [unknown, unknown][]) acc.set(k, v); else for (const x of part) (acc as unknown[]).push(x)
      left--
    }, true)
    if (left !== 0 || cur + 1 !== meta.fields.length) throw new Corrupt('missing chunks')
  } catch (e) { throw e instanceof Corrupt ? e : new Corrupt((e as Error).message) }
  return { meta, value }
}

// ── the cache ────────────────────────────────────────────────────────────────────────────────────

export interface CodeIndex { fingerprint(stage: string): string }
export interface CacheConfig {
  dir: string; enabled: boolean
  /** `--from <stage>`: recompute this stage and every later one */
  from?: string
  /** BUILD_CACHE_VERIFY=1: after every save, reload the entry and compare it with the computed value (catches lossy round trips: functions, class instances) */
  verify?: boolean
  keep?: number; chunk?: number
  code: CodeIndex
  env?: Record<string, string | undefined>
  flags?: Record<string, unknown>
  log?: (m: string) => void
  /** extra tracker ignore prefixes */
  ignore?: string[]
}
export interface RunOpts {
  /** Map/Array fields of the output saved in slices (no cross-field object identity for these; everything else shares one frame and keeps its identity) */
  chunked?: string[]
  /** inputs the read tracker cannot see (a Python stage's request files, ...) */
  inputs?: unknown
  /** files (absolute) whose content is part of the key */
  files?: string[]
  /** files (absolute) the stage writes itself and reads back: hidden from the read set while it runs */
  produces?: string[]
  /** run concurrently with other stages: the spine is advanced by join() in a fixed order */
  parallel?: boolean
}
export interface StageStat { stage: string; status: 'hit' | 'miss' | 'off'; secs: number; bytes: number; why?: string }
interface ManifestLine { key: string; file: string; bytes: number; secs: number; digest: string; item?: string; at: string }

export class StageCache {
  readonly tracker: ReadTracker
  readonly stats: StageStat[] = []
  private spine: string
  private pending = new Map<string, string>()
  private forced = false
  private itemStages = new Set<string>()
  private manifests = new Map<string, ManifestLine[]>()
  private items = { hit: 0, miss: 0, bytes: 0, saved: 0 }
  readonly enabled: boolean
  constructor(private cfg: CacheConfig) {
    this.enabled = cfg.enabled
    this.tracker = new ReadTracker([resolve(cfg.dir), ...(cfg.ignore ?? [])])
    this.spine = sha(CACHE_FORMAT, process.versions.node.split('.')[0]!, stable(cfg.env ?? {}), stable(cfg.flags ?? {}))
  }
  private log(m: string) { (this.cfg.log ?? console.log)(`[stage-cache] ${m}`) }
  start() { if (this.enabled) this.tracker.install() }
  setLog(f: (m: string) => void) { this.cfg.log = f }
  private dirOf(stage: string) { return join(this.cfg.dir, stage) }
  private manifest(stage: string): ManifestLine[] {
    let m = this.manifests.get(stage); if (m) return m
    m = []
    const p = join(this.dirOf(stage), 'manifest.jsonl')
    if (O.existsSync(p)) for (const l of String(O.readFileSync(p, 'utf8')).split('\n')) { if (!l.trim()) continue; try { const j = JSON.parse(l) as ManifestLine; if (j.key && j.file) m.push(j) } catch { /* partial last line of a killed writer */ } }
    this.manifests.set(stage, m); return m
  }
  private commit(stage: string, line: ManifestLine) {
    O.mkdirSync(this.dirOf(stage), { recursive: true })
    O.appendFileSync(join(this.dirOf(stage), 'manifest.jsonl'), JSON.stringify(line) + '\n')   // only after the entry file is complete and renamed (RS-1)
    this.manifest(stage).push(line)
  }
  private keyOf(stage: string, o: RunOpts) {
    return sha(stage, this.cfg.code.fingerprint(stage), this.spine, stable(o.inputs ?? null), ...(o.files ?? []).map(f => { try { return f + ':' + contentHash(O.readFileSync(f)) } catch { return f + ':absent' } }))
  }
  private lookup(stage: string, key: string, wantReads: boolean): { value: Record<string, unknown>; meta: EntryMeta } | { why: string } {
    const cands = this.manifest(stage).filter(l => l.key === key).reverse()
    if (!cands.length) return { why: this.manifest(stage).length ? 'code, spine or inputs changed' : 'no entry' }
    let why = 'entry file missing'
    for (const l of cands) {
      const path = join(this.dirOf(stage), l.file)
      try {
        if (!O.existsSync(path)) continue
        if (O.statSync(path).size !== l.bytes) { why = 'corrupt entry (size differs from the manifest)'; continue }
        if (wantReads) { const m = peekEntry(path); const ch = this.tracker.firstChanged(m.reads); if (ch) { why = `input changed: ${ch}`; continue } }
        const e = readEntry(path)
        if (wantReads) this.tracker.adopt(e.meta.reads)
        return e
      } catch (e) { why = `corrupt entry (${(e as Error).message})` }
    }
    return { why }
  }
  private save(stage: string, key: string, secs: number, value: Record<string, unknown>, chunked: string[], reads: [string, string][], item?: string) {
    const file = `${key}-${sha(stable(reads)).slice(0, 12)}.v8`, path = join(this.dirOf(stage), file)
    try {
      const { bytes, digest } = writeEntry(path, { stage, key, secs, reads }, value, chunked, this.cfg.chunk)
      if (this.cfg.verify) {
        const back = readEntry(path).value
        if (!isDeepStrictEqual(back, value)) { O.unlinkSync(path); throw new Error('round trip is not lossless (function, class instance or shared state in a chunked field?)') }
      }
      this.commit(stage, { key, file, bytes, secs: Math.round(secs * 10) / 10, digest, ...(item ? { item } : {}), at: new Date().toISOString() })
      return bytes
    } catch (e) { this.log(`not cached ${stage}${item ? ' ' + item : ''}: ${(e as Error).message}`); return 0 }
  }

  /** run (or load) a stage; fn's result must be an object */
  async run<T extends Record<string, unknown>>(stage: string, o: RunOpts, fn: () => Promise<T> | T): Promise<T> {
    if (!this.enabled) { const t = Date.now(); const v = await fn(); this.stats.push({ stage, status: 'off', secs: (Date.now() - t) / 1000, bytes: 0 }); return v }
    if (this.cfg.from === stage) this.forced = true
    const key = this.keyOf(stage, o)
    let why = this.forced ? `--from ${this.cfg.from}` : ''
    if (!this.forced) {
      const hit = this.lookup(stage, key, true)
      if ('value' in hit) {
        this.log(`cache hit ${stage} (saved ~${Math.round(hit.meta.secs)} s)`)
        this.stats.push({ stage, status: 'hit', secs: hit.meta.secs, bytes: this.manifest(stage).find(l => l.key === key)?.bytes ?? 0 })
        this.advance(stage, key, o); return hit.value as T
      }
      why = hit.why
    }
    this.log(`cache miss ${stage}: ${why}`)
    const t = Date.now()
    if (o.produces) this.tracker.hide(o.produces)
    let value: T
    try { value = await fn() } finally { if (o.produces) this.tracker.unhide(o.produces) }
    const secs = (Date.now() - t) / 1000
    const bytes = this.save(stage, key, secs, value, o.chunked ?? [], this.tracker.snapshot())
    this.stats.push({ stage, status: 'miss', secs, bytes, why })
    this.advance(stage, key, o); return value
  }
  private advance(stage: string, key: string, o: RunOpts) { if (o.parallel) this.pending.set(stage, key); else this.spine = sha(this.spine, key) }
  /** fold concurrently run stages into the spine in the given (fixed) order */
  join(stages: string[]) { this.spine = sha(this.spine, ...stages.filter(s => this.pending.has(s)).map(s => this.pending.get(s)!)) }

  /**
   * Per-item stage (one entry per witness): key = code fingerprint + item id + `fp()` (the item's input fingerprint); no spine, no read set.
   * Adding one book re-computes one item.
   */
  item<T extends Record<string, unknown>>(stage: string, id: string, fp: () => string, fn: () => T): T {
    if (!this.enabled) return fn()
    if (this.cfg.from === stage) this.forced = true
    if (!this.itemStages.has(stage)) { this.itemStages.add(stage); this.spine = sha(this.spine, 'item-stage', stage, this.cfg.code.fingerprint(stage)) }   // the item code is not part of the glue: it enters the spine here
    const key = sha(stage, this.cfg.code.fingerprint(stage), id, fp())
    if (!this.forced) {
      const hit = this.lookup(stage, key, false)
      if ('value' in hit) { this.items.hit++; this.items.saved += hit.meta.secs; return hit.value as T }
    }
    const t = Date.now(), v = fn(), secs = (Date.now() - t) / 1000
    this.items.miss++; this.items.bytes += this.save(stage, key, secs, v, [], [], id)
    return v
  }
  itemSummary(stage: string) { if (this.enabled) this.log(`${stage}: ${this.items.hit} entries reused, ${this.items.miss} computed`); this.items.hit = this.items.miss = 0 }

  /** end of build: GC and the size report */
  finish() {
    this.tracker.uninstall()
    if (!this.enabled) return
    try { gc(this.cfg.dir, this.cfg.keep ?? 2) } catch (e) { this.log(`gc failed: ${(e as Error).message}`) }
    for (const l of report(this.cfg.dir)) this.log(l)
    const hit = this.stats.filter(s => s.status === 'hit'), miss = this.stats.filter(s => s.status === 'miss')
    this.log(`${hit.length} stage hits (saved ~${Math.round(hit.reduce((a, s) => a + s.secs, 0))} s), ${miss.length} computed (${Math.round(miss.reduce((a, s) => a + s.secs, 0))} s)`)
  }
}

/** keep the newest `keep` entries per stage (per item for per-item stages); remove everything else including stale *.tmp */
export function gc(dir: string, keep = 2): { removed: number } {
  let removed = 0
  if (!O.existsSync(dir)) return { removed }
  for (const stage of O.readdirSync(dir)) {
    const sd = join(dir, stage), mp = join(sd, 'manifest.jsonl')
    if (!O.statSync(sd).isDirectory() || !O.existsSync(mp)) continue
    const lines: ManifestLine[] = []
    for (const l of String(O.readFileSync(mp, 'utf8')).split('\n')) { if (!l.trim()) continue; try { const j = JSON.parse(l) as ManifestLine; if (j.key && j.file) lines.push(j) } catch { /* partial line */ } }
    const seenFile = new Set<string>(), perItem = new Map<string, number>(), kept: ManifestLine[] = []
    for (const l of lines.reverse()) {   // newest first
      if (seenFile.has(l.file)) continue; seenFile.add(l.file)
      const g = l.item ?? '', n = perItem.get(g) ?? 0; if (n >= keep) continue
      perItem.set(g, n + 1); if (O.existsSync(join(sd, l.file))) kept.push(l)
    }
    kept.reverse()
    const refd = new Set(kept.map(l => l.file))
    for (const f of O.readdirSync(sd)) {
      if (f === 'manifest.jsonl' || refd.has(f)) continue
      if (f.endsWith('.tmp') && Date.now() - O.statSync(join(sd, f)).mtimeMs < 600_000) continue   // a live writer
      try { O.unlinkSync(join(sd, f)); removed++ } catch { /* gone */ }
    }
    const tmp = `${mp}.${process.pid}.tmp`; O.writeFileSync(tmp, kept.map(l => JSON.stringify(l)).join('\n') + (kept.length ? '\n' : '')); O.renameSync(tmp, mp)
  }
  return { removed }
}

/** one line per stage: entries, bytes, the compute time the newest entry saves */
export function report(dir: string): string[] {
  const out: string[] = []; let total = 0
  if (!O.existsSync(dir)) return ['cache: empty']
  for (const stage of O.readdirSync(dir).sort()) {
    const sd = join(dir, stage); if (!O.statSync(sd).isDirectory()) continue
    let bytes = 0, n = 0; for (const f of O.readdirSync(sd)) if (f.endsWith('.v8')) { bytes += O.statSync(join(sd, f)).size; n++ }
    total += bytes; out.push(`cache ${stage}: ${n} entries, ${(bytes / 1048576).toFixed(1)} MiB`)
  }
  out.push(`cache total ${(total / 1048576).toFixed(1)} MiB in ${dir}`)
  return out
}

// `npx tsx pipelines/stage-cache.ts report|gc|clear [dir]` (npm run cache:report / cache:gc / cache:clear)
import { fileURLToPath } from 'node:url'
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, d] = process.argv.slice(2), dir = resolve(d ?? process.env['BUILD_CACHE_DIR'] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../data/work/cache'))
  if (cmd === 'report') console.log(report(dir).join('\n'))
  else if (cmd === 'gc') { console.log(`removed ${gc(dir).removed} files`); console.log(report(dir).join('\n')) }
  else if (cmd === 'clear') { fs.rmSync(dir, { recursive: true, force: true }); console.log(`cleared ${dir}`) }
  else { console.error('usage: stage-cache.ts report|gc|clear [dir]'); process.exit(2) }
}
