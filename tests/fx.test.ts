/** SPEC 61 FX-1 (POS gate), FX-2 (cited correspondences), FX-3 (one tie-break, POS agreement), FX-5 (paradigm kind), FX-6 (epoch placement of test lemmas). */
import { describe, it, expect } from 'vitest'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { key } from '../core/text.ts'
import { GATE, compatible, gateKey, paradigmKindOf, vesumClass } from '../core/pos-gate.ts'
import { CORRESPONDENCES, correspondenceFor, corrEvidence } from '../core/correspondences.ts'
import { explain, reverse } from '../core/reverse.ts'
import { chooseLemma, linkOptions, preferCommon, ONE_LETTER_PREP, posLabel, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { rankFirst, type FirstCand } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'
import type { VesumHit } from '../core/types.ts'
import { hasData, readFull } from './lexdata.ts'
import { uvStatus, uvShard, UV_CONFIRM_MIN_W, type UvGroup } from '../core/uv.ts'
import { witnessPoints, showWitnessGraph } from '../src/lib/witnessPoints.ts'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

describe('MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а', () => {
  const e4: Env = { ...env, hits: new Map(Object.entries({ "хом'як": [H("хом'як", 'noun:anim:m:v_naz')], "хом'яки": [H("хом'як", 'noun:anim:p:v_naz')], хомік: [H('Хомік', 'noun:anim:m:v_naz:prop:lname')], хоміки: [H('Хомік', 'noun:anim:p:v_naz:prop:lname')] }).map(([k, v]) => [key(k), v])) }
  const l4 = (t: TypeCtx) => { const r = linkOptions(t, e4); return r ? chooseLemma(r.opts, new Map()) : undefined }
  it('PVL хомѣки (TOROT lemma хомѣкъ) → хом’як (common noun) by R09 as a listed variant хомік, not the surname «Хомік»', () => {
    const c = l4(T({ raw: 'хомѣки', lemma: 'хомѣкъ' }))!
    expect(c.lemma).toBe("хом'як"); expect(c.cls).toBe('noun'); expect(c.corr!.row.kind).toBe('variant'); expect(c.corr!.row.rule).toBe('R09')
    expect(c.corr!.row.quote).toMatch(/хомик, хомік/); expect(c.own.form).toBe('хоміки'); expect(c.own.trace).toEqual(['R09'])
    expect(corrEvidence(c.corr!.row, c.corr!.old).note).toMatch(/надійної етимології не має/)
  })
  it('хомѧкъ derives хом’як by R02 (ѧ > ’я after a labial) and links to the same card, with the cited Wiktionary line', () => {
    expect(deriveRaw('хомѧкъ', { oldI: true }).candidates.find(c => c.form === "хом'як")!.trace).toContain('R02')
    const c = l4(T({ raw: 'хомѧкъ', lemma: 'хомѧкъ' }))!
    expect(c.lemma).toBe("хом'як"); expect(c.corr!.row.kind).toBe('rule'); expect(c.corr!.row.rule).toBe('R02'); expect(c.corr!.row.quote).toMatch(/хомѧкъ.*хомѣкъ.*\*xomě̀kъ/)
  })
  it('the dictionary variants хомик / хомік (Желехівський «Хоми́к», ЕСУМ) link to хом’як; a capitalised Хомік stays the surname', () => {
    for (const raw of ['хомик', 'хомік']) { const c = l4(T({ lang: 'uk', oldI: false, raw }))!; expect(c.lemma, raw).toBe("хом'як"); expect(c.corr!.row.kind).toBe('variant') }
    expect(l4(T({ lang: 'uk', oldI: false, raw: 'Хомік' }))?.lemma).not.toBe("хом'як")
  })
  it('no row says «ѣ > ’а»: the table has no cognate row for хомѣкъ and no rule id of that kind', () => {
    expect(CORRESPONDENCES.filter(c => c.old.includes('хомѣкъ')).every(c => c.kind !== 'cognate')).toBe(true)
    expect(JSON.stringify(CORRESPONDENCES)).not.toMatch(/ѣ > 'а після/)
  })
  it('the lemma-less token хомѣки also links to хом’як', () => { expect(l4(T({ raw: 'хомѣки' }))?.lemma).toBe("хом'як") })
  it('lower-case token: the surname reading is dropped when a common noun exists; a capitalised token and a surname-only token keep it', () => {
    const o = (lemma: string, tags: string) => ({ id: key(lemma), lemma, form: key(lemma), hit: H(lemma, tags), cand: { form: key(lemma), trace: [], branches: 0 }, tier: 0, own: { form: key(lemma), trace: [], branches: 0 }, ownConfirmed: true, cls: 'noun' as const })
    const both = { route: 'direct' as const, opts: [o('Хомік', 'noun:anim:m:v_naz:prop:lname'), o('хомік', 'noun:anim:m:v_naz')] }
    expect(preferCommon(T({ raw: 'хомік' }), both)!.opts.map(x => x.lemma)).toEqual(['хомік'])
    expect(preferCommon(T({ raw: 'Хомік' }), both)!.opts.length).toBe(2)
    const only = { route: 'direct' as const, opts: [o('Хомік', 'noun:anim:m:v_naz:prop:lname')] }
    expect(preferCommon(T({ raw: 'хомік' }), only)!.opts.length).toBe(1)
  })
  it('no uncited sound rule: the standard derivation of хомѣки still gives хоміки (no ѣ > ’а after a labial rule exists)', () => {
    expect(deriveRaw('хомѣки', { oldI: true }).candidates.map(c => c.form)).not.toContain("хом'яки")
  })
  it('real data (after a rebuild with MM-2): a хом’як card exists with the PVL spelling, and no «Хомік» card carries хомѣки', () => {
    if (!hasData()) return
    const all = readFull(), c = all.find(x => x.lemma === "хом'як"); if (!c) return
    expect(c.forms.map(f => f.raw)).toContain('хомѣки')
    expect(all.filter(x => x.lemma === 'Хомік').flatMap(x => x.forms.map(f => f.raw))).not.toContain('хомѣки')
  })
})

describe('MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment»)', () => {
  const e5: Env = { ...env, phon: true, hits: new Map(Object.entries({
    полк: [H('полк', 'noun:inanim:m:v_naz')], полки: [H('полк', 'noun:inanim:p:v_naz')], пілка: [H('пілка', 'noun:inanim:f:v_naz')], пілки: [H('пілка', 'noun:inanim:f:v_rod'), H('пілка', 'noun:inanim:p:v_naz')],
  }).map(([k, v]) => [key(k), v])) }
  const l5 = (t: TypeCtx, freq: Record<string, number> = {}) => { const r = linkOptions(t, e5); return r ? chooseLemma(r.opts, new Map(Object.entries(freq))) : undefined }
  it('Нечуй-Левицький «пілки срібної одежі» (modern text) links to пілка and never to полк', () => {
    const c = l5(T({ lang: 'uk', oldI: false, raw: 'пілки' }))!
    expect(c.lemma).toBe('пілка'); expect(c.alternatives).not.toContain('полк')
  })
  it('a modernised-orthography witness labelled non-uk: «полки» stays полк (the plain spelling is a VESUM form), the fold о > і never moves it to пілка', () => {
    for (const lang of ['ruthenian', 'orv'] as const) expect(l5(T({ lang, oldI: false, raw: 'полки', orth: 'modernised' }))?.lemma, lang).toBe('полк')
  })
  it('PVL / Мономах «полъкы» (regiments): R10 gives пілки, but the plain chain полки is a second candidate and frequency decides (as for богъ)', () => {
    const t = T({ raw: 'полъкы' }), r = linkOptions(t, e5)!
    expect([...new Set(r.opts.map(o => o.lemma))].sort()).toEqual(['полк', 'пілка'])
    expect(chooseLemma(r.opts, new Map([['полк', 123456], ['пілка', 17]]))!.lemma).toBe('полк')
  })
  it('derivation пола → пілка: *полъка (dim. -ъка) > пілка is the cited rule path R04 + R10 (о > і in the new closed syllable), no step R-id invented', () => {
    const ex = explain('полъка', 'пілка', { oldI: true })!
    expect(ex.steps.map(s => s.rule)).toEqual(['R04', 'R10']); expect(ex.steps[1]!.cite.quote).toMatch(/зву?ження.*о.*новозакритих складах/)
  })
  it('the dim.-of-пола claim carries its dictionary quote (Уманець–Спілка «Пола́ … здр. пі́лка»); no uncited claim', async () => {
    const { readFileSync } = await import('node:fs')
    const hs = JSON.parse(readFileSync(new URL('../pipelines/etymology-hypotheses.json', import.meta.url), 'utf8')) as { lemma: string; evidence: { quote: string; source: string }[]; status: string }[]
    const h = hs.find(x => x.lemma === 'пілка')!
    expect(h.evidence.some(e => /здр\. пі́лка/.test(e.quote))).toBe(true); expect(h.evidence.every(e => e.quote.length > 8 && e.source !== 'user')).toBe(true)
  })
  it('reconstructed old spellings of пілка (полка, полъка …) are labelled reconstruction, never confirmed by an attestation unless a callback supplies one', () => {
    const cs = reverse('пілка', { paradigm: ['пілка', 'пілки', 'пілок'] }).candidates
    expect(cs.every(c => c.status === 'reconstruction')).toBe(true)
  })
  it('real data (after a rebuild with MM-3): the card пілка lists no spelling of полк (полки, полъкы, полкы …)', () => {
    if (!hasData()) return
    const c = readFull().find(x => x.lemma === 'пілка'); if (!c) return
    expect(c.forms.map(f => f.raw).filter(r => /^полк|^полък/.test(r))).toEqual([])
  })
})

describe('MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant', () => {
  const g = (orv: string, nW: number): UvGroup => ['жечи', 3, nW, [['жечи', 3]], orv, 'w1', 1, 'w2', 2]
  const W: Record<string, { title: string; date: [number, number]; witnessType: string }> = {
    a: { title: 'Київський літопис', date: [1117, 1200], witnessType: 'chronicle' }, b: { title: 'Галицько-Волинський літопис', date: [1200, 1292], witnessType: 'chronicle' },
  }
  it('promotion: a group with a TOROT lemma in ≥ 2 witnesses is «засвідчено (TOROT + N пам’яток)», not «неперевірена лема»', () => {
    expect(UV_CONFIRM_MIN_W).toBe(2)
    expect(uvStatus(g('жети', 2))).toEqual({ confirmed: true, label: 'засвідчено (TOROT + 2 пам’ятки)' })
    expect(uvStatus(g('жети', 5)).label).toBe('засвідчено (TOROT + 5 пам’яток)')
  })
  it('the honest label stays when no dictionary or TOROT lemma stands behind it, or only one witness has it', () => {
    expect(uvStatus(g('', 3))).toEqual({ confirmed: false, label: 'неперевірена лема' })
    expect(uvStatus(g('жети', 1)).confirmed).toBe(false)
  })
  it('graph: ≥ 2 known witnesses give one plate each (year = composition midpoint), one witness or unknown ids give no graph', () => {
    const pts = witnessPoints([{ w: 'a', n: 1 }, { w: 'b', n: 1 }], id => W[id])
    expect(pts.map(p => [p.id, p.year, p.kind])).toEqual([['a', 1158.5, 'chronicle'], ['b', 1246, 'chronicle']]); expect(showWitnessGraph(pts)).toBe(true)
    expect(showWitnessGraph(witnessPoints([{ w: 'a', n: 1 }, { w: 'zz', n: 1 }], id => W[id]))).toBe(false)
  })
  it('R17: жечи (е before ч + и) gives no жочи; the rule still fires before a hard consonant (жена > жона, пьшено > пшоно)', () => {
    expect(deriveRaw('жечи', { oldI: true }).candidates.map(c => c.form)).not.toContain('жочи')
    expect(deriveRaw('жена', { oldI: true }).candidates.find(c => c.form === 'жона')!.trace).toContain('R17')
    expect(deriveRaw('пьшено', { oldI: true }).candidates.find(c => c.form === 'пшоно')!.trace).toContain('R17')
  })
  it('R17 reverse: жочи never gives жечи (soft ч follows), while жона still gives жена', () => {
    expect(reverse('жочи').candidates.map(c => c.form)).not.toContain('жечи')
    expect(reverse('жона').candidates.map(c => c.form)).toContain('жена')
  })
  it('r2u / Грінченко / Желехівський / Уманець harvests hold no «жечи / жещи»: the card stays TOROT-attested, no dictionary quote is invented', () => {
    const p = fileURLToPath(new URL('../data/work/r2u_zheleh.json', import.meta.url)); if (!existsSync(p)) return
    expect(readFileSync(p, 'utf8')).not.toMatch(/жечи|жещи/)
  })
  it('real data (after a rebuild with MM-4, shards present): the uv group «жечи» exists with an ORV card and 2+ witnesses → confirmed', () => {
    const p = fileURLToPath(new URL(`../public/data/uv/g/${uvShard('жечи')}.json`, import.meta.url)); if (!existsSync(p)) return
    const x = (JSON.parse(readFileSync(p, 'utf8')) as Record<string, UvGroup>)['жечи']; if (!x) return
    expect(uvStatus(x).confirmed).toBe(true)
  })
})

describe('FX-2 correspondences', () => {
  it('every row has a verbatim ЕСУМ quote and a goroh URL', () => {
    for (const c of CORRESPONDENCES) { expect(c.quote.length, c.modern).toBeGreaterThan(8); expect(c.url).toMatch(c.kind === 'cognate' || c.kind === 'rule' ?/^https:\/\/en\.wiktionary\.org\// : /^https:\/\/goroh\.pp\.ua\//) }
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
