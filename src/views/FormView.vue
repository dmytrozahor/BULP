<script setup lang="ts">
import { formContactClaims } from '../lib/contactLayer.ts'
import { featureChips } from '../../core/feature-chips.ts'
/**
 * BL-6 form page /f/:form — everything for exactly one spelling of a lemma: its KWIC, epoch cells, witnesses, f / ipm / HK / DP with denominators (lib/formStats.ts),
 * the derivation trace and the claims. All of it comes from the lemma's detail shard (fullOf). Several lemmas can share a spelling: ?lemma= picks one.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { key } from '../../core/text.ts'
import { ixHitMap, ixLoaded } from '../lib/parts.ts'
import { useData } from '../composables/useData.ts'
import { epochShort, fmtDate, fmtNum } from '../lib/format.ts'
import { formRegions, formStats, restrictEpochs } from '../lib/formStats.ts'
import ClaimBadge from '../components/ClaimBadge.vue'
import SociolectBadges from '../components/SociolectBadges.vue'
import ModernBadges from '../components/ModernBadges.vue'
import LoanAdaptBlock from '../components/LoanAdaptBlock.vue'
import UnlinkedSpelling from '../components/UnlinkedSpelling.vue'
import ClaimSet from '../components/ClaimSet.vue'
import DialectBlock from '../components/DialectBlock.vue'
import CircReadings from '../components/CircReadings.vue'
import { hasCirc } from '../../core/ocirc.ts'
import { PRONOUN_VARIANTS, deriveAll } from '../../core/pronoun-variants.ts'
import { segment } from '../../core/deictics.ts'
import DerivationSteps from '../components/DerivationSteps.vue'
import LemmaBlocks from '../components/LemmaBlocks.vue'
import PlastSenses from '../components/PlastSenses.vue'
import SenseEpochs from '../components/SenseEpochs.vue'
import FormStress from '../components/FormStress.vue'
import Dots from '../components/Dots.vue'
import EpochParadigm from '../components/EpochParadigm.vue'
import Kwic from '../components/Kwic.vue'
import Panel from '../components/Panel.vue'
import CardTabs from '../components/CardTabs.vue'
import CardLayout from '../components/CardLayout.vue'
import OverviewTab from '../components/OverviewTab.vue'
import RegionBars from '../components/RegionBars.vue'
import Spell from '../components/Spell.vue'
import ViewSwitch from '../components/ViewSwitch.vue'
import AttestGraph from '../components/AttestGraph.vue'
import type { TPoint } from '../lib/graphLayout.ts'
import RegionMap from '../components/RegionMap.vue'
import { paradigmKindOf } from '../lib/ux.ts'
import { isOldForm, witnessTo } from '../lib/nav.ts'

const props = defineProps<{ form: string }>()
const route = useRoute()
const { byLemma, loaded, corpus, fullOf, detailError, witnessById } = useData()

/** every (lemma, spelling) whose raw spelling is this one; falls back to the normalised key (KWIC nodes keep the surface case) */
/** SPEC 63 PF: the lemmas that own a spelling come from the prefix shard of its key (ix/), their cards from the cd shards */
const hitLemmas = computed(() => [...new Set((ixHitMap.get(key(props.form)) ?? []).map(h => h.lemma))])
const resolving = computed(() => !ixLoaded(key(props.form)) || hitLemmas.value.some(l => !byLemma.value.get(l)))
const matches = computed(() => {
  if (!loaded.value || resolving.value) return []
  const exact = (f: { raw: string }) => f.raw === props.form, loose = (f: { raw: string }) => key(f.raw) === key(props.form)
  for (const test of [exact, (f: { raw: string }) => f.raw.toLowerCase() === props.form.toLowerCase(), loose]) {
    const out = hitLemmas.value.flatMap(l => (byLemma.value.get(l)?.forms ?? []).filter(test).map(f => ({ lemma: l, raw: f.raw })))
    if (out.length) return out
  }
  return []
})
const pick = computed(() => matches.value.find(m => m.lemma === route.query.lemma) ?? matches.value[0])
const core = computed(() => (pick.value ? byLemma.value.get(pick.value.lemma) : undefined))
const full = computed(() => fullOf(core.value))
const fc = computed(() => full.value?.forms.find(f => f.raw === pick.value?.raw))
const err = computed(() => pick.value ? detailError.get(pick.value.lemma) : undefined)
const epochs = computed(() => restrictEpochs(full.value?.epochs, pick.value?.raw ?? ''))
const stats = computed(() => fc.value && full.value && corpus.value
  ? formStats(fc.value, full.value.stats, epochs.value, { N: corpus.value.N, epoch: corpus.value.epochSizes }) : undefined)
const byRegion = computed(() => fc.value ? formRegions(fc.value.byW ?? fc.value.kwic, corpus.value?.regions, w => witnessById.value.get(w)?.region) : [])
const kind = computed(() => paradigmKindOf(core.value))
const epochKinds = computed(() => kind.value === 'noun' || kind.value === 'pron')
const link = computed(() => fc.value && isKnown(fc.value.link) ? fc.value.link.value : undefined)
/** MM-9 rule 2: the contact-layer label (суржик, русизм, покруч) lives here, on the form, never on the lemma card */
const contactClaims = computed(() => formContactClaims(fc.value))
/** MM-16: feature chips (cited spelling / pronunciation rules visible in this spelling), qualified by the witness: edition orthography vs author's dialect vs older form. NOT a contact label. */
const featChips = computed(() => {
  const f = fc.value; if (!f) return []
  const w = witnessById.value.get(f.kwic[0]?.w ?? Object.keys(f.byW ?? {})[0] ?? '')
  const author = corpus.value?.authors.find(a => a.id === w?.author)
  return featureChips(f.derivation.map(s => s.rule), { orth: w?.orth, edition: w?.edition, authorRegion: author?.region, witnessRegion: w?.region, year: f.date?.[0] })
})
const rusyn = computed(() => fc.value?.claims.rusyn)
const labelClaims = computed(() => Object.fromEntries(Object.entries(fc.value?.claims ?? {}).filter(([k]) => k !== 'rusyn')))
/** SPEC 63 DP-2/DX-2: a spelling the corpus lacks may still be a rule-derived pronoun variant or a segmentable deictic: it gets a page too */
const derivedOnly = computed(() => {
  if (!loaded.value || resolving.value || pick.value) return undefined
  for (const std of new Set(PRONOUN_VARIANTS.map(v => v.std))) { const s = byLemma.value.get(std); const h = s && deriveAll(std, s.paradigm).find(d => d.form === props.form); if (h) return { kind: 'dp' as const, h } }
  const sg = segment(props.form)[0]; return sg ? { kind: 'dx' as const, sg } : undefined
})
const regionNames = computed(() => byRegion.value.filter(r => r.f).map(r => ({ name: corpus.value?.regions.find(x => x.code === r.code)?.name ?? r.code, f: r.f })))
/** SPEC 63 UI-2: chronology of the spelling = one dot per witness (x = composition year, r ∝ √f, colour = witness type); dot → /witness page like the list */
const witKind = (t: string) => /chron|літопис/i.test(t) ? 'chronicle' : /folk|song|фольк/i.test(t) ? 'folk' : 'other'
const witPoints = computed<TPoint[]>(() => (stats.value?.witnesses ?? []).flatMap(w => {
  const x = witnessById.value.get(w.w)
  return x ? [{ id: w.w, label: x.title.slice(0, 18), year: (x.date[0] + x.date[1]) / 2, f: w.lines, kind: witKind(x.witnessType), to: witnessTo(w.w), title: x.title }] : []
}))
const chainDates = computed(() => fc.value ? { [fc.value.raw]: fmtDate(fc.value.date) } : {})
const wTitle = (id: string) => witnessById.value.get(id)?.title ?? id
</script>

<template>
  <div v-if="!loaded || resolving"><div class="skeleton" style="height:3rem;width:50%" /><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <template v-else-if="!pick && derivedOnly">
    <header class="wordhead headline"><h1 class="lemma">{{ form }}</h1>
      <p class="hl-line sans"><span class="derived-badge">{{ derivedOnly.kind === 'dp' ? 'виведено за правилом DP' : 'складено за афіксами DX' }}</span> <span class="muted">у словнику такого написання немає (P-1.7: виведена форма не є свідченням)</span>
        <template v-if="derivedOnly.kind === 'dp'"> · <span class="muted">зв’язок: </span>dialect-variant «{{ derivedOnly.h.variant }}» → <RouterLink :to="`/w/${derivedOnly.h.std}`">{{ derivedOnly.h.std }}</RouterLink> ({{ derivedOnly.h.rule }})</template></p></header>
    <Panel id="f-dia" :open="true" title="Діалект · Dialect" summary="ознаки, клас форм, літературний відповідник"><DialectBlock :spelling="form" /></Panel>
    <LoanAdaptBlock :word="form" />
    <UnlinkedSpelling :form="form" quiet />
  </template>
  <UnlinkedSpelling v-else-if="!pick" :form="form" />
  <template v-else>
    <header class="wordhead headline compact">
      <h1 :class="['lemma', { old: isOldForm(pick.raw, fc?.date?.[1]) }]"><Spell :w="fc?.modern ?? pick.raw" :raw="pick.raw" /></h1>
      <SociolectBadges :word="pick.raw" /><ModernBadges :word="pick.raw" /><LoanAdaptBlock :word="pick.raw" />
      <p class="hl-line sans"><span class="muted">написання леми </span><RouterLink :to="`/w/${pick.lemma}`">{{ pick.lemma }}</RouterLink>
        <template v-if="fc"><span class="muted"> · найраніше: </span>{{ fmtDate(fc.date) }}<span v-if="fc.ocrOnly" class="muted"> (лише OCR низької якості, не свідчення)</span></template>
        <template v-if="link"><span class="muted"> · зв’язок: </span>{{ link.route }}<template v-if="link.form !== pick.lemma"> → {{ link.form }}</template></template></p>
      <p v-for="c in featChips" :key="c.rule" class="hl-line sans small" data-testid="form-feature"><span class="badge" :title="c.cite.quote">{{ c.feature }}</span> {{ c.text }} <span class="muted">· {{ c.rule }} · <a :href="c.cite.source" target="_blank" rel="noopener">джерело правила ↗</a></span></p>
      <p v-if="Object.keys(contactClaims).length" class="hl-line sans small" data-testid="form-contact"><span class="badge">контактне / суржик</span> <ClaimSet :claims="contactClaims" /></p>
      <FormStress :form="pick.raw" :lemma="pick.lemma" :lemma-stress="full?.stress" />   <!-- SPEC 63 CP-2 / CP-10.5: stress of the spelling (GG-14), else the lemma's, else the honest none -->
      <LoanAdaptBlock v-if="pick.lemma.toLowerCase() !== pick.raw.toLowerCase()" :word="pick.lemma" />   <!-- CP-10.5: loan adaptation of the lemma when the spelling is another word-form -->
      <p v-if="matches.length > 1" class="small sans muted">Те саме написання в інших лемах:
        <template v-for="m in matches.filter(x => x.lemma !== pick!.lemma)" :key="m.lemma"><RouterLink :to="{ path: `/f/${m.raw}`, query: { lemma: m.lemma } }">{{ m.lemma }}</RouterLink>{{ ' ' }}</template></p>
      <p v-if="err" class="small sans unk" role="alert">Не вдалося завантажити деталі: {{ err }}</p>
    </header>
    <div v-if="!fc && !err" class="skeleton" style="height:8rem" />
    <CardLayout v-else-if="fc && stats">
    <CardTabs>
      <template #overview>
        <OverviewTab :lemma="pick.lemma" :spelling="pick.raw" :kwic="fc.kwic" :by-region="byRegion" map-panel="f-reg" labels-panel="t-lab" :pron-word="pick.lemma" :stress="full?.stress" :stress-loaded="!!full" origin-panel="f-der" :origin-line="fc ? `найраніше засвідчене написання «${fc.raw}»: ${fmtDate(fc.date)}${fc.ocrOnly ? ' (лише OCR низької якості, не свідчення)' : ''} · норма ${fc.norm} → сучасна ${fc.modern}` : undefined" :paradigm="full?.paradigm" :paradigm-kind="kind" />
      </template>
      <template #forms>
        <Panel id="f-ep" :open="false" :count="stats.byEpoch.length" title="Клітинки за епохами" :summary="`розміщено токенів: ${stats.placed}`" :empty="!epochKinds"
          info="Лише клітинки, де стоїть це написання (з парадигм леми); токени без розмітки сюди не потрапляють.">
          <EpochParadigm v-if="epochKinds" no-legend :kind="kind" :epochs="epochs" :spellings="[pick.raw]" />
          <p v-else class="small sans muted">Історичні парадигми для цієї частини мови ще не побудовано.</p>
        </Panel>
        <Panel v-if="hasCirc(pick.raw)" id="f-circ" :open="true" title="Можливі читання · ô/ê" summary="читання літери з джерелами; IPA як говіркові варіанти"><CircReadings :spelling="pick.raw" /></Panel>
        <LemmaBlocks kind="form" :lemma="pick.lemma" :spelling="pick.raw" :labels="false" tab="forms" />
      </template>
      <template #history>
        <Panel id="f-der" :open="true" :count="fc.derivation.length" title="Виведення · Derivation" :summary="fc.derivation.length ? `${fc.derivation.length} кроків → ${fc.modern}` : `без змін → ${fc.modern}`">
          <p class="sans small"><span class="muted">норма: </span>{{ fc.norm }} <span class="muted"> · сучасна: </span>{{ fc.modern }}</p>
          <DerivationSteps :steps="fc.derivation" :uid="pick.raw" :dates="chainDates" :lemma="pick.lemma" panel="chain" />
        </Panel>
        <LemmaBlocks kind="form" :lemma="pick.lemma" :spelling="pick.raw" :labels="false" tab="history" />
      </template>
      <template #meanings>
        <Panel id="f-cl" :open="false" :count="Object.keys(fc.claims).length" title="Мітки · Claims" :summary="Object.keys(fc.claims).length ? Object.keys(fc.claims).join(', ') : 'міток із доказами немає'" :empty="!Object.keys(fc.claims).length">
          <ClaimSet v-if="Object.keys(labelClaims).length" :claims="labelClaims" />
          <p v-if="rusyn && isKnown(rusyn)" class="sans small"><span class="muted">русинське прочитання: </span><ClaimBadge :claim="rusyn" :text="String(rusyn.value)" /></p>
          <p v-if="fc.hints.length" class="small sans muted">підказки (вага 0): {{ fc.hints.join(', ') }}</p>
        </Panel>
        <SenseEpochs :word="pick.lemma" kind="full" />   <!-- SPEC 63 SE-5/SE-6 «Значення за епохами», after the derivation block -->
        <PlastSenses :word="pick.lemma" />
        <LemmaBlocks kind="form" :lemma="pick.lemma" :spelling="pick.raw" :labels="false" tab="meanings" />
      </template>
      <template #spread>
        <Panel id="f-dia" :open="false" title="Діалект · Dialect" summary="ознаки, клас форм, літературний відповідник"><DialectBlock :spelling="pick.raw" :lemma="pick.lemma" :regions="regionNames" /></Panel>
        <Panel id="f-reg" :open="false" :count="byRegion.filter(r => r.f).length" title="Карта · регіон пам’ятки" :summary="`${byRegion.filter(r => r.f).length} регіонів${fc.byW ? '' : ' у прикладах'}`" :empty="!byRegion.length"
          info="Регіон пам’ятки, а не діалектна мітка (SPEC 20 B-3.6).">
          <RegionMap :by="byRegion" />
          <p class="small sans muted">f у регіоні — <template v-if="fc.byW">усі токени цього написання в пам’ятках регіону</template><template v-else>наведені приклади (≤ 6): нижня межа</template>; N — токени всіх пам’яток регіону.</p>
        </Panel>
        <LemmaBlocks kind="form" :lemma="pick.lemma" :spelling="pick.raw" :labels="false" tab="spread" />
      </template>
      <template #sources>
        <Panel id="f-kw" :open="true" :count="fc.kwic.length" title="Приклади · KWIC" :summary="`${fc.kwic.length} із f = ${stats.f}`" :empty="!fc.kwic.length">
          <Kwic :lines="fc.kwic" :lemma="pick.lemma" />
        </Panel>
        <Panel id="f-wit" :open="true" :count="stats.witnesses.length" title="Пам’ятки" :summary="stats.trueCounts ? `${stats.witnesses.length} пам’яток, усі ${stats.f} токенів` : `${stats.witnesses.length} у прикладах`" :empty="!stats.witnesses.length">
          <ViewSwitch panel="witnesses"><template #graph><AttestGraph :points="witPoints" label="Хронологія пам’яток" /></template><template #list>
          <ul class="sans small" style="list-style:none;padding:0;margin:0">
            <li v-for="w in stats.witnesses" :key="w.w" style="margin:.2rem 0"><RouterLink v-if="witnessById.get(w.w)" :to="witnessTo(w.w)">{{ wTitle(w.w) }}</RouterLink><template v-else>{{ wTitle(w.w) }}</template>
              <span class="count-n"> · {{ stats.trueCounts ? 'токенів' : 'прикладів' }}: {{ w.lines }}</span></li>
          </ul></template></ViewSwitch>
          <p v-if="stats.trueCounts" class="small sans muted">Точні лічильники: кожен пов’язаний токен цього написання, за пам’ятками (BL-6c).</p>
          <p v-else class="small sans muted">Перелік за наведеними прикладами (≤ 6): ці дані збудовано до BL-6c — нижня межа.</p>
        </Panel>
      </template>
    </CardTabs>
    <template #side>
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
            <tbody><tr v-for="e in stats.byEpoch" :key="e.epoch"><td>{{ epochShort(e.epoch) }}</td><td>{{ e.f }}</td><td>{{ fmtNum(e.N) }}</td><td>{{ fmtNum(e.ipm, 1) }}</td></tr></tbody>
          </table>
          <p class="small sans muted">Розподіл за епохами — нижня межа: лише токени, розміщені в клітинках парадигми (P-3.1).</p>
        </Panel>
        <Panel id="f-sr" :open="true" title="За регіонами" summary="ipm у регіоні = f / N слів пам’яток регіону"><RegionBars :by="byRegion" /></Panel>
    </template>
    </CardLayout>
  </template>
</template>
