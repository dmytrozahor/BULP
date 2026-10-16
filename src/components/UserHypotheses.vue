<script setup lang="ts">
/** SPEC 63 CV-4 (a): a form the user proposed for a spelling — labelled «гіпотеза користувача» (author, date, quote); a card/VESUM status is shown only when a card stands behind the form. */
import { computed, shallowRef } from 'vue'
import { cardMap } from '../../core/cv.ts'
import { userHypothesesOf } from '../../core/uv-hypotheses.ts'
import { useData } from '../composables/useData.ts'
import { analyzeLink } from '../lib/analyze-links.ts'
import { loadCardIndex } from '../lib/cardIndex.ts'
const props = defineProps<{ spellings: string[] }>()
const { byLemma, searchIdx, annData } = useData()
const cards = shallowRef<Map<string, { kind: 'lw' | 'ar'; id: string }[]>>()
loadCardIndex().then(ci => { cards.value = cardMap(ci) }, () => undefined)
const rows = computed(() => userHypothesesOf(props.spellings).map(h => {
  const l = analyzeLink(h.form, { lemmas: byLemma.value, hits: searchIdx.value.map, cards: cards.value })
  const v = annData.value.lexindex?.vesum[h.form.toLowerCase()]
  return { h, l, vesum: v?.map(x => x.tags).slice(0, 2).join('; ') }
}))
</script>

<template>
  <section v-if="rows.length" class="card sans small" aria-label="Гіпотеза користувача" data-testid="user-hypothesis">
    <strong>Вивідна форма</strong> <span class="badge">гіпотеза користувача</span>
    <ul>
      <li v-for="r in rows" :key="r.h.form">
        {{ r.h.spelling }} → <RouterLink :to="r.l.to" class="lang">{{ r.h.form }}</RouterLink>
        <span class="muted"> · {{ r.l.kind === 'word' ? 'така форма є в словнику сайту' : 'форма не підтверджена словником сайту' }}<template v-if="r.vesum"> (ВЕСУМ: {{ r.vesum }})</template></span><br>
        <span class="muted">автор: користувач, {{ r.h.date }}: «{{ r.h.quote }}». {{ r.h.note }}.</span>
      </li>
    </ul>
  </section>
</template>
