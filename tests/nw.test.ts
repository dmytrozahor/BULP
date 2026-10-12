/**
 * SPEC 60 NW (W5) — new witnesses: every manifest unit has an admissible author whose vetting quote is a fetched Q (P-2.1),
 * and the vetting quote of each NW witness really occurs in the cached raw text (skipped without data/raw).
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { MANIFEST } from '../pipelines/manifest.ts'
import { AUTHORS, authorById, admissible } from '../pipelines/authors.ts'

describe('NW manifest/author consistency (P-2)', () => {
  it('every unit has a vetted/provisional author record', () => {
    for (const u of MANIFEST) expect(admissible(authorById[u.author]), `${u.id} → ${u.author}`).toBe(true)
  })
  it('author ids are unique and every record with evidence has a Q quote', () => {
    expect(new Set(AUTHORS.map(a => a.id)).size).toBe(AUTHORS.length)
    for (const a of AUTHORS) if (a.evidence.length && a.status === 'vetted') expect(a.evidence.some(e => e.kind === 'Q'), a.id).toBe(true)
  })
  it('unit ids are unique', () => expect(new Set(MANIFEST.map(u => u.id)).size).toBe(MANIFEST.length))
})

const rawDir = (kind: string, id: string) => `data/raw/${kind}/${id}`
const rawText = (kind: string, id: string, enc: string = 'utf-8') => {
  const d = rawDir(kind, id)
  return existsSync(d) ? readdirSync(d).filter(n => /^\d{3}\./.test(n)).sort().map(n => new TextDecoder(enc).decode(readFileSync(`${d}/${n}`))).join('\n') : undefined
}

describe('NW-1 Слово (TOROT spi)', () => {
  it('institutional author vetted by the cit. 32 quote', () => {
    const a = authorById['slovo_author']!
    expect(a.label).toBe('institutional'); expect(a.status).toBe('vetted')
    expect(a.evidence[0]!.quote).toBe('О Руская земле! Уже за шеломянемъ еси!')
  })
  const xml = rawText('torot', 'spi')
  it.skipIf(!xml)('the quoted tokens occur in citation-part 32 of the raw spi.xml', () => {
    const forms = [...xml!.matchAll(/<token [^>]*form="([^"]*)"[^>]*citation-part="32"/g)].map(m => m[1])
    expect(forms.slice(0, 7).join(' ')).toBe('О Руская земле Уже за шеломянемъ еси')
  })
  it('manifest unit: orv, first_ed 1800 flag, CC BY-NC-SA licence shown (P-4.4)', () => {
    const u = MANIFEST.find(x => x.id === 'spi')!
    expect(u).toMatchObject({ kind: 'torot', lang: 'orv', witnessType: 'first_ed', msDate: 1800, license: 'CC BY-NC-SA 3.0' })
  })
})

describe('NW-3 Кочубей — excluded without a self-identification quote (P-2.1)', () => {
  it('author record is excluded, carries no evidence and has no manifest unit', () => {
    const a = authorById['kochubei']!
    expect(a.status).toBe('excluded'); expect(a.evidence).toEqual([]); expect(admissible(a)).toBe(false)
    expect(MANIFEST.some(u => u.author === 'kochubei')).toBe(false)
  })
  const txt = rawText('archive', 'kochubei')
  it.skipIf(!txt)('the cached pp. 97–99 carry the signature and no «малороссиянин»-type self-name', () => {
    const i = txt!.indexOf('Нынѣ убо мы, подліи'), j = txt!.indexOf('Василій Кочюбей, Судіа', i)
    expect(i).toBeGreaterThan(0); expect(j).toBeGreaterThan(i)
    const pp = txt!.slice(txt!.lastIndexOf('РѢЧЬ КОЧУБЕЯ КЪ ГОСУДАРЮ', i), j)
    expect(/малороссіянин|малоросс?іяне|мы\s+(?:русс|малорус)/i.test(pp)).toBe(false)
  })
})
