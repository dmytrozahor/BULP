/**
 * Cyrillic numerals (BL-4). The letters stand for numbers, so such a token is a NUMERAL, not a word: it is never looked up,
 * normalised or derived (research/03 §1 N11: `҂?[а-ѵ]҃?` standalone → NUMERAL «Cyrillic numerals: skip, do not derive»).
 * The value is the sum of the letter values; ҂ multiplies the letter that follows it by 1000. The era «від створення світу» (annus mundi)
 * is turned into AD (−5508) only when the numeral directly follows «в лѣто»; otherwise the value is reported as is.
 */
const VAL: Record<string, number> = {
  а: 1, в: 2, г: 3, д: 4, е: 5, ѕ: 6, ꙃ: 6, ꙅ: 6, з: 7, ꙁ: 7, и: 8, ѳ: 9, і: 10, ї: 10, ı: 10,
  к: 20, л: 30, м: 40, н: 50, ѯ: 60, о: 70, п: 80, ч: 90, р: 100, с: 200, т: 300, у: 400, ф: 500, х: 600, ѱ: 700, ѡ: 800, ц: 900,
}
const THOUSAND = '҂', TITLO = '҃'
export const ANNUS_MUNDI_OFFSET = 5508

export interface NumeralStep { letter: string; value: number; thousands: boolean }
export interface Numeral { start: number; end: number; raw: string; value: number; trace: NumeralStep[]; ad?: number }

const isNumWord = (w: string) => [...w.normalize('NFC').toLowerCase()].every(c => c in VAL || c === THOUSAND || c === TITLO)
const marked = (w: string) => w.includes(THOUSAND) || w.includes(TITLO)

/** Value of one numeral word / run; undefined when it contains a non-numeral character. */
export function numeralValue(raw: string): { value: number; trace: NumeralStep[] } | undefined {
  const s = raw.normalize('NFC').toLowerCase().replace(/\s+/g, '')
  if (!s || !isNumWord(s)) return undefined
  const trace: NumeralStep[] = []
  let thousands = false
  for (const c of s) {
    if (c === THOUSAND) { thousands = true; continue }
    if (c === TITLO) continue
    trace.push({ letter: c, value: VAL[c]! * (thousands ? 1000 : 1), thousands }); thousands = false
  }
  if (!trace.length || thousands) return undefined
  return { value: trace.reduce((a, t) => a + t.value, 0), trace }
}

const ERA = /(?:^|\s)(?:в|вь|въ)\s+л[ѣе]т[оа]?\s*$/i
const WORD = /[\p{Script=Cyrillic}\p{M}]+/gu
const GAP = /^[ \t]$/

/** Numeral runs in `text`. A run needs a mark (҂ or titlo); words are joined by single whitespace; one trailing bare letter is part of the run (ѕ҃ ф҃ ѯ҃ д). */
export function findNumerals(text: string): Numeral[] {
  const words = [...text.matchAll(WORD)].map(m => ({ w: m[0], s: m.index!, e: m.index! + m[0].length }))
  const out: Numeral[] = []
  for (let i = 0; i < words.length; i++) {
    if (!marked(words[i]!.w) || !isNumWord(words[i]!.w)) continue
    let j = i
    while (j + 1 < words.length && GAP.test(text.slice(words[j]!.e, words[j + 1]!.s)) && isNumWord(words[j + 1]!.w) && marked(words[j + 1]!.w)) j++
    const nx = words[j + 1]
    if (nx && GAP.test(text.slice(words[j]!.e, nx.s)) && [...nx.w.normalize('NFC')].length === 1 && isNumWord(nx.w)) j++
    const raw = text.slice(words[i]!.s, words[j]!.e)
    const v = numeralValue(raw)
    if (v) {
      const n: Numeral = { start: words[i]!.s, end: words[j]!.e, raw, ...v }
      if (v.value > ANNUS_MUNDI_OFFSET && ERA.test(text.slice(0, n.start))) n.ad = v.value - ANNUS_MUNDI_OFFSET
      out.push(n)
    }
    i = j
  }
  return out
}
