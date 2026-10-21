/**
 * SPEC 63 HV-5 (owner 2026-10-21: «оригінали тільки», «загальноприйняте датування»): Величко, Грабянка, «Історія Русів» in their ORIGINAL 19th-century editions
 * (never the litopys modern translations). Source = archive.org OCR text (`<id>_djvu.txt`) of the scans; each record is verified from its archive.org metadata
 * before the text is fetched (title pattern and edition year must match, else the item is recorded with status 0 and nothing is harvested).
 * DATE = the generally accepted composition date, quoted; the edition year is kept separately (`editionDate`).
 *   Величко: the edition's own title page «Составил Самоил Величко, бывший канцелярист Канцелярии Войска Запорожского, 1720» (quoted from the archive.org record);
 *   Грабянка: «Закінчений у 1710 р.» (litopys.org.ua/grab/hrab.htm, annotation of the 1992 edition — used for the date only, not for the text);
 *   Історія Русів: no consensus — uk.wikipedia (розд. «Теорії про авторство та дату написання»): «хронологія датування створення «Історії Русів» коливається в межах 1760—1840-х років»; the first edition (Москва 1846) is the upper bound → range 1760-1846, language undetermined (Russian-leaning).
 * The editors' Russian apparatus is removed at ingest (Russian-function-word lines). Usage: tsx harvest/hv5-orig.ts   (resumable)
 */
import { Harvest, type IndexItem } from './lib.ts'

export interface OrigWork { id: string; ia: string; titleRe: RegExp; editionDate: string; date: string; dateQuote: string; dateWhere: 'ia-description' | 'static'; title: string; author: string; edition: string; lang: 'ruthenian' | 'undetermined'; region: string }
const PD = 'PD (автор † ≤ XVIII ст., видання ≤ 1864; скан archive.org, OCR не вичитано)'
const VELICHKO_Q = 'Самоил Величко, бывший канцелярист Канцелярии Войска Запорожского, 1720'
const VED = (v: string, y: string) => `Летопись событий в Юго-Западной России в XVII веке, т. ${v}, изд. Временной комиссией для разбора древних актов, Киев ${y}`
export const HV5_ORIG: OrigWork[] = [
  { id: 'hv5o:velychko-t1-1848', ia: 'letopissobytijvjugozapadnojrossiivxvii46', titleRe: /Т\. 1\b/, editionDate: '1848', date: '1720', dateQuote: VELICHKO_Q, dateWhere: 'ia-description', title: 'Летопись событий в Юго-Западной России в XVII веке, т. 1 (Самійло Величко)', author: 'Самійло Величко', edition: VED('1', '1848'), lang: 'ruthenian', region: 'Київ' },
  { id: 'hv5o:velychko-t2-1851', ia: 'letopissobytijvjugozapadnojrossiivxvii43', titleRe: /Т\. 2\b/, editionDate: '1851', date: '1720', dateQuote: VELICHKO_Q, dateWhere: 'ia-description', title: 'Летопись событий в Юго-Западной России в XVII веке, т. 2 (Самійло Величко)', author: 'Самійло Величко', edition: VED('2', '1851'), lang: 'ruthenian', region: 'Київ' },
  { id: 'hv5o:velychko-t3-1855', ia: 'letopissobytijvjugozapadnojrossiivxvii98', titleRe: /Т\. 3\b/, editionDate: '1855', date: '1720', dateQuote: VELICHKO_Q, dateWhere: 'ia-description', title: 'Летопись событий в Юго-Западной России в XVII веке, т. 3 (Самійло Величко)', author: 'Самійло Величко', edition: VED('3', '1855'), lang: 'ruthenian', region: 'Київ' },
  { id: 'hv5o:hrabianka-1853', ia: 'hrabianka', titleRe: /Грабянки/, editionDate: '1853', date: '1710', dateQuote: 'Закінчений у 1710 р.', dateWhere: 'static', title: 'Летопись гадячского полковника Григория Грабянки (Киев 1853)', author: 'Григорій Грабянка', edition: 'Летопись гадячского полковника Григория Грабянки, изд. Временною коммиссиею для разбора древних актов, под ред. И. Самчевского, Киев, Университетская тип., 1853', lang: 'ruthenian', region: 'Київ' },
  { id: 'hv5o:istoria-rusov-1846', ia: '10691471bsb', titleRe: /rusov/i, editionDate: '1846', date: '1760-1846', dateQuote: 'хронологія датування створення «Історії Русів» коливається в межах 1760—1840-х років (uk.wikipedia, розд. «Теорії про авторство та дату написання»); верхня межа — перше видання Бодянського, Москва 1846', dateWhere: 'static', title: 'История русов или Малой России (ред. О. Бодянський, Москва 1846)', author: 'невідомий автор (приписують Г. Кониському)', edition: 'Исторія Русовъ или Малой Россіи, Москва, Университетская тип., 1846 (BSB München 4 Russ. 20 g)', lang: 'undetermined', region: 'Київ / Лівобережжя' },
]
export const HV5_ORIG_NOTE = '- NOTE (HV-5) Величко т. 4 (1864, «Приложения») is a collection of other documents, not Величко\'s text — not harvested. Хмельницький/«Действия презельной…» 1854 (Dejstvijaprezelnojiotnachala…) is the same work as the Грабянка edition above and is not fetched twice.'

export function origItem(w: OrigWork, url: string, bytes: number, status: number, verified: string): IndexItem {
  return {
    id: w.id, url, date: status === 200 ? w.date : null, licence: PD, bytes, status, title: w.title, author: w.author, region: w.region, ocr: true,
    dateQuote: w.dateQuote, dateBasis: 'accepted composition date (generally accepted dating, owner 2026-10-21)', editionDate: w.editionDate, edition: w.edition, lang: w.lang, witnessType: 'later_ed', iaItem: w.ia, verified,
  }
}
const plain = (s: unknown) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

async function main() {
  const { decisionNeeded } = await import('./lib.ts')
  decisionNeeded(HV5_ORIG_NOTE)
  const h = new Harvest('hv5-orig', { delayMs: 2000, logEvery: 1 })
  for (const w of HV5_ORIG) {
    if (h.has(w.id)) continue
    const details = `https://archive.org/details/${w.ia}`
    const meta = await h.getJson<{ metadata?: Record<string, unknown>; files?: { name: string }[] }>(`https://archive.org/metadata/${w.ia}`)
    const m = meta.metadata ?? {}, file = `${w.ia}_djvu.txt`
    const yearOk = String(m.date ?? m.year ?? '').startsWith(w.editionDate), titleOk = w.titleRe.test(plain(m.title)) || w.titleRe.test(w.ia)
    const quoteOk = w.dateWhere === 'static' || plain(m.description).includes(w.dateQuote), hasText = (meta.files ?? []).some(f => f.name === file)
    if (!yearOk || !titleOk || !quoteOk || !hasText) { h.log(`${w.id}: record mismatch (year ${yearOk}, title ${titleOk}, quote ${quoteOk}, text layer ${hasText}); not harvested`); h.put(`${w.id.replace(':', '_')}.none`, '', [origItem(w, details, 0, 0, `mismatch: ${plain(m.title).slice(0, 80)} | ${m.date}`)]); continue }
    const { status, res } = await h.get(`https://archive.org/download/${w.ia}/${encodeURIComponent(file)}`, { soft5xx: true })
    if (status !== 200) { h.put(`${w.id.replace(':', '_')}.none`, '', [origItem(w, details, 0, status, 'http')]); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    h.put(w.id.replace(':', '_'), buf, [origItem(w, details, buf.length, 200, `archive.org metadata: «${plain(m.title).slice(0, 90)}», ${m.date}`)])
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hv5-orig.ts')) await main()
