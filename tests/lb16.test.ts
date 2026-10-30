/** SPEC 63 LB-16: the sources named in Грінченко's own «Список источников» give «діалектне за словником» (word-list of a named dialect = the word is dialectal; regional collection = place of record only). */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { EXTRA_LABEL_TABLES, DICT_LABEL_TABLES, HRINCH_SOURCES, resolveRow, scanArticle, tablesOfDict, wireHit } from '../core/dict-labels.ts'
import { dialectOf, TH } from '../core/labels.ts'
import { scanR2u } from '../pipelines/build-labels.ts'
import { extraHits, LB16_TABLES } from '../pipelines/lb-extra-hits.ts'
import { hitView } from '../src/lib/labelsText.ts'

// article texts as the r2u dump prints them (plainOf of the cell; the citations are real ones from the dump)
const LEM = 'Золотушник, -ка, м. Раст.: Solidago virgaurea. Вх. Лем. 425.'
const UG = 'Бабу́ня, -ні, ж. Бабуся. Вх. Уг. 235. Юж дзьопа оддати. Вх. Лем. 409.'
const HUC = 'Опорище (Сим. 24), въ вилкѣ — черенокъ (Шух. І. 291), рукоятка въ пилѣ (Шух. І. 175).'
const ZN = 'Хата. Шух. І. 88. Вх. Зн. 76. Александр. у.'
const MIL = 'Дівка. Мил. М. 12. Мил. Св. 7. Мил. 33.'
const NEG = 'Вас. каже. Грин. III. 112. Гол. Од. 30. Шух. розповідає. Шух. І. Вх. Зн. Мил. Фр. Пр. Гн. ЕЗ. V. 12.'

describe('LB-16 Грінченко, список джерел', () => {
  it('LB-16 the table quotes the list entry of every source and every area resolves; it is read from both Грінченко editions', () => {
    expect(EXTRA_LABEL_TABLES).toContain(HRINCH_SOURCES); expect(DICT_LABEL_TABLES).not.toContain(HRINCH_SOURCES)
    expect(HRINCH_SOURCES.dicts).toEqual([12, 18]); expect(HRINCH_SOURCES.list).toMatch(/^https:\/\/archive\.org\/details\/slovarukrainskog01hrin/)
    expect(tablesOfDict(12).map(t => t.id)).toEqual(['hrinch-labels', 'hrinch-sources']); expect(tablesOfDict(18).map(t => t.id)).toEqual(['hrinch-labels', 'hrinch-sources']); expect(tablesOfDict(9).map(t => t.id)).toEqual(['umanets-labels'])
    for (const r of HRINCH_SOURCES.rows) {
      expect(r.meaning.startsWith(r.abbr), r.abbr).toBe(true)   // «Вх. Лем. = …» is the list's own entry
      const x = resolveRow(r); expect(!!x.area || x.places.length > 0, r.abbr).toBe(true)
    }
    const by = (a: string) => HRINCH_SOURCES.rows.find(r => r.abbr === a)!
    expect(by('Вх. Лем.').meaning).toContain('Про говор галицких лемків'); expect(by('Вх. Уг.').meaning).toContain('угорскоруских говорів')
    expect(by('Вх. Зн.').meaning).toContain('преимущественно изъ Галичи'); expect(by('Шух.').meaning).toContain('Гуцульщина')
    // a source whose entry names two regions is not read
    for (const a of ['Гол.', 'Гол. Од.', 'Грин.', 'ЕЗ.', 'Мнж.']) expect(HRINCH_SOURCES.rows.some(r => r.abbr === a), a).toBe(false)
  })
  it('LB-16 a citation with a page reads as a hit; the two dialect word-lists mark the word, the regional collections only the place', () => {
    const lem = scanArticle(HRINCH_SOURCES, LEM); expect(lem.map(h => h.row.abbr)).toEqual(['Вх. Лем.']); expect(lem[0]!.row.scope).toBeUndefined(); expect(lem[0]!.resolved.area).toBe('lemko'); expect(lem[0]!.quote).toContain('Вх. Лем. 425')
    const ug = scanArticle(HRINCH_SOURCES, UG).map(h => h.row.abbr).sort(); expect(ug).toEqual(['Вх. Лем.', 'Вх. Уг.'])
    const huc = scanArticle(HRINCH_SOURCES, HUC); expect(huc.map(h => h.row.abbr)).toEqual(['Шух.']); expect(huc[0]!.row.scope).toBe('place'); expect(huc[0]!.resolved.area).toBe('hutsul')
    const zn = scanArticle(HRINCH_SOURCES, ZN).map(h => h.row.abbr).sort(); expect(zn).toEqual(['Вх. Зн.', 'Шух.'])
    const mil = scanArticle(HRINCH_SOURCES, MIL); expect(mil.map(h => h.row.abbr)).toEqual(['Мил.']); expect(mil[0]!.resolved.places).toEqual(['Лубенський повіт']); expect(mil[0]!.resolved.gov?.quote).toMatch(/Полтавської губернії/)
    const w = (t: string, abbr: string) => { const h = scanArticle(HRINCH_SOURCES, t).find(x => x.row.abbr === abbr)!; return wireHit(HRINCH_SOURCES, h, 'https://r2u.org.ua/s?w=x#12_1') }
    expect(w(LEM, 'Вх. Лем.')).toMatchObject({ t: 'hrinch-sources', a: 'Вх. Лем.', kind: 'area', v: 'lemko' }); expect(w(LEM, 'Вх. Лем.').p).toBeUndefined()
    expect(w(UG, 'Вх. Уг.').p).toBeUndefined(); expect(w(HUC, 'Шух.')).toMatchObject({ v: 'hutsul', p: true })
  })
  it('LB-16 a bare siglum without a page or volume, a source that names two regions and an unrelated word are not read', () => {
    expect(scanArticle(HRINCH_SOURCES, NEG)).toEqual([])
    expect(scanArticle(HRINCH_SOURCES, 'Ашув. Вх. Лемко 12. Вх. Лемківський 5.')).toEqual([])
  })
  it('LB-16 the class: a dialect word-list hit makes the word dialectal (strict), a collection hit records the place only; the card text names the list', () => {
    const w = (t: string, abbr: string) => wireHit(HRINCH_SOURCES, scanArticle(HRINCH_SOURCES, t).find(x => x.row.abbr === abbr)!, 'https://r2u.org.ua/s?w=x#12_1')
    const strict = dialectOf([w(LEM, 'Вх. Лем.')], [], undefined, TH), place = dialectOf([w(HUC, 'Шух.')], [], undefined, TH)
    expect(strict).toMatchObject({ c: 'dict', strict: true, areas: ['lemko'] }); expect(place).toMatchObject({ c: 'dict', strict: false })
    const hv = hitView(w(LEM, 'Вх. Лем.')); expect(hv.dict).toBe('Грінченко (список джерел)'); expect(hv.meaning).toContain('Словарець'); expect(hv.list).toContain('slovarukrainskog01hrin'); expect(hv.area).toBe('Лемківщина')
    expect(hitView(w(HUC, 'Шух.')).place).toBe(true)
  })
  it('LB-16 scanR2u reads both lists of Грінченко from one article; `only` restricts to the new table; the extra-hits pipeline returns every key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lb16-r2u-')); mkdirSync(join(dir, 'pages'))
    const cell = '<table><tr><td id="12_777" class="result_row"><span class="KrymUkrBold">Золотушник</span>, <span class="KrymUkrItalic">м.</span> <span class="KrymRusPlain">Раст. Solidago.</span> Лохв. у. Вх. Лем. 425. Шух. І. 88.</td></tr></table>'
    writeFileSync(join(dir, 'pages', '0.html.gz'), gzipSync(cell))
    writeFileSync(join(dir, 'index.jsonl'), JSON.stringify({ q: 'золотушник', scope: 'ukr', file: '0.html.gz', status: 200 }) + '\n')
    const all = scanR2u(dir, () => true), onlyNew = scanR2u(dir, () => true, new Set(['hrinch-sources']))
    expect([...all.hits.get('золотушник')!.map(h => h.a)].sort()).toEqual(['Вх. Лем.', 'Лохв. у.', 'Шух.'])
    expect(onlyNew.hits.get('золотушник')!.map(h => h.a).sort()).toEqual(['Вх. Лем.', 'Шух.']); expect(Object.keys(onlyNew.per)).toEqual(['Грінченко (список джерел)'])
    const root = mkdtempSync(join(tmpdir(), 'lb16-root-')); mkdirSync(join(root, 'data', 'raw', 'r2u', 'pages'), { recursive: true })
    writeFileSync(join(root, 'data', 'raw', 'r2u', 'pages', '0.html.gz'), gzipSync(cell)); writeFileSync(join(root, 'data', 'raw', 'r2u', 'index.jsonl'), JSON.stringify({ q: 'золотушник', scope: 'ukr', file: '0.html.gz', status: 200 }) + '\n')
    const { out, per } = extraHits(root, LB16_TABLES); expect(Object.keys(out)).toEqual(['золотушник']); expect(out['золотушник']).toHaveLength(2); expect(per['Грінченко (список джерел)']).toMatchObject({ articles: 1, labelled: 1, hits: 2 })
  })
  it('LB-16 the measurement overlay and the spec rows are in place', () => {
    const m = readFileSync('pipelines/lb-measure.ts', 'utf8'); expect(m).toContain('LB_EXTRA_HITS'); expect(m).toContain("d.c !== 'dict'")
    expect(readFileSync('specs/63-corpus-dialects.md', 'utf8')).toContain('**LB-16**')
  })
})
