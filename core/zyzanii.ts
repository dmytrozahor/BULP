/**
 * SPEC 63 SRC-28 part 4: what Зизаній's «Граматіка словенска» (Вільно 1596) reveals about the speech of its author's region, as CITED feature rows (YT/DV style: id, dialect group, period, evidence).
 *
 * Biography (research/44): Лаврентій Зизаній — Львів (до 1592) → Берестя (1592–96) → Вільно (1596–97) → Мінськ (1597–1600) → Ярослав (1600–02). He is Galician by his teaching career
 * (Lviv brotherhood school), but the 1596 grammar was written in Brest/Vilnius: the speech it shows is that of a Galician in the north, so a feature is NEVER a plain «Galician» claim.
 * Source of the features: the German introduction (Einleitung §4–5, pp. IX–X) of G. Freidhof's edition (Specimina Philologiae Slavicae 26, Frankfurt a. M. 1980, free download from Peter Lang), which summarises
 * M. Возняк (ЗНТШ 101–102, Львів 1911) and В. Аніченка (Весці АН БССР 1957). The edition's OCR lost the Greek/Cyrillic letters inside the formulas, so only what the German words state is used.
 * Німчук's studies are not accessible to the project (in copyright, not online): nothing is attributed to them.
 * Rule: implement only what a quote supports (the rows below); every other candidate is a HYPOTHESIS (ZYZANII_HYPOTHESES), never shown as a feature. The grammar's own statements about letters
 * need a readable text: the archive.org OCR (gramat0slovenska) is unusable and the project's re-OCR (worker, ~/work/ocr/zyzanii-gramatika1596) is not yet read — a follow-up.
 */
import { Q, type Evidence } from './evidence.ts'
import { SOURCES } from './sources.ts'

if (!SOURCES['FRH80']) SOURCES['FRH80'] = { title: 'Freidhof G. (Hrsg.) Lavrentij Zizanij, Hramatika slovenska, Wilna 1596. Specimina Philologiae Slavicae 26. Frankfurt a. M.: Kubon & Sagner, 1980 (2. Aufl., mit Faksimile), Einleitung', url: 'https://www.peterlang.com/document/1067283', year: '1980', license: 'free download (Peter Lang / Sagner); quoted, not redistributed' }
if (!SOURCES['R44']) SOURCES['R44'] = { title: 'research/44-bratstva-bibliography.md (BULP): бібліографія братських шкіл і друкарень', url: 'https://github.com/dmytrozahor/BULP/blob/mvp/research/44-bratstva-bibliography.md' }

const F = (page: string, quote: string, note?: string): Evidence => Q('FRH80', `Einleitung, ${page}`, quote, note)
export const ZYZANII_BIO: Evidence[] = [
  Q('R44', 'research/44-bratstva-bibliography.md, «Рух авторів між осередками»', 'Лаврентій Зизаній: Львів (до 1592) → Берестя (1592–96) → Вільно (1596–97) → Мінськ (Соломирецький, 1597–1600) → Ярослав (Острозький, 1600–02)'),
  Q('R44', 'research/44-bratstva-bibliography.md, Берестейська школа', 'Лаврентій Зизаній у Берестейській братській школі 1592–1596'),
]

export interface GrammarFeature {
  id: string; label: string
  /** dialect group code: NORTH = northern Ukrainian (Возняк), CONTESTED = the scholarship disagrees (Возняк: північноукраїнські, Аніченка: білоруська), NONE = not a dialect claim */
  group: 'NORTH' | 'CONTESTED' | 'NONE'
  /** years the feature describes (the print year, 1596) */
  period: [number, number]
  layer: 'Volkssprache' | 'grammar' | 'both'
  cite: Evidence[]
  status: 'cited'
  note?: string
}
export const ZYZANII_FEATURES: GrammarFeature[] = [
  { id: 'ZZ-TWO-LAYERS', label: 'Дві мовні сфери: церковнослов’янська «книжна» (граматичний трактат) і «народна мова» з численними полонізмами (передмова, вірші, виклад «Отче наш»)', group: 'NONE', period: [1596, 1596], layer: 'both', status: 'cited',
    cite: [F('§5, p. X', 'daß man von zwei Sprachebenen sprechen muß, einer weitgehend kirchenslavisch orientierten "Buchsprache" und einer mit zahlreichen Polonismen durchsetzten "Volkssprache"')],
    note: 'лише «народний» шар свідчить про живу мову автора; його лексику зібрав Возняк (ЗНТШ 102, с. 63–67), у проєкті не прочитано' },
  { id: 'ZZ-AORIST-LPART', label: 'l-форма (-л) проникає в минулі часи (аорист, імперфект): аорист та імперфект у розмовній мові вже не вживалися', group: 'NONE', period: [1596, 1596], layer: 'grammar', status: 'cited',
    cite: [F('§4, p. X', 'daß das l-Partizip in die Tempora der Vergangenheit (Aorist und Imperfekt) eindringt', 'Freidhof: у 2 і 3 ос. одн.; сильніше — у Смотрицького'), F('§4, p. X', 'Da Aorist und Imperfekt zu dieser Zeit in der Umgangssprache nicht mehr im Gebrauch waren')],
    note: 'ознака живої східнослов’янської мови, не діалектна окремо' },
  { id: 'ZZ-NEW-ENDINGS', label: 'Нові (поза ц.-сл.) закінчення в іменнику: заміна s-основ на o-основи, нові закінчення мн. чол. і сер. роду; Н. мн. без палаталізації', group: 'NONE', period: [1596, 1596], layer: 'grammar', status: 'cited',
    cite: [F('§4, p. IX–X', 'daß auch neuere Formen, die im Bereich des Ostslavischen bis zum Ende des 16. Jh. aufgekommen sind, sich nachweisen lassen'), F('§4, p. X', 'die Ersatzformen aus den o-Stämmen bei den ehemaligen s-Stämmen')],
    note: 'конкретні закінчення в друці Freidhof втрачені OCR; отже без форм — лише факт появи східнослов’янських нових закінчень' },
  { id: 'ZZ-ATTRIB-CONTESTED', label: 'Діалектна належність мови трактату оспорювана: Возняк — північноукраїнські діалекти (з застереженнями), Аніченка — білоруська', group: 'CONTESTED', period: [1596, 1596], layer: 'both', status: 'cited',
    cite: [F('§5, p. X', 'So zählt es VOZNJAK mit Einschränkungen zu den nordukrainischen Dialekten, ANICENKA dagegen zur weißrussischen Sprache'), F('§5, p. X', 'kein einheitliches Urteil gefunden')],
    note: 'тому жодної ознаки не віднесено до «галицької» чи «білоруської» вимови без окремого джерела' },
  { id: 'ZZ-AKANJE', label: 'Ознаки акання — спірна ознака (оцінка Возняка й Аніченка різна)', group: 'CONTESTED', period: [1596, 1596], layer: 'Volkssprache', status: 'cited',
    cite: [F('§5, p. X', 'Anzeichen für ein Akanje', 'у переліку особливостей, оцінка яких спірна; саму форму Freidhof не наводить')],
    note: 'акання — ознака білоруської/півн.-укр. смуги, не галицької; не використовується як правило відображення' },
  { id: 'ZZ-MO-1PL', label: 'Закінчення -мо в 1 ос. мн. дієслів (замість ц.-сл. -мъ)', group: 'NORTH', period: [1596, 1596], layer: 'grammar', status: 'cited',
    cite: [F('§5, p. X', 'die Endung -mo in der 1.Person Pl.', 'у переліку спірних особливостей мови трактату')],
    note: 'як діалектна ознака — лише за Возняком (північноукраїнські, з застереженнями)' },
  { id: 'ZZ-VOWEL-MIX', label: 'Змішування двох голосних (літери в друці Freidhof втрачені OCR): «Verwechslung von … und …»', group: 'CONTESTED', period: [1596, 1596], layer: 'both', status: 'cited',
    cite: [F('§5, p. X', 'Verwechslung von', 'літери в формулі втрачені; пару не відтворюємо')],
    note: 'тільки факт змішування; пара голосних не названа в цитованому тексті' },
]

/** candidates the quotes above do NOT support: listed so nobody mistakes them for features */
export const ZYZANII_HYPOTHESES: { id: string; label: string; why: string }[] = [
  { id: 'ZH-YAT-I', label: 'ѣ читався як [і]/[и] (галицька риса): Зизаній походив зі Львівщини', why: 'Freidhof згадує перехід до /e/, але літери втрачені; потрібні пряма цитата Німчука або власні слова Зизанія про літеру ѣ' },
  { id: 'ZH-Y-MERGER', label: 'збіг ы та и', why: 'у Freidhof лише «Verwechslung» без пари; потрібне пряме твердження граматики' },
  { id: 'ZH-G-FRIC', label: 'г — фрикативний [ɦ]', why: 'жодного твердження про вимову г у прочитаних джерелах' },
  { id: 'ZH-O-I', label: 'о > і в новозакритих складах', why: 'не засвідчено у прочитаних цитатах' },
  { id: 'ZH-OWN-LETTERS', label: 'власні твердження Зизанія про літери (ѣ, ы, ъ, ь, ꙋ) у розділі про правопис', why: 'потрібен читабельний текст граматики: archive.org OCR непридатний, повторний OCR (worker) ще не прочитаний; Німчук недоступний' },
]
