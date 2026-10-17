/**
 * SPEC 63 AT-1/AT-2 — parsing of the OCR of the «Атлас української мови» (АУМ). Owner's own scans; only extracted
 * features and short quotes (≤ 2 lines) are stored, no map images, no wholesale text (atlas © — research/44-atlas.md).
 *
 * The OCR of the commentary is noisy (headers «КОМЕНТАР Ль 6», digit confusions, Cyrillic/Latin mix), so everything here
 * is a heuristic over text and every record says so (`quality`). Nothing is invented: a variant exists only if the
 * commentary prints «форма -- номери пунктів»; the map image is NOT read here (AT-2 vision readings are a separate,
 * labelled layer: «прочитано з карти, не вичитано»).
 */

export const AUM_VOLUMES: Record<number, string> = {
  2: 'Атлас української мови, т. 2 (Волинь, Наддністрянщина, Закарпаття і суміжні землі), К., 1988',
}
/** the net of volume 2: 685 settlement points (Вступ, §«Сітка»); numbers outside are OCR noise */
export const AUM2_POINTS = 687

export interface AtlasVariant {
  /** the form as printed in the commentary (atlas phonetic transcription, OCR-damaged) */
  form: string
  /** legend symbol if the commentary names it («червона площина», «зелене коло»…) */
  symbol?: string
  /** settlement numbers listed for the form (ranges expanded, 1..687) */
  points: number[]
  /** commentary item number the list came from */
  item: number
}
export interface AtlasMap {
  volume: number
  n: string               // «6», «55-а»
  /** true if the header number was unreadable in the OCR and was taken from the sequence */
  nFromSequence?: boolean
  /** first PDF page of the commentary block (1-based) */
  page: number
  /** the atlas questionnaire question / source of the map: commentary item 1, ≤ 2 lines, verbatim (OCR) */
  quote: string
  programQuestion?: string  // «Програми № 87»
  variants: AtlasVariant[]
  /** points the commentary says are NOT mapped (item «Не картографуються») — recorded as count only */
  unmappedItems: number
  quality: 'ocr-heuristic'
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/** ≤ 2 lines of ≤ 110 chars: the licence cap on quotes */
export function capQuote(s: string, maxChars = 220): string {
  const t = clean(s)
  return t.length <= maxChars ? t : t.slice(0, maxChars).replace(/\s+\S*$/, '') + ' …'
}

/** «110--113, 230-242, 5» → numbers; drops anything outside 1..max and ranges longer than 200 */
export function expandPoints(s: string, max = AUM2_POINTS): number[] {
  const out = new Set<number>()
  for (const part of s.split(/\s*,\s*/)) {
    const m = part.match(/^\s*(\d{1,3})(?:\s*[-–—]{1,3}\s*[^\d]{0,2}(\d{1,3}))?\s*$/)
    if (!m) continue
    const a = +m[1], b = m[2] ? +m[2] : a
    if (a < 1 || a > max || b < a || b > max || b - a > 200) continue
    for (let i = a; i <= b; i++) out.add(i)
  }
  return [...out].sort((x, y) => x - y)
}

const SYMBOL = /((?:червон|зелен|жовт|чорн|син|біл|сір|фіолетов|коричнев|оранжев|рожев|голуб)[а-яіїєґ]*\s+(?:площин|кол|квадрат|трикутник|ромб|хрест|штрих|смуг|ізогло)[а-яіїєґ]*)/i

/** headers: «КОМЕНТАР Ль 6», «КОМЕНТАР 5 5», «КОМЕНТАР Ж 55-а» — the digits at the end */
const HEAD = /^.{0,3}КОМЕНТАР(?![А-Яа-яІіЇї])([^\n]{0,16})$/gm

export function splitCommentary(text: string): { n: string; body: string; offset: number; fromSeq: boolean }[] {
  const heads: { raw: string; at: number; end: number }[] = []
  for (const m of text.matchAll(HEAD)) heads.push({ raw: ([...(m[1] ?? '').matchAll(/\d{1,3}(?:\s*-\s*[а-яa-z])?/g)].pop()?.[0] ?? '').replace(/\s+/g, ''), at: m.index!, end: m.index! + m[0].length })
  const out: { n: string; body: string; offset: number; fromSeq: boolean }[] = []
  let prev = 0
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]
    const base = parseInt(h.raw, 10) || -1
    const sfx = /-/.test(h.raw)
    let n: string, fromSeq = false
    if (sfx && base === prev) n = h.raw
    else if (base === prev + 1) n = String(base)
    else { n = String(prev + 1); fromSeq = true }   // OCR digit confusion (584 for 384, «Ж: 1» …): trust the sequence
    prev = parseInt(n, 10)
    out.push({ n, body: text.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : undefined), offset: h.at, fromSeq })
  }
  return out
}

/** "form -- 12, 15--17" occurrences inside one commentary item */
export function parseVariants(body: string): AtlasVariant[] {
  const out: AtlasVariant[] = []
  const items = body.split(/\n(?=\s*\d{1,2}\.\s)/)
  for (const it of items) {
    const im = it.match(/^\s*(\d{1,2})\.\s/)
    if (!im) continue
    const item = +im[1]
    if (item === 1) continue
    const txt = clean(it.replace(/-\s*\n\s*/g, '').replace(/^\s*\d{1,2}\.\s*/, ''))
    if (/^Не картографуються/i.test(txt)) continue
    // split into clauses on ';' so that a symbol phrase governs the forms after it
    for (const clause of txt.split(/;\s*/)) {
      const sym = clause.match(SYMBOL)?.[1]
      const re = /([^\s,;:()«»–—-]{2,}(?:\s+[^\s,;:()«»–—-]{2,}){0,2})\s*[-–—]{1,3}\s*((?:\d{1,3}(?:\s*[-–—]{1,3}\s*\d{1,3})?(?:\s*,\s*)?){1,})/g
      for (const m of clause.matchAll(re)) {
        const pts = expandPoints(m[2].replace(/[,\s]+$/, ''))
        if (!pts.length) continue
        let form = m[1].split(/\s+/).slice(-1)[0]
        if (SYMBOL.test(m[1]) || /^(також|відзначено|об'єднано|об’єднано|картографується|картографуються)$/i.test(form)) form = ''
        form = form.replace(/^[«»"'!І|]+(?=[а-яіїєґa-z])/i, '').replace(/[«»"]+$/, '')
        if (!form || /^\d/.test(form)) continue
        out.push({ form, symbol: sym && sym.toLowerCase(), points: pts, item })
      }
    }
  }
  return out
}

export function parseMap(volume: number, c: { n: string; body: string; fromSeq: boolean }, page: number): AtlasMap {
  const first = c.body.split(/\n(?=\s*2\.\s)/)[0].replace(/^\s*1\.\s*/, '')
  const pq = first.match(/Програми\s+\S{0,3}\s*(\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)/i)
  return {
    volume, n: c.n, ...(c.fromSeq ? { nFromSequence: true } : {}), page,
    quote: capQuote(first), ...(pq ? { programQuestion: pq[1] } : {}),
    variants: parseVariants(c.body),
    unmappedItems: (c.body.match(/^\s*\d{1,2}\.\s*Не картографуються/gim) ?? []).length,
    quality: 'ocr-heuristic',
  }
}
