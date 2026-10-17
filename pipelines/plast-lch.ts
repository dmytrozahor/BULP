/**
 * SPEC 63 SL-5: terms from «Лісові Чорти: їх життя і буття 1922–1945» (ювілейний історично-мемуарний збірник, Вашінгтон–Нью-Йорк–Торонто 1983; owner's scan,
 * OCR tesseract ukr, data/raw/plast/lch-ocr.txt with `=====PDF n=====` page markers; also kept as user-books items on the worker). Cite-only: the book has NO glossary, so an entry
 * is the headword + the book's own sentence containing it (verbatim from the OCR page, ≤ 160 chars) + «с. n PDF». No definition is written by us.
 * Category (owner 2026-10-17: *"Kurin counts as own slang"*): 'plast' = used by the whole movement; 'kurin' = specific to the kurin «Лісові Чорти» («жаргон куреня Лісові Чорти»);
 * a term of unclear status is filed as 'kurin' (unclear: true) and listed in the report.
 */
import type { PlastEntry } from '../core/sociolect.ts'

export const LCH_ID = 'LCH'
export interface LchTerm { w: string; cat: 'plast' | 'kurin'; pdf: number; anchor: string; abbr?: boolean; unclear?: boolean; from?: string; to?: string }

export const LCH_TERMS: LchTerm[] = [
  // Plast-wide (p. 21 footnote: the book's own expansion of the abbreviations)
  { w: 'ОПК', cat: 'plast', pdf: 21, anchor: 'ОПК--Окружна', abbr: true, from: 'Скорочення:', to: 'скавтмастер.' },
  { w: 'ВПК', cat: 'plast', pdf: 21, anchor: 'ВПК--Верховна', abbr: true, from: 'Скорочення:', to: 'скавтмастер.' },
  { w: 'скм.', cat: 'plast', pdf: 21, anchor: 'скм., сквм.--скавтмастер', abbr: true, from: 'Скорочення:', to: 'скавтмастер.' },
  { w: 'сквм.', cat: 'plast', pdf: 21, anchor: 'скм., сквм.--скавтмастер', abbr: true, from: 'Скорочення:', to: 'скавтмастер.' },
  { w: 'булава', cat: 'plast', pdf: 16, anchor: 'членами булави' },
  { w: 'обозний', cat: 'plast', pdf: 21, anchor: 'як обозний' },
  { w: 'ватра', cat: 'plast', pdf: 19, anchor: 'спільна ватра' },
  { w: 'вишкіл', cat: 'plast', pdf: 43, anchor: 'всебічний вишкіл' },
  { w: 'курінний', cat: 'plast', pdf: 11, anchor: 'Курінним був' },
  { w: 'Верховний Отаман', cat: 'plast', pdf: 12, anchor: 'Верховний Отаман' },
  { w: 'Начальний Пластун', cat: 'plast', pdf: 12, anchor: 'Начальний Пластун' },
  { w: 'скавтмастер', cat: 'plast', pdf: 13, anchor: 'скавтмастра' },
  { w: "зв'язковий", cat: 'plast', pdf: 13, anchor: "зв'язкового" },
  { w: 'новак', cat: 'plast', pdf: 12, anchor: 'Реф. новаків' },
  { w: 'старший пластун', cat: 'plast', pdf: 11, anchor: 'З лав старших пластунів' },
  { w: 'Улад', cat: 'plast', pdf: 9, anchor: 'Український Пластовий Улад' },
  { w: 'сеніорат', cat: 'plast', pdf: 22, anchor: 'сеніораті' },
  { w: 'кошовий', cat: 'plast', pdf: 141, anchor: 'кошовий станиславівського коша' },
  { w: 'станичний', cat: 'plast', pdf: 220, anchor: 'станичний в Едмонтоні' },
  { w: 'пластовий іспит', cat: 'plast', pdf: 13, anchor: 'підреферат пластових іспитів' },
  { w: 'пластовий однострій', cat: 'plast', pdf: 10, anchor: 'не пластовий однострій' },
  { w: 'тайний Пласт', cat: 'plast', pdf: 10, anchor: 'тайного Пласту' },
  // kurin «Лісові Чорти» in-group
  { w: 'Лісова Премудрість', cat: 'kurin', pdf: 6, anchor: 'Лісова Премудрість' },
  { w: "Велике Плем'я", cat: 'kurin', pdf: 7, anchor: "Велике Плем'я" },
  { w: 'Кодекс', cat: 'kurin', pdf: 6, anchor: 'цей Кодекс складено' },
  { w: 'фаміліянт', cat: 'kurin', pdf: 8, anchor: 'фаміліянтів' },
  { w: 'данцігер', cat: 'kurin', pdf: 54, anchor: 'данцігерів' },
  { w: 'ЛЧ', cat: 'kurin', pdf: 21, anchor: 'пізніші ЛЧ', abbr: true },
  { w: 'Лісовий Чорт', cat: 'kurin', pdf: 21, anchor: 'Лісовий Чорт' },
  { w: 'фасон', cat: 'kurin', pdf: 8, anchor: 'утримати фасон', unclear: true },
  { w: 'лісовочортівський стиль', cat: 'kurin', pdf: 8, anchor: 'лісовочортівським стилем' },
  { w: 'Племінна Рада', cat: 'kurin', pdf: 32, anchor: 'Племінною Радою', unclear: true },
  { w: 'порекло', cat: 'kurin', pdf: 84, anchor: 'порекло', unclear: true },
]

/** the pages of the OCR dump, line-end hyphens joined and whitespace collapsed */
export function lchPages(text: string): Map<number, string> {
  const t = text.split(/\n=====PDF (\d+)=====\n/), m = new Map<number, string>()
  for (let i = 1; i < t.length; i += 2) m.set(Number(t[i]), t[i + 1]!.replace(/(?<=[а-яіїєґ])-\n(?=[а-яіїєґ])/g, '').replace(/\s+/g, ' ').trim())
  return m
}

/** ≤ 160 chars of the sentence around the anchor (verbatim). Sentence ends at . ! ? + capital, but not after a short abbreviation («студ.», «ст. пл.»); too long → a word-aligned window with «…»; `from`/`to` pin the span explicitly */
export function lchQuote(page: string, anchor: string, from?: string, to?: string): string | null {
  const i = page.indexOf(anchor); if (i < 0) return null
  if (from && to) { const a = page.indexOf(from), b = page.indexOf(to, a); return a < 0 || b < 0 ? null : page.slice(a, b + to.length) }
  const isEnd = (p: string, k: number) => /[.!?]/.test(p[k]!) && /\s/.test(p[k + 1] ?? ' ') && /[А-ЯІЇЄҐ"«]/.test(p.slice(k + 1).trimStart()[0] ?? 'А') && !/(?:^|\s)[а-яіїєґ]{1,5}$/.test(p.slice(0, k))
  let b = 0; for (let k = i - 1; k >= 0; k--) if (isEnd(page, k)) { b = k + 1; break }
  let e = page.length; for (let k = i + anchor.length; k < page.length; k++) if (isEnd(page, k)) { e = k + 1; break }
  let q = page.slice(b, e).trim()
  if (q.length > 160) {
    let s = Math.max(b, i - 50)
    while (s > b && page[s - 1] !== ' ') s--
    let t = Math.min(e, s + 156)
    while (t < e && t > s && page[t] !== ' ') t--
    q = (s > b ? '…' : '') + page.slice(s, t).trim() + (t < e ? '…' : '')
  }
  return q
}

export function lchEntries(text: string): PlastEntry[] {
  const pages = lchPages(text)
  return LCH_TERMS.map(t => {
    const q = lchQuote(pages.get(t.pdf) ?? '', t.anchor, t.from, t.to)
    if (!q) throw new Error(`LCH: anchor «${t.anchor}» not on PDF p. ${t.pdf}`)
    const e: PlastEntry = { w: t.w, g: q, k: t.abbr ? 'abbr' : 'term', loc: `с. ${t.pdf} PDF`, s: LCH_ID }
    if (t.cat === 'kurin') e.c = 'kurin'
    return e
  })
}
