/** SPEC 63 CP-10.7 (presence index of optional sidecar shards) and CP-10.10 (person-mention tooltip with name and years). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { dirHas, encodeBuckets, presenceOf, type PresenceIndex } from '../core/presence.ts'
import { scanPresence } from '../pipelines/build-presence.ts'
import { fetchJson } from '../src/lib/fetchJson.ts'
import { isIndexed, resetPresence } from '../src/lib/presence.ts'
import { personTipOf, personsIndex } from '../src/lib/personsData.ts'

describe('CP-10.7 presence codec', () => {
  it('every encoding decodes to the same set (sparse, dense, bitmap), numbers past the end are absent', () => {
    for (const [present, n] of [[[3, 70, 255], 256], [Array.from({ length: 250 }, (_, i) => i).filter(i => i !== 7), 250], [[0, 1, 2, 3, 5, 8, 13, 21, 34], 35]] as [number[], number][]) {
      const d = encodeBuckets(present, n), want = new Set(present)
      for (let i = 0; i < n + 8; i++) expect(dirHas(d, String(i)), `${JSON.stringify(d).slice(0, 40)} ${i}`).toBe(want.has(i))
    }
    expect(Object.keys(encodeBuckets(Array.from({ length: 200 }, (_, i) => i).filter(i => i !== 20), 200))).toEqual(['a', 'n'])
  })
  it('scan lists numeric buckets and named leaves of the sidecar directories; unknown directories and names stay unknown', () => {
    const root = mkdtempSync(join(tmpdir(), 'pres-'))
    try {
      for (const f of ['lm/st/4.json', 'lm/st/9.json', 'lm/phr/1.json', 'cd/0.json', 'cd/2.json', 'uv/p/0432043e.json', 'uv/p/_split.json', 'ix/0061.json']) { mkdirSync(join(root, f, '..'), { recursive: true }); writeFileSync(join(root, f), '{}') }
      const ix = scanPresence(root)
      expect(Object.keys(ix.dirs).sort()).toEqual(['cd', 'lm/phr', 'lm/st', 'uv/p'])
      expect(presenceOf(ix, './data/lm/st/4.json')).toBe(true); expect(presenceOf(ix, './data/lm/st/5.json')).toBe(false); expect(presenceOf(ix, './data/lm/st/300.json')).toBe(false)
      expect(presenceOf(ix, './data/cd/1.json')).toBe(false); expect(presenceOf(ix, './data/uv/p/0432043e.json')).toBe(true); expect(presenceOf(ix, './data/uv/p/04ff.json')).toBe(false)
      expect(presenceOf(ix, './data/lm/syn/1.json')).toBeUndefined(); expect(presenceOf(ix, './data/ix/0061.json')).toBeUndefined(); expect(presenceOf(null, './data/lm/st/5.json')).toBeUndefined()
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('size: the index for a realistic data set stays a few KB gzipped (lazy, outside the first load)', () => {
    const dirs: PresenceIndex['dirs'] = { cd: encodeBuckets(Array.from({ length: 32768 }, (_, i) => i).filter(i => i % 97), 32768) }
    for (const [d, n, k] of [['st', 256, 200], ['phr', 512, 300], ['syn', 1024, 700], ['xr', 1024, 800], ['se', 4096, 3000], ['senses', 256, 256], ['cognates', 256, 250]] as const) dirs[`lm/${d}`] = encodeBuckets(Array.from({ length: n }, (_, i) => i).filter((_, i) => (i * 7919) % n < k), n)
    const gz = gzipSync(JSON.stringify({ format: 1, dirs })).length
    console.log(`presence index (synthetic, 32768 cd buckets + 7 lm dirs): ${gz} B gzip`)
    expect(gz).toBeLessThan(12 * 1024)
  })
})

describe('CP-10.7 fetchJson skips absent buckets', () => {
  const ix: PresenceIndex = { format: 1, dirs: { 'lm/st': { p: [4] } } }
  let f: ReturnType<typeof vi.fn>
  beforeEach(() => { f = vi.fn(async () => new Response('{"x":1}')); vi.stubGlobal('fetch', f) })
  afterEach(() => { vi.unstubAllGlobals(); resetPresence() })
  it('an absent bucket is answered null without a request; a present one and an unindexed one are fetched', async () => {
    resetPresence(ix)
    expect(await fetchJson('./data/lm/st/5.json', [0])).toBeNull(); expect(f).not.toHaveBeenCalled()
    expect(await fetchJson('./data/lm/st/4.json', [0])).toEqual({ x: 1 }); expect(await fetchJson('./data/lm/syn/5.json', [0])).toEqual({ x: 1 }); expect(f).toHaveBeenCalledTimes(2)
  })
  it('graceful fallback: a missing or broken index (older build) means every bucket is fetched as before', async () => {
    resetPresence(null)
    expect(await fetchJson('./data/lm/st/5.json', [0])).toEqual({ x: 1 }); expect(f).toHaveBeenCalledTimes(1)
    resetPresence(); f.mockReset(); f.mockImplementation(async (u: string) => (String(u).endsWith('presence.json') ? new Response('', { status: 404 }) : new Response('{"y":2}')))
    expect(await fetchJson('./data/lm/st/5.json', [0])).toEqual({ y: 2 })
    resetPresence(); f.mockReset(); f.mockImplementation(async (u: string) => { if (String(u).endsWith('presence.json')) throw new Error('offline'); return new Response('{"y":3}') })
    expect(await fetchJson('./data/cd/12.json', [0])).toEqual({ y: 3 })
  })
  it('only the sidecar directories are looked up; the index file and other URLs are not', () => {
    for (const u of ['./data/lm/st/5.json', './data/cd/5.json', './data/tc/orv/5.json', './data/uv/p/04.json', './data/unlinked/idx-04.json', './data/wit/5.json']) expect(isIndexed(u), u).toBe(true)
    for (const u of ['./data/lm/presence.json', './data/boot.json', './data/ix/0061.json', './data/persons/index.json', '/a.json']) expect(isIndexed(u), u).toBe(false)
  })
})

describe('CP-10.10 person-mention tooltip', () => {
  afterEach(() => { vi.unstubAllGlobals(); personsIndex.value = undefined })
  it('names the person with years once the persons index is there; the index is requested by the tooltip itself (a KWIC card never opened the persons page)', async () => {
    const rows = [{ id: 'shevchenko', name: 'Тарас Шевченко', b: 1814, d: 1861 }]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ format: 1, rows, alias: { hv_шевченко_т: 'shevchenko' }, shards: 16 }))))
    expect(personTipOf('shevchenko', 'повне ім’я')).toBe('постать — підстава: повне ім’я')   // not loaded yet: the honest fallback
    await vi.waitFor(() => expect(personsIndex.value).toBeTruthy())
    expect(personTipOf('shevchenko', 'повне ім’я')).toBe('постать: Тарас Шевченко (1814–1861) — підстава: повне ім’я')
    expect(personTipOf('hv_шевченко_т', 'прізвище')).toBe('постать: Тарас Шевченко (1814–1861) — підстава: прізвище')
  })
})
