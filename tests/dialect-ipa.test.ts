/** BL-13: dialect IPA computed from the derivation trace (origin of і/и), research/27 §2. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { toIpa, applicableDialects, IPA_DIALECT_ROWS, IPA_DIALECTS } from '../core/ipa.ts'
import { originsFor, originsForward } from '../core/origin.ts'

const ipa = (form: string, pos: number[] | null, d: string | undefined, ctx: Parameters<typeof originsFor>[1]) => toIpa(form, pos, d, originsFor(form, ctx).origins)

describe('BL-13 origin of і from the trace / the paradigm', () => {
  it('BL-13 origins: кінь ~ коня proves R10 о; піч ~ печі proves R10 е; a bare і proves nothing', () => {
    expect(originsFor('кінь', { paradigm: ['коня'] }).origins[1]).toMatchObject({ rule: 'R10', src: 'о', proof: 'коня' })
    expect(originsFor('піч', { paradigm: ['печі'] }).origins[1]).toMatchObject({ rule: 'R10', src: 'е' })
    expect(originsFor('кінь', { paradigm: [] }).via).toBe('none')
  })
  it('BL-13 origins: the forward trace tags the jer that fell (ніс < несъ: ъ) and ѣ₂ only for the WP-listed lexemes (ліс < лѣсъ unmarked; камінь < камѣнь new)', () => {
    const nis = originsForward('несъ').find(c => c.form === 'ніс')!
    expect(nis.origins[1]).toMatchObject({ rule: 'R10', src: 'е', jer: 'ъ' })
    expect(originsForward('лѣсъ').find(c => c.form === 'ліс')!.origins[1]).toMatchObject({ rule: 'R09', src: 'ѣ' }); expect(originsForward('лѣсъ').find(c => c.form === 'ліс')!.origins[1]!.kind).toBeUndefined()
    expect(originsForward('камѣнь').find(c => c.form === 'камінь')!.origins[3]).toMatchObject({ rule: 'R09', kind: 'new' })
  })
})

describe('BL-13 dialect IPA changes only with a proven origin', () => {
  const k = { paradigm: ['коня'] }
  it('BL-13 V2/V1: кінь [kinʲ] → ZAK/HUT/LEM/WPL monophthong [kunʲ], CHN/WPL-N diphthong [ku̯inʲ]; unchanged without paradigm', () => {
    expect(ipa('кінь', [1], undefined, k).ipa).toBe('[ˈkʲinʲ]')
    for (const d of ['ZAK', 'HUT', 'LEM', 'WPL', 'MPL']) expect(ipa('кінь', [1], d, k).ipa, d).toBe('[ˈkunʲ]')
    for (const d of ['CHN', 'WPL-N']) expect(ipa('кінь', [1], d, k).ipa, d).toBe('[ˈku̯inʲ]')
    expect(ipa('кінь', [1], 'ZAK', {}).ipa).toBe('[ˈkʲinʲ]')
  })
  it('BL-13 V1: стіл (стола) WPL-N [stu̯ɔl]; every fired row is derived and carries its [Q] quote', () => {
    const r = ipa('стіл', [2], 'WPL-N', { paradigm: ['стола'] })
    expect(r.ipa).toBe('[ˈstu̯ɔl]')
    const row = r.rows.find(x => x.id === 'V1-DIPH-UO')!
    expect(row.method).toBe('derived'); expect(row.quote).toMatch(/вуол/); expect(row.cite).toMatch(/\[Q\]/)
  })
  it('BL-13 V6: піч → [pi̯ɛt͡ʃ] in CHN/MPL, not in ZAK; ліс (ѣ, trace) → i̯ɛ', () => {
    const k2 = { paradigm: ['печі'] }
    expect(ipa('піч', [1], 'CHN', k2).ipa).toBe('[ˈpi̯ɛt͡ʃ]')
    expect(ipa('піч', [1], 'ZAK', k2).ipa).toBe(ipa('піч', [1], undefined, k2).ipa)
    expect(ipa('ліс', [1], 'MPL', { oldForms: ['лѣсъ'] }).ipa).toBe('[ˈli̯ɛs]')
  })
  it('BL-13 V5: ніс (past m.) < несъ → ZAK/SIAN [nʲus] (ъ-syllable); the noun ніс < носъ never (needs R10 е + ъ)', () => {
    expect(ipa('ніс', [1], 'ZAK', { oldForms: ['несъ'] }).ipa).toBe('[ˈnʲus]')
    expect(ipa('ніс', [1], 'SIAN', { oldForms: ['несъ'] }).ipa).toBe('[ˈnʲus]')
    expect(ipa('ніс', [1], 'ZAK', { paradigm: ['носа'] }).ipa).toBe('[ˈnus]')   // о-origin: V2, not V5
  })
  it('BL-13 V9: MDN keeps о only in the cited lexemes (віз, поріг …), not in стіл', () => {
    expect(ipa('віз', [1], 'MDN', { paradigm: ['воза'] }).ipa).toContain('ɔ')
    expect(ipa('стіл', [2], 'MDN', { paradigm: ['стола'] }).ipa).toBe(ipa('стіл', [2], undefined, { paradigm: ['стола'] }).ipa)
  })
  it('BL-13 V11: unstressed ѣ > [ɪ] in WPL (лісок), stressed and new ѣ untouched', () => {
    const c = { oldForms: ['лѣсъкъ'] }
    expect(ipa('лісок', [3], 'WPL', c).ipa).toBe('[lɪ̞ˈsɔk]')
    expect(ipa('лісок', [3], undefined, c).ipa).toContain('lʲi')
    expect(ipa('ліс', [1], 'WPL', { oldForms: ['лѣсъ'] }).ipa).not.toContain('ɪ')
  })
  it('BL-13 V8: with unknown stress the origin rows are skipped and flagged (no diphthong without stress)', () => {
    const r = ipa('поріг', null, 'CHN', { paradigm: ['порога'] })
    expect(r.ipa).toBe(ipa('поріг', null, undefined, { paradigm: ['порога'] }).ipa); expect(r.flags.join()).toMatch(/V1-DIPH-UO: потребує наголосу/)
  })
  it('BL-13 G4/G5/G12: ы kept (сини < сыни) in BOY, -ий in LEM, -кій in NDN', () => {
    expect(ipa('сини', [1], 'BOY', { oldForms: ['сыни'] }).ipa).toContain('ɨ')
    expect(toIpa('коли', [1], 'LEM').ipa).toBe('[ˈkɔlɪj]')
    expect(toIpa('глибокий', [4], 'NDN').ipa).toMatch(/kij\]$/)
  })
})

describe('BL-13 selector offers only dialects whose features apply', () => {
  it('BL-13 applicableDialects: кінь → ZAK, CHN, WPL …, not MDN/BOY/POD; a word with no feature → none', () => {
    const a = applicableDialects([{ form: 'кінь', positions: [1], origins: originsFor('кінь', { paradigm: ['коня'] }).origins }]).map(d => d.code)
    for (const c of ['ZAK', 'CHN', 'WPL', 'WPL-N', 'MPL', 'HUT', 'LEM']) expect(a, c).toContain(c)
    for (const c of ['MDN', 'BOY', 'POD', 'SIAN']) expect(a, c).not.toContain(c)
    expect(applicableDialects([{ form: 'кінь', positions: [1] }]).map(d => d.code)).not.toContain('ZAK')
    expect(applicableDialects([{ form: 'мама', positions: [0] }])).toEqual([])
  })
  it('BL-13 IpaRow lists only applicableDialects() and says so when none applies; ZAK, SIAN, WPL-N are known codes', () => {
    const v = readFileSync(new URL('../src/components/IpaRow.vue', import.meta.url), 'utf8')
    expect(v).toContain('applicableDialects'); expect(v).toContain('v-if="applicable.length"'); expect(v).toMatch(/говіркових відмінностей немає/)
    for (const c of ['ZAK', 'SIAN', 'WPL-N']) expect(IPA_DIALECTS.some(d => d.code === c)).toBe(true)
  })
  it('BL-13 every research/27 origin row has codes, a cite and (except G12) a verbatim [Q] quote', () => {
    for (const id of ['V1-DIPH-UO', 'V2-MONO-U', 'V5-E-JER-U', 'V6-DIPH-IE', 'V9-O-KEPT', 'V11-YAT-UNSTR-Y', 'G4-Y-KEPT', 'G5-LEM-IJ', 'G12-NDN-KIJ']) {
      const r = IPA_DIALECT_ROWS.find(x => x.id === id)!
      expect(r, id).toBeTruthy(); expect(r.codes.length).toBeGreaterThan(0); expect(r.cite).toMatch(/research\/27/)
      if (id !== 'G12-NDN-KIJ') expect(r.quote!.length, id).toBeGreaterThan(20); else expect(r.cite).toMatch(/виведено/)
    }
  })
})
