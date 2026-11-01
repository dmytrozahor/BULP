<script setup lang="ts">
/** SPEC 63 CP-11c — the second badge / note of a reconstructed form: an old-declension reconstruction (дверь: давня і-основа, *dvьrь) and/or a coincidence with a Russian spelling (not a russism). */
import type { Notes } from '../lib/hypothesis.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ notes?: Notes }>()
</script>

<template>
  <span v-if="notes" class="hyp-notes" data-testid="hyp-notes">
    <span v-if="notes.archaic" class="badge archaic" data-testid="hyp-archaic" :title="notes.archaic.uk">давня форма
      <EvidencePopover :evidence="[notes.archaic.cite]" heading="Давня відміна" label="джерело позначки"><span class="evmark">ⓘ P</span></EvidencePopover></span>
    <span v-if="notes.archaic" class="small sans muted"> {{ notes.archaic.uk }}; {{ notes.archaic.stem }}<template v-if="notes.archaic.proto">, {{ notes.archaic.proto }}</template>.</span>
    <span v-if="notes.ru" class="badge" data-testid="hyp-ru" title="Російські заголовні слова: словники ru→uk (lm/ru)">{{ notes.ru }}</span>
  </span>
</template>
