import { describe, expect, it } from 'vitest'
import { ARK_LABEL, arkRows, markSequence, parseArkushyn, strictHead, parseVillages, villageNumbers } from '../core/arkushyn-parse.ts'
import { sumLabelHit, assembleEntry } from '../core/labels.ts'
import { HIST_BY_ID } from '../core/dx-src.ts'
import { groupHist } from '../core/dx-hist.ts'

const vil = { byNo: new Map([[392, 'Сильно Ківерцівського району Волинської області'], [10, 'Білин Ковельського району Волинської області']]), names: [] }
// synthetic page in the layout of the scan (invented entries, not quoted from the book)
const page = [
  'АВКА АВРАТИ',
  'А',
  'АВКА |авка| -и, ж. "місце, де ховається лисиця" Лис ліз у авку. 392, 10.',
  'АВРАТИ |авра́ти| -айу, -айеш, недок. 1. "кричати"; 2. "дуже плакати". Він авра́йе. 10.',
  'АВРІЙ (авр\'їй| -ю, ч., бот. "рослина; Gratiola officinalis L." Авр\'їй росте. 392.',
  'АЗИТИ |азити| прис. "ось там" 392.',
  '12',
  'ЗХВІЗ |зхвіз| -у, ч. "сміття" 392.',
]
const rows = () => parseArkushyn([page.join('\n')], 1, () => 7, vil).rows

describe('LB-11 Аркушин parser', () => {
  it('headword, grammar, sense numbers, gloss, volume/page; the illustration and the transcription are not taken', () => {
    const r = rows(), a = r.find(x => x.head === 'авка')!
    expect(a).toMatchObject({ pos: '-и, ж.', vol: 1, page: 7 })
    expect(a.senses).toEqual([{ n: 1, labels: [], gloss: 'місце, де ховається лисиця' }])
    expect(JSON.stringify(r)).not.toMatch(/ліз|авра́йе|росте/)
    const v = r.find(x => x.head === 'авра́ти' || x.head === 'аврати')!
    expect(v.senses.map(s => [s.n, s.gloss])).toEqual([[1, 'кричати'], [2, 'дуже плакати']])
  })
  it('villages by the book numbering; the first number is the village of the illustration', () => {
    expect(rows().find(x => x.head === 'авка')!.v).toEqual(['Сильно Ківерцівського району Волинської області', 'Білин Ковельського району Волинської області'])
    expect(villageNumbers('Холм 35.').nums).toEqual([]); expect(villageNumbers('(у багатьох н. пп.)').all).toBe(true)
    expect(parseVillages(['Список населених пунктів', 'Бабин Гощанського району Рівненської області', 'А АДЮЧИНА']).byNo.size).toBe(0)   // wrong shape: no guessed places
  })
  it('gates: out-of-range and garbled headwords never get in; the Latin binomial tail is cut', () => {
    const r = rows()
    expect(r.some(x => x.head === 'зхвіз')).toBe(false)
    expect(r.find(x => x.head === 'аврій')!.senses[0]!.gloss).toBe('рослина')
  })
  it('© policy: gloss ≤ 200 with «…» on a word boundary; rows carry label зпол., place, no quote field', () => {
    const long = 'АВКА |авка| -и, ж. "' + 'слово '.repeat(60) + '" 392.'
    const g = parseArkushyn([['АВКА АВКА', long].join('\n')], 2, () => 3, vil).rows[0]!.senses[0]!.gloss
    expect(g.length).toBeLessThanOrEqual(200); expect(g.endsWith('…')).toBe(true)
    const [h, row] = arkRows(rows().find(x => x.head === 'авка')!)[0]!
    expect(h).toBe('авка'); expect(row).toMatchObject({ d: 'arkushyn', l: 'т.1 с.7', lb: [ARK_LABEL] }); expect(row.q).toBeUndefined()
  })
  it('LB-11 class (a): a row of the dictionary gives «діалектне за словником» with the place; GG source is registered', () => {
    const h = sumLabelHit('arkushyn', ARK_LABEL, 'гадюка', undefined, 'Білин Ковельського району')!
    expect(h).toMatchObject({ t: 'arkushyn-labels', kind: 'area', v: 'polissia', place: 'Білин Ковельського району' })
    const e = assembleEntry({ dict: [], usage: [], kind: 'dict', se: [{ d: 'arkushyn', lb: [ARK_LABEL], g: 'гадюка', v: ['Білин'] }] })
    expect(e.d.c).toBe('dict'); expect(e.d.strict).toBe(true)
    const g = groupHist([{ word: 'авка', src: 'arkushyn' }]); expect(HIST_BY_ID.arkushyn!.bit).toBe(2097152); expect(g.size).toBe(1)
  })
  it('LB-11 new-card gates: a headword out of the alphabetical order, a truncated adjective or a transcription mismatch is marked unverified (unv) and kept off new cards', () => {
    const mk = (head: string, pos = '-и, ж.', tr = ''): import('../core/arkushyn-parse.ts').ArkRow => ({ head, pos, vol: 1, page: 1, senses: [{ n: 1, labels: [], gloss: 'x' }], ...(tr ? { tr } : {}) })
    const rs = [mk('абетка'), mk('бабка'), mk('вдзхрг'), mk('гора'), mk('дорога'), mk('жито', '-а, -е'), mk('колтезча', '-и, ж.', '|колотеча|'), mk('нудни', '-а, -е'), mk('порох')]
    markSequence(rs)
    expect(rs.map(r => r.seq)).toEqual([true, true, false, true, true, true, false, false, true])
    expect(strictHead('ab'), 'short/mixed').toBe(false); expect(strictHead('гора')).toBe(true)
    const [, row] = arkRows(rs[2]!)[0]!; expect(row.unv).toBe(1)
  })
})
