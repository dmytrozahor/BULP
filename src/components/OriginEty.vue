<script setup lang="ts">
/** SPEC 63 OV-13: one-line etymology summary for the «Огляд» tab (dictionary statement, attributed; the full block is «Етимологія» in «Історія»). One honest line when there is none. */
import { onMounted, ref, watch } from 'vue'
import { etymologyOf } from '../lib/etymologyData.ts'
import { clipWords } from '../lib/format.ts'
import type { Etymology } from '../../core/etymology.ts'
const props = defineProps<{ lemma?: string }>()
const entry = ref<Etymology>(), done = ref(false)
const load = () => { done.value = false; entry.value = undefined; if (!props.lemma) { done.value = true; return } etymologyOf(props.lemma).then(r => { entry.value = r.entry; done.value = true }) }
onMounted(load); watch(() => props.lemma, load)
</script>

<template>
  <p class="small sans" data-testid="ov-ety">
    <span class="muted">Етимологія: </span>
    <template v-if="entry"><span lang="en">{{ clipWords(entry.text ?? entry.chain?.[0]?.text ?? 'є запис у словниках', 160) }}</span> <span class="muted">(словники, не гіпотеза проєкту)</span></template>
    <span v-else-if="done" class="muted">у зібраних словниках етимології цього слова немає</span>
    <span v-else class="muted">завантаження…</span>
  </p>
</template>
