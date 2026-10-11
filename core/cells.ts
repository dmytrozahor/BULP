/**
 * Cell keys of the historical paradigms (SPEC 50 EP-1.2) and the decoders from tag sources (EP-2.2). Pure: shared by the build and the browser.
 * Noun key = `${num}.${case}`, num ∈ sg|du|pl, case ∈ nom|gen|dat|acc|ins|loc|voc; the dual has three merged cells (PAVL p. 74).
 */
import { D, type Evidence } from './evidence.ts'
import type { CellForm, CellKey, CorpusMeta, EpochParadigms } from './types.ts'

export const CASES = ['nom', 'gen', 'dat', 'acc', 'ins', 'loc', 'voc'] as const
export type Case = (typeof CASES)[number]
export const NUMS = ['sg', 'du', 'pl'] as const
export type Num = (typeof NUMS)[number]
/** PAVL p. 74: «у двоїні існувало тільки три відмінкові форми … називний, знахідний і кличний відмінки; родовий і місцевий відмінки; давальний та орудний відмінки». */
export const DUAL = ['nav', 'gl', 'di'] as const
export type DualCell = (typeof DUAL)[number]
export const DUAL_OF: Record<Case, DualCell> = { nom: 'nav', acc: 'nav', voc: 'nav', gen: 'gl', loc: 'gl', dat: 'di', ins: 'di' }
/** Ukrainian labels, PAVL order Н Р Д З О М К (rows of src/lib/paradigm.ts use the same names). */
export const CASE_UK: Record<Case, string> = { nom: 'Називний', gen: 'Родовий', dat: 'Давальний', acc: 'Знахідний', ins: 'Орудний', loc: 'Місцевий', voc: 'Кличний' }
export const DUAL_UK: Record<DualCell, string> = { nav: 'Н. З. К.', gl: 'Р. М.', di: 'Д. О.' }

/** Noun cell key from (number, case); dual cases are merged. */
export const nounKey = (num: Num, c: Case): CellKey => (num === 'du' ? `du.${DUAL_OF[c]}` : `${num}.${c}`)
/** All 17 noun cell keys in display order: sg 7, du 3, pl 7. */
export const NOUN_KEYS: CellKey[] = [...CASES.map(c => `sg.${c}`), ...DUAL.map(d => `du.${d}`), ...CASES.map(c => `pl.${c}`)]
export const isNounKey = (k: CellKey): boolean => NOUN_KEYS.includes(k)
export function parseNounKey(k: CellKey): { num: Num; cell: Case | DualCell } | undefined {
  const [n, c] = k.split('.')
  if (n === 'du') return (DUAL as readonly string[]).includes(c ?? '') ? { num: 'du', cell: c as DualCell } : undefined
  return (n === 'sg' || n === 'pl') && (CASES as readonly string[]).includes(c ?? '') ? { num: n, cell: c as Case } : undefined
}

// ── decoders (EP-2.2): tag source → grid + cell keys. Tables = research/11 §4 (PROIEL = TOROT header lines 60–160; UD values as observed; VESUM per research/02 §2). ──
export type Grid = 'noun' | 'adj' | 'pron' | 'verb'
/** `grid` undefined = the tag belongs to no grid we place (conjunction, numeral …); `under` = too vague to place (EP-2.3: value x/z, or more than 4 candidate cells).
 *  Phase 1 places nouns only: other grids give keys [] (phase 2/3 extend the key grammar). */
export interface Decoded { grid?: Grid; keys: CellKey[]; amb: number; under?: boolean; gender?: 'm' | 'f' | 'n' }
export const MAX_AMB = 4

const placed = (keys: CellKey[], gender?: Decoded['gender']): Decoded => {
  const u = [...new Set(keys)]
  return !u.length || u.length > MAX_AMB ? { grid: 'noun', keys: [], amb: 0, under: true, gender } : { grid: 'noun', keys: NOUN_KEYS.filter(k => u.includes(k)), amb: u.length, gender }
}
const cross = (nums: Num[], cases: Case[]) => nums.flatMap(n => cases.map(c => nounKey(n, c)))
const other = (grid?: Grid): Decoded => ({ grid, keys: [], amb: 0 })

/** PROIEL case letters → compatible cases. `o` (oblique) = every non-nominative case: 5 candidates, so dropped as underspecified (but 3 in the dual after merging). */
const PCASE: Record<string, Case[]> = { n: ['nom'], a: ['acc'], g: ['gen'], d: ['dat'], i: ['ins'], l: ['loc'], v: ['voc'], c: ['gen', 'dat'], e: ['acc', 'dat'], o: ['acc', 'gen', 'dat', 'ins', 'loc'] }
const PNUM: Record<string, Num> = { s: 'sg', d: 'du', p: 'pl' }
const PGEN: Record<string, 'm' | 'f' | 'n'> = { m: 'm', f: 'f', n: 'n' }
const PPOS: Record<string, Grid | undefined> = { Nb: 'noun', Ne: 'noun', 'A-': 'adj', Pp: 'pron', Pd: 'pron', Ps: 'pron', Pr: 'pron', Pk: 'pron', Pi: 'pron', Pt: 'pron', Px: 'pron', Pc: 'pron', 'V-': 'verb' }

/** TOROT / PROIEL positional tag `"<pos> <person><number><tense><mood><voice><gender><case><degree><strength><inflection>"`, e.g. `"Nb -d---fa--i"` → du.nav. */
export function cellsFromProiel(morph: string): Decoded {
  const [pos = '', f = ''] = morph.trim().split(/\s+/), grid = PPOS[pos]
  if (grid !== 'noun') return other(grid)
  const num = PNUM[f[1] ?? '']
  return placed(num ? cross([num], PCASE[f[6] ?? ''] ?? []) : [], PGEN[f[5] ?? ''])
}

const UPOS: Record<string, Grid> = { NOUN: 'noun', PROPN: 'noun', ADJ: 'adj', PRON: 'pron', DET: 'pron', VERB: 'verb', AUX: 'verb' }
const UCASE: Record<string, Case> = { Nom: 'nom', Gen: 'gen', Dat: 'dat', Acc: 'acc', Ins: 'ins', Loc: 'loc', Voc: 'voc' }
const UNUM: Record<string, Num> = { Sing: 'sg', Dual: 'du', Plur: 'pl' }
const UGEN: Record<string, 'm' | 'f' | 'n'> = { Masc: 'm', Fem: 'f', Neut: 'n' }
/** Stanza UD output (model, P-1.7): `cellsFromUd('NOUN', 'Case=Ins|Gender=Fem|Number=Dual')` → du.di. Comma lists (`Case=Acc,Nom`) are ambiguity. */
export function cellsFromUd(upos: string, feats: string | null | undefined): Decoded {
  const grid = UPOS[upos]
  if (grid !== 'noun') return other(grid)
  const f = Object.fromEntries((feats ?? '').split('|').filter(Boolean).map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)] as [string, string] }))
  const list = <T>(k: string, m: Record<string, T>) => (f[k] ?? '').split(',').map(v => m[v]).filter((x): x is T => x !== undefined)
  const g = list('Gender', UGEN)
  return placed(cross(list('Number', UNUM), list('Case', UCASE)), g.length === 1 ? g[0] : undefined)
}

const VCASE: Record<string, Case> = { v_naz: 'nom', v_rod: 'gen', v_dav: 'dat', v_zna: 'acc', v_oru: 'ins', v_mis: 'loc', v_kly: 'voc' }
const VPOS: Record<string, Grid> = { noun: 'noun', adj: 'adj', verb: 'verb' }
/** VESUM tag lines of the lemma that list the attested spelling (research/02 §2): singular lines carry gender m/f/n, plural lines `p`; every line gives one (number, case) key. The first line decides the grid. */
export function cellsFromVesum(tagLines: string[]): Decoded {
  const lines = tagLines.map(l => l.split(':')), first = lines[0]
  const grid = !first ? undefined : first.includes('&pron') ? 'pron' : VPOS[first[0] ?? '']
  if (grid !== 'noun') return other(grid)
  const keys: CellKey[] = [], genders = new Set<'m' | 'f' | 'n'>()
  for (const t of lines) {
    if (t[0] !== 'noun' || t.includes('&pron')) continue
    const num: Num = t.includes('p') ? 'pl' : 'sg'
    for (const c of t.flatMap(x => x.split('/')).map(x => VCASE[x]).filter((x): x is Case => !!x)) keys.push(nounKey(num, c))
    for (const g of ['m', 'f', 'n'] as const) if (t.includes(g)) genders.add(g)
  }
  return placed(keys, genders.size === 1 ? [...genders][0] : undefined)
}

// ── per-epoch visibility (EP-6.2, EP-6.3): rules shared with the frontend ──
/** EP-6.2: dual column — always in shev.proto/old (PAVL p. 74), never in shev.modern (MH-03 relics note only), elsewhere only if ≥ 1 du.* cell has an attested spelling. */
export function dualShown(epoch: string, p?: { cells: { key: CellKey; forms: unknown[] }[] }): boolean {
  if (epoch === 'shev.proto' || epoch === 'shev.old') return true
  if (epoch === 'shev.modern') return false
  return !!p?.cells.some(c => c.key.startsWith('du.') && c.forms.length > 0)
}
/** EP-6.3: an epoch whose corpus has no witness (epochSizes[epoch] absent or 0) is a disabled tab. */
export const epochDisabled = (epoch: string, epochSizes: Record<string, number>): boolean => !((epochSizes[epoch] ?? 0) > 0)

// ── cell evidence (EP-2.5) ──
export const SRC_NOTE: Record<CellForm['src'], string> = {
  torot: 'ручна розмітка TOROT',
  stanza: 'модельна розмітка Stanza, не словниковий факт (P-1.7)',
  vesum: 'аналіз ВЕСУМ сучасного написання',
}
/** D-evidence of one stored spelling: witness, locator, `<raw> «<verbatim tag>»`, source note (+ «текст поза доменом моделі» for out-of-domain Stanza witnesses). */
export function cellEvidence(f: CellForm, ep: Pick<EpochParadigms, 'tags'>, corpus: Pick<CorpusMeta, 'witnesses'>): Evidence {
  const w = corpus.witnesses[f.ex[0]]
  if (!w) throw new Error(`cellEvidence: no witness #${f.ex[0]}`)
  const note = SRC_NOTE[f.src] + (f.src === 'stanza' && w.outOfDomain ? '; текст поза доменом моделі' : '') + (f.amb && f.amb > 1 ? `; розміщено у ${f.amb} можливих клітинках` : '')
  return D(w.id, f.ex[1], `${f.raw} «${ep.tags[f.t] ?? ''}»`, note)
}
