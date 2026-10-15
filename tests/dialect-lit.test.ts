import { describe, it, expect } from 'vitest'
import { splitSpeech } from '../pipelines/ingest-wikisource.ts'
import { parseSigned } from '../pipelines/ingest-iaocr.ts'
import { UNITS_DL, AUTHORS_DL } from '../pipelines/nw-dl.ts'

const par = (lines: string[]) => `<PARAGRAPH>${lines.map(l => `<LINE>${l.split(' ').map(w => `<WORD>${w}</WORD>`).join('')}</LINE>`).join('')}</PARAGRAPH>`
describe('CX-9 speech / narration split', () => {
  it('dash-led paragraph: speech, the author\'s remark, speech again', () => {
    const r = splitSpeech('— Тату, ми хочемо істи, — сказала старша. — Дай хліба.')
    expect(r.speech).toEqual(['Тату, ми хочемо істи,', 'Дай хліба.'])
    expect(r.narr).toEqual(['сказала старша.'])
  })
  it('a dash in narration opens speech only after a colon; quoted spans are speech', () => {
    expect(splitSpeech('Він сказав: — Не піду.')).toEqual({ speech: ['Не піду.'], narr: ['Він сказав:'] })
    const n = splitSpeech('Був вечір — тихий і теплий.')
    expect(n.speech).toEqual([]); expect(n.narr.join(' ')).toBe('Був вечір тихий і теплий.')
    const q = splitSpeech('Гриць сказав: „Злізайте з печі“ і пішов.')
    expect(q.speech).toContain('Злізайте з печі')
  })
})
describe('CX-9 signed records (ЕЗ т. 26)', () => {
  it('keeps only the records signed by the collector; others, footnotes and titles are apparatus', () => {
    const xml = `<DJVU><OBJECT>${par(['Львів, 6. V. 1910.'])}${par(['1. Перший запис.'])}${par(['Ек було давно, шо', 'гуцул ходив.'])}${par(['Зап. у Головах, 1907, Петро Шекерик-Доників.'])}` +
      `${par(['2. Чужий запис.'])}${par(['Чужий текст тут.'])}${par(['Зап. у Косові, 1907, Іван Іванів.'])}${par(['*) Gloss pояснення.'])}</OBJECT></DJVU>`
    const r = parseSigned(xml, { pages: [{ leafNum: 0, pageNumber: '5' }] }, 'Т', { signer: /Шекер/, start: /^Львів, 6/ })
    expect(r.records).toBe(1)
    expect(r.tokens.map(t => t.raw)).toEqual(['Ек', 'було', 'давно', 'шо', 'гуцул', 'ходив'])
    expect(r.tokens[0]!.loc).toBe('Т, с. 5 (OCR)')
  })
})
describe('CX-9 dialect statements (SPEC 00: user claim is a hypothesis, a label needs a quote)', () => {
  it('every unit carries the user\'s statement as a hypothesis; every sourced statement has a verbatim quote and a locator', () => {
    for (const u of UNITS_DL) {
      const hy = u.dialect!.filter(d => d.status === 'hypothesis')
      expect(hy.length, u.id).toBeGreaterThan(0)
      for (const h of hy) { expect(h.author).toBe('user'); expect(h.date).toBe('2026-10-15'); expect(h.said).toBeTruthy() }
      for (const s of u.dialect!.filter(d => d.status === 'sourced')) {
        expect(s.evidence.length, u.id).toBeGreaterThan(0)
        for (const e of s.evidence) { expect(e.quote.length).toBeGreaterThan(10); expect(e.locator).toBeTruthy(); expect(e.kind).toBe('Q') }
      }
    }
  })
  it('Cheremshyna: the sourced label (HUT) differs from the user\'s hypothesis (PKB); the Rusalka has no label', () => {
    const c = UNITS_DL.find(u => u.id === 'cheremshyna1940')!
    expect(c.dialect!.filter(d => d.status === 'sourced').map(d => d.group)).toEqual(['HUT'])
    expect(c.dialect!.filter(d => d.status === 'hypothesis').map(d => d.group)).toEqual(['PKB'])
    expect(UNITS_DL.find(u => u.id === 'rusalka1837')!.dialect!.some(d => d.status === 'sourced')).toBe(false)
  })
  it('each unit\'s author is defined and admissible (P-2.2)', () => {
    for (const u of UNITS_DL) { const a = AUTHORS_DL.find(a => a.id === u.author); expect(a, u.id).toBeTruthy(); expect(['vetted', 'provisional']).toContain(a!.status); expect(a!.evidence.length).toBeGreaterThan(0) }
  })
})
