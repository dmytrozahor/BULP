/**
 * Text normalisation: stress marks, Old-Cyrillic stage N (research/03 §1), site decoders, tokenizer.
 *
 * > "Do not strip all \p{M}. Under NFD, й becomes и+U+0306 and ї becomes і+U+0308 … Strip only stress marks:
 * >  s.normalize('NFC').replace(/[́´ˊ]/g, '')" — research/08 A3
 * > "Normalize to a canonical Old-Kyivan spelling, but keep ѣ ъ ь ы ѧ ѥ: these letters carry the historical
 * >  information the later rules need." — research/03 §1
 */

const STRESS = /[́´ˊ]/g
export const stripStress = (s: string) => s.normalize('NFC').replace(STRESS, '').normalize('NFC')
export const unifyApostrophe = (s: string) => s.replace(/[’ʼ`]/g, "'")
/** Search key: NFC, no stress, lower case, one apostrophe. */
export const key = (s: string) => unifyApostrophe(stripStress(s)).toLowerCase()

/** Render stress positions (indices of stressed vowels) with U+0301 right after the vowel (research/08 A3). */
export const renderStress = (form: string, positions: number[]) =>
  [...form].map((c, i) => positions.includes(i) ? c + '́' : c).join('')

/** Read stress positions back from a stressed string, verifying strip(quote) === form. */
export function stressPositions(stressed: string): { form: string; positions: number[] } {
  const positions: number[] = []; let form = ''
  for (const c of stressed.normalize('NFC')) c.match(STRESS) ? positions.push(form.length - 1) : (form += c)
  return { form, positions }
}

// ── Stage N: Old-Cyrillic normalisation ─────────────────────────────────────────────────────────

/** N02: superscript letters U+2DE0…U+2DFF → base letters, in code-point order. */
const SUPERSCRIPT = [...'бвгджзклмнопрстхцчшщѳ', 'ст', 'а', 'е', 'ђ', 'у', 'ѣ', 'ю', 'ѧ', 'ѧ', 'у', 'ю']
type Repl = string | ((m: string) => string)
const sub = (s: string, re: RegExp, to: Repl) => typeof to === 'string' ? s.replace(re, to) : s.replace(re, to)
const N_TABLE: [RegExp, Repl][] = [
  [/[ⷠ-ⷿ]/g, c => SUPERSCRIPT[c.codePointAt(0)! - 0x2DE0] ?? ''],
  [/[҃-҉꙯-꙽̀̑̾]/g, ''],     // N01 titlo, psili, kamora, accents (after N10)
  [/ѿ/g, 'от'], [/[ѡѽѻꙩꙫꙭꚙꚛ]/g, 'о'],                           // N03
  [/оу|ѹ|ꙋ|ᲂу|ȣ/g, 'у'],                                      // N04
  [/ꙑ|ъі|ъи/g, 'ы'],                                           // N05
  [/[ꙗѩ]/g, 'ѧ'], [/ѭ/g, 'ю'], [/ꙛ/g, 'ѫ'],                     // N07
  [/ѳ/g, 'ф'], [/ѯ/g, 'кс'], [/ѱ/g, 'пс'], [/[ѕꙃꙅꙁ]/g, 'з'], [/ꙇ/g, 'и'], // N08
  [/([ае])ѵ/g, '$1в'], [/ѵ/g, 'и'],
]

/** N10 titlo (nomina sacra) expansion — research/03 §5. Matched on the titlo-stripped stem; ending kept. */
const TITLO: [string, string][] = [
  ['бгородиц', 'богородиц'], ['бж', 'бож'], ['бг', 'бог'], ['бз', 'боз'], ['гсдн', 'господн'], ['гдь', 'господь'], ['гсь', 'господь'],
  ['гн', 'господн'], ['исус', 'иисус'], ['іс', 'иисус'], ['ис', 'иисус'], ['хс', 'христос'], ['хрстиѧн', 'христиѧн'], ['хрст', 'христ'], ['хв', 'христов'], ['ст', 'свят'],
  ['дх', 'дух'], ['нбс', 'небес'], ['нб', 'неб'], ['члвѣк', 'человѣк'], ['члвк', 'человѣк'], ['оц', 'отьц'], ['оч', 'отьч'],
  ['мт', 'мат'], ['сн', 'сын'], ['црк', 'цьркъв'], ['цр', 'цар'], ['блг', 'благ'], ['бл', 'благ'], ['млтв', 'молитв'], ['апл', 'апостол'],
  ['агг', 'ангел'], ['анг', 'ангел'], ['дв', 'дѣв'], ['кнз', 'кънѧз'], ['мсц', 'мѣсѧц'], ['слнц', 'сълньц'], ['влдк', 'владык'], ['пррк', 'пророк'],
  ['крст', 'крьст'], ['грд', 'град'], ['днсь', 'дьньсь'],
]
const TITLO_MARK = /[҃ⷠ-ⷿ]/
export function expandTitlo(word: string): { word: string; expanded?: string } {
  if (!TITLO_MARK.test(word)) return { word }
  const bare = stripMarks(word)
  const hit = TITLO.find(([abbr]) => bare.startsWith(abbr) && bare.length <= abbr.length + 4)
  return hit ? { word: hit[1] + bare.slice(hit[0].length), expanded: hit[0] } : { word: bare }
}
const stripMarks = (w: string) => N_TABLE.reduce((s, [re, to]) => sub(s, re, to), w.normalize('NFC').toLowerCase())

export interface NormOpts { /** N06: Old Rus' і/ї/ı stand for и (pre-1400 texts only). */ oldI?: boolean }
/** Stage N (N10 → N01–N09). Keeps ѣ ъ ь ы ѧ ѫ ѥ for the sound-change rules. */
export function normalizeOld(raw: string, o: NormOpts = {}): { norm: string; titlo?: string } {
  const { word, expanded } = expandTitlo(raw)
  let s = stripMarks(word)
  if (o.oldI) s = s.replace(/(?<=.)[іїı]/g, 'и')
  return { norm: s, titlo: expanded }
}

// ── Site decoders (research/01 §2–4, research/06 §1.8) ──────────────────────────────────────────

/** izbornyk.org.ua: cp1251 page; Old-Cyrillic as custom-font substitutes or numeric entities. */
export const decodeIzbornyk = (html: string) => html
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&nbsp;/g, ' ').replace(/&laquo;|&raquo;/g, '"').replace(/&amp;/g, '&')
  .replace(/Ђ/g, 'ѣ').replace(/ђ/g, 'ѣ')

/**
 * віра.укр Archangel Gospel: UstavUCS3.ttf transliteration → Unicode (research/01 §2: "A mapping table must be built
 * by comparing against the font"). Built from the frequency table of all non-Cyrillic characters in the 89 fetched
 * chapters (3778 verses) and checked against the standard Gospel text. Every entry cites an example verse id.
 * A Latin letter of the font = the Cyrillic letter WITH titlo/abbreviation mark (the TOROT convention «г҃и», «цр҃ю»).
 */
const TIT = '҃'
const VIRA: Record<string, string> = {
  'э': 'ѣ', 'Э': 'Ѣ',                    // john-1:1 «бэ слово» = бѣ
  z: 'ѧ', Z: 'Ѧ',                         // john-1:5 «свьтить сz» = сѧ
  U: 'ѹ',                                 // matt-1:2 «юдU» = Иѹдѹ (ѹ = оу)
  t: 'ѿ', O: 'Ѿ',                         // john-1:44 «t виfьсаиды» = ѿ; matt-2:13 «Oшьдъшемъ» = Отшьдъшемъ
  w: 'ѡ',                                 // john-1:29 «iw7нъ» = Іѡанъ
  i: 'і', I: 'І',                         // matt-1:1 «iс7ъ» = Ісусъ; mark-2:5 «I©ъ»
  f: 'ѳ',                                 // matt-1:3 «fамары» = Ѳамаръ; matt-2:1 «виfлеомэ» = Виѳлеомѣ
  v: 'ѵ', 'Ѷ': 'ѵ',                       // matt-26:7 «мvра» = мѵро; luke-24:27 «моµѶсеа»: Ѷ = accented-ѵ glyph slot
  x: 'ѯ',                                 // mark-15:21 «алеxандровU» = Алеѯандровѹ
  'µ': 'у',                               // matt-2:13 «егµптъ» = Егѹптъ; matt-2:19 «Оµмьршю» = Оумьршю
  'я': 'ꙗ',                               // john-1:15 «яко» — iotated a (N07 folds ꙗ→ѧ)
  l: 'л' + TIT, L: 'л' + TIT,         // matt-1:20 «гlя» = гл҃я (глаголя); luke-2:29 «вLко» = вл҃ко (владыко)
  p: 'ѱ',                                 // luke-24:44 «pалъмѣхъ» = ѱалъмѣхъ (псалмѣхъ); luke-1:63 «наpа»
  g: 'г' + TIT,                           // john-18:31 «никоgо» = никог҃о; mark-16:15 «еѵаgлиѥ» = еваг҃лиѥ (евангелиѥ)
  r: 'р' + TIT,                       // matt-2:2 «цrь» = цр҃ь
  G: 'г' + TIT,                         // matt-1:22 «Gа» = г҃а (господа); matt-8:2 «Gи» = г҃и
  c: 'с' + TIT,                         // matt-2:18 «глаc» = глас҃; matt-6:1 «млcтынz» = мл҃стыня
  b: 'о' + TIT,                         // matt-2:5 «прbркмь» = про҃ркмь (пророкомъ); matt-9:21 «тъкмb» = токмо
  d: 'д' + TIT,                         // luke-1:30 «блгdть» = благодать; luke-2:52 «блгdтью»
  '©': 'с' + TIT,                       // matt-1:16 «х©ъ» = хс҃ъ (Христосъ); matt-2:1 «i©U» = ис҃ѹ (Исусу)
  '™': 'т' + TIT,                       // matt-1:18 «м™ри» = мт҃ри (матери); john-1:33 «с™мь» = ст҃мь (святымь)
  '¦': 'х' + TIT,                       // matt-1:18 «д¦а» = дх҃а (Духа); john-1:32 «д¦ъ» = дух
  '§': 'ч' + TIT,                       // matt-6:9 «О§е» = оч҃е (Отче; TITLO table: оч→отьч)
  '®': 'рд' + TIT,                      // matt-11:29 «с®цмь» = срд҃цемь (сердцемь)
  'ұ': 'м' + TIT,                       // matt-3:1 «вреұ» = врем҃ (время); matt-26:1 «Uченикоұ» = ученико-м҃
  '+': 'в' + TIT,                       // matt-6:15 «чл+комъ» = члв҃комъ (человѣкомъ); mark-10:42 «призва+ъ» = призвавъ
  '=': 'н',                               // john-18:24 «а=на» = Анна; matt-6:13 «ами=» = амин
  '?': 'че',                              // matt-4:6 «ре?» = рече; matt-16:13 «U?нӤикы» = ученикы; matt-23:39 «ре?те» = речете
  'Ҋ': 'и', 'Ӥ': 'и',                     // matt-26:27 «приҊмъ» = приимъ; matt-16:13 «U?нӤикы»
  'Ӣ': 'а',                               // matt-1:9 «иоӢfамъ» = Иоаѳамъ
}
/** Digits are the titlo-bearing superscript glyphs: matt-1:1 «iс7ъ хв7а» = ис҃ъ хв҃а. */
export function decodeVira(s: string): string {
  return [...s].map(c => VIRA[c] ?? (/[0-9]/.test(c) ? TIT : c)).join('')
}

// ── Tokenizer ────────────────────────────────────────────────────────────────────────────────────

const LETTER = "\\p{Script=Cyrillic}\\p{M}ⷠ-ⷿ'’ʼ"
const WORD = new RegExp(`[${LETTER}]+(?:-[${LETTER}]+)*`, 'gu')
export interface Token { raw: string; index: number }
export const tokenize = (text: string): Token[] => [...text.matchAll(WORD)].map(m => ({ raw: m[0].replace(/^['’ʼ]+|['’ʼ]+$/g, ''), index: m.index! })).filter(t => t.raw)
/** A token with a Latin letter left after decoding is dropped (SPEC 10 M-2.1). */
export const hasUnmapped = (s: string) => /[A-Za-z]/.test(s)
