<script setup lang="ts">
/**
 * U-24: «Як читати статистику» — what each number of the word-card sidebar means, with the formula (as on /method), the citation (STAT_CITES)
 * and this lemma's own numbers; denominators come from corpus.json. Caveats = research/06 §3.5 (biases to disclose in the UI).
 */
import { computed } from 'vue'
import { STAT_CITES } from '../../core/stats.ts'
import type { CoreCard } from '../../core/types.ts'
import { epochShort, fmtNum } from '../lib/format.ts'
import { useData } from '../composables/useData.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ card: CoreCard }>()
const { corpus } = useData()
const N = computed(() => corpus.value?.N ?? 0)
const eps = computed(() => Object.entries(corpus.value?.epochSizes ?? {}).slice(0, 4))
</script>

<template>
  <details class="small sans statexplain">
    <summary>Як читати статистику</summary>
    <dl>
      <dt>f і N</dt>
      <dd>f = {{ card.stats.f }} — скільки разів слово (усі його написання) трапилось у корпусі; N = {{ fmtNum(N) }} — розмір корпусу в словах (corpus.json). Частоти — лише «у нашому корпусі», а не в мові.</dd>
      <dt>ipm</dt>
      <dd>ipm = f / N · 10⁶ = {{ card.stats.f }} / {{ fmtNum(N) }} · 10⁶ = {{ fmtNum(card.stats.ipm, 1) }} — частота на мільйон слів, щоб порівнювати корпуси й епохи різного розміру.
        <EvidencePopover :evidence="[STAT_CITES.ipm!]" heading="ipm" label="ipm"><span class="badge">ⓘ</span></EvidencePopover></dd>
      <dt>HK і крапки</dt>
      <dd>HK = round(log₂(f<sub>max</sub> / f)): 0 — найчастіше слово корпусу, кожне наступне число — вдвічі рідше; крапки = clamp(6 − ⌊HK / 3⌋, 0, 6): чим більше, тим частіше слово.
        <EvidencePopover :evidence="[STAT_CITES.hk!, STAT_CITES.dots!]" heading="HK і крапки" label="HK"><span class="badge">ⓘ</span></EvidencePopover></dd>
      <dt>DP / рівномірність</dt>
      <dd>DP = ½ Σ |y<sub>i</sub>/AF − n<sub>i</sub>/N| (0 — слово розподілене за пам’ятками пропорційно до їхнього розміру, 1 — зібране в одній); на картці показано 1 − DP та кількість пам’яток, де слово є.
        <EvidencePopover :evidence="[STAT_CITES.dp!]" heading="DP (Gries)" label="DP"><span class="badge">ⓘ</span></EvidencePopover></dd>
      <dt>Стовпчики епох і століть</dt>
      <dd>Для кожної епохи показано ipm = f<sub>епохи</sub> / N<sub>епохи</sub> · 10⁶, де N<sub>епохи</sub> — розмір корпусу в цій епосі<template v-if="eps.length"> (напр. {{ eps.map(([e, n]) => `${epochShort(e)}: ${fmtNum(n)}`).join('; ') }})</template>. Тонка епоха дає хиткі ipm: дивіться на f.</dd>
      <dt>G² і Log Ratio</dt>
      <dd>G² = 2·(a·ln(a/E<sub>1</sub>) + b·ln(b/E<sub>2</sub>)) — чи відрізняється частота слова в двох підкорпусах (критичні значення 3,84 для p&lt;0,05; 6,63; 10,83); Log Ratio = log₂((a/c)/(b/d)) — розмір різниці (нуль у знаменнику замінюється на 0,5).
        <EvidencePopover :evidence="[STAT_CITES.g2!]" heading="G²" label="G²"><span class="badge">ⓘ</span></EvidencePopover></dd>
      <dt>logDice</dt>
      <dd>logDice = 14 + log₂(2·f<sub>xy</sub> / (f<sub>x</sub> + f<sub>y</sub>)) — сила сполучення двох слів, не залежить від розміру корпусу (максимум 14); показано сполучення з f ≥ 5 і logDice &gt; 0.
        <EvidencePopover :evidence="[STAT_CITES.logDice!]" heading="logDice" label="logDice"><span class="badge">ⓘ</span></EvidencePopover></dd>
    </dl>
    <p class="muted"><strong>Застереження (research/06 §3.5).</strong> «Перша фіксація» — перша у нашому перевіреному корпусі, а не в мові; покриття 1600–1800 рр. тонке. Словники — свідчення знань лексикографа, слабші за суцільний текст. Правописні системи впливають на зіставлення рядків (форми нормалізуються, сире написання зберігається). Корпус — добірка збережених пам’яток, а не репрезентативна вибірка.</p>
  </details>
</template>
