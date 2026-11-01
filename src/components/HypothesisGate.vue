<script setup lang="ts">
/**
 * SPEC 63 CP-11 — /w/<word> without an entry: (1) the word has a real light / dictionary / archaic card → go there (an attested singular is a real page, not a hypothesis);
 * (2) a rule derives it from a real word → the hypothesis card; (3) otherwise the old «немає в корпусі» fallback (default slot). The hypothesis card keeps the rule-based analysis below it (slot `analysis`).
 */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { buildHypothesis, browserDeps, type Hypothesis } from '../lib/hypothesis.ts'
import HypothesisCard from './HypothesisCard.vue'
const props = defineProps<{ word: string }>()
const router = useRouter()
const hyp = ref<Hypothesis>(), state = ref<'loading' | 'done'>('loading')
watch(() => props.word, async w => {
  state.value = 'loading'; hyp.value = undefined
  try {
    const real = await browserDeps.resolve(w)
    if (real && real.to !== `/w/${encodeURIComponent(w)}`) { router.replace(real.to); return }
    const h = real ? undefined : await buildHypothesis(w)
    if (w === props.word) hyp.value = h
  } catch { /* the fallback below stays honest */ }
  if (w === props.word) state.value = 'done'
}, { immediate: true })
</script>

<template>
  <div v-if="state === 'loading'" class="skeleton" style="height:4rem" />
  <template v-else-if="hyp"><HypothesisCard :hyp="hyp" /><slot name="analysis" /></template>
  <template v-else><slot /><slot name="analysis" /></template>
</template>
