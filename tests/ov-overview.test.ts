/** SPEC 63 OV-11 («Огляд» tab) and OV-12 (statistics sidebar). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { TABS } from '../src/lib/cardTabs.ts'
import { pickExamples, regionLine, curvePoints, curveSegments } from '../src/lib/overview.ts'
import OverviewTab from '../src/components/OverviewTab.vue'
import FreqCurve from '../src/components/FreqCurve.vue'
import RegionBars from '../src/components/RegionBars.vue'
import ThinCard from '../src/components/ThinCard.vue'
import OvPronunciation from '../src/components/OvPronunciation.vue'
import CardTabs from '../src/components/CardTabs.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const line = (w: string, y: number) => ({ w, loc: '1', left: 'a', node: 'вода', right: 'b', date: [y, y] as [number, number] })

describe('OV-11 «Огляд» is the default first tab with four sections', () => {
  it('OV-11 Огляд is the first and default tab; Форми, Історія, Значення, Поширення, Джерела are unchanged', async () => {
    expect(TABS[0]).toMatchObject({ id: 'overview', label: 'Огляд' }); expect(TABS.slice(1).map(t => t.id)).toEqual(['forms', 'history', 'meanings', 'spread', 'sources'])
    const solo = await render(CardTabs, {}); expect(solo).toMatch(/id="ctab-overview"[^>]*aria-selected="true"/)
    const w = rd('src/views/WordView.vue'), f = rd('src/views/FormView.vue'), t = rd('src/components/ThinCard.vue')
    for (const [n, src] of [['word', w], ['form', f], ['thin', t]] as const) { expect(src, n).toContain('<template #overview>'); expect(src, n).toContain('<OverviewTab') }
    expect(w.indexOf('<template #overview>')).toBeLessThan(w.indexOf('<template #forms>'))
    // the other tabs keep their blocks (the 5 tabs of OV-10 are untouched by this step)
    for (const id of ['h-par', 'h-ep', 'h-prov', 'h-sn', 'h-map', 'h-kw']) expect(w, id).toContain(`id="${id}"`)
  })
  it('OV-11 the four sections are expanded at once, each a compact use of the existing block', async () => {
    const html = await render(OverviewTab, { lemma: 'невідомеслово', spelling: 'невідомеслово', kwic: [line('a', 1500), line('b', 1900)], byRegion: [{ code: 'KY', f: 3, N: 1000 }], mapPanel: 'h-map', paradigm: [{ form: 'вода', tags: 'noun:inanim:f:v_naz' }], paradigmKind: 'noun' })
    const ids = ['ov-pronunciation', 'ov-origin', 'ov-regions', 'ov-senses', 'ov-paradigm', 'ov-example']
    for (const id of ids) expect(html, id).toContain(`data-testid="${id}"`)
    expect(ids.map(i => html.indexOf(`data-testid="${i}"`)), 'owner order: Вимова, Походження, Регіони, Значення, Словозміна, Приклад').toEqual(ids.map(i => html.indexOf(`data-testid="${i}"`)).sort((a, b) => a - b))
    expect(html).toContain('Перша фіксація'.slice(0, 0) + 'перша фіксація для цієї картки не встановлена')   // honest line when the host has no first-attestation data
    expect(html).toContain('class="ov-map"'); expect(rd('src/components/RegionMap.vue')).toContain('rm-compact'); expect(html).toContain('засвідчено в:'); expect(html).toContain('регіон пам’ятки, а не діалектна мітка (FD-2)')   // the map, then the FD-2 line
    expect(html.indexOf('class="ov-map"')).toBeLessThan(html.indexOf('засвідчено в:'))
    expect(html).not.toContain('aria-expanded="false"'.repeat(0) + 'class="ptoggle"')   // no Panel toggles: nothing is collapsed behind a click
    expect(html).toContain('data-testid="se-full-compact"'); expect(html).toContain('<table')   // compact senses + paradigm table
    expect(rd('src/components/OverviewTab.vue')).not.toMatch(/<Panel/)
  })
  it('OV-11 a section without data is one line, not a big empty block', async () => {
    const html = await render(OverviewTab, { spelling: 'невідомеслово', kwic: [], mapPanel: 't-reg', dictOnly: true })
    expect(html).toContain('регіон пам’яток невідомий'); expect(html).not.toContain('class="ov-map"'); expect(html).toContain('немає засвідчень у корпусі'); expect(html).toContain('парадигми немає в джерелах цієї картки')
    const thin = await render(ThinCard, { lemma: 'невідомеслово', spelling: 'невідомеслово', kwic: [], dictOnly: true, f: 0 }); expect(thin).toContain('data-testid="overview"'); expect(thin).toContain('data-testid="stat-sidebar"')
  })
  it('OV-11 the example is the earliest line plus a later one from another witness, not from an OCR witness when a clean one exists', () => {
    const ls = [line('ocr', 1092), line('a', 1500), line('b', 1700), line('a', 1900), line('c', 1900)]
    const out = pickExamples(ls, w => w === 'ocr')
    expect(out.map(k => `${k.w}${k.date[0]}`)).toEqual(['a1500', 'c1900'])
    expect(pickExamples([line('ocr', 1092)], w => w === 'ocr').map(k => k.w)).toEqual(['ocr'])   // nothing else exists: the OCR line is shown (its badge stays in Kwic)
    expect(pickExamples([])).toEqual([]); expect(pickExamples([line('a', 1500)]).length).toBe(1)
    expect(rd('src/components/SourceCite.vue')).toContain('<RuBadge')                          // the Russian-source flag travels with the cited line
  })
  it('OV-11 the region line names regions, most frequent first', () => {
    expect(regionLine([{ code: 'a', f: 1 }, { code: 'b', f: 9 }, { code: 'c', f: 0 }], [{ code: 'a', name: 'Галичина' }, { code: 'b', name: 'Київщина' }])).toEqual([{ name: 'Київщина', f: 9 }, { name: 'Галичина', f: 1 }])
  })
})

describe('OV-12 statistics sidebar', () => {
  it('OV-12 the sidebar exists on every card layout, sticky on desktop and stacked below the content on a phone', () => {
    for (const f of ['src/views/WordView.vue', 'src/views/FormView.vue', 'src/components/ThinCard.vue']) { const s = rd(f); expect(s, f).toContain('<CardLayout'); expect(s, f).toContain('<template #side>') }
    const css = rd('src/style.css')
    expect(css).toMatch(/\.card-layout\s*\{\s*display:\s*block/)                                                     // phone: one column, the aside follows the main column
    expect(css).toMatch(/@media \(min-width: 1000px\)\s*\{\s*\.card-layout\s*\{[^}]*grid-template-columns:[^}]*19rem/)
    expect(css).toMatch(/\.statside\s*\{[^}]*position:\s*sticky/)
    expect(css).toMatch(/\.cl-main, \.statside \{ min-width: 0/)                                                     // no horizontal scroll from a wide child
    const w = rd('src/views/WordView.vue'); const side = w.slice(w.indexOf('<template #side>'))
    for (const id of ['h-st', 'h-stx', 'h-tc', 'h-eb', 'h-sr', 'h-sc']) expect(side, id).toContain(`id="${id}"`)      // statistics moved here, not duplicated in a tab
    expect(w.slice(0, w.indexOf('<template #side>'))).not.toContain('id="h-st"')
  })
  it('OV-12 the curve normalises per period: ipm = f / N of that century', () => {
    const p = curvePoints([{ c: 15, f: 3 }, { c: 16, f: 3 }], { '15': 1_000_000, '16': 3_000_000 })
    expect(p.map(x => x.ipm)).toEqual([3, 1])                                          // the same f, different N
    expect(p.every(x => !x.gap)).toBe(true)
  })
  it('OV-12 an uncovered period is a gap: not a zero, not interpolated, the line is broken', async () => {
    const sizes = { '14': 500_000, '16': 2_000_000, '17': 2_000_000 }
    const p = curvePoints([{ c: 14, f: 1 }, { c: 16, f: 0 }, { c: 17, f: 4 }], sizes)
    expect(p.map(x => x.c)).toEqual([14, 15, 16, 17])
    expect(p[1]).toMatchObject({ c: 15, gap: true, ipm: null, N: 0 }); expect(p[2]).toMatchObject({ gap: false, ipm: 0 })   // N > 0 and f = 0 is a real zero
    const segs = curveSegments(p); expect(segs.map(s => s.map(x => x.c))).toEqual([[14], [16, 17]])                     // no segment crosses the gap
    const html = await render(FreqCurve, { series: [{ c: 14, f: 1, ipm: 2, smooth: null }, { c: 17, f: 4, ipm: 2, smooth: null }], sizes })
    expect(html).toContain('data-gap="1"'); expect(html).toContain('role="img"'); expect(html).toContain('немає корпусу'); expect(html).toContain('прогалина, не нуль')
    expect(html).not.toContain('data-seg')   // bars only: no overplotted line (owner 2026-10-22)
    expect(html).toContain('ipm — на млн слів')
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}"/)                                       // theme tokens only: light and dark both work
    expect(curvePoints([], {})).toEqual([])
  })
  it('OV-12 every number carries its basis (N, period), region bars are ipm on the region N', async () => {
    const bars = await render(RegionBars, { by: [{ code: 'x', f: 2, N: 1_000_000 }, { code: 'y', f: 0, N: 5 }] })
    expect(bars).toContain('data-testid="region-bars"'); expect(bars).toContain('N = 1')
    expect(await render(RegionBars, { by: [] })).toContain('регіон пам’яток невідомий')
    const w = rd('src/views/WordView.vue'); expect(w).toContain('N = {{ fmtNum(corpus?.N ?? 0) }} слів'); expect(w).toContain('остання в корпусі'); expect(w).toContain('перша фіксація')
  })
})

describe('OV layout bugs found in the real browser (owner «шота криво»)', () => {
  const css = rd('src/style.css')
  it('the sidebar has no visible inner scrollbar and the «Статистика» panel is expanded by default', () => {
    expect(css).toContain('scrollbar-width: none'); expect(rd('src/views/WordView.vue')).toContain('kw: false, st: true')
  })
  it('the paradigm, origin and example span the full main column; two columns follow the column width (container query), not the viewport', () => {
    expect(css).toContain('.ov-origin, .ov-sec[data-testid="ov-paradigm"]'); expect(css).toContain('@container (min-width: 660px)'); expect(css).not.toContain('@media (min-width: 900px) { .ov {')
  })
  it('the header controls never overflow: selects are capped, the nav buttons do not shrink', () => {
    expect(css).toContain('.viewbar select { width: 100%; max-width: 13rem'); expect(css).toContain('.nm-btn, .brand, .themebtn { white-space: nowrap; flex-shrink: 0; }')
  })
  it('«За епохами» rows are name / bar+value / meta on every row', async () => {
    const e = rd('src/components/EpochBars.vue'); expect(e).toContain('class="eb-row"'); expect(e).toContain('class="eb-line'); expect(css).toContain('.eb-line { display: grid')
  })
  it('the compact region table shows the top 5 by f with a pointer to the rest', () => {
    const m = rd('src/components/RegionMap.vue'); expect(m).toContain('slice(0, 5)'); expect(m).toContain('data-testid="rm-more"')
  })
  it('the provenance block has a compact mode (graph and three oldest spellings) and the origin section links to «Історія»', () => {
    expect(rd('src/components/ProvenanceTimeline.vue')).toContain('data-testid="prov-compact"')
    expect(rd('src/components/OverviewTab.vue')).toContain('докладніше в «Історія» →')
    for (const f of ['src/views/WordView.vue', 'src/views/FormView.vue', 'src/components/ThinCard.vue']) expect(rd(f), f).toMatch(/origin-(panel|line)/)
  })
  it('OV-14 «Вимова»: stress, derived IPA, and «наголос не встановлено» when unknown; it comes first in «Огляд»', async () => {
    const none = await render(OvPronunciation, { word: 'вода', stress: [], loaded: true })
    expect(none).toContain('наголос не встановлено'); expect(none).toContain('IPA:'); expect(none).toContain('виведено за правилами')
    const st = await render(OvPronunciation, { word: 'вода', stress: [{ form: 'вода', positions: [3], status: 'normative', evidence: [], method: 'dictionary' }], loaded: true })
    expect(st).toContain('data-testid="ov-pron"'); expect(st).not.toContain('наголос не встановлено')
    const thin = await render(OvPronunciation, { word: 'вода', positions: [3] }); expect(thin).toContain('словниковий наголос')
    expect(rd('src/components/OverviewTab.vue').indexOf('ov-pronunciation')).toBeLessThan(rd('src/components/OverviewTab.vue').indexOf('ov-origin'))
    expect(rd('src/components/OvPronunciation.vue')).toContain('ov-pron-dialect')   // the dialect IPA row (Говір switch)
  })
})
