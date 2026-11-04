/** MM-56 (людях ~ людєх, locative plural -ох) and MM-57 (hard -ск- / -цк-: галицкий). */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { respell } from '../core/respell.ts'
import { toIpa } from '../core/ipa.ts'
import { withGal } from '../core/gal-folds.ts'
import { galSoftGate } from '../core/gal-soft.ts'
import { ipaOf, setDialect, resetViews } from '../src/lib/views.ts'
import { unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import Paradigm from '../src/components/Paradigm.vue'

const forms: Record<string, [string, string][]> = {
  людях: [['людина', 'noun:anim:p:v_mis']], людина: [['людина', 'noun:anim:f:v_naz']], конях: [['кінь', 'noun:anim:p:v_mis']],
  галицька: [['галицький', 'adj:f:v_naz']], галицький: [['галицький', 'adj:m:v_naz']], низько: [['низько', 'adv']], німецький: [['німецький', 'adj:m:v_naz']],
}
const mk = (): AnnotateData => {
  const lex = emptyLex(), map = new Map<string, { lemma: string; form: string; via: string }[]>(), lemmas = new Set<string>()
  for (const [f, hs] of Object.entries(forms)) {
    lex.paradigmMap.set(key(f), hs.map(([lemma, tags]) => ({ lemma, tags })))
    for (const [l] of hs) { lemmas.add(l); map.set(key(f), [...(map.get(key(f)) ?? []), { lemma: l, form: key(f), via: 'paradigm' }]) }
  }
  return { ...lex, search: { map, keys: [] }, cards: new Map([...lemmas].map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const lemmaOf = (w: string) => annotate(w, mk(), 1900).find(t => t.key === w)!.lemma
const cands = (w: string) => withGal([{ form: w, trace: [], branches: 0 }], w).map(c => c.form)
const render = async (props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(Paradigm as never, props) }))
const txt = (s: string) => s.replace(/<[^>]+>/g, '')

describe('MM-56 людях ~ людєх (GAL-A-SOFT, ЕУМ um173 NDN / um175 PKB)', () => {
  it('forward: людях → людєх, конях → конєх under NDN and PKB (the locative plural is covered by the A-SOFT row: я after a soft consonant); POD keeps я', () => {
    for (const c of ['NDN', 'PKB']) { expect(respell('людях', c).text, c).toBe('людєх'); expect(respell('конях', c).text, c).toBe('конєх') }
    expect(respell('людях', 'POD').text).toBe('людях')
  })
  it('the «Форми» table shows людєх under NDN (per form), the standard form otherwise', async () => {
    const par = [{ form: 'люди', tags: 'noun:anim:p:v_naz' }, { form: 'людях', tags: 'noun:anim:p:v_mis' }]
    setDialect('NDN')
    try { expect(txt(await render({ paradigm: par }))).toContain('людєх') } finally { setDialect(''); resetViews() }
    expect(txt(await render({ paradigm: par }))).not.toContain('людєх')
  })
  it('reverse: людєх → людях in the candidates and in the client annotator; a form VESUM lists is not redirected', () => {
    expect(cands('людєх')).toContain('людях'); expect(lemmaOf('людєх')).toBe('людина'); expect(lemmaOf('конєх')).toBe('кінь'.replace('кінь', 'кінь'))
    expect(lemmaOf('людях')).toBe('людина')
  })
  it('locative plural -ох / -ех (NDN um173 «у місц. в. мн. -ох», SYAN um174 «-ох … зрідка -ex»): людох → людях, конох → конях; gate = noun, locative, plural', () => {
    expect(cands('людох')).toContain('людях'); expect(cands('конох')).toContain('конях'); expect(cands('людех')).toContain('людях')
    expect(galSoftGate('ORTH-GAL-LOC-OH-JA', 'людох', 'noun:anim:p:v_mis', () => false)).toBe(true)
    expect(galSoftGate('ORTH-GAL-LOC-OH-JA', 'людох', 'noun:anim:p:v_naz', () => false)).toBe(false)
    expect(galSoftGate('ORTH-GAL-LOC-OH-A', 'столох', 'noun:inanim:m:v_mis', () => false)).toBe(false)   // singular
  })
})

describe('MM-57 hard -ск- / -цк- (PKB um175, SYAN um174; NDN has no statement)', () => {
  it('forward: PKB and SYAN галицький → галицкий, галицька → галицка, низько → низко, німецький → німецкий; NDN, POD, WPL unchanged', () => {
    for (const c of ['PKB', 'SYAN']) { expect(respell('галицький', c).text, c).toBe('галицкий'); expect(respell('галицька', c).text, c).toBe('галицка'); expect(respell('низько', c).text, c).toBe('низко'); expect(respell('німецький', c).text, c).toBe('німецкий') }
    for (const c of ['POD', 'WPL', 'HUT']) expect(respell('галицький', c).text, c).toBe('галицький')
  })
  it('IPA agrees: the dialect IPA is read from the hard spelling (no soft с / ц)', () => {
    expect(ipaOf('галицький', 'PKB').ipa).toBe(toIpa('галицкий', null, 'PKB').ipa); expect(ipaOf('галицький', 'PKB').ipa).not.toBe(ipaOf('галицький', '').ipa)
  })
  it('reverse (orth-less text, the build candidates, the client annotator): галицка → галицька, галицкий → галицький, низко → низько, німецкий → німецький; a known form is not redirected', () => {
    expect(cands('галицка')).toContain('галицька'); expect(cands('галицкий')).toContain('галицький'); expect(cands('німецкий')).toContain('німецький')
    expect(lemmaOf('галицка')).toBe('галицький'); expect(lemmaOf('галицкий')).toBe('галицький'); expect(lemmaOf('галицька')).toBe('галицький')
    expect(galSoftGate('ORTH-GAL-SK', 'галицка', 'adj:f:v_naz', () => false)).toBe(true); expect(galSoftGate('ORTH-GAL-SK', 'ласка', 'verb:imperf:inf', () => false)).toBe(false)
  })
})

describe('MM-57 the other hardenings (твердішання) of the ЕУМ pages', () => {
  it('forward: PKB final с / ц before -а -у (um175), POD hard р (um180); the other dialects unchanged', () => {
    expect(respell('десь', 'PKB').text).toBe('дес'); expect(respell('хтось', 'PKB').text).toBe('хтос'); expect(respell('вулиця', 'PKB', { pos: 'noun' }).text).toBe('вулица'); expect(respell('вулицю', 'PKB', { pos: 'noun' }).text).toBe('вулицу')
    expect(respell('буряк', 'POD').text).toBe('бурак'); expect(respell('говорю', 'POD').text).toBe('говору'); expect(respell('зоря', 'POD').text).toBe('зора')
    expect(respell('десь', 'NDN').text).toBe('десь'); expect(respell('буряк', 'HUT').text).toBe('буряк'); expect(respell('вулиця', 'PKB').text).toBe('вулиця')   // the -ц- rule needs the noun tag
  })
  it('reverse (measured on the corpus vocabulary): хлопец → хлопець, отца → отця, хтос → хтось; the hard р is NOT a shipped reverse fold (≈ 25 % wrong)', () => {
    expect(cands('хлопец')).toContain('хлопець'); expect(cands('отца')).toContain('отця'); expect(cands('хтос')).toContain('хтось')
    expect(cands('бурак')).not.toContain('буряк'); expect(galSoftGate('ORTH-GAL-C-FINAL', 'отец', 'noun:anim:m:v_naz', () => false)).toBe(true)
  })
})
