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
]
