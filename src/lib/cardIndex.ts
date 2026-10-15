/** SPEC 63 CV-2: the index of every non-lexicon card (light /lw, CV /lw, archaic /ar) and the CV attestation shards. */
import { cardMap, cardRoute, cvBucket, cvShardUrl, type CardHit, type CardIndexFile, type CvEntry } from '../../core/cv.ts'
import { key } from '../../core/text.ts'
import type { SearchIndex } from './search.ts'

let ip: Promise<CardIndexFile> | undefined
export function loadCardIndex(): Promise<CardIndexFile> {
  ip ??= fetch('./data/cardindex.json').then(r => { if (!r.ok) throw new Error(`cardindex.json: HTTP ${r.status}`); return r.json() as Promise<CardIndexFile> }).catch(e => { ip = undefined; throw e })
  return ip
}

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
  if (!p) shards.set(b, p = fetch(cvShardUrl(word)).then(r => (r.ok ? r.json() : {})).catch(() => ({})) as Promise<Record<string, CvEntry>>)
  return (await p)[key(word)]
}
