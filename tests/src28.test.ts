/** SPEC 63 SRC-28: owner-supplied sources — the 1690s notated songbook song, Калліст 1616, the Лексис/Лексікон parse, Зизаній's grammar features. */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { SONGS } from '../core/songs.ts'
import { MANIFEST } from '../pipelines/manifest.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { ruOfWitness } from '../core/ru-source.ts'
import ingester, { cleanTranscription, parseTsv, tsvTokens } from '../pipelines/ingest-owner-text.ts'
import { HIST_LEX_SPECS, MIN_WORD, NIMCHUK_LEXIS, parseNimchukLexis, nimchukText, glossItems, glossRows, headRows, pageCandidates, parsePages } from '../core/hist-lex.ts'
import { DICT_COVER, atOf } from '../core/se.ts'
import { HIST_BY_ID, HIST_SRC } from '../core/dx-src.ts'
import { seHeads } from '../pipelines/dx-hist-load.ts'
import { ZYZANII_BIO, ZYZANII_FEATURES, ZYZANII_HYPOTHESES } from '../core/zyzanii.ts'
import { readFileSync } from 'node:fs'

describe('SRC-28 part 1: «Ой, хто, хто Николая любить» (нотний пісенник 1690-х)', () => {
  const u = MANIFEST.find(x => x.id === 'song_mykolay_1690s')!, s = SONGS.find(x => x.id === 'mykolay-1690s')!, a = authorById['folk_lviv_songbook']!
  it('SRC-28 wiring: 1690-ті from the owner note (P), region Львів/Галичина, manuscript type, shelfmark «?» (never invented), photos credited to the owner', () => {
    expect(u.date).toEqual([1690, 1699]); expect(u.dateCite.kind).toBe('P'); expect(u.dateCite.source).toBe('OWNER'); expect(u.region).toBe('Львів (Галичина)')
    expect(u.edition).toContain('рукопис (нотний пісенник)'); expect(u.edition).toContain('шифр: ?'); expect(u.edition).toContain('фото власника')
    expect(s.manuscript!.shelfmark).toBe('?'); expect(s.manuscript!.type).toBe('рукопис (нотний пісенник)'); expect(s.manuscript!.photo).toContain('власника'); expect(s.manuscript!.notation).toContain('ноти')
    expect(s.witness).toBe(u.id); expect(s.licence).toBe('pd-text'); expect(s.earliest!.date).toBe('1690-ті'); expect(s.region).toContain('Галичина')
    expect(admissible(a)).toBe(true); expect(admit({ id: u.id, author: u.author }, a).ok).toBe(true); expect(ruOfWitness({ id: u.id, title: u.title, edition: u.edition })).toBeUndefined()
  })
  it('SRC-28 the committed diplomatic transcription: [?] / [...] marks are cut, the readable words become tokens with the page locator', () => {
    expect(cleanTranscription('и надаши ся помагае [?], [...]ти (?)')).toBe('и надаши ся помагае  ,  ти  ')
    const rows = parseTsv(readFileSync(new URL('../pipelines/src-owner-song_mykolay_1690s.tsv', import.meta.url), 'utf8'))
    expect(rows.length).toBe(17)
    const t = tsvTokens(rows), raw = t.tokens.map(x => x.raw.toLowerCase())
    expect(raw.slice(0, 5)).toEqual(['ой', 'хто', 'хто', 'николая', 'любить']); expect(raw).toContain('пастирь'); expect(raw).toContain('николае')
    expect(t.tokens.some(x => x.loc.startsWith('с. «9»'))).toBe(true); expect(t.tokens.some(x => x.loc.startsWith('нотована'))).toBe(true)
    expect(t.tokens.length).toBeGreaterThan(60)
  })
  it('SRC-28 the ingester yields the witness', () => {
    const w = ingester.parse(u) as ReturnType<typeof Array.prototype.concat>
    expect(w).toHaveLength(1); expect(w[0].id).toBe('song_mykolay_1690s'); expect(w[0].date).toEqual([1690, 1699]); expect(w[0].tokens.length).toBeGreaterThan(60)
  })
})

describe('SRC-28 part 2: Калліст «Євангеліє учительноє» 1616, ч. 1', () => {
  const u = MANIFEST.find(x => x.id === 'kallist1616')!, a = authorById['vilno_brotherhood_press']!
  it('SRC-28 wiring: dated 1616 by research/44 r22, region outside Ukraine (Вільно), school Віленська, witness type OCR (OQ gate applies), not ru', () => {
    expect(u.date).toEqual([1616, 1616]); expect(u.dateCite.quote).toContain('Віленського братства'); expect(u.dateCite.locator).toContain('#r22')
    expect(u.region).toBe('поза Україною (Вільно)'); expect(u.school).toMatchObject({ id: 'vilno', source: 'research/44 r22' }); expect(u.witnessType).toBe('ocr'); expect(u.lang).toBe('ruthenian')
    expect(u.edition).toContain('ч. 2 потрібна'); expect(u.edition).toContain('Tesseract')
    expect(admissible(a)).toBe(true); expect(admit({ id: u.id, author: u.author }, a).ok).toBe(true); expect(ruOfWitness({ id: u.id, title: u.title, edition: u.edition })).toBeUndefined()
  })
  it('SRC-28 the ingester reads page_NNNN.txt files of the OCR directory (OWNER_OCR_DIR), and skips the unit when there are none', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'src28-')), dir = resolve(root, 'kallist1616'); mkdirSync(dir)
    writeFileSync(resolve(dir, 'page_0001.txt'), 'Богъ вседержитель мѣлъ людей въ землѣ\nи сказалъ имъ слово великое отъ небесъ\n')
    writeFileSync(resolve(dir, 'page_0002.txt'), 'sdf 123 ###\n')
    const old = process.env.OWNER_OCR_DIR; process.env.OWNER_OCR_DIR = root
    try {
      const w = ingester.parse(u) as { tokens: { raw: string; loc: string }[]; school?: unknown }[]
      expect(w).toHaveLength(1); expect(w[0]!.tokens.map(t => t.raw)).toContain('вседержитель'); expect(w[0]!.tokens[0]!.loc).toContain('скан 1'); expect(w[0]!.school).toMatchObject({ id: 'vilno' })
      process.env.OWNER_OCR_DIR = resolve(root, 'nothing-here'); expect(ingester.parse(u)).toEqual([])
    } finally { if (old === undefined) delete process.env.OWNER_OCR_DIR; else process.env.OWNER_OCR_DIR = old }
  })
})

describe('SRC-28 part 3: Лексис (1596) and Лексікон Беринди (1627): CS headword → «проста мова» gloss', () => {
  const spec = HIST_LEX_SPECS.berynda1627!
  const page = 'Агнецъ: баранъ, ягня\nАггелъ: посланникъ,\nпосланець\nХ#ё3: фф\nБлагодать: ласка; милость\n'
  it('SRC-28 article parser: Headword: gloss items; continuation lines join; the gate rejects noise and short debris', () => {
    expect(pageCandidates(page).map(c => c.head)).toEqual(['Агнецъ', 'Аггелъ', 'Х#ё3', 'Благодать'])
    expect(pageCandidates(page)[1]!.gloss).toBe('посланникъ, посланець'); expect(glossItems('баранъ, ягня; або  овца')).toEqual(['баранъ', 'ягня', 'або  овца'.replace('  ', ' ')])
    const r = parsePages([{ page: 7, text: page }], spec, w => ['баранъ', 'посланникъ', 'посланець', 'ласка', 'милость', 'ягня'].includes(w))
    expect(r.articles.map(a => a.head)).toEqual(['агнецъ', 'аггелъ', 'благодать']); expect(r.stats.candidates).toBe(4); expect(r.stats.skippedHead).toBe(1); expect(MIN_WORD).toBe(4)
    expect(r.articles[1]!.glosses).toEqual(['посланникъ', 'посланець']); expect(r.articles[0]!.glosses).toEqual(['баранъ', 'ягня'])
  })
  it('SRC-28 rows: (a) the gloss word sense dated by the print year, (b) the CS headword with its equivalents; dictionary registered with its coverage', () => {
    const { articles } = parsePages([{ page: 7, text: page }], spec, w => w.length >= 4)
    const g = glossRows(articles, spec), h = headRows(articles, spec)
    expect(g[0]).toEqual(['баранъ', expect.objectContaining({ d: 'berynda', e: [1627, 1627], g: 'ц.-сл. «агнецъ» = ягня' })]); expect(h[0]![1]).toMatchObject({ d: 'berynda', e: [1627, 1627] }); expect(h[0]![1].g).toContain('баранъ')
    expect(atOf(g[0]![1])).toMatchObject({ a: 1627, b: 1627, basis: 'quote' })
    expect(DICT_COVER.find(d => d.id === 'zyzanii-lexis')!.edition).toEqual([1596, 1596]); expect(DICT_COVER.find(d => d.id === 'berynda')!.title).toContain('Беринда'); expect(DICT_COVER.find(d => d.id === 'berynda')!.note).toContain('не Зизанія')
    expect(HIST_BY_ID['zyzanii-lexis']!.bit).not.toBe(HIST_BY_ID['berynda']!.bit); expect(new Set(HIST_SRC.map(s => s.bit)).size).toBe(HIST_SRC.length)
    expect(HIST_LEX_SPECS.zyzanii1596!.year).toBe(1596)
  })
  it('SRC-28 dx-hist-load: only the headword files give dictionary headwords; the gloss-keyed rows (modern words) are skipped', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'src28se-'))
    writeFileSync(resolve(dir, 'berynda1627.json'), JSON.stringify({ dict: 'berynda', kind: 'heads', rows: [['агнецъ', {}]] }))
    writeFileSync(resolve(dir, 'berynda1627-gloss.json'), JSON.stringify({ dict: 'berynda', kind: 'hist-gloss', rows: [['баранъ', {}]] }))
    expect(seHeads('.', dir)).toEqual([{ word: 'агнецъ', src: 'berynda' }])
  })
  it('SRC-28 the proofread Лексис (Німчук 1964, litopys zyz99.htm): typed articles parse into head and gloss rows, ѣ / я / accents / titlo parentheses normalised', () => {
    const html = '<p class=K1><b>Адана(й)</b>, г&#771;ь,\nпа(н).</p><p class=K1><b>&aacute;вва</b>, т&aacute;то,\n&#969;т&eacute;цъ.</p><p class=K1><b>&aacute;гг&#771;лъ</b>,\nв<small>Ђ</small>&#769;стни(к) албо пов<small>Ђ</small>д&aacute;(ч).</p><p class=K1><b>&aacute;гнїца</b>,\nмолод&aacute;<small>А</small> ов&eacute;(ч)ка.</p><p class=K1><b>x1</b>, zz.</p>'
    expect(nimchukText('в<small>Ђ</small>&#769;стни(к)')).toBe('вѣстник'); expect(nimchukText('Адана(й)')).toBe('аданай')
    const r = parseNimchukLexis(html, HIST_LEX_SPECS.zyzanii1596!)
    expect(r.articles.map(a => [a.head, a.glosses])).toEqual([['аданай', ['гь', 'пан']], ['авва', ['тато', 'отецъ']], ['агглъ', ['вѣстник', 'повѣдач']], ['агнїца', ['молодая овечка']]])
    expect(r.stats.candidates).toBe(5); expect(r.stats.skippedHead).toBe(1)
    const g = glossRows(r.articles, HIST_LEX_SPECS.zyzanii1596!); expect(g.find(x => x[0] === 'вѣстник')![1]).toMatchObject({ d: 'zyzanii-lexis', e: [1596, 1596], g: 'ц.-сл. «агглъ» = повѣдач' })
    expect(NIMCHUK_LEXIS.source).toContain('Німчука'); expect(NIMCHUK_LEXIS.source).toContain('1964'); expect(NIMCHUK_LEXIS.url).toBe('http://litopys.org.ua/zyzlex/zyz99.htm')
  })
  it('SRC-28 the real OCR is noisy: the gate is strict (measured on 66 pages of the 1627 scan: 2 of 1486 candidate lines pass; documented in SPEC SRC-28)', () => { expect(existsSync('pipelines/parse-hist-lex.ts')).toBe(true) })
})

describe('SRC-28 part 4: Зизаній «Граматіка словенска» — cited features and hypotheses', () => {
  it('SRC-28 every feature has verbatim quotes with a locator, a dialect group and the print year; the Galician/Belarusian attribution is marked contested', () => {
    expect(ZYZANII_FEATURES.length).toBeGreaterThanOrEqual(6)
    for (const f of ZYZANII_FEATURES) { expect(f.cite.length, f.id).toBeGreaterThan(0); for (const c of f.cite) { expect(c.kind).toBe('Q'); expect(c.source).toBe('FRH80'); expect(c.quote.length).toBeGreaterThan(10); expect(c.locator).toContain('Einleitung') } expect(f.period).toEqual([1596, 1596]) }
    expect(ZYZANII_FEATURES.find(f => f.id === 'ZZ-ATTRIB-CONTESTED')!.group).toBe('CONTESTED'); expect(ZYZANII_FEATURES.find(f => f.id === 'ZZ-MO-1PL')!.group).toBe('NORTH')
    expect(new Set(ZYZANII_FEATURES.map(f => f.id)).size).toBe(ZYZANII_FEATURES.length)
  })
  it('SRC-28 biography cited from research/44 (Львів → Берестя → Вільно); uncited candidates are hypotheses with the reason', () => {
    expect(ZYZANII_BIO[0]!.quote).toContain('Львів (до 1592) → Берестя (1592–96) → Вільно (1596–97)'); expect(ZYZANII_BIO.every(e => e.kind === 'Q' && e.source === 'R44')).toBe(true)
    expect(ZYZANII_HYPOTHESES.length).toBeGreaterThanOrEqual(4); for (const h of ZYZANII_HYPOTHESES) { expect(h.why.length).toBeGreaterThan(10); expect(ZYZANII_FEATURES.some(f => f.id === h.id)).toBe(false) }
  })
})
