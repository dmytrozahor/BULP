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
 *   p/<xx-yy-zz…>.json  a first-two-letters shard above UV_P_MAX_BYTES is split one letter deeper (recursively, '_'-padded; lossless), and p/_split.json lists those deeper leaves
 *   Every file stays ≤ 256 KiB (CV-4): g/ is hashed into UV_SHARDS files, p/ is split by prefix like ix/ dx/ unlinked/.
 * Search ranks these hits after every verified card.
 */
import { key, stripStress } from './text.ts'
import { occurrencesOf, unlinkedShard, type UnlinkedOcc } from './unlinked.ts'
import { UV_ATTESTED_LABEL, type PromoteSpelling, type PromoteVerdict } from './uv-promote.ts'

export const UV_SHARDS = 512
export const UV_MAX_SPELLINGS = 12
export const UV_MAX_OCC = 4
/** CV-4: witnesses with a KWIC line on a promoted card */
export const UV_MAX_OCC_ATT = 8
export const uvShard = (groupKey: string): number => unlinkedShard(groupKey, UV_SHARDS)

/** [headword (most frequent spelling), total tokens, witnesses, spellings [raw, count] by count, ORV card id ('' = none), ...(witness, token index)] */
export type UvGroup = [head: string, total: number, nW: number, spellings: [string, number][], orv: string, ...occ: (string | number)[]]
/** CV-4: a promoted group carries one trailing marker (the occurrence pairs are an even tail; an odd tail = promoted). Old data without it reads as not promoted. */
export const uvAttested = (g: UvGroup): boolean => (g.length - 5) % 2 === 1
export const uvOccurrences = (g: UvGroup): UnlinkedOcc[] => occurrencesOf(['', 0, 0, ...g.slice(5)] as never)
/** what UvScan.groups tells the promotion rule: the spellings of a group and, in the same order, the ids of the witnesses of each */
export interface UvPromoteIn { spellings: PromoteSpelling[]; witnesses: string[][] }
/** [group key, headword, 1 = promoted to an attested-only card (CV-4; absent in old data = not promoted)] */
export type UvPrefixShard = Record<string, [group: string, head: string, att?: 1]>

/** Prefix shard file of a spelling key: the code points of its first two letters in hex ("43d-45b"). */
export const uvPrefixFile = (k: string): string => [...k].slice(0, 2).map(c => c.codePointAt(0)!.toString(16)).join('-')
export const UV_MIN_QUERY = 2

// ── prefix leaves below the first two letters (the 10 M-token import: 'по', 'пр' … are > 256 KiB) ───────────────────────────────────────────
export const UV_P_MAX_BYTES = 200 * 1024, UV_P_MAX_DEPTH = 14
export const UV_SPLIT_FILE = 'p/_split'
export interface UvSplit { format: 1; leaves: string[] }
const uvPad = (k: string, n: number): string => { const cs = [...k]; while (cs.length < n) cs.push('_'); return cs.slice(0, n).join('') }
/** file stem of a leaf prefix: hex code points joined by '-' (a two-letter leaf is exactly uvPrefixFile) */
export const uvLeafFile = (leaf: string): string => [...leaf].map(c => c.codePointAt(0)!.toString(16)).join('-')
/**
 * Plan the leaves of the prefix shards: group the spelling keys by their first two letters, and split a group deeper while its JSON is above `maxBytes`
 * (and the split actually separates it). Returns leaf prefix → keys; every key lands in exactly one leaf, nothing is dropped.
 */
export function planUvPrefixes(keys: Iterable<string>, bytesOf: (keys: string[]) => number, maxBytes = UV_P_MAX_BYTES): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const group = (ks: string[], n: number) => { const by = new Map<string, string[]>(); for (const k of ks) { const q = uvPad(k, n); (by.get(q) ?? by.set(q, []).get(q)!).push(k) } return by }
  const go = (p: string, ks: string[], n: number) => {
    if (n < UV_P_MAX_DEPTH && ks.length > 1 && bytesOf(ks) > maxBytes) { const by = group(ks, n + 1); if (by.size > 1) { for (const [q, sub] of by) go(q, sub, n + 1); return } }
    out.set(p, ks)
  }
  for (const [p, ks] of group([...keys], UV_MIN_QUERY)) go(p, ks, UV_MIN_QUERY)
  return out
}
/** the deeper leaves (longer than two letters) of a plan: the content of p/_split.json */
export const uvSplitOf = (leaves: Iterable<string>): UvSplit => ({ format: 1, leaves: [...leaves].filter(l => [...l].length > UV_MIN_QUERY).sort() })
const topOf = (leaf: string) => uvPad(leaf, UV_MIN_QUERY)
/** the leaf file stem that holds the exact spelling key k (the two-letter shard unless its top was split) */
export function uvLeafOf(k: string, split?: UvSplit | null): string {
  const top = topOf(k), set = new Set(split?.leaves)
  if (!split || !split.leaves.some(l => topOf(l) === top)) return uvLeafFile(top)
  for (let n = UV_MIN_QUERY + 1; n <= UV_P_MAX_DEPTH; n++) { const p = uvPad(k, n); if (set.has(p)) return uvLeafFile(p) }
  return uvLeafFile(top)
}
/** every leaf file stem that can hold a key starting with the (≥ 2 letters) query key qk */
export function uvLeavesFor(qk: string, split?: UvSplit | null): string[] {
  const top = topOf(qk), m = [...qk].length
  const deeper = (split?.leaves ?? []).filter(l => topOf(l) === top)
  if (!deeper.length) return [uvLeafFile(top)]
  return deeper.filter(l => (m >= [...l].length ? [...qk].slice(0, [...l].length).join('') === l : l.startsWith(qk))).map(uvLeafFile)
}

/** A spelling worth a card: Cyrillic letters (stress, apostrophe, hyphen allowed) only — no digits, no Latin or mixed script (OCR garbage) — at least 3 letters, not one letter repeated. */
export const isCleanSpelling = (raw: string): boolean => {
  if (!/^[\p{Script=Cyrillic}\p{M}'’ʼ-]+$/u.test(raw)) return false
  const letters = [...raw.replace(/[^\p{L}]/gu, '')]
  return letters.length >= 3 && new Set(letters.map(c => c.toLowerCase())).size > 1
}

interface Acc { raw: string; count: number; ws: Set<string>; occ: [string, number][]; clean: boolean; lower: number; joins: number }
export class UvScan {
  private readonly m = new Map<string, Acc>()
  /** one token occurrence; `ocr` = the witness is an unproofread OCR scan (CX-8): a spelling seen only there is garbage until a real text confirms it */
  add(raw: string, w: string, i: number, ocr: boolean, joinsKnown = false): void {
    raw = stripStress(raw); const k = key(raw); if (!k || !isCleanSpelling(raw)) return
    let a = this.m.get(k)
    if (!a) this.m.set(k, a = { raw, count: 0, ws: new Set(), occ: [], clean: false, lower: 0, joins: 0 })
    a.count++
    if (raw[0] === raw[0]!.toLowerCase()) a.lower++
    if (joinsKnown) a.joins++
    if (!ocr) a.clean = true
    if (!a.ws.has(w)) { a.ws.add(w); if (a.occ.length < UV_MAX_OCC_ATT) a.occ.push([w, i]) }
  }
  keys(): string[] { return [...this.m.keys()] }
  /** group by `fold(key)`; `skip(spellingKey)` drops spellings that already own a card; `orvOf` finds an ORV card for a group */
  groups(fold: (k: string) => string, skip: (k: string) => boolean = () => false, orvOf: (spellingKeys: string[], groupKey: string) => string = () => '', promote?: (i: UvPromoteIn) => PromoteVerdict): Map<string, { g: UvGroup; spellingKeys: string[]; verdict?: PromoteVerdict }> {
    const by = new Map<string, [string, Acc][]>()
    for (const [k, a] of this.m) { if (!a.clean || skip(k)) continue; const f = fold(k) || k; const l = by.get(f) ?? []; l.push([k, a]); by.set(f, l) }
    const out = new Map<string, { g: UvGroup; spellingKeys: string[]; verdict?: PromoteVerdict }>()
    for (const [f, l] of by) {
      l.sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      const ws = new Set<string>(), occ: (string | number)[] = [], seenW = new Set<string>()
      let total = 0
      for (const [, a] of l) { total += a.count; a.ws.forEach(w => ws.add(w)); for (const [w, i] of a.occ) if (occ.length < UV_MAX_OCC * 2 && !seenW.has(w)) { seenW.add(w); occ.push(w, i) } }
      const sk = l.map(x => x[0])
      const verdict = promote?.({ spellings: l.map(([, a]) => ({ raw: a.raw, count: a.count, lower: a.lower, joins: a.joins })), witnesses: l.map(([, a]) => [...a.ws]) })
      if (verdict?.ok) {   // CV-4: a promoted card keeps a KWIC line from every vetted witness it can (UV_MAX_OCC_ATT), not four
        occ.length = 0; seenW.clear()
        for (const v of verdict.vetted ?? []) for (const [, a] of l) { const o = a.occ.find(x => x[0] === v); if (o && occ.length < UV_MAX_OCC_ATT * 2 && !seenW.has(v)) { seenW.add(v); occ.push(o[0], o[1]); break } }
      }
      out.set(f, { g: [l[0]![1].raw, total, ws.size, l.slice(0, UV_MAX_SPELLINGS).map(([, a]) => [a.raw, a.count] as [string, number]), orvOf(sk, f), ...occ, ...(verdict?.ok ? [1] : [])], spellingKeys: sk, ...(verdict ? { verdict } : {}) })
    }
    return out
  }
}

/** SPEC 63 MM-4: a group with a TOROT lemma (ORV card) attested in at least this many distinct witnesses is «засвідчено (TOROT + N пам’яток)», not «неперевірена лема» */
export const UV_CONFIRM_MIN_W = 2
export const pamiatok = (n: number): string => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'пам’ятка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'пам’ятки' : 'пам’яток'}`
export interface UvStatus { confirmed: boolean; label: string }
export const uvStatus = (g: UvGroup): UvStatus =>
  g[4] && g[2] >= UV_CONFIRM_MIN_W ? { confirmed: true, label: `засвідчено (TOROT + ${pamiatok(g[2])})` } : uvAttested(g) ? { confirmed: true, label: UV_ATTESTED_LABEL } : { confirmed: false, label: 'неперевірена лема' }
