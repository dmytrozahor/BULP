/** SPEC 61 FX-1 (POS gate), FX-2 (cited correspondences), FX-3 (one tie-break, POS agreement), FX-5 (paradigm kind), FX-6 (epoch placement of test lemmas). */
import { describe, it, expect } from 'vitest'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { key } from '../core/text.ts'
import { GATE, compatible, gateKey, paradigmKindOf, vesumClass } from '../core/pos-gate.ts'
import { CORRESPONDENCES, correspondenceFor } from '../core/correspondences.ts'
import { chooseLemma, linkOptions, ONE_LETTER_PREP, posLabel, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { rankFirst, type FirstCand } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'
import type { VesumHit } from '../core/types.ts'
import { hasData, readFull } from './lexdata.ts'

const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
const table: Record<string, VesumHit[]> = {
  аз: [H('аз', 'noun:inanim:m:v_naz')],
  я: [H('я', 'noun:anim:s:v_naz:pron:pers:1'), H('я', 'noun:inanim:f:v_naz:nv')],
  мене: [H('я', 'noun:anim:s:v_rod:pron:pers:1')],
  мною: [H('я', 'noun:anim:s:v_oru:pron:pers:1')],
  да: [H('ДА', 'noun:inanim:m:v_naz:nv:abbr'), H('да', 'part:bad')],
  ДА: [H('ДА', 'noun:inanim:m:v_naz:nv:abbr'), H('да', 'part:bad')],
}
const env: Env = {
  hits: new Map(Object.entries(table).map(([k, v]) => [key(k), v])),
  derive: (s, oldI) => deriveRaw(s, { oldI }), fold: (s, o) => foldRaw(s, o),
}
const T = (o: Partial<TypeCtx>): TypeCtx => ({ lang: 'orv', oldI: true, raw: '', ...o })
const link = (t: TypeCtx) => { const r = linkOptions(t, env); return r ? chooseLemma(r.opts, new Map()) : undefined }

describe('BL-19 а / албо / а. / á', () => {
  const t2: Record<string, VesumHit[]> = { а: [H('а', 'conj:coord')], або: [H('або', 'conj:coord')] }
  const e2: Env = { ...env, hits: new Map(Object.entries(t2).map(([k, v]) => [key(k), v])) }
  it('uncorroborated Stanza lemma is rejected, corroborated accepted', () => {
    expect(linkOptions(T({ raw: 'албо', stanza: 'а' }), e2)).toBeUndefined()
    expect(linkOptions(T({ raw: 'а', stanza: 'а' }), e2)?.route).toBe('stanza-lemma')
  })
  it('tokenizer strips punctuation', async () => {
    const { tokenize } = await import('../core/text.ts')
    expect(tokenize('а. «а» (албо),').map(x => x.raw)).toEqual(['а', 'а', 'албо'])
  })
  it('key folds Latin accent look-alikes', () => { expect(key('á')).toBe('а'); expect(key('Ó')).toBe('о') })
})

describe('FX-1 POS gate', () => {
  it('every gate row cites the TOROT header / UD name and allows ≥ 1 VESUM class', () => {
    for (const r of GATE) { expect(r.cite, r.key).toMatch(/TOROT parts-of-speech|UD UPOS/); expect(r.allow.length, r.key).toBeGreaterThan(0) }
    expect(GATE.find(r => r.key === 'P:Pp')!.cite).toContain('personal pronoun')
  })
  it('VESUM classes: pronouns carry the `pron` segment', () => {
    expect(vesumClass('noun:anim:s:v_naz:pron:pers:1')).toBe('pron'); expect(vesumClass('adj:m:v_rod:pron:dem')).toBe('pron')
    expect(vesumClass('noun:inanim:m:v_naz')).toBe('noun'); expect(vesumClass('part:bad')).toBe('part')
  })
  it('a pronoun / conjunction never links to a common noun; a noun does', () => {
    expect(compatible('P:Pp', 'noun:inanim:m:v_naz')).toBe(false)
    expect(compatible('P:C-', 'noun:inanim:m:v_naz:nv:abbr')).toBe(false)
    expect(compatible('P:Df', 'noun:inanim:m:v_naz')).toBe(false)
    expect(compatible('P:Nb', 'noun:inanim:m:v_naz')).toBe(true)
    expect(compatible('P:Pp', 'noun:anim:s:v_rod:pron:pers:1')).toBe(true)
    expect(compatible(undefined, 'noun:inanim:m:v_naz')).toBe(true)
  })
  it('gate key from TOROT morph first, Stanza UPOS only without morph', () => {
    expect(gateKey('Pp 1s---mn--i', 'NOUN')).toBe('P:Pp'); expect(gateKey(undefined, 'CCONJ')).toBe('U:CCONJ'); expect(gateKey('F- ---------n', 'X')).toBeUndefined()
  })
  it('да (TOROT C-/Df) → the particle «да», not the abbreviation noun «ДА»; the ungated control would pick the noun', () => {
    for (const g of ['P:C-', 'P:Df']) { const c = link(T({ raw: 'да', lemma: 'да', gate: g }))!; expect(c.lemma, g).toBe('да'); expect(c.cls).toBe('part') }
    expect(link(T({ raw: 'да', lemma: 'да' }))!.cls).toBe('noun')
  })
  it('nothing compatible → unresolved, never guessed', () => { expect(link(T({ raw: 'да', lemma: 'да', gate: 'P:V-' }))).toBeUndefined() })
})

describe('MM-1 preposition recognised as pronoun', () => {
  const e3: Env = { ...env, hits: new Map(Object.entries({ з: [H('з', 'prep:v_rod:v_zna:v_oru')], себе: [H('себе', 'noun:unanim:v_rod:pron:refl')], с: [H('с', 'noun:inanim:m:v_naz:nv:abbr')] }).map(([k, v]) => [key(k), v])) }
  const l3 = (t: TypeCtx) => { const r = linkOptions(t, e3); return r ? chooseLemma(r.opts, new Map()) : undefined }
  it('«с» tagged Pk with lemma себе (PVL) → the preposition з, never the pronoun', () => {
    for (const o of [{ lemma: 'себе', gate: 'P:Pk' }, { lemma: 'съ', gate: 'P:R-' }, { gate: 'U:PRON' }]) { const c = l3(T({ raw: 'с', ...o }))!; expect(c.lemma, JSON.stringify(o)).toBe('з'); expect(c.cls).toBe('prep') }
  })
  it('the reflexive enclitic сѧ stays under себе', () => { expect(l3(T({ raw: 'сѧ', lemma: 'себе', gate: 'P:Pk' }))?.lemma).toBe('себе') })
  it('real data (after a rebuild with MM-1): the card себе lists no «с» spelling, while сѧ stays', () => {
    if (!hasData()) return
    const c = readFull().find(x => x.lemma === 'себе'); if (!c) return
    const raws = c.forms.map(f => f.raw)
    expect(raws).not.toContain('с')
    expect(ONE_LETTER_PREP.has('с')).toBe(true)
  })
})

describe('FX-2 correspondences', () => {
  it('every row has a verbatim ЕСУМ quote and a goroh URL', () => {
    for (const c of CORRESPONDENCES) { expect(c.quote.length, c.modern).toBeGreaterThan(8); expect(c.url).toMatch(/^https:\/\/goroh\.pp\.ua\//) }
    expect(correspondenceFor('азъ')!.modern).toBe('я'); expect(correspondenceFor('есмь')).toBeUndefined()   // no fetched quote → no row
  })
  it('азъ → я (pronoun), not the modern noun аз; мене/мною/мнѣ under я', () => {
    for (const raw of ['азъ', 'мнѣ', 'мене', 'мною']) {
      const c = link(T({ raw, lemma: 'азъ', gate: 'P:Pp' }))!
      expect(c.lemma, raw).toBe('я'); expect(c.cls).toBe('pron'); expect(c.corr!.row.url).toContain('goroh.pp.ua'); expect(c.id).not.toBe('аз')
    }
    expect(link(T({ raw: 'азъ', lemma: 'азъ' }))!.lemma).toBe('я')   // also without a gate: the cited correspondence comes first
  })
  it('modern noun аз is not chosen for азъ even through the token route', () => {
    const r = linkOptions(T({ raw: 'азъ', gate: 'P:Pp' }), env)
    expect(r === undefined || r.opts.every(o => o.cls !== 'noun')).toBe(true)
  })
})

describe('FX-3 one tie-break; FX-5 kinds', () => {
  const a = authorById[Object.keys(authorById)[0]!]!
  const c = (form: string, n: number): FirstCand => ({ witness: 'w', author: a, date: [1037, 1050], witnessType: 'ms_copy', loc: 'l', form, route: 'token', n })
  it('same witness and date: the commoner spelling is the first attestation (мя vs ми case)', () => {
    expect(rankFirst([c('мя', 1), c('ми', 3)])!.first.form).toBe('ми')
  })
  it('paradigm kind by POS', () => {
    expect(paradigmKindOf('noun:anim:s:v_naz:pron:pers:1')).toBe('pron'); expect(paradigmKindOf('noun:inanim:m:v_naz')).toBe('noun')
    expect(paradigmKindOf('part:bad')).toBe('uninflected'); expect(paradigmKindOf('conj:coord')).toBe('uninflected'); expect(paradigmKindOf('adj:m:v_naz')).toBe('adj'); expect(paradigmKindOf('verb:imperf:inf')).toBe('verb')
    expect(posLabel('noun:anim:s:v_naz:pron:pers:1')).toBe('займенник')
  })
})

describe.skipIf(!hasData())('FX on the built data', () => {
  const cards = readFull(), by = new Map(cards.map(x => [x.lemma, x]))
  it('я is a pronoun with мене/мною among its forms; азъ is not under аз', () => {
    const ja = by.get('я')!
    expect(ja.paradigmKind).toBe('pron'); expect(ja.pos).toBe('займенник')
    const raws = ja.forms.map(f => f.raw)
    expect(raws.some(r => ['мене', 'мне', 'мѧ', 'мя'].includes(r))).toBe(true)
    expect(by.get('аз')?.forms.some(f => f.raw === 'азъ') ?? false).toBe(false)
  })
  it('да is not a noun; uninflected words carry kind uninflected and no epoch paradigm', () => {
    const da = by.get('да'); if (da) { expect(da.paradigmKind).toBe('uninflected'); expect(da.epochs).toBeUndefined() }
    for (const x of cards) if (x.paradigmKind && x.paradigmKind !== 'noun' && x.paradigmKind !== 'pron' && x.paradigmKind !== 'verb') expect(x.epochs, x.lemma).toBeUndefined()   // pronouns have their own grid (FX-5 follow-up)
  })
  it('FX-3: first-attestation form = oldest form for every lemma; every lemma card has a kind', () => {
    for (const x of cards) {
      expect(x.paradigmKind, x.lemma).toBeTruthy()
      const f = x.first.value, o = x.claims.oldest.value
      if (f !== 'unknown' && o !== 'unknown') expect(o.form, x.lemma).toBe(f.form.normalize('NFC').toLowerCase())
    }
  })
  it('FX-6: real nouns place most tagged tokens in cells', () => {
    for (const l of ['рука', 'земля', 'князь', 'город', 'син']) {
      const ps = by.get(l)!.epochs!.paradigms, N = ps.reduce((s, p) => s + p.N, 0), bad = ps.reduce((s, p) => s + p.dropped.conflict + p.dropped.underspecified, 0)
      expect(ps.some(p => p.cells.length > 0), l).toBe(true); expect(bad / N, l).toBeLessThan(0.5)
    }
  })
  it('FX-5 pronouns: я / ти / себе / ми / ви / він are placed in the pronominal grid (case × number, no stem type)', () => {
    for (const l of ['я', 'ти', 'себе', 'ми', 'ви', 'він']) {
      const e = by.get(l)?.epochs
      if (!e) continue   // lemma not in this (possibly partial) data set
      const ps = e.paradigms, N = ps.reduce((s, p) => s + p.N, 0), bad = ps.reduce((s, p) => s + p.dropped.conflict + p.dropped.underspecified, 0)
      expect(ps.every(p => p.grid === 'pron'), l).toBe(true); expect(e.stem.value, l).toBe('unknown')
      expect(ps.some(p => p.cells.length > 0), l).toBe(true); expect(bad / N, l).toBeLessThan(l === 'він' ? 0.7 : 0.2)   // BL-19: forms whose Stanza lemma is no longer trusted (єго → він) now link by other routes and count as lemma conflicts
    }
  })
})
