/**
 * SPEC 63 GG-1: the historical dictionaries whose headwords can make a dictionary-only card. Pure data (no imports), so core/cv.ts can list the names in DICT_SRC.
 * Every dictionary has its own bit of `extra.d` (core/cv.ts) so a card names each dictionary that knows the word, with the period the dictionary describes.
 * Copyright: for the © dictionaries (СУМ XVI–XVII, Матеріали, Словник мови Шевченка) only the headword and the source are stored (SE-9/SE-11c).
 */
export interface HistSrc {
  /** the dictionary id in the data: r2u unit id (pipelines/r2u.ts) or the `dict` of core/se-parse.ts PARSE_SPECS */
  ids: string[]
  bit: number
  /** the name the card shows */
  name: string
  /** the period the dictionary describes (edition years for the r2u dictionaries, which describe their own time) */
  period: string
  /** OCR text that is not proofread (needs the SPEC 63 GG-2 corroboration); r2u pages are typeset text */
  ocr: boolean
  /** orthography eras of core/orthography.ts applied to the headword before matching and deduping */
  orth?: string[]
  /** independent sources: two bits of one lineage are ONE witness for the corroboration rule (Матеріали are Тимченко's papers) */
  lineage: string
  /** display preference when the dictionaries spell a word differently: lower wins */
  rank: number
}
const R = (id: string, bit: number, name: string, period: string, rank: number, orth = ['r2u', '1928'], ids = [id]): HistSrc => ({ ids, bit, name, period, ocr: false, orth, lineage: id, rank })
const S = (id: string, bit: number, name: string, period: string, rank: number, lineage = id): HistSrc => ({ ids: [id], bit, name, period, ocr: true, lineage, rank })
/** SPEC 63 GG-7: a licensed dump of a modern © dictionary: typeset (not OCR), so ONE such dictionary suffices for a card */
const Y = (id: string, bit: number, name: string, period: string, rank: number): HistSrc => ({ ids: [id], bit, name, period, ocr: false, orth: [], lineage: id, rank })
export const HIST_SRC: HistSrc[] = [
  R('r2u_hrinch09', 16, 'Грінченко, Словарь української мови', '1907–09; 3-тє вид. 1927–28', 1, ['r2u', '1928'], ['r2u_hrinch09', 'r2u_hrinch27']),
  R('r2u_zheleh', 32, 'Желехівський, Малорусько-німецький словар', '1886', 9, ['желехівка', '1928']),
  R('r2u_umanets', 64, 'Уманець–Спілка, Словарь росийсько-український', '1893–98', 5),
  R('r2u_nikovsky', 128, 'Ніковський, Словник українсько-російський', '1927', 2, ['r2u', '1928']),
  R('r2u_krymsky', 256, 'Кримський–Єфремов, Російсько-український академічний словник', '1924–33', 4, ['r2u', '1928']),
  R('r2u_holoskevych', 512, 'Голоскевич, Правописний словник', '1929', 3, ['r2u', '1928']),
  R('r2u_izyumov', 1024, 'Ізюмов, Російсько-український словник', '1930', 6, ['r2u', '1928']),
  R('r2u_doroshenko', 2048, 'Дорошенко–Станиславський, Російсько-український словник ділової мови', '1930', 7, ['r2u', '1928']),
  R('r2u_yakubski', 4096, 'Якубські, Російсько-український словник військової термінології', '1928', 8, ['r2u', '1928']),
  S('timchenko', 8192, 'Тимченко, Історичний словник українського язика', 'цитати XIV–XVIII ст.; друк 1930–32', 10, 'timchenko'),
  S('sum16', 16384, 'Словник української мови XVI – першої половини XVII ст.', '1500–1650', 11),
  S('timchenko-materials', 32768, 'Матеріали до словника писемної та книжної української мови XV–XVIII ст.', 'XV–XVIII ст.; вид. 2002–03', 12, 'timchenko'),
  S('biletsky-nosenko', 65536, 'Білецький-Носенко, Словник української мови', '1840–42; друк 1966', 13),
  S('shevchenko', 131072, 'Словник мови Шевченка', '1837–61; друк 1964', 14),
  S('zakrevsky', 262144, 'Закревський, Словарь малороссийских идиомов', '1861', 15),
  S('zyzanii-lexis', 2097152, 'Зизаній, Лексис', '1596', 18),
  S('berynda', 4194304, 'Беринда, Лексікон славенороссійскій', '1627', 19),
  Y('sum11', 524288, 'Словник української мови в 11 томах (СУМ-11)', '1970–80', 16),
  { ...Y('arkushyn', 2097152, 'Аркушин, Словник західнополіських говірок', '1980–99; друк 2000', 18), ocr: true },   // LB-11: OCR text, new cards need the gates + corroboration
  Y('sum20', 1048576, 'Словник української мови (СУМ-20)', '2010–', 17),
]
export const HIST_BY_ID: Record<string, HistSrc> = Object.fromEntries(HIST_SRC.flatMap(s => s.ids.map(i => [i, s] as const)))
/** the name the card lists: «Тимченко, Історичний словник українського язика (цитати XIV–XVIII ст.; друк 1930–32)» */
export const histLabel = (s: HistSrc): string => `${s.name} (${s.period})`
