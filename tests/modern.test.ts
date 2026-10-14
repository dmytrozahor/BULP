/** SPEC 63 MD-1…MD-3 — modern colloquial and IT vocabulary. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SOURCES } from '../core/sources.ts'
import { CAND_MIN_F, MODERN_UK, buildModern, firstOf, modernBadges, modernReport, type ModernFile, type RawCounts, type WiktRow } from '../core/modern.ts'
import { firstGloss, WIKT_CATS } from '../pipelines/ingest-modern-wikt.ts'
import { renderReport } from '../pipelines/ingest-modern.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const has = (p: string) => existsSync(new URL('../' + p, import.meta.url))
const real = has('public/data/modern.json') ? JSON.parse(rd('public/data/modern.json')) as ModernFile : undefined

const COUNTS: RawCounts = {
  сторітелінг: { HPLT: [4, '2022-03', '2023-01'], UBER: [3, null, null] },
  донатити: { HPLT: [1, '2022-02', '2022-02'], UBER: [1, null, null] },
  однеджерело: { HPLT: [9, '2022-05', '2022-06'] },
  рідкісне: { HPLT: [1, '2022-05', '2022-05'], UBER: [1, null, null] },
  вжезнане: { HPLT: [5, '2022-02', '2022-02'], UBER: [5, null, null] },
}
const WIKT: WiktRow[] = [
  { w: 'донат', kind: 'slang', cat: 'Жаргонізми/uk', gloss: 'добровільний внесок', created: '2019-05-04T10:00:00Z', url: 'https://uk.wiktionary.org/wiki/донат' },
  { w: 'фреймворк', kind: 'it', cat: "Комп'ютерні терміни/uk", gloss: 'програмний каркас', created: '2016-01-02T00:00:00Z', url: 'https://uk.wiktionary.org/wiki/фреймворк' },
  { w: 'ґуґлити', kind: 'neologism', cat: 'Неологізми/uk', created: '2012-07-09T00:00:00Z', url: 'https://uk.wiktionary.org/wiki/ґуґлити' },
]
const build = () => buildModern({ counts: COUNTS, wikt: WIKT, shard: 'ukr_Cyrl_1/train-00000-of-00300.parquet', vesum: w => w === 'вжезнане' })
const file = (): ModernFile => {
  const entries = build()
  return { format: 1, generated: 'x', sources: [
    { id: 'HPLT', title: 't', url: 'u', licence: 'CC0-1.0', retrieved: 'x', stored: 'лише лічильник', sample: 's' },
    { id: 'UBER', title: 't', url: 'u', licence: 'не вказана', retrieved: 'x', stored: 'лише лічильник', sample: 's' },
    { id: 'WIKT', title: 't', url: 'u', licence: 'CC BY-SA 4.0', retrieved: 'x', stored: 'заголовок', sample: 's' }],
  entries, report: modernReport(entries, { HPLT: 10, UBER: 10, WIKT: 3 }) }
}

describe('MD-1 research of modern sources', () => {
  const r = rd('research/38-modern-sources.md')
  it('covers every candidate source named in the spec with a decision, and separates allowed from owner-decision', () => {
    for (const s of ['HPLT', 'UberText', 'uk.wiktionary', 'DOU.ua', 'Reddit', 'Telegram', 'YouTube', 'Мислово', 'CulturaX', 'GRAC', 'Brown-UK']) expect(r, s).toContain(s)
    expect(r).toMatch(/### \(a\) May be used/)
    expect(r).toMatch(/### \(b\) Needs the owner's decision \(NOT scraped\)/)
  })
  it('quotes the access terms (robots / ToS / licence) and says how each item is dated', () => {
    expect(r).toContain('Disallow: /')
    expect(r).toMatch(/автоматичного збирання розміщеної на сайті інформації без згоди Адміністрації/)
    expect(r).toMatch(/cc0-1\.0/)
    expect(r).toMatch(/crawl date/)
    expect(r).toMatch(/entry date/)
  })
  it('nothing from section (b) is fetched by the pipelines', () => {
    for (const f of ['pipelines/ingest-modern-wikt.ts', 'pipelines/ingest-modern.ts', 'pipelines/modern_count.py']) expect(rd(f), f).not.toMatch(/dou\.ua|reddit\.com|\/\/t\.me|youtube\.com|myslovo/i)
  })
})

describe('MD-2 ingest and neologism candidates', () => {
  it('a candidate needs f ≥ 3, ≥ 2 sources and absence from VESUM', () => {
    const e = build(), cand = e.filter(x => x.candidate).map(x => x.w)
    expect(CAND_MIN_F).toBe(3)
    expect(cand).toEqual(['сторітелінг'])
    for (const w of ['донатити', 'однеджерело', 'рідкісне', 'вжезнане']) expect(cand).not.toContain(w)
  })
  it('witnesses are typed (web / social / slang-dictionary) and dated: HPLT crawl month, Wiktionary entry month, UberText unknown', () => {
    const c = build().find(x => x.w === 'сторітелінг')!
    expect(c.wit.map(w => w.witnessType).sort()).toEqual(['social', 'web'])
    expect(c.wit.find(w => w.src === 'HPLT')).toMatchObject({ first: '2022-03', last: '2023-01', dateKind: 'crawl' })
    expect(c.wit.find(w => w.src === 'UBER')!.first).toBeUndefined()
    expect(c.first).toBe('2022-03'); expect(c.firstKind).toBe('crawl')
    const d = build().find(x => x.w === 'донат')!
    expect(d.wit[0]).toMatchObject({ src: 'WIKT', witnessType: 'slang-dictionary', first: '2019-05', dateKind: 'entry', cat: 'Жаргонізми/uk' })
    expect(firstOf([{ src: 'HPLT', witnessType: 'web', f: 1, first: '2022-03', dateKind: 'crawl', loc: 'a' }, { src: 'WIKT', witnessType: 'slang-dictionary', f: 1, first: '2019-05', dateKind: 'entry', loc: 'b' }])).toEqual({ first: '2019-05', kind: 'entry' })
  })
  it('LA types the candidate: сторітелінг fires the cited -інг rule; no hand list', () => {
    const c = build().find(x => x.w === 'сторітелінг')!
    expect(c.loan?.ids).toContain('LA-ing')
    expect(build().find(x => x.w === 'ґуґлити')!.loan).toBeUndefined()
  })
  it('vocabulary only: an entry holds counters, dates and locators, never running text or URLs of pages', () => {
    for (const e of build()) for (const w of e.wit) expect(Object.keys(w).sort().every(k => ['src', 'witnessType', 'f', 'first', 'last', 'dateKind', 'loc', 'cat', 'gloss'].includes(k)), e.w).toBe(true)
    if (real) for (const e of real.entries) for (const w of e.wit) { expect(w.gloss ?? '').toSatisfy((g: string) => g.length <= 160); if (w.src !== 'WIKT') expect(w.loc).not.toMatch(/^https?:\/\/(?!huggingface)/) }
  })
  it('uk.wiktionary categories and the gloss extractor: first «#» line, markup stripped, ≤ 160 chars', () => {
    expect(WIKT_CATS.map(c => c.cat)).toContain('Неологізми/uk')
    expect(firstGloss('=== Значення ===\n# [[добровільний|добровільний]] {{розм.}} внесок\n#: приклад\n# інше')).toBe('добровільний внесок')
    expect(firstGloss('# ' + 'а'.repeat(300))!.length).toBe(160)
  })
  it.skipIf(!real)('real data: candidates satisfy the thresholds, dates are YYYY-MM, sources are registered', () => {
    const r = real!
    expect(r.entries.length).toBeGreaterThan(100)
    for (const e of r.entries.filter(x => x.candidate)) { expect(e.f).toBeGreaterThanOrEqual(3); expect(new Set(e.wit.map(w => w.src)).size).toBeGreaterThanOrEqual(2) }
    for (const e of r.entries) for (const w of e.wit) { if (w.first) expect(w.first).toMatch(/^\d{4}-\d{2}$/); expect(['HPLT', 'UBER', 'WIKT']).toContain(w.src) }
    for (const s of ['HPLT', 'UBER', 'WIKT']) expect(SOURCES[s], s).toBeTruthy()
    expect(r.entries.some(e => e.wit.some(w => w.src === 'WIKT'))).toBe(true)
  })
})

describe('MD-3 badges and report', () => {
  const f = file()
  it('«сучасний сленг», «ІТ-жаргон» and «неологізм (з року)» with the first-attestation date and a claim with evidence', () => {
    const slang = modernBadges('донат', f)[0]!
    expect(slang.text).toBe(MODERN_UK.slang); expect(slang.first).toBe('2019-05')
    expect(slang.claim.evidence[0]).toMatchObject({ source: 'WIKT', locator: 'https://uk.wiktionary.org/wiki/донат', kind: 'Q' })
    expect(slang.claim.evidence[0]!.quote).toContain('Категорія:Жаргонізми/uk')
    expect(modernBadges('фреймворк', f)[0]!.text).toBe(MODERN_UK.it)
    const neo = modernBadges('сторітелінг', f)[0]!
    expect(neo.text).toBe('неологізм (кандидат) (з 2022)')
    expect(neo.claim.evidence.map(e => e.source).sort()).toEqual(['HPLT', 'UBER'])
    expect(neo.claim.evidence[0]!.note).toMatch(/зберігається лише словник/)
    expect(modernBadges('ґуґлити', f)[0]!.text).toBe('неологізм (з 2012)')
  })
  it('an unlisted word has no badge; a corpus-only unknown date is stated, not invented', () => {
    expect(modernBadges('вода', f)).toEqual([])
    const uber = modernBadges('сторітелінг', f)[0]!.claim.evidence.find(e => e.source === 'UBER')!
    expect(uber.quote).toContain('дата не відома')
  })
  it('the date kind is spelled out: crawl is not publication, entry is not first use', () => {
    const q = modernBadges('сторітелінг', f)[0]!.claim.evidence.find(e => e.source === 'HPLT')!.quote
    expect(q).toContain('не дата публікації')
    expect(modernBadges('донат', f)[0]!.claim.evidence[0]!.note).toContain('не дата першого вжитку')
  })
  it('the report counts distinct words per source and per first-attestation year', () => {
    const rep = f.report
    expect(rep.perSource).toMatchObject({ HPLT: 1, UBER: 1, WIKT: 3 })
    expect(rep.perYear['2022']).toMatchObject({ HPLT: 1 }); expect(rep.perYear['невідомо']).toMatchObject({ UBER: 1 })
    expect(rep.perYear['2019']).toMatchObject({ WIKT: 1 })
    expect(renderReport(f)).toMatch(/\| 2022 \| 1 \| 0 \| 0 \|/)
    if (real) expect(rd('analysis/modern-vocabulary.md')).toContain('Top 20 candidates')
  })
  it('the badges are wired into the word and form pages', () => {
    expect(rd('src/views/WordView.vue')).toContain('<ModernBadges')
    expect(rd('src/views/FormView.vue')).toContain('<ModernBadges')
    expect(rd('src/components/ModernBadges.vue')).toContain('modernOf')
  })
})
