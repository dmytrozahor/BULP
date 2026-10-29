/** SPEC 63 CP-10.5: the form page prints the stress of the spelling (GG-14), else the lemma's, else the honest «не встановлено (перевірено: …)»; the loan adaptation of the lemma is mounted. */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { StLemma } from '../core/stress-src.ts'

const ST = vi.hoisted(() => ({ data: undefined as StLemma[] | undefined, loaded: true }))
vi.mock('../src/lib/stressSrc.ts', () => ({ stOf: () => ST.data, stLoaded: () => ST.loaded }))
import FormStress from '../src/components/FormStress.vue'

const render = async (props: { form: string; lemma: string; lemmaStress?: unknown[] }) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(FormStress, props as never) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const lemmaStress = [{ form: 'вода', positions: [2], status: 'unknown', method: 'dictionary', evidence: [{ source: 'ulif', quote: 'вода́' }] }]

describe('CP-10.5 FormStress', () => {
  it('prints the stress of the spelling with its source when lm/st has the form', async () => {
    ST.data = [{ lemma: 'вода', variants: [], forms: [{ form: 'во́ду', positions: [1], src: 'kaikki' }] }]
    const html = await render({ form: 'воду', lemma: 'вода', lemmaStress })
    expect(html).toContain('data-testid="cp-stress"'); expect(html).toContain('data-testid="form-stress"'); expect(html).toContain('во́ду'); expect(html).toContain('en.wiktionary')
  })
  it('falls back to the lemma stress, labelled as the lemma’s', async () => {
    ST.data = undefined
    const html = await render({ form: 'воді', lemma: 'вода', lemmaStress })
    expect(html).toContain('(леми)'); expect(html).not.toContain('form-stress-none')
  })
  it('says «наголос не встановлено (перевірено: …)» when nothing prints it', async () => {
    ST.data = undefined
    const html = await render({ form: 'воді', lemma: 'вода', lemmaStress: [] })
    expect(html).toContain('наголос не встановлено (перевірено:')
  })
  it('FormView mounts FormStress and the lemma’s loan adaptation', () => {
    const v = readFileSync('src/views/FormView.vue', 'utf8')
    expect(v).toContain('<FormStress'); expect(v).toContain('<LoanAdaptBlock v-if="pick.lemma.toLowerCase() !== pick.raw.toLowerCase()" :word="pick.lemma" />')
  })
  it('CP-10.8 the «можливо також» list names the types in Ukrainian, not as raw ids (yazychie, cs)', () => {
    const v = readFileSync('src/components/WordRuleChips.vue', 'utf8')
    expect(v).toContain('possible.slice(1).map(kindUk)'); expect(v).toContain('RU_KIND_UK[k]')
  })
  it('CP-10.9 the text reader resolves tokens through settled() (the prefix shards load lazily), not a synchronous computed', () => {
    const v = readFileSync('src/views/TextsView.vue', 'utf8')
    expect(v).toContain('await settled(() => rowsOf('); expect(v).not.toMatch(/const rows = computed(/)
  })
})
