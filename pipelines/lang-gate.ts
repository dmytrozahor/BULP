/**
 * SPEC 63 CQ-1: language gates of the harvest ingest (no imports: the same file is replayed on the worker by the measurement scripts).
 *  1. non-Cyrillic gate: a line whose words are > 50 % non-Cyrillic is dropped; an item whose words are > 50 % non-Cyrillic is skipped (Latin-script text with a few look-alike OCR tokens);
 *     polishLookalike(): Polish pages that archive.org's Ukrainian OCR read as Cyrillic look-alikes (title «Kadencja…/Alegata…/Sprawozdań…» + the function-word profile of Cyrillic-read Polish).
 *  2. Russian-language document test: ≥ 20 Russian-only function words and more than twice the Ukrainian-only ones → excludeReason.
 *  3. oldOrth for pre-1925 Ukrainian-dominant items (ъ ѣ are normal letters there; only Russian function words mark a line as apparatus).
 */
export const CYR_WORD = /^[\p{Script=Cyrillic}\p{M}'’ʼ]+$/u
const WORD = /[\p{L}\p{M}\p{N}'’ʼ]+/gu

/** words that occur in modern Ukrainian and not in Russian (or the reverse); shared forms (тебе, тому, перед, ...) are left out on purpose */
export const UK_ONLY = new Set('що це як його вони вона також тільки який які якщо коли був була були бути або немає ще чи дуже цей ця ці мене але щоб вже між після'.split(' '))
export const RU_ONLY = new Set('что это как его они она также только который которые если когда был была были быть или нет ещё еще уже между после потому чтобы очень этот эта эти меня'.split(' '))

export interface Profile { uk: number; ru: number }
export function stopProfile(text: string): Profile {
  let uk = 0, ru = 0
  for (const m of text.toLowerCase().matchAll(/[\p{L}\p{M}]+/gu)) { const w = m[0]; if (UK_ONLY.has(w)) uk++; else if (RU_ONLY.has(w)) ru++ }
  return { uk, ru }
}
/** gate 2: a Russian-language document */
export const isRussianDoc = (p: Profile) => p.ru >= 20 && p.ru > 2 * p.uk
/** gate 3: Ukrainian-dominant (ties count as Ukrainian: no evidence of Russian) */
export const ukDominant = (p: Profile) => p.uk >= p.ru

/** a «word» for the language gate: has a letter (numbers, lone apostrophes and page numbers do not vote) */
const isLetterWord = (w: string) => /\p{L}/u.test(w)
/** share of non-Cyrillic words among the lettered words of a line: > 0.5 → junk line */
export function lineForeign(ws: string[]): { words: number; foreign: number } {
  let words = 0, foreign = 0
  for (const w of ws) { if (!isLetterWord(w)) continue; words++; if (!CYR_WORD.test(w)) foreign++ }
  return { words, foreign }
}
export const foreignLine = (ws: string[]) => { const f = lineForeign(ws); return f.words > 0 && f.foreign * 2 > f.words }

/** Cyrillic-read Polish (Latin letters rendered as Cyrillic look-alikes): tokens of 1-2 letters that are fragments, not Ukrainian words (measured on the harvest, CQ-1 section of analysis/archive-funnel.md) */
export const PL_FRAGMENTS = new Set('ро со па сі пе пі піс пів рр ре ра фо ша уп оо ы кк діа'.split(' '))
export const POLISH_TITLE = /Kadencj|Alegat|Sprawozda[ńn]|Stenograf|Sejm[ouy]? Kraj/i
/** share of the Cyrillic tokens that are Polish-reading fragments */
export function fragmentShare(tokens: string[]): number {
  if (!tokens.length) return 0
  let n = 0
  for (const t of tokens) if (PL_FRAGMENTS.has(t.toLowerCase())) n++
  return n / tokens.length
}
/** measured on the next8 harvest (fragment share = ро со па сі пе пі піс пів рр ре ра фо ша уп оо ы кк діа; single letters р с are NOT counted: they are the abbreviations р. с. of real Ukrainian documents): the 950 Sejm items the 50 % gate drops have a median 0.10 (75th pct 0.15, 90th 0.19); the 2,857 Cyrillic items that pass have a maximum of 0.112 (a Latin-transliterated primer) */
export const PL_FRAGMENT_LIMIT = 0.15
export const PL_TITLE_LIMIT = 0.03
/** the reason a Cyrillic-token item is Polish OCR junk, or null. Title alone is NOT enough: Kadencja III al. 26 (1872) is a Ruthenian-language Sejm document in old orthography and is real Ukrainian (fragment share 0.002). Title AND fragment share > 0.03, or fragment share alone > 0.15. */
export function polishLookalike(title: string, tokens: string[]): string | null {
  const f = fragmentShare(tokens)
  if (f > PL_FRAGMENT_LIMIT) return `fragment-share ${(f * 100).toFixed(1)} %`
  if (POLISH_TITLE.test(title) && f > PL_TITLE_LIMIT) return `title+fragment-share ${(f * 100).toFixed(1)} %`
  return null
}
