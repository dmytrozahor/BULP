<script setup lang="ts">
/**
 * SPEC 63 CP-8 «Ознаки й варіанти»: ONE panel on every card kind for what the shared rule functions find in the card's spelling: the cited feature chips of MM-16 (featureMarks: the very function the
 * lemma header of the word card uses), the feature pairs in both directions and the variant family of MM-29..35 (wordRules) and the contact form-type of MM-36 (Russian headword in r2u,
 * classified by year and region; the label belongs to a FORM, MM-9 rule 2). Nothing found = the honest line «немає даних (перевірено: …)» naming what was checked; nothing is invented.
 */
import { computed } from 'vue'
import { key } from '../../core/text.ts'
import { wordRules } from '../../core/word-rules.ts'
import { useData } from '../composables/useData.ts'
import { knownKeyOf } from '../lib/annotate.ts'
import { featureMarks } from '../lib/featureMarks.ts'
import Panel from './Panel.vue'
import WordRuleChips from './WordRuleChips.vue'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ lemma?: string; spelling?: string; /** the host already prints the MM-16 feature chips (lemma header / form page) */ skipFeatures?: boolean }>()
const { annData, searchIdx, loaded } = useData()
const w = computed(() => props.spelling ?? props.lemma ?? '')
const rules = computed(() => (w.value && loaded.value ? wordRules(w.value, { known: knownKeyOf(annData.value), ru: annData.value.ru }, { isolated: true }) : undefined))
const feats = computed(() => props.skipFeatures || !w.value ? [] : featureMarks(w.value, {}, k => k !== key(w.value) && searchIdx.value.map.has(k)))
const t = computed(() => ({ variant: rules.value?.variant, pairs: rules.value?.pairs ?? [], ruClass: rules.value?.ruClass, copula: rules.value?.copula }))
const n = computed(() => feats.value.length + t.value.pairs.length + (t.value.variant ? 1 : 0) + (t.value.ruClass ? 1 : 0) + (t.value.copula ? 1 : 0))
const checked = computed(() => `правила ознак MM-16${props.skipFeatures ? ' (показані в заголовку)' : ''}, пари -ова-/-ува- і -ові, родини варіантів MM-29…35, російські заголовки r2u (MM-36) для «${w.value}»`)
</script>

<template>
  <Panel id="cp-rules" :open="n > 0" :count="n" title="Ознаки й варіанти · Features" :summary="n ? `${n} знахідок за цитованими правилами` : ''" :empty="!n" :empty-text="`немає даних (перевірено: ${checked})`"
    info="Ті самі функції, що в аннотаторі, пошуку й «Аналізі слова» (core/word-rules.ts, core/feature-chips.ts). Мітка типу форми (суржик, язичіє, русизм) належить формі, а не лемі (MM-9).">
    <div data-testid="card-rules">
      <p v-for="c in feats" :key="c.rule" class="sans small" data-testid="feature-chip"><span class="badge" :title="c.cite.quote">{{ c.feature }}</span> {{ c.text }} <span class="muted">· {{ c.rule }}</span><EvidencePopover :evidence="[c.cite]" heading="Правило" /></p>
      <WordRuleChips :t="t" />
    </div>
  </Panel>
</template>
