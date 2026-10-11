/**
 * Data loading (SPEC 10 M-6): fetch ./data/{corpus,lexicon,lexindex}.json once; module-level reactive state shared by all views.
 * lexicon.json is a plain LemmaCard[]; corpus.json carries the author vetting records (CorpusMeta.authors).
 */
import { computed, markRaw, reactive, shallowRef, toRefs } from 'vue'
import type { CorpusMeta, LemmaCard, LexIndex, VesumHit, WitnessMeta } from '../../core/types.ts'
import { SOURCES } from '../../core/sources.ts'
import type { Author } from '../../core/types.ts'
import { buildIndexAsync, emptyIndex, type SearchIndex } from '../lib/search.ts'
import { attestIndex } from '../lib/derive.ts'
import type { AnnotateData } from '../lib/annotate.ts'

const state = reactive({
  corpus: undefined as CorpusMeta | undefined, cards: [] as LemmaCard[], lexindex: undefined as LexIndex | undefined,
  loaded: false, loading: false, error: '' as string,
  /** F2: loading progress for the ~15 MB lexicon: phase + fraction 0..1 */
  progress: { phase: '', frac: 0, note: '' },
})
const searchIdx = shallowRef<SearchIndex>(emptyIndex()), paradigmMap = shallowRef(new Map<string, VesumHit[]>())

export const toCards = (j: unknown) => j as LemmaCard[]   // lexicon.json is a plain Lexicon = LemmaCard[]

/** fetch + JSON.parse; streams the body so a large file reports download progress (Content-Length; indeterminate otherwise). */
const get = async (name: string, onFrac?: (f: number, bytes: number) => void) => {
  const r = await fetch(`./data/${name}.json`)
  if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`)
  const total = +(r.headers.get('content-length') ?? 0)
  if (!r.body || !onFrac) return r.json()
  const rd = r.body.getReader(), parts: Uint8Array[] = []; let got = 0
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onFrac(total ? Math.min(1, got / total) : 0, got) }
  const buf = new Uint8Array(got); let o = 0; for (const c of parts) { buf.set(c, o); o += c.length }
  await tick()   // let the "parsing" label paint before the blocking JSON.parse
  return JSON.parse(new TextDecoder().decode(buf))
}
const tick = () => new Promise<void>(r => setTimeout(r, 0))

let started: Promise<void> | undefined
export function loadData() {
  return (started ??= (async () => {
    state.loading = true
    try {
      const P = state.progress, mb = (b: number) => (b / 1048576).toFixed(1)
      P.phase = 'завантаження'
      const [c, l, x] = await Promise.all([get('corpus'), get('lexicon', (f, b) => { P.frac = f * 0.5; P.note = `${mb(b)} МБ` }), get('lexindex').catch(() => undefined)])
      state.corpus = markRaw(c); state.cards = markRaw(toCards(l)); state.lexindex = x && markRaw(x)   // markRaw: no deep reactive proxies over 15 MB
      P.phase = 'індексація'; P.note = `${state.cards.length} лем`
      const built = await buildIndexAsync(state.cards, f => { P.frac = 0.5 + f * 0.5 })   // time-sliced: the UI thread never blocks > ~30 ms
      searchIdx.value = built.idx; paradigmMap.value = built.paradigm
      state.loaded = true
    } catch (e) { state.error = String((e as Error).message ?? e) }
    finally { state.loading = false }
  })())
}

const byLemma = computed(() => new Map(state.cards.map(c => [c.lemma, c])))
const witnessById = computed(() => new Map((state.corpus?.witnesses ?? []).map(w => [w.id, w])))
/** Everything the pure annotator/analyser needs. */
/** attestation index of all forms, built once on first use (not per component) */
const att = computed(() => attestIndex(state.cards))
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
  return { ...toRefs(state), byLemma, searchIdx, att, witnessById, annData, sourceTitle, sourceUrl, isFixture: computed(() => state.corpus?.generated === 'FIXTURE') }
}
