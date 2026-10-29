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

import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { pickTextFile as pick2, retryCandidates, IA_UA } from '../harvest/ia-text.ts'
import { docItem, ARCHIVE_PRESETS } from '../harvest/archive.ts'

describe('HV-n archive 404 retry', () => {
  it('text file from /metadata: DjVuTXT first (largest), else plain Text .txt, else null (stays 404)', () => {
    expect(pick2([{ name: 'a.pdf', format: 'Text PDF' }, { name: 'Real_Name_djvu.txt', format: 'DjVuTXT', size: '900' }, { name: 'o_djvu.txt', size: '5' }])).toBe('Real_Name_djvu.txt')
    expect(pick2([{ name: 'a.pdf', format: 'Text PDF' }, { name: 'book.txt', format: 'Text', size: '10' }, { name: 'x_meta.txt', format: 'Text', size: '99' }])).toBe('book.txt')
    expect(pick2([{ name: 'a.pdf', format: 'Text PDF' }, { name: 'a_meta.xml', format: 'Metadata' }])).toBeNull()
  })
  it('retry candidates: only the latest status-404 lines, a retried or resolved id is skipped (idempotent)', () => {
    const L = (o: object) => JSON.stringify(o)
    const lines = [L({ id: 'a', status: 404 }), L({ id: 'b', status: 200 }), L({ id: 'c', status: 404 }), L({ id: 'c', status: 200 }), L({ id: 'd', status: 404 }), L({ id: 'd', status: 404, retried404: true }), '{torn']
    expect(retryCandidates(lines).map(x => x.id)).toEqual(['a'])
  })
  it('the user agent has no e-mail; the stored 404 line keeps the item fields for the retry', () => {
    expect(IA_UA).not.toMatch(/@/)
    const it = docItem({ identifier: 'q', title: 'T', date: '1900' }, ARCHIVE_PRESETS['archive-ukr']!, 0, 404)
    expect(it.status).toBe(404); expect(it.date).toBe('1900')
  })
})
