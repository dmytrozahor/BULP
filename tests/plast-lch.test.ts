/** SPEC 63 SL-5 — «Лісові Чорти» (1983) as a cite-only Plast source with a separate kurin-slang category. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SOURCES } from '../core/sources.ts'
import { SOC_UK, plastLabel, plastOf, sociolectBadges, type SociolectFile } from '../core/sociolect.ts'
import { LCH_ID, LCH_TERMS, lchEntries, lchPages, lchQuote } from '../pipelines/plast-lch.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const real = JSON.parse(rd('public/data/sociolect.json')) as SociolectFile
const OCR = existsSync(new URL('../data/raw/plast/lch-ocr.txt', import.meta.url)) ? rd('data/raw/plast/lch-ocr.txt') : undefined
const PAGE = '\n=====PDF 1=====\nКурінним був студ. техн. Ярема Весоловський. Курінь вів працю.\nОкрема ра-\nдість. Ватра горіла. Нове речення.\n=====PDF 2=====\nСкорочення: ОПК--Окружна Пластова Команда, скм.--скавтмастер. з Ці інформації.'

describe('SL-5 LCH ingest', () => {
  it('quotes are verbatim sentences: no split after a short abbreviation, hyphens joined, ≤ 160 chars, span pinned by from/to', () => {
    const p = lchPages(PAGE)
    expect(lchQuote(p.get(1)!, 'Курінним')).toBe('Курінним був студ. техн. Ярема Весоловський.')
    expect(lchQuote(p.get(1)!, 'Ватра')).toBe('Ватра горіла.'); expect(p.get(1)).toContain('Окрема радість.')
    expect(lchQuote(p.get(2)!, 'ОПК', 'Скорочення:', 'скавтмастер.')).toBe('Скорочення: ОПК--Окружна Пластова Команда, скм.--скавтмастер.')
    expect(lchQuote(p.get(1)!, 'немає')).toBeNull()
  })
  it('every term is a cite-only entry of source LCH with a «с. N PDF» locator, in exactly two categories', () => {
    const e = real.plast.entries.filter(x => x.s === LCH_ID)
    expect(e.length).toBe(LCH_TERMS.length)
    for (const x of e) { expect(x.g.length).toBeLessThanOrEqual(160); expect(x.loc).toMatch(/^с\. \d+ PDF$/); expect(x.c === undefined || x.c === 'kurin').toBe(true) }
    expect(e.filter(x => x.c === 'kurin').map(x => x.w)).toEqual(expect.arrayContaining(['Лісова Премудрість', "Велике Плем'я", 'фаміліянт', 'ЛЧ']))
    expect(e.filter(x => !x.c).map(x => x.w)).toEqual(expect.arrayContaining(['ОПК', 'ВПК', 'обозний']))
    expect(e.find(x => x.w === 'ОПК')).toMatchObject({ k: 'abbr', g: expect.stringContaining('Окружна Пластова Команда') })
  })
  it('the committed quotes are substrings of the OCR pages (skipped without the local OCR dump)', () => {
    if (!OCR) return
    const fresh = lchEntries(OCR), pages = lchPages(OCR)
    expect(fresh).toEqual(real.plast.entries.filter(x => x.s === LCH_ID))
    for (const x of fresh) { const t = TERM(x.w); expect(pages.get(t.pdf)!).toContain(x.g.replace(/^…|…$/g, '')) }
  })
  it('kurin slang gets its own badge and never «пластова лексика»; Plast-wide terms get the Plast badge; labels differ', () => {
    const f: SociolectFile = { ...real, plast: { ...real.plast, entries: real.plast.entries.filter(x => x.s === LCH_ID) } }
    const k = sociolectBadges('фаміліянт', f), g = sociolectBadges('обозний', f)
    expect(k.map(b => b.text)).toEqual([SOC_UK.kurin]); expect(SOC_UK.kurin).toBe('жаргон куреня Лісові Чорти')
    expect(g.map(b => b.text)).toEqual([SOC_UK.plast])
    expect(k[0]!.claim.evidence[0]).toMatchObject({ source: LCH_ID, kind: 'D' })
    expect(plastLabel(plastOf('ЛЧ', f)[0]!)).toBe(SOC_UK.kurin); expect(plastLabel(plastOf('ОПК', f)[0]!)).toBe(SOC_UK.abbreviation); expect(plastLabel(plastOf('обозний', f)[0]!)).toBe(SOC_UK.plast)
    expect(sociolectBadges('ВПК', f).map(b => b.text)).toEqual([SOC_UK.plast, SOC_UK.abbreviation])
  })
  it('the source is registered; /plast, the cards and the source card use the category label and the entry source', () => {
    expect(SOURCES[LCH_ID]!.title).toContain('Лісові Чорти'); expect(SOURCES[LCH_ID]!.license).toMatch(/cite-only/)
    expect(rd('src/views/PlastView.vue')).toContain('plastLabel(e)'); expect(rd('src/components/PlastSenses.vue')).toContain('plastLabel(e)')
    expect(rd('src/views/SourceView.vue')).toContain('e.s ?? sf.plast.source')
    expect(rd('specs/63-corpus-dialects.md')).toContain('**SL-5**')
  })
})
const TERM = (w: string) => LCH_TERMS.find(t => t.w === w)!
