/** MM-59 (owner: «один єден теж галицка риса»): єден + case forms as a variant family of один; lexical, owner-graded, VESUM wins. */
import { describe, expect, it } from 'vitest'
import { VARIANT_FAMILIES, familyMember, memberEvidence } from '../core/variant-families.ts'
import { familyPairs } from '../core/corr-src.ts'
import { variantKeys } from '../core/word-rules.ts'
import { claim, unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'

const FORMS = ['єден', 'єдна', 'єдно', 'єдного', 'єдному', 'єдним', 'єдній', 'єдну', 'єдної', 'єдною', 'єдні', 'єдних', 'єдними']
const mk = (withArch: boolean): AnnotateData => {
  const lex = emptyLex(), map = new Map<string, { lemma: string; form: string; via: string }[]>()
  map.set('один', [{ lemma: 'один', form: 'один', via: 'paradigm' }])
  if (withArch) map.set('єден', [{ lemma: 'єден', form: 'єден', via: 'paradigm' }])
  lex.paradigmMap.set('єден', withArch ? [{ lemma: 'єден', tags: 'numr:m:v_naz:arch' }] : [])
  const cards = new Map(['один', ...(withArch ? ['єден'] : [])].map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }]))
  return { ...lex, search: { map, keys: [] }, cards } as unknown as AnnotateData
}
describe('MM-59 єден ~ один', () => {
  it('the family: every member is a dialect role, ambiguous (VESUM lists them as archaic numerals), owner quote verbatim, evidence valid', () => {
    const f = VARIANT_FAMILIES.find(x => x.id === 'VF-ODYN')!
    expect(f.head).toBe('один'); expect(f.members.map(m => m.form)).toEqual(FORMS)
    for (const m of f.members) { expect(m.role).toBe('dialect'); expect(m.ambiguous).toBe(true); expect(() => claim(m.form, memberEvidence(f, m)), m.form).not.toThrow() }
    const ev = memberEvidence(f, f.members[0]!); expect(ev.kind).toBe('P'); expect(ev.quote).toContain('один єден теж галицка риса'); expect(JSON.stringify(ev)).toContain('джерела не знайдено')
    expect(familyMember('єдного')?.family.id).toBe('VF-ODYN')
  })
  it('flows into the CR-1 correspondence group through the variant families; the search key leads єден to один', () => {
    expect(familyPairs().some(p => JSON.stringify(p).includes('єден'))).toBe(true)
    expect(variantKeys('єден')).toContain('один')
  })
  it('the annotator links a lexicon without the form to один; a VESUM reading (єден arch) is never overridden', () => {
    const t = (d: AnnotateData) => annotate('єден', d, 1900)[0]!
    expect(t(mk(false)).lemma).toBe('один'); expect(t(mk(true)).lemma).toBe('єден')
  })
  it('lexical, not a sound rule: о → є is not generalised (ЄДИН / оден are not touched, no respelling row)', () => {
    expect(familyMember('однак')).toBeUndefined(); expect(familyMember('єдність')).toBeUndefined()
  })
})
