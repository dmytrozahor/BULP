import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { buildGrids } from '../src/lib/paradigm.ts'
import { buildIndex, buildIndexAsync, search, queryKeys } from '../src/lib/search.ts'
import { annotate, summarize, type AnnotateData } from '../src/lib/annotate.ts'
import { runDetectors, strongest } from '../src/lib/analyze.ts'
import { traceSteps } from '../src/lib/derive.ts'
import { parseSpec } from '../src/lib/md.ts'
import { centuryLabel, fmtDate, stars } from '../src/lib/format.ts'
import { toCards } from '../src/composables/useData.ts'
import { EXAMPLES } from '../src/data/examples.ts'
import { key } from '../core/text.ts'
import type { LemmaCard, LexIndex, VesumHit } from '../core/types.ts'

const FIX = 'public/data/lexicon.json'
const cards: LemmaCard[] = existsSync(FIX) ? toCards(JSON.parse(readFileSync(FIX, 'utf8'))) : []
const lexindex: LexIndex = existsSync('public/data/lexindex.json') ? JSON.parse(readFileSync('public/data/lexindex.json', 'utf8')) : { lt: {}, vesum: {} }
const data = (): AnnotateData => {
  const paradigmMap = new Map<string, VesumHit[]>()
  for (const c of cards) for (const p of c.paradigm) { const k = key(p.form); paradigmMap.set(k, [...(paradigmMap.get(k) ?? []), { lemma: c.lemma, tags: p.tags }]) }
  return { search: buildIndex(cards), cards: new Map(cards.map(c => [c.lemma, c])), lexindex, paradigmMap }
}

describe('paradigm grid from VESUM tags (research/02 §1)', () => {
  const noun = [['рука', 'noun:inanim:f:v_naz'], ['руки', 'noun:inanim:f:v_rod'], ['руки', 'noun:inanim:p:v_naz'], ['рук', 'noun:inanim:p:v_rod'], ['руку', 'noun:inanim:f:v_zna']]
    .map(([form, tags]) => ({ form: form!, tags: tags! }))
  it('noun: 7 case rows × sg/pl, verbatim tags kept', () => {
    const [g] = buildGrids(noun)
    expect(g!.rows.map(r => r.label)).toEqual(['називний', 'родовий', 'давальний', 'знахідний', 'орудний', 'місцевий', 'кличний'])
    expect(g!.rows[0]!.cells[0]![0]).toEqual({ form: 'рука', tags: 'noun:inanim:f:v_naz' })
    expect(g!.rows[1]!.cells.map(c => c.map(x => x.form))).toEqual([['руки'], ['рук']])
    expect(g!.rows[2]!.cells[0]).toEqual([])
  })
  it('verb: inf / pres / past / impr blocks', () => {
    const v = [['писати', 'verb:imperf:inf'], ['пишу', 'verb:imperf:pres:s:1'], ['пишуть', 'verb:imperf:pres:p:3'], ['писав', 'verb:imperf:past:m'], ['пиши', 'verb:imperf:impr:s:2']]
      .map(([form, tags]) => ({ form: form!, tags: tags! }))
    const g = buildGrids(v)
    expect(g.map(x => x.id)).toEqual(['inf', 'pres', 'past', 'impr'])
    expect(g[1]!.rows[0]!.cells[0]![0]!.form).toBe('пишу')
    expect(g[1]!.rows.find(r => r.label === '3 особа')!.cells[1]![0]!.form).toBe('пишуть')
  })
  it('adj: gender × case; comparative forms excluded', () => {
    const a = [['зелений', 'adj:m:v_naz:compb'], ['зеленіший', 'adj:m:v_naz:compc'], ['зелена', 'adj:f:v_naz:compb']].map(([form, tags]) => ({ form: form!, tags: tags! }))
    const [g] = buildGrids(a)
    expect(g!.rows[0]!.cells.map(c => c.map(x => x.form))).toEqual([['зелений'], ['зелена'], [], []])
  })
  it('unknown POS falls back to a flat list', () => expect(buildGrids([{ form: 'вже', tags: 'adv' }])[0]!.id).toBe('list'))
})

describe('search keys (stress/case-insensitive, old letters)', () => {
  it('queryKeys strips stress and lowercases; old letters add a normalised variant', () => {
    expect(queryKeys('Кни́ГА')).toEqual(['книга'])
    expect(queryKeys('Оуже')).toEqual(['оуже', 'уже'])
  })
  it.skipIf(!cards.length)('finds a lemma by lemma, historical spelling, normalised spelling and paradigm form', () => {
    const idx = buildIndex(cards)
    expect(search(idx, 'князь')[0]!.lemma).toBe('князь')
    expect(search(idx, 'КЪНѦЗЬ')[0]).toMatchObject({ lemma: 'князь', via: 'form' })
    expect(search(idx, 'видѣти').map(r => r.lemma)).toContain('видіти')
    expect(search(idx, 'коня')[0]).toMatchObject({ lemma: 'кінь', via: 'paradigm' })
    expect(search(idx, 'ки́їв')[0]!.lemma).toBe('Київ')
    expect(search(idx, 'ззззз')).toEqual([])
  })
})

describe('annotator (pure)', () => {
  it.skipIf(!cards.length)('statuses: attested / lexindex / unknown; summary counts', () => {
    const t = annotate('Князь видѣти кльовий абракадабра', data())
    expect(t.map(x => x.status)).toEqual(['attested', 'attested', 'lexindex', 'unknown'])
    expect(t[0]!.lemma).toBe('князь'); expect(t[0]!.provenance).toBe('attested')
    expect(t[3]!.claims).toEqual({}); expect(t[3]!.mark).toBeUndefined()
    const s = summarize(t); expect(s.total).toBe(4); expect(s.linked).toBe(2); expect(s.unknown).toEqual(['абракадабра'])
  })
  it.skipIf(!cards.length)('year gates rules: ы in a 1798 text is archaic orthography, not russianism', () => {
    const d = data()
    const old = annotate('быть', d, 1798)[0]!, now = annotate('быть', d, undefined)[0]!
    expect(Object.keys(old.claims)).toContain('archaic_orthography'); expect(Object.keys(old.claims)).not.toContain('russianism_orth')
    expect(Object.keys(now.claims)).toContain('russianism_orth')   // -ть infinitive with ы = positive Russian signal (research/10 §5)
  })
  it.skipIf(!cards.length)('Rusyn veto: modern быти (-ти with ы) is a Rusyn marker, not russianism_orth', () => {
    const c = annotate('быти', data(), undefined)[0]!.claims
    expect(Object.keys(c)).not.toContain('russianism_orth'); expect(Object.keys(c).some(l => l.startsWith('rusyn'))).toBe(true)
  })
  it.skipIf(!cards.length)('a church-slavonic form carries its evidence and wins the mark', () => {
    const t = annotate('градъ', data(), 1092)[0]!
    expect(t.claims.church_slavonic!.evidence.length).toBeGreaterThanOrEqual(2)
    expect(t.mark).toBe('cs')
  })
  it('gating: an unknown word does not fire absence-based rules', () => {
    const a = runDetectors('чьтоуюю', { paradigmMap: new Map() })
    expect(a.known).toBe(false); expect(a.gated).toContain('ORT-JO'); expect(Object.keys(a.claims).some(l => l in { CHN: 1, MPL: 1 })).toBe(false)
  })
  it('strongest picks the highest score', () => {
    const ev = [{ source: 's', quote: 'q', locator: 'l', kind: 'Q' as const }]
    expect(strongest({ colloquial: { value: true, evidence: ev, score: 0.9 }, church_slavonic: { value: true, evidence: ev, score: 0.5 } })).toBe('colloquial')
  })
})

describe('examples are real passages', () => {
  it('each has source line fields and non-empty text', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(5)
    for (const e of EXAMPLES) { expect(e.text.length, e.id).toBeGreaterThan(30); expect(e.url, e.id).toMatch(/^https?:/); expect(e.loc && e.author && e.witness).toBeTruthy() }
  })
  it('Archangel Gospel Jn 1:1 is decoded', () => expect(EXAMPLES.find(e => e.id === 'arch-john-1')!.text).toContain('Искони бѣ слово'))
})

describe('helpers', () => {
  it('derivation steps replay the trace', () => expect(traceSteps('видѣти', ['R09'])).toEqual([{ rule: 'R09', from: 'видѣти', to: 'видіти' }]))
  it('formatting', () => { expect(fmtDate([1798, 1798])).toBe('1798'); expect(fmtDate([1056, 1057])).toBe('1056–1057'); expect(centuryLabel(11)).toBe('XI ст.'); expect(stars(0.0005)).toBe('★★★') })
  it('SPEC 00 parses into P sections', () => {
    const s = parseSpec(readFileSync('specs/00-principles.md', 'utf8'))
    expect(s.find(x => x.heading.startsWith('P-2'))!.items.map(i => i.id)).toContain('P-2.4')
  })
})

describe('F2 real-data readiness (synthetic ~15 MB lexicon, generated in memory, not committed)', () => {
  it.skipIf(!cards.length)('indexes a 15 MB lexicon in time slices with monotone progress; search + annotate stay fast', async () => {
    const per = JSON.stringify(cards).length, copies = Math.ceil(15e6 / per) + 1
    const big: LemmaCard[] = []
    for (let i = 0; i < copies; i++) for (const c of cards) big.push(i === 0 ? c : { ...c, lemma: `${c.lemma}${'абвгґдежзиклмнопрстуфхцчшщ'[i % 26]}${'абвгґдежзиклмнопрстуфхцчшщ'[(i / 26 | 0) % 26]}` })
    expect(JSON.stringify(big).length).toBeGreaterThanOrEqual(15e6)
    const prog: number[] = []; let slices = 0
    const { idx, paradigm } = await buildIndexAsync(big, f => { prog.push(f); slices++ }, 5)
    expect(prog.every((f, i) => i === 0 || f >= prog[i - 1]!)).toBe(true); expect(prog.at(-1)).toBe(1); expect(slices).toBeGreaterThan(2)   // yielded to the event loop
    const t0 = performance.now(); const r = search(idx, big[0]!.lemma); const dt = performance.now() - t0
    expect(r[0]!.lemma).toBe(big[0]!.lemma); expect(dt).toBeLessThan(150)
    const byL = new Map(big.map(c => [c.lemma, c])); const t1 = performance.now()
    annotate(('Князь видѣти ').repeat(40), { search: idx, cards: byL, lexindex, paradigmMap: paradigm })
    expect(performance.now() - t1).toBeLessThan(1500)
  }, 60000)
})

// ── SSR component tests (no DOM needed): render to string and assert the visible text / structure ──────────────────────────────
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import FormLegend from '../src/components/FormLegend.vue'
import FormBadge from '../src/components/FormBadge.vue'
import ClaimSet from '../src/components/ClaimSet.vue'
import StressForms from '../src/components/StressForms.vue'
import DeriveView from '../src/views/DeriveView.vue'
import AnalyzeView from '../src/views/AnalyzeView.vue'
import AnnotateView from '../src/views/AnnotateView.vue'
import WordView from '../src/views/WordView.vue'
import { renderMd } from '../src/lib/md.ts'
import { Q, P, claim } from '../core/evidence.ts'

const ev = [Q('джерело-тест', 'цитата', 'с. 1')]
async function ssr(comp: Component, props: Record<string, unknown> = {}, path = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  router.push(path); await router.isReady()
  return renderToString(createSSRApp({ render: () => h(comp, props) }).use(router))
}

describe('D-4 three visual classes (shape + text, never colour only)', () => {
  it('legend names all three classes', async () => {
    const html = await ssr(FormLegend)
    expect(html).toContain('засвідчено'); expect(html).toContain('реконструкція (гіпотеза)'); expect(html).toContain('підтверджено пам’яткою')
  })
  it('FormBadge: attested = no dashed class; derived = badge text; confirmed = check text', async () => {
    expect(await ssr(FormBadge, { kind: 'attested', form: 'вѣра', label: 'є в словнику' })).not.toContain('class="lang derived')
    expect(await ssr(FormBadge, { kind: 'derived', form: 'вѣра' })).toContain('реконструкція (гіпотеза)')
    expect(await ssr(FormBadge, { kind: 'confirmed', form: 'вѣра' })).toContain('✓ підтверджено пам’яткою')
  })
  it.each([['derive', DeriveView, '/derive?from=кінь&dir=new2old'], ['analyze', AnalyzeView, '/analyze?q=вѣра'], ['annotate', AnnotateView, '/annotate']] as const)(
    'legend present on %s page', async (_n, comp, path) => {
      const html = await ssr(comp as Component, {}, path)
      expect(html).toContain('Легенда: засвідчені та реконструйовані форми')
    })
  it('/derive deep-link round-trips from/dir/to into the form', async () => {
    const html = await ssr(DeriveView, {}, '/derive?from=кінь&dir=new2old')
    expect(html).toContain('value="кінь"'); expect(html).toMatch(/aria-pressed="true"[^>]*>сучасна → давня/)
    const h2 = await ssr(DeriveView, {}, '/derive?from=ходилъ&dir=old2new&to=ходив')
    expect(h2).toContain('value="ходилъ"'); expect(h2).toContain('value="ходив"'); expect(h2).toMatch(/aria-pressed="true"[^>]*>давня → сучасна/)
  })
})

describe('Rusyn display: parallel, neutral, with status note', () => {
  const rus = claim('rusyn:subcarpathian', ev), zak = claim(true as const, ev)
  it('rusyn claim keyed `rusyn` (contract) renders both readings + neutral status popover; badge not colour-only', async () => {
    const html = await ssr(ClaimSet, { claims: { rusyn: rus, ZAK: zak } })
    expect(html).toContain('жодне не переважає'); expect(html).toContain('русинське · підкарпатське'); expect(html).toContain('закарпатський')
    expect(html).toContain('мова чи говір — питання відкрите'); expect(html).toContain('badge rusyn')
  })
  it('missing dialect side is shown as «не встановлено», not dropped', async () => {
    expect(await ssr(ClaimSet, { claims: { rusyn: rus } })).toContain('не встановлено')
  })
  it('without a rusyn claim, dialect badges stay ordinary', async () => {
    const html = await ssr(ClaimSet, { claims: { ZAK: zak } }); expect(html).not.toContain('жодне не переважає')
  })
})

describe('F6 stress & register unknown', () => {
  it('stress variant shows its source and the unknown-status note; empty = explicit unknown', async () => {
    const v = [{ form: 'вода', positions: [1], status: 'unknown' as const, evidence: [P('ukrainian-word-stress', 'ULIF-derived', 'вода')], method: 'dictionary' as const }]
    const html = await ssr(StressForms, { variants: v }); expect(html).toContain('джерело: ukrainian-word-stress'); expect(html).toContain('статус невідомий')
    expect(await ssr(StressForms, { variants: [] })).toContain('наголос невідомий')
  })
})

describe('F3 markdown report renderer', () => {
  it('headings get anchors, tables/lists/code render, html is escaped', () => {
    const { html, toc } = renderMd('# Звіт\n\n## Покриття <b>\n\n| a | b |\n|---|---|\n| 1 | `x` |\n\n- один\n- **два**\n\n```\n<raw>\n```\n\n[l](https://e.org/x)')
    expect(toc.map(t => t.id)).toEqual(['звіт', 'покриття']); expect(html).toContain('<table>'); expect(html).toContain('<td><code>x</code></td>')
    expect(html).toContain('<li><strong>два</strong></li>'); expect(html).toContain('&lt;raw&gt;'); expect(html).not.toContain('<b>'); expect(html).toContain('href="https://e.org/x"')
  })
})
describe('D-4 legend on the data-dependent word page', () => {
  it('WordView mounts FormLegend (word page only renders after data load; checked at source level, screenshot-verified)', () => {
    expect(readFileSync('src/views/WordView.vue', 'utf8')).toContain('<FormLegend />')
  })
})
