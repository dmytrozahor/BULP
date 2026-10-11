<script setup lang="ts">
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
import ClaimBadge from './ClaimBadge.vue'
import ClaimSet from './ClaimSet.vue'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ forms: FormCard[]; active?: string | null; card?: LemmaCard }>()
const open = ref<string | null>(null)
const items = computed(() => props.forms.filter(f => !props.active || f.raw === props.active)
  .map(f => ({ f, date: f.date as [number, number] | undefined, derived: (f as FormCard & { derived?: boolean }).derived === true }))
  .sort((a, b) => (a.date?.[1] ?? 9999) - (b.date?.[1] ?? 9999)))
const toggle = (k: string) => (open.value = open.value === k ? null : k)
</script>

<template>
  <div>
  <ol class="timeline">
    <li v-for="{ f, date, derived } in items" :key="f.raw">
      <div class="date">{{ date ? fmtDate(date) : 'дата невідома' }} </div>
      <div>
        <strong :class="['lang', derived ? 'derived' : 'attested']" style="font-size:1.25rem">{{ f.raw }}</strong><span v-if="derived" class="derived-badge">реконструкція</span>
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
      <div v-if="Object.keys(f.claims).length" class="row" style="margin-top:.25rem">
        <ClaimSet :claims="f.claims" />
      </div>
      <div v-if="f.hints.length" class="small muted">гіпотези без джерела (лише для перевірки, мітку не ставлять): {{ f.hints.join(', ') }}</div>
    </li>
  </ol>
  <ReconstructedForms v-if="card && !active" :card="card" />
  </div>
</template>
