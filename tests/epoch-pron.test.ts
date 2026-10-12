// SPEC 61 FX-5/FX-6 follow-up: the pronominal epoch grid (case × number, no stem type, attested-only, enclitic sub-row).
import { describe, it, expect } from 'vitest'
import { cellsFromProiel, cellsFromUd, cellsFromVesum, isEnclitic, PRON_KEYS, pronDualShown } from '../core/cells.ts'
import { buildEpochs, type NlpTok } from '../pipelines/build-epochs.ts'
import type { Chosen, Route } from '../pipelines/build-link.ts'
import type { WitnessOut } from '../core/types.ts'
import { epochGrid } from '../src/lib/epochGrid.ts'

describe('pronoun decoders', () => {
  it('PROIEL Pp: number + case, no vocative, dual unmerged', () => {
    expect(cellsFromProiel('Pp 1s----a--i')).toMatchObject({ grid: 'pron', keys: ['sg.acc'], amb: 1 })
    expect(cellsFromProiel('Pp 1d----d--i').keys).toEqual(['du.dat'])
    expect(cellsFromProiel('Pk -s----d--i').keys).toEqual(['sg.dat'])
    expect(cellsFromProiel('Pp 2s----v--i')).toMatchObject({ grid: 'pron', keys: [], under: true })   // no vocative cell
    expect(cellsFromProiel('Pp 1p----o--i')).toMatchObject({ grid: 'pron', keys: [], under: true })   // oblique = 5 cells → underspecified
  })
  it('UD PRON and VESUM pron lines', () => {
    expect(cellsFromUd('PRON', 'Case=Gen|Number=Sing|Person=1|PronType=Prs')).toMatchObject({ grid: 'pron', keys: ['sg.gen'] })
    expect(cellsFromUd('NOUN', 'Case=Gen|Number=Sing').grid).toBe('noun')
    expect(cellsFromVesum(['noun:anim:s:v_naz:pron:pers:1'])).toMatchObject({ grid: 'pron', keys: ['sg.nom'] })
    expect(cellsFromVesum(['noun:anim:s:v_rod:pron:pers:1', 'noun:anim:s:v_zna:pron:pers:1']).keys).toEqual(['sg.gen', 'sg.acc'])
    expect(cellsFromVesum(['noun:inanim:f:v_naz'])).toMatchObject({ grid: 'noun' })
  })
  it('enclitics are recognised by spelling in their cell, never in the nominative', () => {
    expect(isEnclitic('sg.acc', 'мя')).toBe(true); expect(isEnclitic('sg.dat', 'ти')).toBe(true); expect(isEnclitic('sg.nom', 'ти')).toBe(false)
    expect(isEnclitic('pl.nom', 'ми')).toBe(false); expect(isEnclitic('sg.gen', 'мене')).toBe(false)
  })
  it('18 pronoun keys (6 cases x 3 numbers)', () => { expect(PRON_KEYS).toHaveLength(18); expect(pronDualShown({ cells: [{ key: 'sg.nom', forms: [1] }] })).toBe(false) })
})

type Tok = { raw: string; morph?: string; lemma?: string; nlp?: NlpTok | null }
const wit = (id: string, lang: 'orv' | 'uk' | 'ruthenian', date: [number, number], toks: Tok[]) => ({
  w: { id, lang, date, oldI: false, tokens: toks.map((t, i) => ({ raw: t.raw, loc: `${id}:${i}`, s: 0, morph: t.morph, lemma: t.lemma })) } as unknown as WitnessOut,
  nlp: toks.some(t => t.nlp !== undefined) ? { model: 'm', tokens: toks.map(t => t.nlp ?? null) } : undefined,
})
const chosen = (id: string, own = id) => ({ c: { id, own: { form: own } } as unknown as Chosen, route: 'torot-lemma' as Route })
const run = (ws: ReturnType<typeof wit>[], epochs: string[][], id: string, hits = new Map<string, { lemma: string; tags: string }[]>(), tags = 'noun:anim:s:v_naz:pron:pers:1') => {
  const tix = ws.map(({ w }, wi) => Int32Array.from(w.tokens.map((_, ti) => wi * 1000 + ti)))
  const linked: ({ c: Chosen; route: Route } | undefined)[] = []
  ws.forEach(({ w }, wi) => w.tokens.forEach((_, ti) => { linked[wi * 1000 + ti] = chosen(id) }))
  return buildEpochs({ adm: ws, epochsOf: epochs, tix, linked, lemmas: new Map([[id, { display: id, tags }]]), hits, derive: s => ({ candidates: [{ form: s }] }), vesumLoc: 'vesum', probe: new Set([id]), kindOf: () => 'pron' })
}

describe('pronoun epoch build', () => {
  const w = wit('a', 'orv', [1110, 1118], [
    { raw: 'азъ', morph: 'Pp 1s----n--i' }, { raw: 'мя', morph: 'Pp 1s----a--i' }, { raw: 'мене', morph: 'Pp 1s----a--i' }, { raw: 'ми', morph: 'Pp 1s----d--i' },
    { raw: 'вѣ', morph: 'Pp 1d----n--i' }, { raw: 'ити', morph: 'V- --pnfa---i' }, { raw: 'и' },
  ])
  const r = run([w], [['shev.old']], 'я')
  const p = r.epochs.get('я')!.paradigms[0]!
  it('tokens are PLACED in the pron grid, not conflicted; the verb is a grid conflict, the bare token untagged', () => {
    expect(p.grid).toBe('pron'); expect(p.cells.map(c => c.key)).toEqual(['sg.nom', 'sg.dat', 'sg.acc', 'du.nom'])
    expect(p.dropped).toEqual({ conflict: 1, underspecified: 0, untagged: 1 })
    expect(r.stats.probe['я']).toMatchObject({ kind: 'pron', tokens: 7, placed: 5, conflict: 1, untagged: 1, why: { 'torot:grid:verb': 1 } })
    expect(r.epochs.get('я')!.stem.value).toBe('unknown'); expect(r.stats.pronLemmas).toBe(1)
  })
  it('enclitic forms are marked and listed after the tonic ones', () => {
    const acc = p.cells.find(c => c.key === 'sg.acc')!
    expect(acc.forms.map(f => [f.raw, !!f.enc])).toEqual([['мене', false], ['мя', true]])
    expect(p.cells.find(c => c.key === 'sg.dat')!.forms[0]).toMatchObject({ raw: 'ми', enc: true })
    expect(p.cells.find(c => c.key === 'sg.nom')!.forms[0]!.enc).toBeUndefined()
  })
  it('grid: case × number, dual only where attested, enclitic sub-row, nothing reconstructed', () => {
    const g = epochGrid(p, 'shev.old', undefined, 'pron')
    expect(g.rows.map(x => x.label)).toHaveLength(6); expect(g.cols.map(c => c.id)).toEqual(['sg', 'du', 'pl']); expect(g.reconstructed).toBe(false)
    const acc = g.rows[3]!.cells[0]!
    expect(acc.att.map(f => f.raw)).toEqual(['мене']); expect(acc.enc!.map(f => f.raw)).toEqual(['мя']); expect(acc.rec).toEqual([]); expect(g.rows[0]!.cells[2]!.unknown).toBe(true)
    expect(epochGrid({ ...p, cells: p.cells.filter(c => !c.key.startsWith('du.')) }, 'shev.old', undefined, 'pron').cols.map(c => c.id)).toEqual(['sg', 'pl'])
  })
  it('a modern direct VESUM link places «мені» under я in the dative singular', () => {
    const m = wit('m', 'uk', [1882, 1882], [{ raw: 'мені' }])
    const hits = new Map([['мені', [{ lemma: 'я', tags: 'noun:anim:s:v_dav:pron:pers:1' }]]])
    const tix = [Int32Array.from([0])], linked = [{ c: { id: 'я', own: { form: 'мені' } } as unknown as Chosen, route: 'direct' as Route }]
    const rr = buildEpochs({ adm: [m], epochsOf: [['shev.modern']], tix, linked, lemmas: new Map([['я', { display: 'я', tags: 'noun:anim:s:v_naz:pron:pers:1' }]]), hits, derive: s => ({ candidates: [{ form: s }] }), vesumLoc: 'vesum' })
    expect(rr.epochs.get('я')!.paradigms[0]!.cells.map(c => [c.key, c.forms[0]!.raw, c.forms[0]!.src])).toEqual([['sg.dat', 'мені', 'vesum']])
  })
})
