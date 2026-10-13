import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
import { groupFormClaims, paradigmKindOf, placedCells, topForms } from '../src/lib/ux.ts'
import type { LemmaCard, LexIndex, VesumHit } from '../core/types.ts'

describe('UX defect: text panels never overflow their container (etymology, KWIC, evidence, provenance)', () => {
  const css = readFileSync('src/ux.css', 'utf8')
  it('card/evidence/KWIC wrap long tokens and shrink inside their box', () => {
    const rule = css.split('\n').find(l => l.startsWith('.card, .evpop, .ev, .kwic'))!
    expect(rule).toMatch(/overflow-wrap:\s*anywhere/)
    expect(rule).toMatch(/min-width:\s*0/)
    expect(rule).toMatch(/max-width:\s*100%/)
    expect(css).toMatch(/\.card pre[^{]*\{[^}]*max-width:\s*100%/)
  })
})

describe('BL-7 epoch paradigm readable at 360 px', () => {
  const css = readFileSync('src/ux.css', 'utf8'), vue = readFileSync('src/components/EpochParadigm.vue', 'utf8')
  const m = css.slice(css.indexOf('/* UX-3 / BL-7') >= 0 ? css.indexOf('/* UX-3 / BL-7') : css.indexOf('/* UX-3 epoch paradigm'))
  const block = m.slice(0, m.indexOf('.epsum'))
  it('the grid collapses (≤ 600 px) into stacked case cards with a labelled block per number', () => {
    expect(block).toMatch(/@media \(max-width:\s*600px\)/)
    expect(block).toMatch(/\.etable td[^{]*\{[^}]*display|\.etable, \.etable thead[^{]*\{[^}]*display:\s*block/)
    expect(block).toMatch(/\.etable td::before\s*\{[^}]*content:\s*attr\(data-col\)[^}]*display:\s*block/)
    expect(vue).toMatch(/:data-col="grid\.cols\[i\]\?\.label"/)
  })
  it('nothing is truncated: cells wrap, no ellipsis/clip, no overflow hidden', () => {
    expect(block).toMatch(/\.etable td\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(block).not.toMatch(/text-overflow:\s*ellipsis|overflow:\s*hidden/)
  })
  it('epoch tabs scroll horizontally instead of wrapping', () => {
    expect(block).toMatch(/\.etabs\s*\{[^}]*overflow-x:\s*auto[^}]*flex-wrap:\s*nowrap/)
    expect(block).toMatch(/\.etab\s*\{[^}]*flex:\s*0 0 auto/)
  })
})

describe('SPEC 61 UX helpers (FX-5 kind, UX-4 grouping, UX-5 top-N, UX-3 placed)', () => {
  const ev = [{ source: 's', quote: 'q', locator: 'l', kind: 'Q' as const }]
  const cl = (v: unknown) => ({ value: v, evidence: ev })
  it('FX-5 paradigmKindOf: data field first, else VESUM tags, else POS text', () => {
    expect(paradigmKindOf({ pos: 'x', paradigm: [], paradigmKind: 'indeclinable' } as any)).toBe('uninflected')
    expect(paradigmKindOf({ pos: 'x', paradigm: [{ form: 'я', tags: 'noun:unanim:v_naz:&pron:pers:1' }] })).toBe('pron')
    expect(paradigmKindOf({ pos: 'x', paradigm: [{ form: 'рука', tags: 'noun:inanim:f:v_naz' }] })).toBe('noun')
    expect(paradigmKindOf({ pos: 'x', paradigm: [{ form: 'зелений', tags: 'adj:m:v_naz:compb' }] })).toBe('adj')
    expect(paradigmKindOf({ pos: 'x', paradigm: [{ form: 'писати', tags: 'verb:imperf:inf' }] })).toBe('verb')
    expect(paradigmKindOf({ pos: 'x', paradigm: [{ form: 'і', tags: 'conj:coord' }] })).toBe('uninflected')
    expect(paradigmKindOf({ pos: 'сполучник', paradigm: [] })).toBe('uninflected')
    expect(paradigmKindOf({ pos: 'займенник', paradigm: [] })).toBe('pron')
    expect(paradigmKindOf(undefined)).toBe('unknown')
  })
  it('UX-4 identical claim sets across spellings collapse into one group with the spelling count', () => {
    const forms = [{ raw: 'а', claims: { cs: cl(true) } }, { raw: 'б', claims: { cs: cl(true) } }, { raw: 'в', claims: { cs: cl(true), x: cl(1) } }, { raw: 'г', claims: {} }]
    const g = groupFormClaims(forms as any)
    expect(g.map(x => x.forms)).toEqual([['а', 'б'], ['в']])
  })
  it('UX-5 the 6 most frequent spellings + «+N»', () => {
    const forms = 'abcdefghij'.split('').map(raw => ({ raw }))
    const f = new Map(forms.map((x, i) => [x.raw, i]))
    const t = topForms(forms, f, 6)
    expect(t.shown.map(x => x.raw)).toEqual(['j', 'i', 'h', 'g', 'f', 'e']); expect(t.rest).toBe(4)
  })
  it('UX-3 placedCells counts cells with attested forms only', () => {
    expect(placedCells(undefined)).toBe(0)
    expect(placedCells({ paradigms: [{ cells: [{ forms: [] }, { forms: [1] }] }] })).toBe(1)
  })
})

describe('UX-6 compact mobile nav', () => {
  it('nav is a single non-wrapping scroll row under 700px', () => {
    const css = readFileSync('src/ux.css', 'utf8')
    expect(css).toMatch(/max-width:\s*700px[\s\S]*\.top nav\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/)
  })
})

// UI behaviour is pinned to the FIXTURE (known lemmas/spellings), not public/data — the real build overwrites that (tests/build.test.ts covers it)
const FIX = mkdtempSync(join(tmpdir(), 'ukr-fixture-'))
execFileSync(process.execPath, ['--import', 'tsx', 'pipelines/fixture.ts', FIX], { stdio: 'ignore' })
const read = (f: string) => JSON.parse(readFileSync(join(FIX, f), 'utf8'))
const cards = toCards(read('lexicon.json')) as LemmaCard[]   // the fixture embeds the detail (plain LemmaCard[])
const lexindex: LexIndex = read('lexindex.json')
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
import Kwic from '../src/components/Kwic.vue'
import { sourceLink } from '../src/lib/source.ts'
import StatsExplainer from '../src/components/StatsExplainer.vue'
import TextsView from '../src/views/TextsView.vue'
import RegionMap from '../src/components/RegionMap.vue'
import { regionRows, stepOf } from '../src/lib/geo.ts'
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
    const html = await ssr(StressForms, { variants: v }); expect(html).toContain('джерело: ukrainian-word-stress'); expect(html).toContain('джерело не нормативне')
    expect(html).toContain('во́да'); expect(html).not.toContain('наголос невідомий')
    const two = await ssr(StressForms, { variants: [{ ...v[0], form: 'помилка', positions: [1] }, { ...v[0], form: 'помилка', positions: [3] }] })
    expect(two).toContain('по́милка'); expect(two).toContain('поми́лка')
    const none = await ssr(StressForms, { variants: [] }); expect(none).toContain('наголос не встановлено'); expect(none).not.toContain('джерело не нормативне')
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
    expect(readFileSync('src/views/WordView.vue', 'utf8')).toContain('<FormLegend ')
  })
})

describe('F5 regional panel', () => {
  const GEO = 'public/geo/ukr-oblasts.json'
  it('Natural Earth oblasts: ≤ 100 KB, 27 ISO 3166-2:UA divisions incl. Crimea and Sevastopol, attribution kept', () => {
    const raw = readFileSync(GEO, 'utf8'), g = JSON.parse(raw)
    expect(raw.length).toBeLessThan(100_000); expect(g.features).toHaveLength(27)
    const codes = g.features.map((f: { properties: { code: string } }) => f.properties.code)
    expect(codes).toEqual(expect.arrayContaining(['UA-43', 'UA-40', 'UA-30', 'UA-21'])); expect(g.attribution).toContain('Natural Earth (public domain)')
  })
  it('regionRows: ipm = f/N·1e6 with N kept; a region without tokens is unknown (undefined), never 0', () => {
    const rows = regionRows([{ code: 'W', name: 'захід', oblasts: ['UA-46'], N: 2000 }, { code: 'S', name: 'південь', oblasts: ['UA-51'], N: 0 }], [{ code: 'W', f: 5, N: 2000 }])
    expect(rows[0]).toMatchObject({ f: 5, N: 2000, ipm: 2500 }); expect(rows[1]!.ipm).toBeUndefined()
    expect(stepOf(undefined, 10)).toBe(-1); expect(stepOf(0, 10)).toBe(0); expect(stepOf(10, 10)).toBe(4)
  })
  it.skipIf(!cards.length)('panel without region data says «невідомо» and that regions are not dialect claims', async () => {
    expect(await ssr(RegionMap, { card: cards[0]! })).toContain('невідомо')
  })
})

// ── SPEC 50 epoch paradigms (EP-6.4, EP-7.*): sample detail built in-test, never committed as data ────────────────────────────
import EpochParadigm from '../src/components/EpochParadigm.vue'
import { epochGrid, epochTabs } from '../src/lib/epochGrid.ts'
import { cellEvidence } from '../core/cells.ts'
import type { EpochParadigms, StemValue, CellForm } from '../core/types.ts'
import type { WitnessMeta } from '../core/types.ts'
import { D } from '../core/evidence.ts'

const stemV: StemValue = { type: 'a', model: 'рѣка', old: 'рѣка', gender: 'f', rule: 'ST-13' }
const cf = (raw: string, src: CellForm['src'], w: number, n = 1, extra: Partial<CellForm> = {}): CellForm => ({ raw, n, src, t: src === 'torot' ? 0 : src === 'stanza' ? 1 : 2, ex: [w, 'f.1'], ...extra })
const epochSample = (stem: EpochParadigms['stem'] = { value: stemV, evidence: [Q('PAVL', 'с. 74', 'рѣка')], method: 'rule' }): EpochParadigms => ({
  tags: ['Nb -s---fn--i', 'Case=Ins|Gender=Fem|Number=Sing', 'noun:inanim:f:v_naz'], stem,
  paradigms: [
    { epoch: 'shev.old', grid: 'noun', N: 14, dropped: { conflict: 1, underspecified: 0, untagged: 2 }, cells: [
      { key: 'sg.nom', forms: [cf('рѣка', 'torot', 0, 6)] }, { key: 'sg.dat', forms: [cf('рѣцѣ', 'torot', 0, 3)] },
      { key: 'sg.ins', forms: [cf('рѣкою', 'torot', 1)] },                      // CS witness
      { key: 'pl.nom', forms: [cf('рѣкы', 'torot', 1, 2)] }, { key: 'du.nav', forms: [cf('рѣцѣ', 'torot', 0)] }, { key: 'sg.gen', forms: [cf('рѣкъ', 'torot', 0, 1)], more: 2 }] },
    { epoch: 'shev.middle', grid: 'noun', N: 5, dropped: { conflict: 0, underspecified: 0, untagged: 0 }, cells: [{ key: 'pl.dat', forms: [cf('рукамъ', 'stanza', 2, 2, { amb: 2 })] }] },
    { epoch: 'shev.modern', grid: 'noun', N: 30, dropped: { conflict: 0, underspecified: 0, untagged: 0 }, cells: [{ key: 'sg.nom', forms: [cf('рука', 'vesum', 3, 9)] }] },
  ],
})
const wmeta = (id: string, lang: string, extra = {}) => ({ id, title: id, author: id, lang, date: [1100, 1200], epochShev: { value: { epochs: ['shev.old'], confidence: 'high', overlays: [] }, evidence: [] }, ...extra }) as unknown as WitnessMeta
const WS = [wmeta('tor', 'orv'), wmeta('arch', 'chu-rus'), wmeta('samov', 'ruthenian', { outOfDomain: true }), wmeta('mod', 'uk')]
const SIZES = { 'shev.proto': 100, 'shev.old': 500, 'shev.early_middle': 0, 'shev.middle': 80, 'shev.late_middle': 90, 'shev.modern': 1000 }
const panel = async (epochs: EpochParadigms | undefined, extra: Record<string, unknown> = {}) => (await ssr(EpochParadigm, { epochs, witnesses: WS, sizes: SIZES, spellings: ['рѣка'], ...extra })).split('<details class="card flegend"')[0]!   // without the legend, which names every marker

describe('SPEC 50 epoch paradigms', () => {
  it('EP-7.1 tabs in shev order with N; default = oldest epoch with data; loading and missing shard states', async () => {
    const html = await panel(epochSample())
    const at = ['протоукраїнська', 'давньоукраїнська', 'ранньосередньоукраїнська', 'середньоукраїнська', 'пізньосередньоукраїнська', 'новітня'].map(s => html.indexOf(`<strong>${s}`))
    expect(at.every((i, k) => i > 0 && (k === 0 || i > at[k - 1]!))).toBe(true)
    expect(html).toContain('N = 14'); expect(html).toContain('N = 30')
    expect(html).toMatch(/aria-selected="true"[^>]*>\s*<strong>давньоукраїнська/)
    expect(await panel(undefined)).toContain('історичні парадигми: немає даних')
    expect(await panel(undefined, { loading: true })).toContain('skeleton')
    expect(epochTabs(epochSample().paradigms, SIZES).default).toBe('shev.old')
  })
  it('EP-6.3 an epoch without witnesses is a disabled tab with the N = 0 message', async () => {
    const html = await panel(epochSample(), { start: 'shev.early_middle' })
    expect(html).toContain('у корпусі немає пам’яток цієї доби (N = 0)'); expect(html).toMatch(/class="etab off"[^>]*aria-disabled="true"/); expect(html).toContain('MH-02'); expect(html).not.toContain('data-cell')   // its notes stay, no cells
    expect(epochTabs(epochSample().paradigms, SIZES).tabs.find(t => t.id === 'shev.early_middle')!.disabled).toBe(true)
  })
  it('EP-7.2 epochGrid: 7 case rows × sg, du, pl in shev.old; du cells merged (Н.З.К, Р.М, Д.О)', () => {
    const g = epochGrid(epochSample().paradigms[0], 'shev.old', stemV)
    expect(g.cols.map(c => c.id)).toEqual(['sg', 'du', 'pl']); expect(g.rows.map(r => r.label)).toEqual(['Називний', 'Родовий', 'Давальний', 'Знахідний', 'Орудний', 'Місцевий', 'Кличний'])
    expect(g.rows.map(r => r.cells[1]?.key ?? null)).toEqual(['du.nav', 'du.gl', 'du.di', null, null, null, null])
    expect(g.rows[0]!.cells[1]!.tag).toBe('Н. З. К.')
  })
  it('EP-6.2 dual column: hidden in shev.middle without an attested du cell, shown with one; absent in modern', () => {
    const p = epochSample().paradigms[1]!
    expect(epochGrid(p, 'shev.middle').cols.map(c => c.id)).toEqual(['sg', 'pl'])
    expect(epochGrid({ ...p, cells: [...p.cells, { key: 'du.gl', forms: [cf('рукоу', 'torot', 0)] }] }, 'shev.middle').cols.map(c => c.id)).toEqual(['sg', 'du', 'pl'])
    expect(epochGrid(epochSample().paradigms[2], 'shev.modern', stemV).duHidden).toBe(true)
  })
  it('EP-7.3 three classes, each with a text badge; attestation and a differing reconstruction side by side', async () => {
    const html = await panel(epochSample())
    expect(html).toContain('class="lang attested">рѣка<'); expect(html).toContain('class="lang derived">рѣку<')   // sg.acc reconstructed only
    expect(html).toContain('реконструкція'); expect(html).toContain('✓ підтверджено пам’яткою')
    const g = epochGrid(epochSample().paradigms[0], 'shev.old', stemV), ins = g.rows[4]!.cells[0]!
    expect(ins.att.map(f => f.raw)).toEqual(['рѣкою']); expect(ins.rec.map(r => r.form)).toEqual(['рѣкою'])   // same spelling in the same cell confirms
    expect(g.rows[2]!.cells[0]!.rec[0]!.confirmedBy?.[0]?.raw).toBe('рѣцѣ')
    expect(g.rows[2]!.cells[1]!.rec[0]!.confirmedBy).toBeUndefined()   // du.di рѣкама is not attested
  })
  it('EP-5.5 confirmation is per cell: the same spelling elsewhere does not confirm', () => {
    const only = { ...epochSample().paradigms[0]!, cells: [{ key: 'du.nav', forms: [cf('рѣцѣ', 'torot', 0)] }] }
    const g = epochGrid(only, 'shev.old', stemV)
    expect(g.rows[2]!.cells[0]!.rec[0]!.confirmedBy).toBeUndefined(); expect(g.rows[0]!.cells[1]!.rec[0]!.confirmedBy?.[0]?.raw).toBe('рѣцѣ')
  })
  it('EP-7.4 an empty cell says «невідомо», never «—»; no reconstruction after shev.old (EP-5.1)', async () => {
    const html = await panel(epochSample(), { start: 'shev.middle' })
    expect(html).toContain('невідомо'); expect(html).not.toContain('>—<'); expect(html).not.toContain('class="lang derived"')
    expect(epochGrid(epochSample().paradigms[1], 'shev.middle', stemV).reconstructed).toBe(false)
  })
  it('EP-7.5 cell evidence: witness, locator, verbatim tag, source note', () => {
    const s = epochSample(), e = cellEvidence(s.paradigms[0]!.cells[0]!.forms[0]!, s, { witnesses: WS })
    expect(e).toMatchObject({ source: 'tor', locator: 'f.1', kind: 'D', quote: 'рѣка «Nb -s---fn--i»', note: 'ручна розмітка TOROT' })
    expect(cellEvidence(cf('рукамъ', 'stanza', 2), s, { witnesses: WS }).note).toBe('модельна розмітка Stanza, не словниковий факт (P-1.7); текст поза доменом моделі')
    expect(cellEvidence(cf('рука', 'vesum', 3), s, { witnesses: WS }).note).toBe('аналіз ВЕСУМ сучасного написання')
  })
  it('EP-7.6 legend lists the epoch markers', async () => {
    const html = await ssr(FormLegend, { epoch: true })
    for (const t of ['ручна розмітка TOROT', 'модельна розмітка Stanza', 'аналіз ВЕСУМ', '≈2', 'ЦС', 'невідомо', '= Н.', 'основа: модель', 'модель поза доменом']) expect(html).toContain(t)
    expect(await ssr(FormLegend)).not.toContain('ЦС')
  })
  it('EP-7.7 / D2 / D3: model badge with out-of-domain mark, CS badge, ≈k, source letters', async () => {
    const old = await panel(epochSample()); expect(old).toContain('class="sb cs"'); expect(old).toContain('>T<')
    const mid = await panel(epochSample(), { start: 'shev.middle' })
    expect(mid).toContain('>M<'); expect(mid).toContain('модель поза доменом'); expect(mid).toContain('≈2')
    expect(await panel(epochSample(), { start: 'shev.modern' })).toContain('>В<')
  })
  it('the stem line labels the model word as a declension sample, never as a form of the lemma', async () => {
    const cut = (h: string) => h.slice(h.indexOf('тип основи'), h.indexOf('etabs'))
    const line = cut(await panel(epochSample()))
    expect(line).toContain('*-ā (а-основа)'); expect(line).toContain('зразок відмінювання: <i lang="cu">рѣка</i>'); expect(line).toContain('Павленко, с. 74'); expect(line).toContain('ST-13')
    expect(line).not.toContain('а · рѣка')
    const ruka = cut(await panel(epochSample({ value: { ...stemV, old: 'роука' }, evidence: [Q('PAVL', 'с. 74', 'рѣка')], method: 'rule' })))
    expect(ruka.replace('зразок відмінювання: <i lang="cu">рѣка</i>', '')).not.toContain('рѣка')
  })
  it('D4: a model-based stem claim marks the stem and the reconstructions', async () => {
    const m = epochSample({ value: stemV, evidence: [D('tor', 'f.1', 'рѣки → «рѣка»', 'stanza lemma')], method: 'ST-13+stanza' })
    expect(((await panel(m)).match(/основа: модель/g) ?? []).length).toBeGreaterThan(3)
    expect(((await panel(epochSample())).match(/основа: модель/g) ?? []).length).toBe(0)
    expect(await panel(epochSample({ value: 'unknown', evidence: [] }))).toContain('невідомо')
  })
  it('EP-6.4 MH-09 is attached to pl.dat with its quote, date and citation; undated notes say so', async () => {
    const g = epochGrid(epochSample().paradigms[0], 'shev.old', stemV), cell = g.rows[2]!.cells[2]!
    expect(cell.key).toBe('pl.dat'); const n = cell.notes.find(x => x.id === 'MH-09')!
    expect(n.cite[0]!.quote).toContain('тривалий час зберігається давнє закінчення -ом'); expect(n.dated).toBe('з 13 ст.')
    const html = await panel(epochSample()); expect(html).toContain('MH-09'); expect(html).toContain('дата в джерелі не вказана')   // MH-11 is undated
  })
  it('EP-6.4 notes that speak of one gender are dropped for a stem of another gender', () => {
    const p = epochSample().paradigms[0], ids = (st?: StemValue) => epochGrid(p, 'shev.old', st).notes.map(n => n.id)
    expect(ids(stemV)).not.toContain('MH-13'); expect(ids(stemV)).toContain('MH-14')   // рѣка is feminine: no masculine pl.nom note, the feminine sg.ins note stays
    expect(ids({ ...stemV, type: 'o', model: 'плодъ', old: 'плодъ', gender: 'm' })).toContain('MH-13'); expect(ids()).toContain('MH-13')   // unknown stem: nothing is hidden
  })
})

describe('W1-1 KWIC spacing', () => {
  it('left, node and right are separated by spaces; the citation is its own element', async () => {
    const html = await ssr(Kwic, { lines: [{ w: 'x', loc: 'абз. 1', left: 'по Всеславѣ', node: 'пожегъ', right: 'землю', date: [1096, 1117] }] })
    expect(html).toMatch(/<\/span> <a href="\/f\/пожегъ"[^>]*class="n"[^>]*>пожегъ<\/a> <span class="r">/); expect(html).toContain('class="cite"')
  })
})

describe('W1-2/6 source links (U-10, U-16)', () => {
  it('TOROT raw XML is browsed on GitHub; HTML editions get a text fragment; no url = no link', () => {
    expect(sourceLink({ url: 'https://raw.githubusercontent.com/torottreebank/treebank-releases/master/lav.xml' }, '27.18')).toMatchObject({ url: 'https://github.com/torottreebank/treebank-releases/blob/master/lav.xml', exact: false })
    const l = sourceLink({ url: 'http://izbornyk.org.ua/oldukr/pouch.htm' }, 'абз. 22', { left: 'по Всеславѣ', node: 'пожегъ' })!
    expect(l.url).toBe('http://izbornyk.org.ua/oldukr/pouch.htm#:~:text=%D0%92%D1%81%D0%B5%D1%81%D0%BB%D0%B0%D0%B2%D1%A3-,%D0%BF%D0%BE%D0%B6%D0%B5%D0%B3%D1%8A'); expect(l.exact).toBe(true); expect(l.label).toContain('абз. 22')
    expect(sourceLink(undefined, 'x')).toBeUndefined()
  })
  it('KWIC citation shows the witness, the locator and the date', async () => {
    const html = await ssr(Kwic, { lines: [{ w: 'monomakh', loc: 'абз. 22', left: 'а', node: 'б', right: 'в', date: [1096, 1117] }] })
    expect(html).toContain('локатор:'); expect(html).toContain('абз. 22'); expect(html).toContain('1096–1117')
  })
})

describe('W1-3 legend: collapsed, once, own forms', () => {
  it('is a collapsed <details> that uses the lemma samples instead of the fixed вѣра', async () => {
    const html = await ssr(FormLegend, { attested: 'пожегъ', derived: 'пожогъ', confirmed: 'пожогъ' })
    expect(html).toContain('<details'); expect(html).not.toContain(' open'); expect(html).toContain('пожегъ'); expect(html).not.toContain('вѣра')
  })
})

describe('W1-4 statistics explainer (U-24)', () => {
  it.skipIf(!cards.length)('names every measure with its formula and the corpus bias caveat', async () => {
    const html = await ssr(StatsExplainer, { card: cards[0]! })
    for (const s of ['Як читати статистику', 'ipm = f / N', 'HK = round', 'DP =', 'G² =', 'Log Ratio', 'logDice =', 'research/06 §3.5']) expect(html).toContain(s)
  })
})

describe('W1-5 /texts reader (U-8)', () => {
  it('route and nav exist; the view reads public/data/texts/<witness>.json and links words to /w/:lemma', () => {
    expect(readFileSync('src/main.ts', 'utf8')).toContain("'/texts'"); expect(readFileSync('src/App.vue', 'utf8')).toContain('to="/texts"')
    const v = readFileSync('src/views/TextsView.vue', 'utf8'); expect(v).toContain('./data/texts/'); expect(v).toContain('/w/${encodeURIComponent(t.lemma)}'); expect(v).toContain('annotate(')
  })
  it('SSR before data load shows the skeleton, not a crash', async () => {
    expect(await ssr(TextsView, {}, '/texts')).toContain('Тексти корпусу')
  })
})

// ── MV-1: media panel + /sophia browse (SPEC 60) ──
import * as MEDIA from '../src/lib/media.ts'
import MediaPanel from '../src/components/MediaPanel.vue'
import SophiaView from '../src/views/SophiaView.vue'
import { MEDIA_FIXTURE } from '../src/data/media-fixture.ts'
import { hasMedia } from '../src/lib/sophiaData.ts'
describe('MV-1 media panel', () => {
  const sophia = JSON.parse(readFileSync('public/data/sophia.json', 'utf8')) as MEDIA.SophiaData
  it('MV-1 IIIF image API URL is built from the portal crop base; panel photo and info.json derive from it', () => {
    const it0 = sophia.items[0]!
    const u = MEDIA.iiifImageUrl(it0.iiif, 640)
    expect(u.startsWith('https://img.dh.gu.se/saintsophia/static/inscriptions/iiif/')).toBe(true)
    expect(u.endsWith('/!640,640/0/default.jpg')).toBe(true)
    expect(MEDIA.iiifFullUrl(it0.iiif)).toMatch(/\.tif\/full\/!1600,1600\/0\/default\.jpg$/)
    expect(MEDIA.iiifInfoUrl(it0.iiif)).toMatch(/\.tif\/info\.json$/)
  })
  it('MV-1 YouTube ids are validated and embedded through youtube-nocookie.com only', () => {
    expect(MEDIA.youtubeEmbedUrl('ojtOxnv8CL0')).toBe('https://www.youtube-nocookie.com/embed/ojtOxnv8CL0?rel=0')
    expect(MEDIA.youtubeId('https://youtu.be/CGxJMG-W-LY')).toBe('CGxJMG-W-LY')
    expect(MEDIA.youtubeId('https://www.youtube.com/watch?v=ojtOxnv8CL0&t=3')).toBe('ojtOxnv8CL0')
    expect(MEDIA.youtubeEmbedUrl('"><script>')).toBeUndefined()
  })
  it('MV-1 /sophia filter: date overlap, type and text; sorted by start year', () => {
    const r = MEDIA.filterSophia(sophia.items, { from: 1100, to: 1200 })
    expect(r.length).toBeGreaterThan(0)
    for (const i of r) expect(i.to >= 1100 && i.from <= 1200).toBe(true)
    expect(r.map(i => i.from)).toEqual([...r.map(i => i.from)].sort((a, b) => a - b))
    expect(MEDIA.filterSophia(sophia.items, { text: sophia.items[0]!.panel }).length).toBeGreaterThan(0)
    expect(MEDIA.filterSophia(sophia.items, { type: 'no-such-type' })).toEqual([])
  })
  it('MV-1 Sophia witness ids resolve to media; the song fixture has media; others do not', () => {
    expect(MEDIA.sophiaIdOf('sophia-28')).toBe(28); expect(MEDIA.sophiaIdOf('spi')).toBeUndefined()
    expect(hasMedia('sophia-28')).toBe(true); expect(hasMedia('fixture-song-zhnetsi')).toBe(true); expect(hasMedia('spi')).toBe(false)
  })
  it('MV-1 IIIF panel shows the attribution «Saint Sophia, University of Gothenburg — CC BY-NC», lazy image, no transcription', async () => {
    const html = await ssr(MediaPanel, { media: MEDIA.mediaOfSophia(sophia.items[0]!) })
    expect(html).toContain('Saint Sophia, University of Gothenburg — CC BY-NC'); expect(html).toContain('loading="lazy"'); expect(html).toContain('img.dh.gu.se')
    expect(html).not.toMatch(/transcription|транскрипці/i)
  })
  it('MV-1 YouTube panel is a click-to-load facade: no iframe (and no third-party request) before play, nocookie host after', async () => {
    const html = await ssr(MediaPanel, { media: MEDIA_FIXTURE['fixture-song-zhnetsi'] })
    expect(html).not.toContain('<iframe'); expect(html).toContain('Відтворити')
    expect(readFileSync('src/components/MediaPanel.vue', 'utf8')).toContain('youtubeEmbedUrl')
  })
  it('MV-1 Kwic offers «переглянути» for media witnesses; /sophia is routed and in the nav', async () => {
    expect(readFileSync('src/components/Kwic.vue', 'utf8')).toContain('переглянути')
    expect(readFileSync('src/main.ts', 'utf8')).toContain("'/sophia'"); expect(readFileSync('src/App.vue', 'utf8')).toContain('to="/sophia"')
    expect(await ssr(SophiaView, {}, '/sophia')).toContain('Софія Київська')
  })
})

import AffiliationChips from '../src/components/AffiliationChips.vue'
describe('MV-2 affiliation chips «джерело/проєкт»', () => {
  it('MV-2 projects are matched by URL host or Sophia witness id', () => {
    expect(MEDIA.affiliationsFor('http://izbornyk.org.ua/slovo/slovo.htm').map(a => a.id)).toEqual(['izbornyk'])
    expect(MEDIA.affiliationsFor('https://uk.wikisource.org/wiki/X', 'https://polyphonyproject.com/en').map(a => a.id)).toEqual(['polyphony', 'wikisource'])
    expect(MEDIA.affiliationsFor('sophia-28').map(a => a.id)).toEqual(['sophia'])
    expect(MEDIA.affiliationsFor('https://evil-izbornyk.org.ua.example.com/', 'spi', undefined)).toEqual([])
  })
  it('MV-2 chips link out with rel=noopener and the «джерело/проєкт» label; nothing renders without a match', async () => {
    const html = await ssr(AffiliationChips, { refs: ['http://izbornyk.org.ua/x', 'https://saintsophia.dh.gu.se/'] })
    expect(html).toContain('джерело/проєкт'); expect(html).toContain('rel="noopener"'); expect(html).toContain('izbornyk.org.ua'); expect(html).toContain('saintsophia.dh.gu.se')
    expect(await ssr(AffiliationChips, { refs: ['https://example.com/'] })).not.toContain('джерело/проєкт')
    expect(readFileSync('src/components/MediaPanel.vue', 'utf8')).toContain('AffiliationChips')
  })
})

// ── lazily loaded data sets (HT-1 candidates, LW-2 labels, NW-7 songs) ──
import { candidatesIn, makeLabelLookup, songLines, songOfWitness, type HeteronymCandidates, type LoanLabelData, type SongsData } from '../src/lib/datasets.ts'
import { analyzeLoan } from '../core/loanwords.ts'
const pub = <T>(n: string) => JSON.parse(readFileSync(`public/data/${n}.json`, 'utf8')) as T
describe('HT-1 dictionary stress candidates (heteronyms.json)', () => {
  it('are method dictionary / status unknown and need >= 2 stresses', () => {
    const d = pub<HeteronymCandidates>('heteronyms')
    expect(d.method).toBe('dictionary'); expect(d.status).toBe('unknown')
    const c = candidatesIn(d, 'спасти')!
    expect(c).toMatchObject({ method: 'dictionary', status: 'unknown' }); expect(c.stresses.length).toBeGreaterThan(1)
    expect(candidatesIn(d, 'нема-такого-слова')).toBeUndefined(); expect(candidatesIn(undefined, 'спасти')).toBeUndefined()
  })
})
describe('LW-2 loanlabels.json replaces the seed labels', () => {
  it('a Wiktionary label (D-evidence, CC BY-SA) drives analyzeLoan, a word without one gets no label', () => {
    const lk = makeLabelLookup(pub<LoanLabelData>('loanlabels'))
    const c = lk('абрикоса')!
    expect(c.evidence[0]!.kind).toBe('D'); expect(c.evidence[0]!.note).toContain('CC BY-SA')
    const a = analyzeLoan('абрикоса', { labels: lk })
    expect(a.status).toBe('label'); expect(a.label && a.label.value !== 'unknown' && a.label.value.donor).toBe('pl')
    expect(lk('нема-такого-слова')).toBeUndefined(); expect(makeLabelLookup(undefined)('абрикоса')).toBeUndefined()
  })
})
describe('DV-3 / IP-3 on the word card', () => {
  it('/w/:lemma renders the IPA row and «Похідні» inside collapsed panels', async () => {
    const wv = readFileSync('src/views/WordView.vue', 'utf8')
    expect(wv).toMatch(/<Panel id="h-ipa" :open="false"[\s\S]*<IpaRow /); expect(wv).toContain('<DerivativesBlock panel')
    const db = readFileSync('src/components/DerivativesBlock.vue', 'utf8')
    expect(db).toContain("open: false"); expect(db).toContain('summary: summary')
    const DerivativesBlock = (await import('../src/components/DerivativesBlock.vue')).default
    await expect(ssr(DerivativesBlock, { lemma: 'писати', panel: true })).resolves.toBeTypeOf('string')   // no data loaded: renders nothing, does not throw
  })
})
describe('NW-7 songs UI (songs.json)', () => {
  const d = pub<SongsData>('songs')
  it('quotations are cut to <= 2 lines; a song witness resolves to its song (KWIC link)', () => {
    for (const s of d.songs) for (const q of s.quotes) expect(songLines(q.text).length).toBeLessThanOrEqual(2)
    expect(songLines('а / б / в')).toEqual(['а', 'б'])
    expect(songOfWitness(d, 'song_zhentsi')?.id).toBe('oy-na-hori'); expect(songOfWitness(d, 'nope')).toBeUndefined()
  })
  it('route /songs/:id? exists, the list renders without data, the view uses MediaPanel and Kwic links to songs', async () => {
    expect(readFileSync('src/main.ts', 'utf8')).toContain("'/songs/:id?'")
    expect(readFileSync('src/components/Kwic.vue', 'utf8')).toContain('/songs/')
    expect(readFileSync('src/views/SongsView.vue', 'utf8')).toContain('MediaPanel')
    const SongsView = (await import('../src/views/SongsView.vue')).default
    expect(await ssr(SongsView, {}, '/songs')).toContain('Пісні')
    expect(await ssr(SongsView, { id: 'oy-na-hori' }, '/songs/oy-na-hori')).toContain('усі пісні')
  })
})

describe('BL-17 theme tokens (light default, dark toggle) and WCAG AA contrast', () => {
  const css = readFileSync('src/style.css', 'utf8')
  const block = (re: RegExp) => { const m = css.match(re); if (!m) throw new Error('block missing ' + re); return m[1] ?? '' }
  const tokens = (b: string): Record<string, string> => Object.fromEntries([...b.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]))
  const light = tokens(block(/:root \{([^}]*)\}/))
  const dark = tokens(block(/:root\[data-theme="dark"\] \{([^}]*)\}/))
  const darkMedia = tokens(block(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/))
  const NEED = ['bg', 'surface', 'surface-2', 'ink', 'muted', 'line', 'accent', 'accent-ink', 'accent-soft', 'warn', 'warn-soft', 'danger',
    'ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'm-cs', 'm-contact', 'm-dialect', 'm-colloquial', 'm-archaic', 'm-rusyn', 'map-line', 'map-dot']
  const lum = (h = '#000000') => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0]! + .7152 * c[1]! + .0722 * c[2]! }
  const ratio = (a?: string, b?: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05) }
  it('both themes define the full token set; the media-query dark block equals the data-theme dark block', () => {
    for (const t of [light, dark, darkMedia]) for (const k of NEED) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/i)
    expect(darkMedia).toEqual(dark)
    expect(lum(light.bg)).toBeGreaterThan(.9); expect(lum(dark.bg)).toBeLessThan(.05)
  })
  for (const [name, t] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: text, links, chips, badges, charts and map meet WCAG AA`, () => {
      const text: [string, string][] = [['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
        ['accent', 'bg'], ['accent', 'surface'], ['accent', 'surface-2'], ['accent-ink', 'accent'], ['ink', 'accent-soft'], ['accent', 'accent-soft'],
        ['warn', 'warn-soft'], ['warn', 'bg'], ['danger', 'bg'], ['danger', 'warn-soft']]
      for (const [f, b] of text) expect(ratio(t[f], t[b]), `${f} on ${b}`).toBeGreaterThanOrEqual(4.5)
      for (const k of ['m-cs', 'm-contact', 'm-dialect', 'm-colloquial', 'm-archaic', 'm-rusyn', 'map-line', 'map-dot', 'accent'])
        expect(ratio(t[k], t.bg), `${k} (non-text) on bg`).toBeGreaterThanOrEqual(3)
    })
  }
})

