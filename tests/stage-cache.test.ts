/** SPEC 63 RS-2: content-addressed stage cache of the data build (pipelines/stage-cache.ts, pipelines/stage-code.ts, the stage markers of pipelines/build.ts). */
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync, truncateSync, appendFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { StageCache, ReadTracker, gc, report, writeEntry, readEntry, peekEntry, type CacheConfig } from '../pipelines/stage-cache.ts'
import { SourceIndex, parseSource } from '../pipelines/stage-code.ts'

const tmp = (p = 'rs2-') => mkdtempSync(join(tmpdir(), p))
const live: StageCache[] = []
afterEach(() => { while (live.length) live.pop()!.tracker.uninstall() })

/** A miniature project on disk: pipeline/main.ts (stage markers), lib/*.ts modules, in/*.txt inputs. */
function project() {
  const root = tmp('rs2-proj-')
  for (const d of ['pipeline', 'lib', 'in', 'cache']) mkdirSync(join(root, d))
  const w = (f: string, t: string) => writeFileSync(join(root, f), t)
  w('lib/m1.ts', 'export const m1 = (x: number) => x + 1\n')
  w('lib/m2.ts', "import { helper } from './deep.ts'\nexport const m2 = (x: number) => helper(x) * 2\n")
  w('lib/deep.ts', 'export const helper = (x: number) => x + 100\n')
  w('lib/m3.ts', 'export const m3 = (x: number) => x * 3\n')
  w('in/a.txt', '1'); w('in/b.txt', '2')
  const main = (extra = '', s2 = '') => `import { m1 } from '../lib/m1.ts'
import { m2 } from '../lib/m2.ts'
import { m3 } from '../lib/m3.ts'
const glue = 1${extra}
export async function build() {
  // #stage s1
  const s1 = await sc.run('s1', {}, () => ({ v: m1(a) }))
  // #end
  // #stage s2
  const s2 = await sc.run('s2', {}, () => ({ v: m2(s1.v) + b${s2} }))
  // #end
  // #stage s3
  const s3 = await sc.run('s3', {}, () => ({ v: m3(s2.v) }))
  // #end
  // #stage s4
  const s4 = await sc.run('s4', {}, () => ({ v: s3.v + 1 }))
  // #end
  // #tail
  writeOutputs()
}
`
  w('pipeline/main.ts', main())
  return { root, w, main, rm: (f: string) => rmSync(join(root, f), { force: true }) }
}
type Proj = ReturnType<typeof project>

/** the pipeline of project(), run against a StageCache; `calls` counts the stage functions that really ran */
async function run(p: Proj, o: Partial<CacheConfig> = {}) {
  const calls: string[] = [], logs: string[] = []
  const sc = new StageCache({ dir: join(p.root, 'cache'), enabled: true, code: new SourceIndex(join(p.root, 'pipeline/main.ts'), p.root).warm(), log: m => logs.push(m), ...o })
  live.push(sc); sc.start()
  const rd = (f: string) => Number(readFileSync(join(p.root, 'in', f), 'utf8'))
  const stage = <T extends Record<string, unknown>>(n: string, fn: () => T) => sc.run(n, {}, () => { calls.push(n); return fn() })
  const s1 = await stage('s1', () => ({ v: rd('a.txt') + 1 }))
  const s2 = await stage('s2', () => ({ v: (s1.v + 100) * 2 + rd('b.txt') }))
  const s3 = await stage('s3', () => ({ v: s2.v * 3 }))
  const s4 = await stage('s4', () => ({ v: s3.v + 1 }))
  sc.finish()
  return { out: JSON.stringify(s4), calls, logs, sc }
}

describe('RS-2 stage cache: hits, misses, invalidation', () => {
  it('RS-2 cold = uncached output; warm = all hits, same output', async () => {
    const p = project()
    const off = await run(p, { enabled: false })
    expect(off.calls).toEqual(['s1', 's2', 's3', 's4']); expect(existsSync(join(p.root, 'cache', 's1'))).toBe(false)
    const cold = await run(p)
    expect(cold.out).toBe(off.out); expect(cold.calls).toEqual(['s1', 's2', 's3', 's4'])
    const warm = await run(p)
    expect(warm.out).toBe(off.out); expect(warm.calls).toEqual([])
    expect(warm.logs.filter(l => /cache hit s\d \(saved ~/.test(l))).toHaveLength(4)
  })
  it('RS-2 changing one input file invalidates exactly the stages that read it and everything after', async () => {
    const p = project(); await run(p)
    p.w('in/b.txt', '5')   // read by s2 only
    const r = await run(p)
    expect(r.calls).toEqual(['s2', 's3', 's4'])
    expect(r.logs.find(l => /cache miss s2/.test(l))).toMatch(/input changed: .*b\.txt/)
    expect(r.out).toBe((await run(p, { enabled: false })).out)
    p.w('in/a.txt', '7')   // s1 reads it: everything
    expect((await run(p)).calls).toEqual(['s1', 's2', 's3', 's4'])
  })
  it('RS-2 a source file changed: only the stages whose block references it (and later ones, by the spine) recompute', async () => {
    const p = project(); await run(p)
    p.w('lib/m3.ts', 'export const m3 = (x: number) => x * 4\n')   // referenced by the s3 block only
    expect((await run(p)).calls).toEqual(['s3', 's4'])
    p.w('lib/deep.ts', 'export const helper = (x: number) => x + 200\n')   // transitive: m2 → deep, referenced by s2
    expect((await run(p)).calls).toEqual(['s2', 's3', 's4'])
    p.w('lib/m1.ts', 'export const m1 = (x: number) => x + 2\n')   // s1
    expect((await run(p)).calls).toEqual(['s1', 's2', 's3', 's4'])
    expect((await run(p)).calls).toEqual([])
  })
  it('RS-2 a stage block edited: that stage and the later ones; edited glue: every stage', async () => {
    const p = project(); await run(p)
    p.w('pipeline/main.ts', p.main('', ' /* edited */'))
    expect((await run(p)).calls).toEqual(['s2', 's3', 's4'])
    p.w('pipeline/main.ts', p.main('; // glue edited'))
    expect((await run(p)).calls).toEqual(['s1', 's2', 's3', 's4'])
  })
  it('RS-2 CRLF checkouts do not change a fingerprint', async () => {
    const p = project(); await run(p)
    p.w('pipeline/main.ts', readFileSync(join(p.root, 'pipeline/main.ts'), 'utf8').replace(/\n/g, '\r\n'))
    p.w('lib/m3.ts', readFileSync(join(p.root, 'lib/m3.ts'), 'utf8').replace(/\n/g, '\r\n'))
    expect((await run(p)).calls).toEqual([])
  })
  it('RS-2 env/flags are part of the key; --from recomputes from that stage on; --no-cache computes everything', async () => {
    const p = project(); await run(p)
    expect((await run(p, { env: { KEEP_MIN_F: '3' } })).calls).toEqual(['s1', 's2', 's3', 's4'])
    expect((await run(p, { env: { KEEP_MIN_F: '3' }, from: 's3' })).calls).toEqual(['s3', 's4'])
    expect((await run(p, { env: { KEEP_MIN_F: '3' } })).calls).toEqual([])
    expect((await run(p, { enabled: false })).calls).toEqual(['s1', 's2', 's3', 's4'])
  })
  it('RS-2 never keyed on time: touching a file without changing it is a hit', async () => {
    const p = project(); await run(p)
    const f = join(p.root, 'in/a.txt'), t = new Date(Date.now() + 3600_000)
    const { utimesSync } = await import('node:fs'); utimesSync(f, t, t)
    expect((await run(p)).calls).toEqual([])
  })
})

describe('RS-2 stage cache: storage robustness (RS-1)', () => {
  it('RS-2 a truncated, bit-flipped or missing entry is a miss, never a crash, and the output is unchanged', async () => {
    const p = project(); const ok = await run(p)
    const files = () => readdirSync(join(p.root, 'cache', 's2')).filter(f => f.endsWith('.v8'))
    const f = join(p.root, 'cache', 's2', files()[0]!)
    truncateSync(f, statSync(f).size - 7)
    let r = await run(p); expect(r.out).toBe(ok.out); expect(r.calls).toEqual(['s2']); expect(r.logs.find(l => /cache miss s2/.test(l))).toMatch(/corrupt entry/)   // s3, s4 keys are unchanged: their entries are still valid
    const g = join(p.root, 'cache', 's3', readdirSync(join(p.root, 'cache', 's3')).find(x => x.endsWith('.v8'))!)
    const b = readFileSync(g); b[b.length >> 1]! ^= 0xff; writeFileSync(g, b)
    r = await run(p); expect(r.out).toBe(ok.out); expect(r.calls).toEqual(['s3'])
    rmSync(join(p.root, 'cache', 's1', readdirSync(join(p.root, 'cache', 's1')).find(x => x.endsWith('.v8'))!))
    r = await run(p); expect(r.out).toBe(ok.out); expect(r.calls[0]).toBe('s1')
  })
  it('RS-2 a killed writer leaves only a *.tmp: no manifest line, so a miss; a garbage manifest line is skipped', async () => {
    const p = project(); await run(p)
    const dir = join(p.root, 'cache', 's4'), man = join(dir, 'manifest.jsonl')
    writeFileSync(join(dir, 'deadbeef.v8.123.tmp'), 'half an entry')
    appendFileSync(man, '{"key":"abc","file":"nope.v8","by')   // a partial last line
    expect((await run(p)).calls).toEqual([])
    rmSync(join(p.root, 'cache', 's4'), { recursive: true }); mkdirSync(dir); writeFileSync(join(dir, 'x.v8.1.tmp'), 'half')
    expect((await run(p)).calls).toEqual(['s4'])
  })
  it('RS-2 an entry is written to a tmp file and renamed; the manifest line comes after the complete file', () => {
    const d = tmp(), path = join(d, 's', 'k.v8')
    const { bytes, digest } = writeEntry(path, { stage: 's', key: 'k', secs: 1, reads: [['/x', 'H:1']] }, { a: 1, m: new Map([[1, 'x'], [2, 'y']]), l: [1, 2, 3] }, ['m', 'l'], 1)
    expect(statSync(path).size).toBe(bytes); expect(digest).toMatch(/^[0-9a-f]{64}$/); expect(readdirSync(join(d, 's'))).toEqual(['k.v8'])
    expect(peekEntry(path).reads).toEqual([['/x', 'H:1']])
    const { value } = readEntry(path)
    expect(value['a']).toBe(1); expect([...(value['m'] as Map<number, string>)]).toEqual([[1, 'x'], [2, 'y']]); expect(value['l']).toEqual([1, 2, 3])
  })
  it('RS-2 chunked Map/Array fields round-trip exactly (typed arrays, undefined holes, sets, nested maps); unchunked fields keep shared identity', () => {
    const d = tmp(), path = join(d, 'k.v8'), shared = { n: 1 }
    const value = {
      hits: new Map(Array.from({ length: 10_001 }, (_, i) => [`k${i}`, [{ lemma: `l${i}`, tags: 'noun' }]] as const)),
      linked: Array.from({ length: 5003 }, (_, i) => (i % 3 ? undefined : { c: { id: i, trace: ['a', 'b'] }, route: 'direct' })),
      has: Uint8Array.from([1, 0, 1]), set: new Set(['x', 'y']), a: shared, b: shared, nested: new Map([['m', new Map([[1, 2]])]]),
    }
    writeEntry(join(d, 'k.v8'), { stage: 's', key: 'k', secs: 0, reads: [] }, value, ['hits', 'linked'], 1000)
    const back = readEntry(path).value as typeof value
    expect(back).toEqual(value); expect(back.a).toBe(back.b)
    expect([...back.hits.keys()].slice(0, 3)).toEqual(['k0', 'k1', 'k2'])
  })
  it('RS-2 verify mode refuses an entry whose round trip is lossy (class instance), and the build goes on uncached', async () => {
    const d = tmp(), logs: string[] = []
    class Box { constructor(public v: number) {} get twice() { return this.v * 2 } }
    const sc = new StageCache({ dir: d, enabled: true, verify: true, code: { fingerprint: () => 'x' }, log: m => logs.push(m) })
    const v = await sc.run('s', {}, () => ({ box: new Box(2) }))
    expect(v.box.twice).toBe(4); expect(logs.join('\n')).toMatch(/not cached s: round trip is not lossless/)
    expect(readdirSync(join(d, 's')).filter(f => f.endsWith('.v8'))).toEqual([])
  })
  it('RS-2 GC keeps the last 2 entries per stage (per item for item stages) and removes stale tmp files; the report sizes the cache', async () => {
    const p = project()
    for (const v of ['1', '2', '3', '4']) { p.w('in/a.txt', v); await run(p) }
    const dir = join(p.root, 'cache', 's1')
    expect(readdirSync(dir).filter(f => f.endsWith('.v8'))).toHaveLength(2)
    expect(readFileSync(join(dir, 'manifest.jsonl'), 'utf8').trim().split('\n')).toHaveLength(2)
    writeFileSync(join(dir, 'old.v8.9.tmp'), 'x'); const old = new Date(Date.now() - 3600_000); (await import('node:fs')).utimesSync(join(dir, 'old.v8.9.tmp'), old, old)
    expect(gc(join(p.root, 'cache')).removed).toBe(1)
    expect(report(join(p.root, 'cache')).join('\n')).toMatch(/cache s1: 2 entries[\s\S]*cache total/)
    p.w('in/a.txt', '3'); expect((await run(p)).calls).toEqual([])   // the newest 2 states are still there
  })
})

describe('RS-2 per-item (per-witness) cache and the read tracker', () => {
  it('RS-2 per-witness items: adding or touching one witness recomputes only that witness', () => {
    const d = tmp(), cache = join(d, 'cache'), w = (id: string, t: string) => writeFileSync(join(d, id + '.json'), t)
    for (const id of ['a', 'b', 'c']) w(id, `text ${id}`)
    const go = (ids: string[]) => {
      const sc = new StageCache({ dir: cache, enabled: true, code: { fingerprint: () => 'tok1' }, log: () => {} }); live.push(sc); sc.start()
      const ran: string[] = []
      const out = ids.map(id => { readFileSync(join(d, id + '.json'), 'utf8'); return sc.item('tokens', id, () => sc.tracker.fileFp(join(d, id + '.json')), () => { ran.push(id); return { toks: readFileSync(join(d, id + '.json'), 'utf8').split(' ') } }).toks.join('+') })
      sc.finish(); return { ran, out }
    }
    const cold = go(['a', 'b', 'c']); expect(cold.ran).toEqual(['a', 'b', 'c'])
    expect(go(['a', 'b', 'c'])).toEqual({ ran: [], out: cold.out })
    w('b', 'text changed'); expect(go(['a', 'b', 'c']).ran).toEqual(['b'])
    w('d', 'text d'); expect(go(['a', 'b', 'c', 'd']).ran).toEqual(['d'])
    expect(readdirSync(join(cache, 'tokens')).filter(f => f.endsWith('.v8')).length).toBeLessThanOrEqual(6)   // GC: at most 2 per item
  })
  it('RS-2 the item code is part of the spine: changing it invalidates the stages after it', async () => {
    const d = tmp(), cache = join(d, 'cache'); writeFileSync(join(d, 'w.json'), 'x')
    const go = async (fp: string) => {
      const sc = new StageCache({ dir: cache, enabled: true, code: { fingerprint: s => (s === 'tokens' ? fp : 'same') }, log: () => {} }); live.push(sc); sc.start()
      sc.item('tokens', 'w', () => 'f', () => ({ a: 1 })); let ran = false
      await sc.run('after', {}, () => { ran = true; return { b: 1 } }); sc.finish(); return ran
    }
    expect(await go('v1')).toBe(true); expect(await go('v1')).toBe(false); expect(await go('v2')).toBe(true)
  })
  it('RS-2 the tracker fingerprints reads through the ES-module named imports, skips the build\'s own writes, ignores unrelated names in a filtered directory', () => {
    const d = tmp(), t = new ReadTracker([join(d, 'cache')]); live.push({ tracker: t } as StageCache)
    writeFileSync(join(d, 'in.json'), '{"a":1}'); writeFileSync(join(d, 'req.json'), '[]')
    t.filterDir(d, f => f === 'in.json'); t.install()
    readFileSync(join(d, 'in.json'), 'utf8'); existsSync(join(d, 'nope.json')); readdirSync(d)
    writeFileSync(join(d, 'out.json'), '1'); readFileSync(join(d, 'out.json'), 'utf8')
    const log = Object.fromEntries(t.snapshot()), at = (suffix: string) => Object.keys(log).find(k => k.endsWith(suffix))
    expect(Object.keys(log).some(k => k.startsWith('dir:'))).toBe(true); expect(at('out.json')).toBeUndefined(); expect(at('req.json')).toBeUndefined()
    expect(log[at('in.json')!]).toMatch(/^H:/); expect(log[at('nope.json')!]).toBe('A')
    writeFileSync(join(d, 'req.json'), '[1]'); writeFileSync(join(d, 'cache.dir'), 'x')   // a name the filter does not look at: the listing fingerprint is unchanged
    expect(t.firstChanged(t.snapshot().filter(([p]) => p.startsWith('dir:')))).toBeUndefined()
    writeFileSync(join(d, 'in.json'), '{"a":2}'); (t as unknown as { memo: Map<string, string> }).memo.clear()
    expect(t.firstChanged(t.snapshot())).toMatch(/in\.json$/)
    t.uninstall()
  })
})

describe('RS-2 code fingerprints of the real build.ts', () => {
  const buildTs = resolve('pipelines/build.ts')
  const text = readFileSync(buildTs, 'utf8')
  const idx = new SourceIndex(buildTs)
  const used = [...text.matchAll(/sc\.(?:run|item)\(\s*'([\w-]+)'/g)].map(m => m[1]!)
  it('RS-2 every sc.run / sc.item stage of build.ts has a // #stage block, and no block is unused', () => {
    expect(used.length).toBeGreaterThanOrEqual(9)
    expect([...new Set(used)].sort()).toEqual(idx.stages().sort())
    for (const s of used) expect(idx.fingerprint(s)).toMatch(/^[0-9a-f]{64}$/)
  })
  it('RS-2 a stage fingerprint covers the modules its block uses, transitively (so an edit to core/ or pipelines/ cannot leave a stale hit)', () => {
    const f = (s: string) => idx.files(s)
    expect(f('tokens')).toContain('core/pos-gate.ts')
    expect(f('link')).toEqual(expect.arrayContaining(['pipelines/build-link.ts', 'pipelines/vesum.ts', 'core/phonology.ts', 'core/mu-fold.ts', 'core/oes-folds.ts']))
    expect(f('epochs')).toContain('pipelines/build-epochs.ts')
    expect(f('archaic')).toContain('pipelines/build-archaic.ts')
    expect(f('collocations')).toContain('pipelines/build-stats.ts')
    expect(f('annotate')).toEqual(expect.arrayContaining(['pipelines/build-annotate.ts', 'core/evidence.ts', 'core/palatalization.ts']))
    expect(f('phrases')).toEqual(expect.arrayContaining(['core/phrasemes.ts', 'core/phraseme-pages.ts']))
    expect(f('vesum2')).toContain('core/verbs.ts')
    for (const s of used) for (const m of f(s)) expect(existsSync(resolve(m)), `${s}: ${m}`).toBe(true)
  })
  it('RS-2 the output section after the last cached stage is not part of any fingerprint (a writer edit keeps the cache)', () => {
    const { glue, blocks } = parseSource(buildTs)
    expect(glue).not.toContain('writeLexicon(cards, PUB)'); expect(glue).not.toContain('writeEtymology(')
    for (const [, b] of blocks) expect(b).not.toContain('// #')
  })
  it('RS-2 stage markers are validated: nested, unclosed and duplicate stages are errors', () => {
    expect(() => parseSource('x.ts', '// #stage a\n// #stage b\n// #end\n')).toThrow(/inside #stage a/)
    expect(() => parseSource('x.ts', '// #stage a\n')).toThrow(/not closed/)
    expect(() => parseSource('x.ts', '// #stage a\n// #end\n// #stage a\n// #end\n')).toThrow(/duplicate/)
    expect(() => new SourceIndex(buildTs).fingerprint('nope')).toThrow(/no "\/\/ #stage nope" block/)
  })
})
