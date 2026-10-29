/** SPEC 63 LB-11…LB-13: the exhaustive dialect classification — seven classes, an evidence grade on each, the facts of the tail classes, the card and the methods page. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import {
  CLASS_KEYS, DICT_BASES, HIST_DICTS, histOf, baseOf, nowitLine, G2_STRONG, assembleEntry, classKeyOf, classUk, dialectOf, gradeOf, periodUk, summarizeWitnesses, tailClass, witnessLine, TH, emptyEntry, type RegionCount, type WitSummary,
} from '../core/labels.ts'
import { dialectHeadline, dialectHow, gradeLine, histEvidence } from '../src/lib/labelsText.ts'
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
    const noRegion = tailClass(undefined, undefined, { wit: { n: 2, regions: [], unk: 2, from: 1500, to: 1500 } }, false); expect(noRegion.c).toBe('nowit'); expect(gradeOf(noRegion)).toBe('weak')   // LB-14: attested, region unknown: its own class, never «невизначено»
    expect(CLASS_KEYS).toEqual(['dict', 'corpus', 'general', 'norm', 'witness', 'base', 'epoch', 'author', 'nowit', 'few'])
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
    for (const s of ['десяти класів', 'data-testid="lbm-hist"', 'історична лексика за словником епохи', 'мова автора', 'Ступінь доказу', 'сильний', 'середній', 'слабкий', 'нормативне (ВЕСУМ), регіональних даних немає', 'засвідчене лише в пам’ятках регіону', 'за регіональною базою словника', 'невизначено', 'data-testid="lbm-grades"', 'data-testid="lbm-bases"', 'Галицкий', 'Угорскої Руси']) expect(html).toContain(s)
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
    expect(rd('analysis/labels-coverage.md')).toContain('LB-1')
  })
})

describe('LB-14 honest classes for the tail: epoch dictionaries, author dictionary, Nosenko base, witnesses without a region', () => {
  const wm = witMeta({ witnesses: [
    { id: 'o1', title: 'Архангельське Євангеліє 1092', witnessType: 'ocr', date: [1092, 1092] }, { id: 'o2', title: 'Ізборник', witnessType: 'ocr', date: [1200, 1250] },
    { id: 't1', title: 'TOROT text', witnessType: 'ms_copy', date: [1300, 1300] }, { id: 'k1', region: 'Київ', witnessType: 'ocr', date: [1500, 1500] },
  ] })
  const cv = (atts: string[], d: number) => cvFacts(['слово', '', 1, atts.map(a => [a, 'q', 'слово']), { d }], wm.meta)
  it('LB-14 class 7: a word only in Тимченко / СУМ XVI–XVII / Кримський–Єфремов is «історична лексика за словником епохи», grade середній, with the dictionary\'s own words', () => {
    for (const [id, bit] of [['timchenko', 8192], ['sum16', 16384], ['timchenko-materials', 32768], ['r2u_krymsky', 256]] as const) {
      const x = cv(id === 'r2u_krymsky' ? [id] : [], bit); expect(x.facts.hist).toEqual([id]); expect(x.attested).toBe(false)
      const d = tailClass(undefined, undefined, x.facts, false)
      expect(d.c).toBe('epoch'); expect(classKeyOf(d)).toBe('epoch'); expect(gradeOf(d)).toBe('medium'); expect(classUk(d)).toBe('історична лексика за словником епохи')
      expect(dialectHeadline(d, c => c)).toContain(histOf(id)!.short); expect(dialectHeadline(d, c => c)).not.toMatch(/діалектн/)
      const ev = histEvidence(d); expect(ev).toHaveLength(1); expect(ev[0]!.quote.length).toBeGreaterThan(60); expect(ev[0]!.cite).toBeTruthy(); expect(ev[0]!.url).toMatch(/^https:/)
    }
    expect(histOf('timchenko')!.quote).toContain('з найдавнішого його часу до ХІХ віку')
    expect(histOf('sum16')!.quote).toContain('книжну і народнорозмовну лексику'); expect(histOf('r2u_krymsky')!.quote).toContain('за останні 50 – 55 років')
    expect(histOf('r2u_krymsky')!.scope).toContain('регіональної бази передмова не називає')   // no regional base is claimed for Кримський–Єфремов
    expect(baseOf('r2u_krymsky')).toBeUndefined()
  })
  it('LB-14 class 6 now also holds Білецький-Носенко (its preface names the Poltava governorate and neighbours); mixed epoch + base keeps both; an unread dictionary keeps the entry «невизначено»', () => {
    const n = cv([], 65536); expect(n.facts.bases).toEqual(['biletsky-nosenko']); expect(n.facts.hist).toBeUndefined()
    const d = tailClass(undefined, undefined, n.facts, false); expect(d.c).toBe('base'); expect(gradeOf(d)).toBe('weak')
    expect(baseOf('biletsky-nosenko')!.quote).toContain('Полтавской'); expect(baseOf('biletsky-nosenko')!.quote).toContain('Галиціи')
    const mixed = cv([], 65536 | 8192); expect(mixed.facts).toMatchObject({ bases: ['biletsky-nosenko'], hist: ['timchenko'] })
    const m = tailClass(undefined, undefined, mixed.facts, false); expect(m.c).toBe('epoch'); expect(m.bases).toEqual(['biletsky-nosenko'])
    const grinchenko = cv(['r2u_hrinch09'], 8192 | 16); expect(grinchenko.facts.hist).toBeUndefined(); expect(tailClass(undefined, undefined, grinchenko.facts, false).c).toBe('few')   // Грінченко's preface is not read: no class is invented
  })
  it('LB-14 class 8: Словник мови Шевченка is «мова автора», grade слабкий; the author\'s region only with its cited source and worded as the author\'s birthplace', () => {
    const x = cv([], 131072); expect(x.facts.hist).toEqual(['shevchenko'])
    const d = tailClass(undefined, undefined, x.facts, false)
    expect(d.c).toBe('author'); expect(classKeyOf(d)).toBe('author'); expect(gradeOf(d)).toBe('weak'); expect(classUk(d)).toBe('мова автора')
    const h = histOf('shevchenko')!; expect(h.quote).toContain('Основне ж його завдання'); expect(h.region!.url).toMatch(/^https:/); expect(h.region!.quote).toContain('Київська губернія')
    expect(dialectHeadline(d, c => c)).toContain('місце народження автора'); expect(dialectHeadline(d, c => c)).not.toMatch(/діалектн/)
    const both = cv([], 131072 | 8192); expect(tailClass(undefined, undefined, both.facts, false).c).toBe('epoch')
  })
  it('LB-14 class 9: attested only in witnesses with no region is «засвідчено лише в OCR-пам’ятках без регіону» (слабкий), naming the witnesses; never a dialect claim', () => {
    const w = summarizeWitnesses(['o1', 'o2'], wm.meta)!
    expect(w.regions).toEqual([]); expect(w.ocr).toBe(true); expect(w.names).toEqual([['o1', 'Архангельське Євангеліє 1092'], ['o2', 'Ізборник']])
    const d = tailClass(undefined, undefined, { wit: w }, false)
    expect(d.c).toBe('nowit'); expect(classKeyOf(d)).toBe('nowit'); expect(gradeOf(d)).toBe('weak'); expect(classUk(d)).toBe('засвідчено лише в OCR-пам’ятках без регіону')
    expect(dialectHeadline(d, c => c)).toBe(nowitLine(w)); expect(nowitLine(w)).toContain('«Архангельське Євангеліє 1092»'); expect(nowitLine(w)).toContain('не діалектна мітка'); expect(dialectHow(d)).toContain('ступінь доказу: слабкий')
    const mix = summarizeWitnesses(['o1', 't1'], wm.meta)!; expect(mix.ocr).toBeUndefined(); expect(classUk(tailClass(undefined, undefined, { wit: mix }, false))).toBe('засвідчене лише в пам’ятках без регіону'.replace('засвідчене', 'засвідчено'))
    expect(summarizeWitnesses(['o1', 'k1'], wm.meta)!.names).toBeUndefined()   // one witness has a region: class 5, not 9
    expect(tailClass(undefined, undefined, { wit: summarizeWitnesses(['o1', 'k1'], wm.meta) }, false).c).toBe('witness')
  })
  it('LB-14 «невизначено» is left only for entries whose sources are unread dictionaries or unknown; the card and the methods page show the quotes', async () => {
    expect(tailClass(undefined, undefined, { srcNames: ['Грінченко'] }, false).c).toBe('few')
    const blk = rd('src/components/LabelsBlock.vue'); expect(blk).toContain('data-testid="lb-hist"'); expect(blk).toContain('data-testid="lb-nowit"')
    const html = await render(LabelsMethodView, {}); for (const h of HIST_DICTS) expect(html).toContain(h.short.replace(/&/g, '&amp;'))
    expect(html).toContain('Полтавской'); expect(html).not.toContain('недостатньо даних')
    for (const h of HIST_DICTS) { expect(h.quote.length).toBeGreaterThan(60); expect(h.url).toMatch(/^https:/); expect(h.cite.length).toBeGreaterThan(5) }
  })
})
