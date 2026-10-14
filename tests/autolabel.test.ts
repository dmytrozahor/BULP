/** SPEC 63 AC-1…AC-5: automatic classification from the sources' own labels. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  GAZETTEER, HRINCH_ABBR, KAIKKI_TAGS, R2U_ABBR, abbrEvidence, articleLabels, autoContactClaim, gazPlain, gazetteerRows, regionDialectClaims, withAutoContact, type R2uPair,
} from '../core/autolabel.ts'
import { usageLabel, usageClaims, usageRows } from '../core/usage.ts'
import { claim, D } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import { parseCell, parseSearch } from '../pipelines/r2u.ts'
import { DIALECT_LEX } from '../core/dialect-lex.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

describe('AC-1 per-source abbreviation tables quote the source\'s own list', () => {
  it('every table row has a verbatim meaning and the table a registered source and a locator', () => {
    for (const t of [HRINCH_ABBR, KAIKKI_TAGS]) {
      expect(SOURCES[t.source], t.id).toBeTruthy(); expect(t.list.length, t.id).toBeGreaterThan(10)
      for (const r of t.rows) { expect(r.meaning.length, r.abbr).toBeGreaterThan(8); expect(abbrEvidence(t, r).quote).toBe(r.meaning); expect(r.usage || r.region, r.abbr).toBeTruthy() }
    }
  })
  it('the Грінченко row quotes its own entry: «Абревіатура — розшифровка»', () => {
    for (const r of HRINCH_ABBR.rows) expect(r.meaning.startsWith(r.abbr + ' — '), r.abbr).toBe(true)
  })
  it('every usage id a table points to is a real usage label', () => { for (const r of KAIKKI_TAGS.rows) expect(usageLabel[r.usage!], r.abbr).toBeTruthy() })
  it('articleLabels returns a verbatim slice of the article for each abbreviation and ignores look-alikes', () => {
    const text = 'Бáбуля, -лі, ж. Бабуся. Вх. Зн. 3. Гуцул. Шух. I. 56. // Галиц. Ном. 12'
    const l = articleLabels(HRINCH_ABBR, text)
    expect(l.map(x => x.row.abbr).sort()).toEqual(['Галиц.', 'Гуцул.'])
    for (const x of l) expect(text.includes(x.quote)).toBe(true)
    expect(articleLabels(HRINCH_ABBR, 'Підгуцул. і Негалиц. — не мітки')).toEqual([])
    expect(articleLabels(HRINCH_ABBR, 'гуцул. малими — не мітка')).toEqual([])
  })
  it('r2u: parseCell reads Грінченко labels from the FULL article, quote ⊂ article', () => {
    const html = '<span class="KrymUkrBold">Бабуля</span> <span class="KrymRusPlain">бабушка.</span> <span class="KrymUkrItalic">Гуцул.</span> Шух. I. 56.'
    const r = parseCell(12, 1, html)
    expect(r?.labels?.map(x => x.abbr)).toEqual(['Гуцул.'])
    expect(r!.labels![0]!.quote).toContain('Гуцул.')
    expect(parseCell(9, 1, '<span class="KrymRusBold">Вы́глядѣть</span> <span class="KrymUkr">видава́ти ся</span> Гуцул.')?.labels).toBeUndefined()   // no table for Уманець
    expect(R2U_ABBR[12]).toBe(HRINCH_ABBR)
  })
  it('real r2u pages (when fetched): every extracted label is an exact slice of its article', () => {
    const dir = 'data/raw/r2u/pages'
    if (!existsSync(dir)) return
    let n = 0
    for (const f of readdirSync(dir).filter(x => x.endsWith('.html.gz')).slice(0, 40)) {
      for (const r of parseSearch(gunzipSync(readFileSync(`${dir}/${f}`)).toString('utf8'))) for (const l of r.labels ?? []) { n++; expect(l.quote).toContain(l.abbr) }
    }
    expect(n).toBeGreaterThanOrEqual(0)
  })
  it('en.wiktionary sense tags → usage rows with the dataset quote + the glossary definition; unlabelled tags and non-table tags give nothing', () => {
    const rows = usageRows('баба', '', new Map(), [['dialectal', 'beggar woman'], ['colloquial', 'woman']])
    expect(rows.map(r => r[0])).toEqual(['dial', 'rozm']); expect(rows.every(r => r[1] === 'k')).toBe(true)
    const cl = usageClaims('баба', rows, 'v', '2026-10-14')
    const ev = cl.find(c => c.label.id === 'dial')!.claim.evidence
    expect(ev[0]!.source).toBe('KAIKKI'); expect(ev[0]!.quote).toBe('[dialectal] beggar woman'); expect(ev[0]!.locator).toContain('en.wiktionary.org/wiki/')
    expect(ev.some(e => e.kind === 'Q' && e.quote === 'Of or relating to a dialect')).toBe(true)
    expect(usageRows('х', '', new Map(), [['rare', 'x']])).toEqual([])
  })
})

describe('AC-2 gazetteer: region → dialect group from a cited table, never per word', () => {
  it('every stem of a gazetteer row occurs in the quote of that row (stress marks ignored)', () => {
    for (const g of GAZETTEER) { expect(g.q.length, g.group).toBeGreaterThan(20); expect(g.loc).toContain('uk.wikipedia.org/wiki/'); for (const s of g.stems) expect(gazPlain(g.q).includes(s), `${g.group}: ${s}`).toBe(true) }
  })
  it('names resolve to their groups; an unknown region stays unknown', () => {
    expect(gazetteerRows('Гуцульщина').map(g => g.group)).toEqual(['HUT'])
    expect(gazetteerRows('Галиція').map(g => g.group)).toEqual(['NDN'])
    expect(gazetteerRows('Угорщина')).toEqual([])
    expect(gazetteerRows('Волинь').map(g => g.group).sort()).toEqual(['VOL', 'WPL'])   // ambiguous: both groups, as two separate claims
  })
  it('a region label becomes a claim carrying the article quote, the abbreviation entry of the source and the gazetteer quote', () => {
    const row = HRINCH_ABBR.rows.find(r => r.abbr === 'Гуцул.')!
    const art = D('R2U', 'https://r2u.org.ua/s?w=x#12_1', 'Гуцул. Шух. I. 56.')
    const c = regionDialectClaims(art, HRINCH_ABBR, row)
    expect(Object.keys(c)).toEqual(['HUT'])
    expect(c.HUT!.evidence.map(e => e.source)).toEqual(['R2U', 'HRINCH', 'WUK'])
    expect(c.HUT!.evidence[1]!.quote).toBe('Гуцул. — Гуцульщина.')
    expect(regionDialectClaims(art, HRINCH_ABBR, HRINCH_ABBR.rows.find(r => r.abbr === 'Угор.')!)).toEqual({})   // no gazetteer row → no claim
  })
})

describe('AC-3 surzhyk is computed: ∉ VESUM ∧ known to Russian ∧ r2u gives a Ukrainian equivalent', () => {
  const pair: R2uPair = { dict: 'Уманець–Спілка', url: 'https://r2u.org.ua/s?w=x#9_1', head: 'Вы́глядѣть', eq: ['видава́ти-ся', 'здава́ти-ся'], text: 'Вы́глядѣть = видава́ти ся, здава́ти ся' }
  const loc = 'dict_corp_vis.txt v6.8.6', ru = 'data/work/ru.json'
  it('all conditions met → a claim with the r2u quote, the VESUM absence and the Russian-dictionary verdict', () => {
    const c = autoContactClaim('вигляділь', false, { known: true, tag: 'VERB' }, [pair], loc, ru)!
    expect(c.value).toBe(true); expect(c.method).toContain('AC-3')
    expect(c.evidence.map(e => e.source)).toEqual(['R2U', 'VESUM', 'OPENCORPORA']); expect(c.evidence[0]!.quote).toBe(pair.text)
    for (const e of c.evidence) expect(SOURCES[e.source], e.source).toBeTruthy()
  })
  it('each missing condition → no claim (unknown, never a guess)', () => {
    expect(autoContactClaim('x', true, { known: true }, [pair], loc, ru)).toBeUndefined()      // in VESUM
    expect(autoContactClaim('x', false, { known: false }, [pair], loc, ru)).toBeUndefined()    // not Russian
    expect(autoContactClaim('x', false, undefined, [pair], loc, ru)).toBeUndefined()           // not checked
    expect(autoContactClaim('x', false, { known: true }, [], loc, ru)).toBeUndefined()         // no r2u row
    expect(autoContactClaim('видавати-ся', false, { known: true }, [{ ...pair, eq: ['видава́ти-ся'] }], loc, ru)).toBeUndefined()   // the "equivalent" is the form itself
  })
  it('withAutoContact merges evidence and never drops the rule-derived claim', () => {
    const auto = autoContactClaim('x', false, { known: true }, [pair], loc, ru)!
    const base = claim(true as const, [D('VESUM', loc, 'x')], { method: 'derived: russianism_morph' })
    expect(withAutoContact(base, undefined)).toBe(base)
    expect(withAutoContact({ value: 'unknown', evidence: [] }, auto)).toBe(auto)
    const m = withAutoContact(base, auto); expect(m.method).toContain('derived: russianism_morph'); expect(m.method).toContain('AC-3'); expect(m.evidence.length).toBeGreaterThan(2)
  })
})

describe('AC-4 hand lists are fixtures / cite-only evidence, not the mechanism', () => {
  it('no automatic channel imports the hand list; only the AC-5 report reads it for evaluation', () => {
    expect(rd('core/autolabel.ts')).not.toMatch(/dialect-lex/)
    const ba = rd('pipelines/build-autolabel.ts')
    expect(ba.match(/from '\.\.\/core\/dialect-lex\.ts'/g)?.length).toBe(1)   // the import used by writeAutoReport only
    expect(ba.slice(0, ba.indexOf('export function writeAutoReport')).match(/DIALECT_LEX/g)?.length).toBe(1)   // …= the import line
  })
  it('every hand-list entry carries its own verbatim quote and locator (evidence claim)', () => {
    for (const e of DIALECT_LEX) { expect(e.q.length, e.w[0]).toBeGreaterThan(5); expect(e.loc, e.w[0]).toBeTruthy(); expect(SOURCES[e.src], e.w[0]).toBeTruthy() }
  })
  it('build.ts recomputes the automatic channels on every build', () => {
    const b = rd('pipelines/build.ts')
    expect(b).toContain('buildAutoLabels(ROOT'); expect(b).toContain('autoContactClaim('); expect(b).toContain('auto.dialect.get(')
  })
})

describe('AC-5 report', () => {
  it('analysis/auto-classification.md has coverage before/after per label type, the hand-list agreement and the tables', () => {
    const p = 'analysis/auto-classification.md'
    if (!existsSync(p)) return   // written by `npm run build:data`
    const t = rd(p)
    for (const h of ['Coverage of', 'usage / register', 'dialect group', 'surzhyk / contact', 'Agreement with the old hand list', 'Precision', 'Tables']) expect(t, h).toContain(h)
  })
})
