/** SPEC 63 GZ — Galician (Желехівка) witnesses and common-word linking. */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { vesumFormLight, bestHit } from '../core/gz-light.ts'
import { fold, FOLDS } from '../core/orthography.ts'
import { ZHEL_FOLDS } from '../core/zhel-folds.ts'
import { ikavismBase } from '../src/lib/lightcard.ts'
import { chainsForWord } from '../core/ikavism.ts'
import { otherWord, cognateFlag, type CogRow } from '../core/cognates.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const forms = (w: string) => fold(w, 'желехівка').map(c => c.form)

describe('GZ-1 ordinary VESUM forms are never bare words', () => {
  const hits = new Map([['матері', [{ lemma: 'мати', tags: 'noun:anim:f:v_rod' }]], ['разу', [{ lemma: 'раз', tags: 'noun:inanim:m:v_rod' }]], ['москва', [{ lemma: 'Москва', tags: 'noun:inanim:f:v_naz:prop:geo' }, { lemma: 'москва', tags: 'noun:inanim:f:v_naz' }]]])
  const ws = [{ id: 'w1', lang: 'uk', tokens: [{ raw: 'Матері', loc: 'a' }, { raw: 'разу', loc: 'b' }, { raw: 'вода', loc: 'c' }, { raw: 'неслово', loc: 'd' }] }, { id: 'w2', lang: 'orv', tokens: [{ raw: 'матері', loc: 'x' }] }]
  it('an unresolved token whose own spelling is a VESUM form (FX-3 homonym loser: мати noun vs verb, раз noun vs adverb) gets a light-card ref; linked, ref-holding, non-uk and non-VESUM tokens do not', () => {
    const ids = [Int32Array.from([-1, -1, 7, -1]), Int32Array.from([-1])]
    const r = vesumFormLight(ws, ids, () => false, hits)
    expect(r.refs.get('w1')).toEqual(['l:мати', 'l:раз', '', ''])
    expect(r.refs.has('w2')).toBe(false)
    expect(r.tokens).toBe(2)
    expect(r.lemmas.map(l => l[0]).sort()).toEqual(['мати', 'раз'])
    expect(vesumFormLight(ws, ids, (w, ti) => w === 'w1' && ti === 0, hits).tokens).toBe(1)   // an existing ref (name / archaic card) is kept
  })
  it('the cited analysis prefers an unflagged common noun to a proper name', () => expect(bestHit(hits.get('москва')!)!.lemma).toBe('москва'))
  it('an existing light entry is reused: its count grows, no duplicate lemma', () => {
    const ex = new Map<string, [string, string, number, string]>([['мати', ['мати', 'noun', 5, 'w|x|y']]])
    const r = vesumFormLight(ws, [Int32Array.from([-1, -1, 7, -1]), Int32Array.from([-1])], () => false, hits, ex)
    expect(ex.get('мати')![2]).toBe(6); expect(r.lemmas.map(l => l[0])).toEqual(['раз'])
  })
  it('build wires it after the PV-6 light index and adds the raw spelling to the VESUM pass', () => {
    const b = rd('pipelines/build.ts')
    expect(b).toContain('vesumFormLight(')
    expect(b).toMatch(/forms\.add\(key\(t\.raw\)\)/)
  })
})

describe('GZ-2 cited Желехівка folds', () => {
  it('every fold quotes its source statement and locator; there is no rule without one', () => {
    for (const f of ZHEL_FOLDS) { expect(f.era).toEqual(['желехівка']); expect(f.cite.kind).toBe('Q'); expect(f.cite.locator).toContain('Желехівка'); expect(f.cite.quote.length).toBeGreaterThan(20) }
    expect(FOLDS.filter(f => f.id.startsWith('ORTH-ZHEL')).map(f => f.id)).toEqual(expect.arrayContaining(ZHEL_FOLDS.map(f => f.id)))
  })
  it('сьв/зьв/цьв/сьм → св/зв/цв/см (сьвято, зьвір, цьвях, сьміх)', () => {
    expect(forms('сьвято')).toContain('свято'); expect(forms('зьвір')).toContain('звір'); expect(forms('цьвях')).toContain('цвях'); expect(forms('сьміх')).toContain('сміх')
  })
  it('-ский/-цкий → -ський/-цький including inflections (Беднарского, нїмецкий)', () => {
    expect(forms('беднарского')).toContain('беднарського'); expect(forms('нємецкий')).toContain('нємецький')
  })
  it('initial и = і; final -є → -я (+ geminate): знанє → знання, житє → життя', () => {
    expect(forms('индустрія')).toContain('індустрія'); expect(forms('знанє')).toContain('знання'); expect(forms('житє')).toContain('життя')
  })
  it('refused for want of a source: -ою → -\'ю, е/і (трівожу), и/і lexical, participles -уч- are not folded', () => {
    expect(forms('любовою')).toEqual(['любовою']); expect(forms('кровою')).toEqual(['кровою'])
    expect(forms('трівожу')).not.toContain('тривожу'); expect(forms('будущим')).toEqual(['будущим'])
  })
})

describe('GZ-3 report', () => {
  it('analysis/galician-extraction.md states the GZ-1 root cause, before/after counts and the refused features', () => {
    const t = rd('analysis/galician-extraction.md')
    expect(t).toContain('FX-3'); expect(t).toMatch(/до виправлення|before/i); expect(t).toContain('franko1905'); expect(t).toMatch(/відмов|refused/i)
  })
})

describe('GZ-4 light cards', () => {
  it('never say «рідкісна»; «мало засвідчена в нашому корпусі (f = n)»', () => {
    const v = rd('src/views/LightWordView.vue')
    expect(v).not.toMatch(/рідкісна/); expect(v).toContain('Мало засвідчена в нашому корпусі (f = {{ row[2] }})')
  })
  it('standard ikavism gets its trace: покірність ~ покора proves о > і', () => {
    const keys = ['покинути', 'покора', 'покорі', 'покута']
    const base = ikavismBase('покірність', keys)
    expect(base).toContain('покора')
    expect(chainsForWord('покірність', { paradigm: base }).map(c => c.src)).toContain('о')
    expect(rd('src/views/LightWordView.vue')).toContain('<IkavismChain')
  })
})

describe('GZ-5 cognates: same word vs same etymon', () => {
  it('a borrowing / doublet with another meaning (пол. ksiądz «priest» vs «prince») is another word; a cousin with the same meaning is not; no gloss → no claim', () => {
    expect(otherWord('Christian priest (religious clergyman)', 'prince', 'Inherited from Old Polish ksiądz. Doublet of kniaź.')).toBe(true)
    expect(otherWord('prince; duke', 'prince', 'Inherited from Proto-Slavic. Doublet of ксёндз')).toBe(false)
    expect(otherWord(undefined, 'prince', 'Doublet of x')).toBe(false)
    expect(otherWord('Christian priest', 'prince', 'Inherited from Old Polish')).toBe(false)
  })
  it('an «other word» row never antedates (ET-3 flag)', () => {
    const rows: CogRow[] = [{ l: 'pl', w: 'ksiądz', o: 1, d: [1301, 1400] }]
    expect(cognateFlag({ ours: [1100, 1100], vernacular: true }, rows)).toBeUndefined()
  })
  it('the panel lists such rows apart, with their meaning, and counts only correspondences', () => {
    const p = rd('src/components/CognatesPanel.vue')
    expect(p).toContain('Споріднені за етимоном, інше слово'); expect(p).toContain('v-for="r in same"'); expect(p).toContain('r.b || r.o')
  })
  it.skipIf(!existsSync(new URL('../public/data/cognates.json', import.meta.url)))('real data: князь keeps ksiądz/ксёндз out of the correspondence rows', () => {
    const e = JSON.parse(rd('public/data/cognates.json')).entries['князь']
    if (!e || !e.rows.some((r: CogRow) => r.o !== undefined)) return   // data not rebuilt yet
    const same = e.rows.filter((r: CogRow) => !r.b && !r.o)
    expect(same.map((r: CogRow) => r.w)).toContain('князь'); expect(same.map((r: CogRow) => r.w)).not.toContain('ксёндз'); expect(same.filter((r: CogRow) => r.l === 'pl' && r.w === 'ksiądz')).toEqual([])   // Old Polish ksiądz «prince» is the same word and stays
  })
})
