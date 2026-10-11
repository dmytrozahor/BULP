<script setup lang="ts">
/**
 * SPEC 00 P-1.2: "An Evidence always has source (registry id), quote (verbatim, ≤ 300 chars) and locator … kind: Q / P (displayed with a
 * 'paraphrase' badge) / D". Lists each Evidence: kind badge, source title (SOURCES or witness), locator (link if URL), blockquote.
 */
import type { Evidence } from '../../core/evidence.ts'
import { SOURCES } from '../../core/sources.ts'
import { useData } from '../composables/useData.ts'
import { KIND_LONG, KIND_UK, locatorUrl } from '../lib/format.ts'
defineProps<{ evidence: Evidence[] }>()
const { sourceTitle, sourceUrl } = useData()
</script>

<template>
  <div class="evlist">
    <div v-for="(e, i) in evidence" :key="i" class="ev">
      <span :class="['kind', 'kind-' + e.kind]" :title="KIND_LONG[e.kind]">{{ e.kind }} {{ KIND_UK[e.kind] }}</span>
      <a v-if="sourceUrl(e.source)" :href="sourceUrl(e.source)" target="_blank" rel="noopener"><strong>{{ sourceTitle(e.source) }}</strong></a>
      <strong v-else>{{ sourceTitle(e.source) }}</strong>
      <small v-if="SOURCES[e.source]?.license" class="muted"> · {{ SOURCES[e.source]!.license }}</small>
      <div class="small"><span class="muted">локатор: </span>
        <a v-if="locatorUrl(e.locator)" :href="locatorUrl(e.locator)" target="_blank" rel="noopener">{{ e.locator }}</a><span v-else>{{ e.locator }}</span></div>
      <blockquote>{{ e.quote }}</blockquote>
      <div v-if="e.note" class="small muted">{{ e.note }}</div>
    </div>
    <div v-if="!evidence.length" class="muted small">Немає доказів.</div>
  </div>
</template>
