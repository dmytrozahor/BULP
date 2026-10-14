/**
 * SPEC 60 NW-5 (W5) — izbornyk XIV–XVI (old14_16, research/19) units, group 14b. Data table: every dating quote and every vetting quote is a verbatim
 * fragment of the cached page (tests/nw-izbornyk.test.ts re-checks them). Authors are vetted by (1) a self-identification quote from research/19, else (2) an insider sentence
 * of the text itself («руськ-», «наш-»), else (3) the edition's own biography (→ provisional); with none of these the author is excluded and the page is not ingested.
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

export const UNITS_14B: Unit[] = [
  { id: "i14_27", title: "Смотрицький. «Зри сія знаменія княжате славнаго…» (Острог 1581)", author: "smotrytsky", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_27.htm"],
    date: [1581, 1581], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_27.htm", "Бібліа, сирѣч Книги Ветхаго и Новаго завѣта, по языку словенску... Острог, 1581."),
    lang: 'ruthenian', region: 'Волинь', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_29", title: "Андрій Римша. Хронологія; епіграми на герби (1581–1591)", author: "rymsha", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_29.htm"],
    date: [1581, 1591], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_29.htm", "Вільно, 1591, арк. 2."),
    lang: 'ruthenian', region: 'Вільно', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_32", title: "Із Загоровського збірника", author: "anon_i14_32", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_32.htm"],
    date: [1600, 1699], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_32.htm", "рукописному збірнику XVII ст."),
    lang: 'ruthenian', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_36", title: "Філалет. Книжка до минаючих мовить", author: "filalet", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_36.htm"],
    date: [1598, 1598], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_36.htm", "врихлі дана [Острог, 1598]"),
    lang: 'ruthenian', region: 'Волинь', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_38", title: "Авраам Білобородський. «Нынѣ веселый нам день настал…»", author: "biloborodsky", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_38.htm"],
    date: [1604, 1604], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_38.htm", "у 1604 р. переписав «Учительне євангеліє»"),
    lang: 'ruthenian', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_39", title: "Анонімні вірші (Львів 1609)", author: "anon_i14_39", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_39.htm"],
    date: [1609, 1609], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_39.htm", "Бесѣда избранная о воспитаніи чад. Львів, 1609."),
    lang: 'ruthenian', region: 'Галичина', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
  { id: "i14_40", title: "Афанасій Селецький. «Утверди нас, господи…»", author: "seletsky", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old14_16/old14_40.htm"],
    date: [1610, 1610], dateCite: Q('IZB', "http://izbornyk.org.ua/old14_16/old14_40.htm", "Вірш вміщено у рукописному збірнику 1610 р."),
    lang: 'ruthenian', witnessType: 'scholarly_ed', edition: "Українська література XIV–XVI ст., К.: Наукова думка, 1988 (Ізборник; правопис нормалізовано редакторами)", orth: 'ізборник-нормалізований' },
]

export const AUTHORS_14B: Author[] = [
  { id: "anon_i14_25", name: "Анонім: «А. Аз єсмь всему миру свѣт…» (Буквар, Львів 1574)", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_25.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "zhoravnytsky", name: "Ян Жоравницький", life: "? – 1589", label: 'ruthenian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_26.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "anon_i14_28", name: "Анонім: Вѣрши прикладні", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_28.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "rymsha", name: "Андрій Римша", life: "бл. 1550 – після 1595", label: 'ruthenian', status: 'vetted', confidence: 'explicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old14_16/old14_29.htm", "Писаньє Андрея Рымши")] },
  { id: "anon_i14_30", name: "Анонім: Віршований полемічний комплекс 80–90-х рр. XVI ст.", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_30.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "anon_i14_31", name: "Анонім: Із Києво-Михайлівського збірника", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_31.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "anon_i14_32", name: "Анонім: Із Загоровського збірника", life: "—", label: 'institutional', status: 'provisional', confidence: 'implicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old14_16/old14_32.htm", "ни Пифагор, ниже Аристотель, не обрѣтаєтся духовный сказатель, С которых латины наук ся повчають и безумную Русь к собѣ потягають.", "мова автора про «Русь/руський» без займенника першої особи")] },
  { id: "anon_i14_33", name: "Анонім: Просфонима (Львів 1591)", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_33.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "anon_i14_34", name: "Анонім: Леополіс (Адельфотис, Львів 1591)", life: "—", label: 'institutional', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_34.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "zyzanii_l", name: "Лаврентій Зизаній Тустановський", life: "? – після 1634", label: 'ruthenian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_35.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "nalyvaiko", name: "Даміан Наливайко", life: "? – 1627", label: 'ruthenian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old14_16/old14_37.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "biloborodsky", name: "Авраам Білобородський", life: "поч. XVII ст.", label: 'ruthenian', status: 'vetted', confidence: 'explicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old14_16/old14_38.htm", "мною грѣшным Авраамом Ивановичем Білобородским")] },
  { id: "anon_i14_39", name: "Анонім: Анонімні вірші (Львів 1609)", life: "—", label: 'institutional', status: 'provisional', confidence: 'implicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old14_16/old14_39.htm", "* * * Як лев срокгій над всѣми звѣряти пануєт, Так Львов над всѣ мѣста в князтвѣ Руском продкуєт, В котром то ся братство милости закрѣсльнуло И на герб свой вежу тую так выстрыхнуло.", "мова автора про «Русь/руський» без займенника першої особи")] },
  { id: "seletsky", name: "Афанасій Селецький", life: "поч. XVII ст.", label: 'ruthenian', status: 'vetted', confidence: 'explicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old14_16/old14_40.htm", "Афанасіа, поповича Селецкого")] },
]
