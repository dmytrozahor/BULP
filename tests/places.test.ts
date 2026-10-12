/** SPEC 60 NP-1…NP-3 (research/15): proper-name claim, gazetteer, spelling clusters, lazy /map. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { isKnown } from '../core/evidence.ts'
import { PLACES, PlaceScan, nameKindOf, placeClaim, placeOf, properClaim } from '../core/places.ts'

const rd = (p: string) => readFileSync(p, 'utf8')

describe('NP-1 proper-name claim', () => {
  it('NP-1 VESUM prop/geo/fname/lname/patr give a D-evidence claim; Stanza alone is a flagged model claim', () => {
    expect(nameKindOf('noun:inanim:m:v_naz:prop:geo')).toBe('geo')
    expect(nameKindOf('noun:anim:m:v_naz:prop:lname')).toBe('lname')
    expect(nameKindOf('noun:inanim:m:v_naz')).toBeUndefined()
    const c = properClaim('Київ', { vesum: 'noun:inanim:m:v_naz:prop:geo' }, 'dict v6')!
    expect(c.value).toBe('geo'); expect(c.evidence[0]!.source).toBe('VESUM'); expect(c.evidence[0]!.kind).toBe('D')
    const m = properClaim('Игорь', { stanza: { w: 'spi', loc: '1', raw: 'Игоря', n: 9, of: 10 } }, 'x')!
    expect(m.value).toBe('name'); expect(m.method).toContain('model'); expect(m.evidence[0]!.note).toContain('P-1.7')
    expect(properClaim('x', { stanza: { w: 'a', loc: '1', raw: 'x', n: 1, of: 10 } }, 'x')).toBeUndefined()   // 1 token / 10 %: no claim
    const t = properClaim('Игорь', { torot: { w: 'spi', loc: '1', raw: 'Игоря', morph: 'Ne -s---mg--i', n: 4, of: 5 } }, 'x')!
    expect(t.method).toBe('proiel-Ne')
  })
})

describe('NP-2 gazetteer', () => {
  it('NP-2 ≥ 30 toponyms, every one with a Wikidata QID and a P625 point inside the world', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(30)
    for (const p of PLACES) { expect(p.qid, p.name).toMatch(/^Q\d+$/); expect(Math.abs(p.pt[0])).toBeLessThanOrEqual(90); expect(Math.abs(p.pt[1])).toBeLessThanOrEqual(180) }
    expect(PLACES.find(p => p.name === 'Київ')).toMatchObject({ qid: 'Q1899', pt: [50.45, 30.523611] })   // research/15 §6 [Q]
  })
  it('NP-2 Киевъ / Киевѣ / Кыевъ / Київ / Киӕне fall into one cluster; common words do not', () => {
    for (const r of ['Киевъ', 'Киевѣ', 'Кыевъ', 'Київ', 'Киӕне', 'Къıевоу', 'Киевоу']) expect(placeOf(r)?.name, r).toBe('Київ')
    expect(placeOf('киевъ')).toBeUndefined()                         // capital letter required (research/15 §1 method)
    expect(placeOf('Мов')).toBeUndefined()
    expect(placeOf('Переӕславлю')?.name).toBe('Переяслав')
  })
  it('NP-2 PlaceScan clusters spellings with earliest witness, adds reconstructions, and the claim has two evidences', () => {
    const s = new PlaceScan()
    s.add({ id: 'late', date: [1672, 1702] }, { raw: 'Київ', loc: 'a' })
    s.add({ id: 'kievchr', date: [1117, 1200] }, { raw: 'Киевъ', loc: 'стб. 1' })
    s.add({ id: 'kievchr', date: [1117, 1200] }, { raw: 'Киевъ', loc: 'стб. 2' })
    s.add({ id: 'kievchr', date: [1117, 1200] }, { raw: 'Кыѥвъ', loc: 'стб. 3' })
    const [k] = s.result()
    expect(k!.name).toBe('Київ'); expect(k!.n).toBe(4); expect(k!.nW).toBe(2)
    expect(k!.variants[0]).toMatchObject({ raw: 'Киевъ', f: 2 })
    expect(k!.earliest!.w).toBe('kievchr')
    expect(k!.recon.some(r => r.form === 'кыѥвъ' && r.confirmed)).toBe(true)   // derive backwards, confirmed by an attested spelling
    const c = placeClaim(k!)
    expect(isKnown(c)).toBe(true); expect(c.evidence.length).toBe(2); expect(c.evidence[0]!.source).toBe('WIKIDATA')
  })
})

describe('NP-3 /map', () => {
  it('NP-3 route and nav exist; Leaflet is imported dynamically (lazy chunk) with OSM attribution; word card has «на мапі»', () => {
    expect(rd('src/main.ts')).toMatch(/path: '\/map', component: \(\) => import\('\.\/views\/MapView\.vue'\)/)
    const v = rd('src/views/MapView.vue')
    expect(v).toContain("await import('leaflet')"); expect(v).not.toMatch(/^import .* from 'leaflet'/m)
    expect(v).toContain('OpenStreetMap'); expect(v).toContain('tile.openstreetmap.org')
    expect(rd('src/views/WordView.vue')).toContain('<PlaceBlock')
    expect(rd('src/components/PlaceBlock.vue')).toContain('на мапі')
  })
})
