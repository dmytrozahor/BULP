import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { cognateDating, cognateFlag, stripAccent, treeTagDating, type CogRow } from '../core/cognates.ts'
import { donorOf, isVernacular } from '../pipelines/build-cognates.ts'

describe('BL-15 dating of a cognate', () => {
  it('years, ranges and centuries from the cognate’s own etymology text (research/28 §4)', () => {
    expect(cognateDating('From Proto-Slavic *bogъ. First attested in c. 1056‒1057.')).toMatchObject({ from: 1056, to: 1057 })
    expect(cognateDating('Inherited from Old Polish pies. First attested in the 14th century.')).toMatchObject({ from: 1301, to: 1400 })
    expect(cognateDating('Inherited from Old Ruthenian певный. First attested in 1496.')).toMatchObject({ from: 1496, to: 1496 })
    expect(cognateDating('Attested circa 1967.')).toMatchObject({ from: 1967 })
  })
  it('a date in a «Compare …» sentence (another language) is rejected; no date → undefined', () => {
    expect(cognateDating('From Proto-Slavic *pъvьnъ. Compare Ukrainian пе́вний, first attested in 1627.')).toBeUndefined()
    expect(cognateDating('Inherited from Proto-Slavic *xata.')).toBeUndefined()
  })
  it('tree tag «19th cent.» → century interval; accents are stripped for the join', () => {
    expect(treeTagDating(['borrowed', '19ᵗʰ cent.'])).toMatchObject({ from: 1801, to: 1900 })
    expect(stripAccent('ха́та')).toBe('хата')
  })
})

describe('BL-15 ET-3 flag: interval logic, vernacular only, a review prompt', () => {
  const rows: CogRow[] = [{ l: 'zlw-opl', w: 'pies', d: [1301, 1400], q: 'q', k: 'etym' }, { l: 'pl', w: 'pies', d: [1450, 1450], q: 'q', k: 'etym' }]
  it('fires only when ours.to < every dated counterpart’s from (a 1350 witness does not antedate «14th century»)', () => {
    expect(cognateFlag({ ours: [1350, 1350], vernacular: true }, rows)).toBeUndefined()
    const f = cognateFlag({ ours: [1380, 1390], vernacular: true }, [{ l: 'pl', w: 'x', d: [1450, 1450], q: 'q', k: 'etym' }])
    expect(f?.code).toBe('uk-antedates-cognates'); expect(f?.theirs[0]).toBe(1450); expect(f?.note).toContain('не доводить')
  })
  it('a Church-Slavonic-layer attestation never fires; counterparts borrowed from Ukrainian are not compared', () => {
    expect(cognateFlag({ ours: [1100, 1100], vernacular: false }, rows)).toBeUndefined()
    expect(cognateFlag({ ours: [1100, 1100], vernacular: true }, [{ l: 'ru', w: 'хата', b: 1, d: [1801, 1900], q: 'q', k: 'tree' }])).toBeUndefined()
  })
  it('before 1300 the claim is East Slavic, not «Ukrainian»; donor flag names the donor language', () => {
    const a = cognateFlag({ ours: [1150, 1150], vernacular: true }, rows)!
    expect(a.eastSlavic).toBe(true); expect(a.note).toContain('давньоруська')
    const d = cognateFlag({ ours: [1420, 1430], vernacular: true }, rows, 'pl')!
    expect(d.code).toBe('uk-antedates-donor'); expect(d.langs).toEqual(['pl']); expect(d.eastSlavic).toBe(false); expect(d.note).toContain('українська')
  })
  it('donor from the Wiktionary chain; vernacular = the first spelling has no CS claim', () => {
    expect(donorOf([{ rel: 'bor', text: 'Polish pies' }])).toBe('pl')
    expect(donorOf([{ rel: 'inh', text: 'Old East Slavic х' }])).toBeUndefined()
    const mk = (cs: boolean, origin: string) => ({ first: { value: { form: 'Хата' }, evidence: [] }, forms: [{ raw: 'хата', norm: 'хата', claims: cs ? { church_slavonic: {} } : {} }], claims: { origin: { value: origin } } }) as never
    expect(isVernacular(mk(false, 'native'))).toBe(true); expect(isVernacular(mk(true, 'native'))).toBe(false); expect(isVernacular(mk(false, 'church_slavonic'))).toBe(false)
  })
})

describe.skipIf(!existsSync('data/work/cognates-kaikki.json'))('BL-15 harvested cognates (kaikki, Proto-Slavic graph)', () => {
  const k = () => JSON.parse(readFileSync('data/work/cognates-kaikki.json', 'utf8')) as { files: { file: string; sha256: string }[]; pivots: Record<string, { pivot: string; rows: CogRow[] }> }
  it('хата ← *xata: Polish chata and Belarusian хата are counterparts, Russian is marked borrowed (from Ukrainian)', () => {
    const p = k().pivots['хата']!
    expect(p.rows.some(r => r.l === 'pl' && r.w === 'chata')).toBe(true); expect(p.rows.some(r => r.l === 'be')).toBe(true)
    expect(p.rows.find(r => r.l === 'ru')?.b).toBe(1)
  })
  it('thousands of lemmas have counterparts and every file is pinned with a SHA-256', () => {
    const j = k(); expect(Object.keys(j.pivots).length).toBeGreaterThan(3000); expect(j.files.every(f => /^[0-9a-f]{64}$/.test(f.sha256))).toBe(true)
    expect(Object.values(j.pivots).filter(p => p.rows.some(r => r.d)).length).toBeGreaterThan(300)
  })
})

describe.skipIf(!existsSync('public/data/cognates.json'))('BL-15 built cognates.json', () => {
  it('every entry carries D-evidence with attribution; every flag satisfies ours.to < theirs.from', () => {
    const j = JSON.parse(readFileSync('public/data/cognates.json', 'utf8')) as { attribution: { licence: string }; entries: Record<string, { evidence: { kind: string }[]; flag?: { ours: number[]; theirs: number[] } }> }
    expect(j.attribution.licence).toContain('CC BY-SA')
    for (const e of Object.values(j.entries)) { expect(e.evidence[0]!.kind).toBe('D'); if (e.flag) expect(e.flag.ours[1]).toBeLessThan(e.flag.theirs[0]!) }
  })
})
