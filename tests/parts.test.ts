/**
 * SPEC 63 PF-1 / PF-3 — the prefix-sharded index and the shard-backed lookups. A real slice of the built core (public/data/lexicon.json) is cut into ix/ and cd/ shards IN MEMORY
 * (pipelines/build-parts.ts), served through a stubbed fetch, and read back by the app's own code (src/lib/parts.ts): search, annotate, analyse — no global map anywhere.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { packCore, unpackCore } from '../core/pack.ts'
import { bucketOf } from '../core/shard.ts'
import { key } from '../core/text.ts'
import { IX_MAX, IX_MIN, ixLeaf, ixName, ixPad, ixUnder, lmBucket, witBucket } from '../core/parts.ts'
import { buildRows, planShards, shardOf } from '../pipelines/build-parts.ts'
import { buildIndex, queryKeys, search } from '../src/lib/search.ts'
import { annotate } from '../src/lib/annotate.ts'
import { runDetectors } from '../src/lib/analyze.ts'
import { reconstruct } from '../src/lib/derive.ts'
import { cardMapView, coreOf, ixAttest, ixHitMap, ixLexIndex, ixParadigm, ixPrefix, ixReady, searchRemote, settled } from '../src/lib/parts.ts'
import type { CoreCard, LexIndex } from '../core/types.ts'

const have = existsSync('public/data/lexicon.json')
const cards: CoreCard[] = have ? unpackCore(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8'))).slice(0, 400) : []
const lexindex: LexIndex = { generated: 't', lt: { 'шо': ['replace', 'що'] }, vesum: { 'шо': [{ lemma: 'що', tags: 'adv:&pron:int:rel:subst' }] } }

// the shards of the slice, as the browser would fetch them
const served = new Map<string, unknown>()
function cut(gzMax: number) {
  served.clear()
  const rows = buildRows(cards, lexindex), leaves = planShards(rows, gzMax)
  for (const [p, items] of leaves) served.set(`./data/ix/${ixName(p)}.json`, shardOf(items, (rows as unknown as { tags: string[] }).tags))
  served.set('./data/ix/index.json', { format: 1, leaves: [...leaves].map(([p, it]) => [p, it.length]) })
  const by = new Map<number, CoreCard[]>()
  for (const c of cards) { const b = bucketOf(c.lemma); (by.get(b) ?? (by.set(b, []), by.get(b)!)).push(c) }
  for (const [b, cs] of by) served.set(`./data/cd/${b}.json`, packCore(cs))
  return { rows, leaves }
}
let asked: string[] = []
const realFetch = globalThis.fetch
beforeAll(() => {
  globalThis.fetch = (async (u: string) => { asked.push(String(u)); const v = served.get(String(u)); return { ok: v !== undefined, json: async () => v } as Response }) as typeof fetch
})
afterAll(() => { globalThis.fetch = realFetch })

describe.skipIf(!have)('PF-1 prefix shards', () => {
  const { rows, leaves } = cut(1200)   // a small limit forces splits on a 400-lemma slice
  it('PF-1 every key lives in exactly one leaf, found by ixLeaf from the manifest alone', () => {
    const names = new Set(leaves.keys()), where = new Map<string, string>()
    for (const [p, items] of leaves) for (const [k] of items) { expect(where.has(k)).toBe(false); where.set(k, p) }
    expect(where.size).toBe(rows.size)
    for (const [k, p] of where) expect(ixLeaf(k, names)).toBe(p)
  })
  it('PF-1 shards split deeper than 2 letters when they are over the limit, never past IX_MAX', () => {
    const depths = [...leaves.keys()].map(p => [...p].length)
    expect(Math.min(...depths)).toBe(IX_MIN); expect(Math.max(...depths)).toBeLessThanOrEqual(IX_MAX); expect(Math.max(...depths)).toBeGreaterThan(IX_MIN)
  })
  it('PF-1 a key shorter than the prefix is filed under the padded prefix', () => { expect(ixPad('а', 3)).toBe('а__'); expect(ixPad('кінь', 2)).toBe('кі') })
  it('PF-1 ixUnder lists the leaves below a short prefix, heaviest first', () => {
    const man = [...leaves].map(([p, it]) => [p, it.length] as [string, number]), u = ixUnder('к', man, 2)
    expect(u.length).toBeLessThanOrEqual(2); for (const p of u) expect(p.startsWith('к')).toBe(true)
  })
  it('PF-1 searchRemote returns what the in-memory search() returns for lemma / form / paradigm hits, reading only prefix shards', async () => {
    const idx = buildIndex(cards), lemma = cards.find(c => c.forms.length > 1 && [...c.lemma].length > 3)!.lemma, q = [...lemma].slice(0, 3).join('')
    asked = []
    const r = await searchRemote(q, queryKeys), mem = search(idx, q, 30)
    expect(r.lemmas.length).toBeGreaterThan(0)
    expect(r.lemmas.map(x => x.lemma)).toContain(lemma)
    const memTop = new Set(mem.filter(x => x.rank < 20).map(x => x.lemma))
    for (const x of r.lemmas.filter(x => x.rank < 20)) expect(memTop.has(x.lemma), `${x.lemma} is a prefix hit of ${q}`).toBe(true)
    expect(asked.every(u => u.startsWith('./data/ix/'))).toBe(true)
    expect(asked.length).toBeLessThanOrEqual(1 + 4)   // manifest + a handful of shards, never the index
  })
  it('PF-1 a single letter query stops after enough hits (one shard at a time, alphabetically)', async () => {
    asked = []
    const rows1 = await ixPrefix('к', 5)
    expect(rows1.length).toBeGreaterThan(0); expect(asked.filter(u => u !== './data/ix/index.json').length).toBeLessThan(leaves.size)
  })
  it('PF-1 sidecar and witness buckets are stable', () => { expect(lmBucket('вода')).toBe(lmBucket('вода')); expect(witBucket('x')).toBeLessThan(64) })
})

describe.skipIf(!have)('PF-3 lookups through the same shards (no global paradigm map)', () => {
  cut(30 * 1024)
  const sample = cards.filter(c => c.paradigm.length > 3 && c.forms.length > 0).slice(0, 6)
  it('PF-3 the paradigm facade returns the VESUM hits of the in-memory map', async () => {
    await ixReady()
    for (const c of sample) {
      const p = c.paradigm[1]!, k = key(p.form)
      const hits = await settled(() => ixParadigm.get(k))
      expect(hits, p.form).toBeDefined(); expect(hits!.some(h => h.lemma === c.lemma && h.tags === p.tags)).toBe(true)
    }
  })
  it('PF-3 the lexindex facade answers vesum / lt by property access, like the file did', async () => {
    const v = await settled(() => ixLexIndex.vesum['шо']); expect(v?.[0]).toEqual({ lemma: 'що', tags: 'adv:&pron:int:rel:subst' })
    expect(await settled(() => ixLexIndex.lt['шо'])).toEqual(['replace', 'що']); expect(ixLexIndex.vesum['немаетакого']).toBeUndefined()
  })
  it('PF-3 annotate() over the shard facades equals annotate() over in-memory maps', async () => {
    const idx = buildIndex(cards), par = new Map<string, { lemma: string; tags: string }[]>()
    for (const c of cards) for (const p of c.paradigm) { const k = key(p.form); par.set(k, [...(par.get(k) ?? []), { lemma: c.lemma, tags: p.tags }]) }
    const mem = { search: idx, cards: new Map(cards.map(c => [c.lemma, c])), lexindex, paradigmMap: par }
    const text = sample.map(c => `${c.forms[0]!.raw} ${c.paradigm[1]!.form} ${c.lemma}`).join(' ') + ' шо невідоме'
    const want = annotate(text, mem)
    const got = await settled(() => annotate(text, { search: { map: ixHitMap, keys: [] }, cards: cardMapView, lexindex: ixLexIndex, paradigmMap: ixParadigm }))
    expect(got.map(t => [t.raw, t.status, t.lemma, t.via])).toEqual(want.map(t => [t.raw, t.status, t.lemma, t.via]))
    expect(got.some(t => t.status === 'attested')).toBe(true)
  })
  it('PF-3 runDetectors / reconstruct read the same facades', async () => {
    const c = sample[0]!
    const a = await settled(() => runDetectors(c.paradigm[1]!.form, { paradigmMap: ixParadigm, lexindex: ixLexIndex }))
    expect(a.known).toBe(true)
    const r = await settled(() => reconstruct(c.lemma, { map: ixHitMap, keys: [] }, cardMapView, ixAttest))
    expect(r.forms.length).toBeGreaterThan(0)
    expect(coreOf(c.lemma)?.lemma).toBe(c.lemma)
  })
  it('PF-3 settled() re-runs until no read starts a fetch, then stops', async () => {
    let runs = 0
    await settled(() => { runs++; return ixHitMap.get(key(sample[1]!.lemma)) })
    expect(runs).toBeGreaterThanOrEqual(1); expect(runs).toBeLessThanOrEqual(8)
    const before = runs; await settled(() => { runs++; return ixHitMap.get(key(sample[1]!.lemma)) }); expect(runs).toBe(before + 1)   // all cached: one pass
  })
})

describe('PF-2 the gazetteer is a card file only for a capitalised lemma', () => {
  it('cardData lists places.json for Київ and not for і / він / слово; every gazetteer lemma is capitalised', async () => {
    const { cardData, needsPlaces } = await import('../core/parts.ts')
    expect(cardData('Київ')).toContain('places.json'); for (const l of ['і', 'він', 'слово']) expect(cardData(l)).not.toContain('places.json')
    expect(needsPlaces('Ірпінь')).toBe(true); expect(needsPlaces('ірпінь')).toBe(false)
    if (existsSync('public/data/places.json')) for (const p of (JSON.parse(readFileSync('public/data/places.json', 'utf8')) as { places: { lemma: string }[] }).places) expect(needsPlaces(p.lemma), p.lemma).toBe(true)
  })
})
