<script setup lang="ts">
/**
 * /analyze — runs in the browser. derive() candidates with traces; detect() with CS/CONTACT/DIALECT/REGISTER tables over lexindex.json.
 * Evidence-safe gating: "If the word is neither in lexindex nor in the lexicon the normative VESUM check is unavailable offline, so
 * absence-based dialect/suffix rules are gated" (src/lib/analyze.ts). Weight-0 rules are hypotheses without source → listed separately (P-1.3, P-3.1).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ruleById } from '../../core/phonology.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import { AXIS_UK, labelUk } from '../lib/format.ts'
import { categoryOf, runDetectors, ruleOf, ALL_RULES } from '../lib/analyze.ts'
import ClaimBadge from '../components/ClaimBadge.vue'
import EvidenceList from '../components/EvidenceList.vue'
const route = useRoute(), router = useRouter()
const { annData, loaded, byLemma, searchIdx } = useData()
const q = ref(String(route.query.q ?? '')), word = ref(q.value.trim()), year = ref('')
watch(() => route.query.q, v => { q.value = String(v ?? ''); word.value = q.value.trim() })
const submit = () => { word.value = q.value.trim(); router.replace({ query: word.value ? { q: word.value } : {} }) }
const y = computed(() => (/^\d{3,4}$/.test(year.value) ? +year.value : undefined))
const d = computed(() => (word.value ? deriveWithSteps(word.value) : undefined))
const a = computed(() => (word.value && loaded.value ? runDetectors(word.value, annData.value, y.value) : undefined))
const inLex = computed(() => (word.value ? searchIdx.value.map.get(key(word.value)) ?? [] : []))
const claimList = computed(() => Object.entries(a.value?.claims ?? {}))
const open = ref<string | null>(null)
const gatedRules = computed(() => (a.value?.gated ?? []).map(id => ruleOf(id)!).filter(Boolean))
</script>

<template>
  <h1>Аналіз слова</h1>
  <p class="muted">Працює у браузері: виводить сучасні кандидати з трасою правил і шукає церковнослов’янські, контактні, діалектні та розмовні ознаки — лише з посиланням на джерело правила й на дані, що його спрацювали.</p>
  <form class="row" @submit.prevent="submit">
    <input v-model="q" type="search" placeholder="напр. кънѧзь, градъ, співпадати" aria-label="Слово" style="flex:1 1 14rem" spellcheck="false" />
    <label class="sans small">рік тексту <input v-model="year" type="text" inputmode="numeric" placeholder="порожньо = сучасне" style="width:9rem" aria-describedby="yh" /></label>
    <button class="btn" type="submit">Аналізувати</button>
  </form>
  <p id="yh" class="small muted sans">Рік потрібен для хронологічних умов правил (наприклад, «ы» у тексті 1798 р. — архаїчний правопис, а не русизм).</p>

  <div v-if="!word" class="card muted">Введіть слово.</div>
  <template v-else-if="d && a">
    <section class="card"><h2><span>Кандидати сучасної форми</span><span class="small">норм.: {{ d.norm }}</span></h2>
      <p v-if="inLex.length" class="sans small">У словнику: <span v-for="h in inLex" :key="h.lemma" style="margin-right:.6rem"><RouterLink :to="`/w/${encodeURIComponent(h.lemma)}`">{{ h.lemma }}</RouterLink> ({{ h.via }})</span></p>
      <ul style="list-style:none;padding:0;margin:0">
        <li v-for="c in d.candidates" :key="c.form" style="margin:.5rem 0">
          <strong style="font-size:1.2rem">{{ c.form }}</strong>
          <RouterLink v-if="byLemma.has(c.form)" :to="`/w/${encodeURIComponent(c.form)}`" class="small sans"> → картка</RouterLink>
          <span v-if="c.branches" class="muted small sans"> · гілок з лексичними винятками: {{ c.branches }}</span>
          <div v-if="c.steps.length" class="trace"><button v-for="(s, i) in c.steps" :key="i" type="button" :aria-expanded="open === c.form + i" @click="open = open === c.form + i ? null : c.form + i">{{ s.from }} → {{ s.to }} · <strong>{{ s.rule }}</strong> {{ ruleById[s.rule]?.name }}</button></div>
          <div v-else class="small muted sans">без змін (форма вже сучасна за цими правилами)</div>
          <template v-for="(s, i) in c.steps" :key="'e' + i"><div v-if="open === c.form + i" class="card" style="margin:.3rem 0"><EvidenceList :evidence="[ruleById[s.rule]!.cite]" /></div></template>
        </li>
      </ul>
      <p class="small muted sans">Кандидат — лише гіпотеза за правилами Шевельова; він стає зв’язком лише після збігу з формою ВЕСУМ (SPEC 10 M-3.2).</p>
    </section>

    <section class="card"><h2><span>Ознаки з доказами</span></h2>
      <div v-if="!a.known" class="card" style="background:var(--warn-soft);border-color:var(--warn)" role="note">
        <strong>Нормативну перевірку ВЕСУМ недоступно офлайн.</strong> Слова «{{ word }}» немає ні в lexindex (ВЕСУМ-нестандартні + LanguageTool), ні в словнику, тому правила,
        що спрацьовують лише через <em>відсутність</em> у ВЕСУМ (усі діалектні та суфіксні/префіксні:
        <code v-for="r in gatedRules.slice(0, 8)" :key="r.id" :title="r.note">{{ r.id }} </code><template v-if="gatedRules.length > 8">…</template>), вимкнено, щоб не ставити мітку без доказів. Нижче лише те, що спрацювало.
      </div>
      <div v-if="a.lt" class="small sans">LanguageTool: <code>{{ a.lt[0] }}</code> → «{{ a.lt[1] }}»</div>
      <div v-if="a.vesum.length" class="small sans">ВЕСУМ: <code v-for="(h, i) in a.vesum" :key="i" style="margin-right:.6rem">{{ h.lemma }} {{ h.tags }}</code></div>
      <ul v-if="claimList.length" style="list-style:none;padding:0">
        <li v-for="[label, c] in claimList" :key="label" style="margin:.5rem 0" class="sans">
          <ClaimBadge :claim="c" :text="labelUk(label)" :tone="categoryOf(label) ?? ''" />
          <span class="small muted"> · {{ AXIS_UK[ALL_RULES.find(r => r.label === label)?.axis ?? ''] ?? '' }}</span>
        </li>
      </ul>
      <p v-else class="muted sans">Жодне правило з джерелом не спрацювало — міток немає (<span class="unk">невідомо</span> ≠ «літературне»).</p>
    </section>

    <section v-if="a.hints.length" class="card"><h2><span>Гіпотези без джерела (лише для перевірки)</span></h2>
      <p class="small muted sans">Правила з вагою 0 не мають опублікованого джерела: вони не ставлять мітку, а лише ставлять форму в чергу на ручну перевірку (SPEC 00 P-1.3, P-3.1).</p>
      <ul class="sans small"><li v-for="h in a.hints" :key="h.rule"><code>{{ h.rule }}</code> → {{ labelUk(h.label) }} <span class="muted">{{ ruleOf(h.rule)?.note }}</span> <span class="unk">без джерела</span></li></ul>
    </section>
  </template>
  <div v-else class="skeleton" />
</template>
