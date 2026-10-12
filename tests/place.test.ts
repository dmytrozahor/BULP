import { describe, expect, it } from 'vitest'
import { placePopover } from '../src/lib/place.ts'

const vp = { w: 400, h: 800 }, box = (top: number, left = 100, h = 24) => ({ top, left, right: left + 60, bottom: top + h })

describe('W2-3 popover collision handling', () => {
  it('opens below the trigger when it fits', () => {
    const p = placePopover(box(100), { w: 300, h: 200 }, vp)
    expect(p).toMatchObject({ side: 'below', top: 130, left: 92 })
  })
  it('flips above when below is too tight and above has more room; never overlaps the trigger', () => {
    const t = box(700), p = placePopover(t, { w: 300, h: 300 }, vp)
    expect(p.side).toBe('above'); expect(p.top + Math.min(300, p.maxHeight)).toBeLessThanOrEqual(t.top)
  })
  it('when taller than either side it scrolls inside the larger side', () => {
    const p = placePopover(box(300), { w: 300, h: 2000 }, vp)
    expect(p.maxHeight).toBeLessThan(2000); expect(p.top).toBeGreaterThanOrEqual(0)
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(vp.h)
  })
  it('shifts horizontally into the viewport', () => {
    expect(placePopover(box(100, 350), { w: 300, h: 100 }, vp).left).toBe(92)
    expect(placePopover(box(100, -20), { w: 300, h: 100 }, vp).left).toBe(8)
  })
})
