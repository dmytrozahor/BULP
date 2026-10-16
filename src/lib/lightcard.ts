/** SPEC 63 GZ-4: relatives of a light-card lemma that prove an і < о/е alternation (покірність ~ покора), found among the sorted search keys; evidence-based, never guessed. */
/** the same, over the prefix shards: `keysWith(pre)` = the sorted keys that start with `pre` (PF-1: no global key list) */
export async function ikavismBaseRemote(lemma: string, keysWith: (pre: string) => Promise<string[]>): Promise<string[]> {
  const w = lemma.toLowerCase(), out: string[] = []
  for (let k = 0; k < w.length; k++) {
    if (w[k] !== 'і') continue
    for (const v of ['о', 'е']) {
      const pre = w.slice(0, k) + v
      if (pre.length < 4) continue
      const first = (await keysWith(pre)).find(x => x !== w)
      if (first) out.push(first)
    }
  }
  return [...new Set(out)].slice(0, 3)
}
export function ikavismBase(lemma: string, keys: readonly string[]): string[] {
  const w = lemma.toLowerCase(), out: string[] = []
  for (let k = 0; k < w.length; k++) {
    if (w[k] !== 'і') continue
    for (const v of ['о', 'е']) {
      const pre = w.slice(0, k) + v
      if (pre.length < 4) continue
      let lo = 0, hi = keys.length
      while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m]! < pre) lo = m + 1; else hi = m }
      if (lo < keys.length && keys[lo]!.startsWith(pre) && keys[lo] !== w) out.push(keys[lo]!)   // first key with this stem: the base word
    }
  }
  return [...new Set(out)].slice(0, 3)
}
