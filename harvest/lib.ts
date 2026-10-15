/**
 * SPEC 63 HV-1: shared plumbing of the background harvesters. One source = one script = one dir `data/raw/harvest/<source>/`:
 *   items/<file>.gz   the fetched payload (gzip; one item or a batch of items, see `file` in the index)
 *   index.jsonl       one line per item {id, url, date, licence, bytes, status, title, author?, region?, file, …extras}
 *   state.json        resume cursor (script-specific)
 *   log.txt           stdout/stderr (written by launch.ps1), STOPPED.json = why the script stopped (403/429/5xx/cap)
 * Rules: resumable (index.jsonl is the truth, ids already there are skipped), polite pacing (`delayMs` between requests),
 * stop on 403/429/5xx (no retry loops), per-source disk cap (default 2 GB), progress line every `logEvery` items.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

export const ROOT_DIR = process.env.HARVEST_DIR ?? 'data/raw/harvest'
export const UA = 'BULP research (non-commercial; ukr-lexicon word-form provenance; contact dmytrozah.dev@gmail.com)'

export interface IndexItem {
  id: string; url: string
  /** publication/composition date as the source states it: «1893», «1380-1400», «2023-05-01»; null = the source gives none */
  date: string | null
  licence: string; bytes: number; status: number; title: string; author?: string; region?: string
  /** items/<file>.gz that holds the payload (several index lines may share a batch file) */
  file?: string
  [extra: string]: unknown
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export class Harvest {
  readonly dir: string; readonly itemsDir: string; readonly indexPath: string; readonly statePath: string
  readonly done = new Set<string>()
  count = 0; bytes = 0; newItems = 0
  private last = 0
  private consec5xx = 0
  constructor(readonly source: string, readonly opts: { delayMs: number; capBytes?: number; logEvery?: number }) {
    this.dir = `${ROOT_DIR}/${source}`; this.itemsDir = `${this.dir}/items`; this.indexPath = `${this.dir}/index.jsonl`; this.statePath = `${this.dir}/state.json`
    mkdirSync(this.itemsDir, { recursive: true })
    if (existsSync(this.indexPath)) for (const l of readFileSync(this.indexPath, 'utf8').split('\n')) {
      if (!l) continue
      try { const it = JSON.parse(l) as IndexItem; this.done.add(it.id); this.count++; this.bytes += it.bytes } catch { /* torn last line after a kill: ignored */ }
    }
    this.disk = dirBytes(this.itemsDir)
    this.log(`start: ${this.count} items already, ${this.bytes} bytes`)
  }
  get cap() { return this.opts.capBytes ?? 2_000_000_000 }
  log(msg: string) { console.log(`${new Date().toISOString()} [${this.source}] ${msg}`) }
  state<T extends object>(def: T): T { try { return { ...def, ...JSON.parse(readFileSync(this.statePath, 'utf8')) } } catch { return def } }
  saveState(s: object) { writeFileSync(this.statePath, JSON.stringify(s)) }
  has(id: string) { return this.done.has(id) }
  diskFull() { return this.diskBytes() >= this.cap }
  /** bytes stored in items/ (gz, i.e. real disk use); the index `bytes` is the payload size before gzip */
  private disk = 0
  private diskBytes() { return this.disk }

  stop(reason: string, code = 2): never {
    this.log(`STOP ${reason} after ${this.newItems} new items (total ${this.count})`)
    writeFileSync(`${this.dir}/STOPPED.json`, JSON.stringify({ at: new Date().toISOString(), reason, items: this.count }))
    process.exit(code)
  }
  finish(): never {
    this.log(`DONE ${this.newItems} new items, total ${this.count}`)
    writeFileSync(`${this.dir}/STOPPED.json`, JSON.stringify({ at: new Date().toISOString(), reason: 'DONE', items: this.count }))
    process.exit(0)
  }

  /** polite GET: waits `delayMs` since the previous request; 403/429/5xx or a network failure stop the script (no retry storm) */
  async get(url: string, init: RequestInit & { soft5xx?: boolean } = {}): Promise<{ status: number; res: Response }> {
    const wait = this.last + this.opts.delayMs - Date.now()
    if (wait > 0) await sleep(wait)
    let res: Response | null = null
    for (let k = 0; k < 2 && !res; k++) {
      try { res = await fetch(url, { ...init, headers: { 'user-agent': UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(120_000) }) } catch { await sleep(30_000) }
    }
    this.last = Date.now()
    if (!res) this.stop(`network failure for ${url}`)
    const st = res.status
    if (st === 403 || st === 429) this.stop(`HTTP ${st} for ${url}`)
    if (st >= 500) {
      // `soft5xx` (per-file download servers, e.g. archive.org items): one broken file is recorded by the caller, but 5 in a row stop the script
      if (!init.soft5xx || ++this.consec5xx >= 5) this.stop(`HTTP ${st} for ${url}`)
    } else this.consec5xx = 0
    return { status: st, res }
  }
  async getText(url: string, init: RequestInit = {}): Promise<{ status: number; text: string }> {
    const { status, res } = await this.get(url, init)
    return { status, text: await res.text() }
  }
  async getJson<T = any>(url: string): Promise<T> {
    const { status, text } = await this.getText(url)
    try { return JSON.parse(text) as T } catch { return this.stop(`non-JSON answer (HTTP ${status}) for ${url}`) }
  }

  /** index-only item (the payload lives elsewhere, e.g. the r2u dump that pipelines/ingest-r2u.ts reads) */
  note(item: IndexItem) {
    appendFileSync(this.indexPath, JSON.stringify(item) + '\n')
    this.done.add(item.id); this.count++; this.newItems++; this.bytes += item.bytes
    if (this.newItems % (this.opts.logEvery ?? 50) === 0) this.log(`progress ${this.newItems} new, total ${this.count} (last: ${item.title})`)
  }
  /** store one payload file and add index lines for the items it holds */
  put(file: string, payload: string | Buffer, items: IndexItem[]) {
    const gz = gzipSync(payload)
    writeFileSync(`${this.itemsDir}/${file}.gz`, gz)
    this.disk += gz.length
    for (const it of items) {
      it.file = file
      appendFileSync(this.indexPath, JSON.stringify(it) + '\n')
      this.done.add(it.id); this.count++; this.newItems++; this.bytes += it.bytes
      if (this.newItems % (this.opts.logEvery ?? 50) === 0) this.log(`progress ${this.newItems} new, total ${this.count}, ${(this.bytes / 1e6).toFixed(1)} MB payload (last: ${it.title.slice(0, 40)})`)
    }
    if (this.diskBytes() >= this.cap) this.stop(`disk cap ${this.cap} bytes reached`, 0)
  }
}

/** the real size of a dir (resume: the disk cap counts what is already stored) */
export function dirBytes(dir: string): number {
  let n = 0
  try { for (const f of readdirSync(dir)) n += statSync(`${dir}/${f}`).size } catch { /* empty */ }
  return n
}

/** write a SKIPPED/NEEDS-DECISION line once (DECISIONS-NEEDED.md) */
export function decisionNeeded(line: string) {
  mkdirSync(ROOT_DIR, { recursive: true })
  const p = `${ROOT_DIR}/DECISIONS-NEEDED.md`
  const cur = existsSync(p) ? readFileSync(p, 'utf8') : '# Harvest: sources skipped or waiting for an owner decision\n\n'
  if (!cur.includes(line)) writeFileSync(p, cur + line + '\n')
}
