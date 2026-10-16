/** SPEC 63 YT-2: dialect continuants of ѣ as cited, dated, gated hypotheses (core/yat.ts); the standard і stays R09. */
import { describe, it, expect } from 'vitest'
import { derive } from '../core/phonology.ts'
import { readFileSync } from 'node:fs'
import { UNITS_17, AUTHORS_17 } from '../pipelines/nw-izb17.ts'
import { YAT_RULES, yatContinuants, yatGate } from '../core/yat.ts'

const forms = (w: string, year?: number) => yatContinuants(w, { year }).map(c => c.form)
const by = (w: string, id: string) => yatContinuants(w).filter(c => c.rule === id).map(c => c.form)

describe('YT-2 ѣ continuants', () => {
  it('YT-2 every rule has a verbatim cite and a dialect group; no rule without a source', () => {
    for (const r of YAT_RULES) { expect(r.cite.length, r.id).toBeGreaterThan(0); for (const c of r.cite) { expect(c.quote.trim().length, r.id).toBeGreaterThan(10); expect(c.locator, r.id).toBeTruthy() } expect(r.group).toBeTruthy() }
  })
  it('YT-2 нѣгдѣ: standard нігді from R09 (not repeated); нігди (final -ѣ > -и, зап. діал.) and нігде as labelled hypotheses', () => {
    expect(derive('нѣгдѣ').candidates.map(c => c.form)).toContain('нігді')
    const c = yatContinuants('нѣгдѣ'), d = c.find(x => x.form === 'нігди')!
    expect(d.rule).toBe('YT-FIN-I'); expect(d.status).toBe('hypothesis'); expect(d.trace[0]).toBe('YT-FIN-I'); expect(d.group).toBe('SW')
    expect(c.some(x => x.form === 'нігді')).toBe(false)
    expect(by('нѣгдѣ', 'YT-FIN-E')).toContain('нігде')
    expect(YAT_RULES.find(r => r.id === 'YT-FIN-I')!.cite.some(e => e.quote.includes('ні́гди'))).toBe(true)
  })
  it('YT-2 гдѣ → гди / где', () => { expect(by('гдѣ', 'YT-FIN-I')).toEqual(['гди']); expect(by('гдѣ', 'YT-FIN-E')).toEqual(['где']) })
  it('YT-2 дѣти: діти (R09) is the standard; no ѣ > и branch (stressed, closed syllable)', () => {
    expect(derive('дѣти').candidates.map(c => c.form)).toContain('діти')
    const f = forms('дѣти'); expect(f).not.toContain('діти'); expect(by('дѣти', 'YT-STD-I')).toEqual([])
    expect(by('дѣти', 'YT-STRESS-IE')).toContain('діети')
  })
  it('YT-2 дѣтина → дитина (lexical, standard) while дѣти has no such branch', () => { expect(by('дѣтина', 'YT-STD-I')).toContain('дитина'); expect(by('дѣти', 'YT-STD-I')).toEqual([]) })
  it('YT-2 хлѣб: хліб (R09); Polissian іе and unstressed е are hypotheses', () => {
    expect(derive('хлѣбъ').candidates.map(c => c.form)).toContain('хліб')
    expect(by('хлѣбъ', 'YT-STRESS-IE')).toContain('хліеб'); expect(by('хлѣбъ', 'YT-UNSTR-E')).toContain('хлеб')
  })
  it('YT-2 Polissian examples sourced in ЕУМ «Західнополіський говір»: лѣсъ → ліес, сѣно → сиено, тѣсто → тиесто, мѣшокъ → мишок', () => {
    expect(by('лѣсъ', 'YT-STRESS-IE')).toContain('ліес'); expect(by('сѣно', 'YT-STRESS-IE')).toContain('сиено'); expect(by('тѣсто', 'YT-STRESS-IE')).toContain('тиесто')
    expect(by('мѣшокъ', 'YT-WPL-I-Y')).toContain('мишок')
  })
  it('YT-2 gates: WPL not before 1301 (Shevelov ch. 8), unstressed monophthong e not before 1501 (MPL group; own 1401), final -и has no gate', () => {
    expect(yatGate(YAT_RULES.find(r => r.id === 'YT-STRESS-IE')!)).toBe(1301)
    expect(yatGate(YAT_RULES.find(r => r.id === 'YT-UNSTR-E')!)).toBe(1501)
    expect(yatGate(YAT_RULES.find(r => r.id === 'YT-FIN-I')!)).toBe(0)
    expect(forms('лѣсъ', 1200)).not.toContain('ліес'); expect(forms('лѣсъ', 1400)).toContain('ліес'); expect(forms('нѣгдѣ', 1200)).toContain('нігди')
  })
  it('YT-2 lexical dialect rules fire only on the stems the source prints', () => {
    expect(by('дѣрка', 'YT-STEP-VAR')).toContain('дирка'); expect(by('вѣдро', 'YT-NDN-U-I')).toContain('видро'); expect(by('дѣра', 'YT-NDN-U-I')).toContain('дура')
    expect(by('цѣловати', 'YT-SLB-VAR').sort()).toEqual(['целовати', 'циловати'])
    expect(by('хрѣнъ', 'YT-SLB-VAR').sort()).toEqual(['хрен', 'хрон'])
    expect(by('вѣра', 'YT-NDN-U-I')).toEqual([])
    expect(by('дѣвка', 'YT-ZAK-YU')[0]).toContain('ÿ'); expect(by('хлѣвъ', 'YT-ZAK-YU').length).toBeGreaterThan(0)
  })
  it('YT-2 a word without ѣ has no continuants', () => { expect(yatContinuants('вода')).toEqual([]) })
})

const rd = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
describe('YT-1 research and corpus evidence', () => {
  it('YT-1 research/42-yat.md quotes ЕУМ «Ять» (um150), Шевельов and the нігди dictionary evidence; analysis/yat-interchange.md has per-century tables', () => {
    const r = rd('../research/42-yat.md'); expect(r).toContain('um150.htm'); expect(r).toContain('новий ять'); expect(r).toContain('(диал., зап.) ні́гди')
    const a = rd('../analysis/yat-interchange.md'); expect(a).toContain('| 17 |'); expect(a).toContain('ѣ kept')
  })
})

describe('YT-3 Сакович witness', () => {
  it('YT-3 i17_12 is a 1622 Kyiv izbornyk unit with a vetted author; modernised orthography (not a ѣ/и witness); Компаніченко is only noted, never evidence', () => {
    const u = UNITS_17.find(x => x.id === 'i17_12')!, a = AUTHORS_17.find(x => x.id === u.author)!
    expect(u.date).toEqual([1622, 1622]); expect(u.orth).toBe('modernised'); expect(u.dateCite.kind).toBe('Q'); expect(u.urls[0]).toContain('old17_12')
    expect(a.status).toBe('vetted'); expect(a.evidence[0]!.quote).toContain('нам святиню в Росії')
    expect(rd('../research/42-yat.md')).toContain('Компаніченко')
  })
})
