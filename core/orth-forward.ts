/**
 * SPEC 63 OV-5…OV-7 — the ORTHOGRAPHY view: a word written in the modern orthography (Правопис 2019, the baseline) re-spelled in an older orthography.
 * core/orthography.ts holds the folds old → modern; this module runs them FORWARD, only for the orthographies whose fold table is cited there
 * (every rule below names its fold id and takes the cite from `foldById`). The IPA never depends on the orthography: the same pronunciation is written differently.
 *
 * Lossy directions (the old orthography keeps a distinction the modern one lost: ѣ/и/і, ы/и, ô/ê/і, ґ/г) are NOT guessed:
 *  - the letter's etymology is read from `ctx.origins` (core/origin.ts: derivation trace or VESUM alternation) or `ctx.proto` (the proto-Slavic form of the etymology entry);
 *  - with no such datum the letter is marked «?» («невизначено без етимології») and kept as the modern letter. A «?» letter is never presented as the old spelling.
 * Not implemented for want of a cited fold table (reported, never faked): драгоманівка; ў (максимовичівка), э (ярижка), ї↔і after a dental (желехівка).
 */
import { foldById } from './orthography.ts'
import type { Evidence } from './evidence.ts'
import type { Origins } from './origin.ts'

export type OrthId = '2019' | 'orig' | '1928' | 'zhel' | 'kul' | 'max' | 'yar'
export const ORTHS: { id: OrthId; label: string; year?: string; note?: string }[] = [
  { id: '2019', label: 'сучасний (Правопис 2019)', year: '2019' },
  { id: 'orig', label: 'як у пам’ятці (оригінал)', note: 'написання свідчення без змін' },
  { id: '1928', label: 'Харківський 1928', year: '1928' },
  { id: 'zhel', label: 'Желехівка 1886', year: '1886' },
  { id: 'kul', label: 'кулішівка 1856', year: '1856' },
  { id: 'max', label: 'максимовичівка 1827', year: '1827' },
  { id: 'yar', label: 'ярижка (кін. XVIII ст.)', year: '1798' },
]
/** orthographies without a cited fold table in the repo: not offered (reported) */
export const ORTHS_EMPTY = [{ id: 'drag', label: 'драгоманівка', why: 'у core/orthography.ts немає таблиці правил із цитатою; без джерела правила не додаються' }]

export interface OrthCtx {
  /** origin of each letter of the MODERN form (core/origin.ts originsFor / originsFromParadigm) */
  origins?: Origins
  /** proto-Slavic form from the etymology entry, e.g. '*inъ' */
  proto?: string
  /** the word is a loanword (true) / a native word (false) / not known (undefined) */
  loan?: boolean
  gender?: 'm' | 'f' | 'n'
}
export interface OSeg { text: string; /** the modern letters this segment replaces */ from?: string; rule?: string; unsure?: boolean }
export interface OrthResult { orth: OrthId; input: string; text: string; segs: OSeg[]; rules: { id: string; cite: Evidence }[]; unsure: number; notes: string[] }

const V = 'аеиіоуюяєїы', C = 'бвгґджзйклмнпрстфхцчшщ'
type Cell = { t: string; from?: string; rule?: string; unsure?: boolean }
const STEMS_ZHEL_SOFT = /^(свят|світ|сміх|цвях|цвірк|звір)/   // the words of the cited statement (сьвято, сьвіт, сьміх, цьвях, цьвіркати, зьвір)

export function toOrth(modern: string, orth: OrthId, ctx: OrthCtx = {}): OrthResult {
  const input = modern, w = modern.toLowerCase().replace(/[’ʼ`]/g, "'")
  const used = new Map<string, Evidence>(), notes: string[] = []
  interface Ed { s: number; e: number; to: string; rule: string; unsure: boolean }
  const eds: Ed[] = []
  const use = (id: string) => { const f = foldById[id]; if (f) used.set(id, f.cite) }
  /** replace [s, e) of the modern word (s === e inserts); `unsure` keeps the modern letters and tags them «?» */
  const set = (s: number, e: number, to: string, rule: string, unsure = false) => {
    if (!unsure && w.slice(s, e) === to) return
    if (eds.some(x => s < x.e && e > x.s)) return   // a letter is changed by one rule only
    use(rule); eds.push({ s, e, to, rule, unsure })
  }
  const each = (re: RegExp, f: (m: RegExpExecArray) => void) => { for (const m of w.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) f(m as RegExpExecArray) }
  const orig = (i: number) => ctx.origins?.[i] ?? null
  const edge = (i: number) => i === 0 || V.includes(w[i - 1]!) || w[i - 1] === "'"
  const isCons = (c?: string) => !!c && C.includes(c)
  const last = w.length

  if (orth === 'kul' || orth === 'zhel' || orth === 'max') each(/'/, m => set(m.index!, m.index! + 1, 'ъ', orth === 'max' ? 'ORTH-MAX-JER' : 'ORTH-KUL-JER'))
  if (orth === 'kul') {
    each(/ї/, m => { if (edge(m.index!)) set(m.index!, m.index! + 1, 'і', 'ORTH-KUL-I') })
    each(/є/, m => { if (edge(m.index!)) set(m.index!, m.index! + 1, 'е', 'ORTH-KUL-E') })
  }
  if (orth === 'zhel') {
    if (ctx.gender === 'n') each(/([нлтдсзцчшжр])\1я$/, m => set(m.index! + 1, m.index! + 3, 'є', 'ORTH-ZHEL-JE'))
    // ь after с з ц before в м: the statement lists the words (сьвято, сьвіт, сьміх, цьвях, цьвіркати, зьвір); in any other word the softness is not known
    each(/[сзц](?=[вм])/, m => set(m.index! + 1, m.index! + 1, 'ь', 'ORTH-ZHEL-SOFT', !STEMS_ZHEL_SOFT.test(w)))
    each(/(?<=.)[сц](ьк)(?=и[йхмі]|ого|ому|ої|ою|а|е|у|і|им|ими)/, m => set(m.index! + 1, m.index! + 3, 'к', 'ORTH-ZHEL-SKY'))
    // initial і is written и where the proto form begins with *i- (инший < *inъ); with no etymology it is not known
    if (w[0] === 'і' && w.length > 1) {
      if (ctx.proto) { if (/^\*i[^ě]/.test(ctx.proto)) set(0, 1, 'и', 'ORTH-ZHEL-INIT-I') }
      else if (!orig(0)) set(0, 1, 'и', 'ORTH-ZHEL-INIT-I', true)
    }
  }
  if (orth === '1928') {
    if (ctx.loan === true) each(/г/, m => set(m.index!, m.index! + 1, 'ґ', 'ORTH-1928-G', true))
    else if (ctx.loan === undefined && w.includes('г')) notes.push('ґ у іншомовних словах: етимологія слова невідома, без змін')
  }
  if (orth === 'yar' || orth === 'max') {
    const id = orth === 'yar' ? 'ORTH-YAR-' : 'ORTH-MAX-'
    each(/і/, m => {
      const i = m.index!, o = orig(i)
      if (orth === 'yar') { if (o?.rule === 'R09') set(i, i + 1, 'ѣ', id + 'YAT'); else set(i, i + 1, 'и', id + 'I') }
      else if (o?.rule === 'R10') set(i, i + 1, o.src === 'о' ? 'ô' : 'ê', id + 'I')
      else if (o?.rule === 'R09') set(i, i + 1, 'ѣ', id + 'YAT')
      else if (!ctx.origins) set(i, i + 1, 'і', id + 'I', true)
    })
    each(/и/, m => {
      const i = m.index!, o = orig(i)
      if (o?.rule === 'R11') set(i, i + 1, 'ы', id + 'Y')
      else if (!ctx.origins) set(i, i + 1, 'и', id + 'Y', true)
    })
    each(/ьо/, m => set(m.index!, m.index! + 2, 'ё', orth === 'yar' ? 'ORTH-YAR-JO' : 'ORTH-MAX-JO'))
    if (orth === 'max') each(/йо/, m => set(m.index!, m.index! + 2, 'ё', 'ORTH-MAX-JO'))
    each(/є/, m => { if (edge(m.index!)) set(m.index!, m.index! + 1, 'е', id + 'E') })
    if (isCons(w[last - 1]) && w[last - 1] !== 'й') set(last, last, 'ъ', id + 'JER' + (orth === 'max' ? '-END' : ''))
  }
  // build the segments left to right
  const segs: OSeg[] = []
  const plain = (t: string) => { if (!t) return; if (segs.length && !segs[segs.length - 1]!.rule) segs[segs.length - 1]!.text += t; else segs.push({ text: t }) }
  let at = 0
  for (const x of eds.sort((p, q) => p.s - q.s || p.e - q.e)) {
    plain(input.slice(at, x.s))
    const from = input.slice(x.s, x.e)
    segs.push({ text: x.unsure && x.s !== x.e ? from : x.to, from, rule: x.rule, unsure: x.unsure })
    at = x.e
  }
  plain(input.slice(at))
  const text = segs.map(s => s.text + (s.unsure ? '?' : '')).join('')
  return { orth, input, text, segs: segs.filter(s => s.text || s.unsure), rules: [...used].map(([id, cite]) => ({ id, cite })), unsure: segs.filter(s => s.unsure).length, notes }
}
/** orthographies that are written differently from the baseline (the switch's non-default choices that change letters) */
export const ORTH_NOTE_UNSURE = 'невизначено без етимології'
