/** MM-57b (NDN hardens -ськ-, owner), MM-60 (який ~ єкий), MM-62 (чотири ~ штири, штери). */
import { describe, expect, it } from 'vitest'
import { respell, SPELL_RULES, spellCite } from '../core/respell.ts'
import { toIpa } from '../core/ipa.ts'
import { ipaOf } from '../src/lib/views.ts'
import { DIALECTS } from '../core/rules.ts'
import { VARIANT_FAMILIES, familyMember, memberEvidence } from '../core/variant-families.ts'
import { familyPairs } from '../core/corr-src.ts'
import { variantKeys } from '../core/word-rules.ts'
import { claim, unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'

describe('MM-57b the Galician option of the switch hardens -ськ-', () => {
  it('the switch labels exactly one option Galician: NDN «наддністрянський (галицький)»', () => {
    expect(Object.entries(DIALECTS).filter(([, v]) => /галицьк/.test(v)).map(([k]) => k)).toEqual(['NDN'])
  })
  it('NDN: галицький → галицкий, all endings; kind P owner cite; the IPA is read from the hard spelling; HUT / POD unchanged', () => {
    for (const [a, b] of [['галицький', 'галицкий'], ['галицька', 'галицка'], ['галицьке', 'галицке'], ['галицького', 'галицкого'], ['галицьких', 'галицких'], ['галицькими', 'галицкими'], ['галицькій', 'галицкій']]) expect(respell(a!, 'NDN').text, a).toBe(b)
    const r = SPELL_RULES.find(x => x.id === 'GAL-SK-HARD')!, c = spellCite(r, 'NDN')!.cite
    expect(c.kind).toBe('P'); expect(c.quote).toContain('єкий для галицкого діалекту на який і галицький досі без твредішання'); expect(c.note).toContain('за свідченням носія'); expect(spellCite(r, 'PKB')!.cite.kind).toBe('Q')
    expect(ipaOf('галицький', 'NDN').ipa).toBe(toIpa('галицкий', null, 'NDN').ipa)
    for (const d of ['HUT', 'POD']) expect(respell('галицький', d).text).toBe('галицький')
  })
})

describe('MM-60 який ~ єкий', () => {
  it('forward: the який paradigm only (NDN owner P, PKB um175 Q); якось, якийсь, якраз, яблуко untouched; other dialects unchanged', () => {
    for (const [a, b] of [['який', 'єкий'], ['яка', 'єка'], ['яке', 'єке'], ['які', 'єкі'], ['якого', 'єкого'], ['якому', 'єкому'], ['яким', 'єким'], ['якою', 'єкою'], ['якої', 'єкої'], ['яку', 'єку'], ['яких', 'єких'], ['якими', 'єкими']]) {
      expect(respell(a!, 'NDN').text, a).toBe(b); expect(respell(a!, 'PKB').text, a).toBe(b)
    }
    for (const w of ['якось', 'якийсь', 'якраз', 'яблуко', 'ягода']) expect(respell(w, 'NDN').text, w).not.toMatch(/^є/)
    expect(respell('який', 'HUT').text).toBe('який')
    const r = SPELL_RULES.find(x => x.id === 'GAL-JAKYJ')!
    expect(spellCite(r, 'NDN')!.cite.kind).toBe('P'); expect(spellCite(r, 'PKB')!.cite.quote).toContain('Лише після й перехід [а] в [е], [і] обмежений')
  })
})

const mk = (have: Record<string, string>): AnnotateData => {
  const lex = emptyLex(), map = new Map<string, { lemma: string; form: string; via: string }[]>(), lemmas = new Set<string>()
  for (const [f, l] of Object.entries(have)) { lemmas.add(l); map.set(key(f), [{ lemma: l, form: key(f), via: 'paradigm' }]); lex.paradigmMap.set(key(f), [{ lemma: l, tags: l === 'штир' ? 'noun:inanim:m:v_naz' : 'x' }]) }
  return { ...lex, search: { map, keys: [] }, cards: new Map([...lemmas].map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const lemmaOf = (w: string, d: AnnotateData) => annotate(w, d, 1900)[0]!.lemma

describe('MM-60 family: який ~ єкий (link, annotator, search key, CR-1); VESUM wins', () => {
  const f = VARIANT_FAMILIES.find(x => x.id === 'VF-JAKYJ')!
  it('members, owner evidence kind P with the verbatim quote, valid claim', () => {
    expect(f.head).toBe('який'); expect(f.members.map(m => m.form)).toEqual(['єкий', 'єка', 'єке', 'єкі', 'єкого', 'єкому', 'єким', 'єкою', 'єкої', 'єку', 'єких', 'єкими', 'єкій'])
    for (const m of f.members) expect(() => claim(m.form, memberEvidence(f, m))).not.toThrow()
    expect(memberEvidence(f, f.members[0]!).quote).toContain('єкий для галицкого діалекту на який'); expect(familyMember('якось')).toBeUndefined()
  })
  it('annotator and search key lead єкий to який; CR-1 gets the pairs', () => {
    expect(lemmaOf('єкий', mk({ який: 'який' }))).toBe('який'); expect(variantKeys('єкий')).toContain('який'); expect(familyPairs().some(p => JSON.stringify(p).includes('єкий'))).toBe(true)
    expect(lemmaOf('єкого', mk({ який: 'який' }))).toBe('який')
  })
})

describe('MM-62 family: чотири ~ штири, штери', () => {
  const f = VARIANT_FAMILIES.find(x => x.id === 'VF-SHTYRY')!
  it('members; Вікісловник cite for штири / штирьох / штирьом / штирма with no area named; штери / штирі owner P with the verbatim quote', () => {
    expect(f.head).toBe('чотири'); expect(f.members.map(m => m.form)).toEqual(['штири', 'штирьох', 'штирьом', 'штирма', 'штери', 'штирі'])
    for (const m of f.members) expect(() => claim(m.form, memberEvidence(f, m)), m.form).not.toThrow()
    const w = memberEvidence(f, f.members[0]!); expect(w.quote).toContain('dialectal'); expect(JSON.stringify(w)).not.toMatch(/Галичин|Поділл|Бойк|Гуцул/)
    const o = memberEvidence(f, f.members.find(m => m.form === 'штери')!); expect(o.kind).toBe('P'); expect(o.quote).toContain('штери штири теж діалектне')
  })
  it('annotator: штери → чотири; штирьох → чотири; штири stays the VESUM noun form (штир) when the lexicon has it; search key; CR-1', () => {
    expect(lemmaOf('штери', mk({ чотири: 'чотири' }))).toBe('чотири'); expect(lemmaOf('штирьох', mk({ чотири: 'чотири' }))).toBe('чотири')
    expect(lemmaOf('штири', mk({ чотири: 'чотири', штири: 'штир' }))).toBe('штир'); expect(lemmaOf('штири', mk({ чотири: 'чотири' }))).toBe('чотири')
    expect(variantKeys('штери')).toContain('чотири'); expect(familyPairs().some(p => JSON.stringify(p).includes('штери'))).toBe(true)
  })
})
