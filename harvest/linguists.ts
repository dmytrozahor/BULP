/**
 * SPEC 63 SRC-5 (owner 2026-10-29: «знайди взагалі всіх історичних українських лінгвістів і пододавай їх роботи»): archive.org OCR texts of the linguistic works of
 * historical Ukrainian linguists (research/48). Every item is a CURATED id (the works list was found by an archive.org search and its /metadata record was opened; research/48 §3),
 * not a search result. The text file is resolved from the item's own /metadata (the `*_djvu.txt` name is often NOT `<id>_djvu.txt`, which is why harvest/archive.ts got 404 for e.g.
 * hrammatyka_1818 and golovatsky1849), so the file name is recorded in the index (`iaFile`).
 * Public domain = the author's death year ≤ 1955 (life + 70 years, Ukraine) AND the print is the original edition; the death year and its source are in each line (`authorDeath`, `deathSource`).
 * A work whose edition or commentary is Russian carries an explicit `ru` flag (kind + reason, SPEC 63 RF / research/46); the ingest copies it into the witness.
 * Neutral research User-Agent WITHOUT an e-mail address; archive.org robots.txt disallows only /control/ and /report/; pacing 3 s.
 * Usage: tsx harvest/linguists.ts      (resumable: index.jsonl is the truth; each item is one gz file whose index line is written after it)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { Harvest, sleep, type IndexItem } from './lib.ts'

export const LINGUISTS_UA = 'BULP-research/1.0 (non-commercial linguistic corpus research; archive.org OCR of public-domain prints)'
const GENRE = 'лінгвістична праця'
type RuKind = 'edition' | 'dictionary' | 'apparatus'
export interface LingWork {
  /** archive.org item */ ia: string
  author: string; authorDeath: number | null; deathSource: string
  title: string; year: number
  /** place of publication as the item or the title page states it; '' = not stated by the item (the edition string then says so) */ place: string
  kind: 'grammar' | 'dictionary' | 'orthography' | 'dialectology' | 'history-of-language' | 'philology'
  /** explicit Russian-source flag (research/46); absent = none */ ru?: { kind: RuKind; why: string }
  /** which part of the language the text is: the gate keeps Cyrillic tokens only */ note?: string
}
const WIKI = (t: string) => `https://uk.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`
const RU_TEXT = (w: string): { kind: RuKind; why: string } => ({ kind: 'apparatus', why: `${w}: текст-коментар російською (метадані archive.org: lang rus); можливе нівелювання або ігнорування українських рис` })

export const LINGUIST_WORKS: LingWork[] = [
  { ia: 'hrammatyka_1818', author: 'Олексій Павловський', authorDeath: null, deathSource: 'uk.wikipedia, Павловський Олексій Павлович (intro opened 2026-10-29): born c. 1773 -> died long before 1955; exact death year not read (?)', title: 'Грамматика малороссійскаго нарѣчія', year: 1818, place: '', kind: 'grammar', ru: { kind: 'apparatus', why: 'граматика малоросійського наріччя написана російською (назва й метадані archive.org: Russian Old); можливе нівелювання або ігнорування українських рис' } },
  { ia: 'golovatsky1849', author: 'Яків Головацький', authorDeath: 1888, deathSource: WIKI('Головацький Яків Федорович'), title: 'Розправа о язиці южноруськім і єго нарѣчіях', year: 1849, place: '', kind: 'dialectology' },
  { ia: 'ohonovskii', author: 'Омелян Огоновський', authorDeath: 1894, deathSource: WIKI('Огоновський Омелян Михайлович'), title: 'Хрестоматія староруська для вищих класів гімназіальних', year: 1881, place: '', kind: 'history-of-language' },
  { ia: 'particky2', author: 'Омелян Партицький', authorDeath: 1895, deathSource: WIKI('Партицький Омелян Йосипович'), title: 'Слово о полку Игоревом. Текст з перекладом і з поясненням староруських правил акцентових і … ', year: 1884, place: '', kind: 'history-of-language' },
  { ia: 'sl617', author: 'Іван Верхратський', authorDeath: 1919, deathSource: WIKI('Верхратський Іван Григорович'), title: 'Знадоби до словаря южноруского', year: 1877, place: '', kind: 'dictionary' },
  { ia: 'slovn32', author: 'Іван Верхратський', authorDeath: 1919, deathSource: WIKI('Верхратський Іван Григорович'), title: 'Нові знадоби номенклятури і термінольоґії природописної, народної', year: 1908, place: '', kind: 'dictionary' },
  { ia: 'pryrod1864', author: 'Іван Верхратський', authorDeath: 1919, deathSource: WIKI('Верхратський Іван Григорович'), title: 'Початки до уложення номенклатури і термінології природописної, народної', year: 1864, place: '', kind: 'dictionary' },
  { ia: 'ruthenischegramm00smaluoft', author: 'Степан Смаль-Стоцький; Теодор Ґартнер', authorDeath: 1938, deathSource: `${WIKI('Степан Смаль-Стоцький')} (Смаль-Стоцький † 1938); ${WIKI('Теодор Гартнер')} (Ґартнер † 1925)`, title: 'Ruthenische Grammatik', year: 1913, place: 'Berlin', kind: 'grammar', note: 'німецькомовна граматика: токени лише кирилиця' },
  { ia: 'ukranskahramatyk00smal', author: 'Степан Смаль-Стоцький; Теодор Ґартнер', authorDeath: 1938, deathSource: WIKI('Степан Смаль-Стоцький'), title: 'Українська граматика', year: 1919, place: 'Winnipeg', kind: 'grammar' },
  { ia: 'ruskapravopyszis00smal', author: 'Степан Смаль-Стоцький', authorDeath: 1938, deathSource: WIKI('Степан Смаль-Стоцький'), title: 'Руска правопись зі словарцем', year: 1918, place: 'Winnipeg', kind: 'orthography' },
  { ia: 'SmalStockyj1', author: 'Степан Смаль-Стоцький', authorDeath: 1938, deathSource: WIKI('Степан Смаль-Стоцький'), title: "Розвиток поглядів про сім'ю слов'янських мов і їх взаємне споріднення", year: 1927, place: '', kind: 'history-of-language' },
  { ia: 'krymsk8', author: 'Агатангел Кримський', authorDeath: 1942, deathSource: WIKI('Кримський Агатангел Юхимович'), title: 'Украинская грамматика для учеников высших классов гимназий и семинарий', year: 1907, place: '', kind: 'grammar', ru: RU_TEXT('Кримський 1907, російськомовне видання') },
  { ia: 'krymdrkievgovor', author: 'Агатангел Кримський', authorDeath: 1942, deathSource: WIKI('Кримський Агатангел Юхимович'), title: 'Древне-киевский говор', year: 1906, place: '', kind: 'dialectology', ru: RU_TEXT('Кримський 1906, російськомовне видання') },
  { ia: 'shacmatov1922', author: 'Олексій Шахматов; Агатангел Кримський', authorDeath: 1942, deathSource: `${WIKI('Шахматов Олексій Олександрович')} (Шахматов † 1920, російський славіст); Кримський † 1942`, title: 'Нариси з історії української мови та хрестоматія з пам’ятників письменської староукраїнщини', year: 1922, place: '', kind: 'history-of-language', ru: { kind: 'apparatus', why: 'автор основної частини — російський славіст О. Шахматов (Шахматов, uk.wikipedia: «російський славіст-філолог»); видання київське 1922, текст українською' } },
  { ia: 'tymch1930', author: 'Євген Тимченко', authorDeath: 1948, deathSource: WIKI('Євген Тимченко'), title: 'Історичний словник українського язика. Т. 1, зошит 1: А—Глу', year: 1930, place: '', kind: 'dictionary' },
  { ia: '1.2.1932', author: 'Євген Тимченко', authorDeath: 1948, deathSource: WIKI('Євген Тимченко'), title: 'Історичний словник українського язика. Т. 1, зошит 2: Глу—Жял', year: 1932, place: '', kind: 'dictionary' },
  { ia: 'slov9', author: 'Євген Тимченко', authorDeath: 1948, deathSource: WIKI('Євген Тимченко'), title: 'Русско-украинский словарь. Выпуск I (А—Б)', year: 1892, place: '', kind: 'dictionary', ru: { kind: 'dictionary', why: 'російсько-український словник: заголовні слова та тлумачення російською' } },
  { ia: '1.1897', author: 'Євген Тимченко', authorDeath: 1948, deathSource: WIKI('Євген Тимченко'), title: 'Русско-малороссийский словарь. Т. 1 (А—О)', year: 1897, place: 'Київ', kind: 'dictionary', ru: { kind: 'dictionary', why: 'російсько-малоросійський словник: заголовні слова російською' } },
  { ia: 'slprav1923', author: 'Григорій Голоскевич', authorDeath: 1935, deathSource: WIKI('Голоскевич Григорій Костянтинович'), title: 'Український правописний словничок', year: 1923, place: 'Катеринослав', kind: 'orthography' },
  { ia: 'simovych1918', author: 'Василь Сімович', authorDeath: 1944, deathSource: WIKI('Сімович Василь Іванович'), title: 'Практична граматика української мови', year: 1918, place: '', kind: 'grammar' },
  { ia: 'nar1932', author: 'Сергій Смеречинський', authorDeath: 1954, deathSource: 'https://www.encyclopediaofukraine.com/pages%5CS%5CM%5CSmerechynskySerhii.htm (b. 1892, d. May 1954)', title: 'Нариси з української синтакси: у зв’язку з фразеологією та стилістикою', year: 1932, place: '', kind: 'grammar' },
  { ia: 'kulish1857', author: 'Пантелеймон Куліш', authorDeath: 1897, deathSource: WIKI('Куліш Пантелеймон Олександрович'), title: 'Граматка', year: 1857, place: '', kind: 'orthography', ru: { kind: 'apparatus', why: 'Граматка 1857: видано в Російській імперії за її цензурою (ярижка / Валуєвський циркуляр, research/46 §2.2); місце видання в метаданих не вказано' } },
  { ia: 'levch1874', author: 'Михайло Левченко', authorDeath: 1891, deathSource: WIKI('Левченко Михайло Михайлович'), title: 'Опыт русско-украинского словаря', year: 1874, place: '', kind: 'dictionary', ru: { kind: 'dictionary', why: 'російсько-український словник: заголовні слова російською' } },
  { ia: 'Poradnyk1', author: 'Олекса Синявський', authorDeath: 1937, deathSource: WIKI('Синявський Олекса Наумович'), title: 'Порадник української мови', year: 1922, place: '', kind: 'grammar' },
  { ia: 'potebnia6', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович') + ' (Потебня † 1891 per archive.org creator note 1835-1891)', title: 'Малорусская народная песня, по списку XVI века. Текст и примечания А. Потебни', year: 1877, place: '', kind: 'philology', ru: RU_TEXT('Потебня 1877') },
  { ia: 'potebnia15', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'Объяснения малорусских и сродных народных песен. Ч. I', year: 1883, place: '', kind: 'philology', ru: RU_TEXT('Потебня 1883') },
  { ia: 'potebnia5', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'Объяснения малорусских и сродных народных песен. Ч. II. Колядки и щедровки', year: 1887, place: 'Харьковъ', kind: 'philology', ru: { kind: 'apparatus', why: 'Потебня, Харьковъ 1887: передмова й примітки російською, текст у власній українській орфографії видання (research/46 §3)' } },
  { ia: 'potebnya1878', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'Слово о полку Ігоревім', year: 1878, place: '', kind: 'philology', ru: RU_TEXT('Потебня 1878') },
  { ia: 'potebnia12', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'К истории звуков русского языка. Т. 1', year: 1876, place: '', kind: 'history-of-language', ru: RU_TEXT('Потебня 1876') },
  { ia: 'potebnia11', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'К истории звуков русского языка. Т. 2', year: 1880, place: '', kind: 'history-of-language', ru: RU_TEXT('Потебня 1880') },
  { ia: 'potebnia13', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'К истории звуков русского языка. Т. 3', year: 1881, place: '', kind: 'history-of-language', ru: RU_TEXT('Потебня 1881') },
  { ia: 'potebnia10', author: 'Олександр Потебня', authorDeath: 1891, deathSource: WIKI('Потебня Олександр Опанасович'), title: 'К истории звуков русского языка. Т. 4', year: 1883, place: '', kind: 'history-of-language', ru: RU_TEXT('Потебня 1883') },
]

export function edition(w: LingWork): string {
  return `${w.place || 'місце видання не зазначено в метаданих archive.org (?)'}, ${w.year}; archive.org/details/${w.ia} (OCR, не вичитано)`
}
export function item(w: LingWork, url: string, bytes: number, status: number, iaFile: string): IndexItem {
  return {
    id: `linguists:${w.ia}`, url, date: String(w.year), licence: w.authorDeath ? `PD (автор † ${w.authorDeath} ≤ 1955; видання ${w.year}; archive.org OCR, не вичитано)` : `PD (автор народж. бл. 1773, † задовго до 1955; видання ${w.year}; archive.org OCR, не вичитано)`, bytes, status, title: w.title, author: w.author,
    ...(w.place ? { region: w.place } : {}), kind: w.kind, genre: GENRE, witnessType: 'linguistic_work', edition: edition(w), authorDeath: w.authorDeath, deathSource: w.deathSource,
    ...(w.ru ? { ru: w.ru } : {}), ...(w.note ? { note: w.note } : {}), ocr: true, iaItem: w.ia, iaFile,
  }
}
/** the OCR text file of an item from its /metadata `files`: the largest `*_djvu.txt` (an item may hold several scans), else null */
export function pickTextFile(files: { name: string; size?: string | number }[]): string | null {
  const c = files.filter(f => /_djvu\.txt$/i.test(f.name)).sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0))
  return c[0]?.name ?? null
}

/** the text download goes through curl (node's fetch cannot connect to the archive.org item servers dnNNN.*.archive.org from the harvester box; same as hv6.ts); pacing 3 s, 403/429 stop the script */
async function curlGet(h: Harvest, url: string): Promise<{ status: number; buf: Buffer }> {
  await sleep(3000)
  const tmp = `${tmpdir()}/linguists-${process.pid}.dl`
  try {
    const code = execFileSync('curl', ['-sL', '--max-time', '600', '--retry', '3', '--retry-delay', '20', '-A', LINGUISTS_UA, '-o', tmp, '-w', '%{http_code}', url], { encoding: 'utf8' }).trim()
    const status = Number(code)
    if (status === 403 || status === 429) h.stop(`HTTP ${status} for ${url}`)
    return { status, buf: status === 200 ? readFileSync(tmp) : Buffer.alloc(0) }
  } catch (e) { return h.stop(`curl failed (${(e as Error).message.slice(0, 120)}) for ${url}`) } finally { rmSync(tmp, { force: true }) }
}

async function main() {
  const h = new Harvest('linguists', { delayMs: 3000, logEvery: 1 })
  const H = { 'user-agent': LINGUISTS_UA }
  for (const w of LINGUIST_WORKS) {
    const id = `linguists:${w.ia}`
    if (h.has(id)) continue
    const meta = await h.get(`https://archive.org/metadata/${encodeURIComponent(w.ia)}`, { headers: H, soft5xx: true })
    if (meta.status !== 200) { h.put(`linguists_${w.ia}.none`, '', [item(w, `https://archive.org/details/${w.ia}`, 0, meta.status, '')]); continue }
    const files = ((await meta.res.json()) as { files?: { name: string; size?: string }[] }).files ?? []
    const file = pickTextFile(files)
    if (!file) { h.put(`linguists_${w.ia}.none`, '', [item(w, `https://archive.org/details/${w.ia}`, 0, 404, '')]); continue }
    const r = await curlGet(h, `https://archive.org/download/${encodeURIComponent(w.ia)}/${encodeURIComponent(file)}`)
    if (r.status !== 200) { h.put(`linguists_${w.ia}.none`, '', [item(w, `https://archive.org/details/${w.ia}`, 0, r.status, file)]); continue }
    const buf = r.buf
    h.put(`linguists_${w.ia}`, buf, [item(w, `https://archive.org/details/${w.ia}`, buf.length, 200, file)])
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/linguists.ts')) await main()
