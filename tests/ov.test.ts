/** SPEC 63 OV-1…OV-8: dialect respelling in modern orthography, attested vs generated, orthography switch, lossy letters, IPA, stored choice. */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { respell, SPELL_DIALECTS, SPELL_EMPTY, SPELL_RULES, spellCite } from '../core/respell.ts'
import { toOrth, ORTHS, ORTHS_EMPTY } from '../core/orth-forward.ts'
import { DIALECTS } from '../core/rules.ts'
import { attestOf, ctxOfTags } from '../src/lib/dialectView.ts'
import { show, ipaOf, setDialect, setOrth, dialect, orth, resetViews } from '../src/lib/views.ts'
import { featureChips } from '../core/feature-chips.ts'
import Spell from '../src/components/Spell.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const noun = { pos: 'noun', gender: 'n' } as const
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const memStore = (init: Record<string, string> = {}): Storage => { const m = new Map(Object.entries(init)); return { getItem: k => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size } } as Storage }
beforeEach(() => { setDialect(''); setOrth('2019') })

describe('OV-1 baseline', () => {
  it('OV-1 the baseline shows a historical spelling in modern orthography with the original one click away; KWIC and the text view do not use Spell', async () => {
    const html = await render(Spell, { w: 'заспіваєш', raw: 'засьпіваєш' })
    expect(html).toContain('заспіваєш'); expect(html).toContain('оригінал')           // modern text + the button that shows the witness spelling
    expect(html.replace(/<button[^]*?<\/button>/, '')).not.toContain('засьпіваєш')
    const ori = await render(Spell, { w: 'заспіваєш', raw: 'засьпіваєш' }); expect(ori).toContain('title="оригінал: засьпіваєш"')
    for (const f of ['src/components/Kwic.vue', 'src/views/TextsView.vue']) expect(rd(f), f).not.toContain('<Spell')
    expect(rd('src/views/WordView.vue')).toContain('<Spell :w="card.lemma"'); expect(rd('src/components/Paradigm.vue')).toContain('<Spell')
  })
})

describe('OV-2 dialect list', () => {
  it('OV-2 the dialect switch lists exactly the dialects with a cited rule; NORTH and SW are empty', () => {
    expect(SPELL_DIALECTS.length).toBeGreaterThanOrEqual(14)
    for (const c of SPELL_DIALECTS) expect(c in DIALECTS, c).toBe(true)
    expect(SPELL_EMPTY.sort()).toEqual(['NORTH', 'SW'])
    for (const c of ['NDN', 'BOY', 'LEM', 'HUT', 'ZAK', 'SYAN', 'POD', 'CHN', 'MDN', 'SLB']) expect(SPELL_DIALECTS, c).toContain(c)
    // every rule of every offered dialect has a cite read from a detector row (no cite, no rule)
    for (const r of SPELL_RULES) for (const c of Object.keys(r.codes)) expect(spellCite(r, c)?.cite.quote, `${r.id}:${c}`).toBeTruthy()
  })
})

describe('OV-3 respelling', () => {
  it('OV-3 respelling by cited rules with the source quote', () => {
    const cases: [string, string, string, object?][] = [
      ['бажання', 'NDN', 'бажанє', noun], ['життя', 'POD', 'житя', noun], ['дід', 'NDN', 'ґід'], ['хлопець', 'NDN', 'хлопец'], ['люблю', 'BOY', 'любйу', { pos: 'verb' }], ['внук', 'SYAN', 'мнук'],
    ]
    for (const [w, d, out, ctx] of cases) {
      const r = respell(w, d, ctx)
      expect(r.text, `${w} ${d}`).toBe(out)
      expect(r.fired.length).toBeGreaterThan(0)
      for (const f of r.fired) { expect(f.detector).toMatch(/:[A-Z]+$/); expect(f.cite.quote.length).toBeGreaterThan(10); expect(f.cite.locator).toBeTruthy() }
    }
    expect(respell('бажання', 'NDN', noun).fired[0]!.cite.quote).toContain('втрата довготи м’якими приголосними')
    // the changed segment is only the changed letters, with the source letters kept for the tooltip
    expect(respell('бажання', 'NDN', noun).segs).toEqual([{ text: 'бажан' }, { text: 'є', from: 'ня', rule: 'SW-NO-LENGTH' }])
  })
  it('OV-3 a rule that needs gender, part of speech or stress does not fire without it, and unchanged words carry no mark', () => {
    const r = respell('питання', 'NDN'); expect(r.text).toBe('питання'); expect(r.skipped.map(s => s.rule)).toContain('SW-NO-LENGTH')
    expect(respell('голова', 'CHN').text).toBe('голова')                                   // акання needs the stress
    expect(respell('голова', 'CHN', { positions: [5] }).text).toBe('галава')
    const keep = show('вода', 'NDN', '2019'); expect(keep.generated).toBe(false); expect(keep.pieces).toEqual([{ text: 'вода', kind: 'plain' }])
    expect(respell('мед', 'LEM').text).toBe('мет'); expect(respell('мед', 'NDN').text).toBe('мед')   // devoicing is cited for LEM, not for NDN
  })
  it('OV-3 Galician neuter nouns lose the length and take -є', () => {
    for (const [w, out] of [['бажання', 'бажанє'], ['життя', 'житє'], ['знання', 'знанє'], ['весілля', 'весілє'], ['питання', 'питанє']] as const) {
      expect(respell(w, 'NDN', noun).text, w).toBe(out); expect(respell(w, 'SYAN', noun).text, w).toBe(out)
    }
    expect(respell('стаття', 'NDN', { pos: 'noun', gender: 'f' }).text).toBe('стаття')    // a feminine noun is not touched
    expect(ctxOfTags('noun:inanim:n:v_naz')).toEqual({ pos: 'noun', gender: 'n' }); expect(ctxOfTags(undefined)).toEqual({})
    // the neuter rule is written for -е/-є in NDN/SYAN and -я in POD/VOL (the cited examples)
    expect(respell('життя', 'VOL', noun).text).toBe('житя')
  })
})

describe('OV-3 consumes the MM-16 chips without duplicating them', () => {
  it('OV-3 MM-16: the Желехівка chips (-є, и-) carry no dialect group, so the dialect view takes -є from the ЕУМ rows (SW-NO-LENGTH) and generates nothing for и-', () => {
    const chips = featureChips(['ORTH-ZHEL-JE', 'ORTH-ZHEL-INIT-I'], { orth: 'желехівка', witnessRegion: 'Львів' })
    expect(chips.map(c => c.rule)).toEqual(['ORTH-ZHEL-JE', 'ORTH-ZHEL-INIT-I'])
    for (const c of chips) if (c.dialect) expect(SPELL_DIALECTS).toContain(c.dialect.group)   // when MM-16 adds a group it must be one the switch offers
    expect(chips.every(c => c.qualifier === 'galician')).toBe(true); expect(chips[1]!.text).toBe('галицька форма')
    expect(respell('бажання', 'NDN', noun).fired[0]!.detector).toBe('SW-NO-LENGTH:NDN')      // not a chip: the cited ЕУМ row
    expect(respell('інший', 'NDN').text).toBe('інший')                                         // no cited dialect statement for initial и-: nothing generated
    for (const d of SPELL_DIALECTS) expect(respell('інший', d).text, d).not.toMatch(/^и/)
  })
})

describe('OV-4 attested vs generated', () => {
  const wit: Record<string, { id: string; title: string; region?: string; orth?: string; dialect?: any[] }> = {
    lem: { id: 'lem', title: 'Лемківський буквар', region: 'Лемківщина' },
    lviv: { id: 'lviv', title: 'Львів 1893', region: 'Галичина', orth: 'желехівка' },
    kyiv: { id: 'kyiv', title: 'Київ 1900', region: 'Київщина' },
    src: { id: 'src', title: 'Джерело', region: 'інше', dialect: [{ group: 'BOY', status: 'sourced', author: 'a', date: '2026', evidence: [] }] },
  }
  const f = (raw: string, w: string) => ({ raw, byW: { [w]: 2 } })
  const get = (id: string) => wit[id]
  it('OV-4 generated vs attested', () => {
    expect(attestOf('бажанє', [], 'NDN', get).status).toBe('generated')
    expect(attestOf('любйу', [f('любйу', 'lem')], 'LEM', get).status).toBe('attested')                // witness from the dialect region
    expect(attestOf('любйу', [f('любйу', 'src')], 'BOY', get).status).toBe('attested')                // sourced statement of the group
    const ed = attestOf('бажанє', [f('бажанє', 'lviv')], 'NDN', get)                                    // Galician print: not a dialect claim
    expect(ed.status).toBe('edition'); expect(ed.label).toBe('галицька форма / правопис видання'); expect(ed.witnesses[0]!.how).toBe('edition')
    expect(attestOf('бажанє', [f('бажанє', 'kyiv')], 'NDN', get).status).toBe('elsewhere')
    expect(attestOf('бажанє', [f('бажання', 'lviv')], 'NDN', get).status).toBe('generated')            // another spelling is not evidence
  })
  it('OV-4 the badge: a rule-made form says «за правилами», an attested one names the witness', async () => {
    setDialect('NDN')
    const gen = await render(Spell, { w: 'бажання', ctx: noun }); expect(gen).toContain('за правилами'); expect(gen).toContain('бажан'); expect(gen).toContain('title="говір: «ня» → SW-NO-LENGTH:NDN')
    const att = await render(Spell, { w: 'бажання', ctx: noun, attest: attestOf('бажанє', [f('бажанє', 'lviv')], 'NDN', get) }); expect(att).toContain('галицька форма / правопис видання'); expect(att).not.toContain('за правилами')
    const same = await render(Spell, { w: 'вода' }); expect(same).not.toContain('за правилами'); expect(same).not.toContain('<mark')
  })
})

describe('OV-5 orthography', () => {
  it('OV-5 the orthography switch writes the modern word in each cited orthography', () => {
    expect(ORTHS.map(o => o.id)).toEqual(['2019', 'orig', '1928', 'zhel', 'kul', 'max', 'yar']); expect(ORTHS_EMPTY.map(o => o.id)).toEqual(['drag'])
    expect(toOrth('бажання', 'zhel', { gender: 'n' }).text).toBe('бажанє'); expect(toOrth('свято', 'zhel').text).toBe('сьвято'); expect(toOrth('український', 'zhel').text).toBe('українский')
    expect(toOrth("з'їзд", 'kul').text).toBe('зъізд'); expect(toOrth('моє', 'kul').text).toBe('мое')
    expect(toOrth('льон', 'yar').text).toBe('лёнъ')   // ьо → ё and the final ъ (ярижка)
    expect(toOrth('син', 'yar', { origins: [null, { rule: 'R11', src: 'ы' }, null] }).text).toBe('сынъ')
    expect(toOrth('кінь', 'max', { origins: [null, { rule: 'R10', src: 'о', jer: 'ь' }, null, null] }).text).toBe('кôнь')
    const r = toOrth('український', 'zhel'); expect(r.rules[0]!.cite.quote).toContain('україньский'); expect(toOrth('вода', '2019').text).toBe('вода')
  })
  it('OV-6 lossy letters are marked ? unless the etymology decides', () => {
    expect(toOrth('інший', 'zhel').text).toBe('і?нший')                                          // no etymology: the letter is not guessed
    const q = toOrth('інший', 'zhel'); expect(q.unsure).toBe(1); expect(q.segs[0]).toMatchObject({ unsure: true, rule: 'ORTH-ZHEL-INIT-I' })
    expect(toOrth('інший', 'zhel', { proto: '*inъ' }).text).toBe('инший'); expect(toOrth('інший', 'zhel', { proto: '*ěxati' }).text).toBe('інший')
    expect(toOrth('син', 'yar').text).toBe('си?нъ')                                            // и may be ы: unknown without the origin
    expect(toOrth('сват', 'zhel').text).toBe('сь?ват')                                         // ь only for the words of the cited statement
    expect(toOrth('термінологія', '1928', { loan: true }).text).toContain('?'); expect(toOrth('термінологія', '1928').notes.join()).toContain('етимологія слова невідома')
    const tip = show('інший', '', 'zhel'); expect(tip.pieces[0]).toMatchObject({ kind: 'orth', unsure: true })
    expect(rd('src/components/Spell.vue')).toContain('ORTH_NOTE_UNSURE'); expect(rd('core/orth-forward.ts')).toContain("'невизначено без етимології'")
  })
})

describe('OV-7 IPA follows the dialect, not the orthography', () => {
  it('OV-7 the IPA changes with the dialect and not with the orthography', () => {
    const c = { ...noun, positions: [3] }
    const base = ipaOf('бажання', '', c).ipa, ndn = ipaOf('бажання', 'NDN', c).ipa
    expect(ndn).not.toBe(base); expect(base).toContain('ʲː'); expect(ndn).not.toContain('ː'); expect(ndn).toContain('ʲɛ')
    for (const o of ORTHS) { setOrth(o.id); expect(ipaOf('бажання', 'NDN', c).ipa).toBe(ndn); expect(ipaOf('бажання', '', c).ipa).toBe(base) }
    // the two switches combine: dialect letters first, then the orthography's own letters
    const both = show('бажання', 'NDN', 'zhel', c); expect(both.text).toBe('бажанє'); expect(both.generated).toBe(true)
    const j = show('життя', 'POD', 'zhel', noun); expect(j.text).toBe('житя')
    expect(show('українське', 'SYAN', 'zhel').text).toBe('українске'); expect(show('український', '', 'zhel').text).toBe('українский')
    expect(show('українське', 'SYAN', 'zhel').pieces.some(p => p.kind === 'orth')).toBe(true)
  })
})

describe('OV-8 stored choice', () => {
  it('OV-8 the stored choice is read and written in try/catch', () => {
    const st = memStore({ 'ukr-lex.dialect': 'LEM', 'ukr-lex.orth': 'zhel' }); resetViews(st); expect(dialect.value).toBe('LEM'); expect(orth.value).toBe('zhel')
    resetViews(memStore({ 'ukr-lex.dialect': 'NORTH', 'ukr-lex.orth': 'drag' })); expect(dialect.value).toBe(''); expect(orth.value).toBe('2019')      // unknown values are ignored
    const boom = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } } as unknown as Storage
    expect(() => resetViews(boom)).not.toThrow(); expect(dialect.value).toBe('')
    const src = rd('src/lib/views.ts'); expect(src.match(/try \{/g)!.length).toBeGreaterThanOrEqual(3); expect(src).toContain("'ukr-lex.dialect'")
    setDialect('NDN'); expect(dialect.value).toBe('NDN'); setDialect('SW'); expect(dialect.value).toBe('')
  })
})
