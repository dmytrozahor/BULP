<script setup lang="ts">
/** SPEC 63 CR-1: loads the lm/cg shard of the lemma (lazy, never in the first load) and the «Говір» switch, and mounts CorrView; renders nothing for a word without a group. */
import { computed } from 'vue'
import { corrOf } from '../lib/corrData.ts'
import { dialect } from '../lib/views.ts'
import CorrView from './CorrView.vue'
const props = defineProps<{ lemma: string }>()
const groups = computed(() => corrOf(props.lemma) ?? [])
</script>

<template>
  <CorrView v-if="groups.length" :lemma="lemma" :groups="groups" :dialect="dialect" />
</template>
