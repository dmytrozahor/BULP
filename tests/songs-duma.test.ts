/** SPEC 63 SG-3: the «Дума» of Mazepa («Всі покою щире прагнуть…») — a public-domain authored text as a corpus witness (copy of Kochubei, Бантыш-Каменский 1859). */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SONGS } from '../core/songs.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold } from '../core/orthography.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
import { MANIFEST } from '../pipelines/manifest.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { chooseLemma, linkOptions, wantedKeys, type Env } from '../pipelines/build-link.ts'
import { parsePage } from '../pipelines/ingest-wikisource.ts'
import { vesumIndex, VESUM_TXT } from '../pipelines/vesum.ts'

const cache = 'data/raw/wikisource/song_duma_mazepy/000.html'
describe('SG-3 Дума Мазепи', () => {
  const u = MANIFEST.find(x => x.id === 'song_duma_mazepy')!, a = authorById['mazepa']!, s = SONGS.find(x => x.id === 'duma-mazepy')!
  it('SG-3 wiring: authored PD text as a witness, traditional attribution, accepted dating quoted with its source, modern performance only as media', () => {
    expect(s.kind).toBe('authored'); expect(s.licence).toBe('pd-text'); expect(s.witness).toBe('song_duma_mazepy'); expect(s.quotes).toEqual([])
    expect(s.authorship).toContain('традиційна атрибуція'); expect(s.earliest!.date).toBe('бл. 1698 (до 1708)')
    expect(u.date).toEqual([1698, 1698]); expect(u.msDate).toBe(1708); expect(u.orth).toBe('ярижка'); expect(u.region).toBe('Гетьманщина (Батурин)')
    expect(u.dateCite).toMatchObject({ kind: 'Q', source: 'OHL', quote: 'Загалом вважалося, що «Дума» була написана коло 1698 р.' })
    expect(u.edition).toContain('Бантыш-Каменский'); expect(u.edition).toContain('Меннінг')
    expect(a.label).toBe('ukrainian'); expect(admissible(a)).toBe(true); expect(a.evidence[0]!.kind).toBe('Q'); expect(admit({ id: u.id, author: u.author }, a).ok).toBe(true)
    expect(s.media[0]).toMatchObject({ id: 'H4ffNF0kAjI', role: 'arrangement' }); expect(s.note).toContain('не свідчення')
  })
  describe.skipIf(!existsSync(cache))('page cache', () => {
    const html = existsSync(cache) ? readFileSync(cache, 'utf8') : ''
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    it('SG-3 the author self-identification quote and the Kochubei provenance are verbatim in the cached page', () => {
      expect(plain.replace(/[­​]/g, '').includes(a.evidence[0]!.quote)).toBe(true)
      expect(plain).toContain('По списку руки черненья самаго Кочубея')
    })
    it('SG-3 the editor\'s heading and Kochubei\'s closing remark are not ingested; the text is', () => {
      const r = parsePage(html, 'x', 'song_duma_mazepy', 'mazepa'), raw = r.tokens.map(t => t.raw.toLowerCase())
      expect(raw.slice(0, 4)).toEqual(['всѣ', 'покою', 'щире', 'прагнуть']); expect(raw).not.toContain('архимандритъ'); expect(raw).not.toContain('государя'); expect(raw).toContain('украины')
    })
    // fixture linker: the same stage as the build (VESUM → fold ярижка → chooseLemma)
    it.skipIf(!existsSync(VESUM_TXT))('SG-3 linking: the corpus linker resolves most tokens (measured 201/257, 127 lemmas)', async () => {
      const raws = parsePage(html, 'x', 'song_duma_mazepy', 'mazepa').tokens.map(t => t.raw.normalize('NFC').toLowerCase())
      const types = [...new Set(raws)].map(raw => ({ lang: 'uk' as const, oldI: false, orth: 'ярижка', raw }))
      const derive = (x: string, oldI: boolean) => deriveRaw(x, { oldI })
      const forms = new Set<string>(); for (const t of types) for (const k of wantedKeys(t, { derive, fold })) forms.add(k)
      const env: Env = { hits: (await vesumIndex(forms, new Set())).hits, derive, fold }
      const lem = new Map(types.map(t => { const o = linkOptions(t, env); return [t.raw, o ? chooseLemma(o.opts, new Map())?.lemma : undefined] as const }))
      const linked = raws.filter(x => lem.get(x)).length, lemmas = new Set(raws.map(x => lem.get(x)).filter(Boolean))
      expect(raws.length).toBe(257); expect(linked / raws.length).toBeGreaterThan(0.75); expect(lemmas.size).toBeGreaterThanOrEqual(120)
      expect(lem.get('покою')).toBe('покій'); expect(lem.get('прагнуть')).toBe('прагнути')
    }, 120000)
  })
})
