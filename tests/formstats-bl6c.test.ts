/** BL-6c: true per-witness counts of a spelling (FormCard.byW) replace the ≤ 6 KWIC lines on the form page and the map. */
import { describe, expect, it } from 'vitest'
import { formRegions, formStats } from '../src/lib/formStats.ts'

const kw = (w: string) => ({ w, loc: '1', left: '', node: 'а', right: '', date: [1100, 1100] as [number, number] })
const sizes = { N: 1_000_000, epoch: {} as Record<string, number> }
describe('BL-6c true form counts', () => {
  it('witnesses come from byW (all tokens) when present, from KWIC lines otherwise', () => {
    const t = formStats({ raw: 'а', f: 40, kwic: [kw('x')], byW: { x: 30, y: 10 } }, { f: 80, hk: 1 }, undefined, sizes)
    expect(t.trueCounts).toBe(true); expect(t.witnesses).toEqual([{ w: 'x', lines: 30 }, { w: 'y', lines: 10 }])
    expect(t.witnesses.reduce((s, w) => s + w.lines, 0)).toBe(t.f)
    const o = formStats({ raw: 'а', f: 40, kwic: [kw('x'), kw('x')] }, { f: 80, hk: 1 }, undefined, sizes)
    expect(o.trueCounts).toBe(false); expect(o.witnesses).toEqual([{ w: 'x', lines: 2 }])
  })
  it('the map sums byW per region (not one per KWIC line)', () => {
    const regions = [{ code: 'kyiv', name: 'K', oblasts: [], N: 100 }, { code: 'volyn', name: 'V', oblasts: [], N: 50 }]
    const reg: Record<string, string> = { a: 'Київ', b: 'Волинь', c: 'Київ' }
    expect(formRegions({ a: 7, b: 2, c: 5, z: 9 }, regions, w => reg[w])).toEqual([{ code: 'kyiv', f: 12, N: 100 }, { code: 'volyn', f: 2, N: 50 }])
    expect(formRegions([{ w: 'a' }, { w: 'b' }], regions, w => reg[w])).toEqual([{ code: 'kyiv', f: 1, N: 100 }, { code: 'volyn', f: 1, N: 50 }])
  })
})
