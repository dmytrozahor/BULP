/** BL-18: more Maksymovych 1834 songs, the максимовичівка folds (ENC um43) and the authored-song vocabulary policy. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SONGS } from '../core/songs.ts'
import { fold, foldById } from '../core/orthography.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
import { MANIFEST } from '../pipelines/manifest.ts'
import { vocabOf, LYRICS_SOURCES } from '../pipelines/song-vocab.ts'

describe('BL-18 folk songs and максимовичівка', () => {
  const forms = (raw: string) => fold(raw, 'максимовичівка').map(c => c.form)
  it('folds ô ê ѣ ъ ы ё to modern spelling (cited ENC um43)', () => {
    expect(forms('мо̂й')).toContain('мій')
    expect(forms('ро̂дну')).toContain('рідну')
    expect(forms('горѣ')).toContain('горі')
    expect(forms('ѣхавъ')).toEqual(expect.arrayContaining(['їхав', 'іхав']))
    expect(forms('въ')).toContain('в')
    expect(forms('малыхъ')).toContain('малих')
    expect(forms('ёго')).toContain('його')
    expect(forms('кровъю')).toContain("кров'ю")
    for (const f of fold('мо̂й', 'максимовичівка').flatMap(c => c.trace)) expect(foldById[f]!.cite.kind).toBe('Q')
  })
  it('every Maksymovych song is an admissible institutional «народна пісня» witness dated by the print, with a Q-checked page quote', () => {
    const us = MANIFEST.filter(u => u.orth === 'максимовичівка' && u.id.startsWith('song_')), a = authorById['folk_maksymovych']!
    expect(us.map(u => u.id).sort()).toEqual(['song_baida', 'song_yikhav', 'song_zasvystaly', 'song_zazhuryla', 'song_zhentsi'])
    expect(a.label).toBe('institutional'); expect(admissible(a)).toBe(true)
    for (const u of us) {
      expect(u.date).toEqual([1834, 1834]); expect(SONGS.find(s => s.witness === u.id), u.id).toBeTruthy()
      const cache = `data/raw/wikisource/${u.id}/000.html`
      if (existsSync(cache) && u.author === 'folk_maksymovych') {
        expect(readFileSync(cache, 'utf8').includes(u.dateCite.quote), u.id).toBe(true)   // the scan index name is in the rendered page's transclusion data
      }
    }
  })
  it('authored-song vocabulary: counts only, alphabetical, no running text; an unlinked form is counted, not guessed', () => {
    const v = vocabOf(LYRICS_SOURCES['hey-hu-hey-ha']!, new Map([['чорти', { n: 3, lemma: 'чорт' }], ['життя', { n: 2, lemma: 'життя' }], ['чортів', { n: 1, lemma: 'чорт' }], ['ґьо', { n: 1 }]]))
    expect(v).toMatchObject({ tokens: 7, linked: 6, unresolved: [['ґьо', 1]] })
    expect(v.lemmas).toEqual([['життя', 2, [['життя', 2]]], ['чорт', 4, [['чорти', 3], ['чортів', 1]]]])
    expect(Object.keys(v)).toEqual(['source', 'tokens', 'linked', 'lemmas', 'unresolved'])
    for (const s of SONGS.filter(s => LYRICS_SOURCES[s.id])) { expect(s.kind, s.id).toBe('authored'); expect(s.licence).not.toBe('pd-text') }
  })
})
