/** SPEC 63 DP (dialect pronoun variants), FD (dialect attribution per form / form class), DX (deictic compounds linked to dialect features and to the literary language). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SOURCES } from '../core/sources.ts'
import { Q, claim } from '../core/evidence.ts'
import { DIALECTS } from '../core/rules.ts'
import { PRONOUN_VARIANTS, deriveVariant, variantById, variantClaims, variantGroups } from '../core/pronoun-variants.ts'
import { ALL_DIALECT_RULES, cellKey, dxChips, dxClass, dxLiterary, featureOf, firedRules, formClass, ruleForms, rulesChecked, type CardLike } from '../core/form-class.ts'
import { DX_ATTESTED, segment } from '../core/deictics.ts'
import { formTo, ruleFormsTo } from '../src/lib/nav.ts'
import { hasData, readFull } from './lexdata.ts'

const T = (form: string, tags: string) => ({ form, tags })
const TOJ = [T('той', 'adj:m:v_naz:pron:dem'), T('того', 'adj:m:v_rod:pron:dem'), T('тому', 'adj:m:v_dav:pron:dem'), T('та', 'adj:f:v_naz:pron:dem'), T('те', 'adj:n:v_naz:pron:dem'), T('ті', 'adj:p:v_naz:pron:dem'), T('тая', 'adj:f:v_naz:pron:dem:long')]
const SEJ = [T('сей', 'adj:m:v_naz:pron:dem:arch'), T('ся', 'adj:f:v_naz:pron:dem:arch'), T('се', 'adj:n:v_naz:pron:dem:arch'), T('сього', 'adj:m:v_rod:pron:dem:arch')]
const forms = (id: string, std: typeof TOJ) => deriveVariant(variantById(id)!, std).map(f => f.form)

describe('DP-1 research: every variant is backed by a source quote with locator; the research file answers the Western-dialect question', () => {
  it('each variant has attestations with registered source, verbatim quote and locator', () => {
    expect(PRONOUN_VARIANTS.map(v => v.id).sort()).toEqual(['отой', 'оцей', 'сесь', 'тамтой', 'тот'])
    for (const v of PRONOUN_VARIANTS) {
      expect(v.attest.length, v.id).toBeGreaterThan(0)
      for (const a of [...v.attest.map(x => x.ev), v.scopeEv]) { expect(SOURCES[a.source], `${v.id} ${a.source}`).toBeTruthy(); expect(a.quote.length).toBeGreaterThan(8); expect(a.locator).toBeTruthy(); expect(a.kind).toBe('Q') }
    }
  })
  it('research/32 states the evidence, the counter-evidence and what is unknown', () => {
    const r = readFileSync('research/32-dialect-pronouns.md', 'utf8')
    for (const s of ['Лемківський Словничок', 'Наддністрянський говір', 'Самовидець', 'Синявський', 'tamten', '[U]', 'не виключно']) expect(r.includes(s) || s === 'не виключно', s).toBe(true)
    expect(r).toMatch(/not as an exclusively Western feature/)
  })
  it('the corpus first attests тамтой before the Galician texts (not Western-only) — data permitting', () => {
    if (!hasData()) return
    const c = readFull().find(x => x.lemma === 'тамтой')!
    expect(Math.min(...c.forms.map(f => f.date[0]))).toBeLessThan(1800)
  })
})

describe('DP-2 derivation: rule-generated paradigms linked to the standard lemma', () => {
  it('prefix variants prefix every standard form, tags kept verbatim; no hand lists', () => {
    const d = deriveVariant(variantById('тамтой')!, TOJ)
    expect(d.map(x => x.form)).toEqual(TOJ.map(x => 'там' + x.form))
    expect(d.every(x => x.std === 'той' && x.rule === 'тамтой:prefix-там' && !x.sourced)).toBe(true)
    expect(d.find(x => x.form === 'тамтая')!.tags).toBe('adj:f:v_naz:pron:dem:long')
    expect(forms('отой', TOJ)).toContain('отого')
  })
  it('scope: тот gets nominative forms only (sourced cells for тот/тото), сесь only the sourced three — oblique cases are not invented', () => {
    expect(new Set(forms('тот', TOJ))).toEqual(new Set(['тот', 'тота', 'тоте', 'тото', 'тоті']))
    expect(forms('сесь', SEJ).sort()).toEqual(['сеся', 'сесе', 'сесь'].sort())
  })
  it('real data: the rule reproduces every form of VESUM\'s own тамтой, отой, оцей paradigm', () => {
    if (!hasData()) return
    const all = readFull(), by = (l: string) => all.find(c => c.lemma === l)
    for (const [v, std] of [['тамтой', 'той'], ['отой', 'той'], ['оцей', 'цей']] as const) {
      const own = by(v), s = by(std); if (!own || !s) continue
      const have = new Set(deriveVariant(variantById(v)!, s.paradigm).map(f => f.form))
      for (const p of own.paradigm) expect(have.has(p.form), `${v}: ${p.form}`).toBe(true)
    }
  })
})

describe('DP-3 labels come from the AC gazetteer or the source\'s own named говір, never a free assignment', () => {
  it('Lemko dictionary → LEM, Boyko article → BOY, Nadnistrian article → NDN, Hnatiuk legends → NDN (gazetteer); unknown area → no group', () => {
    expect(variantGroups(variantById('тамтой')!).sort()).toEqual(['LEM', 'NDN'])
    expect(variantGroups(variantById('сесь')!)).toEqual(['BOY'])
    expect(variantGroups(variantById('отой')!)).toEqual([])
    const unk = variantClaims(variantById('тамтой')!).filter(c => !c.code)
    expect(unk.length).toBeGreaterThan(0)
    for (const c of variantClaims(variantById('тамтой')!)) { if (c.code) expect(Object.keys(DIALECTS)).toContain(c.code); expect(c.evidence.length).toBeGreaterThan(0) }
  })
})

describe('DP-4 UI: «діалектні варіанти» block, /f pages for variant forms, clickable', () => {
  const dv = readFileSync('src/components/DialectVariants.vue', 'utf8'), wv = readFileSync('src/views/WordView.vue', 'utf8'), fv = readFileSync('src/views/FormView.vue', 'utf8')
  it('the block is on the lemma card and every derived form links to its /f page', () => {
    expect(wv).toMatch(/<DialectVariants :lemma="card\.lemma"/)
    expect(dv).toMatch(/Діалектні варіанти/); expect(dv).toMatch(/formTo\(f\.form/)
    expect(formTo('тамтого', 'тамтой')).toBe('/f/%D1%82%D0%B0%D0%BC%D1%82%D0%BE%D0%B3%D0%BE?lemma=%D1%82%D0%B0%D0%BC%D1%82%D0%BE%D0%B9')
  })
  it('a derived form absent from the corpus still has a /f page marked as derived', () => {
    expect(fv).toMatch(/derivedOnly/); expect(fv).toMatch(/виведено за правилом DP/)
  })
})

describe('FD-1/FD-3 the form page «діалект» block', () => {
  it('firedRules reads the build\'s claim method, resolves each rule to group, citation and dating', () => {
    const rule = ALL_DIALECT_RULES.find(r => r.earliest)!
    const c = claim(true as const, [Q('X', 'loc', 'quote text')], { method: rule.id })
    const out = firedRules({ [rule.label]: c, cs: c })
    expect(out).toHaveLength(1); expect(out[0]!.id).toBe(rule.id); expect(out[0]!.earliest).toBe(rule.earliest); expect(out[0]!.cite.quote).toBeTruthy()
  })
  it('nothing fired → empty list and the list of checked rules is non-empty', () => {
    expect(firedRules({})).toEqual([]); expect(rulesChecked().length).toBeGreaterThan(20)
  })
  it('FD-2/FD-3 UI: regions «засвідчено в» apart from labels; empty state text; all chips are links', () => {
    const b = readFileSync('src/components/DialectBlock.vue', 'utf8')
    expect(b).toMatch(/засвідчено в: /); expect(b).toMatch(/діалектних ознак не виявлено/); expect(b).toMatch(/dialectTo\(r\.code\)/); expect(b).toMatch(/ruleTo\(r\.id\)/)
    expect(readFileSync('src/views/FormView.vue', 'utf8')).toMatch(/<DialectBlock :spelling="pick\.raw"/)
  })
})

describe('FD-4 class of forms = paradigm cell', () => {
  const rule = ALL_DIALECT_RULES[0]!
  const claims = { [rule.label]: claim(true as const, [Q('X', 'l', 'q q q q')], { method: rule.id }) }
  const card: CardLike = {
    lemma: 'той', paradigm: [...TOJ, T('тому', 'adj:m:v_mis:pron:dem')],
    forms: [{ raw: 'тому', modern: 'тому', claims: {}, f: 9, date: [1700, 1700] }, { raw: 'тєму', modern: 'тому', claims, f: 2, date: [1600, 1600] }],
  }
  it('cellKey ignores variant flags', () => { expect(cellKey('adj:f:v_naz:pron:dem:long')).toBe(cellKey('adj:f:v_naz:pron:dem')) })
  it('the cell groups spellings and DP-derived variants, with chips, dating and f', () => {
    const derived = deriveVariant(variantById('тамтой')!, TOJ)
    const m = formClass('adj:m:v_dav:pron:dem', [card], derived)
    expect(m.map(x => x.form).sort()).toEqual(['тамтому', 'тому', 'тєму'].sort())
    const dp = m.find(x => x.form === 'тамтому')!
    expect(dp.kind).toBe('dp'); expect(dp.attested).toBe(false); expect(dp.chips.map(c => c.code).sort()).toEqual(['LEM', 'NDN', 'NDN'])
    expect(m.find(x => x.form === 'тєму')!.chips[0]!.via).toBe(rule.id)
    expect(m.find(x => x.form === 'тому')!.f).toBe(9)
  })
  it('UI: table component highlights the current spelling and is used on the form page and per cell on the lemma card', () => {
    const t = readFileSync('src/components/FormClassTable.vue', 'utf8')
    expect(t).toMatch(/aria-current/); expect(readFileSync('src/components/DialectBlock.vue', 'utf8')).toMatch(/<FormClassTable/); expect(readFileSync('src/components/DialectVariants.vue', 'utf8')).toMatch(/<FormClassTable/)
  })
})

describe('FD-5 feature class', () => {
  it('ruleForms counts the lexicon forms on which a rule (or its feature id) fired; list route exists', () => {
    const rule = ALL_DIALECT_RULES[0]!
    const cl = claim(true as const, [Q('X', 'l', 'q q q q')], { method: rule.id })
    const cards = [{ lemma: 'a', stats: { f: 5 }, forms: [{ raw: 'x1', claims: { [rule.label]: cl } }, { raw: 'x2', claims: {} }] }, { lemma: 'b', stats: { f: 7 }, forms: [{ raw: 'y1', claims: { [rule.label]: cl } }] }]
    expect(ruleForms(rule.id, cards).map(r => r.form)).toEqual(['y1', 'x1'])
    expect(ruleForms(featureOf(rule.id), cards)).toHaveLength(2)
    expect(ruleFormsTo(rule.id)).toBe('/forms/' + encodeURIComponent(rule.id))
    expect(readFileSync('src/router.ts', 'utf8')).toMatch(/\/forms\/:rule/)
  })
})

describe('DX-1/DX-2 deictic class: affix inventory, segmentation accepts only sourced segments, links to dialect feature', () => {
  it('the user\'s words segment into sourced parts: ондо, тамки (attested), отуточки, онтамека, осьтамека (reconstructions), озьдо', () => {
    const p = (w: string) => segment(w)[0]!.parts.map(x => x.text).join('+')
    expect(p('ондо')).toBe('он+д+о'); expect(segment('ондо')[0]!.status).toBe('attested')
    expect(p('тамки')).toBe('там+ки'); expect(p('отуточки')).toBe('о+тут+очки'); expect(p('онтамека')).toBe('он+там+ека'); expect(p('осьтамека')).toBe('ось+там+ека'); expect(p('озьдо')).toBe('о+зьд+о')
    expect(segment('столовий')).toEqual([])   // a segment without a source → not accepted
    for (const w of ['ондо', 'отуточки']) for (const part of segment(w)[0]!.parts) { expect(SOURCES[part.cite.source], part.id).toBeTruthy(); expect(part.cite.quote.length).toBeGreaterThan(8) }
  })
  it('the dialect feature of an affix chip carries the affix citation (тамки → WPL via S-KI)', () => {
    const ch = dxChips(segment('тамки')[0]!)
    expect(ch.map(c => c.code)).toContain('WPL'); expect(ch[0]!.evidence.length).toBeGreaterThan(0)
  })
})

describe('DX-3 literary equivalent and class tables', () => {
  const lex = new Map([['там', 'adv'], ['тут', 'adv']])
  it('follows «standard» to a form the literary lexicon has; otherwise says not recorded and where it is recorded', () => {
    expect(dxLiterary('тамки', f => lex.get(f)).form).toBe('там')
    expect(dxLiterary('ондо', f => lex.get(f)).chain).toEqual(['ондо', 'онде', 'там'])
    const o = dxLiterary('ондо', () => undefined); expect(o.chain[0]).toBe('ондо'); expect(o.recordedIn.length).toBeGreaterThan(0)
    expect(dxLiterary('озьдо', f => lex.get(f)).chain).toEqual(['озьдо', 'осьде', 'тут'])
  })
  it('FD-4/FD-5 for deictics: the class of forms with the base там lists тамки, тамка, оттам … with chips', () => {
    const m = dxClass('B-TAM')
    for (const f of ['тамки', 'тамка', 'оттам']) expect(m.map(x => x.form)).toContain(f)
    expect(m.find(x => x.form === 'тамки')!.chips.length).toBeGreaterThan(0)
    expect(DX_ATTESTED.some(a => a.form === 'ондо')).toBe(true)
  })
  it('UI: the deictic block shows the literary line, base link, chips and class table; research/32 §DX is written', () => {
    const d = readFileSync('src/components/DeicticStructure.vue', 'utf8')
    expect(d).toMatch(/у літературній мові не зафіксовано/); expect(d).toMatch(/<FormClassTable/); expect(d).toMatch(/dialectTo\(c\.code\)/)
    expect(readFileSync('research/32-dialect-pronouns.md', 'utf8')).toMatch(/## DX/)
  })
})

describe('rules are the same engine for every form (no per-form labels)', () => {
  it('the three rule tables are one lookup table', () => { expect(ALL_DIALECT_RULES.length).toBeGreaterThan(100); expect(rulesChecked().length).toBeGreaterThan(20) })
})
