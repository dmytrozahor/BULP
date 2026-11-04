/** SPEC 63 CQ-1b: tighter recovery (э Э lines), old-Ukrainian allowance for the Russian test, bilingual dictionaries out of running-text N. */
import { describe, it, expect } from 'vitest'
import { textTokens, witnessFrom } from '../pipelines/ingest-harvest.ts'
import { isBilingualDictionary, oldUkrRate } from '../pipelines/lang-gate.ts'

const ARCH = { id: 'x', url: 'https://archive.org/details/x', licence: 'PD', bytes: 1, status: 200, title: 'Книга' }
const OPTS = { lang: 'uk' as const, witnessType: 'ocr', edition: 'e', authorId: 'a', loc: 'l', dateQuote: 'q' }
const wf = (src: string, title: string, date: string, text: string, extra: object = {}) => witnessFrom(src, { ...ARCH, title, date }, 'hv_x', text, { ...OPTS, ...extra })
const OLD = Array.from({ length: 30 }, () => 'Коли тамъ искуситель приступивъ до него, рекъ ему, що се хлѣбъ і це дуже добре').join('\n')
const UKR = Array.from({ length: 30 }, () => 'Він читав книгу і думав про Україну та про своє життя').join(String.fromCharCode(10))
const RUSSIAN = Array.from({ length: 40 }, () => 'Он пришёл домой между тем как она была очень рада его приходу потому чтобы он видел все уже давно').join('\n')

describe('CQ-1b the recovery drops lines with э Э', () => {
  it('in auto oldOrth mode a line with Э is apparatus; the plain oldOrth mode (HV-5 Ruthenian pages) is unchanged', () => {
    const noisy = 'Э дня 19-0 січня 1897 року хлѣбъ\n' + OLD
    const auto = textTokens(noisy, 'l', 'auto'), plain = textTokens(noisy, 'l', true)
    expect(auto.tokens.length).toBe(30 * 15); expect(auto.apparatus).toBeGreaterThan(0)
    expect(plain.tokens.length).toBe(30 * 15 + 5)
  })
  it('a pre-1925 Ukrainian-dominant OCR item is read in auto mode: the э line goes, the ъ lines stay', () => {
    const w = wf('archive-ukr', 'Вѣстникъ', '1900', 'Э дня 19-0 січня 1897 року хлѣбъ\n' + OLD, { autoOldOrth: true })
    expect('skip' in w).toBe(false); if (!('skip' in w)) expect(w.tokens.length).toBe(30 * 15)
  })
})

describe('CQ-1b an old-Ukrainian allowance for the Russian-language test', () => {
  const marked = Array.from({ length: 30 }, () => 'Такьже кто бдеть ранный тогды ведренець столкши помаза єсть єго ранз стрелоу выгонить они была очень уже между').join('\n')
  it('the marker rate counts old-Ukrainian words', () => {
    expect(oldUkrRate('тогды такьже єсть слово'.split(' '))).toBe(0.75); expect(oldUkrRate([])).toBe(0)
  })
  it('a Russian-tested text with >= 1 % marker words and >= 200 tokens is kept, the same text without markers is excluded', () => {
    const plain = marked.split('тогды ').join('').split('єсть ').join('').split('єго ').join('').split('Такьже').join('Тоже')
    const keep = wf('archive-ukr', 'Травник', '1883', marked), drop = wf('archive-ukr', 'Травник', '1883', plain)
    expect('skip' in keep).toBe(false); if (!('skip' in keep)) expect(keep.excludeReason).toBeUndefined()
    expect('skip' in drop).toBe(false); if (!('skip' in drop)) expect(drop.excludeReason?.why).toMatch(/російською/)
  })
})

describe('CQ-1b bilingual dictionaries are not running-text N', () => {
  it('title rule: a dictionary word plus a language pair; monolingual and non-dictionary titles are not caught', () => {
    for (const t of ['Словник московсько-український', 'Русско-малороссийский словарь. Т. 1 (А—О)', 'Словарь росийсько-український. М. Уманець', 'A pocket dictionary of the Ukrainian-English and English-Ukrainian language', 'Русско-украинский словарь. Выпуск I', 'Словник українсько-московський', 'Опыт русско-украинского словаря', "Kyshenkovy rusko [i.e. ukraïns'ko]-anhlisky i anhliskyi-rusky i"]) expect(isBilingualDictionary(t), t).toBe(true)
    for (const t of ['Історичний словник українського язика. Т. 1', 'Словар чужих слів', 'Українсько-російські відносини', 'Русско-украинская война', 'Знадоби до словаря южноруского']) expect(isBilingualDictionary(t), t).toBe(false)
  })
  it('an OCR dictionary is written with excludeReason (admit() refuses it), a wikisource page of the same title is not touched', () => {
    const w = wf('archive-ukr', 'Словник московсько-український', '1918', UKR)
    expect('skip' in w).toBe(false); if (!('skip' in w)) expect(w.excludeReason?.why).toMatch(/двомовний словник/)
    const ws = wf('wikisource-uk', 'Словник московсько-український', '1918', UKR)
    expect('skip' in ws).toBe(false); if (!('skip' in ws)) expect(ws.excludeReason).toBeUndefined()
  })
})
