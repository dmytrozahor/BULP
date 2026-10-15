<script setup lang="ts">
/** /plast — the whole Plast vocabulary (SL-2), filterable by `?q=` (headword or quoted gloss) and paged by `?p=` (NV-1); every entry opens its in-site source card. */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Pagination from '../components/Pagination.vue'
import { usePage } from '../composables/usePage.ts'
import { plastAll, plastSearch, sociolectFile } from '../lib/sociolectData.ts'
const route = useRoute(), router = useRouter()
const q = ref(String(route.query.q ?? ''))
watch(q, v => { const query = { ...route.query, q: v || undefined }; delete query.p; router.replace({ path: route.path, query }) })
const rows = computed(() => { void sociolectFile.value; return q.value.trim() ? plastSearch(q.value, 10_000) : plastAll() })
const pg = usePage(computed(() => rows.value.length))
</script>

<template>
  <section class="card">
    <h1>Пластова лексика</h1>
    <p class="muted small sans" v-if="sociolectFile">Джерела: {{ sociolectFile.plast.compiler }} та інші словники Пласту; цитати ≤ 160 знаків із локатором, повні тексти не зберігаються.</p>
    <input v-model="q" type="search" placeholder="Фільтр: вишкіл, табір, ВПР…" aria-label="Фільтр пластової лексики" autocomplete="off" spellcheck="false" />
    <p class="small muted sans">{{ rows.length }} записів</p>
    <ul class="results">
      <li v-for="e in pg.slice(rows)" :key="e.src + e.loc + e.w">
        <RouterLink :to="`/source/${encodeURIComponent(e.src)}`">
          <span class="lem">{{ e.w }}</span>
          <span class="badge">{{ e.k === 'abbr' ? 'абревіатура' : 'пластова лексика' }}</span>
          <span class="small sans">«{{ e.g }}»</span>
          <span class="small muted sans">{{ e.loc }}<template v-if="e.byGloss"> · знайдено в тлумаченні</template></span>
        </RouterLink>
      </li>
    </ul>
    <Pagination v-if="pg.pages.value > 1" :page="pg.page.value" :pages="pg.pages.value" :total="rows.length" @go="pg.go" />
  </section>
</template>
