/** SPEC 63 CR-1: correspondence groups («Відповідники»): the model, the guards, honest grades, symmetric display, the collapsed block, the budget. */
import { describe, it, expect, afterEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { existsSync, readFileSync } from 'node:fs'
import { assemble, checkGroup, checkPair, corpusArea, groupsForCard, isSingleWord, otherCount, packCg, plain, swapKey, tableRows, topLine, unpackCg, CORPUS_MIN, GROUP_CAP, type CorrGroup, type CorrMember, type CorrPair } from '../core/corr.ts'
import { familyPairs, kaikkiIndexAdd, kaikkiPairs, ownerPairs, dialectLexPairs, xrPairs, ukWiktPairs, type KkEntry, type KkIndex } from '../core/corr-src.ts'
import { D } from '../core/evidence.ts'
import { LM_NAMES, cardData } from '../core/parts.ts'
import CorrView from '../src/components/CorrView.vue'

const render = async (c: object, props: Record<string, unknown>, open = false) => {
  ;(globalThis as { localStorage?: unknown }).localStorage = open ? { getItem: () => '1', setItem: () => {} } : undefined
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage })
const pos = (...c: string[]) => new Set(c)
const VESUM: Record<string, string[]> = { щоб: ['conj'], щоби: ['conj'], шоб: ['conj'], жеби: ['conj'], аби: ['conj'], кит: ['noun'], кіт: ['noun'], кішка: ['noun'], гроші: ['noun'], гроші_: ['noun'], картопля: ['noun'], грулі: ['noun'], там: ['adv'], тама: ['adv'] }
const posOf = (w: string) => (VESUM[plain(w)] ? pos(...VESUM[plain(w)]!) : undefined)

// the щоб entry as en.wiktionary (kaikki) has it, 2026-10 (data/raw/kaikki/uk.jsonl)
const KK: KkEntry[] = [
  { word: 'щоб', pos: 'conj', forms: [{ form: 'що́би', tags: ['alternative'] }, { form: 'шоб', tags: ['alternative'] }], senses: [{ glosses: ['so that'], synonyms: [{ word: 'аби' }] }, { glosses: ['lest'] }] },
  { word: 'аби', pos: 'conj', senses: [{ glosses: ['so that, in order to'], synonyms: [{ word: 'щоб' }] }] },
  { word: 'тама', pos: 'adv', senses: [{ glosses: ['there'], tags: ['alt-of', 'alternative', 'dated', 'dialectal'], alt_of: [{ word: 'там' }] }] },
]
const kkIndex = (): KkIndex => { const ix: KkIndex = { senseCount: new Map(), syn: new Map() }; for (const e of KK) kaikkiIndexAdd(ix, e); return ix }
const rej = {}
const ownerGroup = (): CorrGroup[] => {
  const ix = kkIndex()
  const pairs = [...familyPairs(), ...ownerPairs(), ...KK.flatMap(e => kaikkiPairs(e, ix, posOf, rej))]
  return assemble(pairs).groups
}

describe('CR-1 guards: precision over recall', () => {
  it('кит and кіт are different words: an и/і swap is never a pair', () => {
    expect(swapKey('кит')).toBe(swapKey('кіт'))
    expect(checkPair('кит', 'кіт', posOf('кит'), posOf('кіт'))).toEqual({ ok: false, why: 'и/і swap' })
  })
  it('single words only, the same POS, a known POS', () => {
    expect(isSingleWord('гроші')).toBe(true); expect(isSingleWord('летюча миша')).toBe(false)
    expect(checkPair('летюча миша', 'гроші', undefined, undefined).why).toBe('multi-word')
    expect(checkPair('там', 'кішка', posOf('там'), posOf('кішка')).why).toBe('POS differs')
    expect(checkPair('там', 'невідоме', posOf('там'), undefined).why).toBe('POS unknown')
  })
  it('a multi-word gloss of a dialect dictionary is not a correspondence; a single-word gloss is', () => {
    const r = {}, rows = [
      { w: ['мишпергач'], gloss: 'летюча миша', codes: ['LEM'], src: 'ENC', loc: 'um172', q: 'мишпергач … ‘летюча миша’' },
      { w: ['грулі'], gloss: 'картопля', codes: ['LEM'], src: 'ENC', loc: 'um172', q: 'ґрул’і … ‘картопля’' },
    ]
    const ps = dialectLexPairs(rows, posOf, r)
    expect(ps.map(p => p.b)).toEqual(['грулі']); expect(ps[0]!.areaB![0]!.dialect).toBe('лемківський'); expect(ps[0]!.areaB![0]!.grade).toBe('dict')
    expect(Object.keys(r).some(k => k.includes('multi-word gloss'))).toBe(true)
  })
  it('a dictionary «Те саме, що» pointer: a spelling variant is one sense, another word with several meanings is «значення не уточнено»', () => {
    const r = {}, xr = { тама: [{ k: 'same' as const, t: 'там', d: 'sum11', l: 'т. 10, с. 5' }], кішка: [{ k: 'see' as const, t: 'кіт', d: 'sum11' }] }
    const ps = xrPairs(xr, posOf, r, (w) => (w === 'там' ? 3 : 1))
    expect(ps).toHaveLength(1); expect(ps[0]!.sense).toBe('one')   // тама ~ там: three letters apart = the same word varied
    const lex = xrPairs({ аби: [{ k: 'same' as const, t: 'щоб', d: 'sum11' }] }, posOf, r, () => 2)
    expect(lex[0]!.sense).toBe('unspec')
  })
  it('uk.wiktionary synonyms are used only when both pages list each other', () => {
    const ps = ukWiktPairs({ аби: [{ t: 'щоб', r: 's', d: 'u', n: 1, g: 'щоб' }], щоб: [{ t: 'аби', r: 's', d: 'u' }], там: [{ t: 'тама', r: 's', d: 'u' }] }, posOf, {})
    expect(ps).toHaveLength(1); expect(ps[0]!.sense).toBe('one'); expect(ps.some(p => p.a === 'там')).toBe(false)   // a one-sided row is dropped (spot-check 2026-11-04)
  })
  it('every pair carries evidence, and a member without evidence is a build error', () => {
    for (const p of [...familyPairs(), ...ownerPairs()]) { expect(p.ev.source).toBeTruthy(); expect(p.ev.quote).toBeTruthy(); expect(p.ev.locator).toBeTruthy() }
    const g = ownerGroup()[0]!; const bad: CorrGroup = { ...g, members: [{ ...g.members[0]!, evidence: [] }] }
    expect(() => checkGroup(bad)).toThrow()
  })
  it('a merge that would exceed the cap is skipped (a polysemous bridge), not silently chained', () => {
    const ev = D('s', 'l', 'q'), many: CorrPair[] = Array.from({ length: GROUP_CAP + 3 }, (_, i) => ({ a: 'слово', b: 'сло' + 'в'.repeat(i + 1), pos: 'noun', rel: 'lexical' as const, src: 'wikt-syn-en', ev, sense: 'one' as const }))
    const { groups, stats } = assemble(many)
    expect(Math.max(...groups.map(g => g.members.length))).toBeLessThanOrEqual(GROUP_CAP); expect(stats.capped).toBeGreaterThan(0)
  })
})

describe('CR-1 щоб ~ щоби ~ коби ~ жеби ~ аби', () => {
  it('one group holds the owner-named set, with the sources that were found', () => {
    const gs = ownerGroup().filter(g => g.members.some(m => m.form === 'щоб'))
    expect(gs).toHaveLength(1)
    const g = gs[0]!, forms = g.members.map(m => m.form)
    for (const f of ['щоб', 'шоб', 'жеби', 'коби', 'аби']) expect(forms, f).toContain(f)
    expect(g.pos).toBe('conj'); expect(g.meaning).toBe('сполучник мети')
    // жеби: ЕУМ «Надсянський говір» (a dictionary-grade area); коби: the owner's pairing + en.wiktionary «dialectal Ukrainian коби»
    const z = g.members.find(m => m.form === 'жеби')!, k = g.members.find(m => m.form === 'коби')!
    expect(z.areas[0]).toMatchObject({ dialect: 'надсянський говір', code: 'SYAN', grade: 'dict' }); expect(z.areas[0]!.ev.locator).toContain('litopys.org.ua')
    expect(k.src).toContain('owner'); expect(k.evidence.some(e => e.kind === 'P')).toBe(true); expect(k.areas[0]!.grade).toBe('dict'); expect(k.areas[0]!.ev.source).toContain('Вікісловник')
    expect(g.members.find(m => m.form === 'щоб')!.norm).toBe(true)
  })
  it('the card of each member shows ALL the others (щоб, коби, жеби), itself highlighted, the area and the first fixation rendered', async () => {
    const g = ownerGroup().find(x => x.members.some(m => m.form === 'щоб'))!
    g.members.find(m => m.form === 'жеби')!.first = { year: 1577, witness: 'i14_09', href: '/witness/i14_09', kind: 'corpus', label: 'Загоровський' }
    g.members.find(m => m.form === 'жеби')!.freq = 52
    for (const me of ['щоб', 'коби', 'жеби', 'аби']) {
      const html = await render(CorrView, { lemma: me, groups: [g] }, true)
      for (const m of g.members.filter(x => x.form !== me)) expect(html, `${me} shows ${m.form}`).toContain(`>${m.form}</a>`)
      expect(html).toContain(`>${me}</strong>`)
    }
    const html = await render(CorrView, { lemma: 'щоб', groups: [g] }, true)
    expect(html).toContain('надсянський говір'); expect(html).toContain('[за словником]'); expect(html).toContain('перша фіксація в корпусі: 1577, Загоровський'); expect(html).toContain('href="/witness/i14_09"')
    expect(html).toContain('У говорах і варіантах'); expect(html).toContain('говір не встановлено')   // аби / шоб have no area: still shown
  })
  it('the same members, whichever card is open (symmetry as a property of the stored group)', () => {
    const g = ownerGroup().find(x => x.members.some(m => m.form === 'щоб'))!
    const all = g.members.map(m => plain(m.form)).sort()
    for (const m of g.members) {
      const rows = tableRows(g, m.form).map(r => plain(r.form)).sort(); expect(rows).toEqual(all)
      expect(tableRows(g, m.form).filter(r => r.self).map(r => r.form)).toEqual([m.form])
    }
  })
})

describe('CR-1 ся ~ сє (owner)', () => {
  it('сє is an owner-grade Галичина and a hedged Тернопільщина, shown on both cards', async () => {
    const g = assemble([...ownerPairs()]).groups.find(x => x.members.some(m => m.form === 'сє'))!
    const m = g.members.find(x => x.form === 'сє')!
    expect(m.areas.map(a => a.grade)).toEqual(['owner', 'owner']); expect(m.areas[1]!.ev.quote).toBe('і вроді тернопільський')
    for (const me of ['ся', 'сє']) { const html = await render(CorrView, { lemma: me, groups: [g] }, true); expect(html).toContain('за свідченням носія: Галичина'); expect(html).toContain('Тернопільщина (невпевнено)') }
  })
})

describe('CR-1 symmetry for every group (property)', () => {
  it('each member card shows every other member, for generated groups of every size and for the stored seed groups', async () => {
    const ev = D('s', 'l', 'q')
    let seed = 7; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
    const pool = ['аба', 'бага', 'вага', 'гава', 'дага', 'жага', 'зага', 'каба', 'лага', 'мага', 'нага', 'пага', 'рага', 'сага']
    for (let t = 0; t < 12; t++) {
      const n = 2 + Math.floor(rnd() * 8), ws = [...pool].sort(() => rnd() - 0.5).slice(0, n)
      const pairs: CorrPair[] = ws.slice(1).map(w => ({ a: ws[0]!, b: w, pos: 'noun', rel: 'lexical' as const, src: 'wikt-alt', ev, sense: 'one' as const }))
      const { groups } = assemble(pairs); expect(groups).toHaveLength(1)
      for (const m of groups[0]!.members) {
        const gs = groupsForCard(groups, m.form)
        expect(otherCount(gs, m.form)).toBe(n - 1)
        const html = await render(CorrView, { lemma: m.form, groups }, true)
        for (const o of groups[0]!.members.filter(x => x !== m)) expect(html).toContain(`>${o.form}</a>`)
      }
    }
  })
  it('the stored groups survive the shard round trip (interned evidence)', () => {
    const gs = ownerGroup(), by: Record<string, CorrGroup[]> = { щоб: gs }
    const back = unpackCg(JSON.parse(JSON.stringify(packCg(by))))
    expect(back['щоб']).toEqual(gs)
  })
})

describe('CR-1 honest grades', () => {
  const witnessRegion = (id: string) => ({ w1: 'Галичина', w2: 'Галичина', w3: 'Галичина', w4: 'Київщина', w5: 'Київщина' }[id])
  it('a corpus distribution needs ≥ 30 tokens in ≥ 3 witnesses and a 60 % share, and says what it is', () => {
    expect(corpusArea({ w1: 20, w2: 5, w3: 2 }, witnessRegion)).toBeUndefined()   // 27 tokens
    expect(corpusArea({ w1: 40, w4: 30 }, witnessRegion)).toBeUndefined()   // 2 witnesses
    expect(corpusArea({ w1: 20, w2: 20, w4: 20, w5: 20 }, witnessRegion)).toBeUndefined()   // 50 %, and only 2 Галичина witnesses
    const a = corpusArea({ w1: 30, w2: 30, w3: 18, w4: 22 }, witnessRegion)!
    expect(a).toMatchObject({ dialect: 'Галичина', grade: 'corpus', tokens: 78, witnesses: 3 }); expect(a.share).toBeCloseTo(0.78, 2)
    expect(a.ev.note).toContain('не діалектна мітка'); expect(CORPUS_MIN).toEqual({ tokens: 30, witnesses: 3, share: 0.6 })
  })
  it('a corpus-only member never prints a dialect name as a fact: «у корпусі переважно: Галичина (78 %)» and «корп.: Галичина»', async () => {
    const ev = D('s', 'l', 'q'), a = corpusArea({ w1: 30, w2: 30, w3: 18, w4: 22 }, witnessRegion)!
    const m = (form: string, areas: CorrMember['areas']): CorrMember => ({ form, norm: form === 'щоб', relation: 'lexical', areas, src: ['wikt-alt'], evidence: [ev] })
    const g: CorrGroup = { id: 'cg:conj:test', meaning: 'сполучник мети', pos: 'conj', members: [m('щоб', []), m('кобі', [a])] }
    const html = await render(CorrView, { lemma: 'щоб', groups: [g] }, true)
    expect(html).toContain('у корпусі переважно: Галичина (78 %)'); expect(html).toContain('корп.: Галичина'); expect(html).toContain('[за розподілом у корпусі]')
    expect(html).not.toMatch(/галицьк/i); expect(html).not.toContain('(Галичина')   // never as a bare area chip
    expect(topLine(g, 'щоб')!.chips[0]!.area).toBe('корп.: Галичина')
  })
  it('an owner area is «за свідченням носія», no evidence is «говір не встановлено»', () => {
    const ev = D('s', 'l', 'q'), g: CorrGroup = { id: 'x', meaning: 'm', pos: 'noun', members: [
      { form: 'один', norm: true, relation: 'lexical', areas: [], src: ['owner'], evidence: [ev] },
      { form: 'два', norm: false, relation: 'lexical', areas: [{ dialect: 'Бойківщина', grade: 'owner', ev }], src: ['owner'], evidence: [ev] }] }
    const rows = tableRows(g, 'один'); expect(rows.find(r => r.form === 'два')!.area).toBe('за свідченням носія: Бойківщина'); expect(rows.find(r => r.form === 'один')!.area).toBe('говір не встановлено')
  })
  it('the first fixation is the first in OUR corpus: a dictionary date is printed separately, OCR-only is marked, never «first in the language»', () => {
    const ev = D('s', 'l', 'q')
    const g: CorrGroup = { id: 'x', meaning: 'm', pos: 'noun', members: [{ form: 'слово', norm: true, relation: 'lexical', areas: [], src: ['family'], evidence: [ev],
      first: { year: 1886, witness: 'w', href: '/witness/w', kind: 'corpus', label: 'Желехівський' }, firstDict: { year: 1301, to: 1500, witness: 'dsu', href: '/witness/dsu', kind: 'dict' }, ocrEarlier: 1784 }] }
    const t = tableRows(g, 'інше')[0]!.first
    expect(t).toContain('перша фіксація в корпусі: 1886, Желехівський'); expect(t).toContain('у словнику з 1301–1500'); expect(t).toContain('раніше лише в OCR, не вичитано: 1784'); expect(t).not.toMatch(/в мові/)
  })
  it('the «Говір» switch only reorders and marks the members of that dialect', () => {
    const g = ownerGroup().find(x => x.members.some(m => m.form === 'щоб'))!
    const plainLine = topLine(g, 'щоб')!.chips.map(c => c.form), syan = topLine(g, 'щоб', 'SYAN')!
    expect(syan.chips[0]).toMatchObject({ form: 'жеби', dialectHit: true }); expect(syan.chips.filter(c => c.dialectHit)).toHaveLength(1)
    expect([...syan.chips.map(c => c.form)].sort()).toEqual([...plainLine].sort())
    expect(tableRows(g, 'щоб', 'SYAN')[0]).toMatchObject({ form: 'жеби', dialectHit: true })
  })
  it('at most 5 chips, the rest behind «ще N»; members of an undetermined sense stay out of the top line; a word with no group shows nothing', async () => {
    const ev = D('s', 'l', 'q'), mk = (form: string, unspec?: true): CorrMember => ({ form, norm: false, relation: 'lexical', areas: [], src: ['xr'], evidence: [ev], ...(unspec ? { unspec } : {}) })
    const g: CorrGroup = { id: 'x', meaning: 'm', pos: 'noun', members: [mk('аа'), mk('бб'), mk('вв'), mk('гг'), mk('дд'), mk('ее'), mk('жж'), mk('зз', true)] }
    const t = topLine(g, 'аа')!; expect(t.chips).toHaveLength(5); expect(t.more).toBe(1); expect(t.chips.map(c => c.form)).not.toContain('зз')
    expect(await render(CorrView, { lemma: 'невідоме', groups: [g] })).not.toContain('data-testid="corr"')
    expect(await render(CorrView, { lemma: 'аа', groups: [g] }, true)).toContain('значення не уточнено')
  })
  it('кит and кіт share no group, in the seed groups or by the guards', () => {
    const gs = ownerGroup(); expect(gs.some(g => g.members.some(m => m.form === 'кит') && g.members.some(m => m.form === 'кіт'))).toBe(false)
    const r = {}, ps = kaikkiPairs({ word: 'кит', pos: 'noun', senses: [{ glosses: ['whale'], synonyms: [{ word: 'кіт' }] }] }, kkIndex(), posOf, r)
    expect(ps).toEqual([])
  })
})

describe('CR-1 display: collapsed by default, nothing on the first fetch', () => {
  it('«Відповідники · N» is collapsed by default (no table rendered yet); opening it shows the table with the six columns', async () => {
    const g = ownerGroup().find(x => x.members.some(m => m.form === 'щоб'))!, n = g.members.length - 1
    const closed = await render(CorrView, { lemma: 'щоб', groups: [g] })
    expect(closed).toContain(`Відповідники · ${n}`); expect(closed).toContain('aria-expanded="false"'); expect(closed).not.toContain('data-testid="coll-body"'); expect(closed).not.toContain('<table')
    const open = await render(CorrView, { lemma: 'щоб', groups: [g] }, true)
    for (const c of ['Форма', 'Тип', 'Говір', 'Перша фіксація', 'Вживань', 'Джерело']) expect(open).toMatch(new RegExp(`<th[^>]*>${c}</th>`))
    expect(open).toContain('інше слово'); expect(open).toContain('та сама лексема')
  })
  it('PF-2: the sidecar is lm/cg (lazy), in LM_NAMES, absent from cardData, loaded by an async component; build:data runs build-corr before build-parts', () => {
    expect(LM_NAMES).toContain('cg')
    expect(cardData('щоб', 'w1', 'щоб').some(u => u.includes('cg'))).toBe(false)
    expect(readFileSync('src/components/OverviewTab.vue', 'utf8')).toContain("defineAsyncComponent(() => import('./CorrBlock.vue'))")
    expect(readFileSync('src/lib/corrData.ts', 'utf8')).toContain('./data/lm/cg/')
    const pkg = readFileSync('package.json', 'utf8'); expect(pkg.indexOf('build-corr.ts')).toBeGreaterThan(0); expect(pkg.indexOf('build-corr.ts')).toBeLessThan(pkg.indexOf('build-parts.ts')); expect(pkg.indexOf('build-corr.ts')).toBeGreaterThan(pkg.indexOf('pipelines/build.ts'))
    expect(readFileSync('pipelines/build-parts.ts', 'utf8')).toContain("lm/cg/")
    expect(readFileSync('pipelines/build-corr.ts', 'utf8')).toMatch(/writeJsonAtomic\(work\('corr\.json'\)/)
  })
  it('the old «Родина варіантів» block is gone from every card (one block, not two); the families are a source of the groups', () => {
    for (const f of ['src/components/LemmaBlocks.vue', 'src/views/WordView.vue']) expect(readFileSync(f, 'utf8')).not.toContain('VariantFamilyLine')
    expect(existsSync('src/components/VariantFamilyLine.vue')).toBe(false)
    expect(familyPairs().some(p => p.a === 'між' && p.b === 'межи')).toBe(true)
  })
})

// a real build, when one exists (data/work/corr.json, made by pipelines/build-corr.ts): the stored groups obey the same rules
const real = process.env.CORR_FILE ?? 'data/work/corr.json'
describe.skipIf(!existsSync(real))('CR-1 real data (skips without data/work/corr.json)', () => {
  const groups = (existsSync(real) ? JSON.parse(readFileSync(real, 'utf8')).groups : []) as CorrGroup[]
  it('every group passes claim(); no group pairs two words that differ only by и/і; кит and кіт share none; sizes ≤ cap', () => {
    for (const g of groups) { checkGroup(g); expect(g.members.length).toBeLessThanOrEqual(GROUP_CAP); expect(g.members.length).toBeGreaterThanOrEqual(2) }
    for (const g of groups) { const keys = g.members.map(m => swapKey(m.form)); expect(new Set(keys).size, g.id).toBe(keys.length) }
    expect(groups.some(g => g.members.some(m => m.form === 'кит') && g.members.some(m => m.form === 'кіт'))).toBe(false)
  })
  it('every member card shows all the other members (all groups)', () => {
    for (const g of groups) for (const m of g.members) expect(tableRows(g, m.form).map(r => plain(r.form)).sort(), g.id).toEqual(g.members.map(x => plain(x.form)).sort())
  })
  it('a corpus area is always ≥ the stated minimum and carries the rule', () => {
    for (const g of groups) for (const m of g.members) for (const a of m.areas.filter(x => x.grade === 'corpus')) { expect(a.tokens!).toBeGreaterThanOrEqual(CORPUS_MIN.tokens); expect(a.witnesses!).toBeGreaterThanOrEqual(CORPUS_MIN.witnesses); expect(a.share!).toBeGreaterThanOrEqual(CORPUS_MIN.share) }
  })
})
