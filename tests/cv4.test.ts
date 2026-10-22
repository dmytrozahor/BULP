/** SPEC 63 CV-4: an unlinked spelling group attested by ≥ 2 vetted witnesses becomes the attested-only card «засвідчене слово, немає в словниках». */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { UvScan, uvAttested, uvOccurrences, uvStatus, UV_MAX_OCC_ATT, type UvPrefixShard } from '../core/uv.ts'
import { UV_ATTESTED_LABEL, foldsToKnown, garbageReason, isVettedWitness, promotionVerdict, uvAttestedLine, type PromoteWitness } from '../core/uv-promote.ts'
import { foldSpelling } from '../core/phrasemes.ts'
import { MATRIX, KINDS, KIND_ROUTE } from '../src/lib/cardParity.ts'
import { uvSearch, type UvFetch } from '../src/lib/uvData.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const W = (id: string, witnessType = 'autograph', extra: Partial<PromoteWitness> = {}): PromoteWitness => ({ id, witnessType, ...extra })
const sp = (raw: string, count = 3, lower = count, joins = 0) => ({ raw, count, lower, joins })
const verdict = (raw: string, ws: PromoteWitness[], over: Partial<ReturnType<typeof sp>> = {}) => promotionVerdict({ spellings: [{ ...sp(raw), ...over }], witnesses: [ws] })

describe('CV-4 promotion rule', () => {
  it('CV-4 two vetted witnesses promote the group; the verdict names the witnesses behind the card', () => {
    expect(verdict('нѣгдѣ', [W('a'), W('b', 'scholarly_ed')])).toEqual({ ok: true, vetted: ['a', 'b'] })
  })
  it('CV-4 one witness does not promote', () => { expect(verdict('нѣгдѣ', [W('a')])).toEqual({ ok: false, why: 'one-witness' }) })
  it('CV-4 gated OCR only (OQ flag) does not promote; OCR that passes OQ counts; a dictionary witness sends the word to the DO path', () => {
    const gated = (id: string) => W(id, 'ocr', { oq: { band: 'low' } })
    expect(verdict('нѣгдѣ', [gated('a'), gated('b')])).toEqual({ ok: false, why: 'gated-ocr-only' })
    expect(verdict('нѣгдѣ', [gated('a'), W('b')])).toEqual({ ok: false, why: 'one-witness' })
    expect(verdict('нѣгдѣ', [W('a', 'ocr'), W('b')])).toEqual({ ok: false, why: 'ocr-weak' })   // OCR that passes OQ adds a KWIC line but never confirms a word alone (hand check: воф, змар, випр …)
    expect(verdict('нѣгдѣ', [W('a', 'ocr'), W('b'), W('c', 'later_ed')])).toEqual({ ok: true, vetted: ['a', 'b', 'c'] })
    expect(isVettedWitness(W('r', 'dictionary'))).toBe(false); expect(isVettedWitness(W('r', 'autograph', { noFreq: true }))).toBe(false)
    expect(verdict('нѣгдѣ', [W('a'), W('b'), W('d', 'dictionary')])).toEqual({ ok: false, why: 'dictionary-witness' })
  })
  it('CV-4 OCR-garbage patterns do not promote: mixed case, letter runs, consonant runs, no vowel, edge marks, hyphen stubs, over-long runs, Serbian letters', () => {
    const ws = [W('a'), W('b')]
    const bad: Record<string, string> = { пРиклад: 'mixed-case', вооолк: 'letter-run', аствржнка: 'consonant-run', кмнтрс: 'no-vowel', '-слово': 'edge-mark', 'слово-': 'edge-mark', 'а-слово': 'hyphen-stub', ђелиса: 'foreign-letter', абвгдеєжзийклмнопрстуфхцчш: 'long' }
    for (const [w, why] of Object.entries(bad)) { expect(garbageReason(w), w).toBe(why); expect(verdict(w, ws, { lower: 3 }), w).toEqual({ ok: false, why }) }
    for (const ok of ['нѣгдѣ', 'прийми-ж', "м'ясо", 'жечи', 'слѣдъ']) expect(garbageReason(ok), ok).toBeUndefined()
  })
  it('CV-4 a name (capitalised everywhere) does not promote; a word seen once in lower case does', () => {
    const ws = [W('a'), W('b')]
    expect(verdict('Мокрина', ws, { lower: 0 })).toEqual({ ok: false, why: 'name' }); expect(verdict('мокрина', ws, { lower: 1 }).ok).toBe(true)
  })
  it('CV-4 a line-break fragment (joins a neighbour into a known word in half of its occurrences) and a word shorter than 3 letters do not promote', () => {
    const ws = [W('a'), W('b')]
    expect(verdict('перед', ws, { count: 4, lower: 4, joins: 2 })).toEqual({ ok: false, why: 'hyphen-split' }); expect(verdict('перед', ws, { count: 4, lower: 4, joins: 1 }).ok).toBe(true)
    expect(verdict('аб', ws)).toEqual({ ok: false, why: 'short' })
  })
  it('CV-4 a garbage VARIANT supplies no witness: the group needs two witnesses from its good spellings', () => {
    expect(promotionVerdict({ spellings: [sp('нѣгдѣ'), sp('вооолк')], witnesses: [[W('a')], [W('b')]] })).toEqual({ ok: false, why: 'one-witness' })
  })
  it('CV-4 a spelling that a cited fold turns into a known form is a variant of a known word, not a new word', () => {
    expect(foldsToKnown('сьвіт', k => k === 'світ')).toBeTruthy(); expect(foldsToKnown('сьвіт', () => false)).toBeUndefined()
  })
})

describe('CV-4 groups, status line and search', () => {
  const meta = new Map<string, PromoteWitness>([['w1', W('w1')], ['w2', W('w2')], ['o1', W('o1', 'ocr', { oq: { band: 'garbage' } })], ['w3', W('w3')]])   // o1 = gated OCR
  const promote = (i: { spellings: ReturnType<typeof sp>[]; witnesses: string[][] }) => promotionVerdict({ spellings: i.spellings, witnesses: i.witnesses.map(ids => ids.map(id => meta.get(id)!)) })
  const scan = () => {
    const s = new UvScan()
    s.add('нѣгдѣ', 'o1', 4, false); s.add('нѣгдѣ', 'w1', 3, false); s.add('негде', 'w2', 8, false); s.add('нѣгдѣ', 'w3', 9, false)
    s.add('одинак', 'w1', 1, false)   // one witness
    return s
  }
  it('CV-4 a promoted group carries the marker, keeps a KWIC line of every vetted witness (gated OCR first in the file does not crowd it out) and is read as attested', () => {
    const m = scan().groups(foldSpelling, () => false, () => '', promote)
    const g = [...m.values()].find(x => x.g[0] === 'нѣгдѣ')!.g, one = [...m.values()].find(x => x.g[0] === 'одинак')!.g
    expect(uvAttested(g)).toBe(true); expect(uvAttested(one)).toBe(false)
    expect(uvOccurrences(g).map(o => o.w).sort()).toEqual(['w1', 'w2', 'w3'])   // no occurrence of the gated OCR witness
    expect(g[2]).toBe(4); expect(uvStatus(g)).toEqual({ confirmed: true, label: UV_ATTESTED_LABEL }); expect(uvStatus(one)).toEqual({ confirmed: false, label: 'неперевірена лема' })
  })
  it('CV-4 without a promote callback nothing changes (old data and the plain scan stay «неперевірена лема»)', () => {
    for (const { g } of scan().groups(foldSpelling).values()) { expect(uvAttested(g)).toBe(false); expect(uvStatus(g).label).toBe('неперевірена лема') }
  })
  it('CV-4 the status line is «засвідчено N пам’ятками, у словниках немає»', () => {
    expect(UV_ATTESTED_LABEL).toBe('засвідчене слово, немає в словниках'); expect(uvAttestedLine(4)).toBe('засвідчено 4 пам’ятками, у словниках немає'); expect(uvAttestedLine(2)).toBe('засвідчено 2 пам’ятками, у словниках немає')
  })
  it('CV-4 thin-card budget: a promoted group with 12 spellings and 8 witnesses stays under 700 bytes', () => {
    const s = new UvScan(), ws = Array.from({ length: 10 }, (_, i) => `hv_witness_${i}`)
    const all = new Map(ws.map(w => [w, W(w)]))
    for (let n = 0; n < 12; n++) for (const w of ws) s.add('слівце' + 'абвгдежзикло'[n], w, 100000 + n, false)
    const m = s.groups(() => 'x', () => false, () => '', i => promotionVerdict({ spellings: i.spellings, witnesses: i.witnesses.map(l => l.map(id => all.get(id)!)) }))
    const g = [...m.values()][0]!.g
    expect(uvAttested(g)).toBe(true); expect(uvOccurrences(g)).toHaveLength(UV_MAX_OCC_ATT); expect(Buffer.byteLength(JSON.stringify(['x', g]))).toBeLessThan(700)
  })
  it('CV-4 search marks a promoted spelling (att) and lists it before a plain one of the same length class', async () => {
    const sh: UvPrefixShard = { негде: ['негде', 'нѣгдѣ', 1], негдесь: ['негдесь', 'негдесь'], негдеж: ['негдеж', 'негдеж', 1] }
    const top = [...'не'].map(c => c.codePointAt(0)!.toString(16)).join('-')
    const get: UvFetch = async p => (p === `p/${top}` ? sh : null)
    const r = await uvSearch('не', 30, get)
    expect(r.map(h => [h.group, !!h.att])).toEqual([['негде', true], ['негдеж', true], ['негдесь', false]])
  })
})

describe('CV-4 the new card kind', () => {
  it('CV-4 card-parity: the `att` kind has the row of `uv`, mounts the same view and the shared ThinCard / LemmaBlocks, and has its own route label', () => {
    expect(MATRIX.att).toEqual(MATRIX.uv); expect(KINDS.att).toEqual(KINDS.uv); expect(KINDS.att.join(' ')).toContain('ThinCard'); expect(KIND_ROUTE.att).toContain('CV-4')
    expect(rd('specs/63-corpus-dialects.md')).toContain('| `att` |')
  })
  it('CV-4 the view prints the status line (att-line), the witnesses’ dates and regions, and no POS claim', () => {
    const v = rd('src/views/UnverifiedView.vue')
    expect(v).toContain('data-testid="att-line"'); expect(v).toContain('uvAttestedLine(g[2])'); expect(v).toContain('Роки пам’яток'); expect(v).toContain('Регіони пам’яток'); expect(v).toContain('Частину мови не визначено')
  })
  it('CV-4 the build wires the rule: witnesses from corpus.json, the join test against known forms, the folds, meta.json with counts per century and region', () => {
    const b = rd('pipelines/build-unlinked.ts')
    for (const s of ['promotionVerdict', 'foldsToKnown', 'wmeta', 'joins(1)', 'byCentury', 'byRegion', "'meta.json'"]) expect(b, s).toContain(s)
  })
})
