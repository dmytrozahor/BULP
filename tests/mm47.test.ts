/** MM-47 (owner: «говір східнополіський: говорити · [ɦɑwɑˈrɪtɪ̞] — не змінило написання»): the dialect IPA and the dialect spelling read the SAME stress. */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import OvPronunciation from '../src/components/OvPronunciation.vue'
import { setDialect, resetViews } from '../src/lib/views.ts'
import { respell } from '../core/respell.ts'
import { toIpa } from '../core/ipa.ts'

const render = async (props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(OvPronunciation as object, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
describe('MM-47', () => {
  it('CHN-AKANYE: stress given -> spelling гаварити and IPA with [ɑ]; the cited rule is the same one', () => {
    const r = respell('говорити', 'CHN', { positions: [5], pos: 'verb' })
    expect(r.text).toBe('гаварити'); expect(r.fired.map(f => f.rule)).toEqual(['CHN-AKANYE'])
    expect(toIpa('говорити', [5], 'CHN').ipa).toContain('ɦɑwɑ')
  })
  it('OvPronunciation: the dialect line shows the respelled word, not говорити, when the IPA is respelled', async () => {
    setDialect('CHN')
    try {
      const html = await render({ word: 'говорити', positions: [5], loaded: true })
      const txt = (x: string) => x.replace(/<[^>]+>/g, '')
      const line0 = html.split('data-testid="ov-pron-dialect"')[1]!.split('</p>')[0]!
      const line = txt(line0); expect(line).toContain('гаварити'); expect(line).toContain('ɦɑwɑ')
      const sp = html.split('data-testid="ov-spelling"')[1]!.split('</p>')[0]!; expect(txt(sp)).toContain('гаварити')
    } finally { setDialect(''); resetViews() }
  })
  it('no stress anywhere: neither the spelling nor the IPA is respelled by a stress rule', () => {
    expect(respell('говорити', 'CHN', { pos: 'verb' }).text).toBe('говорити')
    expect(toIpa('говорити', null, 'CHN').ipa).not.toContain('ɦɑwɑ')
  })
})
