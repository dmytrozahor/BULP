<script setup lang="ts">
/**
 * SPEC 63 FD-4: the class of forms of one paradigm cell (or one deictic base) as a table  variant → dialect group(s) → evidence → earliest dating → f.
 * The current spelling is highlighted; every form, group and rule chip is a link (BL-16); derived rows (DP rule, DX reconstruction) are marked and never
 * claim a corpus attestation. Rows come from core/form-class.ts (formClass / dxClass).
 */
import { DIALECTS } from '../../core/rules.ts'
import type { ClassMember } from '../../core/form-class.ts'
import { fmtDate } from '../lib/format.ts'
import { dialectTo, formTo, ruleTo } from '../lib/nav.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ members: ClassMember[]; current?: string; caption?: string }>()
const href = (m: ClassMember) => formTo(m.form, m.lemma)
const via = (v: string) => (v.startsWith('DP:') || v.startsWith('DX:') ? `/method#rule-${encodeURIComponent(v)}` : ruleTo(v))
</script>

<template>
  <div class="tablewrap">
    <table class="small sans formclass" :aria-label="caption ?? 'Клас форм'">
      <caption v-if="caption" class="small muted" style="text-align:left">{{ caption }}</caption>
      <thead><tr><th scope="col">форма</th><th scope="col">діалектна група · ознака</th><th scope="col">найраніше</th><th scope="col" class="num">f</th></tr></thead>
      <tbody>
        <tr v-for="m in members" :key="m.form" :class="{ cur: m.form === current }" :aria-current="m.form === current ? 'true' : undefined">
          <td><RouterLink :to="href(m)" class="lang">{{ m.form }}</RouterLink>
            <span v-if="m.kind === 'dp'" class="derived-badge" title="виведено за правилом DP (не засвідчено в корпусі)">виведено</span>
            <span v-else-if="m.kind === 'dx' && !m.attested" class="derived-badge">за словником</span>
            <span v-else-if="m.kind === 'paradigm'" class="muted" title="форма ВЕСУМ без токенів у корпусі"> ВЕСУМ</span>
            <span v-if="m.variant && m.kind !== 'dx'" class="muted"> · варіант «{{ m.variant }}»</span><span v-if="m.reading" class="muted"> · «{{ m.reading }}»</span></td>
          <td>
            <template v-for="(c, i) in m.chips" :key="i">
              <RouterLink :to="dialectTo(c.code)" class="badge dialect">{{ DIALECTS[c.code] ?? c.code }}</RouterLink>
              <EvidencePopover :evidence="c.evidence" :heading="`${DIALECTS[c.code] ?? c.code}: ${c.via}`" :label="c.via"><span class="badge">ⓘ</span></EvidencePopover>
              <RouterLink :to="via(c.via)" class="muted" style="font-size:.75rem">{{ c.via }}</RouterLink>{{ ' ' }}
            </template>
            <span v-if="!m.chips.length" class="muted">ознак не виявлено</span>
          </td>
          <td>{{ m.date ? fmtDate(m.date) : '—' }}</td>
          <td class="num">{{ m.f ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
