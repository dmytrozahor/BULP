/**
 * BUILD step SPEC 63 CR-1: correspondence groups → data/work/corr.json (not committed), sharded by build-parts into lm/cg/<bucket>.json (lazy, never in the core cards; PF-2).
 *   `tsx pipelines/build-corr.ts` — env CORR_ROOT (a root that holds data/raw, data/work, public/data; default: the cwd), CORR_SAMPLE=1 writes the 50-pair spot-check samples per source.
 * Stages (each cached in data/work/corr-stage-*.json keyed by the input's size, written atomically, so a killed run resumes and a rerun is seconds — SPEC 63 RS-1):
 *   vesum    POS classes and the «not standard» flag of every VESUM lemma (the same-POS guard and the `norm` flag)
 *   kaikki   a projection of data/raw/kaikki/uk.jsonl: alternative forms, alt_of senses, synonyms, meaning counts
 *   ukwikt   the synonym rows of the uk.wiktionary dump (pipelines/build-synphr.ts stageUk)
 * Pairs come from core/corr-src.ts (families, owner, dialect dictionaries, xr, wiktionaries, the `data/work/corr-extra/*.json` hook for SE-14 / Чабаненко rows: {"rows": LexRow[]}), are assembled by
 * core/corr.ts `assemble`, and get their corpus numbers (first fixation, freq, corpus distribution) from public/data (lexicon.json, lex/<bucket>.json, corpus.json, light.json).
 * Every member passes core/evidence.ts claim() (checkGroup). Nothing is written when a source is missing: the group set is built from what exists, the log says which sources were absent.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { assemble, checkGroup, corpusArea, plain, type CorrFirst, type CorrGroup, type CorrMember, type CorrPair } from '../core/corr.ts'
import { hypothesisPairs, ownerTsvPairs } from '../core/corr-src.ts'
import { parseOwnerTsv, withoutRejected, type DvLink } from '../core/dialect-variants.ts'
import { dialectLexPairs, dialectLexRows, familyPairs, kaikkiIndexAdd, kaikkiPairs, ownerPairs, ukWiktPairs, xrPairs, KK_POS, type KkEntry, type KkIndex, type LexRow, type PosOf, type Rejects } from '../core/corr-src.ts'
import { vesumClass } from '../core/pos-gate.ts'
import { unpackCore } from '../core/pack.ts'
import { bucketOf } from '../core/shard.ts'
import type { SynRow } from '../core/synphr.ts'
import { readJson, writeJsonAtomic } from './robust.ts'
import { fileLines, scanVesum } from './vesum.ts'
import { regionOf, REGIONS } from './regions.ts'
import { dumpFile, stageUk } from './build-synphr.ts'

export interface CorrFile { format: 1; generated: string; groups: CorrGroup[]; stats: CorrStats }
export interface CorrStats {
  /** pairs that passed the guards, by source */ pairs: Record<string, number>; /** groups holding at least one member from the source */ groups: Record<string, number>
  rejects: Record<string, number>; assemble: unknown; absent: string[]; withFirst: number; withArea: number; members: number
}

const ROOT = resolve(process.env.CORR_ROOT ?? '.')
const raw = (p: string) => resolve(ROOT, 'data/raw', p), work = (p: string) => resolve(ROOT, 'data/work', p), pub = (p: string) => resolve(process.env.PARTS_DATA ?? resolve(ROOT, 'public/data'), p)
const sizeKey = (p: string) => `${statSync(p).size}`

// ── stage vesum ─────────────────────────────────────────────────────────────────────────────────
export interface PosInfo { cls: Set<string>; nonNorm: boolean }
const NONNORM = new Set(['arch', 'bad', 'subst', 'slang', 'vulg', 'obsc', 'alt', 'rare', 'dial'])
async function stageVesum(): Promise<Map<string, PosInfo> | undefined> {
  const f = raw('vesum/dict_corp_vis.txt'); if (!existsSync(f)) return undefined
  const cache = work('corr-stage-vesum.json')
  if (existsSync(cache)) { try { const c = readJson<{ bytes: string; rows: Record<string, [string, number]> }>(cache); if (c.bytes === sizeKey(f)) return new Map(Object.entries(c.rows).map(([k, [cl, nn]]) => [k, { cls: new Set(cl.split(',')), nonNorm: !!nn }])) } catch { /* torn: rebuilt */ } }
  const m = new Map<string, { cls: Set<string>; flagged: number; all: number }>()
  await scanVesum(fileLines(f), e => {
    if (!e.head || !e.lemma) return
    const k = plain(e.lemma), cls = vesumClass(e.lemmaTags); if (cls === 'other') return
    const r = m.get(k) ?? m.set(k, { cls: new Set(), flagged: 0, all: 0 }).get(k)!
    r.cls.add(cls); r.all++; if (e.lemmaTags.split(':').some(t => NONNORM.has(t))) r.flagged++
  })
  const rows: Record<string, [string, number]> = {}; for (const [k, r] of m) rows[k] = [[...r.cls].join(','), r.flagged === r.all ? 1 : 0]
  writeJsonAtomic(cache, JSON.stringify({ bytes: sizeKey(f), rows }))
  return new Map(Object.entries(rows).map(([k, [cl, nn]]) => [k, { cls: new Set(cl.split(',')), nonNorm: !!nn }]))
}

// ── stage kaikki ────────────────────────────────────────────────────────────────────────────────
interface KkStage { bytes: string; entries: KkEntry[]; senseCount: Record<string, number> }
async function stageKaikki(): Promise<KkStage | undefined> {
  const f = raw('kaikki/uk.jsonl'); if (!existsSync(f)) return undefined
  const cache = work('corr-stage-kaikki.json')
  if (existsSync(cache)) { try { const c = readJson<KkStage>(cache); if (c.bytes === sizeKey(f)) return c } catch { /* torn */ } }
  const ix: KkIndex = { senseCount: new Map(), syn: new Map() }, entries: KkEntry[] = []
  const rl = createInterface({ input: createReadStream(f, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line) continue
    let e: KkEntry & { lang_code?: string }; try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== 'uk' || !e.word || !KK_POS[e.pos]) continue
    kaikkiIndexAdd(ix, e)
    const keep = (e.forms ?? []).some(x => x.tags?.includes('alternative')) || (e.senses ?? []).some(s => s.alt_of || s.synonyms?.length)
    if (!keep) continue
    entries.push({ word: e.word, pos: e.pos, forms: (e.forms ?? []).filter(x => x.tags?.includes('alternative')).map(x => ({ form: x.form, tags: ['alternative'] })),
      senses: (e.senses ?? []).filter(s => s.alt_of || s.synonyms?.length).map(s => ({ glosses: (s.glosses ?? []).slice(0, 1), tags: s.tags, alt_of: s.alt_of, synonyms: s.synonyms?.map(y => ({ word: y.word })) })) })
  }
  // the meaning counts are needed for EVERY word (the target of a pair may have no relation of its own)
  const senseCount = Object.fromEntries(ix.senseCount)
  const st: KkStage = { bytes: sizeKey(f), entries, senseCount }
  writeJsonAtomic(cache, JSON.stringify(st))
  return st
}
// the sense-level synonym index needs every entry's synonyms, which `entries` carries (only entries with synonyms matter)
const kkIndexOf = (st: KkStage): KkIndex => {
  const ix: KkIndex = { senseCount: new Map(Object.entries(st.senseCount)), syn: new Map() }
  for (const e of st.entries) { const pos = KK_POS[e.pos]!, k = `${plain(e.word)}|${pos}`; const s = ix.syn.get(k) ?? ix.syn.set(k, new Set()).get(k)!; for (const se of e.senses ?? []) for (const y of se.synonyms ?? []) s.add(plain(y.word)) }
  return ix
}

// ── stage ukwikt ────────────────────────────────────────────────────────────────────────────────
async function stageUkwikt(): Promise<Record<string, SynRow[]> | undefined> {
  const dump = dumpFile(ROOT); if (!dump) return undefined
  const cache = work('corr-stage-ukwikt.json')
  if (existsSync(cache)) { try { const c = readJson<{ bytes: string; syn: Record<string, SynRow[]> }>(cache); if (c.bytes === sizeKey(dump)) return c.syn } catch { /* torn */ } }
  const st = await stageUk(dump), syn: Record<string, SynRow[]> = {}
  for (const [k, rows] of Object.entries(st.syn)) { const s = rows.filter(r => r.r === 's' && r.d === 'u'); if (s.length) syn[k] = s }
  writeJsonAtomic(cache, JSON.stringify({ bytes: sizeKey(dump), syn }))
  return syn
}

// ── corpus numbers ──────────────────────────────────────────────────────────────────────────────
interface Wit { id: string; date: [number, number]; witnessType: string; region?: string; title?: string; oq?: unknown }
export function corpusNumbers(members: string[]): Map<string, Partial<CorrMember>> {
  const out = new Map<string, Partial<CorrMember>>()
  const lexF = pub('lexicon.json'), corpF = pub('corpus.json')
  if (!existsSync(lexF) || !existsSync(corpF)) return out
  const cards = new Map(unpackCore(readJson(lexF)).map(c => [plain(c.lemma), c] as const))
  const wits = new Map((readJson<{ witnesses: Wit[] }>(corpF).witnesses).map(w => [w.id, w] as const))
  const regionName = new Map(REGIONS.map(r => [r.code, r.name] as const))
  const regionByW = new Map<string, string | undefined>()
  const regionOfW = (id: string): string | undefined => {
    if (!regionByW.has(id)) { const w = wits.get(id), c = w ? regionOf(w.region) : undefined; regionByW.set(id, c ? regionName.get(c) ?? w?.region : undefined) }
    return regionByW.get(id)
  }
  const light = existsSync(pub('light.json')) ? new Map((readJson<{ lemmas: [string, string, number][] }>(pub('light.json')).lemmas).map(r => [plain(r[0]), r[2]] as const)) : new Map<string, number>()
  const shards = new Map<number, { lemmas: string[]; details: { first?: { value: { witnessType?: string } }; forms: { raw: string; byW?: Record<string, number>; ocrOnly?: true }[] }[]; over?: Record<string, string[]> } | null>()
  const shardOf = (lemma: string) => {
    const b = bucketOf(lemma); if (!shards.has(b)) { const p = pub(`lex/${b}.json`); shards.set(b, existsSync(p) ? readJson(p) : null) }
    return shards.get(b)
  }
  const fmt = (w: Wit): CorrFirst => ({ year: w.date[0], ...(w.date[1] !== w.date[0] ? { to: w.date[1] } : {}), witness: w.id, href: `/witness/${encodeURIComponent(w.id)}`, kind: 'corpus', label: w.title })
  for (const form of members) {
    const k = plain(form), card = cards.get(k), r: Partial<CorrMember> = {}
    const lemma = card?.lemma
    if (card) r.freq = card.stats.f
    else if (light.has(k)) r.freq = light.get(k)
    if (lemma) {
      const sh = shardOf(lemma), i = sh ? sh.lemmas.indexOf(lemma) : -1
      if (sh && i >= 0) {
        const by: Record<string, number> = {}
        for (const f of sh.details[i]!.forms) if (!f.ocrOnly) for (const [w, n] of Object.entries(f.byW ?? {})) by[w] = (by[w] ?? 0) + n
        let best: Wit | undefined, ocr: number | undefined
        const real: Record<string, number> = {}
        for (const [id, n] of Object.entries(by)) {
          const w = wits.get(id); if (!w || w.witnessType === 'dictionary') continue
          if (w.oq) { if (ocr === undefined || w.date[0] < ocr) ocr = w.date[0]; continue }
          real[id] = n
          if (!best || w.date[0] < best.date[0]) best = w
        }
        if (best) r.first = fmt(best)
        if (ocr !== undefined && (!best || ocr < best.date[0])) r.ocrEarlier = ocr
        const a = corpusArea(real, regionOfW); if (a) r.areas = [a]
      }
      const d = card!.first.value as { witness?: string; date?: [number, number] } | string
      if (typeof d === 'object' && d.witness) { const w = wits.get(d.witness); if (w?.witnessType === 'dictionary') r.firstDict = { ...fmt(w), kind: 'dict' } }
    }
    if (Object.keys(r).length) out.set(k, r)
  }
  return out
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────
export async function buildCorr(): Promise<CorrFile> {
  const absent: string[] = [], rej: Rejects = {}
  const vesum = await stageVesum(); if (!vesum) absent.push('vesum')
  const posOf: PosOf = w => vesum?.get(plain(w))?.cls
  const kkStage = await stageKaikki(); if (!kkStage) absent.push('kaikki')
  const syn = await stageUkwikt(); if (!syn) absent.push('ukwikt')
  const xrPath = work('xr.json'), xr = existsSync(xrPath) ? readJson<Record<string, never[]>>(xrPath) : undefined; if (!xr) absent.push('xr (GG-18 worker output)')
  const senseN = kkStage ? (w: string, pos: string) => kkStage.senseCount[`${plain(w)}|${pos}`] : undefined
  const pairs: CorrPair[] = [...familyPairs(), ...ownerPairs()]
  if (vesum) {
    pairs.push(...dialectLexPairs(dialectLexRows(), posOf, rej, 'dialect-lex', senseN))
    // DV-1: owner-confirmed variants (kind P), then the hypotheses of the shipped correspondences minus the lines the owner rejected
    const ownF = resolve(ROOT, 'data/owner/variants-confirmed.tsv'), rejF = resolve(ROOT, 'data/owner/variants-rejected.tsv'), hypF = resolve(ROOT, 'data/dv/hypotheses.json')
    const rejected = existsSync(rejF) ? parseOwnerTsv(readFileSync(rejF, 'utf8')) : []
    if (existsSync(ownF)) pairs.push(...ownerTsvPairs(withoutRejected(parseOwnerTsv(readFileSync(ownF, 'utf8')), rejected), posOf, rej))
    if (existsSync(hypF)) pairs.push(...hypothesisPairs(withoutRejected(readJson<{ rows: DvLink[] }>(hypF).rows, rejected), posOf, rej))
    const placeF = resolve(ROOT, 'data/dv/placeonly.json')
    if (existsSync(placeF)) pairs.push(...dialectLexPairs(readJson<{ rows: LexRow[] }>(placeF).rows, posOf, rej, 'dialect-place', senseN))
    if (xr) pairs.push(...xrPairs(xr, posOf, rej, senseN))
    if (kkStage) { const ix = kkIndexOf(kkStage); for (const e of kkStage.entries) pairs.push(...kaikkiPairs(e, ix, posOf, rej)) }
    if (syn) pairs.push(...ukWiktPairs(syn, posOf, rej))
    const ed = work('corr-extra')
    if (existsSync(ed)) for (const f of readdirSync(ed).filter(x => x.endsWith('.json')).sort()) { try { pairs.push(...dialectLexPairs(readJson<{ rows: LexRow[] }>(resolve(ed, f)).rows, posOf, rej, 'extra', senseN)) } catch { rej[`extra: ${f} unreadable`] = 1 } }
  }
  // one pair once per source (kaikki lists both directions)
  const seen = new Set<string>(), uniq = pairs.filter(p => { const k = `${p.src}|${p.pos}|${[plain(p.a), plain(p.b)].sort().join('|')}|${p.sense}`; if (seen.has(k)) return false; seen.add(k); return true })
  const { groups, stats: ast } = assemble(uniq)
  // norm = the VESUM lemma that carries no non-standard flag (a family head / owner head stays norm)
  for (const g of groups) for (const m of g.members) if (!m.norm) { const v = vesum?.get(plain(m.form)); if (v && !v.nonNorm) m.norm = true }
  // a member a dictionary or the owner puts in a dialect is not the standard one, whatever VESUM lists
  for (const g of groups) for (const m of g.members) if (m.norm && m.areas.some(a => a.grade !== 'corpus') && !m.src.includes('family')) m.norm = false
  for (const g of groups) g.members.sort((x, y) => +y.norm - +x.norm || (plain(x.form) < plain(y.form) ? -1 : 1))
  const nums = corpusNumbers([...new Set(groups.flatMap(g => g.members.map(m => m.form)))])
  let withFirst = 0, withArea = 0
  for (const g of groups) for (const m of g.members) {
    const n = nums.get(plain(m.form)); if (n) { const { areas, ...rest } = n; Object.assign(m, rest); if (areas) m.areas = [...m.areas, ...areas] }
    if (m.first) withFirst++; if (m.areas.length) withArea++
    m.areas.sort((a, b) => ({ dict: 0, owner: 1, corpus: 2, hyp: 3 })[a.grade] - ({ dict: 0, owner: 1, corpus: 2, hyp: 3 })[b.grade])
  }
  for (const g of groups) checkGroup(g)
  const bySrc: Record<string, number> = {}, grp: Record<string, number> = {}
  for (const p of uniq) bySrc[p.src] = (bySrc[p.src] ?? 0) + 1
  for (const g of groups) for (const s of new Set(g.members.flatMap(m => m.src))) grp[s] = (grp[s] ?? 0) + 1
  const out: CorrFile = { format: 1, generated: new Date().toISOString(), groups, stats: { pairs: bySrc, groups: grp, rejects: rej, assemble: ast, absent, withFirst, withArea, members: ast.members } }
  if (process.env.CORR_SAMPLE) sample(uniq)
  return out
}
/** CORR_SAMPLE: 50 random pairs per source for the owner-visible spot-check (seeded, reproducible) */
function sample(pairs: CorrPair[]) {
  let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
  const bySrc = new Map<string, CorrPair[]>(); for (const p of pairs) (bySrc.get(p.src) ?? bySrc.set(p.src, []).get(p.src)!).push(p)
  mkdirSync(work('.'), { recursive: true })
  for (const [src, ps] of bySrc) {
    const a = [...ps]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] }
    writeJsonAtomic(work(`corr-sample-${src}.json`), JSON.stringify(a.slice(0, 50).map(p => ({ a: p.a, b: p.b, pos: p.pos, rel: p.rel, sense: p.sense, q: p.ev.quote, loc: p.ev.locator })), null, 1))
  }
}

if (process.argv[1]?.endsWith('build-corr.ts')) {
  const t0 = Date.now()
  buildCorr().then(f => {
    writeJsonAtomic(work('corr.json'), JSON.stringify(f))
    console.log(`corr: ${f.groups.length} groups, ${f.stats.members} members (${f.stats.withFirst} with a first fixation, ${f.stats.withArea} with an area) in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    console.log('pairs by source:', JSON.stringify(f.stats.pairs), '\ngroups by source:', JSON.stringify(f.stats.groups), '\nassemble:', JSON.stringify(f.stats.assemble), '\nabsent:', f.stats.absent.join(', ') || '-')
    console.log('rejects:', JSON.stringify(f.stats.rejects))
  }).catch(e => { console.error(e); process.exit(1) })
}
