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
export interface TDot extends TPoint { cx: number; cy: number; r: number }
/** timeline: x by year, r by √f, overlapping dots are stacked into lanes */
export function timelineLayout(points: TPoint[], width = 640) {
  const ps = [...points].sort((a, b) => a.year - b.year)
  if (!ps.length) return { dots: [] as TDot[], ticks: [] as { x: number; label: string }[], width, height: 60 }
  const lo = Math.floor(ps[0]!.year / 100) * 100, hi = Math.max(lo + 100, Math.ceil(ps[ps.length - 1]!.year / 100) * 100)
  const maxF = Math.max(1, ...ps.map(p => p.f)), L = 18, span = width - 2 * L
  const lanes: number[] = []; const dots: TDot[] = []
  for (const p of ps) {
    const r = 4 + 10 * Math.sqrt(Math.max(0, p.f) / maxF), cx = L + (p.year - lo) / (hi - lo) * span
    let lane = lanes.findIndex(end => cx - r > end + 2); if (lane < 0) { lane = lanes.length; lanes.push(0) }
    lanes[lane] = cx + r; dots.push({ ...p, cx, cy: 18 + lane * 28, r })
  }
  const ticks: { x: number; label: string }[] = []
  for (let y = lo; y <= hi; y += hi - lo > 600 ? 200 : 100) ticks.push({ x: L + (y - lo) / (hi - lo) * span, label: String(y) })
  return { dots, ticks, width, height: 18 + lanes.length * 28 + 14 }
}
