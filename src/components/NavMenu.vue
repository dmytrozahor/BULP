<script setup lang="ts">
/**
 * SPEC 63 OV-9: grouped top navigation (src/lib/navMenu.ts). Disclosure pattern: a button per group (aria-expanded, aria-controls) opens a list of links;
 * Esc closes and returns focus to the button, ArrowDown / ArrowUp / Home / End walk the links, focus leaving the group or a click outside closes it.
 * Phone width: the groups sit in a «Меню» sheet (button with aria-expanded) as an accordion, in one column with the page gutter, so nothing scrolls sideways.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_GROUPS, groupOf, nextIndex } from '../lib/navMenu.ts'
const route = useRoute()
const open = ref<string | null>(null), sheet = ref(false)
const root = ref<HTMLElement>()
const links = (id: string): HTMLElement[] => Array.from(root.value?.querySelectorAll<HTMLElement>(`#nm-${id} a`) ?? [])
const btn = (id: string) => root.value?.querySelector<HTMLElement>(`[data-group="${id}"]`)
const close = (focus = false) => { const was = open.value; open.value = null; if (focus && was) nextTick(() => btn(was)?.focus()) }
async function toggle(id: string) { open.value = open.value === id ? null : id; if (open.value) { await nextTick(); links(id)[0]?.focus() } }
function onKey(e: KeyboardEvent, id: string) {
  if (e.key === 'Escape') { e.preventDefault(); if (open.value) close(true); else sheet.value = false; return }
  const ls = links(id); const i = ls.indexOf(document.activeElement as HTMLElement)
  const n = nextIndex(e.key, i, ls.length)
  if (n !== undefined && open.value === id) { e.preventDefault(); ls[n]!.focus() }
}
function onBtnKey(e: KeyboardEvent, id: string) {
  if (e.key === 'ArrowDown' && open.value !== id) { e.preventDefault(); toggle(id) }
}
const onDoc = (e: Event) => { if (root.value && !root.value.contains(e.target as Node)) close() }
const onFocusOut = (e: FocusEvent) => { if (open.value && root.value && !root.value.contains(e.relatedTarget as Node | null) && e.relatedTarget) close() }
onMounted(() => document.addEventListener('click', onDoc))
onBeforeUnmount(() => document.removeEventListener('click', onDoc))
watch(() => route.fullPath, () => { open.value = null; sheet.value = false })
</script>

<template>
  <div ref="root" class="navmenu" data-testid="navmenu" @focusout="onFocusOut">
    <button type="button" class="nm-sheetbtn" :aria-expanded="sheet" aria-controls="nm-groups" @click="sheet = !sheet">
      <span aria-hidden="true">{{ sheet ? '✕' : '☰' }}</span> Меню
    </button>
    <nav id="nm-groups" class="nm-groups" :class="{ sheet }" aria-label="Розділи">
      <div v-for="g in NAV_GROUPS" :key="g.id" class="nm-group" :class="{ on: open === g.id, here: groupOf(route.path) === g.id }" @keydown="onKey($event, g.id)">
        <button type="button" class="nm-btn" :data-group="g.id" :aria-expanded="open === g.id" :aria-controls="`nm-${g.id}`" aria-haspopup="true" @click="toggle(g.id)" @keydown="onBtnKey($event, g.id)">
          {{ g.label }}<span class="caret" aria-hidden="true">{{ open === g.id ? '▴' : '▾' }}</span>
        </button>
        <ul :id="`nm-${g.id}`" class="nm-list" :hidden="open !== g.id">
          <li v-for="i in g.items" :key="i.to">
            <a v-if="i.external" :href="i.to" target="_blank" rel="noopener" :title="i.hint">{{ i.label }} ↗</a>
            <RouterLink v-else :to="i.to" :title="i.hint">{{ i.label }}</RouterLink>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>
