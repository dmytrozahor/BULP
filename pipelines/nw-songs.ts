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

export const UNITS_SONGS: Unit[] = [
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
