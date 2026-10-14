<script setup lang="ts">
/**
 * SPEC 60 IP-3: IPA per stress variant, with the «вимова: літературна / <говір>» toggle (IP-2).
 * Every IPA string is derived (never a dictionary fact, P-1.7): the rows that fired are listed with their method and cite.
 * BL-13: the dialect list offers only dialects whose features apply to THIS form (the dialect IPA differs from the standard one);
 * the origin of each і (R09/R10 from a trace or a paradigm alternation, core/origin.ts) feeds the rows of research/27 §2.1.
 */
import { computed, ref, watch } from 'vue'
import type { StressVariant } from '../../core/types.ts'
import { renderStress } from '../../core/text.ts'
import { toIpa, applicableDialects } from '../../core/ipa.ts'
import { originsFor } from '../../core/origin.ts'
const props = defineProps<{ variants: StressVariant[]; lemma: string; paradigm?: string[]; old?: string[] }>()
const dialect = ref('')
const forms = computed(() => props.variants.length
  ? props.variants.map(v => ({ label: renderStress(v.form, v.positions), form: v.form, positions: v.positions as number[] | null }))
  : [{ label: props.lemma, form: props.lemma, positions: null as number[] | null }])
const withOrigin = computed(() => forms.value.map(f => ({ ...f, org: originsFor(f.form, { paradigm: props.paradigm, oldForms: props.old }) })))
const run = (d?: string) => withOrigin.value.map(f => ({ f, r: toIpa(f.form, f.positions, d, f.org.via === 'none' ? undefined : f.org.origins) }))
/** dialects whose output differs from the standard for at least one stress variant */
const applicable = computed(() => applicableDialects(withOrigin.value.map(f => ({ form: f.form, positions: f.positions, origins: f.org.via === 'none' ? undefined : f.org.origins }))))
watch(applicable, a => { if (dialect.value && !a.some(d => d.code === dialect.value)) dialect.value = '' })
const items = computed(() => run(dialect.value || undefined).map(({ f, r }) => ({ label: f.label, r, org: f.org })))
const ORG = (o: { via: string; old?: string }) => (o.via === 'trace' ? `походження і — з виведення ${o.old}` : o.via === 'paradigm' ? 'походження і — з чергування в парадигмі ВЕСУМ' : '')
</script>
<template>
  <div class="small ipa-row" style="margin:.2rem 0">
    <span class="muted">вимова: </span>
    <select v-if="applicable.length" v-model="dialect" aria-label="вимова: літературна або говір" style="font-size:.85em">
      <option value="">літературна</option>
      <option v-for="d in applicable" :key="d.code" :value="d.code">{{ d.label }} ({{ d.code }})</option>
    </select>
    <span v-else class="muted" title="жоден із говірних рядків (research/04, research/27) не змінює вимову цієї форми">літературна (говіркових відмінностей немає)</span>
    <div v-for="(it, i) in items" :key="i">
      <strong style="font-size:1.05rem">{{ it.r.ipa }}</strong>
      <span class="muted"> · {{ it.label }} · виведено за правилами (не словникова вимова)</span>
      <details>
        <summary class="muted">правила ({{ it.r.rows.length }})</summary>
        <div v-if="ORG(it.org)" class="muted">{{ ORG(it.org) }}</div>
        <div v-for="row in it.r.rows" :key="row.id"><code>{{ row.id }}</code> {{ row.method === 'quoted' ? 'цитата' : 'виведено' }} — {{ row.cite }}<template v-if="row.quote">: «{{ row.quote }}»</template></div>
      </details>
      <div v-for="f in it.r.flags" :key="f" class="unk">{{ f }}</div>
    </div>
  </div>
</template>
