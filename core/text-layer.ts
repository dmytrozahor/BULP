/**
 * SPEC 63 GG-7/OQ: the quality check for glosses of a TYPESET text layer (СУМ-11 DjVu, СУМ-20 PDF) in place of the OCR gate (core/se-parse.ts glossClean).
 * The OCR gate scores "word-likeness" and rejects a lot of good СУМ text (labels, abbreviations, stressed forms, capitals of the headword). A text layer is not noise, but it can be broken:
 * line-break hyphenation («маоп- Шинних», «монар¬ хові») and letter swaps («слектроніки»). The check: rejoin the hyphenation, then look every word form up (VESUM through the corpus folds,
 * supplied by the caller as `known`); the gloss is blanked when more than `TL_MAX_UNKNOWN` of its word tokens are unknown (and at least `TL_MIN_UNKNOWN` of them). Pure (no node imports).
 */
/** which source a volume of a СУМ scan has: the printed text layer, or the page-by-page OCR the worker made for a scan without one (pipelines/sum-scan.ts textOf: ~/work/ocr-sum/<name>.txt) */
export type VolSource = 'text' | 'ocr'
export const SUM_OCR_VOLUMES: Record<'sum11' | 'sum20', readonly number[]> = { sum11: [9], sum20: [12, 13] }
/** the source of the volume a row locator «т.9 с.301» points to; a row without a volume is taken as the text layer only for a dictionary that has OCR volumes none */
export function volSource(d: string, l: string | undefined): VolSource {
  const ocr = SUM_OCR_VOLUMES[d as 'sum11' | 'sum20']; if (!ocr) return 'ocr'   // not a СУМ dictionary: never exempt
  const m = /т\.(\d+)/.exec(l ?? ''); return m && !ocr.includes(Number(m[1])) ? 'text' : 'ocr'   // unknown volume: stays gated
}
/** soft hyphen + space, and «-␣» at a line break, are joined; the pieces are kept so «по- перше» can still be known as two words */
export const rejoinHyphens = (g: string): string => g.replace(/¬\s*/g, '').replace(/(\p{L})-\s+(?=\p{L})/gu, '$1\u0001')
/** label / grammar abbreviations printed without the period inside the parsed grammar lines of the entries («розм, прикм», «аюся, йєшся»), and Roman numerals (centuries, volumes) */
const ABBR = new Set('розм прикм дод неперех перен діал перех заст інформ діязазнач діяза інфін порівн недок книжн іст зневажл фам біохім палеонт лінгв збірн техн хім біол фіз журн навч попул узнач спол сполуч прийм присл вищ дієпр діспр однокр зменш пестл док мн одн ірон вигук жін чол сер вульг рідко поет усн розм.-пестл мист військ мор юр мат геол бот зоол анат мед філос церк театр спорт буд ел'.split(' '))
const ROMAN = /^[ivxlc]+$/u
const SUFFIX = /(?:небудь|будь|будьякий|колвек|кольвек)$/u
/** word tokens to look up: ≥ 3 letters; an abbreviation (a short word followed by «.») and a label are skipped; «чого-небудь» → «чого» */
export function tokensOf(g: string): { w: string; parts?: string[] }[] {
  const s = rejoinHyphens(g.normalize('NFC').replace(/[́]/g, '')), out: { w: string; parts?: string[] }[] = []
  for (const m of s.matchAll(/[\p{L}'’\u0001-]+/gu)) {
    let t = m[0].replace(/^[-\u0001]+|[-\u0001]+$/g, ''); if (!t) continue
    const after = s[m.index! + m[0].length]
    if (after === '.' && t.length <= 7 && !t.includes('\u0001')) continue   // «розм.», «перен.», «дієпр.»
    if (t.includes('\u0001')) { const parts = t.split('\u0001'); out.push({ w: parts.join('').toLowerCase(), parts: parts.map(p => p.toLowerCase()) }); continue }
    const ps = t.split('-'); ps.forEach((p, i) => { const q = p.toLowerCase().replace(SUFFIX, ''); if (i < ps.length - 1 && /о$/.test(q)) return   // «південно-східної», «Волино-Подільської»: a combining first part is not a word
      if (q.length >= 3 && !ABBR.has(q) && !ROMAN.test(q)) out.push({ w: q }) })
  }
  return out
}
/** unknown / total word tokens of a gloss */
/** `head`: the headword of the row (and its «-ся» pair) is known by definition, so «Дія за знач. опилити і опилитися» is not blanked for a rare verb */
export function unknownShare(g: string, known: (w: string) => boolean, head = ''): { n: number; unknown: number } {
  const t = tokensOf(g); let u = 0; const h = head.toLowerCase().replace(/́/g, ''), hs = new Set([h, h.replace(/(?:ся|сь)$/, ''), h + 'ся', h + 'сь'].filter(Boolean))
  for (const x of t) if (!(hs.has(x.w) || known(x.w) || (x.parts && x.parts.every(p => p.length < 3 || known(p))))) u++
  return { n: t.length, unknown: u }
}
/** measured on 105 judged rows of the text layers (sum11 + sum20, head exemption on): blanked at share > 0.34: 55 of 60 broken text or grammar-line debris (92 %); the band 0.25-0.34 (the live «слектроніки … маоп- Шинних» row is 0.29): 33 of 45 broken (73 %); below 0.25 or a single unknown token the share of typos falls to ≈ 50 % (rare words, names), so those stay */
export const TL_MAX_UNKNOWN = 0.25
export const TL_MIN_UNKNOWN = 2
/** true = the gloss of a text-layer volume may be shown */
export function textLayerGlossOk(g: string, known: (w: string) => boolean, head = ''): boolean {
  const { n, unknown } = unknownShare(g, known, head); return n === 0 || unknown < TL_MIN_UNKNOWN || unknown / n < TL_MAX_UNKNOWN
}
/** the gloss as shown: line-break hyphenation joined («трудя¬ щих» → «трудящих», «слов- а» → «слова»); a hyphen before a capital is kept (a compound, or the break the check flags) */
export const cleanGloss = (g: string): string => g.replace(/¬\s*/g, '').replace(/(\p{L})-\s+(?=\p{Ll})/gu, '$1')
