/**
 * SPEC 63 CX-2 — uk.wikisource first (or early) editions in the original orthography, proofread from scans; authors already vetted in authors.ts (SPEC 00 P-2).
 * Every unit: dateCite = a verbatim line of the work's title page as transcribed on Wikisource (title page of the print itself), `orth` = the Wikisource header
 * «Цей текст написаний …» (ярижка / максимовичівка / кулішівка / желехівка) which selects the cited folds in core/orthography.ts.
 * > "Use first editions on uk.wikisource instead: «З вершин і низин» 1893, «Мойсей» 1905." — research/06b §2
 * > "Proofread from scans." — research/06b §3
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

const WS = (t: string) => `https://uk.wikisource.org/wiki/${t}`

export const UNITS_CX: Unit[] = [
  { id: 'kobzar1840', title: 'Шевченко. Кобзарь (1840)', author: 'shevchenko', kind: 'wikisource', urls: [WS('Кобзарь_(1840)')], discover: 'wikisource-prefix',
    date: [1840, 1840], dateCite: Q('WS', WS('Кобзарь_(1840)'), 'КОБЗАРЬ Т. ШЕВЧЕНКА. САНКТПЕТЕРБУРГ Ъ. 1840. ВЪ ТИПОГРАФІИ Е. ФИШЕРА.'),
    lang: 'uk', region: 'Київщина', witnessType: 'first_ed', edition: 'СПб. 1840, в типографії Е. Фішера (цензура 12.II.1840)', orth: 'ярижка', license: 'PD' },
  { id: 'kobzar1876', title: 'Шевченко. Кобзарь (Прага 1876, т. 1–2)', author: 'shevchenko', kind: 'wikisource', urls: [WS('Кобзарь_(1876)')], discover: 'wikisource-prefix',
    date: [1876, 1876], dateCite: Q('WS', WS('Кобзарь_(1876)'), 'Т. Г. ШЕВЧЕНКО. КОБЗАРЬ З ДОДАТКОМ СПОМИНОК ПРО ШЕВЧЕНКА У ПРАЗІ. Nákladem knihkupectví dra Grégra a Ferd. Dattla 1876.'),
    lang: 'uk', region: 'Київщина', witnessType: 'later_ed', edition: 'Прага 1876, накладом книгарні Грегра і Датла (тексти Шевченка; етимологічний правопис з ъ ы ѣ ё)', orth: 'максимовичівка', license: 'PD' },
  { id: 'boa1884', title: 'Франко. Boa constrictor (1884)', author: 'franko', kind: 'wikisource', urls: [WS('Boa_Constrictor_(1884)')], discover: 'wikisource-prefix',
    date: [1884, 1884], dateCite: Q('WS', WS('Boa_Constrictor_(1884)'), 'BOA CONSTRICTOR повѣсть Ивана Франка. Накладомъ редакціи „Зорѣ“.'),
    lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1884, накладом редакції «Зорі» (Бібліотека «Зорі»), друк. Ставропігійського Інституту', orth: 'максимовичівка', license: 'PD' },
  { id: 'nechuy1879', title: 'Нечуй-Левицький (Иван Левіцький). Кайдашева сімя̀ (1879)', author: 'nechuy', kind: 'wikisource', urls: [WS('Кайдашева_сімя̀')], discover: 'wikisource-prefix',
    date: [1879, 1879], dateCite: Q('WS', WS('Кайдашева_сімя̀'), 'КАЙДАШЕВА СІМ Я ̀ . ПОВІСТЬ Ивана Левіцького . ЛЬВІВ. З друкарні Товариства имени Шевченка, під зарядом К. Беднарського . 1879.'),
    lang: 'uk', region: 'Київщина', witnessType: 'first_ed', edition: 'Львів 1879, Товариство ім. Шевченка (під псевдонімом Иван Левіцький)', orth: 'кулішівка', license: 'PD' },
  { id: 'kulish1862', title: 'Куліш. Дівоче серце (1862)', author: 'kulish', kind: 'wikisource', urls: ['https://uk.wikisource.org/w/index.php?title=%D0%94%D1%96%D0%B2%D0%BE%D1%87%D0%B5_%D1%81%D0%B5%D1%80%D1%86%D0%B5&action=render'],
    date: [1862, 1862], dateCite: Q('WS', WS('Дівоче_серце'), 'ДІВОЧЕ СЕРЦЕ . ИДИЛІЯ П. КУЛІША . Передруковано зъ „Вечерниць“'),
    lang: 'uk', region: 'Чернігівщина', witnessType: 'later_ed', edition: 'Львів 1862 (передрук з «Вечерниць»)', orth: 'кулішівка', license: 'PD' },
  { id: 'franko1902', title: 'Франко. Панталаха і иньші оповіданя (1902)', author: 'franko', kind: 'wikisource', urls: [WS('Панталаха_і_иньші_оповіданя')], discover: 'wikisource-prefix',
    date: [1902, 1902], dateCite: Q('WS', WS('Панталаха_і_иньші_оповіданя'), 'ІВАН ФРАНКО. Панталаха і иньші оповіданя . НАКЛАДОМ АНТОНА ХОЙНАЦКОГО. ЛЬВІВ 1902.'),
    lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1902, накладом Антона Хойнацького', orth: 'желехівка', license: 'PD' },
  { id: 'franko1903', title: 'Франко. Малий Мирон і иньші оповіданя (1903)', author: 'franko', kind: 'wikisource', urls: [WS('Малий_Мирон_і_иньші_оповіданя')], discover: 'wikisource-prefix',
    date: [1903, 1903], dateCite: Q('WS', WS('Малий_Мирон_і_иньші_оповіданя'), 'ІВАН ФРАНКО. МАЛИЙ МИРОН І ИНЬШІ ОПОВІДАНЯ. НАКЛАДОМ АНТОНА ХОЙНАЦКОГО. ЛЬВІВ 1903.'),
    lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1903, накладом Антона Хойнацького', orth: 'желехівка', license: 'PD' },
  { id: 'franko1906', title: 'Франко. Манїпулянтка й иньші оповідання (1906)', author: 'franko', kind: 'wikisource', urls: [WS('Манїпулянтка_й_иньші_оповідання')], discover: 'wikisource-prefix',
    date: [1906, 1906], dateCite: Q('WS', WS('Манїпулянтка_й_иньші_оповідання'), 'ІВАН ФРАНКО. МАНЇПУЛЯНТК А Й ИНЬШІ ОПОВІДАННЯ. ЛЬВІВ, 1906.'),
    lang: 'uk', region: 'Галичина', witnessType: 'first_ed', edition: 'Львів 1906, Українсько-руська видавнича спілка', orth: 'желехівка', license: 'PD' },
  { id: 'lesya1899', title: 'Леся Українка. Думи і мрії (1899)', author: 'lesya', kind: 'wikisource', urls: [WS('Думи_і_мрії')], discover: 'wikisource-prefix',
    date: [1899, 1899], dateCite: Q('WS', WS('Думи_і_мрії'), 'ДУМИ І МРІЇ ПОЕЗИЇ Лесї Українки . НАКЛАДОМ УКРАЇНСЬКО-РУСЬКОЇ ВИДАВНИЧОЇ СПІЛКИ зареєстрованої спілки з обмеженою порукою у Львові. 1899.'),
    lang: 'uk', region: 'Волинь', witnessType: 'first_ed', edition: 'Львів 1899, Українсько-руська видавнича спілка', orth: 'желехівка', license: 'PD' },
  { id: 'chaichenko1893', title: 'Грінченко (Василь Чайченко). Під хмарним небом (1893)', author: 'hrinchenko', kind: 'wikisource', urls: [WS('Під_хмарним_небом')], discover: 'wikisource-prefix',
    date: [1893, 1893], dateCite: Q('WS', WS('Під_хмарним_небом'), 'ВАСИЛЬ ЧАЙЧЕНКО. ПІД ХМАРНИМ НЕБОМ. ВІРШІ. Цїна 1 зр. ан. У ЛЬВОВІ, 1893. Накладом Наукового Товариства імени Шевченка.'),
    lang: 'uk', region: 'Слобожанщина', witnessType: 'first_ed', edition: 'Львів 1893, Наукове товариство ім. Шевченка (псевдонім Василь Чайченко)', orth: 'желехівка', license: 'PD' },
  { id: 'eneida1808', title: 'Котляревський. Енеида (1808)', author: 'kotliarevsky', kind: 'wikisource', urls: [WS('Енеїда_(1808)')], discover: 'wikisource-prefix',
    date: [1808, 1808], dateCite: Q('WS', WS('Енеїда_(1808)/I'), 'Енеида на Малороссійскій языкъ перелицїованная — Часть I Іван Котляревський 1808'),
    lang: 'uk', region: 'Полтавщина', witnessType: 'later_ed', edition: 'СПб. 1808 (2-ге вид.; участь автора не з’ясована — research/06b §2: авторизоване видання 1809)', orth: 'ярижка', license: 'PD' },
]

export const AUTHORS_CX: Author[] = []
