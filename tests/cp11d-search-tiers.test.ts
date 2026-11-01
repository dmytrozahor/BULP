/** SPEC 63 CP-11d: the RENDERED search page lists the tiers in one order: main results, «інші картки», dictionary-only / unverified, Plast, hypotheses. */
import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, h, ref, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('../src/lib/parts.ts', async io => ({
  ...(await io<object>()),
  searchRemote: async () => ({ lemmas: [{ lemma: 'Мартин', matched: 'Мартин', via: 'lemma', rank: 0 }], cards: [{ kind: 'lw', id: 'Борода', matched: 'Борода', rank: 1 }] }),
  searchDict: async () => [{ kind: 'lw', id: 'Кабан', matched: 'Кабан', rank: 1, dict: true }],
  ixCards: { get: () => undefined, has: () => false },
  lemmaPage: () => [],
}))
vi.mock('../src/lib/uvData.ts', async io => ({ ...(await io<object>()), uvSearch: async () => [{ group: 'Лоза', head: 'Лоза', matched: 'Лоза', exact: false }] }))
vi.mock('../src/lib/sociolectData.ts', async io => ({ ...(await io<object>()), plastSearch: () => [{ w: 'Рушник', g: 'човен', k: 'term', loc: 'стор. 1', s: 'PL', src: 'PL', byGloss: false }] }))
vi.mock('../src/lib/hypothesis.ts', async io => ({ ...(await io<object>()), buildHypothesis: async () => ({ word: 'Сокіл', rules: [{ pattern: '-ик / -ики' }], relations: [{ form: 'байдики' }] }), hypTo: (w: string) => `/w/${w}` }))
vi.mock('../src/composables/useData.ts', async io => ({
  ...(await io<object>()),
  useData: () => ({ loaded: ref(true), byLemma: ref(new Map()), corpus: ref({ N: 1, nLemmas: 1 }), witnessById: ref(new Map()), searchIdx: ref({ map: new Map(), keys: [] }) }),
  authorInfo: () => ({ name: '' }),
}))

// the page is rendered by the server renderer; a global serverPrefetch holds the render until the page's own watchers (debounced search, dictionary, Plast, hypothesis) have settled
describe('CP-11d rendered search tiers', () => {
  it('a query matching a main lemma, an other card, a dictionary word, an unverified spelling, a Plast term and a hypothesis renders them in that order', async () => {
    const SearchView = (await import('../src/views/SearchView.vue')).default as Component
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: SearchView }] })
    router.push('/?q=байд'); await router.isReady()
    const app = createSSRApp({ render: () => h(SearchView) }); app.use(router)
    app.mixin({ serverPrefetch() { return new Promise(r => setTimeout(r, 700)) } })
    const out = await renderToString(app)
    const at = (s: string) => out.indexOf(s)
    const order = ['Мартин', 'data-testid="card-hits"', 'Борода', 'data-testid="dict-hits"', 'Кабан', 'data-testid="uv-hits"', 'Лоза', 'Рушник', 'data-testid="hyp-hits"', 'Сокіл'].map(s => [s, at(s)] as const)
    for (const [s, i] of order) expect(i, `${s} is rendered`).toBeGreaterThan(-1)
    const idx = order.map(o => o[1])
    expect(idx, order.map(o => o[0]).join(' < ')).toEqual([...idx].sort((a, b) => a - b))
    // the main lemma is the first result of all, the other card is not above it
    expect(at('Мартин')).toBeLessThan(at('data-testid="card-hits"'))
  })
})
