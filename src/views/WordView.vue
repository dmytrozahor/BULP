<script setup lang="ts">
/**
 * DWDS-like word card, research/07 §3.1 (two columns; stacked on mobile): header (lemma, POS, stress, form chips that filter every panel),
 * panels Походження · Мітки · Словозміна · Приклади, sidebar Статистика. Every label is a ClaimBadge with an evidence popover (SPEC 00 P-1.1).
 */
import { computed, ref, watch } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { assignEpoch } from '../../core/epochs.ts'
import type { Claim } from '../../core/evidence.ts'
import { STAT_CITES } from '../../core/stats.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { epochName, fmtDate, fmtNum, labelUk, WTYPE_UK } from '../lib/format.ts'
import AuthorBadge from '../components/AuthorBadge.vue'
import ClaimBadge from '../components/ClaimBadge.vue'
import ClaimSet from '../components/ClaimSet.vue'
import Collocations from '../components/Collocations.vue'
import Dots from '../components/Dots.vue'
import EpochBars from '../components/EpochBars.vue'
import EvidencePopover from '../components/EvidencePopover.vue'
import Kwic from '../components/Kwic.vue'
import Paradigm from '../components/Paradigm.vue'
import ProvenanceTimeline from '../components/ProvenanceTimeline.vue'
import StressForms from '../components/StressForms.vue'
import TimeCurve from '../components/TimeCurve.vue'

const props = defineProps<{ lemma: string }>()
const { byLemma, loaded, corpus, witnessById } = useData()
const card = computed(() => byLemma.value.get(props.lemma))
const active = ref<string | null>(null), nForms = ref(60)   // F2: frequent lemmas have hundreds of spellings — paged chips
watch(() => props.lemma, () => (active.value = null))
const toggle = (raw: string) => (active.value = active.value === raw ? null : raw)

const first = computed(() => card.value && isKnown(card.value.first) ? card.value.first.value : undefined)
const firstW = computed(() => first.value ? witnessById.value.get(first.value.witness) : undefined)
const kwic = computed(() => (card.value?.forms ?? []).filter(f => !active.value || f.raw === active.value).flatMap(f => f.kwic))
const activeForm = computed(() => card.value?.forms.find(f => f.raw === active.value))
/** dialect claims + the optional lemma-level rusyn claim (B0 contract), shown as parallel readings by ClaimSet */
const dialects = computed(() => {
  const ru = (card.value?.claims as { rusyn?: Claim<string> } | undefined)?.rusyn
  return [...Object.entries(card.value?.claims.dialect ?? {}), ...(ru && isKnown(ru) ? [[ru.value, ru] as [string, Claim<unknown>]] : [])]
})
const epochClaims = computed(() => first.value ? (['shev', 'wl'] as const).map(s => ({ s, c: assignEpoch(first.value!.date, s) })) : [])
const epText = (c: ReturnType<typeof assignEpoch>) => (isKnown(c) ? c.value.epochs.map(epochName).join(' / ') + ` · ${c.value.confidence}` : 'невідомо')
const formLabels = computed(() => (card.value?.forms ?? []).filter(f => !active.value || f.raw === active.value).filter(f => Object.keys(f.claims).length))
</script>

<template>
  <div v-if="!loaded"><div class="skeleton" style="height:3rem;width:50%" /><div class="skeleton" v-for="i in 5" :key="i" /></div>
  <div v-else-if="!card" class="card">
    <h1>«{{ lemma }}» — немає в словнику</h1>
    <p><RouterLink :to="{ path: '/analyze', query: { q: lemma } }">Проаналізувати «{{ lemma }}» у браузері →</RouterLink> · <RouterLink to="/">до пошуку</RouterLink></p>
  </div>
  <template v-else>
    <header class="wordhead">
      <h1 class="lemma">{{ card.lemma }}</h1>
      <div class="row"><span class="muted sans">{{ card.pos }}</span><StressForms :variants="card.stress" /></div>
      <div class="chips" role="group" aria-label="Історичні написання (фільтр панелей)">
        <button v-for="f in card.forms.slice(0, nForms)" :key="f.raw" type="button" class="chip" :aria-pressed="active === f.raw" @click="toggle(f.raw)">{{ f.raw }}</button>
        <button v-if="card.forms.length > nForms" type="button" class="chip sans small" @click="nForms += 200">ще {{ card.forms.length - nForms }} написань…</button>
        <button v-if="active" type="button" class="chip sans small" @click="active = null">× усі форми</button>
      </div>
      <p v-if="active" class="small sans muted">Панелі відфільтровано за написанням «{{ active }}».</p>
    </header>

    <div class="cols">
      <div>
        <!-- 1. Provenance -->
        <section class="card" aria-labelledby="h-prov">
          <h2 id="h-prov"><span>Походження · Provenance</span></h2>
          <div v-if="first && card.first.value !== 'unknown'">
            <p class="sans"><span class="muted">Перша фіксація: </span>
              <ClaimBadge :claim="card.first" :text="`${fmtDate(first.date)} · ${first.form}`" /></p>
            <ul class="sans small" style="list-style:none;padding:0;margin:0 0 .8rem">
              <li><span class="muted">автор: </span><AuthorBadge :author="first.author" :witness="first.witness" /></li>
              <li><span class="muted">пам’ятка: </span><a v-if="firstW" :href="firstW.url" target="_blank" rel="noopener">{{ firstW.title }}</a><template v-else>{{ first.witness }}</template>
                · <span class="muted">локатор:</span> {{ first.loc }}</li>
              <li><span class="muted">дата: </span>{{ fmtDate(first.date) }}
                <EvidencePopover v-if="firstW" :evidence="[firstW.dateCite]" heading="Датування пам’ятки" label="датування"><span class="badge">ⓘ джерело дати</span></EvidencePopover>
                · <span class="muted">тип свідчення: </span>{{ WTYPE_UK[first.witnessType] ?? first.witnessType }}</li>
              <li v-if="first.coFirst.length"><span class="muted">співпершими: </span>{{ first.coFirst.join(', ') }}</li>
              <li v-if="isKnown(card.claims.oldest)"><span class="muted">найдавніша форма: </span>
                <ClaimBadge :claim="card.claims.oldest" :text="(card.claims.oldest.value as any).form" /></li>
            </ul>
          </div>
          <p v-else class="sans"><span class="muted">Перша фіксація: </span><ClaimBadge :claim="card.first" /></p>
          <h3 class="sans small muted">Історичні написання за датою</h3>
          <ProvenanceTimeline :forms="card.forms" :active="active" :card="card" />
        </section>

        <!-- 2. Labels -->
        <section class="card" aria-labelledby="h-lab">
          <h2 id="h-lab"><span>Мітки · Labels</span></h2>
          <div class="grid2 sans">
            <div><span class="muted">Регістр: </span><ClaimBadge :claim="card.claims.register" text="розмовне" unknown-text="не визначено" tone="colloquial" /></div>
            <div><span class="muted">Суржик: </span><ClaimBadge :claim="card.claims.surzhyk" text="суржик" tone="contact" /></div>
            <div><span class="muted">Походження: </span><ClaimBadge :claim="card.claims.origin" :text="labelUk(String(card.claims.origin.value))" :tone="card.claims.origin.value === 'church_slavonic' ? 'cs' : ''" /></div>
            <div><span class="muted">Діалекти: </span>
              <ClaimSet v-if="dialects.length" :claims="Object.fromEntries(dialects)" />
              <span v-else class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">невідомо</span></div>
          </div>
          <h3 class="sans small muted" style="margin-top:.9rem">Епохи першої фіксації — дві схеми (можуть не збігатися за задумом)</h3>
          <div class="grid2 sans">
            <div v-for="{ s, c } in epochClaims" :key="s"><span class="muted">{{ s === 'shev' ? 'Шевельов' : 'Історія літ. мови (WL)' }}: </span><ClaimBadge :claim="c" :text="epText(c)" /></div>
          </div>
          <template v-if="formLabels.length">
            <h3 class="sans small muted" style="margin-top:.9rem">Мітки окремих написань</h3>
            <ul class="sans small" style="list-style:none;padding:0;margin:0">
              <li v-for="f in formLabels" :key="f.raw" style="margin:.25rem 0"><strong style="font-family:var(--serif)">{{ f.raw }}</strong>
                <ClaimSet :claims="f.claims" /></li>
            </ul>
          </template>
          <p class="small muted sans" style="margin-top:.6rem">Літературний регістр ніколи не виводиться: є лише «розмовне» (за позначкою) або «не визначено» (SPEC 00 P-3.1).</p>
        </section>

        <!-- 3. Paradigm -->
        <section class="card" aria-labelledby="h-par">
          <h2 id="h-par"><span>Словозміна · Paradigm</span></h2>
          <Paradigm :paradigm="card.paradigm" />
        </section>

        <!-- 5. Examples -->
        <section class="card" aria-labelledby="h-kw">
          <h2 id="h-kw"><span>Приклади · KWIC</span><span class="small">{{ kwic.length }}</span></h2>
          <Kwic :lines="kwic" />
          <p v-if="activeForm" class="small muted">показано приклади форми «{{ activeForm.raw }}»</p>
        </section>
      </div>

      <!-- 4. Statistics sidebar -->
      <aside aria-label="Статистика">
        <section class="card">
          <h2><span>Статистика</span><span class="generated">автоматично згенеровано <RouterLink to="/method" title="Як це обчислюється">ⓘ</RouterLink></span></h2>
          <div class="row sans"><Dots :dots="card.stats.dots" :ipm="card.stats.ipm" :hk="card.stats.hk" :f="card.stats.f" :N="corpus?.N" />
            <EvidencePopover :evidence="[STAT_CITES.dots!, STAT_CITES.hk!]" heading="Частотність: точки та HK"><span class="badge">ⓘ</span></EvidencePopover></div>
          <p class="small sans" style="margin:.3rem 0 .8rem">{{ fmtNum(card.stats.ipm, 1) }} ipm · HK {{ card.stats.hk }} · f = {{ card.stats.f }} · N = {{ fmtNum(corpus?.N ?? 0) }} слів<br />
            <span class="muted">ipm — на мільйон слів; HK — клас частотності; f — кількість вживань; N — розмір корпусу.</span></p>
          <div class="small sans"><span>Рівномірність (1 − DP): <strong>{{ fmtNum(1 - card.stats.dp, 2) }}</strong></span>
            <EvidencePopover :evidence="[STAT_CITES.dp!]" heading="Дисперсія DP (Gries)"><span class="badge">ⓘ</span></EvidencePopover>
            <div class="bar" role="img" :aria-label="`рівномірність ${fmtNum(1 - card.stats.dp, 2)}`"><i :style="{ width: (1 - card.stats.dp) * 100 + '%' }"></i></div>
            <span class="muted">у {{ card.stats.range }} із {{ corpus?.witnesses.length }} пам’яток</span></div>
        </section>
        <section class="card"><h2><span>За століттями</span></h2>
          <TimeCurve :series="card.stats.byCentury" :sizes="corpus?.centurySizes ?? {}" /></section>
        <section class="card"><h2><span>За епохами</span></h2>
          <EpochBars :stats="card.stats" :sizes="corpus?.epochSizes ?? {}" /></section>
        <section class="card"><h2><span>Типові сполучення</span></h2>
          <Collocations :colloc="card.stats.colloc" /></section>
      </aside>
    </div>
  </template>
</template>
