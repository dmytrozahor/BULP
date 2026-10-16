<script setup lang="ts">
/** BL-16 /author/:id — vetting record of an author (SPEC 00 P-2): period label, status, life, self-identification evidence, and every witness by this author. */
import { computed } from 'vue'
import { authorInfo, useData } from '../composables/useData.ts'
import { AUTHOR_LABEL_UK, fmtDate, STATUS_UK } from '../lib/format.ts'
import { witnessTo } from '../lib/nav.ts'
import EvidenceList from '../components/EvidenceList.vue'
const props = defineProps<{ id: string }>()
const { loaded, corpus, ensureCorpus } = useData()
ensureCorpus()
const a = computed(() => authorInfo(props.id))
const works = computed(() => (corpus.value?.witnesses ?? []).filter(w => w.author === props.id || w.author === a.value.id))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← усі пам’ятки</RouterLink></p>
  <div v-if="!loaded" class="skeleton" style="height:5rem" />
  <template v-else>
    <h1>{{ a.name }}</h1>
    <p class="sans small">
      <span v-if="a.label" class="authlabel">{{ AUTHOR_LABEL_UK[a.label] }}</span>
      <template v-if="a.status"> · {{ STATUS_UK[a.status] ?? a.status }}</template>
      <template v-if="a.life"> · {{ a.life }}</template>
      <span v-if="!a.known" class="muted"> · запису про автора немає: значення не встановлено (P-3.1)</span>
    </p>
    <h2>Самоідентифікація (P-2.1)</h2>
    <EvidenceList :evidence="a.evidence" />
    <h2>Пам’ятки автора ({{ works.length }})</h2>
    <ul class="sans small">
      <li v-for="w in works" :key="w.id"><RouterLink :to="witnessTo(w.id)">{{ w.title }}</RouterLink> · {{ fmtDate(w.date) }}</li>
    </ul>
    <p v-if="!works.length" class="muted small sans">У корпусі немає пам’яток цього автора.</p>
  </template>
</template>
