/** SPEC 60 UL-1 (research/14): usage axis from VESUM tags + uk.wiktionary label categories; chips and the annotator legend. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { AXIS_UK, USAGE_LABELS, WIKT_CATEGORIES, usageClaims, usageRows } from '../core/usage.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const wikt = new Map([['Розмовні вирази/uk', new Set(['агукати', 'шо'])], ['Жаргонізми/uk', new Set(['крінж'])], ['Застарілі вирази', new Set(['ад'])]])

describe('UL-1 usage axis', () => {
  it('UL-1 taxonomy covers the five axes of research/14 §4 and every Wiktionary category maps to a known label', () => {
    expect(new Set(USAGE_LABELS.map(l => l.axis))).toEqual(new Set(Object.keys(AXIS_UK)))
    const ids = new Set(USAGE_LABELS.map(l => l.id))
    for (const c of WIKT_CATEGORIES) expect(ids.has(c.label), c.cat).toBe(true)
  })
  it('UL-1 VESUM slang/arch/vulg/obsc and Wiktionary categories give claims; each carries D evidence with a locator and the CC BY-SA note', () => {
    const rows = usageRows('шо', 'conj:subord:slang', wikt)
    expect(rows).toEqual([['zharh', 'v', 'conj:subord:slang'], ['rozm', 'w', 'Розмовні вирази/uk']])
    const cl = usageClaims('шо', rows, 'dict_corp_vis.txt v6.8.6', '2026-10-12')
    expect(cl.map(c => c.label.id)).toEqual(['zharh', 'rozm'])
    for (const { claim } of cl) { expect(claim.evidence.length).toBeGreaterThan(0); expect(claim.method).toContain('lemma-level') }
    const w = cl[1]!.claim.evidence.find(e => e.source === 'WIKTUK')!
    expect(w.locator).toBe('https://uk.wiktionary.org/wiki/' + encodeURIComponent('шо')); expect(w.kind).toBe('D'); expect(w.note).toContain('CC BY-SA 4.0')
    expect(cl[0]!.claim.evidence.some(e => e.source === 'VESUM' && e.quote.includes('slang'))).toBe(true)
    expect(cl[0]!.claim.evidence.some(e => e.kind === 'Q' && e.quote.includes('сленг'))).toBe(true)   // the label's quoted definition
  })
  it('UL-1 no label without a source: plain lemmas and the nonstandard/surzhyk tags (bad, subst) give nothing', () => {
    expect(usageRows('хата', 'noun:inanim:f:v_naz', wikt)).toEqual([])
    expect(usageRows('кляча', 'noun:inanim:f:v_naz:bad', wikt)).toEqual([])
    expect(usageRows('сьодні', 'adv:subst', wikt)).toEqual([])
  })
  it('UL-1 chips are in the word card, the annotator popover; the annotator has the usage legend', () => {
    expect(rd('src/views/WordView.vue')).toContain('<UsageChips')
    expect(rd('src/components/WordCard.vue')).toContain('<UsageChips')
    expect(rd('src/views/AnnotateView.vue')).toContain('<UsageLegend')
    expect(rd('src/components/UsageLegend.vue')).toContain('означення не перевірено')
  })
})
