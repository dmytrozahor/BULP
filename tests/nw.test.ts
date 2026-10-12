/**
 * SPEC 60 NW (W5) — new witnesses: every manifest unit has an admissible author whose vetting quote is a fetched Q (P-2.1),
 * and the vetting quote of each NW witness really occurs in the cached raw text (skipped without data/raw).
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { MANIFEST } from '../pipelines/manifest.ts'
import { AUTHORS, authorById, admissible } from '../pipelines/authors.ts'
import { toItem, catalogue } from '../pipelines/ingest-sophia.ts'

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

describe('NW-2 Київські глаголичні листки (TOROT kiev-mis) — chu, provenance disputed, last', () => {
  const u = MANIFEST.find(x => x.id === 'kiev-mis')!, a = authorById['kiev_missal_scribes']!
  it('unit is Church Slavonic (not the Rus\' redaction), CC BY-NC-SA, dated by a paraphrase', () => {
    expect(u).toMatchObject({ kind: 'torot', lang: 'chu', license: 'CC BY-NC-SA 3.0' }); expect(u.dateCite.kind).toBe('P')
  })
  it('author: provisional, disputed, both positions cited, Kyiv = depository only', () => {
    expect(a).toMatchObject({ status: 'provisional', confidence: 'disputed', label: 'institutional' })
    expect(a.evidence.filter(e => e.kind === 'Q')).toHaveLength(1)
    expect(a.evidence.map(e => e.quote).join(' ')).toMatch(/South Croatia[\s\S]*Czech patriots/)
    expect(a.evidence[0]!.quote).toMatch(/undetermined origin/); expect(a.note).toMatch(/місце зберігання/)
  })
})

describe('NW-6 Sophia graffiti — catalogue (metadata + IIIF links; texts are separate witnesses, tests/ingest-sophia.test.ts)', () => {
  const row = {
    published: true, id: 3859, title: '6140', position_on_surface: 'pct:79.77,24.15,8.66,4.19', panel: { title: '109-14', room: '109' },
    type_of_inscription: { text: 'Textual graffiti' }, language: { text: 'Polish' }, writing_system: { text: 'Latin' }, min_year: 1629, max_year: 1629,
    transcription: '<p>Ja byl 1629 Waw(rzyniec) Berezecki lowczy kyiowski.</p>', translation_ukr: '<p>Я був, Вавринець Бережецький, ловчий київський.</p>', comments_ukr: 'коментар',
    inscription_iiif_url: 'https://img.dh.gu.se/saintsophia/static/inscriptions/iiif/3372fd6b-2dff-42cd-b047-2f387d0e58c0.tif/pct:79.77,24.15,8.66,4.19/',
    author: [{ firstname: 'Viacheslav', lastname: 'Korniienko' }],
  }
  it('keeps descriptive fields, the IIIF link and the portal viewer link', () => {
    expect(toItem(row)).toEqual({
      id: 3859, title: '6140', panel: '109-14', room: '109', type: 'Textual graffiti', lang: 'Polish', script: 'Latin', from: 1629, to: 1629,
      iiif: row.inscription_iiif_url, viewer: 'https://saintsophia.dh.gu.se/viewer/?q=109-14/3859', author: 'Viacheslav Korniienko',
    })
  })
  it('never carries transcription / translation / comment text', () => {
    expect(JSON.stringify(toItem(row))).not.toMatch(/Waw|Вавринець|коментар/)
    expect(toItem({ ...row, published: false })).toBeUndefined()
  })
  it('catalogue states the licence situation', () => {
    const c = catalogue([[row, { ...row, id: 1 }]], '2026-10-12')
    expect(c.items.map(i => i.id)).toEqual([1, 3859])
    expect(c.licence.images).toMatch(/CC BY-NC/); expect(c.licence.text).toMatch(/не вказано/)
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
