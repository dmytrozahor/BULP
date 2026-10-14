import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { derive as deriveRaw, ruleById, RULES } from '../core/phonology.ts'
import { palatalClaim, palatalize, restoreVelar, secondPalatalization, velarCandidates, R24_CITE } from '../core/palatalization.ts'
import { palatalizedOldForms, reverse } from '../core/reverse.ts'
import { D, isKnown } from '../core/evidence.ts'
import { chooseLemma, linkOptions, traceSteps, wantedKeys, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import type { VesumHit } from '../core/types.ts'

const VES: Record<string, VesumHit[]> = {
  помогти: [{ lemma: 'помогти', tags: 'verb:perf:inf' }], ректи: [{ lemma: 'ректи', tags: 'verb:imperf:inf' }],
  рука: [{ lemma: 'рука', tags: 'noun:inanim:f:v_naz' }], нога: [{ lemma: 'нога', tags: 'noun:inanim:f:v_naz' }], друг: [{ lemma: 'друг', tags: 'noun:anim:m:v_naz' }],
}
const env: Env = { hits: new Map(Object.entries(VES)), derive: (s, oldI) => deriveRaw(s, { oldI }), fold: () => [] }
const T = (raw: string): TypeCtx => ({ lang: 'orv', oldI: false, raw })
const link = (raw: string) => { const r = linkOptions(T(raw), env); return r ? chooseLemma(r.opts, new Map()) : undefined }

describe('BL-20 second palatalization (R24)', () => {
  it('R24 is a cited rule; R24r is a link-only rule known to ruleById', () => {
    expect(RULES.some(r => r.id === 'R24')).toBe(true)
    expect(ruleById['R24r']).toBeTruthy()
    expect(RULES.some(r => r.id === 'R24r')).toBe(false)
    expect(R24_CITE[0]!.quote).toContain('друга палаталізація велярних')
    expect(R24_CITE.map(e => e.source)).toEqual(['SHEV', 'WUK', 'PAVL'])
  })
  it('forward: velar + ѣ/и → ц з с', () => {
    expect(palatalize('рукѣ')).toBe('руцѣ'); expect(palatalize('ногѣ')).toBe('нозѣ'); expect(palatalize('сухѣ')).toBe('сусѣ')
    expect(palatalize('другъ')).toBeNull(); expect(palatalize('помоги')).toBe('помози'); expect(palatalize('вълки')).toBe('вълци')
  })
  it('R24 keeps ц/з/с: руцѣ → руці by R09, no R24 step', () => {
    const c = deriveRaw('руцѣ').candidates.find(x => x.form === 'руці')!
    expect(c.trace).toContain('R09'); expect(c.trace).not.toContain('R24')
  })
  it('detector: lemma ~ form pairs', () => {
    expect(secondPalatalization('рука', 'руці')).toEqual({ velar: 'к', pal: 'ц' })
    expect(secondPalatalization('нога', 'нозі')).toEqual({ velar: 'г', pal: 'з' })
    expect(secondPalatalization('друг', 'друзі')).toEqual({ velar: 'г', pal: 'з' })
    expect(secondPalatalization('бік', 'боці')).toEqual({ velar: 'к', pal: 'ц' })
    expect(secondPalatalization('помогти', 'помози')).toEqual({ velar: 'г', pal: 'з' })
    expect(secondPalatalization('рука', 'руки')).toBeNull(); expect(secondPalatalization('мати', 'маци')).toBeNull(); expect(secondPalatalization('вода', 'воді')).toBeNull()
  })
  it('restoration candidates', () => {
    expect(restoreVelar('помози')).toBe('помоги')
    expect(velarCandidates('руці').map(v => v.lemma)).toEqual(expect.arrayContaining(['рука', 'рук', 'рукти']))
    expect(velarCandidates('рци').map(v => v.lemma)).toContain('ректи')
  })
  it('linking: помози → помогти, руцѣ... with R24r in the trace', () => {
    const c = link('помози')!
    expect(c.lemma).toBe('помогти'); expect(c.cand.trace).toContain('R24r')
    const steps = traceSteps('помози', c.cand)
    expect(steps.at(-1)).toEqual({ rule: 'R24r', from: 'помози', to: 'помоги' })
    expect(link('рьци')?.lemma).toBe('ректи')
    expect(link('нозѣ')?.lemma).toBe('нога'); expect(link('нозѣ')!.cand.trace).toContain('R24r')
    expect(link('друзи')?.lemma).toBe('друг')
    expect(link('мразь')).toBeUndefined()
  })
  it('the VESUM pass asks for the velar lemma keys', () => {
    expect(wantedKeys(T('помози'), env)).toContain('помогти')
  })
  it('reverse: palatalised old forms of velar-stem lemmas', () => {
    const f = (l: string, t: string) => palatalizedOldForms(l, t).map(x => x.form)
    expect(f('рука', 'noun:inanim:f:v_naz')).toContain('руцѣ')
    expect(f('нога', 'noun:inanim:f:v_naz')).toContain('нозѣ')
    expect(f('друг', 'noun:anim:m:v_naz')).toEqual(expect.arrayContaining(['друзѣ', 'друзи']))
    expect(f('помогти', 'verb:perf:inf')).toEqual(['помози'])
    expect(f('вода', 'noun:inanim:f:v_naz')).toEqual([])
    expect(palatalizedOldForms('рука', 'noun:f')[0]!.evidence).toBe(R24_CITE)
  })
  it('reverse(): the R24 row annotates a palatalised modern form when the paradigm shows the velar sibling', () => {
    const c = reverse('руці', { paradigm: ['рука', 'руки', 'руці'] }).candidates.find(x => x.form === 'руцѣ')!
    expect(c.trace.map(t => t.rule)).toContain('R24')
    expect(c.evidence.some(e => e.kind === 'D' && e.quote.includes('рука'))).toBe(true)
  })
  it('lemma claim lists the affected attested forms, with the rule citations', () => {
    const ev = D('w', 'l', 'x')
    const c = palatalClaim('нога', [
      { raw: 'нозѣ', forms: ['нозі', 'нозѣ'], f: 3, viaR24r: false, ev }, { raw: 'ногу', forms: ['ногу'], f: 9, viaR24r: false, ev },
    ])!
    expect(isKnown(c)).toBe(true); expect(c.value).not.toBe('unknown')
    expect((c.value as { forms: { raw: string; alt: string }[] }).forms).toEqual([{ raw: 'нозѣ', form: 'нозі', alt: 'г → з', f: 3, via: 'kept' }])
    expect(c.evidence.slice(0, 3).map(e => e.source)).toEqual(['SHEV', 'WUK', 'PAVL'])
    expect(palatalClaim('вода', [{ raw: 'воді', forms: ['воді'], f: 1, viaR24r: false, ev }])).toBeUndefined()
  })
  it('BL-20 user statement is stored as a hypothesis (author user, 2026-10-14), kept apart; family links exist', () => {
    const hyps = JSON.parse(readFileSync('pipelines/etymology-hypotheses.json', 'utf8')) as { lemma: string; author: string; date: string; status: string }[]
    expect(hyps.filter(h => h.author === 'user' && h.date === '2026-10-14').map(h => h.lemma).sort()).toEqual(['помагати', 'помогти'])
    const fam = JSON.parse(readFileSync('pipelines/word-families.json', 'utf8')) as { edges: { a: string; b: string; basis: string }[] }[]
    const e = fam[0]!.edges
    expect(e.find(x => x.a === 'помагати' && x.b === 'помогати')!.basis).toBe('hypothesis')
    expect(e.find(x => x.a === 'допомагати' && x.b === 'помагати')!.basis).toBe('vesum')
  })
})
