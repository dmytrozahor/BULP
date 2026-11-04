/**
 * SPEC 63 SE-15: the © dialect dictionaries (Онишкевич, Сабадош, Словник буковинських говірок, Гуцульські говірки, Лисенко) from the owner-supplied scans, the second mask `extra.d2`.
 * Offline; the text below is INVENTED in the layout of the scans (nothing is quoted from the books).
 */
import { describe, expect, it } from 'vitest'
import { DICT_SRC2, dictInfo, dictSources, isDictOnly, shardsOfCv, type CvEntry } from '../core/cv.ts'
import { groupHist, selectHist } from '../core/dx-hist.ts'
import { HIST_BY_ID, HIST_MASK1, HIST_MASK2 } from '../core/dx-src.ts'
import { assembleEntry, sumLabelHit } from '../core/labels.ts'
import { dictById } from '../core/se.ts'
import { SOURCES } from '../core/sources.ts'
import { BUK_LABEL, BUK_PLACE, HUT_LABEL, ONY_LABEL, ONY_PLACE, POL_DICT, SAB_LABEL, SAB_PLACE, bukPlaces, codeKey, dialRows, firstSentence, markSpine, parseBukovyna, parseHutsul, parseOnyPlaces, parseOnyshkevych, parsePolPlaces, parsePolissia, parseSabadosh, sabFixHead, stripCodeGroups, strictHead, type DialRow } from '../core/se15-parse.ts'

describe('SE-15 the second mask extra.d2 (HIST_SRC bit 2^31 is unsafe in an int32 mask)', () => {
  it('the dictionaries of the second mask have distinct small powers of two, none of them in the first mask; the first mask is unchanged', () => {
    const bits = HIST_MASK2.map(s => s.bit)
    expect(new Set(bits).size).toBe(bits.length); for (const b of bits) { expect(b & (b - 1)).toBe(0); expect(b).toBeLessThan(2 ** 30) }
    expect(HIST_MASK2.map(s => s.ids[0])).toEqual(expect.arrayContaining(['chabanenko', 'onyshkevych', 'sabadosh', 'bukovyna', 'hutsul', 'lysenko']))
    expect(HIST_MASK1.length + HIST_MASK2.length).toBeGreaterThan(30); expect(Math.max(...HIST_MASK1.map(s => s.bit))).toBeLessThanOrEqual(2 ** 30)
    expect(DICT_SRC2.length).toBe(HIST_MASK2.length)
  })
  it('a card known only to second-mask dictionaries is dictionary-only: d2 names them, no first-mask bit is needed; the shard format stays a number', () => {
    const d2 = HIST_BY_ID['onyshkevych']!.bit | HIST_BY_ID['hutsul']!.bit
    const e: CvEntry = ['слово', '', 0, [], { d2 }]
    expect(isDictOnly(e)).toBe(true)
    const info = dictInfo(e)!; expect(info.dictOnly).toBe(true); expect(info.sources).toHaveLength(2); expect(info.sources[0]).toMatch(/Онишкевич/); expect(info.sources[1]).toMatch(/Гуцульські говірки/)
    expect(dictSources(1, d2)).toHaveLength(3); expect(JSON.stringify(e[4])).toBe(`{"d2":${d2}}`)
    expect(shardsOfCv([['слово', e]]).flatMap(s => Object.values(s))[0]![0]).toBe('')   // the card word equals its key: stored as '' like the other dictionary-only cards
  })
  it('groupHist / selectHist carry the second mask: a headword of Онишкевич makes a new card with mask2, and merges into an existing dictionary-only card', () => {
    const stats = {}, g = groupHist([{ word: 'бервінок', src: 'onyshkevych' }, { word: 'бервінок', src: 'bukovyna' }, { word: 'ґазда', src: 'r2u_hrinch09' }], stats)
    const r = selectHist(g, cands => (cands.includes('газда') ? ['газда', 'do'] : undefined), () => 0, stats)
    const n = r.news.find(x => x.word === 'бервінок')!
    expect(n.mask).toBe(0); expect(n.mask2).toBe(HIST_BY_ID['onyshkevych']!.bit | HIST_BY_ID['bukovyna']!.bit)
    const m2 = selectHist(groupHist([{ word: 'газда', src: 'onyshkevych' }], {}), cands => (cands.includes('газда') ? ['газда', 'do'] : undefined), () => 0, {})
    expect(m2.news).toEqual([]); expect(m2.merges).toEqual([['газда', 0, HIST_BY_ID['onyshkevych']!.bit]])
  })
})

const OCR_ONY = [
  'БАТИГА, батйіга /Х-в, К-ки/, батага /Б-ля Мат. П, 12/ 1. "палиця; 2. "кнут" /Х-в/. - Ий добре дала батігою по спині /Б-ля/.',
  '',
  'БАТИГАР /Х-в/ див. батига.',
  '',
  'БАЦОЛА /К-ки/ "горщик із вузьким горлом. Ще: бацулка. Пор. пол. baca.',
  '',
  'ВАГАНЬ, род. -ню /Х-в/ перев. заст. "відро; Ф ваганем носити /Х-в/ "багато".',
].join('\n')
const placesText = ['Х-в - Хащів Старосамбірського р-ну', 'К-ки - Кальне Сколівського р-ну', 'Б-ля - Бітля Турківського р-ну'].join('\n')
describe('SE-15 Онишкевич', () => {
  it('the list of settlements is read; the code is matched through the OCR confusions of the typescript', () => {
    const m = parseOnyPlaces([placesText])
    expect(m.get(codeKey('Х-в'))).toBe('Хащів'); expect(m.get(codeKey('Б-ля'))).toBe('Бітля'); expect(codeKey('Б-ля')).toBe(codeKey('Б-яя'))
  })
  it('entries: headword, senses, places; the illustration, the cross-reference tail and the foreign parallel are never taken; a cross-reference is a row with «див.»', () => {
    const m = parseOnyPlaces([placesText]), r = parseOnyshkevych([{ text: OCR_ONY, no: 5 }], 1, m, h => h === 'ваганьк').rows
    const a = r.find(x => x.head === 'батига')!, b = r.find(x => x.head === 'бацола')!
    expect(a.senses.map(s => [s.n, s.gloss])).toEqual([[1, 'палиця'], [2, 'кнут']]); expect(a.v).toEqual(['Хащів', 'Кальне', 'Бітля'].slice(0, a.v!.length)); expect(a.v![0]).toBe('Хащів')
    expect(b.senses[0]!.gloss).toMatch(/^горщик із вузьким горлом/); expect(JSON.stringify(r)).not.toMatch(/по спині|baca|бацулка/)
    expect(r.find(x => x.head === 'батигар')).toMatchObject({ xref: true }); expect(r.find(x => x.head === 'батигар')!.senses[0]!.gloss).toBe('див. батига')
  })
  it('rows: a standard word records only the PLACE, a non-standard one is a word of the area; the label table resolves to Бойківщина (dialect group BOY)', () => {
    const m = parseOnyPlaces([placesText]), r = parseOnyshkevych([{ text: OCR_ONY, no: 5 }], 1, m, h => h === 'ваганьк' || h === 'вагань').rows
    const rows = (h: string) => dialRows('onyshkevych', r.find(x => x.head === h)!)
    expect(rows('батига')[0]![1]).toMatchObject({ d: 'onyshkevych', l: 'ч.1 с.5', lb: [ONY_LABEL] }); expect(rows('вагань')[0]![1].lb![0]).toBe(ONY_PLACE)
    const hit = sumLabelHit('onyshkevych', ONY_LABEL, 'палиця', undefined, 'Хащів')!
    expect(hit).toMatchObject({ t: 'ony-labels', kind: 'area', v: 'boyko', g: 'BOY' }); expect(hit.p).toBeUndefined()
    expect(sumLabelHit('onyshkevych', ONY_PLACE, 'відро', undefined, 'Хащів')).toMatchObject({ p: true, g: 'BOY' })
    expect(assembleEntry({ dict: [], usage: [], kind: 'dict', se: [{ d: 'onyshkevych', lb: [ONY_LABEL], g: 'палиця', v: ['Хащів'] }] }).d.strict).toBe(true)
    expect(assembleEntry({ dict: [], usage: [], kind: 'dict', se: [{ d: 'onyshkevych', lb: [ONY_PLACE], g: 'відро', v: ['Хащів'] }] }).d.strict).toBe(false)
  })
  it('the gloss is at most 200 characters, cut at a word boundary with «…»', () => {
    const long = Array.from({ length: 60 }, () => 'довге слово').join(' ')
    const r = parseOnyshkevych([{ text: `БАБАЛА /Х-в/ "${long}".`, no: 1 }], 1, parseOnyPlaces([placesText])).rows
    const g = r[0]!.senses[0]!.gloss; expect(g.length).toBeLessThanOrEqual(200); expect(g.endsWith('…')).toBe(true)
  })
})

const COLS = (l: string, r: string) => `${l}\n<<COL>>\n${r}`
const OCR_BUK = COLS(['БРА', '', 'БРАЧИНА, -и, ж. 1. Родина фіалкових, братки. Заг. Шкода косити траву, бо багато браччиків (Сокиряни).', '', 'БРЕНЬКАТИ. 1. знев. Базікати. Док. БРЕНЬКНУТИ. Заст., Кіцм., Хот. Ди не бренькай (Бабин Заст.). 2. Ударяти. Заст., Кіцм. Кінь бренькнув ногов (Валява Кіцм.).'].join('\n'),
  ['39 БРО', '', 'БРЕХЛИВЕЦ, -вца, ч. Брехун. Заст., Кіцм. Ях ти ж брехливеу (Южинець Кіцм.).', '', 'БРИ, БРИЙ, МОЙ БРИ, вигук. Форма звертання до знайомої людини. Хот., Кельм. Гей, ей ти!', '', 'ПОКВОЧИТИ, док. до КВОЧИТИ. Перестати бути квочкою. Заст.'].join('\n'))
describe('SE-15 Словник буковинських говірок / Сабадош (two columns, capital headwords)', () => {
  it('Bukovyna: columns are read apart, the running head is skipped, districts are the places, «Заг.» = everywhere, the first sentence is the gloss, the example is not kept', () => {
    const r = parseBukovyna([{ text: OCR_BUK, no: 38 }], h => h === 'брехливец').rows
    expect(r.map(x => x.head)).toEqual(['брачина', 'бренькати', 'брехливец', 'бри', 'поквочити'])
    const b = r.find(x => x.head === 'бренькати')!
    expect(b.senses.map(s => [s.n, s.labels, s.gloss])).toEqual([[1, ['знев.'], 'Базікати'], [2, [], 'Ударяти']]); expect(b.extra).toEqual(['бренькнути']); expect(b.v).toEqual(['Заставнівський р-н', 'Кіцманський р-н', 'Хотинський р-н'])
    expect(r.find(x => x.head === 'брачина')!.all).toBe(true); expect(r.find(x => x.head === 'бри')!.extra).toEqual(['брий', 'мой'])
    expect(JSON.stringify(r)).not.toMatch(/Шкода косити|Ди не бренькай|Кінь бренькнув|Бабин/)
    expect(r.find(x => x.head === 'поквочити')!.extra ?? []).not.toContain('квочити')   // «док. до КВОЧИТИ» is a reference, not a headword
    expect(bukPlaces('Заг. Стор., Хот.')).toEqual({ names: ['Сторожинецький р-н', 'Хотинський р-н'], all: true })
  })
  it('Bukovyna labels: strict for a non-standard word, place-only for a VESUM lemma; no dialect group is claimed (the gazetteer has none)', () => {
    const r = parseBukovyna([{ text: OCR_BUK, no: 38 }], h => h === 'брехливец').rows
    expect(dialRows('bukovyna', r.find(x => x.head === 'брехливец')!)[0]![1]).toMatchObject({ d: 'bukovyna', l: 'с.38', lb: [BUK_PLACE] })
    expect(dialRows('bukovyna', r.find(x => x.head === 'бри')!)[0]![1].lb![0]).toBe(BUK_LABEL)
    const h = sumLabelHit('bukovyna', BUK_LABEL, 'Брехун', undefined, 'Кіцманський р-н')!; expect(h).toMatchObject({ v: 'bukovyna' }); expect(h.g).toBeUndefined()
  })
  it('Сабадош: one locality; the OCR of the vowel «ы» is repaired; the endings after a stress mark read as «І…» are no gloss; a one-sentence gloss', () => {
    expect(sabFixHead('умньй')).toBe('умный'); expect(sabFixHead('закладеньїй')).toBe('закладеный')
    const txt = COLS('ЗАКРИЛО [закрило], а, с. Те саме, що покривало. Пор. угор. xx. Покривало над ліжком.\n\nДУМЧИТИ [дум"чити], Ічу, ічиш, недок. Витримувати щось у тепло.', '')
    const r = parseSabadosh([{ text: txt, no: 99 }], () => true).rows
    expect(r.map(x => x.head)).toEqual(['закрило', 'думчити']); expect(r[1]!.senses[0]!.gloss).toBe('Витримувати щось у тепло'); expect(r[0]!.v).toEqual(['Сокирниця Хустського р-ну'])
    expect(dialRows('sabadosh', r[0]!)[0]![1].lb![0]).toBe(SAB_PLACE); expect(dialRows('sabadosh', { ...r[1]!, wl: true })[0]![1].lb![0]).toBe(SAB_LABEL)
    expect(sumLabelHit('sabadosh', SAB_LABEL, 'x', undefined, 'Сокирниця')).toMatchObject({ v: 'zakarpattia', g: 'ZAK' })
  })
  it('firstSentence does not stop at an abbreviation', () => { expect(firstSentence('Заповнювати отвір, та ін.; закладати. Закладалам д')).toBe('Заповнювати отвір, та ін.; закладати') })
})

describe('SE-15 Гуцульські говірки and Лисенко', () => {
  const HUT = COLS(['абазь // абирь виг. ужив. для відганяння овець', '', 'дєтіль (дятьол), -тла // довбач, -а зоол. (Picus) дятел', '', 'абирька див. обєрка', '', 'дерка (герка), -і 1. дірка; петля; 2. отвір у погребі: Дерка в обусі (Яв)'].join('\n'), '')
  it('Гуцульські: heads with synonyms «//», endings, labels, numbered senses, «див.»; the example after «:» is not kept', () => {
    const r = parseHutsul([{ text: HUT, no: 20 }]).rows
    expect(r.map(x => x.head)).toEqual(['абазь', 'дєтіль', 'абирька', 'дерка'])
    expect(r[0]).toMatchObject({ extra: ['абирь'] }); expect(r[0]!.senses[0]!.gloss).toBe('ужив. для відганяння овець'); expect(r[1]!.extra).toEqual(['довбач']); expect(r[1]!.senses[0]!.gloss).toBe('дятел')
    expect(r[2]).toMatchObject({ xref: true }); expect(r[3]!.senses.map(s => s.gloss)).toEqual(['дірка; петля', 'отвір у погребі']); expect(JSON.stringify(r)).not.toMatch(/в обусі/)
    expect(sumLabelHit('hutsul', HUT_LABEL, 'дятел')).toMatchObject({ v: 'hutsul', g: 'HUT' })
  })
  it('Лисенко: the list of settlements («Бв. - Білокоровичі, …»), the code groups in parentheses are places and are not part of the header; place-only for a standard word', () => {
    const pl = parsePolPlaces(['УМОВНІ СКОРОЧЕННЯ', 'Бв. - Білокоровичі, Олевського району, Житомирської обл.', 'Клв. - Калинівка, Носівського району, Чернігівської обл.'])
    expect(pl.get(codeKey('Бв.'))).toBe('Білокоровичі')
    expect(stripCodeGroups('КОВБИК (Бч., Кшв.), КОВБІК (Крм.), а, ч., анат. Шлунок (див.)')).toEqual({ text: 'КОВБИК , КОВБІК , а, ч., анат. Шлунок (див.)', codes: ['Бч.', 'Кшв.', 'Крм.'] })
    const r = parsePolissia([{ text: 'КОВБИК (Бв., Клв.), КОВБІК (Крм.), а, ч., анат. Шлунок. У його болить ковбик (Бв.).\n\nКОВБАСА, и, ж., перен. Те саме, що КАБАНЕЦ (Бв.).', no: 99 }], pl, h => h === 'ковбаса').rows
    expect(r.map(x => x.head)).toEqual(['ковбик', 'ковбаса']); expect(r[0]).toMatchObject({ extra: ['ковбік'] }); expect(r[0]!.senses[0]!).toMatchObject({ gloss: 'Шлунок', labels: ['анат.'] }); expect(r[0]!.v).toEqual(['Білокоровичі', 'Калинівка'])
    expect(dialRows(POL_DICT, r[1]!)[0]![1].lb![0]).toMatch(/місце запису/); expect(JSON.stringify(r)).not.toMatch(/болить/)
    expect(dictById('lysenko')).toMatchObject({ edition: [1974, 1974], harvested: true }); expect(SOURCES.LYSENKO!.title).toMatch(/Лисенко/)
  })
})

describe('SE-15 gates', () => {
  it('the alphabetical spine: a misread headword is off the spine and gets no card (unv); strict headword shape', () => {
    const mk = (head: string): DialRow => ({ head, vol: 1, page: 1, senses: [{ n: 1, labels: [], gloss: 'слово' }], ev: 3 })
    const rows = ['абетка', 'бабка', 'вдзхрг', 'гора', 'дім'].map(mk); markSpine(rows)
    expect(rows.map(x => x.seq)).toEqual([true, true, false, true, true])
    expect(dialRows('hutsul', rows[2]!)[0]![1].unv).toBe(1); expect(dialRows('hutsul', rows[0]!)[0]![1].unv).toBeUndefined()
    expect(strictHead('ковбик')).toBe(true); expect(strictHead('вдзхрг')).toBe(false); expect(strictHead('ьть')).toBe(false)
    markSpine([{ ...mk('слово'), ev: 1 }]); const weak = [{ ...mk('слово'), ev: 1 }]; markSpine(weak); expect(weak[0]!.seq).toBe(false)
  })
  it('all the new dictionaries are registered with a source, a coverage row and the SPEC 63 label table', () => {
    for (const id of ['onyshkevych', 'sabadosh', 'bukovyna', 'hutsul', 'lysenko']) { expect(dictById(id)).toBeTruthy(); expect(SOURCES[id.toUpperCase()]).toBeTruthy(); expect(HIST_BY_ID[id]!.m2).toBe(true) }
  })
})

import { corrRowsOf } from '../pipelines/se15-scan.ts'
import { dialectLexPairs } from '../core/corr-src.ts'
describe('SE-15 the CR-1 hook: one-word glosses of word-level rows', () => {
  it('only a word-level, verified row with ONE standard word as its gloss becomes a LexRow; the pair passes dialectLexPairs with the area codes of the book', () => {
    const rows = [
      ...dialRows('hutsul', { head: 'агрис', vol: 1, page: 17, senses: [{ n: 1, labels: [], gloss: 'агрус' }], ev: 3, wl: true, seq: true }),
      ...dialRows('hutsul', { head: 'газда', vol: 1, page: 17, senses: [{ n: 1, labels: [], gloss: 'господар' }], ev: 3, wl: false, seq: true }),   // a standard word: place-only, no correspondence
      ...dialRows('hutsul', { head: 'ґрунь', vol: 1, page: 18, senses: [{ n: 1, labels: [], gloss: 'гора з пологими схилами' }], ev: 3, wl: true, seq: true }),   // a multi-word gloss
      ...dialRows('hutsul', { head: 'зуфік', vol: 1, page: 18, senses: [{ n: 1, labels: [], gloss: 'шматок' }], ev: 3, wl: true, seq: false }),   // off the spine (unv)
    ]
    const c = corrRowsOf('hutsul', rows); expect(c).toHaveLength(1); expect(c[0]).toMatchObject({ w: ['агрис'], gloss: 'агрус', codes: ['HUT'], loc: 'с.17' }); expect(c[0]!.q.length).toBeLessThanOrEqual(200)
    const rej: Record<string, number> = {}, pairs = dialectLexPairs(c, w => (w === 'агрус' ? new Set(['noun']) : undefined), rej)
    expect(pairs).toHaveLength(1); expect(pairs[0]).toMatchObject({ a: 'агрус', b: 'агрис', pos: 'noun', src: 'dialect-lex' }); expect(pairs[0]!.areaB![0]).toMatchObject({ code: 'HUT', grade: 'dict' })
    expect(corrRowsOf('lysenko', dialRows('lysenko', { head: 'вить', vol: 1, page: 3, senses: [{ n: 1, labels: [], gloss: 'плести' }], ev: 3, wl: true, seq: true }))[0]!.codes).toEqual(['MPL', 'CHN'])
  })
})

import { SLA_DICT, SLA_LAT_YEAR, SLA_SLOV_YEAR, foldLatin, latinWord, onSpine, parseLatinPages, parseSlovPages, slaGlossRows, slaSlovRows } from '../core/slavynetsky-parse.ts'
describe('SE-15 Славинецький (public-domain text of 1642 / 1650; the notes of the 1973 edition are not stored)', () => {
  const LAT = COLS(['balaustiu(m). цвѣ(т) шн(ш)ка, шн(п)ка,', 'balneum. баня, мы(л)ня,', 'balsamum. ва(л)са(м)ъ.', '', ' К I правильно тільки редакторська примітка.', 'balzzzz. не береться'].join('\n'), ['baptes. пру(д), бу(р)шти(н),', 'barba. брада,'].join('\n'))
  it('Latin part: head in ASCII, the letters in parentheses belong to the word, the glosses are Cyrillic; every column is cut at its first footnote line (the notes are ©)', () => {
    const e = parseLatinPages([{ text: LAT, no: 70 }])
    expect(e.map(x => x.head)).toEqual(['balaustium', 'balneum', 'balsamum', 'baptes', 'barba'])
    expect(e[1]).toMatchObject({ gloss: ['баня', 'мылня'], page: 70 }); expect(e[0]!.gloss).toEqual(['цвѣт шншка', 'шнпка'].map(x => x))   // «цвѣт шншка»: both words keep the completions
    expect(JSON.stringify(e)).not.toMatch(/редакторська|береться/); expect(e[4]!.gloss).toEqual(['брада'])
  })
  it('word-pair part: the Slavonic head, the Latin words (a garbled Latin word is not kept)', () => {
    const e = parseSlovPages([{ text: COLS('Закалатель. Lanio. Carnifex.\nЗакалателный. Lanignus. Xz9q#.\nЗаклады. Pignus, hypotheca.', ''), no: 450 }])
    expect(e.map(x => [x.head, x.latin])).toEqual([['закалатель', ['lanio', 'carnifex']], ['закалателный', ['lanignus']], ['заклады', ['pignus', 'hypotheca']]])
    expect(latinWord('lanio')).toBe(true); expect(latinWord('xz9q')).toBe(false); expect(latinWord('strnghts')).toBe(false)
  })
  it('rows: dated by the manuscript (1642 / 1650), keyed by the single-word gloss; a multi-word gloss and a stop word are no key; the alphabetical spine drops a misread head', () => {
    const g = slaGlossRows([{ head: 'balneum', gloss: ['баня', 'мыльня', 'прилипки на сапогах', 'тожъ'], page: 70 }])
    expect(g.map(x => x[0])).toEqual(['баня', 'мыльня']); expect(g[0]![1]).toMatchObject({ d: SLA_DICT, e: SLA_LAT_YEAR, l: expect.stringContaining('с. 70') }); expect(g[0]![1].g).toBe('лат. «balneum» = баня, мыльня, прилипки на сапогах, тожъ')
    const s = slaSlovRows([{ head: 'закалатель', latin: ['lanio'], page: 450 }]); expect(s[0]![1]).toMatchObject({ d: SLA_DICT, e: SLA_SLOV_YEAR, g: 'лат. lanio' }); expect(SLA_LAT_YEAR).toEqual([1642, 1642]); expect(SLA_SLOV_YEAR).toEqual([1650, 1650])
    expect(onSpine(['aa', 'bb', 'zz', 'cc', 'dd'].map(head => ({ head })), foldLatin).map(x => x.head)).toEqual(['aa', 'bb', 'cc', 'dd'])
    expect(dictById('slavynetsky')).toMatchObject({ typed: true, quoteDates: true, cover: [1642, 1650] }); expect(SOURCES.SLAVYNETSKY!.title).toMatch(/Славинецький/)
  })
})
