/** SPEC 63 SE-5 / SE-6: the block «Значення за епохами» renders the fixture timeline for every card kind and is mounted once per card view (server-side render, no browser needed). */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SenseEpochs from '../src/components/SenseEpochs.vue'
import { buildEntry, UNTYPED, type SeRow } from '../core/se.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const rows: SeRow[] = [
  { d: 'dsu14', g: 'вільна людина', e: [1350, 1359], q: 'ВОЛЬНИЙ прикм. (3) вільна людина', l: 'т.1 ряд. 5' },
  { d: 'timchenko', g: 'невільник', e: [1650, 1659], t: [['figurative', 'перен.']] },
  { d: 'r2u_hrinch09', g: 'свободный' },
  { d: 'wikt.uk', g: 'вільний' },
]
const entry = buildEntry(rows, [{ w: 'x', loc: '1', left: 'a', node: 'вільний', right: 'b', date: [1880, 1880] }])
const render = (kind: string) => renderToString(createSSRApp({ render: () => h(SenseEpochs, { word: 'вільний', kind: kind as 'full', open: true, entry }) }))

describe('SE-5 the block shows the sense timeline', () => {
  it("GG-7 a row with a source article link shows «стаття ↗» next to the dictionary name, on every card kind; a row without a link shows none; the RU badge stays", async () => {
    const url = "https://www.inmo.org.ua/sum.html?wrd=%D0%B4%D1%96%D0%BC"
    const e = buildEntry([{ d: "sum11", g: "будівля", u: url }, { d: "r2u_hrinch09", g: "дом" }, { d: "wikt.uk", g: "дім" }], [])
    for (const kind of ["full", "light", "dict", "orv", "arch", "mu"]) {
      const html = await renderToString(createSSRApp({ render: () => h(SenseEpochs, { word: "дім", kind: kind as "full", open: true, entry: e }) }))
      expect(html.match(/data-testid="se-article"/g)?.length, kind).toBe(1)
      expect(html).toContain(`href="${url}"`); expect(html).toContain("стаття ↗"); expect(html).toContain("data-testid=\"ru-badge\"")
    }
  })
  it('SE-5 the fixture timeline shows the six epochs in order, a gap as «немає даних», dated quotes, coverage periods and the typed transition', async () => {
    const html = await render('full')
    const order = ['протоукраїнська', 'давньоукраїнська', 'ранньосередньоукраїнська', 'середньоукраїнська', 'пізньосередньоукраїнська', 'новітня'].map(n => html.indexOf(n + ' доба'))
    expect(order.every(i => i >= 0)).toBe(true); expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(html).toContain('data-epoch="shev.proto"'); expect(html).toMatch(/gap se-ep" data-epoch="shev.proto"/)
    expect(html).toContain('цитата 1350–1359'); expect(html).toContain('вільна людина')
    expect(html).toContain('Тимченко'); expect(html).toContain('1930–1932')
    expect(html).toContain('сучасне вживання · джерело не датує значення')
    expect(html).toContain('переносне значення («перен.»)'); expect(html).toContain('цитовано')
    expect(html).toContain('1 контекстів корпусу без прив’язки до значення')   // the 1880 context is not assigned to any sense
  })
  it('SE-5 an untyped transition reads «тип не вказано джерелом»', async () => {
    const e2 = buildEntry([{ d: 'dsu14', g: 'а', e: [1350, 1359] }, { d: 'timchenko', g: 'б', e: [1650, 1659] }])
    const html = await renderToString(createSSRApp({ render: () => h(SenseEpochs, { word: 'x', kind: 'arch', open: true, entry: e2 }) }))
    expect(html).toContain(UNTYPED); expect(html).toContain('виведено')
  })
})

describe('SE-6 one block on every card kind', () => {
  for (const kind of ['full', 'light', 'dict', 'orv', 'arch', 'mu']) {
    it(`SE-6 the ${kind} card renders the block with its own test id`, async () => {
      const html = await render(kind)
      expect(html).toContain(`data-testid="se-${kind}"`); expect(html).toContain('Значення за епохами')
    })
  }
  it('SE-6 a card word with no sense data says so (a gap, no invented sense)', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(SenseEpochs, { word: 'ніщо', kind: 'light', open: true, entry: buildEntry([]) }) }))
    expect(html).toContain('se-gap'); expect(html).not.toContain('se-sense')
  })
  it('SE-6 the block is one component: mounted once in the full card and once in ThinCard, which serves light, dictionary-only, ORV/TOROT, archaic and unverified (MU) cards', () => {
    const imp = "import SenseEpochs from '../components/SenseEpochs.vue'"
    const word = rd('src/views/WordView.vue'); expect(word).toContain(imp); expect(word.match(/<SenseEpochs\b/g)).toHaveLength(1)
    const thin = rd('src/components/ThinCard.vue'); expect(thin).toContain("import SenseEpochs from './SenseEpochs.vue'"); expect(thin.match(/<SenseEpochs\b/g)).toHaveLength(1)
    expect(rd('src/views/LightWordView.vue')).toContain('<ThinCard'); expect(rd('src/views/TorotCardView.vue')).toContain('se-kind="orv"')
    expect(rd('src/views/ArchaicView.vue')).toContain('se-kind="arch"'); expect(rd('src/views/UnverifiedView.vue')).toContain('se-kind="mu"')
  })
})
