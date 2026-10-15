/** SPEC 63 CV: a card for every attested word (запобігти, рушничний, парада, плавний + a sample of dictionary equivalents). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { CV_BUCKETS, CvScan, buildCardIndex, cardMap, cardRoute, cvBucket, shardsOfCv, type CardIndexFile, type CvEntry } from '../core/cv.ts'
import { buildCv } from '../pipelines/build-cv.ts'
import { analyzeLink } from '../src/lib/analyze-links.ts'
import { cardSearchIndex, hitRoute } from '../src/lib/cardIndex.ts'
import { search } from '../src/lib/search.ts'
import { key } from '../core/text.ts'
import { unpackCore } from '../core/pack.ts'
import { fold } from '../core/orthography.ts'
import { archId } from '../core/archaic.ts'
import { tokenRaw } from '../pipelines/ingest-r2u.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const have = existsSync('public/data/cardindex.json') && existsSync('public/data/cv/0.json') && existsSync('public/data/lexicon.json')
const real = have ? describe : describe.skip

const tok = (raw: string, loc: string) => ({ raw, loc, s: 0 })
const W = (id: string, ...t: [string, string][]) => ({ id, witnessType: 'dictionary' as const, tokens: t.map(([r, l]) => tok(r, l)) })

describe('CV-1 pipeline', () => {
  it('CV-1 a dictionary token without a full card gets a light card with its attestation line; a full-card lemma and an /ar spelling get none', () => {
    const w = W('r2u_yakubski', ['запобігти', 'r2u Якубські · s?w=x#13_1: Предотвращать'], ['вода', 'r2u Якубські · s?w=x#13_1: Предотвращать'], ['парада', 'r2u Якубські · s?w=y#13_2: Парад'], ['пособля́ти'.normalize('NFC').replace('́', ''), 'r2u Якубські · s?w=x#13_1: Предотвращать'])
    const lk = (_: number, ti: number) => (ti === 0 ? { lemma: 'запобігти', tags: 'verb:perf:inf', full: false } : ti === 1 ? { lemma: 'вода', tags: 'noun', full: true } : undefined)
    const r = buildCv([{ w }], lk, new Set([archId('парада')]), () => false)
    const m = new Map(r.entries)
    expect(m.get('запобігти')![1]).toBe('verb:perf:inf'); expect(m.get('запобігти')![3][0]![0]).toBe('r2u_yakubski'); expect(m.get('запобігти')![3][0]![1]).toContain('Предотвращать')
    expect(m.has('вода')).toBe(false); expect(m.has('парада')).toBe(false)
    expect(m.get('пособляти')![1]).toBe('')   // not in VESUM: the attested spelling as is
    expect(r.refs.get('r2u_yakubski')![0]).toBe('l:запобігти')
  })
  it('CV-1 an unresolved text token whose spelling is a CV word links to the card', () => {
    const d = W('d', ['рушничний', 'l1']), t = { id: 't', witnessType: 'text' as never, tokens: [tok('Рушничний', 'a'), tok('зайвий', 'b')] }
    const lk = (wi: number, ti: number) => (wi === 0 && ti === 0 ? { lemma: 'рушничний', tags: 'adj', full: false } : undefined)
    expect(buildCv([{ w: d }, { w: t }], lk, new Set(), () => false).refs.get('t')).toEqual(['l:рушничний', ''])
  })
  it('CV-1 attestations are de-duplicated per (witness, locator) and capped, the total is kept', () => {
    const s = new CvScan(); for (let i = 0; i < 9; i++) { s.add('слово', 'noun', 'w', 'loc' + i, 'слово'); s.add('слово', 'noun', 'w', 'loc' + i, 'слово') }
    const e = s.entries()[0]![1]; expect(e[2]).toBe(9); expect(e[3].length).toBeLessThan(9)
  })
  it('CV-1 shards: every key lands in exactly its bucket', () => {
    const s = new CvScan(); s.add('плавний', 'adj', 'w', 'l', 'плавний'); const sh = shardsOfCv(s.entries())
    expect(sh).toHaveLength(CV_BUCKETS); expect(sh[cvBucket('Плавний')]![key('плавний')]![0]).toBe('плавний')
  })
})

describe('CV-2 resolution over all card kinds', () => {
  const ci: CardIndexFile = buildCardIndex('t', ['рідкість'], ['запобігти', 'рушничний', 'плавний'], [{ id: 'парада', variants: ['парада', 'парад'] }])
  it('CV-2 card map is case- and stress-insensitive and routes by kind', () => {
    const m = cardMap(ci)
    expect(m.get(key('Запобі́гти'))![0]).toEqual({ kind: 'lw', id: 'запобігти', form: 'запобігти' }); expect(cardRoute(m.get(key('ПАРАДА'))![0]!)).toBe(`/ar/${encodeURIComponent('парада')}`)
  })
  it('CV-2 the analyser links a form that only a light / CV / archaic card owns', () => {
    const ctx = { lemmas: new Set<string>(), hits: new Map(), cards: cardMap(ci) }
    expect(analyzeLink('Плавний', ctx)).toEqual({ to: `/lw/${encodeURIComponent('плавний')}`, kind: 'word' }); expect(analyzeLink('парада', ctx).to).toContain('/ar/'); expect(analyzeLink('нема', ctx).kind).toBe('spelling')
  })
  it('CV-2 search ranks card hits like lexicon hits (exact, prefix, case-insensitive)', () => {
    const idx = cardSearchIndex(ci)
    expect(search(idx, 'ПЛАВН').map(r => hitRoute(r.lemma))).toEqual([`/lw/${encodeURIComponent('плавний')}`]); expect(search(idx, 'парада')[0]!.lemma).toBe('ar:парада')
  })
  it('CV-2 SearchView, LightWordView, AnalyzeView and UnlinkedSpelling are wired to the card index', () => {
    expect(rd('src/views/SearchView.vue')).toMatch(/cardHits/); expect(rd('src/views/LightWordView.vue')).toMatch(/loadCv/)
    expect(rd('src/views/AnalyzeView.vue')).toMatch(/cards: cards\.value/); expect(rd('src/components/UnlinkedSpelling.vue')).toMatch(/cards: cards\.value/)
    expect(rd('pipelines/build.ts')).toMatch(/buildCv\(/)
  })
})

real('CV-2 the real data: every attested word opens a non-empty card', () => {
  const ci = JSON.parse(rd('public/data/cardindex.json')) as CardIndexFile, cards = cardMap(ci)
  const light = new Map((JSON.parse(rd('public/data/light.json')) as { lemmas: [string, ...unknown[]][] }).lemmas.map(l => [key(l[0]), l]))
  const arch = new Map((JSON.parse(rd('public/data/archaic.json')) as { entries: { id: string }[] }).entries.map(e => [e.id, e]))
  const core = unpackCore(JSON.parse(rd('public/data/lexicon.json'))), lex = new Set<string>()
  for (const c of core) { lex.add(key(c.lemma)); for (const f of c.forms) { lex.add(key(f.raw)); lex.add(key(f.modern)) } for (const p of c.paradigm) lex.add(key(p.form)) }
  const cv = (w: string): CvEntry | undefined => (JSON.parse(rd(`public/data/cv/${cvBucket(w)}.json`)) as Record<string, CvEntry>)[key(w)]
  /** non-empty = a lexicon spelling, or an /ar entry, or a /lw card with a light row or ≥ 1 dictionary attestation line */
  const opens = (w: string) => {
    if (lex.has(key(w))) return true
    return (cards.get(key(w)) ?? []).some(h => (h.kind === 'ar' ? arch.has(h.id) : light.has(key(h.id)) || (cv(h.id)?.[3].length ?? 0) > 0))
  }
  it('CV-2 запобігти, рушничний, парада, плавний', () => {
    for (const w of ['запобігти', 'рушничний', 'парада', 'плавний', 'Плавний', 'ЗАПОБІГТИ']) expect(opens(w), w).toBe(true)
    const e = cv('рушничний')!; expect(e[3][0]![0]).toMatch(/^r2u_/); expect(e[3][0]![1]).toContain('r2u'); expect(e[1]).toMatch(/^adj/)
  })
  it('CV-2 a sample of 200 random dictionary equivalents each opens a non-empty card', () => {
    const rows = (JSON.parse(rd('public/data/r2u.json')) as { dicts: { id: number; dir: string }[]; rows: [number, number, string, string, string[], string[], string][] })
    const dir = new Map(rows.dicts.map(d => [d.id, d.dir]))
    const eq = [...new Set(rows.rows.filter(r => dir.get(r[0]) === 'ru-uk').flatMap(r => r[5].map(e => tokenRaw(e))))].filter(e => /^\p{L}[\p{L}'-]*$/u.test(e) && e.length >= 2)
    expect(eq.length).toBeGreaterThan(5000)
    let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32)
    const sample = Array.from({ length: 200 }, () => eq[Math.floor(rnd() * eq.length)]!)
    const bad = sample.filter(e => !opens(e) && !fold(e, 'r2u').some(c => opens(c.form)) && !fold(e, 'желехівка').some(c => opens(c.form)))
    expect(bad).toEqual([])
  })
})
