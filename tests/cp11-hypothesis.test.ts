/** SPEC 63 CP-11 (hypothesis pages for original / derived forms) and CP-11b (Plast terms are a tier after the general results). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { baseCandidates, derivedCandidates, HYP_BADGE, HYP_GRADE, hypClaim, isPluralOnly, pluralCandidates, RULES, singularOf } from '../core/hypothesis.ts'
import { buildHypothesis, relationsOf, type Deps, type Found } from '../src/lib/hypothesis.ts'
import HypothesisCard from '../src/components/HypothesisCard.vue'

const PL = 'noun:inanim:p:v_naz:ns'
const lexicon = (extra: Record<string, Found> = {}): Deps => {
  const L: Record<string, Found> = {
    'байдики': { word: 'байдики', to: '/lw/байдики', tags: PL },
    'байдикувати': { word: 'байдикувати', to: '/w/байдикувати', tags: 'verb:imperf:inf' },
    'байдикування': { word: 'байдикування', to: '/w/байдикування', tags: 'noun:inanim:n:v_naz' },
    'ножиці': { word: 'ножиці', to: '/lw/ножиці', tags: PL },
    'слово': { word: 'слово', to: '/w/слово', tags: 'noun:inanim:n:v_naz' }, ...extra,
  }
  const gen: Record<string, string> = { 'байдики': 'байдиків', 'ножиці': 'ножиць' }
  return { resolve: async w => L[w], genPl: async w => gen[w] }
}
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}

describe('CP-11 rules', () => {
  it('plural-only nouns get the singular of the regular declension, by the genitive plural when known', () => {
    expect(singularOf('байдики', 'байдиків')[0]!.form).toBe('байдик')
    expect(singularOf('байдики')[0]!.form).toBe('байдик')
    expect(singularOf('ножиці', 'ножиць')[0]).toMatchObject({ form: 'ножиця', rule: RULES['SG-F-JA'] })
    expect(singularOf('двері', 'дверей')[0]!.form).toBe('дверь')
    expect(singularOf('ясла', 'ясел')[0]!.form).toBe('ясло')
    expect(singularOf('окуляри', 'окулярів')[0]!.form).toBe('окуляр')
  })
  it('VESUM tags: only plural + ns is a plurale tantum', () => {
    expect(isPluralOnly(PL)).toBe(true)
    expect(isPluralOnly('noun:inanim:p:v_naz')).toBe(false)
    expect(isPluralOnly('noun:inanim:m:v_naz')).toBe(false)
    expect(pluralCandidates('байдик')).toContain('байдики')
  })
  it('derivation candidates go both ways (байдик ~ байдикувати ~ байдикування, байдикство)', () => {
    expect(derivedCandidates('байдик').map(r => r.form)).toEqual(expect.arrayContaining(['байдикувати', 'байдикування', 'байдикство']))
    expect(baseCandidates('байдикування')[0]!.form).toBe('байдикувати')
    expect(baseCandidates('байдикувати')[0]!.form).toBe('байдик')
    expect(baseCandidates('майстерство')[0]!.form).toBe('майстер')
  })
  it('the hypothesis claim passes claim(): kind P «джерела не знайдено», method hypothesis, never attested', () => {
    const c = hypClaim('байдик', RULES['SG-M']!, 'байдики')
    expect(c.method).toBe('hypothesis'); expect(c.evidence.every(e => e.kind === 'P')).toBe(true)
    expect(c.evidence.some(e => e.quote.includes('джерела не знайдено'))).toBe(true)
    for (const r of Object.values(RULES)) expect(() => hypClaim('х', r, 'у')).not.toThrow()
    expect(HYP_GRADE).not.toMatch(/^засвідчен/); expect(HYP_BADGE).toBe('гіпотеза, без доказів')
  })
})

describe('CP-11 pages', () => {
  it('байдик (no entry) is a hypothesis page linking to байдики and байдикувати', async () => {
    const h0 = await buildHypothesis('байдик', lexicon())
    expect(h0).toBeTruthy()
    const to = h0!.relations.map(r => r.to)
    expect(to).toContain('/lw/байдики'); expect(to).toContain('/w/байдикувати'); expect(to).toContain('/w/байдикування')
    expect(h0!.rules.map(r => r.id)).toContain('SG-M'); expect(h0!.claim.method).toBe('hypothesis')
    const html = await render(HypothesisCard, { hyp: h0 })
    expect(html).toContain('гіпотеза, без доказів'); expect(html).toContain('data-testid="hyp-badge"')
    expect(html).toContain('байдики'); expect(html).toContain('байдикувати'); expect(html).toContain('однина відтворена за зразком відміни')
  })
  it('байдики links to the hypothetical singular; an attested singular is a real page, not a hypothesis', async () => {
    const rel = await relationsOf('байдики', PL, lexicon())
    const sg = rel.find(r => r.role === 'singular')!
    expect(sg).toMatchObject({ form: 'байдик', hyp: true, to: '/w/' + encodeURIComponent('байдик') })
    const att = await relationsOf('байдики', PL, lexicon({ 'байдик': { word: 'байдик', to: '/lw/байдик', tags: 'noun:inanim:m:v_naz' } }))
    expect(att.find(r => r.role === 'singular')).toMatchObject({ hyp: false, to: '/lw/байдик' })
    expect(await buildHypothesis('байдик', lexicon({ 'байдик': { word: 'байдик', to: '/lw/байдик', tags: '' } }))).toBeUndefined()
  })
  it('the base chain of байдикування ends at the hypothetical байдик', async () => {
    const rel = await relationsOf('байдикування', 'noun:inanim:n:v_naz', lexicon())
    expect(rel.map(r => [r.form, r.hyp])).toEqual([['байдикувати', false], ['байдик', true]])
  })
  it('a real word is never marked hypothetical, and a word with no derivable relation has no page', async () => {
    const d = lexicon()
    for (const w of ['байдики', 'байдикувати', 'байдикування', 'слово']) expect(await buildHypothesis(w, d), w).toBeUndefined()
    expect(await buildHypothesis('абракадабра', d)).toBeUndefined()
    expect(await buildHypothesis('ножиця', d)).toBeTruthy()
    expect((await relationsOf('слово', 'noun:inanim:n:v_naz', d)).every(r => r.role !== 'singular')).toBe(true)
  })
})

describe('CP-11 budgets and ordering', () => {
  const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  it('the hypothesis path adds no data file and is lazy: no per-word shard, route component async, search debounced', () => {
    expect(rd('src/lib/hypothesis.ts')).not.toMatch(/fetchJson|\.\/data\//)
    expect(rd('src/views/WordView.vue')).toMatch(/defineAsyncComponent\(\(\) => import\('\.\.\/components\/HypothesisGate\.vue'\)\)/)
    expect(rd('src/views/SearchView.vue')).toMatch(/setTimeout\(r, 350\)/)
  })
  it('CP-11b: Plast terms are the tier after every other result, the hypothetical forms the last', () => {
    const s = rd('src/views/SearchView.vue'), at = (t: string) => s.indexOf(t)
    const plast = at('<section v-if="plast.length"'), hyp = at('<section v-if="hypHit"')
    for (const t of ['<ul v-else-if="rows.length"', '<section v-if="cardHits.length"', 'data-testid="dict-hits"', 'data-testid="uv-hits"']) {
      expect(at(t), t).toBeGreaterThan(-1); expect(at(t), t).toBeLessThan(plast)
    }
    expect(plast).toBeLessThan(hyp)
  })
})
