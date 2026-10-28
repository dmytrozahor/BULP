import { describe, it, expect } from 'vitest'
const ub = await import('../harvest/user-books.ts')
const ing = await import('../pipelines/ingest-harvest.ts')

describe('UB-1 user-books: «Ad fontes» (Медведик 2015), a modern scholarly book, vocabulary only', () => {
  const raw = ['Ukrainian and polish sacred songs in honour of', 'Піснь різдвяна співалася в Почаєві та в Мукачівській єпархії.', 'Современные немецкие исследования, которые это показывают', '12', 'Сліпучі пісні й рукописні співаники XVIII ст. збері-', 'галися у Львові.', 'Z dziejów ukraińskiej pieśni religijnej'].join('\n')
  it('UB-1 gate: Latin-script and Russian lines and bare page numbers dropped, line-end hyphens joined, Ukrainian prose kept', () => {
    const c = ub.cleanBook(raw)
    expect(c.text.split('\n')).toEqual(['Піснь різдвяна співалася в Почаєві та в Мукачівській єпархії.', 'Сліпучі пісні й рукописні співаники XVIII ст. зберігалися у Львові.'])
    expect(c.kept).toBeLessThan(c.letters)
  })
  it('UB-1 vocabulary counted by the shared countText; parts are resumable chunks that keep every line', () => {
    const c = ub.cleanBook(raw), f = ing.countText(c.text)
    expect(f['пісні']).toBe(1); expect(f['зберігалися']).toBe(1)
    const long = Array.from({ length: 50 }, (_, i) => `рядок номер ${i} про співаники`).join('\n')
    const parts = ub.splitParts(long, 300)
    expect(parts.length).toBeGreaterThan(2); expect(parts.join('').replace(/\n/g, '\n')).toBe(long + '\n')
  })
  it('UB-1 item metadata: 2015, Львів → Галичина, copyright licence, vocab-only, scholarly witness, no ru flag (modern Ukrainian edition)', () => {
    const it0 = ub.partItem(ub.ADFONTES, 3, 22, 100, 'file:///x')
    expect(it0.id).toBe('user-books:adfontes:3'); expect(it0.date).toBe('2015'); expect(it0.region).toBe('Галичина')
    expect(it0.licence).toMatch(/^©.*vocab-only/); expect(it0.vocabOnly).toBe(true); expect(it0.witnessType).toBe('scholarly'); expect(it0.author).toBe('Юрій Медведик')
    expect(ub.ADFONTES.editionNote).toMatch(/ISBN 978-617-10-0027-8/); expect(JSON.stringify(ub.ADFONTES)).not.toMatch(/"ru"/)
  })
})
