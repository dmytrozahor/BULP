/** SPEC 63 MP-1…MP-3: historical Ukrainian territories on the region map (cited extents, dashed drawing, witness regions, gazetteer groups, tokens, pan/zoom). */
import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { TERRITORIES, TERRITORIES_NOT_DRAWN, territoryGaz, territoryGroupEvidence } from '../core/territories.ts'
import { SOURCES } from '../core/sources.ts'
import { REGIONS, regionOf } from '../pipelines/regions.ts'
import { FULL, LAT0, LAT1, LON0, LON1, MAX_ZOOM, VIEW, clampView, panBy, zoomAt, zoomOf } from '../src/lib/geo.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const hist = JSON.parse(rd('public/geo/historical.json')) as { licence: string; attribution: string; features: { properties: { code: string; name: string }; geometry: { coordinates: number[][][][] } }[] }

describe('MP-1 historical territories with cited extents', () => {
  it('MP-1 every territory named in the spec is present with ≥ 1 verbatim IEU quote and a locator; unseen ones are reported, not guessed', () => {
    const names = TERRITORIES.map(t => t.name)
    for (const n of ['Кубань', 'Берестейщина', 'Підляшшя', 'Холмщина', 'Надсяння', 'Лемківщина', 'Пряшівщина', 'Мармарощина', 'Південна Буковина', 'Стародубщина', 'Білгородщина', 'Воронежчина', 'Курщина']) expect(names, n).toContain(n)
    for (const t of TERRITORIES) {
      expect(t.src.length, t.name).toBeGreaterThanOrEqual(1)
      for (const e of t.src) { expect(e.kind).toBe('Q'); expect(e.source).toBe('IEU'); expect(e.quote.length).toBeGreaterThan(30); expect(e.quote.length).toBeLessThanOrEqual(300); expect(e.locator).toMatch(/^https:\/\/www\.encyclopediaofukraine\.com\/display\.asp\?linkpath=pages%5C.+\.htm, \S/) }
      expect(t.unit, t.name).toMatch(/\[P\]/)   // the drawn unit is a project choice and says so
    }
    expect(SOURCES['IEU']).toBeTruthy(); expect(SOURCES['NATEARTH']!.license).toBe('public domain')
    expect(TERRITORIES_NOT_DRAWN.map(n => n.name)).toEqual(expect.arrayContaining(['Придністров’я', 'Крим', 'Зелений Клин']))
    for (const n of TERRITORIES_NOT_DRAWN) expect(n.why.length).toBeGreaterThan(20)
  })
  it('MP-1 historical.json: every territory has an outline inside the map frame, the Natural Earth licence is noted, the file is small', () => {
    expect(hist.licence).toMatch(/public domain/); expect(hist.attribution).toContain('Natural Earth')
    expect(hist.features.map(f => f.properties.code).sort()).toEqual(TERRITORIES.map(t => t.code).sort())
    for (const f of hist.features) {
      expect(f.geometry.coordinates.length, f.properties.name).toBeGreaterThan(0)
      for (const poly of f.geometry.coordinates) for (const ring of poly) for (const [x, y] of ring) { expect(x).toBeGreaterThanOrEqual(LON0); expect(x).toBeLessThanOrEqual(LON1); expect(y).toBeGreaterThanOrEqual(LAT0); expect(y).toBeLessThanOrEqual(LAT1) }
    }
    expect(statSync('public/geo/historical.json').size).toBeLessThan(64 * 1024)
  })
  it('MP-1 Кубань lies east of the Azov Sea and Берестейщина west of 28°E; Кубань reaches the frame the ukr-oblasts layer does not', () => {
    const box = (code: string) => { const xs: number[] = [], ys: number[] = []; for (const p of hist.features.find(f => f.properties.code === code)!.geometry.coordinates) for (const r of p) for (const [x, y] of r) { xs.push(x!); ys.push(y!) }; return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const }
    const k = box('HT-kuban'), b = box('HT-berestia')
    expect(k[0]).toBeGreaterThan(36); expect(k[2]).toBeGreaterThan(40); expect(k[1]).toBeLessThan(44)   // Taman … Caucasus foothills
    expect(b[2]).toBeLessThan(28)
  })
})

describe('MP-2 historical territories as witness regions with dashed drawing', () => {
  it('MP-2 each territory is a REGIONS row (polygon code in oblasts) and a witness region string matches it', () => {
    for (const t of TERRITORIES) { const r = REGIONS.find(x => x.code === t.id); expect(r, t.name).toBeTruthy(); expect(r!.oblasts).toEqual([t.code]); expect(regionOf(t.name)).toBe(t.id) }
    expect(regionOf('Слобожанщина')).toBe('slobozhanshchyna')   // the existing region is untouched
    expect(new Set(REGIONS.map(r => r.code)).size).toBe(REGIONS.length)
  })
  it('MP-2 dialect group only through the AC gazetteer and only where a source states the area: Берестейщина → WPL, Лемківщина → LEM, Білгородщина/Воронежчина → SLB; Кубань, Курщина unknown', () => {
    const g = (id: string) => territoryGaz(TERRITORIES.find(t => t.id === id)!).map(r => r.group)
    expect(g('berestia')).toEqual(['WPL']); expect(g('lemkivshchyna')).toEqual(['LEM'])
    expect(g('bilhorodshchyna')).toEqual(['SLB']); expect(g('voronizhchyna')).toEqual(['SLB'])
    for (const id of ['kuban', 'kurshchyna', 'kholm', 'pidliashshia', 'pryashivshchyna', 'marmarosh', 'starodubshchyna']) expect(g(id), id).toEqual([])
    const bel = TERRITORIES.find(t => t.id === 'bilhorodshchyna')!, ev = territoryGroupEvidence(bel, territoryGaz(bel)[0]!)
    expect(ev.map(e => e.source)).toEqual(['IEU', 'WUK']); expect(ev[0]!.quote).toContain('Slobidska Ukraine')   // the source's own statement + the gazetteer quote
    expect(bel.src.some(e => /Slobidska Ukraine/.test(e.quote))).toBe(true)
    expect(TERRITORIES.find(t => t.id === 'kurshchyna')!.gazName).toBeUndefined()   // «northeast of Slobidska Ukraine» is NOT «part of»
  })
  it('MP-2 drawn dashed with the label «історична українська територія», source on tap; legend explains modern vs historical borders', () => {
    const v = rd('src/components/RegionMap.vue'), css = rd('src/style.css'), m = rd('src/views/MapView.vue')
    expect(v).toContain('історична українська територія'); expect(v).toContain("'rm-h'"); expect(v).toContain('rm-q'); expect(v).toContain('суцільна межа'); expect(v).toContain('пунктирна межа')
    expect(css).toMatch(/\.rm-h \{[^}]*stroke-dasharray: 5 3/)
    expect(m).toContain('dashArray'); expect(m).toContain('territoryPopup'); expect(m).toContain('історична українська територія'); expect(m).toContain('пунктир')
  })
})

describe('MP-3 tokens, legend and 360 px pan/zoom', () => {
  it('MP-3 no hard-coded colours in MapView / RegionMap; map tokens exist for light and dark', () => {
    for (const f of ['src/views/MapView.vue', 'src/components/RegionMap.vue']) expect(rd(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/)
    expect(rd('src/views/MapView.vue')).toMatch(/--map-dot[\s\S]*--map-line|--map-line[\s\S]*--map-dot/)
    const css = rd('src/style.css'); expect((css.match(/--map-hist:/g) ?? []).length).toBe(3)   // :root, dark media query, [data-theme=dark]
    expect((css.match(/--map-hist-fill:/g) ?? []).length).toBe(3)
  })
  it('MP-3 zoom keeps the pointed place fixed, clamps to the frame, pans and resets', () => {
    expect(zoomOf(FULL)).toBe(1)
    const px = VIEW.w * 0.7, py = VIEW.h * 0.4, v = zoomAt(FULL, 2, px, py)
    expect(zoomOf(v)).toBeCloseTo(2, 5)
    expect((px - v.x) / v.w).toBeCloseTo((px - FULL.x) / FULL.w, 5)   // the same fraction of the window: the point did not move on screen
    expect(zoomOf(zoomAt(FULL, 100, px, py))).toBeCloseTo(MAX_ZOOM, 5)
    expect(zoomAt(FULL, 0.1, px, py)).toEqual(FULL)                    // cannot zoom out past the frame
    const p = panBy(v, -1e6, 1e6); expect(p.x).toBe(0); expect(p.y).toBeCloseTo(VIEW.h - v.h, 5)
    expect(clampView({ x: 5, y: 5, w: VIEW.w, h: VIEW.h })).toEqual(FULL)
  })
  it('MP-3 360 px: touch targets ≥ 44 px, page scrolls at zoom 1 (touch-action: pan-y) and the map takes the gesture once zoomed; pinch, drag, wheel and keys are wired', () => {
    const css = rd('src/style.css'), v = rd('src/components/RegionMap.vue'), m = rd('src/views/MapView.vue')
    expect(css).toMatch(/\.rm-btn \{[^}]*min-width: 2\.75rem; min-height: 2\.75rem/); expect(css).toMatch(/\.rm-svg \{[^}]*touch-action: pan-y/); expect(css).toMatch(/\.rm-svg\.rm-zoomed \{[^}]*touch-action: none/)
    for (const h of ['@pointerdown', '@pointermove', '@wheel', '@keydown', 'pinch', 'aria-label="Збільшити"', 'aria-label="Зменшити"', 'aria-label="Скинути масштаб"']) expect(v, h).toContain(h)
    expect(m).toMatch(/@media \(max-width: 480px\)/); expect(m).toContain("scrollWheelZoom: false")   // Leaflet keeps its own touch pan / pinch
  })
})
