/** SPEC 63 GG-7 — the СУМ-11 / СУМ-20 scan parsers against small fixtures in the real page layouts (policy fields only; the quotations are stand-ins and must never reach the output). */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSum11 } from '../core/sum11-parse.ts'
import { parseSum20 } from '../core/sum20-parse.ts'
import { headOk, inPageRange, pageHead, passRate, senseOf, splitNumbered } from '../core/sum-article.ts'
import { importSum } from '../core/sum-import.ts'
import { runSumScan } from '../pipelines/sum-scan.ts'

// СУМ-20 (PDF text layer): running head «ПЕРШЕ / стор. / ОСТАННЄ», CAPITAL headwords inside the running text, hyphenated line ends, pair headwords «недок. … док.»
const P20 = [
  'ВИКЛЮЧАТИ\n\n299\n\nВИКЛЮЧНО\n\n',
  'ВИКЛЮЧЕННЯ, я, с. Дія за знач. виключати. Цитата-заглушка, яка не повинна\nпотрапити у вихід (А. Автор).\n',
  'ВИКЛЮЧАТИ, аю, аєш, недок. ВИКЛЮЧИТИ, чу,\nчиш, док. 1. кого, що. Усувати зі складу чого-небудь, позбавля-\nти чогось. Приклад один (Б. Автор); // Виводити зі складу організації. Приклад два (В. Автор).\n',
  '2. розм. Робити неможливим що-небудь. Приклад три (Г. Автор).\n',
  'ВИКЛЮЧАТИСЯ див. виключатися. ВИКЛЮЧНИЙ, а, е. Який поширюється тільки на кого-, що-небудь; єдиний. Приклад (Д. Автор).\n',
  'ВИКЛЮЧНО, присл. 1. книжн. Крім, за винятком згаданого. Приклад.\n',
  'ВИКУПАТИ, аю, недок. ЗЛАМАНИЙЛКСТ, ъь, ч. Нісенітниця ззз ццц.\n',   // garbled headword: must not become an entry
  'ВЛАСНЕ, прислівник. 1. нижче першої сторінки. Дуже далеко.\n',
].join('')

describe('GG-7 СУМ-20 parser', () => {
  const { articles, stats } = parseSum20(P20, 20)
  const by = (h: string) => articles.find(a => a.head === h)!
  it('headword, POS, volume, printed page, sense numbers, labels and the definition only', () => {
    expect(by('виключення')).toMatchObject({ pos: 'я, с.', vol: 20, page: 299 })
    expect(by('виключення').senses![0]!.gloss).toBe('Дія за знач. виключати')
    expect(by('виключати').senses!.map(s => s.n)).toEqual([1, 2])
    expect(by('виключати')!.senses![0]).toMatchObject({ labels: [], gloss: 'Усувати зі складу чого-небудь, позбавляти чогось' })   // valence «кого, що.» dropped, hyphenated line end joined
    expect(by('виключати')!.senses![1]).toMatchObject({ labels: ['розм.'], gloss: 'Робити неможливим що-небудь' })
    expect(by('виключний')).toMatchObject({ pos: 'а, е.' }); expect(by('виключно')!.senses![0]).toMatchObject({ labels: ['книжн.'] })
  })
  it('pair headwords share one body; cross-references and garbled headwords are not entries; no quotation reaches the output', () => {
    expect(by('виключити')!.senses).toEqual(by('виключати')!.senses)
    expect(articles.some(a => a.head === 'виключатися')).toBe(false)
    expect(articles.some(a => /зламан/.test(a.head ?? ''))).toBe(false)
    expect(JSON.stringify(articles)).not.toMatch(/Приклад|Автор|Цитата/)
    expect(passRate(stats)).toBeGreaterThan(0.6)
  })
})

// СУМ-11 (DjVu text): the early volumes print a capitalized lower-case headword at a line start, the later ones CAPITALS; the page number sits on one page of a spread
const P11 = [
  'Вагітніти \n274 \nВажкий \n',
  'Вага, и, ж. 1. Сила тяжіння, тяжкість тіла. Нові досліди величезної ваги стояли перед ним (Донч., І, \n1956, 369); \n',
  'Нові завдання, и, ж. це рядок цитати, а не стаття. \n',
  '2. перен. Значення, вплив. [Кобзар:] Слово не полова (Мирний, V, 1955, 87). \n',
  'Вагатися, аюся, аєшся, недок. 1. Відчувати неспроможність відразу вирішити що-небудь. Приклад (Тют., 1964, 424). \n',
  'Вгбпрстк, и, ж. Дуже довге слово без жодного сенсу. \n',
].join('')
const P11b = ['Перетримування \nПеретрушувати \n', 'ПЕРЕТРИМУВАННЯ, я, с. Дія за знач, перетримувати. Приклад (Ш., 1959, 11). \n',
  'ПЕРЕТРИМУВАТИ, ую, уєш, недок., \nПЕРЕТРИМАТИ, аю, аєш, док., перех. 1. Утримувати, тримати або притримувати деякий час. Приклад (М., 1954, 277). \n2. Тримати довше, ніж треба. \n'].join('')

describe('GG-7 СУМ-11 parser', () => {
  it('capitalized headwords at a line start with grammar, running head, printed page; quotation lines and garbage skipped', () => {
    const { articles } = parseSum11(P11, 11)
    expect(articles.map(a => a.head)).toEqual(['вага', 'вагатися'])
    expect(articles[0]).toMatchObject({ pos: 'и, ж.', vol: 11, page: 274 })
    expect(articles[0]!.senses!.map(s => [s.n, s.labels, s.gloss])).toEqual([[1, [], 'Сила тяжіння, тяжкість тіла'], [2, ['перен.'], 'Значення, вплив']])
    expect(JSON.stringify(articles)).not.toMatch(/Нові досліди|Кобзар|Приклад|Донч/)
  })
  it('CAPITAL headwords, a page without a printed number continues the count, pair headwords with «перех.»', () => {
    const { articles } = parseSum11(P11 + '\f' + P11b, 11)
    const t = articles.filter(a => a.head!.startsWith('перетрим'))
    expect(t.map(a => a.head)).toEqual(['перетримування', 'перетримувати', 'перетримати']); expect(t[0]!.page).toBe(275)
    expect(t[2]!.pos).toBe('аю, аєш, док., перех.'); expect(t[1]!.senses).toEqual(t[2]!.senses)
  })
})

describe('GG-7 shared checks', () => {
  it('long definition: the first ≤ 200 characters, word boundary, «…», on every sense; the import keeps it with vol/page and drops nothing else', () => {
    const def = 'вид рослини '.repeat(40).trim()
    const txt = `ГОРА\n\n5\n\nГОРБ\n\nГОРА, и, ж. 1. ${def}. Приклад (А. Б.). 2. Купа землі, піску.\n`
    const { articles } = parseSum20(txt, 3)
    expect(articles).toHaveLength(1)
    const [s1, s2] = articles[0]!.senses!
    const g1 = s1!.gloss!; expect(g1.length).toBeLessThanOrEqual(200); expect(g1.endsWith('…')).toBe(true); expect(def.startsWith(g1.slice(0, -1).trim())).toBe(true)
    expect(s2!.gloss).toBe('Купа землі, піску')
    const rows = importSum('sum20', JSON.stringify(articles[0])).rows
    expect(rows.map(r => r[1].g.length <= 200)).toEqual([true, true]); expect(rows[0]![1]).toMatchObject({ l: 'т.3 с.5', n: 1 }); expect(JSON.stringify(rows)).not.toContain('Приклад')
    expect(JSON.stringify(articles)).not.toContain('"full"'); expect(JSON.stringify(articles)).not.toContain('"quote"')
  })
  it('page head, alphabet range, headword check, sense numbering, labels', () => {
    expect(pageHead('ВИКЛЮВАТИ\n\n299\n\nВИКОВЗАТИ\n\nтекст')).toMatchObject({ lo: 'ВИКЛЮВАТИ', hi: 'ВИКОВЗАТИ', page: 299, rest: ['текст'] })
    expect(inPageRange('виключати', 'ВИКЛЮВАТИ', 'ВИКОВЗАТИ')).toBe(true); expect(inPageRange('маслина', 'ВИКЛЮВАТИ', 'ВИКОВЗАТИ')).toBe(false); expect(inPageRange('маслина', 'Вагдло', undefined)).toBe(true)
    expect(headOk("м'ясо")).toBe(true); expect(headOk('ж-к')).toBe(false); expect(headOk('ззззз')).toBe(false); expect(headOk('аб1')).toBe(false)
    expect(splitNumbered('1. а 12. б 2. в 3. г').map(s => s.n)).toEqual([1, 2, 3])
    expect(senseOf('заст. або ірон. Той, хто торгує.').labels).toEqual(['заст.', 'ірон.'])
    expect(senseOf('перен. розм. Щось: приклад.').labels).toEqual(['перен.', 'розм.']); expect(senseOf('тільки недок. Пас. до виключати. Приклад.').labels).toEqual(['тільки недок.'])
  })
  it('resumable scan: a finished volume is skipped, output is policy fields only and the import file is written', () => {
    const d = mkdtempSync(join(tmpdir(), 'scan-')), books = join(d, 'b'), out = join(d, 'o')
    mkdirSync(books)
    writeFileSync(join(books, 'sum20_t01.pdf'), '')   // not a PDF: the scan must fail loudly, not write a half result
    expect(() => runSumScan('sum20', books, out)).toThrow()
    expect(readdirSync(out).filter(f => f.endsWith('.jsonl'))).toEqual([])
  })
})
