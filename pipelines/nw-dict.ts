/**
 * BL-11: historical dictionaries as `dictionary` witnesses (research/01 §5, research/06 §3.5).
 * Словник староукраїнської мови XIV–XV ст.: archive.org `staroukr1` (т. 1 А–М), `staroukr2` (т. 2 Н–Ф); OCR `<id>_djvu.txt`.
 * Authorship = the institution (Інститут суспільних наук АН УРСР, редколегія), self-identified on the title page of the OCR text.
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

const AD = (id: string) => `https://archive.org/download/${id}/${id}_djvu.txt`
const PERIOD = Q('SUSM14', 'https://archive.org/details/staroukr2, обкладинка (OCR)', 'СЛОВНИК СТАРОУКРАЇНСЬКОЇ МОВИ ХІУ -- ХУ ст.')

export const UNITS_DICT: Unit[] = ['staroukr1', 'staroukr2'].map((id, i): Unit => ({
  id: `dsu14_${i + 1}`, title: `Словник староукраїнської мови XIV–XV ст., т. ${i + 1} (заголовні слова)`, author: 'dict_sum14', kind: 'dict', urls: [AD(id)],
  date: [1301, 1500], dateCite: PERIOD, lang: 'ruthenian', region: 'Україна, молдавська канцелярія', witnessType: 'dictionary',
  edition: 'К.: Наукова думка, 1977–78 (OCR archive.org); лише заголовні слова та рядки заголовків, тексти статей не відтворюються',
  license: 'словник охоронюваний — зберігаються лише заголовні слова (факти) та рядок заголовка',
}))

export const AUTHORS_DICT: Author[] = [
  { id: 'dict_sum14', name: 'Словник староукраїнської мови XIV–XV ст. (редколегія, Інститут суспільних наук АН УРСР)', life: '1977–78', label: 'institutional', status: 'provisional', confidence: 'implicit',
    evidence: [Q('SUSM14', 'https://archive.org/details/staroukr1, титул (OCR)', 'АКАДЕМІЯ НАУК УКРАЇНСЬКОЇ РСР ІНСТИТУТ СУСПІЛЬНИХ НАУК')],
    note: 'словник — свідчення знання лексикографа (research/06 §3.5): witnessType=dictionary, найслабший у tie-break; дата заголовного слова — найраніша цитата статті' },
]
