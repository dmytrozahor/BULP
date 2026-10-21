/**
 * SPEC 63 GG — dictionary-only cards for the headwords of the historical dictionaries that are not VESUM lemmas. Pure (no node imports).
 *
 * > "beat goroh.pp.ua in corpus size and data quality" (owner 2026-10-21; Горох lists ~508k headwords)
 *
 * Sources (core/dx-src.ts): the r2u dictionaries (Грінченко, Желехівський, Уманець–Спілка, Ніковський, Кримський–Єфремов, Голоскевич, Ізюмов, Дорошенко–Станиславський, Якубські) and the
 * SE-11 parsed historical dictionaries (Тимченко, СУМ XVI–XVII, Матеріали, Білецький-Носенко, Словник мови Шевченка, Закревський).
 *
 * Quality rules (GG-2), none of them a guess:
 *  1. a headword must pass the parser's `headwordOk` (OCR'd dictionaries) or be a plain word (`isCvWord`, typeset r2u text);
 *  2. spellings are normalised and DEDUPED across dictionaries with the existing orthography folds (Желехівка, 1928, GZ: core/orthography.ts); a fold candidate that already names a card
 *     (VESUM lemma, any kind of card) MERGES into it: a dictionary-only card gets the dictionary's bit, an attested card is left alone;
 *  3. an OCR'd dictionary's headword becomes a card only when EITHER two independent dictionaries know it (Матеріали are Тимченко's papers: one lineage) OR one dictionary knows it and a
 *     corpus text has the spelling as a token no lemma claims; a typeset (r2u) headword needs no corroboration;
 *  4. the © dictionaries keep only the headword and the source (the card stores a bit, not a line).
 */
import { fold } from './orthography.ts'
import { headwordOk } from './se-parse.ts'
import { stripStress } from './text.ts'
import { lk, isCvWord } from './cv.ts'
import { HIST_BY_ID, HIST_SRC, type HistSrc } from './dx-src.ts'

export interface HistHead { word: string; /** dictionary id: r2u unit id or PARSE_SPECS dict */ src: string }
export interface HistGroup { key: string; word: string; rank: number; mask: number; srcs: Set<HistSrc>; cands: Set<string> }
export interface HistStats { heads: number; rejected: number; groups: number; merged: number; inCards: number; added: number; sole: number; dropped: number; corroborated: number }
export const emptyStats = (): HistStats => ({ heads: 0, rejected: 0, groups: 0, merged: 0, inCards: 0, added: 0, sole: 0, dropped: 0, corroborated: 0 })

/** the spelling that is compared and shown: NFC, lower case, no stress, one apostrophe, no homograph digit */
export const normHead = (raw: string): string => stripStress(raw.normalize('NFC').toLowerCase()).replace(/[’ʼ`]/g, "'").replace(/[\d¹²³]+$/, '').trim()

/** [primary, all candidates]: the primary spelling has every non-branching fold applied and the first reading of each branching one (dedupe key); all candidates (branches too) only look for an existing card */
const foldKeys = (w: string, orth: string[] | undefined): [string, string[]] => {
  const all = new Set<string>([lk(w)]); let p = w
  for (const era of orth ?? []) { const c = fold(p, era); for (const x of c) all.add(lk(x.form)); p = c[0]!.form }
  return [lk(p), [...all]]
}

/** GG-2 rules 1 and 2 (dedupe): headwords → one group per folded spelling, with the bits of every dictionary that has it */
export function groupHist(heads: Iterable<HistHead>, stats: Record<string, HistStats> = {}): Map<string, HistGroup> {
  const groups = new Map<string, HistGroup>()
  for (const h of heads) {
    const src = HIST_BY_ID[h.src]; if (!src) continue
    const st = (stats[src.name] ??= emptyStats()); st.heads++
    const w = normHead(h.word)
    if (!(src.ocr ? headwordOk(w) : isCvWord(w))) { st.rejected++; continue }
    const [g0, ks] = foldKeys(w, src.orth)
    let g = groups.get(g0)
    if (!g) groups.set(g0, g = { key: lk(w), word: w, rank: src.rank, mask: 0, srcs: new Set(), cands: new Set() })
    else if (src.rank < g.rank) { g.word = w; g.key = lk(w); g.rank = src.rank }
    g.mask |= src.bit; g.srcs.add(src); for (const k of ks) g.cands.add(k)
  }
  return groups
}

export type Resolved = 'do' | 'card' | undefined
export interface HistNew { key: string; word: string; mask: number; /** corpus tokens (no lemma claims them) that corroborate a single OCR'd dictionary */ c?: number }
export interface HistResult { news: HistNew[]; /** [key of an existing dictionary-only card, bits to add] */ merges: [string, number][]; stats: Record<string, HistStats> }

/** the independent witnesses of a group: typeset dictionaries count one each, OCR'd ones one per lineage */
export const independent = (g: HistGroup): number => new Set([...g.srcs].map(s => s.lineage)).size

/**
 * GG-2 rules 2–4. `resolve(candidates)` says whether one of the fold candidates already names a card: [key, 'do'] a dictionary-only card (the bits merge), [key, 'card'] any other card
 * (VESUM lemma without a card counts as 'do' when the build made its dictionary-only card first). `corpus(key)` = tokens of the corpus with that spelling (full-text N only).
 */
export function selectHist(groups: Map<string, HistGroup>, resolve: (cands: string[]) => [string, Resolved] | undefined, corpus: (k: string) => number, stats: Record<string, HistStats> = {}): HistResult {
  const news: HistNew[] = [], merges: [string, number][] = []
  for (const g of groups.values()) {
    for (const s of g.srcs) (stats[s.name] ??= emptyStats()).groups++
    const r = resolve([...g.cands])
    if (r?.[1] === 'do') { merges.push([r[0], g.mask]); for (const s of g.srcs) stats[s.name]!.merged++; continue }
    if (r?.[1] === 'card') { for (const s of g.srcs) stats[s.name]!.inCards++; continue }
    const typeset = [...g.srcs].some(s => !s.ocr)
    let c = 0
    if (!typeset && independent(g) < 2) { for (const k of g.cands) c += corpus(k); if (!c) { for (const s of g.srcs) stats[s.name]!.dropped++; continue } }
    news.push({ key: g.key, word: g.word, mask: g.mask, ...(c ? { c } : {}) })
    for (const s of g.srcs) { const st = stats[s.name]!; st.added++; if (g.srcs.size === 1) st.sole++; if (c) st.corroborated++ }
  }
  return { news, merges, stats }
}

export { HIST_SRC }
