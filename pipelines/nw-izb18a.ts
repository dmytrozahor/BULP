/**
 * SPEC 60 NW-5 (W5) — izbornyk XVIII (old18, research/21) units, group 18a. Data table: every dating quote and every vetting quote is a verbatim
 * fragment of the cached page (tests/nw-izbornyk.test.ts re-checks them). Authors are vetted by (1) a self-identification quote from research/19, else (2) an insider sentence
 * of the text itself («руськ-», «наш-»), else (3) the edition's own biography (→ provisional); with none of these the author is excluded and the page is not ingested.
 */
import { Q } from '../core/evidence.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

export const UNITS_18A: Unit[] = [
  { id: "o18_01", title: "Феофан Прокопович. Епінікіон (1709); За Могилою Рябою (1711)", author: "prokopovych", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old18/old18_01.htm"],
    date: [1709, 1711], dateCite: Q('IZB', "http://izbornyk.org.ua/old18/old18_01.htm", "Написано влітку 1709 р. після Полтавської битви"),
    lang: 'uk', witnessType: 'scholarly_ed', edition: "Українська література XVIII ст., К.: Наукова думка, 1983 (Ізборник; правопис модернізовано)", orth: 'modernised' },
  { id: "o18_17", title: "«Іоанн». Героїчні стихи о славних воєнних дійствіях войськ запорозьких (1784)", author: "ioann", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old18/old18_17.htm"],
    date: [1784, 1784], dateCite: Q('IZB', "http://izbornyk.org.ua/old18/old18_17.htm", "Писано года 1784, місяця августа, дня 21, в Ключу Уманськом."),
    lang: 'uk', witnessType: 'scholarly_ed', edition: "Українська література XVIII ст., К.: Наукова думка, 1983 (Ізборник; правопис модернізовано)", orth: 'modernised' },
  { id: "o18_19", title: "Юліан Добриловський. Пісні", author: "dobrylovsky", kind: 'izbornyk-page', urls: ["http://izbornyk.org.ua/old18/old18_19.htm"],
    date: [1760, 1825], dateCite: Q('IZB', "http://izbornyk.org.ua/old18/old18_19.htm", "український поет і проповідник кінця XVIII — початку XIX ст."),
    lang: 'uk', witnessType: 'scholarly_ed', edition: "Українська література XVIII ст., К.: Наукова думка, 1983 (Ізборник; правопис модернізовано)", orth: 'modernised' },
]

export const AUTHORS_18A: Author[] = [
  { id: "prokopovych", name: "Феофан Прокопович", life: "нар. 1677", label: 'malorossian', status: 'vetted', confidence: 'implicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old18/old18_26.htm", "Іскусен в ученії, красномовством славен; К тому же і страннії ізучи язики, умієт і наш руський.")] },
  { id: "bachynsky", name: "Ілля Бачинський", life: "до 1729", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_04.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "padalsky", name: "Олександр Падальський", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_10.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "levytsky_o", name: "Левицький (автор «Пісні свіцької»)", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_11.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "hryhorii", name: "Григорій (автор «Гей ти, горда дівонько»)", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_12.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "pashkovsky", name: "Іван Пашковський", life: "сер. XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_13.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "kastevych", name: "Федір Кастевич", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_14.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "semerzhynsky", name: "Яків Семержинський", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_15.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "vasyl_p", name: "Василь [Пашковський]", life: "XVIII ст.", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_16.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "ioann", name: "«Іоанн» (священик, автор «Героїчних стихів»)", life: "1784", label: 'malorossian', status: 'provisional', confidence: 'implicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old18/old18_17.htm", "Когда ж Таврією турок возобладал, А Кієв з уділом поляком голодовал, Тогда і козари, храбрії і славні, По всій Україні стали розсіянні.", "мова автора про «Русь/руський» без займенника першої особи")] },
  { id: "holovatyi", name: "Антін Головатий", life: "1744–1798", label: 'malorossian', status: 'excluded', confidence: 'implicit', evidence: [],
    note: 'у тексті сторінки (http://izbornyk.org.ua/old18/old18_18.htm) немає самоідентифікації (Русь/руський/малоросійський/український у голосі автора) і редакторська довідка її не дає (P-2.1); пам’ятку не внесено до корпусу' },
  { id: "dobrylovsky", name: "Юліан Добриловський", life: "бл. 1760–1825", label: 'malorossian', status: 'provisional', confidence: 'implicit',
    evidence: [Q('IZB', "http://izbornyk.org.ua/old18/old18_19.htm (коментар видання)", "Добриловський Юліан — український поет і проповідник кінця XVIII — початку XIX ст. Народився близько 1760 р. на Волині. Помер 1825 р. у Львові. Брав участь у редагуванні почаївського «Богогласника» (1790). Двома виданнями (1792,", "редакторська довідка видання (вторинне свідчення), не самоназва")] },
]
