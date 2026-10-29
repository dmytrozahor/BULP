/**
 * SPEC 63 SRC-4: the OLDEST word lists of the East Slavic tradition that are TYPED online (litopys.org.ua / «Ізборник», the 1964 edition of В. В. Німчука «Лексис Лаврентія Зизанія. Синоніма славеноросская»,
 * K.: Наукова думка, appendix pages zyz70–73, zyz100–102). Owner 2026-10-29: «взагалі треба найстарезні словники такі знайти аби в по епохах показувалися різні».
 * Every text is one `<p class=K1><b>headword</b>, gloss.</p>` per article (the same layout as the Лексис zyz99), so the parser of core/hist-lex.ts (`nimchukText`) is reused; what differs is the DATE and the KIND of the gloss:
 *   - «Синонїма славеноросскаѧ» (anonymous, after Беринда 1627, 2nd half of the 17th c.; first printed by П. Житецький 1889): a REVERSED Беринда: word of the «проста мова» → church-Slavonic word (so its headwords are modern-lemma keys);
 *   - «Лексисъ съ толкованіемъ словенскихъ мовъ просто» (anonymous, 16th c. per Німчук; printed by архімандрит Амфілохій 1884): same kind;
 *   - «Рѣчь жидовьскаго ıазыка преложена на роускую» (the Novgorod Кормча copied 1282): a foreign (mostly Hebrew/Greek) word of the Scripture → the East Slavic word;
 *   - «Тлъкованіе неудобь познаваемомъ въ писаныхъ речемь» (manuscript 1431): a hard Church Slavonic/South Slavic word → an East Slavic one.
 * All four are public domain (texts of the 13th–17th c.; the 1884/1889 prints are older than 70 years after the death of any editor); the 1964 transcription is an edition, so the page is fetched, not redistributed.
 * The date of a row is the date of the manuscript/print where known, otherwise the period the editor assigns (a RANGE, so the card shows «період», never a false precise year).
 * The 1282 and 1431 glossaries are Novgorod/Moscow-Rus' manuscripts, not specifically Ukrainian: Німчук prints them as «перші східнослов'янські словники»; they are stored with that label.
 * Pure (no node imports).
 */
import { nimchukText, type LexArticle, type LexStats } from './hist-lex.ts'
import type { SeRow } from './se.ts'

export interface TypedLexSpec {
  id: string; dict: string; short: string
  /** the years the glosses belong to (a range when the source only gives a period) */ years: [number, number]
  /** litopys pages (in the order of the text); the host is fixed in TYPED_BASE */ pages: string[]
  /** how the head row's gloss is introduced («проста мова: …», «тлумачення: …») */ lead: string
  /** how the gloss row names the headword it translated: «ц.-сл. «слово» = …» */ tag: string
  /** an explanatory glossary (1282, 1431): articles with more than this many comma items are explanations, not glosses → skipped */ maxItems?: number
  /** the dating note shown in the registry */ dating: string
  /** REVERSED list (Синоніма: the headword is the word of the simple language, the gloss the church-Slavonic one): the head rows are then the senses of modern words, there are no gloss rows */ rev?: boolean
}
export const TYPED_BASE = 'http://litopys.org.ua/zyzlex/'
export const TYPED_LEX_SPECS: TypedLexSpec[] = [
  { id: 'glossary1282', dict: 'glossary1282', short: 'Словничок 1282 (Кормча)', years: [1282, 1282], pages: ['zyz101.htm'], lead: 'тлумачення', tag: 'слово словничка 1282', maxItems: 3, dating: 'рукопис Новгородської кормчої 1282 р. (Німчук 1964)' },
  { id: 'glossary1431', dict: 'glossary1431', short: 'Тлъкованіе 1431', years: [1431, 1431], pages: ['zyz102.htm'], lead: 'тлумачення', tag: 'слово глосарія 1431', maxItems: 3, dating: 'рукопис 1431 р. (Німчук 1964)' },
  { id: 'lexis-prosto', dict: 'lexis-prosto', short: 'Лексис … просто', years: [1501, 1600], pages: ['zyz100.htm'], lead: 'проста мова', tag: 'ц.-сл.', dating: 'рукописний словник невідомого автора XVI ст. (Німчук 1964); видав Амфілохій 1884' },
  { id: 'synonima', dict: 'synonima', short: 'Синоніма славеноросскаѧ', years: [1650, 1700], pages: ['zyz70.htm', 'zyz71.htm', 'zyz72.htm', 'zyz73.htm'], lead: 'ц.-сл. відповідник', tag: 'ц.-сл.', rev: true, maxItems: 8, dating: 'після Беринда 1627; середина або 2-га пол. XVII ст. (Житецький 1889; Німчук 1964)' },
]
export const TYPED_SOURCE = 'Лексис Лаврентія Зизанія. Синоніма славеноросская. Підг. текстів і вступ. ст. В. В. Німчука. К.: Наукова думка, 1964 (додатки: litopys.org.ua/zyzlex/zyz70–73, zyz100–102)'

/** the Latin look-alikes and the old letters of the typed pages → the modern Cyrillic key; applied to tokens that already contain a Cyrillic letter */
const LAT: Record<string, string> = { a: 'а', A: 'А', c: 'с', C: 'С', e: 'е', E: 'Е', o: 'о', O: 'О', p: 'р', P: 'Р', x: 'х', X: 'Х', y: 'у', i: 'і', I: 'І', T: 'Т', H: 'Н', K: 'К', M: 'М', B: 'В' }
const OLD: Record<string, string> = { 'ѡ': 'о', 'Ѡ': 'О', 'ꙗ': 'я', 'ѧ': 'я', 'ү': 'у', 'ѫ': 'у', 'ı': 'і', 'ꙋ': 'у' }
export function typedText(html: string): string {
  const s = nimchukText(html.replace(/&#305;\s*a/g, 'я').replace(/&#305;/g, 'і'))
  return s.split(/(\s+)/).map(t => /\p{Script=Cyrillic}/u.test(t) ? [...t].map(c => LAT[c] ?? OLD[c] ?? c).join('') : t).join('')
}
export function parseTypedLexicon(html: string, spec: TypedLexSpec): { articles: LexArticle[]; stats: LexStats } {
  const st: LexStats = { pages: 1, lines: 0, candidates: 0, skippedHead: 0, skippedGloss: 0, skippedScore: 0, skippedVerify: 0, passed: 0, glossWords: 0, passRate: 0 }
  const articles: LexArticle[] = []
  for (const m of html.matchAll(/<p class=K1><b>([\s\S]*?)<\/b>([\s\S]*?)<\/p>/g)) {
    const raw = typedText(m[1]!).replace(/[.:;\s]+$/, '')
    if (raw.length < 2 && !m[2]!.trim()) continue   // a letter heading («А.»), not an article
    st.lines++; st.candidates++
    const rest = typedText(m[2]!).replace(/^[\s,;:]+/, '')
    const heads = raw.split(/\s*,\s*/).map(h => h.replace(/[,.;:\s]+$/, '')).filter(Boolean)   // «Таимичище, копеличище» = two headwords of one article
    const okHeads = heads.filter(h => !h.includes(' ') && /^[\p{Script=Cyrillic}'’-]+$/u.test(h) && h.length >= 3)
    if (!okHeads.length) { st.skippedHead++; continue }
    const first = rest.split(/\.\s/)[0]!.replace(/[.\s]+$/, '')
    const items = first.split(/\s*[,;]\s*|\s+(?:албо|або|или)\s+/).map(g => g.replace(/^[\s\-–—.]+|[\s\-–—.]+$/g, '')).filter(g => g.length >= 2 && /^[\p{Script=Cyrillic}'’ -]+$/u.test(g) && g.split(' ').length <= 3)
    if (!items.length || (spec.maxItems && first.split(/\s*[,;]\s*/).length > spec.maxItems)) { st.skippedGloss++; continue }
    const glosses = [...new Set(items)]
    for (const head of okHeads) { articles.push({ head, glosses, page: 0 }); st.passed++; st.glossWords += glosses.filter(g => !g.includes(' ')).length }
  }
  st.passRate = st.candidates ? Math.round((st.passed / st.candidates) * 1000) / 1000 : 0
  return { articles, stats: st }
}
const loc = (spec: TypedLexSpec) => `${spec.short}, Німчук 1964, ${TYPED_BASE}${spec.pages[0]}`
/** (b) the old headword row: its East Slavic equivalents are the gloss, dated by the manuscript/print (a range when only the period is known) */
export const typedHeadRows = (a: LexArticle[], spec: TypedLexSpec): [string, SeRow][] =>
  a.map(x => [x.head, { d: spec.dict, g: `${spec.lead}: ${x.glosses.join(', ')}`.slice(0, 200), e: spec.years, l: loc(spec) } as SeRow])
/** (a) the sense of a one-word gloss, keyed by the gloss word (a modern lemma through the folds); words of fewer than 4 letters are not keyed (function words, debris) */
export const typedGlossRows = (a: LexArticle[], spec: TypedLexSpec): [string, SeRow][] =>
  spec.rev ? [] : a.flatMap(x => x.glosses.filter(g => !g.includes(' ') && g.length >= 4).map(g => [g, { d: spec.dict, g: `${spec.tag} «${x.head}»${x.glosses.length > 1 ? ` = ${x.glosses.filter(y => y !== g).join(', ')}` : ''}`.slice(0, 200), e: spec.years, l: loc(spec) } as SeRow] as [string, SeRow]))
