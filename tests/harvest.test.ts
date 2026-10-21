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
const hv4 = await import('../harvest/hv4.ts')
const hv5 = await import('../harvest/hv5.ts')
const hv5o = await import('../harvest/hv5-orig.ts')
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

describe('HV-4 Зизаній, Смотрицький, Беринда (archive.org scans of the original prints)', () => {
  it('HV-4 the work list: 5 prints 1596/1596/1619/1627/1653, each with date, place, author, PD licence and an archive.org item; the 1961/1964/1979 Німчук editions are not in it', () => {
    expect(hv4.HV4_WORKS.map(w => w.date)).toEqual(['1596', '1596', '1619', '1627', '1653'])
    for (const w of hv4.HV4_WORKS) { expect(w.region).toBeTruthy(); expect(w.author).toBeTruthy(); expect(w.licence).toMatch(/^PD/); expect(w.file).toMatch(/_djvu\.txt$/) }
    expect(new Set(hv4.HV4_WORKS.map(w => w.id)).size).toBe(5)
    expect(hv4.HV4_WORKS.map(w => w.ia).join()).not.toMatch(/leksykon1961|zyzanii2|hramslavenski/)
    expect(hv4.HV4_SKIPPED.join('\n')).toMatch(/Німчук/)
  })
  it('HV-4 an item is stored as one gz with its index line (date/author/region/ocr); a second run skips it (resumable, idempotent)', () => {
    const h = new Harvest('hv4t', { delayMs: 0 })
    const w = hv4.HV4_WORKS[0]!
    h.put(w.id.replace(':', '_'), 'текст', [hv4.item(w, 'https://archive.org/details/x', 10, 200)])
    const again = new Harvest('hv4t', { delayMs: 0 })
    expect(again.has(w.id)).toBe(true); expect(again.count).toBe(1)
    const line = JSON.parse(readFileSync(join(TMP, 'harvest/hv4t/index.jsonl'), 'utf8').trim())
    expect(line).toMatchObject({ date: '1596', author: 'Лаврентій Зизаній', region: 'Вільно', ocr: true, kind: 'grammar' })
  })
  it('HV-4 harvest:ingest turns the hv4 dump into a vocabulary-only file (family middle-ukrainian-church-slavonic, dated items, no running text)', async () => {
    const root = process.env.HARVEST_DIR!, out = join(TMP, 'out4')
    const w = hv4.HV4_WORKS[3]!
    mkdirSync(join(root, 'hv4/items'), { recursive: true })
    writeFileSync(join(root, 'hv4/items/b.gz'), gzipSync('Агнєцъ — баранъ. Азъ — я. Агнєцъ.\n'))
    writeFileSync(join(root, 'hv4/index.jsonl'), JSON.stringify({ ...hv4.item(w, 'https://archive.org/details/x', 30, 200), file: 'b' }) + '\n')
    await ing.main(['--out', out, '--only', 'hv4'])
    const v = JSON.parse(readFileSync(join(out, 'harvest-vocab/hv4.json'), 'utf8'))
    expect(v).toMatchObject({ vocabOnly: true, family: 'middle-ukrainian-church-slavonic' })
    expect(v.items[0]).toMatchObject({ date: [1627, 1627], region: 'Київ' }); expect(JSON.stringify(v)).not.toMatch(/"tokens":\[/)
  })
})

describe('HV-5 litopys/izbornyk Ruthenian texts, ayuzr and gap volumes', () => {
  const page = (body: string) => `<html><body><div class="dop3"><h2>Анонім</h2><h1>ТЕСТ</h1>${body}</div></body></html>`
  const enc = (s: string) => Buffer.from(s.replace(/ѣ/g, 'Ђ'), 'latin1')   // fixture only needs ASCII + Ђ-free text; windows-1251 bytes are produced below
  it('HV-5 the work list: every queued research/44 row is a unit with a school and a dating source, the rest has a verdict; undated pages are never given a date', () => {
    const queued = Object.entries(hv5.HV5_BRATSTVA).filter(([, v]) => v.verdict === 'queued').map(([r]) => r)
    const units = hv5.HV5_UNITS.filter(u => u.tier === 1)
    for (const r of queued) expect(units.some(u => u.rows?.includes(r)), r).toBe(true)
    for (const u of units) { expect(u.school && u.schoolSource, u.id).toMatch(/research\/44/); expect(u.dateQuote?.length || u.dateSource, u.id).toBeTruthy() }
    expect(Object.values(hv5.HV5_BRATSTVA).filter(v => v.verdict !== 'queued').map(v => v.verdict).sort()).toContain('hv4')
    for (const u of hv5.HV5_UNITS.filter(u => u.tier === 2)) expect(u.date ?? null, u.id).toBeNull()
    expect(new Set(hv5.HV5_UNITS.map(u => u.id)).size).toBe(hv5.HV5_UNITS.length)
  })
  it('HV-5 a stated date must occur verbatim in the page, else the item is undated; tier 2 takes a year only from a composition/printing sentence', () => {
    const u = hv5.HV5_UNITS.find(x => x.id === 'hv5:old14_33')!
    expect(hv5.item(u, page('<p class=Prym>Просфонима. Львів, друкарня братства, 1.2 1591 р.</p>'), 10, 200)).toMatchObject({ date: '1591', dateBasis: 'page-quote', school: 'lviv', schoolSource: expect.stringMatching(/research\/44 r05/) })
    expect(hv5.item(u, page('<p class=Prym>без року</p>'), 10, 200)).toMatchObject({ date: null })
    expect(hv5.autoDate('Твір написаний 1607 р. в Острозі. Інше.')).toMatchObject({ date: '1607' })
    expect(hv5.autoDate('У 1607 р. він помер.')).toBeNull()
  })
  it('HV-5 harvest:ingest on one litopys page: primary text only (Prym never read), ъ/ѣ kept, Russian lines dropped, school and date carried, vocab-only mixed volumes', async () => {
    const root = process.env.HARVEST_DIR!, out = join(TMP, 'out5')
    const w = hv5.HV5_UNITS.find(x => x.id === 'hv5:old14_37')!
    const k1 = '<p class=K1>Вѣрши або стихи, до того што читал, же краєгранесиє сицево хранися италиян якъ бы то было и ся вѣра наша в Христа богу истинному слава</p><p class=K1>Что это было такое которое мы видели</p><p class=K1>На герб ясневельможного княжати Острозского слава богу и людем</p>'
    const html = page(k1 + '<p class=Prym>ПРИМІТКИ УКЛАДАЧА: коментар жодного слова не читається; написаному у Дерманському монастирі 1603 р.; Острог, 1607, арк. 2</p>').replace(/ѣ/g, 'Ђ')
    const bytes = Buffer.from(html, 'utf8')   // the ingester decodes windows-1251: encode the fixture accordingly
    const cp = Buffer.from([...html].map(ch => { const c = ch.codePointAt(0)!; if (c < 128) return c; if (c === 0x402) return 0x80; if (c >= 0x410 && c <= 0x44f) return c - 0x410 + 0xc0; if (c === 0x404) return 0xaa; if (c === 0x454) return 0xba; if (c === 0x456) return 0xb3; if (c === 0x406) return 0xb2; return 0x3f }))
    expect(bytes.length).toBeGreaterThan(0); void enc
    mkdirSync(join(root, 'hv5/items'), { recursive: true })
    writeFileSync(join(root, 'hv5/items/p.gz'), gzipSync(cp))
    const it = hv5.item(w, new TextDecoder('windows-1251').decode(cp), cp.length, 200)
    writeFileSync(join(root, 'hv5/index.jsonl'), JSON.stringify({ ...it, file: 'p' }) + '\n')
    await ing.main(['--out', out, '--only', 'hv5'])
    const files = readdirSync(out).filter(f => f.startsWith('hv_lit_'))
    expect(files).toHaveLength(1)
    const wit = JSON.parse(readFileSync(join(out, files[0]!), 'utf8'))
    expect(wit).toMatchObject({ lang: 'ruthenian', date: [1603, 1607], region: 'Острог', school: { id: 'ostroh', confidence: 'певно' } })
    const raw = wit.tokens.map((t: { raw: string }) => t.raw)
    expect(raw).toContain('вѣра'); expect(raw).toContain('якъ'); expect(raw).not.toContain('Что'); expect(raw).not.toContain('УКЛАДАЧА'); expect(wit.dropped.apparatus).toBeGreaterThan(0)
    // АЮЗР volume: mixed language → vocabulary only, Russian function-word lines dropped, no running text
    mkdirSync(join(root, 'archive-ayuzr/items'), { recursive: true })
    writeFileSync(join(root, 'archive-ayuzr/items/v.gz'), gzipSync('Козаки запорозскіе жили на Сѣчи\nЧто это было такое\n'))
    writeFileSync(join(root, 'archive-ayuzr/index.jsonl'), JSON.stringify({ id: 'auzr', url: 'https://archive.org/details/auzr', date: '1863', licence: 'PD', bytes: 40, status: 200, title: 'Архив ЮЗР', file: 'v' }) + '\n')
    await ing.main(['--out', out, '--only', 'archive-ayuzr'])
    const v = JSON.parse(readFileSync(join(out, 'harvest-vocab/archive-ayuzr.json'), 'utf8'))
    expect(v).toMatchObject({ vocabOnly: true, family: 'middle-ukrainian-mixed' }); expect(v.entries['козаки']).toBeTruthy(); expect(v.entries['что']).toBeUndefined(); expect(JSON.stringify(v)).not.toMatch(/"tokens":\[/)
  })
})

describe('HV-5 owner decisions 2026-10-21: originals only; generally accepted dating', () => {
  it('HV-5 Сковорода: each dated work quotes the academic edition commentary (range kept); a work without a dating stays undated', () => {
    const sk = hv5.HV5_UNITS.filter(u => u.tier === 3)
    expect(sk.length).toBeGreaterThanOrEqual(20)
    const dated = sk.filter(u => u.date)
    expect(dated.map(u => u.date)).toEqual(expect.arrayContaining(['1753-1785', '1769-1774', '1768', '1774', '1775-1776', '1787']))
    for (const u of dated) { expect(u.datePage, u.id).toMatch(/^skovoroda\/skov(117|220)\.htm$/); expect(u.dateQuote?.length, u.id).toBeGreaterThan(0) }
    const u = dated.find(x => x.id === 'hv5:skov108')!
    expect(hv5.item(u, '<div class="dop3"><p class=K1>текст</p></div>', 5, 200, '<div class="dop3"><p class=Prym>Дату написання трактату слід віднести до 1768 р.</p></div>')).toMatchObject({ date: '1768', dateBasis: expect.stringMatching(/skov117/) })
    expect(hv5.item(u, '<div class="dop3"></div>', 5, 200, '<div class="dop3"><p class=Prym>інше</p></div>')).toMatchObject({ date: null })
    expect(sk.some(x => !x.date && x.id === 'hv5:skov110')).toBe(true)
  })
  it('HV-5 originals: Величко vols 1–3 (1848/1851/1855), Грабянка 1853, Історія Русів 1846 from archive.org records; composition date separate from the edition year; modern translations are not sources', () => {
    expect(hv5o.HV5_ORIG.map(w => w.editionDate)).toEqual(['1848', '1851', '1855', '1853', '1846'])
    for (const w of hv5o.HV5_ORIG) { expect(w.ia, w.id).not.toMatch(/litopys/); expect(Number(w.date.slice(0, 4)), w.id).toBeLessThan(Number(w.editionDate)) ; expect(w.dateQuote.length).toBeGreaterThan(10) }
    expect(hv5o.HV5_ORIG.find(w => w.id.includes('rusov'))).toMatchObject({ date: '1760-1846', lang: 'undetermined' })
  })
  it('HV-5 harvest:ingest on a hv5-orig OCR text: composition date and edition in the witness, ъ/ѣ kept, the editors Russian apparatus dropped', async () => {
    const root = process.env.HARVEST_DIR!, out = join(TMP, 'out5o')
    const w = hv5o.HV5_ORIG[3]!
    mkdirSync(join(root, 'hv5-orig/items'), { recursive: true })
    writeFileSync(join(root, 'hv5-orig/items/o.gz'), gzipSync('Козаки запорожскіе жили на Сѣчи и великую славу собѣ мѣли богу дякуючи\nЧто это было такое которое мы видели в рукописи\nГетман Хмельницкій з войском своим пошол под Корсунь и побѣдил поляков в той день\n'))
    writeFileSync(join(root, 'hv5-orig/index.jsonl'), JSON.stringify({ ...hv5o.origItem(w, 'https://archive.org/details/hrabianka', 300, 200, 'test'), file: 'o' }) + '\n')
    await ing.main(['--out', out, '--only', 'hv5-orig'])
    const f = readdirSync(out).find(x => x.startsWith('hv_orig_'))!
    const wit = JSON.parse(readFileSync(join(out, f), 'utf8'))
    expect(wit).toMatchObject({ date: [1710, 1710], lang: 'ruthenian' }); expect(wit.edition).toMatch(/1853/)
    const raw = wit.tokens.map((t: { raw: string }) => t.raw)
    expect(raw).toContain('Сѣчи'); expect(raw).not.toContain('Что'); expect(wit.dropped.apparatus).toBeGreaterThan(0)
  })
})
