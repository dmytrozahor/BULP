import { describe, expect, it } from 'vitest'
import { NAN_LABEL, NAN_PLACE, nanRows16, parseNanRecall, parseSettlements, repairStarHeads, type NanRow } from '../core/nan-parse.ts'
import { ESUM_MAX, trailingBar, gradeExcerpt, pageHead16, pageOffset16, parseEsum16, splitEsum16, newEsum16Stats, suspiciousToken, tidyExcerpt } from '../core/esum-parse.ts'
import { buildEtymology, esumScanEvidence } from '../core/etymology.ts'
import { sumLabelHit } from '../core/labels.ts'
import { complete16 } from '../pipelines/esum-scan.ts'

// invented text in the layout of the scans (nothing is quoted from the books)
const ab = (i: number) => 'Т' + 'абвгдежзиклмнопрстуфхцчшщюя'[i % 26] + 'абвгдежзиклмнопрстуфхцчшщюя'[Math.floor(i / 26)]
const settlTl = [
  '     УМОВНІ СКОРОЧЕННЯ НАЗВ НАСЕЛЕНИХ ПУНКТІВ, ДЕ ЗАФІКСОВАНО', '     ГОВІРКОВУ ЛЕКСИКУ В 2-ІЙ ПОЛОВИНІ XX СТ. /1953-1990рр./.', '',
  ...Array.from({ length: 120 }, (_, i) => `${ab(i)}.`.padEnd(8) + `  - с.Тест${i} Тестового р-ну Запорізької обл.`),
  'Єл.      - с.Єлизаветівка Басилівського р-ну Запорізької обл.', 'Куш.     - с.Кушугум Запорізького р-ну Запорізької обл.', 'БалВ     - с.Балки Василівського р-ну Запорізької обл.',
]
const settlements = () => parseSettlements(['', settlTl.join('\n')])

describe('SE-16 Чабаненко: recall by design (SE-15 approach)', () => {
  // the OCR page: clean article, garbled grammar block, garbled gloss, cross-reference, an off-spine headword, a star-debris headword («ЖБРЕЗГАНЬ» = «*БРЕЗГАНЬ»)
  const ocr = [
    'АБАЖУРИК /абажур\'ік/, а, ч. Маленький абажур. Дай мені абажурик /Єл./, Куш.',
    'АБИРКАТЬ /абиркат\'/, и, х. Гукати на овець. Абиркаю на отару /БалВ/, Єл.',
    'АБРИКОСЕЦЬ /абрикосец\'/, сця, ч. Яе{ ш ;ии ?? дурний нет /Куш./.',
    'АБРИКОСЯКА див. АБРИКОСЕЦЬ.',
    'БАЗАР /база\'р/, а, ч. Торг. Ходили на базар /Єл./.',
    'ЯСКРАВИЙ /яскравий/, а, е. Блискучий /Куш./.',
    'ЖБРЕЗГАНЬ, і. Пліснява на квасові /ЯСл,5 - Лбм./.',
    'БУТИЛКА /бутилка/, и, ж. Скляна посудина. Налили в бутилку /Єл./, Куш.',
    'ВАГА /вага/, и, ж. Тягар /Єл./.',
  ].join('\n')
  const tl = [
    '    АБАЖУРИК /абажур\'ік/, а, ч. Маленький абажур. Дай мені абажурик /Єл./, Куш.',
    '    АБИРКАТЬ /абиркат\'/, аю, аєш, недок. Гукати на овець. Абиркаю на отару /БалВ/, Єл.',
    '    БАЗАР /база\'р/, а, ч. Торг. Ходили на базар /Єл./.',
  ].join('\n')
  const run = (known: (h: string) => boolean = () => false) => parseNanRecall([{ text: ocr, tl, no: 7 }], 1, settlements(), known)

  it('a garbled grammar block no longer drops the article: the gloss starts at the first Capitalised word', () => {
    const { rows, stats } = run()
    const a = rows.find(r => r.head === 'абиркать')!
    expect(a.senses[0]).toMatchObject({ gloss: 'Гукати на овець' }); expect(stats.garbledGram).toBeGreaterThan(0)
    expect(JSON.stringify(rows)).not.toMatch(/Абиркаю на отару|Дай мені абажурик/)   // the illustration is never taken
  })
  it('a garbled gloss keeps the headword with `oq`; a cross-reference is a headword with no gloss', () => {
    const { rows } = run()
    expect(rows.find(r => r.head === 'абрикосець')!.senses.every(s => s.oq && !s.gloss)).toBe(true)
    const x = rows.find(r => r.head === 'абрикосяка')!; expect(x.xr).toBe(true); expect(x.senses).toEqual([{ n: 1, labels: [], gloss: '', oq: 1 }])
  })
  it('a headword off the alphabetical spine is kept as `unv` (no card); a card needs the spine and two pieces of evidence', () => {
    const { rows } = run()
    const off = rows.find(r => r.head === 'яскравий')!, ok = rows.find(r => r.head === 'абажурик')!
    expect(off.seq).toBe(false); expect(nanRows16(off)[0]![1].unv).toBe(1)
    expect(ok.seq).toBe(true); expect(ok.ev).toBeGreaterThanOrEqual(2); expect(nanRows16(ok)[0]![1].unv).toBeUndefined()
    const lonely = rows.find(r => r.head === 'бутилка')!   // one reading, a settlement group, a clean gloss: 2 pieces; and on the spine
    expect(lonely.conf).toBeFalsy(); expect(lonely.ev).toBe(2)
  })
  it('the label of a row: a standard headword only records the place, a non-standard one is a word of the area; `oq` rows are kept', () => {
    const { rows } = run(h => h === 'базар')
    const [, rb] = nanRows16(rows.find(r => r.head === 'базар')!)[0]!, [, ra] = nanRows16(rows.find(r => r.head === 'абажурик')!)[0]!
    expect(rb.lb![0]).toBe(NAN_PLACE); expect(ra.lb![0]).toBe(NAN_LABEL)
    expect(sumLabelHit('chabanenko', ra.lb![0]!, ra.g, undefined, 'Єлизаветівка')).toBeTruthy()
  })
  it('the debris of the book\'s `*` before a headword is repaired when the headword fits between its spine neighbours', () => {
    const mk = (head: string, seq: boolean): NanRow => ({ head, vol: 1, page: 1, senses: [], seq, ab: [] })
    const rows = [mk('абажур', true), mk('жбрезгань', false), mk('вага', true)]
    // «жбрезгань» without the first letter is «брезгань», which sorts between «абажур» and «вага»
    repairStarHeads(rows); expect(rows[1]!.head).toBe('брезгань'); expect(rows[1]!.seq).toBe(true)
    const rows2 = [mk('абажур', true), mk('жзаклад', false), mk('вага', true)]
    repairStarHeads(rows2); expect(rows2[1]!.head).toBe('жзаклад')
  })
  it('a run of the book\'s own settlement abbreviations is no gloss', () => {
    const o = ['КІСТКА /кістка/, и, ж. Єл., Куш., БалВ. Те саме, що КІСТЬ /Єл./.', 'КІСТЯК /кістак/, а, ч. Скелет /Куш./.'].join('\n')
    const { rows } = parseNanRecall([{ text: o, no: 1 }], 1, settlements())
    expect(rows[0]!.senses.every(s => !s.gloss || !/Кір\./.test(s.gloss))).toBe(true)
  })
})

// a page of the column-aware OCR: head L, head R, blank, left column, blank, right column, printed number
const col = (lo: string, hi: string, body: string[], no?: number) => [lo, hi, '', ...body.flatMap(b => [b, '']), ...(no ? [String(no)] : [])].join('\n')
const art = (head: string, tail: string) => `${head} «значення слова ${head}» Мо; — р. ${head}, бр. ${head}, п. ${head}; — ${tail} — Фасмер I 5; Brückner 7. — Див. ще інше.`
const pad = 'Додатковий опис статті, який потрібен лише для довжини сторінки й нічого не означає в цьому тесті. '.repeat(3)
describe('SE-16 ЕСУМ: column-aware pages, paragraph articles, graded rows', () => {
  const pages = [
    { idx: 12, text: col('абажур', 'абрикос', [art('абажур', 'запозичення з французької мови; фр. abat-jour «тс.» утворене з abattre «збивати» і jour «день».'), 'абиркати; — р. абиркати, п. абиркати. — Фасмер I 5. ' + pad, art('абрикос', 'запозичено через польську мову з нім. Aprikose, яке походить від лат. praecoquus «ранньостиглий» і ще далі.')], 10) },
    { idx: 13, text: col('бавовна', 'бавовна', ['[бавуна] «вата» Мо; — р. бавовна; — запозичення з італійської мови; іт. bambagia «вата». — Фасмер I 5.', 'бавовна «рослина»; — р. бавовна; — запозичення з італійської мови; іт. bambagia «вата» походить від лат. bambax, a8 fhnanmvyarnunt xxyyzz. — Фасмер I 5.' + pad], 11) },
  ]
  it('the page: two running-head lines, the printed number as the last line; either head may be missing', () => {
    const h = pageHead16(pages[0]!.text)!
    expect(h).toMatchObject({ lo: 'абажур', hi: 'абрикос', no: 10 })
    expect(pageHead16(col('', 'абрикос', [pad.repeat(2), pad.repeat(2)], 10))).toMatchObject({ hi: 'абрикос' })
    expect(pageHead16(col('', '', [pad.repeat(2)]))).toBeUndefined()   // too few lines: not a dictionary page
    expect(pageOffset16(pages)).toBe(2)
  })
  it('articles: a lowercase headword after a paragraph that ended with a full stop; a blank line inside an article after a hyphen is a continuation', () => {
    const p = [{ idx: 20, text: col('вага', 'вода', [art('вага', 'запозичення з польської мови; п. waga «вага» споріднене з нім. Wage.'), 'вазон «горщик»; — запозичення з польської мови; п. wa-', 'zon «горщик» походить від нім. Wasen. — Фасмер I 6.' + pad, 'вакуум; — запозичення з латинської мови. ' + pad], 18) }]
    const st = newEsum16Stats(), a = splitEsum16(p, 0, st)
    expect(a.map(x => x.head)).toEqual(['вага', 'вазон', 'вакуум']); expect(a[1]!.body).toMatch(/wazon/)   // «wa-» + «zon» joined
    expect(a[1]!.gloss).toBe(true)
  })
  it('grades: a clean excerpt (a), an excerpt with «[…]» or cut back (b), a pointer only (c); the bracketed dialect headword makes no row', () => {
    const r = parseEsum16(pages, 1).rows
    expect(r.map(x => [x.head, x.page, x.grade])).toEqual([['абажур', 10, 'a'], ['абиркати', 10, 'c'], ['абрикос', 10, 'a'], ['бавовна', 11, 'b']])
    expect(r.find(x => x.head === 'абиркати')!.t).toBeUndefined()
    expect(r.every(x => !x.t || x.t.length <= ESUM_MAX)).toBe(true); expect(r.some(x => x.head === 'бавуна')).toBe(false)
    expect(r.find(x => x.head === 'бавовна')!.t).toMatch(/…$|\[…\]/)
  })
  it('the wrong-lemma gates stay: a headword outside the running-head range, off the alphabetical spine or not strict gives no row', () => {
    const body = [art('абажур', 'запозичення з французької мови; фр. abat-jour «тс.» утворене з abattre «збивати» і jour «день».'), art('зайвий', 'запозичення з польської мови; п. zajowy «тс.» ще щось довге й не менш важливе для довжини.'), art('абсолют', 'запозичення з латинської мови; лат. absolutus «завершений» ще щось довге й не менш важливе.') + pad]
    const r = parseEsum16([{ idx: 12, text: col('абажур', 'абсолют', body, 10) }], 1)
    expect(r.rows.map(x => x.head)).toEqual(['абажур', 'абсолют']); expect(r.stats.outOfRange).toBe(1)
  })
  it('tidy: a lone mangled token becomes «[…]», a run of them cuts the excerpt with «…», a lone digit before […] is «з»', () => {
    expect(suspiciousToken('fhnanmvyarnunt')).toBe(true); expect(suspiciousToken('aluca')).toBe(false); expect(suspiciousToken('мова')).toBe(false); expect(suspiciousToken('8')).toBe(true)
    expect(tidyExcerpt('запозичено з польської мови; п. xxyyzzpqrst «тс.» від лат. praecoquus')!).toMatchObject({ changed: true })
    const cut = tidyExcerpt('запозичено, можливо, через польське посередництво 8 fhnanmvyarnunt мох antinne')!
    expect(cut.t).toBe('запозичено, можливо, через польське посередництво…'); expect(cut.changed).toBe(true)
    expect(tidyExcerpt('запозичено 3 xxyyzzpqrst мови через посередництво російської')!.t).toMatch(/^запозичено з \[…\] мови/)
    expect(tidyExcerpt('ні')).toBeUndefined()
  })
  it('the statement may follow the cognate list («; — від лат. …»); no marker at all → a pointer (undefined excerpt)', () => {
    const g = gradeExcerpt('абортус, р. абортус; — від лат. abortus «викидень», похідного від дієслова aborior «передчасно народжуюсь». — Фасмер I 5.')!
    expect(g.t).toMatch(/^від лат\. abortus/); expect(g.grade).toBe('a')
    expect(gradeExcerpt('просто щось без жодного маркера, лише кілька слів')).toBeUndefined()
  })
  it('an article whose own start the OCR lost is appended to the previous one: its statement is NOT taken (only the text before the first literature line is its own)', () => {
    const merged = ', р. вага, бр. вага, п. waga, ч. váha, слц. váha, болг. вага, схв. вага, слн. vága; — Фасмер I 5; Brückner 7. — Див. ще інше. запозичення з польської мови; п. waga «тс.» утворене з чогось іншого, ніж вага.'
    expect(gradeExcerpt(merged)).toBeUndefined()
    expect(gradeExcerpt(', р. вага; — запозичення з польської мови; п. waga «тс.» утворене з чогось іншого, ніж вага. — Фасмер I 5; Brückner 7.')!.grade).toBe('a')
  })
  it('a closing bracket read as «і» is dropped only when the shorter word is known and the longer is not', () => {
    const known = (w: string) => ['букашка', 'вага'].includes(w)
    expect(trailingBar('букашкаї', known)).toBe('букашка'); expect(trailingBar('вага', known)).toBe('вага'); expect(trailingBar('голубці', known)).toBe('голубці')
  })
  it('the panel: an excerpt is a Q-evidence, a pointer is a D-evidence with the volume and page and no text; a lemma with only a pointer still gets the source', () => {
    const q = esumScanEvidence({ t: 'запозичення з французької мови; фр. abat-jour «тс.»', v: 1, p: 10, g: 'a' }, 'абажур')
    expect(q).toMatchObject({ kind: 'Q', locator: 'ЕСУМ, т. 1, с. 10' })
    const d = esumScanEvidence({ v: 2, p: 100, g: 'c' }, 'довгий')
    expect(d).toMatchObject({ source: 'ESUM', kind: 'D', locator: 'ЕСУМ, т. 2, с. 100' }); expect(d.quote).toMatch(/«довгий»/); expect(d.quote).not.toMatch(/…|запозич/)
    const e = buildEtymology('довгий', undefined, undefined, [], undefined, '', [], undefined, '', { v: 2, p: 100, g: 'c' })!
    expect(e.sources).toHaveLength(1); expect(e.sources[0]!.kind).toBe('D')
  })
  it('the column-aware OCR is preferred only for a complete volume directory', () => {
    expect(complete16('no-such-dir', 1)).toBe(false)
  })
})
