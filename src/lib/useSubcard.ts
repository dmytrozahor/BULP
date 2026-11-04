/**
 * SPEC 63 DB-3: the dialect subcard of a lemma page. The URL is the state (`?sub=`, `?std=1`, `?from=`), so the browser Back button and shared links work; entering the subcard REPLACES the
 * history entry (no extra entry to step back through, no loop), the back arrow PUSHES `?std=1` (Back returns to the subcard). Uses data that is already loaded (the card, the CR-1 sidecar the
 * «Відповідники» block loads anyway); the only lazy read is lm/cg.
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type { FormCard } from '../../core/types.ts'
import { dialect } from './views.ts'
import { corrOf } from './corrData.ts'
import { resolveSub, subAction, type ShownLike, type SubPlan } from '../../core/subcard.ts'
import { DIALECTS } from '../../core/rules.ts'
import { wordTo } from './nav.ts'

/** the part of a spelling card the subcard reads */
export type SubForm = Pick<FormCard, 'raw' | 'date'> & Partial<Pick<FormCard, 'byW' | 'kwic' | 'modern'>>
export function useSubcard(lemma: () => string, shown: () => ShownLike | undefined, hasCard: (form: string) => boolean, enabled: () => boolean = () => true) {
  const route = useRoute(), router = useRouter()
  const groups = computed(() => (lemma() ? corrOf(lemma()) : []))
  const ready = computed(() => enabled() && !!dialect.value && groups.value !== undefined && shown() !== undefined)
  const plan = computed<SubPlan | undefined>(() => (ready.value ? resolveSub(lemma(), dialect.value, groups.value, shown(), hasCard) : undefined))
  const q = computed(() => ({ sub: typeof route.query.sub === 'string' ? route.query.sub : '', std: route.query.std === undefined ? undefined : String(route.query.std), from: typeof route.query.from === 'string' ? route.query.from : '' }))
  const action = computed(() => (dialect.value ? subAction(q.value, plan.value, ready.value) : 'none'))
  const without = (keys: string[]): LocationQueryRaw => { const o: LocationQueryRaw = { ...route.query }; for (const k of keys) delete o[k]; return o }
  const active = computed(() => action.value === 'sub')
  /** no form in this dialect: the normal card and a note (only once the data is in, and not on the standard view the reader chose) */
  const noForm = computed(() => ready.value && !plan.value && !q.value.from)
  const dialectName = computed(() => DIALECTS[dialect.value] ?? dialect.value)
  /** the arrow of the subcard: the standard view of this lemma, the dialect switch untouched */
  const back = computed(() => ({ path: route.path, query: { ...without(['sub']), std: '1' } as LocationQueryRaw }))
  /** the arrow of a lexical card entered as a subcard: back to the standard view of the lemma it came from */
  const fromBack = computed(() => (q.value.from ? { path: wordTo(q.value.from), query: { std: '1' } as LocationQueryRaw } : undefined))

  watch([action, plan, () => route.fullPath], () => {
    const a = action.value, p = plan.value
    if (a === 'enter' && p && !p.lexical) router.replace({ path: route.path, query: { ...route.query, sub: p.form } })
    else if (a === 'fix' && p) router.replace({ path: route.path, query: { ...route.query, sub: p.form } })
    else if (a === 'drop') router.replace({ path: route.path, query: without(['sub']) })
    else if (a === 'lexical' && p) router.replace({ path: wordTo(p.form), query: { from: lemma() } })
  }, { immediate: true })
  // the switch changed on this page: forget this visit's choice and answer the new dialect at once (the normative switch just clears the state)
  watch(dialect, (n, o) => { if (n !== o && (route.query.sub !== undefined || route.query.std !== undefined)) router.replace({ path: route.path, query: without(['sub', 'std']) }) })
  return { plan, active, noForm, dialectName, back, fromBack, ready }
}
