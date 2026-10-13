/**
 * Dictionary segmentation of continuous Sophia text (pipelines/sophia-segment.ts, SPEC 00 P-1.7): accepted only when every segment links,
 * tokens carry method 'segmentation', otherwise the inscription is display-only. Fixture dictionaries (no VESUM needed) + the ingest wiring.
 */
import { describe, it, expect } from 'vitest'
import { segment, units, SHORT_WORDS } from '../pipelines/sophia-segment.ts'
import { ingestRows, tokenize } from '../pipelines/ingest-sophia.ts'

const DICT = new Set(['помози', 'рабу', 'своему', 'господи', 'иванну', 'ѥго', 'и', 'въ', 'лѣто', 'мѣсяца', 'ѣсте', 'азам'])
const links = (s: string) => DICT.has(s)
const prior = (s: string) => (DICT.has(s) ? 1 : 0)

describe('segment', () => {
  it('cuts scriptio continua into linking words (fewest segments)', () => {
    expect(segment('помозирабусвоему', links, prior)).toEqual(['помози', 'рабу', 'своему'])
    expect(segment('Господипомозирабусвоему', links, prior)).toEqual(['Господи', 'помози', 'рабу', 'своему'])   // case kept, matched lower-case
  })
  it('keeps titlo/accent marks on their letter and rejoins them in the segment', () => {
    expect(segment('помози҃рабу', links, prior)).toEqual(['помози҃', 'рабу'])
    expect(units('г͠а')!.raw).toEqual(['г͠', 'а'])
  })
  it('refuses a run when any part does not link, when it holds supralinear abbreviation letters, or when the cut is a coincidence of the dictionary', () => {
    expect(segment('помозирабуксвоему', links, prior)).toBeUndefined()            // «ксвоему» not a word
    expect(segment('гдⷭипомози', links, prior)).toBeUndefined()                    // U+2DED supralinear с
    expect(segment('ѣстеазам', links, () => 0)).toBeUndefined()                     // links, but no segment is attested (< ⅔ of letters)
  })
  it('allows only real short words below four letters, and few of them', () => {
    expect(SHORT_WORDS.has('и')).toBe(true)
    expect(segment('иванну', s => s === 'иванну' || s === 'ива' || s === 'нну', prior)).toEqual(['иванну'])      // «ива|нну» would need two unlisted 3-letter words
    expect(segment('лѣтоивъ', links, prior)).toBeUndefined()                      // two tiny words in three segments: 2 × 4 > 3 → refused
  })
  it('one tiny word per four segments is accepted', () => {
    expect(segment('господипомозирабуи', links, prior)).toEqual(['господи', 'помози', 'рабу', 'и'])
  })
  it('one linking word is returned as is (nothing inferred)', () => {
    expect(segment('прѣподобьнаго', s => s === 'прѣподобьнаго', () => 0)).toEqual(['прѣподобьнаго'])
  })
})

describe('ingest wiring (inscription 347-like, no edition)', () => {
  const row = (o: Record<string, any>) => ({
    published: true, id: 347, title: '103', panel: { title: '120-19c', room: '120' }, language: { text: 'Church Slavonic' }, writing_system: { text: 'Cyrillic' },
    min_year: 1019, max_year: 1019, interpretative_edition: '', romanisation: '', ...o,
  })
  const T = '<p>помозирабусвоему | лѣто</p>'
  const seg = (c: string) => segment(c, links, prior)
  it('segmented tokens carry method:segmentation, short ones are untouched, the diplomatic text is kept, the edition says how', () => {
    const t = tokenize('помозирабусвоему лѣто', 'x', 'Cyrillic', seg)
    expect(t.tokens).toEqual([
      { raw: 'помози', loc: 'x', s: 0, method: 'segmentation' }, { raw: 'рабу', loc: 'x', s: 0, method: 'segmentation' }, { raw: 'своему', loc: 'x', s: 0, method: 'segmentation' },
      { raw: 'лѣто', loc: 'x', s: 0 }])
    const r = ingestRows([row({ transcription: T })], { segmenter: c => seg(c) })
    const w = r.witnesses[0]!
    expect(w.tokens.map(x => [x.raw, x.method])).toEqual([['помози', 'segmentation'], ['рабу', 'segmentation'], ['своему', 'segmentation'], ['лѣто', undefined]])
    expect(w.diplomatic).toBe('помозирабусвоему | лѣто'); expect(w.edition).toContain('segmentation')
  })
  it('a run that cannot be cut makes the inscription display-only (excluded, counted, listed)', () => {
    const r = ingestRows([row({ transcription: '<p>помозирабукслвоемую</p>' })], { segmenter: c => seg(c) })
    expect(r.witnesses).toEqual([]); expect(r.excluded).toEqual({ 'display-only': 1 }); expect(r.excludedIds['display-only']).toEqual([347])
    expect(ingestRows([row({ transcription: T })]).excluded).toEqual({ 'display-only': 1 })      // no segmenter at all → display-only
  })
  it('a chunk holding a private-use glyph is never segmented', () => {
    const r = ingestRows([row({ transcription: '<p>помозирабусвоему</p>' })], { segmenter: c => seg(c) })
    expect(r.excluded).toEqual({ 'display-only': 1 })
  })
  it('spaced transcription and any interpretative edition are never segmented', () => {
    const sp = ingestRows([row({ transcription: '<p>помози рабу своему</p>' })], { segmenter: () => { throw new Error('called') } })
    expect(sp.witnesses[0]!.tokens.map(x => x.method)).toEqual([undefined, undefined, undefined])
    const ie = ingestRows([row({ transcription: '<p>помозирабусвоему</p>', interpretative_edition: '<p>Помози рабу своему</p>' })], { segmenter: () => { throw new Error('called') } })
    expect(ie.witnesses[0]!.tokens.map(x => x.raw)).toEqual(['Помози', 'рабу', 'своему'])
  })
})
