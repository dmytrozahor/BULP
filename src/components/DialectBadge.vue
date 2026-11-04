<script setup lang="ts">
/**
 * SPEC 63 DB-1 — the coloured dialect/region badge beside the headword of every card kind (full, light, /lw, archaic, hypothesis, form).
 * > owner 2026-11-04: «кольорову личку належності до діалекту роби на головній сторінці леми, навіть якщо це просто гіпотеза» · «і типу якимось атрибутом гарним»
 * A small heraldic element: the arms of the area in miniature when we hold authentic, freely licensed arms (fetched AFTER the first paint; the space is reserved), otherwise a plain shield
 * silhouette in the dialect's colour (no charges: it never imitates a real coat). The GRADE is in the words and in the shape (solid / outline / light / dashed), never in colour alone.
 * Data is lazy: the lm/lb shard (the labels block loads the same one); until it arrives a placeholder chip of the same size stands there.
 */
import { computed, onMounted, ref } from 'vue'
import { MAX_CHIPS, GRADE_HELP, GRADE_WORD, hueOf, type BadgeChip } from '../../core/dialect-badge.ts'
import { markByKey } from '../../core/coats.ts'
import { useBadge } from '../lib/badge.ts'
import { afterPaint, armsSrc, loadCoatIndex } from '../lib/coatsData.ts'
import { useData } from '../composables/useData.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ lemma: string; /** test hook: chips instead of the lazy data */ chipsIn?: BadgeChip[] }>()
const { chips: lazy, loading } = useBadge(() => props.lemma)
const chips = computed(() => props.chipsIn ?? lazy.value)
const { witnessById } = useData()
const witTitle = (c: BadgeChip): string => (c.witness ? witnessById.value.get(c.witness)?.title ?? c.witness : '')
const all = ref(false), painted = ref(false)
onMounted(() => afterPaint(() => { painted.value = true; loadCoatIndex() }))
const shown = computed(() => (all.value ? chips.value : chips.value.slice(0, MAX_CHIPS)))
const more = computed(() => Math.max(0, chips.value.length - MAX_CHIPS))
/** the smallest level with arms: settlement, then oblast, then region (a region's plain marker has none) */
const coatOf = (c: BadgeChip): string | undefined => {
  if (!painted.value) return undefined
  const ms = c.marks.map(k => markByKey[k]).filter(Boolean).sort((a, b) => ['settlement', 'oblast', 'region'].indexOf(a!.level) - ['settlement', 'oblast', 'region'].indexOf(b!.level))
  for (const m of ms) { const s = armsSrc(m!.coat); if (s) return s }
  return undefined
}
const vars = (c: BadgeChip) => { const h = hueOf(c.code); return { '--dl': h.light, '--dd': h.dark, '--dol': h.onLight, '--dod': h.onDark } }
const coatName = (c: BadgeChip) => { const m = c.marks.map(k => markByKey[k]).find(Boolean); return m ? `${m.name}${m.viaOblast ? ` (герб ${m.viaOblast})` : ''}` : '' }
const label = (c: BadgeChip) => `${GRADE_WORD[c.grade]}: ${c.text}`
</script>

<template>
  <span class="dbadge sans" data-testid="dialect-badge" role="group" aria-label="Діалект або регіон слова">
    <span v-if="loading && !chipsIn" class="dchip dph" data-testid="dchip-loading" aria-hidden="true"><span class="dshield" /><span class="dtxt">&nbsp;</span></span>
    <template v-else>
      <span v-for="(c, i) in shown" :key="c.text + i" :class="['dwrap', c.role ? 'r-' + c.role : '']" :data-role="c.role" :data-testid="c.role === 'main' ? 'dchip-main' : undefined">
        <EvidencePopover v-if="c.evidence.length" :evidence="c.evidence" :heading="c.text" :meta="`${GRADE_WORD[c.grade]} · ${c.basis}`" :label="label(c)">
          <span :class="['dchip', 'g-' + c.grade]" :style="vars(c)" :data-grade="c.grade" :data-testid="'dchip-' + c.grade">
            <span class="dshield" aria-hidden="true">
              <img v-if="coatOf(c)" :src="coatOf(c)" :title="coatName(c)" alt="" width="18" height="22" decoding="async" />
              <svg v-else viewBox="0 0 20 24" width="18" height="22" focusable="false"><path d="M2 2h16v10c0 5.5-4 8.5-8 10.5C6 20.5 2 17.5 2 12z" /></svg>
            </span>
            <span class="dtxt">{{ c.text }}</span>
          </span>
        </EvidencePopover>
        <span v-else :class="['dchip', 'g-' + c.grade]" :style="vars(c)" :data-grade="c.grade" :data-testid="'dchip-' + c.grade" tabindex="0" :title="c.basis" :aria-label="`${label(c)}. ${c.basis}`">
          <span class="dshield" aria-hidden="true"><svg viewBox="0 0 20 24" width="18" height="22" focusable="false"><path d="M2 2h16v10c0 5.5-4 8.5-8 10.5C6 20.5 2 17.5 2 12z" /></svg></span>
          <span class="dtxt">{{ c.text }}</span>
        </span>
        <RouterLink v-if="c.href" :to="c.href" class="dlink" :title="`пам’ятка: ${witTitle(c)}, ${c.year}`" :aria-label="`пам’ятка першої фіксації: ${witTitle(c)}, ${c.year}`" data-testid="dchip-link">{{ c.role === 'main' ? 'пам’ятка →' : '→' }}</RouterLink>
      </span>
      <button v-if="more && !all" type="button" class="dmore" data-testid="dchip-more" :aria-label="`ще ${more}`" @click="all = true">ще {{ more }}</button>
    </template>
  </span>
</template>
