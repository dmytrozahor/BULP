/**
 * SPEC 63 CP-9: the VESUM paradigm of the lemmas that have no full card (light / dictionary-only / UV / attested-only / unlinked / archaic / name / ORV cards show the paradigm of their
 * modern equivalent). Sidecar lm/par/<bucket>.json, PAR_BUCKETS buckets by lk(lemma); the browser fetches the one shard of the card's word (src/lib/thinPar.ts).
 * Shard: { format: 1, tags: string[], entries: { [lk(lemma)]: [lemma as written, lemma-line tags, [form, tag index][]][] } } — homonyms of one key are kept apart (≤ PAR_HOMONYMS),
 * tags stay VERBATIM (they are the evidence), a form is stored with the tag string of its VESUM line. Nothing is generated: a lemma VESUM does not know has no entry. Pure.
 */
import { bucketOf } from './shard.ts'
import { lk } from './cv.ts'

export const PAR_BUCKETS = 1024
export const PAR_HOMONYMS = 3
export const parBucket = (k: string) => bucketOf(k, PAR_BUCKETS)
export const parUrl = (k: string) => `./data/lm/par/${parBucket(k)}.json`

export type ParEntry = [lemma: string, lemmaTags: string, forms: [form: string, tag: number][]]
export interface ParShard { format: 1; tags: string[]; entries: Record<string, ParEntry[]> }
export interface ParLemma { lemma: string; tags: string; paradigm: { form: string; tags: string }[] }

/** Streaming collector: feed VESUM lines in file order (a lemma line, then its forms); `skip` = keys that have a full card (their paradigm is in the lexicon already). */
export class ParBuilder {
  private shards = new Map<number, { tags: Map<string, number>; list: string[]; entries: Map<string, ParEntry[]> }>()
  private cur?: { key: string; entry: ParEntry }
  n = 0
  private skip: Set<string>
  constructor(skip: Iterable<string> = []) { this.skip = new Set([...skip].map(lk)) }
  /** a head line (lemma + its tags) or a form line of the current lemma */
  add(e: { lemma: string; lemmaTags: string; form: string; tags: string; head: boolean }): void {
    if (e.head) {
      this.cur = undefined
      const k = lk(e.lemma); if (!k || this.skip.has(k)) return
      const b = parBucket(k), s = this.shards.get(b) ?? (this.shards.set(b, { tags: new Map(), list: [], entries: new Map() }), this.shards.get(b)!)
      const list = s.entries.get(k) ?? (s.entries.set(k, []), s.entries.get(k)!)
      const same = list.find(x => x[0] === e.lemma && x[1] === e.lemmaTags)
      if (same) { this.cur = { key: k, entry: same }; return }
      if (list.length >= PAR_HOMONYMS) return
      const entry: ParEntry = [e.lemma, e.lemmaTags, []]; list.push(entry); this.cur = { key: k, entry }
      return
    }
    if (!this.cur || !e.tags) return
    const s = this.shards.get(parBucket(this.cur.key))!, f = this.cur.entry[2]
    let t = s.tags.get(e.tags); if (t === undefined) { t = s.list.length; s.tags.set(e.tags, t); s.list.push(e.tags) }
    if (!f.some(x => x[0] === e.form && x[1] === t)) { f.push([e.form, t]); this.n++ }
  }
  /** shards by bucket; lemma lines with no form line and no tags are kept (an indeclinable word is a paradigm of one head) */
  finish(): Map<number, ParShard> {
    const out = new Map<number, ParShard>()
    for (const [b, s] of this.shards) out.set(b, { format: 1, tags: s.list, entries: Object.fromEntries([...s.entries].sort((a, c) => (a[0] < c[0] ? -1 : 1))) })
    return out
  }
}

/** the entries of a word in a shard, decoded (undefined: VESUM has no such lemma in this shard) */
export function parOfShard(shard: ParShard | undefined, word: string): ParLemma[] | undefined {
  const es = shard?.entries[lk(word)]; if (!es?.length) return undefined
  return es.map(([lemma, tags, forms]) => ({ lemma, tags, paradigm: forms.map(([form, t]) => ({ form, tags: shard!.tags[t] ?? '' })) }))
}
