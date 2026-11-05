/** SPEC 63 CQ-3: witnesses whose text is after the PD cut (publication year > 1925) are counted but never published as running text; examples are short quotes. */
import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { witnessFrom } from '../pipelines/ingest-harvest.ts'
import { publicationYearAfterPd, resolveWitnessDate } from '../pipelines/date-gate.ts'
import { writeTexts } from '../pipelines/build-texts.ts'
import { RESTRICTED_QUOTE_MAX, clipKwic } from '../core/rights.ts'

const MODERN = Array.from({ length: 400 }, () => 'Але лише із заведенням машин робітник починає боротися проти самого засобу виробництва і його їжі та єдиної ґрунтової рєвізії').join('\n')
const KAP = { id: 'k', date: '1867', description: 'Karl Marx, Das Kapital , Band I, Buch I, Kharkiv, Proletar, 1933 [Ukrainian edition].' }
const mk = (licence: string, title: string, date: string) => ({ id: 'x', url: 'https://archive.org/details/x', licence, bytes: 1, status: 200, title, date })
const OPTS = { lang: 'uk' as const, witnessType: 'ocr', edition: 'e', authorId: 'a', loc: 'l', dateQuote: 'q', autoOldOrth: true }
const PDY = 'PD (publication year ≤ 1925, archive.org OCR, не вичитано)'

describe('CQ-3 a publication year after the PD cut is read only from a publication line', () => {
  it('publisher ending in a year, or «<place>, <publisher>, 1933 [… edition]»; life dates, ranges, digitisation notes and «based on the issue for 1927» do not count', () => {
    expect(publicationYearAfterPd(KAP)?.year).toBe(1933)
    expect(publicationYearAfterPd({ id: 'a', publisher: 'Kiĭv : "Mistet︠s︡tvo", [1967]' })?.year).toBe(1967)
    expect(publicationYearAfterPd({ id: 'b', publisher: 'Nakladomʺ gr. kat. Ep. Konsistorìi vʺ Peremyšli (1912-1939)' })).toBeNull()
    expect(publicationYearAfterPd({ id: 'c', description: 'Presented to the library by the Ukrainian Youth Organizations, in commemoration of Kruty, February 1958' })).toBeNull()
    expect(publicationYearAfterPd({ id: 'd', description: 'Annual. Description based on the issue for 1927.' })).toBeNull()
    expect(publicationYearAfterPd({ id: 'e', description: 'Барвінський Олександр Григорович (1847 — 1926) — укр' })).toBeNull()
  })
  it('the decision: Kapital -> 1933 and restricted; an issue titled «Rik 1934» dated 1889 by the index -> 1934 and restricted; a 1925 date is not; sets whose PD rests on the author death (pdLast Infinity) are never restricted', () => {
    const k = resolveWitnessDate({ id: 'hv_ia_kapitaltom1', title: 'Kapital Tom 1', date: [1867, 1867], meta: KAP, modern: () => true })
    expect(k.date).toEqual([1933, 1933]); expect(k.textRestricted?.why).toMatch(/1933/); expect(k.licenceNote).toMatch(/Текст не публікується/); expect(k.dateUncertain).toBeUndefined()
    const v = resolveWitnessDate({ id: 'hv_ia_v', title: 'Peremysʹkì Eparhìâlʹnì Vìdomostì. Rik 1934, č. 1', date: [1889, 1889], modern: () => false })
    expect(v.date).toEqual([1934, 1934]); expect(v.textRestricted).toBeDefined()
    expect(resolveWitnessDate({ id: 'p', title: 'Rik 1925, č. 1', date: [1925, 1925], modern: () => false }).textRestricted).toBeUndefined()
    expect(resolveWitnessDate({ id: 'h', title: 'Історія (1927)', date: [1927, 1927], pdLast: Infinity, modern: () => false }).textRestricted).toBeUndefined()
  })
  it('a composite volume that runs past 1925 («(1925-1930)») is restricted and flagged; one that ends by 1923 is only flagged', () => {
    const a = resolveWitnessDate({ id: 'e', title: 'Етнографічний вісник (1925-1930)', date: [1925, 1925], modern: () => false })
    expect(a.date).toEqual([1925, 1930]); expect(a.textRestricted?.why).toMatch(/1925–1930/); expect(a.dateUncertain).toBeDefined()
    const b = resolveWitnessDate({ id: 'r', title: 'Canadian Morning (1918-1923)', date: [1918, 1918], modern: () => false })
    expect(b.textRestricted).toBeUndefined(); expect(b.dateUncertain).toBeDefined()
  })
  it('witnessFrom: the witness is written with textRestricted and the licence note, tokens kept (counted); a set with a death-year PD licence is not restricted', () => {
    const w = witnessFrom('archive-ukr', mk(PDY, 'Kapital Tom 1', '1867'), 'hv_ia_kapitaltom1x', MODERN, { ...OPTS, meta: KAP })
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.textRestricted).toBeDefined(); expect(w.date).toEqual([1933, 1933]); expect(w.tokens.length).toBeGreaterThan(5000); expect(w.licenceNote).toMatch(/200 знаків/); expect(w.excludeReason).toBeUndefined() }
    const h = witnessFrom('archive-hrushevsky', mk('PD (М. Грушевський † 1934)', 'Історія (1927)', '1927'), 'hv_ia_h', MODERN, OPTS)
    expect('skip' in h).toBe(false); if (!('skip' in h)) expect(h.textRestricted).toBeUndefined()
  })
})

describe('CQ-3 build: counted, never shown as running text, short quotes', () => {
  it('writeTexts writes no shard for a restricted witness and one for every other', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cq3-'))
    const tok = [{ raw: 'слово', loc: '1', s: 0 }]
    writeTexts([{ id: 'open', tokens: tok }, { id: 'closed', tokens: tok, textRestricted: { why: 'x' } }], dir)
    expect(readdirSync(join(dir, 'texts'))).toEqual(['open.json']); expect(existsSync(join(dir, 'texts', 'closed.json'))).toBe(false)
  })
  it('a concordance line of a restricted witness is clipped to <= 200 characters, the node stays whole; short lines are untouched', () => {
    const left = Array.from({ length: 30 }, () => 'довге').join(' '), right = Array.from({ length: 30 }, () => 'слово').join(' ')
    const c = clipKwic(left, 'вузол', right)
    expect(c.left.length + 'вузол'.length + c.right.length + 2).toBeLessThanOrEqual(RESTRICTED_QUOTE_MAX); expect(c.left.length).toBeGreaterThan(0); expect(c.right.length).toBeGreaterThan(0)
    expect(clipKwic('а б', 'в', 'г д')).toEqual({ left: 'а б', right: 'г д' })
  })
  it('build.ts clips both concordance builders for restricted witnesses; the cards say the text is not published', () => {
    const b = readFileSync('pipelines/build.ts', 'utf8')
    expect(b.match(/w\.textRestricted \? clipKwic\(/g)?.length).toBe(2)
    expect(readFileSync('src/views/WitnessView.vue', 'utf8')).toContain('Текст не публікується: {{ w.textRestricted.why }}')
    expect(readFileSync('src/views/TextsView.vue', 'utf8')).toContain('Текст не публікується: {{ cur.textRestricted.why }}')
    expect(readFileSync('core/types.ts', 'utf8')).toMatch(/textRestricted\?: \{ why: string \}/)
  })
})

describe('CQ-3 harvester: the whole sidecar from the Scraping API listing', () => {
  it('archive.ts has --meta-scrape (publisher, imprint, notes, description in the listing, one request per 500 items)', () => {
    const a = readFileSync('harvest/archive.ts', 'utf8')
    expect(a).toContain("process.argv.includes('--meta-scrape')"); expect(a).toContain("'publisher', 'imprint', 'notes', 'description'"); expect(a).toMatch(/'--meta', '--meta-scrape'\]/)
  })
})
