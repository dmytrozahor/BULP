import { describe, it, expect } from 'vitest'
import { numeralValue, findNumerals } from '../core/numerals.ts'

describe('BL-4 Cyrillic numerals (N11)', () => {
  it('҂ѕ҃ф҃ѯ҃д = 6564', () => {
    expect(numeralValue('҂ѕ҃ф҃ѯ҃д')!.value).toBe(6564)
    expect(numeralValue('҂ѕ҃ ф҃ ѯ҃ д')!.value).toBe(6564)
  })
  it('letter values incl. ѱ ѡ ц ѳ and teens', () => {
    expect(numeralValue('ѱ҃')!.value).toBe(700); expect(numeralValue('ѡ҃')!.value).toBe(800); expect(numeralValue('ц҃')!.value).toBe(900)
    expect(numeralValue('ѳ҃')!.value).toBe(9); expect(numeralValue('в҃і')!.value).toBe(12)
  })
  it('annus mundi → AD only after «в лѣто»', () => {
    const a = findNumerals('в лѣто ҂ѕ҃ ф҃ ѯ҃ д преставися')
    expect(a).toHaveLength(1); expect(a[0]!.value).toBe(6564); expect(a[0]!.ad).toBe(1056)
    expect(a[0]!.raw).toBe('҂ѕ҃ ф҃ ѯ҃ д')
    expect(findNumerals('҂ѕ҃ф҃ѯ҃д')[0]!.ad).toBeUndefined()
  })
  it('plain words and unmarked letters are not numerals', () => {
    expect(findNumerals('и а в слово ока')).toHaveLength(0)
    expect(numeralValue('дѣло')).toBeUndefined()
  })
})
