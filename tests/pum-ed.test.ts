/** SPEC 63 RF-11: the charters of «Українські грамоти XV ст.» (1965) and «Волинські грамоти XVI ст.» (1995): parser fixtures quoted from the real scans, the seeds, the dedupe. */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import type { WitnessOut } from '../core/types.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'
import { checkCharter, PUM_SETS } from '../pipelines/ingest-pum.ts'
import { textTokens } from '../pipelines/ingest-harvest.ts'
import { charterText, containment, dedupe, digits, parseToc } from '../pipelines/pum-ed.ts'
import { cleanVol16, parseDates, parseVol16, parseVol16Toc, repairDates } from '../pipelines/pum-vol16.ts'
import { ocrQuality } from '../core/ocr-quality.ts'
import { ruOfWitness } from '../core/ru-source.ts'

const century = (d: [number, number]) => Math.floor((Math.round((d[0] + d[1]) / 2) - 1) / 100) + 1
const seeds = (set: (typeof PUM_SETS)[number]) => readdirSync(set.dir).filter(f => set.file.test(f)).map(f => ({ f, w: JSON.parse(readFileSync(`${set.dir}/${f}`, 'utf8')) as WitnessOut }))

describe('RF-11 «Українські грамоти XV ст.» (Русанівський 1965): parser on three real charters', () => {
  const fx = readFileSync('tests/fixtures/pum-ed/xv-sample.txt', 'utf8'), [bodyPart, tocPart] = fx.split('=== TOC')
  const body = bodyPart!.split('\n').slice(1), toc = tocPart!.split('\n').slice(1)
  const heads = body.map((l, i) => (/^\s*№\s?([0-9ЗОІlI]{1,3})\*?\s*$/.test(l) ? i : -1)).filter(i => i >= 0)
  const sec = (k: number) => body.slice(heads[k]! + 1, heads[k + 1] ?? body.length)
  it('the contents give each charter its own date and place as the edition prints them (OCR digits З/О/І read as 3/0/1, a hyphen at the line end joined)', () => {
    const t = parseToc(toc, 3, 5)
    expect(t.map(e => e.n)).toEqual([3, 4, 5])
    expect(t[0]).toMatchObject({ date: [1465, 1465], place: 'Київ', page: 29 })
    expect(t[1]).toMatchObject({ date: [1468, 1468], dateText: '15 травня 1468 року', page: 29 })
    expect(t[2]).toMatchObject({ date: [1499, 1499], dateText: '8 червня 1499 року', page: 30 })
    expect(digits('ЗО')).toBe('30'); expect(digits('І432')).toBe('1432')
    expect(parseToc(['№ 14. Опис міста Кременця (1480/1484 рік).41'], 14, 14)[0]!.date).toEqual([1480, 1484])
    expect(parseToc(['№ 45. Ілля воєвода дарує за вірну службу одному з своїх підданих два села', '(Середина XV століття, Сучава).93'], 45, 45)[0]).toMatchObject({ date: [1440, 1460], place: 'Сучава' })
    expect(parseToc(['№ 53. Петро воєвода і боярська рада ухвалюють (1456|?] року) .106'], 53, 53)[0]!.note).toMatch(/сумніву/)
  })
  it('№ 5: the title, the editor\'s description, the footnotes and the manuscript notes are dropped; only the charter text stays', () => {
    const r = charterText(sec(2))
    expect(r.text).toContain('Господину и отцу нашєму филарєту'); expect(r.text).toContain('кь сєму нашєму листу')
    expect(r.text).not.toMatch(/Публікується вперше|Розділові знаки|рукописних копій|Дата написана над рядком|Пані Анастасія|олівцем/)
    expect(r.apparatus).toBeGreaterThan(100)
    const t = textTokens(r.text, '№ 5, с. 30', true)
    expect(t.tokens.length).toBeGreaterThan(250); expect(t.tokens.some(x => x.raw === 'єсмо')).toBe(true)
  })
  it('№ 3 and № 4: a short text keeps its folio-numbered first line («17  Мьі кнзь сємєнь …»), the description (Грамота публікується …) does not', () => {
    const r3 = charterText(sec(0)), r4 = charterText(sec(1))
    expect(r3.text).toMatch(/^Мьі кнзь сємєнь/); expect(r3.text).not.toMatch(/публікується|Кнйге|копією/)
    expect(r4.text).toContain('Пожаловали єсмо слугу'); expect(r4.text).not.toMatch(/Петров|зберігається|переписувач/)
  })
  it('a charter printed in Polish script has no Cyrillic text and is skipped (№ 2: «За Ротап Оіігаг …» read as look-alikes)', () => {
    const pol = ['Роман-Олізар Волчкевич, намісник київський', '1450 року, Київ', '', 'За Ротап Оіігаг Уо1сгкіе¥Ісг Нозросіаг 2іет КїіуузкїсЬ Ьисіисгу гсіого^уу', 'па ТІІІ тоіет у итузіі, а Ьасгасгу згсго гсіеу капоти сгеїодуіки паїеіуі', 'сІЬаіу іак па тагпозі з¥Ііа а ігеЬа и¥а2аіу па ¥Іесгпозс пезкопсгеппи, іак']
    expect(textTokens(charterText(pol).text, 'x', true).tokens.length).toBeLessThan(20)
  })
})

describe('RF-11 the XV ст. seeds: 63 charters, own dates, region, OQ-gated, admitted by the pum15 record', () => {
  const set = PUM_SETS[1]!, all = seeds(set)
  it('every seed is valid and admitted; 63 of 67 (№ 2, 20, 23, 25 are printed in Polish script)', () => {
    expect(all.length).toBe(63)
    for (const { f, w } of all) { expect(checkCharter(w, f, set), w.id).toEqual([]); expect(admit(w, authorById['pum15']), w.id).toEqual({ ok: true }) }
    for (const n of [2, 20, 23, 25]) expect(all.some(x => x.w.id === `gr15_${n}`)).toBe(false)
  })
  it('dated 1401–1499, each with the quoted date of the edition and its place; lang ruthenian; witnessType ocr so the OQ gate applies', () => {
    for (const { w } of all) { expect(w.lang).toBe('ruthenian'); expect(w.witnessType).toBe('ocr'); expect(w.dateCite.quote).toMatch(/1[34]\d\d|XV/); expect(w.region).toBeTruthy(); expect(w.edition).toMatch(/Русанівського, К\.: Наукова думка, 1965/) }
    const g = (id: string) => all.find(x => x.w.id === id)!.w
    expect(g('gr15_5').date).toEqual([1499, 1499]); expect(g('gr15_5').dateCite.quote).toBe('8 червня 1499 року'); expect(g('gr15_14').date).toEqual([1480, 1484]); expect(g('gr15_45').date).toEqual([1440, 1460])
    expect(g('gr15_8').region).toMatch(/Вільно/); expect(g('gr15_34').region).toMatch(/Молдавія/)
    expect(ocrQuality({ id: 'gr15_5', witnessType: 'ocr', date: [1499, 1499] }, { tokens: 100, linked: 10, hapaxTypes: 60 }, new Set()).excluded).toBe(true)   // a noisy reading is gated, not trusted
  })
  it('the 15th century gets the charters\' tokens by the date midpoint (the 14th-c. edition has 637 tokens there already)', () => {
    const by = new Map<number, number>(); for (const { w } of all) by.set(century(w.date), (by.get(century(w.date)) ?? 0) + w.tokens.length)
    expect(by.get(15)).toBeGreaterThan(18000); expect(all.reduce((n, x) => n + x.w.tokens.length, 0)).toBeGreaterThan(19000)
  })
})

describe('RF-11 dedupe: a charter is counted once, the vetted edition wins', () => {
  const pum14 = seeds(PUM_SETS[0]!).map(x => x.w), pum15 = seeds(PUM_SETS[1]!).map(x => x.w)
  it('the same charter in both editions (Vitovt to Bedrykh, 1429: № 9 of 1965 = № 57 of 1974) is found; the transcription stays, the OCR reading is not counted', () => {
    const d = dedupe(pum14, pum15)
    expect(d.duplicates.map(x => x.id)).toEqual(['gr15_9']); expect(d.duplicates[0]!.of).toBe('gr14_57'); expect(d.kept.length).toBe(pum15.length - 1)
  })
  it('different charters of one chancery share formulae but stay under the threshold (№ 6 and № 7: two oaths, 0.21 in common, are both kept)', () => {
    expect(containment(pum15.find(w => w.id === 'gr15_7')!, pum15.find(w => w.id === 'gr15_6')!)).toBeGreaterThan(0.1)
    const d = dedupe([], pum15); expect(d.duplicates).toEqual([])   // candidates of one edition are not compared with each other
  })
  it('a charter more than 60 years from the other is never a duplicate', () => {
    const a = pum15.find(w => w.id === 'gr15_9')!
    expect(dedupe([{ ...pum14.find(w => w.id === 'gr14_57')!, date: [1300, 1300] }], [a]).duplicates).toEqual([])
  })
})

describe('RF-11 «Волинські грамоти XVI ст.» (1995): parser on three real charters (OCR of the scan)', () => {
  const fx = readFileSync('tests/fixtures/pum-ed/vol16-sample.txt', 'utf8'), [pagesPart, tocPart] = fx.split('=== TOC')
  const pages = pagesPart!.split('=== PAGE ').slice(1).map(p => ({ n: Number(p.split('\n')[0]), text: p.split('\n').slice(1).join('\n') }))
  const toc = parseVol16Toc(tocPart!.split('\n').slice(1).join('\n'))
  it('the contents (page-layout OCR) give the entries in order with the document\'s own date; the garbled number column is not read (М., 58., 6.)', () => {
    expect(toc.length).toBe(8)
    expect(toc[0]).toMatchObject({ n: 1, date: [1540, 1540], dateText: '25 травня 1540' })
    expect(toc[1]).toMatchObject({ date: [1557, 1557], dateText: '10 березня 1557' })   // «Ю березня» = 10
    expect(toc[2]).toMatchObject({ date: [1560, 1560], dateText: '7 березня 1560' })
    expect(toc[4]).toMatchObject({ date: [1560, 1560], dateText: '30 жовтня 1560' })   // «ЗО жовтня» = 30
    expect(toc[5]!.date![0]).toBeGreaterThan(1500); expect(toc[6]!.dateText).toMatch(/липня 1562/)   // «Облипня» = 6 липня
  })
  it('three charters found by their titles even where the OCR garbled the number (8. = 3.) and the apparatus-free text starts after the «Акт … / Випис …» block', () => {
    const cs = parseVol16(pages, 1, toc.slice(2, 5).map(e => e.title))
    expect(cs.map(c => c.n)).toEqual([1, 2, 3]); expect(cs.map(c => c.page)).toEqual([18, 19, 20])
    expect(cs[0]!.dates).toEqual([{ kind: 'act', text: '17 січня 1577', year: 1577 }, { kind: 'extract', text: '7 березня 1560', year: 1560 }])
    expect(cs[1]!.dates.map(d => d.text)).toEqual(['7 жовтня 1569', '3 листопада 1560'])
    expect(cs[0]!.text).toMatch(/^Я, Проко\s?п Степанови/); expect(cs[0]!.text).not.toMatch(/Акт від|Випис|Віновий запис Прокопа/)
    expect(cs[2]!.text.split(/\s+/).length).toBeGreaterThan(100)
    const t = textTokens(cs[0]!.text, '№ 3, с. 18', true); expect(t.tokens.length).toBeGreaterThan(200); expect(t.tokens.some(x => x.raw === 'Прокоп')).toBe(true)
  })
  it('the editor\'s brackets and the superscript marks are cleaned: «то(г)[0]» → «того», «Ф(т)» → «о(т)», glued footnote digits and «[!]» go', () => {
    expect(cleanVol16('до запису г(с)дрьско(г)[0]\nФ(т)дати то(г)[0] листу з великою ступени(и)102 [!] ')).toBe('до запису г(с)дрьско(г)о\nо(т)дати то(г)о листу з великою ступени(и)102'.replace(/[()]/g, ''))
    expect(parseDates(['Акт від 12 січня 1570, № 50, 1.', 'Випис з книг гродських від 18 квітня 1565 р.']).map(d => d.year)).toEqual([1570, 1565])
  })
  it('the OCR spoils single digits of the contents but the list is chronological: the trusted run keeps its years, a year out of order is dated between its neighbours, a missing year at the end stays undated', () => {
    const mk = (ys: (number | null)[]) => ys.map((y, i) => ({ n: i + 1, title: 't', date: y ? ([y, y] as [number, number]) : null, dateText: null, page: null }))
    const r = repairDates(mk([1560, 1566, 1562, null, 1564, 1564, null]))
    expect(r[0]).toEqual({ date: [1560, 1560], basis: 'toc' }); expect(r[1]).toEqual({ date: [1560, 1562], basis: 'between' })   // 1566 breaks the order: dated between its neighbours 1560 and 1562
    expect(r[3]).toEqual({ date: [1562, 1564], basis: 'between' }); expect(r[6]).toEqual({ date: null, basis: null })
  })
})

describe('RF-11 the XVI ст. seeds: 125 acts of the Volodymyr land court, none counted twice', () => {
  const set = PUM_SETS[2]!, all = seeds(set)
  it('every seed is valid and admitted by the vol16 record; № 126–128 have no year in print and are not ingested', () => {
    expect(all.length).toBe(125)
    for (const { f, w } of all) { expect(checkCharter(w, f, set), w.id).toEqual([]); expect(admit(w, authorById['vol16']), w.id).toEqual({ ok: true }); expect(w.witnessType).toBe('ocr'); expect(w.edition).toMatch(/Задорожний, А\. М\. Матвієнко, К\.: Наукова думка, 1995/) }
    for (const n of [126, 127, 128]) expect(all.some(x => x.w.id === `gv16_${n}`)).toBe(false)
  })
  it('each act is dated by the contents of the edition (1540–1580); a year the OCR spoiled is a range between its neighbours and says so in the cite', () => {
    const g = (id: string) => all.find(x => x.w.id === id)!.w
    expect(g('gv16_1').date).toEqual([1540, 1540]); expect(g('gv16_1').dateCite.quote).toBe('25 травня 1540'); expect(g('gv16_2').date).toEqual([1557, 1557])
    expect(g('gv16_6').date[0]).toBeLessThan(g('gv16_6').date[1] + 1); expect(g('gv16_6').dateCite.note).toMatch(/між роками сусідніх/)
    for (const { w } of all) { expect(w.date[0]).toBeGreaterThanOrEqual(1540); expect(w.date[1]).toBeLessThanOrEqual(1580); expect(w.region).toMatch(/Волинь/) }
    const sorted = all.map(x => x.w.date[0]).sort((a, b) => a - b); expect(sorted[0]).toBe(1540)
  })
  it('the 16th century gets the acts\' tokens by the date midpoint (≈ 74k); all of them fall in the 16th', () => {
    const by = new Map<number, number>(); for (const { w } of all) by.set(century(w.date), (by.get(century(w.date)) ?? 0) + w.tokens.length)
    expect([...by.keys()]).toEqual([16]); expect(by.get(16)).toBeGreaterThan(70000)
  })
  it('dedupe against the 14th- and 15th-c. editions: nothing is the same text (a Volhynian land-court act is not a chancery charter)', () => {
    const earlier = [...seeds(PUM_SETS[0]!), ...seeds(PUM_SETS[1]!)].map(x => x.w)
    expect(dedupe(earlier, all.map(x => x.w)).duplicates).toEqual([])
  })
})

describe('RF-11 ingest.sh runs the three charter editions as ONE source with a signature of all the seeds', () => {
  it('runcmd pum14 hashes data/seed/pum14, pum15 and vol16 and the parser code, so a changed seed or parser is read again', () => {
    const ing = readFileSync('ops/worker/ingest.sh', 'utf8')
    expect(ing).toMatch(/runcmd pum14 "\$\(cat data\/seed\/pum14\/\*\.json data\/seed\/pum15\/\*\.json data\/seed\/vol16\/\*\.json pipelines\/pum-ed\.ts pipelines\/ingest-pum\.ts/)
    expect(readFileSync('pipelines/ingest-pum.ts', 'utf8')).toMatch(/pum15[\s\S]*vol16|vol16[\s\S]*pum15/)
  })
})

describe('RF-11 Kyiv editions are not Russian editions (research/46 decisions table)', () => {
  it('no charter witness of the XV ст. (Київ 1965) or the XVI ст. (Київ 1995) edition carries a ru flag', () => {
    for (const set of [PUM_SETS[1]!, PUM_SETS[2]!]) for (const { w } of seeds(set)) expect(ruOfWitness(w), w.id).toBeUndefined()
  })
})
