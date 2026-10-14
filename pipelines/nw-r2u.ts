/**
 * r2u.org.ua dictionaries as `dictionary` witnesses (research/30, research/06 §3.5): one unit per dictionary, dated by its publication years
 * (the printed edition's own years — NOT the age of the words). Authors are the compilers; the author record and the date are cited from the portal's
 * dictionary list (https://r2u.org.ua/main/dicts), which prints «Назва · Автори · Рік видання» for each.
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'
import { R2U_DICTS, type R2uDict } from './r2u.ts'

const LIST = 'https://r2u.org.ua/main/dicts'
const listed = (d: R2uDict) => d.listed.replace(/^.*— «|»$/g, '')
const AUTHOR_OF: Record<number, { id: string; name: string; life: string }> = {
  9: { id: 'dict_umanets', name: 'Михайло Уманець, Андрій Спілка', life: 'словник 1893–98' },
  21: { id: 'dict_zheleh', name: 'Євгеній Желеховський', life: '1844–1885' },
  8: { id: 'dict_nikovsky', name: 'Андрій Ніковський', life: '1885–1942' },
  18: { id: 'dict_hrinch27', name: 'Б. Грінченко, за ред. С. Єфремова, А. Ніковського', life: 'вид. 1927–28' },
  11: { id: 'dict_holoskevych', name: 'Григорій Голоскевич', life: '1884–1938' },
  1: { id: 'dict_krymsky', name: 'Агатангел Кримський, Сергій Єфремов', life: 'словник 1924–33' },
  2: { id: 'dict_izyumov', name: 'Олекса Ізюмов', life: 'словник 1930' },
  5: { id: 'dict_doroshenko', name: 'М. Дорошенко, М. Станиславський, В. Страшкевич', life: 'словник 1930' },
  13: { id: 'dict_yakubski', name: 'С. та О. Якубські', life: 'словник 1928' },
}

export const UNITS_R2U: Unit[] = R2U_DICTS.map((d): Unit => ({
  id: d.unitId, title: `${d.title} (${d.short}, ${d.years[0] === d.years[1] ? d.years[0] : `${d.years[0]}–${d.years[1]}`}) — заголовні слова та відповідники`, author: d.id === 12 ? 'hrinchenko' : AUTHOR_OF[d.id]!.id,
  kind: 'r2u', urls: [d.page], date: d.years,
  dateCite: Q('R2U', LIST, listed(d), 'рік(и) видання друкованого словника, як їх наводить портал'),
  lang: 'uk', witnessType: 'dictionary', orth: d.orth,
  edition: `${d.authors}, ${d.title}, ${d.years[0] === d.years[1] ? d.years[0] : `${d.years[0]}–${d.years[1]}`} (оцифровка r2u.org.ua; лише написання заголовних слів і відповідників та цитата ≤ 300 знаків)`,
  license: 'портал без ліцензії (© r2u.org.ua); друковане видання до 1934 р.; зберігаються лише написання (факти) і цитата ≤ 300 знаків, статті не відтворюються',
}))

export const AUTHORS_R2U: Author[] = R2U_DICTS.filter(d => d.id !== 12).map((d): Author => {
  const a = AUTHOR_OF[d.id]!
  return {
    id: a.id, name: a.name, life: a.life, label: d.id === 18 || d.id === 9 || d.id === 1 || d.id === 5 || d.id === 13 ? 'institutional' : 'ukrainian', status: 'provisional', confidence: 'implicit',
    evidence: [Q('R2U', LIST, listed(d))],
    note: 'укладач словника: свідчення знання лексикографа (research/06 §3.5), witnessType=dictionary — найслабший у tie-break; дата = роки видання словника, не вік слова',
  }
})
