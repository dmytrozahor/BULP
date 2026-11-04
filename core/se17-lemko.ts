/**
 * SPEC 63 SE-17 — Іван Верхратський, «Говор галицких Лемків» (Збірник фільольогічної секциї НТШ, т. V, Львів 1902; author † 1908, public domain: the text may be stored). Pure (no node imports).
 * Source: the owner's scan (HalLEM.pdf, 493 pp.), OCR on the worker (ukr+rus). Parts: introduction and grammar (scan pp. 3–~150), «Взорці бесіди» (songs and tales, to ~389), «В. Словарець лемківских виразів»
 * (scan pp. 390–~486). Printed page = scan index − 2. A dictionary article: «headword [variants] PLACE-CODES German gloss (Latin letters). Ukrainian paraphrase …»; the places are the author's abbreviations
 * of the villages where he wrote the word down («Обясненє скорочений», pp. 21–22: Св. = Святкова, Рхв. = Рыхвалд, Ту. = Туриньско …).
 * Recall as SE-15 / SE-17 Zakrevsky: an article is NOT dropped for a garbled gloss (`oq`), and not for an off-spine headword (kept for labelling an existing lemma with `unv`).
 */
import { headwordOk, ocrScore } from './se-parse.ts'
import type { SeRow } from './se.ts'
import { clip } from './sum-import.ts'

export const LEM_DICT = 'verkhratsky', LEM_OFFSET = 2, LEM_LABEL = 'лемк.', LEM_PLACE = 'лемк. (місце запису)', LEM_SHORT = 'Верхратський, Говор галицких Лемків (1902)'
/** the author's abbreviations of the villages (pp. 21–22 of the book), OCR variants folded in */
export const LEM_PLACES: Record<string, string> = {
  'Б': 'Біньчарова', 'Ба': 'Баниця', 'Бер': 'Берест', 'Брт': 'Бортне', 'Бру': 'Брунари', 'Вв': 'Вислік Великий', 'Вн': 'Воля Нижня (Яслиска)', 'Вол': 'Воловець', 'ВП': 'Велике Поле (коло Загіря)',
  'Врхв': 'Вірховня', 'Глад': 'Гладишів', 'Г': 'Горова', 'Гр': 'Граб', 'Д': 'Дарів', 'Жег': 'Жегестів', 'З': 'Завадка Римановска', 'Зл': 'Злоцке', 'І': 'Ізби', 'Кв': 'Королик Великий',
  'Ко': 'Команьча', 'Кр': 'Криниця', 'Ку': 'Куляшне', 'Лб': 'Лабова', 'Лип': 'Липовець', 'Лос': 'Лосє', 'М': 'Мацьйова', 'Мал': 'Маластів', 'Мо': 'Мохначка Нижня', 'Мш': 'Мшана', 'НВ': 'Нова Весь',
  'Нов': 'Новиця', 'Ож': 'Оживне', 'О': 'Ольховець', 'П': 'Перегримка', 'Пол': 'Поляни', 'Р': 'Ростока', 'Рад': 'Радоцина', 'Розс': 'Розстайне', 'Рхв': 'Рыхвалд', 'Св': 'Святкова', 'СЗ': 'Старе Загіре',
  'Сырк': 'Смерековець', 'Сирч': 'Смеречне', 'Сн': 'Снытниця', 'Со': 'Соровиця', 'Т': 'Тылич', 'Ти': 'Тылява', 'Тих': 'Тиханя', 'Ту': 'Туриньско', 'У': 'Усте руске', 'Ф': 'Фльоринка', 'Ч': 'Чарный (Чорне)',
  'ЧГ': 'Чистогорб', 'Чр': 'Чирна', 'Щ': 'Щавной (Щавне)', 'Я': 'Яселко',
}
export interface LemPage { text: string; no: number }
export interface LemRow { head: string; printed: string; places: string[]; gloss: string; oq: boolean; page: number; seq: boolean; ev: number }
export interface LemStats { pages: number; candidates: number; badHead: number; entries: number; garbled: number; withPlaces: number; offSpine: number; cardOk: number }
export const newLemStats = (): LemStats => ({ pages: 0, candidates: 0, badHead: 0, entries: 0, garbled: 0, withPlaces: 0, offSpine: 0, cardOk: 0 })

const LOW = 'а-яіїєґыѣъь'
const START = new RegExp(`^([${LOW}][${LOW}'’ʼ1\\-]{1,24})(?=[\\s,.;!]|$)`, 'u')
const ALPHA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const fold = (h: string): string => h.toLowerCase().normalize('NFC').replace(/ы/g, 'и').replace(/ѣ/g, 'і').replace(/ъ/g, '').replace(/1/g, 'і').replace(/ё/g, 'о')
const keyOf = (h: string): number[] => [...fold(h).replace(/['’ʼ-]/g, '')].map(c => ALPHA.indexOf(c)).filter(i => i >= 0)
const cmpKey = (a: number[], b: number[]): number => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d } return 0 }
export function lemSpine(rows: { head: string }[]): Set<number> {
  const ks = rows.map(r => keyOf(r.head)), n = rows.length, tails: number[] = [], prev = new Array<number>(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpKey(ks[tails[mid]!]!, ks[i]!) <= 0) lo = mid + 1; else hi = mid }
    if (lo > 0) prev[i] = tails[lo - 1]!
    tails[lo] = i
  }
  const spine = new Set<number>()
  for (let i = tails[tails.length - 1] ?? -1; i >= 0; i = prev[i]!) spine.add(i)
  return spine
}
const CODE_RE = /(?<![\p{L}])((?:Врхв|Рхв|Глад|Жег|Сырк|Сирч|Розс|Лип|Лос|Мал|Нов|Пол|Рад|Тих|Брт|Бру|Бер|Вол|Кв|Вв|Вн|ВП|ЧГ|Чр|Св|СЗ|Сн|Со|Ти|Ту|Мо|Мш|НВ|Ож|Ко|Кр|Ку|Лб|Зл|Ба|Гр|Б|Г|Д|З|І|М|О|П|Р|Т|У|Ф|Ч|Щ|Я))\.(?=[\s,;]|$)/gu

/** the Ukrainian paraphrase of an article: the Cyrillic words of the text after the codes, without the Latin / German debris and the codes themselves */
function glossOf(body: string): { text: string; ok: boolean } {
  const toks = body.replace(CODE_RE, ' ').split(/\s+/).filter(Boolean)
  const keep = toks.filter(t => { const w = t.replace(/^[(\[«"„„,;:.\-—–=]+|[)\]»",;:.!?\-—–=]+$/gu, ''); return w.length >= 3 && /^[а-яіїєґыѣъь'’ʼ-]+$/u.test(w) && !/[А-ЯІЇЄҐ]/u.test(w.slice(1)) })
  const text = clip(keep.join(' ').replace(/\s+([,;.])/g, '$1'), 200)
  return { text, ok: keep.length >= 1 && text.replace(/[^а-яіїєґыѣъь]/giu, '').length >= 5 && ocrScore(text) >= 0.7 }
}

export function parseVerkhratsky(pages: LemPage[], st: LemStats = newLemStats()): LemRow[] {
  const raw: { head: string; lines: string[]; page: number }[] = []
  let cur: (typeof raw)[number] | undefined
  for (const p of pages) {
    st.pages++
    for (const line of p.text.split('\n')) {
      const l = line.trim(); if (!l || /^\d{3}$/.test(l)) continue
      const m = START.exec(l)
      if (m && (!cur || /[.;!?)»"“”]\s*$/.test(cur.lines[cur.lines.length - 1] ?? '') || cmpKey(keyOf(cur.head), keyOf(m[1]!)) < 0)) { cur = { head: m[1]!, lines: [l.slice(m[0].length)], page: p.no }; raw.push(cur) } else if (cur) cur.lines.push(l)

    }
  }
  const rows: LemRow[] = []
  for (const r of raw) {
    st.candidates++
    const printed = r.head.toLowerCase(), head = fold(printed)
    if (!headwordOk(head)) { st.badHead++; continue }
    const body = r.lines.join(' ').replace(/([\p{L}])-\s+(?=\p{L})/gu, '$1').replace(/\s+/g, ' ')
    const places = [...new Set([...body.slice(0, 160).matchAll(CODE_RE)].map(x => LEM_PLACES[x[1]!]).filter((x): x is string => !!x))].slice(0, 3)
    const g = glossOf(body)
    if (!g.ok) st.garbled++
    if (places.length) st.withPlaces++
    rows.push({ head, printed, places, gloss: g.text, oq: !g.ok, page: r.page - LEM_OFFSET, seq: false, ev: (g.ok ? 1 : 0) + (places.length ? 1 : 0) + 1 })
    st.entries++
  }
  const spine = lemSpine(rows)
  rows.forEach((r, i) => { r.seq = spine.has(i) && r.head.replace(/['’ʼ-]/g, '').length >= 3 && ocrScore(r.head) >= 1 && r.ev >= 2; if (!r.seq) st.offSpine++; else st.cardOk++ })
  return rows
}

export const lemLoc = (page: number): string => `Верхратський 1902, с. ${page}`
/** the SeRow: word-level label when `wl` (the headword is no standard word: VESUM does not know it), place-only otherwise; a garbled gloss is `oq`, an off-spine headword `unv` */
export function lemSeRow(r: LemRow, wl: boolean): [string, SeRow] {
  return [r.head, { d: LEM_DICT, g: r.oq ? '' : r.gloss, n: 1, l: lemLoc(r.page), ...(r.printed !== r.head ? { a: r.printed } : {}), lb: [wl ? LEM_LABEL : LEM_PLACE], ...(r.places.length ? { v: r.places, vn: r.places.length } : {}), ...(r.oq ? { oq: 1 as const } : {}), ...(r.seq ? {} : { unv: 1 as const }) }]
}
