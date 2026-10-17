/** SPEC 63 NV-3: no dead spelling links — unresolved spellings have an index and a page; the analyser labels its links honestly. */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { unpackCore } from '../core/pack.ts'
import { key } from '../core/text.ts'
import { gzipSync } from 'node:zlib'
import { UNLINKED_BUDGET_BYTES, UNL_GZ_HARD, UNL_GZ_MAX, UNL_MANIFEST_GZ_MAX, isWordToken, leafShard, manifestOf, newAccumulator, occurrencesOf, planUnlinked, unlinkedLeaf, unlinkedName, type UnlinkedManifest } from '../core/unlinked.ts'
import { analyzeLink } from '../src/lib/analyze-links.ts'
import { buildIndex } from '../src/lib/search.ts'
import { kwicAt, lookupUnlinked } from '../src/lib/unlinked.ts'
import type { Tok } from '../src/lib/witnessText.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const have = existsSync('public/data/unlinked/index.json') && existsSync('public/data/texts/sumtsov_slobozhane1918.json') && existsSync('public/data/lexicon.json')
const real = have ? describe : describe.skip

describe('NV-3 unlinked-spelling index', () => {
  it('NV-3 the accumulator keeps count, witness count and at most 3 witnesses with token indexes', () => {
    const a = newAccumulator()
    a.add('Призвичкою', 'w1', 5); a.add('призвичкою', 'w1', 9); a.add('призвичкою', 'w2', 1); a.add('призвичкою', 'w3', 2); a.add('призвичкою', 'w4', 3)
    const e = a.m.get(key('призвичкою'))!
    expect(e[1]).toBe(5); expect(e[2]).toBe(4)
    expect(occurrencesOf(e)).toEqual([{ w: 'w1', i: 5 }, { w: 'w2', i: 1 }, { w: 'w3', i: 2 }])
  })
  it('NV-5 prefix sharding: every key lands in exactly one leaf, found again through the manifest; nothing is dropped', () => {
    const a = newAccumulator()
    let x = 7; const rnd = (n: number) => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) % n, abc = 'абвгдежзиклмнопрстуфхцчшщюя'
    const words = Array.from({ length: 6000 }, () => Array.from({ length: 4 + rnd(6) }, () => abc[rnd(abc.length)]).join('')).concat(['я', 'нѣгдѣ', 'слобожане'])
    for (const w of words) a.add(w, 'w', 0)
    const gz = (t: string) => gzipSync(t).length, leaves = planUnlinked(a.m, gz, 4096)
    const names = new Set<string>(), all: string[] = []
    for (const [p, ks] of leaves) { names.add(unlinkedName(p)); all.push(...ks) }
    expect(names.size).toBe(leaves.size); expect(all.sort()).toEqual([...a.m.keys()].sort()); expect(leaves.size).toBeGreaterThan(10)
    const man = manifestOf(leaves), set = new Set(man.leaves.map(l => l[0]))
    for (const [p, ks] of leaves) { expect(gz(JSON.stringify(leafShard(a.m, ks))), p).toBeLessThanOrEqual(4096 * 1.5); for (const k of ks) expect(unlinkedLeaf(k, set)).toBe(p) }
    expect(unlinkedLeaf('ъъъъ', set)).toBeUndefined()
  })
  it('NV-3 only word tokens are indexed (no digits or punctuation)', () => {
    expect(isWordToken('призвичкою')).toBe(true); expect(isWordToken("п'ять")).toBe(true); expect(isWordToken('1918')).toBe(false); expect(isWordToken('—')).toBe(false)
  })
  it('NV-3 a KWIC line is cut around the token index from the text shard', () => {
    const toks: Tok[] = ['а', 'б', 'призвичкою', 'в', 'г'].map(r => [r, 'арк. 1', 0] as unknown as Tok)
    expect(kwicAt(toks, 2, 'w', 2)).toEqual({ w: 'w', loc: 'арк. 1', left: 'а б', node: 'призвичкою', right: 'в г' })
    expect(kwicAt(toks, 99, 'w')).toBeUndefined()
  })
  it('NV-3 the lookup finds an indexed spelling through the injected shard fetch', async () => {
    const a = newAccumulator(); a.add('призвичкою', 'w1', 7)
    const leaves = planUnlinked(a.m, t => t.length), files = new Map<string, unknown>([['index', manifestOf(leaves)]])
    for (const [p, ks] of leaves) files.set(unlinkedName(p), leafShard(a.m, ks))
    const get = async (n: string) => files.get(n) ?? null
    const e = await lookupUnlinked('Призвичкою', get)
    expect(e?.[0]).toBe('призвичкою'); expect(await lookupUnlinked('нема', get)).toBeUndefined(); expect(await lookupUnlinked('призвичкою', async () => null)).toBeUndefined()
  })
})

describe('NV-3 pages and links', () => {
  const form = rd('src/views/FormView.vue'), comp = rd('src/components/UnlinkedSpelling.vue'), an = rd('src/views/AnalyzeView.vue')
  it('NV-3 /f/:form for a spelling no lemma owns renders the «незв’язане написання» page, never «немає в корпусі»', () => {
    expect(form).toMatch(/<UnlinkedSpelling v-else-if="!pick"/); expect(form).not.toMatch(/такого написання немає в корпусі/); expect(form).not.toMatch(/у корпусі такого написання немає/)
    for (const s of ['незв’язане написання', 'Чому не зв’язано з лемою', 'Вживання', 'Пам’ятки', 'Кандидати за правилами']) expect(comp, s).toContain(s)
    expect(comp).not.toMatch(/немає в корпусі/)
  })
  it('NV-3 the analyser says «сторінка слова» only for a lemma / light card, else «сторінка написання»', () => {
    const ctx = { lemmas: new Set(['звичка']), hits: new Map([[key('звичці'), [{ lemma: 'звичка', via: 'form' }]]]), light: new Set(['рідкість']) }
    expect(analyzeLink('звичка', ctx).kind).toBe('word'); expect(analyzeLink('звичці', ctx).kind).toBe('word'); expect(analyzeLink('рідкість', ctx).kind).toBe('word')
    const u = analyzeLink('призвичкою', ctx); expect(u.kind).toBe('spelling'); expect(u.to).toBe(`/f/${encodeURIComponent('призвичкою')}`)
    expect(an).toMatch(/сторінка слова/); expect(an).toMatch(/сторінка написання/)
  })
  it('NV-3 the index has a build script (data:unlinked)', () => {
    expect(rd('package.json')).toMatch(/"data:unlinked"/)
  })
  it('NV-5 unlinked/ travels on the data branch (DIRS) and is ignored by git like ix/ and uv/; budgets are per leaf + manifest + sane total', () => {
    expect(rd('pipelines/data-branch.ts')).toContain("'uv', 'unlinked', 'ix'"); expect(rd('.gitignore')).toContain('public/data/unlinked')
    expect(UNL_GZ_MAX).toBeLessThanOrEqual(30 * 1024); expect(UNL_GZ_HARD).toBeLessThanOrEqual(128 * 1024); expect(UNL_MANIFEST_GZ_MAX).toBeLessThanOrEqual(64 * 1024)
    expect(UNLINKED_BUDGET_BYTES).toBeLessThanOrEqual(512 * 1024 * 1024)
    const b = rd('pipelines/build-unlinked.ts'); expect(b).toMatch(/UNL_GZ_HARD/); expect(b).toMatch(/UNL_MANIFEST_GZ_MAX/)
  })
})

real('NV-3 real data: every link target of a rendered text page resolves to a non-empty page', () => {
  const dir = 'public/data/unlinked'
  const cards = unpackCore(JSON.parse(rd('public/data/lexicon.json')))
  const forms = new Set<string>(); for (const c of cards) { forms.add(key(c.lemma)); for (const f of c.forms) forms.add(key(f.raw)) }
  const byLemma = new Map(cards.map(c => [c.lemma, c])), idx = buildIndex(cards)
  const light = new Set<string>((JSON.parse(rd('public/data/light.json')).lemmas as string[][]).map(l => l[0]!))
  let leafSet: Set<string> | undefined; const shards = new Map<string, Record<string, unknown>>()
  const indexed = (k: string) => { leafSet ??= new Set((JSON.parse(rd(`${dir}/index.json`)) as UnlinkedManifest).leaves.map(l => l[0])); const p = unlinkedLeaf(k, leafSet); if (!p) return false; if (!shards.has(p)) shards.set(p, JSON.parse(rd(`${dir}/${unlinkedName(p)}.json`))); return k in shards.get(p)! }
  it('NV-3 the Сумцов «Слобожане» 1918 page: «призвичкою» and every other word token leads to a page with content', () => {
    const toks = JSON.parse(rd('public/data/texts/sumtsov_slobozhane1918.json')).tokens as Tok[]
    expect(toks.some(t => t[0] === 'призвичкою')).toBe(true)
    const ctx = { lemmas: byLemma, hits: idx.map, light }
    let spelling = 0
    for (const raw of new Set(toks.map(t => t[0]).filter(isWordToken))) {
      const l = analyzeLink(raw, ctx), m = /^\/(w|lw|f)\/([^?]+)/.exec(l.to)
      expect(m, `${raw} → ${l.to}`).toBeTruthy()
      const target = decodeURIComponent(m![2]!)
      if (m![1] === 'w') expect(byLemma.has(target), `${raw}: /w/${target}`).toBe(true)
      else if (m![1] === 'lw') expect(light.has(target), `${raw}: /lw/${target}`).toBe(true)
      else if (l.kind === 'word') expect(forms.has(key(raw)) || idx.map.has(key(raw)), `${raw}: word-kind /f`).toBe(true)
      else { spelling++; expect(forms.has(key(raw)) || indexed(key(raw)), `${raw}: unlinked spelling missing from the index`).toBe(true) }
    }
    expect(spelling).toBeGreaterThan(0)
  })
  it('NV-3 every text shard word token is a lexicon spelling or in the unlinked index (all witnesses)', () => {
    let missing = 0, total = 0
    for (const f of readdirSync('public/data/texts').filter(x => x.endsWith('.json')).slice(0, 400)) {
      for (const t of (JSON.parse(rd(`public/data/texts/${f}`)).tokens as Tok[])) { if (!isWordToken(t[0])) continue; total++; if (!forms.has(key(t[0])) && !indexed(key(t[0]))) missing++ }
    }
    expect(total).toBeGreaterThan(1000); expect(missing).toBe(0)
  })
  it('NV-5 the built index: total within budget, every leaf ≤ hard gz limit, the manifest small and consistent', () => {
    const man = JSON.parse(rd(`${dir}/index.json`)) as UnlinkedManifest, files = readdirSync(dir).filter(f => f !== 'index.json')
    expect(files).toHaveLength(man.leaves.length)
    expect(readdirSync(dir).reduce((n, f) => n + statSync(`${dir}/${f}`).size, 0)).toBeLessThanOrEqual(UNLINKED_BUDGET_BYTES)
    expect(gzipSync(readFileSync(`${dir}/index.json`)).length).toBeLessThanOrEqual(UNL_MANIFEST_GZ_MAX)
    for (const f of files.slice(0, 200)) expect(gzipSync(readFileSync(`${dir}/${f}`)).length, f).toBeLessThanOrEqual(UNL_GZ_HARD)
  })
})
