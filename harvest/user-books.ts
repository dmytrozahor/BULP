/**
 * SPEC 63 UB-1: owner-supplied MODERN scholarly books as vocabulary-only `user-books` items (no quotable text; the ≤ 2-line quote of pipelines/ingest-harvest.ts is the locator).
 * Book 1: Юрій Медведик, «Ad fontes: з історії української музики XVII – початку XX ст.: вибрані статті, матеріали, рецензії», Львів: ЛНУ ім. Івана Франка, 2015, 618 с.,
 * ISBN 978-617-10-0027-8 (title page and imprint of the PDF). Articles, source descriptions and reviews by the author, with quoted 17th–18th-c. song texts inside copyrighted prose
 * (author's © 2015; the book is not an edition of the sources, so the quoted old texts are NOT split out as witnesses: no own date/region per text is stated for them).
 * Witness: author Медведик, date 2015, region Галичина (Львів), witnessType `scholarly`. NOT a Russian edition → no `ru` flag (SPEC 63 RF-1).
 * Input: the PDF text layer (typeset, not OCR; `pdftotext -enc UTF-8`). Gate (OQ idea for a text layer): lines in Polish/English/German/Latin (Cyrillic share < 60 % of letters) and Russian
 * lines (the Russian-language article and review) are dropped; the share of kept letters is logged. Parts of ≈ 60 000 characters, resumable (a done part is skipped).
 */
import { execFileSync } from 'node:child_process'
import { Harvest, type IndexItem } from './lib.ts'

export interface UserBook { id: string; title: string; author: string; date: string; region: string; licence: string; editionNote: string; p2: string }
export const ADFONTES: UserBook = {
  id: 'adfontes', title: 'Медведик Ю., «Ad fontes: з історії української музики XVII – початку XX ст.», Львів: ЛНУ ім. Івана Франка, 2015', author: 'Юрій Медведик', date: '2015', region: 'Галичина',
  licence: '© Ю. Медведик, ЛНУ ім. Івана Франка, 2015 (сучасна наукова праця); лише словник (vocab-only), цитата ≤ 2 рядків',
  editionNote: 'збірник вибраних статей, матеріалів і рецензій, 618 с., ISBN 978-617-10-0027-8; PDF з текстовим шаром, не OCR',
  p2: 'автор і вихідні дані — з титулу й звороту титулу PDF; НЕ видання джерел: старі тексти цитуються в авторській науковій прозі',
}
const RU_LINE = /[ъыэё]|(^|\s)(что|это|или|который|которы\S*|быть|были|также|только|если|когда|как|для|при|его|которая|является)(\s|$)/i
const letters = (s: string) => s.match(/\p{L}/gu) ?? []
const cyrShare = (s: string) => { const l = letters(s); return l.length ? l.filter(c => /\p{Script=Cyrillic}/u.test(c)).length / l.length : 0 }

/** line-end hyphens joined, page numbers / running heads dropped, non-Ukrainian lines dropped; returns the kept text and the letter counts before/after */
export function cleanBook(raw: string): { text: string; letters: number; kept: number } {
  const joined = raw.replace(/\r/g, '').replace(/(?<=[а-яіїєґ])-\n\s*(?=[а-яіїєґ])/g, '')
  let all = 0, kept = 0; const out: string[] = []
  for (const ln of joined.split('\n')) {
    const t = ln.trim(), n = letters(t).length; all += n
    if (!t || /^\d{1,3}$/.test(t) || n === 0) continue
    if (cyrShare(t) < 0.6 || RU_LINE.test(t)) continue
    kept += n; out.push(t)
  }
  return { text: out.join('\n'), letters: all, kept }
}
export function splitParts(text: string, size = 60_000): string[] {
  const parts: string[] = []; let cur = ''
  for (const ln of text.split('\n')) { if (cur.length + ln.length > size && cur) { parts.push(cur); cur = '' } cur += ln + '\n' }
  if (cur) parts.push(cur)
  return parts
}
export const partItem = (b: UserBook, n: number, total: number, bytes: number, url: string): IndexItem => ({
  id: `user-books:${b.id}:${n}`, url, date: b.date, licence: b.licence, bytes, status: 200, title: `${b.title} (ч. ${n}/${total})`, author: b.author, region: b.region,
  witnessType: 'scholarly', editionNote: b.editionNote, p2: b.p2, vocabOnly: true,
})

async function main() {
  const pdf = process.argv[2]; if (!pdf) throw new Error('usage: tsx harvest/user-books.ts <Ad_Fontes.pdf>')
  const raw = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { maxBuffer: 1 << 29 }).toString('utf8')
  const c = cleanBook(raw), parts = splitParts(c.text), h = new Harvest('user-books', { delayMs: 0, logEvery: 5 })
  h.log(`${ADFONTES.id}: kept ${c.kept} of ${c.letters} letters (${(100 * c.kept / c.letters).toFixed(1)} %), ${parts.length} parts`)
  parts.forEach((p, i) => { const it = partItem(ADFONTES, i + 1, parts.length, Buffer.byteLength(p), `file:///books/${encodeURIComponent('Ad_Fontes (1).pdf')}`); if (!h.has(it.id)) h.put(`${ADFONTES.id}_${i + 1}`, p, [it]) })
  h.finish()
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/user-books.ts')) await main()
