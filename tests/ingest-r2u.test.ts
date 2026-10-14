import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseSearch, wordList, parseCell, R2U_DICTS, r2uQueryUrl } from '../pipelines/r2u.ts'
import { r2uWitness, tokenRaw, type StoredRow } from '../pipelines/ingest-r2u.ts'
import { UNITS_R2U, AUTHORS_R2U } from '../pipelines/nw-r2u.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'
import { fold, foldById } from '../core/orthography.ts'
import { buildR2u } from '../pipelines/build-r2u.ts'
import { SOURCES } from '../core/sources.ts'

// tests/fixtures/r2u-markup.html is HAND-WRITTEN in the portal's markup (no r2u.org.ua page was kept: robots.txt disallows /s, research/30 §1)
const rows = parseSearch(readFileSync(new URL('./fixtures/r2u-markup.html', import.meta.url), 'utf8'))
const row = (dict: number) => rows.find(r => r.dict === dict)!

describe('r2u parser (research/30 §4)', () => {
  it('reads every fixture cell', () => expect(rows.map(r => `${r.dict}_${r.rowId}`)).toEqual(['9_1', '8_1', '12_1', '1_1']))

  it('Уманець–Спілка: «Вы́глядѣть» = видава́ти ся, здава́ти ся → reflexives joined with «-ся», spelling kept', () => {
    const r = row(9)
    expect(r.head).toEqual(['Вы́глядѣ́ть'])
    expect(r.eq).toEqual(['видава́ти-ся', 'здава́ти-ся'])
    expect(r.text).toContain('видава́ти ся, здава́ти ся')
    expect(r.text.length).toBeLessThanOrEqual(300)
  })

  it('Ніковський: Ukrainian headwords, Russian glosses from the first Russian run of each sense', () => {
    const n = row(8)
    expect(n.head).toEqual(['Вигляда́ти', 'ви́глянути'])
    expect(n.eq).toEqual(['выглядывать', 'выглянуть', 'выглядеть'])
    expect(n.text).toContain('(несов. в.) выглядеть')
  })

  it('Грінченко layout: endings dropped, source sigla («Ном. № 1.») are not glosses', () => {
    const h = row(12)
    expect(h.head).toEqual(['Приклад', 'при́кладка'])
    expect(h.eq).toEqual(['Пример', 'образец'])
  })

  it('Кримський layout: equivalents only; example quotations and the phraseology after «•» are not read', () => {
    expect(row(1).eq).toEqual(['при́клад', 'зразо́к'])
  })

  it('wordList: phrases, bracketed labels and endings never become tokens', () => {
    expect(wordList('вигляда́ти, -да́ю, -да́єш; ви́глянути, -ну')).toEqual(['вигляда́ти', 'ви́глянути'])
    expect(wordList('акредитувати, -ся')).toEqual(['акредитувати', 'акредитувати-ся'])
    expect(wordList('мати вигляд, (розм.) виглядати')).toEqual(['виглядати'])
    expect(parseCell(99, 1, '<span class="KrymRusBold">х</span>')).toBeNull()
  })

  it('query url shape (documentation only; the project never calls it)', () => {
    expect(r2uQueryUrl('выглядеть', 'rusb')).toBe('https://r2u.org.ua/s?w=%D0%B2%D1%8B%D0%B3%D0%BB%D1%8F%D0%B4%D0%B5%D1%82%D1%8C&scope=rusb&dicts=all')
  })
})

describe('r2u witnesses and folds', () => {
  const stored: StoredRow[] = rows.map(r => ({ ...r, q: 'виглядати', scope: 'ukr' }))
  const um = UNITS_R2U.find(u => u.id === 'r2u_umanets')!

  it('every dictionary is a dated `dictionary` witness by an admissible author, with a cited date', () => {
    expect(UNITS_R2U.map(u => u.id).sort()).toEqual(R2U_DICTS.map(d => d.unitId).sort())
    for (const u of UNITS_R2U) {
      expect(u.witnessType).toBe('dictionary'); expect(u.kind).toBe('r2u')
      expect(u.dateCite.kind).toBe('Q'); expect(SOURCES[u.dateCite.source]).toBeTruthy()
      expect(admit({ id: u.id, author: u.author }, authorById[u.author])).toEqual({ ok: true })
    }
    expect(um.date).toEqual([1893, 1898])
    expect(UNITS_R2U.find(u => u.id === 'r2u_nikovsky')!.date).toEqual([1927, 1927])
    expect(AUTHORS_R2U.length).toBe(R2U_DICTS.length - 1)
  })

  it('Уманець tokens = the Ukrainian equivalents (raw spelling), noFreq; Ніковський tokens = its headwords', () => {
    const w = r2uWitness(um, 9, stored)
    expect(w.noFreq).toBe(true); expect(w.witnessType).toBe('dictionary'); expect(w.orth).toBe('желехівка')
    expect(w.tokens.map(t => t.raw)).toEqual(['видавати-ся', 'здавати-ся'])
    expect(w.tokens[1]!.loc).toMatch(/^r2u Уманець–Спілка · s\?w=виглядати#9_1: Вы́глядѣ́ть = /)
    expect(r2uWitness(UNITS_R2U.find(u => u.id === 'r2u_nikovsky')!, 8, stored).tokens.map(t => t.raw)).toEqual(['виглядати', 'виглянути'])
  })

  it('ORTH-SYA: the joined reflexive is folded to the modern postfix; ї→і of Желехівка still branches', () => {
    expect(foldById['ORTH-SYA']!.cite.kind).toBe('Q')
    expect(fold('видавати-ся', 'желехівка').map(c => c.form)).toContain('видаватися')
    expect(fold('виднїти-ся', 'желехівка').map(c => c.form)).toEqual(expect.arrayContaining(['виднітися']))
    expect(fold('видавати-ся', 'r2u')[0]!.form).toBe('видаватися')
    expect(tokenRaw('Здава́ти-ся')).toBe('здавати-ся')
  })

  it('r2u.json: lemma → the Russian headwords whose equivalents contain it; quotes ≤ 300', () => {
    const f = buildR2u({ format: 1, lookups: 1, queried: [], rows: stored }, ['видаватися', 'здаватися', 'приклад'], '2026-10-14')
    expect(Object.keys(f.by).sort()).toEqual(['видаватися', 'здаватися', 'приклад'])
    expect(f.by['видаватися']!.map(i => f.rows[i]![4][0])).toEqual(['Вы́глядѣ́ть'])
    expect(f.rows.every(r => r[6].length <= 300)).toBe(true)
    expect(f.source.licence).toMatch(/не вказана/)
  })
})
