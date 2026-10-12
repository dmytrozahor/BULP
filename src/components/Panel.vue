<script setup lang="ts">
/**
 * SPEC 61 UX-2 / UX-4: a collapsible word-card panel. The header always shows the title and a ONE-LINE summary; the body is collapsed when the panel has
 * only `unknown` content («немає даних»). Nothing is removed (Evidence Invariant): the body stays one tap away. Policy notes (P-3.1 …) live behind a single ⓘ.
 * The body is mounted on first open (heavy children such as the map are not built for collapsed panels) and then kept.
 */
import { computed, ref, watch } from 'vue'
const props = defineProps<{ id: string; title: string; summary?: string; empty?: boolean; open?: boolean; info?: string; count?: string | number }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()
const own = ref(props.open ?? !props.empty)
const seen = ref(own.value)
watch(() => props.open, v => { if (v !== undefined) own.value = v })
watch(own, v => { if (v) seen.value = true })
const isOpen = computed(() => own.value)
let touched = false   // an `empty` flag that arrives after mount (async shard) collapses the panel unless the user already chose
watch(() => props.empty, e => { if (!touched && props.open === undefined) own.value = !e })
const toggle = () => { touched = true; own.value = !own.value; emit('update:open', own.value) }
const showInfo = ref(false)
</script>

<template>
  <section class="card panel" :class="{ collapsed: !isOpen, empty }" :aria-labelledby="id">
    <h2 :id="id">
      <button type="button" class="ptoggle" :aria-expanded="isOpen" :aria-controls="id + '-body'" @click="toggle">
        <span class="caret" aria-hidden="true">{{ isOpen ? '▾' : '▸' }}</span><span class="ptitle">{{ title }}</span><span v-if="count !== undefined" class="small pcount">{{ count }}</span>
      </button>
      <span class="psum small sans" :class="{ unk: empty }">{{ empty ? 'немає даних' : summary }}</span>
      <button v-if="info || $slots.info" type="button" class="pinfo" :aria-expanded="showInfo" :aria-label="`Примітка до панелі «${title}»`" @click="showInfo = !showInfo">ⓘ</button>
    </h2>
    <p v-if="(info || $slots.info) && showInfo" class="small muted sans pnote" role="note"><slot name="info">{{ info }}</slot></p>
    <div v-show="isOpen" :id="id + '-body'" class="pbody"><slot v-if="seen" /></div>
  </section>
</template>
