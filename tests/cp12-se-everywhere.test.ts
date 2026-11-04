/**
 * SPEC 63 CP-12 (owner «Слово зміна за епохами теж має бути завжди»): the block «Значення за епохами» is on EVERY word card, with the six epochs listed even when no data exists
 * («немає даних»), and «немає даних (гіпотетична форма)» on a CP-11 hypothesis page. Server-side render, no browser needed.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { SE_EPOCH_IDS } from '../core/se.ts'
import SenseEpochs from '../src/components/SenseEpochs.vue'
import ThinCard from '../src/components/ThinCard.vue'
import HypothesisCard from '../src/components/HypothesisCard.vue'

// the lm/se shard has arrived and holds nothing for the word: the empty state, not «завантаження…»
vi.mock('../src/lib/seData.ts', () => ({ seOf: () => undefined, seLoaded: () => true }))
vi.mock('../src/lib/thinPar.ts', () => ({ parOf: () => undefined, parLoaded: () => true }))
const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const epochs = (html: string) => SE_EPOCH_IDS.every(id => html.includes(`data-epoch="${id}"`))

describe('CP-12 «Значення за епохами» on every card', () => {
  for (const [name, seKind, dictOnly] of [['light', undefined, false], ['dictionary-only /lw', undefined, true], ['archaic /ar', 'arch', false], ['orv/name', 'orv', false], ['uv/unlinked (mu)', 'mu', false]] as const) {
    it(`the ${name} card lists all six epochs with «немає даних» when the word has no sense data`, async () => {
      const html = await render(ThinCard, { lemma: 'невідомеслово', spelling: 'невідомеслово', kwic: [], dictOnly, f: 0, seKind })
      expect(html).toContain('data-testid="ov-senses"'); expect(html).toContain('Значення за епохами')
      expect(epochs(html)).toBe(true)
      expect(html).toContain('немає даних'); expect(html).not.toContain('немає даних про значення')
    })
  }
  it('the full card (/w, /f) block lists the six epochs with «немає даних» in both the compact and the panel form', async () => {
    for (const compact of [true, false]) {
      const html = await render(SenseEpochs, { word: 'невідомеслово', kind: 'full', compact, open: true })
      expect(epochs(html), String(compact)).toBe(true); expect(html).toContain('немає даних')
      expect(html).toContain(compact ? 'data-testid="se-full-compact"' : 'data-testid="se-full"')
    }
  })
  it('a CP-11 hypothesis page carries the block: every epoch «немає даних (гіпотетична форма)», and no lm/se fetch is asked for', async () => {
    const h0 = { word: 'байдик', notes: [], rules: [], relations: [], claim: { evidence: [] } }
    const html = await render(HypothesisCard, { hyp: h0 })
    expect(html).toContain('Значення за епохами'); expect(epochs(html)).toBe(true)
    expect(html.match(/немає даних \(гіпотетична форма\)/g)!.length).toBe(SE_EPOCH_IDS.length)
  })
  it('every view that prints a word card mounts the block (source check for the cards too heavy to render here)', () => {
    for (const f of ['src/views/WordView.vue', 'src/views/FormView.vue', 'src/components/ThinCard.vue', 'src/components/OverviewTab.vue', 'src/components/HypothesisCard.vue']) expect(rd(f), f).toContain('<SenseEpochs')
  })
  it('lazy: SenseEpochs lives in the card chunks (no new global import), and the hypothesis never reads the shard', () => {
    expect(rd('src/components/SenseEpochs.vue')).toContain('props.hypothesis ? undefined')
    expect(rd('src/main.ts')).not.toContain('SenseEpochs')
  })
})
