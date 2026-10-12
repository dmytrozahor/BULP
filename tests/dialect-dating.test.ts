/** SPEC 60 DD-1…DD-3 (research/23 Round 2): per-rule `earliest` from dated Q sources, oldest feature first, group-formation gating. */
import { describe, it, expect } from 'vitest'
import { detect, type Ctx, type Rule } from '../core/detect.ts'
import { DIALECT_RULES, DIALECT_GROUP_FROM, DIALECT_BLANKET_GATE, ruleGate } from '../core/rules.ts'
import { Q, D } from '../core/evidence.ts'

const ctx = (form: string, o: Partial<Ctx> = {}): Ctx => ({ form, vesum: [], inLexicon: () => [], ...o })
const dia = (f: string, year?: number) => detect(DIALECT_RULES, ctx(f, { year })).claims

describe('DD-1 per-rule earliest replaces the blanket 1798 gate where sourced', () => {
  it('NDN-ADJ-KIJ is dated by Shevelov (end XIII c.) and carries the dating source as evidence', () => {
    const r = DIALECT_RULES.find(x => x.id === 'NDN-ADJ-KIJ:NDN')!
    expect(r.earliest).toBe(1290); expect(r.earliestCite?.kind).toBe('Q'); expect(r.earliestCite?.quote).toContain('наприкінці XIII ст.')
    expect(dia('глибокій', 1350).NDN).toBeDefined()
    expect(dia('глибокій', 1350).NDN!.evidence.some(e => e.quote === r.earliestCite!.quote)).toBe(true)
  })
  it('a dated rule does not fire before its first attestation, and fires from it (also for user input without a year)', () => {
    expect(dia('глибокій', 1250).NDN).toBeUndefined()
    expect(dia('глибокій', 1290).NDN).toBeDefined()
    expect(dia('глибокій', 1798).NDN).toBeDefined()
    expect(dia('глибокій', undefined).NDN).toBeDefined()
  })
  it('an undated rule keeps the 1798 gate', () => {
    const r = DIALECT_RULES.find(x => x.id === 'SW-INSTR-OW:SW')!
    expect(r.earliest).toBeUndefined(); expect(ruleGate(r)).toBe(DIALECT_BLANKET_GATE)
    expect(dia('рукоў', 1600).SW).toBeUndefined()
    expect(dia('рукоў', 1798).SW).toBeDefined()
  })
  it('every dated rule has a Q dating cite, and a normative form never fires', () => {
    for (const r of DIALECT_RULES.filter(x => x.earliest !== undefined)) { expect(r.earliestCite?.kind, r.id).toBe('Q'); expect(r.earliest, r.id).toBeLessThan(DIALECT_BLANKET_GATE) }
    expect(detect(DIALECT_RULES, ctx('глибокій', { year: 1350, vesum: [{ lemma: 'глибокий', tags: 'adj:m:v_zna' }] })).claims.NDN).toBeUndefined()
  })
})

describe('DD-2 group-formation chronology gates the label; features are listed oldest first', () => {
  it('a rule never fires before its group existed: gate = max(earliest, group.from)', () => {
    expect(ruleGate({ earliest: 1400, label: 'POD' })).toBe(DIALECT_GROUP_FROM.POD!.from)   // Podillian only from XVI c.
    expect(ruleGate({ earliest: 1400, label: 'NDN' })).toBe(1400)                          // NDN existed from XIII c.
    expect(ruleGate({ earliest: 1100, label: 'NDN' })).toBe(DIALECT_GROUP_FROM.NDN!.from)
    expect(ruleGate({ label: 'CHN' })).toBe(DIALECT_BLANKET_GATE)
  })
  it('group table rows are Shevelov Q quotes', () => { for (const [code, g] of Object.entries(DIALECT_GROUP_FROM)) { expect(g.cite.kind, code).toBe('Q'); expect(g.cite.source).toBe('SHEV') } })
  const mk = (id: string, earliest: number | undefined): Rule => ({ id, axis: 'dialect', label: 'X', weight: 0.5, cite: Q('SHEV', 'loc', `cite ${id}`), test: () => D('att', 'loc', id), earliest })
  it('claim evidence and method list the oldest feature first, undated last', () => {
    const d = detect([mk('R-undated', undefined), mk('R-1500', 1500), mk('R-1300', 1300)], ctx('x'))
    expect(d.claims.X!.method).toBe('R-1300+R-1500+R-undated')
    expect(d.claims.X!.evidence.map(e => e.quote.replace('cite ', ''))).toEqual(['R-1300', 'R-1300', 'R-1500', 'R-1500', 'R-undated', 'R-undated'])
  })
  it('rules of equal age keep table order (undated rules: unchanged behaviour)', () => {
    expect(detect([mk('A', undefined), mk('B', undefined)], ctx('x')).claims.X!.method).toBe('A+B')
  })
})

describe('DD-3 witness region stays separate evidence', () => {
  it('the detector context carries no region: a dialect claim can only come from a feature of the form', () => {
    const c = ctx('глибокій', { year: 1350 }) as Ctx & { region?: string }
    expect('region' in c).toBe(false)
    const cl = dia('глибокій', 1350).NDN!
    expect(cl.evidence.every(e => e.quote !== 'region')).toBe(true)
    expect(cl.method).toBe('NDN-ADJ-KIJ:NDN')
  })
})
