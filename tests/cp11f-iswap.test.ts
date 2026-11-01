/** SPEC 63 CP-11f: и ↔ і variants. A real word is never a hypothesis; two real words (кит ≠ кіт) are never linked; only a cited same-lemma source lists a variant on a real card. */
import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { swapCandidates, swapRule, SWAP_NO_SOURCE } from '../core/iswap.ts'
import { buildHypothesis, relationsOf, type Deps, type Found } from '../src/lib/hypothesis.ts'
import { D } from '../core/evidence.ts'
import HypothesisCard from '../src/components/HypothesisCard.vue'

const real = (w: string, to = `/w/${encodeURIComponent(w)}`, tags = 'noun:inanim:m:v_naz'): Found => ({ word: w, to, tags })
const lex = (words: string[], extra: Partial<Deps> = {}): Deps => ({ resolve: async w => (words.includes(w) ? real(w) : undefined), ...extra })
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}

describe('CP-11f swaps', () => {
  it('candidates: one swap at every и / і position, then two; never the word itself', () => {
    expect(swapCandidates('ирод')).toEqual(['ірод'])
    expect(swapCandidates('иней')).toEqual(['іней'])
    expect(swapCandidates('кит')).toEqual(['кіт'])
    expect(swapCandidates('бидіти', 2)).toEqual(expect.arrayContaining(['бідіти', 'бидити', 'бідити']))
    expect(swapCandidates('стіл')).toEqual(['стил'])
  })
  it('rules: initial и- = Желехівка, и between consonants before a final consonant = ярижка, anything else = kind P без джерела', () => {
    expect(swapRule('ирод', 'ірод').id).toBe('SW-ZHEL-INIT')
    expect(swapRule('кит', 'кіт').id).toBe('SW-YAR')
    expect(swapRule('бидіти', 'бидити').id).toBe('SW-NONE')
    const none = swapRule('бидіти', 'бидити')
    expect(none.cite.kind).toBe('P'); expect(none.cite.quote).toContain(SWAP_NO_SOURCE)
  })
})

describe('CP-11f pages', () => {
  it('ирод and иней (no entry) are swap hypotheses linking to the real ірод / іней, with the cited rule', async () => {
    const h1 = await buildHypothesis('ирод', lex(['ірод'])), h2 = await buildHypothesis('иней', lex(['іней']))
    expect(h1?.relations).toMatchObject([{ role: 'swap', form: 'ірод', to: '/w/' + encodeURIComponent('ірод'), hyp: false }])
    expect(h1!.rules[0]!.id).toBe('SW-ZHEL-INIT'); expect(h1!.claim.method).toBe('hypothesis')
    expect(h2?.relations[0]).toMatchObject({ role: 'swap', form: 'іней' })
    const html = await render(HypothesisCard, { hyp: h1 })
    expect(html).toContain('гіпотеза, без доказів'); expect(html).toContain('варіант з и/і'); expect(html).toContain('ірод')
  })
  it('two swaps work too, and a nonsense word with no real word within two swaps has no page', async () => {
    const two = await buildHypothesis('бидити', lex(['бідіти']))
    expect(two?.relations[0]).toMatchObject({ role: 'swap', form: 'бідіти' }); expect(two!.rules[0]!.id).toBe('SW-NONE')   // no cited rule: stays a kind-P hypothesis
    expect(await buildHypothesis('щиґлиб', lex(['слово', 'ірод']))).toBeUndefined()
    expect(await buildHypothesis('ширимлиси', lex(['слово']))).toBeUndefined()
  })
  it('кит and кіт are both real: /w/кит is its own card, never a swap hypothesis; neither card links to the other', async () => {
    const d = lex(['кит', 'кіт'])
    expect(await buildHypothesis('кит', d)).toBeUndefined(); expect(await buildHypothesis('кіт', d)).toBeUndefined()
    for (const [w, other] of [['кит', 'кіт'], ['кіт', 'кит']] as const) {
      const rel = await relationsOf(w, 'noun:inanim:m:v_naz', d, [w, w + 'а'])
      expect(rel.map(r => r.form), w).not.toContain(other); expect(rel.some(r => r.to.includes(encodeURIComponent(other))), w).toBe(false)
      expect(rel.some(r => r.role === 'swap' || r.role === 'attested')).toBe(false)
    }
  })
  it('a real card lists only ATTESTED variants of its own lemma, with their cites: a corpus spelling, an old-dictionary row; unattested swaps stay out', async () => {
    const ev = D('R2U', 'Желехівський', 'Иро́д')
    const d = lex(['ірод', 'ирод2'], { oaOf: async () => [{ form: 'ирод', ev }, { form: 'зовсім', ev }] })
    const rel = await relationsOf('ірод', 'noun:anim:m:v_naz', d, ['ірод', 'иродів', 'ирод'])
    const att = rel.filter(r => r.role === 'attested')
    expect(att.map(r => r.form)).toEqual(['ирод'])   // the corpus spelling «ирод» (first source); the oa row of the same spelling is not repeated; «зовсім» is another word
    expect(att[0]!.evidence!.length).toBeGreaterThan(0)
    expect(rel.every(r => r.role !== 'swap')).toBe(true)
  })
})
