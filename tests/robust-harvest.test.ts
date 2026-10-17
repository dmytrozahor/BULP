/** SPEC 63 RS-1: crash tolerance of the harvesters (torn lines, retries, bans, degraded lemma lists). Offline: fetch is stubbed. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TMP = mkdtempSync(join(tmpdir(), 'rs1h-'))
process.env.HARVEST_DIR = join(TMP, 'harvest')
const { Harvest, writeAtomic } = await import('../harvest/lib.ts')
const r2u = await import('../harvest/r2u.ts')

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('RS-1 harvest: kill tolerance', () => {
  it('RS-1 writeAtomic leaves no tmp file and replaces the target whole', () => {
    const p = join(TMP, 'a.json'); writeAtomic(p, 'one'); writeAtomic(p, 'two')
    expect(readFileSync(p, 'utf8')).toBe('two'); expect(readdirSync(TMP).filter(f => f.endsWith('.tmp'))).toEqual([])
  })
  it('RS-1 a torn index tail is terminated, so the next append is not glued onto the fragment', () => {
    const h = new Harvest('rs1', { delayMs: 0 })
    h.put('b1', 'x', [{ id: 'a:1', url: 'u', date: null, licence: 'PD', bytes: 1, status: 200, title: 'T' }])
    const idx = join(TMP, 'harvest/rs1/index.jsonl')
    writeFileSync(idx, readFileSync(idx, 'utf8') + '{"id":"a:2","ur')
    const h2 = new Harvest('rs1', { delayMs: 0 })
    h2.put('b2', 'y', [{ id: 'a:3', url: 'u', date: null, licence: 'PD', bytes: 1, status: 200, title: 'T3' }])
    const h3 = new Harvest('rs1', { delayMs: 0 })
    expect(h3.has('a:1')).toBe(true); expect(h3.has('a:3')).toBe(true); expect(h3.has('a:2')).toBe(false)
  })
  it('RS-1 r2u: a torn last index line is skipped, not a crash', () => {
    const idx = join(TMP, 'r2u-index.jsonl')
    writeFileSync(idx, '{"q":"вода"}\n{"q":"земля"}\n{"q":"хл')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect([...r2u.doneQueries(idx)]).toEqual(['вода', 'земля'])
    expect(r2u.doneQueries(join(TMP, 'none.jsonl')).size).toBe(0)
  })
  it('RS-1 r2u: the next page number is max existing + 1, never an existing page', () => {
    const pages = join(TMP, 'pages'); mkdirSync(pages)
    expect(r2u.nextFileNumber(pages, 7)).toBe(7)
    writeFileSync(join(pages, '00041.html.gz'), ''); writeFileSync(join(pages, '00003.html.gz'), '')
    expect(r2u.nextFileNumber(pages, 3)).toBe(42)
  })
  it('RS-1 r2u lemmaList: an unreadable lexicon.json gives the VESUM order but is NOT cached as final', async () => {
    const lex = join(TMP, 'lexicon.json'), cache = join(TMP, 'lemmas.txt')
    writeFileSync(lex, '{"truncat')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await r2u.lemmaList({ cache, lexicon: lex })
    expect(existsSync(cache)).toBe(false)
  })
})

describe('RS-1 harvest: get() retries and bans', () => {
  const exitErr = () => vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as never)
  it('RS-1 a 503 then a 200 is retried with backoff, the crawl goes on', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const h = new Harvest('rs1get', { delayMs: 0, retryBaseMs: 1 })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect((await h.getText('http://x/')).text).toBe('ok'); expect(f).toHaveBeenCalledTimes(2)
  })
  it('RS-1 network errors are retried, then the crawl stops with STOPPED.json (not a crash)', async () => {
    const f = vi.fn().mockRejectedValue(new Error('ECONNRESET')); vi.stubGlobal('fetch', f)
    vi.spyOn(console, 'log').mockImplementation(() => {}); exitErr()
    const h = new Harvest('rs1net', { delayMs: 0, retryBaseMs: 1, retries: 3 })
    await expect(h.getText('http://x/')).rejects.toThrow('exit')
    expect(f).toHaveBeenCalledTimes(3)
    expect(JSON.parse(readFileSync(join(TMP, 'harvest/rs1net/STOPPED.json'), 'utf8')).reason).toMatch(/network failure/)
  })
  it('RS-1 403/429 stops at once (a ban is never retried)', async () => {
    const f = vi.fn().mockResolvedValue(new Response('', { status: 429 })); vi.stubGlobal('fetch', f)
    vi.spyOn(console, 'log').mockImplementation(() => {}); exitErr()
    const h = new Harvest('rs1ban', { delayMs: 0, retryBaseMs: 1 })
    await expect(h.getText('http://x/')).rejects.toThrow('exit'); expect(f).toHaveBeenCalledTimes(1)
  })
  it('RS-1 launch.sh keeps STOPPED.json of a 403/429 ban during the cool-down', () => {
    const sh = readFileSync('harvest/launch.sh', 'utf8')
    expect(sh).toMatch(/HTTP \(403\|429\)/); expect(sh).toMatch(/COOLDOWN_H/); expect(sh).not.toMatch(/rm -f "\$dir\/STOPPED\.json"/)
  })
})

describe('RS-1 data branch and authors', async () => {
  const { publishWith, swapDirs } = await import('../pipelines/data-branch.ts')
  const O = { remote: 'origin', branch: 'b', data: '/x', dirs: ['lex'] }
  it('RS-1 a network failure on fetch is rethrown, not treated as a missing branch (no root commit)', () => {
    const calls: string[][] = []
    const run = (a: string[]) => { calls.push(a); if (a[0] === 'fetch') throw new Error('fatal: unable to access: Could not resolve host'); return '' }
    expect(() => publishWith(run, '/i', O)).toThrow(/not a missing branch/)
    expect(calls.some(c => c[0] === 'commit-tree' || c[0] === 'push')).toBe(false)
  })
  it('RS-1 swapDirs: a failure mid-swap restores the old dirs', () => {
    const d = mkdtempSync(join(tmpdir(), 'sw-')), next = join(d, '.pull-next')
    mkdirSync(join(d, 'lex')); writeFileSync(join(d, 'lex/a'), 'old'); mkdirSync(join(d, 'texts')); writeFileSync(join(d, 'texts/a'), 'oldT')
    mkdirSync(join(next, 'lex'), { recursive: true }); writeFileSync(join(next, 'lex/a'), 'new')
    swapDirs(d, next, ['lex', 'texts'])
    expect(readFileSync(join(d, 'lex/a'), 'utf8')).toBe('new'); expect(readFileSync(join(d, 'texts/a'), 'utf8')).toBe('oldT'); expect(existsSync(join(d, '.pull-old'))).toBe(false)
  })
  it('RS-1 swapDirs: leftovers of a pull that died mid-swap are restored first', () => {
    const d = mkdtempSync(join(tmpdir(), 'sw-')); mkdirSync(join(d, '.pull-old/lex'), { recursive: true }); writeFileSync(join(d, '.pull-old/lex/a'), 'orig')
    mkdirSync(join(d, 'next'), { recursive: true })
    swapDirs(d, join(d, 'next'), ['lex'])
    expect(readFileSync(join(d, 'lex/a'), 'utf8')).toBe('orig')
  })
})

describe('RS-1 build-parts: required sidecars and staged swap', async () => {
  const { readSidecar, commitStage, OPTIONAL_SIDECARS } = await import('../pipelines/build-parts.ts')
  it('RS-1 a missing required sidecar is fatal, an optional one is undefined, a truncated one names the file', () => {
    const d = mkdtempSync(join(tmpdir(), 'bp-'))
    expect(() => readSidecar(d, 'etymology.json')).toThrow(/etymology\.json is missing/)
    expect(readSidecar(d, 'cardindex.json')).toBeUndefined()
    writeFileSync(join(d, 'senses.json'), '{"a":'); expect(() => readSidecar(d, 'senses.json')).toThrow(/senses\.json is unreadable/)
    expect(OPTIONAL_SIDECARS).toEqual(['cardindex.json', 'phrases.json', 'archaic.json'])
  })
  it('RS-1 commitStage swaps whole dirs in; the old dir survives until then', () => {
    const d = mkdtempSync(join(tmpdir(), 'bp-')); mkdirSync(join(d, 'ix')); writeFileSync(join(d, 'ix/old'), 'o')
    mkdirSync(join(d, '.next/ix'), { recursive: true }); writeFileSync(join(d, '.next/ix/new'), 'n'); writeFileSync(join(d, '.next/boot.json'), '{}')
    expect(existsSync(join(d, 'ix/old'))).toBe(true)   // before the commit nothing was deleted
    commitStage(d, ['ix'], ['boot.json'])
    expect(readdirSync(join(d, 'ix'))).toEqual(['new']); expect(existsSync(join(d, 'boot.json'))).toBe(true); expect(existsSync(join(d, '.next'))).toBe(false)
  })
})
