/** BL-18 / BL-6c against the built public/data (skipped when the data are absent). */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { bucketOf, unpackShard } from '../core/shard.ts'
import { LYRICS_SOURCES } from '../pipelines/song-vocab.ts'

describe.skipIf(!existsSync('public/data/lex/0.json'))('BL-6c real shard: byW sums to the form f', () => {
  it('every spelling of a few lemmas has byW with Σ = f', () => {
    let checked = 0
    for (const l of ['вода', 'земля', 'рука', 'козак']) {
      const p = `public/data/lex/${bucketOf(l)}.json`; if (!existsSync(p)) continue
      const d = unpackShard(JSON.parse(readFileSync(p, 'utf8'))).get(l); if (!d) continue
      for (const f of d.forms) { expect(f.byW, l).toBeTruthy(); expect(Object.values(f.byW!).reduce((a, b) => a + b, 0), l + ' #' + d.forms.indexOf(f)).toBe(f.f); checked++ }
    }
    expect(checked).toBeGreaterThan(3)
  })
})

describe.skipIf(!existsSync('public/data/songs.json'))('BL-18 built songs.json', () => {
  it('vocab holds counts only (no text field), alphabetical; folk songs link to their witnesses', () => {
    const d = JSON.parse(readFileSync('public/data/songs.json', 'utf8')) as { vocab: Record<string, { tokens: number; lemmas: [string, number, [string, number][]][]; unresolved: [string, number][] }>; songs: { id: string; witness?: string; quotes: { text: string }[] }[] }
    expect(Object.keys(d.vocab).sort()).toEqual(Object.keys(LYRICS_SOURCES).sort())
    for (const [id, v] of Object.entries(d.vocab)) {
      expect(Object.keys(v).sort(), id).toEqual(['lemmas', 'linked', 'source', 'tokens', 'unresolved'])
      expect(v.lemmas.reduce((s, l) => s + l[1], 0) + v.unresolved.reduce((s, u) => s + u[1], 0), id).toBe(v.tokens)
      expect(v.lemmas.map(l => l[0]), id).toEqual([...v.lemmas.map(l => l[0])].sort((a, b) => a.localeCompare(b, 'uk')))
      expect(d.songs.find(s => s.id === id)!.quotes.every(q => q.text.split(/\s*\/\s*|\n/).length <= 2)).toBe(true)
    }
    expect(d.songs.filter(s => s.witness && s.id !== 'duma-mazepy' && s.id !== 'mykolay-1690s').length).toBe(5)   // SG-3 adds one full-text authored song and SRC-28 the owner's 1690s notated-songbook song (not Maksymovych); the 5 Maksymovych 1834 folk songs stay exactly 5
  })
})
