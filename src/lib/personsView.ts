/** SPEC 63 PS: pure list logic of /persons (filters, sort), testable without a DOM. */
import type { PersonRow } from '../../core/persons.ts'
import { key } from '../../core/text.ts'

export const LANG_UK: Record<string, string> = { uk: 'українська', ruthenian: 'руська (рутенська)', 'chu-rus': 'церковнослов’янська руської редакції', chu: 'церковнослов’янська', orv: 'давньоруська', undetermined: 'не визначена' }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
export const centuryUk = (c: number) => `${ROMAN[c] ?? c} ст.`
export interface PersonFilter { q?: string; century?: number; role?: string; region?: string; identity?: string; lang?: string; collective?: boolean }
const fold = (s: string) => key(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
export function personRows(rows: PersonRow[], f: PersonFilter): PersonRow[] {
  const q = f.q ? fold(f.q) : ''
  return rows.filter(r =>
    (f.collective || r.kind === 'person') && (!q || fold(r.name).includes(q)) && (!f.century || r.c.includes(f.century)) &&
    (!f.role || r.r.includes(f.role)) && (!f.region || r.reg.includes(f.region)) &&
    (!f.identity || (f.identity === '—' ? r.idn === null : r.idn === f.identity)) && (!f.lang || r.lang.includes(f.lang)))
}
export function sortRows(rows: PersonRow[], by: string): PersonRow[] {
  const a = [...rows]
  if (by === 'name') return a.sort((x, y) => x.name.localeCompare(y.name, 'uk'))
  if (by === 'year') return a.sort((x, y) => (x.c[0] ?? 99) - (y.c[0] ?? 99) || (x.b ?? 9999) - (y.b ?? 9999) || y.n - x.n)
  return a.sort((x, y) => y.n - x.n || x.id.localeCompare(y.id))
}
