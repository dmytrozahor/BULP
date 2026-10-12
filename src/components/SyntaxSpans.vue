<script setup lang="ts">
/**
 * SPEC 60 SX-4: claim card(s) of multi-token spans (core/syntax.ts). A sourced row shows a ClaimBadge (evidence popover: ЕУМ um159 Q cite +
 * the matched text); a weight-0 row shows «без джерела» and no label (P-1.3, P-3.1). Undated rows say so explicitly.
 */
import { DIALECTS } from '../../core/rules.ts'
import type { SyntaxSpan } from '../../core/syntax.ts'
import ClaimBadge from './ClaimBadge.vue'
defineProps<{ spans: SyntaxSpan[] }>()
const LABEL_UK: Record<string, string> = { native_enclitic: 'питомий енклітик' }
</script>

<template>
  <ul class="syn-list sans small">
    <li v-for="s in spans" :key="s.id + s.start">
      <strong class="serif">{{ s.text }}</strong> → <span>{{ s.modern }}</span>
      <template v-if="s.claim">
        <ClaimBadge :claim="s.claim" :text="(s.label && LABEL_UK[s.label]) || (s.dialect && DIALECTS[s.dialect]) || s.id" tone="dialect" />
      </template>
      <span v-else class="unk" title="правило без опублікованого джерела: лише гіпотеза для перевірки (P-1.3)">без джерела · гіпотеза</span>
      <div class="muted">{{ s.note }} · <code>{{ s.id }}</code> · {{ s.dating }}</div>
    </li>
  </ul>
</template>
