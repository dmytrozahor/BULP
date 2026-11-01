<script setup lang="ts">
/**
 * SPEC 63 CP-11g — a collapsed-by-default block with its title and item count in the summary line («Родина варіантів · 7»). The open / closed state is remembered per viewer in
 * localStorage (every access in try/catch: private windows and blocked storage just start closed); the content is rendered lazily, on the first open.
 */
import { ref } from 'vue'
const props = defineProps<{ id: string; title: string; count: number; testid?: string }>()
const k = () => `bulp.coll.${props.id}`
const read = (): boolean => { try { return localStorage.getItem(k()) === '1' } catch { return false } }
const open = ref(read()), seen = ref(open.value)
function toggle() {
  open.value = !open.value
  if (open.value) seen.value = true
  try { localStorage.setItem(k(), open.value ? '1' : '0') } catch { /* storage unavailable: the state just is not remembered */ }
}
</script>

<template>
  <div class="coll hl-line sans small" :data-testid="testid">
    <button type="button" class="chip sans small" data-testid="coll-toggle" :aria-expanded="open" @click="toggle">{{ title }} · {{ count }} <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span></button>
    <div v-if="seen" v-show="open" class="coll-body" data-testid="coll-body"><slot /></div>
  </div>
</template>
