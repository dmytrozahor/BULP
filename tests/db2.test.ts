/** SPEC 63 DB-2: the MAIN chip = the region of the earliest reliable attestation; the others are secondary by their own earliest year; a search row shows the main chip lazily. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { firstRegions, pickFirst, type FrEntry, type FrWitness } from '../core/first-region.ts'
import { badgeWithFirst } from '../core/dialect-first.ts'
import type { DialectResult } from '../core/labels.ts'
import DialectBadge from '../src/components/DialectBadge.vue'
import ArmsMarks from '../src/components/ArmsMarks.vue'
import FirstChip from '../src/components/FirstChip.vue'

const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const NAMES: Record<string, string> = { volyn: 'Волинь', halychyna: 'Галичина', kyiv: 'Київ і Київщина', 'abroad-strasbourg': 'еміграція / поза Україною (Страсбург)' }
const name = (c: string) => NAMES[c] ?? c
const W: Record<string, FrWitness & { region?: string }> = {
  v1566: { id: 'v1566', date: [1566, 1566], witnessType: 'print', region: 'Волинь' },
  g1580: { id: 'g1580', date: [1580, 1580], witnessType: 'print', region: 'Галичина' },
  g1600: { id: 'g1600', date: [1600, 1600], witnessType: 'print', region: 'Галичина' },
  k1700: { id: 'k1700', date: [1700, 1700], witnessType: 'print', region: 'Київ' },
  ocr1092: { id: 'ocr1092', date: [1092, 1092], witnessType: 'ocr', region: 'Київ', oq: { band: 'low' } },
  abroad1500: { id: 'abroad1500', date: [1500, 1500], witnessType: 'print', region: 'Страсбург' },
  unc1400: { id: 'unc1400', date: [1400, 1400], witnessType: 'ms', region: 'Київ', dateUncertain: true },
  nor1450: { id: 'nor1450', date: [1450, 1450], witnessType: 'ms' },
  dict1627: { id: 'dict1627', date: [1627, 1627], witnessType: 'dictionary', region: 'Київ' },
  v2: { id: 'v2', date: [1570, 1570], witnessType: 'print', region: 'Волинь' },
}
const CODE: Record<string, { code: string; place: boolean }> = { Волинь: { code: 'volyn', place: false }, Галичина: { code: 'halychyna', place: false }, Київ: { code: 'kyiv', place: false }, Страсбург: { code: 'abroad-strasbourg', place: true } }
const entry = (ids: string[]): FrEntry => firstRegions(Object.fromEntries(ids.map(i => [i, 3])), id => W[id], w => (w.region ? CODE[w.region] : undefined))!
const few: DialectResult = { c: 'few', need: 'мало даних' }
const chips = (e: FrEntry | undefined, d: DialectResult = few) => badgeWithFirst({ d, regionName: name, lemma: 'тест', ...(e ? { fr: e } : {}) })

describe('DB-2 the main chip: the region of the earliest reliable attestation', () => {
  it('a word first attested in Волинь has a Волинь main chip with a link to that witness; the others are secondary, ordered by their own year', async () => {
    const cs = chips(entry(['v1566', 'v2', 'g1580', 'g1600', 'k1700']))
    expect(cs[0]).toMatchObject({ role: 'main', year: '1566', witness: 'v1566', href: '/witness/v1566', signal: 'first' }); expect(cs[0]!.text).toMatch(/перша фіксація: Волинь, 1566$/)
    expect(cs.filter(c => c.role === 'main')).toHaveLength(1)
    const sec = cs.filter(c => c.role === 'secondary'); expect(sec.map(c => c.year)).toEqual(['1580', '1700']); expect(sec.map(c => c.text.replace(/^гіпотеза: /, ''))).toEqual(['Галичина, 1580', 'Київ і Київщина, 1700']); expect(sec.every(c => c.href)).toBe(true)
    const html = await render(DialectBadge, { lemma: 'тест', chipsIn: cs })
    expect(html).toContain('data-testid="dchip-main"'); expect(html).toContain('href="/witness/v1566"'); expect(html).toContain('перша фіксація: Волинь, 1566'); expect(html).not.toMatch(/волинське/)
  })
  it('the wording is honest: the region is where the witness was written or printed, not «волинське слово»', () => {
    const c = chips(entry(['v1566', 'v2']))[0]!; expect(c.basis).toMatch(/місце, де пам’ятку написано чи надруковано/); expect(c.basis).toMatch(/не діалектна мітка/); expect(c.text).not.toMatch(/волинськ/i)
  })
  it('a gated OCR earliest witness is skipped (and counted), as is a witness with an uncertain date', () => {
    const e = entry(['ocr1092', 'unc1400', 'v1566', 'g1580']); expect(e.o).toBe(1); expect(e.x).toBe(1)
    const cs = chips(e); expect(cs[0]!.year).toBe('1566'); expect(cs[0]!.text).toMatch(/Волинь, 1566/); expect(cs[0]!.basis).toMatch(/OCR/); expect(cs[0]!.basis).toMatch(/непевною датою/)
    expect(cs.some(c => /1092|1400/.test(c.text))).toBe(false)
  })
  it('an abroad earliest region is skipped (DB-1c): the earliest REAL region is the main chip, and the popover says an earlier one was not counted', () => {
    const e = entry(['abroad1500', 'v1566', 'g1580']); expect(e.r[0]!.c).toBe('abroad-strasbourg')
    const cs = chips(e); expect(cs[0]!.text).toMatch(/Волинь, 1566/); expect(cs.some(c => /Страсбург|еміграц|поза Україною/.test(c.text))).toBe(false)
    expect(cs[0]!.basis).toMatch(/ранішу фіксацію поза Україною/); expect(cs[0]!.basis).toMatch(/еміграція — не діалект/)
    const only = chips(entry(['abroad1500'])); expect(only.some(c => c.role === 'main')).toBe(false)
  })
  it('a witness with no region is skipped and the popover says so; a dictionary witness is not an attestation', () => {
    const e = entry(['nor1450', 'dict1627', 'k1700']); expect(e.u).toBe(1); expect(e.r.map(r => r.w)).toEqual(['k1700'])
    const cs = chips(e); expect(cs[0]!.text).toMatch(/Київ і Київщина, 1700/); expect(cs[0]!.basis).toMatch(/пропущено 1 пам’яток без регіону/)
  })
  it('equal first years: both regions are main chips marked «одночасно», shown as equals', async () => {
    const a = entry(['v1566', 'g1580']); a.r[1]!.y = 1566   // the same year in two regions
    const cs = chips(a); const mains = cs.filter(c => c.role === 'main'); expect(mains).toHaveLength(2); expect(mains.every(c => c.simul && /одночасно/.test(c.text))).toBe(true)
    expect(mains.map(c => c.text).sort()).toEqual(['гіпотеза: перша фіксація — Волинь, 1566 · одночасно', 'гіпотеза: перша фіксація — Галичина, 1566 · одночасно'])
    expect(await render(DialectBadge, { lemma: 'тест', chipsIn: cs })).toContain('одночасно'); expect(pickFirst(a, name)!.simul).toBe(true)
  })
  it('thin evidence (one witness in the region, or a place of publication only) is the dashed hypothesis style with «гіпотеза»; two witnesses give the corpus style', async () => {
    const thin = chips(entry(['v1566']))[0]!; expect(thin.grade).toBe('hyp'); expect(thin.text).toMatch(/^гіпотеза: перша фіксація — Волинь, 1566/); expect(thin.claim!.evidence[0]!.kind).toBe('P')
    expect(await render(DialectBadge, { lemma: 'тест', chipsIn: [thin] })).toContain('g-hyp')
    const solid = chips(entry(['v1566', 'v2']))[0]!; expect(solid.grade).toBe('corpus'); expect(solid.text).toBe('перша фіксація: Волинь, 1566'); expect(solid.claim).toBeUndefined()
  })
  it('a dictionary dialect that differs from the earliest region stays visible, with its grade, among the secondary chips; both popovers say so', () => {
    const hit = { t: 'hrinch-labels', a: 'Гуцул.', kind: 'area' as const, v: 'hutsul', q: 'Гуцул.', u: 'https://r2u.org.ua/x' }
    const cs = chips(entry(['v1566', 'v2', 'g1580']), { c: 'dict', strict: true, dict: [hit], areas: ['hutsul'], groups: ['HUT'] })
    expect(cs[0]!.role).toBe('main'); const d = cs.find(c => c.grade === 'dict')!; expect(d.role).toBe('secondary'); expect(d.text).toBe('гуцульське')
    expect(cs[0]!.basis).toMatch(/Словник називає слово «гуцульське», а найраніша фіксація — Волинь/); expect(d.basis).toMatch(/різні відомості/)
  })
  it('the map keeps the arms marker on the main region and draws it as the primary marker', async () => {
    const cs = chips(entry(['v1566', 'v2', 'g1580'])); expect(cs[0]!.marks).toEqual(['volyn'])
    const html = await render(ArmsMarks, { lemma: 'тест', chipsIn: cs }); expect(html).toMatch(/data-testid="arms-volyn"[^>]*data-primary="1"|data-primary="1"[^>]*data-testid="arms-volyn"/); expect(html).toContain('data-testid="arms-halychyna"')
  })
  it('a word with no reliable real region keeps the DB-1 chips unchanged', () => {
    expect(chips(undefined)[0]).toMatchObject({ grade: 'none' }); expect(chips(undefined).some(c => c.role)).toBe(false)
  })
})

describe('DB-2 search rows: the main chip, lazily, with reserved space; nothing on the keystroke path', () => {
  const e = entry(['v1566', 'v2', 'g1580'])
  it('a row shows «Волинь, 1566» (dashed «гіпотеза» for thin evidence); before the shard arrives it is an empty reserved placeholder', async () => {
    const html = await render(FirstChip, { lemma: 'тест', entryIn: e, names: NAMES }); expect(html).toContain('data-state="chip"'); expect(html).toContain('Волинь, 1566'); expect(html).not.toContain('гіпотеза')
    expect(await render(FirstChip, { lemma: 'тест', entryIn: entry(['v1566']), names: NAMES })).toMatch(/гіпотеза: Волинь, 1566/)
    const ph = await render(FirstChip, { lemma: 'тест' }); expect(ph).toContain('data-state="pending"'); expect(ph).toContain('frchip'); expect(ph).not.toContain('search-first-text')
    expect(readFileSync('src/ux.css', 'utf8')).toMatch(/\.frchip \{[^}]*min-height[^}]*min-width/)
  })
  it('the keystroke path does not load it: only the row component reads lm/fr, after a delay, and the search library and the boot code never do', () => {
    for (const f of ['src/lib/search.ts', 'src/composables/useData.ts', 'src/main.ts', 'core/parts.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/lm\/fr|firstData|first-region/)
    const row = readFileSync('src/components/FirstChip.vue', 'utf8'); expect(row).toMatch(/setTimeout/); expect(row).toMatch(/clearTimeout/)
    expect(readFileSync('src/views/SearchView.vue', 'utf8')).toMatch(/<FirstChip :lemma="r\.lemma"/)
  })
  it('the budget holds: every lm/fr shard is tiny (≤ 8 KB gz); no core card or boot file mentions it', () => {
    const dir = 'public/data/lm/fr'; if (!existsSync(dir)) return
    for (const f of readdirSync(dir)) expect(gzipSync(readFileSync(`${dir}/${f}`)).length, f).toBeLessThanOrEqual(8 * 1024)
  })
})
