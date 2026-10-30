/** SPEC 63 LB-18: counties and governorates that Грінченко's articles print and his list lacks, each with the quote of the Wikipedia article it comes from. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { HRINCH_LABELS, countyByStem, countyOf, scanArticle } from '../core/dict-labels.ts'
import { COUNTIES, COUNTY_RU, GOV_RU } from '../core/dict-counties.ts'

const one = (t: string) => scanArticle(HRINCH_LABELS, 'Слово. ' + t + ' Далі.')[0]

describe('LB-18 missing counties', () => {
  it('LB-18 every county has a non-empty quote that names its governorate (Ukrainian or Russian form)', () => {
    for (const [adj, gov, title, quote] of COUNTIES) {
      expect(adj && gov && title && quote, adj).toBeTruthy()
      const g = gov.replace(/а$/, '').replace(/ька$/, 'ьк')   // Полтавська → Полтавськ
      expect(new RegExp(g.slice(0, 5) + '|' + gov.slice(0, 5), 'i').test(quote) || /губерн|губерні|намісництв/.test(quote), adj).toBe(true)
    }
    for (const a of ['Полтавський', 'Стародубський', 'Вінницький', 'Ковельський', 'Острозький']) expect(countyOf(a), a).toBeDefined()
    expect(countyOf('Ковельський')![2]).toMatch(/^ru:/); expect(countyOf('Ковельський')![3]).toContain('Волынской губернии')
    for (const r of [...COUNTY_RU, ...GOV_RU]) { expect(r[2]).toMatch(/^https:\/\/ru\.wikipedia\.org\/wiki\//); expect(r[3].length).toBeGreaterThan(20) }
    for (const r of COUNTY_RU) expect(countyOf(r[1]), r[1]).toBeDefined()
  })
  it('LB-18 «Полт. у.», «Ковел. у.», «Острожск. у.», «Винниц. у.», «Старод. у.» resolve to a county and its governorate', () => {
    expect(one('Полт. у.')!.resolved).toMatchObject({ places: ['Полтавський повіт'], area: 'poltavshchyna' })
    expect(one('Ковел. у.')!.resolved.gov?.name).toBe('Волинська губернія')
    expect(one('Острожск. у.')!.resolved.places).toEqual(['Острозький повіт'])
    expect(one('Винниц. у.')!.resolved.area).toBe('podillia'); expect(one('Старод. у.')!.resolved.area).toBe('chernihivshchyna')
  })
  it('LB-18 the Russian spelling of the county name maps through COUNTY_RU: Волч., Верхнеднѣпр., Александров.', () => {
    expect(one('Волч. у.')!.resolved).toMatchObject({ places: ['Вовчанський повіт'], area: 'slobozhanshchyna' })
    expect(one('Верхнеднѣпр. у.')!.resolved.places).toEqual(['Верхньодніпровський повіт'])
    expect(one('Александров. у.')!.resolved.area).toBe('katerynoslavshchyna')
    expect(countyByStem('Уманск')?.[0]).toBe('Уманський'); expect(countyByStem('Радомысл')?.[0]).toBe('Радомисльський')
  })
  it('LB-18 «Волын. г.» is the governorate Волинь with the ru.wikipedia sentence; «губ.» reads as «г.»', () => {
    const v = one('Волын. г.')!; expect(v.resolved.area).toBe('volyn'); expect(v.row.scope).toBe('place'); expect(v.row.meaning).toContain('Волынская губерния')
    expect(one('Подольск. губ.')!.resolved.area).toBe('podillia'); expect(one('Полт. губ.')!.resolved.area).toBe('poltavshchyna')
  })
  it('LB-18 nothing is read from an author siglum, a short stem or a place outside the Ukrainian governorates', () => {
    expect(scanArticle(HRINCH_LABELS, 'Чуб. у. 270. Ворон. г. Грин. губ.')).toEqual([])
  })
  it('LB-18 ledger and analysis are in place', () => {
    expect(readFileSync('specs/63-corpus-dialects.md', 'utf8')).toContain('**LB-18**')
    expect(readFileSync('analysis/labels-coverage.md', 'utf8')).toContain('LB-18')
  })
})
