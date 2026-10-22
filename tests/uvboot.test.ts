/** SPEC 63 CV-4b: boot.json carries nUvAtt and nEntries after the chain (build:data, then data:unlinked); the counters are labelled in the UI. Fixture-level. */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import EntryCounts from '../src/components/EntryCounts.vue'
import { patchBootUv, bootEntries } from '../pipelines/boot-uv.ts'
import { uvAttCount } from '../pipelines/build-parts.ts'

describe('CV-4b boot counters', () => {
  it('build:data writes boot without uv/meta.json (nUvAtt 0), data:unlinked then patches nUvAtt and nEntries atomically', () => {
    const d = mkdtempSync(join(tmpdir(), 'uvboot-'))
    expect(uvAttCount(d)).toEqual({ nUvAtt: 0 })
    writeFileSync(join(d, 'boot.json'), JSON.stringify({ format: 1, nLemmas: 10, nAttested: 100, nDictOnly: 20, nUvAtt: 0, nEntries: 120 }))
    mkdirSync(join(d, 'uv')); writeFileSync(join(d, 'uv', 'meta.json'), JSON.stringify({ format: 1, attested: 37745 }))
    const b = patchBootUv(d)!
    expect(b.nUvAtt).toBe(37745); expect(b.nEntries).toBe(100 + 20 + 37745)
    const disk = JSON.parse(readFileSync(join(d, 'boot.json'), 'utf8')); expect(disk).toMatchObject({ nUvAtt: 37745, nEntries: 37865, nAttested: 100 })
    expect(readdirSync(d).filter(f => f.endsWith('.tmp'))).toEqual([])
    expect(patchBootUv(d)).toEqual(b)   // idempotent
    expect(uvAttCount(d)).toEqual({ nUvAtt: 37745 })
  })
  it('no boot.json yet: nothing is written; no nAttested falls back to nLemmas', () => {
    expect(patchBootUv(mkdtempSync(join(tmpdir(), 'uvboot-')))).toBeNull()
    expect(bootEntries({ nLemmas: 5, nUvAtt: 2 })).toBe(7)
  })
  it('the build chain runs data:unlinked patching boot (source wiring)', () => {
    expect(readFileSync('pipelines/build-unlinked.ts', 'utf8')).toMatch(/patchBootUv\(pub\)/)
    expect(readFileSync('pipelines/build-parts.ts', 'utf8')).toMatch(/boot\.nEntries = bootEntries\(boot\)/)
  })
  it('the UI prints the three labelled parts; Corpus and Search show the total', async () => {
    const html = await renderToString(createSSRApp(EntryCounts, { corpus: { nAttested: 100, nDictOnly: 20, nUvAtt: 37745 } }))
    expect(html).toContain('100 засвідчені'); expect(html).toContain('20 лише словник'); expect(html).toMatch(/37.745 засвідчені, немає в словниках/)
    for (const v of ['src/views/CorpusView.vue', 'src/views/SearchView.vue']) { const s = readFileSync(v, 'utf8'); expect(s).toMatch(/EntryCounts/); expect(s).toMatch(/corpus\.nEntries/) }
  })
})
