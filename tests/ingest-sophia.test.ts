/**
 * SPEC 60 NW-6 amendment 2026-10-12 — Saint Sophia inscriptions as running-text witnesses: field choice, tokenisation, language/date gates,
 * Glagolitic handling, licenceNote, author evidence (quotes occur verbatim in the cached API pages when data/raw/sophia exists).
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { htmlText, tokenize, pickText, ingestRows, usableEdition, UNMAPPED_GLYPH } from '../pipelines/ingest-sophia.ts'
import { LICENCE_NOTE } from '../pipelines/nw-sophia.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { sophiaIdOf } from '../src/lib/media.ts'

const IIIF = 'https://img.dh.gu.se/saintsophia/static/inscriptions/iiif/3372fd6b-2dff-42cd-b047-2f387d0e58c0.tif/pct:1,2,3,4/'
const row = (id: number, o: Record<string, any> = {}) => ({
  published: true, id, title: String(id), panel: { title: '114-15', room: '114' },
  language: { text: 'Church Slavonic' }, writing_system: { text: 'Cyrillic' }, min_year: 1125, max_year: 1315,
  transcription: '<p>иѧковъѱлъ<br />\r\nчрньць✠</p>', interpretative_edition: '', romanisation: '', dating_criteria: [{ text: 'Paleography' }],
  inscription_iiif_url: IIIF, ...o,
})
const FIX = [
  row(3469),                                                                                       // diplomatic, two lines
  row(347, {                                                                                       // 120-19c/347 (screenshot): PUA glyphs, unspaced diplomatic text, word-spaced edition
    panel: { title: '120-19c', room: '120' }, min_year: 1019, max_year: 1019,
    transcription: '<p>г͠ пꙍмоꙁрабꙋсвꙍѥмꙋ | късн-т-н-</p>',
    interpretative_edition: '<p>Г(оспод)и пꙍмози рабꙋ свꙍѥмꙋ Късн[ѧ]т[и]н[ꙋ]</p>',
  }),
  row(448, { language: { text: 'Ukrainian' }, min_year: 1570, max_year: 1700, transcription: '<p>Спаси Господи раба сво[е]го Иполита</p>' }),
  row(900, { language: { text: 'Ukrainian' }, min_year: 1850, max_year: 1900, transcription: '<p>Іван був тут</p>' }),
  row(1, { language: { text: 'Ancient Greek' }, writing_system: { text: 'Greek' }, transcription: '<p>κε βοηθη</p>' }),
  row(2, { language: { text: 'Polish' }, writing_system: { text: 'Latin' }, transcription: '<p>Ja byl 1629</p>' }),
  row(3, { language: { text: 'Russian' } }),
  row(4, { language: undefined }),                                                                  // language unstated, Cyrillic
  row(5, { min_year: null, max_year: null }),                                                       // undated
  row(6, { min_year: 1300, max_year: 13015 }),                                                      // portal typo
  row(7, { transcription: '<p>та----- | в-------- | ...</p>' }),                                    // lacunae only
  row(8, { published: false }),
  row(9, { language: { text: 'N/A' }, transcription: '', interpretative_edition: '<p>Иван тут</p>' }),   // BL-10: undetermined, normalised reading only
  row(10, { language: undefined, writing_system: { text: 'Latin' }, transcription: '<p>Ivan hic</p>' }),  // unstated, not Cyrillic
  row(582, { language: undefined, writing_system: { text: 'Glagolitic' }, min_year: 1050, max_year: 1100, transcription: '<p>Ⰾ(Ⰵჵ)☊ჵჵⰇⰟ</p>', romanisation: 'Fєodoulʺ', interpretative_edition: '<p>Фєодоулъ</p>' }),
  row(583, { language: undefined, writing_system: { text: 'Glagolitic' }, min_year: 1050, max_year: 1100, transcription: '<p>ⰰⰱⰲ ⰳⰴⰵ</p>' }),
]

describe('htmlText / tokenize', () => {
  it('decodes entities and turns <br> and </p> into line breaks', () => {
    expect(htmlText('<p>a&amp;b<br />\r\nc&ldquo;d</p>')).toBe('a&b\n\nc“d\n')   // empty lines are skipped by tokenize
    expect(htmlText(null)).toBe('')
  })
  it('keeps restored/expanded letters, drops lacuna words, numerals, mixed-script and one-letter non-words', () => {
    const t = tokenize('Спаси Господи раба сво[е]го Иполи(та)\nграбасвоѥ-- вас-- на\nроку ҂ахе Bogdan Хom[e]cki Б 1621 а', '113/1')
    expect(t.tokens.map(x => x.raw)).toEqual(['Спаси', 'Господи', 'раба', 'своего', 'Иполита', 'на', 'року', 'а'])
    expect(t.apparatus).toBe(2); expect(t.unmapped).toBe(4)      // ҂ахе, Хom[e]cki(mixed) | Bogdan (Latin), Б
    expect(t.tokens.map(x => x.s)).toEqual([0, 0, 0, 0, 0, 1, 2, 2])
  })
  it('splits lines on « | » and removes a single hyphen inside a word', () => {
    expect(tokenize('фєод-оръ | ѱлъ', 'x').tokens.map(x => [x.raw, x.s])).toEqual([['фєодоръ', 0], ['ѱлъ', 1]])
  })
})

describe('pickText', () => {
  it('uses the diplomatic transcription, falling back to interpretative_edition when it is empty', () => {
    expect(pickText(row(1))).toMatchObject({ field: 'transcription', script: 'Cyrillic' })
    expect(pickText(row(1, { transcription: '', interpretative_edition: '<p>Іван</p>' }))).toMatchObject({ field: 'interpretative_edition', text: 'Іван' })
    expect(pickText(row(1, { transcription: '' }))).toBeUndefined()
  })
  it('Glagolitic: Cyrillic transliteration first, then Latin, else the Glagolitic letters flagged', () => {
    const g = { writing_system: { text: 'Glagolitic' }, transcription: '<p>ⰰⰱⰲ</p>' }
    expect(pickText(row(1, { ...g, interpretative_edition: '<p>авъ</p>', romanisation: 'avu' }))).toMatchObject({ field: 'interpretative_edition', script: 'Cyrillic' })
    expect(pickText(row(1, { ...g, romanisation: 'avu' }))).toMatchObject({ field: 'romanisation', script: 'Latin' })
    expect(pickText(row(1, g))).toMatchObject({ field: 'transcription', script: 'Glagolitic', note: expect.stringContaining('без транслітерації') })
  })
})

describe('ingestRows gates and witness shape', () => {
  const r = ingestRows([...FIX, row(3469)])   // duplicate id is ignored
  const by = Object.fromEntries(r.witnesses.map(w => [w.id, w]))
  it('keeps Church Slavonic and Ukrainian (Glagolitic by script); lists every exclusion by reason', () => {
    expect(r.witnesses.map(w => w.id)).toEqual(['sophia-4', 'sophia-9', 'sophia-347', 'sophia-448', 'sophia-582', 'sophia-583', 'sophia-900', 'sophia-3469'])
    expect(r.excluded).toEqual({ 'language:Ancient Greek': 1, 'language:Polish': 1, 'language:Russian': 1, undated: 1, 'bad-date': 1, 'no-text': 2 })
    expect(r.excludedIds['undated']).toEqual([5])
    expect(by['sophia-4']!.lang).toBe('undetermined'); expect(by['sophia-9']!.lang).toBe('undetermined'); expect(by['sophia-9']!.edition).toContain('interpretative_edition')
  })
  it('witness fields: id for the media panel, dates, language by date, region, author, IIIF media, URL', () => {
    const w = by['sophia-3469']!
    expect(sophiaIdOf(w.id)).toBe(3469)
    expect(w).toMatchObject({ unit: 'sophia', author: 'sophia_graffiti', date: [1125, 1315], lang: 'chu-rus', region: 'Київ', oldI: true, witnessType: 'autograph', license: 'не вказано порталом' })
    expect(w.url).toBe('https://saintsophia.dh.gu.se/viewer/?q=114-15/3469')
    expect(w.media).toMatchObject({ kind: 'iiif', url: IIIF, attribution: 'Saint Sophia, University of Gothenburg' })
    expect(w.tokens).toEqual([{ raw: 'иѧковъѱлъ', loc: '114-15/3469', s: 0 }, { raw: 'чрньць', loc: '114-15/3469', s: 1 }])
    expect(w.dateCite).toMatchObject({ source: 'SOPHIA', kind: 'D', quote: 'min_year 1125, max_year 1315' }); expect(w.dateCite.note).toMatch(/Paleography/)
    expect(w.edition).toMatch(/Saint Sophia, University of Gothenburg; поле «transcription»/)
    expect(by['sophia-448']!.lang).toBe('ruthenian'); expect(by['sophia-448']!.oldI).toBeUndefined()
    expect(by['sophia-900']!.lang).toBe('uk')
  })
  it('every witness carries the licenceNote verbatim', () => {
    for (const w of r.witnesses) expect(w.licenceNote).toBe(LICENCE_NOTE)
    expect(LICENCE_NOTE).toBe('Transcription licence not stated by the portal; included for non-commercial research with attribution by the project owner\'s decision (2026-10-12)')
  })
  it('Glagolitic: transliterated text when the portal gives one, flagged Glagolitic tokens when it does not', () => {
    expect(by['sophia-582']!.tokens.map(t => t.raw)).toEqual(['Фєодоулъ']); expect(by['sophia-582']!.edition).toMatch(/кирилична транслітерація/)
    expect(by['sophia-583']!.tokens.map(t => t.raw)).toEqual(['ⰰⰱⰲ', 'ⰳⰴⰵ']); expect(by['sophia-583']!.edition).toMatch(/глаголиця без транслітерації/)
  })
  it('all witnesses are admitted by the build gate (author provisional + evidence)', () => {
    const a = authorById['sophia_graffiti']!
    expect(a).toMatchObject({ label: 'institutional', status: 'provisional' }); expect(admissible(a)).toBe(true)
    for (const w of r.witnesses) expect(admit(w, a)).toEqual({ ok: true })
  })
})

describe('analysis text = interpretative edition; private-use glyphs (BL-10 follow-up)', () => {
  const PUA = ''
  it('prefers the word-spaced edition and keeps the diplomatic text for display (inscription 120-19c/347)', () => {
    const w = ingestRows([FIX[1]!]).witnesses[0]!
    expect(w.id).toBe('sophia-347')
    expect(w.tokens.map(t => t.raw)).toEqual(['Господи', 'пꙍмози', 'рабꙋ', 'свꙍѥмꙋ', 'Къснѧтинꙋ'])
    expect(w.tokens.some(t => t.method)).toBe(false)
    expect(w.edition).toContain('поле «interpretative_edition»')
    expect(w.diplomatic).toBe('г͠ ' + PUA + 'пꙍмоꙁ' + PUA + 'рабꙋсвꙍѥмꙋ | късн-т-н-')
    expect(w.dropped).toEqual({ unmapped: 0, apparatus: 0 })
  })
  it('usableEdition: editor note → first line after the colon; modern-Ukrainian rendering and non-Cyrillic → not an edition', () => {
    expect(usableEdition('З розбивкою на слова текст виглядає таким чином:\n\n\nПомѧни Г(оспод)и Гавьрила.\n\nПом’яни, Господи, Гаврила.\n\nДатування', 1200)).toBe('Помѧни Г(оспод)и Гавьрила.')
    expect(usableEdition('З розбивкою на слова та відновленням', 1200)).toBe('')
    expect(usableEdition('Пом’яни, Господи, раба свого Петра', 1690)).toBe('')
    expect(usableEdition('Пом’яни, Господи', 1850)).toBe('Пом’яни, Господи')
    expect(usableEdition('Ioan', 1200)).toBe('')
    expect(pickText(row(1, { transcription: '<p>помни</p>', interpretative_edition: '<p>Пом’яни</p>', max_year: 1690 }))).toMatchObject({ field: 'transcription' })
  })
  it('a token holding a private-use glyph is dropped and counted, never guessed', () => {
    const t = tokenize(`гос${PUA}поди рабу ${PUA} мозі`, 'x')
    expect(t.tokens.map(x => x.raw)).toEqual(['рабу', 'мозі'])
    expect(t.unmapped).toBe(1); expect(t.pua).toBe(1)
    expect(tokenize('�аб', 'x').pua).toBe(1)
  })
  it('the 20 code points of the cached portal data are all private-use (documented in the header, not mapped)', () => {
    for (let c = 0xe000; c <= 0xe04c; c++) expect(UNMAPPED_GLYPH.test(String.fromCodePoint(c))).toBe(true)
  })
})

describe('sophia_graffiti author evidence', () => {
  const dir = 'data/raw/sophia'
  const raw = existsSync(dir) ? readdirSync(dir).filter(n => /^\d{3}\.json$/.test(n)).map(n => readFileSync(`${dir}/${n}`, 'utf8')).join('\n') : undefined
  const a = authorById['sophia_graffiti']!
  it('has two Q quotes on the cathedral and a P paraphrase', () => {
    expect(a.evidence.filter(e => e.kind === 'Q').length).toBe(2); expect(a.evidence.some(e => e.kind === 'P')).toBe(true)
  })
  // the API JSON-escapes nothing in these two strings except the HTML entity, which is literally `&ldquo;` in the field value
  it.skipIf(!raw)('the Q quotes occur verbatim in the cached API pages', () => {
    for (const e of a.evidence.filter(x => x.kind === 'Q')) expect(raw!.includes(e.quote), e.quote).toBe(true)
  })
  it.skipIf(!raw)('real cache: ingestion yields witnesses, and none is Greek/Latin/Polish/Armenian', () => {
    const rows = readdirSync(dir).filter(n => /^\d{3}\.json$/.test(n)).flatMap(n => JSON.parse(readFileSync(`${dir}/${n}`, 'utf8')).results as any[])
    const r = ingestRows(rows)
    expect(r.witnesses.length).toBeGreaterThan(1000)
    const langOf = new Map(rows.map(x => [`sophia-${x.id}`, x.language?.text]))
    for (const w of r.witnesses) expect(['Church Slavonic', 'Ukrainian', undefined]).toContain(langOf.get(w.id))
    for (const w of r.witnesses) expect(w.tokens.length, w.id).toBeGreaterThan(0)
  })
})
