<script setup lang="ts">
/**
 * MM-29..36: what the shared rule functions (core/word-rules.ts) found for one annotated token: the cited feature chips of its spelling (`features`), the feature PAIRS in both directions
 * (керовати ↔ керувати, міст-ові → міст) and the variant family (межи → між, увесь → весь, како → як). Contact labels are not drawn here (form level, MM-9).
 */
import { computed } from 'vue'
import { featureChips } from '../../core/feature-chips.ts'
import { RU_KIND_UK, type RuKind } from '../../core/ru-contact.ts'
const kindUk = (k: RuKind): string => RU_KIND_UK[k] ?? k
import type { AnnotatedToken } from '../lib/annotate.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ t: Pick<AnnotatedToken, 'features' | 'pairs' | 'variant' | 'ruClass' | 'copula' | 'short'>; year?: number }>()
const wl = (l: string) => '/w/' + encodeURIComponent(l)
const ctx = computed(() => ({ year: props.year }))
const feats = computed(() => featureChips(props.t.features ?? [], ctx.value))
const pairs = computed(() => (props.t.pairs ?? []).map(p => ({ p, chip: featureChips([p.rule], ctx.value)[0] })))
</script>

<template>
  <div v-if="feats.length || pairs.length || t.variant || t.ruClass || t.copula || t.short" class="small" style="margin-top:.35rem" data-testid="rule-chips">
    <div v-for="c in feats" :key="c.rule" data-testid="feature-chip"><span class="badge">{{ c.feature }}</span> {{ c.text }} <span class="muted">({{ c.rule }})</span><EvidencePopover :evidence="[c.cite]" heading="Правило" /></div>
    <div v-for="{ p, chip } in pairs" :key="p.rule + p.direction" data-testid="feature-pair">
      <span class="badge" :data-direction="p.direction">{{ chip?.feature ?? p.rule }}</span>
      {{ p.text }}
      <RouterLink v-if="p.known" :to="wl(p.to)"><strong>{{ p.to }}</strong></RouterLink>
      <span v-if="chip" class="muted"> · {{ chip.text }}</span><EvidencePopover :evidence="[p.cite]" heading="Правило" />
    </div>
    <div v-if="t.copula" data-testid="copula-reading">
      <span class="badge" :title="t.copula.chip.cite.note">{{ t.copula.chip.feature }}</span>
      <template v-if="t.copula.verdict === 'ambiguous'"> <strong>неоднозначно:</strong> </template>
      <template v-for="(r, i) in t.copula.readings" :key="r.lemma"><template v-if="i"> / </template><RouterLink :to="wl(r.lemma)"><strong>{{ r.lemma }}</strong></RouterLink><span v-if="r.via" class="muted"> (через «{{ r.via }}»)</span><span v-if="r.default" class="muted"> — основне читання</span></template>
      <span class="muted"> · {{ t.copula.chip.text }}</span>
      <span v-for="c in t.copula.cues" :key="c" class="muted"> · {{ c }}</span>
      <EvidencePopover :evidence="[t.copula.evidence]" heading="Правило MM-38" />
    </div>
    <div v-if="t.short" data-testid="short-reading">
      <span class="badge" :data-qualifier="t.short.chip.qualifier" :title="t.short.chip.cite.note">{{ t.short.chip.feature }}</span>
      <template v-if="t.short.verdict === 'ambiguous'"> <strong>неоднозначно:</strong> </template>
      <template v-for="(r, i) in t.short.readings" :key="r.lemma"><template v-if="i"> / </template><RouterLink :to="wl(r.lemma)"><strong>{{ r.lemma }}</strong></RouterLink><span v-if="r.via" class="muted"> (через «{{ r.via }}»)</span><span v-if="r.note" class="muted"> ({{ r.note }})</span><span v-if="r.default" class="muted"> — основне читання</span></template>
      <span class="muted"> · {{ t.short.chip.text }}</span>
      <span v-for="c in t.short.cues" :key="c" class="muted"> · {{ c }}</span>
      <EvidencePopover :evidence="[t.short.evidence]" :heading="t.short.kind === 'reduction' ? 'Правило MM-43' : 'Правило MM-42'" />
    </div>
    <div v-if="t.ruClass" data-testid="ru-class">
      <span class="badge" :title="'тип форми визначено за роком тексту і регіоном; мітка належить формі, не лемі'">{{ t.ruClass.label }}</span>
      <template v-if="t.ruClass.standard.length"> літературні відповідники (r2u): <template v-for="(s, i) in t.ruClass.standard" :key="s.lemma"><template v-if="i">, </template><RouterLink :to="wl(s.lemma)"><strong>{{ s.lemma }}</strong></RouterLink></template></template>
      · <span class="muted">російський варіант:</span> {{ t.ruClass.ruVariant }}
      <template v-if="t.ruClass.possible.length > 1"> · <span class="muted">можливо також: {{ t.ruClass.possible.slice(1).map(kindUk).join(', ') }} (без року тексту тип не визначити)</span></template>
      <EvidencePopover :evidence="t.ruClass.evidence" heading="Докази: російське слово в r2u" />
    </div>
    <div v-if="t.variant" data-testid="variant-note">
      <span class="badge">{{ t.variant.roleUk }}</span> до <RouterLink :to="wl(t.variant.head)"><strong>{{ t.variant.head }}</strong></RouterLink><template v-if="t.variant.tail"> + «{{ t.variant.tail }}»</template>
      <span v-if="t.variant.sense" class="muted"> · інше значення цього написання поряд із звичайним читанням (прислівник / сполучник, ЦС / староукраїнське)</span>
      <span v-if="t.variant.member.ambiguous && !t.variant.sense" class="muted"> · це написання є й звичайною формою іншого слова; читання ВЕСУМ не скасовується</span>
      <span v-if="t.variant.uncited" class="unk"> · джерела не знайдено</span>
      <EvidencePopover :evidence="[t.variant.evidence]" heading="Джерело варіанта" />
    </div>
  </div>
</template>
