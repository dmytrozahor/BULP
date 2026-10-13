<script setup lang="ts">
/**
 * BL-9 «Значення»: senses of the lemma from uk.wiktionary (CC BY-SA 4.0), grouped by stressed spelling where the page gives one (homonyms with different stress: го́род / горо́д).
 * A sense with no stress on the page is shown in the group «без наголосу в джерелі»; nothing is guessed (P-1.7). Attribution + revision permalink under the list.
 */
import { computed } from 'vue'
import { senseRevision } from '../../core/senses.ts'
import { groupByStress, SENSES_LICENCE, sensesOf, wiktUrl } from '../lib/sensesData.ts'
const props = defineProps<{ lemma: string }>()
const rows = computed(() => sensesOf(props.lemma))
const groups = computed(() => groupByStress(rows.value))
const rev = computed(() => (rows.value[0] ? senseRevision(rows.value[0]) : undefined))
</script>

<template>
  <div class="senses sans">
    <template v-for="g in groups" :key="g.stress">
      <p v-if="groups.length > 1 || g.stress" class="small" style="margin:.5rem 0 .1rem"><strong v-if="g.stress" style="font-family:var(--serif);font-size:1.1rem">{{ g.stress }}</strong><span v-else class="muted">без наголосу в джерелі</span></p>
      <ol style="margin:.2rem 0 .4rem 1.2rem;padding:0">
        <li v-for="(s, i) in g.senses" :key="i" style="margin:.15rem 0">
          <span v-if="s.pos" class="small muted">{{ s.pos }} · </span>{{ s.gloss }}
        </li>
      </ol>
    </template>
    <p class="small muted">Джерело: <RouterLink to="/source/WIKTUK">Вікісловник</RouterLink>, {{ SENSES_LICENCE }}; <a :href="wiktUrl(lemma, rev)" target="_blank" rel="noopener">оригінал: стаття «{{ lemma }}»<template v-if="rev">, ред. {{ rev }}</template> ↗</a>.
      Скорочено; значення з розділу «Значення» без прикладів і міток.</p>
  </div>
</template>
