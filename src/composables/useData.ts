/**
 * Data loading (SPEC 63 PF): the browser never downloads the lexicon whole. useData() hands out
 *  - `corpus`: boot.json (N, epoch / century sizes, regions, vetting records, counts) — the only file of the first load; `ensureCorpus()` swaps in the full corpus.json (witness list) for the pages that list witnesses;
 *  - `byLemma` / `witnessById` / `searchIdx.map` / `annData` / `att`: Map-like facades over on-demand shards (src/lib/parts.ts) — a missing shard starts its fetch and reads as absent, the arrival re-runs the reader;
 *  - `fullOf(core)`: the lemma's detail shard (lex/<bucket>.json, SPEC 20 B-5) merged into the core card.
 * No lemma list, no paradigm map and no search index is built in memory.
 */
import { computed, markRaw, reactive, shallowReactive, shallowRef, toRefs } from 'vue'
import type { Author, CoreCard, CorpusMeta, LemmaCard, LemmaDetail, WitnessMeta } from '../../core/types.ts'
import { unpackCore } from '../../core/pack.ts'
import { bucketOf, isFull, mergeCard, unpackShard } from '../../core/shard.ts'
import { SOURCES } from '../../core/sources.ts'
import type { BootFile } from '../../core/parts.ts'
import type { SearchIndex } from '../lib/search.ts'
import type { AnnotateData } from '../lib/annotate.ts'
import { cardMapView, ixAttest, ixHitMap, ixLexIndex, ixParadigm, witnessOf } from '../lib/parts.ts'

export const toCards = unpackCore   // tests / fixtures: a packed core (format 3/4), a packed format 2 or a plain LemmaCard[] (fixture: detail embedded)

/** boot.json dressed as a CorpusMeta without the witness list (`witnesses` is empty until ensureCorpus()) */
export type BootCorpus = CorpusMeta & { nWitnesses: number; nLemmas: number; lemmaPage: number; full?: boolean }
const state = reactive({ corpus: undefined as BootCorpus | undefined, loaded: false, loading: false, error: '' as string, progress: { phase: '', frac: 0, note: '' } })
const fullCorpus = shallowRef<CorpusMeta>()
const searchIdx = shallowRef<SearchIndex>({ map: ixHitMap, keys: [] })

const get = async (name: string) => {
  const r = await fetch(`./data/${name}.json`)
  if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`)
  return r.json()
}

let started: Promise<void> | undefined
export function loadData() {
  return (started ??= (async () => {
    state.loading = true; state.progress.phase = 'завантаження'
    try {
      const b = await get('boot') as BootFile
      state.corpus = markRaw({
        generated: b.generated, authors: b.authors as Author[], witnesses: [], epochSizes: b.epochSizes, centurySizes: b.centurySizes, N: b.N, linked: b.linked, unresolved: b.unresolved,
        topUnresolved: [], rusynStatus: b.rusynStatus as CorpusMeta['rusynStatus'], regions: b.regions as CorpusMeta['regions'], nWitnesses: b.nWitnesses, nLemmas: b.nLemmas, lemmaPage: b.lemmaPage,
      })
      state.loaded = true
    } catch (e) { state.error = String((e as Error).message ?? e) }
    finally { state.loading = false }
  })())
}

let fullP: Promise<void> | undefined
/** the whole corpus.json (witness list, topUnresolved): fetched by the pages that list witnesses / need witness indices, never by a word card */
export function ensureCorpus() {
  return (fullP ??= get('corpus').then(c => { fullCorpus.value = markRaw(c) }).catch(e => { fullP = undefined; state.error = String((e as Error).message ?? e) }))
}

// ── detail shards (B-5b) ─────────────────────────────────────────────────────────────────────
const details = shallowReactive(new Map<string, LemmaDetail>()), detailError = shallowReactive(new Map<string, string>())
const shards = new Map<number, Promise<Map<string, LemmaDetail>>>(), merged = new Map<string, LemmaCard>()
const loadShard = (lemma: string) => {
  const b = bucketOf(lemma); let p = shards.get(b)
  if (!p) shards.set(b, p = get(`lex/${b}`).then(unpackShard).catch(e => { shards.delete(b); throw e }))
  return p
}
const fetching = new Set<string>()
const fetchDetail = (lemma: string) => {
  if (details.has(lemma) || detailError.has(lemma) || fetching.has(lemma)) return
  fetching.add(lemma)
  loadShard(lemma).then(m => { const d = m.get(lemma); d ? details.set(lemma, markRaw(d)) : detailError.set(lemma, 'немає в шарді') })
    .catch(e => detailError.set(lemma, String((e as Error).message ?? e))).finally(() => fetching.delete(lemma))
}
/** The merged full card of a core card (SPEC 20 B-5c): undefined until its shard is loaded (reactive: computeds re-run on arrival); a card that already embeds its detail is returned as is. */
export function fullOf(c: CoreCard | LemmaCard | undefined): LemmaCard | undefined {
  if (!c) return undefined
  if (isFull(c)) return c
  const d = details.get(c.lemma)
  if (d) { let m = merged.get(c.lemma); if (!m) merged.set(c.lemma, m = markRaw(mergeCard(c, d))); return m }
  fetchDetail(c.lemma)
  return undefined
}

const witnessById = computed(() => ({ get: (id: string): WitnessMeta | undefined => witnessOf(id), has: (id: string) => !!witnessOf(id) }))
/** Everything the pure annotator/analyser needs: shard-backed lookups, nothing in memory */
const annData = computed<AnnotateData>(() => ({ search: searchIdx.value, cards: cardMapView, lexindex: ixLexIndex, paradigmMap: ixParadigm }))
const corpus = computed<BootCorpus | undefined>(() => (fullCorpus.value && state.corpus ? { ...state.corpus, ...fullCorpus.value, full: true } : state.corpus))

export interface AuthorInfo { id: string; name: string; label?: Author['label']; status?: Author['status']; evidence: Author['evidence']; life?: string; known: boolean }
/** Resolve an author id (or name) to the vetting record; falls back to the witness's own self-reference evidence. */
export function authorInfo(idOrName: string, w?: WitnessMeta): AuthorInfo {
  const list = state.corpus?.authors ?? [], a = list.find(x => x.id === idOrName) ?? list.find(x => x.name === idOrName)
  const ev = [...(a?.evidence ?? []), ...(w?.authorEvidence ?? [])]
  return a ? { id: a.id, name: a.name, label: a.label, status: a.status, evidence: ev, life: a.life, known: true }
    : { id: idOrName, name: idOrName, evidence: ev, known: false }
}

export function useData() {
  loadData()
  const sourceTitle = (id: string) => SOURCES[id]?.title ?? witnessOf(id)?.title ?? id
  const sourceUrl = (id: string) => SOURCES[id]?.url ?? witnessOf(id)?.url
  const { loaded, loading, error, progress } = toRefs(state)
  return { loaded, loading, error, progress, corpus, byLemma: computed(() => cardMapView), fullOf, detailError, searchIdx, att: computed(() => ixAttest), witnessById, annData, sourceTitle, sourceUrl, ensureCorpus, isFixture: computed(() => state.corpus?.generated === 'FIXTURE') }
}
