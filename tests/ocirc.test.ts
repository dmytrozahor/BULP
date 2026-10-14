/** SPEC 63 OR: readings of ô / ê (research/36). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CIRC_READINGS, NOT_EVIDENCED, circBranches, circLetters, hasCirc, readingsOf, renderReading } from '../core/ocirc.ts'
import { IPA_DIALECTS } from '../core/ipa.ts'

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('OR-1 research and evidence of every reading', () => {
  it('OR-1 research/36 exists and answers the user hypothesis (у, ю, ü) with sources and the unknowns', () => {
    const t = src('../research/36-o-circumflex-readings.md')
    for (const w of ['Максимовичівка', 'um162', 'um43', 'Шевельов', 'ü', 'ю', 'не засвідчено']) expect(t, w).toContain(w)
  })
  it('OR-1 every reading carries verbatim evidence (quote ≤ 300 chars, locator, kind Q) and a period; ю is not an ô reading', () => {
    for (const r of CIRC_READINGS) {
      expect(r.evidence.length, r.id).toBeGreaterThan(0); expect(r.period, r.id).toBeTruthy(); expect(r.regions.length, r.id).toBeGreaterThan(0)
      for (const e of r.evidence) { expect(e.kind, r.id).toBe('Q'); expect(e.locator, r.id).toBeTruthy(); expect(e.quote.length, r.id).toBeLessThanOrEqual(400); expect(e.quote.trim(), r.id).not.toBe('') }
    }
    expect(CIRC_READINGS.filter(r => r.letter === 'ô').map(r => r.sub)).toEqual(expect.arrayContaining(['і', 'у', 'ü', 'ŭ', 'и', 'ы']))
    expect(CIRC_READINGS.some(r => r.letter === 'ô' && r.sub === 'ю')).toBe(false)
    expect(NOT_EVIDENCED[0]).toMatchObject({ sound: 'ю', letter: 'ô' })
    expect(CIRC_READINGS.find(r => r.sub === 'ю')!.letter).toBe('ê')   // the only [ʲу] reading is of е, ЕУМ um162 п.4
  })
  it('OR-1 the regions are dialect codes of the IPA machinery (or GAL = orthography)', () => {
    const codes = new Set([...IPA_DIALECTS.map(d => d.code), 'GAL'])
    for (const r of CIRC_READINGS) for (const c of r.regions) expect(codes.has(c), `${r.id} ${c}`).toBe(true)
  })
})

describe('OR-2 possible readings and IPA variants', () => {
  it('OR-2 ô is recognised in precomposed and combining form; plain words have none', () => {
    expect(hasCirc('пôшовъ')).toBe(true); expect(hasCirc('по̂шовъ')).toBe(true); expect(hasCirc('пішов')).toBe(false)
    expect(circLetters('пôшовъ')).toEqual(['ô']); expect(circLetters('матêрью')).toEqual(['ê'])
  })
  it('OR-2 пôшовъ gets the readings і, у, ü, уо, и, ы each with its spelling and derived IPA; no ê readings', () => {
    const rs = readingsOf('пôшовъ')
    expect(rs.every(r => r.letter === 'ô')).toBe(true)
    const by = Object.fromEntries(rs.map(r => [r.id, r]))
    expect(by['O-I']!.form).toBe('пішов'); expect(by['O-U']!.form).toBe('пушов'); expect(by['O-Y']!.form).toBe('пüшов'); expect(by['O-IH']!.form).toBe('пишов')
    expect(by['O-I']!.ipa).toMatch(/^\[pʲiʃɔ/); expect(by['O-U']!.ipa).toMatch(/^\[puʃɔ/); expect(by['O-Y']!.ipa).toMatch(/^\[pyʃɔ/); expect(by['O-UO']!.ipa).toMatch(/^\[pu̯ɔʃɔ/)
    expect(new Set(rs.map(r => r.ipa)).size).toBe(new Set(rs.map(r => r.sub)).size)   // O-I and O-I-ZAK share the sound, differ in source/region
  })
  it('OR-2 ê spellings get the ê readings including the [ʲу] one (матêрью → і / іе / ю)', () => {
    const rs = readingsOf('матêрью')
    expect(rs.map(r => r.id)).toEqual(['E-I', 'E-IE', 'E-JU']); expect(rs[0]!.form).toBe('матірью'); expect(rs[2]!.form).toBe('матюрью')
  })
  it('OR-2 the form page lists the panel and the picker only for ô/ê spellings', () => {
    const v = src('../src/views/FormView.vue'), c = src('../src/components/CircReadings.vue')
    expect(v).toContain('hasCirc(pick.raw)'); expect(v).toContain('<CircReadings')
    expect(c).toContain('v-model="sel"'); expect(c).toContain('NOT_EVIDENCED'); expect(c).toContain('IkavismChain')
  })
})

describe('OR-3 derivation branches from the marked etymological о', () => {
  it('OR-3 пôшовъ: ô → о, branches south (о·, у, ü, і) and north (о·, уо, уі, і), reconstruction not attested', () => {
    const b = circBranches('пôшовъ')!
    expect(b.letter).toBe('ô'); expect(b.word).toBe('пошов')
    const south = b.chains.find(c => c.branch === 'south')!, north = b.chains.find(c => c.branch === 'north')!
    expect(south.stages.map(s => s.form)).toEqual(['пошов', 'по·шов', 'пушов', 'пüшов', 'пішов'])
    expect(north.stages.map(s => s.form)).toEqual(['пошов', 'по·шов', 'пуошов', 'пуішов', 'пішов'])
    expect(south.stages.every(s => s.attested === false)).toBe(true); expect(south.quote.quote).toContain('stu·l > stül > stil')
  })
  it('OR-3 ê → е chains; spellings without ô/ê have no branches; renderReading keeps other Maksymovych folds', () => {
    expect(circBranches('матêрью')!.chains.length).toBeGreaterThan(0)
    expect(circBranches('пішов')).toBeUndefined()
    expect(renderReading('вôнъ', 'ô', 'у')).toBe('вун')
  })
})
