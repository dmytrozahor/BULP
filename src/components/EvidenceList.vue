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
import { evidenceTo } from '../lib/nav.ts'
const { sourceTitle, sourceUrl, witnessById } = useData()
</script>

<template>
  <div class="evlist">
    <div v-for="(e, i) in evidence" :key="i" class="ev">
      <span :class="['kind', 'kind-' + e.kind]" :title="KIND_LONG[e.kind]">{{ e.kind }} {{ KIND_UK[e.kind] }}</span>
      <RouterLink :to="evidenceTo(e.source, e.locator, witnessById.has(e.source))"><strong>{{ sourceTitle(e.source) }}</strong></RouterLink>
      <small v-if="SOURCES[e.source]?.license" class="muted"> · {{ SOURCES[e.source]!.license }}</small>
      <div class="small"><span class="muted">локатор: </span>
        <RouterLink v-if="witnessById.has(e.source)" :to="evidenceTo(e.source, e.locator, true)">{{ e.locator }}</RouterLink><span v-else>{{ e.locator }}</span>
        <template v-if="locatorUrl(e.locator) ?? sourceUrl(e.source)"> · <a :href="locatorUrl(e.locator) ?? sourceUrl(e.source)" target="_blank" rel="noopener" class="srclink">оригінал ↗</a></template></div>
      <blockquote>{{ e.quote }}</blockquote>
      <div v-if="e.note" class="small muted">{{ e.note }}</div>
    </div>
    <div v-if="!evidence.length" class="muted small">Немає доказів.</div>
  </div>
</template>
