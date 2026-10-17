<script setup lang="ts">
/** /atlas (SPEC 63 AT-3) — maps of the «Атлас української мови» т. 2 → printed variants → the DIALECT_BOOK_RULES rows built from them → the forms that fire (/forms/<rule>). */
import { computed, ref } from 'vue'
import { fetchJson } from '../lib/fetchJson.ts'
interface AMap { n: string; page: number; quote: string; q?: string; nVariants: number; regions: string[]; variants: { f: string; k: number; s?: string }[]; rules: string[] }
interface Atlas { title: string; note: string; maps: AMap[] }
const data = ref<Atlas | null>(null), failed = ref(false)
fetchJson('./atlas/aum2.json').then(j => { if (j) data.value = j as Atlas; else failed.value = true }, () => { failed.value = true })
const q = ref(''), onlyRules = ref(false)
const rows = computed(() => (data.value?.maps ?? []).filter(m => (!onlyRules.value || m.rules.length) && (!q.value.trim() || (m.n + ' ' + m.quote + ' ' + m.variants.map(v => v.f).join(' ')).toLowerCase().includes(q.value.trim().toLowerCase()))))
const shown = computed(() => rows.value.slice(0, 120))
</script>

<template>
  <section class="card">
    <h1>Атлас української мови — діалектні ознаки</h1>
    <p v-if="failed" class="muted sans">Дані атласу не завантажено (pipelines/atlas-site.ts).</p>
    <template v-if="data">
      <p class="small muted sans">{{ data.title }}. {{ data.note }}</p>
      <input v-model="q" type="search" placeholder="Фільтр: номер карти, слово, форма…" aria-label="Фільтр карт атласу" />
      <label class="small sans"><input v-model="onlyRules" type="checkbox" /> лише карти з правилами</label>
      <p class="small muted sans">{{ rows.length }} карт{{ rows.length > shown.length ? ` (показано ${shown.length})` : '' }}</p>
      <ul class="results">
        <li v-for="m in shown" :key="m.n">
          <span class="lem">карта {{ m.n }}</span> <span class="small muted sans">PDF-с. {{ m.page }} · питання № {{ m.q ?? '—' }} · {{ m.nVariants }} форм</span>
          <div class="small sans">{{ m.quote }}</div>
          <div class="small sans" v-if="m.variants.length">Форми (OCR, кількість пунктів): <template v-for="(v, i) in m.variants" :key="i"><span v-if="i">; </span>{{ v.f }} ({{ v.k }})</template></div>
          <div class="small muted sans" v-if="m.regions.length">Коментар називає: {{ m.regions.join(', ') }}</div>
          <div class="small sans" v-if="m.rules.length">Правила: <template v-for="(r, i) in m.rules" :key="r"><span v-if="i">, </span><RouterLink :to="`/forms/${encodeURIComponent(r)}`">{{ r }}</RouterLink></template></div>
        </li>
      </ul>
    </template>
  </section>
</template>
