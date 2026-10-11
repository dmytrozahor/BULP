<script setup lang="ts">
/** SPEC 10 M-1: witness manifest table — author + vetting (P-2.1) with evidence, date + dateCite, both epoch schemes, tokens N, linked %. */
import type { WitnessMeta } from '../../core/types.ts'
import { isKnown } from '../../core/evidence.ts'
import { epochShort, fmtDate, fmtNum, LANG_UK, WTYPE_UK } from '../lib/format.ts'
import AuthorBadge from './AuthorBadge.vue'
import ClaimBadge from './ClaimBadge.vue'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ witnesses: WitnessMeta[] }>()
const ep = (c: WitnessMeta['epochShev']) => (isKnown(c) ? c.value.epochs.map(epochShort).join(' / ') + (c.value.confidence !== 'high' ? ` (${c.value.confidence})` : '') : 'невідомо')
</script>

<template>
  <div class="tablewrap"><table>
    <thead><tr><th>Пам’ятка</th><th>Автор</th><th>Дата</th><th>Епоха (Шевельов)</th><th>Епоха (WL)</th><th class="num">N слів</th><th class="num">Прив’язано</th></tr></thead>
    <tbody>
      <tr v-for="w in witnesses" :key="w.id">
        <td><a :href="w.url" target="_blank" rel="noopener">{{ w.title }}</a><div class="small muted">{{ LANG_UK[w.lang] }} · {{ WTYPE_UK[w.witnessType] ?? w.witnessType }}<template v-if="w.msDate"> · список {{ w.msDate }}</template></div></td>
        <td><AuthorBadge :author="w.author" :witness="w.id" /></td>
        <td style="white-space:nowrap"><EvidencePopover :evidence="[w.dateCite]" :heading="`Датування: ${fmtDate(w.date)}`" label="датування">{{ fmtDate(w.date) }} <span class="badge">ⓘ</span></EvidencePopover></td>
        <td><ClaimBadge :claim="w.epochShev" :text="ep(w.epochShev)" /></td>
        <td><ClaimBadge :claim="w.epochWl" :text="ep(w.epochWl)" /></td>
        <td class="num">{{ fmtNum(w.n) }}</td>
        <td class="num">{{ fmtNum((w.linked / w.n) * 100, 1) }}%<div class="small muted">{{ fmtNum(w.linked) }}</div></td>
      </tr>
    </tbody>
  </table></div>
</template>
