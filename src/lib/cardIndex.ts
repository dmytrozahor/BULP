/** SPEC 63 CV-2: the index of every non-lexicon card (light /lw, CV /lw, archaic /ar) and the CV attestation shards. */
import { cardMap, cardRoute, cvBucket, cvShardUrl, lk, type CardHit, type CardIndexFile, type CvEntry } from '../../core/cv.ts'
import { key } from '../../core/text.ts'
import type { SearchIndex } from './search.ts'
import { fetchJson } from './fetchJson.ts'


/** A SearchIndex over the card index (Hit.lemma = `<kind>:<id>`), so search() ranks exact / prefix / substring exactly as for lexicon cards. */
export function cardSearchIndex(ci: CardIndexFile): SearchIndex {
  const map = new Map<string, { lemma: string; form: string; via: 'lemma' }[]>()
  for (const [k, hs] of cardMap(ci)) map.set(k, hs.map(h => ({ lemma: `${h.kind}:${h.id}`, form: h.form, via: 'lemma' as const })))
  return { map, keys: [...map.keys()].sort() }
}
export const hitRoute = (lemma: string) => { const i = lemma.indexOf(':'); return cardRoute({ kind: lemma.slice(0, i) as CardHit['kind'], id: lemma.slice(i + 1) }) }
export const hitWord = (lemma: string) => lemma.slice(lemma.indexOf(':') + 1)

const shards = new Map<number, Promise<Record<string, CvEntry>>>()
/** the CV entry (attestation lines) of a word; undefined when the word has none */
export async function loadCv(word: string): Promise<CvEntry | undefined> {
  const b = cvBucket(word); let p = shards.get(b)
  if (!p) shards.set(b, p = fetchJson(cvShardUrl(word)).then(j => (j ?? {}) as Record<string, CvEntry>, () => { shards.delete(b); return {} as Record<string, CvEntry> }))   // 404 = no shard (cached); a network / 5xx failure is reported (DataNotice) and not cached
  const k = lk(word), e = (await p)[k]
  return e && e[0] === '' ? ([k, ...e.slice(1)] as unknown as CvEntry) : e   // DO-6: a dictionary-only entry stores '' for a word that is its own key
}

/** SPEC 63 SL / CV: the word card of a Plast headword (a lexicon lemma, else a light / CV / archaic card, else its own /lw card); lookup via lk(), the source spelling is not altered */
export function wordCardTo(w: string, lex: SearchIndex, cards?: { get(k: string): CardHit[] | undefined }): string {
  const k = lk(w), h = lex.map.get(k)?.find(x => x.via === 'lemma')
  if (h) return `/w/${encodeURIComponent(h.lemma)}`
  const c = cards?.get(k)?.[0]
  return c ? cardRoute(c) : `/lw/${encodeURIComponent(w)}`
}
