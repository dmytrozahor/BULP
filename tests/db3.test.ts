/** SPEC 63 DB-3 / DB-3b: the dialect VARIANT is a card of its own (/v/<dialect>/<form>?of=<lemma>), not a panel above the standard card. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, createApp, createSSRApp, h, nextTick, ref, type App } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import type { CorrGroup, CorrMember } from '../core/corr.ts'
import { resolveSub, subAction, variantPlan, variantFormHits, variantTo, NOTE_RULE } from '../core/subcard.ts'
import { variantStats, type VForm } from '../core/variant-card.ts'
import { Q } from '../core/evidence.ts'
import { key } from '../core/text.ts'

const GROUPS: Record<string, CorrGroup[]> = {}
const d1 = { w1: { id: 'w1', title: 'Пам’ятка про тєжко', date: [1750, 1750] as [number, number], region: 'Галичина', witnessType: 'print' }, w2: { id: 'w2', title: 'Друга', date: [1800, 1800] as [number, number], region: 'Волинь', witnessType: 'print' }, w3: { id: 'w3', title: 'Звичайна', date: [1600, 1600] as [number, number], region: 'Київ і Київщина', witnessType: 'print' }, ocr: { id: 'ocr', title: 'OCR', date: [1500, 1500] as [number, number], region: 'Галичина', witnessType: 'ocr', oq: { band: 'low' } } }
const PARENT = { lemma: 'тяжко', pos: 'adv', paradigm: [{ form: 'тяжко', tags: 'adv' }, { form: 'тяжче', tags: 'adv:compr' }], first: { value: 'unknown', evidence: [] }, claims: { dialect: {} }, stats: { f: 53, ipm: 99, hk: 1, dots: 3, byRegion: [] } }
const FORMS = [
  { raw: 'тяжко', modern: 'тяжко', f: 50, date: [1600, 1600], byW: { w3: 50 }, kwic: [], claims: {}, hints: [], epochs: [], derivation: [] },
  { raw: 'тєжко', modern: 'тєжко', f: 3, date: [1750, 1750], byW: { w1: 2, w2: 1 }, kwic: [{ w: 'w1', loc: '1', left: 'було', node: 'тєжко', right: 'жити', date: [1750, 1750] }], claims: {}, hints: [], epochs: [], derivation: [] },
]
const cards = new Set<string>()
vi.mock('../src/lib/corrData.ts', () => ({ corrOf: (w: string) => GROUPS[w] ?? [] }))
vi.mock('../src/composables/useData.ts', () => ({
  useData: () => ({
    loaded: ref(true), corpus: ref({ N: 1_000_000, regions: [{ code: 'halychyna', name: 'Галичина', oblasts: [], N: 100000 }, { code: 'volyn', name: 'Волинь', oblasts: [], N: 50000 }, { code: 'kyiv', name: 'Київ і Київщина', oblasts: [], N: 400000 }], centurySizes: { '18': 200000, '17': 100000, '16': 50000 }, epochSizes: {} }),
    byLemma: computed(() => new Map<string, unknown>([['тяжко', PARENT], ...[...cards].map(c => [c, { ...PARENT, lemma: c }] as [string, unknown])])), witnessById: computed(() => new Map(Object.entries(d1))),
    fullOf: (c: unknown) => (c ? { ...(c as object), forms: FORMS, stats: PARENT.stats, stress: [] } : undefined), detailError: new Map(), searchIdx: ref(), att: ref(), annData: ref(), sourceTitle: (s: string) => s, sourceUrl: () => undefined, isFixture: ref(false), ensureCorpus: async () => {},
  }),
}))
for (const c of ['SensesBlock', 'EtymologyBlock', 'DialectBadge', 'FreqCurve', 'RegionMap', 'RegionBars', 'Kwic']) vi.doMock(`../src/components/${c}.vue`, () => ({ default: { props: ['lemma', 'chipsIn', 'series', 'sizes', 'by', 'chips'], render() { return h('div', { class: 'stub-' + c }, c) } } }))
const { useSubcard } = await import('../src/lib/useSubcard.ts')
const { dialect, show, setDialect, resetViews } = await import('../src/lib/views.ts')
const SubcardTop = (await import('../src/components/SubcardTop.vue')).default
const VariantView = (await import('../src/views/VariantView.vue')).default

const ev = Q('DICT', 'https://example.org/x', 'тєжко — діал.')
const mem = (form: string, relation: CorrMember['relation'], code?: string, norm = false): CorrMember => ({ form, norm, relation, areas: code ? [{ dialect: 'наддністрянський', code, grade: 'dict', ev }] : [], src: ['t'], evidence: [ev] })
const grp = (...members: CorrMember[]): CorrGroup => ({ id: 'g', meaning: 'сполучник мети', pos: 'conj', members })
const routes = [{ path: '/w/:lemma', component: { render: () => null } }, { path: '/v/:dialect/:form', component: { render: () => null } }]
const W = (l: string) => '/w/' + encodeURIComponent(l)

const mountLemma = async (path: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const app = createApp({ render: () => null }); app.use(router)
  let sub!: ReturnType<typeof useSubcard>
  await router.push(path); await router.isReady()
  const lemma = decodeURIComponent(path.split('/w/')[1]!.split('?')[0]!)
  app.runWithContext(() => { sub = useSubcard(() => lemma, () => show(lemma, dialect.value, '2019', {}), f => cards.has(f), () => router.currentRoute.value.path.startsWith('/w/')) })
  return { router, sub }
}
const settle = async () => { for (let i = 0; i < 6; i++) { await nextTick(); await new Promise(r => setTimeout(r, 0)) } }
const ssr = async (comp: object, props: Record<string, unknown>, path = '/') => {
  const router = createRouter({ history: createMemoryHistory(), routes }); await router.push(path); await router.isReady()
  const app: App = createSSRApp({ render: () => h(comp, props) }); app.use(router)
  return renderToString(app)
}
const OF = '?of=' + encodeURIComponent('тяжко')
beforeEach(() => { for (const k of Object.keys(GROUPS)) delete GROUPS[k]; cards.clear(); setDialect(''); resetViews() })

describe('DB-3 which form: the attested member, the own form of the card, the rule respelling, or nothing', () => {
  const shownOf = (w: string, d: string) => show(w, d, '2019', {})
  it('a CR-1 member of that dialect wins over the rules (a printed form, with its evidence)', () => {
    const p = resolveSub('тяжко', 'NDN', [grp(mem('тяжко', 'phonetic', undefined, true), mem('тяжцьо', 'phonetic', 'NDN'))], shownOf('тяжко', 'NDN'), () => false)!
    expect(p).toMatchObject({ form: 'тяжцьо', kind: 'member', grade: 'attested' }); expect(p.ev[0]).toBe(ev); expect(p.lexical).toBeUndefined()
  })
  it('no member -> the rule respelling «тяжко → тєжко», marked as derived; the normative form or a dialect that changes nothing -> none', () => {
    expect(resolveSub('тяжко', 'NDN', [], shownOf('тяжко', 'NDN'), () => false)).toMatchObject({ form: 'тєжко', kind: 'rule', grade: 'derived', note: NOTE_RULE })
    expect(resolveSub('тяжко', 'BOY', [], shownOf('тяжко', 'BOY'), () => false)).toBeUndefined(); expect(resolveSub('тяжко', '', [], shownOf('тяжко', ''), () => false)).toBeUndefined()
  })
  it('a lexical member with a card of its own is its own card; a corpus-grade area is a distribution, never a form', () => {
    const g = [grp(mem('щоб', 'lexical', undefined, true), mem('коби', 'lexical', 'NDN'))]
    expect(resolveSub('щоб', 'NDN', g, shownOf('щоб', 'NDN'), f => f === 'коби')).toMatchObject({ form: 'коби', kind: 'member', lexical: true })
    const m = mem('коби', 'lexical', 'NDN'); m.areas[0]!.grade = 'corpus'; expect(resolveSub('щоб', 'NDN', [grp(m)], shownOf('щоб', 'NDN'), () => true)).toBeUndefined()
  })
  it('variantPlan: the route form must be a form of the lemma in this dialect (member, rule, or an attested spelling); an unrelated form is none', () => {
    const sh = show('тяжко', 'NDN', '2019', {})
    expect(variantPlan('тяжко', 'NDN', 'тєжко', [], sh, false, () => false)).toMatchObject({ kind: 'rule', grade: 'derived' })
    expect(variantPlan('тяжко', 'NDN', 'зовсім-інше', [], sh, false, () => false)).toBeUndefined()
    expect(variantPlan('тяжко', 'NDN', 'тєшко', [], sh, true, () => false)).toMatchObject({ kind: 'own', grade: 'attested' })
    expect(variantPlan('тяжко', 'POD', 'тяжцьо', [grp(mem('тяжко', 'phonetic', undefined, true), mem('тяжцьо', 'phonetic', 'POD'))], show('тяжко', 'POD', '2019', {}), false, () => false)).toMatchObject({ kind: 'member', form: 'тяжцьо' })
  })
})

describe('DB-3b a lemma page with the switch set replaces itself by the variant card; the URL is the state', () => {
  it('pure table: enter / std / lexical / none', () => {
    const plan = resolveSub('тяжко', 'NDN', [], show('тяжко', 'NDN', '2019', {}), () => false)
    expect(subAction({}, plan, true)).toBe('enter'); expect(subAction({ std: '1' }, plan, true)).toBe('std'); expect(subAction({}, plan, false)).toBe('none'); expect(subAction({}, undefined, true)).toBe('none')
    expect(subAction({ from: 'щоб' }, plan, true)).toBe('none'); expect(subAction({}, { ...plan!, lexical: true }, true)).toBe('lexical')
  })
  it('switch on -> the history entry is REPLACED by /v/NDN/тєжко?of=тяжко; the back arrow goes to the standard view and stays; Back returns to the variant, no loop', async () => {
    setDialect('NDN'); const { router, sub } = await mountLemma(W('тяжко')); await settle()
    const r = router.currentRoute.value; expect(r.path.startsWith('/v/NDN/')).toBe(true); expect(r.params.form).toBe('тєжко'); expect(r.query.of).toBe('тяжко')
    await router.push({ path: W('тяжко'), query: { std: '1' } }); await settle()
    expect(router.currentRoute.value.path).toBe(W('тяжко')); expect(router.currentRoute.value.query.std).toBe('1'); expect(dialect.value).toBe('NDN'); expect(sub.action.value).toBe('std')
    router.back(); await settle(); expect(router.currentRoute.value.path.startsWith('/v/NDN/')).toBe(true)
  })
  it('the normative switch changes nothing; no form in this dialect -> the normal card and a small note', async () => {
    const a = await mountLemma(W('тяжко')); await settle(); expect(a.router.currentRoute.value.path).toBe(W('тяжко')); expect(a.sub.action.value).toBe('none')
    setDialect('BOY'); const b = await mountLemma(W('тяжко')); await settle(); expect(b.router.currentRoute.value.path).toBe(W('тяжко')); expect(b.sub.noForm.value).toBe(true)
    const app: App = createSSRApp({ render: () => h(SubcardTop, { sub: b.sub, from: '' }) }); app.use(b.router)
    expect(await renderToString(app)).toContain('data-testid="subcard-noform"')
  })
  it('a lexical member with its own card keeps its card: the page goes to it (?from=), whose arrow returns to the standard view of the lemma', async () => {
    GROUPS['щоб'] = [grp(mem('щоб', 'lexical', undefined, true), mem('коби', 'lexical', 'NDN'))]; cards.add('коби'); setDialect('NDN')
    const { router } = await mountLemma(W('щоб')); await settle()
    expect(router.currentRoute.value.path).toBe(W('коби')); expect(router.currentRoute.value.query.from).toBe('щоб')
    const t = await mountLemma(W('коби') + '?from=' + encodeURIComponent('щоб')); await settle()
    expect(t.sub.fromBack.value).toEqual({ path: W('щоб'), query: { std: '1' } })
    const app: App = createSSRApp({ render: () => h(SubcardTop, { sub: t.sub, from: 'щоб' }) }); app.use(t.router)
    expect(await renderToString(app)).toMatch(/← щоб[\s\S]*нормативна лема/)
  })
})

describe('DB-3b the variant card: layout of a lemma card, the own numbers of the variant, inherited blocks labelled', () => {
  it('own numbers: frequency, first fixation, witnesses, regions come from the variant spellings only, never from the parent; a gated OCR witness gives no first fixation', () => {
    const forms = FORMS as unknown as VForm[]
    const s = variantStats(forms, 'тєжко', key, id => d1[id as keyof typeof d1], [{ code: 'halychyna', name: 'Галичина', N: 100000 }, { code: 'volyn', name: 'Волинь', N: 50000 }], 1_000_000, { '18': 200000 })
    expect(s.f).toBe(3); expect(s.f).not.toBe(53); expect(s.ipm).toBeCloseTo(3); expect(s.first).toMatchObject({ date: [1750, 1750], witness: 'w1' }); expect(s.byWitness.map(w => w.w)).toEqual(['w1', 'w2'])
    expect(s.byRegion).toEqual([{ code: 'halychyna', f: 2, N: 100000 }, { code: 'volyn', f: 1, N: 50000 }]); expect(s.kwic).toHaveLength(1)
    const ocr = variantStats([{ ...forms[1]!, byW: { ocr: 5 } }], 'тєжко', key, id => d1[id as keyof typeof d1], undefined, 1e6, undefined); expect(ocr.f).toBe(3); expect(ocr.first).toBeUndefined()
  })
  it('the page is a full card: header with the dialect form and the back arrow, six tabs, the statistics column; senses and etymology are labelled «від леми»', async () => {
    const out = await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)
    expect(out).toContain('data-testid="variant-card"'); expect(out).toContain('data-testid="card-tabs"'); expect(out).toContain('data-testid="stat-sidebar"')
    for (const t of ['overview', 'forms', 'history', 'meanings', 'spread', 'sources']) expect(out, t).toContain(`data-tab="${t}"`)
    expect(out).toMatch(/data-testid="variant-form"[^>]*>тєжко</); expect(out).toMatch(/href="\/w\/[^"]*\?std=1"/); expect(out).toContain('нормативна лема')
    expect(out).toMatch(/data-testid="variant-f"[^>]*>3</); expect(out).not.toMatch(/data-testid="variant-f"[^>]*>53</); expect(out).toContain('Усі числа — цього написання')
    expect(out).toContain('Значення — від леми «тяжко»'); expect(out).toContain('Етимологія — від леми «тяжко»'); expect(out).toContain('data-attested="1"')
    expect(out).not.toContain('data-testid="subcard"')
  })
  it('the grade stays in the header: «засвідчена форма» for a printed form, «виведено за правилами» for a reconstruction', async () => {
    const small = FORMS.splice(1, 1)
    try {
      expect(await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)).toMatch(/variant-grade[\s\S]*виведено за правилами/)
      GROUPS['тяжко'] = [grp(mem('тяжко', 'phonetic', undefined, true), mem('тєжко', 'phonetic', 'NDN'))]
      expect(await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)).toMatch(/variant-grade[\s\S]*засвідчена форма/)
    } finally { FORMS.splice(1, 0, ...small) }
  })
  it('an unattested rule-derived variant: «У корпусі не засвідчено», its rule and cite, and no numbers borrowed from the lemma', async () => {
    const saved = FORMS.splice(1, 1)
    try {
      const out = await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)
      expect(out).toContain('data-attested="0"'); expect(out).toContain('У корпусі не засвідчено'); expect(out).toContain('виведено за правилами'); expect(out).toContain('data-testid="variant-rules"')
      expect(out).not.toMatch(/data-testid="variant-f"[^>]*>(50|53)</); expect(out).toMatch(/data-testid="variant-f"[^>]*>0</); expect(out).toContain('немає даних')
    } finally { FORMS.splice(1, 0, ...saved) }
  })
  it('a shared URL works under any switch setting (the dialect is in the URL, not in the switch of the viewer)', async () => {
    setDialect(''); const a = await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)
    setDialect('BOY'); const b = await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x' + OF)
    expect(a).toContain('data-testid="variant-card"'); expect(b).toContain('data-testid="variant-card"'); expect(b).toMatch(/data-testid="variant-f"[^>]*>3</)
    expect(a.match(/data-testid="variant-form"[^>]*>[^<]*/)![0]).toBe(b.match(/data-testid="variant-form"[^>]*>[^<]*/)![0])
  })
  it('a form that is no variant of the lemma, or a missing lemma, gets an honest page with the back arrow, not a card', async () => {
    expect(await ssr(VariantView, { dialect: 'NDN', form: 'зовсім-інше' }, '/v/NDN/x' + OF)).toMatch(/data-testid="variant-none"[\s\S]*subcard-back/)
    expect(await ssr(VariantView, { dialect: 'NDN', form: 'тєжко' }, '/v/NDN/x')).toContain('data-testid="variant-nolemma"')
  })
  it('the old panel above the standard card is gone, and the route exists', () => {
    for (const f of ['src/views/WordView.vue', 'src/views/LightWordView.vue', 'src/components/SubcardTop.vue']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/DialectSubcard/)
    expect(readFileSync('src/router.ts', 'utf8')).toMatch(/path: '\/v\/:dialect\/:form'/)
  })
})

describe('DB-3b the variant card is reached from the CR-1 chips and from search', () => {
  it('a CR-1 chip of a same-lexeme dialect form opens the variant card; a lexical member keeps its lemma card', async () => {
    const CorrView = (await import('../src/components/CorrView.vue')).default
    const out = await ssr(CorrView, { lemma: 'тяжко', groups: [grp(mem('тяжко', 'phonetic', undefined, true), mem('тєжко', 'phonetic', 'NDN'), mem('інакше', 'lexical', 'NDN'))] })
    const a = [...out.matchAll(/<a href="([^"]*)"[^>]*data-testid="corr-chip"[^>]*>([^<]*)</g)].map(m => [m[1]!, m[2]!])
    expect(a.find(x => x[1] === 'тєжко')![0]).toBe('/v/NDN/' + encodeURIComponent('тєжко') + OF); expect(a.find(x => x[1] === 'інакше')![0]).toBe(W('інакше'))
    expect(variantTo('NDN', 'тєжко', 'тяжко')).toEqual({ path: '/v/NDN/' + encodeURIComponent('тєжко'), query: { of: 'тяжко' } })
  })
  it('searching a dialect form offers its variant card (a printed dialect area only); the lookup is lazy and debounced, off the keystroke path', () => {
    const g = [grp(mem('тяжко', 'phonetic', undefined, true), mem('тєжко', 'phonetic', 'NDN'))]
    expect(variantFormHits('тєжко', g)).toEqual([{ form: 'тєжко', code: 'NDN', of: 'тяжко', grade: 'dict' }]); expect(variantFormHits('тяжко', g)).toEqual([])
    const c = mem('тєжко', 'phonetic', 'NDN'); c.areas[0]!.grade = 'corpus'; expect(variantFormHits('тєжко', [grp(mem('тяжко', 'phonetic', undefined, true), c)])).toEqual([])
    const sv = readFileSync('src/views/SearchView.vue', 'utf8'); expect(sv).toMatch(/settledQ\.value = t \}, 350\)/); expect(sv).toMatch(/data-testid="variant-hits"/)
    for (const f of ['src/lib/search.ts', 'src/composables/useData.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/subcard|corrData/)
  })
})
