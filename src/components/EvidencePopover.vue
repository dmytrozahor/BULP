<script setup lang="ts">
/**
 * Keyboard-accessible evidence popover. "Never render a label without its evidence affordance." — task brief / SPEC 00 P-1.1.
 * Trigger is a real <button>; Enter/Space/click toggles, Esc closes and returns focus, click/tap outside closes, a visible ✕ button closes.
 * W2-3: the popover is position:fixed and placed by placePopover() — flips above the trigger when there is no room below, shifts into the viewport,
 * scrolls inside when taller than the free space, never covers its own trigger, and follows scroll/resize while open.
 */
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import type { Evidence } from '../../core/evidence.ts'
import { placePopover } from '../lib/place.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ evidence: Evidence[]; heading?: string; meta?: string; label?: string }>()
const open = ref(false), root = ref<HTMLElement>(), pop = ref<HTMLElement>(), btn = ref<HTMLButtonElement>()
const pos = ref<{ top: number; left: number; maxHeight: number; side: string }>({ top: 0, left: 0, maxHeight: 0, side: 'below' })
const id = useId()

const outside = (e: Event) => { if (!root.value?.contains(e.target as Node)) close() }
function place() {
  const t = btn.value?.getBoundingClientRect(), p = pop.value; if (!t || !p) return
  p.style.maxHeight = 'none'                                   // measure the natural height first
  const r = p.getBoundingClientRect()
  pos.value = placePopover(t, { w: r.width, h: r.height }, { w: document.documentElement.clientWidth, h: window.innerHeight })
  p.style.maxHeight = ''
}
async function toggle() {
  if (open.value) return close()
  open.value = true
  document.addEventListener('pointerdown', outside)
  window.addEventListener('scroll', place, true); window.addEventListener('resize', place)
  await nextTick(); place()
}
function close(refocus = false) {
  open.value = false
  document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place)
  if (refocus) btn.value?.focus()
}
onBeforeUnmount(() => close())
</script>

<template>
  <span ref="root" class="evwrap" @keydown.esc.stop="close(true)">
    <button ref="btn" type="button" class="evtrig" :aria-expanded="open" :aria-controls="id" aria-haspopup="dialog"
      :aria-label="label ? `${label}: показати докази (${props.evidence.length})` : undefined" @click="toggle"><slot /></button>
    <div v-if="open" :id="id" ref="pop" class="evpop" role="dialog" :aria-label="heading ?? 'Докази'" :data-side="pos.side"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px`, maxHeight: `${pos.maxHeight}px` }">
      <button type="button" class="evclose" aria-label="Закрити докази" @click="close(true)">✕</button>
      <div v-if="heading || meta" class="small" style="margin-bottom:.4rem"><strong v-if="heading">{{ heading }}</strong> <span v-if="meta" class="muted">{{ meta }}</span></div>
      <EvidenceList :evidence="props.evidence" />
      <slot name="extra" />
    </div>
  </span>
</template>
