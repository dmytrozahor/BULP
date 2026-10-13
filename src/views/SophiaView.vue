<script setup lang="ts">
/**
 * MV-1 / NW-6: browse the Saint Sophia graffiti (metadata + IIIF image links; the inscription texts live in the /texts witnesses sophia-<id> (licenceNote), not on this browse page).
 * Filter by date (overlapping years), type and free text; each row links to the portal page and the IIIF image; «переглянути» opens the media panel.
 */
import { computed, onMounted, ref } from 'vue'
import { filterSophia, mediaOfSophia, SOPHIA_ATTRIBUTION, SOPHIA_PORTAL, iiifImageUrl, type SophiaData, type SophiaItem } from '../lib/media.ts'
import { witnessTo } from '../lib/nav.ts'
import { loadSophia } from '../lib/sophiaData.ts'
import MediaPanel from '../components/MediaPanel.vue'
import AffiliationChips from '../components/AffiliationChips.vue'
const data = ref<SophiaData>(), err = ref('')
const from = ref(''), to = ref(''), text = ref(''), type = ref(''), open = ref<number>(), page = ref(1)
const PAGE = 50
onMounted(() => { loadSophia().then(d => (data.value = d)).catch(e => (err.value = String(e.message ?? e))) })
const types = computed(() => [...new Set(data.value?.items.map(i => i.type) ?? [])].sort())
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s))
const rows = computed(() => filterSophia(data.value?.items ?? [], { from: num(from.value), to: num(to.value), text: text.value, type: type.value }))
const shown = computed(() => rows.value.slice(0, page.value * PAGE))
const cur = computed<SophiaItem | undefined>(() => data.value?.items.find(i => i.id === open.value))
const yrs = (i: SophiaItem) => (i.from === i.to ? `${i.from}` : `${i.from}–${i.to}`)
</script>

<template>
  <section>
    <h1>Софія Київська: графіті</h1>
    <p class="muted sans small">Метадані й посилання на зображення порталу <a href="https://saintsophia.dh.gu.se/" target="_blank" rel="noopener">saintsophia.dh.gu.se</a>. {{ SOPHIA_ATTRIBUTION }}. Ліцензію на тексти транскрипцій не підтверджено, тому тексти тут не показано.</p>
    <p><AffiliationChips :refs="[SOPHIA_PORTAL]" /></p>
    <p v-if="err" class="fixture err" role="alert">{{ err }}</p>
    <p v-else-if="!data" class="muted" role="status">Завантаження…</p>
    <template v-else>
      <form class="row sans" role="search" aria-label="Фільтр графіті" @submit.prevent>
        <label>з року <input v-model="from" inputmode="numeric" size="5" @input="page = 1" /></label>
        <label>до року <input v-model="to" inputmode="numeric" size="5" @input="page = 1" /></label>
        <label>тип <select v-model="type" @change="page = 1"><option value="">усі</option><option v-for="t in types" :key="t">{{ t }}</option></select></label>
        <label>пошук <input v-model="text" type="search" placeholder="номер, панель…" @input="page = 1" /></label>
      </form>
      <p class="sans small" role="status" aria-live="polite">Знайдено {{ rows.length }} з {{ data.count }}.</p>
      <MediaPanel v-if="cur" :media="mediaOfSophia(cur)" @close="open = undefined" />
      <ul class="sophia-list sans">
        <li v-for="i in shown" :key="i.id">
          <span class="mono">№ {{ i.title }}</span> · {{ i.type }} · {{ yrs(i) }} · панель {{ i.panel }}
          <span class="row small">
            <RouterLink class="chip" :to="witnessTo(`sophia-${i.id}`)">картка графіті →</RouterLink>
            <button type="button" class="chip" @click="open = i.id">переглянути</button>
            <a :href="i.viewer" target="_blank" rel="noopener">сторінка порталу ↗</a>
            <a :href="iiifImageUrl(i.iiif, 1200)" target="_blank" rel="noopener">зображення IIIF ↗</a>
          </span>
        </li>
      </ul>
      <button v-if="shown.length < rows.length" type="button" class="chip sans small" @click="page++">більше… ({{ rows.length - shown.length }})</button>
    </template>
  </section>
</template>

<style scoped>
.sophia-list { list-style: none; padding: 0; margin: .6rem 0; }
.sophia-list li { padding: .45rem 0; border-bottom: 1px solid var(--line); }
form label { display: inline-flex; gap: .3rem; align-items: baseline; }
input, select { font: inherit; max-width: 100%; }
</style>
