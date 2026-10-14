import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ArchScan, archStats, parseHead } from '../core/archaic.ts'
import { derive } from '../core/phonology.ts'
import { archReport, buildArchaic } from '../pipelines/build-archaic.ts'
import { rowRef } from '../src/lib/witnessText.ts'
import { refTo } from '../src/lib/torotData.ts'

const LOC = 'т.2 ряд. 1572: «НАДОБНОЄ с. (2) належне: алє коли боудєт намь'
const tok = (raw: string, loc: string, s = 1) => ({ raw, loc, s })
const dict = { id: 'dsu14_2_1450', title: 'Словник', witnessType: 'dictionary' as const, lang: 'ruthenian' as const, date: [1450, 1459] as [number, number], tokens: [tok('надобноє', LOC), tok('надобное', LOC), tok('менувати', 'т.2 ряд. 9: МЕНУВАТИ дієсл. (3) називати: а'), tok('дім', 'т.1 ряд. 5: ДІМ ч. (9) (будинок):')] }
const text = { id: 'i14_09', title: 'Загоровський', witnessType: 'scholarly_ed' as const, lang: 'ruthenian' as const, orth: 'ізборник-нормалізований', date: [1577, 1577] as [number, number],
  tokens: [tok('менуючи', 'абз. 1'), tok('менувати', 'абз. 2'), tok('надобное', 'абз. 2'), tok('подстароста', 'абз. 3'), tok('подстароста', 'абз. 4'), tok('подстароста', 'абз. 5'), tok('дім', 'абз. 6')] }
const d = (s: string, oldI: boolean) => derive(s, { oldI })

describe('SPEC 63 AR', () => {
  it('AR-1 a dictionary header line becomes a lemma card: headword, variants, part of speech and brackets from the line itself, quote + locator', () => {
    const h = parseHead(LOC, ['надобноє'])
    expect(h).toMatchObject({ pos: 'с', count: 2, rowRef: 'т.2 ряд. 1572' }); expect(h.text.startsWith('НАДОБНОЄ с. (2) належне')).toBe(true)
    expect(parseHead('т.2 ряд. 3078: НАНОУЛЬ ч. (2) (особова назва, молд., пор. Ананий):', ['наноуль']).marks).toEqual(['особова назва, молд., пор. Ананий'])
    const s = new ArchScan(); const id = s.addDictEntry({ id: 'dsu14_2_1450', date: [1450, 1459], epoch: 'shev.early_middle' }, LOC, ['надобноє', 'надобное'])!
    const e = s.byId.get(id)!
    expect(e).toMatchObject({ head: 'надобноє', status: 'dictionary', variants: ['надобноє', 'надобное'] }); expect(e.dict).toMatchObject({ locator: 'т.2 ряд. 1572', w: 'dsu14_2_1450' })
  })

  it('AR-2 every unresolved corpus token whose spelling equals a dictionary variant links to the lemma (ref a:<id>); dictionary words that VESUM knows are not archaic', () => {
    const linkedDict = new Set([3]), r = buildArchaic([{ w: dict, linked: ti => linkedDict.has(ti), epoch: 'shev.early_middle' }, { w: text, linked: ti => ti === 6, epoch: 'shev.middle' }], d, 'x')
    const ids = r.file.entries.map(e => e.id)
    expect(ids).toContain('надобноє'); expect(ids).toContain('менувати'); expect(ids).not.toContain('дім')
    expect(r.refs.get('i14_09')!.slice(0, 3)).toEqual(['', 'a:менувати', 'a:надобноє'])   // менуючи is a different word: no guess
    expect(r.refs.get('dsu14_2_1450')![3]).toBe('')
    const m = r.file.entries.find(e => e.id === 'менувати')!
    expect(m).toMatchObject({ n: 1, epochs: { 'shev.middle': 1 }, first: { w: 'i14_09', loc: 'абз. 2' } })
    expect(rowRef({ raw: 'x', loc: '', sep: '', status: '', ref: 'a:менувати' })).toBe('/ar/%D0%BC%D0%B5%D0%BD%D1%83%D0%B2%D0%B0%D1%82%D0%B8'); expect(refTo('a:менувати')).toContain('/ar/')
  })

  it('AR-3 dictionary-backed lemmas are always kept; recurring unresolved clusters (≥ 3) become labelled unverified candidates; counts per epoch', () => {
    const r = buildArchaic([{ w: dict, linked: () => false, epoch: 'shev.early_middle' }, { w: text, linked: ti => ti === 6, epoch: 'shev.middle' }], d, 'x')
    const u = r.file.entries.find(e => e.status === 'unverified')!
    expect(u).toMatchObject({ head: 'подстароста', n: 3 }); expect(u.dict).toBeUndefined()
    expect(r.file.entries.filter(e => e.status === 'dictionary').length).toBeGreaterThanOrEqual(3)   // n = 0 does not drop a dictionary lemma
    const st = archStats(r.file); expect(st.unverified).toBe(1); expect(st.byEpoch['shev.middle']!.tokens).toBeGreaterThanOrEqual(3); expect(st.byEpoch['shev.early_middle']!.lemmas).toBeGreaterThanOrEqual(3)
    const dir = mkdtempSync(join(tmpdir(), 'ar-'))
    try { const md = archReport(r.file, r.counts, dir); expect(md).toContain('| unverified | 1 |'); expect(md).toContain('shev.middle'); expect(readFileSync(join(dir, 'archaic-lemmas.md'), 'utf8')).toBe(md) } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('AR-1 /ar/:id is routed and the card marks missing data as «невідомо»/«не зафіксовано»', () => {
    const router = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8'), view = readFileSync(new URL('../src/views/ArchaicView.vue', import.meta.url), 'utf8')
    expect(router).toContain("'/ar/:id'"); expect(view).toContain('сучасного відповідника не зафіксовано'); expect(view).toContain('Неперевірено')
  })
})
