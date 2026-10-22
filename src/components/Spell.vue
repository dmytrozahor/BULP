<script setup lang="ts">
/**
 * SPEC 63 OV-1…OV-8: ONE word as the viewer chose to see it. Baseline = modern orthography (Правопис 2019) even for a historical spelling (`raw`, one click away and the
 * «як у пам’ятці» orthography); the dialect switch respells it in modern letters by the cited rules (each changed segment has a tooltip: rule id + source quote), the orthography
 * switch writes it in an older orthography (a «?» letter = «невизначено без етимології»). A form made by rule carries the badge «за правилами» and is never shown as attested
 * unless `attest` (src/lib/dialectView.ts) found the very spelling in a witness. KWIC lines and the text view do NOT use this component: they are quotations.
 */
import { computed, ref } from 'vue'
import { dialect, orth, show, type ViewCtx } from '../lib/views.ts'
import { ORTH_NOTE_UNSURE } from '../../core/orth-forward.ts'
import { DIALECTS } from '../../core/rules.ts'
import type { Attest } from '../lib/dialectView.ts'
import { witnessTo } from '../lib/nav.ts'
const props = defineProps<{ w: string; raw?: string; ctx?: ViewCtx; attest?: Attest; /** no badge (compact lists) */ quiet?: boolean }>()
const showRaw = ref(false)
const historical = computed(() => !!props.raw && props.raw !== props.w)
const orig = computed(() => orth.value === 'orig' && !!props.raw)
const s = computed(() => show(props.w, dialect.value, orth.value, props.ctx))
const tip = (p: { rule?: string; ev?: { quote: string; source: string; locator: string }; from?: string; unsure?: boolean; kind: string }) =>
  p.unsure ? `«?» ${ORTH_NOTE_UNSURE}: сучасна літера «${p.from ?? ''}» залишена як є (${p.rule})`
  : `${p.kind === 'dialect' ? 'говір' : 'правопис'}: «${p.from ?? ''}» → ${p.rule}${p.ev ? ` · «${p.ev.quote}» (${p.ev.source}, ${p.ev.locator})` : ''}`
const dname = computed(() => DIALECTS[dialect.value] ?? '')
</script>

<template>
  <span class="spell" :data-dialect="dialect || undefined" :data-orth="orth">
    <template v-if="showRaw || orig"><span class="lang sp-raw" :title="'написання свідчення: ' + raw">{{ raw }}</span></template>
    <template v-else>
      <template v-for="(p, i) in s.pieces" :key="i">
        <mark v-if="p.kind !== 'plain'" :class="['sp', p.kind === 'dialect' ? 'sp-d' : 'sp-o', { 'sp-u': p.unsure }]" :title="tip(p)" tabindex="0" :data-rule="p.rule">{{ p.text }}</mark>
        <template v-else>{{ p.text }}</template>
      </template>
    </template>
    <button v-if="historical && !orig" type="button" class="sp-rawbtn" :aria-pressed="showRaw" :title="showRaw ? 'показати сучасним правописом' : `оригінал: ${raw}`" @click.stop.prevent="showRaw = !showRaw">{{ showRaw ? 'сучасне' : 'оригінал' }}</button>
    <template v-if="!quiet && s.generated && !showRaw">
      <span v-if="attest && attest.status !== 'generated'" class="badge sp-att" :class="'sp-' + attest.status" :title="attest.label + ' · ' + dname">{{ attest.label }}
        <template v-for="x in attest.witnesses.slice(0, 2)" :key="x.w"> · <RouterLink :to="witnessTo(x.w)">{{ x.title }}</RouterLink></template></span>
      <span v-else class="derived-badge" :title="`реконструкція за правилами говору «${dname}», не засвідчено`">за правилами</span>
    </template>
  </span>
</template>
