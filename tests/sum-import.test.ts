/** SPEC 63 GG-7 — import of a licensed СУМ-11 / СУМ-20 dump: the copyright policy, the flags, the integration with the GG headwords and the SE block. Fixture-level, offline. */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clip, fullSensesFlag, fullSensesOn, importSum, officialUrl } from '../core/sum-import.ts'
import { HIST_BY_ID } from '../core/dx-src.ts'
import { groupHist, selectHist } from '../core/dx-hist.ts'
import { dictById } from '../core/se.ts'
import { dictSources } from '../core/cv.ts'
import { runSumImport } from '../pipelines/sum-import.ts'
import { seHeads } from '../pipelines/dx-hist-load.ts'

const LONG = 'дуже довге визначення '.repeat(20).trim()
const dump = [
  JSON.stringify({ head: 'Хата', stress: 'ха́та', pos: 'ім. жін.', vol: 11, page: 52, url: 'https://sum.in.ua/s/khata', senses: [
    { n: 1, labels: ['розм.'], gloss: 'сільський житловий будинок', full: LONG, quote: 'Моя хата скраю.' }, { n: 2, labels: ['перен.'], gloss: LONG }] }),
  'not json',
  JSON.stringify({ head: '', senses: [] }),
].join('\n')

describe('GG-7 licensed СУМ dump: only the policy fields without permission', () => {
  it('GG-7 default: gloss ≤ 200, full definition and quotation dropped, labels/POS/stress/volume-page/link kept, bad lines counted', () => {
    const { rows, stats } = importSum('sum11', dump)
    expect(rows.map(r => r[0])).toEqual(['хата', 'хата'])
    const [, a] = rows[0]!, [, b] = rows[1]!
    expect(a).toMatchObject({ d: 'sum11', g: 'сільський житловий будинок', p: 'ім. жін.', n: 1, l: 'т.11 с.52', u: 'https://sum.in.ua/s/khata', a: 'ха́та', lb: ['розм.'] })
    expect(a.q).toBeUndefined(); expect(JSON.stringify(rows)).not.toContain('Моя хата')
    expect(b.g.length).toBeLessThanOrEqual(200); expect(b.g.endsWith('…')).toBe(true); expect(b.t?.[0]?.[0]).toBe('figurative')
    expect(stats).toMatchObject({ articles: 1, senses: 2, clipped: 1, droppedFull: 1, bad: 2 })
  })
  it('GG-7 FULL_SENSES_<dict> defaults to false, reads 1/true, and only then the full definition and quote are kept', () => {
    expect(fullSensesFlag('sum20')).toBe('FULL_SENSES_SUM20')
    expect(fullSensesOn('sum11', {})).toBe(false); expect(fullSensesOn('sum11', { FULL_SENSES_SUM11: '0' })).toBe(false); expect(fullSensesOn('sum11', { FULL_SENSES_SUM11: '1' })).toBe(true)
    expect(fullSensesOn('sum20', { FULL_SENSES_SUM11: '1' })).toBe(false)
    const r = importSum('sum11', dump, true).rows[0]![1]; expect(r.g).toBe(LONG); expect(r.q).toBe('Моя хата скраю.')
    const env = readFileSync('ops/worker/env.sh', 'utf8'); expect(env).toContain('FULL_SENSES_SUM11="${FULL_SENSES_SUM11:-0}"'); expect(env).toContain('FULL_SENSES_SUM20="${FULL_SENSES_SUM20:-0}"')
  })
  it('GG-7 clip cuts at a word boundary; the link must point to the official site of the dictionary', () => {
    expect(clip('слово '.repeat(60)).length).toBeLessThanOrEqual(200)
    expect(officialUrl('sum11', 'https://sum.in.ua/s/x')).toBeDefined(); expect(officialUrl('sum11', 'https://evil.example/s/x')).toBeUndefined()
    expect(officialUrl('sum20', 'https://sum20ua.com/x')).toBeDefined(); expect(officialUrl('sum20', 'https://sum.in.ua/x')).toBeUndefined()
  })
})

describe('GG-7 integration: a SUM headword is a strong source, the SE block knows the period', () => {
  it('GG-7 one СУМ dictionary alone makes a card (typeset, no corroboration), merges into a dictionary-only card, names the dictionary', () => {
    expect(HIST_BY_ID['sum11']!.ocr).toBe(false); expect(HIST_BY_ID['sum20']!.ocr).toBe(false)
    const g = groupHist([{ word: 'Хата', src: 'sum11' }, { word: 'смартфон', src: 'sum20' }])
    const r = selectHist(g, c => (c.includes('хата') ? ['хата', 'do'] : undefined), () => 0)
    expect(r.news.map(n => n.word)).toEqual(['смартфон']); expect(r.merges).toEqual([['хата', HIST_BY_ID['sum11']!.bit]])
    expect(dictSources(HIST_BY_ID['sum11']!.bit)[0]).toContain('СУМ-11')
  })
  it('GG-7 SE periods: СУМ-11 = 1970–80, СУМ-20 = contemporary, both own-time; rows written by the pipeline are read back by the GG loader', () => {
    expect(dictById('sum11')).toMatchObject({ cover: [1970, 1980], basis: 'own-time' }); expect(dictById('sum20')!.cover![0]).toBe(2010)
    const dir = mkdtempSync(join(tmpdir(), 'sum-')), f = join(dir, 'd.jsonl'); writeFileSync(f, dump)
    const out = runSumImport('sum11', f, join(dir, 'se-parsed'), {}); const before = readFileSync(out, 'utf8')
    runSumImport('sum11', f, join(dir, 'se-parsed'), {}); expect(readFileSync(out, 'utf8')).toBe(before)   // idempotent
    expect(seHeads('', join(dir, 'se-parsed'))).toEqual([{ word: 'хата', src: 'sum11' }])
  })
})

import { parseSum11, senseOf11 } from '../core/sum11-parse.ts'
describe('GG-7 СУМ-11 scan parser stub: policy fields only', () => {
  const page = [
    'ХА́ТА, и, ж. 1. розм. Сільський житловий будинок з господарськими прибудовами. // Приміщення для житла. 2. перен. заст. Родина, що живе в цьому будинку.',
    'ХАТИНА, и, ж. Див. хата.',
    'ХЛІБ, а, ч. 1. Основний харчовий продукт, який випікають з борошна. 2. діал. Збіжжя на пні.',
  ].join('\n')
  it('GG-7 article → headword, stress, POS, vol/page, sense numbers, labels, gloss; the cross-reference and garbage are skipped', () => {
    const { articles, stats } = parseSum11(page, 11, 52)
    const a = articles.find(x => x.head === 'хата')!
    expect(a).toMatchObject({ vol: 11, page: 52, pos: 'и, ж.' })
    expect(a.stress).toBe('ха́та'.normalize('NFC'))
    expect(a.senses!.map(s => s.n)).toEqual([1, 2])
    expect(a.senses![0]).toMatchObject({ labels: ['розм.'], gloss: 'Сільський житловий будинок з господарськими прибудовами' })
    expect(a.senses![1]!.labels).toEqual(['перен.', 'заст.'])
    expect(articles.find(x => x.head === 'хліб')!.senses![1]!.labels).toEqual(['діал.'])
    expect(articles.some(x => x.head === 'хатина')).toBe(false); expect(stats.crossRefs).toBe(1)
  })
  it('GG-7 the parser output goes through importSum: full text dropped by default, gloss ≤ 200, volume and page in the locator', () => {
    const long = 'ГОРА, и, ж. 1. ' + 'дуже велике підвищення рельєфу над рівниною '.repeat(9) + 'на місцевості. 2. Купа.'
    const { articles } = parseSum11(long, 11, 7)
    const rows = importSum('sum11', articles.map(x => JSON.stringify(x)).join('\n')).rows
    expect(rows.length).toBeGreaterThanOrEqual(1); expect(rows[0]![1].g.length).toBeLessThanOrEqual(200); expect(rows[0]![1].l).toBe('т.11 с.7')
    expect(JSON.stringify(rows)).not.toContain('на місцевості')
    expect(senseOf11('перен. розм. Щось: приклад.').labels).toEqual(['перен.', 'розм.'])
  })
})
