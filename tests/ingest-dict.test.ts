import { describe, it, expect } from 'vitest'
import { parseHeadwords, dictDate, dictWitnesses, cleanVariant, alphabeticalFilter } from '../pipelines/ingest-dict.ts'
import { UNITS_DICT, AUTHORS_DICT } from '../pipelines/nw-dict.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'

// verbatim lines of archive.org staroukr1 (OCR), incl. running heads, a bibliography line and a marker-misread headword (ХКРИХОВЬЄ = КРИХОВЬЄ)
const FIX = `ФОРМИ: наз. одн. (кінець попередньої статті)

АБО спол. (90) І. (зв'язує члени речення) (87) 1. (роз-
діловий) або: а коли привезоут (Сучава, 1460 ВР ПП, 275); (Путна, 1471 ВО 1, 159).

АВГУСТЬ, АВГУСТ, АУГОУСТЬ ч. (66) (цсл. авьгоусть,
гр. а" буорстоб) (назва місяця) серпень: писань
в ль(т) о 8ци агоуста Д днь (б. м. н., 1400 РІ К«Д» 433); су перевалєхь (Перевали, 1440 Р 142У;

ХАВЬГОУСЬТЬ


б

АВЄРЄЩИЄ мн. (1) (назва села у Молдавському князівстві):
жидєщіє и аверєщиє (Сучава, 1438 Собі. ЇЇ, 7).

ФОРМИ: наз. авєрєщиє (1438 Собі. ІП, 7).

АВРААМ див. АВРАМЬ.

АВРАМЬ, АВРАМ, АВРААМЬ, ААВРАМ ч. (13) (особо-
ва назва) Аврам: а при (Київ, 1398 ДГПМ);

ЗАВ'ЕЗСКА див. АВ'ЕСКА.

ЮСУПОВ, ПОЛЬСЬКІ ДОКУМЕНТИ, Київ-57, Довженка, 3 на Книжковій ф-ці

"АВЬГОУСЬТЬ див. АВГУСТЬ.

АВЬРО ч. (5) (особова назва, молд., цсл. Авєркии) Оверкій: мью Стєфан
ХКРИХОВЬЄ с. (І) (назва місцевості у Львівській землі): та (Львів, 1420 ДГ)

АВРАМОВИЧ 4. (1) (особова назва): А при томь (Ровно, 1488 45 І, 242).
`

describe('BL-11 dictionary headwords from OCR djvu text', () => {
  const hs = parseHeadwords(FIX)
  it('reads UPPERCASE variants + POS + (n) or див.; skips running heads, bibliography and prose', () => {
    expect(hs.map(h => h.variants[0])).toEqual(['або', 'августь', 'авєрєщиє', 'авраам', 'аврамь', "ав'езска", 'авьгоусьть', 'авьро', 'аврамович'])
  })
  it('keeps every variant of a multi-spelling headword', () => expect(hs.find(h => h.variants[0] === 'августь')!.variants).toEqual(['августь', 'август', 'аугоусть']))
  it('a spurious marker letter before the headword is repaired by alphabetical order (ХКРИХОВЬЄ → криховьє)', () => {
    const mk = (w: string, at: number) => ({ line: w, variants: [w], years: [], at })
    const r = alphabeticalFilter(['крав', 'крив', 'хкриховьє', 'кров', 'крук'].map(mk))
    expect(r.map(h => h.variants[0])).toEqual(['крав', 'крив', 'криховьє', 'кров', 'крук'])
  })
  it('date = earliest dated citation «(Place, YEAR» of the entry; decade bucket; none for см.-references', () => {
    expect(dictDate(hs.find(h => h.variants.includes('август'))!)).toEqual([1400, 1409])
    expect(dictDate(hs.find(h => h.variants.includes('або'))!)).toEqual([1460, 1469])
    expect(dictDate(hs.find(h => h.variants.includes('авраам'))!)).toBeUndefined()
  })
  it('cleanVariant: parenthesised letters give two readings; Latin/digit junk is refused', () => {
    expect(cleanVariant('АВГОУ(СТ)')).toEqual(['авгоу', 'авгоуст'])
    expect(cleanVariant('АВ1СТЬ')).toEqual([])
    expect(cleanVariant('АБИ!')).toEqual(['аби'])
  })
  it('alphabeticalFilter drops an isolated out-of-order OCR entry', () => {
    const mk = (w: string, at: number) => ({ line: w, variants: [w], years: [], at })
    expect(alphabeticalFilter([mk('аба', 1), mk('абв', 2), mk('юра', 3), mk('абг', 4), mk('абд', 5)]).map(h => h.variants[0])).toEqual(['аба', 'абв', 'абг', 'абд'])
  })
})

describe('BL-11 dictionary witnesses', () => {
  const u = UNITS_DICT[0]!
  const ws = dictWitnesses(u, FIX, '1')
  it('one witness per decade of the earliest citation, plus an undated one; witnessType dictionary', () => {
    expect(ws.map(w => w.id)).toEqual(['dsu14_1_1390', 'dsu14_1_1400', 'dsu14_1_1430', 'dsu14_1_1460', 'dsu14_1_1480', 'dsu14_1_nd'])
    expect(ws.every(w => w.witnessType === 'dictionary')).toBe(true)
    expect(ws.find(w => w.id.endsWith('_1400'))!.date).toEqual([1400, 1409])
    expect(ws.find(w => w.id.endsWith('_nd'))!.date).toEqual([1301, 1500])
  })
  it('locator = volume, OCR line and the verbatim headword line (evidence)', () => {
    const t = ws.find(w => w.id.endsWith('_1400'))!.tokens[0]!
    expect(t.loc).toMatch(/^т\.1 ряд\. \d+: АВГУСТЬ, АВГУСТ, АУГОУСТЬ ч\. \(66\)/)
  })
  it('the dictionary author is admissible (institutional, provisional, with a Q quote) and carries the weakest witnessType', () => {
    expect(AUTHORS_DICT[0]!.evidence[0]!.kind).toBe('Q')
    expect(admit({ id: ws[0]!.id, author: ws[0]!.author }, authorById[ws[0]!.author])).toEqual({ ok: true })
  })
})
