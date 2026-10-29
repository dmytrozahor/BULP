/** SPEC 63 SE-12: the oldest word lists typed online (litopys.org.ua zyz70–73 / zyz100–102, uk.wikisource.org 1798 / 1818) → dated SE rows for more epochs of «Значення за епохами». */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { TYPED_BASE, TYPED_LEX_SPECS, parseTypedLexicon, typedGlossRows, typedHeadRows, typedText } from '../core/hist-typed.ts'
import { WS_SPECS, parseWsFlow, parseWsTable, wsKey, wsRows } from '../core/hist-ws.ts'
import { DICT_COVER } from '../core/se.ts'
import { HIST_BY_ID, HIST_SRC } from '../core/dx-src.ts'
import { assignEpoch } from '../core/epochs.ts'
import { seHeads } from '../pipelines/dx-hist-load.ts'
import { parseHistTyped } from '../pipelines/parse-hist-typed.ts'
import { parseHistWs } from '../pipelines/parse-hist-ws.ts'
import { fetchTyped } from '../pipelines/fetch-hist-typed.ts'
import { fetchWs } from '../pipelines/fetch-hist-ws.ts'

const ent = (s: string) => [...s].map(c => c.charCodeAt(0) > 127 ? `&#${c.charCodeAt(0)};` : c).join('')
const spec = (id: string) => TYPED_LEX_SPECS.find(s => s.id === id)!
const P = (b: string, rest: string) => `<p class=K1><b>${b}</b>${rest}</p>`

describe('SE-12 the typed word lists of litopys.org.ua (Німчук 1964)', () => {
  it('SE-12 old letters and Latin look-alikes are folded to a Cyrillic key; ıa = я; page-break marks and titlo parentheses disappear', () => {
    expect(typedText('Тин<small>Ђ</small>')).toBe('тинѣ')
    expect(typedText('&#305;a&#769;ковъ')).toBe('яковъ')
    expect(typedText('Aдал<small>Ђ</small>й')).toBe('адалѣй')   // a Latin «A» inside a Cyrillic word is the letter а
    expect(typedText('&#969;(т) земл<small>А</small>')).toBe('от земля')
    expect(typedText('Гд&#949;&#969;нъ')).toBe('гдеонъ')
  })
  it('SE-12 the 1431 glossary: a comma list of headwords is several headwords of one article; an explanation (too many items) is not a gloss', () => {
    const html = P('Таимичище, копеличище', ', выродокъ.') + P('Свойсшво', ', хто имать что особно.') + P('Кудь', ', произволеніе.') + P('Количьство', ', м<small>Ђ</small>ра есть колика, а, б, в, г, д.') + P('А.', '')
    const r = parseTypedLexicon(html, spec('glossary1431'))
    expect(r.articles.map(a => a.head)).toEqual(['таимичище', 'копеличище', 'кудь'])   // a phrase gloss (4 words) and an explanation (6 comma items) are skipped
    expect(r.articles.find(a => a.head === 'кудь')!.glosses).toEqual(['произволеніе'])
    expect(r.stats.candidates).toBe(4); expect(r.stats.skippedGloss).toBe(2)   // the letter heading «А.» is not an article
    const g = typedGlossRows(r.articles, spec('glossary1431')); expect(g.find(x => x[0] === 'произволеніе')![1]).toMatchObject({ d: 'glossary1431', e: [1431, 1431] })
  })
  it('SE-12 Синоніма is a REVERSED Беринда: its headwords (simple language) are the rows, dated by the period 1650–1700, and it has no gloss rows', () => {
    const html = P('Азбука:', ' алфавитъ, буква') + P('Брама', ' врата') + P('Або', ' зан&#949;, яко,')
    const s = spec('synonima'), r = parseTypedLexicon(html, s)
    expect(r.articles.map(a => a.head)).toEqual(['азбука', 'брама', 'або'])
    const heads = typedHeadRows(r.articles, s); expect(heads.find(x => x[0] === 'брама')![1]).toMatchObject({ d: 'synonima', g: 'ц.-сл. відповідник: врата', e: [1650, 1700] })
    expect(typedGlossRows(r.articles, s)).toEqual([])
    expect(s.rev).toBe(true)
  })
  it('SE-12 Лексис … просто: forward list (CS headword → simple-language gloss), rows keyed by the gloss word of ≥ 4 letters, dated by the XVI c. range', () => {
    const s = spec('lexis-prosto'), r = parseTypedLexicon(P('агнецъ', ', ягнє.') + P('агапи(й)', ', любовь.') + P('агапка', ', . . . . . . .'), s)
    expect(r.articles.map(a => a.head)).toEqual(['агнецъ', 'агапий'])   // the line with no readable gloss is counted, not emitted
    expect(r.stats.skippedGloss).toBe(1)
    const g = typedGlossRows(r.articles, s); expect(g.map(x => x[0])).toEqual(['ягнє', 'любовь'])
    expect(g[0]![1]).toMatchObject({ d: 'lexis-prosto', e: [1501, 1600], g: 'ц.-сл. «агнецъ»' })
  })
  it('SE-12 every list is registered: coverage record (own-time, harvested), dictionary bit, a distinct dx bit, a litopys URL under the fixed host', () => {
    for (const s of TYPED_LEX_SPECS) {
      const c = DICT_COVER.find(d => d.id === s.dict)!; expect(c, s.id).toBeTruthy(); expect(c.harvested).toBe(true); expect(c.cover).toEqual(s.years); expect(c.basis).toBe('own-time'); expect(c.note.length).toBeGreaterThan(20)
      expect(HIST_BY_ID[s.dict], s.id).toBeTruthy(); for (const p of s.pages) expect(p).toMatch(/^zyz\d+\.htm$/)
    }
    expect(TYPED_BASE).toBe('http://litopys.org.ua/zyzlex/')
    const bits = HIST_SRC.map(s => s.bit); expect(new Set(bits).size).toBe(bits.length)
  })
  it('SE-12 the lists add epochs the dictionaries did not reach: 1282 → давньоукраїнська, 1431 and the XVI c. → ранньосередньоукраїнська, 1650–1700 → середньоукраїнська', () => {
    const ep = (y: [number, number]) => { const v = assignEpoch(y, 'shev').value; return v === 'unknown' ? [] : v.epochs }
    expect(ep([1282, 1282])).toEqual(['shev.old']); expect(ep([1431, 1431])).toEqual(['shev.early_middle']); expect(ep([1650, 1700])).toEqual(['shev.middle'])
    expect(ep([1798, 1798])).toEqual(['shev.late_middle']); expect(ep([1818, 1818])).toEqual(['shev.modern'])
  })
  it('SE-12 parse + fetch are resumable and failure-tolerant (RS-1): a rerun reuses the output, a missing input is skipped, a failed download only warns', async () => {
    const raw = mkdtempSync(resolve(tmpdir(), 'ht-')), out = mkdtempSync(resolve(tmpdir(), 'ho-'))
    expect(parseHistTyped(raw, out)).toEqual([])   // nothing fetched: no error
    mkdirSync(resolve(raw, 'glossary1431')); writeFileSync(resolve(raw, 'glossary1431', 'zyz102.htm'), Buffer.from(ent(P('Кудь', ', произволеніе.') + P('Васнь', ', мня, присно.')), 'latin1'))
    const a = parseHistTyped(raw, out); expect(a.map(x => [x.id, x.heads, x.gloss, x.reused])).toEqual([['glossary1431', 2, 2, false]])
    const j = JSON.parse(readFileSync(resolve(out, 'glossary1431.json'), 'utf8')); expect(j.kind).toBe('heads'); expect(JSON.parse(readFileSync(resolve(out, 'glossary1431-gloss.json'), 'utf8')).kind).toBe('hist-gloss')
    expect(parseHistTyped(raw, out)[0]!.reused).toBe(true)
    expect(seHeads('.', out).map(h => h.word).sort()).toEqual(['васнь', 'кудь'])   // gloss files are not headwords
    const dest = mkdtempSync(resolve(tmpdir(), 'hf-')); let calls = 0
    const bad = (async () => { calls++; return new Response('nope', { status: 503 }) }) as unknown as typeof fetch
    const r = await fetchTyped(dest, 'http://example.invalid/', bad); expect(r.failed).toBe(7); expect(r.fetched).toBe(0); expect(calls).toBe(7); expect(existsSync(resolve(dest, 'synonima'))).toBe(false)
    const ok = (async () => new Response(Buffer.alloc(6000, 65), { status: 200 })) as unknown as typeof fetch
    expect((await fetchTyped(dest, 'http://example.invalid/', ok)).fetched).toBe(7)
    expect((await fetchTyped(dest, 'http://example.invalid/', bad)).kept).toBe(7)   // an existing page is never fetched again
  })
})

describe('SE-12 the typed 1798 and 1818 glossaries of uk.wikisource.org', () => {
  const GAP = '<span style="display:inline-block; width:2em;">&#160;</span>'
  const flow = `<div class="prp-pages-output"><p><span style="font-size: 120%;">А</span>бо́,${GAP}или.<br />\nАгрусъ,${GAP}крыжовникъ.<br />\nБарило,${GAP}Французское\nслово, Baril, боченокъ.<br />\nБатигъ Петривъ,${GAP}Цихорія.<br />\nБе́хтеръ,${GAP}</p></div>`
  it('SE-12 Котляревський 1798: running text → headword (key folded: ъ, stress) + Russian gloss; a continuation line joins; a phrase headword and an empty gloss are counted, not emitted', () => {
    const r = parseWsFlow(flow)
    expect(r.articles.map(a => [a.head, a.gloss])).toEqual([['або', 'или.'], ['агрус', 'крыжовникъ.'], ['барило', 'Французское слово, Baril, боченокъ.']])
    expect(r.stats.skippedHead).toBe(1); expect(r.stats.skippedGloss).toBe(1)
    const rows = wsRows(r.articles, WS_SPECS[0]!, '59106'); expect(rows[1]![1]).toMatchObject({ d: 'kotliarevsky1798', e: [1798, 1798], g: 'крыжовникъ.' }); expect(rows[1]![1].l).toContain('59106')
  })
  it('SE-12 Павловський 1818: table rows with highlighted spans; a variant is its own headword, an ending «-ая» is not', () => {
    const hl = (x: string) => `<span style="background-color: #FFFFAE; color:#000;">${x}</span>`
    const html = `<table><tr>\n<td rowspan="6">\n</td>\n<td>${hl('Або̀')}\n</td>\n<td>или, либо\n</td></tr>\n<tr>\n<td>${hl('Абы̀хто')}, ${hl('абы̀що')}\n</td>\n<td>кто нибудь, что нибудь\n</td></tr>\n<tr>\n<td>${hl('Бавуня́ный')}, -${hl('ая')}, -${hl('еѣ')}\n</td>\n<td>бумажный\n</td></tr></table>`
    const r = parseWsTable(html)
    expect(r.articles.map(a => [a.head, a.gloss])).toEqual([['або', 'или, либо'], ['абихто', 'кто нибудь, что нибудь'], ['абищо', 'кто нибудь, что нибудь'], ['бавуняний', 'бумажный']])
    expect(wsKey('Бигъ')).toBe('биг'); expect(wsKey('Эхо')).toBe('ехо')
  })
  it('SE-12 registered: coverage record (lang ru, uk→ru), dx bits, the parse is idempotent and a failed API call only warns', async () => {
    for (const s of WS_SPECS) { const c = DICT_COVER.find(d => d.id === s.dict)!; expect(c.lang).toBe('ru'); expect(c.dir).toBe('uk-ru'); expect(c.cover).toEqual([s.year, s.year]); expect(HIST_BY_ID[s.dict]).toBeTruthy() }
    const raw = mkdtempSync(resolve(tmpdir(), 'wr-')), out = mkdtempSync(resolve(tmpdir(), 'wo-'))
    mkdirSync(resolve(raw, 'kotliarevsky1798')); writeFileSync(resolve(raw, 'kotliarevsky1798', '0.json'), JSON.stringify({ title: 't', revid: 59106, html: flow }))
    const a = parseHistWs(raw, out); expect(a.map(x => [x.id, x.rows, x.reused])).toEqual([['kotliarevsky1798', 3, false]]); expect(parseHistWs(raw, out)[0]!.reused).toBe(true)
    expect(seHeads('.', out).map(h => h.word)).toEqual(['або', 'агрус', 'барило'])
    const dest = mkdtempSync(resolve(tmpdir(), 'wf-')); const bad = (async () => new Response('You are making too many requests', { status: 429 })) as unknown as typeof fetch
    const r = await fetchWs(dest, 'http://example.invalid/', bad, 1); expect(r.failed).toBe(3); expect(r.fetched).toBe(0)
  }, 30000)
})

describe('SE-12 wiring', () => {
  it('SE-12 build:data fetches and parses the typed lists and the Wikisource glossaries before build.ts; each input has a SOURCES.txt with sha256 and licence reasoning', () => {
    const b = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:data'] as string
    for (const s of ['fetch-hist-typed', 'parse-hist-typed', 'fetch-hist-ws', 'parse-hist-ws']) expect(b.indexOf(s), s).toBeGreaterThan(0), expect(b.indexOf(s), s).toBeLessThan(b.indexOf('pipelines/build.ts'))
    for (const f of ['data/raw/hist-typed/SOURCES.txt', 'data/raw/hist-ws/SOURCES.txt']) { const t = readFileSync(f, 'utf8'); expect(t).toMatch(/[0-9a-f]{64}/); expect(t).toContain('Licence reasoning'); expect(t).not.toMatch(/@\w+\.\w+/) }
  })
})
