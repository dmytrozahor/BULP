/** SPEC 63 OV-9 (grouped navigation) and OV-10 (card tabs). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { makeRouter } from '../src/router.ts'
import { NAV_GROUPS, navRoutes, groupOf, nextIndex, BOOK_FORM } from '../src/lib/navMenu.ts'
import { BLOCK_TAB, PANEL_TAB, SIDEBAR_PANELS, TABS, tabOfId } from '../src/lib/cardTabs.ts'
import { BLOCKS, KINDS, MATRIX } from '../src/lib/cardParity.ts'
import NavMenu from '../src/components/NavMenu.vue'
import ThinCard from '../src/components/ThinCard.vue'
import CardTabs from '../src/components/CardTabs.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const render = async (c: object, props: Record<string, unknown>, path = '/', slots?: Record<string, () => unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props, slots as never) }); app.use(router); await router.push(path); await router.isReady()
  return renderToString(app)
}
/** the top-level routes the flat nav had before OV-9 (src/App.vue at bd5f587f) */
const FORMER = ['/', '/annotate', '/analyze', '/derive', '/texts', '/songs', '/phrases', '/plast', '/sophia', '/map', '/atlas', '/corpus', '/report', '/method']

describe('OV-9 grouped navigation', () => {
  it('OV-9 every former top-level route is in a nav group under the same URL', () => {
    const have = navRoutes()
    for (const r of FORMER) expect(have, r).toContain(r)
    expect(new Set(have).size).toBe(have.length)                                  // one place per route
    const router = makeRouter(true)
    for (const r of have) { const m = router.resolve(r); expect(m.matched.at(-1)!.name, r).not.toBe('catch-all'); expect(m.fullPath).toBe(r) }
    expect(NAV_GROUPS.map(g => g.label)).toEqual(['Слова', 'Тексти', 'Джерела та спільноти', 'Про проєкт'])
    expect(NAV_GROUPS.at(-1)!.items.some(i => i.to === BOOK_FORM && i.external)).toBe(true)
    expect(groupOf('/analyze')).toBe('words'); expect(groupOf('/songs/x')).toBe('texts'); expect(groupOf('/plast')).toBe('sources'); expect(groupOf('/method')).toBe('about')
    expect(rd('src/App.vue')).toContain('<NavMenu />'); expect(rd('src/App.vue')).not.toContain('<RouterLink to="/annotate">')
  })
  it('OV-9 the menus render as disclosure buttons and the keyboard rule wraps', async () => {
    const html = await render(NavMenu, {}, '/analyze')
    expect((html.match(/aria-haspopup="true"/g) ?? []).length).toBe(NAV_GROUPS.length)
    expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(NAV_GROUPS.length + 1)      // every group + the phone «Меню» sheet button
    for (const g of NAV_GROUPS) { expect(html).toContain(`aria-controls="nm-${g.id}"`); expect(html).toContain(`id="nm-${g.id}"`) }
    for (const r of FORMER.filter(x => x !== '/')) expect(html, r).toContain(`href="${r}"`)
    expect(html).toContain('target="_blank"'); expect(html).toContain('hidden')                  // closed lists are hidden, the external link opens in a new tab
    expect(html).toContain('class="here nm-group"')            // the group of the current route is marked
    expect(nextIndex('ArrowDown', 3, 4)).toBe(0); expect(nextIndex('ArrowUp', 0, 4)).toBe(3); expect(nextIndex('Home', 2, 4)).toBe(0); expect(nextIndex('End', 0, 4)).toBe(3); expect(nextIndex('a', 0, 4)).toBeUndefined()
    const vue = rd('src/components/NavMenu.vue'); for (const k of ['Escape', 'aria-expanded', 'aria-controls', 'focus()']) expect(vue, k).toContain(k)
    const css = rd('src/style.css'); expect(css).toContain('@media (max-width: 720px)'); expect(css).toContain('.nm-groups.sheet')
  })
})

describe('OV-10 card tabs', () => {
  it('OV-10 every CP-1 block belongs to a tab', () => {
    expect(TABS.map(t => t.label)).toEqual(['Огляд', 'Форми', 'Історія', 'Значення', 'Поширення', 'Джерела'])
    expect(Object.keys(BLOCK_TAB).sort()).toEqual(Object.keys(BLOCKS).sort())
    for (const [b, t] of Object.entries(BLOCK_TAB)) expect(TABS.some(x => x.id === t), b).toBe(true)
    expect(BLOCK_TAB.epochs).toBe(BLOCK_TAB.stress); expect(BLOCK_TAB.epochs).toBe('forms')    // словозміна і за епохами: one category
    // every Panel id of the card layouts is placed in a tab
    const ids = new Set<string>()
    for (const f of ['src/views/WordView.vue', 'src/views/FormView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/EtymologyBlock.vue', 'src/components/CognatesPanel.vue', 'src/components/PhrasePanel.vue'])
      for (const m of rd(f).matchAll(/<Panel[^>]* id="([a-z]+-[a-z0-9-]+)"/g)) ids.add(m[1]!)
    for (const id of ids) expect(tabOfId(id) ?? (SIDEBAR_PANELS.includes(id) ? 'side' : undefined), id).toBeTruthy()
    expect(Object.keys(PANEL_TAB).length).toBeGreaterThan(30)
  })
  it('OV-10 every card kind mounts its blocks under the tabs', async () => {
    // views with their own layout
    const w = rd('src/views/WordView.vue'), f = rd('src/views/FormView.vue'), p = rd('src/views/PhraseView.vue')
    for (const [name, src] of [['word', w], ['form', f], ['phrase', p]] as const) expect(src, name).toContain('<CardTabs')
    // the paradigm and the epoch cells sit in the same «Форми» tab of the word card
    const tabOf = (src: string, id: string) => { const parts = src.split(/<template #/).slice(1); return parts.find(x => x.includes(`id="${id}"`))?.split('>')[0] }
    expect(tabOf(w, 'h-par')).toBe('forms'); expect(tabOf(w, 'h-ep')).toBe('forms'); expect(tabOf(w, 'h-prov')).toBe('history'); expect(tabOf(w, 'h-kw')).toBe('sources'); expect(tabOf(w, 'h-st')).toBe('side'); expect(tabOf(w, 'h-map')).toBe('spread'); expect(tabOf(w, 'h-sn')).toBe('meanings')
    expect(tabOf(f, 'f-ep')).toBe('forms'); expect(tabOf(f, 'f-der')).toBe('history'); expect(tabOf(f, 'f-kw')).toBe('sources'); expect(tabOf(f, 'f-dia')).toBe('spread')
    // the thin kinds go through ThinCard, which has the five tabs and the slots the hosts fill
    for (const k of ['light', 'dict', 'uv', 'unlinked', 'archaic', 'name', 'orv'] as const) expect(KINDS[k].join(' '), k).toContain('ThinCard')
    const html = await render(ThinCard, { lemma: 'невідомеслово', spelling: 'невідомеслово', kwic: [], dictOnly: true, f: 0 }, '/', { sources: () => h('i', { id: 'slot-src' }), meanings: () => h('i', { id: 'slot-mean' }) })
    for (const t of TABS) { expect(html, t.id).toContain(`id="cpane-${t.id}"`); expect(html).toContain(`id="ctab-${t.id}"`) }
    expect(html).toContain('role="tablist"'); expect(html).toContain('aria-selected="true"')
    const pane = (id: string) => html.split(`id="cpane-${id}"`)[1]!.split('class="cpane"')[0]! + html.split(`id="cpane-${id}"`)[1]!
    expect(pane('sources')).toContain('id="t-kw"'); expect(html.split('id="cpane-sources"')[1]).toContain('slot-src'); expect(html.split('id="cpane-meanings"')[1]!.split('id="cpane-spread"')[0]).toContain('slot-mean')
    expect(html.split('id="cpane-forms"')[1]!.split('id="cpane-history"')[0]).toContain('id="t-ipa"')
    expect(html.split('id="cpane-history"')[1]!.split('id="cpane-meanings"')[0]).toContain('id="t-der"')
    expect(html.split('id="cpane-spread"')[1]!.split('id="cpane-sources"')[0]).toContain('id="t-dia"')
    // every CP-1 cell that was shown or empty is still there: the parity test walks the sources; here only the tab for each block is checked to exist
    for (const k of Object.keys(MATRIX) as (keyof typeof MATRIX)[]) for (const b of Object.keys(BLOCKS) as (keyof typeof BLOCKS)[]) expect(TABS.some(t => t.id === BLOCK_TAB[b]), `${k}×${b}`).toBe(true)
    const solo = await render(CardTabs, { tabs: ['meanings', 'sources'] }, '/', { meanings: () => 'M', sources: () => 'S' })
    expect(solo).toContain('id="cpane-meanings"'); expect(solo).not.toContain('id="cpane-forms"')
    for (const k of ['ArrowRight', 'aria-controls', 'tabindex']) expect(rd('src/components/CardTabs.vue'), k).toContain(k)
  })
})
