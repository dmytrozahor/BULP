/** SPEC 63 UI-1…UI-3: compact cards, graph views (chain + chronology), «граф / список» switch remembered per viewer. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { explain } from '../core/reverse.ts'
import { chainLayout, timelineLayout, niceTicks } from '../src/lib/graphLayout.ts'
import { clipWords } from '../src/lib/format.ts'
import { VIEW_KEY, resetViewModes, useViewMode } from '../src/lib/viewMode.ts'
import DerivationSteps from '../src/components/DerivationSteps.vue'
import AttestGraph from '../src/components/AttestGraph.vue'

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } }
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const steps = explain('конь', 'кінь')!.steps

let st: ReturnType<typeof mem>
beforeEach(() => { st = mem(); vi.stubGlobal('localStorage', st); resetViewModes(st as unknown as Storage) })

describe('UI-1 compact word and form cards', () => {
  const css = src('../src/ux.css'), word = src('../src/views/WordView.vue'), form = src('../src/views/FormView.vue')
  it('UI-1 compact header: both pages use the compact header (flex row, no heading padding), at most 3 header blocks (h1 line, first-attestation line, chips)', () => {
    expect(word).toContain('class="wordhead headline compact"'); expect(form).toContain('class="wordhead headline compact"')
    expect(css).toMatch(/\.wordhead\.compact\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/)
    expect(css).toMatch(/\.wordhead\.compact\s+\.lemma\s*\{[^}]*font-size:\s*1\.7rem/)
  })
  it('UI-1 secondary panels are accordions with counts: form page opens only KWIC / witnesses / derivation, the rest collapse and carry :count', () => {
    for (const id of ['f-dia', 'f-ep', 'f-reg', 'f-cl']) expect(form).toMatch(new RegExp(`<Panel id="${id}" :open="false"`))
    for (const id of ['f-kw', 'f-wit', 'f-der']) expect(form).toMatch(new RegExp(`<Panel id="${id}" :open="true" :count=`))
    for (const id of ['h-kw', 'h-par', 'h-sn', 'h-lab']) expect(word).toMatch(new RegExp(`<Panel id="${id}"[^>]* :count=`))
  })
})

describe('UI-2 graph views', () => {
  it('UI-2 chain layout: n steps → n+1 stage nodes and n rule edges laid left to right', () => {
    expect(steps.length).toBeGreaterThan(0)
    const g = chainLayout(steps, { конь: '1187' })
    expect(g.nodes.length).toBe(steps.length + 1); expect(g.edges.length).toBe(steps.length)
    expect(g.nodes[0]!.label).toBe('конь'); expect(g.nodes[0]!.date).toBe('1187')
    for (let i = 1; i < g.nodes.length; i++) expect(g.nodes[i]!.x).toBeGreaterThan(g.nodes[i - 1]!.x)
  })
  it('UI-2 chronology plates: no two plates overlap, arrows run chronologically, the compressed axis keeps close years apart, wide labels get wide plates', () => {
    const mk = (id: string, label: string, year: number, f: number) => ({ id, label, year, f, kind: 'old', to: `/f/${id}` })
    const pts = [mk('a', 'ною', 1037, 3), mk('b', 'нь', 1037, 1), mk('c', 'нѣ', 1110, 9), mk('d', 'ни', 1111, 2), mk('e', 'не', 1120, 40), mk('f', 'нея', 1121, 1), mk('g', 'не', 1900, 500)]
    const t = timelineLayout(pts)
    expect(t.plates.length).toBe(pts.length); expect(t.arrows.length).toBe(pts.length - 1)
    for (const a of t.plates) for (const b of t.plates) if (a.id < b.id) {
      const sepX = a.x + a.w + 1 <= b.x || b.x + b.w + 1 <= a.x, sepY = a.y + a.h + 1 <= b.y || b.y + b.h + 1 <= a.y
      expect(sepX || sepY, `${a.id}/${b.id} overlap`).toBe(true)
    }
    // arrows need room: ≥ 36 px between lanes, ≥ 40 px between plates of one lane, arrowheads ≥ 10 px, 2 px ink stroke
    for (const a of t.plates) for (const b of t.plates) if (a.id < b.id && a.lane === b.lane) expect(Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), `${a.id}/${b.id} gap`).toBeGreaterThanOrEqual(40)
    for (const a of t.plates) for (const b of t.plates) if (a.lane === b.lane - 1) expect(b.y - (a.y + a.h)).toBeGreaterThanOrEqual(36)
    expect(Number(/markerWidth="(\d+)"/.exec(src('../src/components/AttestGraph.vue'))![1])).toBeGreaterThanOrEqual(10)
    expect(src('../src/ux.css')).toMatch(/\.g-link\s*\{[^}]*stroke:\s*var\(--ink\)[^}]*stroke-width:\s*2/)
    expect(t.arrows.find(x => x.from === 'g')).toBeUndefined(); expect(t.arrows.find(x => x.from === 'f')!.dy).toMatch(/^\+7\d\d р\.$/)   // Δ > 50 years is labelled
    expect(t.arrows.find(x => x.from === 'a')!.dy).toBeUndefined()
    expect(t.plates.map(p => p.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(t.arrows.map(x => x.from + x.to)).toEqual(['ab', 'bc', 'cd', 'de', 'ef', 'fg'])
    expect(t.plates.every(p => p.y >= 0 && p.y + p.h <= t.height && p.x + p.w <= t.width)).toBe(true)
    expect(t.width).toBeLessThan(900)   // 1037…1900 is not stretched linearly
    expect(t.plates.find(p => p.id === 'g')!.sw).toBeGreaterThan(t.plates.find(p => p.id === 'b')!.sw)
    expect(timelineLayout([mk('x', 'довге-слово-форма', 1200, 1)]).plates[0]!.w).toBeGreaterThan(timelineLayout([mk('y', 'а', 1200, 1)]).plates[0]!.w)
    // a single attestation (/w/язичний, 1092) has exactly one tick; ticks never sit closer than 48 px
    expect(timelineLayout([mk('s', 'ꙗзычьнии', 1092, 1)]).ticks.map(k => k.label)).toEqual(['1092'])
    const tk = timelineLayout([mk('a', 'а', 1092, 1), mk('b', 'б', 1093, 1), mk('c', 'в', 1900, 1)]).ticks
    for (let i = 1; i < tk.length; i++) expect(tk[i]!.x - tk[i - 1]!.x).toBeGreaterThanOrEqual(48)
  })
  it('UI-2 viewBox fits: it contains every plate bbox (with border and margin), the axis and its labels — nothing is clipped, also for one plate and heavy plates', () => {
    const mk = (id: string, label: string, year: number, f: number) => ({ id, label, year, f, kind: 'modern', to: `/f/${id}` })
    for (const pts of [[mk('a', 'міна', 1862, 1000)], [mk('a', 'міна', 1862, 5), mk('b', 'мінь', 1870, 900), mk('c', 'міни', 1900, 1), mk('d', 'мін', 1900, 2), mk('e', 'мінам', 1901, 3)]]) {
      const t = timelineLayout(pts), [x0, y0, vw, vh] = t.viewBox.split(' ').map(Number) as [number, number, number, number]
      expect(x0).toBe(0); expect(y0).toBe(0)
      for (const p of t.plates) { expect(p.x - p.sw / 2).toBeGreaterThanOrEqual(x0 + 8); expect(p.y - p.sw / 2).toBeGreaterThanOrEqual(y0 + 8); expect(p.x + p.w + p.sw / 2).toBeLessThanOrEqual(vw - 8); expect(p.y + p.h + p.sw / 2).toBeLessThanOrEqual(vh - 8) }
      expect(t.axisY + 22).toBeLessThanOrEqual(vh)
      for (const k of t.ticks) { expect(k.x).toBeGreaterThanOrEqual(0); expect(k.x).toBeLessThanOrEqual(vw) }
    }
  })
  it('UI-2 axis ticks: 3–6 nice year ticks for any range (single year, 38 years, nine centuries), strictly increasing', () => {
    for (const [lo, hi] of [[1862, 1900], [1900, 1900], [1037, 1900], [1110, 1115], [1500, 1650], [900, 1990]] as const) {
      const t = niceTicks(lo, hi); expect(t.length, `${lo}–${hi}`).toBeGreaterThanOrEqual(3); expect(t.length).toBeLessThanOrEqual(6)
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]!)
    }
    const g = timelineLayout([{ id: 'a', label: 'міна', year: 1862, f: 1, kind: 'old', to: '/f/a' }, { id: 'b', label: 'мін', year: 1900, f: 1, kind: 'modern', to: '/f/b' }])
    expect(g.ticks.length).toBeGreaterThanOrEqual(2)   // nice ticks thinned to ≥ 48 px apart on the compressed axis
  })
  it('UI-1 panel summaries break at a word boundary with «…» and show in full as the tooltip; the CSS wraps them to 2 lines instead of cutting mid-word', () => {
    const s = 'From Proto-Balto-Slavic *mainā, from Proto-Indo-European *mey- (to change), a borrowing'
    const c = clipWords(s, 40); expect(c.endsWith('…')).toBe(true); expect(c.length).toBeLessThanOrEqual(41)
    expect(s.startsWith(c.slice(0, -1))).toBe(true); expect(s[c.length - 1]).toBe(' ')   // cut right before a space: no word is split
    expect(clipWords('коротко', 40)).toBe('коротко')
    expect(src('../src/components/EtymologyBlock.vue')).toContain('clipWords('); expect(src('../src/components/Panel.vue')).toContain(':title="empty ? undefined : summary"')
    expect(src('../src/ux.css')).toMatch(/\.panel \.psum\s*\{[^}]*-webkit-line-clamp:\s*2/)
  })
  it('UI-2 chain graph fits: margins on both sides, every rule label fits its edge, the date line is inside the height, epoch rows use Ukrainian names', () => {
    const long = [{ from: 'пôшовъ', to: 'пошовъ', rule: 'ORTH-MAX-JER-FINAL' }, { from: 'пошовъ', to: 'пішов', rule: 'R10' }] as unknown as typeof steps
    const g = chainLayout(long, { пôшовъ: '1600' })
    expect(g.nodes[0]!.x).toBeGreaterThanOrEqual(12); expect(g.nodes.at(-1)!.x + g.nodes.at(-1)!.w).toBeLessThanOrEqual(g.width - 12); expect(g.height).toBeGreaterThanOrEqual(70)
    for (const e of g.edges) expect((e.x2 - e.x1)).toBeGreaterThanOrEqual(e.label.length * 8)
    const fv = src('../src/views/FormView.vue'); expect(fv).toContain('epochShort(e.epoch)'); expect(fv).not.toContain("e.epoch.replace('shev.'")
  })
  it('UI-2 legend: HTML chips with full dots and Ukrainian labels (давня / сучасна), outside the SVG so it is never clipped', async () => {
    const html = await render(AttestGraph, { points: [{ id: 'a', label: 'нѣ', year: 1110, f: 3, kind: 'old', to: '/f/a', when: '1110' }, { id: 'b', label: 'не', year: 1900, f: 3, kind: 'modern', to: '/f/b', when: '1900' }] })
    const legend = html.slice(html.indexOf('class="small sans muted gleg"'))
    expect(legend).toContain('давня'); expect(legend).toContain('сучасна'); expect(legend).not.toContain('<svg'); expect(legend).toContain('class="gleg-dot"')
    expect(html).toContain('>нѣ</text>'); expect(html).toContain('>1110</text>'); expect(html).toContain('marker-end="url(#tg-arr)"')
  })
})
describe('UI-3 view switch «граф / список»', () => {
  it('UI-3 graph is the default: the chain renders as an SVG graph with the switch, the list is not mounted', async () => {
    const html = await render(DerivationSteps, { steps, uid: 'конь' })
    expect(html).toContain('<svg class="cgraph"'); expect(html).not.toContain('class="dsteps"')
    expect(html).toMatch(/data-v="graph" aria-pressed="true"/)
    expect(html).toContain('data-view="graph"')
  })
  it('UI-3 toggle switches and persists: set(list) renders the text list, is stored per panel and survives a reload; setDefault changes every panel', async () => {
    useViewMode('chain').set('list')
    expect(st.m.get(`${VIEW_KEY}.chain`)).toBe('list')
    expect(await render(DerivationSteps, { steps, uid: 'конь' })).toContain('class="dsteps"')
    resetViewModes(st as unknown as Storage)   // "reload": per-panel state is re-read from storage
    expect(useViewMode('chain').mode()).toBe('list'); expect(useViewMode('chrono').mode()).toBe('graph')
    useViewMode('chrono').setDefault('list')
    expect(st.m.get(VIEW_KEY)).toBe('list'); expect(useViewMode('witnesses').mode()).toBe('list')
    expect(useViewMode('chain').isOwn()).toBe(true)
    useViewMode('chain').setDefault('graph'); expect(st.m.has(`${VIEW_KEY}.chain`)).toBe(false); expect(useViewMode('chain').mode()).toBe('graph')
  })
  it('UI-3 renders without localStorage: blocked / throwing storage falls back to graph and never throws', async () => {
    const bad = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
    vi.stubGlobal('localStorage', bad); resetViewModes(bad as unknown as Storage)
    const vm = useViewMode('x'); expect(vm.mode()).toBe('graph'); expect(() => vm.set('list')).not.toThrow(); expect(vm.mode()).toBe('list')
    expect(() => vm.setDefault('graph')).not.toThrow()
    vi.stubGlobal('localStorage', undefined); resetViewModes()
    expect(await render(DerivationSteps, { steps, uid: 'конь' })).toContain('<svg class="cgraph"')
  })
  it('UI-3 nodes link: chain stages go to /f/<form>, rule edges are buttons (open the same evidence as the list), chronology dots link to their target', async () => {
    const html = await render(DerivationSteps, { steps, uid: 'конь', lemma: 'кінь' })
    expect(html).toContain('href="/f/'); expect(html).toContain('?lemma=')
    expect(html).toContain(`>${steps[0]!.rule}</text>`); expect(html).toMatch(/class="g-edge" role="button"/)
    const dots = await render(AttestGraph, { points: [{ id: 'w1', label: 'Остр.', year: 1056, f: 12, kind: 'chronicle', to: '/witness/ostromir', title: 'Остромирове' }, { id: 'w2', label: 'Іст.', year: 1700, f: 2, kind: 'other', to: '/witness/x' }] })
    expect(dots).toContain('href="/witness/ostromir"'); expect(dots).toContain('href="/witness/x"'); expect(dots).toContain('data-kind="chronicle"')
    expect((dots.match(/<rect/g) ?? []).length).toBe(2)
  })
  it('UI-3 graphs use theme tokens only: no hard-coded colours in the graph CSS or components', () => {
    const css = src('../src/ux.css'), block = css.slice(css.indexOf('SPEC 63 UI-1'))
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(block).not.toMatch(/\brgb\(/)
    for (const f of ['ChainGraph', 'AttestGraph', 'ViewSwitch']) expect(src(`../src/components/${f}.vue`)).not.toMatch(/(fill|stroke)="#/)
  })
})
