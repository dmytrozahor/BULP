<script setup lang="ts">
/**
 * SPEC 63 OV-10: the card's general categories as tabs (src/lib/cardTabs.ts). A tab body is mounted on its first visit and then kept (lazy loading: the blocks of a tab nobody
 * opened never fetch their shards); on the server / in tests (no window) every body is rendered so the output stays complete. Tablist pattern: role=tab, aria-selected,
 * roving tabindex, ArrowLeft / ArrowRight / Home / End; an #anchor to a panel in another tab opens that tab (PANEL_TAB).
 */
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TABS, tabOfId, tabRequest, type TabId } from '../lib/cardTabs.ts'
const props = defineProps<{ tabs?: TabId[]; start?: TabId; /** counts shown on the tab (optional) */ counts?: Partial<Record<TabId, number | string>> }>()
const ids = (): TabId[] => props.tabs ?? TABS.map(t => t.id)
const active = ref<TabId>(props.start ?? ids()[0]!)
const seen = reactive(new Set<TabId>([active.value]))
const ssr = typeof window === 'undefined'
const route = useRoute()
function go(t: TabId, focus = false) { active.value = t; seen.add(t); if (focus) document.getElementById('ctab-' + t)?.focus() }
function onKey(e: KeyboardEvent) {
  const l = ids(), i = l.indexOf(active.value); let n = -1
  if (e.key === 'ArrowRight') n = (i + 1) % l.length; else if (e.key === 'ArrowLeft') n = (i - 1 + l.length) % l.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = l.length - 1
  if (n >= 0) { e.preventDefault(); go(l[n]!, true) }
}
/** #h-kw and similar: open the tab that holds the panel, then scroll to it */
function openFor(hash: string) {
  const id = hash.replace(/^#/, ''), t = tabOfId(id)
  if (t && ids().includes(t)) { go(t); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50) }
}
onMounted(() => { if (route.hash) openFor(route.hash) })
watch(tabRequest, r => { if (r) openFor('#' + r.id) })
watch(() => route.hash, h => { if (h) openFor(h) })
</script>

<template>
  <div class="ctabs" data-testid="card-tabs">
    <div class="ctab-list sans" role="tablist" aria-label="Розділи картки" @keydown="onKey">
      <button v-for="t in TABS.filter(x => ids().includes(x.id))" :id="'ctab-' + t.id" :key="t.id" type="button" role="tab" class="ctab" :aria-selected="active === t.id"
        :aria-controls="'cpane-' + t.id" :tabindex="active === t.id ? 0 : -1" :title="t.hint" @click="go(t.id)">{{ t.label }}<span v-if="counts?.[t.id] !== undefined" class="count-n"> {{ counts[t.id] }}</span></button>
    </div>
    <template v-for="t in TABS.filter(x => ids().includes(x.id))" :key="t.id">
      <div v-if="ssr || seen.has(t.id)" v-show="ssr || active === t.id" :id="'cpane-' + t.id" role="tabpanel" class="cpane" :aria-labelledby="'ctab-' + t.id" :data-tab="t.id" tabindex="-1">
        <slot :name="t.id" />
      </div>
    </template>
  </div>
</template>
