/** MM-48/49 forward Galician respelling (cited ЕУМ rows) + the annotator reverse links + the paradigm per form. */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { respell, SPELL_RULES, spellCite } from '../core/respell.ts'
import { toIpa } from '../core/ipa.ts'
import { ctxOfTags } from '../src/lib/dialectView.ts'
import { setDialect, resetViews, ipaOf } from '../src/lib/views.ts'
import { unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import Paradigm from '../src/components/Paradigm.vue'
import { featurePairs } from '../core/word-rules.ts'

describe('forward rows', () => {
  it('GAL-A-SOFT (NDN um173, PKB um175): тяжко → тєжко, дякувати → дєкувати; POD keeps я (POD-A-KEPT); -яти / -ять are untouched', () => {
    expect(respell('тяжко', 'NDN').text).toBe('тєжко'); expect(respell('дякувати', 'PKB').text).toBe('дєкувати')
    expect(respell('дякувати', 'POD').text).toBe('дякувати')
    expect(respell('стріляти', 'NDN').text).toBe('стріляти'); expect(respell('носять', 'NDN', { pos: 'verb', fin3: true }).text).not.toContain('є')
    const r = SPELL_RULES.find(x => x.id === 'GAL-A-SOFT')!
    expect(spellCite(r, 'NDN')!.cite.locator).toContain('um173'); expect(spellCite(r, 'PKB')!.cite.quote).toContain('переходить в [е]')
  })
  it('SYAN-A-SOFT needs the stress (um174: only the stressed а)', () => {
    expect(respell('тяжко', 'SYAN').text).toBe('тяжко'); expect(respell('тяжко', 'SYAN', { positions: [1] }).text).toBe('тєжко')
  })
  it('GAL-3T-HARD (POD um180, NDN um173) only on a finite 3rd person: ходить → ходит, ходять → ходят, мають → мают; the infinitive and a bare lemma stay', () => {
    const fin = ctxOfTags('verb:imperf:pres:s:3'); expect(fin.fin3).toBe(true)
    expect(respell('ходить', 'NDN', fin).text).toBe('ходит'); expect(respell('ходять', 'POD', ctxOfTags('verb:imperf:pres:p:3')).text).toBe('ходят'); expect(respell('мають', 'POD', ctxOfTags('verb:imperf:pres:p:3')).text).toBe('мают')
    expect(respell('ходити', 'NDN', ctxOfTags('verb:imperf:inf')).text).toBe('ходити'); expect(respell('ходить', 'NDN', ctxOfTags('verb:imperf:inf:short')).text).toBe('ходить'); expect(respell('ходить', 'NDN', { pos: 'verb' }).text).toBe('ходить')
    expect(respell('ходить', 'PKB', fin).text).toBe('ходить')   // um175 has the DROPPED -т, a different feature: no rule
    const r = SPELL_RULES.find(x => x.id === 'GAL-3T-HARD')!
    expect(spellCite(r, 'NDN')!.cite.quote).toContain('з кінцевим т'); expect(spellCite(r, 'POD')!.cite.quote).toContain('твердість приголосного т')
  })
  it('IPA agrees with the spelling: the dialect IPA of the respelled word is read from the respelled letters', () => {
    expect(ipaOf('тяжко', 'NDN').ipa).toBe(toIpa('тєжко', null, 'NDN').ipa); expect(ipaOf('ходить', 'NDN', ctxOfTags('verb:imperf:pres:s:3')).ipa).toBe(toIpa('ходит', null, 'NDN').ipa)
  })
  it('сьвіт has NO forward dialect row (no ЕУМ / Wikipedia dialect statement: orthography switch only); the P folds (E-I, E-Y, REM, I-E) have no forward rule', () => {
    for (const c of ['NDN', 'PKB', 'POD', 'SYAN', 'WPL', 'HUT', 'BOY', 'LEM', 'ZAK']) expect(respell('світ', c).text, c).toBe('світ')
    expect(respell('папером', 'NDN').text).toBe('папером'); expect(respell('мусити', 'NDN', { pos: 'verb' }).text).toBe('мусити')
  })
})

const forms: Record<string, [string, string][]> = {
  тяжко: [['тяжко', 'adv']], ходить: [['ходити', 'verb:imperf:pres:s:3']], ходити: [['ходити', 'verb:imperf:inf']], мусить: [['мусити', 'verb:imperf:pres:s:3']],
  світ: [['світ', 'noun:inanim:m:v_naz']], папером: [['папір', 'noun:inanim:m:v_oru']], теж: [['теж', 'part']],
}
const mk = (): AnnotateData => {
  const lex = emptyLex(), map = new Map<string, { lemma: string; form: string; via: string }[]>(), lemmas = new Set<string>()
  for (const [f, hs] of Object.entries(forms)) {
    lex.paradigmMap.set(key(f), hs.map(([lemma, tags]) => ({ lemma, tags })))
    for (const [l] of hs) { lemmas.add(l); map.set(key(f), [...(map.get(key(f)) ?? []), { lemma: l, form: key(f), via: 'paradigm' }]) }
  }
  return { ...lex, search: { map, keys: [] }, cards: new Map([...lemmas].map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
describe('client annotator (MM-48..51 reverse folds, the build gate)', () => {
  const lemmaOf = (w: string) => annotate(w, mk(), 1900).find(t => t.key === w)!.lemma
  it('тєжко → тяжко, ходит → ходити, мусєт → мусити, сьвіт → світ, папіром → папір', () => {
    expect(lemmaOf('тєжко')).toBe('тяжко'); expect(lemmaOf('ходит')).toBe('ходити'); expect(lemmaOf('мусєт')).toBe('мусити'); expect(lemmaOf('сьвіт')).toBe('світ'); expect(lemmaOf('папіром')).toBe('папір')
  })
  it('the gate: a known word is not redirected; совіт (no verb совіть) stays unlinked', () => {
    expect(lemmaOf('ходить')).toBe('ходити'); expect(annotate('совіт', mk(), 1900)[0]!.card).toBeUndefined()
  })
  it('Аналіз слова (featurePairs) lists the cited pair', () => {
    const known = (k: string) => k in forms
    expect(featurePairs('тєжко', known).some(p => p.rule === 'ORTH-GAL-A-SOFT' && p.to === 'тяжко' && p.cite.kind === 'Q')).toBe(true)
    expect(featurePairs('ходит', known).some(p => p.rule === 'ORTH-GAL-3T' && p.to === 'ходить')).toBe(true)
    expect(featurePairs('папіром', known).find(p => p.rule === 'ORTH-GAL-I-E')!.cite.kind).toBe('P')
  })
})

const render = async (c: object, props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(c as never, props) }))
const txt = (s: string) => s.replace(/<[^>]+>/g, '')
describe('Paradigm.vue shows the respelled forms per form (Galician dialect switch)', () => {
  const par = [{ form: 'ходити', tags: 'verb:imperf:inf' }, { form: 'ходить', tags: 'verb:imperf:pres:s:3' }, { form: 'ходять', tags: 'verb:imperf:pres:p:3' }]
  it('NDN: ходить → ходит, ходять → ходят in the table, the infinitive unchanged; standard when no dialect', async () => {
    setDialect('NDN')
    try { const t = txt(await render(Paradigm, { paradigm: par })); expect(t).toContain('ходит'); expect(t).toContain('ходят'); expect(t).toContain('ходити') } finally { setDialect(''); resetViews() }
    const std = txt(await render(Paradigm, { paradigm: par })); expect(std).toContain('ходить'); expect(std).not.toMatch(/ходит(?![иь])/)
  })
  it('NDN: the header word дякувати is respelled дєкувати', () => {
    expect(respell('дякувати', 'NDN').text).toBe('дєкувати')
  })
})
