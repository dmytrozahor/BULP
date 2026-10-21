<script setup lang="ts">
/**
 * DWDS-like word card, research/07 §3.1 (two columns; stacked on mobile). SPEC 61 UX: summary first, evidence on demand — a headline (lemma · POS · stress · IPA ·
 * first attestation · ≤ 5 key chips), then collapsible panels with one-line summaries (Panel.vue). Nothing is removed (Evidence Invariant): every claim is still one tap away.
 * SPEC 20 B-5: the header, provenance, labels and paradigm render from the CORE card at once; KWIC, stress, the timeline and the statistics come from the lemma's detail shard
 * (`full` = merged LemmaCard, undefined while the shard loads) and show a placeholder until then.
 * SPEC 61 FX-5: the paradigm panels follow the lemma's paradigm kind (lib/ux.ts paradigmKindOf — data field if present, else VESUM tags).
 */
import { computed, defineAsyncComponent, nextTick, reactive, ref, watch } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { assignEpoch } from '../../core/epochs.ts'
import type { Claim } from '../../core/evidence.ts'
import { STAT_CITES } from '../../core/stats.ts'
import { toIpa } from '../../core/ipa.ts'
import { renderStress } from '../../core/text.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { epochName, fmtDate, fmtNum, labelUk, WTYPE_UK } from '../lib/format.ts'
import { sourceLink } from '../lib/source.ts'
import { isOldForm, textTo, witnessTo } from '../lib/nav.ts'
import { reconstruct } from '../lib/derive.ts'
import { groupFormClaims, KIND_UK, paradigmKindOf, placedCells, topForms } from '../lib/ux.ts'
import AuthorBadge from '../components/AuthorBadge.vue'
import ClaimBadge from '../components/ClaimBadge.vue'
import ClaimSet from '../components/ClaimSet.vue'
import FormLegend from '../components/FormLegend.vue'
import EpochParadigm from '../components/EpochParadigm.vue'
import Collocations from '../components/Collocations.vue'
import PhrasePanel from '../components/PhrasePanel.vue'
import Dots from '../components/Dots.vue'
import EpochBars from '../components/EpochBars.vue'
import EvidencePopover from '../components/EvidencePopover.vue'
import StressNote from '../components/StressNote.vue'
import StatsExplainer from '../components/StatsExplainer.vue'
import Kwic from '../components/Kwic.vue'
import Paradigm from '../components/Paradigm.vue'
import Panel from '../components/Panel.vue'
import ProvenanceTimeline from '../components/ProvenanceTimeline.vue'
import StressForms from '../components/StressForms.vue'
import RegionMap from '../components/RegionMap.vue'
import BankChip from '../components/BankChip.vue'
import PlaceBlock from '../components/PlaceBlock.vue'
import UsageChips from '../components/UsageChips.vue'
import SociolectBadges from '../components/SociolectBadges.vue'
import PlastSenses from '../components/PlastSenses.vue'
import ModernBadges from '../components/ModernBadges.vue'
import LoanAdaptBlock from '../components/LoanAdaptBlock.vue'
import EtymologyBlock from '../components/EtymologyBlock.vue'
import CognatesPanel from '../components/CognatesPanel.vue'
import TimeCurve from '../components/TimeCurve.vue'
import DeicticStructure from '../components/DeicticStructure.vue'
import DialectVariants from '../components/DialectVariants.vue'
import HeteronymReadings from '../components/HeteronymReadings.vue'
import SensesBlock from '../components/SensesBlock.vue'
import SenseEpochs from '../components/SenseEpochs.vue'
import { sensesOf, sensesSummary } from '../lib/sensesData.ts'
import LoanChip from '../components/LoanChip.vue'
import IpaRow from '../components/IpaRow.vue'
import IkavismChain from '../components/IkavismChain.vue'
import DerivativesBlock from '../components/DerivativesBlock.vue'
import WitnessBlock from '../components/WitnessBlock.vue'
import DialectBlock from '../components/DialectBlock.vue'
import DerivationSteps from '../components/DerivationSteps.vue'
import { formsWitnesses } from '../lib/refKwic.ts'
const AnalyzeView = defineAsyncComponent(() => import('./AnalyzeView.vue'))   // UX-7: words outside the lexicon fall back to the rule-based analysis

const props = defineProps<{ lemma: string }>()
const { byLemma, loaded, corpus, witnessById, fullOf, detailError, searchIdx, att } = useData()
const card = computed(() => byLemma.value.get(props.lemma))
const full = computed(() => fullOf(card.value))
const epochs = computed(() => full.value?.epochs)   // SPEC 50: LemmaDetail.epochs, carried by mergeCard
const err = computed(() => detailError.get(props.lemma))
const active = ref<string | null>(null), nForms = ref(60), allForms = ref(false)   // F2: frequent lemmas have hundreds of spellings — paged chips
/** which panels are open: Provenance by default; the rest collapsed behind their one-line summary (UX-2) */
const ui = reactive({ prov: true, lab: false, par: false, ep: false, kw: false, st: false })
watch(() => props.lemma, () => { active.value = null; allForms.value = false; Object.assign(ui, { prov: true, lab: false, par: false, ep: false, kw: false, st: false }) })
const kind = computed(() => paradigmKindOf(card.value))
const lemmaSenses = computed(() => (card.value ? sensesOf(card.value.lemma) : []))   // BL-9
const isNoun = computed(() => kind.value === 'noun')
const epochKinds = computed(() => kind.value === 'noun' || kind.value === 'pron' || kind.value === 'verb')   // SPEC 50: epoch grids are built for nouns, pronouns, and (BL-8) verbs
const showKwic = (raw: string) => { active.value = raw; ui.kw = true; nextTick(() => document.getElementById('h-kw')?.scrollIntoView({ block: 'start' })) }
const toggle = (raw: string) => (active.value = active.value === raw ? null : raw)

const first = computed(() => card.value && isKnown(card.value.first) ? card.value.first.value : undefined)
const firstW = computed(() => first.value ? witnessById.value.get(first.value.witness) : undefined)
const firstWho = computed(() => first.value ? authorInfo(first.value.author, firstW.value).name : '')
/** Legend samples from this lemma's own data: an attested spelling, plus the reverse() reconstructions of the lemma (confirmed by a spelling in the corpus / hypothesis only). */
const legendOpen = ref(false)
const legendSample = computed(() => {
  const c = card.value, out: { attested?: string; derived?: string; confirmed?: string } = { attested: c?.forms[0]?.raw }
  if (c && loaded.value && legendOpen.value) {   // PF: the reconstruction (many ix lookups) runs only when the legend is opened
    try {
      for (const r of reconstruct(c.lemma, searchIdx.value, byLemma.value, att.value).candidates) {
        if (r.status === 'confirmed-by-attestation') out.confirmed ??= r.form; else out.derived ??= r.form
        if (out.confirmed && out.derived) break
      }
    } catch { /* legend falls back to the neutral sample */ }
  }
  return out
})
/** locator, witness type, coFirst and the evidence live in the detail shard (B-5a amendment 2026-10-12) */
const firstF = computed(() => full.value && isKnown(full.value.first) ? full.value.first.value : undefined)
const firstLink = computed(() => firstF.value ? sourceLink(firstW.value, firstF.value.loc) : undefined)
const kwic = computed(() => (full.value?.forms ?? []).filter(f => !active.value || f.raw === active.value).flatMap(f => f.kwic))
const activeForm = computed(() => card.value?.forms.find(f => f.raw === active.value))
/** dialect claims + the optional lemma-level rusyn claim (B0 contract), shown as parallel readings by ClaimSet */
const dialects = computed(() => {
  const ru = card.value?.claims.rusyn
  return [...Object.entries(card.value?.claims.dialect ?? {}), ...(ru && isKnown(ru) ? [[ru.value, ru] as [string, Claim<unknown>]] : [])]
})
/** SPEC 60 BK-2: every spelling with its attestation year (detail shard); without dates the date gate cannot be applied, so no chip */
const bankForms = computed(() => (full.value?.forms ?? []).map(f => ({ form: f.raw, norm: f.norm, year: f.date[0], scribal: !!f.claims.church_slavonic })))
const witnesses = computed(() => formsWitnesses(full.value?.forms ?? []))   // SPEC 63 CP-2: the «Пам’ятки» graph / list of the form page, summed over the lemma's spellings
/** SPEC 63 CP-2: the derivation chain and the dialect block of the full card for ONE spelling: the chip the reader picked, else the oldest spelling with a derivation (as the form page shows it) */
const chosen = computed(() => { const fs = full.value?.forms ?? []; return fs.find(f => f.raw === active.value) ?? [...fs].filter(f => f.derivation.length).sort((a, b) => a.date[0] - b.date[0])[0] ?? fs[0] })
const chosenDates = computed(() => chosen.value ? { [chosen.value.raw]: fmtDate(chosen.value.date) } : {})
const epochClaims = computed(() => first.value ? (['shev', 'wl'] as const).map(s => ({ s, c: assignEpoch(first.value!.date, s) })) : [])
const epText = (c: ReturnType<typeof assignEpoch>) => (isKnown(c) ? c.value.epochs.map(epochName).join(' / ') + ` · ${c.value.confidence}` : 'невідомо')
/** UX-4: identical per-spelling label sets are shown once with «у N формах» */
const formLabelGroups = computed(() => groupFormClaims((card.value?.forms ?? []).filter(f => !active.value || f.raw === active.value)))

// ── UX-5 form chips: the 6 most frequent + «+N»; expanded view grouped by epoch ──
const freq = computed(() => full.value ? new Map(full.value.forms.map(f => [f.raw, f.f])) : undefined)
const top = computed(() => topForms(card.value?.forms ?? [], freq.value, 6))
const chipForms = computed(() => {
  const t = top.value.shown
  return active.value && !t.some(f => f.raw === active.value) && activeForm.value ? [...t, activeForm.value] : t
})
const epochGroups = computed(() => {
  const g = new Map<string, string[]>()
  ;(card.value?.forms ?? []).slice(0, nForms.value).forEach((f, i) => {
    const e = full.value?.forms[i]?.epochs?.[0], k = e ? epochName(e) : 'епоха невідома'
    g.set(k, [...(g.get(k) ?? []), f.raw])
  })
  return [...g.entries()]
})

// ── UX-1 headline ──
const stress1 = computed(() => full.value?.stress[0])
const ipa1 = computed(() => { try { const v = stress1.value; return toIpa(v ? v.form : card.value!.lemma, v ? v.positions : null).ipa } catch { return '' } })
const keyChips = computed(() => {
  const c = card.value!.claims
  return { origin: isKnown(c.origin), register: isKnown(c.register), surzhyk: isKnown(c.surzhyk), dialect: dialects.value.length > 0 }
})
const nKnownChips = computed(() => Object.values(keyChips.value).filter(Boolean).length)

// ── UX-2 one-line summaries ──
/** BL-20: attested forms with the second palatalization (R24) */
const pal = computed(() => { const c = card.value?.claims.palatalization; return c && isKnown(c) ? { claim: c, forms: c.value.forms } : undefined })
const labParts = computed(() => {
  const c = card.value!.claims, p: string[] = []
  if (pal.value) p.push(`друга палаталізація: ${pal.value.forms.length}`)
  if (isKnown(c.origin)) p.push(labelUk(String(c.origin.value)))
  if (isKnown(c.register)) p.push('розмовне')
  if (isKnown(c.surzhyk)) p.push('суржик')
  if (dialects.value.length) p.push(`діалекти: ${dialects.value.length}`)
  const ec = epochClaims.value[0]
  if (ec && isKnown(ec.c)) p.push(`епоха: ${ec.c.value.epochs.map(epochName).join(' / ')}`)
  if (formLabelGroups.value.length) p.push(`мітки написань: ${formLabelGroups.value.length} груп`)
  return p
})
const provSummary = computed(() => first.value ? `${fmtDate(first.value.date)} · ${first.value.form} · ${card.value!.forms.length} написань` : '')
const parSummary = computed(() => kind.value === 'uninflected' ? 'незмінне слово' : `${KIND_UK[kind.value]} · ${card.value!.paradigm.length} форм ВЕСУМ`)
const placed = computed(() => placedCells(epochs.value))
const epLoading = computed(() => !full.value && !err.value)
const epSummary = computed(() => epLoading.value ? 'завантаження…' : !epochKinds.value ? `для частини мови «${KIND_UK[kind.value]}» історичні парадигми ще не побудовано` : placed.value ? `розміщено клітинок: ${placed.value} · N = ${(epochs.value?.paradigms ?? []).reduce((n, p) => n + p.N, 0)}` : '')
const epEmpty = computed(() => !epLoading.value && (!epochKinds.value || !epochs.value || placed.value === 0))
</script>

<template>
  <div v-if="!loaded"><div class="skeleton" style="height:3rem;width:50%" /><div class="skeleton" v-for="i in 5" :key="i" /></div>
  <template v-else-if="!card">
    <div class="card" role="status">
      <h1>«{{ lemma }}» — немає в корпусі</h1>
      <p class="sans">Немає в корпусі — аналіз за правилами. Нижче — розбір у браузері (будова, деривація, шлях запозичення, омографи, русинська, IPA), лише за правилами з джерелами.
        <RouterLink :to="{ path: '/analyze', query: { q: lemma } }">Відкрити в «Аналізі слова» →</RouterLink> · <RouterLink to="/">до пошуку</RouterLink></p>
    </div>
    <AnalyzeView :embed="lemma" />
  </template>
  <template v-else>
    <header class="wordhead headline compact">
      <h1 :class="['lemma', { old: isOldForm(card.lemma) }]">{{ card.lemma }}</h1>
      <p class="hl-line row"><span class="muted sans">{{ card.pos }}</span>
        <template v-if="stress1"><span class="muted sans">·</span>
          <template v-for="(sv, i) in full!.stress" :key="i"><span v-if="i" class="muted sans">/</span>
            <EvidencePopover :evidence="sv.evidence" :heading="`Наголос: ${renderStress(sv.form, sv.positions)}`" :meta="`метод: ${sv.method}`" :label="renderStress(sv.form, sv.positions)">
              <strong style="font-size:1.1rem">{{ renderStress(sv.form, sv.positions) }}</strong></EvidencePopover></template>
          <StressNote v-if="full!.stress.some(v => v.status === 'unknown')" :variants="full!.stress" /></template>
        <span v-else-if="full" class="unk small sans" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">наголос не встановлено</span>
        <span v-else-if="!err" class="muted small sans">наголос: завантаження…</span>
        <template v-if="ipa1"><span class="muted sans">·</span><span class="sans" :title="'IPA виведено за правилами (P-1.7), не словникова вимова'">{{ ipa1 }}</span></template></p>
      <p class="hl-line sans"><span class="muted">Перша фіксація: </span>
        <ClaimBadge v-if="first" :claim="(full ?? card).first" :text="`${fmtDate(first.date)} · ${firstWho}`" />
        <ClaimBadge v-else :claim="card.first" /></p>
      <div class="hl-chips sans">
        <ClaimBadge v-if="keyChips.origin" :claim="card.claims.origin" :text="labelUk(String(card.claims.origin.value))" :tone="card.claims.origin.value === 'church_slavonic' ? 'cs' : ''" />
        <ClaimBadge v-if="keyChips.register" :claim="card.claims.register" text="розмовне" tone="colloquial" />
        <ClaimBadge v-if="keyChips.surzhyk" :claim="card.claims.surzhyk" text="суржик" tone="contact" />
        <ClaimSet v-if="keyChips.dialect" :claims="Object.fromEntries(dialects)" />
        <LoanChip :word="card.lemma" />
        <span v-if="!nKnownChips" class="muted small">міток із доказами немає</span>
        <button type="button" class="chip small sans" :aria-expanded="ui.lab && ui.prov" @click="ui.lab = true; ui.prov = true">докладніше ▾</button>
      </div>
      <p v-if="err" class="small sans unk" role="alert">Не вдалося завантажити деталі слова (приклади, наголос, статистика): {{ err }}</p>
      <div class="chips" role="group" aria-label="Історичні написання (фільтр панелей)">
        <button v-for="f in chipForms" :key="f.raw" type="button" class="chip" :aria-pressed="active === f.raw" @click="toggle(f.raw)">{{ f.raw }}</button>
        <button v-if="top.rest" type="button" class="chip sans small" :aria-expanded="allForms" @click="allForms = !allForms">{{ allForms ? 'згорнути' : `+${top.rest}` }}</button>
        <RouterLink v-if="active" class="chip sans small" :to="{ path: `/f/${active}`, query: { lemma: card.lemma } }">сторінка форми «{{ active }}» →</RouterLink>
        <button v-if="active" type="button" class="chip sans small" @click="active = null">× усі форми</button>
      </div>
      <div v-if="allForms" class="allforms">
        <div v-for="[ep, raws] in epochGroups" :key="ep" class="fgroup"><span class="count-n">{{ ep }}:</span>
          <button v-for="r in raws" :key="r" type="button" class="chip" :aria-pressed="active === r" @click="toggle(r)">{{ r }}</button></div>
        <button v-if="card.forms.length > nForms" type="button" class="chip sans small" @click="nForms += 200">ще {{ card.forms.length - nForms }} написань…</button>
      </div>
      <p v-if="active" class="small sans muted">Панелі відфільтровано за написанням «{{ active }}».</p>
    </header>

    <details class="legendbox" @toggle="legendOpen = ($event.target as HTMLDetailsElement).open"><summary class="small sans muted">Умовні позначення форм</summary>
      <FormLegend :epoch="isNoun" :attested="legendSample.attested" :derived="legendSample.derived" :confirmed="legendSample.confirmed" /></details>
    <div class="cols">
      <div>
        <!-- 1. Provenance -->
        <Panel id="h-prov" v-model:open="ui.prov" title="Походження · Provenance" :summary="provSummary" :empty="!first">
          <div v-if="first && card.first.value !== 'unknown'">
            <p class="sans"><span class="muted">Перша фіксація: </span>
              <ClaimBadge :claim="(full ?? card).first" :text="`${fmtDate(first.date)} · ${first.form}`" /></p>
            <ul class="sans small" style="list-style:none;padding:0;margin:0 0 .8rem">
              <li><span class="muted">автор: </span><AuthorBadge :author="first.author" :witness="first.witness" /></li>
              <li><span class="muted">пам’ятка: </span><RouterLink v-if="firstW" :to="witnessTo(firstW.id)">{{ firstW.title }}</RouterLink><template v-else>{{ first.witness }}</template>
                · <span class="muted">локатор:</span> <RouterLink v-if="firstF && firstW" :to="textTo(firstW.id, firstF.loc)">{{ firstF.loc }}</RouterLink><template v-else-if="firstF">{{ firstF.loc }}</template><template v-else-if="!err">…</template>
                <template v-if="firstLink"> · <a class="srclink" :href="firstLink.url" target="_blank" rel="noopener">оригінал ↗</a></template></li>
              <li><span class="muted">дата: </span>{{ fmtDate(first.date) }}
                <EvidencePopover v-if="firstW" :evidence="[firstW.dateCite]" heading="Датування пам’ятки" label="датування"><span class="badge">ⓘ джерело дати</span></EvidencePopover>
                <template v-if="firstF"> · <span class="muted">тип свідчення: </span>{{ WTYPE_UK[firstF.witnessType] ?? firstF.witnessType }}</template></li>
              <li v-if="firstF?.coFirst.length"><span class="muted">співпершими: </span>{{ firstF.coFirst.join(', ') }}</li>
              <li v-if="full && isKnown(full.claims.oldest)"><span class="muted">найдавніша форма: </span>
                <ClaimBadge :claim="full.claims.oldest" :text="(full.claims.oldest.value as any).form" /></li>
              <li v-else-if="!full && !err" class="muted">найдавніша форма: завантаження…</li>
            </ul>
          </div>
          <p v-else class="sans"><span class="muted">Перша фіксація: </span><ClaimBadge :claim="card.first" /></p>
          <h3 class="sans small muted">Історичні написання за датою</h3>
          <ProvenanceTimeline v-if="full" :forms="full.forms" :active="active" :card="full" />
          <div v-else class="skeleton" style="height:6rem" />
        </Panel>

        <PlaceBlock :card="card" />   <!-- SPEC 60 NP-1/NP-3 «Власна назва · на мапі» (renders only for proper names / gazetteer places) -->
        <EtymologyBlock :lemma="card.lemma" /><CognatesPanel :lemma="card.lemma" />   <!-- SPEC 60 ET-1…ET-3 «Етимологія» (collapsible Panel inside) -->

        <!-- 2. Labels -->
        <Panel id="h-lab" v-model:open="ui.lab" :count="labParts.length" title="Мітки · Labels" :summary="labParts.join(' · ')" :empty="!labParts.length"
          info="Літературний регістр ніколи не виводиться: є лише «розмовне» (за позначкою) або «не визначено» (SPEC 00 P-3.1). «Невідомо» означає відсутність доказів, а не «літературне». Тверді мітки з ⓘ відкривають цитату й локатор.">
          <div class="grid2 sans">
            <div><span class="muted">Регістр: </span><ClaimBadge :claim="card.claims.register" text="розмовне" unknown-text="не визначено" tone="colloquial" /></div>
            <div><span class="muted">Суржик: </span><ClaimBadge :claim="card.claims.surzhyk" text="суржик" tone="contact" /></div>
            <div><span class="muted">Походження: </span><ClaimBadge :claim="card.claims.origin" :text="labelUk(String(card.claims.origin.value))" :tone="card.claims.origin.value === 'church_slavonic' ? 'cs' : ''" /></div>
            <div v-if="pal"><span class="muted">Друга палаталізація: </span>
              <ClaimBadge :claim="pal.claim" :text="'друга палаталізація (' + pal.forms.length + ')'" tone="" />
              <span class="small"> <template v-for="(f, i) in pal.forms.slice(0, 6)" :key="f.raw"><template v-if="i">, </template><span class="old">{{ f.raw }}</span> ({{ f.alt || f.via }})</template></span></div>
            <div><span class="muted">Діалекти: </span>
              <ClaimSet v-if="dialects.length" :claims="Object.fromEntries(dialects)" />
              <span v-else class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">невідомо</span></div>
            <div v-if="bankForms.length"><BankChip :forms="bankForms" /></div>
            <div><UsageChips :lemma="card.lemma" label /> <SociolectBadges :word="card.lemma" /> <ModernBadges :word="card.lemma" /></div>
      <LoanAdaptBlock :word="card.lemma" />
            <div><LoanChip :word="card.lemma" /></div>
            <PlastSenses :word="card.lemma" />
          </div>
          <h3 class="sans small muted" style="margin-top:.9rem">Епохи першої фіксації — дві схеми (можуть не збігатися за задумом)</h3>
          <div class="grid2 sans">
            <div v-for="{ s, c } in epochClaims" :key="s"><span class="muted">{{ s === 'shev' ? 'Шевельов' : 'Історія літ. мови (WL)' }}: </span><ClaimBadge :claim="c" :text="epText(c)" /></div>
          </div>
          <template v-if="formLabelGroups.length">
            <h3 class="sans small muted" style="margin-top:.9rem">Мітки окремих написань</h3>
            <ul class="sans small" style="list-style:none;padding:0;margin:0">
              <li v-for="(g, i) in formLabelGroups" :key="i" style="margin:.25rem 0">
                <strong style="font-family:var(--serif)">{{ g.forms.slice(0, 3).join(', ') }}</strong>
                <span v-if="g.forms.length > 1" class="count-n"> у {{ g.forms.length }} формах</span>
                <ClaimSet :claims="g.claims" />
                <details v-if="g.forms.length > 3"><summary class="small muted">усі {{ g.forms.length }} написань</summary>{{ g.forms.join(', ') }}</details></li>
            </ul>
          </template>
        </Panel>

        <!-- SPEC 60 IP-3 / DV-3 on the word card (not only the annotator): collapsed, one-line summaries -->
        <Panel id="h-ipa" :open="false" title="Вимова · IPA" :summary="ipa1 ? `${ipa1} · виведено за правилами` : 'виведено за правилами (P-1.7)'"
          info="IPA — не словникова вимова, а результат правил; кожне правило з цитатою всередині. Перемикач: літературна / говір (IP-2).">
          <IpaRow :variants="full?.stress ?? []" :lemma="card.lemma" :paradigm="card.paradigm.map(p => p.form)" :old="card.forms.map(f => f.raw)" />
          <IkavismChain :lemma="card.lemma" :paradigm="card.paradigm.map(p => p.form)" :old="card.forms.map(f => f.raw)" />
        </Panel>
        <DerivativesBlock panel :lemma="card.lemma" />
        <DialectVariants :lemma="card.lemma" />   <!-- SPEC 63 DP-4 -->
        <DeicticStructure :word="card.lemma" />   <!-- SPEC 60 DX-3 «Будова» (renders only for parsable deictics) -->
        <HeteronymReadings :form="card.lemma" />   <!-- SPEC 60 HT-2 «Наголос і значення» (heteronyms and the [U] послуха́тися note) -->
        <!-- BL-9: senses from uk.wiktionary (CC BY-SA), collapsed, one-line summary = first gloss -->
        <Panel id="h-sn" :open="false" :count="lemmaSenses.length" title="Значення · Senses" :summary="sensesSummary(lemmaSenses)" :empty="!lemmaSenses.length"
          info="Значення — з розділу «Значення» uk.wiktionary (CC BY-SA 4.0), скорочено; не словникова норма проєкту. Наголос показано лише там, де сторінка Вікісловника дає наголошений склад для цієї омонімічної статті.">
          <SensesBlock :lemma="card.lemma" />
        </Panel>

        <!-- 3. Paradigm, by the lemma's paradigm kind (FX-5) -->
        <Panel id="h-par" v-model:open="ui.par" :count="card.paradigm.length" title="Словозміна · Paradigm" :summary="parSummary" :empty="kind !== 'uninflected' && !card.paradigm.length"
          info="Джерело: ВЕСУМ v6.8.6, CC BY-NC-SA 4.0. Теги дослівно при наведенні (D-докази). Наголосу у ВЕСУМ немає.">
          <Paradigm :paradigm="card.paradigm" :kind="kind" />
        </Panel>

        <!-- 3b. Paradigm per epoch (SPEC 50); uninflected POS have none (FX-5) -->
        <Panel v-if="kind !== 'uninflected'" id="h-ep" v-model:open="ui.ep" title="Словозміна за епохами · Epoch paradigms" :summary="epSummary" :empty="epEmpty"
          info="Клітинки — лише засвідчені написання (Т — розмітка TOROT, М — модель, В — ВЕСУМ); реконструкції пунктиром виведено за таблицею парадигм і не є словниковим фактом (P-1.7). «Невідомо» ≠ «форми не було» (P-3.1).">
          <EpochParadigm v-if="epochKinds" no-legend :kind="kind" :epochs="epochs" :loading="epLoading" :spellings="card.forms.map(f => f.raw)" @kwic="showKwic" />
          <p v-else class="small sans muted">Історичні парадигми для частини мови «{{ KIND_UK[kind] }}» ще не побудовано (SPEC 50: спершу іменники й займенники).</p>
        </Panel>

        <!-- 5. Examples -->
        <Panel id="h-kw" v-model:open="ui.kw" :count="kwic.length" title="Приклади · KWIC" :summary="`${kwic.length} прикладів`" :empty="!!full && !kwic.length">
          <Kwic v-if="full" :lines="kwic" :lemma="card.lemma" />
          <div v-else class="skeleton" style="height:8rem" />
          <p v-if="activeForm" class="small muted">показано приклади форми «{{ activeForm.raw }}»</p>
        </Panel>
        <Panel v-if="chosen" id="h-chain" :open="false" :count="chosen.derivation.length" title="Виведення · Derivation" :summary="chosen.derivation.length ? `«${chosen.raw}»: ${chosen.derivation.length} кроків → ${chosen.modern}` : `«${chosen.raw}»: без змін → ${chosen.modern}`" :empty="!chosen.derivation.length" empty-text="правила не змінюють написання">
          <p class="sans small"><span class="muted">написання: </span>{{ chosen.raw }} <span class="muted"> · норма: </span>{{ chosen.norm }} <span class="muted"> · сучасна: </span>{{ chosen.modern }}</p>
          <DerivationSteps :steps="chosen.derivation" :uid="'w-' + chosen.raw" :dates="chosenDates" :lemma="card.lemma" panel="chain" />
        </Panel>
        <SenseEpochs :word="card.lemma" kind="full" />   <!-- SPEC 63 SE-5/SE-6 «Значення за епохами», after the derivation block -->
        <Panel v-if="chosen" id="h-dia" :open="false" title="Діалект · Dialect" :summary="`написання «${chosen.raw}»: ознаки, клас форм, літературний відповідник`"><DialectBlock :spelling="chosen.raw" :lemma="card.lemma" /></Panel>
        <WitnessBlock v-if="full" id="h-wit" :items="witnesses" />
      </div>

      <!-- 4. Statistics sidebar -->
      <aside aria-label="Статистика">
        <Panel id="h-st" v-model:open="ui.st" title="Статистика" :summary="`${fmtNum(card.stats.ipm, 1)} ipm · HK ${card.stats.hk} · f = ${card.stats.f}`">
          <template #info>автоматично згенеровано · ipm — на мільйон слів; HK — клас частотності; f — кількість вживань; N — розмір корпусу. <RouterLink to="/method">Як це обчислюється →</RouterLink></template>
          <div class="row sans"><Dots :dots="card.stats.dots" :ipm="card.stats.ipm" :hk="card.stats.hk" :f="card.stats.f" :N="corpus?.N" />
            <EvidencePopover :evidence="[STAT_CITES.dots!, STAT_CITES.hk!]" heading="Частотність: точки та HK"><span class="badge">ⓘ</span></EvidencePopover></div>
          <p class="small sans" style="margin:.3rem 0 .8rem">{{ fmtNum(card.stats.ipm, 1) }} ipm · HK {{ card.stats.hk }} · f = {{ card.stats.f }} · N = {{ fmtNum(corpus?.N ?? 0) }} слів</p>
          <div v-if="full" class="small sans"><span>Рівномірність (1 − DP): <strong>{{ fmtNum(1 - full.stats.dp, 2) }}</strong></span>
            <EvidencePopover :evidence="[STAT_CITES.dp!]" heading="Дисперсія DP (Gries)"><span class="badge">ⓘ</span></EvidencePopover>
            <div class="bar" role="img" :aria-label="`рівномірність ${fmtNum(1 - full.stats.dp, 2)}`"><i :style="{ width: (1 - full.stats.dp) * 100 + '%' }"></i></div>
            <span class="muted">у {{ full.stats.range }} із {{ corpus?.nWitnesses }} пам’яток</span></div>
          <div v-else class="skeleton" style="height:2.5rem" />
        </Panel>
        <Panel id="h-stx" :open="false" title="Як читати статистику" summary="пояснення показників"><StatsExplainer :card="card" /></Panel>
        <Panel id="h-tc" :open="false" title="За століттями" :summary="full ? `${full.stats.byCentury.length} століть` : 'завантаження…'" :empty="!!full && !full.stats.byCentury.length">
          <TimeCurve v-if="full" :series="full.stats.byCentury" :sizes="corpus?.centurySizes ?? {}" /><div v-else class="skeleton" style="height:6rem" /></Panel>
        <Panel id="h-eb" :open="false" title="За епохами" summary="частота за добами (шкала Шевельова)">
          <EpochBars v-if="full" :stats="full.stats" :sizes="corpus?.epochSizes ?? {}" /><div v-else class="skeleton" style="height:6rem" /></Panel>
        <Panel id="h-map" :open="false" title="За регіонами пам’яток" summary="карта регіонів пам’яток (не діалектна мітка)">
          <RegionMap v-if="full" :card="full" /><div v-else class="skeleton" style="height:6rem" /></Panel>
        <Panel id="h-col" :open="false" title="Типові сполучення" :summary="full ? `${full.stats.colloc.length} сполучень` : 'завантаження…'" :empty="!!full && !full.stats.colloc.length">
          <Collocations v-if="full" :colloc="full.stats.colloc" /><div v-else class="skeleton" style="height:4rem" /></Panel>
        <PhrasePanel :lemma="props.lemma" />
      </aside>
    </div>
  </template>
</template>
