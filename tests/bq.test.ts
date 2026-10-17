/** SPEC 63 BQ-2..BQ-4: issue parsing, triage, duplicates, approval queue, rejection reasons. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  parseSections, parseBook, parseList, kindOf, licenceKind, ingestMode, parseYears, knownFrom, triageBooks, triageComment,
  parseRowCommands, applyRowCommands, readState, stateComment, allResolved, queueItem, appendQueue, rejectionReason, BOT_MARK,
} from '../core/bq.ts'

const BOOK = `### Title / Назва

Граматика словенска

### Author / Автор

Мелетій Смотрицький

### Year or year range / Рік або діапазон років

1619

### Epoch (after Shevelov) / Епоха (за Шевельовим)

Middle Ukrainian (1575-1719) / середньоукраїнська доба

### Language / variety / Мова / різновид

Church Slavonic / церковнослов'янська

### Region / dialect group / Регіон / діалектна група

_No response_

### Link to the text or scan / Посилання на текст або скан

https://example.org/smotrytsky.pdf

### Licence / status / Ліцензія / статус

public domain / суспільне надбання

### Licence details (optional) / Деталі ліцензії (необов'язково)

_No response_
`
const LIST = `### List name / Назва переліку

Grammars

### Default epoch / Епоха за замовчуванням

Middle Ukrainian (1575-1719) / середньоукраїнська доба

### Default licence / Ліцензія за замовчуванням

public domain / суспільне надбання

### Books

title | author | year or range | url | epoch | language | region | school | genre | licence | tags
Буквар | Іван Федоров | 1574 | https://example.org/bukvar | | | | | | |
Граматика | | 1591 | https://example.org/gramatyka | | | | | | under copyright / під авторським правом |
Без дати | | soon | https://example.org/x | | | | | | |
`
const none = knownFrom([])

describe('BQ-2 parsing and triage', () => {
  it('parses issue-form sections, «No response» is empty', () => {
    const s = parseSections(BOOK)
    expect(s['title']).toBe('Граматика словенска')
    expect(s['region']).toBe('')
  })
  it('parses a book issue', () => {
    const b = parseBook(BOOK)
    expect(b).toMatchObject({ title: 'Граматика словенска', years: '1619', epoch: 'Middle Ukrainian', links: ['https://example.org/smotrytsky.pdf'] })
    expect(ingestMode(b.licence)).toBe('fulltext')
  })
  it('parses list rows with defaults and skips the header', () => {
    const { name, rows } = parseList(LIST)
    expect(name).toBe('Grammars'); expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ title: 'Буквар', epoch: 'Middle Ukrainian', licence: expect.stringContaining('public domain') })
    expect(rows[1]!.licence).toContain('under copyright')
  })
  it('accepts a CSV row', () => {
    const { rows } = parseList(`### Books\n\ntitle,author,year,url\n"Буквар, 1574",,1574,https://e.org/b\n`)
    expect(rows[0]).toMatchObject({ title: 'Буквар, 1574', years: '1574' })
  })
  it('kind from labels', () => { expect(kindOf(['book', 'proposal', 'list'])).toBe('list'); expect(kindOf(['book'])).toBe('book'); expect(kindOf(['proposal'])).toBe('proposal') })
  it('years: only stated years or ranges', () => {
    expect(parseYears('1380-1400')).toEqual({ from: 1380, to: 1400 }); expect(parseYears('unknown')).toBe('unknown')
    expect(parseYears('around 1600')).toBeNull(); expect(parseYears('1400-1380')).toBeNull()
  })
  it('licences: copyright and share-alike are vocabulary only', () => {
    expect(licenceKind('public domain / суспільне надбання')).toBe('public-domain')
    expect(ingestMode('CC (give the version below)', 'CC BY-SA 4.0')).toBe('vocab-only')
    expect(ingestMode('CC (give the version below)', 'CC BY 4.0')).toBe('fulltext')
    expect(ingestMode('under copyright / під авторським правом')).toBe('vocab-only')
    expect(ingestMode('unknown / не знаю')).toBe('vocab-only')
  })
  it('flags invalid fields, duplicates by url and title, dead links, robots', () => {
    const kn = knownFrom([`x: { title: 'Букварь', url: 'https://www.Example.org/bukvar/' }`])
    const rows = triageBooks(parseList(LIST).rows, kn, { linkStatus: { 'https://example.org/gramatyka': 404 }, robotsBlocked: ['example.org'] })
    expect(rows[0]!.status).toBe('duplicate')
    expect(rows[1]!.status).toBe('warn'); expect(rows[1]!.mode).toBe('vocab-only')
    expect(rows[1]!.findings.map(f => f.code)).toEqual(expect.arrayContaining(['link-status', 'robots']))
    expect(rows[2]!.status).toBe('invalid'); expect(rows[2]!.findings[0]!.code).toBe('bad-year')
    expect(triageBooks([{ ...parseBook(BOOK), title: 'букварь' }], kn)[0]!.status).toBe('duplicate')
  })
  it('flags a url listed twice in one issue and missing link/licence', () => {
    const b = parseBook(BOOK)
    expect(triageBooks([b, b], none)[1]!.findings.some(f => f.code === 'duplicate-url')).toBe(true)
    const r = triageBooks([{ ...b, links: [], licence: '' }], none)[0]!
    expect(r.findings.map(f => f.code)).toEqual(expect.arrayContaining(['no-link', 'no-licence'])); expect(r.status).toBe('invalid')
  })
  it('triage comment carries the marker, a per-row table for lists, and never claims ingestion', () => {
    const c = triageComment('list', triageBooks(parseList(LIST).rows, none))
    expect(c).toContain(BOT_MARK); expect(c).toContain('| 3 | Без дати'); expect(c).toContain('approved')
    expect(triageComment('proposal', [])).toContain('mismatch-ledger')
  })
  it('the real repo files feed the duplicate check', () => {
    const kn = knownFrom([readFileSync('core/sources.ts', 'utf8')])
    expect(kn.urls.has('github.com/brown-uk/dict_uk')).toBe(true)
  })
})

describe('BQ-3 approval queue', () => {
  it('parses owner row commands', () => {
    expect(parseRowCommands('approve 1,3-4\nreject 2 duplicate of 1\nthanks')).toEqual([
      { action: 'approve', rows: [1, 3, 4], reason: '' }, { action: 'reject', rows: [2], reason: 'duplicate of 1' }])
  })
  it('row state: approve, reject needs a reason, out-of-range ignored, all resolved', () => {
    const r = applyRowCommands({ approved: [], rejected: {} }, parseRowCommands('approve 1,9\nreject 2\nreject 3 no link'), 3)
    expect(r.state).toEqual({ approved: [1], rejected: { 3: 'no link' } }); expect(r.ignored).toHaveLength(2)
    expect(allResolved(r.state, 3)).toBe(false)
    const r2 = applyRowCommands(r.state, parseRowCommands('approve 2'), 3)
    expect(allResolved(r2.state, 3)).toBe(true)
    expect(readState(stateComment(r2.state))).toEqual(r2.state)
  })
  it('queue lines cite the issue and are appended idempotently', () => {
    const b = parseBook(BOOK), it1 = queueItem(7, 'https://github.com/o/r/issues/7', 1, b, '2026-10-17T00:00:00Z')
    expect(it1).toMatchObject({ cite: 'https://github.com/o/r/issues/7', mode: 'fulltext', years: '1619' })
    const a = appendQueue('', [it1]); expect(a.added).toHaveLength(1)
    const again = appendQueue(a.text, [it1, queueItem(7, it1.issueUrl, 2, b, 'x')])
    expect(again.added.map(i => i.row)).toEqual([2]); expect(again.text.split('\n').filter(Boolean)).toHaveLength(2)
  })
  it('an approval does not collide with its own queued urls (known built without them)', () => {
    const q = appendQueue('', [queueItem(7, 'u', 1, parseBook(BOOK), 'x')]).text
    expect(triageBooks([parseBook(BOOK)], knownFrom([q]))[0]!.status).toBe('duplicate')
    expect(triageBooks([parseBook(BOOK)], knownFrom([]))[0]!.status).toBe('ok')
  })
})

describe('BQ-4 rejection needs a reason', () => {
  const c = (author: string, body: string, bot = false) => ({ author, body, at: '', bot })
  it('no reason without an owner comment', () => {
    expect(rejectionReason([], 'me')).toBeNull()
    expect(rejectionReason([c('stranger', 'please reject this one'), c('bot', BOT_MARK + ' needs a reason', true)], 'me')).toBeNull()
    expect(rejectionReason([c('me', 'no')], 'me')).toBeNull()
  })
  it('takes the latest owner comment and strips «reject:»', () => {
    expect(rejectionReason([c('me', 'old text here'), c('me', 'Rejected: guessed date, no link')], 'ME')).toBe('guessed date, no link')
  })
})
