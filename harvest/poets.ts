/**
 * SPEC 63 HV-2 (owner 2026-10-15: «андруховича та інших поетів його епохи теж додай (мінімум 30)»): contemporary Ukrainian poets of the 1980s–2000s
 * generation (Бу-Ба-Бу, Пропала грамота, Лугосад, Нова дегенерація, вісімдесятники/дев'яностники) from ukrlib.com.ua (robots.txt: sitemaps only, nothing disallowed;
 * no ToS link on the site; pacing 3 s). Their poems are COPYRIGHTED: only VOCABULARY is stored — per poem a bag of lower-case forms with counts (no order, no running text),
 * the token total, and a quote of at most 2 lines for the locator. Nothing else leaves this script.
 * Method: author ids are discovered by walking /books/author.php?id=1..MAX (404 = no author; the page <title> is «Прізвище Ім'я — повні тексти творів»); a title that starts with
 * a roster entry's «Прізвище Ім'я» is a match. Roster entries not found are listed in state.json `missing` (and DECISIONS-NEEDED.md gets one line).
 * Date: the poem page does not give the first publication → `date` = null and `debut` = the poet's debut year from the roster (ingest dates the poem [debut, 2026], flagged);
 * if the page text carries «(YYYY)» in its heading the year is taken. P-2: `p2` = group/institutional context (self-identification quotes are for the owner/agents to add).
 */
import { Harvest, decisionNeeded, type IndexItem } from './lib.ts'

export interface Poet { surname: string; name: string; region: string; debut: number; ctx: string }
export const POETS: Poet[] = [
  { surname: 'Андрухович', name: 'Юрій', region: 'Івано-Франківськ (Прикарпаття)', debut: 1985, ctx: 'Бу-Ба-Бу; Спілка письменників України з 1985 (за біографією на ukrlib)' },
  { surname: 'Неборак', name: 'Віктор', region: 'Львів', debut: 1985, ctx: 'Бу-Ба-Бу' },
  { surname: 'Ірванець', name: 'Олександр', region: 'Київ', debut: 1985, ctx: 'Бу-Ба-Бу' },
  { surname: 'Забужко', name: 'Оксана', region: 'Київ', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Малкович', name: 'Іван', region: 'Київ', debut: 1985, ctx: 'вісімдесятники; видавництво «А-БА-БА-ГА-ЛА-МА-ГА»' },
  { surname: 'Герасим\'юк', name: 'Василь', region: 'Карпати (Косів, Гуцульщина)', debut: 1980, ctx: 'вісімдесятники' },
  { surname: 'Москалець', name: 'Костянтин', region: 'Івано-Франківськ', debut: 1986, ctx: 'вісімдесятники; Пропала грамота' },
  { surname: 'Жадан', name: 'Сергій', region: 'Харків (Слобожанщина)', debut: 1995, ctx: 'дев\'яностники' },
  { surname: 'Кіяновська', name: 'Мар', region: 'Львів', debut: 1997, ctx: 'дев\'яностники' },
  { surname: 'Римарук', name: 'Ігор', region: 'Київ', debut: 1980, ctx: 'вісімдесятники' },
  { surname: 'Воробйов', name: 'Віктор', region: 'Київ', debut: 1980, ctx: 'Київська школа поезії' },
  { surname: 'Кордун', name: '', region: 'Україна', debut: 1990, ctx: 'за списком власника' },
  { surname: 'Мідянка', name: 'Петро', region: 'Закарпаття', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Процюк', name: 'Степан', region: 'Івано-Франківськ', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Луків', name: '', region: 'Україна', debut: 1990, ctx: 'за списком власника' },
  { surname: 'Позаяк', name: 'Юрій', region: 'Львів', debut: 1985, ctx: 'Нова дегенерація / вісімдесятники' },
  { surname: 'Бондар', name: 'Андрій', region: 'Київ', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Шевчук-Мурований', name: '', region: 'Україна', debut: 1990, ctx: 'за списком власника' },
  { surname: 'Лучук', name: 'Орест', region: 'Львів', debut: 1985, ctx: 'Лугосад' },
  { surname: 'Лишега', name: 'Ігор', region: 'Львів', debut: 1990, ctx: 'Лугосад' },
  { surname: 'Іздрик', name: 'Юрій', region: 'Івано-Франківськ', debut: 1985, ctx: 'Пропала грамота; журнал «Четвер»' },
  { surname: 'Махно', name: 'Василь', region: 'Чернівці / Нью-Йорк', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Крук', name: 'Галина', region: 'Львів', debut: 2000, ctx: 'двотисячники' },
  { surname: 'Андрусяк', name: 'Іван', region: 'Київ', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Голобородько', name: 'Василь', region: 'Харків / Київ', debut: 1980, ctx: 'вісімдесятники' },
  { surname: 'Мельників', name: 'Ростислав', region: 'Київ', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Довган', name: 'Ярослав', region: 'Львів', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Сліпушко', name: 'Остап', region: 'Київ', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Лучук', name: 'Ігор', region: 'Львів', debut: 1990, ctx: 'Лугосад' },
  { surname: 'Якимчук', name: 'Любов', region: 'Київ', debut: 2000, ctx: 'двотисячники' },
  { surname: 'Поваляєва', name: 'Світлана', region: 'Київ', debut: 1997, ctx: 'дев\'яностники' },
  { surname: 'Цибулько', name: 'Василь', region: 'Київ', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Бойченко', name: 'Олена', region: 'Київ', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Пашковський', name: 'Василь', region: 'Київ', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Тарнавський', name: 'Остап', region: 'Львів', debut: 1985, ctx: 'вісімдесятники' },
  { surname: 'Гарасим', name: 'Ярослав', region: 'Львів', debut: 1990, ctx: 'дев\'яностники' },
  { surname: 'Мозолевський', name: 'Борис', region: 'Київ', debut: 1985, ctx: 'вісімдесятники' },
]

const dec = (b: Buffer) => new TextDecoder('windows-1251').decode(b)
export const ukrlibTitle = (html: string) => (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').trim()
/** «Андрухович Юрій — повні тексти творів…» → match against the roster */
export function matchPoet(title: string): Poet | undefined {
  const t = title.replace(/\s+—.*$/, '').trim()
  return POETS.find(p => t.startsWith(p.surname) && (!p.name || t.slice(p.surname.length).trim().startsWith(p.name)))
}
export function workLinks(html: string): { tid: string; title: string }[] {
  const seen = new Set<string>(), out: { tid: string; title: string }[] = []
  for (const m of html.matchAll(/printit\.php\?tid=(\d+)[^>]*>([^<]{1,120})</g)) if (!seen.has(m[1]!)) { seen.add(m[1]!); out.push({ tid: m[1]!, title: m[2]!.trim() }) }
  return out
}
/** the poem body of a printit page (between the ad block and the first following <div>/<script>) */
export function poemText(html: string): string {
  const i = html.indexOf('<!-- /.post-right-zagolovok -->')
  if (i < 0) return ''
  const rest = html.slice(i + 31), e = rest.search(/<div class=["']sub-pages-link|<div class=["']paginator|<div class=["']social-box/)
  return (e < 0 ? rest : rest.slice(0, e)).replace(/<(script|ins|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<div[\s\S]*?<\/div>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&#?\w+;/g, ' ').trim()
}
export function bagOfForms(text: string): { forms: Record<string, number>; n: number } {
  const forms: Record<string, number> = {}; let n = 0
  for (const m of text.matchAll(/[\p{Script=Cyrillic}\p{M}'’ʼ-]+/gu)) {
    const w = m[0].replace(/^[-'’ʼ]+|[-'’ʼ]+$/g, '').toLowerCase().normalize('NFC').replace(/[’ʼ]/g, "'")
    if (!w || /[ыэъё]/.test(w)) continue
    forms[w] = (forms[w] ?? 0) + 1; n++
  }
  return { forms, n }
}
export const quote2 = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 2)
export const yearInHeading = (text: string) => text.split('\n').slice(0, 3).join(' ').match(/\((1[89]\d\d|20[0-2]\d)\)/)?.[1] ?? null

async function main() {
  const MAX = 2600
  const h = new Harvest('poets', { delayMs: 3000, logEvery: 50 })
  const st = h.state<{ next: number; authors: Record<string, string>; finished?: boolean }>({ next: 1, authors: {} })
  const fetchHtml = async (u: string) => { const { status, res } = await h.get(u); return { status, html: status === 200 ? dec(Buffer.from(await res.arrayBuffer())) : '' } }
  const doAuthor = async (aid: string, nm: string) => {
    const p = POETS.find(x => `${x.surname} ${x.name}`.trim() === nm)!
    const { html: ah } = await fetchHtml(`https://www.ukrlib.com.ua/books/author.php?id=${aid}`)
    for (const w of workLinks(ah)) {
      const id = `poets:${w.tid}`
      if (h.has(id)) continue
      const { status, html } = await fetchHtml(`https://www.ukrlib.com.ua/books/printit.php?tid=${w.tid}`)
      const text = status === 200 ? poemText(html) : ''
      const { forms, n } = bagOfForms(text)
      const item: IndexItem = {
        id, url: `https://www.ukrlib.com.ua/books/printit.php?tid=${w.tid}`, date: yearInHeading(text), licence: '© автор; лише словник (vocab-only), цитата ≤ 2 рядків', bytes: Buffer.byteLength(JSON.stringify(forms)), status,
        title: w.title, author: `${p.name} ${p.surname}`.trim(), region: p.region, debut: p.debut, p2: p.ctx, vocabOnly: true, tokens: n,
      }
      h.put(`${id.replace(':', '_')}`, JSON.stringify({ id, title: w.title, forms, n, quote: quote2(text) }), [item])
    }
  }

  if (!st.finished) {
    for (let id = st.next; id <= MAX; id++) {
      const { html } = await fetchHtml(`https://www.ukrlib.com.ua/books/author.php?id=${id}`)
      const p = html ? matchPoet(ukrlibTitle(html)) : undefined
      if (p) { st.authors[String(id)] = `${p.surname} ${p.name}`.trim(); h.log(`author ${id} = ${st.authors[String(id)]}`); await doAuthor(String(id), st.authors[String(id)]!) }
      st.next = id + 1; if (id % 25 === 0) h.saveState(st)
    }
    st.finished = true; h.saveState(st)
    const found = new Set(Object.values(st.authors))
    const missing = POETS.filter(p => !found.has(`${p.surname} ${p.name}`.trim())).map(p => `${p.surname} ${p.name}`.trim())
    h.saveState({ ...st, missing })
    if (missing.length) decisionNeeded(`- poets: NOT FOUND on ukrlib.com.ua (id walk 1..${MAX}): ${missing.join(', ')} — need another allowed source or an owner pointer (vocabulary-only either way).`)
  }
  for (const [aid, nm] of Object.entries(st.authors)) await doAuthor(aid, nm)   // resume: authors found in an earlier run (done items are skipped)
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/poets.ts')) await main()
