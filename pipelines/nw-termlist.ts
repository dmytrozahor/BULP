/**
 * SPEC 63 CX-6 — «Матеріяли до української технічної термінольоґії», випуск 1: 1/ Рисункові прилади, 2/ Основні частини машин.
 * Прага, 1925. «Видає Комісія для зібрання української термінольоґії в Празі, Р.Ч.С.», «Накладом Технічного Т-ва „Основа“». 300 примірників.
 * Source: the user's scan (29 pp., image-only, no text layer; no public copy located — research/39-term-1925.md); the term lists are TRANSCRIBED FROM THE SCAN BY A MODEL
 * (pipelines/src-mat-term-1925.tsv, not proofread) — the witness edition says so and the data is weighted like OCR.
 * Early Ukrainian technical terminology of the emigré engineers in Czechoslovakia: relevant to the MD (modern/technical vocabulary) work.
 *
 * > title page (p. 1): «ПРАГА Р. 1925. ВИДАЄ КОМІСІЯ ДЛЯ ЗІБРАННЯ УКРАЇНСЬКОЇ ТЕРМІНОЛЬОҐІЇ В ПРАЗІ, Р.Ч.С.»
 * > «Від комісії» (p. 2): «Зібрані матеріали української технічної термінольоґії комісією при тех. т-ві „Основа“ в Празі являються вислідом праці небогатьох членів т-ва»
 * > «Поправки» (p. 26 of the scan): «У словнику перші значіння українські, другі російські, треті чеські, четверті німецькі.»
 */
import { Q } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

// registry line belongs to core/sources.ts; registered here so this change does not touch a file other agents are editing (precedent: core/mu-fold.ts RUSL)
if (!SOURCES['MTT25']) SOURCES['MTT25'] = { title: 'Матеріяли до української технічної термінольоґії, вип. 1: Рисункові прилади; Основні частини машин. Прага: Комісія для зібрання української термінольоґії / Т-во «Основа», 1925 (скан користувача, транскрипція не вичитана)', url: 'https://movahistory.org.ua/index.php/%D0%A1%D0%BB%D0%BE%D0%B2%D0%BD%D0%B8%D0%BA%D0%B8,_%D1%83%D0%BA%D0%BB%D0%B0%D0%B4%D0%B5%D0%BD%D1%96_%D0%B1%D0%B5%D0%B7_%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B8_%D0%A3%D0%9D%D0%A2_%D1%82%D0%B0_%D0%86%D0%A3%D0%9D%D0%9C', year: '1925' }

const CAT = SOURCES['MTT25']!.url!
export const MTT_TITLE = 'ПРАГА Р. 1925. ВИДАЄ КОМІСІЯ ДЛЯ ЗІБРАННЯ УКРАЇНСЬКОЇ ТЕРМІНОЛЬОҐІЇ В ПРАЗІ'

export const UNITS_TERMLIST: Unit[] = [
  { id: 'mtt1925', title: 'Матеріяли до української технічної термінольоґії, вип. 1: Рисункові прилади; Основні частини машин (Прага 1925)', author: 'komisiia_term_praha', kind: 'termlist', urls: [CAT],
    date: [1925, 1925], dateCite: Q('MTT25', 'скан, с. 1 (титул)', MTT_TITLE), lang: 'uk', region: 'Прага (еміґрація)', witnessType: 'dictionary',
    edition: 'Прага: Комісія для зібрання української термінольоґії при Технічному Т-ві «Основа», 1925, 23 с., 300 прим. (на правах рукопису); транскрипція моделлю зі скану (не вичитано)',
    license: 'суспільне надбання (установче видання 1925 р., колективний автор)' },
]

export const AUTHORS_TERMLIST: Author[] = [
  { id: 'komisiia_term_praha', name: 'Комісія для зібрання української термінольоґії в Празі (при Технічному Т-ві «Основа»)', life: '1921–1925', label: 'institutional', status: 'vetted', confidence: 'explicit', region: 'Прага (еміґрація)',
    evidence: [Q('MTT25', 'скан, с. 1 (титул)', MTT_TITLE), Q('MTT25', 'скан, с. 2 («Від комісії»)', 'Зібрані матеріяли української технічної термінольоґії комісією при тех. т-ві „Основа“ в Празі')],
    note: 'українське еміґрантське інженерне товариство в Чехословаччині; автор інституційний (укладачі поіменно не названі, підпис «Від комісії: І. Хмелюк», с. 2) → суспільне надбання' },
]
