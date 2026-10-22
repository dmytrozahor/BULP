/**
 * SPEC 60 NW-7 — songs (research/17 round 3). One public-domain printed text was fetched: «Ой на горі та й женці жнуть» in Максимович, «Украинскія народныя пѣсни» (Москва, 1834),
 * section «О Грицькѣ Сагайдачномъ» (uk.wikisource, proofread from the scan; printed page 106). The folk author is an institutional «народна пісня (регіон)» record, provisional:
 * its evidence is the collection's own title and a line of the song naming its milieu (Zaporozhian host under Doroshenko) — both verbatim from the cached page.
 * All other songs are metadata (core/songs.ts), never texts. The witness date is the date of the PRINT (1834), not of the song: the earlier 1713 Galician record is second-hand [P] (research/17).
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

const TITLE = 'Украинскія народныя пѣсни/О Грицькѣ Сагайдачномъ'
export const SONG_ZHENTSI_RENDER = `https://uk.wikisource.org/w/index.php?title=${encodeURIComponent(TITLE.replace(/ /g, '_'))}&action=render`
const PAGE = 'https://uk.wikisource.org/wiki/' + encodeURIComponent(TITLE.replace(/ /g, '_'))

/** BL-18: the other songs of the same 1834 collection that uk.wikisource has proofread (list=allpages, apprefix «Украинскія народныя пѣсни»). */
const COLL = 'Украинскія народныя пѣсни/'
const maxSong = (id: string, sub: string, title: string, pages: string): Unit => {
  const url = `https://uk.wikisource.org/w/index.php?title=${encodeURIComponent((COLL + sub).replace(/ /g, '_'))}&action=render`
  const page = 'https://uk.wikisource.org/wiki/' + encodeURIComponent((COLL + sub).replace(/ /g, '_'))
  return {
    id, title: `${title} (Максимович, Украинскія народныя пѣсни, 1834)`, author: 'folk_maksymovych', kind: 'wikisource', urls: [url],
    date: [1834, 1834], dateCite: Q('WS', page, 'Украинскія народныя пѣсни (1834).djvu', 'індекс скану-джерела на Вікіджерелах: рік друку 1834 у назві'),
    lang: 'uk', witnessType: 'first_ed', orth: 'максимовичівка', license: 'PD',
    edition: `Максимович М. Украинскія народныя пѣсни. Москва, 1834, «${sub}» (друк. ${pages}); збирач — М. Максимович; не дата створення пісні`,
  }
}

/**
 * SG-3 «Дума» Мазепи («Всі покою щире прагнуть…»): the text of the copy in Kochubei's denunciation (1708), as printed by Бантыш-Каменский, Источники малороссийской истории, ч. 2,
 * Москва 1859, док. 33 «Дума Пана Гетмана Мазепы…» (uk.wikisource, proofread from the scan, PD-old; footnote: «По списку руки черненья самаго Кочубея»).
 * Dating = the generally accepted one: Оглоблин (1960; litopys.org.ua/coss3/ohl19.htm): «Загалом вважалося, що «Дума» була написана коло 1698 р.»; Кочубей (допит, квітень 1708) -
 * архімандрит Нікон віддав йому пісню «л Ђ т c десять» тому; К. Меннінг пропонує початок 1670-х (оспорюване). msDate = the denunciation (1708). Kochubei's own closing remark is not Mazepa's text.
 */
const DUMA_TITLE = 'Источники малороссійской исторіи/2/Слѣдственное дѣло о Кочубеѣ и Искрѣ по доношенію на Гетмана Ивана Мазепу въ измѣнѣ Государю/33'
export const DUMA_RENDER = `https://uk.wikisource.org/w/index.php?title=${encodeURIComponent(DUMA_TITLE.replace(/ /g, '_'))}&action=render`
const DUMA_PAGE = 'https://uk.wikisource.org/wiki/' + encodeURIComponent(DUMA_TITLE.replace(/ /g, '_'))
export const DUMA_DATE_CITE = Q('OHL', 'http://litopys.org.ua/coss3/ohl19.htm', 'Загалом вважалося, що «Дума» була написана коло 1698 р.')

export const UNITS_SONGS: Unit[] = [
  {
    id: 'song_duma_mazepy', title: 'Дума гетьмана Мазепи «Всі покою щире прагнуть…» (копія Кочубея, у виданні Бантыша-Каменского 1859)', author: 'mazepa', kind: 'wikisource', urls: [DUMA_RENDER],
    date: [1698, 1698], dateCite: DUMA_DATE_CITE, msDate: 1708,
    lang: 'uk', region: 'Гетьманщина (Батурин)', witnessType: 'ms_copy', orth: 'ярижка', license: 'PD',
    edition: 'Бантыш-Каменский Д. Н. Источники малороссійской исторіи, ч. 2. Москва, 1859, док. 33 (с. 109–110): текст за списком руки Кочубея, додано до доносу 1708 р.; дата твору — традиційна (Оглоблин: коло 1698; К. Меннінг — початок 1670-х), не дата друку',
  },
  maxSong('song_zazhuryla', 'Зажурилась Украина, що нѣгдѣ ся-дѣти', 'Зажурилась Україна, що нігде ся діти', 'з с. 108'),
  maxSong('song_zasvystaly', 'Засвистали козаченьки', 'Засвистали козаченьки', 'з с. 140'),
  maxSong('song_baida', 'О козакѣ Байдѣ', 'О козакові Байді', 'с. 106–107'),
  maxSong('song_yikhav', 'Ѣхавъ Козакъ за Дунай', 'Їхав козак за Дунай', 'з с. 141'),
  {
    id: 'song_zhentsi', title: 'Ой на горі та й женці жнуть (Максимович, Украинскія народныя пѣсни, 1834)', author: 'folk_hetmanate', kind: 'wikisource', urls: [SONG_ZHENTSI_RENDER],
    date: [1834, 1834], dateCite: Q('WS', PAGE, '1834 Украинскія народныя пѣсни — О Грицькѣ Сагайдачномъ'),
    lang: 'uk', witnessType: 'first_ed', orth: 'максимовичівка', license: 'PD',
    edition: 'Максимович М. Украинскія народныя пѣсни. Москва, 1834, «О Грицькѣ Сагайдачномъ» (друк. с. 105–106; djvu 124–125); не дата створення пісні',
    media: { kind: 'youtube', id: 'ojtOxnv8CL0', url: 'https://www.youtube.com/watch?v=ojtOxnv8CL0', attribution: '1nn234 (YouTube); виконання Капели бандуристів ім. Майбороди — запис не є суспільним надбанням, лише вбудовування', licence: 'link-only (відео); текст 1834 — суспільне надбання', title: 'Ой на горі та женці жнуть (Ukrainian Cossack song)' },
  },
]

export const AUTHORS_SONGS: Author[] = [
  {
    id: 'mazepa', name: 'Іван Мазепа (традиційна атрибуція «Думи»)', life: '1639–1709', label: 'ukrainian', status: 'vetted', confidence: 'implicit', region: 'Гетьманщина (Батурин)',
    evidence: [Q('WS', DUMA_PAGE, 'Жалься, Боже, Украины, Що не вкупѣ маеть сыны!')],
    note: 'атрибуція традиційна: Кочубей на допиті (квітень 1708) переказав, що архімандрит Нікон сказав, ніби пісню «скомпоновал он, Гетман» (Оглоблин, litopys.org.ua/coss3/ohl19.htm); у самому тексті — Україна як спільна «мати», до якої він звертається «Жалься, Боже, Украины»; автограф не збережено',
  },
  {
    id: 'folk_maksymovych', name: 'Народна пісня (збірка Максимовича, 1834)', life: 'друк 1834', label: 'institutional', status: 'provisional', confidence: 'implicit',
    evidence: [Q('WS', PAGE, 'Украинскія народныя пѣсни')],
    note: 'анонімні народні пісні в друці М. Максимовича; інституційний автор «народна пісня»; ні регіону запису, ні дати створення видання не називає — не вигадуємо (P-3.1); дата свідка = дата друку',
  },
  {
    id: 'folk_hetmanate', name: 'Народна пісня (Гетьманщина)', life: 'XVII ст.; друк 1834', label: 'institutional', status: 'provisional', confidence: 'implicit',
    evidence: [
      Q('WS', PAGE, 'Украинскія народныя пѣсни під ред. Михайла Максимовича'),
      Q('WS', PAGE, 'Веде́ Запоро̂зське Хороше́нько.'),
    ],
    note: 'анонімна народна пісня, інституційний автор «народна пісня (регіон)»; самоназву дає збірка (Украинскія) і зміст (Запорозьке військо Дорошенка); регіон запису в виданні не названо — не вигадуємо (P-3.1)',
  },
]
