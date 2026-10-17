<script setup lang="ts">
/**
 * SPEC 63 SN-1: the senses a card's dictionary attestation lines document, each with its dating (the dictionary that first attests the sense + later sources).
 * The sense is read from the quoted article start (core/sn.ts senseOfAtts); the lines below the list carry the number of their sense.
 */
import { computed } from 'vue'
import { fmtYears } from '../../core/sn.ts'
import { attSenses, r2uByUnit as r2u } from '../lib/senseLines.ts'
import type { CvAtt } from '../../core/cv.ts'
import { useData } from '../composables/useData.ts'
const props = defineProps<{ word: string; atts: CvAtt[] }>()
const { witnessById } = useData()
const res = computed(() => attSenses(props.word, props.atts, w => witnessById.value.get(w)?.date))
const title = (w: string) => witnessById.value.get(w)?.title ?? r2u.get(w)?.short ?? w
</script>

<template>
  <section v-if="res.senses.length" class="att-senses sans small" data-testid="att-senses">
    <h2>Значення за словниками</h2>
    <ol>
      <li v-for="(s, i) in res.senses" :key="i" :value="i + 1">
        <b>{{ s.gloss }}</b>
        <template v-if="s.first"> · найраніше: {{ fmtYears(s.first) }} <span class="muted">({{ title(s.first.w) }})</span></template>
        <span v-else class="muted"> · без дати</span>
        <template v-if="s.later.length"> · пізніше: <span v-for="(l, j) in s.later" :key="j">{{ j ? '; ' : '' }}{{ fmtYears(l) }} <span class="muted">({{ title(l.w) }})</span></span></template>
      </li>
    </ol>
  </section>
</template>
