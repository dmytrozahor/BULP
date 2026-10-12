/**
 * W2-3: collision-aware placement of a popover next to its trigger (pure; unit-tested). Viewport coordinates (position: fixed).
 * Prefers below the trigger; flips above when below is too tight and above has more room; never overlaps the trigger;
 * shifts horizontally into the viewport; `maxHeight` is the room actually available on the chosen side (the popover scrolls beyond it).
 */
export interface Box { top: number; left: number; right: number; bottom: number }
export interface Placed { top: number; left: number; maxHeight: number; side: 'below' | 'above' }

export function placePopover(t: Box, pop: { w: number; h: number }, vp: { w: number; h: number }, gap = 6, margin = 8): Placed {
  const below = vp.h - t.bottom - gap - margin, above = t.top - gap - margin
  const side = pop.h <= below || below >= above ? 'below' : 'above'
  const room = Math.max(80, side === 'below' ? below : above), used = Math.min(pop.h, room)
  const top = side === 'below' ? t.bottom + gap : t.top - gap - used
  const left = Math.max(margin, Math.min(t.left, vp.w - margin - pop.w))
  return { top, left, maxHeight: room, side }
}
