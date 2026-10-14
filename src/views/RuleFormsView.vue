<script setup lang="ts">
/** SPEC 63 FD-5: every lexicon form on which one dialect feature fires (class of forms sharing the feature), ordered by the owner lemma's f; each links to its /f page. */
import { computed } from 'vue'
import { DIALECTS } from '../../core/rules.ts'
import { dialectRule, featureOf, ruleForms } from '../../core/form-class.ts'
import { useData } from '../composables/useData.ts'
import { fmtNum } from '../lib/format.ts'
import { formTo, ruleTo, wordTo } from '../lib/nav.ts'
import EvidencePopover from '../components/EvidencePopover.vue'
import Pagination from '../components/Pagination.vue'
import { usePage } from '../composables/usePage.ts'
const props = defineProps<{ rule: string }>()
const { cards, loaded } = useData()
const rows = computed(() => (loaded.value ? ruleForms(props.rule, cards.value) : []))
const pg = usePage(computed(() => rows.value.length))   // SPEC 63 NV-1
const shown = computed(() => pg.slice(rows.value))
const rules = computed(() => { const r = dialectRule(props.rule); return r ? [r] : [] })
</script>

<template>
  <div v-if="!loaded"><div class="skeleton" style="height:3rem;width:50%" /></div>
  <template v-else>
    <header class="wordhead headline">
      <h1>Форми з ознакою «{{ rule }}»</h1>
      <p class="sans small">Усі написання словника, на яких спрацьовує правило <RouterLink :to="ruleTo(rule)">{{ rule }}</RouterLink>
        <template v-if="featureOf(rule) !== rule"> (ознака {{ featureOf(rule) }})</template>: <strong>{{ fmtNum(rows.length) }}</strong>.
        <span class="muted"> f — частота леми-власниці (лічильники написань лежать у шардах).</span></p>
      <p v-for="r in rules" :key="r.id" class="sans small"><span class="badge dialect">{{ DIALECTS[r.label] ?? r.label }}</span>
        <EvidencePopover :evidence="[r.cite, ...(r.earliestCite ? [r.earliestCite] : [])]" :heading="r.id" :label="r.id"><span class="badge">ⓘ докази</span></EvidencePopover></p>
    </header>
    <p v-if="!rows.length" class="card sans" role="status">У поточних даних правило не спрацьовує на жодній формі (або ідентифікатор невідомий).</p>
    <ul v-else class="sans" style="columns:12rem;list-style:none;padding:0">
      <li v-for="r in shown" :key="r.form + r.lemma"><RouterLink :to="formTo(r.form, r.lemma)" class="lang">{{ r.form }}</RouterLink>
        <span class="muted small"> ← <RouterLink :to="wordTo(r.lemma)">{{ r.lemma }}</RouterLink> · f {{ fmtNum(r.f) }}</span></li>
    </ul>
    <Pagination :page="pg.page.value" :pages="pg.pages.value" :total="rows.length" @go="pg.go" />
  </template>
</template>
