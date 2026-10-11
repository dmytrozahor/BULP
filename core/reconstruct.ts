/**
 * Reconstruction of noun paradigms from a cited model (SPEC 50 EP-5). Pure: runs in the build (tests, REPORT) and in the browser; nothing it returns is stored (EP-1.3).
 * A reconstruction is NOT an attestation (D-2.4, D-4.1): every form has method 'reconstruction' and a trace [stem rule, model-table cell, (MOR-VEL)] with citations (P-1.5).
 * Only shev.proto and shev.old: PAVL's tables describe «найдавніших східнослов’янських пам’ятках» (p. 69), and «вже наприкінці дописемного періоду розвитку мови почалося
 * змішування типів відмінювання» (p. 78) — for later epochs no table is cited, so nothing is reconstructed (EP-5.1).
 */
import { Q, type Evidence } from './evidence.ts'
import { NOUN_KEYS } from './cells.ts'
import { foldG, modelByLemma, PAL } from './morph-tables.ts'
import { normalizeOld } from './text.ts'
import { stemRuleById } from './stem.ts'
import type { CellForm, CellKey, EpochParadigm, StemValue } from './types.ts'

export const RECON_EPOCHS = ['shev.proto', 'shev.old']
export interface ReconStep { rule: string; from: string; to: string; cite: Evidence[] }
export interface ReconForm { form: string; variant: boolean; method: 'reconstruction'; trace: ReconStep[]; confirmedBy?: CellForm[] }
/** `eq`: the cell is not reconstructed separately — it coincides with cell `eq.key` (PAVL p. 74), shown as «= Н.». */
export interface ReconCell { key: CellKey; forms: ReconForm[]; eq?: { key: CellKey; cite: Evidence } }

const P74_VOC = Q('PAVL', 'с. 74, «Особливості давнього відмінювання іменників»', 'У множині та двоїні він збігався із формою називного відмінка. Кличний відмінок іменників середнього роду в усіх числових варіантах збігався із називним і знахідним.')
const VEL_WUK = Q('WUK', 'uk.wikipedia «Відмінок в українській мові», rev. 41107449, §Тип з основою на *-ā / *-ŏ', 'В іменників із задньоязиковими -г-, -к-, -х- у корені діє друга палаталізація перед -и, -ѣ (друзи, ворози, вълци, дуси, друзѣ, ворозѣ, вълцѣ, дусѣ…)')
const clean = (l: string) => l.normalize('NFC').toLowerCase().replace(/#\d+$/, '')

/** Comparison form of EP-5.5: stage-N normalisation (core/text.ts: оу→у, ꙗ→ѧ, titlo removed …) plus the graphic variants ѧ/я and є/е. */
export const confirmNorm = (s: string) => foldG(normalizeOld(s).norm)

export function reconstruct(stem: StemValue, epoch: string): ReconCell[] {
  if (!RECON_EPOCHS.includes(epoch)) return []
  const model = modelByLemma[stem.model], rule = stemRuleById[stem.rule], old = clean(stem.old)
  if (!model || !rule || model.type !== stem.type || !foldG(old).endsWith(foldG(model.nom))) return []   // the nominative must end like the model's (EP-5.2), else unknown
  const base = old.slice(0, old.length - model.nom.length), oblSfx = model.obl ? model.obl.slice(model.stem.length) : ''
  const out: ReconCell[] = []
  for (const key of NOUN_KEYS) {
    if (key === 'pl.voc' || (key === 'sg.voc' && model.gender === 'n')) { out.push({ key, forms: [], eq: { key: key.replace('voc', 'nom'), cite: P74_VOC } }); continue }
    const cell = model.cells[key]
    if (!cell) continue
    const b = cell.obl ? base + oblSfx : base
    const forms: ReconForm[] = []
    for (const e of [...new Set(cell.ends)]) {
      const vel = (model.type === 'a' || model.type === 'o') && /[кгх]$/.test(b) && /^[ѣи]/.test(e)   // EP-5.3: second palatalisation before -и, -ѣ
      const form = (vel ? b.slice(0, -1) + PAL[b.slice(-1)]! : b) + e
      const trace: ReconStep[] = [
        { rule: rule.id, from: stem.old, to: `*-${model.type} · зразок ${model.lemma}`, cite: [rule.cite] },
        { rule: 'MOR-TAB', from: `${b}- + -${e}`, to: vel ? `${b}${e}` : form, cite: [cell.cite] },
      ]
      if (vel) trace.push({ rule: 'MOR-VEL', from: `${b}${e}`, to: form, cite: [VEL_WUK, modelByLemma['рѣка']!.cells['sg.dat']!.cite] })
      forms.push({ form, variant: forms.length > 0, method: 'reconstruction', trace })
    }
    out.push({ key, forms })
  }
  return out
}

/** EP-5.5: a reconstructed form is confirmed by the attested spelling(s) of the SAME cell whose confirmNorm equals its own; the same spelling in another cell does not confirm. Returns new cells. */
export function confirm(cells: ReconCell[], p: EpochParadigm | undefined): ReconCell[] {
  if (!p) return cells
  return cells.map(c => {
    const att = p.cells.find(x => x.key === c.key)?.forms ?? []
    return { ...c, forms: c.forms.map(f => { const by = att.filter(a => confirmNorm(a.raw) === confirmNorm(f.form)); return by.length ? { ...f, confirmedBy: by } : f }) }
  })
}
