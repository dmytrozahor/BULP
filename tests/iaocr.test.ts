import { describe, it, expect } from 'vitest'
import { parseOcr } from '../pipelines/ingest-iaocr.ts'

const page = (lines: string[]) => `<OBJECT>${lines.map(l => `<LINE>${l.split(' ').map(w => `<WORD>${w}</WORD>`).join('')}</LINE>`).join('')}</OBJECT>`
describe('CX-8 archive.org OCR ingester (witnessType ocr)', () => {
  it('keeps Cyrillic words with a printed-page locator; Latin/digit/mixed OCR garbage is counted, never a token', () => {
    const r = parseOcr(`<DJVU>${page(['Слобожанщина — край', 'abc 12 sлово слово'])}</DJVU>`, { pages: [{ leafNum: 0, pageNumber: '7' }] }, 'Книга')
    expect(r.tokens.map(t => t.raw)).toEqual(['Слобожанщина', 'край', 'слово'])
    expect(r.unmapped).toBe(3)
    expect(r.tokens[0]!.loc).toBe('Книга, с. 7 (OCR)')
  })
  it('joins a word hyphenated at the end of a line; Russian-letter lines are apparatus (language gate)', () => {
    const r = parseOcr(`<DJVU>${page(['етно-', 'графія', 'что это такое', 'народня пісня'])}</DJVU>`, {}, 'К')
    expect(r.tokens.map(t => t.raw)).toEqual(['етнографія', 'народня', 'пісня'])
    expect(r.apparatus).toBe(3)
    expect(r.tokens[0]!.loc).toBe('К, арк. 0 (OCR)')
  })
})
