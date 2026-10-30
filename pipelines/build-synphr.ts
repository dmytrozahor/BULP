/**
 * BUILD step SPEC 63 GG-12 / GG-13: synonyms, antonyms, hypernyms, hyponyms, coordinate terms and phraseology of OPEN sources → data/work/syn.json and data/work/phr.json
 * ({ lk(headword): rows }, not committed; sharded by build-parts into lm/syn/<b>.json and lm/phr/<b>.json).
 * Sources (both CC BY-SA 4.0, attribution on the card; no scraping, no copyrighted dictionary):
 *  - uk.wiktionary: the official dump https://dumps.wikimedia.org/ukwiktionary/latest/ukwiktionary-latest-pages-articles.xml.bz2 (data/raw/ukwikt-dump/, md5 checked against the dump's md5sums.txt),
 *    read by `bzip2 -dc` as a stream;
 *  - en.wiktionary: the pinned kaikki.org Ukrainian dump data/raw/kaikki/uk.jsonl (SOURCES.txt there).
 * Crash tolerance (SPEC 63 RS-1): each source is parsed once into a stage cache (data/work/synphr-<src>.json, atomic write, keyed by the input's size); a rerun reuses a complete cache and a
 * killed run leaves none half-written; the final files are rebuilt from the caches in seconds and written atomically.
 * A target is `u` (unlinked) when it is neither a VESUM lemma nor a card of ours. Nothing is inferred: a relation on the target's page is not mirrored onto the head.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { lk } from '../core/cv.ts'
import { kaikkiPhrase, kaikkiRelRows, parseUkPage, type KkEntry, type PhrRow, type SynRow } from '../core/synphr.ts'
import { readJson, writeJsonAtomic } from './robust.ts'

export type Rows<T> = Record<string, T[]>
export interface Stage { v: 1; src: string; bytes: number; pages: number; syn: Rows<SynRow>; phr: Rows<PhrRow> }
const CAP_SYN = 80, CAP_PHR = 60

const add = <T>(m: Rows<T>, k: string, row: T, same: (a: T, b: T) => boolean) => { const l = (m[k] ??= []); if (!l.some(x => same(x, row))) l.push(row) }
const sameSyn = (a: SynRow, b: SynRow) => a.t === b.t && a.r === b.r && a.d === b.d && a.n === b.n && a.g === b.g
const samePhr = (a: PhrRow, b: PhrRow) => a.p === b.p && a.k === b.k && a.d === b.d && a.x === b.x

const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
export interface XmlRecord { title: string; ns: string; redirect: boolean; text: string; rev?: number; ts?: string }
/** every page of a MediaWiki XML dump stream (all namespaces, redirects flagged) with the id and timestamp of its revision (GG-11 needs the revision; the templates live in ns 10) */
export async function* xmlRecords(input: NodeJS.ReadableStream): AsyncGenerator<XmlRecord> {
  const rl = createInterface({ input, crlfDelay: Infinity })
  let title = '', ns = '', redirect = false, buf: string[] | undefined, rev: number | undefined, ts: string | undefined, inRev = false
  for await (const line of rl) {
    if (buf) {
      const e = line.indexOf('</text>')
      if (e >= 0) { buf.push(line.slice(0, e)); if (title) yield { title, ns, redirect, text: unxml(buf.join('\n')), rev, ts }; buf = undefined } else buf.push(line)
      continue
    }
    let m: RegExpExecArray | null
    if (line.includes('<page>')) { title = ''; ns = ''; redirect = false; rev = undefined; ts = undefined; inRev = false } else if (line.includes('<revision>')) inRev = true
    else if (!inRev && (m = /<title>(.*)<\/title>/.exec(line))) title = unxml(m[1]!)
    else if (!inRev && (m = /<ns>(\d+)<\/ns>/.exec(line))) ns = m[1]!
    else if (line.includes('<redirect')) redirect = true
    else if (inRev && rev === undefined && (m = /^\s*<id>(\d+)<\/id>/.exec(line))) rev = +m[1]!
    else if (inRev && (m = /<timestamp>([^<]*)<\/timestamp>/.exec(line))) ts = m[1]!
    else if ((m = /<text\b[^>]*>(.*)$/.exec(line))) {
      const rest = m[1]!, e = rest.indexOf('</text>')
      if (e >= 0) { if (title) yield { title, ns, redirect, text: unxml(rest.slice(0, e)), rev, ts } } else buf = [rest]
    }
  }
}
/** pages of the main namespace (not redirects) of a MediaWiki XML dump stream: [title, wikitext] */
export async function* xmlPages(input: NodeJS.ReadableStream): AsyncGenerator<[string, string]> {
  for await (const r of xmlRecords(input)) if (r.ns === '0' && !r.redirect) yield [r.title, r.text]
}

export function dumpFile(raw: string): string | undefined {
  const d = resolve(raw, 'data/raw/ukwikt-dump'); if (!existsSync(d)) return undefined
  return readdirSync(d).filter(f => /pages-articles\.xml(\.bz2)?$/.test(f)).sort().map(f => resolve(d, f))[0]
}

/** stage 1: uk.wiktionary dump → rows */
export async function stageUk(file: string): Promise<Stage> {
  const syn: Rows<SynRow> = {}, phr: Rows<PhrRow> = {}; let pages = 0
  const child = file.endsWith('.bz2') ? spawn('bzip2', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] }) : undefined
  const input = child ? child.stdout : createReadStream(file, { encoding: 'utf8' })
  for await (const [title, text] of xmlPages(input)) {
    if (!/Синоніми|Антоніми|Гіпероніми|Гіпоніми|фразеологізми|Прислів/.test(text)) continue
    pages++
    const r = parseUkPage(title, text), k = lk(title)
    for (const s of r.syn) add(syn, k, s, sameSyn)
    for (const p of r.phr) add(phr, k, p, samePhr)
  }
  if (child) await new Promise<void>((res, rej) => child.on('close', c => (c === 0 || c === null ? res() : rej(new Error(`bzip2 exited ${c}`)))))
  return { v: 1, src: 'ukwikt', bytes: statSync(file).size, pages, syn, phr }
}
/** stage 2: kaikki Ukrainian dump → rows */
export async function stageKaikki(file: string): Promise<Stage> {
  const syn: Rows<SynRow> = {}, phr: Rows<PhrRow> = {}; let pages = 0
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line) continue
    let e: KkEntry; try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== 'uk' || !e.word) continue
    pages++
    const k = lk(e.word)
    for (const s of kaikkiRelRows(e)) add(syn, k, s, sameSyn)
    const ph = kaikkiPhrase(e)
    if (ph) { add(phr, lk(e.word), ph.row, samePhr); for (const w of ph.keys) if (w !== k) add(phr, w, { ...ph.row, x: 1 }, samePhr) }
  }
  return { v: 1, src: 'kaikki', bytes: statSync(file).size, pages, syn, phr }
}

/** a stage cache is reused only when complete and made from an input of the same size */
function cached(path: string, bytes: number): Stage | undefined {
  if (!existsSync(path)) return undefined
  try { const s = readJson<Stage>(path); return s.v === 1 && s.bytes === bytes ? s : undefined } catch { return undefined }
}

export interface SynPhrStats {
  inputs: { ukwikt?: { bytes: number; pages: number }; kaikki?: { bytes: number; pages: number } }
  synHeads: number; synPairs: number; synByRel: Record<string, number>; synByEd: Record<string, number>; synLinked: number; synUnlinked: number; groups: number
  phrHeads: number; phrRows: number; phrByKind: Record<string, number>; phrDistinct: number
}
/** merge both stages, mark unlinked targets, cap per headword, write the two work files */
export function combine(stages: Stage[], known: (key: string) => boolean): { syn: Rows<SynRow>; phr: Rows<PhrRow>; stats: SynPhrStats } {
  const syn: Rows<SynRow> = {}, phr: Rows<PhrRow> = {}
  for (const st of stages) {
    for (const [k, l] of Object.entries(st.syn)) for (const r of l) add(syn, k, r, sameSyn)
    for (const [k, l] of Object.entries(st.phr)) for (const r of l) add(phr, k, r, samePhr)
  }
  const stats: SynPhrStats = { inputs: {}, synHeads: 0, synPairs: 0, synByRel: {}, synByEd: {}, synLinked: 0, synUnlinked: 0, groups: 0, phrHeads: 0, phrRows: 0, phrByKind: {}, phrDistinct: 0 }
  for (const st of stages) stats.inputs[st.src as 'ukwikt' | 'kaikki'] = { bytes: st.bytes, pages: st.pages }
  // union-find over synonym pairs (measurement only: «groups» = connected components of the s-relation)
  const parent = new Map<string, string>()
  const find = (x: string): string => { let r = x; while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r }
  for (const k of Object.keys(syn).sort()) {
    const l = syn[k]!
    for (const r of l) { if (!r.t.includes(' ') && known(lk(r.t))) delete r.u; else r.u = 1 }
    // order: the sense order of the source (uk items 1..n), then en rows; stable
    l.sort((a, b) => (a.d === b.d ? (a.n ?? 99) - (b.n ?? 99) : a.d === 'u' ? -1 : 1))
    syn[k] = l.slice(0, CAP_SYN)
    stats.synHeads++
    for (const r of syn[k]!) {
      stats.synPairs++; stats.synByRel[r.r] = (stats.synByRel[r.r] ?? 0) + 1; stats.synByEd[r.d] = (stats.synByEd[r.d] ?? 0) + 1; r.u ? stats.synUnlinked++ : stats.synLinked++
      if (r.r === 's') { const a = find(k), b = find(lk(r.t)); if (a !== b) parent.set(a, b) }
    }
  }
  const comps = new Set<string>(); for (const x of parent.keys()) comps.add(find(x)); stats.groups = comps.size
  const distinct = new Set<string>()
  for (const k of Object.keys(phr).sort()) {
    phr[k] = phr[k]!.sort((a, b) => (a.x ?? 0) - (b.x ?? 0) || a.k.localeCompare(b.k) || a.p.localeCompare(b.p, 'uk')).slice(0, CAP_PHR)
    stats.phrHeads++
    for (const r of phr[k]!) { stats.phrRows++; stats.phrByKind[r.k + (r.x ? 'x' : '')] = (stats.phrByKind[r.k + (r.x ? 'x' : '')] ?? 0) + 1; if (!r.x) distinct.add(lk(r.p)) }
  }
  stats.phrDistinct = distinct.size
  return { syn, phr, stats }
}

/** the whole step; `raw` = root of data/raw (inputs), `work` = root of data/work (stage caches + outputs) */
export async function writeSynPhr(raw: string, work: string, known: (key: string) => boolean): Promise<SynPhrStats> {
  mkdirSync(resolve(work, 'data/work'), { recursive: true })
  const stages: Stage[] = []
  const dump = dumpFile(raw), kk = resolve(raw, 'data/raw/kaikki/uk.jsonl')
  if (dump) {
    const c = resolve(work, 'data/work/synphr-ukwikt.json'); let s = cached(c, statSync(dump).size)
    if (!s) { s = await stageUk(dump); writeJsonAtomic(c, JSON.stringify(s)) }
    stages.push(s)
  }
  if (existsSync(kk)) {
    const c = resolve(work, 'data/work/synphr-kaikki.json'); let s = cached(c, statSync(kk).size)
    if (!s) { s = await stageKaikki(kk); writeJsonAtomic(c, JSON.stringify(s)) }
    stages.push(s)
  }
  const { syn, phr, stats } = combine(stages, known)
  writeJsonAtomic(resolve(work, 'data/work/syn.json'), JSON.stringify(syn))
  writeJsonAtomic(resolve(work, 'data/work/phr.json'), JSON.stringify(phr))
  writeJsonAtomic(resolve(work, 'data/work/synphr-stats.json'), JSON.stringify(stats, null, 1))
  return stats
}
