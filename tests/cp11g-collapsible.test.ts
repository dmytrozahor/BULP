/** SPEC 63 CP-11g: «Родина варіантів» (and the CP-11 HypLinks block) are collapsed by default, with the count in the summary; the state is remembered in localStorage; content renders on first open. */
import { describe, it, expect, afterEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { assemble } from '../core/corr.ts'
import { familyPairs } from '../core/corr-src.ts'
import CorrView from '../src/components/CorrView.vue'
import Collapsible from '../src/components/Collapsible.vue'

const render = async (c: object, props: Record<string, unknown>, slot?: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props, slot ? { default: () => h('p', slot) } : undefined) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const groups = assemble(familyPairs()).groups, grp = groups.find(g => g.members.some(m => m.form === 'між'))!, head = 'між', others = grp.members.filter(m => m.form !== head)
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage })

describe('CP-11g collapsible blocks', () => {
  it('«Відповідники» (the former «Родина варіантів») is collapsed by default: title + count in the summary, no member rendered yet', async () => {
    const html = await render(CorrView, { lemma: head, groups })
    expect(html).toContain(`Відповідники · ${others.length}`); expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('data-testid="coll-body"'); expect(html).not.toContain('<table')
  })
  it('opening it (the remembered state, localStorage "1") shows the group; a throwing localStorage just starts closed', async () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => '1', setItem: () => { throw new Error('blocked') } }
    const open = await render(CorrView, { lemma: head, groups })
    expect(open).toContain('aria-expanded="true"'); expect(open).toContain('data-testid="coll-body"'); expect(open).toContain(others[0]!.form)
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => {} }
    expect(await render(CorrView, { lemma: head, groups })).toContain('aria-expanded="false"')
  })
  it('the generic block (used by HypLinks) collapses with its count and shows the items once open', async () => {
    const closed = await render(Collapsible, { id: 't', title: 'Початкова форма й похідні', count: 3 }, 'ITEMS')
    expect(closed).toContain('Початкова форма й похідні · 3'); expect(closed).not.toContain('ITEMS')
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => '1', setItem: () => {} }
    expect(await render(Collapsible, { id: 't', title: 'Початкова форма й похідні', count: 3 }, 'ITEMS')).toContain('ITEMS')
  })
})
