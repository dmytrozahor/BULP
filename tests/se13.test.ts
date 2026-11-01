/**
 * SPEC 63 SE-13: Желехівський–Недільський «Малоруско-нїмецкий словар» 1886 (archive.org OCR): OCR gates, headword decode, German gloss recovery, attested spellings for the orthography view,
 * the 1886 sense row, the area labels. The text samples are modelled on verbatim OCR lines of zhelekhivsk1_djvu.txt.
 */
import { describe, it, expect } from 'vitest'
import { collapseSpaced, decodeHead, germanVocab, inOrder, isNoise, orderKey, parseVolume, posOf, recoverGloss, recoverToken, splitArticles, withStress } from '../core/zhel.ts'
import { attestedEdit, attestedFromZhel, OA_HEAD_RULE, OA_RULE } from '../core/orth-attested.ts'
import { toOrth } from '../core/orth-forward.ts'
import { claim } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import { DICT_COVER, isTypedDict } from '../core/se.ts'
import { pagesOf, ZHEL_VOLS } from '../harvest/zhelekhivsky.ts'
import { ownLabels } from '../pipelines/parse-zhel.ts'
import { zhelRows } from '../pipelines/build-se.ts'
import { scanZhel } from '../pipelines/build-labels.ts'
import { ZHEL_PRINT_LABELS, scanArticle } from '../core/dict-labels.ts'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const LEMMAS = new Set(['хрест', 'сміх', 'лікарня', 'вшити', 'бити', 'болячка', 'ірод', 'гвардійський', 'життя'])
const isLemma = (m: string) => LEMMAS.has(m)
const vocab = germanVocab(['Kreuz, n. Herodes; Teufel, m. arbeiten, machen. Schlag Schlagen sich'])

describe('SE-13 structure of the OCR text', () => {
  it('spaced bold letters are one word; running heads and page numbers are noise', () => {
    expect(collapseSpaced('К  р  е  с  т,  т.  Кгеиг;  п.')).toBe('Крест,  т.  Кгеиг;  п.')
    expect(collapseSpaced('Воняти,  V.  п.  ііЬеІгіесЬеп')).toBe('Воняти,  V.  п.  ііЬеІгіесЬеп')
    for (const n of ['378', 'II', '']) expect(isNoise(n)).toBe(true)
    expect(isNoise('Воняти,  V.  п.  ііЬеІгіесЬеп')).toBe(false)
  })
  it('an article starts on a capital headword + comma; the next lines continue it; a hyphenated line end is joined', () => {
    const t = ['378', '', 'К  р  е  с  т,  т.  Кгеиг;  п.', 'крбстний  еіс.', 'Крестбйни,  Сб.  1.301,  кре-', 'стйни,  рі.'].join('\n')
    const a = splitArticles(t)
    expect(a.length).toBe(2); expect(a[0]!.text).toBe('Крест, т. Кгеиг; п. крбстний еіс.'); expect(a[1]!.text).toContain('крестйни')
    expect(a[1]!.ns).toBeGreaterThan(a[0]!.ns)
  })
})

describe('SE-13 headword decode (VESUM through the Желехівка folds; stress only when the decode is unique)', () => {
  it('a printed spelling that is a lemma after the folds is taken as printed', () => {
    expect(decodeHead('Сьміх', isLemma)).toEqual({ head: 'сьміх', stress: null, lemma: 'сміх' })
    expect(decodeHead('Лїкарня', isLemma)).toMatchObject({ head: 'лїкарня', lemma: 'лікарня' })
    expect(decodeHead('Ґвардійский', isLemma)).toMatchObject({ lemma: 'гвардійський' })
  })
  it('a capital vowel inside the word is the stress; a stray letter (й) is decoded only if exactly one decoding is a headword', () => {
    expect(decodeHead('БолАчка', isLemma)).toBeNull()   // болачка is not болячка: nothing is guessed
    expect(decodeHead('ХрестА', isLemma)).toBeNull()
    expect(decodeHead('Хресть', isLemma)).toBeNull()
    expect(decodeHead('Бйти', isLemma)).toMatchObject({ head: 'бити', stress: 1, lemma: 'бити' })
    expect(withStress('бити', 1)).toBe('би́ти')
    const L2 = new Set(['болячка']); expect(decodeHead('БолячкА', w => L2.has(w))).toMatchObject({ head: 'болячка', stress: 6 })
    expect(decodeHead('Абракадабра', isLemma)).toBeNull()
  })
})

describe('SE-13 part of speech and alphabetical order', () => {
  it('POS from the first words: gender (OCR т./ш./п.), verb, adjective', () => {
    expect(posOf('т. Кгеиг')).toBe('m'); expect(posOf('ш. Кгеиг')).toBe('m'); expect(posOf('/. Ріе')).toBe('f'); expect(posOf('п. Ріе')).toBe('n')
    expect(posOf('V. п. ііЬеІ')).toBe('verb'); expect(posOf('и.а. еііеі')).toBe('verb'); expect(posOf('а. Еапг')).toBe('adj'); expect(posOf('Кгеиг')).toBe('')
  })
  it('the order gate keeps a longest non-decreasing run and drops OCR outliers', () => {
    const keep = inOrder(['баба', 'бабка', 'вірус', 'аврал', 'вода', 'гора'].map(orderKey))
    expect(keep.has(3)).toBe(false)   // «аврал» between «вірус» and «вода»
    expect([0, 1, 2, 4, 5].every(i => keep.has(i))).toBe(true)
  })
})

describe('SE-13 German gloss: recovered only to the vocabulary of the clean rows', () => {
  it('look-alike glyphs are read back to a vocabulary word, an unknown word is not guessed', () => {
    expect(recoverToken('Кгеиг', vocab)).toBeUndefined()
    expect(recoverToken('Ьеіп', germanVocab(['Bein Bein']))).toBe('Bein')
    expect(recoverToken('зісЬ', vocab)).toBe('sich')
  })
  it('the gloss keeps the leading items that are ALL recovered; a garbled item ends it', () => {
    expect(recoverGloss('т. Теиге1, ш. ЬоЬ', vocab)).toBe('')
    expect(recoverGloss('V. а. зеЬеп, шасЬеп', germanVocab(['sehen, machen. sehen machen']))).toBe('sehen, machen')
    expect(recoverGloss('V. а. зеЬеп, ЬЬаЬЬа', germanVocab(['sehen sehen']))).toBe('sehen')
  })
})

describe('SE-13 whole volume: gates, stats, rejected share', () => {
  it('a volume text gives gated articles with page, leaf, stress, POS, gloss; every candidate is kept or rejected for a named reason', () => {
    const text = ['Бйти,  V.  а.  зеЬеп,  шасЬеп', 'Аврал,  т.  ХХХ', 'Лїкарня,  /.  Хаиз', 'Сьміх,  т.  Ьасііеп', 'Хуяк,  т.  ХХХ'].join('\n')
    const v = germanVocab(['sehen, machen. lachen'])
    const r = parseVolume(text, 1, { leafNs: [0, 30], page: ['5', '6'], totalNs: 100 }, { isLemma, vocab: v })
    expect(r.stats.candidates).toBe(5)
    expect(r.articles.map(a => a.lm)).toEqual(['бити', 'лікарня', 'сміх'])
    expect(r.articles[0]).toMatchObject({ v: 1, h: 'бити', a: 'би́ти', ps: 'verb', g: 'sehen, machen', p: '5', lf: 0 })
    expect(r.articles[2]!.g).toBe('')   // «Ьасііеп» is not recovered: no gloss, the headword row stays
    expect(r.stats.kept + Object.values(r.stats.rejected).reduce((a, b) => a + b, 0)).toBe(r.stats.candidates)
  })
})

describe('SE-13 harvest page markers', () => {
  it('leaf offsets are the non-space counts of the search text before each leaf; printed pages come from the page numbers', () => {
    const p = pagesOf('ab cd\nef gh ij', [[0, 5], [6, 14]], { pages: [{ leafNum: 1, pageNumber: '' }, { leafNum: 2, pageNumber: '7' }] })
    expect(p).toEqual({ leafNs: [0, 4], page: ['', '7'], totalNs: 10 })
    expect(ZHEL_VOLS.map(v => v.ia)).toEqual(['zhelekhivsk1', 'zhelekhivsk2'])
  })
})

describe('SE-13 attested Желехівка spelling in the orthography view', () => {
  const art = (h: string, lm: string) => ({ h, lm, q: `${h}, т. Teufel`, v: 1, p: '9', lf: 20 })
  const t = attestedFromZhel([art('сьміх', 'сміх'), art('лїкарня', 'лікарня'), art('ґвардійский', 'гвардійський'), art('иродъ', 'ірод'), art('вшити', 'вшити'), art('х', 'невідоме')], l => l !== 'невідоме')
  it('every linked lemma gets the printed headword, also when it equals the modern one; the cite is valid claim() evidence with a registered source', () => {
    expect(Object.keys(t).sort()).toEqual(['вшити', 'гвардійський', 'лікарня', 'ірод', 'сміх'].sort())
    expect(t['вшити']!.zhel!.form).toBe('вшити')
    const ev = t['сміх']!.zhel!.ev
    expect(ev).toMatchObject({ source: 'ZHEL1886', kind: 'Q' }); expect(ev.locator).toContain('archive.org/details/zhelekhivsk1/page/n20')
    expect(() => claim('сьміх', ev)).not.toThrow(); expect(SOURCES.ZHEL1886).toBeTruthy()
  })
  it('ї after dentals, сь before labials, -ский: the one edit is replayed on the lemma and on forms that share its context', () => {
    expect(attestedEdit('лікарня', 'лїкарня', 'лікарня')).toEqual({ s: 1, e: 2, to: 'ї' })
    expect(toOrth('лікарня', 'zhel', { attInitI: t['лікарня'] }).text).toBe('лїкарня')
    expect(toOrth('лікарні', 'zhel', { attInitI: t['лікарня'] }).text).toBe('лїкарні')
    expect(toOrth('сміх', 'zhel', { attInitI: t['сміх'] }).text).toBe('сьміх')
    const r = toOrth('сміху', 'zhel', { attInitI: t['сміх'] }); expect(r.text).toBe('сьміху'); expect(r.rules.some(x => x.id === OA_HEAD_RULE)).toBe(true)
    expect(toOrth('гвардійський', 'zhel', { attInitI: t['гвардійський'] }).text).toBe('ґвардійский')
    expect(toOrth('ліс', 'zhel', { attInitI: t['лікарня'] }).text).toBe('ліс')
  })
  it('the initial и- edit keeps its own rule id (MM-45); a spelling equal to the modern one changes nothing; a желехівка cite is not a кулішівка cite', () => {
    const r = toOrth('ірод', 'zhel', { attInitI: { zhel: { ...t['ірод']!.zhel!, form: 'ирод' } } })
    expect(r.text).toBe('ирод'); expect(r.segs[0]!.rule).toBe(OA_RULE)
    expect(toOrth('вшити', 'zhel', { attInitI: t['вшити'] }).text).toBe('вшити')
    expect(toOrth('сміх', 'kul', { attInitI: t['сміх'] }).text).toBe('сміх')
  })
})

describe('SE-13 the 1886 sense row', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'se13-'))
  mkdirSync(resolve(dir, 'data/work'), { recursive: true })
  const A = (lm: string, g: string) => ({ v: 2, p: '790', lf: 5, a: lm, lm, ps: 'm', g, q: `${lm}, т.` })
  writeFileSync(resolve(dir, 'data/work/zhel-parsed.json'), JSON.stringify({ articles: [A('хрест', 'Kreuz'), A('бити', ''), A('сміх', 'Lachen'), A('чужий', 'x')] }))
  it('typed dictionary of 1886; a garbled gloss is blanked (oq) and the dated row stays; a lemma with the r2u row gets none; no card, no row', () => {
    expect(isTypedDict('zhelekhivsky')).toBe(true); expect(DICT_COVER.find(d => d.id === 'zhelekhivsky')!.edition).toEqual([1886, 1886])
    const into = new Map<string, { d: string; g: string }[]>([['сміх', [{ d: 'r2u_zheleh', g: 'Lachen' }]]])
    const r = zhelRows(dir, k => k !== 'чужий', into as never)
    expect(r).toEqual({ rows: 2, withGloss: 1, skippedR2u: 1 })
    expect(into.get('хрест')![0]).toMatchObject({ d: 'zhelekhivsky', g: 'Kreuz', p: 'ч', l: 'Желехівський–Недільський 1886, т. 2, с. 790', u: 'https://archive.org/details/zhelekhivsk2/page/n5' })
    expect(into.get('бити')![0]).toMatchObject({ g: '', oq: 1 })
    expect(into.has('чужий')).toBe(false)
  })
})

describe('SE-13 area labels of the print', () => {
  it('the list explains hucul./łemk./ungr.; the articles print them in Cyrillic; only area rows are read from the OCR', () => {
    expect(ZHEL_PRINT_LABELS.rows.every(r => r.kind === 'area')).toBe(true)
    expect(scanArticle(ZHEL_PRINT_LABELS, 'Вши́ткий, a. s. Весь II. (лемк.)')[0]!.row.area).toBe('lemko')
    expect(scanArticle(ZHEL_PRINT_LABELS, 'Цуркан, m. (гуц.) Maus')[0]!.row.area).toBe('hutsul')
    expect(scanArticle(ZHEL_PRINT_LABELS, 'Вугор, s. Угор. Rus')).toEqual([])
  })
  it('a label that stands after ANOTHER headword (two articles run into one line) is not the first headword’s', () => {
    expect(ownLabels('Вшйти, вшивати, V. а . еіппйкеп; Вшйт кий, а. 8. Весь II. (лемк.), Вшице губка')).toEqual([])
    expect(ownLabels('Вшйт кий, а. 8. Весь II. (лемк.)').map(x => x[0])).toEqual(['łemk.'])
  })
  it('scanZhel merges the labels into the hits of the linked card as strict area hits with the page link', () => {
    const f = resolve(mkdtempSync(resolve(tmpdir(), 'se13l-')), 'z.json')
    writeFileSync(f, JSON.stringify({ articles: [{ v: 1, lf: 3, lm: 'вшиткий', lb: [['łemk.', 'a. s. Весь II. (лемк.)']] }, { v: 1, lf: 4, lm: 'інший', lb: [['łemk.', 'x']] }] }))
    const hits = new Map(), per = {}
    expect(scanZhel(f, k => k === 'вшиткий', hits, per)).toBe(1)
    expect(hits.get('вшиткий')).toEqual([{ t: 'zheleh-labels', a: 'łemk.', kind: 'area', v: 'lemko', q: 'a. s. Весь II. (лемк.)', u: 'https://archive.org/details/zhelekhivsk1/page/n3' }])
  })
})
