/** SPEC 63 CQ-1: language gates of the harvest ingest (analysis/archive-funnel.md): Latin / look-alike junk, Russian-language documents, old orthography, harvester retries and the Sejm exclusion. */
import { describe, it, expect } from 'vitest'
import { textTokens, witnessFrom } from '../pipelines/ingest-harvest.ts'
import { fragmentShare, isRussianDoc, polishLookalike, stopProfile, ukDominant } from '../pipelines/lang-gate.ts'
import { ARCHIVE_PRESETS, NOT_SEJM, parseScrape, scrapeUrl } from '../harvest/archive.ts'
import { SEJM_TITLE, retry5xxCandidates, retryCandidates } from '../harvest/ia-text.ts'

const ZAPOVIT = `Як умру, то поховайте
Мене на могилі,
Серед степу широкого,
На Вкраїні милій,
Щоб лани широкополі,
І Дніпро, і кручі
Було видно, було чути,
Як реве ревучий.
Як понесе з України
У синєє море
Кров ворожу... отоді я
І лани, і гори —
Все покину і полину
До самого Бога
Молитися... а до того
Я не знаю Бога.
Поховайте та вставайте,
Кайдани порвіте
І вражою злою кров'ю
Волю окропіте.
І мене в сем'ї великій,
В сем'ї вольній, новій,
Не забудьте пом'янути
Незлим тихим словом.`
const KAMENIARI = `І я свій вік колись так проживу
Із ночі в ніч, із дня до нового дня,
Як той, що довбає скелю кам'яну,
Бо в серці має віру, що вона
Розсиплеться під ударами його:
Ми — каменярі, ми кидаємо молот
Із усієї сили на тверду скалу,
Щоб розбити її і прокласти шлях
Для тих, хто прийде після нас.`
const ARCH = { id: 'x', url: 'https://archive.org/details/x', licence: 'PD', bytes: 1, status: 200, title: 'Книга' }
const OPTS = { lang: 'uk' as const, witnessType: 'ocr', edition: 'e', authorId: 'a', loc: 'l', dateQuote: 'q' }
const wf = (src: string, title: string, date: string, text: string, extra: object = {}) => witnessFrom(src, { ...ARCH, title, date }, 'hv_x', text, { ...OPTS, ...extra })

// the pre-CQ-1 rule, to prove that real Ukrainian is untouched
const RU_WORDS = /(^|\s)(что|это|или|который|которы\S*|быть|были|также|только|если|когда)(\s|$)/i
const OLD_RU = new RegExp(`[ъѣэЪѢ]|${RU_WORDS.source}`, 'i')
const OK = /^[\p{Script=Cyrillic}\p{M}'’ʼ]+$/u
const oldCount = (text: string) => text.split('\n').filter(l => !OLD_RU.test(l.trim())).flatMap(l => l.match(/[\p{L}\p{M}\p{N}'’ʼ]+/gu) ?? []).filter(w => OK.test(w)).length

describe('CQ-1 gate 1: language gate (non-Cyrillic lines and items, Polish look-alike OCR)', () => {
  it('a line whose words are more than half non-Cyrillic is dropped, a Ukrainian line with one foreign word stays', () => {
    const t = textTokens('Przyznam się do jeszcze większego grzechu слово\nКоли тамъ prijshov до нього, рекъ ему\nIl faut que tu viennes ici', 'l')
    expect(t.foreignLines).toBe(2)
    expect(t.tokens.map(k => k.raw)).toEqual([])   // line 2 holds ъ: Russian apparatus under the default rule
    const u = textTokens('Він читав Goethe і думав про Україну', 'l')
    expect(u.foreignLines).toBe(0); expect(u.tokens.length).toBe(6)
  })
  it('numbers and punctuation do not vote: «1893 р. 24» is neither Cyrillic nor foreign', () => {
    expect(textTokens('Київ 1893 р. 24 стор. 5.000', 'l').foreignLines).toBe(0)
  })
  it('an item of Latin-script text with a few Cyrillic look-alike tokens is skipped (non-cyrillic); the Cyrillic-token count alone would admit it', () => {
    const junk = Array.from({ length: 40 }, () => 'przez połączenie pewnej liczby obecnie od- dzielnie istniejących gmin на со па').join('\n') + String.fromCharCode(10) + ZAPOVIT
    const t = textTokens(junk, 'l'); expect(t.tokens.length).toBeGreaterThanOrEqual(20)
    expect(wf('archive-ukr', 'Kadencja VII sesja V al. 133', '1900', junk)).toEqual({ skip: 'non-cyrillic' })
  })
  it('Polish pages read as Cyrillic look-alikes: the fragment profile separates them, the title alone does not (Kadencja III al. 26 is Ruthenian)', () => {
    const polish = Array.from({ length: 60 }, () => 'ро со па сі пе піс рр ра фо ша уп оо кк діа слово').join(' ').split(' ')
    expect(fragmentShare(polish)).toBeGreaterThan(0.5)
    expect(polishLookalike('Kadencja VII Alegata', polish)).not.toBeNull()
    expect(polishLookalike('Книга без назви', polish)).not.toBeNull()   // over 0.15 on its own
    const ruthenian = 'ъ къкЗоЗ обли гавтами черезъ край до права за право при того є є'.split(' ')
    expect(polishLookalike('[Kadencja III, sesja III, al. 26] Alegata do Sprawozdań Stenograficznych', ruthenian)).toBeNull()
    expect(polishLookalike('Наказ про р. с. 5', 'р с р с наказ про розподіл коштів на рік'.split(' '))).toBeNull()   // single letters are abbreviations, not fragments
  })
  it('the look-alike detector runs on OCR sources only (a wikisource transcription is never judged by it)', () => {
    const text = Array.from({ length: 40 }, () => 'ро со па сі пе піс рр ра фо ша уп оо кк діа').join('\n')
    expect(wf('archive-ukr', 'Kadencja', '1900', text)).toEqual({ skip: 'polish-ocr' })
    expect('skip' in wf('wikisource-uk', 'Kadencja', '1900', text)).toBe(false)
  })
  it('real Ukrainian is unchanged: Шевченко «Заповіт» and Франко «Каменярі» keep every token the old rule kept', () => {
    for (const poem of [ZAPOVIT, KAMENIARI]) {
      const t = textTokens(poem, 'l'); expect(t.foreignLines).toBe(0); expect(t.tokens.length).toBe(oldCount(poem))
      for (const src of ['wikisource-uk', 'archive-ukr']) {
        const w = wf(src, 'Заповіт (Шевченко)', '1845', poem, { autoOldOrth: src === 'archive-ukr' })
        expect('skip' in w).toBe(false); if (!('skip' in w)) { expect(w.excludeReason).toBeUndefined(); expect(w.tokens.length).toBe(oldCount(poem)) }
      }
    }
  })
  it('Кобзар in Latin transliteration (a Latin-script page with look-alike tokens) is not Ukrainian text and is skipped; the Cyrillic Кобзар is not', () => {
    const lat = Array.from({ length: 30 }, () => 'Zapowit Jak umru to pochowajte mene na mohyli serced stepu szyrokoho').join('\n') + '\n' + ZAPOVIT
    expect(wf('wikisource-uk', 'Kobzar’/Do Osnowianenka', '1860', lat)).toEqual({ skip: 'non-cyrillic' })
    expect('skip' in wf('wikisource-uk', 'Кобзар', '1860', ZAPOVIT)).toBe(false)
  })
})

describe('CQ-1 gate 2: a Russian-language document is excluded (excludeReason), Ukrainian text quoting Russian is not', () => {
  const RUSSIAN = Array.from({ length: 40 }, () => 'Он пришёл домой между тем как она была очень рада его приходу потому чтобы он видел все уже давно').join('\n')
  it('at least 20 Russian-only function words and more than twice the Ukrainian-only ones', () => {
    expect(isRussianDoc({ ru: 20, uk: 9 })).toBe(true)
    expect(isRussianDoc({ ru: 20, uk: 10 })).toBe(false)   // not MORE than twice
    expect(isRussianDoc({ ru: 19, uk: 0 })).toBe(false)    // fewer than 20
    expect(stopProfile('Він сказав, що це дуже добре, але вона не знає як його взяти').uk).toBeGreaterThanOrEqual(5)
  })
  it('an OCR item in Russian is written with excludeReason and its evidence quote, so build admit() refuses it', () => {
    const w = wf('archive-ukr', 'Русская книга', '1900', RUSSIAN)
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.excludeReason?.why).toMatch(/російською/); expect(w.excludeReason?.evidence[0]!.quote.length).toBeGreaterThan(10) }
  })
  it('Ukrainian text with a Russian quotation stays admitted (ratio guard)', () => {
    const mixed = ZAPOVIT + '\n' + Array.from({ length: 12 }, () => 'він сказав що це дуже добре але вона не знає як його взяти й вони пішли').join('\n') + '\n' + RUSSIAN.split('\n').slice(0, 3).join('\n')
    const w = wf('archive-ukr', 'Українська книга з цитатою', '1900', mixed)
    expect('skip' in w).toBe(false); if (!('skip' in w)) expect(w.excludeReason).toBeUndefined()
  })
  it('old-orthography Ukrainian (ъ ѣ, no Russian function words) is not a Russian document', () => {
    const old = Array.from({ length: 30 }, () => 'Коли тамъ искуситель приступивъ до него, рекъ ему, що се хлѣбъ').join('\n')
    expect(isRussianDoc(stopProfile(old))).toBe(false)
  })
  it('only OCR sources are judged: a wikisource page in Russian keeps the pre-CQ-1 behaviour (decided on the 21 candidates in analysis/archive-funnel.md)', () => {
    const w = wf('wikisource-uk', 'Русская страница', '1900', RUSSIAN)
    if (!('skip' in w)) expect(w.excludeReason).toBeUndefined()
  })
})

describe('CQ-1 gate 3: oldOrth for pre-1925 Ukrainian-dominant items', () => {
  const OLD = Array.from({ length: 30 }, () => 'Коли тамъ искуситель приступивъ до него, рекъ ему, що се хлѣбъ і це дуже добре').join('\n')
  it('before 1925 and Ukrainian-dominant: lines with ъ ѣ are kept; the Russian function words still drop a line', () => {
    expect(ukDominant(stopProfile(OLD))).toBe(true)
    const w = wf('archive-ukr', 'Вѣстникъ', '1900', OLD + '\nэто что было ему сказано также только', { autoOldOrth: true })
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.tokens.length).toBe(30 * 15); expect(w.dropped.apparatus).toBeGreaterThan(0) }
  })
  it('the old rule would have thrown the whole text away (too-short): the recovery is real', () => {
    expect(wf('archive-ukr', 'Вѣстникъ', '1900', OLD)).toEqual({ skip: 'too-short' })
  })
  it('from 1925 on, or when Russian-dominant, ъ ѣ lines are still apparatus', () => {
    expect(wf('archive-ukr', 'Книга', '1930', OLD, { autoOldOrth: true })).toEqual({ skip: 'too-short' })
    expect(wf('archive-ukr', 'Книга', '1900', OLD, { autoOldOrth: false })).toEqual({ skip: 'too-short' })
    const ru = Array.from({ length: 30 }, () => 'Он пришёл домой между тем как она была очень рада его приходу потому чтобы онъ видел').join('\n')
    expect(ukDominant(stopProfile(ru))).toBe(false)
    expect(wf('archive-ukr', 'Книга', '1900', ru, { autoOldOrth: true })).toEqual({ skip: 'too-short' })   // every line holds ъ (онъ): not recovered
  })
})

describe('CQ-1 fixes 4 and 5: the harvester', () => {
  const L = (o: object) => JSON.stringify(o)
  it('retry-5xx: the latest line is a 5xx, not the Sejm series, not retried before (idempotent)', () => {
    const lines = [L({ id: 'a', status: 500, title: 'Bukovina 1909 č. 81' }), L({ id: 'b', status: 502, title: '[Kadencja VI, sesja III, al. 4] Alegata do Sprawozdań Stenograficznych' }), L({ id: 'c', status: 500, title: 'Věstnik' }), L({ id: 'c', status: 200, title: 'Věstnik' }),
      L({ id: 'd', status: 504, title: 'Ruslan 1911' }), L({ id: 'd', status: 500, title: 'Ruslan 1911', retried5xx: true }), L({ id: 'e', status: 404, title: 'x' })]
    expect(retry5xxCandidates(lines).map(x => x.id)).toEqual(['a'])
  })
  it('retry-404 --all also visits the 404s that were retried once; the default still skips them', () => {
    const lines = [L({ id: 'a', status: 404 }), L({ id: 'd', status: 404, retried404: true })]
    expect(retryCandidates(lines).map(x => x.id)).toEqual(['a']); expect(retryCandidates(lines, true).map(x => x.id)).toEqual(['a', 'd'])
  })
  it('the Scraping API: cursor pages, count in range, same fields as the search; the last page has no cursor', () => {
    const u = scrapeUrl('mediatype:texts AND x', null); expect(u).toMatch(/^https:\/\/archive\.org\/services\/search\/v1\/scrape\?q=/); expect(u).toMatch(/count=1000/); expect(u).not.toMatch(/cursor=/)
    expect(scrapeUrl('q', 'W3si=')).toMatch(/&cursor=W3si%3D$/)
    const p = parseScrape(JSON.stringify({ items: [{ identifier: 'a' }, { identifier: 'b' }], cursor: 'C1', total: 15677, count: 2 }))
    expect(p).toEqual({ docs: [{ identifier: 'a' }, { identifier: 'b' }], cursor: 'C1', total: 15677 })
    expect(parseScrape(JSON.stringify({ items: [], total: 3 }))!.cursor).toBeNull(); expect(parseScrape('<html>')).toBeNull()
  })
  it('the archive-ukr query leaves the Kadencja / Sprawozdanie series out and keeps the date and language limits; other presets are unchanged', () => {
    const q = ARCHIVE_PRESETS['archive-ukr']!.q
    expect(q).toContain(NOT_SEJM); expect(NOT_SEJM).toMatch(/NOT title:\(Kadencja OR Alegata OR Sprawozdanie/); expect(q).toMatch(/1925-12-31/); expect(q).toMatch(/language:\(ukr OR Ukrainian\)/)
    expect(ARCHIVE_PRESETS['archive-kuban']!.q).not.toContain('Kadencja')
    expect(SEJM_TITLE.test('[Kadencja VII, sesja V, al. 133] Alegata do Sprawozdań Stenograficznych')).toBe(true); expect(SEJM_TITLE.test('Вѣстникъ Перемышльскій')).toBe(false)
  })
})
