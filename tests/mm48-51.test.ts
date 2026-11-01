/** MM-48…MM-51 (owner 2026-11-01): general reverse folds for Galician spellings (я>є, hard -т, є-stem, soft р + -єм, і kept, сь before a labial) - branch only, VESUM decides, a known form is never redirected. */
import { describe, expect, it } from 'vitest'
import { withGal } from '../core/gal-folds.ts'
import { GAL_SOFT_FOLDS, galSoftGate } from '../core/gal-soft.ts'
import { claim } from '../core/evidence.ts'

/** the link outcome: the plain spelling if it is a form, else the first extra candidate that is a form */
const KNOWN = new Set(['тяжко', 'дякувати', 'п’ять', 'м’ясо', 'ходить', 'робить', 'носять', 'мають', 'мусити', 'мусить', 'мусіти', 'видіти', 'сидіти', 'терпіти', 'летіти', 'видиш', 'папер', 'папером', 'паперу', 'кобзарем', 'писарем', 'світ', 'співати', 'звір',
  'є', 'пєс', 'тест', 'життя', 'ходять', 'він', 'вілом', 'волом', 'вол', 'брат', 'ведуть', 'несе', 'піт', 'бути', 'ціп', 'мій', 'свіжіше', 'шість', 'верх', 'мрія', 'сьогодні', 'дякую', 'мені', 'вони', 'тепер', 'воля', 'нісь', 'кріт', 'поїзд'])
const link = (w: string, known: Set<string> = KNOWN): string | undefined => {
  if (known.has(w)) return w
  return withGal([{ form: w, trace: [], branches: 0 }], w).slice(1).map(c => c.form).find(f => known.has(f))
}
describe('MM-48…51 reverse folds', () => {
  it('MM-48 я > є after a soft consonant: every word, not a list (тєжко, дєкувати, пєть, мнєсо)', () => {
    expect(link('тєжко')).toBe('тяжко'); expect(link('дєкувати')).toBe('дякувати'); expect(link('пєть')).toBe('п’ять'); expect(link('мнєсо')).toBe('м’ясо')
  })
  it('MM-49 hard -т of the 3rd person (ходит, робит, носят, мают) and the є-stem (мусєт, мусєти, видєти, сидєти, летєти, терпєти)', () => {
    for (const [a, b] of [['ходит', 'ходить'], ['робит', 'робить'], ['носят', 'носять'], ['мают', 'мають'], ['мусєт', 'мусить'], ['видєти', 'видіти'], ['сидєти', 'сидіти'], ['летєти', 'летіти'], ['терпєти', 'терпіти'], ] as const) expect(link(a), a).toBe(b)
    expect(['мусити', 'мусіти']).toContain(link('мусєти'))
    expect(link('мусєти', new Set(['мусити']))).toBe('мусити')
  })
  it('MM-50 сьвіт → світ, сьпівати → співати, зьвір → звір for a token of any orthography', () => {
    expect(link('сьвіт')).toBe('світ'); expect(link('сьпівати')).toBe('співати'); expect(link('зьвір')).toBe('звір')
  })
  it('MM-51 папірєм → папером, папіром → папером, кобзарєм → кобзарем, писарєм → писарем', () => {
    expect(link('папірєм')).toBe('папером'); expect(link('папіром')).toBe('папером'); expect(link('кобзарєм')).toBe('кобзарем'); expect(link('писарєм')).toBe('писарем'); expect(link('вілом')).toBe('вілом')
  })
  it('reverse guard: a word VESUM lists as a form is never redirected (the plain candidate is first)', () => {
    for (const w of ['є', 'пєс', 'тест', 'життя', 'ходять', 'мрія', 'поїзд', 'вілом']) expect(link(w), w).toBe(w)
    expect(link('папіром', new Set([...KNOWN, 'папіром']))).toBe('папіром'); expect(link('ходит', new Set([...KNOWN, 'ходит']))).toBe('ходит')
    expect(link('qwerty')).toBeUndefined()
  })
  it('every new fold has valid evidence; the cited ones quote the ЕУМ row, the rest say «джерела не знайдено» (P)', () => {
    for (const f of GAL_SOFT_FOLDS) expect(() => claim(f.id, f.cite), f.id).not.toThrow()
    const by = Object.fromEntries(GAL_SOFT_FOLDS.map(f => [f.id, f.cite]))
    expect(by['ORTH-GAL-A-SOFT']!.kind).toBe('Q'); expect(by['ORTH-GAL-3T']!.quote).toContain('рóбит')
    for (const id of ['ORTH-GAL-E-I', 'ORTH-GAL-E-Y', 'ORTH-GAL-REM', 'ORTH-GAL-I-E']) { expect(by[id]!.kind, id).toBe('P'); expect(by[id]!.note, id).toContain('джерела не знайдено') }
  })
  it('the tag gate keeps only the analysis the rule is about (measured false positives of the corpus run)', () => {
    const isForm = (k: string) => ['теж', 'будеть'].includes(k)
    expect(galSoftGate('ORTH-GAL-3T', 'ходит', 'verb:imperf:pres:s:3', isForm)).toBe(true)
    expect(galSoftGate('ORTH-GAL-3T', 'совіт', 'noun:inanim:m:v_naz', isForm)).toBe(false)         // совіть is not a verb
    expect(galSoftGate('ORTH-GAL-3T', 'десят', 'numr:p:v_naz', isForm)).toBe(false)
    expect(galSoftGate('ORTH-GAL-A-SOFT', 'тєж', 'noun:inanim:m:v_naz', k => isForm(k))).toBe(false) // тєж = теж (є = е): the е-reading is a form
    expect(galSoftGate('ORTH-GAL-A-SOFT', 'тєжко', 'adv', isForm)).toBe(true)
    expect(galSoftGate('ORTH-GAL-A-SOFT', 'замирєти', 'verb:imperf:inf', isForm)).toBe(false)
    expect(galSoftGate('ORTH-GAL-E-I', 'видєти', 'verb:imperf:inf', isForm, 'видіти')).toBe(true)
    expect(galSoftGate('ORTH-GAL-E-I', 'видєло', 'verb:perf:past:n', isForm, 'виділити')).toBe(false)
    expect(galSoftGate('ORTH-GAL-E-I', 'василєв', 'noun:anim:m:v_naz:prop:lname', isForm, 'василів')).toBe(false)
    expect(galSoftGate('ORTH-GAL-I-E', 'папіром', 'noun:inanim:m:v_oru', isForm, 'папір')).toBe(true)
    expect(galSoftGate('ORTH-GAL-I-E', 'дітєм', 'noun:inanim:m:v_oru', isForm, 'дот')).toBe(false)
  })
})
