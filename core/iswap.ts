/**
 * SPEC 63 CP-11f — и ↔ і: the spelling variants of a word that has no entry (owner: «зроби виведення форм и <-> і»). Pure.
 *
 * A swap is only ever a CANDIDATE: the caller keeps it when it is a real word (lemma / VESUM form / card) AND the typed word is not real itself.
 * Two words that are both real (кит ≠ кіт) are different words: never variants, never a hypothesis of each other (owner: «Обережно з китом, це інше слово»);
 * the only sources that may say otherwise are a dictionary «те саме, що» or an attested old-spelling row (lm/oa) for the SAME lemma — read by the caller, not here.
 * Each swap is explained by a rule of the repo when one fits, else it is kind P «гіпотеза: заміна и/і без джерела».
 */
import { P, type Evidence } from './evidence.ts'
import type { HypRule } from './hypothesis.ts'

export const SWAP_BADGE = 'варіант з и/і'
export const SWAP_NO_SOURCE = 'гіпотеза: заміна и/і без джерела'
const CONS = 'бвгджзклмнпрстфхцчшщ'
const flip = (c: string) => (c === 'и' ? 'і' : c === 'і' ? 'и' : c)

/** the words one swap away (all positions), then — only if asked — two swaps; the word itself is never in the list. Capped: a long word with many и / і has no 2-swap list. */
export function swapCandidates(word: string, swaps: 1 | 2 = 1, cap = 40): string[] {
  const w = [...word.toLowerCase()], pos = w.map((c, i) => (c === 'и' || c === 'і' ? i : -1)).filter(i => i >= 0)
  const out: string[] = [], seen = new Set<string>([w.join('')])
  const push = (idx: number[]) => { const x = [...w]; for (const i of idx) x[i] = flip(x[i]!); const s = x.join(''); if (!seen.has(s) && out.length < cap) { seen.add(s); out.push(s) } }
  for (const i of pos) push([i])
  if (swaps === 2 && pos.length <= 8) for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) push([pos[a]!, pos[b]!])
  return out
}

const INIT: Evidence = P('INPUT', 'core/orth-forward.ts ORTH-ZHEL-INIT-I; core/orth-attested.ts', 'Желехівка: «буква и на початку слова читалась як [і]» (ЕУМ um17): початкове и- пишеться на місці і-', 'method: hypothesis (P-1.7)')
const YAR: Evidence = P('INPUT', 'core/orthography.ts ORTH-YAR-I', 'ярижка — запис української мови російською абеткою; і з о, е, ѣ передавано через и або ѣ (приклади: «винъ» = він)', 'method: hypothesis (P-1.7)')
const NONE: Evidence = P('INPUT', 'core/iswap.ts', SWAP_NO_SOURCE, 'method: hypothesis (P-1.7)')

export const SWAP_RULES: Record<string, HypRule> = {
  'SW-ZHEL-INIT': { id: 'SW-ZHEL-INIT', pattern: 'и- ↔ і- на початку', uk: 'Желехівка: початкове и- читалось як [і] (ORTH-ZHEL-INIT-I); так писано инший, ирод', cite: INIT },
  'SW-YAR': { id: 'SW-YAR', pattern: 'и ↔ і у закритому складі', uk: 'ярижка писала и на місці і між приголосними перед кінцевим приголосним (ORTH-YAR-I): кит, вин', cite: YAR },
  'SW-NONE': { id: 'SW-NONE', pattern: 'и ↔ і', uk: 'заміна и/і, якої жодне правило сховища не пояснює: лише гіпотеза', cite: NONE },
}

/** the rule that explains the swap word → variant (the first changed letter decides), else SW-NONE */
export function swapRule(word: string, variant: string): HypRule {
  const a = [...word.toLowerCase()], b = [...variant.toLowerCase()]
  const diff = a.map((c, i) => (c !== b[i] ? i : -1)).filter(i => i >= 0)
  if (!diff.length) return SWAP_RULES['SW-NONE']!
  if (diff[0] === 0) return SWAP_RULES['SW-ZHEL-INIT']!
  const i = diff[0]!, tail = a.slice(i + 1)
  if (diff.length === 1 && i > 0 && CONS.includes(a[i - 1]!) && tail.length === 1 && (CONS + 'й').includes(tail[0]!)) return SWAP_RULES['SW-YAR']!
  return SWAP_RULES['SW-NONE']!
}
