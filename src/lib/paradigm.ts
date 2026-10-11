/**
 * Paradigm grids from verbatim VESUM tags (research/02 §1 "The noun paradigm (Словозміна/рука)": header «відмінок | однина | множина»,
 * seven rows: називний, родовий, давальний, знахідний, орудний, місцевий, кличний; verb blocks Інфінітив · Наказовий · Майбутній ·
 * Теперішній · Минулий). Tagset after research/02 §2: "Cases: v_naz v_rod v_dav v_zna v_oru v_mis v_kly … Number is s/p; gender is m/f/n".
 * Cells keep the tag string so the UI can show it verbatim on hover (D-evidence).
 */
export interface PForm { form: string; tags: string }
export interface Grid { id: string; title: string; cols: string[]; rows: { label: string; cells: PForm[][] }[] }

const CASES: [string, string][] = [['v_naz', 'називний'], ['v_rod', 'родовий'], ['v_dav', 'давальний'], ['v_zna', 'знахідний'], ['v_oru', 'орудний'], ['v_mis', 'місцевий'], ['v_kly', 'кличний']]
const T = (p: PForm) => p.tags.split(':')
const has = (p: PForm, ...ts: string[]) => { const t = T(p); return ts.every(x => t.includes(x)) }
const pick = (ps: PForm[], ...ts: string[]) => ps.filter(p => has(p, ...ts))

export const posOf = (ps: PForm[]) => ps[0] ? T(ps[0])[0]! : ''

function noun(ps: PForm[]): Grid[] {
  // VESUM marks the plural with `p`; the singular carries only a gender tag (m/f/n) — «рука noun:inanim:f:v_naz», «руки noun:inanim:p:v_naz»
  const sg = ps.filter(p => !has(p, 'p'))
  return [{ id: 'noun', title: 'Відмінки', cols: ['однина', 'множина'],
    rows: CASES.map(([c, l]) => ({ label: l, cells: [pick(sg, c), pick(ps, c, 'p')] })) }]
}

function adj(ps: PForm[]): Grid[] {
  const base = ps.filter(p => !has(p, 'compc') && !has(p, 'comps'))
  return [{ id: 'adj', title: 'Відмінки і роди', cols: ['чол.', 'жін.', 'сер.', 'множина'],
    rows: CASES.map(([c, l]) => ({ label: l, cells: ['m', 'f', 'n', 'p'].map(g => pick(base, c, g)) })) }]
}

function verb(ps: PForm[]): Grid[] {
  const grids: Grid[] = []
  const inf = pick(ps, 'inf')
  if (inf.length) grids.push({ id: 'inf', title: 'Інфінітив', cols: [''], rows: [{ label: 'інфінітив', cells: [inf] }] })
  for (const [tense, title] of [['pres', 'Теперішній час'], ['futr', 'Майбутній час']] as const) {
    const t = pick(ps, tense)
    if (t.length) grids.push({ id: tense, title, cols: ['однина', 'множина'], rows: ['1', '2', '3'].map(n => ({ label: `${n} особа`, cells: [pick(t, 's', n), pick(t, 'p', n)] })) })
  }
  const past = pick(ps, 'past')
  if (past.length) grids.push({ id: 'past', title: 'Минулий час', cols: ['чол.', 'жін.', 'сер.', 'множина'], rows: [{ label: 'минулий', cells: ['m', 'f', 'n', 'p'].map(g => pick(past, g)) }] })
  const impr = pick(ps, 'impr')
  if (impr.length) grids.push({ id: 'impr', title: 'Наказовий спосіб', cols: ['однина', 'множина'], rows: ['1', '2'].map(n => ({ label: `${n} особа`, cells: [pick(impr, 's', n), pick(impr, 'p', n)] })) })
  return grids
}

const generic = (ps: PForm[]): Grid[] => [{ id: 'list', title: 'Форми', cols: ['теги ВЕСУМ'], rows: ps.map(p => ({ label: p.form, cells: [[p]] })) }]

/** Build the grids for a lemma's VESUM forms. Rows/columns with no forms are kept (shown as «—») except fully empty rows of rare slots. */
export function buildGrids(ps: PForm[]): Grid[] {
  if (!ps.length) return []
  const pos = posOf(ps)
  const grids = pos === 'noun' ? noun(ps) : pos === 'adj' ? adj(ps) : pos === 'verb' ? verb(ps) : generic(ps)
  return grids.map(g => ({ ...g, rows: g.rows.filter(r => r.cells.some(c => c.length) || g.id === 'noun' || g.id === 'adj') })).filter(g => g.rows.length)
}

/** VESUM non-normative marker in a tag string (shown as a flag in the table; D-evidence is the tag itself). */
export const nonNormative = (tags: string) => /:(bad|subst|slang|arch|alt|short|vulg|up92)\b/.test(':' + tags)
