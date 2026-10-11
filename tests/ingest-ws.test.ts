import { describe, it, expect } from 'vitest'
import { parsePage, parseHtml, renderUrl } from '../pipelines/ingest-wikisource.ts'

const HEADER = `<div id="headertemplate" class="headerRaw ws-noexport"><table class="headertemplate"><tr><td>
  <span id="header_author_text"><span class="fn">Іван Франко</span></span> Навігація Заголовок</td></tr></table></div>`
const pn = (n: string) => `<p><span class="pagenum ws-pagenum" data-page-number="${n}" title="x"></span></p>`
const words = (r: { tokens: { raw: string }[] }) => r.tokens.map(t => t.raw).join(' ')

describe('wikisource cleaning rules', () => {
  it('removes header/navigation templates', () => {
    const r = parsePage(`${HEADER}<div class="poem"><p>Против ро́жна перти,<br/>Против хвиль плисти́</p></div>`, 'T')
    expect(words(r)).toBe('Против ро́жна перти Против хвиль плисти́')   // stress marks kept in raw
  })
  it('removes footnote markers and lists and counts them as apparatus', () => {
    const r = parsePage(`<p>Слово<sup class="reference"><a>[1]</a></sup> далі</p><div class="references"><ol class="references"><li>Примітка редактора тут</li></ol></div>`, 'T')
    expect(words(r)).toBe('Слово далі')
    expect(r.apparatus).toBeGreaterThanOrEqual(3)
  })
  it('uses page numbers as locator and splits segments on <br> and blocks', () => {
    const r = parsePage(`${pn('7')}<p>раз<br/>два</p>${pn('8')}<p>три</p>`, 'Вірші')
    expect(r.tokens.map(t => [t.raw, t.loc, t.s])).toEqual([['раз', 'Вірші, с. 7', 0], ['два', 'Вірші, с. 7', 1], ['три', 'Вірші, с. 8', 2]])
  })
  it('ignores non-numeric page labels (Front, ToC) for the locator', () => {
    expect(parsePage(`${pn('Front')}<p>титул</p>`, 'T').tokens[0]!.loc).toBe('T')
  })
  it('removes licence boxes', () => {
    const r = parsePage(`<p>текст</p><table><tr><td><p>Ця робота перебуває в суспільному надбанні в усьому світі.</p></td></tr></table><div class="licFrame"><p>Ця робота перебуває у суспільному надбанні</p></div>`, 'T')
    expect(words(r)).toBe('текст')
  })
  it('keeps original orthography (ъ ѣ ы ї є ё)', () => {
    expect(words(parsePage('<p>Эней былъ парубокъ моторный и хлопецъ вѣсь удавсь на ёмъ</p>', 'T'))).toContain('былъ')
    expect(words(parsePage('<p>свято́ї надїї, мойого єстества</p>', 'T'))).toBe('свято́ї надїї мойого єстества')
  })
  it('hrinchenko1908: cuts Krymsky appendices from «Додаток до статі Б. Д. Грінченка» on', () => {
    const html = `<p>Правопис Грінченка тут</p><div style="text-align:center">Додаток до статі Б. Д. Грінченка</div><p>Я мав нагоду перечитати статтю</p>`
    const r = parsePage(html, 'T', 'hrinchenko1908', 'hrinchenko')
    expect(words(r)).toBe('Правопис Грінченка тут')
    expect(r.apparatus).toBeGreaterThan(5)
  })
  it('cuts the table of contents («ЗМІСТ:») of a first edition', () => {
    expect(words(parsePage('<p>Вірш</p><div><b>ЗМІС</b>Т:</div><div>Сім струн</div>', 'T', 'lesya1892', 'lesya'))).toBe('Вірш')
  })
  it('skips subpages whose header author differs (translations)', () => {
    const html = HEADER.replace('Іван Франко', 'Адам Міцкевич') + '<p>переклад</p>'
    const r = parsePage(html, 'T', 'franko1893', 'franko')
    expect(r.skipped).toMatch(/Міцкевич/); expect(r.tokens).toHaveLength(0)
  })
  it('parses attributes with > inside quotes (data-mw JSON) and entities', () => {
    const el = parseHtml(`<div data-mw='{"a":"x>y"}' class="c">a&nbsp;&amp;&#1111;</div>`)
    expect(el.c[0]).toMatchObject({ t: 'div', a: { class: 'c' } })
  })
  it('builds render URLs', () => {
    expect(renderUrl('Енеїда (1798)/I')).toBe('https://uk.wikisource.org/w/index.php?title=%D0%95%D0%BD%D0%B5%D1%97%D0%B4%D0%B0_(1798)%2FI&action=render')
  })
})
