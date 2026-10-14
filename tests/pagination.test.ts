import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { KWIC_PAGE, PAGE_SIZE, pageCount, pageSlice, pageWindow, parsePage } from '../src/lib/page.ts'
import { analyzeTarget } from '../src/lib/analyze-links.ts'
import { key } from '../core/text.ts'

const rd = (p: string) => readFileSync(p, 'utf8')

describe('NV-1 pagination', () => {
  it('NV-1 page size is 50 (KWIC 20) and slices are exact', () => {
    expect(PAGE_SIZE).toBe(50); expect(KWIC_PAGE).toBe(20)
    const all = Array.from({ length: 120 }, (_, i) => i)
    expect(pageCount(120)).toBe(3); expect(pageCount(0)).toBe(1)
    expect(pageSlice(all, 1)).toHaveLength(50); expect(pageSlice(all, 3)).toEqual(all.slice(100))
  })
  it('NV-1 ?p= is clamped: junk, zero, negative and too large fall back into 1..pages', () => {
    expect(parsePage(undefined, 5)).toBe(1); expect(parsePage('abc', 5)).toBe(1); expect(parsePage('0', 5)).toBe(1)
    expect(parsePage('-3', 5)).toBe(1); expect(parsePage('99', 5)).toBe(5); expect(parsePage('3', 5)).toBe(3); expect(parsePage(['2'], 5)).toBe(2)
  })
  it('NV-1 the control window is «‹ 1 2 3 … 9 ›»: first, last and neighbours, gaps as …', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(1, 9)).toEqual([1, 2, '…', 9])
    expect(pageWindow(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9])
    expect(pageWindow(9, 9)).toEqual([1, '…', 8, 9])
  })
  it('NV-1 every long list uses the shared Pagination and the page lives in the URL (?p=)', () => {
    expect(rd('src/composables/usePage.ts')).toMatch(/route\.query\[qkey\]/)
    for (const f of ['PhrasesView', 'TextsView', 'RuleFormsView', 'SearchView']) {
      const v = rd(`src/views/${f}.vue`)
      expect(v, f).toMatch(/import Pagination from/); expect(v, f).toMatch(/usePage\(/); expect(v, f).toMatch(/<Pagination /)
    }
    const k = rd('src/components/Kwic.vue')
    expect(k).toMatch(/KWIC_PAGE/); expect(k).toMatch(/<Pagination /)
  })
  it('NV-1 the pager is mobile-friendly: wraps in a row and the controls are buttons with aria labels', () => {
    const c = rd('src/components/Pagination.vue')
    expect(c).toMatch(/class="pager row/); expect(c).toMatch(/aria-label="Сторінки"/); expect(c).toMatch(/aria-current/)
  })
})

describe('NV-2 analyser links', () => {
  const lemmas = new Set(['нігде', 'ніде'])
  const idx = new Map<string, { lemma: string; via: string }[]>([[key('нігді'), [{ lemma: 'нігде', via: 'form' }]], [key('ніде'), [{ lemma: 'ніде', via: 'lemma' }]]])
  const ctx = { lemmas, hits: idx, light: new Set(['рідкість']) }
  it('NV-2 a lemma of the lexicon → /w/:lemma', () => { expect(analyzeTarget('ніде', ctx)).toBe('/w/%D0%BD%D1%96%D0%B4%D0%B5') })
  it('NV-2 a spelling the lexicon attests → /f/:form?lemma=', () => { expect(analyzeTarget('нігді', ctx)).toBe(`/f/${encodeURIComponent('нігді')}?lemma=${encodeURIComponent('нігде')}`) })
  it('NV-2 a rare VESUM lemma → /lw/:lemma, anything else → /f/:form (never a dead end)', () => {
    expect(analyzeTarget('рідкість', ctx)).toBe(`/lw/${encodeURIComponent('рідкість')}`)
    expect(analyzeTarget('нѣгдѣ', ctx)).toBe(`/f/${encodeURIComponent('нѣгдѣ')}`)
  })
  it('NV-2 «Аналіз слова» links the input, the normalised form, each candidate and each chain stage', () => {
    const v = rd('src/views/AnalyzeView.vue')
    expect(v).toMatch(/formTo\(word\)/); expect(v).toMatch(/to\(d\.norm\)/); expect(v).toMatch(/to\(c\.form\)/); expect(v).toMatch(/to\(s\.from\)/); expect(v).toMatch(/to\(s\.to\)/)
    expect(v).toMatch(/сторінка слова/)
  })
})
