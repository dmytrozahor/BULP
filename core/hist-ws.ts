/**
 * SPEC 63 SE-12 (part 2): the two oldest UKRAINIAN → Russian glossaries printed before 1820 that are TYPED online on uk.wikisource.org (proofread transcriptions of the prints):
 *   - Іван Котляревський, «Собраніе Малороссійскихъ словъ, содержащихся въ Энеидѣ…», в кінці «Малороссійской Энеиды» (Санкт-Петербург 1798; page «Енеїда (1798)/Словник»);
 *   - Олексій Павловський, «Краткій Малороссійскій Словарь» у «Грамматикѣ Малороссійскаго нарѣчія» (Санкт-Петербург 1818; pages «…/Простыя слова», «…/Слова принадлежащія къ Натуральной Исторіи»,
 *     the lists of baptismal names and «Фразы, и пословицы» are not read: names are not senses of words).
 * Both prints are public domain (1798, 1818; the authors died in 1838 and 1827). The wiki transcription is CC BY-SA: the project reads the headword and the Russian gloss (facts of a public domain print),
 * names the page and the revision in SOURCES.txt and in every row's locator, and does not redistribute the page.
 * Layouts (checked 2026-10-29): Котляревський = running text «Head,<gap span>gloss.<br>», a continuation line without the gap belongs to the previous gloss; Павловський = table rows
 * `<td><span class=hl>Head</span>, <span class=hl>variant</span></td><td>gloss</td>`, an ending «-ая» outside a span is not a headword.
 * Pure (no node imports).
 */
import type { SeRow } from './se.ts'

export interface WsSpec { id: string; dict: string; short: string; year: number; layout: 'flow' | 'table'; titles: string[]; license: string }
export const WS_API = 'https://uk.wikisource.org/w/api.php'
export const WS_SPECS: WsSpec[] = [
  { id: 'kotliarevsky1798', dict: 'kotliarevsky1798', short: 'Котляревський, Собраніе слов 1798', year: 1798, layout: 'flow', titles: ['Енеїда (1798)/Словник'], license: 'uk.wikisource.org «Енеїда (1798)/Словник» (CC BY-SA 4.0 over a public domain print of 1798)' },
  { id: 'pavlovsky1818', dict: 'pavlovsky1818', short: 'Павловський, Словарь 1818', year: 1818, layout: 'table',
    titles: ['Грамматика Малороссійскаго нарѣчія/Простыя слова', 'Грамматика Малороссійскаго нарѣчія/Слова принадлежащія къ Натуральной Исторіи'],
    license: 'uk.wikisource.org «Грамматика Малороссійскаго нарѣчія/…» (CC BY-SA 4.0 over a public domain print of 1818)' },
]
export interface WsArticle { head: string; gloss: string; section: number }
export interface WsStats { candidates: number; passed: number; skippedHead: number; skippedGloss: number; passRate: number }

const ENT: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/g, (m, n) => ENT[n] ?? m)
const tidy = (s: string) => decode(s).replace(/\s+/g, ' ').trim()
/** the modern-ish lookup key of an 18th–19th c. «ярижка» headword: stress marks, final ъ, ы, э, ё folded; и/ѣ stay (the build's derivation candidates decide) */
export function wsKey(w: string): string {
  return w.normalize('NFD').replace(/[̀́̂̋]/g, '').normalize('NFC').toLowerCase().replace(/ъ$/, '').replace(/ы/g, 'и').replace(/э/g, 'е').replace(/ё/g, 'йо').replace(/[()]/g, '')
}
const WORD = /^[\p{Script=Cyrillic}'’-]+$/u

/** Котляревський: running text with <br /> between articles and a «gap» span between the headword and the gloss */
export function parseWsFlow(html: string): { articles: WsArticle[]; stats: WsStats } {
  const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const at = body.indexOf('prp-pages-output'); const text = at >= 0 ? body.slice(body.indexOf('>', at) + 1) : body
  const marked = text.replace(/<span style="display:inline-block; width:2em;">(?:&#160;|\s)*<\/span>/g, '§').replace(/<br\s*\/?>/g, '\n').replace(/<\/p>/g, '\n').replace(/<span class="pagenum[^>]*><\/span>/g, '').replace(/<[^>]+>/g, '')
  const lines = decode(marked).split(/\n/).map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
  const raw: { head: string; gloss: string }[] = []
  for (const l of lines) {
    const i = l.indexOf('§')
    if (i > 0) raw.push({ head: l.slice(0, i).replace(/[,\s]+$/, ''), gloss: l.slice(i + 1).trim() })
    else if (raw.length && !/^сторінка/.test(l)) raw[raw.length - 1]!.gloss += ' ' + l
  }
  return finish(raw.map(r => ({ ...r, section: 0 })))
}
/** Павловський: table rows; the headword cell has highlighted spans, «-ая» endings are plain text */
export function parseWsTable(html: string, section = 0): { articles: WsArticle[]; stats: WsStats } {
  const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const raw: { head: string; gloss: string; section: number }[] = []
  for (const m of body.matchAll(/<tr>\s*(?:<td rowspan[^>]*>\s*<\/td>\s*)?<td>((?:(?!<\/td>)[\s\S])*?<span style="background-color: #FFFFAE[\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td><\/tr>/g)) {
    const spans = [...m[1]!.matchAll(/(.?)<span style="background-color: #FFFFAE[^>]*>([\s\S]*?)<\/span>/g)].filter(s => s[1] !== '-').map(s => tidy(s[2]!.replace(/<[^>]+>/g, '')))
    const gloss = tidy(m[2]!.replace(/<[^>]+>/g, ''))
    if (!spans.length) continue
    for (const head of spans) raw.push({ head, gloss, section })
  }
  return finish(raw)
}
function finish(raw: { head: string; gloss: string; section: number }[]): { articles: WsArticle[]; stats: WsStats } {
  const st: WsStats = { candidates: 0, passed: 0, skippedHead: 0, skippedGloss: 0, passRate: 0 }, articles: WsArticle[] = []
  for (const r of raw) {
    st.candidates++
    const head = wsKey(tidy(r.head))
    if (head.length < 2 || !WORD.test(head)) { st.skippedHead++; continue }   // a phrase («Батигъ Петривъ»), a Latin or numbered line
    const gloss = r.gloss.replace(/\s+/g, ' ').replace(/^[\s,;:.]+/, '').trim()
    if (gloss.length < 2 || !/\p{Script=Cyrillic}/u.test(gloss)) { st.skippedGloss++; continue }
    articles.push({ head, gloss, section: r.section }); st.passed++
  }
  st.passRate = st.candidates ? Math.round((st.passed / st.candidates) * 1000) / 1000 : 0
  return { articles, stats: st }
}
export const wsRows = (a: WsArticle[], spec: WsSpec, rev: string): [string, SeRow][] =>
  a.map(x => [x.head, { d: spec.dict, g: x.gloss.slice(0, 200), e: [spec.year, spec.year], l: `${spec.short}; ${spec.license}${rev ? `; ред. ${rev}` : ''}`.slice(0, 260) } as SeRow])
