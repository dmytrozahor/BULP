import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { attachHist, glossWords, type ArchEntry } from '../core/archaic.ts'

const ent = (head: string): ArchEntry => ({ id: 'u:' + head, head, variants: [head], status: 'unverified', n: 5, forms: [], epochs: {}, witnesses: {}, kwic: [] })
const SUM16 = { d: 'sum16', g: '(приєднує підрядне речення умови до головного) коли, якщо', l: '1556 №3' }
const known = (w: string) => ['коли', 'якщо'].includes(w)
const hist = (d: string) => d === 'sum16'

describe('MM-46 historical dictionary attestation of an unverified candidate', () => {
  it('glossWords drops the parenthetical and keeps whole one-word items', () => {
    expect(glossWords(SUM16.g)).toEqual(['коли', 'якщо'])
    expect(glossWords('той; (розм.) великий зал, а також')).toEqual(['той'])
  })
  it('когда: head with a SUM XVI–XVII row gains hist + a «зіставлено» modern word; no row = unchanged', () => {
    const a = ent('когда'), b = ent('невідоме')
    expect(attachHist([a, b], h => h === 'когда' ? [SUM16] : [], hist, () => [1500, 1650], known)).toBe(1)
    expect(a.hist).toEqual([{ d: 'sum16', loc: '1556 №3', g: SUM16.g, date: [1500, 1650] }])
    expect(a.modern?.map(m => [m.form, m.grade, m.via])).toEqual([['коли', 'зіставлено', 'gloss'], ['якщо', 'зіставлено', 'gloss']])
    expect(b.hist).toBeUndefined(); expect(b.modern).toBeUndefined()
  })
  it('a non-historical dictionary row (СУМ-20) does not attest; an unknown gloss word is not a counterpart; a garbled gloss is not read', () => {
    const a = ent('когда'); expect(attachHist([a], () => [{ d: 'sum20', g: 'коли' }], hist, () => null, known)).toBe(0)
    const c = ent('xxx'); attachHist([c], () => [{ d: 'sum16', g: 'qwerty, коли' }], hist, () => null, known); expect(c.modern?.map(m => m.form)).toEqual(['коли'])
    const o = ent('yyy'); attachHist([o], () => [{ d: 'sum16', g: 'коли', oq: 1 }], hist, () => null, known); expect(o.hist?.[0]?.g).toBe(''); expect(o.modern).toBeUndefined()
  })
  it('the view no longer says «не знайдено» when hist exists', () => {
    const v = readFileSync(new URL('../src/views/ArchaicView.vue', import.meta.url), 'utf8')
    expect(v).toContain("e.status === 'unverified' && !hist.length"); expect(v).toContain('зіставлено'); expect(v).toContain('e.modern?.length')
  })
})
