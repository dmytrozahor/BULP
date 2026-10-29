/** SPEC 63 GG-18 — dictionary cross-reference pointers («СЛИНУТИ — див. ЛИНУТИ»): parsing, the sidecar, the ORV fallback and the card (fixtures only; no dictionary text is stored). */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { aspectOfGram, pairPointers, pointerOf, ptrWording } from '../core/xref.ts'
import { parseDictionary, PARSE_SPECS } from '../core/se-parse.ts'
import { parseSum11 } from '../core/sum11-parse.ts'
import { parseSum20 } from '../core/sum20-parse.ts'
import { group, loadPointers } from '../pipelines/build-xref.ts'
import { dictCounterparts } from '../pipelines/build-orvdict.ts'
import XrefLine from '../src/components/XrefLine.vue'

describe('GG-18 pointerOf: the pointer forms of the dictionaries', () => {
  it('«Див. X», «Дивись також X», «См. X», «Те саме, що X»: kind and target; the stress mark and the homonym digit are dropped', () => {
    expect(pointerOf('Див. линути.')).toEqual({ k: 'see', t: 'линути' })
    expect(pointerOf('заст. див. ли́нути 2.')).toEqual({ k: 'see', t: 'линути' })
    expect(pointerOf('См. Линути.')).toEqual({ k: 'see', t: 'линути' })
    expect(pointerOf('Те саме, що линути.')).toEqual({ k: 'same', t: 'линути' })
  })
  it('«Док. до X», «Недок. до X» carry the aspect of the head; «Однокр.», «Зменш.», «Пестл.» are relations; an unknown abbreviation or a phrase target is no pointer', () => {
    expect(pointerOf('Док. до линути.')).toEqual({ k: 'rel', t: 'линути', r: 'док.', a: 'док' })
    expect(pointerOf('Недок. до слинути.')).toEqual({ k: 'rel', t: 'слинути', r: 'недок.', a: 'недок' })
    expect(pointerOf('Однокр. до махати.')).toEqual({ k: 'rel', t: 'махати', r: 'однокр.' })
    expect(pointerOf('Зменш.-пестл. до хата.')).toEqual({ k: 'rel', t: 'хата', r: 'зменш.-пестл.' })
    expect(pointerOf('Пестл. до масло 1.')).toEqual({ k: 'rel', t: 'масло', r: 'пестл.' })
    expect(pointerOf('Дія за знач. линути.')).toBeUndefined()
    expect(pointerOf('Бла. до хата.')).toBeUndefined()
    expect(pointerOf('Див. линути й лити.')).toBeUndefined()
    expect(pointerOf('Сила тяжіння, тяжкість тіла.')).toBeUndefined()
  })
  it('the wording is the dictionary pointer; an aspect pair gives one pointer each way from the grammar marks', () => {
    expect(ptrWording({ k: 'see', t: 'x' })).toBe('див.'); expect(ptrWording({ k: 'rel', t: 'x', r: 'док.' })).toBe('доконаний вид до')
    expect(aspectOfGram('аю, аєш, недок.')).toBe('недок'); expect(aspectOfGram('чу, чиш, док.')).toBe('док'); expect(aspectOfGram('ч.')).toBeUndefined()
    expect(pairPointers([{ head: 'ВИКЛЮЧАТИ', gram: 'аю, недок.' }, { head: 'ВИКЛЮЧИТИ', gram: 'чу, док.' }])).toEqual([
      { h: 'виключити', p: { k: 'rel', t: 'виключати', r: 'док.', a: 'док' } }, { h: 'виключати', p: { k: 'rel', t: 'виключити', r: 'недок.', a: 'недок' } }])
  })
})

describe('GG-18 the parsers keep the pointers they used to drop', () => {
  it('СУМ-20: «СЛИНУТИ див. ЛИНУТИ» is not an entry (no sense) but a pointer with volume and page; «Док. до» stays a sense AND is a pointer; a pair states the aspect', () => {
    const text = ['ЛИНУТИ\n\n451\n\nЛИТИ\n\n',
      'ЛИНУТИ, ну, неш, недок. 1. Текти, литися. Цитата-заглушка (А. Автор).\n',
      'СЛИНУТИ, ну, неш, док. див. линути. ',
      'ЗАЛИНУТИ, ну, неш, док. Док. до линути. ',
      'ПОЛИВАТИ, аю, недок. ПОЛИТИ, ллю, док. 1. Лити зверху. Приклад.\n'].join('')
    const r = parseSum20(text, 9)
    expect(r.ptrs.find(p => p.h === 'слинути')).toEqual({ h: 'слинути', k: 'see', t: 'линути', vol: 9, page: 451 })
    expect(r.articles.some(a => a.head === 'слинути')).toBe(false)   // still no invented sense
    expect(r.ptrs.find(p => p.h === 'залинути')).toMatchObject({ k: 'rel', t: 'линути', r: 'док.', a: 'док' })
    expect(r.ptrs.filter(p => p.h === 'полити' || p.h === 'поливати').map(p => `${p.h}>${p.t}:${p.a}`).sort()).toEqual(['поливати>полити:недок', 'полити>поливати:док'])
    expect(JSON.stringify(r.ptrs)).not.toMatch(/Цитата|Автор|Приклад/)
    expect(r.stats.pointers).toBe(r.ptrs.length)
  })
  it('СУМ-11 (capitalised headwords at a line start) too', () => {
    const r = parseSum11(['Слизь \n88 \nСлона \n', 'Слинути, ну, неш, док. Див. линути. \n', 'Слина, и, ж. 1. Рідина, що виділяється в роті. Приклад (Т., 1960, 5). \n'].join(''), 11)
    expect(r.ptrs).toEqual([{ h: 'слинути', k: 'see', t: 'линути', vol: 11, page: 88 }])
    expect(r.articles.map(a => a.head)).toEqual(['слина'])
  })
  it('OCR dictionaries (parseDictionary): the pointer list is returned with the dictionary id and counted', () => {
    const r = parseDictionary(PARSE_SPECS.zakrevsky, 'Слинути, неш. См. Линути.\nСлина, ы, ж. Рідина ротова слинна.\n')
    expect(r.ptrs.every(p => p.d === PARSE_SPECS.zakrevsky.dict)).toBe(true)
    expect(r.stats.pointers).toBe(r.ptrs.length)
  })
})

describe('GG-18 the sidecar and the ORV fallback (MM-28 «слинути»)', () => {
  it('group(): dedupes, drops self-pointers, ranks СУМ first; loadPointers reads se-parsed .ptrs and data/work/xref', () => {
    const g = group([{ h: 'Слинути', k: 'see', t: 'линути', d: 'zhelekhivsky' }, { h: 'слинути', k: 'see', t: 'линути', d: 'sum11', l: 'т.9 с.1' }, { h: 'слинути', k: 'see', t: 'линути', d: 'sum11', l: 'т.9 с.1' }, { h: 'сам', k: 'see', t: 'сам', d: 'sum11' }])
    expect(g.byHead.get('слинути')!.map(x => x.d)).toEqual(['sum11', 'zhelekhivsky']); expect(g.byHead.has('сам')).toBe(false); expect(g.perDict).toEqual({ zhelekhivsky: 1, sum11: 1 })
    const root = mkdtempSync(join(tmpdir(), 'xr-')); mkdirSync(join(root, 'data/work/se-parsed'), { recursive: true }); mkdirSync(join(root, 'data/work/xref'), { recursive: true })
    writeFileSync(join(root, 'data/work/se-parsed/a.json'), JSON.stringify({ rows: [], ptrs: [{ h: 'слинути', k: 'see', t: 'линути', d: 'timchenko' }] }))
    writeFileSync(join(root, 'data/work/se-parsed/b.json'), JSON.stringify({ rows: [] }))   // made before GG-18: no ptrs, no failure
    writeFileSync(join(root, 'data/work/xref/sum11.json'), JSON.stringify({ ptrs: [{ h: 'слинути', k: 'see', t: 'линути', d: 'sum11', l: 'т.9 с.301' }] }))
    expect(loadPointers(root).byHead.get('слинути')!.map(x => x.d)).toEqual(['sum11', 'timchenko'])
  })
  it('an ORV card whose derived form is only a pointer gets dictModern with `ptr` and no gloss; a form with a row keeps the row', () => {
    const ptrs = new Map([['слинути', [{ k: 'see' as const, t: 'линути', d: 'sum11', l: 'т.9 с.301' }]]])
    expect(dictCounterparts(['слинути'], new Map(), ptrs)).toEqual({ form: 'слинути', dict: 'sum11', loc: 'т.9 с.301', q: '', ptr: { k: 'see', t: 'линути' } })
    expect(dictCounterparts(['слинути'], new Map([['слинути', [{ d: 'sum11', g: 'Славитися', l: 'т.9 с.1' }]]]) as never, ptrs)!.ptr).toBeUndefined()
    expect(dictCounterparts(['нема'], new Map(), ptrs)).toBeUndefined()
  })
})

describe('GG-18 the card: «за посиланням словника», the target labelled as the target', () => {
  const html = async (props: Record<string, unknown>) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
    const app = createSSRApp({ render: () => h(XrefLine, props as never) }); app.use(router)
    return renderToString(app)
  }
  const rows = [{ k: 'see' as const, t: 'линути', d: 'sum11', l: 'т.9 с.301' }, { k: 'rel' as const, t: 'линути', r: 'док.', a: 'док' as const, d: 'sum20', l: 'т.9 с.12' }]
  it('shows the pointer with dictionary and volume/page, links the target, shows the aspect, and says the data below is the target data', async () => {
    const s = await html({ word: 'слинути', rows, kind: 'dict' })
    expect(s).toContain('за посиланням словника'); expect(s).toContain('див.'); expect(s).toContain('СУМ-11'); expect(s).toContain('т. 9, с. 301')
    expect(s).toContain('доконаний'); expect(s).toContain('не значення слова «слинути»'); expect(s).toContain('Дані слова «')
    expect(s).toContain('data-testid="xref-dict"')
  })
  it('no pointers: nothing is rendered', async () => { expect(await html({ word: 'вода', rows: [] })).not.toContain('за посиланням') })
  it('lazy: the Огляд tab and the ORV card load the component asynchronously (the first load of a card does not grow); every thin card kind has the Огляд', () => {
    expect(readFileSync('src/components/OverviewTab.vue', 'utf8')).toMatch(/defineAsyncComponent\(\(\) => import\('\.\/XrefLine\.vue'\)\)/)
    expect(readFileSync('src/views/TorotCardView.vue', 'utf8')).toMatch(/defineAsyncComponent\(\(\) => import\('\.\.\/components\/XrefLine\.vue'\)\)/)
    expect(readFileSync('src/components/ThinCard.vue', 'utf8')).toContain('<OverviewTab')
  })
})

describe('GG-18 sum-scan writes the pointer sidecar of a dictionary (volume/page locator, deduped, next to the parsed dir)', () => {
  it('writeXref: tNN.ptrs.json -> xref/<dict>.json with d and the printed locator', async () => {
    const { writeXref } = await import('../pipelines/sum-scan.ts')
    const root = mkdtempSync(join(tmpdir(), 'xs-')), out = join(root, 'sum11-parsed'); mkdirSync(out)
    writeFileSync(join(out, 't09.ptrs.json'), JSON.stringify([{ h: 'слинути', k: 'see', t: 'линути', vol: 9, page: 301 }, { h: 'слинути', k: 'see', t: 'линути', vol: 9, page: 301 }]))
    expect(writeXref('sum11', out)).toBe(1)
    expect(JSON.parse(readFileSync(join(root, 'xref/sum11.json'), 'utf8')).ptrs).toEqual([{ h: 'слинути', k: 'see', t: 'линути', d: 'sum11', l: 'т.9 с.301' }])
  })
  it('end to end: sum-scan sidecar (xref/sum11.json) -> build-xref writeXref -> data/work/xr.json holds слинути -> линути; an unparsed state (no sidecar, VER-3 files without ptrs) yields none', async () => {
    const { writeXref } = await import('../pipelines/sum-scan.ts'), { writeXref: buildXr } = await import('../pipelines/build-xref.ts')
    const root = mkdtempSync(join(tmpdir(), 'xe-')); mkdirSync(join(root, 'data/work/sum11-parsed'), { recursive: true }); mkdirSync(join(root, 'data/work/se-parsed'), { recursive: true })
    writeFileSync(join(root, 'data/work/se-parsed/zyz.json'), JSON.stringify({ rows: [] }))   // an old parse without `ptrs`
    expect(buildXr(root)).toMatchObject({ heads: 0, pointers: 0 })
    writeFileSync(join(root, 'data/work/sum11-parsed/t09.ptrs.json'), JSON.stringify([{ h: 'слинути', k: 'see', t: 'линути', vol: 9, page: 301 }]))
    writeXref('sum11', join(root, 'data/work/sum11-parsed'))
    expect(buildXr(root)).toMatchObject({ heads: 1, pointers: 1, perDict: { sum11: 1 } })
    expect(JSON.parse(readFileSync(join(root, 'data/work/xr.json'), 'utf8'))['слинути']).toEqual([{ k: 'see', t: 'линути', d: 'sum11', l: 'т.9 с.301' }])
  })
})
