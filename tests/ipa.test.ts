/** SPEC 60 IP-1…IP-3: grapheme -> IPA, dialect override rows, word-card row. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { toIpa, IPA_DIALECT_ROWS } from '../core/ipa.ts'

describe('IP-1 standard grapheme -> IPA', () => {
  it('вовк: в = [w] initially before /ɔ/, [u̯] after a vowel before a consonant', () => {
    const r = toIpa('вовк', [1]); expect(r.ipa).toBe('[ˈwɔu̯k]'); expect(r.rows.find(x => x.id === 'STD-V')!.method).toBe('quoted')
  })
  it('правда: в after а is [u̯]', () => expect(toIpa('правда', [2]).ipa).toBe('[ˈprɑu̯dɑ]'))
  it("бур'ян: apostrophe keeps р hard and gives [j]", () => expect(toIpa("бур'ян", [4]).ipa).toBe('[buˈrjɑn]'))
  it('щастя: щ = [ʃt͡ʃ], я softens т', () => expect(toIpa('щастя', [1]).ipa).toBe('[ˈʃt͡ʃɑstʲɑ]'))
  it('хліб: і softens л, no final devoicing', () => expect(toIpa('хліб', [2]).ipa).toBe('[ˈxlʲib]'))
  it('stress marks in the input are ignored', () => expect(toIpa('хлі́б', [2]).ipa).toBe('[ˈxlʲib]'))
  it('unknown stress: no stress mark, no е/и merger, flagged', () => {
    const r = toIpa('вода', null); expect(r.stressKnown).toBe(false); expect(r.ipa).toBe('[wɔdɑ]'); expect(r.flags.join()).toMatch(/наголос невідомий/)
    expect(toIpa('весело', null).ipa).not.toContain('̝')
  })
  it('unstressed е is [ɛ̝] only when stress is known (мене́)', () => expect(toIpa('мене', [3]).ipa).toBe('[mɛ̝ˈnɛ]'))
  it('regressive voicing, with the вогко exception', () => {
    expect(toIpa('казка', [1]).ipa).toBe('[ˈkɑskɑ]')
    expect(toIpa('легко', [1]).ipa).toBe('[ˈlɛɦkɔ]')
  })
  it('-ться is long soft [t͡sʲː] and marked derived', () => {
    const r = toIpa('сміяться', [4]); expect(r.ipa).toContain('t͡sʲːɑ'); expect(r.rows.find(x => x.id === 'STD-CONS')!.method).toBe('derived')
  })
})

describe('IP-2 dialect override rows (research/04 codes)', () => {
  it('has ≈17 rows keyed to codes', () => { expect(IPA_DIALECT_ROWS.length).toBeGreaterThanOrEqual(17); for (const r of IPA_DIALECT_ROWS) expect(r.codes.length).toBeGreaterThan(0) })
  it('Polissian (CHN): вуол -> diphthong [u̯ɔ], derived; standard is unchanged', () => {
    const r = toIpa('вуол', [2], 'CHN'); expect(r.ipa).toBe('[ˈwu̯ɔl]'); expect(r.rows.find(x => x.id === 'N-DIPH-UO')!.method).toBe('derived')
    expect(toIpa('вуол', [2]).ipa).toBe('[wuˈɔl]')
  })
  it('Polissian akanye needs stress: голова́ with stress -> [ɑ]; without -> skipped and flagged', () => {
    expect(toIpa('голова', [5], 'CHN').ipa).toBe('[ɦɑlɑˈwɑ]')
    const r = toIpa('голова', null, 'CHN'); expect(r.ipa).not.toContain('ɑlɑ'); expect(r.flags.join()).toMatch(/CHN-AKANYE/)
  })
  it('SW: final devoicing and palatal sibilants', () => {
    expect(toIpa('хліб', [2], 'SW').ipa).toBe('[ˈxlʲip]')
    expect(toIpa('ніч', [1], 'SW').ipa).toBe('[ˈnʲit͡ɕ]')
    expect(toIpa('хліб', [2], 'CHN').ipa).toBe('[ˈxlʲib]')
  })
  it('Lemko ш -> [ʂ]; Carpathian ы -> [ɨ]', () => {
    expect(toIpa('шия', [1], 'LEM').ipa).toContain('ʂ'); expect(toIpa('сыр', [1], 'BOY').ipa).toContain('ɨ')
  })
})

describe('IP-3 word card IPA row', () => {
  it('IP-3 WordCard includes IpaRow, one IPA per stress variant with a dialect toggle', () => {
    expect(readFileSync('src/components/WordCard.vue', 'utf8')).toContain('<IpaRow ')
    const v = readFileSync('src/components/IpaRow.vue', 'utf8'); expect(v).toContain('v-for="(it, i) in items"'); expect(v).toContain('applicableDialects')
  })
})
