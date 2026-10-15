/** SPEC 63 HV-1…HV-3: background harvesters (harvest/*.ts) and their ingest (pipelines/ingest-harvest.ts). Offline: parsers get fixtures, the ingest gets a synthetic harvest dir. */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const TMP = mkdtempSync(join(tmpdir(), 'hv-'))
process.env.HARVEST_DIR = join(TMP, 'harvest')   // before the modules below are loaded
const { Harvest } = await import('../harvest/lib.ts')
const wiki = await import('../harvest/wiki.ts')
const arch = await import('../harvest/archive.ts')
const gram = await import('../harvest/gramoty.ts')
const poets = await import('../harvest/poets.ts')
const faust = await import('../harvest/faust.ts')
const hr = await import('../harvest/hrushevsky.ts')
const ing = await import('../pipelines/ingest-harvest.ts')

describe('HV-1 harvest/ scripts: resumable, capped, logged, launched detached', () => {
  it('HV-1 an item batch is written as items/<file>.gz with an index line; a new run sees it as done', () => {
    const h = new Harvest('t1', { delayMs: 0 })
    h.put('b1', 'payload', [{ id: 'a:1', url: 'u', date: '1893', licence: 'PD', bytes: 7, status: 200, title: 'T' }])
    expect(existsSync(join(TMP, 'harvest/t1/items/b1.gz'))).toBe(true)
    const again = new Harvest('t1', { delayMs: 0 })
    expect(again.has('a:1')).toBe(true); expect(again.count).toBe(1)
    const line = JSON.parse(readFileSync(join(TMP, 'harvest/t1/index.jsonl'), 'utf8').trim())
    expect(line).toMatchObject({ id: 'a:1', file: 'b1', date: '1893', licence: 'PD', bytes: 7, status: 200, title: 'T' })
  })
  it('HV-1 a torn last index line (killed mid-write) does not break the resume', () => {
    writeFileSync(join(TMP, 'harvest/t1/index.jsonl'), readFileSync(join(TMP, 'harvest/t1/index.jsonl'), 'utf8') + '{"id":"a:2","ur')
    expect(new Harvest('t1', { delayMs: 0 }).count).toBe(1)
  })
  it('HV-1 the launcher starts hidden detached processes, writes pids.json and logs; the status script reports items/bytes/alive', () => {
    const l = readFileSync('harvest/launch.ps1', 'utf8'), s = readFileSync('harvest/status.ps1', 'utf8')
    expect(l).toMatch(/-WindowStyle Hidden/); expect(l).toMatch(/pids\.json/); expect(l).toMatch(/log\.txt/); expect(l).toMatch(/RedirectStandardError/)
    for (const src of ['wikisource-uk', 'archive-ukr', 'hplt', 'r2u', 'gramoty', 'poets', 'faust-lukash', 'hrushevsky', 'wikipedia-uk', 'wikipedia-rue', 'wiktionary-uk']) expect(l, src).toContain(`'${src}'`)
    expect(s).toMatch(/Get-Process -Id/); expect(s).toMatch(/payloadMB/)
  })
  it('HV-1 pacing: r2u 10 s, wikis/archive ≥ 2 s; r2u/ stops on 403/429/5xx, the cap is 2 GB by default', () => {
    expect(readFileSync('harvest/r2u.ts', 'utf8')).toMatch(/delayMs: 10_000/)
    expect(wiki.PRESETS['wikisource-uk']!.delayMs).toBeGreaterThanOrEqual(2000)
    const lib = readFileSync('harvest/lib.ts', 'utf8')
    expect(lib).toMatch(/st === 403 \|\| st === 429/); expect(lib).toMatch(/2_000_000_000/)
  })
  it('HV-1 DECISIONS-NEEDED lists pisni.org.ua (robots Disallow /), Reddit, YouTube and modern lyrics with the reason', () => {
    const d = readFileSync('harvest/decisions.ts', 'utf8')
    for (const k of ['pisni.org.ua', 'Disallow: /', 'Reddit', 'YouTube', 'Хейт-спіч', 'Структура щастя', 'Занедбай мене']) expect(d, k).toContain(k)
  })
})

describe('HV-2 sources: parsers', () => {
  it('HV-2 wikisource: the {{заголовок}} header gives author/year/place; categories «Роботи NNNN» are the fallback date', () => {
    const w = '{{заголовок\n | назва = [[../]]\n | автор = [[Майк Йогансен]]\n | рік = 1925\n | місто = Харків\n}}\n<pages index="x.pdf" from="17" to="24" />'
    expect(wiki.headerFields(w)).toEqual({ author: 'Майк Йогансен', year: '1925', place: 'Харків' })
    expect(wiki.needsRender(w)).toBe(true)
    expect(wiki.yearFromCats(['Категорія:Роботи 1911-ого', 'Категорія:Роботи українською мовою'])).toBe('1911')
    const p = wiki.pageItem({ pageid: 7, title: 'Лист', extract: 'слово '.repeat(5), categories: [{ title: 'Категорія:Роботи 1893-го' }], revisions: [{ slots: { main: { '*': w } } }] }, wiki.PRESETS['wikisource-uk']!, 'wikisource-uk')!
    expect(p.item).toMatchObject({ id: 'wikisource-uk:7', date: '1925', author: 'Майк Йогансен', region: 'Харків', vocabOnly: false })
  })
  it('HV-2 wikipedia/wiktionary: wikitext → plain words, vocab-only, rue region, date = touched (terminus ante quem)', () => {
    const t = wiki.wikitextToPlain("{{infobox|a=b}}'''Ґринджоли''' — [[сани|санки]] для [[Файл:x.png|thumb]] дітей.<ref>q</ref>\n== Назва ==\n* пункт")
    expect(t).toContain('Ґринджоли — санки для'); expect(t).not.toMatch(/infobox|ref|\[\[|'''/)
    const p = wiki.pageItem({ pageid: 1, title: 'Сани', revisions: [{ slots: { main: { '*': 'слово слово' } } }], touched: '2026-05-01T10:00:00Z' }, wiki.PRESETS['wikipedia-rue']!, 'wikipedia-rue')!
    expect(p.item).toMatchObject({ vocabOnly: true, dateKind: 'touched', date: '2026-05-01', lang: 'rue' }); expect(String(p.item.region)).toMatch(/русин/)
    expect(wiki.PRESETS['wiktionary-rue']).toBeUndefined()
  })
  it('HV-2 archive.org: presets are PD-dated (≤ 1925; Грушевський ≤ 1934), doc → index item with date/author/region/ocr flag', () => {
    expect(Object.keys(arch.ARCHIVE_PRESETS)).toEqual(expect.arrayContaining(['archive-ukr', 'archive-rusyn', 'archive-kuban', 'archive-novhorod-siversk', 'archive-hrushevsky']))
    expect(arch.ARCHIVE_PRESETS['archive-ukr']!.q).toMatch(/1925-12-31/); expect(arch.ARCHIVE_PRESETS['archive-hrushevsky']!.q).toMatch(/1934-12-31/)
    const it = arch.docItem({ identifier: 'abc', title: ['Буквар'], creator: 'Шевченко', date: '1861-01-01T00:00:00Z', language: ['ukr'] }, arch.ARCHIVE_PRESETS['archive-kuban']!, 123, 200)
    expect(it).toMatchObject({ id: 'abc', url: 'https://archive.org/details/abc', date: '1861-01-01', author: 'Шевченко', region: 'Кубань', ocr: true, bytes: 123 })
  })
  it('HV-2 gramoty: document links, date and word-split transcription; tagged comparative East Slavic, vocab-only', () => {
    const html = '<a href="/birchbark/document/show/novgorod/1/">1</a><a href="/birchbark/document/show/pskov/3/">3</a><a href="/birchbark/document/show/novgorod/1/">dup</a>'
    expect(gram.docLinks(html)).toEqual(['novgorod/1', 'pskov/3'])
    const d = gram.parseDoc('<tr><th>Город</th><td>Новгород</td></tr><tr><th>Условная дата</th><td>1380‒1400</td></tr><div class="original-text-wrapper with-spaces">\n<div class="text-area original-text">ѥю ӏ ѳомѣ шло<br />дару</div></div>')
    expect(d.text).toBe('ѥю ӏ ѳомѣ шло\nдару'); expect(gram.normDate('1380‒1400')).toBe('1380-1400')
  })
  it('HV-2 poets (ukrlib): ≥ 30 poets of the 1980s–2000s incl. Андрухович, Бу-Ба-Бу, Лугосад; only form counts + a ≤ 2-line quote are produced', () => {
    expect(poets.POETS.length).toBeGreaterThanOrEqual(30)
    for (const n of ['Андрухович', 'Неборак', 'Ірванець', 'Забужко', 'Жадан', 'Лучук', 'Лишега', 'Малкович', 'Герасим\'юк', 'Москалець']) expect(poets.POETS.some(p => p.surname === n), n).toBe(true)
    expect(poets.matchPoet('Андрухович Юрій — повні тексти творів')?.surname).toBe('Андрухович')
    expect(poets.matchPoet('Андрухович Іван — повні тексти')).toBeUndefined()
    const html = '<!-- /.post-right-zagolovok -->\nАгов, мої чортенята!<br />\nЗ-під свити я вас випущу<br />\nна світ.<div class="sub-pages-link">x</div>'
    const text = poets.poemText(html)
    expect(poets.quote2(text)).toEqual(['Агов, мої чортенята!', 'З-під свити я вас випущу'])
    expect(poets.bagOfForms('Світ і світ, СВІТ.')).toEqual({ forms: { 'світ': 3, 'і': 1 }, n: 4 })
    expect(poets.workLinks('<a href="printit.php?tid=4848">Пісня</a><a href="printit.php?tid=4848">dup</a>')).toEqual([{ tid: '4848', title: 'Пісня' }])
  })
  it('HV-2 Лукаш «Фауст»: ukrlib pagination found, translation 1955 witness metadata, vocabulary only', () => {
    expect(faust.lastPage('<a href="?tid=145&amp;page=2">2</a> <a href="?tid=145&amp;page=29">29</a>')).toBe(29)
    const src = readFileSync('harvest/faust.ts', 'utf8')
    expect(src).toMatch(/date: '1955'/); expect(src).toMatch(/witnessType: 'translation'/); expect(src).toMatch(/vocabOnly: true/)
  })
  it('HV-2 Грушевський: izbornyk volume pages found, volume from the file name, first-edition years 1923–1927', () => {
    expect(hr.pageLinks('<a href="hrush101.htm">1</a><a href="hrush2.htm">t2</a><a href="x.htm">no</a>')).toEqual(['hrush101.htm', 'hrush2.htm'])
    expect(hr.volumeOf('hrush304.htm')).toBe(3); expect(hr.FIRST_EDITION[6]).toBe('1927')
  })
})

describe('HV-3 ingest-harvest: dumps → witnesses', () => {
  it('HV-3 dates: «1380-1400», «1893-05-01», archive timestamps; no year → null (undated works are not ingested)', () => {
    expect(ing.yearRange('1380-1400')).toEqual([1380, 1400]); expect(ing.yearRange('1893-05-01')).toEqual([1893, 1893]); expect(ing.yearRange('1899-01-01T00:00:00Z')).toEqual([1899, 1899]); expect(ing.yearRange(null)).toBeNull(); expect(ing.yearRange('без дати')).toBeNull()
  })
  it('HV-3 OCR rules and language gate: Cyrillic-only tokens kept, Latin/digit/mixed dropped as unmapped, Russian lines dropped as apparatus', () => {
    const t = ing.textTokens('Слово про полк\nСлово a1b 123 тест\nэто что или который\nрозмі-\nщений', 'loc')
    expect(t.tokens.map(x => x.raw)).toEqual(['Слово', 'про', 'полк', 'Слово', 'тест', 'розміщений'])
    expect(t.unmapped).toBe(2); expect(t.apparatus).toBe(4)
  })
  it('HV-3 end to end on a synthetic archive dump: witness with date/licence/author/region from the index, OCR rules applied; vocab-only sources give counts only', async () => {
    const root = process.env.HARVEST_DIR!, out = join(TMP, 'out')
    const text = ('Козак мав коня і шаблю. ' + 'А в тому селі жила вдова.\n').repeat(10)
    mkdirSync(join(root, 'archive-kuban/items'), { recursive: true })
    writeFileSync(join(root, 'archive-kuban/items/zzz.gz'), gzipSync(text))
    writeFileSync(join(root, 'archive-kuban/index.jsonl'), JSON.stringify({ id: 'zzz', url: 'https://archive.org/details/zzz', date: '1899-01-01', licence: 'PD (test)', bytes: text.length, status: 200, title: 'Кубанські оповідання', author: 'Іван Тест', region: 'Кубань', file: 'zzz', ocr: true }) + '\n')
    mkdirSync(join(root, 'faust-lukash/items'), { recursive: true })
    writeFileSync(join(root, 'faust-lukash/items/faust_1.gz'), gzipSync(JSON.stringify({ forms: { 'слово': 3, 'світ': 2 }, n: 5, quote: ['рядок 1', 'рядок 2'] })))
    writeFileSync(join(root, 'faust-lukash/index.jsonl'), JSON.stringify({ id: 'faust-lukash:1', url: 'u', date: '1955', licence: '©', bytes: 10, status: 200, title: 'Фауст', author: 'Микола Лукаш', witnessType: 'translation', file: 'faust_1', vocabOnly: true }) + '\n')
    await ing.main(['--out', out])
    const w = JSON.parse(readFileSync(join(out, 'hv_ia_zzz.json'), 'utf8'))
    expect(w).toMatchObject({ date: [1899, 1899], license: 'PD (test)', region: 'Кубань', witnessType: 'ocr', lang: 'uk', title: 'Кубанські оповідання' })
    expect(w.tokens.length).toBeGreaterThan(50); expect(w.dateCite.quote).toContain('1899')
    const authors = JSON.parse(readFileSync(join(out, 'harvest-authors.json'), 'utf8'))
    expect(authors[0]).toMatchObject({ name: 'Іван Тест', status: 'provisional' })
    const v = JSON.parse(readFileSync(join(out, 'harvest-vocab/faust-lukash.json'), 'utf8'))
    expect(v.entries['слово']).toMatchObject({ f: 3 }); expect(v.vocabOnly).toBe(true); expect(v.items[0].quote).toHaveLength(2)
    expect(JSON.stringify(v)).not.toMatch(/"tokens":\[/)   // no running text
    expect(readdirSync(out).filter(f => f.startsWith('hv_faust'))).toEqual([])
  })
})
