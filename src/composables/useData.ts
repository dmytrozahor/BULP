/**
 * Data loading (SPEC 10 M-6): fetch ./data/{corpus,lexicon,lexindex}.json once; module-level reactive state shared by all views.
 * lexicon.json is a plain LemmaCard[]; corpus.json carries the author vetting records (CorpusMeta.authors).
 */
import { computed, reactive, toRefs } from 'vue'
import type { CorpusMeta, LemmaCard, LexIndex, VesumHit, WitnessMeta } from '../../core/types.ts'
import { key } from '../../core/text.ts'
import { SOURCES } from '../../core/sources.ts'
import type { Author } from '../../core/types.ts'
import { buildIndex } from '../lib/search.ts'
import type { AnnotateData } from '../lib/annotate.ts'

const state = reactive({
  corpus: undefined as CorpusMeta | undefined, cards: [] as LemmaCard[], lexindex: undefined as LexIndex | undefined,
  loaded: false, loading: false, error: '' as string,
})

export const toCards = (j: unknown) => j as LemmaCard[]   // lexicon.json is a plain Lexicon = LemmaCard[]

const get = async (name: string) => {
  const r = await fetch(`./data/${name}.json`)
  if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`)
  return r.json()
}

let started: Promise<void> | undefined
export function loadData() {
  return (started ??= (async () => {
    state.loading = true
    try {
      const [c, l, x] = await Promise.all([get('corpus'), get('lexicon'), get('lexindex').catch(() => undefined)])
      state.corpus = c; state.cards = toCards(l); state.lexindex = x; state.loaded = true
    } catch (e) { state.error = String((e as Error).message ?? e) }
    finally { state.loading = false }
  })())
}

const byLemma = computed(() => new Map(state.cards.map(c => [c.lemma, c])))
const searchIdx = computed(() => buildIndex(state.cards))
const witnessById = computed(() => new Map((state.corpus?.witnesses ?? []).map(w => [w.id, w])))
const paradigmMap = computed(() => {
  const m = new Map<string, VesumHit[]>()
  for (const c of state.cards) for (const p of c.paradigm) { const k = key(p.form); (m.get(k) ?? m.set(k, []).get(k)!).push({ lemma: c.lemma, tags: p.tags }) }
  return m
})
/** Everything the pure annotator/analyser needs. */
const annData = computed<AnnotateData>(() => ({ search: searchIdx.value, cards: byLemma.value, lexindex: state.lexindex, paradigmMap: paradigmMap.value }))

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
  const sourceTitle = (id: string) => SOURCES[id]?.title ?? witnessById.value.get(id)?.title ?? id
  const sourceUrl = (id: string) => SOURCES[id]?.url ?? witnessById.value.get(id)?.url
  return { ...toRefs(state), byLemma, searchIdx, witnessById, annData, sourceTitle, sourceUrl, isFixture: computed(() => state.corpus?.generated === 'FIXTURE') }
}
