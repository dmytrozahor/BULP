/**
 * SPEC 63 DV-1b — the numeral map: for every cardinal and ordinal numeral, its forms in the dialects. Pure (no node / DOM imports).
 * A cell is (standard numeral, dialect column) and holds the forms found for that dialect, each with its grade and cite. An empty cell is «немає даних», NEVER the standard form and
 * never a form filled by analogy. Grades: dict (a dialect dictionary / en.wiktionary labelled the form), owner (the owner's statement, kind P), corpus (a form identified by a systematic
 * correspondence and attested in the corpus: shown with its distribution over the regions of the witnesses, and graded «гіпотеза» because no dictionary states the identification).
 * The data are lazy: public/data/dv/numerals.json, fetched by the numeral card and the page «Числівники за говорами» only.
 */
export type NumGrade = 'dict' | 'owner' | 'hyp'
export interface NumCol { id: string; name: string; /** how the column is read */ basis: string }
export const NUM_COLS: NumCol[] = [
  { id: 'BOY', name: 'Бойківщина', basis: 'Онишкевич, Словник бойківських говірок (1984)' },
  { id: 'HUT', name: 'Гуцульщина', basis: 'Гуцульські говірки. Короткий словник (1997)' },
  { id: 'ZAK', name: 'Закарпаття', basis: 'Сабадош, Словник закарпатської говірки с. Сокирниця (2008)' },
  { id: 'BUK', name: 'Буковина', basis: 'Словник буковинських говірок (2005)' },
  { id: 'POL', name: 'Полісся', basis: 'Лисенко, Словник поліських говорів (1974)' },
  { id: 'NDN', name: 'Нижня Наддніпрянщина', basis: 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)' },
  { id: 'GAL', name: 'Галичина', basis: 'за свідченням носія (власник)' },
  { id: 'ANY', name: 'діалектне, групу не названо', basis: 'Вікісловник (en), мітка dialectal; ВЕСУМ, мітка arch' },
  { id: 'COR', name: 'корпус (регіон пам’ятки, не говір)', basis: 'форма впізнана за відповідником і засвідчена в корпусі; розподіл за регіонами пам’яток' },
]
export const colOfArea = (area: string): string => {
  const a = area.toLowerCase()
  if (/бойк|онишкевич/.test(a)) return 'BOY'
  if (/гуцул/.test(a)) return 'HUT'
  if (/закарп|сокирн|сабадош/.test(a)) return 'ZAK'
  if (/букови?н|букович/.test(a)) return 'BUK'
  if (/поліс|лисенко/.test(a)) return 'POL'
  if (/наддніпр|чабаненко/.test(a)) return 'NDN'
  if (/галичин|галиц/.test(a)) return 'GAL'
  return 'ANY'
}
export interface NumCell {
  /** the standard form this cell form stands for (a case form of the numeral) */ std: string
  form: string; col: string; grade: NumGrade
  /** source / locator / quote, one line */ cite: string
  /** corpus: tokens, witnesses and the regions of the witnesses by tokens (never a dialect label) */ f?: number; nW?: number; regions?: [string, number][]
  /** the correspondence that identified a corpus form */ via?: string
}
export interface NumRow { lemma: string; kind: 'card' | 'ord'; cells: NumCell[] }
export interface NumeralMap { format: 1; generated: string; cols: NumCol[]; rows: NumRow[] }
export interface NumCoverage {
  lemmas: number; cols: number; cellsTotal: number; cellsFilled: number
  byGrade: Record<NumGrade, number>; byCol: Record<string, number>; formsTotal: number
  /** (standard case form, column) cells: forms that have a dialect form of their own */ formCellsFilled: number
}
/** a cell is (lemma, column); a lemma-column with several forms counts once, a grade counts the cells whose strongest grade it is */
export function coverage(m: NumeralMap): NumCoverage {
  const rank: Record<NumGrade, number> = { dict: 0, owner: 1, hyp: 2 }
  const byGrade: Record<NumGrade, number> = { dict: 0, owner: 0, hyp: 0 }, byCol: Record<string, number> = {}
  let filled = 0, forms = 0
  const formCells = new Set<string>()
  for (const r of m.rows) {
    const cols = new Map<string, NumGrade>()
    for (const c of r.cells) {
      forms++; formCells.add(`${c.std}|${c.col}`)
      const g = cols.get(c.col); if (!g || rank[c.grade] < rank[g]) cols.set(c.col, c.grade)
    }
    for (const [col, g] of cols) { filled++; byGrade[g]++; byCol[col] = (byCol[col] ?? 0) + 1 }
  }
  return { lemmas: m.rows.length, cols: m.cols.length, cellsTotal: m.rows.length * m.cols.length, cellsFilled: filled, byGrade, byCol, formsTotal: forms, formCellsFilled: formCells.size }
}
export const NO_DATA = 'немає даних'
export const GRADE_NUM_UK: Record<NumGrade, string> = { dict: 'за словником', owner: 'за свідченням носія', hyp: 'гіпотеза' }
/** the forms of one lemma grouped by column (the numeral card prints them grouped by dialect) */
export function byColumn(row: NumRow): { col: NumCol; cells: NumCell[] }[] {
  return NUM_COLS.map(col => ({ col, cells: row.cells.filter(c => c.col === col.id) })).filter(x => x.cells.length)
}
/** the forms of a lemma that a dialect switch may use for FORWARD respelling: only a cited dictionary form (or the owner's) of that column, never a hypothesis */
export function respellForms(row: NumRow, colId: string): NumCell[] {
  return row.cells.filter(c => c.col === colId && (c.grade === 'dict' || c.grade === 'owner'))
}
/** merge cells of one (std, form, col): the strongest grade wins, the cites are joined */
export function mergeCells(cells: NumCell[]): NumCell[] {
  const rank: Record<NumGrade, number> = { dict: 0, owner: 1, hyp: 2 }
  const m = new Map<string, NumCell>()
  for (const c of cells) {
    const k = `${c.std}|${c.form}|${c.col}`, o = m.get(k)
    if (!o) { m.set(k, { ...c }); continue }
    if (rank[c.grade] < rank[o.grade]) { o.grade = c.grade }
    if (!o.cite.includes(c.cite)) o.cite += ' · ' + c.cite
    if (c.f && !o.f) { o.f = c.f; o.nW = c.nW; o.regions = c.regions; o.via = c.via }
  }
  return [...m.values()]
}
