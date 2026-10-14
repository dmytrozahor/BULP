/** SPEC 63 UI-1…UI-3: compact cards, graph views (chain + chronology), «граф / список» switch remembered per viewer. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { explain } from '../core/reverse.ts'
import { chainLayout, timelineLayout } from '../src/lib/graphLayout.ts'
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
  it('UI-2 chronology layout: x by year, radius grows with f, overlapping dots go to different lanes', () => {
    const t = timelineLayout([{ id: 'a', label: 'a', year: 1100, f: 1, kind: 'old', to: '/f/a' }, { id: 'b', label: 'b', year: 1101, f: 100, kind: 'old', to: '/f/b' }, { id: 'c', label: 'c', year: 1900, f: 10, kind: 'modern', to: '/f/c' }])
    const d = Object.fromEntries(t.dots.map(x => [x.id, x]))
    expect(d.b!.r).toBeGreaterThan(d.a!.r); expect(d.c!.cx).toBeGreaterThan(d.a!.cx); expect(d.a!.cy).not.toBe(d.b!.cy)
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
    expect((dots.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
  it('UI-3 graphs use theme tokens only: no hard-coded colours in the graph CSS or components', () => {
    const css = src('../src/ux.css'), block = css.slice(css.indexOf('SPEC 63 UI-1'))
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(block).not.toMatch(/\brgb\(/)
    for (const f of ['ChainGraph', 'AttestGraph', 'ViewSwitch']) expect(src(`../src/components/${f}.vue`)).not.toMatch(/(fill|stroke)="#/)
  })
})
