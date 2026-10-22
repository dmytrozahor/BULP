import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { splitCommentary, parseVariants, expandPoints, capQuote, type AtlasMap } from '../core/atlas.ts'

const J = JSON.parse(readFileSync('data/atlas/aum2-maps.json', 'utf8')) as { volume: number; maps: AtlasMap[]; missingPages: number[] }

describe('AT-1 АУМ т. 2 maps from the OCR', () => {
  it('headers survive OCR noise: digit confusions fall back to the sequence', () => {
    const t = 'КОМЕНТАР Ль 6\n\n1. a\n\nКОМЕНТАР 5 7\n\n1. b\n\nКОМЕНТАР М З\n\n1. c\n\n1. КОМЕНТАРІ\n'
    expect(splitCommentary(t).map(c => c.n)).toEqual(['1', '2', '3'])
  })
  it('range expansion drops numbers outside the 687-point net', () => {
    expect(expandPoints('110--113, 230, 999, 5')).toEqual([5, 110, 111, 112, 113, 230])
  })
  it('quotes are capped (atlas ©: ≤ 2 lines)', () => { expect(capQuote('слово '.repeat(200)).length).toBeLessThan(230) })
  it('parseVariants reads «форма -- пункти» with the symbol phrase', () => {
    const v = parseVariants('1. q\n\n2. Червоним колом картографується також: вуїко -- 110--112, 230;\n')
    expect(v[0]).toMatchObject({ form: 'вуїко', points: [110, 111, 112, 230] })
    expect(v[0]!.symbol).toMatch(/червон/)
  })
  it('the committed extract covers all 387 maps plus 55-а, every one with a locator and a short quote', () => {
    expect(J.volume).toBe(2); expect(J.maps.length).toBe(388)
    expect(J.maps.map(m => m.n).slice(52, 58)).toEqual(['53', '54', '55', '55-а', '56', '57'])
    expect(J.maps.at(-1)!.n).toBe('387')
    for (const m of J.maps) { expect(m.page).toBeGreaterThanOrEqual(9); expect(m.page).toBeLessThanOrEqual(103); expect(m.quote.length).toBeLessThan(260) }
    expect(J.maps.filter(m => m.nFromSequence).map(m => m.n)).toEqual(['3', '384'])
    expect(J.missingPages).toEqual([])
  })
  it('map 368 (дядько) lists вуйко and стрийко variants with point numbers', () => {
    const m = J.maps.find(x => x.n === '368')!
    expect(m.programQuestion).toBe('87')
    expect(m.variants.some(v => /^вуїко/.test(v.form) && v.points.includes(114))).toBe(true)
  })
})

import { arealOf, MAP_READING_LABEL } from '../core/atlas.ts'
const AR = JSON.parse(readFileSync('data/atlas/aum2-areal.json', 'utf8')) as { maps: ReturnType<typeof arealOf>[] }

describe('AT-2 areal extent per variant', () => {
  it('every map has an areal record; variants carry point counts and the net share, never a guessed dialect group', () => {
    expect(AR.maps.length).toBe(J.maps.length)
    for (const a of AR.maps) { expect(a.groups, a.n).toBeNull(); expect(a.source).toBe('commentary'); for (const v of a.variants) { expect(v.nPoints).toBeGreaterThan(0); expect(v.share).toBeLessThanOrEqual(1.2) } }
  })
  it('named regions are only those the commentary text names (map 7 says Закарпатті)', () => {
    const t = arealOf({ ...J.maps[0]!, variants: [] }, 'На Закарпатті і на Волині')
    expect(t.namedRegions).toEqual(['Закарпаття', 'Волинь'])
    expect(AR.maps.filter(a => a.namedRegions.length).length).toBeGreaterThan(5)
  })
  it('map-image readings carry the label «прочитано з карти, не вичитано» and are empty until a reading is made', () => {
    expect(MAP_READING_LABEL).toBe('прочитано з карти, не вичитано')
    expect(AR.maps.every(a => a.mapReadings.every(r => r.label === MAP_READING_LABEL))).toBe(true)
  })
})

import { AUM_ROWS } from '../core/atlas-rules.ts'
import { DIALECT_BOOK_RULES, DIALECT_RULES } from '../core/rules.ts'
import { detect, type Ctx } from '../core/detect.ts'
import { SOURCES } from '../core/sources.ts'

const cx = (form: string, o: Partial<Ctx> = {}): Ctx => ({ form, vesum: [], inLexicon: () => [], year: 1900, ...o })

describe('AT-3 АУМ rows in DIALECT_BOOK_RULES', () => {
  it('every row cites a map, a questionnaire quote and printed variants that the AT-1 extract really holds', () => {
    expect(AUM_ROWS.length).toBeGreaterThanOrEqual(7)
    for (const r of AUM_ROWS) {
      const m = J.maps.find(x => x.n === r.map); expect(m, r.id).toBeTruthy()
      expect(m!.quote.replace(/\s+/g, ' '), r.id).toContain(r.q)
      for (const [f, p] of r.attested) expect(m!.variants.some(v => v.form === f && v.points.includes(p)), `${r.id} ${f} ${p}`).toBe(true)
    }
  })
  it('each row becomes a rule with source AUM, the map in the locator, a quote ≤ 2 lines, and a registered source', () => {
    expect(SOURCES.AUM).toBeTruthy()
    for (const r of AUM_ROWS) {
      const rule = DIALECT_BOOK_RULES.find(x => x.id === `${r.id}:SW`)!; expect(rule, r.id).toBeTruthy()
      expect(rule.cite.source).toBe('AUM'); expect(rule.cite.locator).toContain(`карта ${r.map}`); expect(rule.cite.quote.length).toBeLessThan(260)
    }
  })
  it('a rule fires on its example in a non-normative form, stays silent on the standard word and is vetoed by a VESUM hit', () => {
    for (const r of AUM_ROWS) {
      expect(Object.keys(detect(DIALECT_RULES, cx(r.example)).claims), r.id).toContain('SW')
      expect(detect(DIALECT_RULES, cx(r.standard)).claims.SW?.method ?? '', r.id).not.toContain(r.id)
      expect(detect(DIALECT_RULES, cx(r.example, { vesum: [{ lemma: 'x', tags: 'noun:inanim:m:v_naz' }] })).claims.SW?.method ?? '', r.id).not.toContain(r.id)
    }
  })
})

describe('AT-3 /atlas page and site file', () => {
  it('the site file lists every map, 6 widest variants at most, and the rule ids of AUM_ROWS', () => {
    const S = JSON.parse(readFileSync('public/atlas/aum2.json', 'utf8')) as { maps: { n: string; variants: unknown[]; rules: string[] }[] }
    expect(S.maps.length).toBe(J.maps.length)
    expect(S.maps.every(m => m.variants.length <= 6)).toBe(true)
    expect(S.maps.flatMap(m => m.rules).sort()).toEqual(AUM_ROWS.map(r => `${r.id}:SW`).sort())
    expect(readFileSync('public/atlas/aum2.json').length).toBeLessThan(300_000)
  })
  it('the route /atlas, the nav link and the view (rules link to /forms/<rule>) exist', () => {
    expect(readFileSync('src/router.ts', 'utf8')).toContain("path: '/atlas'")
    expect(readFileSync('src/lib/navMenu.ts', 'utf8')).toContain("to: '/atlas'")
    expect(readFileSync('src/views/AtlasView.vue', 'utf8')).toContain('/forms/')
  })
})
