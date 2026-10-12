/** SPEC 60 LW-1…LW-3 (core/loanwords.ts, LoanChip) — research/26. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { isKnown } from '../core/evidence.ts'
import { analyzeLoan, DONOR_N, LOAN_CV, LOAN_CV_NOTE, LOAN_RULES, WK_LABELS, rank, type LabelLookup } from '../core/loanwords.ts'
import { SOURCES } from '../core/sources.ts'

const rd = (f: string) => readFileSync(f, 'utf8')
const donorOf = (w: string) => { const c = analyzeLoan(w).claims[0]; return c && isKnown(c) ? c.value.donor : undefined }

describe('LW-1 rule table', () => {
  it('every row is cited (source registered, quote, locator) and carries its validation counts', () => {
    expect(new Set(LOAN_RULES.map(r => r.id)).size).toBe(LOAN_RULES.length)
    for (const r of LOAN_RULES) {
      expect(SOURCES[r.cite.source], r.id).toBeTruthy(); expect(r.cite.quote.length, r.id).toBeGreaterThan(10); expect(r.cite.locator, r.id).toBeTruthy()
      expect(Number.isInteger(r.total) && r.total >= 0, r.id).toBe(true)
      expect(Object.keys(r.per).every(d => d in DONOR_N), r.id).toBe(true)
    }
  })
  it('class A rows are exactly the near-deterministic ones (≥ 90 % one donor, n ≥ 10, or all 5 of -дло)', () => {
    const A = LOAN_RULES.filter(r => r.weight === 'A'); expect(A.map(r => r.id).sort()).toEqual(['L-S06', 'L-S07', 'L-S09', 'L-S24'])
    for (const r of A) { const top = Math.max(...Object.values(r.per) as number[]); expect(top / r.total, r.id).toBeGreaterThanOrEqual(0.9) }
  })
  it('-інг → English is a claim with the rule cite, the Wiktionary count and the input (P-1.4); method LOAN-<id>', () => {
    const a = analyzeLoan('маркетинг', { labels: () => undefined }); const c = a.claims[0]!
    expect(isKnown(c) && c.value.donor).toBe('en'); expect(c.method).toBe('LOAN-L-S07'); expect(c.evidence.map(e => e.source)).toEqual(['WPUK', 'WKEN', 'INPUT']); expect(c.score).toBe(1)
    expect(a.status).toBe('claim')
  })
  it('-унок → Polish, -дло → Polish, -аж → French (with native exceptions страж, продаж)', () => {
    expect(donorOf('подарунок')).toBe('pl'); expect(donorOf('бидло')).toBe('pl'); expect(donorOf('гараж')).toBe('fr')
    expect(donorOf('продаж')).toBeUndefined(); expect(donorOf('страж')).toBeUndefined()
  })
  it('B/C/N rows never produce a claim — only hints (-ізм, ґ-, -ація, -ітет)', () => {
    for (const w of ['пацифізм', 'ґанок', 'нація', 'агітація', 'університет', 'штурм', 'сенатор']) { const a = analyzeLoan(w, { labels: () => undefined }); expect(a.claims, w).toEqual([]); expect(a.hints.length, w).toBeGreaterThan(0) }
  })
  it('a native-prone ending alone does not make a word foreign (the gate): лист, ум, вино, чабан-type ending alone', () => {
    for (const w of ['лист', 'розум', 'вино', 'хата', 'дівчина']) expect(analyzeLoan(w, { labels: () => undefined }).foreign, w).toBe(false)
  })
})

describe('LW-1 classifier as ranked hypotheses with its CV accuracy', () => {
  it('shows top-1 37 % / top-2 53 % (5-fold, n = 3 116) and says it is a hypothesis', () => {
    expect(LOAN_CV.top1).toBeCloseTo(0.37, 2); expect(LOAN_CV.top2).toBeCloseTo(0.53, 2); expect(LOAN_CV.n).toBe(3116)
    expect(LOAN_CV_NOTE).toContain('37 %'); expect(LOAN_CV_NOTE).toContain('53 %'); expect(LOAN_CV_NOTE).toContain('гіпотеза')
  })
  it('probabilities are ranked, sum to 1, and are produced only for foreign words', () => {
    const r = rank(LOAN_RULES.filter(x => x.id === 'L-S01')); expect(r[0]!.donor).toBe('de')
    expect(r.reduce((a, h) => a + h.p, 0)).toBeCloseTo(1, 6); expect(r.every((h, i) => !i || r[i - 1]!.p >= h.p)).toBe(true)
    expect(analyzeLoan('хата').hypotheses).toEqual([])
    expect(analyzeLoan('мітинг', { labels: () => undefined }).hypotheses[0]!.donor).toBe('en')
    expect(analyzeLoan('рахунок', { labels: () => undefined }).hypotheses[0]!.donor).toBe('pl')
  })
})

describe('LW-2 Wiktionary donor labels as D-evidence', () => {
  it('університет: the label (de, en.wiktionary quote) is the answer; the -ітет rule agrees (no conflict)', () => {
    const a = analyzeLoan('університет'); expect(a.status).toBe('label')
    const l = a.label!; expect(isKnown(l) && l.value.donor).toBe('de'); expect(l.evidence[0]!.quote).toBe('Borrowed from German Universität, from Latin ūniversitās'); expect(l.evidence[0]!.note).toContain('CC BY-SA')
    expect(a.conflict).toBeUndefined()
  })
  it('a label and a rule that disagree are both shown, not resolved', () => {
    const lab: LabelLookup = () => WK_LABELS.get('нація') // pl
    const a = analyzeLoan('маркетинг', { labels: lab })
    expect(a.label).toBeTruthy(); expect(a.claims).toHaveLength(1); expect(a.conflict).toEqual({ rule: 'L-S07', ruleDonors: ['en'], labelDonor: 'pl' })
  })
  it('without labels in the data the rules alone speak', () => {
    const a = analyzeLoan('університет', { labels: () => undefined }); expect(a.label).toBeUndefined(); expect(a.status).toBe('hypothesis')
  })
  it('seed labels are all evidenced (Q or D) from en.wiktionary', () => {
    expect(WK_LABELS.size).toBeGreaterThanOrEqual(10)
    for (const [, c] of WK_LABELS) { expect(c.evidence.length).toBeGreaterThan(0); expect(c.evidence[0]!.source).toBe('WKEN') }
  })
})

describe('LW-3 U-27 -ітет / -іті', () => {
  it('університет: -ітет path = Latin -itas via German/Polish/Russian, the form cannot choose', () => {
    const h = analyzeLoan('університет').hints.find(x => x.rule === 'L-S01')!
    expect(h.ultimate).toBe('la'); expect(h.via).toEqual(['de', 'pl', 'ru']); expect(h.path).toContain('проміжну мову за формою не визначити')
  })
  it('екстремітет: hypothesis only — no claim, no label, flagged as a hypothetical form', () => {
    const a = analyzeLoan('екстремітет', { attested: false })
    expect(a.claims).toEqual([]); expect(a.label).toBeUndefined(); expect(a.status).toBe('hypothesis'); expect(a.hypotheticalForm).toBe(true)
    expect(a.hints.some(h => h.rule === 'L-S01')).toBe(true); expect(a.hypotheses.length).toBeGreaterThan(0)
  })
  it('екстремі-ті: the English -ity transliteration hint, [U], no counts in Wiktionary', () => {
    const a = analyzeLoan('екстремі-ті', { attested: false }); const h = a.hints.find(x => x.rule === 'L-S01b')!
    expect(h.via).toEqual(['en']); expect(h.counts).toContain('[U]'); expect(a.claims).toEqual([]); expect(a.hypotheticalForm).toBe(true)
  })
  it('екстремізм (attested in Wiktionary) is not a hypothetical form', () => { expect(analyzeLoan('екстремізм', { attested: true }).hypotheticalForm).toBe(false) })
})

describe('LW surfaces', () => {
  it('LoanChip is on the word view, the annotator popover and /analyze and shows the CV accuracy', () => {
    const c = rd('src/components/LoanChip.vue'); expect(c).toContain('LOAN_CV_NOTE'); expect(c).toContain('гіпотетична форма')
    for (const f of ['src/views/WordView.vue', 'src/components/WordCard.vue', 'src/views/AnalyzeView.vue']) expect(rd(f), f).toContain('<LoanChip')
  })
})
