<script setup lang="ts">
/**
 * SPEC 63 FD-1…FD-5 + DP-3/DP-4 + DX-2/DX-3: the «Діалект» block of the form page /f/:form.
 *  FD-1  every dialect rule that fires on the spelling (group, rule id, Q citation, dated first attestation) + dialect claims of the lemma (AC) + DP / DX claims;
 *  FD-2  «засвідчено в:» — regions of the witnesses, shown apart, never merged into a label;
 *  FD-3  nothing fires → «діалектних ознак не виявлено» + the rules checked;
 *  FD-4  the class of the paradigm cell (all attested + derived variants) as a table; FD-5 «інші форми з цією ознакою» per fired feature.
 * Everything is computed from the data on view; no per-form label is stored. All chips are links.
 */
import { computed } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { DIALECTS } from '../../core/rules.ts'
import { cellKey, cellsOfSpelling, dxChips, firedRules, formClass, rulesChecked, type CardLike } from '../../core/form-class.ts'
import { PRONOUN_VARIANTS, deriveAll, variantById, variantClaims, variantsOfStd } from '../../core/pronoun-variants.ts'
import { segment } from '../../core/deictics.ts'
import { useData } from '../composables/useData.ts'
import { fmtDate } from '../lib/format.ts'
import { ruleFormsOf } from '../lib/parts.ts'
import { dialectTo, formTo, ruleFormsTo, ruleTo, wordTo } from '../lib/nav.ts'
import EvidencePopover from './EvidencePopover.vue'
import FormClassTable from './FormClassTable.vue'
import DeicticStructure from './DeicticStructure.vue'
const props = defineProps<{ spelling: string; lemma?: string; regions?: { name: string; f: number }[]; /** SPEC 63 OV-11: the chips only (the «Огляд» tab prints the regions itself and links the full block in «Поширення») */ compact?: boolean }>()
const { byLemma, fullOf } = useData()

const own = computed(() => (props.lemma ? byLemma.value.get(props.lemma) : undefined))
const ownFull = computed(() => fullOf(own.value))
const fc = computed(() => own.value?.forms.find(f => f.raw === props.spelling))
const fired = computed(() => (fc.value ? firedRules(fc.value.claims) : []))
const features = computed(() => [...new Set(fired.value.map(r => r.feature))])
/** lemma-level dialect claims (AC labels from dictionary articles); shown as such, not as a property of the spelling */
const lemmaDia = computed(() => Object.entries(own.value?.claims.dialect ?? {}).filter(([c, cl]) => c in DIALECTS && isKnown(cl) && !fired.value.some(r => r.code === c)))

// ── DP: the spelling belongs to a variant lemma, or is a rule-derived variant form of a standard lemma ──
const derivedHit = computed(() => {
  for (const std of new Set(PRONOUN_VARIANTS.map(v => v.std))) {
    const s = byLemma.value.get(std); if (!s) continue
    const hit = deriveAll(std, s.paradigm).find(d => d.form === props.spelling)
    if (hit) return hit
  }
  return undefined
})
const dpId = computed(() => variantById(props.lemma ?? '')?.id ?? derivedHit.value?.variant)
const dp = computed(() => (dpId.value ? variantById(dpId.value) : undefined))
const dpClaims = computed(() => (dp.value ? variantClaims(dp.value) : []))
const stdLemma = computed(() => dp.value?.std ?? props.lemma)

// ── FD-4: cells of this spelling, class tables ──
const ownCard = computed<CardLike | undefined>(() => (own.value ? (ownFull.value ?? own.value) as CardLike : undefined))
const cells = computed(() => {
  if (derivedHit.value) return [cellKey(derivedHit.value.tags)]
  return ownCard.value && fc.value ? cellsOfSpelling(ownCard.value, fc.value) : []
})
const classCards = computed<CardLike[]>(() => {
  const std = stdLemma.value ? byLemma.value.get(stdLemma.value) : undefined
  if (!std) return []
  return [std, ...variantsOfStd(std.lemma).map(v => byLemma.value.get(v.id))].filter(Boolean).map(c => (fullOf(c) ?? c) as CardLike)
})
const classes = computed(() => {
  const std = stdLemma.value ? byLemma.value.get(stdLemma.value) : undefined
  const derived = std ? deriveAll(std.lemma, std.paradigm) : []
  return cells.value.slice(0, 3).map(cell => ({ cell, members: formClass(cell, classCards.value, derived) })).filter(c => c.members.length > 1)
})

// ── FD-5 ──
const featureClass = computed(() => features.value.map(f => ({ f, forms: ruleFormsOf(f) })))

// ── DX ──
const seg = computed(() => segment(props.spelling)[0])
const dxc = computed(() => (seg.value ? dxChips(seg.value) : []))

const any = computed(() => fired.value.length + lemmaDia.value.length + dpClaims.value.length + dxc.value.length > 0)
</script>

<template>
  <div class="dialect-block sans" aria-label="Діалект">
    <ul v-if="any" style="list-style:none;padding:0;margin:0">
      <li v-for="r in fired" :key="r.id" style="margin:.25rem 0">
        <RouterLink :to="dialectTo(r.code)" class="badge dialect">{{ r.group }}</RouterLink>
        <RouterLink :to="ruleTo(r.id)" class="small"> {{ r.id }}</RouterLink>
        <EvidencePopover :evidence="[r.cite, ...(r.earliestCite ? [r.earliestCite] : [])]" :heading="`${r.group}: ${r.id}`" :label="r.id"><span class="badge">ⓘ докази</span></EvidencePopover>
        <span class="small muted"> · ознака в корпусі від <strong>{{ r.earliest ?? 'не датовано' }}</strong><template v-if="r.note"> · {{ r.note }}</template></span>
      </li>
      <li v-for="[c, cl] in lemmaDia" :key="'l' + c" style="margin:.25rem 0">
        <RouterLink :to="dialectTo(c)" class="badge dialect">{{ DIALECTS[c] }}</RouterLink>
        <EvidencePopover :evidence="cl.evidence" :heading="`${DIALECTS[c]}: мітка леми`" :label="c"><span class="badge">ⓘ докази</span></EvidencePopover>
        <span class="small muted"> · мітка леми (словникова/автоматична), не властивість лише цього написання<template v-if="cl.method"> · {{ cl.method }}</template></span>
      </li>
      <li v-for="(c, i) in dpClaims" :key="'d' + i" style="margin:.25rem 0">
        <RouterLink v-if="c.code" :to="dialectTo(c.code)" class="badge dialect">{{ DIALECTS[c.code] }}</RouterLink>
        <span v-else class="badge" title="джерело не називає групу, а газетьєр AC не має такого регіону">група не встановлена</span>
        <EvidencePopover :evidence="c.evidence" :heading="`Діалектний варіант «${dpId}»`" :label="dpId ?? ''"><span class="badge">ⓘ докази</span></EvidencePopover>
        <span class="small muted"> · варіант «{{ dpId }}» займенника <RouterLink :to="wordTo(dp!.std)">{{ dp!.std }}</RouterLink><template v-if="c.region"> · {{ c.region }}</template><template v-if="c.note"> · {{ c.note }}</template></span>
      </li>
      <li v-for="(c, i) in dxc" :key="'x' + i" style="margin:.25rem 0">
        <RouterLink :to="dialectTo(c.code)" class="badge dialect">{{ DIALECTS[c.code] ?? c.code }}</RouterLink>
        <EvidencePopover :evidence="c.evidence" :heading="`Ознака ${c.via}`" :label="c.via"><span class="badge">ⓘ докази</span></EvidencePopover>
        <span class="small muted"> · афікс {{ c.via.replace('DX:', '') }} (research/24)</span>
      </li>
    </ul>
    <div v-else class="small" role="status">діалектних ознак не виявлено (норма / невідомо).
      <details v-if="!compact" class="small muted"><summary>перевірені правила: {{ rulesChecked().length }} ознак</summary>
        <span v-for="id in rulesChecked()" :key="id"><RouterLink :to="ruleTo(id)">{{ id }}</RouterLink>{{ ' ' }}</span></details></div>
    <p v-if="!compact" class="small" style="margin:.4rem 0"><span class="muted">засвідчено в: </span>
      <template v-if="regions?.length"><template v-for="(r, i) in regions" :key="r.name"><template v-if="i">, </template>{{ r.name }} ({{ r.f }})</template></template>
      <template v-else>регіон пам’яток не відомий</template>
      <span class="muted"> — регіон пам’ятки, а не діалектна мітка (FD-2).</span></p>

    <DeicticStructure v-if="seg && !compact" :word="spelling" bare />

    <template v-for="cl in (compact ? [] : classes)" :key="cl.cell">
      <h3 class="small" style="margin:.6rem 0 .2rem">Клас форм: {{ cl.cell }}</h3>
      <FormClassTable :members="cl.members" :current="spelling" :caption="`усі засвідчені та виведені варіанти клітинки ${cl.cell}`" />
    </template>

    <div v-for="fcl in (compact ? [] : featureClass)" :key="fcl.f" class="small" style="margin:.5rem 0">
      <span class="muted">інші форми з ознакою </span><RouterLink :to="ruleTo(fcl.f)">{{ fcl.f }}</RouterLink>: <strong>{{ fcl.forms.length }}</strong>
      <template v-for="x in fcl.forms.filter(x => x.form !== spelling).slice(0, 6)" :key="x.form + x.lemma"> · <RouterLink :to="formTo(x.form, x.lemma)" class="lang">{{ x.form }}</RouterLink></template>
      · <RouterLink :to="ruleFormsTo(fcl.f)">увесь список →</RouterLink>
    </div>
  </div>
</template>
