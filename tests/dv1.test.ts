/** SPEC 63 DV-5 / DV-6 (the coordinator's DV-1 / DV-1b): bulk dialect variants (dict / rule / hypothesis), the owner files, the numeral map. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { DV_EXPLORED, DV_PRECISION, DV_RULES, DV_SHIP_PRECISION, hypothesisOk, isSwapPair, ownerEvidence, parseOwnerTsv, singleGloss, subs, withoutRejected, dvRuleById } from '../core/dialect-variants.ts'
import { dialectLexPairs, hypothesisPairs, ownerTsvPairs } from '../core/corr-src.ts'
import { plain } from '../core/corr.ts'
import { NO_DATA, NUM_COLS, byColumn, colOfArea, coverage, mergeCells, respellForms, type NumeralMap } from '../core/numeral-map.ts'
import { CARD_LEMMAS, ORD_LEMMAS } from '../core/numeral-lists.ts'
import { VARIANT_FAMILIES } from '../core/variant-families.ts'

const shipped = new Set(Object.entries(DV_PRECISION).filter(([, p]) => p.c / p.n >= DV_SHIP_PRECISION).map(([r]) => r))
const VES: Record<string, string[]> = { чотири: ['numr'], один: ['numr'], що: ['conj'], життя: ['noun'], кіт: ['noun'], кит: ['noun'], життям: ['noun'] }
const posOf = (w: string) => (VES[plain(w)] ? new Set(VES[plain(w)]) : undefined)

describe('DV-5 the correspondences', () => {
  it('subs replaces each place and all places at once, at the start / end on demand', () => {
    expect(subs('шчоб', 'шч', 'щ')).toEqual(['щоб'])
    expect(subs('єдєн', 'є', 'о').sort()).toEqual(['єдон', 'одєн', 'одон'].sort())
    expect(subs('мусєт', 'єт', 'ить', 'final')).toEqual(['мусить'])
    expect(subs('єтє', 'є', 'я', 'init')).toEqual(['ятє'])
  })
  it('the shipped rules produce the owner-named and the attested forms', () => {
    const g = (id: string, w: string) => dvRuleById[id]!.gen(w)
    expect(g('DV-CHOT-SHT', 'штири')).toContain('чотири'); expect(g('DV-CHOT-SHT', 'штери')).toContain('чотири'); expect(g('DV-CHOT-SHT', 'штирьох')).toContain('чотирьох')
    expect(g('DV-JE-JA-INIT', 'єкий')).toContain('який')
    expect(g('DV-JE-JA-END', 'людєх')).toContain('людях'); expect(g('DV-JE-JA-END', 'життєм')).toContain('життям')
    expect(g('DV-SHCH', 'шчо')).toContain('що')
  })
  it('only rules at the hand-checked precision are shipped; the explored ones never are', () => {
    for (const r of shipped) expect(DV_RULES.some(x => x.id === r), r).toBe(true)
    for (const r of DV_EXPLORED) expect(shipped.has(r.id), r.id + ' is explored, must not ship').toBe(false)
    for (const [r, p] of Object.entries(DV_PRECISION)) expect(p.n, r).toBeGreaterThanOrEqual(2)
  })
  it('a hypothesis is refused for a VESUM-known form, a non-normative target, an и/і swap, a rare form, a rule below the bar', () => {
    const base = { form: 'шчо', f: 100, nW: 5, vesumKnown: false, targetNormative: true, targetPos: ['conj'], target: 'що', ruleId: 'DV-SHCH' }
    const sh = new Set(['DV-SHCH'])
    expect(hypothesisOk(base, sh).ok).toBe(true)
    expect(hypothesisOk({ ...base, vesumKnown: true }, sh).ok).toBe(false)
    expect(hypothesisOk({ ...base, targetNormative: false }, sh).ok).toBe(false)
    expect(hypothesisOk({ ...base, form: 'кіт', target: 'кит' }, sh).ok).toBe(false)
    expect(hypothesisOk({ ...base, f: 4 }, sh).ok).toBe(false); expect(hypothesisOk({ ...base, nW: 1 }, sh).ok).toBe(false)
    expect(hypothesisOk(base, new Set()).ok).toBe(false)
    expect(isSwapPair('кит', 'кіт')).toBe(true)
  })
  it('dictionary glosses: one word or «Те саме, що X»; a multi-word gloss is not a gloss', () => {
    expect(singleGloss('Чотири')).toBe('чотири'); expect(singleGloss('Те саме, що чотири.')).toBe('чотири'); expect(singleGloss('Те саме як один')).toBe('один')
    expect(singleGloss('дві штуки')).toBeUndefined(); expect(singleGloss('')).toBeUndefined()
  })
})

describe('DV-5 owner files', () => {
  it('parses the TSV, ignores comments, normalises case', () => {
    expect(parseOwnerTsv('# c\nЄден\tОдин\tГаличина\tодин єден\n\nбез\n')).toEqual([{ form: 'єден', target: 'один', area: 'Галичина', remark: 'один єден' }])
  })
  it('a rejected line never reappears; a confirmed line is owner evidence of kind P', () => {
    const rej = parseOwnerTsv('шчо\tщо\n')
    expect(withoutRejected([{ form: 'шчо', target: 'щоб' }, { form: 'шчо', target: 'що' }], rej)).toHaveLength(1)
    expect(withoutRejected([{ form: 'шчо', target: 'щоб' }], rej)).toHaveLength(1)
    const ev = ownerEvidence({ form: 'єден', target: 'один', area: 'Галичина', remark: 'один єден теж галицка риса' })
    expect(ev.kind).toBe('P'); expect(JSON.stringify(ev)).toContain('за свідченням носія')
  })
  it('the committed files exist and parse', () => {
    for (const f of ['variants-confirmed.tsv', 'variants-rejected.tsv']) { expect(existsSync(`data/owner/${f}`), f).toBe(true); expect(() => parseOwnerTsv(readFileSync(`data/owner/${f}`, 'utf8'))).not.toThrow() }
  })
  it('a confirmed line becomes an owner-graded CR-1 pair; a target outside VESUM is refused', () => {
    const rej: Record<string, number> = {}
    const p = ownerTsvPairs([{ form: 'шчо', target: 'що', area: 'Галичина', remark: '' }, { form: 'xx', target: 'невідоме', area: '', remark: '' }], posOf, rej)
    expect(p).toHaveLength(1); expect(p[0]!.src).toBe('owner'); expect(p[0]!.areaB![0]!.grade).toBe('owner'); expect(p[0]!.ev.kind).toBe('P')
  })
})

describe('DV-5 hypotheses in CR-1', () => {
  const row = { form: 'життєм', target: 'життя', method: 'hypothesis' as const, grade: 'hyp' as const, via: 'DV-JE-JA-END', pos: 'noun', f: 160, nW: 20, regions: [['Галичина', 100]] as [string, number][] }
  it('a hypothesis pair is graded «гіпотеза», unspec (never bridges groups) and never redirects a VESUM form', () => {
    const rej: Record<string, number> = {}
    const p = hypothesisPairs([row, { ...row, form: 'життям' }], posOf, rej)
    expect(p).toHaveLength(1); expect(p[0]!.sense).toBe('unspec'); expect(p[0]!.areaB![0]!.grade).toBe('hyp'); expect(p[0]!.ev.note).toContain('гіпотеза')
    expect(rej['dv1-hyp: guard']).toBe(1)
  })
  it('the committed hypotheses file: every row has a shipped rule, f ≥ 5 in ≥ 2 witnesses, never a swap pair', () => {
    if (!existsSync('data/dv/hypotheses.json')) return
    const j = JSON.parse(readFileSync('data/dv/hypotheses.json', 'utf8')) as { shipped: string[]; rows: { form: string; target: string; via: string; f: number; nW: number }[] }
    for (const r of j.rows) { expect(j.shipped).toContain(r.via); expect(r.f).toBeGreaterThanOrEqual(5); expect(r.nW).toBeGreaterThanOrEqual(2); expect(isSwapPair(r.form, r.target)).toBe(false) }
  })
  it('numerals get a POS from a one-class gloss (штири ~ чотири)', () => {
    const p = dialectLexPairs([{ w: ['штири'], gloss: 'чотири', codes: ['HUT'], src: 'Гуцульські говірки', loc: 'с.1', q: 'штири — чотири' }], posOf, {})
    expect(p).toHaveLength(1); expect(p[0]!.pos).toBe('numr'); expect(p[0]!.areaB![0]!.grade).toBe('dict')
  })
})

describe('DV-6 numeral map', () => {
  const m: NumeralMap = { format: 1, generated: '', cols: NUM_COLS, rows: [
    { lemma: 'чотири', kind: 'card', cells: [
      { std: 'чотири', form: 'штири', col: 'HUT', grade: 'dict', cite: 'Гуцульські' }, { std: 'чотири', form: 'штери', col: 'ANY', grade: 'owner', cite: 'носій' },
      { std: 'чотири', form: 'шчотири', col: 'COR', grade: 'hyp', cite: 'корпус', f: 7, nW: 3 }] },
    { lemma: 'два', kind: 'card', cells: [] }] }
  it('coverage counts (lemma, column) cells by the strongest grade; an empty numeral is «немає даних»', () => {
    const c = coverage(m)
    expect(c.cellsTotal).toBe(2 * NUM_COLS.length); expect(c.cellsFilled).toBe(3); expect(c.byGrade).toEqual({ dict: 1, owner: 1, hyp: 1 }); expect(NO_DATA).toBe('немає даних')
    expect(byColumn(m.rows[1]!)).toEqual([])
  })
  it('forward respelling uses only a cited dictionary form or the owner’s, never a hypothesis', () => {
    expect(respellForms(m.rows[0]!, 'COR')).toEqual([]); expect(respellForms(m.rows[0]!, 'HUT').map(c => c.form)).toEqual(['штири']); expect(respellForms(m.rows[0]!, 'ANY').map(c => c.form)).toEqual(['штери'])
  })
  it('mergeCells keeps the strongest grade and joins the cites; colOfArea reads the dictionary areas', () => {
    const x = mergeCells([{ std: 'один', form: 'єден', col: 'GAL', grade: 'hyp', cite: 'a' }, { std: 'один', form: 'єден', col: 'GAL', grade: 'owner', cite: 'b' }])
    expect(x).toHaveLength(1); expect(x[0]!.grade).toBe('owner'); expect(x[0]!.cite).toBe('a · b')
    expect(colOfArea('Бойківщина (бойк.)')).toBe('BOY'); expect(colOfArea('Буковина')).toBe('BUK'); expect(colOfArea('діалектне')).toBe('ANY')
  })
  it('the lists are the numeral lemmas; the owner-named forms are in the families (not duplicated here)', () => {
    expect(CARD_LEMMAS).toContain('чотири'); expect(ORD_LEMMAS).toContain('перший')
    const forms = VARIANT_FAMILIES.filter(f => CARD_LEMMAS.includes(f.head)).flatMap(f => f.members.map(x => x.form))
    expect(forms).toEqual(expect.arrayContaining(['штири', 'штери', 'єден']))
  })
  it('the committed numeral map: no cell repeats the standard form; corpus cells are hypotheses with their numbers', () => {
    if (!existsSync('public/data/dv/numerals.json')) return
    const j = JSON.parse(readFileSync('public/data/dv/numerals.json', 'utf8')) as NumeralMap
    for (const r of j.rows) for (const c of r.cells) { expect(c.form).not.toBe(c.std); if (c.col === 'COR') { expect(c.grade).toBe('hyp'); expect(c.f ?? 0).toBeGreaterThanOrEqual(5) } }
    expect(existsSync('analysis/dialect-numerals.md')).toBe(true)
  })
})
