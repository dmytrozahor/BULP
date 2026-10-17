/**
 * SPEC 63 NV-3: index of UNLINKED spellings — word tokens that occur in a running text (public/data/texts) but are not a spelling of any lexicon lemma.
 * Without it /f/<spelling> (reached from the analyser or a shared URL) said «такого написання немає в корпусі» although the spelling is in a text.
 * Layout (NV-5; the 10 M-token import has 4.25 M spellings, 364 MB): public/data/unlinked/idx-<hex of the first 2 letters>.json = { format: 1, leaves: [prefix, nKeys][] } (one small manifest per top prefix) and
 * public/data/unlinked/<hex of prefix>.json = { "<key>": [raw, count, nWitnesses, w1, i1, w2, i2, w3, i3] }, prefix-sharded like ix/ and dx/: a leaf is
 * the first n letters of the key (n = 2 … UNL_MAX, '_'-padded), split one letter deeper while its gzip size is above UNL_GZ_MAX. Nothing is dropped; the
 * directory travels on the data branch, not the code branch. (The first layout was 64 hash shards; unlinkedShard stays for core/uv.ts.)
 * (w, i) = witness id + token index in public/data/texts/<w>.json (the KWIC is cut from there, no text is duplicated). At most 3 witnesses per spelling.
 */
import { key } from './text.ts'

export const UNLINKED_SHARDS = 64
export const UNLINKED_MAX_WITNESSES = 3
/** size budget of the whole directory (raw bytes), checked by the build and by tests/unlinked.test.ts. The 10 M-token corpus' 4.25 M spellings are ≈ 364 MB;
 *  the budget leaves headroom without dropping any spelling (NV-5; the GitHub Pages site limit is 1 GB). */
export const UNLINKED_BUDGET_BYTES = 512 * 1024 * 1024
/** per-leaf gzip target (like IX_GZ_MAX) and hard limit (a leaf that cannot be split further may exceed the target but never this); leaf prefix length range; manifest limit */
export const UNL_GZ_MAX = 30 * 1024, UNL_GZ_HARD = 128 * 1024
export const UNL_MIN = 2, UNL_MAX = 12, UNL_SPLIT_MIN_KEYS = 2
export const UNL_FORCE_SPLIT = 20000
export const UNL_MANIFEST_GZ_MAX = 32 * 1024

export const unlinkedShard = (k: string, n = UNLINKED_SHARDS): number => {
  let h = 2166136261
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h % n
}
/** a token worth a spelling page: letters (with stress / apostrophes / hyphen), no digits or punctuation-only tokens */
export const isWordToken = (raw: string): boolean => /\p{L}/u.test(raw) && /^[\p{L}\p{M}'’ʼ-]+$/u.test(raw)

export type UnlinkedEntry = [raw: string, count: number, nWitnesses: number, ...occ: (string | number)[]]
export interface UnlinkedOcc { w: string; i: number }
export const occurrencesOf = (e: UnlinkedEntry): UnlinkedOcc[] => {
  const out: UnlinkedOcc[] = []
  for (let j = 3; j + 1 < e.length; j += 2) out.push({ w: String(e[j]), i: +(e[j + 1] as number) })
  return out
}

/** accumulator used by the build: add(raw, witness, tokenIndex) for every token that is not a lexicon spelling */
export function newAccumulator() {
  const m = new Map<string, UnlinkedEntry>()
  return {
    m,
    add(raw: string, w: string, i: number) {
      const k = key(raw); if (!k) return
      const e = m.get(k)
      if (!e) { m.set(k, [raw, 1, 1, w, i]); return }
      e[1] = (e[1] as number) + 1
      const seen = occurrencesOf(e).map(o => o.w)
      if (!seen.includes(w)) { e[2] = (e[2] as number) + 1; if (seen.length < UNLINKED_MAX_WITNESSES) e.push(w, i) }
    },
  }
}
// ── prefix-sharded layout (NV-5) ────────────────────────────────────────────────────────────────
export interface UnlinkedManifest { format: 1; leaves: [prefix: string, nKeys: number][] }
const unlPad = (k: string, n: number): string => { const cs = [...k]; while (cs.length < n) cs.push('_'); return cs.slice(0, n).join('') }
/** file name of a leaf: hex code points (Cyrillic file names are not portable); same scheme as ixName in core/parts.ts */
export const unlinkedName = (p: string): string => [...p].map(c => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('')
/** the leaf that holds key k (undefined when the manifest has none: the key is not indexed) */
export function unlinkedLeaf(k: string, leaves: ReadonlySet<string>): string | undefined {
  for (let n = UNL_MIN; n <= UNL_MAX; n++) { const p = unlPad(k, n); if (leaves.has(p)) return p }
  return undefined
}
export const leafShard = (m: Map<string, UnlinkedEntry>, keys: string[]): Record<string, UnlinkedEntry> => { const o: Record<string, UnlinkedEntry> = {}; for (const k of keys.slice().sort()) o[k] = m.get(k)!; return o }
/**
 * Plan the leaves: split by prefix until every leaf's gzip size (`gzSize` of its JSON text) is ≤ gzMax, or it cannot be split / reached UNL_MAX.
 * A leaf whose raw JSON is already ≤ gzMax is never compressed. Every key lands in exactly one leaf; nothing is dropped. Result: prefix → keys.
 */
export function planUnlinked(m: Map<string, UnlinkedEntry>, gzSize: (json: string) => number, gzMax = UNL_GZ_MAX): Map<string, string[]> {
  const leaves = new Map<string, string[]>()
  const group = (ks: string[], n: number) => { const by = new Map<string, string[]>(); for (const k of ks) { const q = unlPad(k, n); (by.get(q) ?? by.set(q, []).get(q)!).push(k) } return by }
  const go = (p: string, ks: string[], n: number) => {
    if (n < UNL_MAX && ks.length >= UNL_SPLIT_MIN_KEYS) {
      // a group this large is certainly over the target: split without serialising it (the top groups are ~100 MB)
      const big = ks.length > UNL_FORCE_SPLIT, t = big ? '' : JSON.stringify(leafShard(m, ks))
      if (big || (t.length > gzMax && gzSize(t) > gzMax)) { const by = group(ks, n + 1); if (by.size > 1) { for (const [q, sub] of by) go(q, sub, n + 1); return } }
    }
    leaves.set(p, ks)
  }
  for (const [p, ks] of group([...m.keys()], UNL_MIN)) go(p, ks, UNL_MIN)
  return leaves
}
/** the manifest is split per first-2-letter prefix (32,831 leaves made one flat manifest 129 KB gz): idx-<hex of top>.json = { format 1, leaves under that top } */
export const unlinkedTop = (k: string): string => unlPad(k, UNL_MIN)
export const unlinkedManifestName = (top: string): string => 'idx-' + unlinkedName(top)
export function manifestsOf(leaves: Map<string, string[]>): Map<string, UnlinkedManifest> {
  const out = new Map<string, UnlinkedManifest>()
  for (const [p, ks] of leaves) { const top = unlinkedTop(p); (out.get(top) ?? out.set(top, { format: 1, leaves: [] }).get(top)!).leaves.push([p, ks.length]) }
  for (const m of out.values()) m.leaves.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return out
}
