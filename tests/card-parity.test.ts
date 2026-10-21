/** SPEC 63 CP-1…CP-6: every card kind shows every feature block its data allows (src/lib/cardParity.ts); the shared blocks render with honest empty states. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { BLOCKS, KINDS, MATRIX, NA, cellsOf } from '../src/lib/cardParity.ts'
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
  it('CP-1 the only build-pending cells are the stress of the thin kinds, and CP-6 names the pipeline place in the spec', () => {
    const build = cellsOf(c => c === 'build')
    expect(build.length).toBeGreaterThan(0); for (const [, b] of build) expect(b).toBe('stress')
    expect(spec).toMatch(/\*\*CP-6\*\*/)
  })
  it('CP-1 the SE sense timeline row is pending on every kind but the phrase page, and every layout keeps its SE-SLOT mount point', () => {
    const pend = cellsOf(c => c === 'pending'); expect(pend.length).toBe(Object.keys(KINDS).length - 1); for (const [, b] of pend) expect(b).toBe('senseTimeline')
    for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) if (MATRIX[k].senseTimeline === 'pending') expect(KINDS[k].map(rd).join('\n'), k).toContain('SE-SLOT')
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
