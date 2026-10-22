/** SPEC 60 NW-7 (research/17 R3): folk song witness (PD print) + song metadata; lyrics policy ≤ 2 quoted lines for authored text. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { ARTISTS, SONGS, quoteLines } from '../core/songs.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
import { MANIFEST } from '../pipelines/manifest.ts'
import { admit } from '../pipelines/build-annotate.ts'

describe('NW-7 songs', () => {
  it('NW-7 lyrics policy: authored songs carry at most 2 quoted lines, never audio; the licence tag matches', () => {
    for (const s of SONGS) {
      for (const q of s.quotes) { expect(quoteLines(q.text), s.id).toBeLessThanOrEqual(2); expect(q.evidence.kind).toBe('Q'); expect(q.evidence.quote).toBe(q.text) }
      if (s.kind === 'authored' && s.licence === 'pd-text') expect(s.witness && s.id === 'duma-mazepy', s.id).toBeTruthy()   // SG-3: the only authored text in the public domain (XVII c.)
      else if (s.kind === 'authored') expect(s.licence, s.id).not.toBe('pd-text')
      if (s.licence === 'pd-text') expect(s.witness, s.id).toBeTruthy()
      expect(s.evidence.length, s.id).toBeGreaterThan(0)
      for (const m of s.media) { expect(m.id).toMatch(/^[\w-]{11}$/); expect(m.url).toBe('https://www.youtube.com/watch?v=' + m.id); expect(m.verified).toMatch(/^2026-10-\d\d$/) }
    }
    expect(SONGS.length).toBeGreaterThanOrEqual(10); expect(new Set(SONGS.map(s => s.id)).size).toBe(SONGS.length)
    expect(ARTISTS.every(a => a.quote.length > 10 && a.channel.startsWith('https://www.youtube.com/@'))).toBe(true)
  })
  it('NW-7 the YouTube ids of research/17 are media metadata, the verified Хорея upload is flagged as a third-party upload', () => {
    const k = SONGS.find(s => s.id === 'kniazhat-roskykh')!
    expect(k.media[0]).toMatchObject({ id: 'CGxJMG-W-LY', uploader: 'Luzanov Illia' }); expect(k.note).toContain('сторонній')
    expect(SONGS.find(s => s.id === 'duma-pro-baturyn')!.kind).toBe('authored')   // not an old folk duma (research/17)
  })
  it('NW-7 folk witness: institutional «народна пісня», provisional with two Q evidences; Maksymovych 1834 dated by the print, with media', () => {
    const a = authorById['folk_hetmanate']!, u = MANIFEST.find(x => x.id === 'song_zhentsi')!
    expect(a.label).toBe('institutional'); expect(admissible(a)).toBe(true); expect(a.evidence.filter(e => e.kind === 'Q')).toHaveLength(2)
    expect(u.date).toEqual([1834, 1834]); expect(u.dateCite.quote).toContain('1834'); expect(u.media).toMatchObject({ kind: 'youtube', id: 'ojtOxnv8CL0' })
    expect(admit({ id: u.id, author: u.author }, a).ok).toBe(true)
    expect(SONGS.find(s => s.witness === 'song_zhentsi')!.earliest!.date).toBe('1834')
  })
  const cache = 'data/raw/wikisource/song_zhentsi/000.html'
  it.skipIf(!existsSync(cache))('NW-7 vetting and dating quotes are verbatim in the cached page; the editor\'s Russian footnote is not ingested', () => {
    const h = readFileSync(cache, 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    for (const e of [...authorById['folk_hetmanate']!.evidence, MANIFEST.find(x => x.id === 'song_zhentsi')!.dateCite]) expect(h.includes(e.quote), e.quote).toBe(true)
    if (existsSync('data/work/song_zhentsi.json')) {
      const w = JSON.parse(readFileSync('data/work/song_zhentsi.json', 'utf8')) as { tokens: { raw: string }[] }
      expect(w.tokens.some(t => t.raw.startsWith('Дорош'))).toBe(true)   // in the song
      expect(w.tokens.some(t => t.raw === 'Ярополчѣ' || t.raw === 'Волоколамскаго')).toBe(false)
    }
  })
})
