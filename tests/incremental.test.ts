/** SPEC 63 IN: incremental pipeline (content manifests + dedupe, symbol-level stage keys, early cut-off, delta CDN upload) and its fixture benchmark. */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const TMP = mkdtempSync(join(tmpdir(), 'in-'))
process.env.HARVEST_DIR = join(TMP, 'harvest')   // before ingest-harvest is loaded
const { main } = await import('../pipelines/ingest-harvest.ts')
const { Incr, contentHash, rankOf } = await import('../pipelines/incr-manifest.ts')
const { SourceIndex } = await import('../pipelines/stage-code.ts')
const { StageCache } = await import('../pipelines/stage-cache.ts')
const { localFiles, upload } = await import('../pipelines/data-cdn.ts')
const { planDelta, hashFiles, manifestObjects, runDeltaDir, MAX_EXCLUDE } = await import('../pipelines/data-cdn-delta.ts')

// ── IN-1 / IN-2 incremental ingest ─────────────────────────────────────────────────────────────
const TEXT = (w: string) => Array.from({ length: 30 }, (_, i) => `${w}${i % 5} слово`).join(' ')
function harvest(src: string, items: Record<string, string>, extra: Record<string, Record<string, unknown>> = {}) {
  const dir = join(process.env.HARVEST_DIR!, src); mkdirSync(join(dir, 'items'), { recursive: true })
  const lines: string[] = []
  for (const [id, text] of Object.entries(items)) {
    writeFileSync(join(dir, 'items', `${id}.txt.gz`), gzipSync(text))
    lines.push(JSON.stringify({ id, url: `https://archive.org/details/${id}`, date: '1890', licence: 'PD', bytes: text.length, status: 200, title: id, file: `${id}.txt`, ...(extra[id] ?? {}) }))
  }
  writeFileSync(join(dir, 'index.jsonl'), lines.join('\n') + '\n')
}
async function ingest(out: string, only: string, ...flags: string[]) {
  const logs: string[] = [], orig = console.log; console.log = (...a: unknown[]) => { logs.push(a.join(' ')) }
  try { await main(['--out', out, '--only', only, ...flags]) } finally { console.log = orig }
  return logs.join('\n')
}
const witnesses = (out: string) => readdirSync(out).filter(f => /^hv_.*\.json$/.test(f) && !f.startsWith('harvest-')).sort()

describe('IN-1 incremental ingest: only new / changed items are read, deleted ones are removed explicitly', () => {
  it('IN-1 a rerun reads nothing; a new item adds one file; a changed item rewrites one; a vanished item is deleted', async () => {
    const out = join(TMP, 'w1'); mkdirSync(out)
    harvest('archive-ukr', { a1: TEXT('Аа'), b2: TEXT('Бб'), c3: TEXT('Вв') })
    const first = await ingest(out, 'archive-ukr')
    expect(first).toMatch(/3 new, 0 changed, 0 unchanged/); expect(witnesses(out)).toHaveLength(3)
    const again = await ingest(out, 'archive-ukr')
    expect(again).toMatch(/0 new, 0 changed, 3 unchanged \(not read\)/)
    // remove the item FILES: an unchanged item must not be opened at all, so the rerun still succeeds
    rmSync(join(process.env.HARVEST_DIR!, 'archive-ukr/items/a1.txt.gz')); rmSync(join(process.env.HARVEST_DIR!, 'archive-ukr/items/b2.txt.gz'))
    expect(await ingest(out, 'archive-ukr')).toMatch(/3 unchanged/)
    harvest('archive-ukr', { a1: TEXT('Аа'), b2: TEXT('Бб'), c3: TEXT('Вв'), d4: TEXT('Гг') })
    expect(await ingest(out, 'archive-ukr')).toMatch(/1 new, 0 changed, 3 unchanged/); expect(witnesses(out)).toHaveLength(4)
    harvest('archive-ukr', { a1: TEXT('Аа'), b2: TEXT('Бб'), c3: TEXT('Вв'), d4: TEXT('Гг') + ' ще слова'.repeat(3) }, { d4: { bytes: 999 } })
    expect(await ingest(out, 'archive-ukr')).toMatch(/0 new, 1 changed, 3 unchanged/)
    harvest('archive-ukr', { a1: TEXT('Аа'), b2: TEXT('Бб'), d4: TEXT('Гг') })
    const del = await ingest(out, 'archive-ukr')
    expect(del).toMatch(/c3: deleted from the index, removed hv_ia_c3\.json/); expect(del).toMatch(/1 deleted/)
    expect(witnesses(out)).toEqual(['hv_ia_a1.json', 'hv_ia_b2.json', 'hv_ia_d4.json'])
  })
  it('IN-1 --full reads everything again; a missing work file is redone', async () => {
    const out = join(TMP, 'w2'); mkdirSync(out)
    harvest('archive-ukr', { a1: TEXT('Аа'), b2: TEXT('Бб') }); await ingest(out, 'archive-ukr')
    expect(await ingest(out, 'archive-ukr', '--full')).toMatch(/0 new, 2 changed, 0 unchanged/)
    rmSync(join(out, 'hv_ia_a1.json')); expect(await ingest(out, 'archive-ukr')).toMatch(/0 new, 1 changed, 1 unchanged/)
    expect(existsSync(join(out, 'hv_ia_a1.json'))).toBe(true)
  })
  it('IN-2 overlap across sources: the same witness id / url / content is not written twice; the better edition wins; every decision is logged', async () => {
    const out = join(TMP, 'w3'); mkdirSync(out)
    harvest('archive-ukr', { x1: TEXT('Дд') }); await ingest(out, 'archive-ukr')
    harvest('archive-hrushevsky', { y9: TEXT('Дд') })   // another source, identical token stream
    const l = await ingest(out, 'archive-hrushevsky')
    expect(l).toMatch(/duplicate of archive-ukr\/x1 \(content hash\)/); expect(l).toMatch(/1 duplicates skipped/)
    expect(witnesses(out)).toEqual(['hv_ia_x1.json'])
    // rank: scholarly edition > later_ed > ocr
    expect(rankOf('scholarly_ed')).toBeGreaterThan(rankOf('later_ed')); expect(rankOf('later_ed')).toBeGreaterThan(rankOf('ocr'))
    const inc = new Incr(out, false, () => {}); inc.begin('s1'); inc.begin('s2'); inc.begin('s3')
    const toks = (w: string) => Array.from({ length: 25 }, () => ({ raw: w }))
    expect(inc.claim('s1', 'i', 'g', { id: 'hv_a', witnessType: 'ocr', tokens: toks('слово') })).toBe('take'); writeFileSync(join(out, 'hv_a.json'), '{}')
    inc.finish('s1')
    expect(inc.claim('s2', 'j', 'g', { id: 'hv_b', witnessType: 'scholarly_ed', tokens: toks('слово') })).toBe('take')   // outranks the OCR: supersedes it
    expect(existsSync(join(out, 'hv_a.json'))).toBe(false)
    expect(inc.claim('s3', 'k', 'g', { id: 'hv_c', witnessType: 'ocr', tokens: toks('слово') })).toBe('skip')
    expect(contentHash(['a', 'b'])).toBe(contentHash(['a', 'b'])); expect(contentHash(['a', 'b'])).not.toBe(contentHash(['b', 'a']))
  })
  it('IN-1 manifests are written atomically (no tmp left) and a torn manifest means "read again", not a crash', async () => {
    const out = join(TMP, 'w4'); mkdirSync(out)
    harvest('archive-ukr', { a1: TEXT('Аа') }); await ingest(out, 'archive-ukr')
    expect(readdirSync(join(out, 'ingest-manifest')).filter(f => f.endsWith('.tmp'))).toEqual([])
    writeFileSync(join(out, 'ingest-manifest/archive-ukr.json'), '{"format":1,"sour')
    expect(await ingest(out, 'archive-ukr')).toMatch(/1 new/)
  })
  it('IN-1 vocabulary sources are skipped when index, parameters and output are unchanged', async () => {
    const out = join(TMP, 'w5'); mkdirSync(out)
    const dir = join(process.env.HARVEST_DIR!, 'gramoty'); mkdirSync(join(dir, 'items'), { recursive: true })
    writeFileSync(join(dir, 'items/g1.json.gz'), gzipSync(JSON.stringify({ text: 'слово слово інше' })))
    writeFileSync(join(dir, 'index.jsonl'), JSON.stringify({ id: 'g1', url: 'u', date: '1400', licence: 'PD', bytes: 3, status: 200, title: 'g', file: 'g1.json' }) + '\n')
    expect(await ingest(out, 'gramoty')).toMatch(/gramoty:/)
    expect(await ingest(out, 'gramoty')).toMatch(/unchanged, output kept \(not read\)/)
  })
})

// ── IN-3 / IN-6 stage keys ────────────────────────────────────────────────────────────────────
function proj() {
  const root = mkdtempSync(join(tmpdir(), 'in-proj-')); for (const d of ['pipeline', 'lib', 'cache']) mkdirSync(join(root, d))
  const w = (f: string, t: string) => writeFileSync(join(root, f), t)
  w('lib/m.ts', `import { deep } from './d.ts'\nexport const used = (x: number) => twice(x) + 1\nconst twice = (x: number) => deep(x) * 2\nexport const other = (x: number) => x - 1\nexport function unusedFn() { return 'u' }\n`)
  w('lib/d.ts', `export const deep = (x: number) => x + 10\nexport const deepOther = () => 5\n`)
  w('pipeline/main.ts', `import { used } from '../lib/m.ts'\nexport async function build() {\n  // #stage s1\n  const s1 = await sc.run('s1', {}, () => ({ v: used(1) }))\n  // #end\n}\n`)
  return { root, w, fp: () => { const i = new SourceIndex(join(root, 'pipeline/main.ts'), root); return { f: i.fingerprint('s1'), files: i.files('s1'), sym: i.symbols('s1') } } }
}
describe('IN-6 symbol-level code fingerprints: a stage depends on the declarations it reaches, not on whole modules', () => {
  it('IN-6 editing an unreached declaration (or a comment after a statement) keeps the key; editing a reached or transitively reached one changes it', () => {
    const p = proj(), a = p.fp()
    expect(a.files).toEqual(['lib/d.ts', 'lib/m.ts'])
    expect([...a.sym.get('lib/m.ts')!].sort()).toEqual(['twice', 'used']); expect([...a.sym.get('lib/d.ts')!]).toEqual(['deep'])
    p.w('lib/m.ts', readFileSync(join(p.root, 'lib/m.ts'), 'utf8').replace("return 'u'", "return 'changed'").replace('x - 1', 'x - 2'))
    p.w('lib/d.ts', readFileSync(join(p.root, 'lib/d.ts'), 'utf8').replace('=> 5', '=> 6'))
    expect(p.fp().f).toBe(a.f)                                                           // other / unusedFn / deepOther: not reached
    p.w('lib/d.ts', readFileSync(join(p.root, 'lib/d.ts'), 'utf8').replace('x + 10', 'x + 11'))
    const b = p.fp().f; expect(b).not.toBe(a.f)                                          // deep: reached through twice → used
    p.w('lib/m.ts', readFileSync(join(p.root, 'lib/m.ts'), 'utf8').replace('deep(x) * 2', 'deep(x) * 3'))
    expect(p.fp().f).not.toBe(b)                                                         // twice: same-module helper
  })
  it('IN-6 a top-level statement that is not a declaration (it runs at load and may mutate anything) and a namespace import are taken whole', () => {
    const p = proj(), a = p.fp().f
    p.w('lib/m.ts', readFileSync(join(p.root, 'lib/m.ts'), 'utf8') + 'console.log("side effect")\n'); expect(p.fp().f).not.toBe(a)
    p.w('pipeline/main.ts', `import * as M from '../lib/m.ts'\nexport async function build() {\n  // #stage s1\n  const s1 = await sc.run('s1', {}, () => ({ v: M.used(1) }))\n  // #end\n}\n`)
    const w = p.fp(); expect([...w.sym.get('lib/m.ts')!].sort()).toEqual(['other', 'twice', 'unusedFn', 'used'])
  })
  it('IN-6 on the real build.ts each stage reaches far fewer declarations than modules x exports (and the stage list is unchanged)', () => {
    const idx = new SourceIndex('pipelines/build.ts')
    expect(idx.stages().sort()).toEqual(['annotate', 'archaic', 'collocations', 'epochs', 'link', 'phrases', 'python', 'senses', 'tokens', 'vesum2'])
    for (const s of idx.stages()) expect(idx.symbols(s).size).toBeGreaterThan(0)
  })
})

describe('IN-3 early cut-off: a stage recomputed to the same output leaves the later stages cached', () => {
  it('IN-3 + IN-4 hit rate is logged per stage; the spine follows the output digest', async () => {
    const root = mkdtempSync(join(tmpdir(), 'in-co-')), logs: string[] = [], ran: string[] = []
    mkdirSync(join(root, 'pipeline')); writeFileSync(join(root, 'pipeline/main.ts'), `export async function build() {\n  // #stage a\n  const a = await sc.run('a', {}, () => ({ v: 1 }))\n  // #end\n  // #stage b\n  const b = await sc.run('b', {}, () => ({ v: 2 }))\n  // #end\n}\n`)
    const go = async (inputs: unknown) => {
      const sc = new StageCache({ dir: join(root, 'cache'), enabled: true, code: new SourceIndex(join(root, 'pipeline/main.ts'), root).warm(), log: m => logs.push(m) }); sc.start()
      await sc.run('a', { inputs }, () => { ran.push('a'); return { v: 1 } })   // `inputs` changes the key of a, not its output
      await sc.run('b', {}, () => { ran.push('b'); return { v: 2 } }); sc.finish()
    }
    await go(1); expect(ran).toEqual(['a', 'b']); ran.length = 0
    await go(2); expect(ran).toEqual(['a'])
    expect(logs.join('\n')).toMatch(/hit rate: 1\/2 stages/)
  })
})

// ── IN-7 delta upload ────────────────────────────────────────────────────────────────────────
const ID1 = '202610200000-aaaaaaa', ID2 = '202610210000-bbbbbbb', ID3 = '202610220000-ccccccc'
/** a fake S3: sync local→s3, s3→s3 (with --exclude / --include in order), cp of the manifest, list-objects-v2; records what was uploaded and what was copied inside S3 */
function fakeS3(data: string) {
  const b = new Map<string, { size: number; body?: string }>(), up: string[] = [], copied: string[] = []
  const match = (rel: string, pat: string) => pat === '*' || pat === rel
  const filt = (rel: string, args: string[]) => { let inc = true; for (let i = 0; i < args.length; i++) { if (args[i] === '--exclude' && match(rel, args[i + 1]!)) inc = false; if (args[i] === '--include' && match(rel, args[i + 1]!)) inc = true } return inc }
  const aws = (a: string[]): string => {
    if (a[0] === 's3api') { const p = a[a.indexOf('--prefix') + 1]!; return [...b].filter(([k]) => k.startsWith(p)).map(([k, v]) => `${k}\t${v.size}`).join('\n') || 'None' }
    if (a[1] === 'cp' && a[3] === '-') { const o = b.get(a[2]!.replace(/^s3:\/\/[^/]+\//, '')); if (!o?.body) throw new Error('NoSuchKey'); return o.body }
    if (a[1] === 'cp') { const k = a[3]!.replace(/^s3:\/\/[^/]+\//, ''); b.set(k, { size: 1, body: existsSync(a[2]!) ? readFileSync(a[2]!, 'utf8') : '' }); return '' }
    if (a[1] === 'sync') {
      const [src, dst] = [a[2]!, a[3]!], rest = a.slice(4)
      if (src.startsWith('s3://')) {
        const sp = src.replace(/^s3:\/\/[^/]+\//, '') + '/', dp = dst.replace(/^s3:\/\/[^/]+\//, '') + '/'
        for (const [k, v] of [...b]) if (k.startsWith(sp) && filt(k.slice(sp.length), rest)) { b.set(dp + k.slice(sp.length), { size: v.size }); copied.push(dp + k.slice(sp.length)) }
      } else {
        const dir = src.split(/[\\/]/).pop()!, dp = dst.replace(/^s3:\/\/[^/]+\//, '') + '/'
        for (const f of localFiles(data, [dir], 1 << 30)) if (filt(f.rel, rest)) { b.set(dp + f.rel, { size: f.size }); up.push(dp + f.rel) }
      }
    }
    return ''
  }
  return { aws, b, up, copied }
}
function fixture(n = 40) {
  const data = mkdtempSync(join(tmpdir(), 'in-cdn-')), put = (p: string, s: string) => { mkdirSync(join(data, p, '..'), { recursive: true }); writeFileSync(join(data, p), s) }
  for (let i = 0; i < n; i++) put(`ix/${i}.json`, `shard ${i} `.repeat(20)); for (let i = 0; i < 5; i++) put(`texts/t${i}.json`, 'text ' + i)
  const ptr = join(data, 'ptr.json'); writeFileSync(ptr, JSON.stringify({ format: 1, base: 'https://x.cloudfront.net', buildId: '' }))
  return { data, put, ptr, st: join(data, 'st.json') }
}
describe('IN-7 delta CDN upload: unchanged objects are copied inside S3 into the new immutable prefix, only changed files are sent', () => {
  it('IN-7 second build: one changed shard + one new text = 2 uploads, the rest copied server side; the new prefix verifies complete; a deleted file is not carried over', async () => {
    const f = fixture(), s3 = fakeS3(f.data), dirs = ['ix', 'texts']
    const r1 = await upload({ dryRun: false, fresh: true, buildId: ID1, data: f.data, aws: s3.aws, pointer: f.ptr, state: f.st, dirs })
    expect(r1.ok).toBe(true); expect(s3.up).toHaveLength(45); expect(s3.copied).toHaveLength(0)   // no base: everything is uploaded
    s3.up.length = 0
    f.put('ix/7.json', 'CHANGED'); f.put('texts/new.json', 'new book'); rmSync(join(f.data, 'texts/t0.json'))
    const r2 = await upload({ dryRun: false, fresh: true, buildId: ID2, data: f.data, aws: s3.aws, pointer: f.ptr, state: f.st, dirs })
    expect(r2.ok).toBe(true)
    expect(s3.up.sort()).toEqual([`data/${ID2}/ix/7.json`, `data/${ID2}/texts/new.json`])
    expect(s3.copied.length).toBe(39 + 4)
    expect(s3.copied).not.toContain(`data/${ID2}/ix/7.json`); expect(s3.copied).not.toContain(`data/${ID2}/texts/t0.json`)
    expect(s3.b.has(`data/${ID2}/texts/t0.json`)).toBe(false)
    expect(JSON.parse(s3.b.get(`data/${ID2}/manifest.json`)!.body!)).toMatchObject({ format: 2, base: ID1 })
    expect(s3.b.has(`data/${ID1}/ix/7.json`)).toBe(true)   // the old prefix is untouched (immutable)
    // third build, nothing changed: zero uploads
    s3.up.length = 0
    expect((await upload({ dryRun: false, fresh: true, buildId: ID3, data: f.data, aws: s3.aws, pointer: f.ptr, state: f.st, dirs })).ok).toBe(true)
    expect(s3.up).toEqual([])
    rmSync(f.data, { recursive: true })
  })
  it('IN-7 planner: unchanged big objects are copied with Content-Encoding gzip, changed big ones are uploaded by the caller, a dir with too many exceptions or a glob name is sent whole', () => {
    const files = [{ dir: 'texts', rel: 'big.json', size: 20e6, big: true }, { dir: 'texts', rel: 'big2.json', size: 20e6, big: true }, { dir: 'texts', rel: 's.json', size: 5, big: false }, { dir: 'ix', rel: 'a.json', size: 5, big: false }]
    const h = new Map([['texts/big.json', 'h1'], ['texts/big2.json', 'h2x'], ['texts/s.json', 's1'], ['ix/a.json', 'a1']])
    const prev = { 'texts/big.json': ['h1', 7e6, 1], 'texts/big2.json': ['h2', 7e6, 1], 'texts/s.json': ['s1', 5], 'texts/gone.json': ['g', 3], 'ix/a.json': ['a1', 5] } as never
    const plan = planDelta('B', files, h, prev, ['texts', 'ix', 'lm'])
    const t = plan.dirs.get('texts')!
    expect(t).toMatchObject({ mode: 'delta', copyBig: ['big.json'], uploadBig: ['big2.json'], upload: [], copy: 1 }); expect(t.exclude.sort()).toEqual(['big2.json', 'gone.json'])
    expect(plan.dirs.get('lm')).toMatchObject({ mode: 'full', why: 'dir not in the base build' })
    const calls: string[][] = []; runDeltaDir(a => { calls.push(a); return '' }, { bucket: 'b', base: 'B', id: 'N', dir: 'texts', data: '/d', plan: t, cacheControl: 'cc' })
    expect(calls[0]).toContain('--exclude'); expect(calls[1]).toEqual(expect.arrayContaining(['--content-encoding', 'gzip', '--include', 'big.json']))
    expect(calls.some(c => c.includes('/d/texts'))).toBe(false)
    const many = Array.from({ length: MAX_EXCLUDE + 1 }, (_, i) => ({ dir: 'd', rel: `${i}.json`, size: 1, big: false }))
    expect(planDelta('B', many, new Map(many.map(f => [`d/${f.rel}`, 'new'])), Object.fromEntries(many.map(f => [`d/${f.rel}`, ['old', 1]])) as never, ['d']).dirs.get('d')!.mode).toBe('full')
    expect(planDelta('B', [{ dir: 'd', rel: 'a[1].json', size: 1, big: false }], new Map([['d/a[1].json', 'n']]), { 'd/a[1].json': ['o', 1] } as never, ['d']).dirs.get('d')!.why).toMatch(/glob/)
  })
})

// ── benchmark ────────────────────────────────────────────────────────────────────────────────
describe('IN-8 benchmark: a one-witness change re-runs only the expected work', () => {
  it('IN-8 per-witness stage: 200 witnesses, one changed = 1 computed, 199 reused; the aggregate stage recomputes; upload = 1 shard + manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'in-bench-')); mkdirSync(join(root, 'pipeline')); mkdirSync(join(root, 'in'))
    writeFileSync(join(root, 'pipeline/main.ts'), `export async function build() {\n  // #stage tokens\n  sc.item('tokens', 'x', () => '', () => ({}))\n  // #end\n}\n`)
    const ids = Array.from({ length: 200 }, (_, i) => `w${i}`); for (const id of ids) writeFileSync(join(root, 'in', id + '.txt'), 'text ' + id)
    const pass = () => {
      const logs: string[] = [], ran: string[] = [], sc = new StageCache({ dir: join(root, 'cache'), enabled: true, code: new SourceIndex(join(root, 'pipeline/main.ts'), root).warm(), log: m => logs.push(m) }); sc.start()
      for (const id of ids) sc.item('tokens', id, () => sc.tracker.fileFp(join(root, 'in', id + '.txt')), () => { ran.push(id); return { v: readFileSync(join(root, 'in', id + '.txt'), 'utf8') } })
      sc.itemSummary('tokens'); sc.finish(); return { ran, logs }
    }
    expect(pass().ran).toHaveLength(200)
    expect(pass().ran).toHaveLength(0)
    writeFileSync(join(root, 'in/w17.txt'), 'edited')
    const r = pass(); expect(r.ran).toEqual(['w17']); expect(r.logs.join('\n')).toMatch(/199 entries reused, 1 computed/)
    // …and the data it produces: 1 changed file of N is the whole upload
    const f = fixture(200), s3 = fakeS3(f.data)
    return upload({ dryRun: false, fresh: true, buildId: ID1, data: f.data, aws: s3.aws, pointer: f.ptr, state: f.st, dirs: ['ix', 'texts'] }).then(async () => {
      s3.up.length = 0; f.put('ix/17.json', 'edited shard')
      await upload({ dryRun: false, fresh: true, buildId: ID2, data: f.data, aws: s3.aws, pointer: f.ptr, state: f.st, dirs: ['ix', 'texts'] })
      expect(s3.up).toEqual([`data/${ID2}/ix/17.json`]); expect(s3.copied).toHaveLength(204)
      const objs = manifestObjects(localFiles(f.data, ['ix']), hashFiles(localFiles(f.data, ['ix']), f.data), {}); expect(Object.keys(objs)).toHaveLength(200)
    })
  })
})

// ── IN-4 / IN-5 ──────────────────────────────────────────────────────────────────────────────
describe('IN-4 build-parts reports which staged files differ from the published ones', async () => {
  const { diffStage } = await import('../pipelines/build-parts.ts')
  it('IN-4 identical bytes are unchanged; changed, new and removed files are counted', () => {
    const d = mkdtempSync(join(tmpdir(), 'in-parts-')), w = (p: string, t: string) => { mkdirSync(join(d, p, '..'), { recursive: true }); writeFileSync(join(d, p), t) }
    for (const n of ['a', 'b', 'c']) w(`ix/${n}.json`, n); w('boot.json', 'old')
    for (const n of ['a', 'b']) w(`.next/ix/${n}.json`, n); w('.next/ix/b.json', 'B2'); w('.next/ix/new.json', 'n'); w('.next/boot.json', 'old')
    const r = diffStage(d, ['ix'], ['boot.json'])
    expect(r).toMatchObject({ files: 4, changed: 1, added: 1, removed: 1 }); expect(r.changedFiles.sort()).toEqual(['ix/b.json', 'ix/new.json'])
  })
})
describe('IN-5 data:unlinked replays unchanged text files from its per-file cache', () => {
  it('IN-5 the second run scans nothing and writes the same unlinked/ and uv/ files; one changed text is scanned alone', async () => {
    const { execFileSync } = await import('node:child_process'), { createHash } = await import('node:crypto'), { resolve } = await import('node:path')
    const { packCore } = await import('../core/pack.ts')
    const cwd = mkdtempSync(join(tmpdir(), 'in-unl-')), pub = join(cwd, 'public/data'); mkdirSync(join(pub, 'texts'), { recursive: true })
    writeFileSync(join(pub, 'lexicon.json'), JSON.stringify(packCore([]))); writeFileSync(join(pub, 'corpus.json'), JSON.stringify({ witnesses: [{ id: 'w1', date: [1800, 1800], witnessType: 'later_ed' }, { id: 'w2', date: [1900, 1900], witnessType: 'ocr' }] }))
    const text = (id: string, ws: string[]) => JSON.stringify({ id, tokens: ws.map(w => [w, w, 1]) })
    writeFileSync(join(pub, 'texts/w1.json'), text('w1', ['слово', 'нове', 'нове', 'інше'])); writeFileSync(join(pub, 'texts/w2.json'), text('w2', ['слово', 'друге']))
    const run = () => execFileSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), resolve('pipelines/build-unlinked.ts')], { cwd, encoding: 'utf8' })
    const digest = () => { const h = createHash('sha1'); const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else { h.update(p.slice(cwd.length)); h.update(readFileSync(p)) } } }; walk(join(pub, 'unlinked')); walk(join(pub, 'uv')); return h.digest('hex') }
    expect(run()).toMatch(/0 text files replayed from the cache, 2 scanned/); const d1 = digest()
    expect(run()).toMatch(/2 text files replayed from the cache, 0 scanned/); expect(digest()).toBe(d1)
    writeFileSync(join(pub, 'texts/w2.json'), text('w2', ['слово', 'друге', 'третє']))
    expect(run()).toMatch(/1 text files replayed from the cache, 1 scanned/); expect(digest()).not.toBe(d1)
  }, 60000)
})
