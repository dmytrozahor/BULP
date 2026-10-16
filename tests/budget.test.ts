/**
 * SPEC 63 PF-1 / PF-2 — the transfer budgets, measured on the BUILT site (dist/, run `npm run build` first; skipped when dist/ or the part shards are absent):
 * first load ≤ 500 KB, a word card ≤ 300 KB, a search keystroke ≤ 64 KB (gzip, bytes the browser would fetch), plus the guards that keep the whole-file downloads out.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { BUDGET, IX_GZ_MAX, ixLeaf, ixName, ixPad, lemmaPageUrl, LM_NAMES } from '../core/parts.ts'
import { kb, measureCard, measureHome, measureKeystroke } from '../pipelines/budget.ts'

const DIST = 'dist'
const built = existsSync(join(DIST, 'index.html')) && existsSync(join(DIST, 'data', 'ix', 'index.json')) && existsSync(join(DIST, 'data', 'cd')) && existsSync(join(DIST, 'data', 'lex'))

describe.skipIf(!built)('PF-2 budgets on dist/', () => {
  it('first load (HTML + JS + CSS + data) ≤ 500 KB', () => {
    const m = measureHome(DIST)
    console.log(`home ${kb(m.bytes)}`, m.files.slice(0, 6).map(f => `${f.file.replace(/^.*[\\/]/, '')} ${kb(f.gz)}`).join(' · '))
    expect(m.bytes).toBeLessThanOrEqual(BUDGET.firstLoad)
  })
  it('a word card ≤ 300 KB on top of the home page, and a deep link to it ≤ 500 KB as a first load (core + detail + witness + sidecar shards + the card route)', () => {
    let worst = 0, cold = 0, n = 0
    for (const l of ['князь', 'вода', 'слово', 'земля', 'бути', 'він', 'і', 'Київ', 'господь', 'рука']) {
      let m
      try { m = measureCard(DIST, l) } catch { continue }   // a lemma absent from the data
      console.log(`card ${l}: +${kb(m.bytes)}, deep link ${kb(m.cold)}`)
      worst = Math.max(worst, m.bytes); cold = Math.max(cold, m.cold); n++
    }
    expect(n).toBeGreaterThan(2)
    expect(worst).toBeLessThanOrEqual(BUDGET.card)
    expect(cold).toBeLessThanOrEqual(BUDGET.firstLoad)
  })
  it('a search keystroke ≤ 64 KB (prefix shards + the core cards of the first rows)', async () => {
    const m = await measureKeystroke(DIST, 'кня')
    console.log(`keystroke ${kb(m.bytes)}`, m.files.slice(0, 5).map(f => `${f.file.replace(/^.*[\\/]/, '')} ${kb(f.gz)}`).join(' · '))
    expect(m.results).toBeGreaterThan(0)
    expect(m.bytes).toBeLessThanOrEqual(BUDGET.keystroke)
  })
  it('every ix shard is ≤ the split limit gzipped (two of them stay inside a keystroke), and every key maps to a leaf of the manifest', () => {
    const man = JSON.parse(readFileSync(join(DIST, 'data', 'ix', 'index.json'), 'utf8')) as { leaves: [string, number][] }
    const leaves = new Set(man.leaves.map(l => l[0]))
    let worst = 0
    for (const [p] of man.leaves) worst = Math.max(worst, gzipSync(readFileSync(join(DIST, 'data', 'ix', ixName(p) + '.json')), { level: 6 }).length)
    console.log(`ix: ${leaves.size} shards, worst ${kb(worst)}`)
    expect(worst).toBeLessThanOrEqual(IX_GZ_MAX * 1.15)   // the build measures with its own gzip level
    const sample = JSON.parse(readFileSync(join(DIST, 'data', 'ix', ixName([...leaves][0]!) + '.json'), 'utf8')) as { rows: Record<string, unknown> }
    for (const k of Object.keys(sample.rows).slice(0, 20)) expect(ixLeaf(k, leaves)).toBe([...leaves].find(p => ixPad(k, [...p].length) === p))
  })
  it('the paged lemma list exists page by page', () => {
    expect(existsSync(join(DIST, 'data', lemmaPageUrl(1).replace(/^\.\/data\//, '')))).toBe(true)
  })
  it('the service worker is shipped', () => { expect(existsSync(join(DIST, 'sw.js'))).toBe(true) })
})

/** PF-1: no view downloads a whole sharded file. Every `./data/<name>.json` fetched by the source must be small or an explicit list-page exception. */
describe('PF-1 no whole-file downloads of the sharded data', () => {
  const SRC: string[] = []
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(ts|vue)$/.test(f) && SRC.push(p) } }
  walk('src')
  const text = SRC.map(f => readFileSync(f, 'utf8')).join('\n')
  const whole = [
    ...text.matchAll(/fetch\(\s*['`]\.\/data\/([A-Za-z0-9_-]+)\.json['`]/g), ...text.matchAll(/\bonce(?:<[^>]*>)?\(\s*'([A-Za-z0-9_-]+)'/g),
    ...readFileSync('src/composables/useData.ts', 'utf8').matchAll(/\bget\(\s*'([A-Za-z0-9_-]+)'\s*\)/g),
  ].map(m => m[1]!)
  const FORBIDDEN = ['lexicon', 'lexindex', 'cardindex', 'light', 'archaic', 'torot', 'etymology', 'cognates', 'senses', 'usage', 'loanlabels', 'heteronyms']
  it('lexicon / lexindex / cardindex / light / archaic / torot / sidecars are never fetched whole', () => {
    for (const n of FORBIDDEN) expect(whole, `src fetches ${n}.json whole`).not.toContain(n)
  })
  it('the remaining whole files are the boot file and list pages (corpus, phrases, songs, sophia, places, small sets)', () => {
    const ALLOWED = new Set(['boot', 'corpus', 'phrases', 'songs', 'sophia', 'places', 'sociolect', 'modern'])
    const extra = [...new Set(whole)].filter(n => !ALLOWED.has(n))
    expect(extra).toEqual([])
  })
  it('every sidecar the build shards has a loader in src', () => {
    for (const n of LM_NAMES) expect(text.includes(`'${n}'`), `no loader of lm/${n}`).toBe(true)
  })
})
