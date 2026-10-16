<script setup lang="ts">
/**
 * SPEC 63 CV-4 (a) / CV-5 (a): forms offered for a spelling beyond the standard derivation. (1) dialect continuants of ѣ with their CITED rule (YT-2: нѣгдѣ → нігди, final -ѣ > -и, зап. діал.),
 * labelled «гіпотеза»; (2) forms the user proposed that no cited rule produces — «гіпотеза користувача» with author and date. A card/VESUM status is shown only when a card stands behind the form.
 */
import { computed, shallowRef } from 'vue'
import { citedFormsOf, userHypothesesOf } from '../../core/uv-hypotheses.ts'
import { useData } from '../composables/useData.ts'
import { analyzeLink } from '../lib/analyze-links.ts'
import { ixCards } from '../lib/parts.ts'
const props = defineProps<{ spellings: string[] }>()
const { byLemma, searchIdx, annData } = useData()
const ctx = () => ({ lemmas: byLemma.value, hits: searchIdx.value.map, cards: ixCards })
const status = (form: string) => { const v = annData.value.lexindex?.vesum[form.toLowerCase()]; return { l: analyzeLink(form, ctx()), vesum: v?.map(x => x.tags).slice(0, 2).join('; ') } }
const user = computed(() => userHypothesesOf(props.spellings).map(h => ({ h, ...status(h.form) })))
const cited = computed(() => citedFormsOf(props.spellings).map(c => ({ c, ...status(c.form) })))
</script>

<template>
  <section v-if="user.length || cited.length" class="card sans small" aria-label="Вивідні форми (гіпотези)" data-testid="user-hypothesis">
    <strong>Вивідні форми</strong> <span class="muted">(діалектні продовження ѣ за цитованим правилом; гіпотези, не факти про це написання)</span>
    <ul>
      <li v-for="r in cited" :key="r.c.form + r.c.rule" data-testid="cited-form">
        {{ r.c.spelling }} → <RouterLink :to="r.l.to" class="lang">{{ r.c.form }}</RouterLink> <span class="badge">гіпотеза</span>
        <span class="muted"> · {{ r.l.kind === 'word' ? 'така форма є в словнику сайту' : 'форма не підтверджена словником сайту' }}<template v-if="r.vesum"> (ВЕСУМ: {{ r.vesum }})</template></span><br>
        <span class="muted">правило {{ r.c.rule }}: {{ r.c.name }} [{{ r.c.group }}]<template v-if="r.c.cite[0]"> · {{ r.c.cite[0].locator }}: «{{ r.c.cite[0].quote }}»</template></span>
      </li>
      <li v-for="r in user" :key="r.h.form" data-testid="user-form">
        {{ r.h.spelling }} → <RouterLink :to="r.l.to" class="lang">{{ r.h.form }}</RouterLink> <span class="badge">гіпотеза користувача</span>
        <span class="muted"> · {{ r.l.kind === 'word' ? 'така форма є в словнику сайту' : 'форма не підтверджена словником сайту' }}<template v-if="r.vesum"> (ВЕСУМ: {{ r.vesum }})</template></span><br>
        <span class="muted">автор: користувач, {{ r.h.date }}: «{{ r.h.quote }}». {{ r.h.note }}.</span>
      </li>
    </ul>
  </section>
</template>
