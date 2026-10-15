/**
 * SPEC 63 CX-6 — «Псалтир давньоукраїнський 1643 року (в українській транслітерації)», parafia.org.ua («Наша Парафія», парафія св. Михаїла, Київ-Пирогів),
 * кафісми 1–20 (псалми 1–150). Owner's decision 2026-10-15 (question «чи брати транслітерований Псалтир з parafia.org.ua (ліцензія не вказана)?»): «tak».
 *
 * > "1643 року друкарня Києво-Печерської лаври видала так званий Полуустав — книгу на понад 600 сторінок, де вміщено Псалтир, Часослов, Місяцеслов …" — post of 2016-09-23
 * > "церковнослов’янський текст, транслітерований за всіма правилами, ми подаємо з наголосами" — same post
 * > "це київське видання Псалтиря (1643), а не «всього разом»" — the site owner's reply in the comments of the contents page
 * > "Подаємо молитви із Київського Псалтиря 1715 року, оскільки подібних молитов немає в жодному сучасному Псалтирі." — footnote of every kafisma page: the prayers AFTER each kafisma
 * > are from the 1715 Kyiv Psalter, NOT from the 1643 print → they are not ingested (only the psalm verses are).
 * Dating: ONLY by the edition the site names — Kyiv 1643 (Печерська друкарня, Полуустав під ред. Петра Могили). The witness is a modern transliteration (letters, stress marks), not the print's orthography.
 */
import { Q } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

// registry line belongs to core/sources.ts; registered here so this change does not touch a file other agents are editing (precedent: core/mu-fold.ts RUSL)
if (!SOURCES['PARAFIA']) SOURCES['PARAFIA'] = { title: '«Наша Парафія» (parafia.org.ua): Псалтир давньоукраїнський 1643 року (в українській транслітерації)', url: 'https://parafia.org.ua/biblioteka/bohosluzhbovi-knyzhky/psaltyr-davnoukrajinskyj-1643-roku-v-ukrajinskij-transliteratsiji/', license: 'не вказана; використано з дозволу власника проєкту (2026-10-15)', year: '2016' }

const IDX = SOURCES['PARAFIA']!.url!
export const PSALTER_ART = 'https://parafia.org.ua/2016/09/23/nareshti-opublikovano-davnoukrajinskyj-psaltyr-za-vzirtsem-starodruku-1643-roku/'
export const KAFISMA_SLUGS = ['kafy-sma-pe-rvaya', 'kafy-sma-vto-raya', 'kafy-sma-tre-tyaya', 'kafy-sma-chetve-traya', 'kafy-sma-pya-taya', 'kafy-sma-she-staya', 'kafy-sma-se-dmaya', 'kafy-sma-o-smaya', 'kafy-sma-devya-taya', 'kafy-sma-desya-taya', 'kafy-sma-jedynna-desyataya', 'kafy-sma-dvana-desyataya', 'kafy-sma-tryna-desyataya', 'kafy-sma-chetyrna-desyataya', 'kafy-sma-pyatna-desyataya', 'kafy-sma-shestna-desyataya', 'kafy-sma-sedmna-desyataya', 'kafy-sma-osmna-desyataya', 'kafy-sma-devyatna-desyataya', 'kafy-sma-dvadesya-taya']
/** first psalm of each kafisma (contents page: «Кафисма перва (псалми 1—8)», …) */
export const KAFISMA_FIRST = [1, 9, 17, 24, 32, 37, 46, 55, 64, 70, 77, 85, 91, 101, 105, 109, 118, 119, 134, 143]

export const UNITS_TRANSLIT: Unit[] = [
  { id: 'psalt1643', title: 'Псалтир (Київ 1643, Полуустав), кафісми 1–20 — сучасна транслітерація з наголосами', author: 'kyiv_pechersk_press_1643', kind: 'translit',
    urls: [IDX, ...KAFISMA_SLUGS.map(s => `${IDX}${s}/`), PSALTER_ART],
    date: [1643, 1643], dateCite: Q('PARAFIA', PSALTER_ART, '1643 року друкарня Києво-Печерської лаври видала так званий Полуустав — книгу на понад 600 сторінок, де вміщено Псалтир'), lang: 'chu', region: 'Київ',
    witnessType: 'liturgical-transliteration', edition: 'сучасна транслітерація (parafia.org.ua), не оригінальна орфографія; за київським виданням 1643 р. (Полуустав, Києво-Печерська друкарня); лише псалми, молитви по кафісмах (з Псалтиря 1715) не включено',
    license: 'ліцензія джерела не вказана; використано з дозволу власника проєкту (2026-10-15)' },
]

export const AUTHORS_TRANSLIT: Author[] = [
  { id: 'kyiv_pechersk_press_1643', name: 'Друкарня Києво-Печерської лаври (Полуустав 1643, ред. Петро Могила) — церковнослов’янський Псалтир', life: '1643', label: 'institutional', status: 'provisional', confidence: 'implicit', region: 'Київ',
    evidence: [Q('PARAFIA', PSALTER_ART, '1643 року друкарня Києво-Печерської лаври видала так званий Полуустав'), Q('PARAFIA', IDX + ' (коментарі)', 'це київське видання Псалтиря (1643), а не «всього разом»')],
    note: 'вторинні свідчення (сучасний сайт) → provisional (P-2.1); мова — церковнослов’янська (lang chu) київського видання; текст — не оригінальна орфографія, а транслітерація з наголосами' },
]
