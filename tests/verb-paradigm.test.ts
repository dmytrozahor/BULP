// BL-8: modern verb paradigm from VESUM tags (incl. participles linked by construction + oracle) and the epoch verb grid (TOROT/PROIEL + Stanza, attested-only, per shev epoch).
import { describe, it, expect } from 'vitest'
import { cellsFromProiel, cellsFromUd, cellsFromVesum, VERB_KEYS, verbDualShown } from '../core/cells.ts'
import { acceptParticiples, participleCandidates, participleSlot } from '../core/verbs.ts'
import { buildGrids } from '../src/lib/paradigm.ts'
import { verbGrid } from '../src/lib/epochGrid.ts'
import { key } from '../core/text.ts'
import { hasData, readFull } from './lexdata.ts'

const rob = [
  'робити verb:imperf:inf', 'робить verb:imperf:inf:short', 'роби verb:imperf:impr:s:2', 'робімо verb:imperf:impr:p:1', 'робіть verb:imperf:impr:p:2',
  'роблю verb:imperf:pres:s:1', 'робиш verb:imperf:pres:s:2', 'робить verb:imperf:pres:s:3', 'робе verb:imperf:pres:s:3:subst', 'робимо verb:imperf:pres:p:1', 'робите verb:imperf:pres:p:2', 'роблять verb:imperf:pres:p:3',
  'робитиму verb:imperf:futr:s:1', 'робитиме verb:imperf:futr:s:3', 'робитимуть verb:imperf:futr:p:3',
  'робив verb:imperf:past:m', 'робила verb:imperf:past:f', 'робило verb:imperf:past:n', 'робили verb:imperf:past:p', 'роблено verb:imperf:impers',
].map(l => { const [form, tags] = l.split(' '); return { form: form!, tags: tags! } })
const vesumHits = new Map([
  ['роблячи', [{ lemma: 'роблячи', tags: 'advp:imperf' }]], ['робивши', [{ lemma: 'робивши', tags: 'advp:imperf' }]],
  ['роблячий', [{ lemma: 'роблячий', tags: 'adj:m:v_naz:adjp:actv:imperf' }]], ['робивший', [{ lemma: 'робивший', tags: 'adj:m:v_naz:adjp:actv:imperf' }]],
  ['роблений', [{ lemma: 'роблений', tags: 'adj:m:v_naz:adjp:pasv:imperf' }, { lemma: 'роблений', tags: 'adj:m:v_naz:adjp:pasv:perf' }]],
])

describe('BL-8 modern verb paradigm: робити', () => {
  it('participle candidates are built from the verb forms and accepted only by the VESUM oracle', () => {
    const c = participleCandidates(rob)
    for (const x of ['роблячи', 'роблячий', 'робивши', 'робивший', 'роблений']) expect(c).toContain(x)
    const acc = acceptParticiples(rob, c, vesumHits, key)
    expect(acc.map(a => a.form).sort()).toEqual(['робивши', 'робивший', 'роблений', 'роблячи', 'роблячий'].sort())   // aspect filter: the perf passive reading of роблений is not taken
    expect(acc.filter(a => a.form === 'роблений')).toHaveLength(1)
    expect(participleCandidates(rob.map(p => ({ ...p, tags: p.tags.replace('imperf', 'rev:imperf') })))).toEqual([])   // reflexive: none
    expect(acceptParticiples(rob, ['робитий'], vesumHits, key)).toEqual([])   // a wrong rule yields nothing
    expect(acc.map(participleSlot).sort()).toEqual(['actv.past', 'actv.pres', 'advp.past', 'advp.pres', 'pasv'])
  })
  it('the passive participle: one entry per spelling (the lemma form is listed twice in VESUM) and the gendered nominatives when VESUM has them', () => {
    const hits = new Map(vesumHits)
    hits.set('роблений', [{ lemma: 'роблений', tags: 'adj:m:v_naz:adjp:pasv:imperf' }, { lemma: 'роблений', tags: 'adj:m:v_zna:rinanim:adjp:pasv:imperf' }, { lemma: 'роблений', tags: 'adj:m:v_naz:adjp:pasv:imperf:long' }])
    hits.set('роблена', [{ lemma: 'роблений', tags: 'adj:f:v_naz:adjp:pasv:imperf' }]); hits.set('роблене', [{ lemma: 'роблений', tags: 'adj:n:v_naz:adjp:pasv:imperf' }])
    const ps = [...rob, ...acceptParticiples(rob, participleCandidates(rob), hits, key)]
    expect(ps.filter(p => p.form === 'роблений')).toHaveLength(1)
    const pas = buildGrids(ps).find(g => g.id === 'part')!.rows.at(-1)!.cells[1]!.map(p => p.form)
    expect(pas).toEqual(['роблений', 'роблена', 'роблене'])
    // data built before the fix still holds the lemma three times: the cell shows it once
    const old = [...rob, ...['m:v_naz', 'm:v_zna:rinanim', 'm:v_naz:long'].map(t => ({ form: 'роблений', tags: `adj:${t}:adjp:pasv:imperf` }))]
    expect(buildGrids(old).find(g => g.id === 'part')!.rows.at(-1)!.cells[1]!.map(p => p.form)).toEqual(['роблений'])
  })
  it('layout: inf, present, future, past m/f/n/pl, imperative, impersonal, participles, adverbial participles', () => {
    const ps = [...rob, ...acceptParticiples(rob, participleCandidates(rob), vesumHits, key)]
    const g = Object.fromEntries(buildGrids(ps).map(x => [x.id, x]))
    expect(Object.keys(g)).toEqual(['inf', 'pres', 'futr', 'past', 'impr', 'impers', 'part', 'advp'])
    const forms = (id: string) => g[id]!.rows.map(r => r.cells.map(c => c.map(p => p.form).join('/')))
    expect(forms('pres')).toEqual([['роблю', 'робимо'], ['робиш', 'робите'], ['робить/робе', 'роблять']])
    expect(forms('past')).toEqual([['робив', 'робила', 'робило', 'робили']])
    expect(forms('impers')).toEqual([['роблено']])
    expect(forms('part')).toEqual([['роблячий', 'робивший'], ['', 'роблений']])
    expect(forms('advp')).toEqual([['роблячи', 'робивши']])
  })
  it.skipIf(!hasData())('built data: робити has the full finite layout', () => {
    const c = readFull().find(x => x.lemma === 'робити')!
    const ids = buildGrids(c.paradigm).map(x => x.id)
    for (const id of ['inf', 'pres', 'futr', 'past', 'impr', 'impers']) expect(ids).toContain(id)
  })
})

describe('BL-8 verb decoders', () => {
  it('PROIEL V- tags (header lines 60-160; examples of research/11 §4.1)', () => {
    expect(cellsFromProiel('V- 3saia----i')).toMatchObject({ grid: 'verb', keys: ['aor.sg.3'], amb: 1 })      // нача/начати
    expect(cellsFromProiel('V- 3piia----i').keys).toEqual(['impf.pl.3'])                                          // живѧхо/жити (3 pl; the example is tagged iia = imperfect)
    expect(cellsFromProiel('V- 1dpia----i').keys).toEqual(['pres.du.1'])
    expect(cellsFromProiel('V- 2pfia----i').keys).toEqual(['fut.pl.2'])
    expect(cellsFromProiel('V- 2s-ma----i').keys).toEqual(['impr.sg.2'])
    expect(cellsFromProiel('V- ---n------').keys).toEqual(['inf'])
    expect(cellsFromProiel('V- ---u------').keys).toEqual(['sup'])
    expect(cellsFromProiel('V- -sspafn-si').keys).toEqual(['lpt.f.sg'])                                           // пошла/поити, l-participle
    expect(cellsFromProiel('V- -sspaqn-si')).toMatchObject({ keys: ['lpt.m.sg', 'lpt.f.sg', 'lpt.n.sg'], amb: 3 })
    expect(cellsFromProiel('V- -spppmn-si').keys).toEqual(['part.pass'])
    expect(cellsFromProiel('V- -sppamn-si').keys).toEqual(['part.act.pres'])
    expect(cellsFromProiel('V- 3sasa----i')).toMatchObject({ grid: 'verb', keys: [], under: true })               // subjunctive: not placed
  })
  it('Stanza UD: no aorist/imperfect in UD, so a finite Past is underspecified', () => {
    expect(cellsFromUd('VERB', 'Mood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin')).toMatchObject({ grid: 'verb', keys: ['pres.sg.3'] })
    expect(cellsFromUd('AUX', 'Mood=Ind|Number=Plur|Person=3|Tense=Fut|VerbForm=Fin').keys).toEqual(['fut.pl.3'])
    expect(cellsFromUd('VERB', 'Mood=Ind|Number=Sing|Person=3|Tense=Past|VerbForm=Fin')).toMatchObject({ keys: [], under: true })
    expect(cellsFromUd('VERB', 'Mood=Imp|Number=Dual|Person=2|VerbForm=Fin').keys).toEqual(['impr.du.2'])
    expect(cellsFromUd('VERB', 'VerbForm=Inf').keys).toEqual(['inf'])
    expect(cellsFromUd('VERB', 'VerbForm=Sup').keys).toEqual(['sup'])
    expect(cellsFromUd('VERB', 'Gender=Fem|Number=Sing|VerbForm=PartRes').keys).toEqual(['lpt.f.sg'])
  })
  it('VESUM verb lines: person/number, future, past m/f/n/p as the l-form, impersonal not placed', () => {
    expect(cellsFromVesum(['verb:imperf:pres:s:1'])).toMatchObject({ grid: 'verb', keys: ['pres.sg.1'] })
    expect(cellsFromVesum(['verb:perf:futr:p:2']).keys).toEqual(['fut.pl.2'])
    expect(cellsFromVesum(['verb:imperf:past:f']).keys).toEqual(['lpt.f.sg'])
    expect(cellsFromVesum(['verb:imperf:inf']).keys).toEqual(['inf'])
    expect(cellsFromVesum(['verb:imperf:impers']).keys).toEqual([])
  })
  it('every verb key is unique and the dual rule looks at du segments only', () => {
    expect(new Set(VERB_KEYS).size).toBe(VERB_KEYS.length)
    expect(verbDualShown({ cells: [{ key: 'pres.du.1', forms: [1] }] })).toBe(true)
    expect(verbDualShown({ cells: [{ key: 'pres.sg.1', forms: [1] }, { key: 'pres.du.1', forms: [] }] })).toBe(false)
  })
})

describe('BL-8 epoch verb grid', () => {
  const f = (raw: string) => ({ raw, n: 1, src: 'torot' as const, t: 0, ex: [0, 'x'] as [number, string] })
  const p = { epoch: 'shev.old', grid: 'verb' as const, N: 4, dropped: { conflict: 0, underspecified: 0, untagged: 0 },
    cells: [{ key: 'aor.sg.3', forms: [f('нача')] }, { key: 'aor.du.3', forms: [f('начаста')] }, { key: 'inf', forms: [f('начати')] }, { key: 'lpt.f.sg', forms: [f('начала')] }] }
  it('only groups with an attested cell get rows; the dual column only when attested; non-finite spans', () => {
    const g = verbGrid(p, 'shev.old')
    expect(g.cols.map(c => c.id)).toEqual(['sg', 'du', 'pl'])
    expect(g.rows.map(r => r.label)).toEqual(['Аорист · 1 ос.', 'Аорист · 2 ос.', 'Аорист · 3 ос.', 'Інфінітив', 'л-форма (результатив) · чол.', 'л-форма (результатив) · жін.', 'л-форма (результатив) · сер.'])
    expect(g.rows[2]!.cells.map(c => c!.att.map(x => x.raw))).toEqual([['нача'], ['начаста'], []])
    expect(g.rows[3]!.span).toBe(3)
    expect(g.reconstructed).toBe(false)
    const noDu = verbGrid({ ...p, cells: [p.cells[0]!] }, 'shev.old')
    expect(noDu.cols.map(c => c.id)).toEqual(['sg', 'pl'])
    expect(verbGrid(undefined, 'shev.old').rows).toEqual([])
  })
})

describe.skipIf(!hasData())('BL-8 built data: TOROT verbs placed per epoch', () => {
  it('бути and ректи have verb epoch cells in shev.old with TOROT-tagged aorist/imperfect', () => {
    const cards = readFull(), count = (lemma: string) => {
      const e = cards.find(c => c.lemma === lemma)?.epochs
      return { paradigms: e?.paradigms ?? [], cells: (e?.paradigms ?? []).flatMap(q => q.cells.filter(c => c.forms.length)) }
    }
    for (const l of ['бути', 'ректи']) {
      const { paradigms, cells } = count(l)
      expect(paradigms.every(q => q.grid === 'verb'), l).toBe(true)
      expect(paradigms.some(q => q.epoch === 'shev.old' && q.cells.length > 0), l).toBe(true)
      expect(cells.length, l).toBeGreaterThan(3)
    }
    const aor = count('ректи').cells.filter(c => c.key.startsWith('aor.') || c.key.startsWith('impf.'))
    expect(aor.length).toBeGreaterThan(0)
  })
})
