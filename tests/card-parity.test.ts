/** SPEC 63 CP-1…CP-6: every card kind shows every feature block its data allows (src/lib/cardParity.ts); the shared blocks render with honest empty states. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { BLOCKS, KINDS, MATRIX, NA, cellsOf } from '../src/lib/cardParity.ts'
import { attachCvStress, cvStressOf, cvStressVariants, shardsOfCv, type CvEntry } from '../core/cv.ts'
import { formsWitnesses, kwicFromRefs, witnessCounts } from '../src/lib/refKwic.ts'
import ThinCard from '../src/components/ThinCard.vue'
import LemmaBlocks from '../src/components/LemmaBlocks.vue'
import WitnessBlock from '../src/components/WitnessBlock.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const spec = rd('specs/63-corpus-dialects.md')
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}

describe('CP-1 the parity matrix is true to the sources', () => {
  it('CP-1 every shown / empty cell: some component of its block occurs in the sources the card kind mounts', () => {
    const bad: string[] = []
    for (const [k, b] of cellsOf(c => c === 'shown' || c === 'empty')) {
      const src = KINDS[k].map(rd).join('\n')
      if (!BLOCKS[b].some(tag => src.includes(tag))) bad.push(`${k} × ${b}`)
    }
    expect(bad).toEqual([])
  })
  it('CP-6 no cell waits for a build item any more: stress is on the lemma-bearing thin kinds (empty state until the rebuild) and n/a where no dictionary knows the word', () => {
    expect(cellsOf(c => c === 'build')).toEqual([]); expect(MATRIX.light.stress).toBe('empty'); expect(MATRIX.dict.stress).toBe('empty'); expect(MATRIX.archaic.stress).toBe('na')
    expect(spec).toContain("**CP-6** (implemented")
  })
  it('CP-1 the SE sense timeline row is shown on every kind but the phrase page, and every layout mounts SenseEpochs (SPEC 63 SE-6)', () => {
    expect(cellsOf(c => c === 'pending')).toEqual([])
    for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) if (MATRIX[k].senseTimeline === 'shown') expect(KINDS[k].map(rd).join('\n'), k).toContain('<SenseEpochs')
  })
  it('CP-1 every na reason is written, and the spec prints the matrix row of every card kind', () => {
    expect(NA.light).toBeTruthy(); expect(NA.phrase).toBeTruthy(); expect(MATRIX.phrase.etymology).toBe('na')
    for (const k of Object.keys(KINDS)) expect(spec, k).toContain(`\`${k}\``)
  })
  it('CP-1 the filled cells are counted', () => {
    expect(cellsOf(c => c === 'shown' || c === 'empty').length).toBeGreaterThanOrEqual(100)
  })
})

describe('CP-2 shared blocks on the thin cards', () => {
  it('CP-2 LemmaBlocks renders every lemma-keyed block with an honest empty state when nothing is known', async () => {
    const html = await render(LemmaBlocks, { lemma: 'невідомеслово', spelling: 'невідомеслово' })
    for (const id of ['t-ipa', 't-sn', 'h-ety', 'h-cog', 'h-phr']) expect(html, id).toContain(`id="${id}"`)
    expect(html).toContain('data-testid="lemma-blocks"')
  })
  it('CP-2 ThinCard on a dictionary-only card collapses KWIC, map and statistics with «немає засвідчень у корпусі»', async () => {
    const html = await render(ThinCard, { lemma: 'невідомеслово', spelling: 'невідомеслово', kwic: [], dictOnly: true, f: 0 })
    for (const id of ['t-kw', 't-dia', 't-der', 't-reg', 't-st', 't-sn']) expect(html, id).toContain(`id="${id}"`)
    expect(html.match(/немає засвідчень у корпусі/g)!.length).toBeGreaterThanOrEqual(2)
  })
  it('CP-2 ThinCard without f says «частоту не визначено», never a number', async () => {
    const html = await render(ThinCard, { spelling: 'нѣгдѣ', kwic: [] })
    expect(html).toContain('частоту не визначено')
  })
  it('CP-2 ThinCard hides the blocks the host page already prints (noKwic, noDerivation)', async () => {
    const html = await render(ThinCard, { spelling: 'нѣгдѣ', kwic: [], noKwic: true, noDerivation: true })
    expect(html).not.toContain('id="t-kw"'); expect(html).not.toContain('id="t-der"'); expect(html).toContain('id="t-dia"')
  })
  it('CP-2 WitnessBlock with no witness is collapsed with the empty state; /w and /f sum the same per-witness tokens', async () => {
    const html = await render(WitnessBlock, { items: [] })
    expect(html).toContain('немає засвідчень у корпусі'); expect(html).toContain('Пам’ятки · Witnesses')
    expect(formsWitnesses([{ byW: { a: 3, b: 1 }, kwic: [] }, { kwic: [{ w: 'a' }, { w: 'c' }] }])).toEqual([{ w: 'a', n: 4 }, { w: 'b', n: 1 }, { w: 'c', n: 1 }])
    expect(witnessCounts([{ w: 'x' }, { w: 'y' }, { w: 'x' }])).toEqual([{ w: 'x', n: 2 }, { w: 'y', n: 1 }])
    const w = rd('src/views/WordView.vue'); expect(w).toContain('<WitnessBlock v-if="full"'); expect(w).toContain('formsWitnesses(')
  })
})

describe('CP-3 archaic and TOROT cards carry KWIC cut from the witness text', () => {
  it('CP-3 kwicFromRefs cuts one line per distinct (witness, locator), skips missing shards and locators, stamps the witness date and never invents a line', async () => {
    const toks = [['а', '1.1', ''], ['б', '1.2', ''], ['в', '1.3', '']] as never
    const load = async (id: string) => (id === 'w1' ? toks : null)
    const out = await kwicFromRefs([{ w: 'w1', loc: '1.2' }, { w: 'w1', loc: '1.2' }, { w: 'w2', loc: '1.1' }, { w: 'w1', loc: '9.9' }], () => [1100, 1200], 8, load)
    expect(out.length).toBe(1); expect(out[0]).toMatchObject({ w: 'w1', node: 'б', date: [1100, 1200] })
  })
  it('CP-3 /ar, /name, /orv, /uv, the light cards and the unlinked spelling mount ThinCard with f; /ar and /name cut their lines from the text', () => {
    for (const p of ['src/views/ArchaicView.vue', 'src/views/TorotCardView.vue', 'src/views/UnverifiedView.vue', 'src/views/LightWordView.vue', 'src/components/UnlinkedSpelling.vue']) expect(rd(p), p).toMatch(/<ThinCard[^]*? :f=/)
    for (const p of ['src/views/ArchaicView.vue', 'src/views/TorotCardView.vue']) expect(rd(p), p).toContain('kwicFromRefs(')
    for (const p of ['src/views/TorotCardView.vue', 'src/views/UnverifiedView.vue']) expect(rd(p), p).toContain('<PlastSenses')
  })
})

describe('CP-5 the full word card and the form page lose nothing', () => {
  it('CP-5 /w mounts the derivation chain and the dialect block of the chosen spelling; /f mounts the lemma blocks and the lemma stress', () => {
    const w = rd('src/views/WordView.vue'), f = rd('src/views/FormView.vue')
    for (const c of ['<DerivationSteps', '<DialectBlock', 'id="h-chain"', 'id="h-dia"']) expect(w, c).toContain(c)
    for (const c of ['<LemmaBlocks', '<StressForms', '<PlastSenses']) expect(f, c).toContain(c)
    expect(w.match(/Panel [^>]*id="h-der"/g) ?? []).toHaveLength(0)   // h-der belongs to DerivativesBlock: no duplicate DOM id
  })
})

describe('CP-6 stress of the thin cards from the build (fixture, no full build)', () => {
  const sj = { forms: {
    абажур: [{ stressed: 'абажу́р', positions: [3], ambiguous: false }], замок: [{ stressed: 'за́мок', positions: [0], ambiguous: true }, { stressed: 'замо́к', positions: [2], ambiguous: true }],
    вода: [{ stressed: 'вода́', positions: [3], ambiguous: false }, { stressed: 'во́да', positions: [1], ambiguous: false }], невідоме: [], складне: [{ stressed: 'х', positions: [0, 2], ambiguous: false }],
  } }
  it('CP-6 cvStressOf keeps single-position non-homograph variants only: homographs, compounds and unknown words get no stress (nothing guessed)', () => {
    expect(cvStressOf('абажур', sj)).toEqual([3]); expect(cvStressOf('вода', sj)).toEqual([3, 1])
    for (const w of ['замок', 'невідоме', 'складне', 'немає']) expect(cvStressOf(w, sj), w).toBeUndefined()
    expect(cvStressOf('абажур', undefined)).toBeUndefined()
  })
  it('CP-6 attachCvStress writes s into the extra without touching the shared dictionary-only extra object', () => {
    const shared = { d: 1 }, es: [string, CvEntry][] = [['абажур', ['абажур', 'noun', 0, [], shared]], ['замок', ['замок', 'noun', 0, [], shared]], ['вода', ['вода', 'noun', 0, [], undefined]]]
    expect(attachCvStress(es, sj)).toBe(2)
    expect(es[0]![1][4]).toEqual({ d: 1, s: [3] }); expect(shared).toEqual({ d: 1 }); expect(es[1]![1][4]).toBe(shared); expect(es[2]![1][4]).toEqual({ s: [3, 1] })
  })
  it('CP-6 cvStressVariants renders the stressed form with a dictionary citation and status «unknown» (P-3.1)', () => {
    const v = cvStressVariants('абажур', [3])[0]!
    expect(v.positions).toEqual([3]); expect(v.status).toBe('unknown'); expect(v.method).toBe('dictionary'); expect(v.evidence[0]!.quote).toContain('́'); expect(cvStressVariants('x', undefined)).toEqual([])
  })
  it('CP-6 LemmaBlocks prints the stress line (not on the form page, which has it in the header); the build requests the thin-card words and attaches the result before writeCv', () => {
    expect(rd('src/components/LemmaBlocks.vue')).toMatch(/data-testid="cp-stress"/); expect(rd('src/views/LightWordView.vue')).toContain(':stress="cv?.[4]?.s"')
    const b = rd('pipelines/build.ts'); expect(b).toContain("for (const w of cvWords) stressReq.add(w)"); expect(b.indexOf('attachCvStress(cv.entries')).toBeLessThan(b.indexOf('const wc = writeCv('))
  })
  it('CP-6 per-card bytes at 450k dictionary-only cards: s adds a few bytes to the 58.8 B DO-6 card', () => {
    const L = 'абвгдежзиіклмнопрстуфхцчшщюя'; let r = 7; const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296)
    const mk = (withS: boolean) => { r = 7; const es: [string, CvEntry][] = []; for (let i = 0; i < 20000; i++) { let w = ''; for (let j = 0; j < 4 + Math.floor(rnd() * 11); j++) w += L[Math.floor(rnd() * L.length)]; es.push([w + i, [w + i, 'noun:inanim:m:v_naz', 0, [], withS && rnd() < 0.8 ? { d: 1, s: [1 + Math.floor(rnd() * 3)] } : { d: 1 }]]) } return shardsOfCv(es).reduce((a, s) => a + Buffer.byteLength(JSON.stringify(s)), 0) / es.length }
    const base = mk(false), withS = mk(true)
    console.log(`CP-6 cv/ per card: ${base.toFixed(1)} B → ${withS.toFixed(1)} B with stress on 80 % (${(withS * 450000 / 1048576).toFixed(1)} MiB at 450k cards)`)
    expect(withS - base).toBeLessThan(10); expect(withS).toBeLessThan(90)
  })
})
