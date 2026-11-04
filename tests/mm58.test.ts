/**
 * MM-58 (owner: «на картках для дієслів коли переключаєш на діалекти де відділяється ся то так і пиши»; «смієт ся сміє ся / сє»; «сє до речі теж галицкий відповідник … вроді тернопільський»;
 * «в цілому ці всі варіанти можливі для галицького діалекту»): the mobile reflexive particle in the dialect view, both directions.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { respell, SPELL_RULES, spellCite } from '../core/respell.ts'
import { reflForms, reflJoins, REFL_RULES, SE_OWNER } from '../core/respell-refl.ts'
import { ctxOfTags } from '../src/lib/dialectView.ts'
import { ipaOf, show, setDialect, resetViews } from '../src/lib/views.ts'
import { unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import type { VesumHit } from '../core/types.ts'
import Spell from '../src/components/Spell.vue'
import Paradigm from '../src/components/Paradigm.vue'

const V = { pos: 'verb' as const }
const FIN = ctxOfTags('verb:imperf:pres:s:3')

describe('MM-58 forward: PKB (um175) and POD (um180) write the particle apart; every other dialect is unchanged', () => {
  it('боятися, боюся, сміятися under PKB: after the verb; under POD: before it', () => {
    expect(respell('боятися', 'PKB', V).text).toBe('бояти ся'); expect(respell('боюся', 'PKB', V).text).toBe('бою ся'); expect(respell('сміятися', 'PKB', V).text).toBe('сміяти ся')
    expect(respell('боятися', 'POD', V).text).toBe('ся бояти'); expect(respell('боюся', 'POD', V).text).toBe('ся бою'); expect(respell('сміятися', 'POD', V).text).toBe('ся сміяти')
    expect(respell('боявся', 'PKB', V).text).toBe('бояв ся')
  })
  it('unchanged: the normative view, a dialect with no statement (WPL, NDN, HUT), a non-verb, a verb without the postfix', () => {
    for (const c of ['NDN', 'WPL', 'HUT', 'SYAN', 'MDN']) expect(respell('боятися', c, V).text, c).toBe('боятися')
    expect(respell('боятися', 'PKB', { pos: 'noun' }).text).toBe('боятися'); expect(respell('боятися', 'PKB').text).toBe('боятися'); expect(respell('ходити', 'PKB', V).text).toBe('ходити')
    expect(show('боятися', '', '2019', V).text).toBe('боятися')
  })
  it('the cites are the ЕУМ quotes of the dialects', () => {
    const r = SPELL_RULES.find(x => x.id === 'GAL-REFL-SEP')!
    expect(spellCite(r, 'PKB')!.cite.quote).toContain('рухомої зворотної частки -ся як у постпозиції, так і в препозиції'); expect(spellCite(r, 'PKB')!.cite.quote).toContain('(с’а, са, си)')
    expect(spellCite(r, 'POD')!.cite.quote).toContain('препозитивне вживання (у західноподіл. говірках) частки ся'); expect(Object.keys(REFL_RULES)).toEqual(['PKB', 'POD'])
  })
  it('composes with the hard -т (POD um180): сміється → ся смієт; PKB (no hard -т statement) → смієть ся; the other t-forms are variants', () => {
    expect(respell('сміється', 'POD', FIN).text).toBe('ся смієт'); expect(respell('сміється', 'PKB', FIN).text).toBe('смієть ся')
    expect(reflForms('сміється', 'POD')!.main).toBe('ся смієт'); expect(reflForms('сміється', 'POD')!.variants.map(v => v.text)).toContain('ся сміє')
  })
  it('all four shapes смієт ся, сміє ся, смієт сє, сміє сє are listed as variants under every Galician dialect (main first; P «за свідченням носія» unless ЕУМ states it)', () => {
    for (const c of ['NDN', 'PKB', 'SYAN', 'HUT', 'BOY', 'LEM']) {
      const f = reflForms('сміється', c)!, t = f.variants.map(v => v.text)
      for (const s of ['смієт ся', 'сміє ся', 'смієт сє', 'сміє сє']) expect(t, c + ' ' + s).toContain(s)
      expect(f.variants.find(v => v.text === 'сміє сє')!.grade).toBe('P'); expect(f.variants.find(v => v.text === 'смієт сє')!.cite.some(e => e.quote.includes('сє'))).toBe(true)
    }
    expect(reflForms('сміється', 'NDN')!.main).toBe('сміється')   // NDN: no ЕУМ statement, the main form stays standard
    expect(reflForms('сміється', 'WPL')).toBeUndefined(); expect(reflForms('сміється', '')).toBeUndefined()
    expect(SE_OWNER.quote).toContain('вроді'); expect(SE_OWNER.kind).toBe('P'); expect(SE_OWNER.note).toContain('за свідченням носія')
    // PKB's cited shapes are Q: the other order and the clitic spellings си / са
    const pk = reflForms('боюся', 'PKB')!; expect(pk.variants.find(v => v.text === 'ся бою')!.grade).toBe('Q'); expect(pk.variants.find(v => v.text === 'бою си')!.grade).toBe('Q'); expect(pk.variants.find(v => v.text === 'бою сє')!.grade).toBe('P')
  })
  it('IPA agrees: the clitic is a separate word in the dialect IPA', () => {
    const ipa = ipaOf('боятися', 'PKB', V).ipa; expect(ipa).toContain(' '); expect(ipa.split(' ').length).toBe(2)
    expect(ipaOf('боятися', 'POD', V).ipa.split(' ').length).toBe(2); expect(ipaOf('боятися', 'NDN', V).ipa.split(' ').length).toBe(1)
  })
})

const render = async (c: object, props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(c as never, props) }))
const txt = (s: string) => s.replace(/<[^>]+>/g, '')
describe('MM-58 views: the header word, the variants and the «Форми» table', () => {
  it('Spell: the main form (with a space) and the listed variants; the standard word without a dialect', async () => {
    setDialect('PKB')
    try {
      const t = txt(await render(Spell, { w: 'боятися', ctx: V })); expect(t).toContain('бояти ся'); expect(t).toContain('також:'); expect(t).toContain('ся бояти')
      expect(await render(Spell, { w: 'боятися', ctx: V })).toContain('data-testid="sp-variants"')
    } finally { setDialect(''); resetViews() }
    expect(txt(await render(Spell, { w: 'боятися', ctx: V }))).toBe('боятися')
  })
  it('Paradigm cells: each finite form separates the particle (POD: ся боюся → ся бою, ся смієт)', async () => {
    const par = [{ form: 'боятися', tags: 'verb:imperf:inf' }, { form: 'боюся', tags: 'verb:imperf:pres:s:1' }, { form: 'сміється', tags: 'verb:imperf:pres:s:3' }]
    setDialect('POD')
    try { const t = txt(await render(Paradigm, { paradigm: par })); expect(t).toContain('ся бояти'); expect(t).toContain('ся бою'); expect(t).toContain('ся смієт') } finally { setDialect(''); resetViews() }
  })
})

// ── reverse ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const FORMS: Record<string, [string, string][]> = {
  сміється: [['сміятися', 'verb:imperf:pres:s:3']], сміятися: [['сміятися', 'verb:imperf:inf']], сміє: [['смі́ти', 'verb:imperf:pres:s:3']], боїться: [['боятися', 'verb:imperf:pres:s:3']], боятися: [['боятися', 'verb:imperf:inf']],
  боюся: [['боятися', 'verb:imperf:pres:s:1']], бою: [['бій', 'noun:inanim:m:v_zna']], боявся: [['боятися', 'verb:imperf:past:m']], ся: [['ся', 'part']],
}
const mk = (): AnnotateData => {
  const lex = emptyLex(), map = new Map<string, { lemma: string; form: string; via: string }[]>(), lemmas = new Set<string>()
  for (const [f, hs] of Object.entries(FORMS)) {
    lex.paradigmMap.set(key(f), hs.map(([lemma, tags]) => ({ lemma, tags })))
    for (const [l] of hs) { lemmas.add(l); map.set(key(f), [...(map.get(key(f)) ?? []), { lemma: l, form: key(f), via: 'paradigm' }]) }
  }
  return { ...lex, search: { map, keys: [] }, cards: new Map([...lemmas].map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const lemmas = (text: string) => annotate(text, mk(), 1900).map(t => t.lemma)
describe('MM-58 reverse: every shape reads back to the same reflexive verb (annotator and build link)', () => {
  it('reflJoins: смієт / смієть / сміє / бої + ся | сє → the VESUM spellings', () => {
    expect(reflJoins('смієт')).toContain('сміється'); expect(reflJoins('смієть')).toContain('сміється'); expect(reflJoins('сміє')).toContain('сміється'); expect(reflJoins('бою')).toContain('боюся'); expect(reflJoins('бої')).toContain('боїться')
  })
  it('annotator: all four shapes and the prepositive order → сміятися; боїт ся, боїть ся, бої сє → боятися; ся бою → боятися; бояв ся → боятися', () => {
    for (const s of ['смієт ся', 'сміє ся', 'смієт сє', 'сміє сє', 'смієть ся', 'ся сміє', 'сє смієт']) expect(lemmas(s).filter(Boolean), s).toContain('сміятися')
    for (const s of ['боїт ся', 'боїть ся', 'бої сє', 'ся бою', 'бою сє', 'бояв ся']) expect(lemmas(s).filter(Boolean), s).toContain('боятися')
  })
  it('standalone сє links to ся (a member of the same word), and so does ся + verb', () => {
    expect(lemmas('сє')).toEqual(['ся']); expect(lemmas('сміє сє')).toContain('ся')
  })
  it('the guard: a verb next to a particle that does not form a reflexive verb keeps its own reading; no particle, no join', () => {
    expect(lemmas('сміє')).toEqual(['смі́ти']); expect(lemmas('бою ся')[0]).toBe('боятися')
  })
  const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
  const hits = new Map<string, VesumHit[]>([['сміється', [H('сміятися', 'verb:imperf:pres:s:3')]], ['сміє', [H('смі́ти', 'verb:imperf:pres:s:3')]], ['боюся', [H('боятися', 'verb:imperf:pres:s:1')]]])
  const link = (raw: string) => {
    const e: Env = { hits, derive: (s, oldI) => deriveRaw(s, { oldI }), fold: (s, o) => foldRaw(s, o) }
    const r = linkOptions({ lang: 'uk', oldI: false, raw, refl: true } as TypeCtx, e); return r ? chooseLemma(r.opts, new Map()) : undefined
  }
  it('build linker (refl flag from either neighbour): смієт | сміє | смієть | бою + a particle → the reflexive lemma', () => {
    expect(link('смієт')?.lemma).toBe('сміятися'); expect(link('сміє')?.lemma).toBe('сміятися'); expect(link('смієть')?.lemma).toBe('сміятися'); expect(link('бою')?.lemma).toBe('боятися')
  })
})
