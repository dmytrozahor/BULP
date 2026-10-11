/** P-4.1: "each spec lists requirement IDs; each ID has ≥1 test or is explicitly marked manual" — audited against specs/COVERAGE.md. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const SPECS = ['00-principles', '10-mining', '20-build', '30-derivation', '40-rusyn'].map(f => rd(`specs/${f}.md`))
const ids = (() => {
  const out = new Set<string>()
  for (const s of SPECS) {
    for (const m of s.matchAll(/\*\*([A-Z]{1,2}-\d+\.\d+)[ *]/g)) out.add(m[1]!)
    // a top-level section without dotted ids is tracked by its heading id (M-4, M-6, B-4, B-5, B-6)
    for (const sec of s.split(/^## /m).slice(1)) { const h = /^([A-Z]{1,2}-\d+)\b/.exec(sec); if (h && !/\*\*[A-Z]{1,2}-\d+\.\d+[ *]/.test(sec)) out.add(h[1]!) }
  }
  return out
})()
const rows = rd('specs/COVERAGE.md').split('\n').filter(l => /^\| [A-Z]/.test(l) && !l.startsWith('| id')).map(l => {
  const i = l.indexOf(' | ')
  return { id: l.slice(2, i).trim(), ref: l.slice(i + 3).replace(/ \|$/, '').trim() }
})

describe('P-4.1 every requirement id is covered', () => {
  it('collects ids from all specs', () => { expect(ids.size).toBeGreaterThan(50); for (const id of ['P-1.1', 'RU-3.2', 'B-5', 'M-6', 'D-4.3']) expect(ids.has(id), id).toBe(true) })
  it('every id has a row', () => { const have = new Set(rows.map(r => r.id)); for (const id of ids) expect(have.has(id), `${id} missing in specs/COVERAGE.md`).toBe(true) })
  it('every row names an id that still exists in the specs', () => { for (const r of rows) expect(ids.has(r.id), `${r.id} not in any spec`).toBe(true) })
  it('every non-manual row points at an existing test file and test text', () => {
    for (const r of rows) {
      if (r.ref.startsWith('manual')) { expect(r.ref.length, r.id).toBeGreaterThan(20); continue }
      const [file, text] = r.ref.split(' › ') as [string, string]
      expect(rd(file).includes(text), `${r.id}: «${text}» not found in ${file}`).toBe(true)
    }
  })
})
