/** SPEC 63 SE-11: article parsers for the OCR text of the historical dictionaries. Fixtures are a few real OCR articles per dictionary (sample pages of the archive.org items, short excerpts), unedited. */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { PARSE_SPECS, bucketDates, centuryLabels, glossClean, glossOk, headwordOk, ocrScore, parseDictionary, siglaDates, splitArticles, yearIn } from '../core/se-parse.ts'
import { atOf, epochsOf } from '../core/se.ts'
import { parseAll, report } from '../pipelines/parse-se-dicts.ts'
import { parsedRows } from '../pipelines/build-se.ts'

// Тимченко 1930, зошит 1 (tymch1930), OCR of p. ~60
const TIM = `АВРЕА, рою. (лат. ашгва--золота). Блиск.
світлість.


ХУП. Перша заплата в нбб внайдується


Авреа, которам, Залежить на огладаню лица
Віого Гал. Кл. Раз. 331.

АВРЕОЛЯ, ро. (лат. аптеоіа). Світляний
круг, Шо оточа голову святих, німб.

ХУП. Другал заплата в'нбі знайдується.
Авребла, Та ЄСТЬ ВСЛИКаа ОУТІХа На МИСЛИ
Гал. Кл. Раз. 391.-- Много албовімь єсть

АВСТЕРІЯ, ро. (пол. аизіетіа). Див. Астерія.

ХУП. При австеріяхь лежай, си есть при
орчмахь подорожнихь Гр. Барок. І, 91.
`
// СУМ XVI–XVII ст., вип. 5 (SUM-28_5)
const SUM = `ВСТАНЛИВЪ, УСТАНЬЛИВ'Ь прикм. Ста-
ранний, уважний, охочий на допомогу: тожь
можємь оустагндтиса @(т) злого, ко цркви
боу(д)мо оустаньливи, а нє лєниви (1489 Чет. 346);
Тщаливь, вы(и): встанлӣвъ (1627 ЛБ 135).

ВСТАНОВИТИ див. УСТАНОВИТИ.
`
// Матеріали до словника XV–XVIII ст., кн. 1 (kniga1)
const MAT = `БЕСТІЯ, с.ж. (.пт. Ьезііа). Скот, скотина, животное. Бестія
нерозумная. Гал. І, 13. До едного склепу буденного, якь бестію
вкинули. Рук.хр. 373.

БЕСЕДА, с.ж. Пир, пирушка. Жаловаль, иж онь пришодши
на беседу мою, вь дому мещанина Луцкого Кузмьі, мене безвинне
побиль. Кн.Луцк. 1562, л.183.
`
// Словник мови Шевченка, т. 1 (1_20230624_20230624)
const SHEV = `БАГАТИРІ (1). Заможні люди. Не торгувались з старостами, Як те бува з багатирями П 251.88.

БАГАТІТИ (1). У приказці. А я вже Хариті і намисто, і дукач, і хрест купив. Дурень думкою багатіє, як то кажуть. МІ 210.2.

ДУМА (3). Мисль, міркування (40). Як ти думала І 259.1; П 217.14.
`
// Білецький-Носенко (slovnyk33): articles are not upper-case
const BN = `Барбара (и. с. ж. р.) Плеть. См Пуга. Трійчатка. Канчукь. Малахай. Нагайка.
Пекарка (и. с. ж. р.) Повариха.
Зимовник (и. с. м. р.) Жилище, нарочно устроенное для зими.
`
// Закревський (bandurista3): the OCR is mostly garbage
const ZAK = `Swulaba, Сербск., сватьѣ a Ве-
сёльиы ft , гп а де би ы іі -
Оба и р іі х і н с я, в 0J н pity с лг* ога и -
н у і е.сл. С>р. П а а и р а і и, О з ират і іс я
Обнта, в 0J н pity лг* ога и н у і е їх ну
`

const parse = (k: keyof typeof PARSE_SPECS, t: string) => parseDictionary(PARSE_SPECS[k], t)

describe('SE-11b OCR quality gate', () => {
  it('SE-11 ocrScore: clean Cyrillic scores high, garbled OCR low; headwords must look like words', () => {
    expect(ocrScore('Світляний круг, що оточує голову святих')).toBeGreaterThan(0.9)
    expect(ocrScore('Оба и р іі х і н с я, в 0J н pity с лг* ога и')).toBeLessThan(0.45)
    expect(headwordOk('авреола')).toBe(true); expect(headwordOk('хуї')).toBe(false); expect(headwordOk('0J')).toBe(false); expect(headwordOk('вшпрктщ')).toBe(false)
    expect(glossOk('Світляний круг')).toBe(true); expect(glossOk('УКРАЇНСЬКА РАДЯНСЬКА ЕНЦИКЛОПЕДІЯ харків')).toBe(false); expect(glossOk('Кісвь 1853 г.')).toBe(false)
  })
  it('SE-11 a garbled article is skipped and counted, never emitted as a lemma; the pass rate is reported', () => {
    const r = parse('zakrevsky', ZAK)
    expect(r.rows).toEqual([]); expect(r.stats.pagesSkipped + r.stats.candidates).toBeGreaterThan(0); expect(r.stats.passRate).toBe(0)   // the page is below 0.5 and skipped as a whole
  })
})

describe('SE-11 dating: quotation outranks the coverage period', () => {
  it('SE-11 century labels (OCR of XVII is «ХУП») and years are read', () => {
    expect(centuryLabels('ХУП. Маєть еще')).toEqual([[1601, 1700]]); expect(centuryLabels('ХУПІ. x ХУ—ХУІ. y')).toEqual([[1701, 1800], [1401, 1600]]); expect(centuryLabels('XVI. Горесть')).toEqual([[1501, 1600]])
    expect(yearIn('Кн.Луцк. 1562, л.183')).toBe(1562); expect(yearIn('л. 1234567')).toBeUndefined()
  })
  it('SE-11 the dictionary list of sources dates a siglum only where it gives a year', () => {
    const m = siglaDates('Гал. Кл. Раз. — Галятовський, Ключ розуміння, Київ 1665\nЛ.С. — літопис, без дати\n')
    expect(m.get('Гал. Кл. Раз.')).toBe(1665); expect(m.has('Л.С.')).toBe(false)
  })
  it('SE-11 a sense quoted in two centuries becomes two rows in two epochs, never one row spanning the epochs between', () => {
    expect(bucketDates([[1401, 1500], [1701, 1800]])).toEqual([[1401, 1500], [1701, 1800]])
    expect(bucketDates([[1650, 1650], [1655, 1655]])).toEqual([[1650, 1655]])
  })
})

describe('SE-11 per-dictionary article parsers', () => {
  it('SE-11 Тимченко: headword, grammar, etymology dropped, gloss, century label as the date; a «Див.» article is a cross-reference', () => {
    const arts = splitArticles(TIM); expect(arts.map(a => a.head)).toEqual(['АВРЕА', 'АВРЕОЛЯ', 'АВСТЕРІЯ'])
    const r = parse('timchenko', TIM)
    const row = r.rows.find(([h]) => h === 'авреоля')![1]
    expect(row).toMatchObject({ d: 'timchenko', g: expect.stringContaining('Світляний круг'), e: [1601, 1700], n: 1 }); expect(row.q).toContain('Гал. Кл. Раз.')
    expect(epochsOf(atOf(row)).ids).toContain('shev.middle'); expect(r.stats.crossRefs).toBe(1); expect(r.stats.passRate).toBe(1)
  })
  it('SE-11 СУМ XVI–XVII: year of the quotation in parentheses dates the sense; © = no quotation text, gloss ≤ 200; cross-reference «див.» left out', () => {
    const r = parse('sum16', SUM), row = r.rows.find(([h]) => h === 'встанливъ')![1]
    expect(r.rows.filter(([h]) => h === 'встанливъ').map(([, x]) => x.e)).toEqual([[1489, 1489], [1627, 1627]]); expect(row.g.length).toBeLessThanOrEqual(200); expect(row.q).toBeUndefined(); expect(row.s).toContain('Чет. 346'); expect(r.stats.crossRefs).toBe(1)
  })
  it('SE-11 Матеріали XV–XVIII ст.: the year in a siglum dates a sense («Кн.Луцк. 1562»), an undated one has no date (coverage period applies); © = no quotation text', () => {
    const r = parse('materials', MAT), bes = r.rows.find(([h]) => h === 'беседа')![1], bestia = r.rows.find(([h]) => h === 'бестія')![1]
    expect(bes.e).toEqual([1562, 1562]); expect(bes.g).toContain('Пир'); expect(bestia.e).toBeUndefined(); expect(atOf(bestia).basis).toBe('period'); expect(bestia.q).toBeUndefined()
  })
  it('SE-11 Словник мови Шевченка: a gloss only where the dictionary gives its count; the sigla are kept, the date is the coverage period (1837–1861)', () => {
    const r = parse('shevchenko', SHEV), duma = r.rows.find(([h]) => h === 'дума')![1], bag = r.rows.find(([h]) => h === 'багатирі')![1]
    expect(duma.g).toBe('Мисль, міркування'); expect(duma.s).toContain('І 259.1'); expect(duma.e).toBeUndefined(); expect(atOf(duma)).toMatchObject({ a: 1837, b: 1861, basis: 'period' }); expect(bag.g).toBe('')
  })
  it('SE-11 Білецький-Носенко: headword + parenthesised grammar, Russian gloss, PD so the quotation text may be kept; dated by the coverage period 1840–1842', () => {
    const r = parse('bn', BN), p = r.rows.find(([h]) => h === 'пекарка')![1]
    expect(p.g).toBe('Повариха'); expect(atOf(p)).toMatchObject({ a: 1840, b: 1842, basis: 'period' }); expect(r.rows.find(([h]) => h === 'барбара')![1].g).toBe('Плеть')
  })
})

describe('SE-11 pipeline: resumable, atomic, attaches only to existing cards', () => {
  const mk = () => {
    const hv = mkdtempSync(resolve(tmpdir(), 'se-hv-')); mkdirSync(resolve(hv, 'items'))
    const put = (id: string, text: string) => { writeFileSync(resolve(hv, 'items', id + '.gz'), gzipSync(text)); return JSON.stringify({ id, file: id, status: 200, bytes: text.length }) + '\n' }
    writeFileSync(resolve(hv, 'index.jsonl'), put('tymch1930', TIM) + put('SUM-28', SUM) + '{"id":"kniga1","fi')   // a torn last line
    return hv
  }
  it('SE-11 parseAll writes one output per OCR item atomically, ignores a torn index line, and a rerun reuses unchanged outputs', () => {
    const hv = mk(), out = mkdtempSync(resolve(tmpdir(), 'se-out-'))
    const a = parseAll(hv, out); expect(a.parsed.map(p => p.id).sort()).toEqual(['SUM-28', 'tymch1930']); expect(a.reused).toEqual([])
    expect(existsSync(resolve(out, 'tymch1930.json'))).toBe(true); expect(readdirTmp(out)).toEqual(['SUM-28.json', 'tymch1930.json'])
    const b = parseAll(hv, out); expect(b.reused.sort()).toEqual(['SUM-28', 'tymch1930'])
    expect(report(b.parsed, b.reused)).toContain('pass rate')
  })
  it('SE-11 parsedRows keeps a row only for a card that exists (exact key, else the first derivation candidate, flagged), never creates a lemma', () => {
    const hv = mk(), out = mkdtempSync(resolve(tmpdir(), 'se-out-')); parseAll(hv, out)
    const root = mkdtempSync(resolve(tmpdir(), 'se-root-')); mkdirSync(resolve(root, 'data/work'), { recursive: true })
    for (const f of ['tymch1930.json', 'SUM-28.json']) { mkdirSync(resolve(root, 'data/work/se-parsed'), { recursive: true }); writeFileSync(resolve(root, 'data/work/se-parsed', f), readFileSync(resolve(out, f))) }
    const into = new Map()
    const r = parsedRows(root, k => k === 'авреоля' || k === 'встаньливий', h => (h === 'встанливъ' ? ['встаньливий'] : []), into)
    expect(r.files).toBe(2); expect(into.get('авреоля')![0].d).toBe('timchenko'); expect(into.get('встаньливий')!.every((x: { m?: string }) => x.m === 'd')).toBe(true); expect(into.has('авреа')).toBe(false); expect(r.derived).toBe(2)
  })
  it('SE-11 OQ gate on the cached parsed rows: garbled glosses are blanked (the dated row stays), cross-references dropped', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'se-oq-')); mkdirSync(resolve(root, 'data/work/se-parsed'), { recursive: true })
    const rows = [['даль', { d: 'timchenko', g: 'Див. Цапе. 1 ДДялг, на дальшу відлегліость', e: [1600, 1699] }], ['даль', { d: 'timchenko', g: 'на дальшу відлегліость 1 ДДялг', e: [1600, 1699], q: 'garbage' }],
      ['даль', { d: 'timchenko', g: 'простір, відстань', e: [1700, 1799] }]]
    writeFileSync(resolve(root, 'data/work/se-parsed/t.json'), JSON.stringify({ rows }))
    const into = new Map(), r = parsedRows(root, k => k === 'даль', () => [], into)
    expect(r.xref).toEqual({ timchenko: 1 }); expect(r.blanked).toEqual({ timchenko: 1 })
    expect(into.get('даль')).toEqual([{ d: 'timchenko', g: '', e: [1600, 1699], oq: 1 }, { d: 'timchenko', g: 'простір, відстань', e: [1700, 1799] }])
    expect(glossClean('ДДялг, на дальшу')).toBe(false); expect(glossClean('Див. Цапе.')).toBe(false); expect(glossClean('простір, відстань')).toBe(true)
  })
  it('SE-11 the build stage reads the parsed rows, the parser script is an npm script and the chain runs it after the harvest', () => {
    expect(readFileSync('pipelines/build.ts', 'utf8')).toContain('parsedRows(ROOT'); expect(readFileSync('package.json', 'utf8')).toContain('"parse:se"'); expect(readFileSync('harvest/se-chain.sh', 'utf8')).toContain('parse-se-dicts.ts')
  })
})
const readdirTmp = (d: string) => readdirSync(d).sort()

describe('SPEC 63 SRC-3: the Лексис rows are part of build:data', () => {
  it('build:data fetches and parses the historical lexica before build.ts reads se-parsed', () => {
    const b = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:data'] as string
    expect(b).toMatch(/^tsx pipelines\/fetch-hist-lex\.ts && tsx pipelines\/parse-hist-lex\.ts && (?:tsx pipelines\/(?:fetch|parse)-hist-(?:typed|ws)\.ts && )*tsx pipelines\/build\.ts/)
    expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts['data:hist-lex']).toContain('parse-hist-lex.ts')
    expect(readFileSync('data/raw/hist-lex-ocr/SOURCES.txt', 'utf8')).toContain('zyz99.htm')
  })
  it('a present zyz99.htm is kept, never refetched', async () => {
    const { fetchZyz } = await import('../pipelines/fetch-hist-lex.ts')
    const d = mkdtempSync(resolve(tmpdir(), 'zyz-')), f = resolve(d, 'z.htm'); writeFileSync(f, 'x')
    expect(await fetchZyz(f)).toBe('kept')
  })
})
