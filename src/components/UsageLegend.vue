<script setup lang="ts">
/** UL-1 annotator legend: the usage labels grouped by axis, with the definition that was fetched and quoted (or an honest «означення не перевірено»), and where the labels come from. */
import { AXIS_UK, USAGE_LABELS, type UsageAxis } from '../../core/usage.ts'
import { loadUsage, usageFile } from '../lib/usageData.ts'
import EvidencePopover from './EvidencePopover.vue'
loadUsage()
const axes = Object.keys(AXIS_UK) as UsageAxis[]
</script>

<template>
  <details class="usage-legend sans small">
    <summary>Мітки вжитку (чипи біля слів)</summary>
    <ul style="list-style:none;padding:0;margin:.4rem 0">
      <li v-for="a in axes" :key="a"><strong>{{ AXIS_UK[a] }}: </strong>
        <template v-for="l in USAGE_LABELS.filter(x => x.axis === a)" :key="l.id">
          <EvidencePopover v-if="l.def" :evidence="[l.def]" :heading="l.uk" :label="l.uk"><span :class="['badge', 'usage-' + a]">{{ l.uk }}<i class="evmark" aria-hidden="true">ⓘ</i></span></EvidencePopover>
          <span v-else :class="['badge', 'usage-' + a]" title="означення не перевірено">{{ l.uk }}</span>{{ ' ' }}
        </template></li>
    </ul>
    <p class="muted" style="margin:0">Джерела: позначки ВЕСУМ (slang, arch, vulg, obsc; CC BY-NC-SA 4.0) і категорії Вікісловника uk.wiktionary
      <template v-if="usageFile">(отримано {{ usageFile.wikt.retrieved }}, CC BY-SA 4.0)</template>. Мітка стосується статті-леми, а не окремого значення.
      Бракує джерела для міток «діаспорне», «феня», «вечірнє»; без позначки в словнику мітки немає (P-3.1). Означення без цитати — «не перевірено».</p>
  </details>
</template>
