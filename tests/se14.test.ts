import { describe, expect, it } from 'vitest'
import { NAN_LABEL, NAN_PLACE, nanRows, parseNan, parseSettlements, placesOf, posOf, markNanSequence, glossShape, type NanRow } from '../core/nan-parse.ts'
import { ESUM_MAX, badToken, excerptClean, pageHead, pageOffset, parseEsum, repairText, statementOf } from '../core/esum-parse.ts'
import { assembleEntry, sumLabelHit } from '../core/labels.ts'
import { buildEtymology, esumScanEvidence } from '../core/etymology.ts'
import { dictById } from '../core/se.ts'
import { SOURCES } from '../core/sources.ts'

// invented text in the layout of the scans (nothing is quoted from the books)
const ab = (i: number) => 'Т' + 'абвгдежзиклмнопрстуфхцчшщюя'[i % 26] + 'абвгдежзиклмнопрстуфхцчшщюя'[Math.floor(i / 26)]
const settlTl = [
  '     УМОВНІ СКОРОЧЕННЯ НАЗВ НАСЕЛЕНИХ ПУНКТІВ, ДЕ ЗАФІКСОВАНО',
  '     ГОВІРКОВУ ЛЕКСИКУ В 2-ІЙ ПОЛОВИНІ XX СТ. /1953-1990рр./.',
  '',
  ...Array.from({ length: 120 }, (_, i) => `${ab(i)}.`.padEnd(8) + `  - с.Тест${i} Тестового р-ну Запорізької обл.`),
  'Єл.      - с.Єлизаветівка Басилівського р-ну Запорізької обл.',
  'Куш.     - с.Кушугум Запорізького р-ну Запорізької обл.',
  'БалВ     - с.Балки Василівського р-ну Запорізької обл.',
]
const old = '     УМОВНІ СКОРОЧЕННЯ НАЗВ НАСЕЛЕНИХ ПУНКТІВ, У ЯКИХ ГОВІРКОВУ\n     ЛЕКСИКУ ЗАФІКСОВАНО В 2-ІЙ ПОЛОВИНІ XIX - 1-Й ПОЛОВИНІ\n     XX СТ. /І856-І938рр./.\n\nЛбм.      - с.Любимівка Новомосковського пов. Катеринославської\n           губ.\n'
const settlements = () => parseSettlements([old, settlTl.join('\n')])

const ocrPage = [
  'АБАЖУРИК /абажур\'ік/, а, ч. Маленький абажур. Дай мені абажурик /Єл./, Куш.',
  'АБИРКАТЬ /абиркат\'/, аю, аєш, недок. Гукати на овець. Абиркаю на отару /Єл./.',
  'АБРИКОСЕЦЬ, сця, ч., бот. Абрикос; плід абрикоса. Це абрикосець /БалВ/.',
  '2. перен., ірон. Дурень, нетяма. Ну ти й абрикосець /Куш./.',
].join('\n')
const tlPage = '    АБАЖУРИК /абажур\'ік/, а, ч. Маленький абажур. Дай мені абажурик /Єл./, Куш.\n    АБИРКАТЬ /абиркат\'/, аю, аєш, недок. Гукати на овець. Абиркаю на отару /Єл./.\n    АБРИКОСЕЦЬ, сця, ч., бот. Абрикос; плід абрикоса. Це абрикосець /БалВ/.\n    2. перен., ірон. Дурень, нетяма. Ну ти й абрикосець /Куш./.\n    *АБУЇЗЬКО, а, ч. Хлопець /ЯСл,64 - Лбм./.\n'
const page = (tl = tlPage, text = ocrPage) => ({ text, tl, no: 7 })

describe('SE-14 Чабаненко parser', () => {
  it('the lists of settlements are read from the text layer (modern and old); a short list is not trusted', () => {
    const s = settlements()
    expect(s.modern.get('Єл')).toMatch(/Єлизаветівка/); expect(s.old.get('Лбм')).toMatch(/Любимівка Новомосковського пов\./)
    expect(parseSettlements([settlTl.slice(0, 10).join('\n')]).modern.size).toBe(0)
  })
  it('places: abbreviations after the illustration; the old source «/ЯСл,64 - Лбм./» is read through the old list', () => {
    const s = settlements()
    const p = placesOf('Дай мені абажурик /Єл./, Куш. /БалВ/', s)
    expect(p.abbrs).toEqual(['Єл', 'Куш', 'БалВ']); expect(p.names[0]).toBe('Єлизаветівка Васильівського р-ну'.replace('Васильівського', 'Василівського'))
    const o = placesOf('Хлопець /ЯСл,64 - Лбм./', s); expect(o.old).toBe(true); expect(o.names[0]).toMatch(/Любимівка/)
    expect(placesOf('Так само в усіх інших насел. пунктах, де вживається X', s).all).toBe(true)
  })
  it('articles confirmed by both readings: headword, POS, labels, numbered senses, gloss; the transcription and the illustration are never taken', () => {
    const r = parseNan([page()], 1, settlements(), h => h === 'абажурик').rows
    const a = r.find(x => x.head === 'абажурик')!, b = r.find(x => x.head === 'абрикосець')!
    expect(a).toMatchObject({ pos: 'ч.', vol: 1, page: 7, wl: false }); expect(a.senses).toEqual([{ n: 1, labels: [], gloss: 'Маленький абажур' }])
    expect(b.senses.map(s => [s.n, s.labels, s.gloss])).toEqual([[1, [], 'Абрикос; плід абрикоса'], [2, ['ірон.'], 'Дурень, нетяма']])
    expect(b.wl).toBe(true); expect(a.v?.[0]).toMatch(/Єлизаветівка/)
    expect(r.find(x => x.head === 'абиркать')!.pos).toBe('недок.')
    expect(JSON.stringify(r)).not.toMatch(/Дай мені|Це абрикосець|абажур'ік|Гукати на овець\. Абиркаю/)
  })
  it('the label hit: a standard headword only records the PLACE (place-only), a non-standard one is a word of the area (strict); the dialect group STP', () => {
    const rows = parseNan([page()], 1, settlements(), h => h === 'абажурик').rows
    const [, ra] = nanRows(rows.find(x => x.head === 'абажурик')!)[0]!, [, rb] = nanRows(rows.find(x => x.head === 'абрикосець')!)[0]!
    expect(ra.lb![0]).toBe(NAN_PLACE); expect(rb.lb![0]).toBe(NAN_LABEL); expect(ra).toMatchObject({ d: 'chabanenko', l: 'т.1 с.7' }); expect(ra.q).toBeUndefined()
    const hp = sumLabelHit('chabanenko', NAN_PLACE, 'Маленький абажур', undefined, 'Єлизаветівка')!, hw = sumLabelHit('chabanenko', NAN_LABEL, 'Дурень', undefined, 'Куш')!
    expect(hp).toMatchObject({ t: 'nan-labels', kind: 'area', v: 'lower_dnipro', p: true, g: 'STP' }); expect(hw.p).toBeUndefined(); expect(hw.g).toBe('STP')
    const strict = assembleEntry({ dict: [], usage: [], kind: 'dict', se: [{ d: 'chabanenko', lb: [NAN_LABEL], g: 'Дурень', v: ['Куш'] }] })
    const place = assembleEntry({ dict: [], usage: [], kind: 'dict', se: [{ d: 'chabanenko', lb: [NAN_PLACE], g: 'Маленький абажур', v: ['Єл'] }] })
    expect(strict.d.c).toBe('dict'); expect(strict.d.strict).toBe(true); expect(place.d.c).toBe('dict'); expect(place.d.strict).toBe(false)
  })
  it('a reading seen once only is kept when it is word-like AND on the alphabetical spine; a cross-reference is not a row; the registry knows the book', () => {
    const s = settlements(), ocrOnly = { text: 'АБАБКА, и, ж. Маленька жирна їжа. /Куш./\n' + ocrPage, no: 7 }
    const r = parseNan([ocrOnly], 1, s).rows; expect(r.find(x => x.head === 'абабка')?.senses[0]!.gloss).toMatch(/Маленька/)
    expect(parseNan([{ text: 'АБАЖУР див. АБАЖУРИК\nАБАЖУРНИК, а, ч. Той, хто робить абажури. /Єл./', tl: '', no: 3 }], 1, s).stats.xref).toBe(1)
    expect(dictById('chabanenko')).toMatchObject({ harvested: true, edition: [1992, 1992] }); expect(SOURCES.CHABANENKO!.title).toMatch(/Чабаненко/)
  })
  it('the gloss is at most 200 characters, cut at a word boundary with «…»; debris is no gloss; POS from the grammar block', () => {
    const long = Array.from({ length: 60 }, () => 'довге слово').join(' ')
    const r = parseNan([{ text: `АБИТАЛЬНИК, а, ч. ${long}. /Єл./\nАБЛАКАТ, а, ч. Інше слово. /Єл./`, tl: `    АБИТАЛЬНИК, а, ч. ${long}. /Єл./\n    АБЛАКАТ, а, ч. Інше слово. /Єл./`, no: 1 }], 1, settlements()).rows
    const g = r.find(x => x.head === 'абитальник')!.senses[0]!.gloss; expect(g.length).toBeLessThanOrEqual(200); expect(g.endsWith('…')).toBe(true)
    expect(glossShape('губ. (')).toBe(false); expect(glossShape('Жін. до')).toBe(false); expect(glossShape('Маленький абажур')).toBe(true)
    expect(posOf('аю, аєш, недок., перех.')).toBe('недок. перех.'); expect(posOf('и, ж.')).toBe('ж.'); expect(posOf('а, е.')).toBe('прикм.'); expect(posOf('виг.')).toBe('виг.')
    const rows: NanRow[] = ['абетка', 'бабка', 'вдзхрг', 'гора'].map(head => ({ head, vol: 1, page: 1, senses: [{ n: 1, labels: [], gloss: 'слово' }] })); markNanSequence(rows)
    expect(rows.map(x => x.seq)).toEqual([true, true, false, true])
  })
})

const esumPage = (lo: string, hi: string, body: string, no: number) => `${lo}\n\n${hi}\n\n${body.replace(/(.{40,}?) /g, '$1\n')}\n\n${no}`
describe('SE-14 ЕСУМ parser', () => {
  it('statement: starts at «запозичення …» / «псл. …», 3 → з, no bibliography, ≤ 200 characters, a mangled form becomes […]', () => {
    const s = statementOf('— р. абажур, бр. абажур; — запозичення 3 французької мови; фр. abat-jour «затінювач» утворене від abattre «опускати» і jour «день». — Фасмер I 3; Преобр. I 1.')!
    expect(s.t).toMatch(/^запозичення з французької мови; фр\. abat-jour/); expect(s.t).not.toMatch(/Фасмер|Преобр/); expect(s.kind).toBe('bor')
    const p = statementOf('— р. бе; — псл. [*drsgwvitjil, похідне від *dr0gva «трясовина, болото, дряговина»; назва племені зумовлена болотистим характером.')!
    expect(p.kind).toBe('proto'); expect(p.t).toMatch(/\[…\]/); expect(p.t).toMatch(/похідне від/)
    expect(statementOf('— запозичення з німецької мови; ' + 'довге слово '.repeat(40))!.t.length).toBeLessThanOrEqual(ESUM_MAX)
    expect(statementOf('— немає нічого, тільки перелік форм р. слово; бр. слово')).toBeUndefined()
    expect(repairText('p. слово, Η. слово, запозичення 3 польської')).toBe('р. слово, н. слово, запозичення з польської'); expect(badToken('τρόπος')).toBe(false)
    expect(badToken('wRafla')).toBe(true); expect(badToken('3bKO!')).toBe(true); expect(excerptClean('запозичення з польської мови; п. dach «дах»')).toBe(true); expect(excerptClean('пси а пл nn пб п дчуу')).toBe(false)
  })
  it('a volume: running head, page number from the footer, headword on the spine and in the page range, one row per headword with volume/page', () => {
    const pg = (i: number, lo: string, hi: string, body: string) => ({ idx: i + 2, text: esumPage(lo, hi, body, i) })
    const body1 = 'абажур «затінювач лампи»; — р. абажур; — запозичення з французької мови; фр. abat-jour «тс.» утворене від abattre «опускати».— Фасмер I 3. абрикос «плодове дерево»; — р. абрикос; — запозичення з нідерландської мови через польську; п. abrykos «тс.». — Фасмер I 4.'
    const body2 = 'бавовна «рослина»; — р. бавовна; — запозичення з італійської мови; іт. bambagia «вата» походить від лат. bambax.— Фасмер I 5.'
    const pages = [pg(10, 'абажур', 'абрикос', body1), pg(11, 'бавовна', 'бавовна', body2), pg(12, 'вага', 'вага', 'Бібліографія.'), pg(13, 'вага', 'вага', 'порожньо'), pg(14, 'вага', 'вага', 'ще')]
    expect(pageHead(pages[0]!.text)).toMatchObject({ lo: 'абажур', hi: 'абрикос', no: 10 }); expect(pageOffset(pages)).toBe(2)
    const { rows, stats } = parseEsum(pages, 1)
    expect(rows.map(r => [r.head, r.vol, r.page, r.kind])).toEqual([['абажур', 1, 10, 'bor'], ['абрикос', 1, 10, 'bor'], ['бавовна', 1, 11, 'bor']])
    expect(rows[0]!.t.length).toBeLessThanOrEqual(ESUM_MAX); expect(stats.entries).toBe(3)
  })
  it('the etymology panel gets ONE Q-evidence with volume and page; the excerpt is ≤ 200 characters; no article text is stored', () => {
    const ev = esumScanEvidence({ t: 'запозичення з французької мови; фр. abat-jour «тс.»', v: 1, p: 10 })
    expect(ev).toMatchObject({ source: 'ESUM', locator: 'ЕСУМ, т. 1, с. 10', kind: 'Q' }); expect(ev.quote.length).toBeLessThanOrEqual(201)
    const e = buildEtymology('абажур', undefined, undefined, [], undefined, '', [], undefined, '', { t: 'запозичення з французької мови', v: 1, p: 10 })!
    expect(e.sources).toHaveLength(1); expect(e.sources[0]!.locator).toBe('ЕСУМ, т. 1, с. 10')
  })
})
