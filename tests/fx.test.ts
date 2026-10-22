/** SPEC 61 FX-1 (POS gate), FX-2 (cited correspondences), FX-3 (one tie-break, POS agreement), FX-5 (paradigm kind), FX-6 (epoch placement of test lemmas). */
import { describe, it, expect } from 'vitest'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import { key } from '../core/text.ts'
import { GATE, compatible, gateKey, paradigmKindOf, vesumClass } from '../core/pos-gate.ts'
import { CORRESPONDENCES, correspondenceFor, corrEvidence } from '../core/correspondences.ts'
import { explain, reverse } from '../core/reverse.ts'
import { chooseLemma, linkOptions, preferCommon, ONE_LETTER_PREP, posLabel, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { rankFirst, selectForms, type FirstCand } from '../pipelines/build-annotate.ts'
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
    expect(link(T({ raw: 'да', lemma: 'да' }))!.cls).toBe('part')   // MM-15: the abbreviation «ДА» is never the lemma of a lower-case token, even ungated
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
    полк: [H('полк', 'noun:inanim:m:v_naz')], полки: [H('полк', 'noun:inanim:p:v_naz')], полку: [H('полк', 'noun:inanim:m:v_rod'), H('полк', 'noun:inanim:m:v_dav')], пілка: [H('пілка', 'noun:inanim:f:v_naz')], пілки: [H('пілка', 'noun:inanim:f:v_rod'), H('пілка', 'noun:inanim:p:v_naz')],
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
  it('Ізборник 1569 «всими сими полкы» (ruthenian, normalised orthography, ы kept) links to полк by the plain ы > и route, never to пілка', () => {
    for (const phon of [false, true]) {
      const r = linkOptions(T({ lang: 'ruthenian', oldI: false, raw: 'полкы', orth: 'ізборник-нормалізований' }), { ...e5, phon })!
      expect(chooseLemma(r.opts, new Map())!.lemma, String(phon)).toBe('полк')
    }
  })
  it('the old genitive «з полка» (modernised text, 10 M-token import) is a form of полк by MU-GEN-SG-A (ENC um27 / PAVL с. 81: -а ~ -у), not пілка by the phonetic fold', () => {
    for (const lang of ['uk', 'ruthenian'] as const) for (const phon of [false, true]) {
      const r = linkOptions(T({ lang, oldI: false, raw: 'полка', orth: 'modernised' }), { ...e5, phon })!
      expect(chooseLemma(r.opts, new Map([['полк', 12345], ['пілка', 3]]))!.lemma, lang + phon).toBe('полк')
    }
    expect(linkOptions(T({ lang: 'uk', oldI: false, raw: 'полка', orth: 'modernised' }), { ...e5, phon: false })!.opts.map(o => o.cand.trace)).toEqual([['MU-GEN-SG-A']])
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
    for (const c of CORRESPONDENCES) { expect(c.quote.length, c.modern).toBeGreaterThan(8); expect(c.url).toMatch(c.kind === 'cognate' || c.kind === 'rule' ?/^https:\/\/en\.wiktionary\.org\// : c.variants?.some(v => v === 'лигінь' || v === 'ню') ? /^https:\/\// : /^https:\/\/goroh\.pp\.ua\//) }
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

// ───────────────────────── MM-5 … MM-10 and OQ (owner screenshots 2026-10-21; specs/mismatches.md) ─────────────────────────
import { expandTitlo } from '../core/text.ts'
import { MODEL_NOTE, gateSourceUk, tagLine } from '../core/torot.ts'
import { ADJ_SOFT_FOLD, toSoftAdj, withSoftAdj } from '../core/adj-soft.ts'
import { foldById } from '../core/orthography.ts'
import { OQ_GARBAGE, ocrQuality, ocrScore } from '../core/ocr-quality.ts'
import { contactCorr } from '../core/contact-corr.ts'
import { altStandardMap } from '../core/vesum-alt.ts'
import { remapAlt } from '../pipelines/build-link.ts'
import { runDetectors, categoryOf, strongest, emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { lemmaChipKeys, formContactClaims } from '../src/lib/contactLayer.ts'
import { claim, unknown } from '../core/evidence.ts'
import type { CoreCard } from '../core/types.ts'

const E = (t: Record<string, VesumHit[]>, extra: Partial<Env> = {}): Env => ({ hits: new Map(Object.entries(t).map(([k, v]) => [key(k), v])), derive: (s, oldI) => withSoftAdj(deriveRaw(s, { oldI })), fold: (s, o) => foldRaw(s, o), ...extra })
const linkE = (e: Env, t: TypeCtx) => { const r = linkOptions(t, e); return r ? chooseLemma(r.opts, new Map()) : undefined }

describe('MM-5 «съпостати це сопостат супостат іменник а не дієслово.png»: a model tag is labelled as a model and never overrides VESUM', () => {
  it('a Stanza card is «автоматична розмітка (Stanza), не перевірено», not «TOROT: VERB»; a gold card keeps TOROT', () => {
    const m = tagLine({ model: true, pos: 'VERB (Stanza ORV, модель)', morph: 'Tense=Pres|VerbForm=Inf|Voice=Act' })
    expect(m.source).toBe('Stanza'); expect(m.text).toContain(MODEL_NOTE); expect(m.text).not.toContain('TOROT'); expect(m.text).toContain('VERB'); expect(m.text).not.toContain('модель)')
    expect(tagLine({ pos: 'V- verb', morph: 'x' }).source).toBe('TOROT')
    expect(gateSourceUk('U:ADJ')).toBe('Stanza, модель'); expect(gateSourceUk('P:Nb')).toBe('TOROT')
  })
  const e = E({ супостат: [H('супостат', 'noun:anim:m:v_naz')], супостата: [H('супостат', 'noun:anim:m:v_rod')] })
  it('the cited Wiktionary row links the model lemma съпостати / the spelling сопостат to the NOUN супостат; the Stanza VERB gate does not veto it', () => {
    const row = correspondenceFor('съпостати')!
    expect(row.modern).toBe('супостат'); expect(row.cls).toBe('noun'); expect(row.kind).toBe('cognate'); expect(row.quote).toContain('sǫpostatъ'); expect(row.url).toContain('wiktionary')
    const c = linkE(e, T({ raw: 'сопостат', stanza: 'съпостати', gate: 'U:VERB' }))!
    expect(c.lemma).toBe('супостат'); expect(c.cls).toBe('noun'); expect(c.corr!.row.kind).toBe('cognate')
    expect(linkE(e, T({ raw: 'сопостат' }))!.lemma).toBe('супостат')   // lemma-less token
  })
  it('a TOROT GOLD verb tag (P:V-) is still respected: the cited row does not override gold annotation', () => {
    expect(linkE(e, T({ raw: 'сопостат', lemma: 'съпостати', gate: 'P:V-' }))).toBeUndefined()
  })
})

describe('MM-6 «давьныи без сучасного відповідника хоча є давній.png»: soft-stem adjectives', () => {
  const e = E({ давній: [H('давній', 'adj:m:v_naz:compb')], давніх: [H('давній', 'adj:p:v_rod:compb')], давня: [H('давній', 'adj:f:v_naz:compb')], давнього: [H('давній', 'adj:m:v_rod:compb')] })
  it('the sound chain gives the hard stem давний, which VESUM lacks; the labelled soft-group candidate reaches давній', () => {
    expect(deriveRaw('давьныи', { oldI: true }).candidates.map(c => c.form)).toEqual(['давний'])
    expect(e.hits.has('давний')).toBe(false)
    const cs = withSoftAdj(deriveRaw('давьныи', { oldI: true })).candidates
    expect(cs.map(c => c.form)).toContain('давній'); expect(cs.find(c => c.form === 'давній')!.trace.at(-1)).toBe('ORTH-ADJ-SOFT')
    expect(toSoftAdj('давних')).toBe('давніх'); expect(toSoftAdj('давного')).toBe('давнього'); expect(toSoftAdj('добрий')).toBe('добрий')
  })
  it('the alternation is a labelled hypothesis with a citation (PAVL, two paradigms), one extra branch, resolvable in a trace', () => {
    expect(ADJ_SOFT_FOLD.cite.kind).toBe('P'); expect(ADJ_SOFT_FOLD.cite.source).toBe('PAVL'); expect(foldById['ORTH-ADJ-SOFT']).toBe(ADJ_SOFT_FOLD)
    expect(withSoftAdj(deriveRaw('давный', { oldI: true })).candidates.find(c => c.form === 'давній')!.branches).toBe(1)
  })
  it('a Stanza-ADJ token давных / давна / давного links to давній', () => {
    for (const raw of ['давных', 'давна', 'давного']) expect(linkE(e, T({ raw, stanza: 'давьныи', gate: 'U:ADJ' }))?.lemma ?? linkE(e, T({ raw, gate: 'U:ADJ' }))?.lemma, raw).toBe('давній')
  })
  it('ordinary hard adjectives are untouched: a plain hit wins (добрий)', () => {
    const e2 = E({ добрий: [H('добрий', 'adj:m:v_naz')] })
    expect(linkE(e2, T({ raw: 'добрыи' }))!.lemma).toBe('добрий')
  })
})

describe('MM-7 «цѣсарьствие без сучасного відповідника хоча є царство.png»: labelled ЦС correspondence; titlo expansion', () => {
  it('the row is kind cs with the ЕСУМ «цар» quote (цѣсарь > цар) and says no sound rule is claimed', () => {
    const r = correspondenceFor('цѣсарьствие')!
    expect(r.kind).toBe('cs'); expect(r.modern).toBe('царство'); expect(r.quote).toContain('цѣсарь'); expect(r.url).toContain('goroh.pp.ua'); expect(r.note).toMatch(/без звукового правила|не цитується/)
    expect(corrEvidence(r, 'цѣсарьствие').note).toContain('ЦС-відповідність')
  })
  it('model-lemma tokens царствіи / цесарьствии link to царство (no rule -ствие > -ство is invented)', () => {
    const e = E({ царство: [H('царство', 'noun:inanim:n:v_naz')], царства: [H('царство', 'noun:inanim:n:v_rod')] })
    for (const raw of ['царствіи', 'цесарьствии', 'царствия']) expect(linkE(e, T({ raw, stanza: 'цѣсарьствие', gate: 'U:NOUN' }))?.lemma, raw).toBe('царство')
  })
  it('titlo spellings are expanded: цр҃ствиѥ → царствиѥ, цр҃ьствиꙗ → царьствиѧ', () => {
    expect(expandTitlo('цр҃ствиѥ').word).toBe('царствиѥ'); expect(expandTitlo('цр҃ьствиꙗ').word).toBe('царьствиѧ')
    expect(expandTitlo('цр҃ь').word.startsWith('цар')).toBe(true)   // the old row ['цр','цар'] still works
  })
})

describe('MM-8 «даль перша фіксація з невичитаного OCR і злиті прислівники далі дале.png»', () => {
  it('(b) дале / далѣ are the ADVERB далі (Wiktionary: Old Ruthenian далѣ, OES дале), not forms of даль', () => {
    const e = E({ далі: [H('даль', 'noun:inanim:f:v_rod'), H('далі', 'adv:compc:predic')], даль: [H('даль', 'noun:inanim:f:v_naz')] })
    for (const raw of ['дале', 'далѣ']) { const c = linkE(e, T({ raw }))!; expect(c.lemma, raw).toBe('далі'); expect(c.cls).toBe('adv') }
    expect(correspondenceFor('дале')!.quote).toContain('Old East Slavic дале')
    expect(linkE(e, T({ raw: 'даль' }))!.lemma).toBe('даль')   // the noun itself is unchanged
  })
  it('(a) OQ score and bands: arch1092 OCR (S ≈ 0.34, a proofread TOROT edition exists) is excluded; good modern OCR is not; proofread text is never gated', () => {
    const ids = new Set(['arch', 'hv_ia_arch1092', 'x'])
    const arch = ocrQuality({ id: 'hv_ia_arch1092', witnessType: 'ocr', date: [1092, 1092] }, { tokens: 14837, linked: 8160, hapaxTypes: 5683 }, ids)
    expect(arch.score).toBeCloseTo(0.34, 1); expect(arch.band).toBe('low'); expect(arch.excluded).toBe(true); expect(arch.preferred).toEqual(['arch'])
    const good = ocrQuality({ id: 'x', witnessType: 'ocr', date: [1900, 1900] }, { tokens: 1000, linked: 800, hapaxTypes: 200 }, ids)
    expect(good.band).toBe('ok'); expect(good.excluded).toBe(false)
    expect(ocrQuality({ id: 'y', witnessType: 'ocr', date: [1500, 1500] }, { tokens: 1000, linked: 700, hapaxTypes: 200 }, ids).band).toBe('ok')   // S = 0.56 ≥ 0.45
    expect(ocrQuality({ id: 'y', witnessType: 'ocr', date: [1500, 1500] }, { tokens: 1000, linked: 600, hapaxTypes: 300 }, ids).band).toBe('low')   // S = 0.42 < 0.45 for pre-1800
    expect(ocrQuality({ id: 'y', witnessType: 'ocr', date: [1850, 1850] }, { tokens: 1000, linked: 600, hapaxTypes: 300 }, ids).band).toBe('ok')   // same S, later print: threshold 0.30
    const junk = ocrQuality({ id: 'z', witnessType: 'ocr', date: [1900, 1900] }, { tokens: 1000, linked: 100, hapaxTypes: 500 }, ids)
    expect(junk.score).toBeLessThan(OQ_GARBAGE); expect(junk.band).toBe('garbage'); expect(junk.excluded).toBe(true)
    expect(ocrQuality({ id: 'ostromir', witnessType: 'autograph', date: [1056, 1057] }, { tokens: 100, linked: 5, hapaxTypes: 90 }, ids).excluded).toBe(false)
    expect(ocrScore({ tokens: 0, linked: 0, hapaxTypes: 0 })).toBe(0)
  })
  it('a proofread edition in the corpus wins even over a good OCR score; absent from the corpus → no preference', () => {
    const s = { tokens: 1000, linked: 900, hapaxTypes: 100 }
    expect(ocrQuality({ id: 'hv_ia_arch1092', witnessType: 'ocr', date: [1092, 1092] }, s, new Set(['arch'])).excluded).toBe(true)
    expect(ocrQuality({ id: 'hv_ia_arch1092', witnessType: 'ocr', date: [1092, 1092] }, s, new Set()).excluded).toBe(false)
  })
  it('first-attestation ranking among kept witnesses is unchanged (a gated witness is dropped before rankFirst, in the build)', () => {
    const a = authorById[Object.keys(authorById)[0]!]!
    const cand = (w: string, y: number, witnessType: string): FirstCand => ({ witness: w, author: a, date: [y, y], witnessType, loc: 'l', form: 'на', route: 'token', n: 1 })
    expect(rankFirst([cand('hv_ia_arch1092', 1092, 'ocr'), cand('arch', 1092, 'autograph')])!.first.witness).toBe('arch')
  })
  it('real data (after a rebuild with OQ): no lexicon card takes its first attestation from a flagged OCR witness', () => {
    const p = fileURLToPath(new URL('../public/data/corpus.json', import.meta.url)); if (!existsSync(p) || !hasData()) return
    const flagged = new Set((JSON.parse(readFileSync(p, 'utf8')) as { witnesses: { id: string; oq?: unknown }[] }).witnesses.filter(w => w.oq).map(w => w.id))
    if (!flagged.size) return   // data built before OQ
    for (const c of readFull()) if (c.first.value !== 'unknown') expect(flagged.has(c.first.value.witness), c.lemma).toBe(false)
  })
})

describe('MM-9 «Псіхіческе в анотаторі не розпізнано психічне.png» (owner: «MM9 це суржик»): contact label on the FORM, Russian form = variant', () => {
  const lex = () => { const l = emptyLex(); l.paradigmMap.set('психічне', [H('психічний', 'adj:n:v_naz:compb')]); l.paradigmMap.set('психічний', [H('психічний', 'adj:m:v_naz:compb')]); return l }
  const look = (w: string) => lex().paradigmMap.get(key(w)) ?? []
  it('the surzhyk pattern -ическ-/-ічеськ- resolves to the VESUM -ічн- form with a cited basis; the Russian form is a reconstructed VARIANT, not a source', () => {
    const c = contactCorr('Псіхіческе', look)!
    expect(c.standard).toBe('психічне'); expect(c.ruVariant).toBe('психическое'); expect(c.evidence[0]!.quote).toContain('-ичн-'); expect(c.evidence.some(x => x.kind === 'D' && x.quote.includes('психічний'))).toBe(true)
    expect(Object.keys(c)).not.toContain('source')
    expect(contactCorr('психічне', look)).toBeUndefined()   // the standard form is not a contact form
    expect(contactCorr('Псіхіческе', () => [])).toBeUndefined()   // no VESUM counterpart, no link (no cite, no rule)
  })
  it('the detector labels the form «контактне / суржик» (axis contact) through the same function', () => {
    const a = runDetectors('Псіхіческе', lex())
    expect(Object.keys(a.claims)).toContain('russianism_morph'); expect(a.claims['russianism_morph']!.method).toContain('MOR-ICHESK'); expect(strongest(a.claims)).toBe('contact'); expect(categoryOf('russianism_morph')).toBe('contact')
    expect(runDetectors('психічне', lex()).claims['russianism_morph']).toBeUndefined()
  })
  it('the annotator: the token carries the chip and the literary counterpart (not «unknown, 0 % linked»)', () => {
    const data = { ...lex(), search: { map: new Map() }, cards: new Map() } as unknown as AnnotateData
    const t = annotate('Псіхіческе', data)[0]!
    expect(t.mark).toBe('contact'); expect(t.contact!.standard).toBe('психічне'); expect(t.contact!.ruVariant).toBe('психическое')
  })
  it('rule 2: no contact chip on the lemma card; the form sub-card shows it; a token of the standard form does not inherit the lemma aggregate', () => {
    const sz = claim(true as const, [{ source: 'ENC', locator: 'l', quote: 'суржик', kind: 'Q' }], { score: 0.6 })
    const card = { lemma: 'психічний', pos: 'прикметник', paradigm: [], forms: [{ raw: 'психічне', norm: 'психічне', modern: 'психічне', claims: {}, hints: [] }, { raw: 'псіхіческе', norm: 'псіхіческе', modern: 'психічне', claims: { russianism_morph: sz }, hints: [] }],
      first: unknown(), claims: { register: unknown(), surzhyk: sz, dialect: {}, origin: unknown(), oldest: unknown() }, stats: { f: 1, ipm: 0, hk: 0, dots: 0 } } as unknown as CoreCard
    expect(Object.keys(lemmaChipKeys(card.claims, 0))).not.toContain('surzhyk'); expect(Object.values(lemmaChipKeys(card.claims, 0)).some(Boolean)).toBe(false)
    expect(Object.keys(formContactClaims(card.forms[1]))).toEqual(['russianism_morph']); expect(formContactClaims(card.forms[0])).toEqual({})
    const data = { ...emptyLex(), search: { map: new Map([['психічне', [{ lemma: 'психічний', via: 'form' }]]]) }, cards: new Map([['психічний', card]]) } as unknown as AnnotateData
    const t = annotate('психічне', data)[0]!
    expect(t.claims['surzhyk']).toBeUndefined(); expect(t.mark).toBeUndefined()
  })
  it('the UI never calls a Russian form «джерело»; it says «російський варіант»; the lemma views draw no суржик chip', () => {
    const rd = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
    expect(rd('../src/components/WordCard.vue')).toContain('російський варіант'); expect(rd('../src/components/WordCard.vue')).not.toMatch(/форма-джерело|російське джерело|джерело:/)
    expect(rd('../src/views/WordView.vue')).not.toMatch(/text="суржик"|push\('суржик'\)/)
    expect(rd('../src/views/FormView.vue')).toContain('контактне / суржик')
  })
})

describe('MM-10 «термінольоґія не зведено до термінологія.png»: every VESUM :alt lemma is linked to its standard lemma', () => {
  const heads = new Map<string, readonly [string, string]>([
    ['термінольоґія', ['термінольоґія', 'noun:inanim:f:v_naz:alt']], ['термінологія', ['термінологія', 'noun:inanim:f:v_naz']],
    ['аванґард', ['аванґард', 'noun:inanim:m:v_naz:alt']], ['авангард', ['Авангард', 'noun:inanim:m:v_naz:prop:geo | noun:inanim:m:v_naz']],
    ['ляндшафт', ['ляндшафт', 'noun:inanim:m:v_naz:alt']], ['ландшафт', ['ландшафт', 'noun:inanim:m:v_naz']],
    ['іграти', ['іграти', 'verb:imperf:inf:alt']], ['кляса', ['кляса', 'noun:inanim:f:v_naz:alt']],   // кляса → класа: no such lemma → not linked
  ])
  const m = altStandardMap(heads)
  it('the map: ґ > г and льо > ло (Харківський правопис 1928, § 55 / § 54) find the standard lemma; ля > ла too; no standard lemma, no link', () => {
    expect(m.get('термінольоґія')).toMatchObject({ std: 'термінологія', trace: ['ORTH-1928-G', 'ORTH-1928-LYO'] })
    expect(m.get('аванґард')!.std).toBe('авангард'); expect(m.get('ляндшафт')!.std).toBe('ландшафт')
    expect(m.has('кляса')).toBe(false); expect(m.has('іграти')).toBe(false)
  })
  it('both folds carry a verbatim 1928 quote and branch (VESUM decides); they are also offered to Желехівка witnesses', () => {
    for (const id of ['ORTH-1928-G', 'ORTH-1928-LYO', 'ORTH-1928-SOFTL']) { const f = foldById[id]!; expect(f.branch).toBe(true); expect(f.cite.kind).toBe('Q'); expect(f.cite.quote.length).toBeGreaterThan(20); expect(f.cite.locator).toContain('Харківський_правопис'); expect(f.era).toContain('1928') }
    expect(foldById['ORTH-1928-G']!.era).toContain('желехівка'); expect(foldById['ORTH-1928-SOFTL']!.era).not.toContain('желехівка')   // ля > ла would offer лубовою for любовою (GZ-2)
    expect(foldRaw('термінольоґія', 'желехівка').map(c => c.form)).toContain('термінологія')
    expect(foldRaw('термінольоґія', 'кулішівка').map(c => c.form)).toEqual(['термінольоґія'])   // not offered to other eras
  })
  it('linking: a token whose only VESUM line is the :alt lemma goes to the standard lemma card, tier 0, with the fold ids in its trace and the alt lemma recorded', () => {
    const e = E({ термінольоґії: [H('термінольоґія', 'noun:inanim:f:v_rod:alt')] }, { altStd: m })
    const r = linkOptions(T({ lang: 'uk', oldI: false, raw: 'термінольоґії', orth: 'желехівка' }), e)!
    const c = chooseLemma(r.opts, new Map())!
    expect(c.lemma).toBe('термінологія'); expect(c.tier).toBe(0); expect(c.altOf).toBe('термінольоґія'); expect(c.hit.tags).not.toContain('alt'); expect(c.cand.trace).toEqual(['ORTH-1928-G', 'ORTH-1928-LYO']); expect(c.cand.form).toBe('термінології')
    const e0 = E({ термінольоґії: [H('термінольоґія', 'noun:inanim:f:v_rod:alt')] })   // without the map: the old behaviour (own alt card)
    expect(chooseLemma(linkOptions(T({ lang: 'uk', oldI: false, raw: 'термінольоґії', orth: 'желехівка' }), e0)!.opts, new Map())!.lemma).toBe('термінольоґія')
    void remapAlt
  })
  it('real VESUM (skips without the file): VESUM stores no pointer; ≥ 400 alt lemmas are linked, among them термінольоґія → термінологія', async () => {
    const { VESUM_TXT, vesumLemmaList } = await import('../pipelines/vesum.ts')
    if (!existsSync(VESUM_TXT)) return
    const real = altStandardMap(await vesumLemmaList())
    expect(real.size).toBeGreaterThanOrEqual(400); expect(real.get('термінольоґія')!.std).toBe('термінологія')
    for (const l of real.values()) expect(l.std).not.toBe(l.alt)
  }, 180000)
})

describe('B-3.4 / OQ: per-spelling dates skip gated OCR', () => {
  const G: [number, number] = [1798, 1798], V: [number, number] = [1850, 1850], V2: [number, number] = [1900, 1900]
  it('fixture: a spelling dated only by a gated witness stays ocrOnly; its OCR date never beats a vetted one', async () => {
    const { spellingDateStep } = await import('../core/ocr-quality.ts')
    // replay the build: state starts from the FIRST token (build.ts creates the form with ocrDate = excluded)
    const run = (toks: Array<{ date: [number, number]; exc: boolean }>) => {
      const st = { date: toks[0]!.date, ocrDate: toks[0]!.exc }
      for (const t of toks.slice(1)) { const a = spellingDateStep(st, t, t.exc); if (a) { st.date = t.date; if (a === 'take') st.ocrDate = false } }
      return st
    }
    expect(run([{ date: G, exc: true }])).toEqual({ date: G, ocrDate: true })                               // gated only → flagged, never an attestation
    expect(run([{ date: G, exc: true }, { date: [1700, 1700], exc: true }]).ocrDate).toBe(true)              // still OCR-only
    const mixed = run([{ date: G, exc: true }, { date: V, exc: false }])                                    // a LATER vetted witness replaces the gated date
    expect(mixed).toEqual({ date: V, ocrDate: false })
    expect(run([{ date: V, exc: false }, { date: [1700, 1700], exc: true }])).toEqual({ date: V, ocrDate: false })   // a gated witness never lowers a vetted date
    expect(run([{ date: V2, exc: false }, { date: V, exc: false }])).toEqual({ date: V, ocrDate: false })
  })
  it('selectForms never ranks an ocrOnly spelling as the oldest', () => {
    const forms = [{ raw: 'a', f: 1, date: G, ocrOnly: true as const }, { raw: 'b', f: 5, date: V }, { raw: 'c', f: 2, date: V2 }]
    expect(selectForms(forms, 1)[0]!.raw).toBe('b')
  })
})

// ───────────────────────── MM-11 … MM-16 (owner screenshots 2026-10-22; specs/mismatches.md) ─────────────────────────
import { indexLines, ikDoublet } from '../pipelines/vesum.ts'
import { withoutFormOf, buildEtymology } from '../core/etymology.ts'
import { ETYMON_VOWEL } from '../pipelines/build-link.ts'
import { featureChips } from '../core/feature-chips.ts'
import { ZHEL_FOLDS } from '../core/zhel-folds.ts'
import { variantFor } from '../core/correspondences.ts'

/** the real VESUM v6.8.6 blocks of «легеня» (lungs) and «легінь» (young man), cut to the cells that matter */
const VESUM_LEGEN = [
  'легеня noun:inanim:f:v_naz', '  легені noun:inanim:f:v_rod', '  легені noun:inanim:p:v_naz', '  легенів noun:inanim:p:v_rod', '  легень noun:inanim:p:v_rod', '  легенях noun:inanim:p:v_mis',
  'легінь noun:anim:m:v_naz', '  легеня noun:anim:m:v_rod', '  легіня noun:anim:m:v_rod', '  легені noun:anim:p:v_naz', '  легіні noun:anim:p:v_naz', '  легенів noun:anim:p:v_rod', '  легінів noun:anim:p:v_rod',
  '  легенях noun:anim:p:v_mis', '  легінях noun:anim:p:v_mis',
]
describe('MM-11 «легінь злито з легені легенів і немає діалектного лигінь.png»: the lungs forms never land on легінь', () => {
  const forms = new Set(['легінь', 'легені', 'легенів', 'легенях', 'легіні', 'легінів', 'легеня'])
  it('VESUM lists легені / легенів under BOTH lemmas; in легінь they are the е-variant of a doublet cell (легіні ~ легені), marked ik', async () => {
    const { hits } = await indexLines(VESUM_LEGEN, forms, new Set())
    const h = hits.get('легені')!
    expect([...new Set(h.map(x => x.lemma))].sort()).toEqual(['легеня', 'легінь'])
    expect(h.filter(x => x.lemma === 'легінь').every(x => x.ik === 1)).toBe(true)
    expect(h.filter(x => x.lemma === 'легеня').every(x => !x.ik)).toBe(true)
    expect(hits.get('легіні')![0]!.ik).toBeUndefined(); expect(hits.get('легінь')![0]!.ik).toBeUndefined()
    expect(ikDoublet('легені', 'легіні')).toBe('легені'); expect(ikDoublet('легіні', 'легені')).toBe('легені'); expect(ikDoublet('легені', 'легенів')).toBeNull()
  })
  it('the linker: легені / легенів / легенях go to легеня (the lungs), легіні / легінів / легінь stay on легінь; легінь stays an alternative of the ambiguous plural', async () => {
    const { hits } = await indexLines(VESUM_LEGEN, forms, new Set())
    const e = { hits, derive: (s: string, oldI: boolean) => deriveRaw(s, { oldI }), fold: (s: string, o?: string) => foldRaw(s, o) } as Env
    // before MM-11 the frequency class decided for легінь (its unique forms are frequent, the lungs plural is only ever ambiguous)
    const freq = new Map([['легінь', 5000], ['легеня', 3]])
    for (const raw of ['легені', 'легенів', 'легенях']) { const r = linkOptions(T({ raw, lang: 'uk', oldI: false }), e)!, c = chooseLemma(r.opts, freq)!; expect(c.lemma, raw).toBe('легеня'); expect(c.alternatives, raw).toContain('легінь') }
    for (const raw of ['легінь', 'легіні', 'легінів']) expect(chooseLemma(linkOptions(T({ raw, lang: 'uk', oldI: false }), e)!.opts, freq)!.lemma, raw).toBe('легінь')
  })
  it('real data (after a rebuild with MM-11; skips without shards): the легінь card lists no lungs spelling', () => {
    if (!hasData()) return
    const gen = (JSON.parse(readFileSync(fileURLToPath(new URL('../public/data/corpus.json', import.meta.url)), 'utf8')) as { generated: string }).generated
    if (gen < '2026-10-23') return   // data built before MM-11
    const c = readFull().find(x => x.lemma === 'легінь'); if (!c) return
    for (const raw of ['легені', 'легенів', 'легенях', 'легеням', 'легенями']) expect(c.forms.map(f => f.raw), raw).not.toContain(raw)
  })
  it('the Hutsul variant лигінь / лиґінь links to легінь: attested in the corpus (Етноґрафічний збірник т. 19, «Ішов лиґінь до дівчини»); no dictionary line found', () => {
    for (const w of ['лигінь', 'лиґінь']) { const v = variantFor(w)!; expect(v.modern).toBe('легінь'); expect(v.quote).toContain('Ішов лиґінь до дівчини'); expect(v.url).toContain('archive.org/details/etnohr_19') }
  })
})

describe('MM-12 «легінь етимологія See the etymology of the corresponding lemma form замість етимології.png»: a kaikki form-of pointer is not an etymology', () => {
  const P = 'See the etymology of the corresponding lemma form.'
  it('a pointer-only entry has no etymology of its own (the row is hidden); the card keeps only what else exists', () => {
    expect(withoutFormOf({ text: P })).toBeUndefined()
    expect(buildEtymology('легінь', { text: P }, undefined, [], undefined, '2026-10-03')).toBeUndefined()
    const e = buildEtymology('легінь', { text: P }, 'псл. *x', [], undefined, '2026-10-03')!
    expect(e.text).toBe(''); expect(e.sources).toHaveLength(1)
    expect(JSON.stringify(e)).not.toContain('corresponding lemma form')
  })
  it('a pointer followed by a real sentence keeps the sentence', () => {
    expect(withoutFormOf({ text: P + ' By surface analysis, сиді́ти (sydíty) + -я́чий (-jáčyj).' })!.text).toBe('By surface analysis, сиді́ти (sydíty) + -я́чий (-jáčyj).')
    expect(withoutFormOf({ text: 'See the etymology of the corresponding lemma form..' })).toBeUndefined()
    const real = { text: 'Inherited from Proto-Slavic *mě̀sto.' }; expect(withoutFormOf(real)).toBe(real)
  })
})

describe('MM-13 «зі перша фіксація 1092 з невичитаного OCR.png»: the 1092 OCR witness is gated', () => {
  it('OQ score of hv_ia_arch1092 as built (14 837 tokens, 8 186 linked, 5 683 hapax types) is below the pre-1800 threshold and a proofread edition exists → excluded', () => {
    const r = ocrQuality({ id: 'hv_ia_arch1092', witnessType: 'ocr', date: [1092, 1092] }, { tokens: 14837, linked: 8186, hapaxTypes: 5683 }, new Set(['arch']))
    expect(r.score).toBeLessThan(0.45); expect(r.excluded).toBe(true)
  })
  it('real data (skips without shards): зі has no first attestation from the 1092 OCR witness; the first is a vetted witness', () => {
    if (!hasData()) return
    const c = readFull().find(x => x.lemma === 'зі'); if (!c || c.first.value === 'unknown') return
    expect(c.first.value.witness).not.toBe('hv_ia_arch1092'); expect(c.first.value.date[0]).toBeGreaterThan(1092)
  })
})

describe('MM-14 «між написання можь 1200-1292 мабуть не між.png»: о > і never produces між', () => {
  const e14 = E({ між: [H('між', 'prep:rv_rod:rv_zna:rv_oru')], межа: [H('межа', 'noun:inanim:f:v_naz')], мож: [H('мож', 'noun:inanim:m:v_naz')] })
  it('можь (GVL s.a. 6766) reaches no між; межь and the finished spelling do; ЕСУМ «між»: *medja «межа» (е)', () => {
    const r = (raw: string, o: Partial<TypeCtx> = {}) => { const x = linkOptions(T({ raw, ...o }), e14); return x ? chooseLemma(x.opts, new Map())?.lemma : undefined }
    expect(r('можь')).not.toBe('між'); expect(r('межь')).toBe('між'); expect(r('між', { lang: 'uk', oldI: false })).toBe('між')
    expect(ETYMON_VOWEL['між']!.vowel).toBe('е'); expect(ETYMON_VOWEL['між']!.quote).toContain('*medja «межа»')
  })
  it('мижъ (Котляревський 1798) is unaffected: no о in the spelling', () => {
    const x = linkOptions(T({ raw: 'мижъ', lang: 'uk', orth: 'ярижка', oldI: false }), e14)
    expect(x && chooseLemma(x.opts, new Map())?.lemma).toBe('між')
  })
})

describe('MM-15 «да прив’язано до леми ДА великими літерами.png»: a lower-case token never links to an all-caps abbreviation lemma', () => {
  it('lower-case «да» → the particle lemma да (VESUM «да part:bad»), not «ДА» (Державний архів); the capitals form keeps both', () => {
    const c = linkE(env, T({ raw: 'да', lang: 'uk', oldI: false }))!
    expect(c.lemma).toBe('да'); expect(c.cls).not.toBe('noun')
    const r = linkOptions(T({ raw: 'ДА', lang: 'uk', oldI: false }), env)!
    expect(r.opts.some(o => o.lemma === 'ДА')).toBe(true)
  })
  it('an abbreviation stays when it is the only reading', () => {
    const e = { ...env, hits: new Map([[key('дк'), [H('ДК', 'noun:inanim:m:v_naz:nv:abbr')]]]) } as Env
    expect(linkE(e, T({ raw: 'дк', lang: 'uk', oldI: false }))?.lemma).toBe('ДК')
  })
})

describe('MM-16 «діалектна форма.png» (засьпіваєш у Грінченка, Львів 1893): сь before a labial and initial и- are the EDITION orthography, not the author’s dialect', () => {
  const GRIN = { orth: 'желехівка', edition: 'Львів 1893, Наукове товариство ім. Шевченка (псевдонім Василь Чайченко)', authorRegion: 'Слобожанщина', witnessRegion: 'Слобожанщина', year: 1893 }
  it('the Желехівка fold takes ь off before ANY hard labial (Wikipedia «перед [ʋ] і взагалі будь-якою твердою губною»): засьпіваєш → заспіваєш, сьпіви → співи, сьміється, сьвіт', () => {
    const f = ZHEL_FOLDS.find(x => x.id === 'ORTH-ZHEL-SOFT')!
    for (const [a, b] of [['засьпіваєш', 'заспіваєш'], ['сьпіви', 'співи'], ['засьміється', 'засміється'], ['сьвіт', 'світ']] as [string, string][]) expect(f.apply(a)).toBe(b)
    expect(f.cite.quote).toContain('взагалі будь-якою твердою губною')
    expect(foldRaw('засьпіваєш', 'желехівка').map(c => c.form)).toContain('заспіваєш')
  })
  it('инший / инші → інший by ORTH-ZHEL-INIT-I (Wikipedia «буква и на початку слова читалась як [і]»)', () => {
    expect(foldRaw('инший', 'желехівка').map(c => c.form)).toContain('інший'); expect(foldRaw('инші', 'желехівка').map(c => c.form)).toContain('інші')
  })
  it('chip for Грінченко 1893: edition orthography, «не діалект автора»; for a Galician-authored witness: «галицька вимова»', () => {
    const a = featureChips(['ORTH-ZHEL-SOFT'], GRIN)[0]!
    expect(a.qualifier).toBe('edition'); expect(a.text).toContain('не діалект автора'); expect(a.text).toContain('Львів 1893'); expect(a.text).toContain('передана желехівкою'); expect(a.cite.quote).toContain('твердою губною')
    const g = featureChips(['ORTH-ZHEL-SOFT'], { ...GRIN, authorRegion: 'Галичина' })[0]!
    expect(g.qualifier).toBe('galician'); expect(g.text).toContain('галицька вимова'); expect(g.text).not.toContain('не діалект')
  })
  it('chip for инший: Lviv-printed Грінченко «давніша / галицька форма … не діалект автора»; Galician author «галицька форма»; an older non-Желехівка text «давніша форма»', () => {
    expect(featureChips(['ORTH-ZHEL-INIT-I'], GRIN)[0]!.text).toMatch(/^давніша \/ галицька форма .*не діалект автора/)
    expect(featureChips(['ORTH-ZHEL-INIT-I'], { ...GRIN, authorRegion: 'Галичина' })[0]!.text).toBe('галицька форма')
    const old = featureChips(['ORTH-ZHEL-INIT-I'], { orth: 'ярижка', authorRegion: 'Київ', year: 1650 })[0]!
    expect(old.qualifier).toBe('older'); expect(old.text).toBe('давніша форма')
  })
  it('no chip without a cited rule; the contact-label rule is untouched (the lemma header never carries a contact chip)', () => {
    expect(featureChips(['R10', 'NOPE'], GRIN)).toEqual([])
    expect(lemmaChipKeys({ origin: unknown(), register: unknown() } as never, 0)).toEqual({ origin: false, register: false, dialect: false })
  })
})

describe('MM-16c «я не бачу аби фіксувалася галицька риса бажання -> бажанє»: -нє / -тє / -лє link to -ння / -ття / -лля by the cited Желехівка fold and carry a chip', () => {
  it('бажанє / житє / знанє / весілє / зілє → бажання / життя / знання / весілля / зілля (ORTH-ZHEL-JE, quote «писано закінчення є відповідно до наддніпрянського я: зїлє, житє, знанє»)', () => {
    for (const [a, b] of [['бажанє', 'бажання'], ['знанє', 'знання'], ['житє', 'життя'], ['весілє', 'весілля'], ['зілє', 'зілля']] as [string, string][]) expect(foldRaw(a, 'желехівка').map(c => c.form), a).toContain(b)
    expect(ZHEL_FOLDS.find(x => x.id === 'ORTH-ZHEL-JE')!.cite.quote).toContain('відповідно до наддніпрянського я')
  })
  it('the chip: edition spelling for a non-Galician author, Galician spelling for a Galician author; no dialect group is claimed (no source states one)', () => {
    const a = featureChips(['ORTH-ZHEL-JE'], { orth: 'желехівка', edition: 'Львів 1893, НТШ', authorRegion: 'Слобожанщина' })[0]!
    expect(a.qualifier).toBe('edition'); expect(a.text).toContain('не діалект автора'); expect(a.dialect).toBeUndefined()
    expect(featureChips(['ORTH-ZHEL-JE'], { orth: 'желехівка', authorRegion: 'Галичина' })[0]!.qualifier).toBe('galician')
  })
})

describe('MM-17 «Ꙗрославъ має бути пов’язано з Ярослав альтернативне написання.jpg»: the Kyiv Chronicle’s Cyrillic ӕ (U+04D5) is the iotated a (N07), so the name cards link to the modern name', () => {
  const e17 = E({ ярослав: [H('Ярослав', 'noun:anim:m:v_naz:prop:fname'), H('Ярослав', 'noun:inanim:m:v_naz:prop:geo')], як: [H('як', 'adv')], яко: [H('яко', 'conj:subord')] })
  it('ӕрославъ / Ӕрослава / ꙗрославъ derive to ярослав; a common word (ꙗко, ӕко) to яко by the same fold', () => {
    for (const raw of ['ӕрославъ', 'Ӕрославъ', 'ꙗрославъ', 'Ꙗрославъ', 'Ӕрослава']) expect(deriveRaw(raw, { oldI: true }).candidates.map(c => c.form).some(f => f.startsWith('ярослав')), raw).toBe(true)
    for (const raw of ['ꙗко', 'ӕко']) expect(deriveRaw(raw, { oldI: true }).candidates.map(c => c.form), raw).toContain('яко')
  })
  it('the name card: the Stanza lemma Ӕрославъ (PROPN gate) links to the VESUM proper name Ярослав (this is what fills «сучасна форма»)', () => {
    const r = linkOptions(T({ raw: 'Ӕрославъ', stanza: 'Ӕрославъ', gate: 'U:PROPN' }), e17)
    expect(r && r.opts.some(o => o.lemma === 'Ярослав' && /:prop\b/.test(o.hit.tags))).toBe(true)
  })
})

describe('MM-16c real case «бажанєм» (71 tokens, Франко 1893 / 1902 / 1906, Львів, Желехівка): the oblique -єм links to бажання', () => {
  it('бажанєм → бажанням, бажанєми → бажаннями, знанєх → знаннях by ORTH-ZHEL-JE-OBL (a branching fold: VESUM decides)', () => {
    for (const [a, b] of [['бажанєм', 'бажанням'], ['бажанєми', 'бажаннями'], ['знанєх', 'знаннях']] as [string, string][]) expect(foldRaw(a, 'желехівка').map(c => c.form), a).toContain(b)
    expect(foldRaw('бажанєм', 'желехівка').some(c => c.trace.includes('ORTH-ZHEL-JE-OBL'))).toBe(true)
  })
  it('the token links to бажання through the lemma бажання (VESUM бажання noun:inanim:p:v_oru?) and carries the Galician chip for Франко', () => {
    const e = E({ бажанням: [H('бажання', 'noun:inanim:n:v_oru')] }), r = linkOptions(T({ raw: 'бажанєм', lang: 'uk', oldI: false, orth: 'желехівка' }), e)
    expect(r && chooseLemma(r.opts, new Map())?.lemma).toBe('бажання')
    expect(featureChips(['ORTH-ZHEL-JE-OBL'], { orth: 'желехівка', authorRegion: 'Галичина', edition: 'Львів 1893' })[0]!.qualifier).toBe('galician')
  })
})

// ───────────────────────── MM-18 … MM-21 (owner remarks 2026-10-22; sources: the owner's OCR of Огоновський 1889, Смаль-Стоцький 1892 / 1914) ─────────────────────────
import { withGal, toIish, toUvati, splitHyphenParticle, GAL_FOLDS } from '../core/gal-folds.ts'

const Eg = (t: Record<string, VesumHit[]>): Env => E(t, {
  derive: (s, oldI) => { const d = withSoftAdj(deriveRaw(s, { oldI })); return { ...d, candidates: withGal(d.candidates) } },
  fold: (s, o) => withGal(foldRaw(s, o)),
})
const linkG = (e: Env, t: Partial<TypeCtx>) => { const r = linkOptions(T({ lang: 'uk', oldI: false, ...t }), e); return r ? chooseLemma(r.opts, new Map()) : undefined }

describe('MM-18 «скорійше не прив’язано до скоріше»: -ійш- → -іш- (Смаль-Стоцький 1914 §§ 62–63: «-ший, -ї(й)ший, -іщий»)', () => {
  const e = Eg({ скоріше: [H('скоро', 'adv:compr')], новіший: [H('новий', 'adj:m:v_naz:compr')], найсвятіша: [H('святий', 'adj:f:v_naz:superl')] })
  it('скорійше → скоріше, новійший → новіший, найсвятійша → найсвятіша: one extra branch, the cited fold id in the trace; VESUM decides', () => {
    expect(toIish('скорійше')).toBe('скоріше'); expect(toIish('новійший')).toBe('новіший'); expect(toIish('новий')).toBe('новий')
    const c = linkG(e, { raw: 'скорійше' })!; expect(c.lemma).toBe('скоро'); expect(c.cand.trace).toContain('ORTH-ADJ-IISH'); expect(c.cand.branches).toBe(1)
    expect(linkG(e, { raw: 'новійший' })!.lemma).toBe('новий'); expect(linkG(e, { raw: 'найсвятійша' })!.lemma).toBe('святий')
    expect(GAL_FOLDS.find(f => f.id === 'ORTH-ADJ-IISH')!.cite.quote).toContain('-ї(й)ший')
  })
  it('a word VESUM lists as spelled keeps its plain link (no fold is needed)', () => { expect(linkG(Eg({ скорійше: [H('скорійше', 'adv')], скоріше: [H('скоро', 'adv:compr')] }), { raw: 'скорійше' })!.lemma).toBe('скорійше') })
  it('real data (after a rebuild with MM-18; skips without shards): the скоро card lists скорійше', () => {
    if (!hasData()) return
    const gen = (JSON.parse(readFileSync(fileURLToPath(new URL('../public/data/corpus.json', import.meta.url)), 'utf8')) as { generated: string }).generated
    if (gen < '2026-10-23') return
    const c = readFull().find(x => x.lemma === 'скоро'); if (!c) return
    expect(c.forms.map(f => f.raw.toLowerCase())).toContain('скорійше')
  })
})

describe('MM-19 «шановати теж має вести на шанувати»: -ова-ти → -ува-ти (Огоновський 1889 § 38: «-ува-ти замість -ова-ти»; Смаль-Стоцький 1892: «купувати (не: куповати)»)', () => {
  const e = Eg({ шанувати: [H('шанувати', 'verb:imperf:inf')], арендували: [H('арендувати', 'verb:imperf:past:p')], ночовати: [H('ночовати', 'verb:imperf:inf')], ночувати: [H('ночувати', 'verb:imperf:inf')] })
  it('шановати → шанувати, арендовали → арендували (the cited fold, one branch); the cause is the present stem (Огоновський), not окання', () => {
    expect(toUvati('шановати')).toBe('шанувати'); expect(toUvati('арендовав')).toBe('арендував'); expect(toUvati('шанувати')).toBe('шанувати')
    const c = linkG(e, { raw: 'шановати' })!; expect(c.lemma).toBe('шанувати'); expect(c.cand.trace).toContain('ORTH-VERB-OVATI')
    expect(linkG(e, { raw: 'арендовали' })!.lemma).toBe('арендувати')
    expect(GAL_FOLDS.find(f => f.id === 'ORTH-VERB-OVATI')!.cite.quote).toContain('замість -ова-ти')
  })
  it('both forms in VESUM (ночовати ~ ночувати, Огоновський p. 39): the plain spelling wins the tie', () => { expect(linkG(e, { raw: 'ночовати' })!.lemma).toBe('ночовати') })
})

describe('MM-20 «Прийми-ж теж має вести до приймати»: a hyphenated clitic particle is split off; VESUM decides first', () => {
  const e = Eg({ прийми: [H('прийняти', 'verb:perf:impr:s:2')], було: [H('бути', 'verb:imperf:past:n')], 'будь-хто': [H('будь-хто', 'noun:anim:m:v_naz:pron:def')] })
  it('Прийми-ж → прийняти (the imperative of the PERFECTIVE; the imperfective pair приймати is not the lemma), було-б → бути; the original token stays, the trace names the step', () => {
    expect(splitHyphenParticle('прийми-ж')).toEqual({ host: 'прийми', particle: 'ж' })
    const c = linkG(e, { raw: 'Прийми-ж' })!; expect(c.lemma).toBe('прийняти'); expect(c.cand.trace[0]).toBe('ORTH-PART-HYPH')
    expect(linkG(e, { raw: 'було-б' })!.lemma).toBe('бути')
  })
  it('будь-хто (a VESUM word) is not split; де-не-де has no particle tail', () => {
    expect(linkG(e, { raw: 'будь-хто' })!.lemma).toBe('будь-хто'); expect(splitHyphenParticle('де-не-де')).toBeUndefined()
    expect(GAL_FOLDS.find(f => f.id === 'ORTH-PART-HYPH')!.cite.quote).toContain('Пишемо завсїди окремо: би, же, но, ся, то')
  })
})

describe('MM-21 «ню прив’язалося лише до французького слова, але є й діалектне слово»: «ню» = вона (acc. after a preposition) in a Желехівка witness only', () => {
  const e = Eg({ ню: [H('ню', 'noun:inanim:n:v_naz:nv')], вона: [H('вона', 'noun:anim:f:v_naz:pron:pers:3')] })
  it('Желехівка witness: ню → вона (Огоновський 1889: «въ ню; при нѣй, до неи»); any other witness keeps the loan', () => {
    const a = linkG(e, { raw: 'ню', orth: 'желехівка' })!; expect(a.lemma).toBe('вона'); expect(a.cls).toBe('pron'); expect(a.corr!.row.quote).toContain('въ ню')
    expect(linkG(e, { raw: 'ню' })!.lemma).toBe('ню'); expect(linkG(e, { raw: 'ню', orth: 'ярижка' })!.lemma).toBe('ню')
  })
})

describe('MM-18…20 feature chips: Galician author → «галицька форма»; OCR edition of a non-Galician author → neutral, no dialect claimed', () => {
  it('chips carry the cited fold quote and the qualifier', () => {
    for (const rule of ['ORTH-ADJ-IISH', 'ORTH-VERB-OVATI', 'ORTH-PART-HYPH']) {
      const g = featureChips([rule], { authorRegion: 'Галичина' })[0]!, n = featureChips([rule], { authorRegion: 'Київ', year: 1900 })[0]!
      expect(g.qualifier, rule).toBe('galician'); expect(n.qualifier, rule).toBe('neutral'); expect(n.cite.quote.length).toBeGreaterThan(20); expect(n.dialect).toBeUndefined()
    }
    expect(featureChips(['ORTH-ADJ-IISH'], { orth: 'ярижка', authorRegion: 'Київ', year: 1650 })[0]!.text).toBe('давніша форма')
    expect(featureChips(['ORTH-ADJ-IISH'], { orth: 'желехівка', edition: 'Львів 1893, НТШ', authorRegion: 'Слобожанщина' })[0]!.text).toContain('не діалект автора')
  })
})

describe('MM-16/18/19/20 on the CLIENT (annotator and search): the same cited candidates resolve a spelling at query time, without waiting for build:data', () => {
  const mk = (lemma: string, forms: string[]) => ({ lemma, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [] }) as unknown as CoreCard
  const data = (pairs: [string, string][]) => ({ ...emptyLex(), search: { map: new Map(pairs.map(([k, l]) => [k, [{ lemma: l, form: k, via: 'paradigm' }]])), keys: [] }, cards: new Map(pairs.map(([, l]) => [l, mk(l, [])])) }) as unknown as AnnotateData
  it('annotating «скорійше» gives скоро (скоріше), with the cited rule in the trace and the feature id', () => {
    const t = annotate('скорійше', data([['скоріше', 'скоро']]))[0]!
    expect(t.lemma).toBe('скоро'); expect(t.provenance).toBe('derived'); expect(t.derivedFrom!.form).toBe('скоріше'); expect(t.derivedFrom!.trace.map(s => s.rule)).toEqual(['ORTH-ADJ-IISH']); expect(t.features).toEqual(['ORTH-ADJ-IISH'])
  })
  it('шановати → шанувати (MM-19), Прийми-ж → прийняти (MM-20, the annotator uses the same split as the build), засьпіваєш → заспівати (MM-16)', () => {
    expect(annotate('шановати', data([['шанувати', 'шанувати']]))[0]!.lemma).toBe('шанувати')
    const p = annotate('Прийми-ж', data([['прийми', 'прийняти']]))[0]!; expect(p.lemma).toBe('прийняти'); expect(p.features).toEqual(['ORTH-PART-HYPH'])
    expect(annotate('засьпіваєш', data([['заспіваєш', 'заспівати']]))[0]!.features).toEqual(['ORTH-ZHEL-SOFT'])
  })
  it('a spelling the lexicon knows is left alone (no feature, no derivation)', () => { const t = annotate('шановати', data([['шановати', 'шановати'], ['шанувати', 'шанувати']]))[0]!; expect(t.provenance).toBe('attested'); expect(t.features).toBeUndefined() })
  it('search: the query «скорійше» / «шановати» / «прийми-ж» carries the folded keys, so the lexicon entry is found at query time', async () => {
    const { queryKeys } = await import('../src/lib/search.ts')
    expect(queryKeys('скорійше')).toEqual(expect.arrayContaining(['скорійше', 'скоріше'])); expect(queryKeys('шановати')).toContain('шанувати'); expect(queryKeys('Прийми-ж')).toContain('прийми'); expect(queryKeys('вода')).toEqual(['вода'])
  })
  it('the text-view mark and the lemma-header chip: computed from the same rules; known spellings and standard lemmas get none', async () => {
    const { featureMarks } = await import('../src/lib/featureMarks.ts'), known = (s: Set<string>) => (k: string) => s.has(k)
    const m = featureMarks('засьпіваєш', { orth: 'желехівка', edition: 'Львів 1893, НТШ', authorRegion: 'Слобожанщина' }, known(new Set(['заспіваєш'])))
    expect(m.map(c => c.rule)).toEqual(['ORTH-ZHEL-SOFT']); expect(m[0]!.text).toContain('не діалект автора')
    expect(featureMarks('засьпіваєш', { orth: 'желехівка' }, known(new Set(['засьпіваєш', 'заспіваєш'])))).toEqual([])   // the spelling itself is known
    expect(featureMarks('засьпіваєш', { orth: 'ярижка' }, known(new Set(['заспіваєш'])))).toEqual([])   // not a Желехівка witness
    expect(featureMarks('інший', { orth: 'желехівка' }, known(new Set())).length).toBe(0)   // a standard lemma
    expect(featureMarks('инший', { orth: 'желехівка', authorRegion: 'Галичина' }, k => k === 'інший')[0]!.text).toBe('галицька форма')   // lemma-header chip of a feature lemma, Galician author
  })
})

describe('MM-22 «видова пара»: прийми → прийняти, whose aspect partner is приймати (en.wiktionary headword line)', () => {
  it('aspectOf reads «прийня́ти (pryjnjáty) pf (imperfective прийма́ти)», accents removed; the pair travels in the etymology entry', async () => {
    const { aspectOf, buildEtymology: be } = await import('../core/etymology.ts')
    expect(aspectOf(['прийня́ти (pryjnjáty) pf (imperfective прийма́ти)'])).toEqual({ asp: 'pf', partner: ['приймати'] })
    expect(aspectOf(['робити impf (perfective зробити, ...)'])?.asp).toBe('impf'); expect(aspectOf(['вода f'])).toBeUndefined()
    const e = be('прийняти', { text: '', aspect: { asp: 'pf', partner: ['приймати'] } }, undefined, [], undefined, '2026-10-03')!
    expect(e.aspect!.partner).toEqual(['приймати']); expect(e.sources).toEqual([])
  })
})
