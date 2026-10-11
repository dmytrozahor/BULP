<script setup lang="ts">
/**
 * Keyboard-accessible evidence popover. "Never render a label without its evidence affordance." — task brief / SPEC 00 P-1.1.
 * Trigger is a real <button>; Enter/Space/click toggles, Esc closes and returns focus, click outside closes; popover is kept inside the viewport.
 */
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import type { Evidence } from '../../core/evidence.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ evidence: Evidence[]; heading?: string; meta?: string; label?: string }>()
const open = ref(false), shift = ref(0), root = ref<HTMLElement>(), pop = ref<HTMLElement>(), btn = ref<HTMLButtonElement>()
const id = useId()

const outside = (e: Event) => { if (!root.value?.contains(e.target as Node)) close() }
async function toggle() {
  open.value = !open.value
  if (!open.value) return close()
  document.addEventListener('pointerdown', outside)
  shift.value = 0; await nextTick()
  const r = pop.value?.getBoundingClientRect(); if (!r) return
  const vw = document.documentElement.clientWidth
  shift.value = r.right > vw - 8 ? vw - 8 - r.right : 0
  if (r.left + shift.value < 8) shift.value = 8 - r.left
}
function close(refocus = false) { open.value = false; document.removeEventListener('pointerdown', outside); if (refocus) btn.value?.focus() }
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <span ref="root" class="evwrap" @keydown.esc.stop="close(true)">
    <button ref="btn" type="button" class="evtrig" :aria-expanded="open" :aria-controls="id" aria-haspopup="dialog"
      :aria-label="label ? `${label}: показати докази (${props.evidence.length})` : undefined" @click="toggle"><slot /></button>
    <div v-if="open" :id="id" ref="pop" class="evpop" role="dialog" :aria-label="heading ?? 'Докази'" :style="{ transform: `translateX(${shift}px)` }">
      <div v-if="heading || meta" class="small" style="margin-bottom:.4rem"><strong v-if="heading">{{ heading }}</strong> <span v-if="meta" class="muted">{{ meta }}</span></div>
      <EvidenceList :evidence="props.evidence" />
    </div>
  </span>
</template>
