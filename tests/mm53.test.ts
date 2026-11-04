/**
 * SPEC 63 MM-53 (owner file «ісповна має вести до сповна і проблема з символом.png») and MM-54 (owner remark «має вести до слушає і слухає», input «слушаєть», Грамота XIV ст. № 14, 1352).
 * (a) a Church Slavonic mark over the first letter (U+0486 psili etc.) is stripped before the rules and the IPA, and an unknown sign is shown by its code point, never as an empty «»;
 * (b) R25 ис-/из- > с-/з-, R26 3sg -еть/-єть > -е/-є, R27 слуш- ~ слух-: all scope L (the plain branch stays, VESUM decides).
 */
import { describe, it, expect } from 'vitest'
import { derive } from '../core/phonology.ts'
import { toIpa } from '../core/ipa.ts'
import { normalizeOld, showChar } from '../core/text.ts'
import { candidateGrade } from '../src/lib/analyze-grade.ts'

const forms = (w: string) => derive(w).candidates.map(c => c.form)
describe('MM-53 symbol', () => {
  for (const mark of ['҆', '̓', '̔', '҃', '͂']) {
    it(`U+${mark.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} over и is stripped by the normaliser and the IPA`, () => {
      const w = 'и' + mark + 'сполна'
      expect(normalizeOld(w).norm).toBe('исполна')
      const r = toIpa(w)
      expect(r.flags.filter(f => f.includes('невідомий знак'))).toEqual([])
      expect(r.ipa).toBe(toIpa('исполна').ipa)
    })
  }
  it('an unknown sign is reported by its code point', () => {
    expect(showChar('҆')).toBe('U+0486'); expect(showChar('​')).toBe('U+200B'); expect(showChar('q')).toBe('q')
    expect(toIpa('а​').flags.some(f => f.includes('«U+200B»'))).toBe(true)
  })
})
describe('MM-53 R25 ис-/из- > с-/з-', () => {
  it('исполна → сповна (branch beside ісповна); испытати → спитати; изгадати → згадати', () => {
    expect(forms('и҆сполна')).toContain('сповна'); expect(forms('исполна')).toContain('ісповна')
    expect(forms('испытати')).toContain('спитати'); expect(forms('изгадати')).toContain('згадати')
    expect(derive('исполна').candidates.find(c => c.form === 'сповна')!.trace).toEqual(['R25', 'R16'])
  })
  it('guards: иск- root, -ъ nouns, исход-, and a participle ӕ are not folded', () => {
    expect(forms('искати')).not.toContain('скати'); expect(forms('исходъ')).not.toContain('сход')
    expect(forms('изведъ')).not.toContain('звід'); expect(forms('изнемогаӕ')).not.toContain('знемога')
  })
})
describe('MM-54 R26 / R27', () => {
  it('слушаєть → слушає and слухає (both candidates), несеть → несе; the IV class keeps -ить', () => {
    const f = forms('слушаєть'); expect(f).toContain('слушає'); expect(f).toContain('слухає')
    expect(forms('несеть')).toContain('несе'); expect(forms('живеть')).toContain('живе')
    expect(forms('говоритъ').every(x => x.endsWith('ит'))).toBe(true)
  })
  it('слушати ~ слухати, послушати → послухати; the root is not rewritten before a consonant (слушний stays)', () => {
    expect(forms('слушати')).toContain('слухати'); expect(forms('послушати')).toContain('послухати')
    expect(forms('слушний')).not.toContain('слухний')
  })
  it('grades: слухає is «зіставлено» with the reason; слушає is a historical form; neither says «підтверджено»', () => {
    const c = (w: string, f: string) => derive(w).candidates.find(x => x.form === f)!
    const a = candidateGrade(c('слушаєть', 'слухає').trace, 'слухає', true)!, b = candidateGrade(c('слушаєть', 'слушає').trace, 'слушає', false)!
    expect(a.note).toContain('зіставлено'); expect(a.note).toContain('Слу́хати'); expect(a.note).not.toContain('підтверджено')
    expect(b.label).toBe('історична форма'); expect(b.note).toContain('слушати')
    expect(candidateGrade(c('исполна', 'сповна').trace, 'сповна', true)!.note).toContain('СПОЛНА')
  })
})

import { Bloom } from '../core/bloom.ts'
import { emptyLex, runDetectors, ALL_RULES, GATED_IDS } from '../src/lib/analyze.ts'
import { key } from '../core/text.ts'
describe('MM-53 VESUM membership oracle (the orange banner)', () => {
  const b = Bloom.create(3, 2000); for (const w of ['сповна', 'слухає', 'вода']) b.add(w)
  const rt = Bloom.fromBytes(b.toBytes())
  it('the Bloom filter round-trips with no false negative', () => { for (const w of ['сповна', 'слухає', 'вода']) expect(rt.has(w)).toBe(true); expect(rt.has('ісповна')).toBe(false) })
  it('without the oracle the gated rules stay off (banner); an absent word runs them; a present word keeps them off but is no longer «unknown»', () => {
    const d = emptyLex()
    expect(runDetectors('ісповна', d).oracle).toBeUndefined()
    expect(runDetectors('ісповна', d).gated.length).toBeGreaterThan(0)
    const has = (f: string) => rt.has(key(f))
    const absent = runDetectors('ісповна', { ...d, inVesum: has })
    expect(absent.oracle).toBe('absent'); expect(absent.gated).toEqual([])
    const present = runDetectors('сповна', { ...d, inVesum: has })
    expect(present.oracle).toBe('present'); expect(present.gated.length).toBe(ALL_RULES.filter(r => r.axis === 'dialect' || GATED_IDS.has(r.id)).length)
  })
})

import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
describe('MM-53 vesum.bloom reaches production and is fetched only by /analyze', () => {
  it('the file is committed (tracked, not git-ignored), so `git checkout -- public/data` keeps it and the Pages build serves it', () => {
    expect(existsSync('public/data/vesum.bloom')).toBe(true)
    expect(execSync('git ls-files public/data/vesum.bloom').toString().trim()).toBe('public/data/vesum.bloom')
    expect(execSync('git check-ignore public/data/vesum.bloom || true').toString().trim()).toBe('')
  })
  it('only AnalyzeView calls the loader, only on mount of the page (not when embedded)', () => {
    const v = readFileSync('src/views/AnalyzeView.vue', 'utf8')
    expect(v).toMatch(/onMounted\(\(\) => \{ if \(props\.embed === undefined\) void loadVesumBloom\(\) \}\)/)
    expect(v).not.toMatch(/^void loadVesumBloom/m)
    const users = execSync('git grep -l "loadVesumBloom" -- src').toString().trim().split(/\r?\n/).sort()
    expect(users).toEqual(['src/lib/vesumBloom.ts', 'src/views/AnalyzeView.vue'])
  })
})
