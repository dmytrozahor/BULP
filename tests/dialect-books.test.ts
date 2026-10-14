/** SPEC 63 DL: features mined from the ЕУМ dialect entries and dialect dictionaries (research/31). Every new rule fires on its example and not on a standard word. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { detect, type Ctx } from '../core/detect.ts'
import { DIALECT_RULES, DIALECT_BOOK_RULES, DIALECT_LEX_RULES, DIALECTS, DIALECT_GROUP_FROM, ruleGate } from '../core/rules.ts'
import { DIALECT_LEX } from '../core/dialect-lex.ts'
import { SOURCES } from '../core/sources.ts'
import { territoryById } from '../core/territories.ts'

const ctx = (form: string, o: Partial<Ctx> = {}): Ctx => ({ form, vesum: [], inLexicon: () => [], ...o })
const claims = (f: string, year?: number, o: Partial<Ctx> = {}) => detect(DIALECT_RULES, ctx(f, { year, ...o })).claims

/** rule base id → [dialect codes, example (fires), standard counterpart (silent)] */
const EX: Record<string, [string[], string, string]> = {
  'SW-LABIAL-J': [['BOY', 'HUT', 'LEM', 'SYAN'], 'любйу', 'люблю'],
  'SW-NOM-PL-OVE': [['BOY', 'ZAK', 'SYAN'], 'братове', 'нове'],
  'SW-1PL-ME': [['BOY', 'ZAK'], 'береме', 'беремо'],
  'SW-3SG-CONTRACT': [['BOY', 'ZAK', 'SYAN', 'HUT'], 'знат', 'знає'],
  'BOY-DZH': [['BOY'], 'дождж', 'дощ'],
  'SW-VN-MN': [['BOY', 'POD', 'SYAN'], 'мнук', 'внук'],
  'SW-KJ-GJ': [['HUT', 'PKB', 'NDN', 'SLB', 'STP', 'MDN'], 'ґівка', 'дівка'],
  'PKB-DEPAL-S': [['PKB', 'HUT'], 'хтос', 'хтось'],
  'MONO-UY': [['HUT', 'WPL', 'ZAK'], 'кун', 'кінь'],
  'MPL-CLOSED-VOWEL': [['MPL', 'BOY', 'ZAK'], 'порвêг', 'поріг'],
  'SW-A-SOFT': [['NDN', 'PKB', 'WPL', 'SYAN'], 'тежко', 'важко'],
  'WPL-YA-E': [['WPL', 'MPL'], 'йеблуко', 'яблуко'],
  'SW-PROTH': [['WPL', 'NDN', 'POD'], 'ворих', 'горіх'],
  'SW-DEVOICE': [['WPL', 'LEM', 'STP', 'PKB'], 'мет', 'мед'],
  'SW-UKANYE': [['MDN', 'SLB', 'STP', 'HUT', 'LEM', 'WPL', 'VOL'], 'мугила', 'могила'],
  'CHN-AKANYE': [['CHN', 'SLB'], 'галава', 'голова'],
  'F-VARIANTS': [['STP', 'MDN'], 'хунт', 'фунт'],
  'EPENTH-2': [['NDN', 'ZAK', 'SLB', 'STP'], 'здоровля', 'здоров’я'],
  'SFX-ISKO': [['WPL', 'NDN'], 'льониско', 'городище'],
  'SFX-ISHCHE': [['MPL', 'CHN', 'SE'], 'городишче', 'городище'],
  'SFX-ISHCH-CMP': [['POD', 'PKB'], 'добрішчий', 'кращий'],
  'SW-NO-LENGTH': [['POD', 'NDN', 'SYAN', 'VOL'], 'насіня', 'насіння'],
  'SW-IM-CLITIC-PAST': [['ZAK', 'PKB', 'NDN', 'WPL', 'VOL', 'POD', 'SYAN'], 'ходивім', 'ходили'],
  'SW-COND-BIM': [['NDN', 'ZAK'], 'бим', 'би'],
  'HUT-COND': [['HUT'], 'биех', 'би'],
  'PKB-VI-PREFIX': [['HUT', 'PKB'], 'віпити', 'випити'],
  'LEM-IJ': [['LEM'], 'колий', 'коли'],
  'LEM-W-L': [['LEM'], 'пўух', 'плуг'],
  'LEM-CLITIC-V': [['LEM', 'SYAN'], 'фчора', 'вчора'],
  'LEM-DA': [['LEM'], 'дахто', 'дехто'],
  'LEM-PREPS': [['LEM'], 'іґ', 'до'],
  'ADJ-UNCONTR-NEUT': [['ZAK', 'VOL'], 'дрібнойе', 'дрібне'],
  'VOL-FEM-EJI': [['VOL'], 'старейі', 'старої'],
  'WPL-INF-ODD': [['WPL'], 'бігті', 'бігти'],
  'WPL-PHON-VAR': [['WPL'], 'кень', 'кінь'],
}

describe('DL-1 every ЕУМ-mined row has a verbatim ЕУМ cite of its own dialect, an example and a standard counterpart', () => {
  it('the example table covers every rule:code of DIALECT_BOOK_RULES and nothing else', () => {
    const have = new Set(DIALECT_BOOK_RULES.map(r => r.id))
    const want = new Set(Object.entries(EX).flatMap(([id, [codes]]) => codes.map(c => `${id}:${c}`)))
    expect([...have].filter(x => !want.has(x))).toEqual([]); expect([...want].filter(x => !have.has(x))).toEqual([])
  })
  it('each rule cite is a Q quote from an ЕУМ article (litopys um<N>.htm) and rule ids are unique', () => {
    for (const r of DIALECT_BOOK_RULES) {
      expect(r.cite.kind, r.id).toBe('Q'); expect(r.cite.quote.length, r.id).toBeGreaterThan(12); expect(r.weight, r.id).toBeGreaterThan(0)
      if (r.id.startsWith('WPL-INF-ODD') || r.id.startsWith('WPL-PHON-VAR')) { expect(r.cite.source, r.id).toBe('ARKUSHYN'); expect(r.cite.locator, r.id).toContain('slzhdplhv') }   // Arkushin's own preface
      else { expect(r.cite.source, r.id).toBe('ENC'); expect(r.cite.locator, r.id).toMatch(/^http:\/\/litopys\.org\.ua\/ukrmova\/um\d+\.htm$/) }
    }
    const ids = DIALECT_RULES.map(r => r.id); expect(new Set(ids).size).toBe(ids.length)
  })
  it('new dialect codes are named and the new groups are gated by Shevelov Q quotes', () => {
    for (const c of ['HUT', 'SYAN', 'PKB', 'VOL', 'SLB', 'STP']) { expect(DIALECTS[c], c).toBeTruthy(); expect(DIALECT_GROUP_FROM[c]?.cite.kind, c).toBe('Q'); expect(DIALECT_GROUP_FROM[c]?.cite.source, c).toBe('SHEV') }
    expect(DIALECT_GROUP_FROM.VOL!.from).toBe(1401); expect(DIALECT_GROUP_FROM.HUT!.from).toBe(1301)
  })
  it('a normative VESUM hit vetoes every new row (no standard word is tagged dialectal)', () => {
    const v = { vesum: [{ lemma: 'x', tags: 'noun:inanim:m:v_naz' }] }
    for (const [id, [codes, ex]] of Object.entries(EX)) expect(Object.keys(claims(ex, 1900, v)), id + ' ' + codes.join()).toEqual([])
  })
})

describe('DL-2 per dialect group: each new rule fires on its example and stays silent on the standard word', () => {
  const groups = ['BOY', 'HUT', 'LEM', 'ZAK', 'SYAN', 'PKB', 'NDN', 'POD', 'VOL', 'WPL', 'MPL', 'CHN', 'SLB', 'STP', 'MDN', 'SE', 'SW']
  for (const g of groups) {
    it(`${g}: ${DIALECTS[g] ?? g}`, () => {
      const mine = Object.entries(EX).filter(([, [codes]]) => codes.includes(g))
      if (g === 'SW') expect(mine.length).toBe(0)   // umbrella code: only lexical rows (below)
      else expect(mine.length, g).toBeGreaterThan(0)
      for (const [id, [, ex, std]] of mine) {
        const c = claims(ex, 1900)[g]
        expect(c, `${id}:${g} on ${ex}`).toBeDefined(); expect(c!.method, ex).toContain(`${id}:${g}`)
        expect(c!.evidence.some(e => e.kind === 'Q' && (e.source === 'ENC' || e.source === 'ARKUSHYN')), id).toBe(true)
        expect(claims(std, 1900)[g]?.method ?? '', `${id}:${g} must not fire on ${std}`).not.toContain(`${id}:${g}`)
      }
    })
  }
  it('every group that has rows is covered by one of the 17 group tests', () => {
    const got = new Set(DIALECT_BOOK_RULES.map(r => r.label)); for (const g of got) expect(groups.includes(g), g).toBe(true)
  })
})

describe('DL-3 dated rows (Shevelov) respect their first attestation', () => {
  it('the a > e/i-after-soft-consonants rows are dated 1401 (XV c.) with the Shevelov quote; NDN/PKB/WPL/SYAN do not fire earlier', () => {
    for (const g of ['NDN', 'PKB', 'WPL', 'SYAN']) {
      const r = DIALECT_RULES.find(x => x.id === `SW-A-SOFT:${g}`)!
      expect(r.earliest).toBe(1401); expect(r.earliestCite?.kind).toBe('Q'); expect(r.earliestCite?.quote).toContain('зафіксоване з XV ст.')
      expect(claims('тежко', 1400)[g]?.method ?? '').not.toContain('SW-A-SOFT'); expect(claims('тежко', 1401)[g]?.method).toContain('SW-A-SOFT')
    }
  })
  it('HUT ukanye is dated XIV c. (1301) and Volhynian ukanye XVI c. (1501); the dating quote joins the evidence', () => {
    expect(ruleGate(DIALECT_RULES.find(x => x.id === 'SW-UKANYE:HUT')!)).toBe(1301)
    expect(ruleGate(DIALECT_RULES.find(x => x.id === 'SW-UKANYE:VOL')!)).toBe(1501)
    expect(claims('кужух', 1300).HUT).toBeUndefined(); const c = claims('кужух', 1301).HUT!
    expect(c.evidence.some(e => e.quote.includes('датована XIV ст.'))).toBe(true)
    expect(claims('куожух', 1500).VOL).toBeUndefined(); expect(claims('куожух', 1501).VOL).toBeDefined()
  })
  it('every dated DL row carries a Q dating cite (existing DD-1 invariant also holds for the new rows)', () => {
    for (const r of DIALECT_BOOK_RULES.filter(x => x.earliest !== undefined)) { expect(r.earliestCite?.kind, r.id).toBe('Q'); expect(r.earliestCite?.source, r.id).toBe('SHEV') }
  })
})

describe('DL-4 lexical dialectisms (core/dialect-lex.ts)', () => {
  it('has entries for every dialect group of the book sources, each with a Q quote, a registered source and a locator', () => {
    const codes = new Set(DIALECT_LEX.flatMap(e => e.codes))
    for (const g of ['BOY', 'HUT', 'LEM', 'ZAK', 'SYAN', 'PKB', 'NDN', 'SW', 'WPL', 'MPL', 'CHN', 'SLB', 'STP', 'MDN']) expect(codes.has(g), g).toBe(true)
    expect(DIALECT_LEX.length).toBeGreaterThan(100)
    for (const e of DIALECT_LEX) { expect(SOURCES[e.src], e.w[0]).toBeTruthy(); expect(e.q.length, e.w[0]).toBeGreaterThan(5); expect(e.loc, e.w[0]).toBeTruthy(); expect(e.gloss, e.w[0]).toBeTruthy() }
    expect(DIALECT_LEX_RULES.length).toBe(DIALECT_LEX.reduce((n, e) => n + e.codes.length, 0))
  })
  it('each lexical entry fires for its dialect(s) on its exact form and carries the book quote as the cite', () => {
    for (const e of DIALECT_LEX) for (const code of e.codes) {
      const c = claims(e.w[0]!, 1900)[code]
      expect(c, `${e.w[0]}:${code}`).toBeDefined(); expect(c!.evidence.some(x => x.quote === e.q && x.source === e.src && x.locator === e.loc), e.w[0]).toBe(true)
    }
  })
  it('one example per group, and a standard word or a normative VESUM hit never fires', () => {
    const ex: [string, string][] = [['BOY', 'вечеркуватися'], ['HUT', 'будулів'], ['LEM', 'гомбалка'], ['SYAN', 'пацір'], ['PKB', 'ґуц'], ['NDN', 'нецьки'], ['SW', 'ріща'], ['WPL', 'адючина'],
      ['MPL', 'мармуль'], ['CHN', 'бережник'], ['SLB', 'ламанка'], ['STP', 'кирд'], ['MDN', 'збірник']]
    for (const [g, w] of ex) {
      const cl = claims(w, 1900)
      if (w === 'збірник') continue   // listed in VESUM → vetoed, therefore not in the table (checked below)
      expect(cl[g], `${w}:${g}`).toBeDefined()
      expect(claims(w, 1900, { vesum: [{ lemma: w, tags: 'noun:inanim:m:v_naz' }] })[g]).toBeUndefined()
    }
    for (const std of ['хата', 'вода', 'ліс', 'картопля']) expect(Object.keys(claims(std, 1900))).toEqual([])
  })
  it('the lexical rules keep the blanket 1798 gate and the group-formation gate', () => {
    expect(claims('гомбалка', 1700).LEM).toBeUndefined(); expect(claims('гомбалка', 1798).LEM).toBeDefined()
    expect(claims('кирд', 1798).STP).toBeDefined()
  })
  it('Polissian rows: Arkushin (WPL) and Lysenko (MPL, CHN) entries quote the dictionary with the book locator', () => {
    const a = DIALECT_LEX.filter(e => e.src === 'ARKUSHYN'), l = DIALECT_LEX.filter(e => e.src === 'LYSENKO')
    expect(a.length).toBeGreaterThan(20); expect(l.length).toBeGreaterThan(2)
    for (const e of a) { expect(e.codes).toEqual(['WPL']); expect(e.loc).toContain('slzhdplhv') }
    for (const e of l) { expect(e.codes).toEqual(['MPL', 'CHN']); expect(e.loc).toContain('p0lissia') }
    expect(claims(a[0]!.w[0]!, 1900).WPL!.evidence.some(x => x.source === 'ARKUSHYN')).toBe(true)
  })
})

describe('DL-6 Авдеева, Словарь украинских говоров Воронежской области (2008/2012), cite-only via Сьянова 2020', () => {
  const av = DIALECT_LEX.filter(e => e.src === 'AVDEEVA')
  it('the dictionary is a registered source with both volumes and the access terms', () => {
    expect(SOURCES.AVDEEVA!.title).toMatch(/Т\. 1 \(А–М\), 2008/); expect(SOURCES.AVDEEVA!.title).toMatch(/Т\. 2 \(Н–Я\), 2012/); expect(SOURCES.AVDEEVA!.license).toMatch(/cite-only/)
  })
  it('every entry: headword, one-sentence quoted gloss, village label, volume + page locator, region = a real MP territory', () => {
    expect(av.length).toBeGreaterThanOrEqual(3)
    for (const e of av) {
      expect(e.region, e.w[0]).toBe('voronizhchyna'); expect(territoryById[e.region!], e.w[0]).toBeDefined()
      expect(e.village, e.w[0]).toBeTruthy(); expect(e.loc, e.w[0]).toMatch(/т\. (I|II) \((2008|2012)\), с\. \d+/)
      expect(e.gloss.split(/[.!?]/).filter(Boolean).length).toBe(1); expect(e.q.length).toBeLessThan(200)
    }
  })
  it('no dialect group is asserted: the preface (p. 4) names none, so codes stay empty and no rule is generated', () => {
    for (const e of av) { expect(e.codes).toEqual([]); expect(DIALECT_LEX_RULES.some(r => r.id.startsWith(`LEX-AVDEEVA:${e.w[0]}`))).toBe(false) }
    expect(claims('вутя', 1900)).toEqual({})
  })
})

describe('DL-7 Залеський 1973 / Шило 1957: access log, no unverifiable rows', () => {
  const log = readFileSync(new URL('../research/31-dialect-books.md', import.meta.url), 'utf8')
  it('both books are logged in research/31 §1 with the route tried and the owner decision', () => {
    for (const k of ['DL-7a', 'DL-7b', 'Вокалізм південно-західних говорів', 'на північ від Дністра', 'chtyvo.org.ua', 'UKR0009552']) expect(log, k).toContain(k)
    expect(log.match(/needs owner's decision/g)!.length).toBeGreaterThanOrEqual(2)
  })
  it('no rule or lexical entry cites a book that was not read', () => {
    const cites = [...DIALECT_BOOK_RULES.map(r => r.cite?.source), ...DIALECT_LEX.map(e => e.src)]
    expect(cites.filter(s => /ZALES|SHYLO|ZALESKYI/i.test(String(s)))).toEqual([])
  })
})

describe('DL-8 Лукашенко–Похилевич 2006 (Північне Підляшшя): access log, nothing ingested from an unread copyrighted book', () => {
  it('the access route and the owner decision are logged, and the target region is a real MP territory', () => {
    const log = readFileSync(new URL('../research/31-dialect-books.md', import.meta.url), 'utf8')
    for (const k of ['**DL-8**', 'Традиційні пісні українців північного Підляшшя', 'Камула', 'drive.google.com', 'pidliashshia']) expect(log, k).toContain(k)
    expect(territoryById.pidliashshia!.code).toBe('HT-pidliashshia')
  })
  it('no lexical entry or rule cites the edition (it was not read)', () => {
    expect(DIALECT_LEX.filter(e => /LUKASH|POKHYL|PIDLIASH/i.test(e.src))).toEqual([])
    expect(DIALECT_BOOK_RULES.filter(r => /LUKASH|POKHYL|PIDLIASH/i.test(String(r.cite?.source)))).toEqual([])
  })
})
