<script setup lang="ts">
/**
 * SPEC 30 D-4.1: three visual classes, shape + text (colour is never the only signal, D-4.2).
 *  attested  — solid, upright;  derived — dashed outline, italic, badge «реконструкція (гіпотеза)»;
 *  confirmed — dashed + «✓ підтверджено пам’яткою» linking to the lemma's KWIC.
 */
defineProps<{ kind: 'attested' | 'derived' | 'confirmed'; form: string; lemma?: string; label?: string }>()
</script>

<template>
  <span class="fbadge">
    <strong :class="['lang', kind === 'attested' ? 'attested' : 'derived', { confirmed: kind === 'confirmed' }]" style="font-size:1.2rem">{{ form }}</strong>
    <span v-if="kind === 'derived'" class="derived-badge">{{ label ?? 'реконструкція (гіпотеза)' }}</span>
    <RouterLink v-else-if="kind === 'confirmed' && lemma" class="derived-badge ok" :to="`/w/${encodeURIComponent(lemma)}`">✓ підтверджено пам’яткою</RouterLink>
    <span v-else-if="kind === 'confirmed'" class="derived-badge ok">✓ підтверджено пам’яткою</span>
    <span v-else-if="label" class="attested-badge">{{ label }}</span>
  </span>
</template>
