/**
 * BL-8 modern verb paradigm: VESUM keeps participles and adverbial participles as lemmas of their own (`роблячи advp:imperf`, `роблений adj:m:v_naz:adjp:pasv:imperf`), not as forms of
 * `робити`. We link them to the verb by construction + oracle: a candidate spelling is generated from the verb's own VESUM forms (3 pl present, masculine past, impersonal -но/-то)
 * and accepted only if VESUM lists it as a participle lemma (so a wrong rule yields nothing, never a wrong form). Pure: shared by the build and the tests.
 */
export interface PForm { form: string; tags: string }
const has = (p: PForm, ...ts: string[]) => { const t = p.tags.split(':'); return ts.every(x => t.includes(x)) }
const flagged = (p: PForm) => has(p, 'subst') || has(p, 'bad') || has(p, 'arch') || has(p, 'short') || has(p, 'long')

/** Candidate participle lemmas of a non-reflexive verb (advp present/past, active present/past, passive). */
export function participleCandidates(paradigm: PForm[]): string[] {
  if (!paradigm.length || paradigm.some(p => has(p, 'rev'))) return []
  const out = new Set<string>()
  for (const p of paradigm) {
    if (flagged(p)) continue
    const f = p.form
    if (has(p, 'pres', 'p', '3')) {
      for (const [e, s] of [['ять', 'яч'], ['ать', 'ач'], ['ють', 'юч'], ['уть', 'уч']] as const) if (f.endsWith(e)) { out.add(f.slice(0, -e.length) + s + 'и'); out.add(f.slice(0, -e.length) + s + 'ий') }
    } else if (has(p, 'past', 'm') && f.length > 2) { out.add(f + 'ши'); out.add(f + 'ший') }
    else if (has(p, 'impers') && /[нт]о$/.test(f)) out.add(f.slice(0, -1) + 'ий')
  }
  return [...out]
}

/** The VESUM lemma lines (as `{form, tags}`) that confirm a candidate for this verb: participle lemma (`adjp`/`advp`), same aspect as the verb. */
export function acceptParticiples(paradigm: PForm[], cands: string[], hits: ReadonlyMap<string, { lemma: string; tags: string }[]>, keyOf: (s: string) => string): PForm[] {
  const asp = new Set<string>(paradigm.flatMap(p => p.tags.split(':')).filter(x => x === 'perf' || x === 'imperf'))
  const out: PForm[] = []
  for (const c of cands) for (const h of hits.get(keyOf(c)) ?? []) {
    if (h.lemma !== c || !/(^|:)(adjp|advp)(:|$)/.test(h.tags) || !h.tags.split(':').some(x => asp.has(x))) continue
    if (!out.some(o => o.form === c && o.tags === h.tags)) out.push({ form: c, tags: h.tags })
  }
  return out
}

/** Modern participle slot of an accepted lemma: by its tag and suffix (VESUM tags both -чи and -ши as `advp:imperf|perf`). */
export type PartSlot = 'advp.pres' | 'advp.past' | 'actv.pres' | 'actv.past' | 'pasv'
export function participleSlot(p: PForm): PartSlot | undefined {
  if (has(p, 'advp')) return p.form.endsWith('чи') ? 'advp.pres' : p.form.endsWith('ши') ? 'advp.past' : undefined
  if (has(p, 'adjp')) return has(p, 'pasv') ? 'pasv' : p.form.endsWith('чий') ? 'actv.pres' : p.form.endsWith('ший') ? 'actv.past' : undefined
}
