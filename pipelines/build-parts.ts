/**
 * SPEC 63 PF — cut the built data into parts the browser loads on demand. Run after `build:data` (and after data:unlinked / the CV build):
 *   npx tsx pipelines/build-parts.ts            → public/data/{boot.json, ix/, cd/, lm/, wit/, pg/lemmas/, sum/}
 * Input: public/data/{lexicon,lexindex,cardindex,corpus,etymology,cognates,senses,usage,loanlabels,heteronyms,phrases}.json (the whole files stay for the pipeline and the full list pages).
 * ix/ is the prefix-sharded lookup index (search + analyser/annotator/derivation lookups), see core/parts.ts.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { basename } from 'node:path'
import { thinParFiles } from './build-thin-par.ts'
import { bootEntries, readUvAttested } from './boot-uv.ts'
import { unpackCore, packCore } from '../core/pack.ts'
import { writeJsonAtomic } from './robust.ts'
import { bucketOf } from '../core/shard.ts'
import { key } from '../core/text.ts'
import { cardMap } from '../core/cv.ts'
import { DIALECTS } from '../core/rules.ts'
import { archId, type ArchEntry } from '../core/archaic.ts'
import { featureOf } from '../core/form-class.ts'
import { BUDGET, IX_GZ_MAX, IX_MAX, IX_MIN, IX_SPLIT_MIN_KEYS, LEMMA_PAGE, LM_BUCKETS, LM_NAMES, TC_BUCKETS, seBucket, xrBucket, synBucket, phrBucket, WIT_BUCKETS, tcBucket, ixName, ixPad, lmBucket, witBucket, type BootFile, type DxShard, type IxHit, type IxManifest, type IxRow, type IxShard, type LmName } from '../core/parts.ts'
import type { CoreCard, CorpusMeta, LexIndex } from '../core/types.ts'
import { vocabTotals } from './vocab-n.ts'
import { VOCAB_V } from '../core/vocab-view.ts'

const DATA = process.env.PARTS_DATA ?? 'public/data'
/**
 * RS-1: sidecars the main build ALWAYS writes are required (a missing one is a failed build, not a site without that part); only these may be absent:
 * cardindex.json (written by the separate CV step), phrases.json and archaic.json (written only when their stage ran).
 */
export const OPTIONAL_SIDECARS = ['cardindex.json', 'phrases.json', 'archaic.json']
export const readSidecar = <T>(dir: string, f: string, optional = OPTIONAL_SIDECARS.includes(f)): T | undefined => {
  const p = `${dir}/${f}`
  if (!existsSync(p)) { if (optional) return undefined; throw new Error(`${p} is missing (required input; run build:data)`) }
  try { return JSON.parse(readFileSync(p, 'utf8')) as T } catch (e) { throw new Error(`${p} is unreadable: ${(e as Error).message}`) }
}
const rd = <T>(f: string): T | undefined => readSidecar<T>(DATA, f)
/** RS-1: every output is written under DATA/.next and swapped into place only after all stages succeeded, so a crash never leaves a half-written ix/ or a site without lm/ */
const STAGE = () => `${DATA}/.next`
const fresh_ = new Set<string>(), loose = new Set<string>()
const out = (f: string, v: unknown) => { const p = `${STAGE()}/${f}`; mkdirSync(p.slice(0, p.lastIndexOf('/')), { recursive: true }); writeFileSync(p, JSON.stringify(v)); if (![...fresh_].some(d => f.startsWith(d + '/'))) loose.add(f) }
const fresh = (d: string) => { fresh_.add(d); rmSync(`${STAGE()}/${d}`, { recursive: true, force: true }); mkdirSync(`${STAGE()}/${d}`, { recursive: true }) }
const parent = (p: string) => p.slice(0, p.lastIndexOf('/'))
/** IN-4: which files of the staged outputs differ from what is in DATA (same bytes = unchanged); the swap below stays atomic, the numbers say how much of the site data really changed */
export interface PartsDiff { files: number; changed: number; added: number; removed: number; changedFiles: string[] }
export function diffStage(data: string, dirs: Iterable<string>, files: Iterable<string>): PartsDiff {
  const st = `${data}/.next`, d: PartsDiff = { files: 0, changed: 0, added: 0, removed: 0, changedFiles: [] }
  const walk = (base: string, rel: string, out: string[]) => { for (const e of readdirSync(`${base}/${rel}`, { withFileTypes: true })) { const r = `${rel}/${e.name}`; if (e.isDirectory()) walk(base, r, out); else out.push(r) } }
  const cmp = (r: string) => {
    d.files++
    if (!existsSync(`${data}/${r}`)) { d.added++; d.changedFiles.push(r) }
    else if (!readFileSync(`${st}/${r}`).equals(readFileSync(`${data}/${r}`))) { d.changed++; d.changedFiles.push(r) }
  }
  for (const dir of dirs) {
    if (!existsSync(`${st}/${dir}`)) continue
    const now: string[] = [], was: string[] = []; walk(st, dir, now); if (existsSync(`${data}/${dir}`)) walk(data, dir, was)
    for (const r of now) cmp(r)
    const set = new Set(now); for (const r of was) if (!set.has(r)) d.removed++
  }
  for (const f of files) if (existsSync(`${st}/${f}`)) cmp(f)
  return d
}
/** swap the staged outputs into DATA (old dir renamed aside, new renamed in, old deleted) */
export function commitStage(data: string, dirs: Iterable<string>, files: Iterable<string>) {
  const st = `${data}/.next`, old = `${data}/.old`
  dirs = [...dirs]; files = [...files]
  try {
    const df = diffStage(data, dirs, files)
    console.log(`parts: ${df.files} files, ${df.changed} changed, ${df.added} new, ${df.removed} removed, ${df.files - df.changed - df.added} identical`)
    mkdirSync('data/work', { recursive: true }); writeJsonAtomic('data/work/parts-changed.json', JSON.stringify({ ...df, changedFiles: df.changedFiles.slice(0, 5000) }))
  } catch (e) { console.log(`parts: diff skipped (${(e as Error).message})`) }
  rmSync(old, { recursive: true, force: true })
  for (const d of dirs) {
    if (!existsSync(`${st}/${d}`)) continue
    mkdirSync(parent(`${old}/${d}`), { recursive: true }); mkdirSync(parent(`${data}/${d}`), { recursive: true })
    if (existsSync(`${data}/${d}`)) renameSync(`${data}/${d}`, `${old}/${d}`)
    renameSync(`${st}/${d}`, `${data}/${d}`)
  }
  for (const f of files) if (existsSync(`${st}/${f}`)) { mkdirSync(parent(`${data}/${f}`), { recursive: true }); renameSync(`${st}/${f}`, `${data}/${f}`) }
  rmSync(old, { recursive: true, force: true }); rmSync(st, { recursive: true, force: true })
}
const gz = (v: unknown) => gzipSync(JSON.stringify(v), { level: 6 }).length

// ── ix: the lookup index ─────────────────────────────────────────────────────────────────────────
export type RowMap = Map<string, IxRow>
const row = (m: RowMap, k: string) => { let r = m.get(k); if (!r) m.set(k, r = {}); return r }

export function buildRows(cards: CoreCard[], lexindex?: LexIndex, ci?: Parameters<typeof cardMap>[0]): RowMap {
  const m: RowMap = new Map(), tagIx = new Map<string, number>(), tags: string[] = []
  const tag = (t: string) => { let i = tagIx.get(t); if (i === undefined) { i = tags.length; tags.push(t); tagIx.set(t, i) } return i }
  const addHit = (form: string, lemma: string, via: 0 | 1 | 2 | 3) => {
    const k = key(form); if (!k) return
    const r = row(m, k), h = (r.h ??= []), cur = h.find(x => x[0] === lemma), hit = (via === 0 || form === k ? [lemma, via] : [lemma, via, form]) as IxHit   // decoder: form = h[2] ?? (via 0 ? lemma : key)
    if (!cur) h.push(hit); else if (via < cur[1]) { cur[1] = via; if (hit[2] === undefined) cur.length = 2; else cur[2] = hit[2] }
  }
  for (const c of cards) {
    addHit(c.lemma, c.lemma, 0)
    for (const f of c.forms) { addHit(f.raw, c.lemma, 1); addHit(f.norm, c.lemma, 1); addHit(f.modern, c.lemma, 3) }
    for (const p of c.paradigm) { addHit(p.form, c.lemma, 2); const k = key(p.form); if (k) (row(m, k).p ??= []).push([c.lemma, tag(p.tags)]) }
  }
  for (const [k, hs] of Object.entries(lexindex?.vesum ?? {})) row(m, k).v = hs.map(h => [h.lemma, tag(h.tags)] as [string, number])
  for (const [k, [file, sugg]] of Object.entries(lexindex?.lt ?? {})) row(m, k).l = [file === 'soft' ? 1 : 0, sugg]
  const lemmas = new Set(cards.map(c => c.lemma))   // a card of a lexicon lemma is the full card, not an «інша картка»
  if (ci) for (const [k, hs] of cardMap(ci)) { const cs = hs.filter(h => !lemmas.has(h.id) && !h.dict); if (cs.length) row(m, k).c = cs.map(h => [h.kind === 'ar' ? 1 : 0, h.id, h.form === h.id ? undefined : h.form] as [0 | 1, string, string?]) }
  ;(m as RowMap & { tags: string[] }).tags = tags
  return m
}

/** one shard from rows: the tag table is local (only the tags the rows use), so a shard is self-contained */
export function shardOf(rows: [string, IxRow][], allTags: string[]): IxShard {
  const loc = new Map<number, number>(), tags: string[] = []
  const re = (i: number) => { let j = loc.get(i); if (j === undefined) { j = tags.length; tags.push(allTags[i]!); loc.set(i, j) } return j }
  const o: Record<string, IxRow> = {}
  for (const [k, r] of rows.sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const n: IxRow = {}
    if (r.h) n.h = r.h
    if (r.p) n.p = r.p.map(([l, t]) => [l, re(t)])
    if (r.v) n.v = r.v.map(([l, t]) => [l, re(t)])
    if (r.l) n.l = r.l
    if (r.c) n.c = r.c.map(c => (c[2] === undefined ? [c[0], c[1]] : c) as [0 | 1, string, string?])
    o[k] = n
  }
  return { format: 1, tags, rows: o }
}

/** split by prefix until every shard is ≤ IX_GZ_MAX gzipped (or has too few keys / reached IX_MAX) */
export function planShards(rows: RowMap & { tags?: string[] }, gzMax = IX_GZ_MAX, mk?: (items: [string, IxRow][]) => unknown): Map<string, [string, IxRow][]> {
  const tags = rows.tags ?? [], leaves = new Map<string, [string, IxRow][]>()
  const go = (p: string, items: [string, IxRow][], n: number) => {
    if (n < IX_MAX && items.length >= IX_SPLIT_MIN_KEYS && gz(mk ? mk(items.slice()) : shardOf(items.slice(), tags)) > gzMax) {
      const by = new Map<string, [string, IxRow][]>()
      for (const it of items) { const q = ixPad(it[0], n + 1); (by.get(q) ?? (by.set(q, []), by.get(q)!)).push(it) }
      if (by.size > 1) { for (const [q, its] of by) go(q, its, n + 1); return }
    }
    leaves.set(p, items)
  }
  const top = new Map<string, [string, IxRow][]>()
  for (const it of rows) { const q = ixPad(it[0], IX_MIN); (top.get(q) ?? (top.set(q, []), top.get(q)!)).push(it) }
  for (const [p, its] of top) go(p, its, IX_MIN)
  return leaves
}

// ── dx: the dictionary-only cards (SPEC 63 DO-6) ─────────────────────────────────────────────────
/** key → a row whose `h[0][0]` is the card id; only the dictionary-only words of the card index (`ld`) */
export function buildDictRows(ci?: Parameters<typeof cardMap>[0]): RowMap {
  const m: RowMap = new Map()
  if (ci) for (const [k, hs] of cardMap(ci)) { const h = hs.find(x => x.dict); if (h && !hs.some(x => !x.dict)) m.set(k, { h: [[h.id, 0]] }) }   // a key that also has an attested / archaic card is served by ix/
  return m
}
/** one dx shard: key → '' (the id is the key) or the id */
export function dxShardOf(items: [string, IxRow][]): DxShard {
  const rows: Record<string, string> = {}
  for (const [k, r] of items.slice().sort((a, b) => (a[0] < b[0] ? -1 : 1))) rows[k] = r.h![0]![0] === k ? '' : r.h![0]![0]
  return { format: 1, rows }
}
function writeDx(rows: RowMap) {
  fresh('dx')
  const leaves = planShards(rows, IX_GZ_MAX, dxShardOf), man: IxManifest = { format: 1, leaves: [] }
  let bytes = 0, raw = 0, worst = 0
  for (const [p, items] of leaves) {
    const s = dxShardOf(items), t = JSON.stringify(s), g = gz(s)
    writeFileSync(`${STAGE()}/dx/${ixName(p)}.json`, t); bytes += g; raw += Buffer.byteLength(t); worst = Math.max(worst, g)
    man.leaves.push([p, items.length])
  }
  man.leaves.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  out('dx/index.json', man)
  console.log(`dx: ${rows.size} dictionary-only keys → ${leaves.size} shards, raw ${(raw / 1048576).toFixed(1)} MB, gz total ${(bytes / 1048576).toFixed(1)} MB, worst ${(worst / 1024).toFixed(1)} KB gz, manifest ${(gz(man) / 1024).toFixed(1)} KB gz`)
}

function writeIx(rows: RowMap & { tags?: string[] }) {
  fresh('ix')
  const leaves = planShards(rows), man: IxManifest = { format: 1, leaves: [] }
  let bytes = 0, worst = 0
  for (const [p, items] of leaves) {
    const s = shardOf(items, rows.tags ?? []), g = gz(s)
    writeFileSync(`${STAGE()}/ix/${ixName(p)}.json`, JSON.stringify(s)); bytes += g; worst = Math.max(worst, g)
    man.leaves.push([p, items.length])
  }
  man.leaves.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  out('ix/index.json', man)
  console.log(`ix: ${rows.size} keys → ${leaves.size} shards, gz total ${(bytes / 1048576).toFixed(1)} MB, worst ${(worst / 1024).toFixed(1)} KB (budget ${BUDGET.keystroke / 1024})`)
}

// ── cd: core cards by lemma bucket ───────────────────────────────────────────────────────────────
function writeCd(cards: CoreCard[]) {
  fresh('cd')
  const by = new Map<number, CoreCard[]>()
  for (const c of cards) { const b = bucketOf(c.lemma); (by.get(b) ?? (by.set(b, []), by.get(b)!)).push(c) }
  let worst = 0
  for (const [b, cs] of by) { const p = packCore(cs); worst = Math.max(worst, gz(p)); out(`cd/${b}.json`, p) }
  console.log(`cd: ${cards.length} cards → ${by.size} shards, worst ${(worst / 1024).toFixed(1)} KB gz`)
}

// ── lm: per-lemma sidecars ───────────────────────────────────────────────────────────────────────
type Obj = Record<string, unknown>
function splitMap(name: LmName, src: Obj, bucketKey: (k: string) => string, pick: (shard: Obj) => Obj, put: (meta: Obj, part: Obj) => Obj) {
  const parts = Array.from({ length: LM_BUCKETS }, () => ({} as Obj)), map = pick(src)
  for (const [k, v] of Object.entries(map)) parts[lmBucket(bucketKey(k))]![k] = v
  const meta = Object.fromEntries(Object.entries(src).filter(([, v]) => v !== map))
  fresh(`lm/${name}`)
  let n = 0
  parts.forEach((p, b) => { if (Object.keys(p).length) { out(`lm/${name}/${b}.json`, put(meta, p)); n++ } })
  return n
}
function writeLm() {
  const log: string[] = []
  const E = rd<Obj>('etymology.json'); if (E) log.push(`etymology ${splitMap('etymology', E, k => k, s => s['entries'] as Obj, (m, p) => ({ ...m, entries: p }))}`)
  const RU = rd<Obj>('ruhead.json'); if (RU) log.push(`ru ${splitMap('ru', RU, k => k, s => s['entries'] as Obj, (m, p) => ({ ...m, entries: p }))}`)   // MM-36: Russian-headword index of the r2u ru→uk dictionaries
  const D = rd<Obj>('dim.json'); if (D) log.push(`dim ${splitMap('dim', D, k => k, s => s['entries'] as Obj, (m, p) => ({ ...m, entries: p }))}`)   // MM-23
  const C = rd<Obj>('cognates.json'); if (C) log.push(`cognates ${splitMap('cognates', C, k => k, s => s['entries'] as Obj, (m, p) => ({ ...m, entries: p }))}`)
  const S = rd<Obj>('senses.json'); if (S) {   // senses is a bare map lemma → Sense[]
    const parts = Array.from({ length: LM_BUCKETS }, () => ({} as Obj))
    for (const [k, v] of Object.entries(S)) parts[lmBucket(k)]![k] = v
    fresh('lm/senses'); let n = 0; parts.forEach((p, b) => { if (Object.keys(p).length) { out(`lm/senses/${b}.json`, p); n++ } }); log.push(`senses ${n}`)
  }
  {   // SPEC 63 SE-8: data/work/se.json (build stage `senses`, not committed) → lm/se/<bucket>.json, keyed by lk(word)
    const sp = process.env.SE_FILE ?? 'data/work/se.json'
    if (existsSync(sp)) {
      const SE = JSON.parse(readFileSync(sp, 'utf8')) as Obj, parts = new Map<number, Obj>()
      for (const [k, v] of Object.entries(SE)) { const b = seBucket(k); (parts.get(b) ?? parts.set(b, {}).get(b)!)[k] = v }
      fresh('lm/se'); let worst = 0
      for (const [b, p] of parts) { worst = Math.max(worst, gz(p)); out(`lm/se/${b}.json`, p) }
      log.push(`se ${parts.size} (worst ${(worst / 1024).toFixed(1)} KB gz)`)
    }
  }
  {   // SPEC 63 GG-18: data/work/xr.json (pipelines/build-xref.ts, not committed) -> lm/xr/<bucket>.json, keyed by lk(headword)
    const xp = process.env.XR_FILE ?? 'data/work/xr.json'
    if (existsSync(xp)) {
      const XR = JSON.parse(readFileSync(xp, 'utf8')) as Obj, parts = new Map<number, Obj>()
      for (const [k, v] of Object.entries(XR)) { const b = xrBucket(k); (parts.get(b) ?? parts.set(b, {}).get(b)!)[k] = v }
      fresh('lm/xr'); let worst = 0
      for (const [b, p] of parts) { worst = Math.max(worst, gz(p)); out(`lm/xr/${b}.json`, p) }
      log.push(`xr ${parts.size} (worst ${(worst / 1024).toFixed(1)} KB gz)`)
    }
  }
  for (const [name, env, bucket] of [['syn', 'SYN_FILE', synBucket], ['phr', 'PHR_FILE', phrBucket]] as const) {   // SPEC 63 GG-12 / GG-13: data/work/{syn,phr}.json (pipelines/build-synphr.ts, not committed) -> lm/{syn,phr}/<bucket>.json, keyed by lk(headword)
    const fp = process.env[env] ?? `data/work/${name}.json`
    if (existsSync(fp)) {
      const M = JSON.parse(readFileSync(fp, 'utf8')) as Obj, parts = new Map<number, Obj>()
      for (const [k, v] of Object.entries(M)) { const b = bucket(k); (parts.get(b) ?? parts.set(b, {}).get(b)!)[k] = v }
      fresh(`lm/${name}`); let worst = 0
      for (const [b, p] of parts) { worst = Math.max(worst, gz(p)); out(`lm/${name}/${b}.json`, p) }
      log.push(`${name} ${parts.size} (worst ${(worst / 1024).toFixed(1)} KB gz)`)
    }
  }
  const U = rd<Obj>('usage.json'); if (U) log.push(`usage ${splitMap('usage', U, k => k, s => s['lemmas'] as Obj, (m, p) => ({ ...m, lemmas: p }))}`)
  const L = rd<Obj>('loanlabels.json'); if (L) {
    const labels = L['labels'] as Obj, multi = (L['multi'] ?? {}) as Obj
    const parts = Array.from({ length: LM_BUCKETS }, () => ({ labels: {} as Obj, multi: {} as Obj }))
    for (const [k, v] of Object.entries(labels)) parts[lmBucket(k)]!.labels[k] = v
    for (const [k, v] of Object.entries(multi)) parts[lmBucket(k)]!.multi[k] = v
    const meta = Object.fromEntries(Object.entries(L).filter(([k]) => k !== 'labels' && k !== 'multi'))
    fresh('lm/loanlabels'); let n = 0; parts.forEach((p, b) => { if (Object.keys(p.labels).length) { out(`lm/loanlabels/${b}.json`, { ...meta, ...p }); n++ } }); log.push(`loanlabels ${n}`)
  }
  const H = rd<Obj>('heteronyms.json'); if (H) log.push(`heteronyms ${splitMap('heteronyms', H, k => k, s => s['forms'] as Obj, (m, p) => ({ ...m, forms: p }))}`)   // keys are already heteronymKey()s
  const P = rd<{ candidates: { lemmas: string[] }[] } & Obj>('phrases.json'); if (P) {
    const parts = Array.from({ length: LM_BUCKETS }, () => [] as unknown[][]), seen = Array.from({ length: LM_BUCKETS }, () => new Set<number>())
    P.candidates.forEach((c, i) => { for (const l of c.lemmas) { const b = lmBucket(l.replace(/^~/, '').toLowerCase()); if (!seen[b]!.has(i)) { seen[b]!.add(i); parts[b]!.push(c as unknown as unknown[]) } } })
    const meta = Object.fromEntries(Object.entries(P).filter(([k]) => !['candidates', 'formulas', 'frames', 'attested', 'attestedIds', 'dict'].includes(k)))
    fresh('lm/phrases'); let n = 0; parts.forEach((p, b) => { if (p.length) { out(`lm/phrases/${b}.json`, { ...meta, candidates: p }); n++ } }); log.push(`phrases ${n}`)
  }
  {   // SPEC 63 CP-9: data/work/thinpar/<bucket>.json (pipelines/build-thin-par.ts, not committed) → lm/par/<bucket>.json, the VESUM paradigm of the lemmas without a full card
    const files = thinParFiles('.')
    if (files.length) { fresh('lm/par'); let worst = 0; for (const f of files) { const j = JSON.parse(readFileSync(f, 'utf8')); worst = Math.max(worst, gz(j)); out(`lm/par/${basename(f)}`, j) }; log.push(`par ${files.length} (worst ${(worst / 1024).toFixed(1)} KB gz)`) }
  }
  console.log('lm: shards per sidecar —', log.join(', '))
}

// ── sum: precomputed summaries that need the whole lexicon (SPEC 63 PF-3) ─────────────────────────
type Ev = { source: string; quote: string; locator: string }
const isEv = (o: unknown): o is Ev => !!o && typeof o === 'object' && typeof (o as Ev).source === 'string' && typeof (o as Ev).quote === 'string' && 'locator' in (o as object)
function writeSum(cards: CoreCard[]) {
  // FD-5: forms on which a dialect rule (or every row of its feature) fired — what core/form-class.ts ruleForms() computes over all cards
  fresh('sum/ruleforms')
  const by = new Map<string, [string, string, number][]>(), put = (id: string, r: [string, string, number]) => { (by.get(id) ?? (by.set(id, []), by.get(id)!)).push(r) }
  for (const c of cards) for (const f of c.forms) {
    const ids = new Set<string>()
    for (const [code, cl] of Object.entries(f.claims)) {
      const method = (cl as { method?: string } | undefined)?.method
      if (!(code in DIALECTS) || !method) continue
      for (const id of method.split('+')) { ids.add(id); ids.add(featureOf(id)) }
    }
    for (const id of ids) put(id, [f.raw, c.lemma, c.stats.f])
  }
  for (const [id, rows] of by) out(`sum/ruleforms/${ixName(id)}.json`, rows.sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0], 'uk')))
  // SourceView: the quotes of each source found in lemma cards (≤ 200 per source, card order), with the lemma pages that hold them
  fresh('sum/sources')
  type Held = { ev: Ev; places: { label: string; to: string }[]; nPlaces: number }
  const held = new Map<string, Map<string, Held>>()
  for (const c of cards) {
    const seen = new WeakSet<object>(), here = new Map<string, Ev>()
    const walk = (o: unknown, d: number) => {
      if (!o || typeof o !== 'object' || d > 8 || seen.has(o)) return
      seen.add(o)
      if (isEv(o)) { here.set(`${o.source}|${o.locator}|${o.quote}`, o); return }
      for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v, d + 1)
    }
    walk(c, 0)
    for (const ev of here.values()) {
      let m = held.get(ev.source); if (!m) held.set(ev.source, m = new Map())
      const k = `${ev.locator}|${ev.quote}`; let h = m.get(k)
      if (!h) { if (m.size >= 200) continue; m.set(k, h = { ev, places: [], nPlaces: 0 }) }
      const to = `/w/${encodeURIComponent(c.lemma)}`
      if (!h.places.some(p => p.to === to)) { h.nPlaces++; if (h.places.length < 12) h.places.push({ label: c.lemma, to }) }
    }
  }
  for (const [id, m] of held) out(`sum/sources/${ixName(id)}.json`, [...m.values()])
  console.log(`sum: ${by.size} rule / feature form lists, ${held.size} source quote lists`)
}

// ── tc: TOROT names / ORV-only lemmas, light cards, archaic cards — one shard per card bucket ────
function writeTc() {
  fresh('tc')
  const split = <T>(kind: string, items: T[], keyOf: (x: T) => string, wrap: (part: T[], b: number) => unknown) => {
    const parts = Array.from({ length: TC_BUCKETS }, () => [] as T[])
    for (const x of items) parts[tcBucket(keyOf(x))]!.push(x)
    let n = 0, worst = 0
    parts.forEach((p, b) => { if (p.length) { const o = wrap(p, b); worst = Math.max(worst, gz(o)); out(`tc/${kind}/${b}.json`, o); n++ } })
    return `${kind} ${items.length} → ${n} (worst ${(worst / 1024).toFixed(1)} KB gz)`
  }
  const log: string[] = []
  const T = rd<{ names: { id: string }[]; orv: { id: string }[] }>('torot.json')
  if (T) { log.push(split('names', T.names, x => x.id, p => ({ names: p }))); log.push(split('orv', T.orv, x => x.id, p => ({ orv: p }))) }
  const L = rd<{ lemmas: [string, ...unknown[]][] }>('light.json')
  if (L) log.push(split('light', L.lemmas, x => key(x[0]), p => ({ lemmas: p })))
  const A = rd<{ entries: ArchEntry[] }>('archaic.json')
  if (A) {
    const alias = new Map<string, string>(), ids = new Set(A.entries.map(e => e.id))
    for (const e of A.entries) for (const k of [e.id, e.head, ...e.variants, ...e.forms.map(x => x.raw)]) { const a = archId(k); if (a && !ids.has(a) && !alias.has(a)) alias.set(a, e.id) }
    const parts = Array.from({ length: TC_BUCKETS }, () => ({ entries: [] as ArchEntry[], alias: {} as Record<string, string> }))
    for (const e of A.entries) parts[tcBucket(e.id)]!.entries.push(e)
    for (const [a, id] of alias) parts[tcBucket(a)]!.alias[a] = id
    let n = 0, worst = 0
    parts.forEach((p, b) => { if (p.entries.length || Object.keys(p.alias).length) { worst = Math.max(worst, gz(p)); out(`tc/arch/${b}.json`, p); n++ } })
    log.push(`arch ${A.entries.length} → ${n} (worst ${(worst / 1024).toFixed(1)} KB gz)`)
  }
  console.log('tc:', log.join(', '))
}

// ── wit / boot / pg ──────────────────────────────────────────────────────────────────────────────
/** SPEC 63 DO-5: the two coverage counters of boot.json — «з засвідченнями» (full cards + every other card a corpus text attests) and «лише словник» (cardindex `ld`) */
export const coverageCounts = (nFull: number, ci?: Parameters<typeof cardMap>[0]): { nAttested: number; nDictOnly: number } => ({ nAttested: nFull + (ci?.lw.length ?? 0) + (ci?.ar.length ?? 0), nDictOnly: ci?.ld?.length ?? 0 })
/** SPEC 63 CV-4: attested-only cards («засвідчене слово, немає в словниках») counted by data:unlinked (uv/meta.json); absent file = 0; data:unlinked re-patches boot.json (pipelines/boot-uv.ts) because it runs after this */
export const uvAttCount = (dir: string): { nUvAtt: number } => ({ nUvAtt: readUvAttested(dir) })
/** SPEC 63 GG-5: the vocab-only token total, apart from N (pipelines/vocab-n.ts reads the file headers); absent sources give 0 */
export const vocabCounts = (work: string): { nVocab: number; vocabSources: [string, number][]; vocabV: number } => { const v = vocabTotals(work); return { vocabV: VOCAB_V, nVocab: v.nVocab, vocabSources: v.sources.map(s => [s.source, s.tokens] as [string, number]) } }
function writeCorpusParts(corpus: CorpusMeta, cards: CoreCard[], ci?: Parameters<typeof cardMap>[0]) {
  fresh('wit')
  const parts = Array.from({ length: WIT_BUCKETS }, () => ({} as Record<string, unknown>))
  for (const w of corpus.witnesses) parts[witBucket(w.id)]![w.id] = w
  let worst = 0
  parts.forEach((p, b) => { if (Object.keys(p).length) { worst = Math.max(worst, gz(p)); out(`wit/${b}.json`, p) } })
  const boot: BootFile = {
    format: 1, generated: corpus.generated, N: corpus.N, linked: corpus.linked, unresolved: corpus.unresolved, nLemmas: cards.length, ...coverageCounts(cards.length, ci), ...uvAttCount(DATA), nWitnesses: corpus.witnesses.length, lemmaPage: LEMMA_PAGE,
    ...vocabCounts(process.env['PARTS_WORK'] ?? 'data/work'),
    epochSizes: corpus.epochSizes, centurySizes: corpus.centurySizes, rusynStatus: corpus.rusynStatus, regions: corpus.regions, authors: corpus.authors,
  }
  boot.nEntries = bootEntries(boot)
  out('boot.json', boot)
  console.log(`wit: ${corpus.witnesses.length} witnesses, worst shard ${(worst / 1024).toFixed(1)} KB gz; boot.json ${(gz(boot) / 1024).toFixed(1)} KB gz`)
  fresh('pg/lemmas')
  const pages = Math.ceil(cards.length / LEMMA_PAGE)
  for (let i = 0; i < pages; i++) out(`pg/lemmas/${i + 1}.json`, cards.slice(i * LEMMA_PAGE, (i + 1) * LEMMA_PAGE).map(c => c.lemma))
  console.log(`pg: ${pages} lemma pages`)
}

if (process.argv[1]?.endsWith('build-parts.ts')) {
  rmSync(STAGE(), { recursive: true, force: true })   // the stage of a crashed earlier run
  const core = rd<unknown>('lexicon.json'); if (!core) throw new Error(`${DATA}/lexicon.json missing (run build:data)`)
  const cards = unpackCore(core), corpus = rd<CorpusMeta>('corpus.json')!, lexindex = rd<LexIndex>('lexindex.json'), ci = rd<Parameters<typeof cardMap>[0]>('cardindex.json')
  writeCorpusParts(corpus, cards, ci)
  writeCd(cards)
  writeSum(cards)
  writeTc()
  writeIx(buildRows(cards, lexindex, ci))
  writeDx(buildDictRows(ci))
  writeLm()
  commitStage(DATA, fresh_, loose)
}
