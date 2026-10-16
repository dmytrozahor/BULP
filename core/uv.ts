/**
 * SPEC 63 CV-4 — «неперевірена лема»: every unlinked corpus spelling is searchable and has a card.
 *
 * > "Подібні слова мають мати картки і показуватися в пошуку!" — user, 2026-10-16 (/f/нѣгдѣ «незв'язане написання», 3 разів у 3 пам'ятках)
 *
 * Pure (no node / DOM imports). Spellings that occur in a running text but own no card (NV-3 unlinked index minus every light / CV / archaic card and every token that already carries a
 * card ref) are grouped by the existing spelling-fold key (core/phrasemes.ts foldSpelling: ѣ=е, ы=и, оу=у, jers dropped), so «нѣгдѣ» and «негде» are ONE card. The card is labelled
 * «неперевірена»: no dictionary lists it, VESUM does not know it; its rule candidates are hypotheses. Layout (public/data/uv/, shipped on the data branch like lex/ and cv/):
 *   g/<n>.json  = { "<group key>": UvGroup }          sharded by a stable hash of the group key (UV_SHARDS)
 *   p/<xx-yy>.json = { "<spelling key>": [group key, headword] }   prefix shards by the first two letters of the spelling key (search by prefix needs ≥ 2 letters)
 * Search ranks these hits after every verified card.
 */
import { key, stripStress } from './text.ts'
import { occurrencesOf, unlinkedShard, type UnlinkedOcc } from './unlinked.ts'

export const UV_SHARDS = 64
export const UV_MAX_SPELLINGS = 12
export const UV_MAX_OCC = 4
export const uvShard = (groupKey: string): number => unlinkedShard(groupKey, UV_SHARDS)

/** [headword (most frequent spelling), total tokens, witnesses, spellings [raw, count] by count, ORV card id ('' = none), ...(witness, token index)] */
export type UvGroup = [head: string, total: number, nW: number, spellings: [string, number][], orv: string, ...occ: (string | number)[]]
export const uvOccurrences = (g: UvGroup): UnlinkedOcc[] => occurrencesOf(['', 0, 0, ...g.slice(5)] as never)
export type UvPrefixShard = Record<string, [group: string, head: string]>

/** Prefix shard file of a spelling key: the code points of its first two letters in hex ("43d-45b"). */
export const uvPrefixFile = (k: string): string => [...k].slice(0, 2).map(c => c.codePointAt(0)!.toString(16)).join('-')
export const UV_MIN_QUERY = 2

/** A spelling worth a card: Cyrillic letters (stress, apostrophe, hyphen allowed) only — no digits, no Latin or mixed script (OCR garbage) — at least 3 letters, not one letter repeated. */
export const isCleanSpelling = (raw: string): boolean => {
  if (!/^[\p{Script=Cyrillic}\p{M}'’ʼ-]+$/u.test(raw)) return false
  const letters = [...raw.replace(/[^\p{L}]/gu, '')]
  return letters.length >= 3 && new Set(letters.map(c => c.toLowerCase())).size > 1
}

interface Acc { raw: string; count: number; ws: Set<string>; occ: [string, number][]; clean: boolean }
export class UvScan {
  private readonly m = new Map<string, Acc>()
  /** one token occurrence; `ocr` = the witness is an unproofread OCR scan (CX-8): a spelling seen only there is garbage until a real text confirms it */
  add(raw: string, w: string, i: number, ocr: boolean): void {
    raw = stripStress(raw); const k = key(raw); if (!k || !isCleanSpelling(raw)) return
    let a = this.m.get(k)
    if (!a) this.m.set(k, a = { raw, count: 0, ws: new Set(), occ: [], clean: false })
    a.count++
    if (!ocr) a.clean = true
    if (!a.ws.has(w)) { a.ws.add(w); if (a.occ.length < UV_MAX_OCC) a.occ.push([w, i]) }
  }
  keys(): string[] { return [...this.m.keys()] }
  /** group by `fold(key)`; `skip(spellingKey)` drops spellings that already own a card; `orvOf` finds an ORV card for a group */
  groups(fold: (k: string) => string, skip: (k: string) => boolean = () => false, orvOf: (spellingKeys: string[], groupKey: string) => string = () => ''): Map<string, { g: UvGroup; spellingKeys: string[] }> {
    const by = new Map<string, [string, Acc][]>()
    for (const [k, a] of this.m) { if (!a.clean || skip(k)) continue; const f = fold(k) || k; const l = by.get(f) ?? []; l.push([k, a]); by.set(f, l) }
    const out = new Map<string, { g: UvGroup; spellingKeys: string[] }>()
    for (const [f, l] of by) {
      l.sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      const ws = new Set<string>(), occ: (string | number)[] = [], seenW = new Set<string>()
      let total = 0
      for (const [, a] of l) { total += a.count; a.ws.forEach(w => ws.add(w)); for (const [w, i] of a.occ) if (occ.length < UV_MAX_OCC * 2 && !seenW.has(w)) { seenW.add(w); occ.push(w, i) } }
      const sk = l.map(x => x[0])
      out.set(f, { g: [l[0]![1].raw, total, ws.size, l.slice(0, UV_MAX_SPELLINGS).map(([, a]) => [a.raw, a.count] as [string, number]), orvOf(sk, f), ...occ], spellingKeys: sk })
    }
    return out
  }
}

/** SPEC 63 MM-4: a group with a TOROT lemma (ORV card) attested in at least this many distinct witnesses is «засвідчено (TOROT + N пам’яток)», not «неперевірена лема» */
export const UV_CONFIRM_MIN_W = 2
export const pamiatok = (n: number): string => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'пам’ятка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'пам’ятки' : 'пам’яток'}`
export interface UvStatus { confirmed: boolean; label: string }
export const uvStatus = (g: UvGroup): UvStatus =>
  g[4] && g[2] >= UV_CONFIRM_MIN_W ? { confirmed: true, label: `засвідчено (TOROT + ${pamiatok(g[2])})` } : { confirmed: false, label: 'неперевірена лема' }
