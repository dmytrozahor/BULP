/** SPEC 63 LB-11…LB-13: the exhaustive dialect classification — seven classes, an evidence grade on each, the facts of the tail classes, the card and the methods page. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import {
  CLASS_KEYS, DICT_BASES, G2_STRONG, assembleEntry, classKeyOf, classUk, dialectOf, gradeOf, periodUk, summarizeWitnesses, tailClass, witnessLine, TH, emptyEntry, type RegionCount, type WitSummary,
} from '../core/labels.ts'
import { dialectHeadline, dialectHow, gradeLine } from '../src/lib/labelsText.ts'
import { cvFacts, lightFacts, archaicFacts, witMeta } from '../pipelines/lb-facts.ts'
import LabelsMethodView from '../src/views/LabelsMethodView.vue'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const render = async (c: object, props: Record<string, unknown>) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(c, props) }); app.use(router); await router.push('/'); await router.isReady()
  return renderToString(app)
}
const kyiv: WitSummary = { n: 3, regions: [['kyiv', 'Київ і Київщина']], from: 1150, to: 1199 }
const corpus = { witnesses: [{ id: 'w1', region: 'Київ', date: [1150, 1160] as [number, number] }, { id: 'w2', region: 'Київ', date: [1180, 1190] as [number, number] }, { id: 'w3', date: [1500, 1500] as [number, number] }, { id: 'r2u_zheleh', date: [1886, 1886] as [number, number] }] }

describe('LB-11 exhaustive classification: seven classes in order, each with a grade', () => {
  it('LB-11 classes 1–3 keep their order and carry their grades (strong / medium)', () => {
    const area = { t: 'x', a: 'Гал.', kind: 'area' as const, v: 'halychyna', q: 'q', u: 'u' }
    const a = dialectOf([area], [], undefined); expect(classKeyOf(a)).toBe('dict'); expect(gradeOf(a)).toBe('strong')
    const place = dialectOf([{ ...area, p: true, place: 'Лохвицький' }], [], undefined); expect(gradeOf(place)).toBe('medium'); expect(classUk(place)).toContain('не обов’язково діалектне')
    const rows: RegionCount[] = [{ code: 'a', f: 40, N: 1000 }, { code: 'b', f: 0, N: 1000 }, { code: 'c', f: 0, N: 1000 }, { code: 'd', f: 0, N: 1000 }]
    const b = dialectOf([], [], rows); expect(classKeyOf(b)).toBe('corpus'); expect(gradeOf(b)).toBe(b.corp!.top!.g2 >= G2_STRONG ? 'strong' : 'medium')
    expect(gradeOf({ c: 'corpus', corp: { top: { g2: G2_STRONG - 1 } } })).toBe('medium'); expect(gradeOf({ c: 'corpus', corp: { top: { g2: G2_STRONG + 1 } } })).toBe('strong')
    const c = dialectOf([], [], [6, 6, 6, 6].map((f, i) => ({ code: 'r' + i, f, N: 1000 }))); expect(classKeyOf(c)).toBe('general'); expect(gradeOf(c)).toBe('strong')
  })
  it('LB-11 class 4: a VESUM headword without a restrictive tag is «нормативне (ВЕСУМ), регіональних даних немає», grade середній', () => {
    const e = assembleEntry({ dict: [], usage: [], kind: 'light', vesum: true, tagLine: 'noun:inanim:m:v_naz' })
    expect(e.d.c).toBe('general'); expect(e.d.sub).toBe('vesum'); expect(classUk(e.d)).toBe('нормативне (ВЕСУМ), регіональних даних немає'); expect(classKeyOf(e.d)).toBe('norm'); expect(gradeOf(e.d)).toBe('medium')
    const slang = assembleEntry({ dict: [], usage: [], kind: 'full', vesum: true, tagLine: 'noun:inanim:m:v_naz:slang', tagCount: { slang: 1 }, nForms: 1 })
    expect(slang.d.sub).toBe('vesum'); expect(slang.d.marks).toEqual(['zharh']); expect(gradeOf(slang.d)).toBe('weak'); expect(classUk(slang.d)).toContain('із позначкою вжитку')   // a style mark restricts the register, not the region: the class stays, the grade drops
    expect(dialectHow(e.d)).toContain('ВЕСУМ'); expect(dialectHow(e.d)).toContain('ступінь доказу: середній')
  })
  it('LB-11 class 5: «засвідчено лише в N пам’ятках з X, століття (слабкий доказ)»; old witnesses are «давньоукраїнське»', () => {
    const d = tailClass(undefined, undefined, { wit: kyiv }, false)
    expect(d.c).toBe('witness'); expect(gradeOf(d)).toBe('weak'); expect(witnessLine(kyiv)).toBe('давньоукраїнське, засвідчено лише в 3 пам’ятках з Київ і Київщина, XII ст. (слабкий доказ)')
    expect(witnessLine({ ...kyiv, n: 1, from: 1600, to: 1600 })).toBe('засвідчено лише в 1 пам’ятці з Київ і Київщина, XVI ст. (слабкий доказ)')
    expect(periodUk(1101, 1299)).toBe('XII–XIII ст.'); expect(periodUk(1886, 1886)).toBe('XIX ст.')
    expect(witnessLine({ ...kyiv, atLeast: true })).toContain('щонайменше 3')
    expect(dialectHeadline(d, c => c)).toBe(witnessLine(kyiv))
  })
  it('LB-11 class 6: the base of a dictionary is quoted from its own preface; classes 5 and 6 are never called «діалектне»', () => {
    const d = tailClass(undefined, undefined, { bases: ['r2u_zheleh'] }, false)
    expect(d.c).toBe('base'); expect(gradeOf(d)).toBe('weak'); expect(dialectHeadline(d, c => c)).toContain('Желехівський'); expect(dialectHeadline(d, c => c)).toContain('галицьке середовище')
    for (const r of [d, tailClass(undefined, undefined, { wit: kyiv }, false)]) { expect(classUk(r)).not.toMatch(/діалектн/); expect(dialectHeadline(r, c => c)).not.toMatch(/діалектн/); expect(dialectHow(r)).toContain('ступінь доказу: слабкий') }
    for (const b of DICT_BASES) { expect(b.quote.length).toBeGreaterThan(30); expect(b.url).toMatch(/^https:/) }
    expect(DICT_BASES.map(b => b.id)).not.toContain('r2u_hrinch09')
    expect(tailClass(undefined, undefined, { bases: ['r2u_hrinch09'] }, false).c).toBe('few')
  })
  it('LB-11 class 7 «невизначено» says why and has no grade', () => {
    const d = tailClass(undefined, undefined, {}, false)
    expect(d.c).toBe('few'); expect(gradeOf(d)).toBeUndefined(); expect(d.why).toBeTruthy(); expect(classUk(d)).toBe('невизначено'); expect(gradeLine(d)).toContain('немає')
    expect(dialectHeadline(d, c => c)).toMatch(/^невизначено: /); expect(emptyEntry().d.why).toBeTruthy()
    const noRegion = tailClass(undefined, undefined, { wit: { n: 2, regions: [], unk: 2, from: 1500, to: 1500 } }, false); expect(noRegion.c).toBe('few'); expect(noRegion.why).toContain('регіон')
    expect(CLASS_KEYS).toEqual(['dict', 'corpus', 'general', 'norm', 'witness', 'base', 'few'])
  })
  it('LB-11 precedence: dictionary > corpus > normative > witnesses > base; the corpus rows are kept with every class', () => {
    const rows: RegionCount[] = [{ code: 'a', f: 1, N: 1000 }, { code: 'b', f: 0, N: 1000 }]
    const f = { vesum: true, wit: kyiv, bases: ['r2u_zheleh'] }
    expect(dialectOf([], [], rows, TH, undefined, f).sub).toBe('vesum'); expect(dialectOf([], [], rows, TH, undefined, f).corp!.rows).toEqual(rows)
    expect(dialectOf([], [], rows, TH, undefined, { wit: kyiv, bases: ['r2u_zheleh'] }).c).toBe('witness')
    expect(dialectOf([], [], rows, TH, undefined, { bases: ['r2u_zheleh'] }).c).toBe('base')
    expect(dialectOf([{ t: 'x', a: 'Гал.', kind: 'area', v: 'halychyna', q: 'q', u: 'u' }], [], rows, TH, undefined, f).c).toBe('dict')
  })
})

describe('LB-12 card parity and the methods page', () => {
  it('LB-12 the same grade line is on the Labels block and the Огляд line (every card kind mounts them), and in the tooltip', () => {
    const blk = rd('src/components/LabelsBlock.vue'), line = rd('src/components/LabelLine.vue')
    expect(blk).toContain('gradeLine'); expect(blk).toContain('data-testid="lb-grade"'); expect(line).toContain('gradeLine'); expect(blk).toContain('lb-base'); expect(blk).toContain('lb-why')
    expect(rd('src/lib/cardParity.ts')).toContain('labels')
  })
  it('LB-12 the methods page explains every class and grade in plain Ukrainian and prints the quoted dictionary bases', async () => {
    const html = await render(LabelsMethodView, {})
    for (const s of ['семи класів', 'Ступінь доказу', 'сильний', 'середній', 'слабкий', 'нормативне (ВЕСУМ), регіональних даних немає', 'засвідчене лише в пам’ятках регіону', 'за регіональною базою словника', 'невизначено', 'data-testid="lbm-grades"', 'data-testid="lbm-bases"', 'Галицкий', 'Угорскої Руси']) expect(html).toContain(s)
    expect(html).not.toContain('недостатньо даних')
  })
})

describe('LB-13 the facts of the tail classes and the measurement', () => {
  const wm = witMeta(corpus)
  it('LB-13 witnesses are summarised by region and years; witnesses without a region are counted apart', () => {
    const s = summarizeWitnesses(['w1', 'w2', 'w1', 'w3'], wm.meta)!
    expect(s).toMatchObject({ n: 3, unk: 1, from: 1150, to: 1500 }); expect(s.regions).toEqual([['kyiv', 'Київ і Київщина']])
    expect(summarizeWitnesses([], wm.meta)).toBeUndefined()
  })
  it('LB-13 VESUM, dictionary bases and witnesses are read from cv, light and archaic entries', () => {
    expect(cvFacts(['слово', 'noun:inanim:m:v_naz', 1, [['w1', 'l', 'слово']]], wm.meta).facts).toMatchObject({ vesum: true, wit: { n: 1 } })
    const z = cvFacts(['иногдї', '', 1, [['r2u_zheleh', 'q', 'иногдї']], { d: 2 }], wm.meta); expect(z.facts.bases).toEqual(['r2u_zheleh']); expect(z.attested).toBe(false); expect(z.facts.vesum).toBeUndefined()
    expect(cvFacts(['x', '', 1, [['r2u_zheleh', 'q', 'x'], ['r2u_hrinch09', 'q', 'x']], { d: 2 }], wm.meta).facts.bases).toBeUndefined()
    expect(lightFacts(['нельма', 'noun', 3, 'w1|t|нельмо'], wm.meta)).toMatchObject({ vesum: true, wit: { n: 1, atLeast: true } })
    expect(archaicFacts({ witnesses: { w1: 2, w2: 5, r2u_zheleh: 1 } }, wm.meta).wit).toMatchObject({ n: 3, regions: [['kyiv', 'Київ і Київщина']] })
  })
  it('LB-13 build-labels writes every entry (no default skipping), counts the seven classes over all and attested entries, and reports the reason of «невизначено»', () => {
    const b = rd('pipelines/build-labels.ts')
    expect(b).not.toContain("if (e.d.c === 'few' && !e.d.corp"); expect(b).toContain('lb11Report'); expect(b).toContain('light.json'); expect(b).toContain('archaic.json'); expect(b).toContain('lb11.few')
    expect(rd('pipelines/lb-measure.ts')).toContain('tailClass')
    expect(rd('analysis/labels-coverage.md')).toContain('LB-11')
  })
})
