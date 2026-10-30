/** SPEC 63 LB-17: more of the dictionaries' own labels reach the lemmas — list-backed stems of Грінченко's counties and governorates, the head of an article with a Cyrillic homonym number, three en.wiktionary region categories. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { HRINCH_LABELS, KAIKKI_REGION, KAIKKI_CATEGORY_TAG, AREAS, countyByStem, extraRow, listStemRow, resolveRow, scanArticle, wireHit } from '../core/dict-labels.ts'
import { KAIKKI_KEEP } from '../core/autolabel.ts'
import { parseCell } from '../pipelines/r2u.ts'

const scan = (t: string) => scanArticle(HRINCH_LABELS, t)

describe('LB-17 Грінченко, stems of the list', () => {
  it('LB-17 a stem cut longer than the list prints is read as the listed county (the list entry is the evidence)', () => {
    const k = scan('Біг-ме, я не брав твоєї сокири. Каменец. у. / 7) Біг дав.')
    expect(k).toHaveLength(1); expect(k[0]!.variant).toBe(true); expect(k[0]!.row.abbr).toBe('Каменец. у.'); expect(k[0]!.row.scope).toBe('place')
    expect(k[0]!.row.meaning).toContain('Каменецкій'); expect(k[0]!.resolved.places).toEqual(["Кам'янецький повіт"]); expect(k[0]!.quote).toContain('Каменец. у.')
    const e = scan('Бажання скінчилось. Екатериносл. у. Так.')
    expect(e[0]!.resolved.area).toBe('katerynoslavshchyna')
    expect(scan('Діб. Кіев. г. Тепер.')[0]!.resolved.area).toBe('kyivshchyna')
    expect(scan('Злоба. Міус. окр. Злобу.')[0]!.resolved.area).toBe('don')
  })
  it('LB-17 «НВолын. у.» (no space) is the list row «Н. Вол. у.»', () => {
    const h = scan('Він не має мене за матір. НВолын. у. Він не ма́є.')
    expect(h.map(x => x.row.abbr)).toEqual(['Н. Вол. у.']); expect(h[0]!.resolved.area).toBe('volyn')
    expect(scan('Нволын. у. Харьк. г.').length).toBeGreaterThan(0)
  })
  it('LB-17 nothing is read from a short, ambiguous or unlisted stem', () => {
    expect(listStemRow('Чуб', 'у')).toBeUndefined()      // three letters
    expect(listStemRow('Волч', 'у')).toBeUndefined()     // not in the list, not a prefix of a listed adjective
    expect(listStemRow('Полт', 'у')).toBeUndefined()     // the list prints only «Полт. г.»
    expect(scan('Чуб. у. 270. Грин. г. 3.')).toEqual([])
    expect(listStemRow('Каменец', 'г')).toBeUndefined()  // kind must match
  })
  it('LB-17 the county stem keeps its own «ц» («Козелец. у.» for Козелецький)', () => {
    expect(countyByStem('Козелец')?.[0]).toBe('Козелецький')
  })
  it('LB-17 the variant hit is a normal place-only dictionary hit with the printed spelling and a quote', () => {
    const h = scan('Біг-ме. Каменец. у. / 7)')[0]!, w = wireHit(HRINCH_LABELS, h, 'https://r2u.org.ua/x#12_1')
    expect(w).toMatchObject({ t: 'hrinch-labels', a: 'Каменец. у.', kind: 'area', p: true, variant: true }); expect(w.q).toContain('Каменец. у.'); expect(w.u).toContain('#12_1')
    expect(resolveRow(h.row).gov?.quote).toMatch(/Подільської губернії/)
  })
})

describe('LB-17 head of the article', () => {
  it('LB-17 a Cyrillic homonym number «І.» / «ІІ.» does not hide the headword; «X и Y» gives both', () => {
    expect(parseCell(12, 1, '<span class="KrymUkrBold">ІІ. Діл</span>, -лу, <span class="KrymUkrItalic">м.</span> Часть, доля. Черниг. у.')?.head).toEqual(['Діл'])
    expect(parseCell(12, 2, '<span class="KrymUkrBold">І. Ко́ло</span>, -ла, с. / 1) Кругъ.')?.head).toEqual(['Ко́ло'])
    expect(parseCell(12, 3, '<span class="KrymUkrBold">Горілча́ний и горільча́ний</span>, -а, -е. Водочный.')?.head).toEqual(['Горілча́ний', 'горільча́ний'])
  })
})

describe('LB-17 en.wiktionary region categories', () => {
  it('LB-17 three categories name an area, quote the category page, and the harvest keeps them', () => {
    for (const [cat, tag] of [['Dniestrian Ukrainian', 'Dniestrian'], ['Middle Dnieprian Ukrainian', 'Middle Dnieprian'], ['Steppe Ukrainian', 'Steppe']] as const) {
      expect(KAIKKI_CATEGORY_TAG[cat]).toBe(tag)
      const r = extraRow(KAIKKI_REGION, tag)!; expect(r.kind).toBe('area'); expect(r.meaning).toContain(`Category:${cat}`); expect(r.meaning).toContain('Terms or senses in Ukrainian as spoken in')
      expect(AREAS[r.area!], tag).toBeTruthy(); expect(KAIKKI_KEEP.has(tag), tag).toBe(true)
    }
  })
  it('LB-17 the pipeline, spec rows and ledger are in place', () => {
    expect(readFileSync('pipelines/lb-extra-hits.ts', 'utf8')).toContain('newHits')
    expect(readFileSync('specs/63-corpus-dialects.md', 'utf8')).toContain('**LB-17**')
  })
})
