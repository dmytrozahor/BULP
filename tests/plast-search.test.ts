/** SL-2 search: Plast vocabulary is findable from the search box (user 2026-10-15: «why can't i find вишкіл, впр which are in plast lexicon?»). */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { plastSearch, sociolectFile } from '../src/lib/sociolectData.ts'

sociolectFile.value = JSON.parse(readFileSync('public/data/sociolect.json', 'utf8'))

describe('SL-2 Plast entries are searchable', () => {
  it('finds вишкіл and впр case-insensitively, headword hits before gloss hits', () => {
    const v = plastSearch('вишкіл')
    expect(v[0]!.w.toLowerCase()).toBe('вишкіл')
    expect(v.some(e => e.byGloss)).toBe(true)                 // «Крайовий вишкільний табір» etc. via the quoted gloss
    expect(plastSearch('впр').map(e => e.w)).toContain('ВПР')
    expect(plastSearch('ВПР')[0]!.g).toMatch(/пластового року/)
  })
  it('every hit carries its own source id for the in-site /source card', () => {
    for (const e of plastSearch('табір')) expect(e.src).toMatch(/^[A-Z0-9]+$/)
  })
})
