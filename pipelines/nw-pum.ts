/**
 * SPEC 63 RF-8: «Грамоти XIV ст.» (упоряд. М. М. Пещак, Київ: Наукова думка, 1974; Пам’ятки української мови) — 82 charters transcribed on izbornyk.org.ua (gramxiv/), kept as
 * data/seed/pum14/gr14_<№>.json (public-domain charter texts only; the 1974 apparatus is © Наукова думка and is not in the files). The charters are chancery documents of the Galician-Volhynian
 * and Polish-Ruthenian rulers and nobles; the record is institutional: the self-identification is the text itself («господарь рускоѣ землѣ», charter № 12, quoted from the transcription).
 * Dates: each file carries its own date line from the edition («8 березня 1301 р.», «До 1301 р.» → [X−30, X], «Після X р.» → [X, X+30], «Близько X р.» → [X−10, X+10]; research/39 §2).
 */
import { Q } from '../core/evidence.ts'
import type { Author } from './authors.ts'

export const AUTHORS_PUM: Author[] = [
  { id: 'pum14', name: 'Канцелярії руських князів, польських королів і панів (грамоти XIV ст., вид. Пещак 1974)', life: '1301–1400', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Галичина / Волинь',
    evidence: [Q('http://izbornyk.org.ua/gramxiv/', 'Грамоти XIV ст. (вид. Пещак 1974), № 12', 'казимиръ краковьскии и куѧвьскии и господарь рускоѣ землѣ далъ ѥсмь слузѣ своѥму',
      'титул правителя в самій грамоті: «господар руськоѣ землѣ» (транскрипція izbornyk.org.ua, склеєно з токенів файла data/seed/pum14/gr14_12.json)')],
    note: 'RF-8: 82 грамоти (№ 3 і № 84 видання транскрипції немає); тексти — суспільне надбання, апарат видання 1974 не вводиться' },
  // RF-11: «Українські грамоти XV ст.» (Русанівський 1965): chancery documents of the Kyiv, Lithuanian-Ruthenian, Galician, Moldavian and Transcarpathian rulers and landowners
  { id: 'pum15', name: 'Канцелярії князів, королів, воєвод і панів (грамоти XV ст., вид. Русанівський 1965)', life: '1401–1499', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Київщина / Волинь / Галичина / Молдавія / Закарпаття',
    evidence: [Q('owner-books:gramotyxv.pdf', 'Українські грамоти XV ст. (вид. Русанівський 1965), № 18, с. 46', 'Казимир божью млстью', 'титул правителя в самій грамоті: король Казимир «божью млстью» (текст грамоти № 18 за друкованим виданням, data/seed/pum15/gr15_18.json)')],
    note: 'RF-11: 63 грамоти з 67 у seed (№ 2, 20, 23, 25 — тексти польським письмом, не вводяться); при завантаженні № 9 збігається з грамотою № 57 видання 1974 р. і не рахується (лишено транскрипцію), тож 62; тексти — суспільне надбання, апарат видання 1965 не вводиться; OQ-фільтр діє (witnessType ocr)' },
  // RF-11: «Волинські грамоти XVI ст.» (1995): legal acts of Volhynian nobles entered in the books of the Volodymyr land court (ЦДІАК, ф. 27)
  { id: 'vol16', name: 'Володимирський земський суд і волинська шляхта (акти XVI ст., вид. Задорожний, Матвієнко 1995)', life: '1540–1580', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'Волинь (Володимирський повіт)',
    evidence: [Q('owner-books:e_dzherela_gramoti_1995.pdf', 'Волинські грамоти XVI ст. (вид. 1995), № 1, с. 17', 'Я Александро Федорович Збаразскии вызнаваю сим моим листом', 'самоназва видавця акта у самому тексті: волинський шляхтич «вызнаваю сим моим листом» (текст акта № 1 за друкованим виданням, data/seed/vol16/gv16_1.json); акти внесено до книг Володимирського земського суду (передмова видання, з якої взято лише відомість про джерело)')],
    note: 'RF-11: 125 актів зі 128 (№ 126–128 у виданні без року: не вводяться); тексти — суспільне надбання, апарат видання 1995 (передмова, опис книг, покажчики, словник, зміст) не вводиться; OQ-фільтр діє (witnessType ocr)' },
]
