/** SPEC 63 NV-4: dictionary headwords (incl. the Prague 1925 term list) are attested lemma cards; the analyser shows attestation, not «гіпотеза». */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { ArchScan, archId, isTermLoc, parseLoc, termGloss, type ArchFile } from '../core/archaic.ts'
import { buildArchaic } from '../pipelines/build-archaic.ts'
import { attestationOf } from '../src/lib/attest.ts'
import { rowRef } from '../src/lib/witnessText.ts'

const rd = (p: string) => readFileSync(p, 'utf8')
const LOC = 'с. 1, № 1: Приборниця, пристрійниця = Готовальня | Rýsovadlo | Reiszeug'
const W = { id: 'mtt1925', title: 'Матеріяли до української технічної термінольоґії (Прага 1925)', date: [1925, 1925] as [number, number] }

describe('NV-4 term-list headwords become cards', () => {
  it('NV-4 the term locator is parsed: row ref, quote and the quoted ru | cs | de equivalents', () => {
    expect(isTermLoc(LOC)).toBe(true); expect(isTermLoc('т.1 ряд. 9445: АЖ част.')).toBe(false)
    expect(parseLoc(LOC).rowRef).toBe('с. 1, № 1'); expect(termGloss(LOC)).toEqual(['Готовальня', 'Rýsovadlo', 'Reiszeug'])
  })
  it('NV-4 lookup is case-insensitive: Приборниця = приборниця = ПРИБОРНИЦЯ', () => {
    expect(archId('Приборниця')).toBe(archId('приборниця')); expect(archId('ПРИБОРНИЦЯ')).toBe('приборниця')
    const s = new ArchScan(); const id = s.addDictEntry({ id: 'mtt1925', date: [1925, 1925] }, LOC, ['Приборниця', 'пристрійниця'])
    expect(id).toBe('приборниця'); expect(s.lookup([archId('ПРИБОРНИЦЯ')])).toBe('приборниця')
    const e = s.byId.get('приборниця')!
    expect(e.dict).toMatchObject({ kind: 'term', gloss: ['Готовальня', 'Rýsovadlo', 'Reiszeug'], locator: 'с. 1, № 1', date: [1925, 1925] }); expect(e.dict!.pos).toBeUndefined()
  })
  it('NV-4 the build makes a card of an unlinked term-list headword and refs its text tokens; a VESUM-linked token keeps its lemma', () => {
    const tokens = [{ raw: 'Приборниця', loc: LOC, s: 0 }, { raw: 'пристрійниця', loc: LOC, s: 0 }, { raw: 'Круж', loc: 'с. 1, № 2: Круж = Циркуль | Kružitko | Zirkel', s: 1 }]
    const w = { ...W, tokens, witnessType: 'dictionary', orth: undefined, lang: 'uk', oldI: false } as never
    const r = buildArchaic([{ w, linked: ti => ti === 2 }], s => ({ norm: s, candidates: [] }), 'x')
    expect(r.file.entries.map(e => e.id)).toEqual(['приборниця']); expect(r.refs.get('mtt1925')).toEqual(['a:приборниця', 'a:приборниця', ''])
    expect(rowRef({ raw: 'Приборниця', loc: '', sep: '', status: 'unknown', ref: 'a:приборниця' })).toBe(`/ar/${encodeURIComponent('приборниця')}`)
  })
  it('NV-4 the card shows the badge «технічний термін <рік>», the quoted equivalents and a case-insensitive id', () => {
    const v = rd('src/views/ArchaicView.vue')
    expect(v).toMatch(/технічний термін \$\{t\.date\[0\]\}/); expect(v).toMatch(/Еквіваленти за списком/); expect(v).toMatch(/archEntryOf\(props\.id\)/); expect(rd('src/lib/torotData.ts')).toMatch(/archId\(form\)/)   // PF-1: the case-insensitive lookup lives in the per-card shard reader
    expect(rd('pipelines/build-archaic.ts')).not.toMatch(/date\[0\] >= 1800/)
  })
})

describe('NV-4 the analyser shows attestation, not «реконструкція (гіпотеза)»', () => {
  const arch: ArchFile = { generated: '', source: '', entries: [{ id: 'приборниця', head: 'приборниця', variants: ['приборниця', 'пристрійниця'], status: 'dictionary', dict: { w: 'mtt1925', quote: LOC, locator: 'с. 1, № 1', marks: [], date: [1925, 1925], kind: 'term' }, n: 0, forms: [], epochs: {}, witnesses: {}, kwic: [] }] }
  const deps = { arch, witness: (id: string) => (id === 'mtt1925' ? W : undefined), shard: async () => null }
  it('NV-4 a dictionary headword form → «засвідчено: <пам’ятка, дата>» with the card link (any letter case)', async () => {
    for (const f of ['Приборниця', 'приборниця', 'ПРИСТРІЙНИЦЯ']) {
      const a = await attestationOf(f, deps)
      expect(a?.kind).toBe('card'); expect(a?.to).toBe(`/ar/${encodeURIComponent('приборниця')}`); expect(a?.text).toBe('Матеріяли до української технічної термінольоґії (Прага 1925), 1925')
    }
  })
  it('NV-4 a form found nowhere stays unattested (the «гіпотеза» label is only for such rule outputs)', async () => {
    expect(await attestationOf('кликнуцький', deps)).toBeUndefined()
  })
  it('NV-4 a spelling that occurs only in a text (unlinked index) is attested too, linking its spelling page', async () => {
    const a = await attestationOf('призвичкою', { ...deps, shard: async () => ({ призвичкою: ['призвичкою', 1, 1, 'mtt1925', 5] }) })
    expect(a?.kind).toBe('spelling'); expect(a?.to).toBe(`/f/${encodeURIComponent('призвичкою')}`); expect(a?.text).toContain('1925')
  })
  it('NV-4 AnalyzeView renders the «засвідчено» badge before the «реконструкція (гіпотеза)» one', () => {
    const v = rd('src/views/AnalyzeView.vue'), i = v.indexOf("'засвідчено: '"), j = v.indexOf('реконструкція (гіпотеза)" />')
    expect(i).toBeGreaterThan(0); expect(j).toBeGreaterThan(i); expect(v).toMatch(/картка слова/)
  })
})

const have = existsSync('public/data/archaic.json') && existsSync('public/data/texts/mtt1925.json')
;(have ? describe : describe.skip)('NV-4 real data', () => {
  it('NV-4 every unlinked headword of mtt1925 has an archaic.json card with its equivalents and the text token refs it', () => {
    const f = JSON.parse(rd('public/data/archaic.json')) as ArchFile, byId = new Map(f.entries.map(e => [e.id, e]))
    const e = byId.get('приборниця'); expect(e, 'приборниця').toBeTruthy()
    expect(e!.dict).toMatchObject({ w: 'mtt1925', kind: 'term', gloss: ['Готовальня', 'Rýsovadlo', 'Reiszeug'] })
    const toks = JSON.parse(rd('public/data/texts/mtt1925.json')).tokens as [string, string, number, string?][]
    const t = toks.find(x => x[0] === 'Приборниця')!; expect(t[3]).toBe('a:приборниця')
    let linked = 0, ref = 0
    for (const x of toks) { if (!/^\p{L}[\p{L}'’ʼ-]*$/u.test(x[0]) || !isTermLoc(x[1])) continue; if (x[3]) { ref++; if (x[3].startsWith('a:')) expect(byId.has(x[3].slice(2)), x[3]).toBe(true) } else linked++ }
    expect(ref).toBeGreaterThan(50)
  })
})
