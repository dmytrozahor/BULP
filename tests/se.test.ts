/** SPEC 63 SE: sense evolution (inventory, coverage periods, alignment, corpus attestation, transitions, timeline, build stage, delivery). Fixture-level; no real data needed. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DICT_COVER, MATCH_MIN, SE_EPOCH_IDS, UNTYPED, align, assignKwic, atOf, buildEntry, dictById, cuesOf, dictOfWitness, epochsOf, glossSim, rowOfLine, timeline, transitions, typeLabels, type SeRow,
} from '../core/se.ts'
import { buildSenseEntries, dictRows } from '../pipelines/build-se.ts'
import { SE_BUCKETS, seBucket, seUrl, cardData } from '../core/parts.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const R = (loc: string) => `r2u X · s?w=q#12_1: ${loc}`

describe('SE-1 sense inventory with coverage periods', () => {
  it('SE-1 every dictionary has its edition years and a coverage period; historical ones describe an earlier period than their print year', () => {
    const d = Object.fromEntries(DICT_COVER.map(x => [x.id, x]))
    expect(d['dsu14']).toMatchObject({ edition: [1977, 1978], cover: [1301, 1500], basis: 'period' })
    expect(d['sum16']).toMatchObject({ cover: [1500, 1650], basis: 'period' })
    expect(d['timchenko']).toMatchObject({ edition: [1930, 1932], cover: [1301, 1800], basis: 'period' })
    expect(d['r2u_zheleh']).toMatchObject({ edition: [1886, 1886], cover: [1886, 1886], basis: 'own-time' })
    expect(d['r2u_umanets']!.cover).toEqual([1893, 1898]); expect(d['r2u_hrinch09']!.cover).toEqual([1907, 1909]); expect(d['r2u_nikovsky']!.cover).toEqual([1927, 1927])
    expect(d['sum11']).toMatchObject({ edition: [1970, 1980], basis: 'own-time' })
    expect(d['wikt.uk']).toMatchObject({ cover: null, basis: 'modern' }); expect(d['wikt.en']!.cover).toBeNull()
  })
  it('SE-1 a row without its own dated quotation is dated by the coverage period, never by the print year of a historical dictionary', () => {
    expect(atOf({ d: 'dsu14', g: 'x' })).toEqual({ a: 1301, b: 1500, basis: 'period' })
    expect(atOf({ d: 'r2u_hrinch09', g: 'x' })).toEqual({ a: 1907, b: 1909, basis: 'own-time' })
    expect(atOf({ d: 'wikt.uk', g: 'x' })).toEqual({ a: null, b: null, basis: 'modern' })
  })
  it('SE-1 the date of a quotation outranks the coverage period (the XIV–XV ст. dictionary is split by quotation decade)', () => {
    const loc = 'т.2 ряд. 1572: НАДОБНОЄ с. (2) належне'
    expect(dictOfWitness('dsu14_2_1450')!.id).toBe('dsu14')
    const q = rowOfLine('dsu14_2_1450', loc, 'надобноє', 'надобноє', [1450, 1459])!, nd = rowOfLine('dsu14_2_nd', loc, 'надобноє', 'надобноє', [1301, 1500])!
    expect(q.e).toEqual([1450, 1459]); expect(atOf(q)).toEqual({ a: 1450, b: 1459, basis: 'quote' })
    expect(nd.e).toBeUndefined(); expect(atOf(nd).basis).toBe('period')
    expect(q.g).toBe('належне'); expect(q.q).toContain('НАДОБНОЄ')
  })
  it('SE-1 a headword line without text after the part-of-speech mark gives an attestation row with no gloss (the sense text of the dictionary is not copied)', () => {
    const r = rowOfLine('dsu14_1_1390', 'т.1 ряд. 9: АБИ част. (2)', 'аби', 'аби', [1350, 1359])!
    expect(r.g).toBe('')
  })
  it('SE-1 r2u lines give the gloss SN-1 reads: the Russian headword of a ru→uk dictionary, the Russian gloss of a uk→ru one, the German gloss of Желехівський', () => {
    const um = rowOfLine('r2u_umanets', R('Мускул = мъясень'), "м'ясень", "м'ясень")!
    expect(um.g).not.toBe('Мускул'); expect(um.ru).toBe('Мускул')   // the Russian headword is a note, never the Ukrainian meaning
    expect(rowOfLine('r2u_hrinch09', R("В'язь, -ли – мышца"), "в'язь", "в'язь")!.g).toBe('мышца')
    expect(rowOfLine('r2u_zheleh', R('Гребінка, ж. Kamm, m.'), 'гребінка', 'гребінка')!.g).toMatch(/Kamm/)
    expect(rowOfLine('wikt.uk', R('x'), 'x', 'x')).toBeUndefined()   // modern sources are not dictionary witnesses
    expect(rowOfLine('book', R('x'), 'x', 'x')).toBeUndefined()
  })
  it('SE-1 робити: a ru→uk article never gives its Russian headword as the Ukrainian sense; the gloss is the Ukrainian clause that holds the lemma', () => {
    const loc = R('УсмотрѢніє = розгляд, розсуд. На ваше -ніе – на вашу думку. Делайте, как знаете – робіть, як знаєте.')
    for (const d of ['r2u_umanets', 'r2u_doroshenko', 'r2u_izyumov', 'r2u_krymsky']) {
      const r = rowOfLine(d, loc, 'робити', 'робіть')!
      expect(r.g).toBe('робіть, як знаєте'); expect(r.ru).toBe('УсмотрѢніє'); expect(r.g.toLowerCase()).not.toContain('усмотр')
    }
    const none = rowOfLine('r2u_umanets', R('УсмотрѢніє = розгляд, розсуд. На ваше -ніе – на вашу думку.'), 'робити', 'робити')!
    expect(none.g).toBe(''); expect(none.ru).toBe('УсмотрѢніє')
    expect(rowOfLine('r2u_hrinch09', R('Робити, -блю, -биш. Делать'), 'робити', 'робити')!.ru).toBeUndefined()
  })
  it('SE-1 no SE row of a ru→uk dictionary has the text of the Russian-side headword (build path)', () => {
    const heads = ['УсмотрѢніє', 'Делать', 'Мускул']
    const ins = ['r2u_umanets', 'r2u_doroshenko', 'r2u_izyumov', 'r2u_krymsky', 'r2u_yakubski'].flatMap(id => heads.map((h, i) => ({ w: { id, witnessType: 'dictionary', date: [1893, 1898] as [number, number], tokens: [{ raw: 'робити', loc: `r2u X · s?w=q#${id}_${i}: ${h} = розгляд; робити, робіть` }] } })))
    const rows = dictRows(ins, () => 'робити').get('робити')!
    expect(rows.length).toBeGreaterThan(0)
    const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    for (const r of rows) { expect(heads.map(norm)).not.toContain(norm(r.g)); expect(r.ru).toBeTruthy() }
  })
  it('SE-1 Желехівський: the German gloss after the inflection and the part-of-speech mark is kept', () => {
    expect(rowOfLine('r2u_zheleh', R('Робити, -блю, -биш, v. arbeiten, machen. Sl.'), 'робити', 'робити')!.g).toBe('arbeiten, machen')
    expect(rowOfLine('r2u_zheleh', R('Робити, -блю, -биш, vb.'), 'робити', 'робити')!.g).toBe('')
    expect(dictById('r2u_zheleh')!.lang).toBe('de')
  })
  it('SE-1 rows come from the tokens of dictionary witnesses linked to a card, one per article line, a line is not counted twice', () => {
    const w = { id: 'r2u_hrinch09', witnessType: 'dictionary', date: [1907, 1909] as [number, number], tokens: [
      { raw: "в'язь", loc: R("В'язь, -ли – мышца") }, { raw: "в'язь", loc: R("В'язь, -ли – мышца") }, { raw: 'вяз', loc: R("Вяз – вязъ") }, { raw: 'ніщо', loc: R('Ніщо – ничто') } ] }
    const rows = dictRows([{ w }, { w: { id: 'book', witnessType: 'ms_copy', date: [1500, 1500], tokens: [{ raw: 'х', loc: 'a' }] } }], (_, ti) => (ti < 2 ? "в'язь" : ti === 2 ? 'вяз' : undefined))
    expect(rows.get("в'язь")).toHaveLength(1); expect(rows.get('вяз')).toHaveLength(1); expect(rows.has('ніщо')).toBe(false); expect(rows.has('х')).toBe(false)
  })
})

describe('SE-2 alignment of senses across dictionaries', () => {
  const grin: SeRow = { d: 'r2u_hrinch09', g: 'мышца', q: 'В\'язь – мышца' }, nik: SeRow = { d: 'r2u_nikovsky', g: 'мышцы, мускул' }, um: SeRow = { d: 'r2u_umanets', g: 'мускул' }, wk: SeRow = { d: 'wikt.uk', g: 'м\'яз' }
  it('SE-2 similar glosses of the same language are one sense with a match score; the match is «inferred» without a cross-reference', () => {
    expect(glossSim('мышца', 'мышцы, мускул')).toBeGreaterThanOrEqual(MATCH_MIN)
    const g = align([grin, nik, um])
    expect(g).toHaveLength(2)   // мышца+мышцы vs the unrelated «мускул»
    const joined = g.find(x => x.rows.length === 2)!
    expect(joined.rows).toEqual([0, 1]); expect(joined.sc).toBeGreaterThanOrEqual(MATCH_MIN); expect(joined.link).toBe('inferred')
  })
  it('SE-2 a dictionary cross-reference makes the link «xref»', () => {
    expect(align([grin, nik], () => true)[0]!.link).toBe('xref')
  })
  it('SE-2 glosses in different languages are never matched (no translation is guessed)', () => {
    expect(align([grin, wk])).toHaveLength(2)
  })
  it('SE-2 a shared quotation (three consecutive words) joins rows of two dictionaries with score 1', () => {
    const a: SeRow = { d: 'r2u_hrinch09', g: 'кінь', q: 'на білому коні їхав козак' }, b: SeRow = { d: 'r2u_nikovsky', g: 'жеребець', q: 'їхав козак на білому коні' }
    const g = align([a, b]); expect(g).toHaveLength(1); expect(g[0]).toMatchObject({ sc: 1, why: 'quote', link: 'inferred' })
  })
  it('SE-2 attestation rows without a gloss of one dictionary form one group', () => {
    const g = align([{ d: 'dsu14', g: '', e: [1350, 1359] }, { d: 'dsu14', g: '', e: [1450, 1459] }])
    expect(g).toHaveLength(1); expect(g[0]!.sc).toBeNull()
  })
})

describe('SE-3 corpus attestation per sense, only by evidence', () => {
  const rows: SeRow[] = [{ d: 'r2u_hrinch09', g: 'платити', q: 'вони платять податки у казну' }, { d: 'wikt.uk', g: 'сплачувати (про борг)' }]
  const groups = align(rows)
  const k = (left: string, right = '') => ({ w: 'x', loc: '1', left, node: 'платять', right, date: [1900, 1900] as [number, number] })
  it('SE-3 a context is assigned to a sense when three consecutive words stand in a dictionary quote of that sense', () => {
    expect(assignKwic(k('вони', 'податки'), rows, groups)).toEqual({ group: 0, via: 'quote' })
  })
  it('SE-3 a collocation cue named in the gloss assigns the context, in exactly one sense', () => {
    expect(cuesOf('сплачувати (про борг)')).toEqual(['бор'])
    expect(assignKwic(k('великий', 'борг'), rows, groups)).toEqual({ group: 1, via: 'cue' })
  })
  it('SE-3 anything else is unassigned and counted per epoch; one sense does not claim every context', () => {
    expect(assignKwic(k('вчора', 'гроші'), rows, groups)).toBeUndefined()
    const e = buildEntry([rows[0]!], [k('вчора', 'гроші')])
    expect(e.kw).toBeUndefined(); expect(e.un).toEqual({ 'shev.modern': 1 })
  })
})

describe('SE-4 transitions are typed only when a source names the type', () => {
  const dsu = (e: [number, number], g: string): SeRow => ({ d: 'dsu14', g, e }), tim = (e: [number, number], g: string, t?: SeRow['t']): SeRow => ({ d: 'timchenko', g, e, ...(t ? { t } : {}) })
  it('SE-4 labels that name a type are read from the source text only', () => {
    expect(typeLabels('перен. дуже швидко')).toEqual([['figurative', 'перен']])
    expect(typeLabels('derogatory term')).toEqual([['pejoration', 'derogatory']])
    expect(typeLabels('просто слово')).toEqual([])
  })
  it('SE-4 an untyped transition says so, and is «inferred» when both ends are dated by quotations', () => {
    const t = transitions([dsu([1350, 1359], 'вільна людина'), tim([1650, 1659], 'невільник')], [{ rows: [0], sc: null, link: 'inferred' }, { rows: [1], sc: null, link: 'inferred' }])
    expect(t).toHaveLength(1); expect(t[0]).toMatchObject({ from: 0, to: 1, type: null, status: 'inferred', note: UNTYPED })
  })
  it('SE-4 a type named by a source label gives status «cited» with the label quoted', () => {
    const rows = [dsu([1350, 1359], 'вільна людина'), tim([1650, 1659], 'ставлений на службу', [['figurative', 'перен.']])]
    const t = transitions(rows, align(rows))
    expect(t[0]).toMatchObject({ type: 'figurative', label: 'перен.', status: 'cited', by: 1 })
  })
  it('SE-4 a transition resting on a coverage period or an edition year is a hypothesis', () => {
    const rows: SeRow[] = [{ d: 'dsu14', g: 'вільна людина' }, { d: 'wikt.uk', g: 'невільник' }]
    expect(transitions(rows, [{ rows: [0], sc: null, link: 'inferred' }, { rows: [1], sc: null, link: 'inferred' }])[0]!.status).toBe('hypothesis')
  })
  it('SE-4 no transition between glosses of different languages (not comparable)', () => {
    const rows: SeRow[] = [dsu([1350, 1359], 'вільна людина'), { d: 'r2u_hrinch09', g: 'свободный' }]
    expect(transitions(rows, rows.map((_, i) => ({ rows: [i], sc: null, link: 'inferred' as const })))).toHaveLength(0)
  })
  it('SE-4 no arrow when the origin is ambiguous (two senses in the closest earlier epoch) and none for senses of the same epoch', () => {
    const rows = [dsu([1350, 1359], 'а'), dsu([1340, 1345], 'б'), tim([1650, 1659], 'в')]
    const g = rows.map((_, i) => ({ rows: [i], sc: null, link: 'inferred' as const }))
    expect(transitions(rows, g).filter(t => t.to === 2)).toHaveLength(0)
    const same = [dsu([1350, 1359], 'а'), tim([1351, 1355], 'б')]
    expect(transitions(same, same.map((_, i) => ({ rows: [i], sc: null, link: 'inferred' as const })))).toHaveLength(0)
  })
})

describe('SE-5 the timeline over the Shevelov epochs', () => {
  const e = buildEntry([
    { d: 'dsu14', g: '', e: [1350, 1359], q: 'АБИ част.' }, { d: 'r2u_hrinch09', g: 'чтобы' }, { d: 'wikt.uk', g: 'щоб' },
  ])
  it('SE-5 the epochs are the six project epochs; an epoch with no evidence is a gap, never filled', () => {
    const tl = timeline(e)
    expect(tl.map(c => c.epoch)).toEqual(SE_EPOCH_IDS); expect(SE_EPOCH_IDS).toHaveLength(6)
    const by = Object.fromEntries(tl.map(c => [c.epoch, c]))
    expect(by['shev.proto']!.gap).toBe(true); expect(by['shev.middle']!.gap).toBe(true); expect(by['shev.late_middle']!.gap).toBe(true)
    expect(by['shev.old']!.gap).toBe(false); expect(by['shev.modern']!.gap).toBe(false)
  })
  it('SE-5 a modern source that does not date its senses sits in the last epoch, flagged undated; a dated quote is placed by its own date', () => {
    expect(epochsOf({ a: null, b: null, basis: 'modern' })).toEqual({ ids: ['shev.modern'], conf: 'low' })
    const modern = timeline(e).find(c => c.epoch === 'shev.modern')!
    expect(modern.items.some(i => i.undated)).toBe(true)
    expect(epochsOf({ a: 1350, b: 1359, basis: 'quote' }).ids).toEqual(['shev.old'])
  })
  it('SE-5 a period that spans two epochs is shown in both, marked as a span', () => {
    const span = timeline(buildEntry([{ d: 'dsu14', g: '' }]))
    const filled = span.filter(c => !c.gap)
    expect(filled.length).toBeGreaterThan(1); expect(filled.every(c => c.items[0]!.span)).toBe(true)
  })
})

describe('SE-7/SE-8 build stage and delivery', () => {
  it('SE-7 the build runs the stage «senses», cached like the others, and writes data/work/se.json', () => {
    const b = rd('pipelines/build.ts')
    expect(b).toContain('// #stage senses'); expect(b).toContain("sc.run('senses'"); expect(b).toContain("'data/work/se.json'")
  })
  it('SE-7 buildSenseEntries counts rows, aligned senses, transitions and the historical rows per dictionary', () => {
    const rows = new Map<string, SeRow[]>([
      ['слово', [{ d: 'r2u_hrinch09', g: 'мышца' }, { d: 'r2u_nikovsky', g: 'мышцы' }, { d: 'dsu14', g: '', e: [1350, 1359] }]],
      ['інше', [{ d: 'wikt.uk', g: 'x' }]],
    ])
    const { entries, stats } = buildSenseEntries(rows)
    expect(entries.size).toBe(2)
    expect(stats).toMatchObject({ lemmas: 2, rows: 4, aligned: 1, withHistory: 1 }); expect(stats.byDict).toMatchObject({ dsu14: 1, 'wikt.uk': 1 })
  })
  it('SE-8 the sidecar is lm/se/<bucket>.json with 4096 buckets and is not loaded with the card (lazy)', () => {
    expect(SE_BUCKETS).toBe(4096); expect(seBucket('слово')).toBeLessThan(4096); expect(seUrl('слово')).toBe(`./data/lm/se/${seBucket('слово')}.json`)
    expect(cardData('слово').some(u => u.includes('/se/'))).toBe(false)
    expect(rd('pipelines/build-parts.ts')).toContain('lm/se/')
  })
})
