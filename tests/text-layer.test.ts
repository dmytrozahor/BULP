/** SPEC 63 GG-7/OQ: the text-layer gloss check of СУМ-11/20 volumes (core/text-layer.ts) in place of the OCR score; OCR volumes and real OCR dictionaries stay gated. */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { cleanGloss, textLayerGlossOk, tokensOf, unknownShare, volSource } from '../core/text-layer.ts'
import { clip } from '../core/sum-import.ts'
import { parsedRows } from '../pipelines/build-se.ts'

const KNOWN = new Set('форма керування державою при якій верховна влада повністю належить одній особі монархові самодержавство трудящих дія знач слектроніки привели зниження питомої вартості операцій шинних електроніки'.split(' ').concat('слово слова поперше'.split(' ')))
const known = (w: string) => KNOWN.has(w)
describe('text-layer volumes', () => {
  it('volSource: СУМ-11 all volumes but the worker-OCR t09, СУМ-20 all but t12/t13; other dictionaries never exempt', () => {
    expect(volSource('sum11', 'т.1 с.7')).toBe('text'); expect(volSource('sum11', 'т.9 с.301')).toBe('ocr'); expect(volSource('sum20', 'т.11 с.5')).toBe('text')
    expect(volSource('sum20', 'т.12 с.5')).toBe('ocr'); expect(volSource('sum20', 'т.13')).toBe('ocr'); expect(volSource('sum20', undefined)).toBe('ocr'); expect(volSource('timchenko', 'т.1')).toBe('ocr')
  })
  it('hyphenation is rejoined; abbreviations, labels and the headword are not unknown words', () => {
    expect(tokensOf('Форма керування державою — монар¬ хові; трудя¬ щих').map(t => t.w)).toEqual(['форма', 'керування', 'державою', 'монархові', 'трудящих'])
    expect(cleanGloss('влада повністю належить монар¬ хові; слов- а')).toBe('влада повністю належить монархові; слова')
    expect(unknownShare('Дієпр. акт. розм, перен до слова', known)).toEqual({ n: 1, unknown: 0 })   // «розм», «перен» are labels, «до» too short
    expect(unknownShare('Дія за знач. опилити і опилитися', known, 'опилити')).toEqual({ n: 3, unknown: 0 })   // headword and headword+ся are known by definition; without it 2 are unknown
    expect(unknownShare('Дія за знач. опилити і опилитися', known).unknown).toBe(2)
  })
  it('the live broken gloss is blanked, ordinary ones kept; one unknown word does not blank', () => {
    expect(textLayerGlossOk('Форма керування державою, при якій верховна влада повністю належить одній особі — монар¬ хові; самодержавство', known)).toBe(true)
    expect(textLayerGlossOk('привели до зниження питомої вартості маоп- Шинних операцій', known)).toBe(true)   // one unknown (маоп-Шинних): 1/7 is kept …
    expect(textLayerGlossOk('слектроніки привели до зниження питомої вартості маоп- Шинних операц1й', known)).toBe(false)   // … two broken words are blanked
    expect(textLayerGlossOk('Форма керувпня державпю', known)).toBe(false)
  })
  it('parsedRows: text-layer rows use the light check (and are cleaned), worker-OCR volumes and OCR dictionaries keep the OCR gate, typed stay exempt; GG-7 clip untouched', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'tl-')); mkdirSync(resolve(root, 'data/work/se-parsed'), { recursive: true })
    const rows = [['слово', { d: 'sum20', g: 'Форма керування державою, ДДялг 12 монар¬ хові', l: 'т.1 с.7' }], ['слово', { d: 'sum20', g: 'Форма керування державою, ДДялг 12 монар¬ хові', l: 'т.12 с.7' }],
      ['слово', { d: 'timchenko', g: 'Форма керування державою, ДДялг 12 монархові', l: 'т.1' }], ['слово', { d: 'sum11', g: 'аб вг дє жз ийк лмн', l: 'т.2 с.1' }]]
    writeFileSync(resolve(root, 'data/work/se-parsed/t.json'), JSON.stringify({ rows }))
    const into = new Map(), r = parsedRows(root, k => k === 'слово', () => [], into, known)
    expect(r.blanked).toEqual({ timchenko: 1, sum20: 1, sum11: 1 })   // t.1 text kept, t.12 (OCR volume) and timchenko gated, nonsense sum11 text blanked
    const l = into.get('слово')!
    expect(l[0]).toMatchObject({ d: 'sum20', g: 'Форма керування державою, ДДялг 12 монархові' })   // kept and rejoined
    expect(clip('слово '.repeat(60)).length).toBeLessThanOrEqual(200)
  })
})
