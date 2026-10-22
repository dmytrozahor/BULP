/** SPEC 63 LB-1…LB-7: dialect class (keyness, dispersion), dictionary label tables, register / type sources, the Labels block, card parity, the methods page, the build step. */
import { describe, it, expect } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { SUM_NORM_UK, SUM_NONRESTRICTIVE, sumLabelHit, wiktRegionHit, VESUM_TAGS, assembleEntry, corpusSummary, dialectOf, dpNorm, keyness, TH, classUk, emptyEntry, pOfG2, type RegionCount } from '../core/labels.ts'
import { EXTRA_LABEL_TABLES, SUM11_LABELS, SUM20_LABELS, KAIKKI_REGION, KAIKKI_CATEGORY_TAG, WIKTUK_REGION, extraRow, DICT_LABEL_TABLES, HRINCH_LABELS, KRYM_LABELS, UMANETS_LABELS, ZHELEH_LABELS, resolveRow, scanArticle, scanBracketed, wireHit, countyByStem } from '../core/dict-labels.ts'
import { KAIKKI_KEEP } from '../core/autolabel.ts'
import { WIKT_CATEGORIES } from '../core/usage.ts'
import { dialectHow, regViews, dialectHeadline, typeViews, hitView } from '../src/lib/labelsText.ts'
import { BLOCKS, KINDS, MATRIX } from '../src/lib/cardParity.ts'
import { scanR2u } from '../pipelines/build-labels.ts'
import LabelsBlock from '../src/components/LabelsBlock.vue'
import LabelLine from '../src/components/LabelLine.vue'
import LabelsMethodView from '../src/views/LabelsMethodView.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const norm = (s: string) => s.toLowerCase().replace(/ѣ/g, 'і').replace(/[\s.]/g, '')
const squash = (s: string) => s.replace(/\s+/g, ' ')

// four regions, equal size: the fixture of LB-1
const eq = (f: number[]): RegionCount[] => f.map((x, i) => ({ code: 'r' + i, f: x, N: 100000 }))

describe('LB-1 dialect class', () => {
  it('LB-1 keyness: a fixture region table gives G², LR and Bonferroni as computed by hand', () => {
    const by = eq([12, 0, 1, 1])   // 14 uses, 12 of them in r0
    const k = keyness(by).find(x => x.code === 'r0')!
    // 2×2: a=12, b=99988, c=2, d=299998; N=400000
    const a = 12, b = 99988, c = 2, d = 299998, n = a + b + c + d
    const e = [((a + b) * (a + c)) / n, ((a + b) * (b + d)) / n, ((c + d) * (a + c)) / n, ((c + d) * (b + d)) / n]
    const g2 = 2 * [a, b, c, d].reduce((s, o, i) => s + o * Math.log(o / e[i]!), 0)
    expect(k.g2).toBeCloseTo(g2, 6)
    expect(k.lr).toBeCloseTo(Math.log2((12.5 / 100000) / (2.5 / 300000)), 6)
    expect(k.p).toBeLessThan(TH.alpha / 4)
    expect(pOfG2(3.841)).toBeCloseTo(0.05, 2)   // χ², 1 df
    const s = corpusSummary(by)!
    expect(s.top?.code).toBe('r0'); expect(s.f).toBe(14); expect(s.att).toBe(3)
    // a region under-represented never wins
    expect(keyness(eq([0, 12, 12, 12])).find(x => x.code === 'r0')!.g2).toBeLessThan(0)
  })
  it('LB-1 dispersion: DP of an evenly spread lemma is near 0 and of a one-region lemma near 1', () => {
    expect(dpNorm(eq([5, 5, 5, 5]))).toBeCloseTo(0, 6)
    expect(dpNorm(eq([20, 0, 0, 0]))).toBeCloseTo(1, 6)
    expect(dpNorm(eq([8, 6, 4, 2]))).toBeGreaterThan(0.1); expect(dpNorm(eq([8, 6, 4, 2]))).toBeLessThan(0.5)
    expect(dpNorm([{ code: 'x', f: 3, N: 10 }])).toBe(1)   // one region with material: no dispersion to speak of
  })
  it('LB-1 class assignment: a > b > c > d, a place-of-recording label is a dictionary class that is not strict, and a corpus skew is never called dialect', () => {
    const strictHit = { t: 'hrinch-labels', a: 'Галиц.', kind: 'area' as const, v: 'halychyna', q: 'Единственный. Галиц.', u: 'https://r2u.org.ua/x' }
    const placeHit = { ...strictHit, a: 'Лохв. у.', p: true as const, place: 'Лохвицький повіт' }
    const skew = eq([12, 0, 1, 1]), even = eq([6, 6, 6, 6])
    const a = dialectOf([strictHit], [], skew)
    expect(a.c).toBe('dict'); expect(a.strict).toBe(true); expect(a.areas).toEqual(['halychyna']); expect(a.groups).toContain('NDN'); expect(a.corp?.top?.code).toBe('r0')   // the corpus numbers are kept
    const p = dialectOf([placeHit], [], even)
    expect(p.c).toBe('dict'); expect(p.strict).toBe(false); expect(classUk(p)).toContain('не обов’язково діалектне'); expect(classUk(a)).toBe('діалектне за словником')
    expect(dialectOf([], [['w', 'Діалектні вирази/uk']], undefined).strict).toBe(true)
    const b = dialectOf([], [], skew); expect(b.c).toBe('corpus'); expect(classUk(b)).toBe('регіонально марковане (корпус)'); expect(b.dict).toBeUndefined(); expect(b.areas).toBeUndefined()
    expect(dialectHeadline(b, c => `Регіон ${c}`)).toMatch(/^засвідчено переважно в пам’ятках з Регіон r0 \(LR \d/)
    expect(dialectHeadline(b, c => c)).toContain('G²')
    const c = dialectOf([], [], even); expect(c.c).toBe('general'); expect(c.groups).toBeUndefined()
    const d = dialectOf([], [], eq([2, 1, 0, 0])); expect(d.c).toBe('few'); expect(d.need).toContain(`≥ ${TH.fMin}`); expect(d.need).toContain('ще 2')
    expect(dialectOf([], [], undefined).c).toBe('few')
    expect(dialectOf([], [], [{ code: 'x', f: 9, N: 1000 }]).c).toBe('few')   // one region with material: nothing to compare
    // two regions only, no skew: not «загальновживане» (needs ≥ k regions) and says why
    const two = dialectOf([], [], [{ code: 'a', f: 5, N: 1000 }, { code: 'b', f: 5, N: 1000 }, { code: 'c', f: 0, N: 1000 }]); expect(two.c).toBe('few'); expect(two.need).toContain(`≥ ${TH.k}`)
  })
})

describe('LB-2 dictionary label tables', () => {
  it("LB-2 every table row quotes its dictionary's explanation and every area resolves", () => {
    expect(DICT_LABEL_TABLES.map(t => t.short)).toEqual(['Грінченко', 'Уманець–Спілка', 'Кримський–Єфремов', 'Желехівський'])
    let rows = 0
    for (const t of DICT_LABEL_TABLES) {
      expect(t.list, t.id).toMatch(/^https:\/\/r2u\.org\.ua\//)
      for (const r of t.rows) {
        rows++
        expect(norm(r.meaning), `${t.id} ${r.abbr}`).toContain(norm(r.abbr.split(' ')[0]!))   // the list may print the abbreviation with a sibling («Екат., Екатер. у. или г.»)
        if (r.kind === 'area') { const x = resolveRow(r); expect(!!x.area || x.places.length > 0, `${t.id} ${r.abbr}`).toBe(true) }
        if (r.county) expect(resolveRow(r).gov?.quote, `${t.id} ${r.abbr}`).toMatch(/губерн/)
      }
    }
    expect(rows).toBeGreaterThan(90)
    // the lists really are quoted: Грінченко's explanation of «Галиц.» and «Черк. у.»
    expect(HRINCH_LABELS.rows.find(r => r.abbr === 'Галиц.')!.meaning).toBe('Галиц. — Галиція.')
    expect(UMANETS_LABELS.rows.find(r => r.abbr === 'Гал.')!.meaning).toBe('Гал. — Галицьке слово.')
  })
  it('LB-2 Грінченко: listed counties, the generic X. у. rule and the governorate quote', () => {
    const text = 'Ко́ба, -би, ж. *Ум. Ко́бка. Пир. у., Кон. Ум. Біленький. Единственный. Галиц. Ярий дуб. Камен. у. Лохв. у. Харьк. у., Харьк. г. Бач Звен. у.'
    const hits = scanArticle(HRINCH_LABELS, text)
    const by = (abbr: string) => hits.find(h => h.row.abbr === abbr || h.row.abbr === abbr)
    expect(by('Галиц.')!.resolved.area).toBe('halychyna'); expect(by('Галиц.')!.row.scope).toBeUndefined()   // word-level
    expect(by('Лохв. у.')!.row.scope).toBe('place'); expect(by('Лохв. у.')!.resolved.gov?.quote).toContain('Полтавської губернії')
    expect(by('Харьк. у.')).toBeTruthy(); expect(by('Харьк. г.')).toBeTruthy(); expect(hits.some(h => h.row.abbr === 'Харьк.')).toBe(false)   // the longer abbreviation wins
    const v = hits.find(h => h.variant && h.resolved.gov?.name === 'Полтавська губернія')   // «Пир. у.»: not printed in the list, resolved by its rule
    expect(v?.quote).toContain('Пир. у.'); expect(hits.some(h => h.variant && h.row.county === 'Звенигородський')).toBe(true)
    expect(hits.some(h => /^Ум\./.test(h.row.abbr))).toBe(false)   // «Ум.» marks derived forms, not the headword
    expect(countyByStem('Звен.')?.[0]).toBe('Звенигородський'); expect(countyByStem('Ка.')).toBeUndefined(); expect(countyByStem('Бо.')).toBeUndefined()   // ambiguous or too short: no guess
    for (const h of hits) expect(squash(text), h.quote).toContain(squash(h.quote))   // the quote is a verbatim slice
    const w = wireHit(HRINCH_LABELS, by('Лохв. у.')!, 'https://r2u.org.ua/s?w=x#12_1')
    expect(w).toMatchObject({ t: 'hrinch-labels', a: 'Лохв. у.', kind: 'area', v: 'poltavshchyna', p: true, place: 'Лохвицький повіт' }); expect(w.gq).toMatch(/губерн/)
    expect(hitView(w)).toMatchObject({ dict: 'Грінченко', place: true, area: 'Полтавщина', meaning: 'Лохв. у. — Лохвицкій у ѣ здъ.' })
  })
  it('LB-2 Уманець and Кримський: the label attaches to one equivalent, labels in examples are not read', () => {
    const um = 'Образе́цъ, обра́зчикъ = зразо́к, взір, взо́рець (Гал.), шпиль (С. З.). Ли́жва = ли́жва (Гал. С. Пар.), нече́мний (Фр.). — Станівка сей рік зїма. Хар. — Принима́ть = брати.'
    const u = scanBracketed(UMANETS_LABELS, um)
    expect(u.map(h => `${h.row.abbr}:${h.word}`)).toEqual(['Гал.:взо́рець', 'Гал.:ли́жва'])
    expect(u[0]!.resolved.area).toBe('halychyna'); expect(u.some(h => h.row.abbr === 'Хар.')).toBe(false)   // «Хар.» outside brackets labels an example
    const kr = 'Керувати – прова́дити, керува́ти, (гал.) зафу́кати; (беспокойство) турбо́та, (диал.) ту́рба (Шевч.), (зап.) богда́й. [Як ти пі́деш? (Харк.)]'
    const k = scanBracketed(KRYM_LABELS, kr)
    expect(k.map(h => `${h.row.abbr}:${h.word}`)).toEqual(['гал.:зафу́кати', 'диал.:ту́рба', 'зап.:богда́й'])
    expect(k[1]!.row.kind).toBe('dialectal'); expect(wireHit(KRYM_LABELS, k[0]!, 'u').w).toBe('зафу́кати')
  })
  it('LB-2 Желехівський: hucul., ungr. and the start-of-article dim.', () => {
    const z = (t: string) => scanArticle(ZHELEH_LABELS, t).map(h => h.row.abbr)
    expect(z('Ва́лал, m. ungr. s. Село́.')).toEqual(['ungr.']); expect(resolveRow(ZHELEH_LABELS.rows.find(r => r.abbr === 'ungr.')!).area).toBe('zakarpattia')
    expect(z('Ґуш, (ша, m. ?) Шишка (на тѣлѣ); зобъ. Желех. (hucul.) Kropf.')).toContain('hucul.')
    expect(z('Ру́чка, f. dim. s. Рука́; / 2) Handgriff')).toEqual(['dim.'])
    expect(z('Ру́чище, n. augm. s. Рука́')).toEqual(['aug.'])
    expect(z('Дім, m. Haus, n. ' + 'x'.repeat(70) + ' dim. Dach')).toEqual([])   // a later «dim.» belongs to a sense, not to the headword
  })
})

describe('LB-3 register and LB-4 type', () => {
  it('LB-3 register items: sources, per-sense СУМ labels and VESUM tags; form-level tags stay with the forms', () => {
    const e = assembleEntry({
      dict: [], kind: 'full', pos: 'іменник', tagLine: 'noun:inanim:m:v_naz', nForms: 5, tagCount: { arch: 5, subst: 2, noun: 5 },
      usage: [['rozm', 'w', 'Розмовні вирази/uk'], ['zast', 'k', 'dated\tboth'], ['dial', 'w', 'Діалектні вирази/uk']],
      se: [{ n: 2, d: 'sum20', lb: ['перен.', 'розм.'] }, { n: 3, d: 'sum20', lb: ['діал.'] }],
    })
    const ids = e.r.map(r => `${r[0]}/${r[1]}${r[4] ? '#' + r[4] : ''}`)
    expect(ids).toEqual(expect.arrayContaining(['rozm/w', 'zast/k', 'arkh/v', 'fig/s#2', 'rozm/s#2']))
    expect(ids.some(i => i.startsWith('subst'))).toBe(false); expect(e.f).toEqual([['subst', 2, 5]])   // 2 of 5 forms: a property of those forms
    expect(e.r.some(r => r[0] === 'dial')).toBe(false); expect(e.d.plain?.map(p => p[0]).sort()).toEqual(['w']); expect(e.d.dict?.map(h => h.t)).toEqual(['sum20-labels']); expect(e.d.c).toBe('dict')   // «діал.» names no area: kept for the dialect row (СУМ: a cited table hit since LB-8, Wiktionary: plain)
    expect(e.s).toEqual([[2, 'sum20', ['перен.', 'розм.']], [3, 'sum20', ['діал.']]])
    const v = regViews(e.r)
    expect(v.find(x => x.id === 'arkh')!.sources[0]!.detail).toContain('застаріле/архаїчне'); expect(v.find(x => x.id === 'fig')!.sources[0]).toMatchObject({ srcUk: 'СУМ (позначка значення)', sense: 2 })
    expect(v.find(x => x.id === 'rozm')!.sources.map(s => s.src).sort()).toEqual(['s', 'w'])   // two sources for one label stay two pieces of evidence
  })
  it('LB-3 a lemma without any label is neutral and the block lists the dictionaries checked', async () => {
    const e = assembleEntry({ dict: [], usage: [], kind: 'dict', tagLine: 'noun:inanim:f:v_naz' })
    expect(e.r).toEqual([]); expect(e.p).toBe('іменник'); expect(e.m).toBe('неістота, жін. рід')
    const html = await render(LabelsBlock, { lemma: 'невідомеслово', kind: 'dict', byRegion: [{ code: 'k', f: 1, N: 1000 }, { code: 'h', f: 0, N: 1000 }] })
    expect(html).toContain('нейтральне (немає позначок у словниках)'); expect(html).toContain('перевірено'); expect(html).toContain('ВЕСУМ: теги slang'); expect(html).toContain('Суржик')
  })
  it('LB-4 type: VESUM prop and abbr, the loan label, the church-slavonic claim and the dictionary type labels', () => {
    const e = assembleEntry({
      dict: [{ t: 'zheleh-labels', a: 'dim.', kind: 'type', v: 'dim', q: 'Ру́чка, f. dim. s. Рука́', u: 'https://r2u.org.ua/x' }],
      usage: [], kind: 'full', pos: 'іменник', paradigmKind: 'noun', tagLine: 'noun:inanim:f:v_naz:prop:geo', nForms: 2, tagCount: { prop: 2, geo: 2, abbr: 2 },
      loan: ['pl', 'en.wiktionary Category:Ukrainian terms borrowed from Polish'], cs: { quote: 'ц.-сл. форма', locator: 'https://x' },
    })
    expect(e.t.map(t => `${t[0]}/${t[1]}`).sort()).toEqual(['abbr/v', 'cs/c', 'dim/d', 'geo/v', 'loan/l', 'proper/v'])
    const tv = typeViews(e.t); expect(tv.find(t => t.typ === 'abbr')!.detail).toContain('абревіатура'); expect(tv.find(t => t.typ === 'loan')!.uk).toBe('запозичення')
    expect(e.k).toBe('noun'); expect(e.p).toBe('іменник')
  })
})

describe('LB-5 the block, the Огляд line, card parity', () => {
  it('LB-5 the Labels block renders the four rows with the how-determined tooltip and a methods link', async () => {
    for (const kind of ['full', 'light', 'dict', 'arch'] as const) {
      const html = await render(LabelsBlock, { lemma: 'невідомеслово', kind, byRegion: [{ code: 'k', f: 12, N: 100000 }, { code: 'a', f: 0, N: 100000 }, { code: 'b', f: 1, N: 100000 }, { code: 'c', f: 1, N: 100000 }] })
      for (const row of ['lb-dialect-', 'lb-register-', 'lb-type-', 'lb-senses-']) expect(html, `${kind} ${row}`).toContain(`data-testid="${row}${kind}"`)
      expect(html).toContain('регіонально марковане (корпус)'); expect(html).toContain('як визначено'); expect(html).toContain('G²'); expect(html).toContain('не діалектна мітка')
      expect(html).toContain('href="/labels-method"'); expect(html).toContain('Як визначаються мітки')
      expect(html).toContain('Значення за епохами'); expect(html).toMatch(/словесного типу[^<]*у джерелах немає \(перевірено/)
      expect(html).toMatch(/Діалект<\/dt>/)
    }
    const empty = await render(LabelsBlock, { lemma: 'невідомеслово', kind: 'light' })
    expect(empty).toContain('завантаження міток'); expect(empty).toContain('недостатньо даних')   // never a blank field, even before the shard arrives
    expect(emptyEntry().d.need).toContain('≥ 5')
  })
  it('LB-5 card parity: every card kind mounts LabelsBlock and the Огляд label line', async () => {
    expect(BLOCKS.labels).toEqual(['LabelsBlock'])
    for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) {
      if (k === 'phrase') { expect(MATRIX.phrase.labels).toBe('na'); continue }
      expect(MATRIX[k].labels, k).toBe('shown')
      const src = KINDS[k].map(rd).join('\n')
      expect(src, k).toMatch(/<LabelsBlock|<LemmaBlocks/); expect(src, k).toContain('<OverviewTab')
    }
    expect(rd('src/components/LemmaBlocks.vue')).toContain('<LabelsBlock'); expect(rd('src/views/WordView.vue')).toContain('<LabelsBlock'); expect(rd('src/components/OverviewTab.vue')).toContain('<LabelLine')
    for (const f of ['src/views/WordView.vue', 'src/views/FormView.vue', 'src/components/ThinCard.vue']) expect(rd(f), f).toContain('labels-panel=')
    const html = await render(LabelLine, { lemma: 'невідомеслово', byRegion: [{ code: 'k', f: 1, N: 1000 }, { code: 'h', f: 0, N: 1000 }], panel: 't-lab' })
    expect(html).toContain('Діалект:'); expect(html).toContain('Регістр:'); expect(html).toContain('Тип:'); expect(html).toContain('недостатньо даних'); expect(html).toContain('нейтральне (немає позначок у словниках)'); expect(html).toContain('href="/labels-method"')
  })
})

describe('LB-6 methods page and LB-7 build', () => {
  it('LB-6 the methods page prints the thresholds and every dictionary table', async () => {
    const html = await render(LabelsMethodView, {})
    expect(html).toContain('Як визначаються мітки')
    for (const t of DICT_LABEL_TABLES) { expect(html).toContain(`data-testid="lbm-${t.id}"`); expect(html).toContain(t.list.split(' ')[0]!) }
    expect(html).toContain('Списокъ сокращеній'); expect(html).toContain('Лохв. у. — Лохвицкій у ѣ здъ.')
    for (const s of [String(TH.fMin), String(TH.k), String(TH.dpMax), 'Бонферроні', 'G²', 'DP']) expect(html).toContain(s)
    for (const c of ['діалектне за словником', 'регіонально марковане (корпус)', 'загальновживане', 'недостатньо даних']) expect(html).toContain(c)
    expect(rd('src/router.ts')).toContain("'/labels-method'")
  })
  it('LB-7 build-labels assembles an entry per lemma and the coverage report names the classes', () => {
    // a tiny r2u dump: one Грінченко article with a word-level label, read for a known lemma only
    const dir = mkdtempSync(join(tmpdir(), 'lb-r2u-')); mkdirSync(join(dir, 'pages'))
    const cell = '<table><tr><td id="12_999" class="result_row"><span class="KrymUkrBold">Бач</span>, <span class="KrymUkrItalic">нар.</span> <span class="num">1)</span> <span class="KrymRusPlain">Единственный. Галиц.</span> Лохв. у.</td></tr></table>'
    writeFileSync(join(dir, 'pages', '0.html.gz'), gzipSync(cell))
    writeFileSync(join(dir, 'index.jsonl'), JSON.stringify({ q: 'бач', scope: 'ukr', file: '0.html.gz', status: 200 }) + '\n')
    const s = scanR2u(dir, k => k === 'бач')
    expect(s.per['Грінченко']).toMatchObject({ articles: 1, labelled: 1 }); const hs = s.hits.get('бач')!
    expect(hs.map(x => x.a).sort()).toEqual(['Галиц.', 'Лохв. у.']); expect(scanR2u(dir, () => false).hits.size).toBe(0)
    const e = assembleEntry({ dict: hs, usage: [], kind: 'full', by: eq([6, 6, 6, 6]) })
    expect(e.d.c).toBe('dict'); expect(e.d.strict).toBe(true); expect(e.corpus).toBe(true)
    const rep = rd('analysis/labels-coverage.md')
    for (const c of ['діалектне за словником', 'регіонально марковане (корпус)', 'загальновживане', 'недостатньо даних', 'a+b+c', 'Чутливість до порогів']) expect(rep).toContain(c)
    expect(rd('pipelines/build-labels.ts')).toContain('lm/lb'); expect(rd('package.json')).toContain('build-labels.ts')
  })
})

describe('LB-8 new label sources: СУМ-11 / СУМ-20, en/uk.Вікісловник, ВЕСУМ', () => {
  it('LB-8 СУМ tables quote the dictionaries' + "'" + ' own lists: only «діал.» and «зах.» name a territory', () => {
    for (const t of [SUM11_LABELS, SUM20_LABELS]) {
      expect(t.list, t.id).toMatch(/^https:\/\/archive\.org\/details\//); expect(t.rows.map(r => r.abbr)).toEqual(['діал.', 'зах.'])
      expect(extraRow(t, 'зах.')!.meaning).toContain('західноукраїнське слово'); expect(extraRow(t, 'зах.')).toMatchObject({ kind: 'area', area: 'west' }); expect(extraRow(t, 'діал.')!.kind).toBe('dialectal')
    }
    expect(extraRow(SUM20_LABELS, 'зах.')!.meaning).toContain('не будучи вузькодіалектними'); expect(extraRow(SUM11_LABELS, 'діал.')!.meaning).toContain('При діалектних словах подається позначка')
    expect(sumLabelHit('sum20', 'розм.')).toBeUndefined(); expect(sumLabelHit('timchenko', 'діал.')).toBeUndefined(); expect(sumLabelHit('sum11', 'гуц.')).toBeUndefined()   // not in the printed lists: not invented
  })
  it('LB-8 СУМ «зах.» is a regional label (area, not a register); «діал.» without a region is «діалектне (регіон не вказано)»', () => {
    const z = assembleEntry({ dict: [], usage: [], kind: 'full', se: [{ n: 1, d: 'sum20', lb: ['зах.'], g: 'Посольство, представництво', u: 'https://sum20ua.com/x' }] })
    expect(z.d.c).toBe('dict'); expect(z.d.strict).toBe(true); expect(z.d.areas).toEqual(['west']); expect(z.d.dict![0]).toMatchObject({ t: 'sum20-labels', a: 'зах.', u: 'https://sum20ua.com/x' }); expect(z.d.dict![0]!.q).toContain('Посольство')
    expect(z.r.some(r => r[0].startsWith('~'))).toBe(false); expect(hitView(z.d.dict![0]!)).toMatchObject({ dict: 'СУМ-20', area: 'захід України' })
    const d = assembleEntry({ dict: [], usage: [], kind: 'full', se: [{ n: 1, d: 'sum11', lb: ['діал.'] }] })
    expect(d.d.c).toBe('dict'); expect(d.d.strict).toBe(true); expect(d.d.areas).toBeUndefined(); expect(d.d.plain).toBeUndefined(); expect(classUk(d.d)).toBe('діалектне за словником')
    expect(dialectHeadline(d.d, c => c)).toContain('регіон не вказано'); expect(hitView(d.d.dict![0]!).area).toBe('')
    const o = assembleEntry({ dict: [], usage: [], kind: 'full', se: [{ n: 1, d: 'timchenko', lb: ['діал.'] }] }); expect(o.d.plain).toEqual([['s', 'timchenko\tдіал.']])   // other dictionaries: unchanged
  })
  it('LB-8 Вікісловник: a region tag or category names an area (mapped through the cited table), «dialectal» / «regional» name none', () => {
    const sw = assembleEntry({ dict: [], usage: [['dial', 'k', 'Southwestern\tchair']], kind: 'full', lemma: 'крісло' })
    expect(sw.d.c).toBe('dict'); expect(sw.d.areas).toEqual(['southwest']); expect(sw.d.dict![0]).toMatchObject({ t: 'kaikki-region', a: 'Southwestern', u: 'https://en.wiktionary.org/wiki/%D0%BA%D1%80%D1%96%D1%81%D0%BB%D0%BE#Ukrainian' })
    expect(hitView(sw.d.dict![0]!).meaning).toContain('Western and Central Ukraine'); expect(sw.r.some(r => r[0] === 'dial')).toBe(false)
    const zk = assembleEntry({ dict: [], usage: [['dial', 'w', 'Закарпатський говір']], kind: 'full', lemma: 'варош' })
    expect(zk.d.areas).toEqual(['zakarpattia']); expect(zk.d.groups).toContain('ZAK'); expect(zk.d.dict![0]!.u).toBe('https://uk.wiktionary.org/wiki/%D0%B2%D0%B0%D1%80%D0%BE%D1%88')   // the gazetteer (uk.wikipedia) names the group
    expect(assembleEntry({ dict: [], usage: [['lemk', 'w', 'Лемківські вирази']], kind: 'full' }).d.areas).toEqual(['lemko'])
    for (const [src, det] of [['k', 'dialectal\tx'], ['k', 'regional\tx'], ['w', 'Діалектні вирази/uk'], ['w', 'Діалектизми']] as const) {
      expect(wiktRegionHit(src, det)).toBeUndefined()
      const e = assembleEntry({ dict: [], usage: [['dial', src, det]], kind: 'full' }); expect(e.d.c).toBe('dict'); expect(e.d.strict).toBe(true); expect(e.d.areas).toBeUndefined(); expect(e.d.plain).toEqual([[src, det]])
    }
    expect(extraRow(WIKTUK_REGION, 'Західноукраїнський діалект/uk')!.area).toBe('west')
  })
  it('LB-8 the harvest reads the new tags and categories; every row of a table is reachable and cited', () => {
    for (const r of KAIKKI_REGION.rows) expect(KAIKKI_KEEP.has(r.abbr) || r.abbr === 'dialectal', r.abbr).toBe(true)   // a tag the table maps is a tag the harvest keeps
    for (const tag of Object.values(KAIKKI_CATEGORY_TAG)) expect(extraRow(KAIKKI_REGION, tag), tag).toBeDefined()
    for (const r of WIKTUK_REGION.rows) { expect(WIKT_CATEGORIES.some(c => c.cat === r.abbr), r.abbr).toBe(true); expect(r.meaning).toContain(r.abbr) }
    for (const t of EXTRA_LABEL_TABLES) for (const r of t.rows) { expect(r.meaning.length, `${t.id} ${r.abbr}`).toBeGreaterThan(8); if (r.kind === 'area') { const x = resolveRow(r); expect(!!x.places[0], `${t.id} ${r.abbr}`).toBe(true) } }
  })
  it('LB-8 VESUM has no territorial tag (dict_uk doc/tags.txt): «arch» is "інколи діалектне" and does not make a word dialectal', () => {
    expect(Object.keys(VESUM_TAGS).sort()).toEqual(['alt', 'arch', 'bad', 'err', 'obsc', 'rare', 'slang', 'subst', 'vulg'])
    const e = assembleEntry({ dict: [], usage: [], kind: 'full', tagLine: 'adj:m:v_naz:arch', nForms: 1, tagCount: { arch: 1 } }); expect(e.d.c).toBe('few')
  })
  it('LB-8 the methods page prints the new tables with their lists', async () => {
    const html = await render(LabelsMethodView, {})
    for (const t of EXTRA_LABEL_TABLES) { expect(html).toContain(`data-testid="lbm-${t.id}"`); expect(html).toContain(t.list.split(' ')[0]!) }
    expect(html).toContain('не будучи вузькодіалектними'); expect(html).toContain('Terms or senses in Ukrainian as spoken in Transcarpathia')
  })
})

describe('LB-9 «загальновживане за словником (СУМ, без обмежувальних позначок)»', () => {
  const sum = [{ d: 'sum20', n: 2, restricted: false, u: 'https://sum20ua.com/a', l: 'т.1 с.231' }]
  const sn = [{ d: 'sum20', n: 2 }]
  it('LB-9 only when the corpus gives no dispersion; priority a > b > c(corpus) > c(СУМ) > d', () => {
    const a = dialectOf([], [], undefined, TH, sn); expect(a.c).toBe('general'); expect(a.sub).toBe('sum'); expect(classUk(a)).toBe(SUM_NORM_UK); expect(a.sumNorm).toEqual(sn)
    expect(dialectOf([], [], [{ code: 'x', f: 2, N: 1000 }, { code: 'y', f: 0, N: 1000 }], TH, sn).sub).toBe('sum')   // 2 uses: too few to compare
    expect(dialectOf([], [], [{ code: 'x', f: 9, N: 1000 }], TH, sn).sub).toBe('sum')   // one region with material
    expect(dialectOf([], [], eq([6, 6, 6, 6]), TH, sn).sub).toBeUndefined()   // the corpus dispersion decides: c by the corpus, not by the dictionary
    expect(dialectOf([], [], eq([12, 0, 1, 1]), TH, sn).c).toBe('corpus')
    const two = dialectOf([], [], [{ code: 'a', f: 5, N: 1000 }, { code: 'b', f: 5, N: 1000 }, { code: 'c', f: 0, N: 1000 }], TH, sn); expect(two.c).toBe('few')   // enough uses, narrow attestation: the corpus evidence stands against the dictionary
    expect(dialectOf([{ t: 'x', a: 'Гал.', kind: 'area', v: 'halychyna', q: 'q', u: 'u' }], [], undefined, TH, sn).c).toBe('dict')
    expect(dialectOf([], [], undefined).c).toBe('few')
  })
  it('LB-9 a headword qualifies only if no sense of it and no other source restricts it', () => {
    const ok = assembleEntry({ dict: [], usage: [], kind: 'full', sum }); expect(ok.d.c).toBe('general'); expect(ok.d.sub).toBe('sum'); expect(ok.d.sumNorm![0]).toMatchObject({ d: 'sum20', n: 2, u: 'https://sum20ua.com/a' })
    expect(assembleEntry({ dict: [], usage: [], kind: 'full', sum: [{ ...sum[0]!, restricted: true }] }).d.c).toBe('few')   // a sense labelled розм. / заст. / спец. …
    expect(assembleEntry({ dict: [], usage: [['rozm', 'w', 'Розмовні вирази/uk']], kind: 'full', sum }).d.c).toBe('few')   // another source gives a register
    expect(assembleEntry({ dict: [], usage: [], kind: 'full', sum, tagLine: 'noun:inanim:m:v_naz:slang', tagCount: { slang: 1 }, nForms: 1 }).d.c).toBe('few')
    expect(assembleEntry({ dict: [], usage: [['dial', 'k', 'dialectal\tx']], kind: 'full', sum }).d.c).toBe('dict')
    expect(assembleEntry({ dict: [], usage: [], kind: 'full' }).d.c).toBe('few')   // no СУМ headword: nothing to say
    expect(['перен.', 'тільки недок.', 'присл.'].every(l => SUM_NONRESTRICTIVE.has(l))).toBe(true); expect(['розм.', 'прост.', 'заст.', 'рідко.', 'спец.', 'діал.', 'зах.', 'техн.'].some(l => SUM_NONRESTRICTIVE.has(l))).toBe(false)
  })
  it('LB-9 the card says it is a dictionary status, not a measurement', () => {
    const r = dialectOf([], [], undefined, TH, sn)
    expect(dialectHeadline(r, c => c)).toMatch(/^загальновживане за словником: СУМ-20, 2 значень/); expect(dialectHeadline(r, c => c)).toContain('корпус не містить засвідчень')
    expect(dialectHow(r)).toContain('нормативний статус за словником'); expect(dialectHow(r)).toContain('не стверджуємо')
  })
})
