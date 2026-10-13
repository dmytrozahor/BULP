<script setup lang="ts">
/**
 * BL-6 form page /f/:form — everything for exactly one spelling of a lemma: its KWIC, epoch cells, witnesses, f / ipm / HK / DP with denominators (lib/formStats.ts),
 * the derivation trace and the claims. All of it comes from the lemma's detail shard (fullOf). Several lemmas can share a spelling: ?lemma= picks one.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import { formStats, restrictEpochs } from '../lib/formStats.ts'
import ClaimBadge from '../components/ClaimBadge.vue'
import ClaimSet from '../components/ClaimSet.vue'
import DerivationSteps from '../components/DerivationSteps.vue'
import Dots from '../components/Dots.vue'
import EpochParadigm from '../components/EpochParadigm.vue'
import Kwic from '../components/Kwic.vue'
import Panel from '../components/Panel.vue'
import { paradigmKindOf } from '../lib/ux.ts'

const props = defineProps<{ form: string }>()
const route = useRoute()
const { cards, loaded, corpus, fullOf, detailError, witnessById } = useData()

/** every (lemma, spelling) whose raw spelling is this one; falls back to the normalised key (KWIC nodes keep the surface case) */
const matches = computed(() => {
  if (!loaded.value) return []
  const exact = (f: { raw: string }) => f.raw === props.form, loose = (f: { raw: string }) => key(f.raw) === key(props.form)
  for (const test of [exact, (f: { raw: string }) => f.raw.toLowerCase() === props.form.toLowerCase(), loose]) {
    const out = cards.value.flatMap(c => c.forms.filter(test).map(f => ({ lemma: c.lemma, raw: f.raw })))
    if (out.length) return out
  }
  return []
})
const pick = computed(() => matches.value.find(m => m.lemma === route.query.lemma) ?? matches.value[0])
const core = computed(() => cards.value.find(c => c.lemma === pick.value?.lemma))
const full = computed(() => fullOf(core.value))
const fc = computed(() => full.value?.forms.find(f => f.raw === pick.value?.raw))
const err = computed(() => pick.value ? detailError.get(pick.value.lemma) : undefined)
const epochs = computed(() => restrictEpochs(full.value?.epochs, pick.value?.raw ?? ''))
const stats = computed(() => fc.value && full.value && corpus.value
  ? formStats(fc.value, full.value.stats, epochs.value, { N: corpus.value.N, epoch: corpus.value.epochSizes }) : undefined)
const kind = computed(() => paradigmKindOf(core.value))
const epochKinds = computed(() => kind.value === 'noun' || kind.value === 'pron')
const link = computed(() => fc.value && isKnown(fc.value.link) ? fc.value.link.value : undefined)
const rusyn = computed(() => fc.value?.claims.rusyn)
const labelClaims = computed(() => Object.fromEntries(Object.entries(fc.value?.claims ?? {}).filter(([k]) => k !== 'rusyn')))
const wTitle = (id: string) => witnessById.value.get(id)?.title ?? id
</script>

<template>
  <div v-if="!loaded"><div class="skeleton" style="height:3rem;width:50%" /><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <div v-else-if="!pick" class="card" role="status">
    <h1>«{{ form }}» — такого написання немає в корпусі</h1>
    <p class="sans"><RouterLink :to="{ path: '/', query: { q: form } }">шукати «{{ form }}» →</RouterLink> · <RouterLink :to="{ path: '/analyze', query: { q: form } }">аналіз за правилами →</RouterLink></p>
  </div>
  <template v-else>
    <header class="wordhead headline">
      <h1 class="lemma">{{ pick.raw }}</h1>
      <p class="hl-line sans"><span class="muted">написання леми </span><RouterLink :to="`/w/${pick.lemma}`">{{ pick.lemma }}</RouterLink>
        <template v-if="fc"><span class="muted"> · найраніше: </span>{{ fmtDate(fc.date) }}</template>
        <template v-if="link"><span class="muted"> · зв’язок: </span>{{ link.route }}<template v-if="link.form !== pick.lemma"> → {{ link.form }}</template></template></p>
      <p v-if="matches.length > 1" class="small sans muted">Те саме написання в інших лемах:
        <template v-for="m in matches.filter(x => x.lemma !== pick!.lemma)" :key="m.lemma"><RouterLink :to="{ path: `/f/${m.raw}`, query: { lemma: m.lemma } }">{{ m.lemma }}</RouterLink>{{ ' ' }}</template></p>
      <p v-if="err" class="small sans unk" role="alert">Не вдалося завантажити деталі: {{ err }}</p>
    </header>
    <div v-if="!fc && !err" class="skeleton" style="height:8rem" />
    <div v-else-if="fc && stats" class="cols">
      <div>
        <Panel id="f-kw" :open="true" title="Приклади · KWIC" :summary="`${fc.kwic.length} із f = ${stats.f}`" :empty="!fc.kwic.length">
          <Kwic :lines="fc.kwic" :lemma="pick.lemma" />
        </Panel>
        <Panel id="f-ep" :open="true" title="Клітинки за епохами" :summary="`розміщено токенів: ${stats.placed}`" :empty="!epochKinds"
          info="Лише клітинки, де стоїть це написання (з парадигм леми); токени без розмітки сюди не потрапляють.">
          <EpochParadigm v-if="epochKinds" no-legend :kind="kind" :epochs="epochs" :spellings="[pick.raw]" />
          <p v-else class="small sans muted">Історичні парадигми для цієї частини мови ще не побудовано.</p>
        </Panel>
        <Panel id="f-wit" :open="true" title="Пам’ятки" :summary="`${stats.witnesses.length} у прикладах`" :empty="!stats.witnesses.length">
          <ul class="sans small" style="list-style:none;padding:0;margin:0">
            <li v-for="w in stats.witnesses" :key="w.w" style="margin:.2rem 0"><a v-if="witnessById.get(w.w)?.url" :href="witnessById.get(w.w)!.url" target="_blank" rel="noopener">{{ wTitle(w.w) }}</a><template v-else>{{ wTitle(w.w) }}</template>
              <span class="count-n"> · прикладів: {{ w.lines }}</span></li>
          </ul>
          <p class="small sans muted">Перелік за наведеними прикладами (≤ 6); повний розподіл за пам’ятками для окремого написання в даних не зберігається.</p>
        </Panel>
        <Panel id="f-der" :open="true" title="Виведення · Derivation" :summary="fc.derivation.length ? `${fc.derivation.length} кроків → ${fc.modern}` : `без змін → ${fc.modern}`">
          <p class="sans small"><span class="muted">норма: </span>{{ fc.norm }} <span class="muted"> · сучасна: </span>{{ fc.modern }}</p>
          <DerivationSteps :steps="fc.derivation" :uid="pick.raw" />
        </Panel>
        <Panel id="f-cl" :open="true" title="Мітки · Claims" :summary="Object.keys(fc.claims).length ? Object.keys(fc.claims).join(', ') : 'міток із доказами немає'" :empty="!Object.keys(fc.claims).length">
          <ClaimSet v-if="Object.keys(labelClaims).length" :claims="labelClaims" />
          <p v-if="rusyn && isKnown(rusyn)" class="sans small"><span class="muted">русинське прочитання: </span><ClaimBadge :claim="rusyn" :text="String(rusyn.value)" /></p>
          <p v-if="fc.hints.length" class="small sans muted">підказки (вага 0): {{ fc.hints.join(', ') }}</p>
        </Panel>
      </div>
      <aside aria-label="Статистика написання">
        <Panel id="f-st" :open="true" title="Статистика написання" :summary="`${fmtNum(stats.ipm, 2)} ipm · HK ${stats.hk} · f = ${stats.f}`">
          <div class="row sans"><Dots :dots="stats.dots" :ipm="stats.ipm" :hk="stats.hk" :f="stats.f" :N="stats.N" /></div>
          <p class="small sans" style="margin:.3rem 0">f = {{ stats.f }} із N = {{ fmtNum(stats.N) }} слів · {{ fmtNum(stats.ipm, 2) }} ipm · HK {{ stats.hk }}
            <span class="muted"> (шкала леми; fMax оцінено як f<sub>леми</sub>·2<sup>HK</sup>)</span></p>
          <p class="small sans">частка леми «{{ pick.lemma }}»: {{ fmtNum(stats.shareOfLemma * 100, 1) }}% (f = {{ full!.stats.f }})</p>
          <p v-if="stats.dp !== undefined" class="small sans">Рівномірність за епохами (1 − DP): <strong>{{ fmtNum(1 - stats.dp, 2) }}</strong>
            <span class="muted"> · присутнє в {{ stats.epochRange }} епохах (за розміщеними клітинками)</span></p>
          <p v-else class="small sans muted">DP: немає розміщених токенів, щоб його обчислити.</p>
          <table v-if="stats.byEpoch.length" class="small sans" style="border-collapse:collapse;width:100%">
            <thead><tr><th scope="col" style="text-align:left">епоха</th><th scope="col">f</th><th scope="col">N</th><th scope="col">ipm</th></tr></thead>
            <tbody><tr v-for="e in stats.byEpoch" :key="e.epoch"><td>{{ e.epoch.replace('shev.', '') }}</td><td>{{ e.f }}</td><td>{{ fmtNum(e.N) }}</td><td>{{ fmtNum(e.ipm, 1) }}</td></tr></tbody>
          </table>
          <p class="small sans muted">Розподіл за епохами — нижня межа: лише токени, розміщені в клітинках парадигми (P-3.1).</p>
        </Panel>
      </aside>
    </div>
  </template>
</template>
