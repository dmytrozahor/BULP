<script setup lang="ts">
/**
 * SPEC 63 UI-3: one panel, two renderings. Slot `graph` is the default view, slot `list` keeps the text rendering. The «граф / список» switch is per panel
 * (remembered in localStorage); «типово» makes the current view the default for all panels. Both slots expose the same clickable nodes (BL-16).
 */
import { useViewMode } from '../lib/viewMode.ts'
const props = defineProps<{ panel: string }>()
const vm = useViewMode(props.panel)
</script>

<template>
  <div class="vsw" :data-view="vm.mode()">
    <div class="vsw-bar sans small" role="group" aria-label="Вигляд: граф або список">
      <button type="button" class="vsw-b" data-v="graph" :aria-pressed="vm.mode() === 'graph'" @click="vm.set('graph')">граф</button>
      <button type="button" class="vsw-b" data-v="list" :aria-pressed="vm.mode() === 'list'" @click="vm.set('list')">список</button>
      <button type="button" class="vsw-b vsw-def" data-v="default" :title="`зробити вигляд «${vm.mode() === 'graph' ? 'граф' : 'список'}» типовим для всіх панелей`" @click="vm.setDefault(vm.mode())">типово</button>
    </div>
    <div v-if="vm.mode() === 'graph'" class="vsw-graph"><slot name="graph" /></div>
    <div v-else class="vsw-list"><slot name="list" /></div>
  </div>
</template>
