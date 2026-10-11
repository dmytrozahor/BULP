/**
 * SPEC 50 EP-7.2 / EP-6.2: the per-epoch noun grid, in the style of paradigm.ts (rows = the seven cases, columns sg / du / pl). Pure: attested cells come
 * from the detail shard, reconstructed cells from core/reconstruct.ts (never stored), confirmation = confirm() of the backend (EP-5.5).
 * A cell with neither is `unknown` (EP-7.4, EP-3.8: absence is not evidence).
 */
import { EPOCHS } from '../../core/epochs.ts'
import { CASES, CASE_UK, DUAL_OF, DUAL_UK, dualShown, epochDisabled, nounKey, type Case } from '../../core/cells.ts'
import { generalNotes, notesFor, type MorphChange } from '../../core/morph-history.ts'
import { confirm, reconstruct, type ReconCell, type ReconForm } from '../../core/reconstruct.ts'
import type { CellForm, CellKey, EpochParadigm, StemValue } from '../../core/types.ts'

export const SHEV_EPOCHS = EPOCHS.filter(e => e.scheme === 'shev')

export interface GCell {
  key: CellKey; tag?: string; att: CellForm[]; more: number; rec: ReconForm[]; eq?: ReconCell['eq']; notes: MorphChange[]; unknown: boolean
}
export interface EGrid {
  epoch: string; cols: { id: 'sg' | 'du' | 'pl'; label: string }[]; rows: { label: string; cells: (GCell | null)[] }[]
  duHidden: boolean; notes: MorphChange[]; reconstructed: boolean
}

const ord = (id: string) => EPOCHS.findIndex(e => e.id === id)
const active = (n: MorphChange, epoch: string, gender?: StemValue['gender']) => (!n.gender || !gender || n.gender.includes(gender)) && (!n.from || ord(n.from) <= ord(epoch)) && (!n.to || ord(epoch) <= ord(n.to))

export function epochGrid(p: EpochParadigm | undefined, epoch: string, stem?: StemValue): EGrid {
  const att = new Map((p?.cells ?? []).map(c => [c.key, c]))
  const rec = new Map((stem ? confirm(reconstruct(stem, epoch), p) : []).map(c => [c.key, c]))
  const du = dualShown(epoch, p)
  const cell = (key: CellKey, tag?: string): GCell => {
    const a = att.get(key), r = rec.get(key)
    return { key, tag, att: a?.forms ?? [], more: a?.more ?? 0, rec: r?.forms ?? [], eq: r?.eq, notes: notesFor(key).filter(n => active(n, epoch, stem?.gender)),
      unknown: !a?.forms.length && !r?.forms.length && !r?.eq }
  }
  const cols: EGrid['cols'] = [{ id: 'sg', label: 'однина' }, ...(du ? [{ id: 'du' as const, label: 'двоїна' }] : []), { id: 'pl', label: 'множина' }]
  const keyed = new Map<string, MorphChange>()
  for (const c of CASES) for (const k of [nounKey('sg', c), nounKey('du', c), nounKey('pl', c)]) for (const n of notesFor(k)) if (active(n, epoch, stem?.gender)) keyed.set(n.id, n)
  const notes = [...keyed.values(), ...generalNotes().filter(n => active(n, epoch, stem?.gender))].sort((a, b) => a.id.localeCompare(b.id))
  return {
    epoch, cols, duHidden: !du, notes, reconstructed: rec.size > 0,
    rows: CASES.map((c: Case) => {
      const dcell = c === 'nom' || c === 'gen' || c === 'dat' ? cell(nounKey('du', c), DUAL_UK[DUAL_OF[c]]) : null   // PAVL p. 74: du cells in the Н / Р / Д rows
      return { label: CASE_UK[c], cells: [cell(nounKey('sg', c)), ...(du ? [dcell] : []), cell(nounKey('pl', c))] }
    }),
  }
}

/** EP-7.1: a tab per shev epoch, in order; disabled when the corpus holds no witness of the epoch (EP-6.3, epochDisabled); default = oldest epoch with data */
export function epochTabs(paradigms: EpochParadigm[], sizes: Record<string, number>) {
  const by = new Map(paradigms.map(p => [p.epoch, p]))
  const tabs = SHEV_EPOCHS.map(e => { const p = by.get(e.id); return { id: e.id, p, N: p?.N ?? 0, disabled: epochDisabled(e.id, sizes) && !p, hasData: !!p?.cells.some(c => c.forms.length) } })
  return { tabs, default: (tabs.find(t => t.hasData) ?? tabs.find(t => !t.disabled) ?? tabs[0]!).id }
}
