/**
 * SPEC 63 GG-18 — cross-reference ("pointer") entries of the dictionaries: «СЛИНУТИ — див. ЛИНУТИ», «Те саме, що X», «Док. до X», «Недок. до X», «Однокр. до X», «Зменш. до X».
 * A pointer is headword + target headword + relation + dictionary + volume/page: facts of the dictionary's structure, not its text, so it is allowed under the GG-7 © policy.
 * Pure (no node imports). Parsers call `pointerOf` on the text that follows a headword (and its grammar block); the build keys the pointers by lk(headword) into lm/xr.
 */
export type PtrKind = 'see' | 'same' | 'rel'
/** `t` = target headword (lower case, no stress/homonym digit); `r` = the printed relation for 'rel' («док.», «зменш.», «однокр.»); `a` = aspect of the HEAD relative to the target ('док' | 'недок') when the dictionary states it */
export interface PtrCore { k: PtrKind; t: string; r?: string; a?: 'док' | 'недок' }
/** a pointer as stored: dictionary id `d`, the locator `l` («т.2 с.456»), and the head `h` in the parser's output (the sidecar is keyed by it) */
export interface Ptr extends PtrCore { h: string; d: string; l?: string }

const WORD = String.raw`([А-Яа-яІіЇїЄєҐґ][А-Яа-яІіЇїЄєҐґ'’ʼ\-́]{1,30})`
const TAIL = String.raw`(?:\s*[¹²³\d]{0,2})?\s*(?=$|[.,;:)(]|\s[А-ЯІЇЄҐ(«"])`
const LEAD = String.raw`^[\s.,;:(\\]*(?:[а-яіїє]{1,7}\.\s*)*`
const SEE = new RegExp(LEAD + String.raw`(?:[Дд]ив\.\s*також|[Дд]ив\.|[Дд]ивись|См\.|Смотри)\s+` + WORD + TAIL, 'u')
const SAME = new RegExp(LEAD + String.raw`[Тт]е\s+саме,?\s+що\s+` + WORD + TAIL, 'u')
const REL = new RegExp(String.raw`^[\s.,;:(\\]*([А-Яа-яІіЇїЄєҐґ]{3,10}\.(?:-[а-яіїєґ]{3,10}\.)?(?:\s+ст\.)?)\s+(?:до|от|від|к)\s+` + WORD + TAIL, 'u')
/** relation abbreviations accepted for «X. до Y» (closed: an unknown one is not a pointer) */
const RELS = new Set(['док.', 'недок.', 'однокр.', 'багатокр.', 'зменш.', 'збільш.', 'пестл.', 'зневажл.', 'ласк.', 'здрібн.', 'зменш.-пестл.', 'зменш.-ласк.', 'пас.', 'зворот.', 'вищ. ст.', 'ув.', 'ум.', 'умен.', 'увел.'])
const clean = (w: string): string => w.normalize('NFC').replace(/́/g, '').replace(/[’ʼ]/g, "'").toLowerCase().replace(/^-+|-+$/g, '')
const okTarget = (t: string): boolean => /^[а-яіїєґ]+(?:['\-][а-яіїєґ]+)*$/u.test(t) && t.length >= 2 && /[аеєиіїоуюя]/.test(t)

/** a pointer at the START of `text` (the text after the headword and its grammar block, or the start of a sense), or undefined */
export function pointerOf(text: string): PtrCore | undefined {
  const s = text.replace(/\s+/g, ' ')
  let m = SEE.exec(s)
  if (m) { const t = clean(m[1]!); return okTarget(t) ? { k: 'see', t } : undefined }
  m = SAME.exec(s)
  if (m) { const t = clean(m[1]!); return okTarget(t) ? { k: 'same', t } : undefined }
  m = REL.exec(s)
  if (m) {
    const r = m[1]!.toLowerCase().replace(/\s+/g, ' '), t = clean(m[2]!)
    if (!RELS.has(r) || !okTarget(t)) return undefined
    return { k: 'rel', t, r, ...(r === 'док.' ? { a: 'док' as const } : r === 'недок.' ? { a: 'недок' as const } : {}) }
  }
  return undefined
}

/** aspect of a printed grammar block («недок.», «ч. і ж.; док.») */
export const aspectOfGram = (gram: string | undefined): 'док' | 'недок' | undefined => (/(?<![а-яіїє])недок(?![а-яіїє])/u.test(gram ?? '') ? 'недок' : /(?<![а-яіїє])док(?![а-яіїє])/u.test(gram ?? '') ? 'док' : undefined)

/** the aspect-pair pointers of a pair article («ВИКЛЮЧАТИ, аю, недок. ВИКЛЮЧИТИ, чу, док.» share a body): one pointer each way, the relation printed by the dictionary's grammar marks */
export function pairPointers(group: { head: string; gram?: string }[]): { h: string; p: PtrCore }[] {
  const out: { h: string; p: PtrCore }[] = []
  const hs = group.map(g => ({ h: clean(g.head.replace(/[\d¹²³⁴ ]/g, '')), a: aspectOfGram(g.gram) })).filter(x => okTarget(x.h) && x.a)
  for (const x of hs) for (const y of hs) if (x.a === 'док' && y.a === 'недок' && x.h !== y.h) {
    out.push({ h: x.h, p: { k: 'rel', t: y.h, r: 'док.', a: 'док' } }, { h: y.h, p: { k: 'rel', t: x.h, r: 'недок.', a: 'недок' } })
  }
  return out
}

export const REL_UK: Record<string, string> = { 'док.': 'доконаний вид до', 'недок.': 'недоконаний вид до', 'однокр.': 'однократна дія до', 'багатокр.': 'багатократна дія до', 'зменш.': 'зменшувальна форма до', 'збільш.': 'збільшувальна форма до', 'пестл.': 'пестлива форма до', 'зневажл.': 'зневажлива форма до' }
/** the card wording of a pointer; always the dictionary's pointer, never a sense of the pointing word */
export function ptrWording(p: PtrCore): string {
  return p.k === 'see' ? 'див.' : p.k === 'same' ? 'те саме, що' : ((p.r && REL_UK[p.r]) ?? p.r ?? 'пов’язане з')
}
/** «т.9 с.301» -> «т. 9, с. 301» (the locator of a pointer as the card prints it) */
export const locUk = (l: string | undefined): string => (l ? l.replace(/т\.\s*(\d+)/, 'т. $1').replace(/\s*с\.\s*(\d+)/, ', с. $1') : '')
/** dedupe (head, target, relation, dictionary) keeping the first locator */
export function dedupePtrs(ps: Ptr[]): Ptr[] {
  const seen = new Set<string>(), out: Ptr[] = []
  for (const p of ps) { const k = [p.h, p.t, p.k, p.r ?? '', p.d].join('|'); if (!seen.has(k)) { seen.add(k); out.push(p) } }
  return out
}
