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
import { PROV_VERSION, loadProverbInputs, stageProverbs, type ProvStats } from './build-proverbs.ts'

export type Rows<T> = Record<string, T[]>
export interface Stage { v: 1; src: string; bytes: number; pages: number; syn: Rows<SynRow>; phr: Rows<PhrRow>; /** GG-19: counts of the proverb stage */ prov?: ProvStats }
const CAP_SYN = 80, CAP_PHR = 60
/** GG-19: printed-collection proverbs kept per headword (the cards are lazy and the shard budget is checked by tests/budget.test.ts); the cap drops the longest texts first, own-headword rows are kept first */
export const CAP_PROV = 15

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
  inputs: { karavansky?: { bytes: number; pages: number }; ukwikt?: { bytes: number; pages: number }; kaikki?: { bytes: number; pages: number }; proverbs?: { bytes: number; pages: number } }
  synHeads: number; synPairs: number; synByRel: Record<string, number>; synByEd: Record<string, number>; synLinked: number; synUnlinked: number; groups: number
  /** SE-17: synonym components WITHOUT the Караванський links (the unit is a connected component of the s-relation over headwords and targets, as `groups`), and the links themselves (rows, d = k) */ groupsOpen?: number; karLinks?: number
  phrHeads: number; phrRows: number; phrByKind: Record<string, number>; phrDistinct: number
  /** GG-19: the proverb collections (Номис, Франко): rows after the per-headword cap, headwords, headwords that had NO Wiktionary phraseology row before, and the stage's own counts */
  prov?: { rows: number; heads: number; newHeads: number; withWikt: number; capped: number; stage: ProvStats }
}
/** merge both stages, mark unlinked targets, cap per headword, write the two work files */
export function combine(stages: Stage[], known: (key: string) => boolean): { syn: Rows<SynRow>; phr: Rows<PhrRow>; stats: SynPhrStats } {
  const syn: Rows<SynRow> = {}, phr: Rows<PhrRow> = {}
  for (const st of stages) {
    for (const [k, l] of Object.entries(st.syn)) for (const r of l) add(syn, k, r, sameSyn)
    for (const [k, l] of Object.entries(st.phr)) for (const r of l) add(phr, k, r, samePhr)
  }
  const stats: SynPhrStats = { inputs: {}, synHeads: 0, synPairs: 0, synByRel: {}, synByEd: {}, synLinked: 0, synUnlinked: 0, groups: 0, phrHeads: 0, phrRows: 0, phrByKind: {}, phrDistinct: 0 }
  for (const st of stages) stats.inputs[st.src as 'ukwikt' | 'kaikki' | 'proverbs' | 'karavansky'] = { bytes: st.bytes, pages: st.pages }
  // union-find over synonym pairs (measurement only: «groups» = connected components of the s-relation)
  const parent = new Map<string, string>(), parentOpen = new Map<string, string>()
  const findIn = (m: Map<string, string>, x: string): string => { let r = x; while (m.get(r) !== undefined && m.get(r) !== r) r = m.get(r)!; m.set(x, r); return r }
  const find = (x: string): string => { let r = x; while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r }
  for (const k of Object.keys(syn).sort()) {
    const l = syn[k]!
    for (const r of l) { if (!r.t.includes(' ') && known(lk(r.t))) delete r.u; else r.u = 1 }
    // order: the sense order of the source (uk items 1..n), then en rows; stable
    const edRank = { u: 0, e: 1, k: 2 }
    l.sort((a, b) => (a.d === b.d ? (a.n ?? 99) - (b.n ?? 99) : edRank[a.d] - edRank[b.d]))
    syn[k] = l.slice(0, CAP_SYN)
    stats.synHeads++
    for (const r of syn[k]!) {
      stats.synPairs++; stats.synByRel[r.r] = (stats.synByRel[r.r] ?? 0) + 1; stats.synByEd[r.d] = (stats.synByEd[r.d] ?? 0) + 1; r.u ? stats.synUnlinked++ : stats.synLinked++
      if (r.r === 's') { const a = find(k), b = find(lk(r.t)); if (a !== b) parent.set(a, b); if (r.d !== 'k') { const a2 = findIn(parentOpen, k), b2 = findIn(parentOpen, lk(r.t)); if (a2 !== b2) parentOpen.set(a2, b2) } }
    }
  }
  const comps = new Set<string>(); for (const x of parent.keys()) comps.add(find(x)); stats.groups = comps.size
  const compsOpen = new Set<string>(); for (const x of parentOpen.keys()) compsOpen.add(findIn(parentOpen, x)); stats.groupsOpen = compsOpen.size; stats.karLinks = stats.synByEd.k ?? 0
  const distinct = new Set<string>(), prov = { rows: 0, heads: 0, newHeads: 0, withWikt: 0, capped: 0 }
  for (const k of Object.keys(phr).sort()) {
    const isProv = (r: PhrRow) => r.d === 'n' || r.d === 'f'
    const wk = phr[k]!.filter(r => !isProv(r)).sort((a, b) => (a.x ?? 0) - (b.x ?? 0) || a.k.localeCompare(b.k) || a.p.localeCompare(b.p, 'uk')).slice(0, CAP_PHR)
    const pr = phr[k]!.filter(isProv).sort((a, b) => (a.x ?? 0) - (b.x ?? 0) || a.p.length - b.p.length || a.p.localeCompare(b.p, 'uk'))
    prov.capped += Math.max(0, pr.length - CAP_PROV)
    const pk = pr.slice(0, CAP_PROV)
    phr[k] = [...wk, ...pk]
    stats.phrHeads++
    if (pk.length) { prov.heads++; prov.rows += pk.length; wk.length ? prov.withWikt++ : prov.newHeads++ }
    for (const r of phr[k]!) { stats.phrRows++; const kk = (isProv(r) ? r.d + '-' : '') + r.k + (r.x ? 'x' : ''); stats.phrByKind[kk] = (stats.phrByKind[kk] ?? 0) + 1; if (!r.x && !isProv(r)) distinct.add(lk(r.p)) }
  }
  stats.prov = { ...prov, stage: stages.find(st => st.prov)?.prov ?? ({} as ProvStats) }
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
  // SE-17: Караванський (©), option b of the owner: word-to-word links only (pipelines/se17-scan.ts → data/work/karavansky-links.json); absent file or publish=false → nothing
  const kl = resolve(work, 'data/work/karavansky-links.json')
  if (existsSync(kl) && process.env.KARAVANSKY_PUBLISH !== '0') {
    const j = readJson<{ publish: boolean; links: { h: string; t: string; page: string }[] }>(kl)
    if (j.publish && j.links.length) { const syn: Rows<SynRow> = {}; for (const x of j.links) add(syn, lk(x.h), { t: x.t, r: 's', d: 'k', l: x.page }, sameSyn); stages.push({ v: 1, src: 'karavansky', bytes: statSync(kl).size, pages: j.links.length, syn, phr: {} }) }
  }
  const hd = process.env.HARVEST_DIR ?? resolve(raw, 'data/raw/harvest'), vesum = resolve(raw, 'data/raw/vesum/dict_corp_vis.txt')   // GG-19: proverb collections (harvest/proverbs.ts), lemma links from VESUM
  const pv = loadProverbInputs(hd)
  if (pv.inputs.length && existsSync(vesum)) {
    const c = resolve(work, 'data/work/synphr-proverbs.json'), bytes = pv.bytes * 10 + PROV_VERSION; let s = cached(c, bytes)
    if (!s) { const r = await stageProverbs(pv.inputs, vesum); s = { v: 1, src: 'proverbs', bytes, pages: Object.values(r.stats.candidates).reduce((a, b) => a + b, 0), syn: {}, phr: r.phr, prov: r.stats }; writeJsonAtomic(c, JSON.stringify(s)) }
    stages.push(s)
  }
  const { syn, phr, stats } = combine(stages, known)
  writeJsonAtomic(resolve(work, 'data/work/syn.json'), JSON.stringify(syn))
  writeJsonAtomic(resolve(work, 'data/work/phr.json'), JSON.stringify(phr))
  writeJsonAtomic(resolve(work, 'data/work/synphr-stats.json'), JSON.stringify(stats, null, 1))
  return stats
}
