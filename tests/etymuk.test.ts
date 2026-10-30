/** SPEC 63 GG-11 (open-source part): etymologies from the «Етимологія» sections of uk.wiktionary. */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { buildEtymology } from '../core/etymology.ts'
import { unknown } from '../core/evidence.ts'
import { citeLabel, etymSections, parseSection, ukEtymEvidence, ukEtymOf, ukWiktUrl, MAX_TEXT } from '../core/etymuk.ts'
import { xmlPages, xmlRecords } from '../pipelines/build-synphr.ts'
import { stageUkEtym, writeUkEtym } from '../pipelines/build-etymuk.ts'
import { writeEtymology } from '../pipelines/build-etymology.ts'

const T: Record<string, string> = {
  'етимологія:зуб': "{{праслов}} {{lang-orv|зубъ}}, {{lang-uk|[[зуб]]}}, {{lang-pl|ząb}}.\n* {{ЕтимологічнийСловникУкраїнськоїМови2}}\n* {{Ф}}<noinclude>[[Категорія:Шаблони етимології|зуб]]</noinclude>",
  'lang-orv': "[[давньоруська мова|др.]] ''<span lang=\"orv\">{{{1}}}</span>''<noinclude>[[Категорія:Шаблони мов]]</noinclude>",
  'lang-uk': "[[українська мова|укр.]] ''<span lang=\"uk\">{{{1}}}</span>''", 'lang-pl': "[[польська мова|пол.]] ''{{{1}}}''", 'lang-la': "[[латинська мова|лат.]] ''{{{1}}}''",
  'lang-en': "[[англійська мова|англ.]] ''{{{1}}}''", 'lang-psl': "[[праслов'янська мова|псл.]] ''{{{1}}}''",
  праслов: "праслов'янської форми{{#if:{{{1|}}}|&nbsp;{{{1}}}}}, від якої також виникли <noinclude>x</noinclude>", se: '[[північносаамська]]<noinclude>[[Категорія:Мови]]</noinclude>',
}
const look = (n: string) => T[n]
const page = (extra: string, body: string) => `{{Cf|x}}\n= {{-uk-}} =\n===Морфосинтаксичні ознаки===\n{{морфо-uk|x|+a}}\n${body}\n===Переклад===\n{{переклад|x}}\n${extra}`

describe('GG-11 etymSections: which part of a page is read', () => {
  it('the «Етимологія» body of the Ukrainian part only, up to the next heading; levels 3 and 4 both count; a foreign part is not read', () => {
    expect(etymSections(page('', '===Етимологія===\nВід псл. *zemja\n'))).toEqual(['Від псл. *zemja\n'])
    expect(etymSections(page('', '==== Етимологія ====\nВід лат. abbas\n==== Значення ====\n# щось'))).toEqual(['Від лат. abbas'])
    const en = '= {{-uk-}} =\n===Значення===\n# a\n= {{-en-}} =\n===Етимологія===\nFrom Latin.\n'
    expect(etymSections(en)).toEqual([])
    expect(etymSections('= {{-uk-}} =\n===Етимологія===\n\n===Переклад===\nx')).toEqual([])   // empty body
  })
})

describe('GG-11 parseSection: section shapes', () => {
  it('plain prose with links and quotes is cleaned to one line; the text is what the page prints', () => {
    const r = parseSection("Від латинського ''[[abbas]]'' (''[[abbatis]]''), з грецького ἀββᾶς, від арамейського אבא (абба) — [[батько]]", look)
    expect(r.verdict).toBe('ok'); expect(r.t).toBe('Від латинського abbas (abbatis), з грецького ἀββᾶς, від арамейського אבא (абба) — батько'); expect(r.cites).toEqual([])
  })
  it("{{етимологія|lang|word}} and {{lang-xx|word}} are expanded with the language label of the project's own lang templates", () => {
    expect(parseSection('Від {{етимологія|la|abbas}}', look).t).toBe('Від лат. abbas')
    expect(parseSection('Від {{lang-pl|stacja}} («станція») < {{lang-la|statio}}', look).t).toBe('Від пол. stacja («станція») < лат. statio')
    expect(parseSection('Від {{етимологія|en|nail|т=nēl}}', look).t).toBe('Від англ. nail (nēl)')
    expect(parseSection('{{праслов|*město}} {{lang-orv|мѣсто}}', look).t).toBe('праслов’янської форми *město, від якої також виникли др. мѣсто')
    expect(parseSection('Від {{se}} слова', look).t).toBe('Від північносаамська слова')
  })
  it('a transcluded article {{етимологія:зуб|uk}} is expanded from its template page; the sources it names become pointers, not text', () => {
    const r = parseSection('Від {{етимологія:зуб|uk}}', look)
    expect(r.verdict).toBe('ok'); expect(r.t).toContain('др. зубъ, укр. зуб, пол. ząb'); expect(r.t).not.toContain('Фасмера'); expect(r.t).not.toContain('Категорія')
    expect(r.cites).toEqual([{ src: 'ЕСУМ', vol: 2 }, { src: 'Фасмер' }])
    expect(r.part).toBe(false)
  })
  it('an article template that does not exist is unresolved: «Від» alone is a stub, a partial text is flagged', () => {
    expect(parseSection('Від {{етимологія:земля|uk}}', look)).toMatchObject({ verdict: 'stub', part: true })
    expect(parseSection('Від {{етимологія:земля|uk}} і псл. *zemja', look)).toMatchObject({ verdict: 'ok', part: true })
  })
  it('stubs: «Від ??» (language and no word is kept as a statement, no language is not), an empty template, comments only', () => {
    expect(parseSection('Від {{етимологія|}}', look).verdict).toBe('stub')
    expect(parseSection('Від {{етимологія:|}}', look).verdict).toBe('stub')
    expect(parseSection('<!-- заповнити -->', look).verdict).toBe('empty')
    expect(parseSection('Від ??', look).verdict).toBe('stub')
    const lo = parseSection('Від {{етимологія|en}}', look)
    expect(lo.verdict).toBe('ok'); expect(lo.t).toBe('Від англ. (слово не вказано)'); expect(lo.lo).toBe(true)
  })
  it('a bare pointer to another entry is not an etymology (MM-12)', () => {
    expect(parseSection('Див. [[кінь]]', look).verdict).toBe('pointer')
    expect(parseSection('форма від слова [[кінь]]', look).verdict).toBe('pointer')
    expect(parseSection('Від слова [[кінь]] з суфіксом -ик', look).verdict).toBe('ok')
  })
  it('ЕСУМ citations: template {{ЕСУМ5}}, a template with the page, and «ЕСУМ 1, 467» in prose; never invented', () => {
    expect(parseSection('Від {{lang-pl|stacja}}<ref>{{ЕСУМ5}}</ref>', look).cites).toEqual([{ src: 'ЕСУМ', vol: 5 }])
    expect(parseSection('Від лат. x {{ЕСУМ|3|120}}', look).cites).toEqual([{ src: 'ЕСУМ', vol: 3, page: 120 }])
    expect(parseSection('Від тур. hançer [ЕСУМ 1, 467].', look).cites).toEqual([{ src: 'ЕСУМ', vol: 1, page: 467 }])
    expect(parseSection('Від тур. hançer', look).cites).toEqual([])
    expect(citeLabel({ src: 'ЕСУМ', vol: 1, page: 467 })).toBe('ЕСУМ т. 1, с. 467 (за Вікісловником)')
    expect(citeLabel({ src: 'ЕСУМ', vol: 5 })).toBe('ЕСУМ т. 5 (за Вікісловником)')
  })
})

describe('GG-11 ukEtymOf: the entry of a page', () => {
  it('sections are joined, stubs skipped, the text is clipped, revision and timestamp kept; nothing real gives undefined', () => {
    const e = ukEtymOf(['Від {{етимологія|}}', 'Від лат. abbas', 'Від лат. abbas', 'Від ' + 'дуже довго '.repeat(100)], look, { rev: 7, ts: '2025-06-20T16:25:08Z' })!
    expect(e.t.startsWith('Від лат. abbas | Від дуже довго')).toBe(true); expect(e.t.length).toBeLessThanOrEqual(MAX_TEXT); expect(e.t.endsWith('…')).toBe(true)
    expect(e).toMatchObject({ rev: 7, ts: '2025-06-20T16:25:08Z' }); expect(e.lo).toBeUndefined()
    expect(ukEtymOf(['Від {{етимологія|}}', 'Див. [[x]]'], look)).toBeUndefined()
    expect(ukEtymOf(['Від {{етимологія|en}}'], look)!.lo).toBe(1)
  })
  it("the evidence is a Q with the page as locator, revision/dump/licence in the note and the ЕСУМ pointer worded as the Wiktionary page's, not ours", () => {
    const ev = ukEtymEvidence('зуб', { t: 'Від псл. *zǫbъ', rev: 548198, ts: '2023-05-01T20:42:07Z', cites: [{ src: 'ЕСУМ', vol: 2 }] }, '2026-10-01')
    expect(ev).toMatchObject({ source: 'WIKTUK', kind: 'Q', locator: ukWiktUrl('зуб'), quote: 'Від псл. *zǫbъ' })
    expect(ev.locator).toContain('uk.wiktionary.org'); expect(ev.note).toContain('CC BY-SA 4.0'); expect(ev.note).toContain('548198'); expect(ev.note).toContain('2026-10-01')
    expect(ev.note).toContain('ЕСУМ т. 2 (за Вікісловником)'); expect(ev.note).toContain('не наше прочитання ЕСУМ')
  })
})

describe('GG-11 merge with en.wiktionary: separate sourced blocks', () => {
  it('both texts are kept apart (text = en, uk = uk), two evidences; uk alone also makes an entry; the form-of rule of en is unchanged', () => {
    const uk = { t: 'Від псл. *kony', rev: 1, ts: '2024-01-01T00:00:00Z' }
    const both = buildEtymology('кінь', { text: 'From Proto-Slavic *kony.' }, undefined, [], undefined, '2026-10-12', [], uk, '2026-10-01')!
    expect(both.text).toBe('From Proto-Slavic *kony.'); expect(both.uk).toEqual(uk); expect(both.sources.map(s => s.source)).toEqual(['KAIKKI', 'WIKTUK'])
    const only = buildEtymology('кінь', { text: 'See the etymology of the corresponding lemma form.' }, undefined, [], undefined, '', [], uk, '2026-10-01')!
    expect(only.text).toBe(''); expect(only.sources.map(s => s.source)).toEqual(['WIKTUK'])
    expect(buildEtymology('кінь', undefined, undefined, [], undefined, '')).toBeUndefined()
  })
})

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const xml = (pages: { title: string; ns: number; text: string; rev: number; redirect?: boolean }[]) =>
  `<mediawiki>\n${pages.map(p => `  <page>\n    <title>${p.title}</title>\n    <ns>${p.ns}</ns>\n    <id>${p.rev + 1000}</id>\n${p.redirect ? '    <redirect title="x" />\n' : ''}    <revision>\n      <id>${p.rev}</id>\n      <timestamp>2025-06-20T16:25:08Z</timestamp>\n      <contributor>\n        <username>u</username>\n        <id>5</id>\n      </contributor>\n      <text bytes="1" xml:space="preserve">${esc(p.text)}</text>\n    </revision>\n  </page>`).join('\n')}\n</mediawiki>\n`
const PAGES = [
  { title: 'зуб', ns: 0, rev: 548198, text: page('', '===Етимологія===\nВід {{етимологія:зуб|uk}}') },
  { title: 'абат', ns: 0, rev: 564089, text: page('', "===Етимологія===\nВід латинського ''[[abbas]]'', з грецького ἀββᾶς") },
  { title: 'арфа', ns: 0, rev: 475681, text: page('', '===Етимологія===\nВід {{етимологія|}}') },
  { title: 'ноут', ns: 0, rev: 11, text: page('', '===Етимологія===\nВід {{етимологія|en}}') },
  { title: 'dog', ns: 0, rev: 12, text: '= {{-en-}} =\n===Етимологія===\nВід староангл.\n' },
  { title: 'Шаблон:етимологія:зуб', ns: 10, rev: 20, text: T['етимологія:зуб']! },
  { title: 'Шаблон:lang-orv', ns: 10, rev: 21, text: T['lang-orv']! }, { title: 'Шаблон:lang-uk', ns: 10, rev: 22, text: T['lang-uk']! }, { title: 'Шаблон:lang-pl', ns: 10, rev: 23, text: T['lang-pl']! },
  { title: 'Шаблон:праслов', ns: 10, rev: 24, text: T['праслов']! }, { title: 'Шаблон:lang-en', ns: 10, rev: 25, text: T['lang-en']! },
  { title: 'Редир', ns: 0, rev: 30, redirect: true, text: '#Redirect [[зуб]]' },
]
const known = unknown() as never

describe('GG-11 the dump reader', () => {
  it('xmlRecords gives every namespace with the revision id (not the contributor id) and timestamp; xmlPages is still the main namespace without redirects', async () => {
    const recs: { title: string; ns: string; rev?: number; ts?: string }[] = []
    for await (const r of xmlRecords(Readable.from([xml(PAGES)]))) recs.push(r)
    expect(recs).toHaveLength(PAGES.length)
    expect(recs[0]).toMatchObject({ title: 'зуб', ns: '0', rev: 548198, ts: '2025-06-20T16:25:08Z' }); expect(recs.find(r => r.title === 'Шаблон:праслов')!.ns).toBe('10')
    const t: string[] = []
    for await (const [title] of xmlPages(Readable.from([xml(PAGES)]))) t.push(title)
    expect(t).toEqual(['зуб', 'абат', 'арфа', 'ноут', 'dog'])
  })
})

describe('GG-11 the build step', () => {
  it('stageUkEtym: Ukrainian sections + templates from the dump (templates may come AFTER the pages); counts; a foreign page is not read', async () => {
    const d = mkdtempSync(join(tmpdir(), 'gg11-')), f = join(d, 'ukwiktionary-20261001-pages-articles.xml')
    writeFileSync(f, xml(PAGES))
    const s = await stageUkEtym(f)
    expect(s.date).toBe('2026-10-01'); expect(s.dump).toBe('ukwiktionary-20261001-pages-articles.xml')
    expect(Object.keys(s.entries).sort()).toEqual(['абат', 'зуб', 'ноут'].sort())
    expect(s.entries['зуб']).toMatchObject({ rev: 548198, cites: [{ src: 'ЕСУМ', vol: 2 }, { src: 'Фасмер' }] }); expect(s.entries['зуб']!.t).toContain('др. зубъ')
    expect(s.entries['ноут']).toMatchObject({ t: 'Від англ. (слово не вказано)', lo: 1 })
    expect(s.counts).toMatchObject({ pages: 4, sections: 4, ok: 3, stub: 1 })
  })
  it('writeUkEtym: cache keyed by size, atomic write, torn cache is rebuilt, no dump gives undefined (RS-1)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gg11r-')); mkdirSync(join(root, 'data/raw/ukwikt-dump'), { recursive: true })
    expect(await writeUkEtym(root, root)).toBeUndefined()
    writeFileSync(join(root, 'data/raw/ukwikt-dump/ukwiktionary-20261001-pages-articles.xml'), xml(PAGES))
    const a = (await writeUkEtym(root, root))!, out = join(root, 'data/work/etymology-ukwikt.json')
    expect(existsSync(out)).toBe(true); expect(Object.keys(a.entries)).toHaveLength(3)
    writeFileSync(out, JSON.stringify({ ...a, entries: { marker: { t: 'x' } } }))
    expect(Object.keys((await writeUkEtym(root, root))!.entries)).toEqual(['marker'])   // a complete cache of the same size is reused
    writeFileSync(out, '{"v":1,"by')
    expect(Object.keys((await writeUkEtym(root, root))!.entries)).toHaveLength(3)       // a torn cache is rebuilt
  })
  it('writeEtymology puts the uk block on the lemma, counts the overlap and carries the dump attribution', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gg11w-')), pub = join(root, 'pub'); mkdirSync(pub); mkdirSync(join(root, 'data/work'), { recursive: true })
    writeFileSync(join(root, 'data/work/etymology-kaikki.json'), JSON.stringify({ file: 'uk.jsonl', sha256: 'x', extracted: '2026-10-12', words: { зуб: { text: 'From Proto-Slavic *zǫbъ.' } } }))
    const d = mkdtempSync(join(tmpdir(), 'gg11d-')), f = join(d, 'ukwiktionary-20261001-pages-articles.xml'); writeFileSync(f, xml(PAGES))
    const s = await stageUkEtym(f)
    const r = writeEtymology([{ lemma: 'зуб', first: known }, { lemma: 'абат', first: known }, { lemma: 'нема', first: known }], root, pub, '2026-10-30', s)
    expect(r).toMatchObject({ entries: 2, uk: 2, ukAlso: 1, ukOnly: 1, ukEsum: 1 })
    const file = JSON.parse(readFileSync(join(pub, 'etymology.json'), 'utf8'))
    expect(file.attribution.ukwikt).toEqual({ dump: 'ukwiktionary-20261001-pages-articles.xml', date: '2026-10-01', licence: 'CC BY-SA 4.0' })
    expect(file.entries['зуб'].text).toBe('From Proto-Slavic *zǫbъ.'); expect(file.entries['зуб'].uk.rev).toBe(548198)
    expect(file.entries['зуб'].sources.map((x: { source: string }) => x.source)).toEqual(['KAIKKI', 'WIKTUK']); expect(file.entries['абат'].text).toBe('')
    expect(writeEtymology([{ lemma: 'зуб', first: known }], root, pub, 'g').uk).toBe(0)   // without the dump: unchanged behaviour
  })
  it('the main build runs the step before writeEtymology; the card shows the block apart from the en text, with the pointer wording and the revision', () => {
    const b = readFileSync('pipelines/build.ts', 'utf8')
    expect(b).toContain('writeUkEtym(ROOT, ROOT)'); expect(b.indexOf('writeUkEtym(ROOT, ROOT)')).toBeLessThan(b.indexOf('writeEtymology(cards'))
    const v = readFileSync('src/components/EtymologyBlock.vue', 'utf8')
    expect(v).toContain('data-testid="etym-ukwikt"'); expect(v).toContain('citeLabel'); expect(v).toContain('ukWiktRevUrl'); expect(v).toContain('не наше прочитання ЕСУМ')
    expect(readFileSync('src/lib/etymologyData.ts', 'utf8')).toContain("lmLoad<EtymologyFile>('etymology'")   // still the lazy per-bucket sidecar
  })
})
