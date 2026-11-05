/** SPEC 63 DV-7: historical variant forms of standard lemmas per dialect group (core/dialect-hist.ts, pipelines/dv7-scan.ts, build-dv7.ts). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { HF, HF_NOISE, classOf, editOf, foldBoth, groupOfRegion, isPureOrth, skewOf, GROUPS, GROUP_NAME, type HistForm, type HistRow } from '../core/dialect-hist.ts'
import { histPairs } from '../core/corr-src.ts'
import { assemble, checkGroup, plain } from '../core/corr.ts'
import { shape } from '../pipelines/build-dv7.ts'

const posOf = (w: string) => ({ питання: new Set(['noun']), дорога: new Set(['noun']), кіт: new Set(['noun']) } as Record<string, Set<string>>)[plain(w)]
const form = (o: Partial<HistForm>): HistForm => ({ l: 'питання', v: 'питаня', t: 'питання', c: 'geminate', via: 'direct', r: ['ORTH-GAL-GEM'], n: 40, nw: 10, reg: { halychyna: [40, 10, 1886, 'w1'] }, ...o })

describe('DV-7 orthography is folded out, what remains is classified', () => {
  it('ѣ ъ ы ї are folded, so a pure spelling difference is not a form difference', () => {
    expect(foldBoth('сѣно')).toBe(foldBoth('село'.replace('ло', 'но').replace('се', 'се')))
    expect(foldBoth('рѣкъ')).toBe(foldBoth('рек'))
    expect(foldBoth('мирный')).toBe(foldBoth('мирний'))
  })
  it('classOf names the edit; two or more edits, or an unclassifiable one, give no class', () => {
    expect(classOf(foldBoth('питаня'), foldBoth('питання'))).toBe('geminate')
    expect(classOf('прац' + 'и', 'прац' + 'і')).toBe('vowel-yi')
    expect(classOf('вандровати', 'вандрувати')).toBe('vowel-oi')
    expect(classOf(foldBoth('конь'), foldBoth('кінь'))).toBe('vowel-oi'); expect(classOf('абвгд', 'ежзик')).toBeUndefined()
    expect(editOf('abcdef', 'xyzuvw')).toBeUndefined()
    expect(HF_NOISE.has('other')).toBe(true)
  })
  it('a chain made only of spelling rules is orthography; a chain with a form rule is not', () => {
    expect(isPureOrth(['ORTH-ZHEL-SOFT', 'R11'])).toBe(true)
    expect(isPureOrth(['ORTH-ZHEL-TY', 'ORTH-GAL-GEM'])).toBe(false)
    expect(isPureOrth([])).toBe(false)
  })
})

describe('DV-7 regions, groups and the skew', () => {
  it('a region is filed under its dialect group; a place abroad and a region without a group have none', () => {
    expect(groupOfRegion('halychyna')).toBe('NDN'); expect(groupOfRegion('slobozhanshchyna')).toBe('SLB'); expect(groupOfRegion('bukovyna')).toBe('PKB'); expect(groupOfRegion('katerynoslavshchyna')).toBe('STP')
    expect(groupOfRegion('abroad-winnipeg')).toBeUndefined(); expect(groupOfRegion('kyiv')).toBeUndefined()
  })
  it('a skew needs the tokens, the witnesses, the share AND a share well above the region’s part of the corpus', () => {
    const bg = { halychyna: 600, slobozhanshchyna: 30, volyn: 10 }
    const f = (reg: HistForm['reg'], n: number) => skewOf({ n, reg }, bg, 640)
    expect(f({ volyn: [40, 5, 1700, 'a'] }, 44)?.region).toBe('volyn')
    expect(f({ halychyna: [40, 5, 1800, 'a'], slobozhanshchyna: [4, 1, 1900, 'b'] }, 44)).toBeUndefined()   // 91 % but only 1.5 × a region that is 94 % of the corpus: share 0.91 < 1.5 × 0.94
    expect(f({ volyn: [20, 5, 1700, 'a'] }, 20)).toBeUndefined()   // under HF.tokens
    expect(f({ volyn: [40, 2, 1700, 'a'] }, 40)).toBeUndefined()   // under HF.witnesses
    expect(HF.tokens).toBe(30)
  })
})

describe('DV-7 shaping: the gates and the grades', () => {
  const bg = { halychyna: 600, slobozhanshchyna: 300, zakarpattia: 10 }
  it('only a direct / TOROT link ships; a lemma by token or by the model does not (4 of 5 wrong in the first check)', () => {
    expect(shape([form({}), form({ via: 'token' }), form({ via: 'stanza-lemma', v: 'x' })], bg)).toHaveLength(1)
  })
  it('a hypothesis needs ≥ 2 witnesses in the region; a dictionary lists it → dict; a skew → corpus', () => {
    const one = shape([form({ reg: { halychyna: [5, 1, 1886, 'w'] } })], bg)
    expect(one).toHaveLength(0)
    const hyp = shape([form({ reg: { halychyna: [5, 3, 1886, 'w'], slobozhanshchyna: [5, 3, 1890, 'v'] }, n: 10 })], bg)
    expect(hyp[0]!.areas.map(a => a.grade)).toEqual(['hyp', 'hyp']); expect(hyp[0]!.first).toMatchObject({ y: 1886 })
    const d = shape([form({ dict: [['Бойківщина', 'Онишкевич', 'с.1', 'питаня — питання']] })], bg)
    expect(d[0]!.areas.some(a => a.g === 'BOY' && a.grade === 'dict')).toBe(true)
    const sk = shape([form({ reg: { zakarpattia: [40, 6, 1700, 'z'] }, n: 40 })], bg)
    expect(sk[0]!.areas[0]).toMatchObject({ g: 'ZAK', grade: 'corpus' })
  })
  it('a rule or a form the spot check dropped for a group, and a form the owner rejected, does not ship', () => {
    const f = form({ reg: { halychyna: [5, 3, 1886, 'w'] }, n: 5 })
    expect(shape([f], bg, { NDN: ['ORTH-GAL-GEM'] })).toHaveLength(0)
    expect(shape([f], bg, {}, new Set(), { NDN: ['питання|питаня'] })).toHaveLength(0)
    expect(shape([f], bg, {}, new Set(['питаня\u0001питання']))).toHaveLength(0)
  })
})

describe('DV-7 in CR-1', () => {
  const row: HistRow = { l: 'питання', v: 'питаня', t: 'питання', c: 'geminate', r: ['ORTH-GAL-GEM'], n: 197, nw: 52, first: { y: 1886, w: 'zhel1886', region: 'halychyna' },
    areas: [{ g: 'NDN', grade: 'corpus', region: 'halychyna', tokens: 180, witnesses: 40, share: 0.91, y: 1886, w: 'zhel1886' }] }
  it('the variant is a member of the lemma’s group with its first fixation and a corpus area worded as a distribution', () => {
    const rej: Record<string, number> = {}
    const pairs = histPairs([row, { ...row, v: 'кіт', t: 'кіт' }], posOf, rej, c => (c === 'halychyna' ? 'Галичина' : c))
    expect(pairs).toHaveLength(1); expect(rej['dv7: guard']).toBe(1)
    const { groups } = assemble(pairs)
    const m = groups[0]!.members.find(x => x.form === 'питаня')!
    expect(m.first).toMatchObject({ year: 1886, label: 'Галичина' }); expect(m.areas[0]!.grade).toBe('corpus'); expect(m.areas[0]!.dialect).toBe('Галичина')
    expect(() => checkGroup(groups[0]!)).not.toThrow()
  })
  it('a variant that VESUM knows, or a lemma VESUM does not know, is refused (кит / кіт)', () => {
    const rej: Record<string, number> = {}
    expect(histPairs([{ ...row, v: 'дорога' }, { ...row, l: 'невідоме' }], posOf, rej, c => c)).toHaveLength(0)
  })
})

describe('DV-7 the committed data and the report', () => {
  it('hist-forms.json: every row has an area, no noise class, a corpus area passes the thresholds, the file is small', () => {
    const p = 'data/dv/hist-forms.json'; if (!existsSync(p)) return
    expect(statSync(p).size).toBeLessThan(1_500_000)
    const j = JSON.parse(readFileSync(p, 'utf8')) as { rows: HistRow[] }
    expect(j.rows.length).toBeGreaterThan(100)
    for (const r of j.rows) {
      expect(r.areas.length, r.v).toBeGreaterThan(0); expect(HF_NOISE.has(r.c), r.v).toBe(false); expect(r.v).not.toBe(r.t); expect(foldBoth(r.v)).not.toBe(foldBoth(r.t))
      for (const a of r.areas) { expect(GROUPS).toContain(a.g); if (a.grade === 'corpus') { expect(a.tokens!).toBeGreaterThanOrEqual(HF.tokens); expect(a.witnesses!).toBeGreaterThanOrEqual(HF.witnesses); expect(a.share!).toBeGreaterThanOrEqual(HF.share) } }
    }
  })
  it('the spot check: no group with a sample of 20 or more is above 10 % wrong; the report names every group and the thin ones', () => {
    const p = 'data/dv/hist-spotcheck.json'; if (!existsSync(p)) return
    const s = JSON.parse(readFileSync(p, 'utf8')) as Record<string, { checked: number; wrong: number }>
    for (const [g, x] of Object.entries(s)) if (x.checked >= 20) expect(x.wrong / x.checked, g).toBeLessThanOrEqual(0.1)
    const md = readFileSync('analysis/dialect-historical-forms.md', 'utf8')
    for (const g of GROUPS) expect(md, g).toContain(GROUP_NAME[g]!)
    expect(md).toContain('Групи, де джерел замало'); expect(md).toContain('діалект слова')
  })
})
