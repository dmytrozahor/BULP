import { describe, it, expect } from 'vitest'
import { reverse, explain, principles } from '../core/reverse.ts'
import { derive, ruleById } from '../core/phonology.ts'
import type { Kwic } from '../core/types.ts'

const forms = (m: string, paradigm?: string[], attested?: (s: string) => Kwic | null) => reverse(m, { paradigm, attested }).candidates.map(c => c.form)

describe('SPEC 30 D-2 backward derivation', () => {
  it('кінь + paradigm → конь (ikavism R10), no кѣнь', () => {
    const r = reverse('кінь', { paradigm: ['кінь', 'коня'] })
    expect(r.candidates.map(c => c.form)).toContain('конь')
    expect(r.candidates.map(c => c.form)).not.toContain('кѣнь')
    const c = r.candidates.find(x => x.form === 'конь')!
    expect(c.trace.map(t => t.rule)).toContain('R10')
    expect(c.evidence.some(e => e.kind === 'D' && e.quote.includes('коня'))).toBe(true)
    expect(c.method).toBe('reconstruction')
  })
  it('without a paradigm R10 is not inverted', () => expect(forms('кінь').every(f => !f.includes('о'))).toBe(true))
  it('піч → печь', () => expect(forms('піч', ['піч', 'печі'])).toContain('печь'))
  it('віра → вѣра', () => expect(forms('віра')).toContain('вѣра'))
  it('ходив → ходилъ', () => expect(forms('ходив')).toContain('ходилъ'))
  it('київ → киѥвъ | кыѥвъ', () => { const f = forms('київ'); expect(f).toContain('киѥвъ'); expect(f).toContain('кыѥвъ') })
  it('сон/сну → сънъ (fleeting vowel only with paradigm evidence)', () => {
    expect(forms('сон', ['сон', 'сну'])).toContain('сънъ')
    expect(forms('день', ['день', 'дня'])).toContain('дьнь')
    expect(forms('сон')).not.toContain('сънъ')
  })
  it('вовк → вълкъ (R06 + R16)', () => expect(forms('вовк')).toContain('волкъ'))
  it('every candidate passes the round-trip (D-2.2), is capped at 12 and differs from the input', () => {
    for (const [m, p] of [['кінь', ['коня']], ['піч', ['печі']], ['віра', []], ['ходив', []], ['київ', []], ['вовк', []], ['життя', []], ['стіл', ['стола']], ['книги', []]] as const) {
      const { candidates } = reverse(m, { paradigm: [...p] })
      expect(candidates.length, m).toBeLessThanOrEqual(12)
      for (const c of candidates) { expect(c.form, m).not.toBe(m); expect(derive(c.form).candidates.map(x => x.form), `${c.form}→${m}`).toContain(m) }
    }
  })
  it('город gets no ikavism reversal (pleophony exception)', () => {
    const { candidates } = reverse('город', { paradigm: ['город', 'города'] })
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) { expect(c.trace.map(t => t.rule)).not.toContain('R10'); expect(c.form).not.toMatch(/[іѣ]/) }
  })
  it('every step cites its forward rule', () => {
    for (const c of reverse('київ').candidates) for (const t of c.trace) expect(c.evidence).toContainEqual(ruleById[t.rule]!.cite)
  })
  it('D-2.3 attested candidates rank first and are confirmed', () => {
    const k: Kwic = { w: 'тест', loc: 'л.1', left: 'а', node: 'вѣра', right: 'б', date: [1100, 1200] }
    const { candidates } = reverse('віра', { attested: s => (s === 'вѣра' ? k : null) })
    expect(candidates[0]).toMatchObject({ form: 'вѣра', status: 'confirmed-by-attestation' })
    expect(candidates[0]!.attestation).toBe(k)
    expect(candidates.slice(1).every(c => c.status === 'reconstruction')).toBe(true)
  })
})

describe('SPEC 30 D-3 explainer', () => {
  it('explain(конь, кінь) = R04, R10', () => expect(explain('конь', 'кінь')?.steps.map(s => s.rule)).toEqual(['R04', 'R10']))
  it('steps carry cites', () => explain('видѣти', 'видіти')!.steps.forEach(s => expect(s.cite.quote).toBeTruthy()))
  it('no path → null, nothing invented', () => expect(explain('конь', 'стіл')).toBeNull())
  it('principles: ikavism supported by paradigm', () => {
    const p = principles('кінь', ['кінь', 'коня']).find(x => x.rule === 'R10')!
    expect(p.supported).toBe(true)
    expect(p.evidence.some(e => e.kind === 'D')).toBe(true)
    expect(principles('кінь', []).find(x => x.rule === 'R10')).toBeUndefined()
  })
})
