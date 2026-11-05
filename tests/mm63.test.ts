/** MM-60b (який: єкий / йкий / їкий), MM-60c (question words), MM-63 (варіант → варіянт). */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { respell, SPELL_RULES, spellCite } from '../core/respell.ts'
import { toIpa } from '../core/ipa.ts'
import { ipaOf, show } from '../src/lib/views.ts'
import { withGal } from '../core/gal-folds.ts'
import { IA_ALT_STEMS } from '../core/ia-alt.ts'
import { jakyjForms } from '../core/respell-refl.ts'
import { VARIANT_FAMILIES, familyMember, memberEvidence } from '../core/variant-families.ts'
import { QW_CELLS, QW_GROUPS, QW_WORDS, qwCoverage } from '../core/question-words.ts'
import { questionWordsMd } from '../pipelines/build-question-words.ts'
import { variantKeys } from '../core/word-rules.ts'
import { claim } from '../core/evidence.ts'

const cands = (w: string) => withGal([{ form: w, trace: [], branches: 0 }], w).map(c => c.form)

describe('MM-60b який: єкий main, йкий and їкий as variants (NDN, PKB), kind P', () => {
  it('forms and grades', () => {
    const f = jakyjForms('якого', 'NDN')!
    expect(f.main).toBe('єкого'); expect(f.variants.map(v => v.text)).toEqual(['йкого', 'їкого']); expect(f.variants.every(v => v.grade === 'P' && v.cite[0]!.quote.includes('йкий їкий єкий'))).toBe(true)
    expect(jakyjForms('який', 'HUT')).toBeUndefined(); expect(jakyjForms('якось', 'NDN')).toBeUndefined()
    expect(show('який', 'NDN', '2019').variants?.map(v => v.text)).toEqual(['йкий', 'їкий']); expect(show('який', 'NDN', '2019').text).toBe('єкий')
  })
  it('the family links the whole й- / ї- paradigm to який (search key, CR-1 members), VESUM lists none of them', () => {
    const fam = VARIANT_FAMILIES.find(x => x.id === 'VF-JAKYJ')!
    for (const w of ['йкий', 'йка', 'йке', 'йкі', 'йкого', 'їкий', 'їка', 'їке', 'їкі', 'їкого', 'їкими']) { expect(familyMember(w)?.family.id, w).toBe('VF-JAKYJ'); expect(variantKeys(w)).toContain('який') }
    for (const m of fam.members) expect(() => claim(m.form, memberEvidence(fam, m)), m.form).not.toThrow()
  })
})

describe('MM-60c question words: forms only with a source; the rest «немає даних»', () => {
  it('ЕУМ um162: тко, ко → хто and што → що (ambiguous: VESUM readings win); the matrix has no analogy forms', () => {
    for (const [w, h] of [['тко', 'хто'], ['ко', 'хто'], ['што', 'що']] as const) { const m = familyMember(w)!; expect(m.family.head, w).toBe(h); expect(m.member.cite?.quote).toContain('питальні займенники') }
    expect(familyMember('ко')!.member.ambiguous).toBe(true); expect(familyMember('што')!.member.ambiguous).toBe(true); expect(familyMember('тко')!.member.ambiguous).toBeUndefined()
    for (const w of ['кілько', 'єк', 'йк', 'їк', 'котрий']) expect(familyMember(w)?.family.id === 'VF-ZAK-KTO').toBeFalsy()
  })
  it('the matrix: every filled cell has a grade, a source and a quote; coverage per group; the md is generated from it', () => {
    for (const w of QW_WORDS) for (const g of QW_GROUPS) for (const c of QW_CELLS[w]?.[g] ?? []) { expect(['словник', 'носій', 'гіпотеза']).toContain(c.grade); expect(c.source && c.quote).toBeTruthy() }
    const cov = qwCoverage(); expect(cov['Закарпаття']).toBe(2); expect(cov['Галичина']).toBe(5); expect(cov['Бойківщина']).toBe(0)
    const md = questionWordsMd(); expect(md).toContain('немає даних'); expect(md).toContain('Для підтвердження власником'); expect(readFileSync(new URL('../analysis/dialect-question-words.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n')).toBe(md)
  })
})

describe('MM-63 варіант → варіянт', () => {
  it('forward NDN: the documented loan stems only (VESUM :alt), kind P owner; Азія, діалог, національний untouched; other dialects unchanged', () => {
    for (const [a, b] of [['варіант', 'варіянт'], ['діалект', 'ґіялект'], ['матеріал', 'матеріял'], ['соціальний', 'соціяльний'], ['матеріальний', 'матеріяльний'], ['авіатор', 'авіятор'], ['діагноз', 'ґіягноз'], ['потенціал', 'потенціял'], ['спеціально', 'спеціяльно'], ['багатоваріантний', 'багатоваріянтний']]) expect(respell(a!, 'NDN').text, a).toBe(b)
    for (const w of ['Азія', 'національний', 'ріка', 'мова']) expect(respell(w, 'NDN').text, w).toBe(w); expect(respell('діалог', 'NDN').text).toBe('ґіалог')   // only SW-KJ-GJ, no ія
    expect(respell('варіант', 'PKB').text).toBe('варіант'); expect(respell('варіант', '').text).toBe('варіант')
    const r = SPELL_RULES.find(x => x.id === 'GAL-IA-IJA')!, c = spellCite(r, 'NDN')!.cite
    expect(c.kind).toBe('P'); expect(c.quote).toContain('до галицкого теж варіянт замість варіант'); expect(IA_ALT_STEMS.length).toBeGreaterThan(130)
  })
  it('IPA agrees with the spelling', () => { expect(ipaOf('варіант', 'NDN').ipa).toBe(toIpa('варіянт', null, 'NDN').ipa); expect(ipaOf('діалект', 'NDN').ipa).toBe(toIpa('ґіялект', null, 'NDN').ipa) })
  it('reverse: варіянт, діялог, офіціяльний → іа (medial only; the word-final ія of Азія is never touched); VESUM decides', () => {
    expect(cands('варіянт')).toContain('варіант'); expect(cands('діялог')).toContain('діалог'); expect(cands('офіціяльний')).toContain('офіціальний')
    expect(cands('Азія').filter(c => c !== 'Азія')).toEqual([]); expect(cands('Марія').filter(c => c !== 'Марія')).toEqual([])
  })
})

describe('MM-60d як ~ єк, йк, їк · скільки ~ кілько · поки ~ заки (owner-confirmed, Галичина)', () => {
  it('families: head, ambiguity against VESUM readings, owner P / Желехівський cite', () => {
    const m = (w: string) => familyMember(w)!
    expect(m('єк').family.head).toBe('як'); expect(m('єк').member.ambiguous).toBe(true); expect(m('йк').family.head).toBe('як'); expect(m('їк').family.head).toBe('як'); expect(m('йк').member.ambiguous).toBeUndefined()
    expect(m('кілько').family.head).toBe('скільки'); expect(m('кілько').member.ambiguous).toBe(true); expect(m('скілько').member.cite?.quote).toContain('Скі́льки, скі́лько')
    for (const w of ['заки', 'закиль', 'заким', 'закинь']) expect(m(w).family.head, w).toBe('поки')
    expect(m('заки').member.ambiguous).toBe(true); expect(m('заки').member.cite?.quote).toContain('während (kurzer Zeit), bis; bevor, ehe'); expect(m('заки').member.cite?.note).toContain('so long as, while; until, before')
    for (const id of ['VF-JAK', 'VF-KILKO', 'VF-ZAKI']) { const f = VARIANT_FAMILIES.find(x => x.id === id)!; for (const mm of f.members) expect(() => claim(mm.form, memberEvidence(f, mm)), mm.form).not.toThrow() }
    expect(memberEvidence(VARIANT_FAMILIES.find(x => x.id === 'VF-JAK')!, m('йк').member).quote).toContain('ну галицкого жеж')
  })
  it('search keys lead the forms to the heads; no general я- / є- rule (яблуко, яма untouched)', () => {
    expect(variantKeys('йк')).toContain('як'); expect(variantKeys('їк')).toContain('як'); expect(variantKeys('закиль')).toContain('поки'); expect(variantKeys('кілько')).toContain('скільки')
    expect(familyMember('єдність')).toBeUndefined(); expect(cands('єблуко').filter(c => c.startsWith('я'))).toEqual([])
  })
  it('matrix: Галичина has the confirmed words; the worker dictionaries are listed as not read', () => {
    const md = questionWordsMd(); expect(md).toContain('заки'); expect(md).toContain('кілько'); expect(md).toContain('ПІДТВЕРДЖЕНО власником'); expect(md).toContain('на воркері, не прочитані')
  })
})
