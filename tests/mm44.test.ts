/**
 * SPEC 63 MM-44 (CP-10 live annotator check): «Видів-го вчора» linked the host «видів» to the noun вид (gen. pl.). An attached object clitic (-го = його) takes a verb host
 * (видів = past m. sg. of видіти); a noun reading must not win. The particle -ж (прийми-ж) and a free noun «видів» (багато видів рослин) are unchanged. Annotator and build linker.
 */
import { describe, it, expect } from 'vitest'
import { unknown } from '../core/evidence.ts'
import { key } from '../core/text.ts'
import { hostTagOk } from '../core/gal-folds.ts'
import { emptyLex } from '../src/lib/analyze.ts'
import { annotate, type AnnotateData } from '../src/lib/annotate.ts'
import { chooseLemma, linkOptions, type Env, type TypeCtx } from '../pipelines/build-link.ts'
import { derive as deriveRaw } from '../core/phonology.ts'
import { fold as foldRaw } from '../core/orthography.ts'
import type { VesumHit } from '../core/types.ts'

const NOUN = 'noun:inanim:p:v_rod', VPAST = 'verb:imperf:past:m'
const forms: Record<string, [string, string][]> = {   // form → [lemma, tags]
  видів: [['вид', NOUN], ['видіти', VPAST]], дай: [['дати', 'verb:perf:impr:s:2']], прийми: [['прийняти', 'verb:perf:impr:s:2']], рік: [['рік', 'noun:inanim:m:v_naz']],
}
const mk = (omitVerb = false): AnnotateData => {
  const lemmas = ['вид', 'видіти', 'дати', 'прийняти', 'він', 'рік']
  const lex = emptyLex()
  for (const [f, hs] of Object.entries(forms)) lex.paradigmMap.set(key(f), hs.filter(([l]) => !(omitVerb && l === 'видіти')).map(([lemma, tags]) => ({ lemma, tags })))
  const pairs: [string, string][] = [['вид', 'вид'], ['видів', 'вид'], ...(omitVerb ? [] : [['видіти', 'видіти'], ['видів', 'видіти']] as [string, string][]), ['дати', 'дати'], ['дай', 'дати'], ['прийняти', 'прийняти'], ['прийми', 'прийняти'], ['він', 'він'], ['його', 'він']]
  const map = new Map<string, { lemma: string; form: string; via: string }[]>()
  for (const [f, l] of pairs) map.set(key(f), [...(map.get(key(f)) ?? []), { lemma: l, form: key(f), via: 'paradigm' }])
  return { ...lex, search: { map, keys: [] },
    cards: new Map(lemmas.map(l => [l, { lemma: l, claims: { register: unknown(), origin: unknown(), dialect: {} }, first: unknown(), forms: [], paradigm: [] }])) } as unknown as AnnotateData
}
const tok = (text: string, k: string, d = mk()) => annotate(text, d, 1900).find(t => t.key === k)!

describe('MM-44 annotator: an object clitic selects a verb host', () => {
  it('hostTagOk: only «го» constrains; ж, би, то are unconstrained', () => {
    expect(hostTagOk('го', NOUN)).toBe(false); expect(hostTagOk('го', VPAST)).toBe(true); expect(hostTagOk('го', 'part')).toBe(true)
    expect(hostTagOk('ж', NOUN)).toBe(true); expect(hostTagOk('би', NOUN)).toBe(true)
  })
  it('«Видів-го вчора» → видіти (not вид); «дай-го» → дати', () => {
    const t = tok('Видів-го вчора', 'видів-го'); expect(t.lemma).toBe('видіти'); expect(t.short!.fullLemma).toBe('він')
    expect(tok('дай-го', 'дай-го').lemma).toBe('дати')
  })
  it('no verb reading of the host: unlinked, marked «неоднозначно», never the noun', () => {
    const t = tok('Видів-го вчора', 'видів-го', mk(true)); expect(t.lemma).not.toBe('вид'); expect(t.card).toBeUndefined()
    expect(t.hints.some(h => h.rule === 'OBJ-CLITIC-HOST' && h.label.includes('неоднозначно'))).toBe(true)
  })
  it('«прийми-ж» (particle) is unchanged; a free noun «видів» (багато видів рослин) stays вид', () => {
    expect(tok('прийми-ж', 'прийми-ж').lemma).toBe('прийняти')
    const t = tok('багато видів рослин', 'видів'); expect(t.lemma).toBe('вид')
  })
})

describe('MM-44 build linker: the hyphenated pattern is decidable without context', () => {
  const H = (lemma: string, tags: string): VesumHit => ({ lemma, tags })
  const hits = new Map<string, VesumHit[]>([['видів', [H('вид', NOUN), H('видіти', VPAST)]], ['вид', [H('вид', 'noun:inanim:m:v_naz')]], ['видіти', [H('видіти', 'verb:imperf:inf')]], ['прийми', [H('прийняти', 'verb:perf:impr:s:2')]]])
  const link = (raw: string, h = hits) => {
    const e: Env = { hits: h, derive: (s, oldI) => deriveRaw(s, { oldI }), fold: (s, o) => foldRaw(s, o) }
    const r = linkOptions({ lang: 'uk', oldI: false, raw } as TypeCtx, e); return r ? chooseLemma(r.opts, new Map()) : undefined
  }
  it('видів-го → видіти, with no verb reading → unlinked, видів-ж keeps its host as before', () => {
    expect(link('видів-го')?.lemma).toBe('видіти')
    expect(link('видів-го', new Map([['видів', [H('вид', NOUN)]]]))).toBeUndefined()
    expect(link('прийми-ж')?.lemma).toBe('прийняти')
  })
})
