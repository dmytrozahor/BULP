<script setup lang="ts">
/**
 * MM-30..34: on a card whose lemma belongs to a variant family (core/variant-families.ts) — the head (між) or a member that is a card of its own (в, тілько) — the family with the role of each
 * member and its source («джерела не знайдено» when only the owner named it). Pure rendering of the shared table; no data loading.
 */
import { computed } from 'vue'
import { familyOfLemma, memberEvidence, ROLE_UK } from '../../core/variant-families.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ lemma: string }>()
const fam = computed(() => familyOfLemma(props.lemma))
const wl = (l: string) => '/w/' + encodeURIComponent(l)
</script>

<template>
  <div v-if="fam" data-testid="variant-family" class="hl-line sans small">
    <span class="badge" :title="'родина варіантів ' + fam.id + ' (' + fam.mm + ')'">родина варіантів</span>
    <RouterLink v-if="fam.head !== lemma" :to="wl(fam.head)"><strong>{{ fam.head }}</strong></RouterLink><strong v-else>{{ fam.head }}</strong>
    <span class="muted"> ← </span>
    <template v-for="(m, i) in fam.members" :key="m.form"><template v-if="i">, </template>
      <RouterLink v-if="m.form !== lemma" :to="wl(m.form)">{{ m.form }}</RouterLink><strong v-else>{{ m.form }}</strong>
      <span class="muted"> ({{ ROLE_UK[m.role] }}<template v-if="!m.cite">, джерела не знайдено</template>)</span>
      <EvidencePopover :evidence="[memberEvidence(fam, m)]" heading="Джерело варіанта" /></template>
    <div v-if="fam.feature" class="muted">ознака вимови слова «{{ fam.head }}»: {{ fam.feature.label }} <EvidencePopover :evidence="[memberEvidence({ ...fam, head: fam.head }, { form: fam.head, role: 'alt', cite: fam.feature.cite })]" heading="Діалектна ознака" /></div>
  </div>
</template>
