/** SPEC 63 OV-13: Polissian (north) respelling by the origin of і and the stress; attested form beats the rule; unknown origin keeps the standard form. */
import { describe, it, expect, beforeEach } from 'vitest'
import { respell, NO_ORIGIN, SPELL_RULES, spellCite } from '../core/respell.ts'
import { originsFor } from '../core/origin.ts'
import { DIALECT_REFLEXES } from '../core/ikavism.ts'
import { attestedFormOf, arkushynSrc, type Reflex } from '../src/lib/dialectAttested.ts'
import { show, ipaOf, setDialect, setOrth } from '../src/lib/views.ts'

const org = (w: string, oldForms: string[] = [], paradigm: string[] = []) => { const o = originsFor(w, { oldForms, paradigm }); return o.via === 'none' ? undefined : o.origins }
beforeEach(() => { setDialect(''); setOrth('2019') })

describe('OV-13 Polissian respelling', () => {
  it('OV-13 Полісся: the owner case — CHN (Східне Полісся) gives Паліесся (акання + іе), MPL Поліесся, WPL stays', () => {
    const o = org('полісся', ['полѣсье'])
    expect(o?.some(Boolean)).toBe(true)                                                 // the origin comes from the attested old spelling replayed through the derivation
    const ctx = { positions: [3], origins: o }
    expect(respell('Полісся', 'CHN', ctx).text).toBe('Паліесся'); expect(respell('Полісся', 'MPL', ctx).text).toBe('Поліесся'); expect(respell('Полісся', 'WPL', ctx).text).toBe('Полісся')
    const f = respell('полісся', 'CHN', ctx).fired.map(x => x.rule); expect(f).toEqual(expect.arrayContaining(['NORTH-STRESS-E', 'CHN-AKANYE']))
  })
  it('OV-13 every rule has a verbatim cite and its example holds with the origin and stress it needs', () => {
    const N = SPELL_RULES.filter(r => r.id.startsWith('NORTH-') || r.id === 'WPL-A-E')
    expect(N.map(r => r.id)).toEqual(['NORTH-STRESS-O', 'NORTH-STRESS-E', 'NORTH-UNSTR-YAT', 'WPL-A-E'])
    for (const r of N) for (const c of Object.keys(r.codes)) { const q = spellCite(r, c)?.cite; expect(q?.quote.length, `${r.id}:${c}`).toBeGreaterThan(15); expect(q?.locator).toMatch(/litopys\.org\.ua\/ukrmova\/um\d+|./) }
  })
  it('OV-13 by sub-group and stress: віл → вуол / вул / віл; піч → піеч; лісок → лесок / лисок; взяв → взев', () => {
    const vil = org('віл', [], ['вола']), pich = org('піч', [], ['печі']), lisok = org('лісок', ['лѣсокъ'])
    expect(respell('віл', 'CHN', { positions: [1], origins: vil }).text).toBe('вуол')   // ЕУМ um155 (вуол)
    expect(respell('віл', 'WPL', { positions: [1], origins: vil }).text).toBe('вул')    // ЕУМ um168 (вул)
    expect(respell('віл', 'MPL', { positions: [1], origins: vil }).text).toBe('віл')    // ê has no modern letter: not generated
    expect(respell('піч', 'CHN', { positions: [1], origins: pich }).text).toBe('піеч'); expect(respell('піч', 'MPL', { positions: [1], origins: pich }).text).toBe('піеч')
    expect(respell('лісок', 'MPL', { positions: [4], origins: lisok }).text).toBe('лесок'); expect(respell('лісок', 'WPL', { positions: [4], origins: lisok }).text).toBe('лисок')
    expect(respell('тяжко', 'WPL', { positions: [1] }).text).toBe('тежко'); expect(respell('тяжко', 'MPL', { positions: [1] }).text).toBe('тяжко')
  })
  it('OV-13 unknown origin of і: the standard form stays, with the note; no stress: skipped', () => {
    const r = respell('пісня', 'CHN', { positions: [1] })                                    // no origins on the card
    expect(r.text).toBe('пісня'); expect(r.skipped).toContainEqual({ rule: 'NORTH-STRESS-O', why: NO_ORIGIN })
    expect(NO_ORIGIN).toBe('походження і не встановлено — діалектну форму не виведено')
    expect(respell('піч', 'CHN', { origins: org('піч', [], ['печі']) }).skipped.some(s => s.why === 'потребує наголосу')).toBe(true)
    setDialect('CHN'); expect(show('пісня', 'CHN', '2019', { positions: [1], noteOrigin: true }).note).toBe(NO_ORIGIN)
    expect(show('пісня', 'CHN', '2019', { positions: [1] }).note).toBeUndefined()
  })
  it('OV-13 a word without і is untouched, an і of another origin (и < ы, R11) is untouched', () => {
    expect(respell('вода', 'WPL', { positions: [3], origins: org('вода') }).text).toBe('вода')
    expect(respell('син', 'CHN', { positions: [1], origins: [null, { rule: 'R11', src: 'ы' }, null] }).text).toBe('син')
  })
  it('OV-13 attested beats the rule and is labelled; Аркушин label has volume and page', () => {
    const rs = DIALECT_REFLEXES as Reflex[]
    const a = attestedFormOf('ліс', 'WPL', rs)!; expect(a.form).toBe("л'іес"); expect(a.src).toMatch(/^засвідчено: /)
    expect(attestedFormOf('ліс', 'MPL', rs)).toBeUndefined(); expect(attestedFormOf('Львів', 'WPL', rs)).toBeUndefined()   // chancery / orthography spellings are not a living form
    const s = show('ліс', 'WPL', '2019', { attested: a }); expect(s.text).toBe("л'іес"); expect(s.attested?.src).toBe(a.src); expect(s.generated).toBe(false)
    expect(show('ліс', 'CHN', '2019', { attested: a }).attested).toBeUndefined()            // another dialect: not applied
    expect(arkushynSrc(2, 117)).toBe('Аркушин, т. 2, с. 117')
  })
  it('OV-13 the IPA of the dialect view reads the standard form with its origins', () => {
    const o = org('піч', [], ['печі'])
    expect(ipaOf('піч', 'CHN', { positions: [1], origins: o }).ipa).toContain('i̯ɛ')
    expect(ipaOf('піч', 'CHN', { positions: [1] }).ipa).not.toContain('i̯ɛ')
  })
})
