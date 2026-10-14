<script setup lang="ts">
/** SL-4 badges «пластова лексика» · «жаргон» · «англіцизм» · «абревіатура»: computed from ingested claims; each opens the evidence popover whose source links to its /source card (BL-16). */
import { computed } from 'vue'
import { DIALECT_UNKNOWN } from '../../core/sociolect.ts'
import { dialectOf, literaryOf, socBadgesOf } from '../lib/sociolectData.ts'
import ClaimBadge from './ClaimBadge.vue'
const props = defineProps<{ word: string }>()
const dia = computed(() => dialectOf(props.word))
const items = computed(() => socBadgesOf(props.word)), lit = computed(() => literaryOf(props.word))
</script>

<template>
  <span v-if="items.length || dia.length" class="usage-chips socio-badges">
    <ClaimBadge v-for="b in items" :key="b.id" :claim="b.claim" :text="b.text" :tone="'usage usage-sociolect socio-' + b.id" />
    <ClaimBadge v-for="d in dia" :key="d.text" :claim="d.claim" :text="d.text" tone="usage usage-territorial" />
    <span v-if="!dia.length && items.some(b => b.id === 'plast')" class="muted small" data-testid="socio-dialect">{{ DIALECT_UNKNOWN }}</span>
    <span v-if="lit" class="muted small" data-testid="socio-literary">ВЕСУМ: {{ lit.status === 'present' ? 'є в літературній мові (' + lit.tags + ')' : 'немає' }}</span>
  </span>
</template>
