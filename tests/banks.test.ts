/** SPEC 60 BK-1 (core/banks.ts) and BK-2 (BankChip) — research/20 §3–§4. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { BANK_FEATURES, BANK_CALIBRATION, BANK_CALIBRATION_NOTE, BANK_EXPLAIN, bankScore, type BankInput } from '../core/banks.ts'
import { isKnown } from '../core/evidence.ts'

const LEX: Record<string, { lemma: string; tags: string }[]> = {
  час: [{ lemma: 'час', tags: 'noun:inanim:m:v_naz' }], джерело: [{ lemma: 'джерело', tags: 'noun:inanim:n:v_naz' }],
  носить: [{ lemma: 'носити', tags: 'verb:imperf:pres:s:3' }], фабрика: [{ lemma: 'фабрика', tags: 'noun:inanim:f:v_naz' }],
}
const lex = { vesum: (_f: string) => [] as { lemma: string; tags: string }[], inLexicon: (f: string) => LEX[f] ?? [] }
const sc = (inputs: BankInput[]) => bankScore(inputs, lex)

describe('BK-1 feature table (research/20 §3)', () => {
  it('has the 17 cited features, each with a source quote and locator', () => {
    expect(BANK_FEATURES).toHaveLength(17)
    expect(new Set(BANK_FEATURES.map(f => f.id)).size).toBe(17)
    for (const f of BANK_FEATURES) { expect(f.cite.quote.length, f.id).toBeGreaterThan(10); expect(f.cite.locator, f.id).toBeTruthy(); expect(['Q', 'P']).toContain(f.cite.kind) }
  })
  it('rows that cannot fire from one spelling say why; weight-0 row is ignored', () => {
    for (const f of BANK_FEATURES.filter(x => !x.test)) expect(f.why, f.id).toBeTruthy()
    expect(BANK_FEATURES.find(f => f.id === 'BK-N-LV')!.weight).toBe(0)
  })
  it('dated rows carry the dating source; undated rows fall back to 1798', () => {
    for (const f of BANK_FEATURES.filter(x => x.earliest !== undefined)) expect(f.datedBy, f.id).toBeTruthy()
    expect(BANK_FEATURES.find(f => f.id === 'BK-SW-EOU')!.earliest).toBeUndefined()
  })
  it('the calibration constant is flagged as the project\'s choice', () => {
    expect(BANK_CALIBRATION).toBe(0.8); expect(BANK_CALIBRATION_NOTE).toContain('проєктна константа'); expect(BANK_CALIBRATION_NOTE).toContain('не з джерела')
  })
})

describe('BK-1 scoring model (research/20 §4)', () => {
  it('Zynoviiv 1705: hard ц + marked soft р give SE (Left bank), agreeing with the editors\' Чернігівщина', () => {
    const r = sc([{ form: 'птыца', year: 1705 }, { form: 'гончар’', year: 1705 }])
    expect(r.status).toBe('scored'); expect(r.type).toBe('SE'); expect(r.pSE).toBeGreaterThan(0.5)
    expect(r.matched.map(h => h.feature.id).sort()).toEqual(['BK-N-HARDC', 'BK-SE-RSOFT'])
    expect(isKnown(r.claim) && r.claim.evidence.length).toBe(4)   // cite + trigger per feature (P-1.4)
    expect(r.claim.method).toContain('проєктна константа')
  })
  it('fewer than two rows of weight ≥ 2 → insufficient evidence, no number-bearing claim', () => {
    const r = sc([{ form: 'птыца', year: 1705 }])
    expect(r.status).toBe('insufficient'); expect(r.claim.value).toBe('unknown'); expect(r.strong).toBe(1)
    expect(sc([]).status).toBe('insufficient')
  })
  it('date gate: a feature does not count in a text older than its earliest date, and is reported as gated off', () => {
    const r = sc([{ form: 'птыца', year: 1650 }, { form: 'гончар’', year: 1650 }])   // RSOFT ≥ 1700, HARDC (undated) ≥ 1798
    expect(r.matched).toHaveLength(0); expect(r.gatedOff.sort()).toEqual(['BK-N-HARDC', 'BK-SE-RSOFT']); expect(r.status).toBe('insufficient')
    expect(sc([{ form: 'гончар’', year: 1699 }]).gatedOff).toEqual(['BK-SE-RSOFT'])
    expect(sc([{ form: 'гончар’', year: 1700 }]).matched).toHaveLength(1)
  })
  it('SW side: а→і after a hushing consonant (XV c.) + -оў (1798) give SW; -оў is gated in 1650', () => {
    expect(sc([{ form: 'чіс', year: 1650 }, { form: 'рукоў', year: 1650 }]).gatedOff).toEqual(['BK-SW-EOU'])
    const r = sc([{ form: 'чіс', year: 1850 }, { form: 'рукоў', year: 1850 }])
    expect(r.type).toBe('SW'); expect(r.pSW).toBeGreaterThan(0.9); expect(r.pSE + r.pSW).toBeCloseTo(1)
    expect(sc([{ form: 'чіс', year: 1401 }]).matched).toHaveLength(1); expect(sc([{ form: 'чіс', year: 1400 }]).gatedOff).toEqual(['BK-SW-A>E'])
  })
  it('scribal-norm texts count at half weight', () => {
    const full = sc([{ form: 'чіс', year: 1850 }, { form: 'рукоў', year: 1850 }]), half = sc([{ form: 'чіс', year: 1850, scribal: true }, { form: 'рукоў', year: 1850, scribal: true }])
    expect(half.logit).toBeCloseTo(full.logit / 2); expect(half.matched.every(h => h.half)).toBe(true)
  })
  it('a feature counts once even when several spellings show it; the full-weight match wins over a scribal one', () => {
    const r = sc([{ form: 'птыца', year: 1850, scribal: true }, { form: 'синица', year: 1850 }, { form: 'гончар’', year: 1850 }])
    expect(r.matched.filter(h => h.feature.id === 'BK-N-HARDC')).toHaveLength(1)
    expect(r.matched.find(h => h.feature.id === 'BK-N-HARDC')!.half).toBe(false)
  })
  it('SE lexicon-backed rows: ф→х, no affricate, 3sg -е', () => {
    expect(sc([{ form: 'хабрика', year: 1900 }]).matched.map(h => h.feature.id)).toEqual(['BK-SE-F>X'])
    expect(sc([{ form: 'хабрика', year: 1750 }]).gatedOff).toEqual(['BK-SE-F>X'])
    expect(sc([{ form: 'жерело', year: 1900 }]).matched.map(h => h.feature.id)).toEqual(['BK-SE-NOAFFR'])
    expect(sc([{ form: 'жерело', year: 1699 }]).gatedOff).toEqual(['BK-SE-NOAFFR'])
    expect(sc([{ form: 'зерно', year: 1900 }]).matched).toHaveLength(0)   // no ВЕСУМ counterpart ⇒ nothing fires (P-3.1)
    expect(sc([{ form: 'носе', year: 1800 }]).matched.map(h => h.feature.id)).toEqual(['BK-SE-VERB'])
    expect(sc([{ form: 'носе', year: 1650 }]).gatedOff).toEqual(['BK-SE-VERB'])
  })
  it('a normative form never matches; user input without a year is treated as contemporary', () => {
    const l2 = { ...lex, vesum: () => [{ lemma: 'птиця', tags: 'noun:anim:f:v_naz' }] }
    expect(bankScore([{ form: 'птыца', year: 1900 }], l2).matched).toHaveLength(0)
    expect(sc([{ form: 'птыца' }, { form: 'гончар’' }]).type).toBe('SE')
  })
})

describe('BK-2 chip: «тип: південно-західний / південно-східний» with the SW-vs-SE-not-Dnipro explanation', () => {
  it('the explanation says the split is dialectal, not the Dnipro banks, and the central Right bank is SE', () => {
    expect(BANK_EXPLAIN.text).toContain('а не «правий/лівий берег Дніпра»'); expect(BANK_EXPLAIN.text).toContain('Центральне Правобережжя'); expect(BANK_EXPLAIN.evidence[0]!.quote).toContain('Фастів')
  })
  it('BankChip is wired into the word card and the annotator popover', () => {
    const chip = readFileSync('src/components/BankChip.vue', 'utf8')
    expect(chip).toContain('тип:'); expect(chip).toContain('південно-західний'); expect(chip).toContain('південно-східний'); expect(chip).toContain('BANK_EXPLAIN')
    expect(readFileSync('src/views/WordView.vue', 'utf8')).toContain('<BankChip')
    expect(readFileSync('src/components/WordCard.vue', 'utf8')).toContain('<BankChip')
  })
})
