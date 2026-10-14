/** SPEC 63 UI-2: pure layout for the lightweight SVG graphs (no graph library). */
import type { TraceStep } from '../../core/types.ts'

const CH = 10, PAD = 14, CM = 14
export interface GNode { id: string; label: string; x: number; w: number; cx: number; date?: string }
export interface GEdge { x1: number; x2: number; label: string; rule: string; i: number }
/** chain = form → rule → form: nodes are the stages (start + every step's result), edges are the rules */
export function chainLayout(steps: TraceStep[], dates: Record<string, string> = {}) {
  const forms = steps.length ? [steps[0]!.from, ...steps.map(s => s.to)] : []
  const nodes: GNode[] = []; const edges: GEdge[] = []
  let x = CM
  forms.forEach((f, i) => {
    const w = Math.max(40, f.length * CH + PAD * 2)
    nodes.push({ id: `${i}:${f}`, label: f, x, w, cx: x + w / 2, date: dates[f] })
    x += w
    const s = steps[i]
    if (s) { const gap = Math.max(56, s.rule.length * 8.5 + 36); edges.push({ x1: x, x2: x + gap, label: s.rule, rule: s.rule, i }); x += gap }
  })
  return { nodes, edges, width: x + CM, height: 78 }
}

export interface TPoint { id: string; label: string; year: number; f: number; kind: string; to: string; title?: string }
/** legend labels of the plate kinds (HTML chips, never clipped) */
export const PLATE_KIND_UK: Record<string, string> = { old: 'давня', modern: 'сучасна', chronicle: 'літопис', folk: 'фольклор', other: 'інша пам’ятка' }
/** a plate: rounded card with the form and its year; x is a compressed time axis (the gap grows with √Δyear, so a century of silence is not a blank screen) */
export const PLATE_H = 38, LANE_GAP = 40, GAP_X = 44, LANE_H = PLATE_H + LANE_GAP, LANES = 3, ARROW = 11
export interface TPlate extends TPoint { x: number; y: number; w: number; h: number; lane: number; when: string; sw: number }
export interface TArrow { from: string; to: string; d: string; dy?: string; mx: number; my: number }
const plateW = (label: string, when: string) => Math.max(56, Math.max(label.length * 9.2, when.length * 6.4) + 22)
export function timelineLayout(points: (TPoint & { when?: string })[]) {
  const ps = [...points].sort((a, b) => a.year - b.year || b.f - a.f)
  const maxF = Math.max(1, ...ps.map(p => p.f))
  const laneEnd = new Array<number>(LANES).fill(-Infinity)
  const plates: TPlate[] = []; let prev: TPlate | undefined
  for (const p of ps) {
    const when = p.when ?? String(Math.round(p.year)), w = plateW(p.label, when)
    const want = prev ? prev.x + 14 + Math.min(60, Math.sqrt(Math.max(0, p.year - prev.year)) * 6) : MARGIN
    let best = 0, bx = Infinity
    for (let k = 0; k < LANES; k++) { if (prev && Math.abs(k - prev.lane) > 1 && Math.max(want, laneEnd[k]! + GAP_X) < prev.x + prev.w + GAP_X) continue; const x = Math.max(want, laneEnd[k]! + GAP_X), pen = k === prev?.lane ? 1e-3 : 0; if (x + pen < bx) { bx = x + pen; best = k } }
    const x = Math.max(want, laneEnd[best]! + GAP_X)
    const pl: TPlate = { ...p, x, y: MARGIN + best * LANE_H, w, h: PLATE_H, lane: best, when, sw: 1 + 2 * Math.sqrt(Math.max(0, p.f) / maxF) }
    laneEnd[best] = x + w; plates.push(pl); prev = pl
  }
  const arrows: TArrow[] = []
  for (let i = 1; i < plates.length; i++) {
    const a = plates[i - 1]!, b = plates[i]!
    let d: string, mx: number, my: number
    if (b.x >= a.x + a.w + GAP_X) {   // right edge → left edge (an S-curve inside the gap between the two plates)
      const x1 = a.x + a.w + a.sw / 2, y1 = a.y + a.h / 2, x2 = b.x - b.sw / 2 - 1, y2 = b.y + b.h / 2, m = (x1 + x2) / 2; d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`; mx = m; my = (y1 + y2) / 2 - 6
    } else {   // adjacent lanes: bottom → top (or top → bottom) through the empty band between the lanes
      const down = b.y >= a.y, x1 = Math.min(a.x + a.w - 14, Math.max(a.x + 14, b.x + b.w / 2)), x2 = Math.min(b.x + b.w - 14, Math.max(b.x + 14, a.x + a.w / 2))
      const y1 = down ? a.y + a.h + a.sw / 2 : a.y - a.sw / 2, y2 = down ? b.y - b.sw / 2 - 1 : b.y + b.h + b.sw / 2 + 1, m = (y1 + y2) / 2
      d = `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`; mx = (x1 + x2) / 2; my = m - 4
    }
    const dyr = Math.round(b.year - a.year)
    arrows.push({ from: a.id, to: b.id, d, mx, my, dy: dyr > 50 ? `+${dyr} р.` : undefined })
  }  // the viewBox is computed from the laid-out plates (+ their stroke) and a margin on every side: nothing can be clipped
  const right = Math.max(0, ...plates.map(p => p.x + p.w + p.sw / 2)), bottom = Math.max(0, ...plates.map(p => p.y + p.h + p.sw / 2))
  const ticks = axisTicks(plates), axisY = bottom + 10
  const width = right + MARGIN, height = ticks.length ? axisY + 22 + MARGIN / 2 : bottom + MARGIN
  return { plates, arrows, ticks, axisY, width, height, viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}` }
}
export const MARGIN = 14
/** 3–6 «nice» year ticks (1/2/5 × 10ⁿ steps) for any range, including a single year */
export function niceTicks(lo: number, hi: number): number[] {
  if (hi - lo < 4) { const c = Math.round((lo + hi) / 2); lo = c - 2; hi = c + 2 }
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]) {
    const a = Math.ceil(lo / step) * step, out: number[] = []
    for (let y = a; y <= hi; y += step) out.push(y)
    if (out.length >= 3 && out.length <= 6) return out
  }
  return [lo, Math.round((lo + hi) / 2), hi]
}
/** ticks placed on the compressed axis by interpolating between the plates' centres (clamped extrapolation, 2 px/year at the ends) */
function axisTicks(plates: TPlate[]): { x: number; label: string }[] {
  if (!plates.length) return []
  const pts = plates.map(p => ({ y: p.year, x: p.x + p.w / 2 })), lo = pts[0]!.y, hi = pts[pts.length - 1]!.y
  const pad = Math.max(2, (hi - lo) * 0.04)
  const at = (y: number) => {
    if (y <= lo) return pts[0]!.x - (lo - y) * 2
    if (y >= hi) return pts[pts.length - 1]!.x + (y - hi) * 2
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1]!, b = pts[i]!; if (y <= b.y) return b.y === a.y ? b.x : a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y) }
    return pts[pts.length - 1]!.x
  }
  return niceTicks(lo - pad, hi + pad).map(y => ({ x: Math.max(MARGIN, at(y)), label: String(y) }))
}