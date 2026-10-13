<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/**
 * «Будова» block (SPEC 60 DX-3): segmentation of a reinforced deictic (core/deictics.ts, research/24). An attested form (озьдо = о + сьде + о «ось тут»)
 * is a claim with the dictionary quote; an unattested compound (отуточки, онтамека, осьтамека) is a reconstruction — dashed, «реконструкція» badge,
 * built from cited parts (P-1.7), never a dictionary form. Each part has its own evidence popover. Renders nothing when the word does not parse (P-3.1).
 */
import { computed } from 'vue'
import { DX_KIND_UK, segment } from '../../core/deictics.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ word: string; bare?: boolean }>()
const segs = computed(() => segment(props.word))
</script>

<template>
  <div v-if="segs.length" :class="bare ? 'dx' : 'card'" aria-label="Будова">
    <h2 v-if="!bare"><span>Будова</span><span class="small">вказівні прислівники з підсиленням</span></h2>
    <div v-else class="small muted sans">Будова</div>
    <div v-for="s in segs" :key="s.parts.map(p => p.text).join('+')" class="sans" style="margin:.4rem 0">
      <div>
        <strong :class="['lang', s.status === 'attested' ? 'attested' : 'derived', { old: isOldForm(s.form) }]" style="font-family:var(--serif);font-size:1.1rem">{{ s.form }}</strong>
        <span v-if="s.status === 'reconstruction'" class="derived-badge">реконструкція (гіпотеза)</span>
        <span v-else class="attested-badge">✓ засвідчено</span>
        <span class="muted small"> · «{{ s.reading }}»<template v-if="s.standard"> · стандартний відповідник: {{ s.standard }}</template>
          <template v-if="s.regions.length"> · {{ s.regions.join(', ') }}</template></span>
        <EvidencePopover :evidence="s.claim.evidence" :heading="`Будова: ${s.form}`" :meta="s.claim.method ? 'метод: деривація (не словникова форма)' : 'словникові докази'" :label="s.form"><span class="badge">ⓘ докази</span></EvidencePopover>
      </div>
      <div style="margin:.25rem 0">
        <template v-for="(p, i) in s.parts" :key="i"><span v-if="i" class="muted"> + </span>
          <EvidencePopover :evidence="[p.cite]" :heading="`${p.label} — ${DX_KIND_UK[p.kind]}`" :label="p.text">
            <span :class="['badge', p.role === 'base' ? '' : 'dialect']" :title="p.note"><strong style="font-family:var(--serif)">{{ p.text }}</strong>
              <small class="muted">{{ p.role === 'prefix' ? 'префікс' : p.role === 'base' ? 'основа' : 'суфікс' }} · {{ p.meaning }}</small></span>
          </EvidencePopover></template>
      </div>
      <p v-if="s.note" class="small muted" style="margin:.2rem 0">{{ s.note }}</p>
      <p v-if="s.status === 'reconstruction'" class="small muted" style="margin:.2rem 0">Не засвідчено в жодному з прочитаних джерел: складено за зразком
        <template v-for="(x, i) in s.support" :key="x.part"><template v-if="x.attestedIn.length"><template v-if="i">; </template>«{{ x.text }}» ← {{ x.attestedIn.slice(0, 3).join(', ') }}</template></template>.
        <template v-if="!s.fullySupported"> Частина компонентів не має засвідченого прикладу.</template></p>
    </div>
  </div>
</template>
