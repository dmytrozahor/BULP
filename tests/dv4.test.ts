/** SPEC 63 DV-4: ѣ after j / hushing consonants (R09j) and the yat correspondences on cognate edges (core/yat-corr.ts). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { derive, RULES, ruleById } from '../core/phonology.ts'
import { yatEdge, YAT_CORR } from '../core/yat-corr.ts'

const forms = (w: string) => derive(w).candidates.map(c => c.form)
const cand = (w: string, f: string) => derive(w).candidates.find(c => c.form === f)

describe('DV-4 ѣ after j and hushing consonants', () => {
  it('DV-4 стояти, боятися, лежати: R09j gives а/я in the stative suffix, ahead of R09', () => {
    expect(cand('стоѣти', 'стояти')!.trace).toEqual(['R09j'])
    expect(cand('боѣтисѧ', 'боятися')!.trace).toEqual(['R02', 'R09j'])
    expect(forms('боѣти ся')).toContain('бояти ся')
    expect(cand('лежѣти', 'лежати')!.trace).toEqual(['R09j'])
    expect(cand('стоѣть', 'стоять')).toBeTruthy()
    expect(cand('кричѣти', 'кричати')).toBeTruthy(); expect(cand('чаѣти', 'чаяти')).toBeTruthy()
    expect(cand('лежѣлъ', 'лежав')).toBeTruthy()
    expect(RULES.findIndex(r => r.id === 'R09j')).toBeLessThan(RULES.findIndex(r => r.id === 'R09'))
  })
  it('DV-4 R09 stays for every other ѣ: видіти, жінка, поїсти, ліс; the rule is lexical (R09 branch kept for the lexicon to rank)', () => {
    expect(forms('видѣти')).toEqual(['видіти']); expect(forms('жѣнка')).toEqual(['жінка']); expect(forms('поѣсти')).toEqual(['поїсти']); expect(forms('лѣсъ')).toContain('ліс')
    expect(ruleById['R09j']!.scope).toBe('L'); expect(forms('стоѣти')).toContain('стоїти')
  })
  it('DV-4 R09j carries a verbatim cite (Wiktionary *stojati < *stojěti) and a research file', () => {
    expect(ruleById['R09j']!.cite.quote).toBe('From earlier *stojěti')
    expect(readFileSync('research/43-yat-after-j.md', 'utf8')).toContain('стая́ць')
  })
})

describe('DV-4 yat correspondences on cognate edges', () => {
  const ids = (uk: string, l: Parameters<typeof yatEdge>[1], w: string) => yatEdge(uk, l, w).map(r => r.id)
  it('DV-4 біл: ru бел, be бел, pl biał, cs bíl → YC-1; сіно/seno', () => {
    expect(ids('білий', 'ru', 'белый')).toContain('YC-1'); expect(ids('білий', 'be', 'белы')).toContain('YC-1')
    expect(ids('білий', 'pl', 'biały')).toContain('YC-1'); expect(ids('сіно', 'pl', 'siano')).toContain('YC-1')
  })
  it('DV-4 сидіти ~ be сядзець (YC-2), ru сидеть has no ѣ reflex row (и = и)', () => {
    expect(ids('сидіти', 'be', 'сядзе́ць')).toContain('YC-2'); expect(ids('сидіти', 'pl', 'siedzieć')).toContain('YC-2')
  })
  it('DV-4 стояти ~ ru стоять ~ be стаяць, лежати ~ be ляжаць: YC-3 (j / hushing), not YC-1', () => {
    expect(ids('стояти', 'be', 'стая́ць')).toContain('YC-3'); expect(ids('лежати', 'be', 'ляжа́ць')).toContain('YC-3'); expect(ids('лежати', 'ru', 'лежать')).toContain('YC-3')
    expect(ids('лежати', 'ru', 'лежать')).not.toContain('YC-1')
  })
  it('DV-4 unrelated words get no label; every row has a verbatim cite', () => {
    expect(yatEdge('вода', 'ru', 'вода')).toEqual([]); expect(yatEdge('стіл', 'ru', 'стол')).toEqual([])
    for (const r of YAT_CORR) { expect(r.cite.length, r.id).toBeGreaterThan(0); for (const c of r.cite) expect(c.quote.length, r.id).toBeGreaterThan(20) }
  })
  it('DV-4 the Відповідники panel shows the rule on the edge', () => {
    expect(readFileSync('src/components/CognatesPanel.vue', 'utf8')).toContain('yatEdge(')
  })
})
