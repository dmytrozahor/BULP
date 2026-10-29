/**
 * SPEC 63 GG-9 — measurable data quality against goroh.pp.ua: counts of our own features and the fixed 50-lemma sample (analysis/goroh-quality.md).
 * Reads (nothing is written except analysis/goroh-quality.json):
 *   - the committed public/data/*.json (lexicon.json, cardindex.json, light/archaic, phrases) = the generation of the live build 202610222130-861b7ef;
 *   - the live build's sidecars lm/{se,lb,etymology,cognates,senses,usage,loanlabels,heteronyms,dim,ru} and a few lex/ shards, from the CDN named in src/data/data-version.json
 *     (cached under data/work/gq-cache, resumable: a cached shard is not fetched again).
 * Usage: npx tsx pipelines/goroh-quality.ts [--sample-only]
 * The sample is reproducible: mulberry32(SEED) over the frequency list (see sampleLemmas).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { unpackCore } from '../core/pack.ts'
import { bucketOf } from '../core/shard.ts'
import { lk } from '../core/cv.ts'
import { lmBucket, seBucket } from '../core/parts.ts'
import { toIpa } from '../core/ipa.ts'
import { timeline } from '../core/se.ts'
import { ruOfDict } from '../core/ru-source.ts'

const SEED = 63, N_RANDOM = 40, N_DIALECT = 5, N_HIST = 5, F_MIN = 50
const DATA = 'public/data', CACHE = 'data/work/gq-cache'
const ptr = JSON.parse(readFileSync('src/data/data-version.json', 'utf8')) as { base: string; buildId: string }
const BASE = `${ptr.base}/data/${ptr.buildId}`
mkdirSync(CACHE, { recursive: true })

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const rd = (f: string) => JSON.parse(readFileSync(join(DATA, f), 'utf8'))

/** a CDN shard, cached; a missing object (403/404) is cached as {} (the build has no such shard) */
async function shard(path: string): Promise<any> {
  const f = join(CACHE, path.replace(/\//g, '_'))
  if (!existsSync(f)) {
    let txt = '{}'
    for (let t = 0; ; t++) {
      try { const r = await fetch(`${BASE}/${path}`); if (r.status === 404 || r.status === 403) break; if (!r.ok) throw new Error(String(r.status)); txt = await r.text(); break } catch (e) { if (t >= 2) throw e }
    }
    writeFileSync(f + '.tmp', txt); renameSync(f + '.tmp', f)
  }
  return JSON.parse(readFileSync(f, 'utf8'))
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { for (;;) { const x = items[i++]; if (x === undefined) return; await fn(x) } })) }

const core = unpackCore(rd('lexicon.json'))
const cardIndex = rd('cardindex.json') as { lw: string[]; ar: string[]; lf: string[]; ld: string[] }
const archaic = rd('archaic.json').entries as Record<string, any>
const light = rd('light.json').lemmas as Record<string, unknown>

// ── the sample ────────────────────────────────────────────────────────────────────────────────────
const plain = (w: string) => /^[а-щьюяєіїґ'’-]+$/.test(w) && w.length >= 3
const byF = core.filter(c => c.stats.f >= F_MIN && plain(c.lemma)).sort((a, b) => b.stats.f - a.stats.f || (a.lemma < b.lemma ? -1 : 1))
function pick<T>(xs: T[], n: number, rnd: () => number): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] } return a.slice(0, n) }
const rnd = mulberry32(SEED)
const random = pick(byF, N_RANDOM, rnd).map(c => c.lemma)

// dialect words: the lemmas whose lm/lb class is «діалектне за словником» (d.c === 'dict') AND that have a card in the corpus (lemma list of lexicon.json), plain spelling
const lbAll: Record<string, any> = {}
await pool(Array.from({ length: 4096 }, (_, i) => i), 24, async i => { Object.assign(lbAll, await shard(`lm/lb/${i}.json`)) })
const seAll: Record<string, any> = {}
await pool(Array.from({ length: 4096 }, (_, i) => i), 24, async i => { Object.assign(seAll, await shard(`lm/se/${i}.json`)) })
const lemmaSet = new Set(core.map(c => c.lemma))
const dialectPool2 = [...lemmaSet].filter(k => lbAll[lk(k)]?.d?.c === 'dict' && plain(k)).sort()
const dialect = pick(dialectPool2, N_DIALECT, mulberry32(SEED + 1))
// historical words: archaic.json entries with a dictionary headword in Cyrillic (status 'dictionary'), plain spelling, not already in the sample
const histPool = Object.values(archaic).filter(e => e.status === 'dictionary' && (e.n ?? 0) >= 30 && plain(e.head) && !random.includes(e.head)).map(e => e.head as string).sort()
const hist = pick([...new Set(histPool)], N_HIST, mulberry32(SEED + 2))
const sample = [...random.map(w => ({ w, kind: 'freq' })), ...dialect.map(w => ({ w, kind: 'dialect' })), ...hist.map(w => ({ w, kind: 'hist' }))]

// ── lm sidecars for the sample ──────────────────────────────────────────────────────────────────
const lmShard = (name: string, key: string) => shard(`lm/${name}/${lmBucket(key)}.json`)
const coreOf = new Map(core.map(c => [c.lemma, c]))
const rows: any[] = []
for (const { w, kind } of sample) {
  const k = lk(w), c = coreOf.get(w), lb = lbAll[k], se = seAll[k]
  const et = (await lmShard('etymology', w)).entries?.[w], cg = (await lmShard('cognates', w)).entries?.[w], sn = (await lmShard('senses', w))[w]
  const us = (await lmShard('usage', w)).lemmas?.[w], dm = (await lmShard('dim', w)).entries?.[w]
  const lx = await shard(`lex/${bucketOf(w)}.json`)
  const di = (lx.lemmas as string[] | undefined)?.indexOf(w) ?? -1, det = di >= 0 ? lx.details[di] : undefined
  const stress = (det?.stress ?? []) as { positions: number[]; status: string; method: string }[]
  const sPos = stress.find(s => s.positions?.length)?.positions ?? null
  rows.push({
    w, kind, inCore: !!c, f: c?.stats.f ?? 0, ipm: c ? +c.stats.ipm.toFixed(2) : 0,
    paradigmForms: c?.paradigm.length ?? 0,
    firstKnown: c ? typeof (c.first.value as any) === 'object' : false, firstDate: c && typeof (c.first.value as any) === 'object' ? (c.first.value as any).date : null,
    isArchaicCard: !!Object.values(archaic).find(e => e.head === w), isLight: w in light, inDictOnly: cardIndex.ld.includes(w),
    stressDict: stress.some(s => s.method === 'dictionary' && s.positions?.length), stressAny: !!sPos, stressVariants: stress.length,
    ipaRule: toIpa(w, sPos).ipa || null,
    lbClass: lb?.d?.c ?? null, lbSenseLabels: lb?.s?.length ?? 0, lbReg: (lb?.r ?? []).length,
    seRows: se?.rows?.length ?? 0, seRuRows: se ? se.rows.filter((r: any) => ruOfDict(r.d)).length : 0, seDicts: se ? [...new Set<string>(se.rows.map((r: any) => r.d))] : [], seDated: se ? se.rows.filter((r: any) => r.e).length : 0, seKwic: se?.kw?.length ?? 0, seGroups: se?.groups?.length ?? 0,
    etym: !!et, etymSources: et ? [...new Set<string>(et.sources.map((s: any) => s.source))] : [], cognates: !!cg, wiktSenses: sn?.length ?? 0, usage: !!us, dim: !!dm,
  })
}

// ── universe counts ───────────────────────────────────────────────────────────────────────────────
const count = {
  cardindex: { lw: cardIndex.lw.length, ar: cardIndex.ar.length, lf: cardIndex.lf.length, ld: cardIndex.ld.length },
  coreCards: core.length, coreFirstKnown: core.filter(c => typeof (c.first.value as any) === 'object').length, coreWithParadigm: core.filter(c => c.paradigm.length).length,
  coreF0: core.filter(c => c.stats.f === 0).length, lightLemmas: Object.keys(light).length, archaicEntries: Object.keys(archaic).length,
  archaicWithDictDate: Object.values(archaic).filter(e => e.dict?.date).length,
  lb: { entries: Object.keys(lbAll).length, byClass: {} as Record<string, number>, withSenseLabels: 0, withReg: 0, corpus: 0 },
  se: { entries: Object.keys(seAll).length, rows: 0, byDict: {} as Record<string, number>, entriesTwoDicts: 0, entriesDated: 0, entriesKwic: 0, rowsDated: 0, rowsLabelled: 0, entriesTrans: 0, rowsLocator: 0, rowsRuDict: 0, entriesRuDict: 0, rowsStressHead: 0, entriesTwoEpochs: 0 },
  lm: {} as Record<string, number>,
}
for (const e of Object.values(lbAll)) { const c = e.d?.c ?? '?'; count.lb.byClass[c] = (count.lb.byClass[c] ?? 0) + 1; if (e.s?.length) count.lb.withSenseLabels++; if (e.r?.length) count.lb.withReg++; if (e.corpus) count.lb.corpus++ }
for (const e of Object.values(seAll)) {
  count.se.rows += e.rows.length; const ds = new Set<string>(e.rows.map((r: any) => r.d)); if (ds.size >= 2) count.se.entriesTwoDicts++
  for (const r of e.rows) { count.se.byDict[r.d] = (count.se.byDict[r.d] ?? 0) + 1; if (r.e) count.se.rowsDated++; if (r.lb?.length) count.se.rowsLabelled++ }
  for (const r of e.rows) { if (r.l) count.se.rowsLocator++; if (r.a) count.se.rowsStressHead++ }
  { const n = e.rows.filter((r: any) => ruOfDict(r.d)).length; count.se.rowsRuDict += n; if (n) count.se.entriesRuDict++ }
  if (timeline(e).filter(c => c.items.length).length >= 2) count.se.entriesTwoEpochs++
  if (e.rows.some((r: any) => r.e)) count.se.entriesDated++
  if (e.kw?.length) count.se.entriesKwic++
  if (e.trans?.length) count.se.entriesTrans++
}
const lmCount: Record<string, number> = { etymology: 0, etymologyEsum: 0, cognates: 0, sensesLemmas: 0, sensesTotal: 0, usage: 0, dim: 0, loanlabels: 0, heteronyms: 0, ru: 0 }
await pool(Array.from({ length: 256 }, (_, i) => i), 24, async i => {
  const g = async (n: string) => shard(`lm/${n}/${i}.json`)
  const [et, cg, sn, us, di, lo, he, ru] = await Promise.all(['etymology', 'cognates', 'senses', 'usage', 'dim', 'loanlabels', 'heteronyms', 'ru'].map(g))   // all awaits first: no += across an await (lost updates)
  const ets = Object.values<any>(et.entries ?? {})
  lmCount.etymology! += ets.length; lmCount.etymologyEsum! += ets.filter(e => e.sources.some((s: any) => s.source === 'ESUM')).length
  lmCount.cognates! += Object.keys(cg.entries ?? {}).length
  lmCount.sensesLemmas! += Object.keys(sn).length; lmCount.sensesTotal! += Object.values<any>(sn).reduce((a, v) => a + v.length, 0)
  lmCount.usage! += Object.keys(us.lemmas ?? {}).length; lmCount.dim! += Object.keys(di.entries ?? {}).length
  lmCount.loanlabels! += Object.keys(lo.labels ?? {}).length; lmCount.heteronyms! += Object.keys(he.forms ?? {}).length; lmCount.ru! += Object.keys(ru).length
})
count.lm = lmCount

// stress rate on a random 1 % of the 32768 lex shards (details of ≈ 2 lemmas each): a sample estimate, not a census
const rs = mulberry32(SEED + 3), buckets = pick(Array.from({ length: 32768 }, (_, i) => i), 400, rs)
let nl = 0, ns = 0, nd = 0, nf = 0
await pool(buckets, 16, async b => { const s = await shard(`lex/${b}.json`); for (const d of s.details ?? []) { nl++; const st = (d.stress ?? []) as any[]; if (st.some(x => x.positions?.length)) ns++; if (st.some(x => x.method === 'dictionary' && x.positions?.length)) nd++; if (d.first || d.oldest) nf++ } })
const stressSample = { shards: buckets.length, lemmas: nl, withStress: ns, withDictionaryStress: nd }

const out = { build: ptr.buildId, seed: SEED, params: { N_RANDOM, N_DIALECT, N_HIST, F_MIN, poolSize: { freq: byF.length, dialect: dialectPool2.length, hist: [...new Set(histPool)].length } }, sample: rows, count, stressSample }
writeFileSync('analysis/goroh-quality.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ count, stressSample, params: out.params }, null, 1))
console.log(rows.map(r => `${r.kind}\t${r.w}\tf=${r.f}`).join('\n'))
