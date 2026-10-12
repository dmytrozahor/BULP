/** SPEC 60 DX-1…DX-3 (core/deictics.ts, DeicticStructure block) — research/24. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DX_ATTESTED, DX_PARTS, segment } from '../core/deictics.ts'
import { SOURCES } from '../core/sources.ts'

const texts = (s: { parts: { text: string }[] }) => s.parts.map(p => p.text).join('+')

describe('DX-1 component inventory and segment()', () => {
  it('every part row has a cite with source, quote and locator; every source is registered', () => {
    for (const p of DX_PARTS) {
      expect(p.cite.quote.length, p.id).toBeGreaterThan(10); expect(p.cite.locator, p.id).toBeTruthy(); expect(['Q', 'P']).toContain(p.cite.kind)
      expect(SOURCES[p.cite.source], p.id).toBeTruthy()
    }
    const roles = new Set(DX_PARTS.map(p => p.role)); expect([...roles].sort()).toEqual(['base', 'prefix', 'suffix'])
  })
  it('segments the generic shape prefix + base + reinforcement + pointing', () => {
    expect(texts(segment('отуточки')[0]!)).toBe('о+тут+очки')
    expect(texts(segment('осьтамека')[0]!)).toBe('ось+там+ека')
    expect(texts(segment('онтамека')[0]!)).toBe('он+там+ека')
  })
  it('stress marks and the apostrophe spelling of soft з’ are normalised (оз’дечки = озьдечки)', () => {
    expect(segment('оз́ьдечки').length).toBeGreaterThan(0)
    expect(segment('оз’дечки')[0]!.form).toBe('озьдечки')
  })
  it('a bare base, an ordinary noun and a short base without prefix give nothing (P-3.1)', () => {
    for (const w of ['тут', 'там', 'тарілка', 'деко', 'дека', 'хата']) expect(segment(w), w).toEqual([])
  })
  it('reinforcement is labelled reinforcement, not diminutive, and both views are quoted', () => {
    const ki = DX_PARTS.find(p => p.id === 'S-KI')!
    expect(ki.kind).toBe('reinforcement'); expect(ki.note).toContain('Ум.'); expect(ki.cite.quote).toContain('не мають здрібніло-пестливого значення')
  })
  it('он- is regional: the reading of онтамека carries the WPL inversion note', () => {
    expect(segment('онтамека')[0]!.note).toContain('західнополіських')
  })
})

describe('DX-2 attested forms are claims, unattested compounds are reconstructions', () => {
  it('озьдо = о + сьде + о «ось тут» with the ЕСУМ quote (attested claim, no method)', () => {
    const s = segment('озьдо')[0]!
    expect(s.status).toBe('attested'); expect(s.reading).toBe('ось тут')
    expect(s.parts.map(p => p.id)).toEqual(['P-O', 'B-SDE', 'S-O'])
    expect(s.claim.method).toBeUndefined()
    expect(s.claim.evidence.some(e => e.source === 'ESUM' && e.quote.includes('о-сьде-о'))).toBe(true)
  })
  it('отутечки (Грінченко) is attested and is the pattern for отуточки', () => {
    const a = segment('отутечки')[0]!
    expect(a.status).toBe('attested'); expect(a.claim.evidence[0]!.source).toBe('HRINCH'); expect(a.claim.evidence[0]!.quote).toContain('отутечки')
  })
  it('отуточки, онтамека, осьтамека are reconstructions: method derivation, one cite per part, built from attested parts', () => {
    for (const [w, want] of [['отуточки', 'вотъ тут'], ['онтамека', 'он там'], ['осьтамека', 'ось там']] as const) {
      const s = segment(w)[0]!
      expect(s.status, w).toBe('reconstruction'); expect(s.claim.method, w).toBe('derivation')
      expect(s.reading.startsWith(want), w).toBe(true)
      for (const p of s.parts) expect(s.claim.evidence.some(e => e.quote === p.cite.quote), `${w}: ${p.id}`).toBe(true)
      expect(s.claim.evidence.at(-1)!.source).toBe('INPUT')
      expect(s.fullySupported, w).toBe(true)
      expect(s.support.every(x => x.attestedIn.length > 0), w).toBe(true)
    }
  })
  it('the Pinsk туточка is the only datum for -очк-; отуточки cites it', () => {
    const s = segment('отуточки')[0]!
    expect(s.support.find(x => x.part === 'S-KI')!.attestedIn).toContain('туточка')
  })
  it('no reconstruction is also listed as attested; every attested row concatenates to its form', () => {
    for (const a of DX_ATTESTED) {
      expect(a.parts.map(([, t]) => t).join(''), a.form).toBe(a.form)
      expect(a.evidence.length, a.form).toBeGreaterThan(0)
      expect(segment(a.form).every(s => s.status === 'attested'), a.form).toBe(true)
    }
  })
})

describe('DX-3 surfaces', () => {
  const rd = (f: string) => readFileSync(f, 'utf8')
  it('DeicticStructure «Будова» is in the word card, the annotator popover and /analyze', () => {
    expect(rd('src/components/DeicticStructure.vue')).toContain('Будова')
    expect(rd('src/components/WordCard.vue')).toContain('<DeicticStructure')
    expect(rd('src/views/WordView.vue')).toContain('<DeicticStructure')
    expect(rd('src/views/AnalyzeView.vue')).toContain('<DeicticStructure')
  })
  it('reconstructions are drawn dashed with the «реконструкція» badge, never as a dictionary form', () => {
    const v = rd('src/components/DeicticStructure.vue'); expect(v).toContain('реконструкція'); expect(v).toContain('derived')
  })
})
