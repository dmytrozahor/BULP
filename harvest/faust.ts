/**
 * SPEC 63 HV-2 (owner 2026-10-15: «о і фауста в перекладі лукаша»): Goethe, «Фауст», Микола Лукаш's translation (first edition 1955). Lukash († 1988) is under copyright:
 * VOCABULARY ONLY — per page of the ukrlib text a bag of lower-case forms with counts (no order), the token total and a ≤ 2-line quote for the locator.
 * Source: ukrlib.com.ua/world/printit.php?tid=145 (robots.txt: sitemaps only; pagination ?page=N; 3 s pacing). chtyvo.org.ua (fb2/epub/djvu editions 2003, 2013) is gone behind
 * the «Завершення проєкту Чтиво» page and is not scraped. Witness: author Лукаш (translator), original Гете, date 1955, witnessType `translation`.
 */
import { Harvest, type IndexItem } from './lib.ts'
import { bagOfForms, poemText, quote2 } from './poets.ts'

const TID = 145
const dec = (b: Buffer) => new TextDecoder('windows-1251').decode(b)
export const lastPage = (html: string) => Math.max(1, ...[...html.matchAll(/[?&;]page=(\d+)/g)].map(m => +m[1]!))

async function main() {
  const h = new Harvest('faust-lukash', { delayMs: 3000, logEvery: 5 })
  let last = 1
  for (let page = 1; page <= last; page++) {
    const id = `faust-lukash:${page}`
    const { status, res } = await h.get(`https://www.ukrlib.com.ua/world/printit.php?tid=${TID}&page=${page}`)
    const html = status === 200 ? dec(Buffer.from(await res.arrayBuffer())) : ''
    last = Math.max(last, lastPage(html))
    if (h.has(id)) continue
    const text = poemText(html), { forms, n } = bagOfForms(text)
    const item: IndexItem = {
      id, url: `https://www.ukrlib.com.ua/world/printit.php?tid=${TID}&page=${page}`, date: '1955', licence: '© спадкоємці М. Лукаша († 1988); лише словник (vocab-only), цитата ≤ 2 рядків',
      bytes: Buffer.byteLength(JSON.stringify(forms)), status, title: `Ґете, «Фауст», пер. М. Лукаша, ukrlib стор. ${page}`, author: 'Микола Лукаш', origAuthor: 'Йоганн Вольфганг Ґете',
      region: 'Київ', witnessType: 'translation', editionNote: 'перше видання 1955; текст ukrlib — пізніша редакція перекладу', p2: 'перекладач; вид. Держлітвидав 1955; цитата самоідентифікації — на додавання', vocabOnly: true, tokens: n,
    }
    h.put(`faust_${page}`, JSON.stringify({ id, forms, n, quote: quote2(text) }), [item])
  }
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/faust.ts')) await main()
