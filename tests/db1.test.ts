/** SPEC 63 DB-1 (dialect badge + coats of arms on the map) and DB-1b (the «За регіонами» block never overflows; low-N regions are marked). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { badgeChips, contrast, PALETTE, MAX_CHIPS, hueOf, type BadgeChip } from '../core/dialect-badge.ts'
import { COAT_TARGETS, MARKS, markByKey, coatUsable, settlementMark, type CoatSources } from '../core/coats.ts'
import { licenceOk } from '../core/persons.ts'
import type { DialectResult } from '../core/labels.ts'
import DialectBadge from '../src/components/DialectBadge.vue'
import ArmsMarks from '../src/components/ArmsMarks.vue'
import RegionBars from '../src/components/RegionBars.vue'
import { barRows, shownIpm, REGION_MIN_N } from '../src/lib/regionBars.ts'

const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const name = (c: string) => ({ halychyna: 'Галичина', kyiv: 'Київ і Київщина', volyn: 'Волинь', poltavshchyna: 'Полтавщина' } as Record<string, string>)[c] ?? c
const hit = { t: 'hrinch-labels', a: 'Гуцул.', kind: 'area' as const, v: 'hutsul', q: 'Бо́йка, ки, ж. … Гуцул.', u: 'https://r2u.org.ua/x' }
const dictD: DialectResult = { c: 'dict', strict: true, dict: [hit], areas: ['hutsul'], groups: ['HUT'] }
const placeD: DialectResult = { c: 'dict', strict: false, dict: [{ ...hit, p: true }], areas: ['hutsul'], groups: ['HUT'] }
const rows = [{ code: 'halychyna', f: 25, N: 172081 }, { code: 'kyiv', f: 3, N: 435607 }, { code: 'volyn', f: 2, N: 45268 }]
const corp = (top?: object) => ({ f: 30, nReg: 3, att: 3, dp: 0.7, rows, ...(top ? { top } : {}) }) as DialectResult['corp']
const corpusD: DialectResult = { c: 'corpus', corp: corp({ code: 'halychyna', f: 25, N: 172081, g2: 40, lr: 3, p: 1e-9 }) }
const fewD: DialectResult = { c: 'few', corp: { f: 4, nReg: 3, att: 2, dp: 0.8, rows: [{ code: 'halychyna', f: 3, N: 172081 }, { code: 'kyiv', f: 1, N: 435607 }, { code: 'volyn', f: 0, N: 45268 }] }, need: 'потрібно ≥ 5 уживань' }
const generalD: DialectResult = { c: 'general', corp: { f: 90, nReg: 4, att: 4, dp: 0.1, rows } }
const chips = (d: DialectResult, extra: object = {}) => badgeChips({ d, regionName: name, lemma: 'тест', ...extra })

describe('DB-1 the badge: one chip per signal, graded in words and in shape', () => {
  it('a dict-grade word renders a SOLID chip with the dialect name', async () => {
    const cs = chips(dictD); expect(cs[0]).toMatchObject({ grade: 'dict', text: 'гуцульське', code: 'HUT' })
    expect(cs[0]!.evidence[0]!.kind).toBe('Q')
    const html = await render(DialectBadge, { lemma: 'тест', chipsIn: cs })
    expect(html).toContain('data-testid="dchip-dict"'); expect(html).toContain('g-dict'); expect(html).toContain('гуцульське')
  })
  it('a place-only record is «зафіксовано: …», never a dialect claim', async () => {
    const cs = chips(placeD); expect(cs[0]!.grade).toBe('place'); expect(cs[0]!.text).toMatch(/^зафіксовано: /)
    expect(cs[0]!.text).not.toMatch(/ське$/)
    expect(await render(DialectBadge, { lemma: 'тест', chipsIn: cs })).toContain('g-place')
  })
  it('a corpus-only word never states the dialect as fact: «у корпусі переважно: <регіон пам’яток>»', async () => {
    const cs = chips(corpusD); expect(cs).toHaveLength(1); expect(cs[0]!.grade).toBe('corpus')
    expect(cs[0]!.text).toBe('у корпусі переважно: Галичина'); expect(cs[0]!.text).not.toMatch(/галицьке|наддністрянське|гуцульське|діалект/i)
    expect(cs[0]!.basis).toContain('не діалектна мітка'); expect(cs[0]!.claim).toBeUndefined()
    expect(await render(DialectBadge, { lemma: 'тест', chipsIn: cs })).toContain('g-corpus')
  })
  it('a hypothesis chip says «гіпотеза», states its basis, is dashed, and passes claim() with kind P', async () => {
    const cs = chips(fewD); expect(cs[0]!.grade).toBe('hyp'); expect(cs[0]!.text).toBe('гіпотеза: Галичина')
    expect(cs[0]!.basis).toMatch(/у корпусі 3 із 4 вживань/); expect(cs[0]!.basis).toMatch(/не виконано|не пройдено/)
    expect(cs[0]!.claim!.evidence[0]!.kind).toBe('P'); expect(cs[0]!.claim!.value).toBe('гіпотеза: Галичина'); expect(cs[0]!.signal).toBe('corpus')
    const html = await render(DialectBadge, { lemma: 'тест', chipsIn: cs })
    expect(html).toContain('g-hyp'); expect(html).toContain('гіпотеза: Галичина')
  })
  it('a spelling feature gives a hypothesis with the rule as basis; no signal at all gives «говір не встановлено»', () => {
    const cite = { source: 'ATLAS', quote: 'ы замість и', locator: 'x', kind: 'Q' as const }
    const f = chips({ c: 'few' }, { fired: [{ id: 'BOY-1', code: 'BOY', feature: 'ы', cite }] })
    expect(f[0]).toMatchObject({ grade: 'hyp', text: 'гіпотеза: бойківське', signal: 'spelling' }); expect(f[0]!.basis).toContain('BOY-1')
    const n = chips({ c: 'few', need: 'мало даних' }); expect(n).toHaveLength(1); expect(n[0]).toMatchObject({ grade: 'none', text: 'говір не встановлено' })
  })
  it('a general word has NO dialect chip, only a neutral «загальновживане»', async () => {
    const cs = chips(generalD); expect(cs).toHaveLength(1); expect(cs[0]).toMatchObject({ grade: 'general', text: 'загальновживане' }); expect(cs[0]!.marks).toEqual([])
    const sum = chips({ c: 'general', sub: 'sum' }); expect(sum[0]!.grade).toBe('general')
    const html = await render(DialectBadge, { lemma: 'тест', chipsIn: cs }); expect(html).not.toContain('g-dict'); expect(html).not.toContain('g-hyp')
  })
  it('at most 3 chips are shown, the rest behind «ще N»', async () => {
    const many: BadgeChip[] = ['BOY', 'HUT', 'LEM', 'ZAK', 'VOL'].map(code => ({ grade: 'dict', text: code, code, marks: [], basis: 'b', evidence: [] }))
    const html = await render(DialectBadge, { lemma: 'тест', chipsIn: many })
    expect(html.match(/data-testid="dchip-dict"/g)).toHaveLength(MAX_CHIPS); expect(html).toContain('ще 2')
  })
  it('the palette: solid text is readable (≥ 4.5) in both themes, the border is visible (≥ 3) on both surfaces', () => {
    for (const [k, h] of Object.entries(PALETTE)) {
      expect(contrast(h.light, h.onLight), k + ' light solid').toBeGreaterThanOrEqual(4.5)
      expect(contrast(h.dark, h.onDark), k + ' dark solid').toBeGreaterThanOrEqual(4.5)
      expect(contrast(h.light, '#ffffff'), k + ' light border').toBeGreaterThanOrEqual(3)
      expect(contrast(h.dark, '#201d16'), k + ' dark border').toBeGreaterThanOrEqual(3)
    }
    expect(new Set(Object.values(PALETTE).map(h => h.light)).size).toBe(Object.keys(PALETTE).length); expect(hueOf('nope')).toBe(PALETTE.REGION)
  })
})

describe('DB-1 the map: arms at the smallest level the evidence supports, with the grade', () => {
  const sources: CoatSources = { 'oblast-UA-07': { id: 'oblast-UA-07', area: 'UA-07', level: 'oblast', ok: true, file: 'x.svg', page: 'https://commons.wikimedia.org/wiki/File:x.svg', licence: 'Public domain', checked: '2026-11-04' } }
  it('levels: a city has arms of its own, a region equal to an oblast uses the oblast arms and says so, a region without arms has a plain marker', () => {
    expect(settlementMark('lviv')).toMatchObject({ level: 'settlement', coat: 'city-lviv' })
    expect(markByKey.volyn).toMatchObject({ level: 'region', coat: 'oblast-UA-07' }); expect(markByKey.volyn!.viaOblast).toMatch(/області/)
    for (const k of ['halychyna', 'hutsul', 'boiko', 'lemko', 'podillia', 'slobozhanshchyna']) expect(markByKey[k]!.coat, k).toBeUndefined()
    expect(coatUsable('oblast-UA-07', sources)).toBe(true); expect(coatUsable('oblast-UA-46', sources)).toBe(false)
  })
  it('a dict chip puts a plain marker on a region without arms; a hypothesis ring is dashed and the tooltip says «гіпотеза»', async () => {
    const dict = await render(ArmsMarks, { lemma: 'тест', chipsIn: chips(dictD) })
    expect(dict).toContain('data-testid="arms-hutsul"'); expect(dict).toContain('data-level="region"'); expect(dict).toContain('data-coat="0"'); expect(dict).toContain('data-grade="dict"'); expect(dict).not.toContain('am-hyp')
    const hyp = await render(ArmsMarks, { lemma: 'тест', chipsIn: chips(fewD) })
    expect(hyp).toContain('data-grade="hyp"'); expect(hyp).toContain('am-hyp'); expect(hyp).toMatch(/<title>гіпотеза: Галичина/)
  })
  it('the marker of a region equal to an oblast is flagged as such (its tooltip names the oblast arms only when they are drawn)', async () => {
    const c = chips({ c: 'corpus', corp: { f: 22, nReg: 3, att: 3, dp: 0.7, rows: [{ code: 'volyn', f: 20, N: 45268 }, { code: 'halychyna', f: 1, N: 172081 }, { code: 'kyiv', f: 1, N: 435607 }] } })
    expect(c[0]!.marks).toEqual(['volyn']); expect(await render(ArmsMarks, { lemma: 'тест', chipsIn: c })).toContain('data-testid="arms-volyn"')
  })
})

describe('DB-1 the arms files: every one has a source row with a free licence; the total is small', () => {
  const src = existsSync('data/coats/SOURCES.json') ? JSON.parse(readFileSync('data/coats/SOURCES.json', 'utf8')) as CoatSources : {}
  const files = existsSync('public/coats') ? readdirSync('public/coats').filter(f => f.endsWith('.svg')) : []
  it('each svg has an ok row with a free licence, author and Commons page', () => {
    for (const f of files) {
      const r = src[f.replace(/\.svg$/, '')]; expect(r, f).toBeDefined(); expect(r!.ok, f).toBe(true)
      expect(licenceOk(r!.licence), f + ' ' + r!.licence).toBe(true); expect(r!.author, f).toBeTruthy(); expect(r!.page, f).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
      expect(COAT_TARGETS.some(t => t.id === r!.id), f).toBe(true)
    }
  })
  it('no svg carries a script or an external reference; each file is small', () => {
    for (const f of files) { const s = readFileSync('public/coats/' + f, 'utf8'); expect(s, f).not.toMatch(/<script|onload=|<foreignObject|href="https?:/i); expect(statSync('public/coats/' + f).size, f).toBeLessThan(200_000) }
  })
  it('every mark with a coat id has a target; the badge adds nothing to the core cards (no coats in the boot files)', () => {
    for (const m of MARKS) if (m.coat) expect(COAT_TARGETS.some(t => t.id === m.coat), m.key).toBe(true)
    for (const f of ['src/main.ts', 'src/composables/useData.ts']) expect(readFileSync(f, 'utf8')).not.toMatch(/coats|dialect-badge/)
  })
})

describe('DB-1b «За регіонами»: nothing overflows, low-N regions are marked and never set the scale', () => {
  const strasbourg = { code: 'abroad-strasbourg', f: 672, N: 10_000 }, big = { code: 'halychyna', f: 40, N: 172_081 }
  const nm = { 'abroad-strasbourg': 'еміграція / поза Україною (Страсбург)', halychyna: 'Галичина' }
  it('67 190,4 is shortened to fit, the label is allowed to wrap, the number has its own column', async () => {
    expect(shownIpm(67190.4).replace(/\s| /g, '')).toBe('67190'); expect(shownIpm(232.4)).toMatch(/232,4/)
    const html = await render(RegionBars, { by: [strasbourg, big], names: nm })
    expect(html).toContain('еміграція / поза Україною (Страсбург)'); expect(html).toContain('data-testid="region-bars"'); expect(html).toContain('rb-v')
    const css = readFileSync('src/style.css', 'utf8')
    expect(css).toMatch(/\.regbars li \{[^}]*grid-template-columns: minmax\(0, [^)]*\) minmax\([^)]*\) auto/)
    expect(css).toMatch(/\.rb-n \{[^}]*min-width: 0[^}]*overflow-wrap: anywhere/); expect(css).toMatch(/\.rb-v \{[^}]*tabular-nums[^}]*nowrap|\.rb-v \{[^}]*nowrap[^}]*tabular-nums/); expect(css).toMatch(/\.statside \{ overflow-x: hidden/)
  })
  it('a region with a small denominator is greyed, says «мала вибірка: N слів», and the bar scale ignores it', async () => {
    const r = barRows([strasbourg, big], c => c); const low = r.find(x => x.code === 'abroad-strasbourg')!, ok = r.find(x => x.code === 'halychyna')!
    expect(low.low).toBe(true); expect(ok.low).toBe(false); expect(ok.w).toBe(100); expect(low.w).toBeLessThanOrEqual(100); expect(r[0]!.code).toBe('halychyna'); expect(REGION_MIN_N).toBeGreaterThan(10_000)
    const html = await render(RegionBars, { by: [strasbourg, big], names: nm })
    expect(html).toContain('data-low="1"'); expect(html).toMatch(/мала вибірка: 10[\s ]000 слів/); expect(html).toContain('data-testid="rb-rule"')
    expect(await render(RegionBars, { by: [big], names: nm })).not.toContain('rb-low')
  })
})

describe('DB-1c emigration is not a dialect: no chip, no map marker, at any grade', () => {
  const abroad = { code: 'abroad-strasbourg', f: 30, N: 15_000 }, ab = (c: string) => (c === 'abroad-strasbourg' ? 'еміграція / поза Україною (Страсбург)' : name(c))
  const run = (d: DialectResult) => badgeChips({ d, regionName: ab, lemma: 'тест' })
  it('isDialectRegion excludes every abroad row and names with emigration/diaspora; keeps Ukrainian territories', async () => {
    const { isDialectRegion } = await import('../core/dialect-badge.ts')
    for (const c of ['abroad-strasbourg', 'abroad-new-york', 'abroad-germany', 'diaspora']) expect(isDialectRegion(c), c).toBe(false)
    expect(isDialectRegion('x', 'еміграція / поза Україною (Париж)')).toBe(false)
    for (const c of ['halychyna', 'kuban', 'kholm', 'volyn']) expect(isDialectRegion(c), c).toBe(true)
  })
  it('a corpus skew whose top region is abroad gives no chip for it (the next real region only if it passes the rules, else «говір не встановлено»)', () => {
    const rowsAb = [abroad, { code: 'halychyna', f: 1, N: 172081 }, { code: 'volyn', f: 1, N: 45268 }, { code: 'kyiv', f: 1, N: 435607 }]
    const d: DialectResult = { c: 'corpus', corp: corpusSummaryOf(rowsAb, { code: 'abroad-strasbourg', f: 30, N: 15_000, g2: 90, lr: 5, p: 1e-12 }) }
    const cs = run(d); expect(cs.map(c => c.text).join('|')).not.toMatch(/Страсбург|еміграц|поза Україною/); expect(cs.every(c => !c.marks.some(m => /abroad/.test(m)))).toBe(true)
    expect(cs[0]!.grade).toBe('none')
  })
  it('a hypothesis is never built from an abroad region, but the next real one is used when it exists', () => {
    const only = run({ c: 'few', corp: { f: 4, nReg: 1, att: 1, dp: 1, rows: [{ code: 'abroad-strasbourg', f: 4, N: 15_000 }, { code: 'kyiv', f: 0, N: 435607 }] } })
    expect(only).toHaveLength(1); expect(only[0]!.grade).toBe('none')
    const next = run({ c: 'few', corp: { f: 8, nReg: 3, att: 2, dp: 1, rows: [{ code: 'abroad-strasbourg', f: 5, N: 1_000_000 }, { code: 'halychyna', f: 3, N: 100_000 }, { code: 'kyiv', f: 0, N: 435607 }] } })
    expect(next.some(c => /Страсбург/.test(c.text))).toBe(false)
  })
  it('a witness-only class in a place abroad gives no hypothesis chip', () => {
    const cs = run({ c: 'witness', wit: { n: 2, regions: [['abroad-strasbourg', 'еміграція / поза Україною (Страсбург)']], from: 1900, to: 1950 } })
    expect(cs[0]!.grade).toBe('none')
  })
  it('the row stays in the «За регіонами» statistics block', async () => {
    const html = await render(RegionBars, { by: [{ code: 'abroad-strasbourg', f: 672, N: 10_000 }], names: { 'abroad-strasbourg': 'еміграція / поза Україною (Страсбург)' } })
    expect(html).toContain('еміграція / поза Україною (Страсбург)')
  })
})
function corpusSummaryOf(rows: { code: string; f: number; N: number }[], top: object) {
  return { f: rows.reduce((a, r) => a + r.f, 0), nReg: rows.length, att: rows.length, dp: 0.6, rows, top } as DialectResult['corp']
}
