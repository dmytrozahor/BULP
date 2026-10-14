/** SPEC 63 UI-2: pure layout for the lightweight SVG graphs (no graph library). */
import type { TraceStep } from '../../core/types.ts'

const CH = 8.6, PAD = 14
export interface GNode { id: string; label: string; x: number; w: number; cx: number; date?: string }
export interface GEdge { x1: number; x2: number; label: string; rule: string; i: number }
/** chain = form → rule → form: nodes are the stages (start + every step's result), edges are the rules */
export function chainLayout(steps: TraceStep[], dates: Record<string, string> = {}) {
  const forms = steps.length ? [steps[0]!.from, ...steps.map(s => s.to)] : []
  const nodes: GNode[] = []; const edges: GEdge[] = []
  let x = 4
  forms.forEach((f, i) => {
    const w = Math.max(40, f.length * CH + PAD * 2)
    nodes.push({ id: `${i}:${f}`, label: f, x, w, cx: x + w / 2, date: dates[f] })
    x += w
    const s = steps[i]
    if (s) { const gap = Math.max(56, s.rule.length * 7 + 28); edges.push({ x1: x, x2: x + gap, label: s.rule, rule: s.rule, i }); x += gap }
  })
  return { nodes, edges, width: x + 4, height: 64 }
}

export interface TPoint { id: string; label: string; year: number; f: number; kind: string; to: string; title?: string }
/** legend labels of the plate kinds (HTML chips, never clipped) */
export const PLATE_KIND_UK: Record<string, string> = { old: 'давня', modern: 'сучасна', chronicle: 'літопис', folk: 'фольклор', other: 'інша пам’ятка' }
/** a plate: rounded card with the form and its year; x is a compressed time axis (the gap grows with √Δyear, so a century of silence is not a blank screen) */
export const PLATE_H = 38, LANE_H = 46, LANES = 3
export interface TPlate extends TPoint { x: number; y: number; w: number; h: number; lane: number; when: string; sw: number }
export interface TArrow { from: string; to: string; d: string }
const plateW = (label: string, when: string) => Math.max(56, Math.max(label.length * 9.2, when.length * 6.4) + 22)
export function timelineLayout(points: (TPoint & { when?: string })[]) {
  const ps = [...points].sort((a, b) => a.year - b.year || b.f - a.f)
  const maxF = Math.max(1, ...ps.map(p => p.f))
  const laneEnd = new Array<number>(LANES).fill(-Infinity)
  const plates: TPlate[] = []; let prev: TPlate | undefined
  for (const p of ps) {
    const when = p.when ?? String(Math.round(p.year)), w = plateW(p.label, when)
    const want = prev ? prev.x + 14 + Math.min(60, Math.sqrt(Math.max(0, p.year - prev.year)) * 6) : 8
    let best = 0, bx = Infinity
    for (let k = 0; k < LANES; k++) { const x = Math.max(want, laneEnd[k]! + 10), pen = k === prev?.lane ? 1e-3 : 0; if (x + pen < bx) { bx = x + pen; best = k } }
    const x = Math.max(want, laneEnd[best]! + 10)
    const pl: TPlate = { ...p, x, y: 6 + best * LANE_H, w, h: PLATE_H, lane: best, when, sw: 1 + 2 * Math.sqrt(Math.max(0, p.f) / maxF) }
    laneEnd[best] = x + w; plates.push(pl); prev = pl
  }
  const arrows: TArrow[] = []
  for (let i = 1; i < plates.length; i++) {
    const a = plates[i - 1]!, b = plates[i]!
    let d: string
    if (b.x >= a.x + a.w + 6) { const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x - 1, y2 = b.y + b.h / 2, m = (x1 + x2) / 2; d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}` }
    else { const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2, down = b.y > a.y, y1 = down ? a.y + a.h : a.y, y2 = down ? b.y - 1 : b.y + b.h + 1, m = (y1 + y2) / 2; d = `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}` }
    arrows.push({ from: a.id, to: b.id, d })
  }
  const width = Math.max(0, ...plates.map(p => p.x + p.w)) + 12, used = Math.max(0, ...plates.map(p => p.lane)) + 1
  return { plates, arrows, width, height: 12 + used * LANE_H }
}