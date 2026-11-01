/** SPEC 63 CP-11g: «Родина варіантів» (and the CP-11 HypLinks block) are collapsed by default, with the count in the summary; the state is remembered in localStorage; content renders on first open. */
import { describe, it, expect, afterEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VARIANT_FAMILIES } from '../core/variant-families.ts'
import VariantFamilyLine from '../src/components/VariantFamilyLine.vue'
import Collapsible from '../src/components/Collapsible.vue'

const render = async (c: object, props: Record<string, unknown>, slot?: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props, slot ? { default: () => h('p', slot) } : undefined) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const fam = VARIANT_FAMILIES[0]!
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage })

describe('CP-11g collapsible blocks', () => {
  it('«Родина варіантів» is collapsed by default: title + count in the summary, no member rendered yet', async () => {
    const html = await render(VariantFamilyLine, { lemma: fam.head })
    expect(html).toContain(`Родина варіантів · ${fam.members.length}`); expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('data-testid="coll-body"'); expect(html).not.toContain(fam.members[0]!.form + '</a>')
  })
  it('opening it (the remembered state, localStorage "1") shows the family; a throwing localStorage just starts closed', async () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => '1', setItem: () => { throw new Error('blocked') } }
    const open = await render(VariantFamilyLine, { lemma: fam.head })
    expect(open).toContain('aria-expanded="true"'); expect(open).toContain('data-testid="coll-body"'); expect(open).toContain(fam.members[0]!.form)
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => {} }
    expect(await render(VariantFamilyLine, { lemma: fam.head })).toContain('aria-expanded="false"')
  })
  it('the generic block (used by HypLinks) collapses with its count and shows the items once open', async () => {
    const closed = await render(Collapsible, { id: 't', title: 'Початкова форма й похідні', count: 3 }, 'ITEMS')
    expect(closed).toContain('Початкова форма й похідні · 3'); expect(closed).not.toContain('ITEMS')
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => '1', setItem: () => {} }
    expect(await render(Collapsible, { id: 't', title: 'Початкова форма й похідні', count: 3 }, 'ITEMS')).toContain('ITEMS')
  })
})
