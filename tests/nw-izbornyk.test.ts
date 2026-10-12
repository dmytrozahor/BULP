/**
 * SPEC 60 NW (W5) — izbornyk page witnesses (kind `izbornyk-page`): decoder unit tests + "no fabricated quotes":
 * every Q quote in a unit's dateCite and in its author's evidence must occur verbatim in a cached page of that unit (skipped without data/raw).
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { MANIFEST } from '../pipelines/manifest.ts'
import { authorById } from '../pipelines/authors.ts'
import { klyHtml, klyText, pageParagraphs } from '../pipelines/ingest-izbornyk-pages.ts'
import { decodeIzbornyk } from '../core/text.ts'

/** Same normalisation for page text and quote: tags out, entities decoded, Ђ→ѣ, stress/grave marks out, one space. */
export const flat = (s: string) => decodeIzbornyk(s.replace(/<\/?(?:p|br|h\d|div|li|tr|td|table)\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
  .normalize('NFC').replace(/[̀́]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()   // lower case: decodeIzbornyk reads «ЗЂ» as «ЗѢ»

const pages = (kind: string, id: string) => {
  const d = `data/raw/${kind}/${id}`
  return existsSync(d) ? readdirSync(d).filter(n => /^\d{3}\./.test(n)).sort().map(n => flat(new TextDecoder('windows-1251').decode(readFileSync(`${d}/${n}`)))) : []
}

describe('NW-4 Климентій decoder (kly08 font)', () => {
  it('small A = ѧ, ε = є (before NFC), Latin stand-ins, supralinear letters, titlo', () => {
    expect(klyHtml('присло&#769;ві<small>A</small>')).toBe('присло&#769;віѧ')
    expect(klyText('м(с)цъ нεпо́вныx нѣgды zапоможε бг̃ъ')).toBe('мсцъ нєпо́вныx'.replace('x', 'х') + ' нѣгды запоможє бг҃ъ')
    expect(klyText('έ')).toBe('є́')
  })
  it('folio marks /200/ become the page marker; nav and Prym paragraphs are not text', () => {
    const html = `<div class="dop3"><p class=K1><a href="kly07.htm">Попередня</a></p><p class=K1>Абы голова&#768;. <small id="lyst200">/200/</small></p><p class=K1>Бг&#771;ъ давъ.</p><p class=Prym>Приповістку закреслено.</p>`
    const { paras } = pageParagraphs(html, { fix: 'kly' })
    expect(paras).toHaveLength(2)
    expect(paras[0]).toContain('P200'.slice(1)) // marker payload 200
  })
})

describe('NW page cuts', () => {
  it('end marker cuts a second work; sections keep only named K1first works', () => {
    const html = `<div class="dop3"><p class=K1>Первое слово.</p><h2>СЛОВО ЄДНОГО СТАРОГО БОЯРА</h2><p class=K1>Второе слово.</p>`
    expect(pageParagraphs(html, { end: /<h2[^>]*>[^<]*СЛОВО\s+ЄДНОГО/ }).paras).toEqual(['Первое слово.'])
    const poems = `<div class="dop3"><p class=K1first>ЕПІНІКІОН</p><p class=V1>Уже брань</p><p class=K1first>ПОХВАЛА ДНІПРОВІ</p><p class=V1>Дніпре</p><p class=K1first>ЗА МОГИЛОЮ РЯБОЮ</p><p class=V2>Ой</p><p class=Ima>Розум</p>`
    expect(pageParagraphs(poems, { sections: [/^ЕПІНІКІОН/, /^ЗА МОГИЛОЮ/] }).paras).toEqual(['Уже брань', 'Ой'])
  })
})

describe('NW izbornyk-page units: dating and vetting quotes are verbatim in the cached pages', () => {
  const units = MANIFEST.filter(u => u.kind === 'izbornyk-page')
  it('at least the Приповісти unit is defined', () => expect(units.some(u => u.id === 'pripovisti')).toBe(true))
  for (const u of units) {
    const ps = pages('izbornyk-page', u.id)
    const quotes = [
      ['dateCite', u.dateCite] as const,
      ...(authorById[u.author]?.evidence ?? []).map((e, i) => [`author ${u.author}[${i}]`, e] as const),
    ].filter(([, e]) => e.kind === 'Q')
    for (const [what, e] of quotes) {
      it.skipIf(!ps.length)(`${u.id}: ${what} quote occurs in the page text`, () => {
        const q = flat(e.quote.replace(/^…|…$/g, ''))
        expect(ps.some(p => p.includes(q)), q.slice(0, 80)).toBe(true)
      })
    }
  }
})
