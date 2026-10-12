/** SPEC 60 HT-1…HT-3 (core/heteronyms.ts, HeteronymReadings) — research/25. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { HETERONYMS, HT_UNVERIFIED, heteronymOf, st, unverifiedOf, stressedList } from '../core/heteronyms.ts'
import { SOURCES } from '../core/sources.ts'

const VOWELS = /[аеєиіїоуюя]/
const rd = (f: string) => readFileSync(f, 'utf8')

describe('HT-1 Heteronym record', () => {
  it('st() puts the stress after the marked vowel and records the vowel index', () => {
    expect(st('за^мок')).toEqual({ form: 'замок', positions: [1], stressed: 'за́мок' })
    expect(st('замо^к').positions).toEqual([3])
  })
  it('every heteronym has ≥ 2 readings with distinct stress, a vowel at each position, and evidence on each reading', () => {
    expect(HETERONYMS.length).toBeGreaterThan(30)
    for (const h of HETERONYMS) {
      expect(h.readings.length, h.form).toBeGreaterThanOrEqual(2)
      expect(new Set(h.readings.map(r => r.positions.join())).size, h.form).toBe(h.readings.length)
      for (const r of h.readings) {
        expect(r.positions.length, r.stressed).toBe(1)
        expect(r.stressed.normalize('NFC').replace(/[́]/g, ''), r.stressed).toBe(h.form)
        expect(VOWELS.test(h.form[r.positions[0]!]!), r.stressed).toBe(true)
        expect(r.evidence.length, r.stressed).toBeGreaterThan(0)
        for (const e of r.evidence) { expect(SOURCES[e.source], e.source).toBeTruthy(); expect(e.locator).toBeTruthy(); expect(e.quote.length).toBeGreaterThan(3) }
      }
    }
  })
  it('СУМ-20-verified pairs carry Q quotes; Wikipedia-only pairs are P (research/25 §2a, §3)', () => {
    for (const w of ['замок', 'обід', 'приклад', 'мука', 'броня', 'атлас', 'виходити', 'насипати', 'перевозити']) {
      const h = heteronymOf(w)!; expect(h.confidence, w).toBe('Q')
      for (const r of h.readings) expect(r.evidence.every(e => e.kind === 'Q' && e.source === 'SUM20'), w).toBe(true)
    }
    const g = heteronymOf('город')!; expect(g.confidence).toBe('P'); expect(g.readings[0]!.evidence[0]!.kind).toBe('P'); expect(g.readings[0]!.evidence[0]!.source).toBe('WPUK')
  })
  it('lookup ignores stress marks, case and apostrophe style; за́мок / замо́к', () => {
    expect(stressedList(heteronymOf('Замок')!)).toBe('замо́к / за́мок')
    expect(heteronymOf('замо́к')!.form).toBe('замок')
    expect(heteronymOf('сім’я')!.readings.length).toBe(2)
  })
  it('three reading kinds are kept apart: lexeme (замок), aspect partner (перевозити), inflected form (руки)', () => {
    expect(heteronymOf('замок')!.readings.every(r => r.kind === 'lexeme')).toBe(true)
    const pv = heteronymOf('перевозити')!.readings; expect(pv.every(r => r.kind === 'aspect-partner')).toBe(true); expect(pv.map(r => r.aspect).sort()).toEqual(['ipf', 'pf'])
    expect(heteronymOf('руки')!.readings.every(r => r.kind === 'inflected-form')).toBe(true)
  })
  it('о́бід / обі́д coincide only in Nom/Acc (cases scope)', () => {
    expect(heteronymOf('обід')!.readings.every(r => r.cases?.join() === 'nom,acc')).toBe(true)
  })
  it('a free variant (за́вжди́) is not a heteronym', () => { expect(heteronymOf('завжди')).toBeUndefined() })
})

describe('HT-2 surfaces', () => {
  it('HeteronymReadings is in the word card, the word view, and the annotator flags heteronyms «наголос розрізняє значення»', () => {
    const c = rd('src/components/HeteronymReadings.vue'); expect(c).toContain('Наголос і значення'); expect(c).toContain('READING_KIND_UK')
    expect(rd('src/components/WordCard.vue')).toContain('<HeteronymReadings'); expect(rd('src/views/WordView.vue')).toContain('<HeteronymReadings')
    const a = rd('src/views/AnnotateView.vue'); expect(a).toContain('HETERONYM_FLAG'); expect(a).toContain("'het'")
    expect(rd('core/heteronyms.ts')).toContain("'наголос розрізняє значення'")
  })
})

describe('HT-3 послуха́тися stays [U]', () => {
  it('is not a heteronym and not a reading; the unverified assertion and the one dictionary stress are both recorded', () => {
    expect(heteronymOf('послухатися')).toBeUndefined()
    for (const h of HETERONYMS) for (const r of h.readings) expect(r.stressed.includes('послуха́тися')).toBe(false)
    const u = unverifiedOf('послухатися')!
    expect(u.status).toBe('U'); expect(u.asserted).toBe('послуха́тися'); expect(u.known[0]!.kind).toBe('Q'); expect(u.known[0]!.quote.replace(/́/g, '')).toContain('ПОСЛУХАТИСЯ')
    expect(HT_UNVERIFIED).toHaveLength(1)
  })
  it('the card says [U] and that a reading is added only on a user-supplied source', () => {
    expect(unverifiedOf('послухатися')!.note).toContain('лише за джерелом від користувача')
    expect(rd('src/components/HeteronymReadings.vue')).toContain('[U] не підтверджено')
  })
})
