/** SPEC 63 RU-1…RU-4: the `ru` provenance flag per source, the badge component, the РИБ ingest (fixture OCR pages from the real volume). */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { RU_EVIDENCE_URL, RU_LABEL, RU_TIP, ruOfDict, ruOfSource, ruOfWitness, RU_DICT_IDS } from '../core/ru-source.ts'
import { SOURCES } from '../core/sources.ts'
import { buildEntry, type SeRow } from '../core/se.ts'
import { witnessPoints } from '../src/lib/witnessPoints.ts'
import RuBadge from '../src/components/RuBadge.vue'
import SenseEpochs from '../src/components/SenseEpochs.vue'
import { columnsOf, pageColumns, readOcrBooks, ribWitness, RIB_WORKS, workPages } from '../pipelines/ingest-rib.ts'

const W = (id: string, edition: string, title = '') => ({ id, edition, title })
describe('RU-2 flag derivation from the source metadata', () => {
  it('RU-2 edition: Russian place / institution in the edition statement', () => {
    for (const [id, ed] of [
      ['kievchr', 'ПСРЛ т. 2, СПб., 1908 (ред. О. Шахматов)'], ['eneida1798', 'СПб. 1798 (вид. Парпури, без згоди автора)'], ['kobzar1840', 'СПб. 1840, в типографії Е. Фішера (цензура 12.II.1840)'],
      ['istoria-rusov', 'Исторія Русовъ или Малой Россіи, Москва, Университетская тип., 1846'], ['hrabianka', 'Летопись гадячского полковника Григория Грабянки, изд. Временною коммиссіею для разбора древних актовъ, Киевъ 1854'],
      ['maksymovych', 'Максимович М. Украинскія народныя пѣсни. Москва, 1834'], ['hv_ia_auzr_3_4', 'Архив Юго-Западной России, ч. 3, т. 4 (OCR archive.org, не вичитано)'],
      ['rib4', 'РИБ т. 4, СПб. 1878 (ред. П. Гильтебрандт)'],
    ] as const) expect(ruOfWitness(W(id, ed))?.kind, id).toBe('edition')
    expect(ruOfWitness(W('velychko', 'Летопись событий в Юго-Западной России в XVII в., Киевская археографическая комиссія 1848'))?.kind).toBe('edition')
  })
  it('RU-2 apparatus: a Ukrainian text edited with a Russian-language preface and notes (Potebnja, Kharkiv 1887)', () => {
    const ed = 'Харьковъ 1887, ред. А. А. Потебня (Харківське земство); передмова й примітки російською, текст — фонетична орфографія'
    expect(ruOfWitness(W('kvitka1887', ed))?.kind).toBe('apparatus')
    expect(ruOfWitness(W('kvitka1887x', 'Харків 1887, ред. А. А. Потебня'))).toBeUndefined()   // nothing in the statement says Russian: no flag is invented
  })
  it('RU-2 not flagged: Ukrainian-place editions, originals, Ukrainian dictionaries, the Kyiv print of the Kopystensky book', () => {
    for (const [id, ed] of [['a', 'Львів 1893, Наукове товариство ім. Шевченка'], ['b', 'Київ, Печерська друкарня, 1627'], ['c', 'Вільно, друкарня Братська, 1596'], ['d', 'Прага 1876, накладом книгарні Грегра і Датла'],
      ['dsu14', 'К.: Наукова думка, 1977–78'], ['kopystensky_kniga_viry', 'Київ, бл. 1620 (оригінальний друк, скан бібліотеки)'], ['e', 'Харків 1918, вид. «Союз»']] as const) expect(ruOfWitness(W(id, ed)), id).toBeUndefined()
  })
  it('RU-2 dictionary: exactly the dictionaries whose declared gloss language is Russian', () => {
    for (const id of ['r2u_umanets', 'r2u_hrinch09', 'r2u_nikovsky', 'r2u_krymsky', 'r2u_izyumov', 'r2u_doroshenko', 'r2u_yakubski', 'r2u_hrinch27', 'biletsky-nosenko', 'zakrevsky', 'timchenko-materials']) {
      expect(RU_DICT_IDS).toContain(id); expect(ruOfDict(id)?.kind, id).toBe('dictionary'); expect(ruOfWitness(W(id, ''))?.kind, id).toBe('dictionary')
    }
    for (const id of ['r2u_zheleh', 'dsu14', 'timchenko', 'sum16', 'wikt.uk', 'wikt.en', 'shevchenko', 'sum11']) expect(ruOfDict(id), id).toBeUndefined()   // de / uk / en glosses
    expect(ruOfWitness({ id: 'wikt_ru_x', url: 'https://ru.wiktionary.org/wiki/x' })?.kind).toBe('dictionary')
  })
  it('RU-2 registry sources: dictionaries / edition / Russian-language articles (apparatus); nothing else', () => {
    expect(ruOfSource('R2U')?.kind).toBe('dictionary'); expect(ruOfSource('HRINCH')?.kind).toBe('dictionary'); expect(ruOfSource('MAKSYM1834')?.kind).toBe('edition')
    expect(ruOfSource('OPENCORPORA')?.kind).toBe('dictionary'); expect(ruOfSource('AVDEEVA')?.kind).toBe('dictionary'); expect(ruOfSource('FBRU')?.kind).toBe('apparatus'); expect(ruOfSource('LONKIN')?.kind).toBe('apparatus')
    expect(Object.keys(SOURCES).filter(id => ruOfSource(id)).sort()).toEqual(['AVDEEVA', 'FBRU', 'HRINCH', 'LONKIN', 'MAKSYM1834', 'OPENCORPORA', 'R2U'])
    for (const id of ['VESUM', 'KAIKKI', 'WIKT', 'ESUM', 'SHEV', 'SUM20']) expect(ruOfSource(id), id).toBeUndefined()
  })
  it('RU-2 an explicit `ru` on the witness wins; every flag carries a reason', () => {
    expect(ruOfWitness({ id: 'x', ru: { kind: 'apparatus', why: 'тест' } })?.kind).toBe('apparatus')
    expect(ruOfWitness(W('kievchr', 'СПб. 1908'))!.why.length).toBeGreaterThan(5)
  })
})

describe('RU-3 the badge', () => {
  it('RU-3 shows «рос. видання» / «рос. джерело» with the standing warning as tooltip and a link to research/46; nothing without a flag', async () => {
    const edition = await renderToString(createSSRApp({ render: () => h(RuBadge, { flag: { kind: 'edition', why: 'СПб.' } }) }))
    expect(edition).toContain(RU_LABEL.edition); expect(edition).toContain('рос. видання')
    expect(edition).toContain('Російське видання/джерело: можливе нівелювання або ігнорування українських рис'); expect(edition).toContain(RU_TIP)
    expect(edition).toContain(RU_EVIDENCE_URL); expect(edition).toContain('research/46-russian-sources.md'); expect(edition).toContain('data-testid="ru-badge"')
    expect(await renderToString(createSSRApp({ render: () => h(RuBadge, { flag: { kind: 'dictionary', why: 'ru' } }) }))).toContain('рос. джерело')
    expect(await renderToString(createSSRApp({ render: () => h(RuBadge, {}) }))).not.toContain('ru-badge')
  })
  it('RU-3 the sense row (SE «Значення за епохами») of a Russian-gloss dictionary carries the badge, a Ukrainian-gloss row does not', async () => {
    const rows: SeRow[] = [{ d: 'r2u_hrinch09', g: 'свободный' }, { d: 'wikt.uk', g: 'вільний' }]
    const html = await renderToString(createSSRApp({ render: () => h(SenseEpochs, { word: 'вільний', kind: 'full', open: true, entry: buildEntry(rows, []) }) }))
    expect(html.match(/data-testid="ru-badge"/g)?.length).toBe(1)
    expect(html.indexOf('Грінченко')).toBeLessThan(html.indexOf('ru-badge')); expect(html.indexOf('ru-badge')).toBeLessThan(html.indexOf('Вікісловник (uk)'))
  })
  it('RU-3 a witness-graph plate of a Russian edition is marked (label in the plate data)', () => {
    const w = { a: { title: 'Енеїда', date: [1798, 1798] as [number, number], witnessType: 'first_ed', edition: 'СПб. 1798' }, b: { title: 'Львівська', date: [1893, 1893] as [number, number], witnessType: 'other', edition: 'Львів 1893' } }
    const pts = witnessPoints([{ w: 'a', n: 1 }, { w: 'b', n: 1 }], id => w[id as 'a' | 'b'])
    expect(pts.find(p => p.id === 'a')!.ru).toBe('рос. видання'); expect(pts.find(p => p.id === 'b')!.ru).toBeUndefined()
  })
})

describe('RU-4 РИБ т. 4 «Палінодія»: ingest by printed column range from the OCR pages', () => {
  const books = readOcrBooks('tests/fixtures/rib'), book = books[0]!
  const pal = RIB_WORKS.find(w => w.id === 'rib4_palinodia')!
  it('RU-4 the running head gives the printed columns', () => {
    expect(columnsOf('331 «палиноля», с0. ЗАХАРШ КОПЫСТЕНОКАГО, 1621 ГОДА. 382\n\nтекст')).toEqual([331, 334])
    expect(columnsOf('388 «пАлинОдтя>, СОЧ. ЗАКАРИИ, 1621 ГОД\n')).toEqual([388, 391])
    expect(columnsOf('\n\n1179 «ПАЛИНОДІЯ», 1621 года. 1180')).toEqual([1179, 1180]); expect(columnsOf('без номера')).toBeUndefined()
  })
  it('RU-4 an OCR-noised running head (835 for 335) is rejected by the chain of heads and interpolated', () => {
    const m = pageColumns(book.pages)
    expect(m.get(83)).toBe(315); expect(m.get(88)).toBe(335); expect(m.get(100)).toBe(388)
  })
  it('RU-4 only columns 313–1180: the previous work (cols 308–311) and the Palinodia own table of contents (col 1183 on) are not read', () => {
    expect(book.name).toMatch(/Том_04/)
    expect(workPages(book.pages, pal.cols).map(p => p.n)).toEqual([83, 88, 100, 301])
  })
  it('RU-4 the witness: dated 1621–1622 with the research/44 citation, Ruthenian, edition named Russian (flag), footnote and Russian-apparatus lines dropped', () => {
    const w = ribWitness(pal, book.pages)
    expect('skip' in w).toBe(false); if ('skip' in w) return
    expect(w.date).toEqual([1621, 1622]); expect(w.dateCite.source).toContain('research/44'); expect(w.dateCite.quote).toContain('1621–1622'); expect(w.lang).toBe('ruthenian')
    expect(w.pages).toEqual([83, 301]); expect(w.tokens[0]!.loc).toBe('стб. 315'); expect(w.tokens.some(t => t.loc === 'стб. 1179')).toBe(true)
    const raws = w.tokens.map(t => t.raw)
    expect(raws).toContain('самолюбии'); expect(raws).not.toContain('Спасителя'); expect(raws).not.toContain('сочиненіе')   // «*) У Григоровича; «Спасителя»» and the Russian «Это сочиненіе, которое …» are apparatus
    expect(w.dropped.apparatus).toBeGreaterThan(0)
    expect(w.edition).toContain('СПб.'); expect(ruOfWitness(w)?.kind).toBe('edition')
  })
  it('RU-4 the Kyiv print of «Книга о вірі» is NOT a Russian edition; every РИБ work is, and dated works carry a citation', () => {
    const k = RIB_WORKS.find(w => w.id === 'kopystensky_kniga_viry')!
    expect(ruOfWitness({ id: k.id, edition: k.edition, title: k.title })).toBeUndefined(); expect(k.date).toEqual([1619, 1621])
    for (const w of RIB_WORKS.filter(x => x.id.startsWith('rib'))) { expect(ruOfWitness({ id: w.id, edition: w.edition, title: w.title })?.kind, w.id).toBe('edition'); expect(w.dateCite.quote.length, w.id).toBeGreaterThan(5) }
  })
  it('RU-4 no OCR text means skipped, nothing invented', () => {
    expect('skip' in ribWitness(pal, [])).toBe(true)
  })
})
