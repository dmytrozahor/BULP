<script setup lang="ts">
/**
 * SPEC 63 DB-1 — the marker layer of the region map (a <g> inside RegionMap's <svg>): where the lemma is said to come from, at the smallest level the evidence supports.
 * > owner 2026-11-04: «на мапі позначай це гербом області / міста / регіону з якого лема буцімто походить»
 * Same chips as the badge beside the headword (src/lib/badge.ts). Authentic arms (core/coats.ts, a SOURCES row with a free licence) are drawn in a ring; a region without arms gets a plain
 * labelled marker in the dialect's colour. A hypothesis has a DASHED ring and «гіпотеза» in its tooltip. Arms files are fetched per marker, only when this layer is on the page.
 */
import { computed, onMounted, ref } from 'vue'
import { hueOf, GRADE_WORD, type BadgeChip } from '../../core/dialect-badge.ts'
import { markByKey, type MarkArea } from '../../core/coats.ts'
import { projectLL } from '../lib/geo.ts'
import { useBadge } from '../lib/badge.ts'
import { afterPaint, armsSrc, loadCoatIndex } from '../lib/coatsData.ts'
const props = defineProps<{ lemma: string; /** test hook */ chipsIn?: BadgeChip[] }>()
const { chips: lazy } = useBadge(() => props.lemma)
const painted = ref(false)
onMounted(() => afterPaint(() => { painted.value = true; loadCoatIndex() }))
export interface Marker { primary: boolean; r: number; key: string; x: number; y: number; area: MarkArea; chip: BadgeChip; src?: string; hyp: boolean; tip: string; hue: ReturnType<typeof hueOf> }
const markers = computed<Marker[]>(() => {
  const out: Marker[] = [], seen = new Set<string>()
  for (const chip of (props.chipsIn ?? lazy.value).slice(0, 3)) for (const k of chip.marks) {
    const area = markByKey[k]; if (!area || seen.has(k)) continue; seen.add(k)
    const { x, y } = projectLL(...area.anchor), src = painted.value ? armsSrc(area.coat) : undefined
    const level = { settlement: 'місто', oblast: 'область', region: 'історичний регіон' }[area.level]
    const tip = `${chip.role === 'main' ? 'головна: ' : ''}${chip.grade === 'hyp' ? 'гіпотеза: ' : ''}${area.name} (${level}) — ${chip.text}${src && area.viaOblast ? `; герб ${area.viaOblast}` : ''}${src ? '' : '; герба немає, простий позначник'} · ${GRADE_WORD[chip.grade]}`
    out.push({ primary: chip.role === 'main', r: chip.role === 'main' ? 13 : 9, key: k, x, y, area, chip, ...(src ? { src } : {}), hyp: chip.grade === 'hyp', tip, hue: hueOf(chip.code ?? area.code) })
  }
  return out
})
defineExpose({ markers })
</script>

<template>
  <g class="arms-layer" data-testid="arms-layer">
    <g v-for="m in markers" :key="m.key" class="arms-mark" :data-level="m.area.level" :data-grade="m.chip.grade" :data-primary="m.primary ? '1' : '0'" :data-coat="m.src ? '1' : '0'" :data-testid="'arms-' + m.key" tabindex="0" role="img" :aria-label="m.tip"
      :style="{ '--dl': m.hue.light, '--dd': m.hue.dark }">
      <title>{{ m.tip }}</title>
      <circle class="am-ring" :class="{ 'am-hyp': m.hyp }" :cx="m.x" :cy="m.y" :r="m.r + 2" />
      <image v-if="m.src" :href="m.src" :x="m.x - m.r * 0.8" :y="m.y - m.r" :width="m.r * 1.6" :height="m.r * 2" preserveAspectRatio="xMidYMid meet" />
      <path v-else class="am-plain" :d="`M${m.x - 7} ${m.y - 8}h14v8c0 4.5-3.5 7-7 8.500c-3.5-1.5-7-4-7-8.500z`" />
    </g>
  </g>
</template>
