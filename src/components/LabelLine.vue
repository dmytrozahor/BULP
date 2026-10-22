<script setup lang="ts">
/**
 * SPEC 63 LB-5: the one-line «Мітки» of the Огляд tab — dialect class · register · type, each with a «як визначено» tooltip; the block in «Значення» carries the evidence.
 * Never an empty field: «недостатньо даних …» / «нейтральне (немає позначок у словниках)» are values with their reason.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLabels } from '../lib/labelsData.ts'
import { useData } from '../composables/useData.ts'
import { openPanel } from '../lib/cardTabs.ts'
import { dialectHeadline, dialectHow, METHODS_PATH, NEUTRAL, regTitle, regViews, typeBase } from '../lib/labelsText.ts'
import { classUk } from '../../core/labels.ts'
import type { LemmaCard } from '../../core/types.ts'
const props = defineProps<{ lemma: string; byRegion?: LemmaCard['stats']['byRegion']; /** DOM id of the Labels panel to open */ panel?: string }>()
const { entry, loading } = useLabels(() => props.lemma, () => props.byRegion)
const { corpus } = useData()
const regionName = (code: string) => corpus.value?.regions?.find(r => r.code === code)?.name ?? code
const d = computed(() => entry.value.d)
const regs = computed(() => regViews(entry.value.r))
</script>

<template>
  <p class="small sans ov-labels" data-testid="ov-labels">
    <span class="muted">Діалект: </span><span class="badge" tabindex="0" :title="dialectHow(d)">{{ classUk(d) }}</span>
    <span class="small"> {{ dialectHeadline(d, regionName) }}</span>
    <span class="muted"> · Регістр: </span>
    <template v-if="regs.length"><span v-for="v in regs.slice(0, 4)" :key="v.id" class="badge" tabindex="0" :title="regTitle(v)">{{ v.abbr }}</span></template>
    <span v-else class="badge" tabindex="0" title="Позначок вжитку не знайдено в перелічених словниках (відкрийте «Мітки», щоб побачити перевірені джерела).">{{ NEUTRAL }}</span>
    <span class="muted"> · Тип: </span>{{ typeBase(entry) }}
    <span v-if="loading && !byRegion" class="muted"> · завантаження…</span>
    <button v-if="panel" type="button" class="chip small" @click="openPanel(panel)">докази →</button>
    <RouterLink :to="METHODS_PATH" class="small" title="Як визначаються мітки">як визначено</RouterLink>
  </p>
</template>
