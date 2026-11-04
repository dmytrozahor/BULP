/** SPEC 63 DB-3: the dialect subcard. State in the URL (?sub / ?std / ?from); the switch on -> subcard, back arrow -> standard view, Back button -> subcard again, no form -> normal card, lexical member -> its own card. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, createSSRApp, h, nextTick, type App } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import type { CorrGroup, CorrMember } from '../core/corr.ts'
import { resolveSub, subAction, NOTE_RULE } from '../core/subcard.ts'
import { Q } from '../core/evidence.ts'

const GROUPS: Record<string, CorrGroup[]> = {}
vi.mock('../src/lib/corrData.ts', () => ({ corrOf: (w: string) => GROUPS[w] ?? [] }))
const { useSubcard } = await import('../src/lib/useSubcard.ts')
const { dialect, show, setDialect, resetViews } = await import('../src/lib/views.ts')
const SubcardTop = (await import('../src/components/SubcardTop.vue')).default

const ev = Q('DICT', 'https://example.org/x', 'тєжко — діал.')
const mem = (form: string, relation: CorrMember['relation'], code?: string, norm = false): CorrMember => ({ form, norm, relation, areas: code ? [{ dialect: 'наддністрянський', code, grade: 'dict', ev }] : [], src: ['t'], evidence: [ev] })
const grp = (...members: CorrMember[]): CorrGroup => ({ id: 'g', meaning: 'сполучник мети', pos: 'conj', members })
const cards = new Set<string>()

const mount = async (path: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/w/:lemma', component: { render: () => null } }] })
  const app = createApp({ render: () => null }); app.use(router)
  let sub!: ReturnType<typeof useSubcard>
  await router.push(path); await router.isReady()
  const lemma = decodeURIComponent(path.split('/w/')[1]!.split('?')[0]!)
  app.runWithContext(() => { sub = useSubcard(() => String(router.currentRoute.value.params.lemma ?? lemma), () => show(String(router.currentRoute.value.params.lemma ?? lemma), dialect.value, '2019', {}), f => cards.has(f)) })
  return { router, sub, app }
}
const settle = async () => { for (let i = 0; i < 6; i++) { await nextTick(); await new Promise(r => setTimeout(r, 0)) } }
const html = async (router: Router, sub: ReturnType<typeof useSubcard>, lemma: string) => {
  const app: App = createSSRApp({ render: () => h(SubcardTop, { lemma, sub, from: String(router.currentRoute.value.query.from ?? '') }) }); app.use(router)
  return renderToString(app)
}
beforeEach(() => { for (const k of Object.keys(GROUPS)) delete GROUPS[k]; cards.clear(); setDialect(''); resetViews() })

describe('DB-3 which form: the attested member, the own form of the card, the rule respelling, or nothing', () => {
  const shownOf = (w: string, d: string) => show(w, d, '2019', {})
  it('a CR-1 member of that dialect wins over the rules (a printed form, with its evidence)', () => {
    const p = resolveSub('тяжко', 'NDN', [grp(mem('тяжко', 'phonetic', undefined, true), mem('тяжцьо', 'phonetic', 'NDN'))], shownOf('тяжко', 'NDN'), () => false)!
    expect(p).toMatchObject({ form: 'тяжцьо', kind: 'member', grade: 'attested' }); expect(p.ev[0]).toBe(ev); expect(p.lexical).toBeUndefined()
  })
  it('no member -> the rule respelling «тяжко → тєжко», marked as derived; the normative form / a dialect that changes nothing -> no subcard', () => {
    const p = resolveSub('тяжко', 'NDN', [], shownOf('тяжко', 'NDN'), () => false)!
    expect(p).toMatchObject({ form: 'тєжко', kind: 'rule', grade: 'derived', note: NOTE_RULE }); expect(p.ev).toEqual([])
    expect(resolveSub('тяжко', 'BOY', [], shownOf('тяжко', 'BOY'), () => false)).toBeUndefined(); expect(resolveSub('тяжко', '', [], shownOf('тяжко', ''), () => false)).toBeUndefined()
  })
  it('the card\'s own printed dialect form is used before the rules', () => {
    const own = { ...shownOf('тяжко', 'NDN'), attested: { form: 'тєшко', ev } }
    expect(resolveSub('тяжко', 'NDN', [], own, () => false)).toMatchObject({ form: 'тєшко', kind: 'own', grade: 'attested' })
  })
  it('a lexical member with a card of its own is its own card; without a card it is an ordinary member', () => {
    const g = [grp(mem('щоб', 'lexical', undefined, true), mem('коби', 'lexical', 'NDN'))]
    expect(resolveSub('щоб', 'NDN', g, shownOf('щоб', 'NDN'), f => f === 'коби')).toMatchObject({ form: 'коби', kind: 'member', lexical: true })
    expect(resolveSub('щоб', 'NDN', g, shownOf('щоб', 'NDN'), () => false)!.lexical).toBeUndefined()
  })
  it('a corpus-grade area is a distribution, not a dialect form: it never becomes the subcard form', () => {
    const m = mem('коби', 'lexical', 'NDN'); m.areas[0]!.grade = 'corpus'
    expect(resolveSub('щоб', 'NDN', [grp(m)], shownOf('щоб', 'NDN'), () => true)).toBeUndefined()
  })
})

describe('DB-3 the URL is the state: a pure table', () => {
  const plan = resolveSub('тяжко', 'NDN', [], show('тяжко', 'NDN', '2019', {}), () => false)
  it('enter / sub / std / fix / drop / lexical / none', () => {
    expect(subAction({}, plan, true)).toBe('enter'); expect(subAction({ sub: 'тєжко' }, plan, true)).toBe('sub'); expect(subAction({ std: '1' }, plan, true)).toBe('std')
    expect(subAction({ sub: 'інше' }, plan, true)).toBe('fix'); expect(subAction({ sub: 'тєжко' }, undefined, true)).toBe('drop'); expect(subAction({}, undefined, true)).toBe('none')
    expect(subAction({}, plan, false)).toBe('none'); expect(subAction({ from: 'щоб' }, plan, true)).toBe('none')
    expect(subAction({}, { ...plan!, lexical: true }, true)).toBe('lexical')
  })
})

describe('DB-3 the page: switch on -> subcard, back arrow -> standard, Back -> subcard, no loops', () => {
  it('opening a lemma with the switch set shows the subcard at once (the URL gets ?sub=), with the header form and the back arrow', async () => {
    setDialect('NDN'); const { router, sub } = await mount('/w/тяжко'); await settle()
    expect(router.currentRoute.value.query.sub).toBe('тєжко'); expect(sub.active.value).toBe(true)
    const out = await html(router, sub, 'тяжко'); expect(out).toContain('data-testid="subcard"'); expect(out).toContain('>тєжко<'); expect(out).toContain('виведено за правилами'); expect(out).toMatch(/← тяжко[\s\S]*нормативна лема/)
    expect(out).toMatch(/href="\/w\/[^"]*\?std=1"/)
  })
  it('the arrow goes to the standard view, keeps the switch, stays there (no redirect loop); the browser Back returns to the subcard', async () => {
    setDialect('NDN'); const { router, sub } = await mount('/w/тяжко'); await settle()
    await router.push(sub.back.value); await settle()
    expect(router.currentRoute.value.query).toMatchObject({ std: '1' }); expect(router.currentRoute.value.query.sub).toBeUndefined(); expect(sub.active.value).toBe(false); expect(dialect.value).toBe('NDN')
    expect(await html(router, sub, 'тяжко')).not.toContain('data-testid="subcard"')
    router.back(); await settle(); expect(router.currentRoute.value.query.sub).toBe('тєжко'); expect(sub.active.value).toBe(true)
  })
  it('a shared link ?sub=… works (state is in the URL); a stale sub from another dialect is corrected, not looped', async () => {
    setDialect('NDN'); const a = await mount('/w/тяжко?sub=' + encodeURIComponent('тєжко')); await settle(); expect(a.sub.active.value).toBe(true)
    const b = await mount('/w/тяжко?sub=' + encodeURIComponent('чужа')); await settle(); expect(b.router.currentRoute.value.query.sub).toBe('тєжко'); expect(b.sub.active.value).toBe(true)
  })
  it('changing the switch on the page answers at once, and the normative switch clears the state', async () => {
    setDialect('NDN'); const { router, sub } = await mount('/w/тяжко'); await settle(); await router.push(sub.back.value); await settle()
    setDialect('NDN'); setDialect(''); await settle(); expect(router.currentRoute.value.query.std).toBeUndefined(); expect(router.currentRoute.value.query.sub).toBeUndefined(); expect(sub.active.value).toBe(false)
    setDialect('NDN'); await settle(); expect(router.currentRoute.value.query.sub).toBe('тєжко')
  })
  it('the normative switch changes nothing: no sub in the URL, no subcard', async () => {
    const { router, sub } = await mount('/w/тяжко'); await settle(); expect(router.currentRoute.value.query).toEqual({}); expect(sub.active.value).toBe(false); expect(await html(router, sub, 'тяжко')).toBe('<!---->')
  })
  it('no dialect form for this word: the normal card stays, with a small note, and the URL is untouched', async () => {
    setDialect('BOY'); const { router, sub } = await mount('/w/тяжко'); await settle()
    expect(router.currentRoute.value.query).toEqual({}); expect(sub.active.value).toBe(false); expect(sub.noForm.value).toBe(true)
    const out = await html(router, sub, 'тяжко'); expect(out).toContain('data-testid="subcard-noform"'); expect(out).toContain('форми немає')
  })
  it('a lexical member with its own card: the page goes to that card (?from=), whose arrow returns to the standard view of the first one', async () => {
    GROUPS['щоб'] = [grp(mem('щоб', 'lexical', undefined, true), mem('коби', 'lexical', 'NDN'))]; cards.add('коби'); setDialect('NDN')
    const { router, sub } = await mount('/w/щоб'); await settle()
    expect(router.currentRoute.value.path).toBe('/w/' + encodeURIComponent('коби')); expect(router.currentRoute.value.query.from).toBe('щоб')
    const t = await mount('/w/' + encodeURIComponent('коби') + '?from=' + encodeURIComponent('щоб')); await settle()
    const out = await html(t.router, t.sub, 'коби'); expect(out).toContain('data-testid="subcard-back"'); expect(out).toMatch(/← щоб[\s\S]*нормативна лема/)
    expect(t.sub.fromBack.value).toEqual({ path: '/w/' + encodeURIComponent('щоб'), query: { std: '1' } }); expect(sub).toBeTruthy()
    await t.router.push(t.sub.fromBack.value!); await settle(); expect(t.router.currentRoute.value.path).toBe('/w/' + encodeURIComponent('щоб')); expect(t.router.currentRoute.value.query.std).toBe('1')
  })
})
