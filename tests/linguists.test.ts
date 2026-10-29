/** SPEC 63 SRC-5 (research/48): harvest/linguists.ts work list, file resolution, Russian flag, public-domain rule. */
import { describe, it, expect } from 'vitest'
import { LINGUIST_WORKS, item, pickTextFile, edition, LINGUISTS_UA } from '../harvest/linguists.ts'
import { ruOfWitness } from '../core/ru-source.ts'

describe('SRC-5 linguists harvest', () => {
  it('SRC-5 every work is a curated archive.org id with author, print year, death year (or an explicit unknown) and a source of the death year', () => {
    const ids = new Set<string>()
    for (const w of LINGUIST_WORKS) {
      expect(ids.has(w.ia), w.ia).toBe(false); ids.add(w.ia)
      expect(w.author.length).toBeGreaterThan(3); expect(w.year).toBeGreaterThan(1700); expect(w.deathSource.length).toBeGreaterThan(10)
      if (w.authorDeath !== null) expect(w.authorDeath, w.ia).toBeLessThanOrEqual(1955)
    }
    expect(LINGUIST_WORKS.length).toBeGreaterThanOrEqual(30)
  })
  it('SRC-5 the index line carries genre «лінгвістична праця», author, year, edition, the ia file and the explicit ru flag', () => {
    const w = LINGUIST_WORKS.find(x => x.ia === 'potebnia5')!
    const i = item(w, 'https://archive.org/details/potebnia5', 10, 200, 'potebnia5_djvu.txt')
    expect(i.genre).toBe('лінгвістична праця'); expect(i.date).toBe('1887'); expect(i.iaFile).toBe('potebnia5_djvu.txt')
    expect((i.ru as { kind: string }).kind).toBe('apparatus'); expect(i.edition).toContain('Харьковъ')
    expect(edition(LINGUIST_WORKS.find(x => x.ia === 'nar1932')!)).toContain('не зазначено')   // a place that no opened source states is never invented
  })
  it('SRC-5 the text file is resolved from the item metadata (the largest *_djvu.txt), not guessed as <id>_djvu.txt', () => {
    expect(pickTextFile([{ name: 'a.pdf' }, { name: 'Hrammatyka_1818_djvu.txt', size: '172115' }, { name: 'x_djvu.txt', size: '5' }])).toBe('Hrammatyka_1818_djvu.txt')
    expect(pickTextFile([{ name: 'a.pdf' }])).toBeNull()
  })
  it('SRC-5 the explicit ru flag wins in ruOfWitness; the user agent has no e-mail address', () => {
    const w = LINGUIST_WORKS.find(x => x.ru)!
    expect(ruOfWitness({ id: 'x', title: 'y', edition: 'z', ru: w.ru! })?.kind).toBe(w.ru!.kind)
    expect(LINGUISTS_UA).not.toMatch(/@/)
  })
})
