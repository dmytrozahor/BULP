<script setup lang="ts">
import { formTo, isOldForm } from '../lib/nav.ts'
import ViewSwitch from './ViewSwitch.vue'
import AttestGraph from './AttestGraph.vue'
/**
 * SPEC 00 P-1.5: "Derivations keep a full trace: one step per rule, each step with its citation (видѣти →R09→ видіти)."
 * research/07 §3.1 «Походження (provenance timeline per form)». Click a step → the Shevelov quote + locator from core RULES.
 * Date of a spelling = FormCard.date (earliest attestation of that spelling).
 * Extension point: a form object may later carry `derived: true` (reconstruction) → rendered dashed/italic with a «реконструкція» badge.
 */
import { computed, ref } from 'vue'
import type { FormCard, LemmaCard } from '../../core/types.ts'
import ReconstructedForms from './ReconstructedForms.vue'
import { ruleById } from '../../core/phonology.ts'
import { fmtDate, ROUTE_UK } from '../lib/format.ts'
import { claimSignature } from '../lib/ux.ts'
import ClaimBadge from './ClaimBadge.vue'
import ClaimSet from './ClaimSet.vue'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ forms: FormCard[]; active?: string | null; card?: LemmaCard }>()
const open = ref<string | null>(null), n = ref(40)   // F2: paged — a frequent lemma may have hundreds of spellings
const items = computed(() => props.forms.filter(f => !props.active || f.raw === props.active)
  .map(f => ({ f, date: f.date as [number, number] | undefined, derived: (f as FormCard & { derived?: boolean }).derived === true }))
  .sort((a, b) => (a.date?.[1] ?? 9999) - (b.date?.[1] ?? 9999)))
/** SPEC 61 UX-4: identical claim sets over several spellings render once («у N формах») on the first (oldest) spelling; the others only point to it */
const sameN = computed(() => { const m = new Map<string, number>(); for (const { f } of items.value) if (Object.keys(f.claims).length) { const s = claimSignature(f.claims); m.set(s, (m.get(s) ?? 0) + 1) } return m })
const firstOf = computed(() => { const m = new Map<string, string>(); for (const { f } of items.value) if (Object.keys(f.claims).length) { const s = claimSignature(f.claims); if (!m.has(s)) m.set(s, f.raw) } return m })
const claimsInfo = (f: FormCard) => { const s = claimSignature(f.claims); return { n: sameN.value.get(s) ?? 1, first: firstOf.value.get(s) === f.raw, head: firstOf.value.get(s) } }
/** SPEC 63 UI-2: one dot per dated spelling (x = year, r ∝ √f); a dot links to the same /f page as the list */
const points = computed(() => items.value.filter(i => i.date).slice(0, 120).map(({ f, date }) => ({
  id: f.raw, label: f.raw, year: (date![0] + date![1]) / 2, f: f.f, kind: isOldForm(f.raw, date![1]) ? 'old' : 'modern',
  to: formTo(f.raw, props.card?.lemma), when: fmtDate(date!), title: `${f.raw} · ${fmtDate(date!)}` })))
const toggle = (k: string) => (open.value = open.value === k ? null : k)
</script>

<template>
  <div>
  <ViewSwitch panel="chrono">
  <template #graph><AttestGraph :points="points" label="Хронологія написань" /></template>
  <template #list>
  <ol class="timeline">
    <li v-for="{ f, date, derived } in items.slice(0, n)" :key="f.raw">
      <div class="date">{{ date ? fmtDate(date) : 'дата невідома' }} </div>
      <div>
        <strong :class="['lang', derived ? 'derived' : 'attested', { old: isOldForm(f.raw, f.date?.[1]) }]" style="font-size:1.25rem">{{ f.raw }}</strong><span v-if="derived" class="derived-badge">реконструкція</span>
        <span v-if="f.norm !== f.raw" class="muted"> (норм. {{ f.norm }})</span>
        <span> → <strong>{{ f.modern }}</strong></span>
        <span class="muted small"> · f = {{ f.f }}</span>
      </div>
      <div class="small row">
        <span class="muted">зв’язок з лемою ({{ ROUTE_UK[f.link.value === 'unknown' ? 'direct' : f.link.value.route] }}):</span>
        <ClaimBadge :claim="f.link" text="ВЕСУМ" />
      </div>
      <div v-if="f.derivation.length" class="trace" role="list" aria-label="Деривація">
        <template v-for="(s, i) in f.derivation" :key="i">
          <button type="button" role="listitem" :aria-expanded="open === f.raw + i" @click="toggle(f.raw + i)">
            {{ s.from }} → {{ s.to }} · <strong>{{ s.rule }}</strong> {{ ruleById[s.rule]?.name }}</button>
        </template>
      </div>
      <div v-else-if="f.modern !== f.raw && f.norm !== f.modern" class="small muted">правилами не виведено (зв’язок через лему TOROT / словник)</div>
      <template v-for="(s, i) in f.derivation" :key="'e' + i">
        <div v-if="open === f.raw + i && ruleById[s.rule]" class="card" style="margin:.3rem 0">
          <div class="small"><strong>{{ s.rule }}</strong> {{ ruleById[s.rule]!.name }} · {{ ruleById[s.rule]!.date }} · сфера {{ ruleById[s.rule]!.scope }}</div>
          <EvidenceList :evidence="[ruleById[s.rule]!.cite]" />
        </div>
      </template>
      <div v-if="Object.keys(f.claims).length && claimsInfo(f).first" class="row" style="margin-top:.25rem">
        <ClaimSet :claims="f.claims" /><span v-if="claimsInfo(f).n > 1" class="small muted sans">у {{ claimsInfo(f).n }} формах</span>
      </div>
      <div v-else-if="Object.keys(f.claims).length" class="small muted sans">ті самі мітки, що й у «{{ claimsInfo(f).head }}» (докази — там)</div>
      <div v-if="f.hints.length" class="small muted">гіпотези без джерела (лише для перевірки, мітку не ставлять): {{ f.hints.join(', ') }}</div>
    </li>
  </ol>
  <button v-if="items.length > n" type="button" class="btn" @click="n += 80">Показати ще ({{ items.length - n }})</button>
  </template>
  </ViewSwitch>
  <ReconstructedForms v-if="card && !active" :card="card" />
  </div>
</template>
