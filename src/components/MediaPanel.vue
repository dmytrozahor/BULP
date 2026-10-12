<script setup lang="ts">
/**
 * MV-1: media panel next to annotated text / KWIC. IIIF image (Sophia graffiti; image licence CC BY-NC, attribution always shown; NO transcription
 * text until the text licence is confirmed — research/16), YouTube via the privacy-enhanced youtube-nocookie.com iframe (loaded only on click),
 * or a plain image. Images are lazy-loaded; only http(s) URLs render.
 */
import { computed, ref } from 'vue'
import type { WitnessMedia } from '../lib/media.ts'
import { iiifFullUrl, iiifImageUrl, safeHttp, youtubeEmbedUrl, youtubeWatchUrl } from '../lib/media.ts'
const props = defineProps<{ media: WitnessMedia }>()
defineEmits<{ close: [] }>()
const zoom = ref(false), play = ref(false), failed = ref(false)
const src = computed(() => {
  const m = props.media
  if (m.kind === 'iiif') return iiifImageUrl(m.url, zoom.value ? 1600 : 640)
  return safeHttp(m.url) ? m.url : ''
})
const embed = computed(() => (props.media.kind === 'youtube' ? youtubeEmbedUrl(props.media.url) : undefined))
const watch = computed(() => (props.media.kind === 'youtube' ? youtubeWatchUrl(props.media.url) : undefined))
const full = computed(() => (props.media.kind === 'iiif' ? iiifFullUrl(props.media.url) : undefined))
const title = computed(() => props.media.title ?? (props.media.kind === 'youtube' ? 'Відео' : 'Зображення'))
</script>

<template>
  <aside class="mediapanel sans" :aria-label="'Медіа: ' + title">
    <div class="mp-head">
      <strong>{{ title }}</strong>
      <button type="button" class="chip small" @click="$emit('close')" aria-label="Закрити медіапанель">закрити ✕</button>
    </div>
    <template v-if="media.kind === 'youtube'">
      <div v-if="embed" class="mp-frame">
        <iframe v-if="play" :src="embed" :title="title" loading="lazy" allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
        <button v-else type="button" class="mp-play" @click="play = true">▶ Відтворити (youtube-nocookie.com)</button>
      </div>
      <p v-else class="muted small">Некоректний ідентифікатор відео.</p>
      <a v-if="watch" :href="watch" target="_blank" rel="noopener" class="small">відкрити на YouTube ↗</a>
    </template>
    <template v-else>
      <p v-if="failed || !src" class="muted small">Зображення недоступне.</p>
      <figure v-else class="mp-fig">
        <img :src="src" :alt="title" loading="lazy" decoding="async" :class="{ big: zoom }" @error="failed = true" />
      </figure>
      <div class="row small">
        <button v-if="media.kind === 'iiif'" type="button" class="chip" :aria-pressed="zoom" @click="zoom = !zoom">{{ zoom ? 'зменшити' : 'збільшити' }}</button>
        <a v-if="full" :href="full" target="_blank" rel="noopener">вся панель (IIIF) ↗</a>
      </div>
    </template>
    <p class="small muted mp-attr">{{ media.attribution }} · ліцензія: {{ media.licence }}</p>
  </aside>
</template>

<style scoped>
.mediapanel { border: 1px solid var(--line); background: var(--surface); border-radius: var(--r); padding: .6rem .8rem; margin: .4rem 0; max-width: 100%; box-sizing: border-box; }
.mp-head { display: flex; justify-content: space-between; align-items: center; gap: .6rem; flex-wrap: wrap; }
.mp-fig { margin: .5rem 0; overflow: auto; max-width: 100%; }
.mp-fig img { max-width: 100%; height: auto; display: block; background: var(--surface-2); }
.mp-fig img.big { max-width: none; }
.mp-frame { position: relative; aspect-ratio: 16 / 9; width: 100%; background: var(--surface-2); margin: .5rem 0; }
.mp-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.mp-play { position: absolute; inset: 0; width: 100%; font: inherit; background: transparent; border: 0; cursor: pointer; color: var(--ink); }
.mp-attr { margin: .3rem 0 0; }
</style>
