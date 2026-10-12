import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { derivatives, PREFIXES, attach, prefixById, type Has } from '../core/derivation.ts'

const src = (p: string) => readFileSync(p, 'utf8')

/** VESUM mocked: the oracle answers for a fixed set of forms (DV-2 keeps only attested ones, the rest are suggestions) */
const VESUM = new Set(['переділати', 'відділати', 'відділатися', 'розділати', 'зробити', 'списати', "від'їхати", 'зібгати'])
const has: Has = f => (VESUM.has(f) ? 'vesum' : null)
const by = (lemma: string, h: Has = has) => derivatives(lemma, h)
const find = (lemma: string, form: string) => by(lemma).find(d => d.form === form)

describe('DV-1 prefix table', () => {
  it('every row carries a cite; § 31 rows are Q with weight 1, weight-0 rows are hints', () => {
    for (const p of PREFIXES) { expect(p.cite.quote.length, p.id).toBeGreaterThan(5); expect(p.cite.source).toBe('PRAV') }
    expect(PREFIXES.filter(p => p.weight === 1).every(p => p.cite.kind === 'Q')).toBe(true)
    expect(PREFIXES.filter(p => p.weight === 0).some(p => p.cite.kind === 'P')).toBe(true)
  })
  it('lists the prefixes of SPEC 60 DV-1', () => {
    for (const x of ['з-', 'роз-', 'без-', 'від-', 'од-', 'ви-', 'при-', 'пре-', 'прі-', 'пере-', 'на-', 'за-', 'по-', 'у-', 'в-', 'об-', 'під-', 'над-', 'до-', 'недо-', 'перед-', 'про-'])
      expect(PREFIXES.some(p => p.prefix === x), x).toBe(true)
  })
  it('з- → с- before к п т ф х, зі- before a consonant cluster, з- otherwise (§ 31.1)', () => {
    expect(attach(prefixById['PFX-Z']!, 'казати').form).toBe('сказати')
    expect(attach(prefixById['PFX-Z']!, 'писати').form).toBe('списати')
    expect(attach(prefixById['PFX-Z']!, 'бгати').form).toBe('зібгати')
    expect(attach(prefixById['PFX-Z']!, 'ділати').form).toBe('зділати')
  })
  it('no voicing alternation: роз-/від-/під- stay (§ 31.2)', () => {
    expect(attach(prefixById['PFX-ROZ']!, 'тягнути').form).toBe('розтягнути')
    expect(attach(prefixById['PFX-VID']!, 'дати').form).toBe('віддати')
  })
  it('apostrophe after a prefix ending in a consonant before я ю є ї (§ 7 п.4)', () => {
    expect(attach(prefixById['PFX-VID']!, 'їхати').form).toBe("від'їхати")
    expect(attach(prefixById['PFX-Z']!, 'явити').form).toBe("з'явити")
    expect(attach(prefixById['PFX-PERE']!, 'їхати').form).toBe('переїхати')
  })
})

describe('DV-3 word card block and /derive prefix mode', () => {
  it('DV-3 DerivativesBlock «Похідні» is included in WordCard and /derive has the prefix mode', () => {
    expect(src('src/components/DerivativesBlock.vue')).toContain('Похідні')
    expect(src('src/components/DerivativesBlock.vue')).toContain('✓ ВЕСУМ')
    expect(src('src/components/WordCard.vue')).toContain('<DerivativesBlock')
    expect(src('src/views/DeriveView.vue')).toContain("dir === 'prefix'")
  })
})

describe('DV-2 derivatives(lemma)', () => {
  it('ділати → зділати, переділати, відділати, відділатися (U-1)', () => {
    const forms = by('ділати').map(d => d.form)
    for (const f of ['зділати', 'переділати', 'відділати', 'відділатися']) expect(forms, f).toContain(f)
  })
  it('attested ones carry VESUM D-evidence; the others are method=derivation suggestions', () => {
    const a = find('ділати', 'переділати')!, s = find('ділати', 'зділати')!
    expect(a.status).toBe('vesum'); expect(a.claim.method).toBeUndefined()
    expect(a.claim.evidence.some(e => e.kind === 'D' && e.source === 'VESUM')).toBe(true)
    expect(s.status).toBe('suggestion'); expect(s.claim.method).toBe('derivation')
    expect(s.claim.evidence.length).toBeGreaterThanOrEqual(2)   // P-1.4: rule cite + triggering data
  })
  it('attested forms are ranked before suggestions', () => {
    const r = by('ділати'), firstSug = r.findIndex(d => d.status === 'suggestion'), lastAtt = r.map(d => d.status).lastIndexOf('vesum')
    expect(lastAtt).toBeLessThan(firstSug)
  })
  it('weight-0 prefixes give hints, § 31 prefixes do not', () => {
    expect(find('ділати', 'переділати')!.hint).toBe(true)
    expect(find('ділати', 'відділати')!.hint).toBe(false)
  })
  it('reflexive input -ся derives from the base', () => {
    expect(by('ділатися').map(d => d.form)).toContain('переділати')
  })
  it("з- allomorph (писати → списати) and the apostrophe candidate від'їхати from їхати", () => {
    expect(find('писати', 'списати')!.status).toBe('vesum')
    expect(find('їхати', "від'їхати")!.status).toBe('vesum')
    expect(find('їхати', "від'їхати")!.claim.evidence.some(e => e.locator.includes('§ 7'))).toBe(true)
  })
  it('a noun yields only attested derivatives, no suggestions', () => {
    expect(derivatives('дім', f => (f === 'передім' ? 'corpus' : null)).map(d => d.form)).toEqual(['передім'])
    expect(derivatives('дім', () => null)).toEqual([])
  })
  it('closed prefix прі- gives only its listed words', () => {
    expect(derivatives('вище', f => (f === 'прізвище' ? 'vesum' : null))).toEqual([])
    expect(derivatives('звище', f => (f === 'прізвище' ? 'vesum' : null)).map(d => d.form)).toEqual(['прізвище'])
    expect(derivatives('ділати', () => null).some(d => d.prefix === 'прі-')).toBe(false)
  })
})
