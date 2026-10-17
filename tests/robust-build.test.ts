/** SPEC 63 RS-1: crash tolerance of the build stages (python stage, work files, atomic JSON). */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, utimesSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isFresh, readJson, runLogged, writeJsonAtomic } from '../pipelines/robust.ts'
import { loadWitnesses } from '../pipelines/build.ts'

const tmp = () => mkdtempSync(join(tmpdir(), 'rs1b-'))

describe('RS-1 build helpers', () => {
  it('RS-1 readJson names the file for a truncated JSON and for a missing one', () => {
    const d = tmp(); writeFileSync(join(d, 'a.json'), '{"x":')
    expect(() => readJson(join(d, 'a.json'))).toThrow(/a\.json is not valid JSON/)
    expect(() => readJson(join(d, 'none.json'))).toThrow(/cannot read .*none\.json/)
  })
  it('RS-1 writeJsonAtomic leaves no tmp file', () => {
    const d = tmp(); writeJsonAtomic(join(d, 'x.json'), '[1]'); expect(readFileSync(join(d, 'x.json'), 'utf8')).toBe('[1]'); expect(readdirSync(d)).toEqual(['x.json'])
  })
  it('RS-1 a python-stage failure rejects with the log tail (not swallowed)', async () => {
    const d = tmp(), log = join(d, 'py.log')
    await expect(runLogged(process.execPath, ['-e', 'console.error("boom-line"); process.exit(3)'], { cwd: d, log })).rejects.toThrow(/exited 3[\s\S]*boom-line/)
    await expect(runLogged('definitely-not-a-binary-xyz', [], { cwd: d, log })).rejects.toThrow(/failed to start/)
  })
  it('RS-1 a verbose child (more than any maxBuffer) is streamed to the log, not buffered', async () => {
    const d = tmp(), log = join(d, 'big.log')
    await runLogged(process.execPath, ['-e', 'for(let i=0;i<20000;i++)console.error("warning line "+i+" "+"x".repeat(100))'], { cwd: d, log })
    expect(readFileSync(log, 'utf8').length).toBeGreaterThan(2_000_000)
  })
  it('RS-1 freshness: a stale or missing stress.json is not fresh', () => {
    const d = tmp(), out = join(d, 'stress.json'), req = join(d, 'stress-request.json')
    writeFileSync(req, '[]'); expect(isFresh(out, req)).toBe(false)
    writeFileSync(out, '{}'); utimesSync(out, new Date(Date.now() - 60_000), new Date(Date.now() - 60_000)); expect(isFresh(out, req)).toBe(false)
    utimesSync(out, new Date(Date.now() + 5_000), new Date(Date.now() + 5_000)); expect(isFresh(out, req)).toBe(true)
  })
  it('RS-1 a truncated work file is fatal (the corpus must not shrink silently) unless explicitly allowed', () => {
    const d = tmp(); writeFileSync(join(d, 'w1.json'), '{"id":"w1","tok')
    expect(() => loadWitnesses(d)).toThrow(/w1\.json: unreadable/)
    process.env['BULP_ALLOW_UNREADABLE'] = '1'
    try { expect(loadWitnesses(d)).toEqual([]) } finally { delete process.env['BULP_ALLOW_UNREADABLE'] }
  })
  it('RS-1 the python scripts write via tmp + os.replace', () => {
    for (const f of ['nlp/stress.py', 'nlp/russian_check.py']) expect(readFileSync(f, 'utf8')).toMatch(/os\.replace\(tmp, dest\)/)
    expect(existsSync('nlp/stress.py')).toBe(true)
  })
})

describe('RS-1 scan: no new direct writes to final paths', () => {
  // ratchet: the files below still call writeFileSync directly (to be moved to writeAtomic/writeJsonAtomic); a new file, or more calls in a file, fails
  const BASELINE: Record<string, number> = {
  'pipelines/atlas-extract.ts': 1,
  'pipelines/atlas-site.ts': 1,
  'pipelines/bq.ts': 1,
  'pipelines/build-archaic.ts': 1,
  'pipelines/build-autolabel.ts': 2,
  'pipelines/build-cognates.ts': 1,
  'pipelines/build-cv.ts': 2,
  'pipelines/build-etymology.ts': 1,
  'pipelines/build-extras.ts': 4,
  'pipelines/build-mu.ts': 1,
  'pipelines/build-parts.ts': 3,
  'pipelines/build-phrases.ts': 2,
  'pipelines/build-r2u.ts': 1,
  'pipelines/build-texts.ts': 1,
  'pipelines/build-torot.ts': 1,
  'pipelines/build-unlinked.ts': 5,
  'pipelines/build-usage.ts': 1,
  'pipelines/cognates.ts': 1,
  'pipelines/data-cdn.ts': 3,
  'pipelines/dialect-literature.ts': 1,
  'pipelines/etymology.ts': 2,
  'pipelines/fixture.ts': 3,
  'pipelines/loan-labels.ts': 1,
  'pipelines/lt.ts': 1,
  'pipelines/merge-lch.ts': 2,
  'pipelines/phraseology-wikt.ts': 1,
  'pipelines/sense-audit.ts': 1,
  'pipelines/senses-wikt.ts': 1,
  'pipelines/usage-wikt.ts': 1,
  'pipelines/yat-interchange.ts': 1,
  }
  it('RS-1 harvest/ and pipelines/ do not gain direct writeFileSync calls', async () => {
    const { readdirSync } = await import('node:fs')
    const found: Record<string, number> = {}
    for (const d of ['harvest', 'pipelines']) for (const f of readdirSync(d)) {
      if (!f.endsWith('.ts') || ['lib.ts', 'robust.ts', 'stage-cache.ts'].includes(f)) continue
      const n = (readFileSync(`${d}/${f}`, 'utf8').match(/writeFileSync\(/g) ?? []).length
      if (n) found[`${d}/${f}`] = n
    }
    for (const [f, n] of Object.entries(found)) expect(n, `${f}: use writeAtomic / writeJsonAtomic (RS-1)`).toBeLessThanOrEqual(BASELINE[f] ?? 0)
  })
})
