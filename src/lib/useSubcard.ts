/**
 * SPEC 63 DB-3 / DB-3b: what a LEMMA page does with the «Говір» switch. With the switch set and a dialect variant of the lemma known, the page REPLACES itself by the variant's own card
 * (/v/<dialect>/<form>?of=<lemma>, src/views/VariantView.vue); the standard card is not rendered underneath. A lexical member with a card of its own (коби for щоб) is opened as that card
 * (?from=<lemma>). `?std=1` = the reader chose the standard view for this visit (set by the back arrow of the variant card): the switch is kept and the page stays. Entering REPLACES the history
 * entry, so the browser Back button never loops. Uses data already on the page (the card, the lazy lm/cg of the «Відповідники» block).
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type { FormCard } from '../../core/types.ts'
import { dialect } from './views.ts'
import { corrOf } from './corrData.ts'
import { resolveSub, subAction, variantTo, type ShownLike, type SubPlan } from '../../core/subcard.ts'
import { DIALECTS } from '../../core/rules.ts'
import { wordTo } from './nav.ts'

/** the part of a spelling card the variant card reads */
export type SubForm = Pick<FormCard, 'raw' | 'date' | 'f'> & Partial<Pick<FormCard, 'byW' | 'kwic' | 'modern' | 'ocrOnly'>>
export function useSubcard(lemma: () => string, shown: () => ShownLike | undefined, hasCard: (form: string) => boolean, enabled: () => boolean = () => true) {
  const route = useRoute(), router = useRouter()
  const groups = computed(() => (lemma() ? corrOf(lemma()) : []))
  const ready = computed(() => enabled() && !!dialect.value && groups.value !== undefined && shown() !== undefined)
  const plan = computed<SubPlan | undefined>(() => (ready.value ? resolveSub(lemma(), dialect.value, groups.value, shown(), hasCard) : undefined))
  const q = computed(() => ({ std: route.query.std === undefined ? undefined : String(route.query.std), from: typeof route.query.from === 'string' ? route.query.from : '' }))
  const action = computed(() => (dialect.value ? subAction(q.value, plan.value, ready.value) : 'none'))
  /** no form in this dialect: the normal card and a small note (only once the data is in, and not on a lexical card or the standard view the reader chose) */
  const noForm = computed(() => ready.value && !plan.value && !q.value.from)
  const dialectName = computed(() => DIALECTS[dialect.value] ?? dialect.value)
  /** the arrow of a lexical card entered from the lemma named in ?from= */
  const fromBack = computed(() => (q.value.from ? { path: wordTo(q.value.from), query: { std: '1' } as LocationQueryRaw } : undefined))

  watch([action, plan], () => {
    const a = action.value, p = plan.value
    if (a === 'enter' && p) router.replace(variantTo(dialect.value, p.form, lemma()))
    else if (a === 'lexical' && p) router.replace({ path: wordTo(p.form), query: { from: lemma() } })
  }, { immediate: true })
  // the switch changed on this page: forget this visit's choice and answer the new dialect at once
  watch(dialect, (n, o) => { if (n !== o && route.query.std !== undefined) { const o2: LocationQueryRaw = { ...route.query }; delete o2.std; router.replace({ path: route.path, query: o2 }) } })
  return { plan, noForm, dialectName, fromBack, ready, action }
}
