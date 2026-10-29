/**
 * Songs (SPEC 60 NW-7; research/17 round 3). Pure data + checks: no node or DOM imports.
 *
 * > "Old folk texts and pre-1900 collections (Максимович 1834, Kolberg 1882): quote with edition and page; public domain.
 * >  Authored modern text …: at most 2 consecutive lines as a quotation plus a link to the source; never the full text. Store video ids and links, never audio.
 * >  Tag each witness `licence: pd-text | quote-only | link-only`." — research/17 R3-6
 * > "Both channels re-upload other people's recordings; ids are pointers, not a licence." — research/17 R3-2
 *
 * Only «Ой на горі та й женці жнуть» has a public-domain printed text that was fetched (Максимович 1834); it is ingested as a witness (pipelines/nw-songs.ts).
 * Every other song is metadata: ≤ 2 quoted lines where a verbatim line was fetched, the earliest publication where research/17 names one, and the YouTube ids whose oEmbed answered 200
 * on 2026-10-12 (title and uploader as oEmbed returned them). Statements read only second-hand stay [P]/[U] and say so.
 */
import { P, Q, type Evidence } from './evidence.ts'

export type SongLicence = 'pd-text' | 'quote-only' | 'link-only'
export interface SongMedia { kind: 'youtube'; id: string; url: string; title: string; uploader: string; role: 'recording' | 'arrangement'; verified: string }
export interface SongQuote { text: string; evidence: Evidence }
export interface Song {
  id: string; title: string
  /** folk = anonymous / collected (witness «народна пісня (регіон)» when a PD text is ingested); authored = a named author; arrangement = folk text, modern performing version */
  kind: 'folk' | 'authored' | 'arrangement'
  genre: string
  region?: string
  /** earliest printed/recorded text research/17 names, with the tag of how it was checked */
  earliest?: { date: string; what: string; check: 'Q' | 'P' | 'U' }
  authorship?: string
  licence: SongLicence
  /** ≤ 2 consecutive lines of a text that is not public domain */
  quotes: SongQuote[]
  media: SongMedia[]
  /** id of the ingested witness (data/work/<id>.json), when the PD text is in the corpus */
  witness?: string
  /** SRC-28: the manuscript the text comes from; shelfmark «?» when no citable source gives it */
  manuscript?: { type: string; name: string; shelfmark: string; holder: string; dating: string; notation: string; photo: string }
  note?: string
  evidence: Evidence[]
}

const WS = (t: string) => `https://uk.wikisource.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`
const YTW = (id: string) => `https://www.youtube.com/watch?v=${id}`
const V = '2026-10-12'
const yt = (id: string, title: string, uploader: string, role: SongMedia['role'] = 'recording'): SongMedia => ({ kind: 'youtube', id, url: YTW(id), title, uploader, role, verified: V })

export const SONGS: Song[] = [
  {
    id: 'oy-na-hori', title: 'Ой на горі та й женці жнуть', kind: 'folk', genre: 'історична козацька пісня', region: 'Гетьманщина (сюжет); найдавніший запис — Галичина',
    earliest: { date: '1834', what: 'Максимович М. Украинскія народныя пѣсни. Москва, 1834, «О Грицькѣ Сагайдачномъ» (друк. с. 105–106)', check: 'Q' },
    licence: 'pd-text', witness: 'song_zhentsi', quotes: [],
    media: [yt('ojtOxnv8CL0', 'Ой на горі та женці жнуть (Ukrainian Cossack song)', '1nn234'), yt('PEUzUK5vRzY', 'Ой, на горі, та й женці жнуть (Ukrainian Cossack song)', 'Dan Chenko')],
    note: 'варіант Домініка Рудницького 1713 (Wiersze różne…) — лише з переказу uk.wikipedia, не бачений [P]; текст у корпусі — друк 1834 р., а не пісня XVII ст.',
    evidence: [Q('WS', WS('Украинскія народныя пѣсни/О Грицькѣ Сагайдачномъ'), '1834 Украинскія народныя пѣсни — О Грицькѣ Сагайдачномъ'), P('WPUK', 'https://uk.wikipedia.org/wiki/Ой_на_горі_та_й_женці_жнуть', 'найдавніший варіант — Домінік Рудницький, 1713', 'research/17 R3-3; не перевірено за первинним джерелом')],
  },
  ...([
    ['zazhuryla', 'Зажурилась Украина, що нѣгдѣ ся-дѣти', 'Зажурилась Україна, що нігде ся діти', 'з с. 108'],
    ['zasvystaly', 'Засвистали козаченьки', 'Засвистали козаченьки', 'з с. 140'],
    ['baida', 'О козакѣ Байдѣ', 'Пісня про козака Байду', 'с. 106–107'],
    ['yikhav', 'Ѣхавъ Козакъ за Дунай', 'Їхав козак за Дунай', 'з с. 141'],
  ] as const).map(([k, sub, title, pg]): Song => ({
    id: `max1834-${k}`, title, kind: 'folk', genre: 'народна пісня (друк 1834)',
    earliest: { date: '1834', what: `Максимович М. Украинскія народныя пѣсни. Москва, 1834, «${sub}» (друк. ${pg})`, check: 'Q' },
    licence: 'pd-text', witness: `song_${k}`, quotes: [], media: [],
    note: 'повний текст друку 1834 р. у корпусі (суспільне надбання); регіон запису й дата створення пісні у виданні не названі — не вигадуємо; найраніший відомий нам друк, не обов’язково найраніший запис',
    evidence: [Q('WS', WS('Украинскія народныя пѣсни/' + sub), 'Украинскія народныя пѣсни (1834).djvu', 'індекс скану-джерела на Вікіджерелах: рік друку 1834')],
  })),
  {
    id: 'hey-hu-hey-ha', title: 'Гей-гу, гей-га', kind: 'authored', genre: 'пластова / повстанська пісня', region: 'Галичина (Пласт)',
    earliest: { date: '1930', what: 'слова й музика Тараса Крушельницького, курінь «Лісові чорти» (WikiSpiv, за pisni.org.ua/songs/642.html)', check: 'P' },
    authorship: 'Тарас Крушельницький (за WikiSpiv); варіант «Бандера поведе нас» пізніший і спірний', licence: 'quote-only',
    quotes: [{ text: 'Гей-гу, гей-га, таке-то в нас життя. / Наплечники готові, прощай моє дівча!', evidence: Q('WS', WS('Гей-гу, гей-га'), 'Гей-гу, гей-га, таке-то в нас життя. / Наплечники готові, прощай моє дівча!') }],
    media: [yt('GjHMbwLL5k4', 'Гей гу, гей га! - Українська повстанська пісня', 'Malyarevsky'), yt('qSEjpKZ2_ho', 'Гей-гу гей-га (пісня УПА)', 'Тракоел-Україна')],
    note: 'статус суспільного надбання тексту не перевірено [U] — тому лише цитата ≤ 2 рядків',
    evidence: [P('WIKISPIV', 'https://wikispiv.com', 'слова і музика Тарас «Чача» Крушельницький, створено на човні в Поліссі 1930 р.', 'research/17 R3-3, переказ сторінки WikiSpiv')],
  },
  {
    id: 'mykolay-1690s', title: 'Ой, хто, хто Николая любить', kind: 'folk', genre: 'кант до св. Миколая (нотований)', region: 'Львів (Галичина)',
    earliest: { date: '1690-ті', what: 'рукопис нотного пісенника 1690-х рр., Львів — датування за повідомленням власника; наукового опису не знайдено', check: 'P' },
    licence: 'pd-text', witness: 'song_mykolay_1690s', quotes: [], media: [],
    manuscript: {
      type: 'рукопис (нотний пісенник)', name: 'не встановлена (за повідомленням власника — найдавніший збережений український нотований пісенник)', shelfmark: '?', holder: 'Львів (установа не встановлена)',
      dating: '1690-ті (за повідомленням власника)', notation: 'нотоносець із п’яти ліній, ромбічні ноти, текст під нотами; мелодія записана, але не транскрибована',
      photo: 'два фото рукопису від власника корпусу (стор. з нотами та стор. «9»)',
    },
    note: 'повний діпломатичний текст з фото (стор. «9» і сторінка з нотами), [?] = непевне прочитання, не вичитано; шифр і назву рукопису в цитованих джерелах не знайдено — «?», нічого не вигадуємо; пісню не плутати з сучасною колядкою «Ой хто, хто Миколая любить» (фольклорний варіант XX ст.)',
    evidence: [P('OWNER', 'повідомлення власника, 2026-10-28', 'найдавніший збережений український нотований пісенник — рукопис 1690-х рр., зберігається у Львові', 'пошук 2026-10-28 (ЛННБ, RISM, uk.wikipedia, музикознавчі статті) назви й шифру не дав')],
  },
  {
    id: 'duma-mazepy', title: 'Дума гетьмана Мазепи («Всі покою щире прагнуть…»)', kind: 'authored', genre: 'політична дума-пісня (кінець XVII ст.)', region: 'Гетьманщина (Батурин)',
    earliest: { date: 'бл. 1698 (до 1708)', what: 'традиційне датування (Оглоблин: «коло 1698 р.»; К. Меннінг пропонує початок 1670-х — оспорюване); текст зберігся в копії Кочубея, доданій до доносу 1708 р.; друк: Бантыш-Каменский, Источники малороссійской исторіи, ч. 2, Москва 1859, док. 33', check: 'Q' },
    authorship: 'Іван Мазепа — традиційна атрибуція (за показанням Кочубея 1708 р.; автограф не збережено)', licence: 'pd-text', witness: 'song_duma_mazepy', quotes: [],
    media: [{ ...yt('H4ffNF0kAjI', 'Хорея Козацька — Карміна Сарматіка [2009]', 'indifferenteee', 'arrangement'), verified: '2026-10-22' }],
    note: 'авторський вірш, але суспільне надбання (XVII ст.; друк 1859): повний текст у корпусі за копією Кочубея; відео — сучасне виконання «Хореї Козацької» (альбом 2009, дума від 19:33 за вікі-посиланням), сторонній аплоад, не свідчення — як Компаніченко',
    evidence: [Q('OHL', 'http://litopys.org.ua/coss3/ohl19.htm', 'Загалом вважалося, що «Дума» була написана коло 1698 р.'), Q('WS', WS('Источники малороссійской исторіи/2/Слѣдственное дѣло о Кочубеѣ и Искрѣ по доношенію на Гетмана Ивана Мазепу въ измѣнѣ Государю/33'), '33-е. ДУМА ПАНА ГЕТМАНА МАЗЕПЫ, ВЪ КОТОРОЙ ЗНАЧНОЕ ПРОТИВЪ ДЕРЖАВЫ ВЕЛИКАГО ГОСУДАРЯ ОКАЗУЕТСЯ ПРОТИВЛЕНІЕ.')],
  },
  {
    id: 'kto-kripko', title: 'Кто кріпко на Бога уповая', kind: 'authored', genre: 'кант / псалом', region: 'Київська академія, XVIII ст.',
    authorship: 'Феофан Прокопович (1681–1736) за описом відео 1nn234', licence: 'link-only', quotes: [],
    earliest: { date: '?', what: 'найдавніший рукопис чи друк не знайдено', check: 'U' },
    media: [yt('oK_CxBm_0fg', 'Кто кріпко на Бога уповая (Старовинний кант, XVIIIст.)', '1nn234'), yt('C9oR-7jPvAk', 'Хорея Козацька - "Кто кріпко на Бога уповая"(HD!)', 'mitka48', 'arrangement')],
    evidence: [P('YT', YTW('oK_CxBm_0fg'), 'Кант, слова Феофана Прокоповича (1681–1736)', 'атрибуція — з опису відео; текст не прочитано в первинному виданні')],
  },
  {
    id: 'pid-kamentsem', title: 'Під Каменцем, під Подільським', kind: 'arrangement', genre: 'лицарська пісня XVII ст. (Хорея Козацька)', region: 'Русь Карпатська',
    earliest: { date: 'XIX ст.', what: 'запис Оскара Кольберґа (том і рік не названо в описі відео)', check: 'P' },
    authorship: 'анонім; слова за записом О. Кольберґа; музика Олекса Мишанич («З гір Карпатських», Ужгород 1981); реконструкція Т. Компаніченко', licence: 'link-only', quotes: [],
    media: [yt('rejTfcjR8nc', 'Під Каменцем, під Подільським | Хорея Козацька | Проєкт «Відлуння Вернигори»', 'Польський інститут у Києві', 'arrangement'), yt('dbdIPnH4eUE', '«Під Каменцем, під Подольським» - русинська лицарська пісня (XVII ст.)', 'Русинська музика Козацької доби')],
    evidence: [P('YT', YTW('rejTfcjR8nc'), '(ХVІІ ст.) / Анонім. Слова: запис Оскара Кольберґа. Русь Карпатська.', 'опис відео Польського інституту; том Кольберґа не названо [U]')],
  },
  {
    id: 'duma-pro-baturyn', title: 'Дума про Батурин', kind: 'authored', genre: 'авторська пісня', region: 'Київ',
    earliest: { date: '1999–2000', what: 'слова й музика Тараса Компаніченка (uk.wikipedia «Дума про Батурин»)', check: 'Q' },
    authorship: 'Тарас Компаніченко', licence: 'quote-only',
    quotes: [{ text: 'Спи, дитя моє кохане, люлі, люлі, бай, / Заглядає місяць ясний в наш убогий рай.', evidence: Q('WPUK', 'https://uk.wikipedia.org/wiki/Дума_про_Батурин', 'Спи, дитя моє кохане, люлі, люлі, бай, / Заглядає місяць ясний в наш убогий рай.') }],
    media: [yt('dqeQ8uS5zpI', 'Дума про Батурин (Старовинна козацька дума, XVIIIст.)', '1nn234')],
    note: 'відео називає пісню «старовинною козацькою думою XVIII ст.» — це помилка підпису; авторську пісню створено 1999–2000 рр.',
    evidence: [Q('WPUK', 'https://uk.wikipedia.org/wiki/Дума_про_Батурин', 'авторська пісня', 'research/17 R3-3: слова й музика Т. Компаніченка, 1999–2000')],
  },
  {
    id: 'pokhid-druzhynnykiv', title: 'Похід дружинників («Й-а в поли, в поли, близько дороги»)', kind: 'arrangement', genre: 'колядка (воїнська), аранжування Хорея Козацька', region: 'Покуття',
    earliest: { date: '1882', what: 'Kolberg O. Pokucie, t. 1, Kraków 1882 (за uk.wikipedia «Й-а в поли, в поли, близько дороги»)', check: 'P' },
    licence: 'link-only', quotes: [],
    media: [yt('u2UD7itFbDU', 'Похід дружинників ("Хорея Козацька")', '1nn234', 'arrangement'), yt('EKBdehCVwq8', 'Йа в поли в поли — Похід дружинників | Давня воїнська колядка', 'Lemberger Kosak', 'arrangement')],
    note: 'текст Кольберґа не отримано; альбом «Рицер Смілостю Упоєнний» (2009)',
    evidence: [P('WPUK', 'https://uk.wikipedia.org/wiki/Й-а_в_поли,_в_поли,_близько_дороги', 'варіант записав Оскар Кольберг, «Покуття», т. 1, Краків 1882', 'research/17 R3-3')],
  },
  {
    id: 'de-yest-rus-otchyna', title: 'Де єсть Руська отчина', kind: 'authored', genre: 'галицько-руська патріотична пісня', region: 'Галичина',
    earliest: { date: '1849', what: 'слова і музика Івана Гушалевича (за назвами відео); первинну публікацію не знайдено', check: 'P' },
    authorship: 'Іван Гушалевич (за підписами відео) — не XVII ст., як у запиті', licence: 'link-only', quotes: [],
    media: [yt('l-y8FUIJ-eU', 'Хорея козацька - Де єсть руська отчина HD', 'UkrainianCulture', 'arrangement'), yt('xPujhnUghCk', '"Where Is the Ruthenian Fatherland?" - Galician-Ruthenian Patriotic Song', 'Frankotyk'), yt('weUrJxvjP10', '"Де є руська отчина?" - слова і музика Івана Гушалевича.  Виконує ансамбль "Львівське ретро"', 'Oles Ivaniv')],
    evidence: [P('YT', YTW('weUrJxvjP10'), 'слова і музика Івана Гушалевича', 'з назви відео; uk.wikipedia про Гушалевича цієї пісні не називає [U]')],
  },
  {
    id: 'hey-vidchyniaite', title: 'Гей, відчиняйте до свободи браму («Хлопці з лісу»)', kind: 'authored', genre: 'повстанська пісня сотні «Левів»', region: 'Львів',
    authorship: 'автор і дата не знайдені [U]; вочевидь сучасна', licence: 'quote-only',
    quotes: [{ text: "Гей, відчиняйте до свободи браму, / Кров'ю свячені золоті ключі:", evidence: Q('YT', YTW('5Pchv7llNis'), "Гей, відчиняйте до свободи браму, / Кров'ю свячені золоті ключі:") }],
    media: [yt('5Pchv7llNis', '"Хлопці з лісу" - пісня Сотні "Левів" - підрозділу УПА', 'Український Повстанець'), yt('HzMYuHIyE58', 'iNEBO – Хлопці із Лісу (Офіційний кліп)', 'iNEBO')],
    evidence: [Q('YT', YTW('5Pchv7llNis'), "Гей, відчиняйте до свободи браму,", 'початок опису відео (research/17 R3-3)')],
  },
  {
    id: 'marichka-chychery', title: 'Марічка Чичері', kind: 'folk', genre: 'карпатська народна пісня', region: 'Карпати',
    licence: 'link-only', quotes: [],
    media: [yt('e6n6fgmXPCE', 'Ой, Марічко, чичері', 'Борис Сичевський - Topic'), yt('Ueap5-cIDKc', 'ВІА Червона Рута "Ой Марічко чічері"  (R&B, folk-rock, soul) HD', 'DankoLviv', 'arrangement')],
    note: 'перший збирач і дата не знайдені [U]; у виданні 2005 р. Б. Сичевського — «Composer: Народна / Lyricist: Народні»',
    evidence: [P('YT', YTW('e6n6fgmXPCE'), 'Composer: Народна / Lyricist: Народні', 'research/17 R3-3, реліз TM Golden Music')],
  },
  {
    id: 'kniazhat-roskykh', title: 'Княжат роських недармо', kind: 'arrangement', genre: 'панегірична пісня (виконання Хореї Козацької)', region: 'Руські землі',
    licence: 'link-only', quotes: [],
    media: [yt('CGxJMG-W-LY', 'Княжат роських недармо - Хорея козацька', 'Luzanov Illia', 'arrangement')],
    note: 'сторонній аплоад, не канал ансамблю; тексту й автора на Вікіджерелах/WikiSpiv/uk.wikipedia не знайдено [U]',
    evidence: [Q('YT', YTW('CGxJMG-W-LY'), 'Княжат роських недармо - Хорея козацька', 'oEmbed title, 2026-10-12')],
  },
]

/** Channel self-descriptions of contemporary artists (P-2: «channel self-description» only, research/17 R3-5). */
export const ARTISTS: { name: string; channel: string; quote: string }[] = [
  { name: 'Скрябін', channel: 'https://www.youtube.com/@kuzmenkoandriy', quote: 'СКРЯБІН - один з найвідоміших гуртів України.' },
  { name: 'Океан Ельзи', channel: 'https://www.youtube.com/@okeanelzyofficial', quote: 'Офіційний YouTube канал групи "Океан Ельзи"' },
  { name: 'Воплі Відоплясова', channel: 'https://www.youtube.com/@VopliVidopliassova', quote: 'Воплі Відоплясова — український рок-гурт, створений у 1986 році.' },
  { name: 'ДахаБраха', channel: 'https://www.youtube.com/@DakhaBrakha', quote: 'Official YouTube channel of Ukrainian «ethnic chaos» band DakhaBrakha.' },
  { name: 'Гайдамаки', channel: 'https://www.youtube.com/@HAYDAMAKY', quote: 'Український етно-рок гурт Гайдамаки' },
  { name: 'Тартак', channel: 'https://www.youtube.com/@TartakUA', quote: 'Канал культового українського гурту Тартак.' },
  { name: 'Антитіла', channel: 'https://www.youtube.com/@ANTYTILA', quote: 'Український поп рок-гурт, заснований у 2008 році в Києві.' },
]

export interface SongsFile { format: 1; generated: string; policy: string; songs: Song[]; artists: typeof ARTISTS }
export const SONGS_POLICY = 'Старі народні тексти й збірки до 1900 р. — суспільне надбання (цитуються з виданням і сторінкою); авторські тексти — не більше 2 суміжних рядків + посилання; відео — лише вбудований програвач за id, аудіо не зберігається; id — вказівник, не ліцензія.'

/** Number of non-empty lines of a quotation (≤ 2 for anything that is not public domain). */
export const quoteLines = (s: string) => s.split(/\s*\/\s*|\n/).filter(x => x.trim()).length
