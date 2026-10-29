/** SPEC 63 OV-14: Volhynian / Podolian cited «standard і» statements, Mid-Dnieper cited о-retention (origin from data only), honest labels. */
import { describe, it, expect, beforeEach } from 'vitest'
import { respell, NO_ORIGIN, SPELL_RULES, spellCite } from '../core/respell.ts'
import { originsFor } from '../core/origin.ts'
import { STANDARD_RULES } from '../core/respell-sw.ts'
import { claim } from '../core/evidence.ts'
import { show, ipaOf, setDialect, setOrth } from '../src/lib/views.ts'

const org = (w: string, oldForms: string[] = [], paradigm: string[] = []) => { const o = originsFor(w, { oldForms, paradigm }); return o.via === 'none' ? undefined : o.origins }
beforeEach(() => { setDialect(''); setOrth('2019') })

describe('OV-14 MDN о kept', () => {
  it('OV-14 MDN: віз → воз, кістка → костка, поріг → порог, радість → радость (origin о from the paradigm)', () => {
    expect(respell('віз', 'MDN', { positions: [1], origins: org('віз', [], ['воза']) }).text).toBe('воз')
    expect(respell('кістка', 'MDN', { positions: [1], origins: org('кістка', [], ['кости']) }).text).toBe('костка')
    expect(respell('поріг', 'MDN', { positions: [3], origins: org('поріг', [], ['порога']) }).text).toBe('порог')
    expect(respell('радість', 'MDN', { positions: [1], origins: org('радість', [], ['радості']) }).text).toBe('радость')
  })
  it('OV-14 MDN negative: other words with і < о keep і (the source says «непослідовно», only named words); і of another origin is untouched', () => {
    expect(respell('ніс', 'MDN', { positions: [1], origins: org('ніс', [], ['носа']) }).text).toBe('ніс')
    expect(respell('кістяк', 'MDN', { positions: [1], origins: [null, { rule: 'R11', src: 'ы' }, null, null, null, null] }).text).toBe('кістяк')
    expect(respell('віз', 'SE', { positions: [1], origins: org('віз', [], ['воза']) }).text).toBe('віз')
  })
  it('OV-14 MDN unknown origin: standard form stays, the note is shown on the card, a non-listed word has no note', () => {
    const r = respell('віз', 'MDN', { positions: [1] })
    expect(r.text).toBe('віз'); expect(r.skipped).toContainEqual({ rule: 'MDN-O-KEPT', why: NO_ORIGIN })
    setDialect('MDN'); expect(show('віз', 'MDN', '2019', { positions: [1], noteOrigin: true }).note).toBe(NO_ORIGIN)
    expect(show('стіл', 'MDN', '2019', { positions: [1], noteOrigin: true }).note).toBeUndefined()
  })
  it('OV-14 MDN is labelled as a rule, the cite is verbatim and says «непослідовно»; the IPA reads the respelling', () => {
    const r = respell('віз', 'MDN', { positions: [1], origins: org('віз', [], ['воза']) })
    expect(r.fired.map(f => f.rule)).toEqual(['MDN-O-KEPT']); expect(r.fired[0]!.cite.quote).toContain('непослідовно'); expect(r.fired[0]!.cite.locator).toBe('http://litopys.org.ua/ukrmova/um166.htm')
    const s = show('віз', 'MDN', '2019', { positions: [1], origins: org('віз', [], ['воза']) }); expect(s.generated).toBe(true); expect(s.attested).toBeUndefined()
    expect(ipaOf('віз', 'MDN', { positions: [1], origins: org('віз', [], ['воза']) }).ipa).toContain('ɔ')
    const rule = SPELL_RULES.find(x => x.id === 'MDN-O-KEPT')!; expect(respell(rule.example[0], 'MDN', { origins: org('віз', [], ['воза']) }).text).toBe(rule.example[1])
  })
})

describe('OV-14 VOL / POD cited standard і', () => {
  it('OV-14 VOL: стіл has і < о → no respelling, the cited statement (ЕУМ um178) is attached', () => {
    const o = org('стіл', [], ['стола'])
    const r = respell('стіл', 'VOL', { positions: [3], origins: o })
    expect(r.text).toBe('стіл'); expect(r.standard.map(x => x.rule)).toEqual(['VOL-O-I'])
    expect(r.standard[0]!.cite.quote).toContain('поряд з переважаючим [і]'); expect(r.standard[0]!.text).toMatch(/^у волинських говорах/)
    setDialect('VOL'); expect(show('стіл', 'VOL', '2019', { positions: [3], origins: o, noteOrigin: true }).standard?.[0]?.cite.locator).toBe('http://litopys.org.ua/ukrmova/um178.htm')
  })
  it('OV-14 VOL negative: no origin, і of another origin, a word without і, another dialect, and quiet (no noteOrigin): no statement', () => {
    expect(respell('стіл', 'VOL', { positions: [3] }).standard).toEqual([])
    expect(respell('син', 'VOL', { origins: [null, { rule: 'R11', src: 'ы' }, null] }).standard).toEqual([])
    expect(respell('вода', 'VOL', { origins: org('вода') }).standard).toEqual([])
    expect(respell('стіл', 'CHN', { positions: [3], origins: org('стіл', [], ['стола']) }).standard).toEqual([])
    expect(show('стіл', 'VOL', '2019', { positions: [3], origins: org('стіл', [], ['стола']) }).standard).toBeUndefined()
  })
  it('OV-14 POD: ніс / стіл — і with a hard preceding consonant (ЕУМ um180); я after a soft consonant is kept (з’ат’)', () => {
    const o = org('ніс', [], ['носа'])
    const r = respell('ніс', 'POD', { positions: [1], origins: o }); expect(r.text).toBe('ніс'); expect(r.standard.map(x => x.rule)).toEqual(['POD-O-I'])
    expect(r.standard[0]!.cite.quote).toBe('твердість передньоязикових приголосних т, д, н, с, з, л перед і, що походить з давнього о (ніс, сік, стіл, лій)')
    expect(respell('вісім', 'POD', { origins: org('вісім') }).standard.map(x => x.rule)).not.toContain('POD-O-I')
    expect(respell('взяв', 'POD', { positions: [3] }).standard.map(x => x.rule)).toEqual(['POD-A-KEPT'])
    expect(respell('вода', 'POD', {}).standard).toEqual([])
  })
  it('OV-14 POD IPA: the consonant before і < о is hard ([nis], not [nʲis]); another origin keeps the soft consonant', () => {
    const ipa = (w: string, p: number[], o: ReturnType<typeof org>, d = 'POD') => ipaOf(w, d, { positions: p, origins: o }).ipa
    expect(ipa('ніс', [1], org('ніс', [], ['носа']))).not.toContain('nʲ'); expect(ipa('ніс', [1], org('ніс', [], ['носа']), '')).toContain('nʲ')
  })
  it('OV-14 every cite is a valid evidence claim (non-empty locator and quote)', () => {
    for (const s of STANDARD_RULES) expect(() => claim(true, s.cite), s.id).not.toThrow()
    const r = SPELL_RULES.find(x => x.id === 'MDN-O-KEPT')!; expect(() => claim(true, spellCite(r, 'MDN')!.cite)).not.toThrow()
  })
})
