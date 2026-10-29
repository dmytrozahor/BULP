<script setup lang="ts">
/**
 * SPEC 63 GG-18 «за посиланням словника»: a headword that a dictionary only points elsewhere from («СЛИНУТИ — див. ЛИНУТИ», «Док. до X», «Те саме, що X») shows the pointer with
 * dictionary + volume/page, linked to the target card, and — clearly labelled as the TARGET's data, never as the senses of this word — the target's «Значення за епохами» and «Мітки».
 * Lazy: this component and the lm/xr shard are loaded only when a card renders it (OverviewTab / ORV card), so the first load of a card does not grow. `rows` replaces the fetch (tests, ORV card).
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { dictById } from '../../core/se.ts'
import { locUk, ptrWording } from '../../core/xref.ts'
import { xrOf, type XrRow } from '../lib/xrData.ts'
import { wordTo } from '../lib/nav.ts'
import SenseEpochs from './SenseEpochs.vue'
import LabelLine from './LabelLine.vue'
const props = defineProps<{ word: string; rows?: XrRow[]; kind?: string }>()
const list = computed(() => props.rows ?? xrOf(props.word) ?? [])
const dictName = (d: string) => dictById(d)?.short ?? d
const loc = locUk
const targets = computed(() => [...new Set(list.value.map(p => p.t))].slice(0, 3))
</script>

<template>
  <div v-if="list.length" class="xr sans small" :data-testid="`xref-${kind ?? 'card'}`">
    <p v-for="p in list" :key="p.d + p.t + p.k + (p.r ?? '')" class="xr-ptr" data-testid="xref-ptr">
      <span class="muted">за посиланням словника: </span>{{ ptrWording(p) }} <RouterLink :to="wordTo(p.t)"><strong>{{ p.t }}</strong></RouterLink>
      <span class="muted"> ({{ dictName(p.d) }}<template v-if="p.l">, {{ loc(p.l) }}</template>)</span>
      <span v-if="p.a" class="badge" data-testid="xref-aspect" title="вид, названий словником (док. — доконаний, недок. — недоконаний)">{{ p.a === 'док' ? 'доконаний' : 'недоконаний' }}</span>
    </p>
    <p class="muted xr-note">Словник відсилає до іншої статті: власних значень цього слова в ньому немає. Нижче — дані слова-цілі, не значення цього слова.</p>
    <section v-for="t in targets" :key="t" class="xr-target" data-testid="xref-target">
      <h4 class="small">Дані слова «<RouterLink :to="wordTo(t)">{{ t }}</RouterLink>» <span class="muted">(за посиланням словника, не значення слова «{{ word }}»)</span></h4>
      <SenseEpochs :word="t" kind="full" compact />
      <LabelLine :lemma="t" />
    </section>
  </div>

</template>
