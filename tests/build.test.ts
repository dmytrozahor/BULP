/** SPEC 20 §Tests: admission (B-1.1), ambiguity order (B-2.1), surzhyk/LT upgrade needs both conditions (B-3.2), tie-break (B-3.5), size budget (B-5), every built claim valid (P-1.1). */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { claim, Q, D, isKnown, unknown, type Claim } from '../core/evidence.ts'
import type { Ctx } from '../core/detect.ts'
import type { LemmaCard, VesumHit, WitnessOut } from '../core/types.ts'
import { authorById, type Author } from '../pipelines/authors.ts'
import { admit, rankFirst, firstClaim, upgradeLt, selectForms, lemmaRusyn, surzhykClaim, type FirstCand } from '../pipelines/build-annotate.ts'
import { chooseLemma, tierOf, type Option } from '../pipelines/build-link.ts'
import { writeLexicon } from '../pipelines/build.ts'
import { pack, packCore, unpack, unpackCore } from '../core/pack.ts'
import { BUCKETS, bucketOf, isFull, mergeCard, packShard, splitCard, unpackShard } from '../core/shard.ts'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hasData, readFull } from './lexdata.ts'
import { REGIONS, regionOf } from '../pipelines/regions.ts'
import { SURZHYK_DEF } from '../core/rules.ts'

const auth = (o: Partial<Author> = {}): Author => ({ id: 'a', name: 'A', life: '', label: 'ukrainian', status: 'vetted', confidence: 'explicit', evidence: [Q('S', 'l', 'q')], ...o })
const w = (o: Partial<WitnessOut> = {}) => ({ id: 'w', author: 'a', authorEvidence: undefined, ...o })

describe('B-1.1 admission', () => {
  it('unknown author → refused', () => expect(admit(w(), undefined)).toMatchObject({ ok: false }))
  it('excluded / unverified status → refused; vetted and provisional → admitted', () => {
    expect(admit(w(), auth({ status: 'excluded' })).ok).toBe(false)
    expect(admit(w(), auth({ status: 'unverified' })).ok).toBe(false)
    expect(admit(w(), auth()).ok).toBe(true)
    expect(admit(w(), auth({ status: 'provisional' })).ok).toBe(true)
  })
  it('author record without evidence needs a Q authorEvidence on the witness', () => {
    const bare = auth({ evidence: [] })
    expect(admit(w(), bare).ok).toBe(false)
    expect(admit(w({ authorEvidence: [D('w', 'l', 'x')] }), bare).ok).toBe(false)
    expect(admit(w({ authorEvidence: [Q('w', 'l', 'x')] }), bare).ok).toBe(true)
  })
  it('a witness the ingester marked as not Ukrainian text is refused, with the evidence in the reason', () => {
    const r = admit(w({ excludeReason: { why: 'російською', evidence: [D('IZB', 'u', 'Поэма Кого, рыдая')] } }), auth())
    expect(r.ok).toBe(false); expect(r.ok === false && r.why).toMatch(/російською.*Поэма/)
  })
  it('every real manifest author id has a record (P-2.2)', () => expect(authorById['shevchenko']).toBeTruthy())
})

const cand = (o: Partial<FirstCand> = {}): FirstCand => ({ witness: 'w1', author: auth(), date: [1100, 1100], witnessType: 'ms_copy', loc: 'l', form: 'f', route: 'direct', ...o })
describe('B-3.5 first-attestation tie-breaks', () => {
  it('earliest date.to wins', () => expect(rankFirst([cand({ witness: 'b', date: [1200, 1200] }), cand({ witness: 'a', date: [1100, 1110] })])!.first.witness).toBe('a'))
  it('tie: vetted > provisional', () => expect(rankFirst([cand({ witness: 'p', author: auth({ status: 'provisional' }) }), cand({ witness: 'v' })])!.first.witness).toBe('v'))
  it('tie: narrower date range', () => expect(rankFirst([cand({ witness: 'wide', date: [1050, 1100] }), cand({ witness: 'narrow', date: [1090, 1100] })])!.first.witness).toBe('narrow'))
  it('tie: autograph > ms_copy > first_ed > scholarly_ed', () => {
    const ts = ['scholarly_ed', 'first_ed', 'ms_copy', 'autograph']
    expect(rankFirst(ts.map(witnessType => cand({ witness: witnessType, witnessType })))!.first.witness).toBe('autograph')
  })
  it('tie: person > institution', () => expect(rankFirst([cand({ witness: 'inst', author: auth({ label: 'institutional' }) }), cand({ witness: 'pers' })])!.first.witness).toBe('pers'))
  it('full tie → first kept, the others are coFirst (never silently dropped)', () => {
    const r = rankFirst([cand({ witness: 'x' }), cand({ witness: 'y' }), cand({ witness: 'z', date: [1300, 1300] })])!
    expect(r.first.witness).toBe('x'); expect(r.coFirst).toEqual(['y'])
  })
  it('firstClaim cites the author vetting quote + the attestation + the date; no evidence → unknown', () => {
    const ws = new Map([['w1', { dateCite: Q('IZB', 'u', 'дата'), authorEvidence: undefined }]])
    const c = firstClaim([cand()], ws, () => 'kwic')
    expect(isKnown(c)).toBe(true); expect(c.evidence.map(e => e.kind)).toEqual(['Q', 'D', 'Q'])
    expect(isKnown(firstClaim([cand({ author: auth({ evidence: [] }) })], ws, () => 'kwic'))).toBe(false)
    expect(isKnown(firstClaim([], ws, () => 'kwic'))).toBe(false)
  })
})

const opt = (lemma: string, branches: number, tags = 'noun:inanim:m:v_naz', form = lemma): Option => {
  const c = { form, trace: [] as string[], branches }
  return { id: lemma.toLowerCase(), lemma, form, hit: { lemma, tags }, cand: c, tier: tierOf(tags), own: c, ownConfirmed: true }
}
describe('B-2.1 ambiguity resolution order', () => {
  it('(tier) an unflagged lemma beats a bad/slang one regardless of branches', () => {
    const c = chooseLemma([opt('кляча', 0, 'noun:anim:f:v_naz:bad'), opt('кобила', 2)], new Map())!
    expect(c.lemma).toBe('кобила'); expect(c.decidedBy).toBe('tier'); expect(c.alternatives).toEqual(['кляча'])
  })
  it('(branches) with no frequency evidence the candidate with fewer branch rules wins', () => {
    const c = chooseLemma([opt('бог', 1), opt('біг', 0)], new Map())!
    expect(c.lemma).toBe('біг'); expect(c.decidedBy).toBe('branches')
  })
  it('(frequency class) богъ → бог, not біг: a lemma in a higher modern frequency class beats fewer branches (ikavism has exceptions)', () => {
    const c = chooseLemma([opt('бог', 1), opt('біг', 0)], new Map([['бог', 340], ['біг', 7]]))!
    expect(c.lemma).toBe('бог'); expect(c.decidedBy).toBe('frequency')
  })
  it('same frequency class → branches decide again', () => expect(chooseLemma([opt('бог', 1), opt('біг', 0)], new Map([['бог', 12], ['біг', 70]]))!.lemma).toBe('біг'))
  it('(first) full tie keeps the first and lists the others', () => {
    const c = chooseLemma([opt('аа', 0), opt('бб', 0)], new Map())!
    expect(c.lemma).toBe('аа'); expect(c.decidedBy).toBe('first'); expect(c.alternatives).toEqual(['бб'])
  })
  it('case variants of one lemma are one lemma; the common-noun spelling is the display form', () => {
    const c = chooseLemma([opt('Князь', 0, 'noun:anim:m:v_naz:prop:lname'), opt('князь', 0)], new Map())!
    expect(c.lemma).toBe('князь'); expect(c.decidedBy).toBe('unique')
  })
  it('nothing → undefined (unresolved tokens are never guessed, B-2.2)', () => expect(chooseLemma([], new Map())).toBeUndefined())
})

describe('B-3.2 LT-only nonnormative → russianism_or_hybrid needs BOTH conditions', () => {
  const lt = claim(true as const, [Q('LT', 'UK_SIMPLE_REPLACE', 'x'), D('LT', 'rules/uk/replace.txt', 'шо=що')], { score: 0.8, method: 'LEX-LT' })
  const ctx = (vesum: VesumHit[] = []): Ctx => ({ form: 'шо', vesum, inLexicon: () => [] })
  const ru = (known: boolean) => ({ шо: { known, normal_form: 'шо', tag: 'CONJ' } })
  it('ru-known AND no normative VESUM analysis → upgraded, with the ru-dictionary evidence', () => {
    const r = upgradeLt({ nonnormative: lt }, ctx(), ru(true))
    expect(r.russianism_or_hybrid!.method).toBe('LEX-LT+ru-dict'); expect(r.russianism_or_hybrid!.evidence.at(-1)!.source).toBe('pymorphy3-dicts-ru')
  })
  it('ru does not know the word → no upgrade', () => expect(upgradeLt({ nonnormative: lt }, ctx(), ru(false)).russianism_or_hybrid).toBeUndefined())
  it('VESUM has a normative analysis → no upgrade', () => expect(upgradeLt({ nonnormative: lt }, ctx([{ lemma: 'що', tags: 'conj:subord' }]), ru(true)).russianism_or_hybrid).toBeUndefined())
  it('only a flagged VESUM analysis is not normative → upgrade still allowed', () => expect(upgradeLt({ nonnormative: lt }, ctx([{ lemma: 'що', tags: 'conj:subord:slang' }]), ru(true)).russianism_or_hybrid).toBeDefined())
  it('a claim not made by LEX-LT is never upgraded', () => expect(upgradeLt({ nonnormative: { ...lt, method: 'LEX-VESUM-SUBST' } }, ctx(), ru(true)).russianism_or_hybrid).toBeUndefined())
})

describe('B-3 lemma-level claims', () => {
  it('surzhyk is derived only from contact labels and always carries SURZHYK_DEF', () => {
    const cl = claim(true as const, [Q('LT', 'l', 'q')], { score: 0.8, method: 'LEX-LT' })
    expect(isKnown(surzhykClaim([{ nonnormative: cl }], {}))).toBe(false)
    const s = surzhykClaim([{ russianism_morph: cl }], {}); expect(isKnown(s)).toBe(true); expect(s.evidence).toContainEqual(SURZHYK_DEF)
  })
  it('lemma rusyn = best of the forms: specific variant beats undetermined, absent → undefined', () => {
    const rc = (v: string, score: number) => ({ claims: { rusyn: claim(v, [Q('RUEWIKI', 'l', 'q')], { score, method: 'RUE-X' }) } })
    expect(lemmaRusyn([{ claims: {} }])).toBeUndefined()
    expect(lemmaRusyn([rc('rusyn', 0.9), rc('rusyn:lemko', 0.3)])!.value).toBe('rusyn:lemko')
  })
  it('selectForms keeps the oldest AND the most frequent spelling even in a 2-form card', () => {
    const fs = [{ n: 'old', f: 1, date: [1000, 1000] as [number, number] }, { n: 'mid', f: 50, date: [1500, 1500] as [number, number] }, { n: 'x', f: 5, date: [1400, 1400] as [number, number] }]
    expect(selectForms(fs, 2).map(x => x.n).sort()).toEqual(['mid', 'old'])
    expect(selectForms(fs, 5)).toHaveLength(3)
  })
})

// ── B-5 core / detail split ──────────────────────────────────────────────────────────────────────
const kw = (n: number) => Array.from({ length: n }, (_, i) => ({ w: 'w', loc: 'l' + i, left: 'l'.repeat(20), node: 'n', right: 'r'.repeat(20), date: [1000, 1000] as [number, number] }))
const EV = Q('S', 'l', 'q')
const stats = (f: number): LemmaCard['stats'] => ({ f, ipm: f / 10, hk: 3, dots: 2, dp: 0.4, range: 2, byEpoch: { 'shev.old': { f, ipm: 1 } }, byCentury: [{ c: 11, f, ipm: 1, smooth: null }], shifts: [], colloc: [{ lemma: 'x', fxy: 3, logDice: 5 }], byRegion: [{ code: 'kyiv', f, N: 100 }] })
/** a full card: a plain spelling and one with norm/modern/claims/hints, a paradigm with repeated forms and tags, claims of every kind */
const fullCard = (lemma: string, f: number, nk = 6): LemmaCard => ({
  lemma, pos: 'іменник', paradigm: [{ form: lemma, tags: 'noun:m:v_naz' }, { form: lemma, tags: 'noun:m:v_zna' }, { form: lemma + 'а', tags: 'noun:m:v_rod' }, { form: lemma, tags: 'noun:m:v_kly' }],
  stress: [{ form: lemma, positions: [0], status: 'unknown', evidence: [EV], method: 'dictionary' }],
  forms: [
    { raw: lemma, norm: lemma, modern: lemma, f, date: [1000, 1000], link: claim({ lemma, form: lemma, route: 'direct', alternatives: [] }, EV), derivation: [], claims: {}, hints: [], epochs: ['shev.old'], kwic: kw(nk) },
    { raw: lemma + 'ѣ', norm: lemma + 'е', modern: lemma + 'і', f: 1, date: [1500, 1550], link: claim({ lemma, form: lemma, route: 'token', alternatives: ['z'] }, [EV, Q('T', 'l2', 'q2')]), derivation: [{ rule: 'R09', from: 'ѣ', to: 'і' }], claims: { church_slavonic: claim(true as const, [EV], { score: 0.5, method: 'X' }) }, hints: ['R1'], epochs: ['shev.middle', 'shev.modern'], kwic: kw(1) },
  ],
  first: claim({ author: 'a', witness: 'w', loc: 'l', date: [1000, 1000] as [number, number], witnessType: 'chronicle', form: lemma, coFirst: [] }, [EV]) as never,
  stats: stats(f),
  claims: { register: claim('colloquial' as const, [EV]), surzhyk: unknown() as never, origin: claim('native' as const, [EV, Q('T', 'l3', 'q3')]), oldest: claim({ form: lemma, date: [1000, 1000] as [number, number], epoch: 'shev.old' }, [EV]) as never, dialect: { ZAK: claim(true as const, [EV]) } },
})
describe('B-5 core / detail split (SPEC 20 B-5a–c)', () => {
  const plain = fullCard('вода', 4), cards = [fullCard('слово', 9), { ...plain, claims: { ...plain.claims, register: unknown() as never, dialect: {}, rusyn: claim('rusyn', [EV]) as never } }]
  it('splitCard → mergeCard deep-equals the original card', () => { for (const c of cards) { const { core, detail } = splitCard(c); expect(mergeCard(core, detail)).toEqual(c) } })
  it('the core holds no KWIC, stress, link, derivation or detail statistics', () => {
    const { core, detail } = splitCard(cards[0]!), s = JSON.stringify(core)
    for (const k of ['kwic', 'stress', 'link', 'derivation', 'byCentury', 'colloc', 'oldest']) expect(s, k).not.toContain(`"${k}"`)
    expect(detail.forms[0]!.kwic).toHaveLength(6); expect(Object.keys(core.stats).sort()).toEqual(['dots', 'f', 'hk', 'ipm'])
  })
  it('core wire form (tag table, omitted defaults, pooled evidence) and a shard round-trip through JSON', () => {
    const parts = cards.map(splitCard), p = packCore(parts.map(x => x.core))
    expect(p.format).toBe(3); expect(JSON.stringify(p.cards)).not.toContain('"source"')
    expect(unpackCore(JSON.parse(JSON.stringify(p)))).toEqual(parts.map(x => x.core))
    const sh = packShard(parts.map(x => [x.core.lemma, x.detail])), back = unpackShard(JSON.parse(JSON.stringify(sh)))
    expect(sh.ev.length).toBeLessThan(JSON.stringify(parts.map(x => x.detail)).match(/"source"/g)!.length)   // a shard has its own pool: shared Evidence is stored once
    parts.forEach(x => expect(back.get(x.core.lemma)).toEqual(x.detail))
    expect(() => unpackShard({ format: 9 })).toThrow()
  })
  it('a plain full LemmaCard[] (fixture) passes through unpackCore and counts as already merged (no shard fetch)', () => {
    expect(unpackCore(cards)).toBe(cards); expect(isFull(cards[0]!)).toBe(true); expect(isFull(splitCard(cards[0]!).core)).toBe(false)
  })
  it('bucketOf is stable: pinned values, NFC-invariant, in range; the browser imports this very function', () => {
    expect([bucketOf('слово'), bucketOf('кънѧзь'), bucketOf('вода')]).toEqual([581, 246, 509])
    expect(bucketOf('й')).toBe(bucketOf('й'))   // й precomposed vs и + combining breve
    for (const l of ['а', 'слово', 'ѣ', 'ґанок', '']) { expect(bucketOf(l)).toBeGreaterThanOrEqual(0); expect(bucketOf(l)).toBeLessThan(BUCKETS) }
    expect(readFileSync('src/composables/useData.ts', 'utf8')).toMatch(/import \{[^}]*bucketOf[^}]*\} from '\.\.\/\.\.\/core\/shard\.ts'/)
  })
  it('writeLexicon: every card in core, each in exactly one shard (its bucket); stale shards removed; limits are errors, not drops', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lex-')); mkdirSync(join(dir, 'lex'))
    writeFileSync(join(dir, 'lex', 'stale.json'), '{}')
    try {
      const cs = Array.from({ length: 60 }, (_, i) => fullCard('лема' + i, 100 - i, 2))
      const st = writeLexicon(cs, dir)
      expect(st.lemmas).toBe(60); expect(existsSync(join(dir, 'lex', 'stale.json'))).toBe(false)
      const core = unpackCore(JSON.parse(readFileSync(join(dir, 'lexicon.json'), 'utf8')))
      expect(core.map(c => c.lemma)).toEqual(cs.map(c => c.lemma))
      const files = readdirSync(join(dir, 'lex')), seen = new Map<string, number>()
      for (const f of files) for (const l of unpackShard(JSON.parse(readFileSync(join(dir, 'lex', f), 'utf8'))).keys()) { seen.set(l, (seen.get(l) ?? 0) + 1); expect(bucketOf(l), l).toBe(+f.replace('.json', '')) }
      expect(seen.size).toBe(60); expect([...seen.values()].every(n => n === 1)).toBe(true); expect(st.shards).toBe(files.length)
      expect(readFull(dir)).toEqual(cs)
      expect(() => writeLexicon(cs, dir, 1000)).toThrow(/core/); expect(() => writeLexicon(cs, dir, 1e9, 100)).toThrow(/shard/)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
describe('lexicon packing (core/pack)', () => {
  const e = Q('S', 'loc', 'quote')
  const cs = [fullCard('x', 3), { ...fullCard('y', 2), first: claim('y', [e, Q('T', 'l2', 'q2', 'note')]) as never }]
  it('pack → unpack deep-equals the input; identical Evidence is interned once; plain arrays pass through', () => {
    const p = pack(cs)
    expect(p.format).toBe(2); expect(p.ev.length).toBeLessThan(JSON.stringify(cs).match(/"source"/g)!.length)
    expect(JSON.stringify(p.cards)).not.toContain('"source"')
    expect(unpack(JSON.parse(JSON.stringify(p)))).toEqual(cs)
    expect(unpack(cs)).toBe(cs)
  })
  it('rejects an unknown object format', () => expect(() => unpack({ format: 9 })).toThrow())
})

describe('regions (research/07 §3.3, SPEC 20 B-3.6)', () => {
  it('maps the manifest region strings; composite or disputed loci stay unknown (P-3.1)', () => {
    expect(regionOf('Київ')).toBe('kyiv'); expect(regionOf('Київщина')).toBe('kyiv'); expect(regionOf('Галичина')).toBe('halychyna'); expect(regionOf('Волинь')).toBe('volyn')
    for (const r of ['Київ або Новгород', 'Галич / Волинь', 'Галичина / Афон', undefined, '']) expect(regionOf(r), String(r)).toBeUndefined()
  })
  it('oblast codes are ISO 3166-2:UA', () => REGIONS.forEach(r => r.oblasts.forEach(o => expect(o).toMatch(/^UA-\d\d$/))))
})

// P-1.1 over the real built data (skipped on a clean checkout without public/data)
describe.skipIf(!hasData())('P-1.1 every claim in the built lexicon passes claim() validation', () => {
  const cards: LemmaCard[] = readFull()
  const isClaim = (x: unknown): x is Claim<unknown> => !!x && typeof x === 'object' && 'value' in x && 'evidence' in x && Array.isArray((x as Claim<unknown>).evidence)
  const walk = (x: unknown, path: string, out: { path: string; c: Claim<unknown> }[]) => {
    if (isClaim(x)) { out.push({ path, c: x }); return }
    if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${path}[${i}]`, out))
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${path}.${k}`, out)
  }
  const all: { path: string; c: Claim<unknown> }[] = []
  cards.forEach((c, i) => walk({ first: c.first, stress: c.stress, forms: c.forms, claims: c.claims }, `#${i}:${c.lemma}`, all))
  it('has claims', () => expect(all.length).toBeGreaterThan(1000))
  it('every known claim re-constructs through claim(); unknown ones have no evidence', () => {
    for (const { path, c } of all) {
      if (c.value === 'unknown') { expect(c.evidence, path).toEqual([]); continue }
      expect(() => claim(c.value, c.evidence, { score: c.score, method: c.method }), path).not.toThrow()
    }
  })
  it('rusyn claims name an axis label', () => {
    for (const c of cards) {
      const r = c.claims.rusyn
      if (r) { expect(r.value).toMatch(/^rusyn(:(lemko|presov|pannonian|subcarpathian))?$/) }
    }
  })
  it('byRegion codes exist in corpus.regions and N matches', () => {
    const corpus = JSON.parse(readFileSync('public/data/corpus.json', 'utf8'))
    const N = new Map<string, number>(corpus.regions.map((r: { code: string; N: number }) => [r.code, r.N]))
    for (const c of cards) for (const r of c.stats.byRegion ?? []) { expect(N.get(r.code), r.code).toBe(r.N); expect(r.f).toBeLessThanOrEqual(c.stats.f) }
  })
})

