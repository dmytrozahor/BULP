<script setup lang="ts">
/**
 * /analyze — runs in the browser. derive() candidates with traces; detect() with CS/CONTACT/DIALECT/REGISTER tables over lexindex.json.
 * Evidence-safe gating: "If the word is neither in lexindex nor in the lexicon the normative VESUM check is unavailable offline, so
 * absence-based dialect/suffix rules are gated" (src/lib/analyze.ts). Weight-0 rules are hypotheses without source → listed separately (P-1.3, P-3.1).
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ruleById } from '../../core/phonology.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import { AXIS_UK, labelUk } from '../lib/format.ts'
import { categoryOf, isRusyn, runDetectors, ruleOf, ALL_RULES } from '../lib/analyze.ts'
import { annotateSyntax } from '../lib/annotate.ts'
import SyntaxSpans from '../components/SyntaxSpans.vue'
import { modernize } from '../../core/modernize.ts'
import { lexHasBool } from '../lib/lexhas.ts'
import ModernForms from '../components/ModernForms.vue'
import ClaimBadge from '../components/ClaimBadge.vue'
import ClaimSet from '../components/ClaimSet.vue'
import FormBadge from '../components/FormBadge.vue'
import FormLegend from '../components/FormLegend.vue'
import EvidenceList from '../components/EvidenceList.vue'
import DeicticStructure from '../components/DeicticStructure.vue'
import LoanChip from '../components/LoanChip.vue'
import HeteronymReadings from '../components/HeteronymReadings.vue'
import IpaRow from '../components/IpaRow.vue'
import { analyzeLoan } from '../../core/loanwords.ts'
import { loanLabels } from '../lib/datasets.ts'
import { analyzeLink } from '../lib/analyze-links.ts'
import { attestationOf, type Attested } from '../lib/attest.ts'
import { formTo } from '../lib/nav.ts'
import { loadArchaic, loadLight } from '../lib/torotData.ts'
import { loadCardIndex } from '../lib/cardIndex.ts'
import { cardMap } from '../../core/cv.ts'
const route = useRoute(), router = useRouter()
const { annData, loaded, byLemma, searchIdx, witnessById } = useData()
/** SPEC 61 UX-7: `embed` = the word to analyse inline (search / word-card fallback for words outside the lexicon); the page chrome (title, form, legend) is then hidden */
const props = defineProps<{ embed?: string }>()
const q = ref(props.embed ?? String(route.query.q ?? '')), word = ref(q.value.trim()), year = ref('')
watch(() => route.query.q, v => { if (props.embed !== undefined) return; q.value = String(v ?? ''); word.value = q.value.trim() })
watch(() => props.embed, v => { if (v !== undefined) { q.value = v; word.value = v.trim() } })
const submit = () => { word.value = q.value.trim(); router.replace({ query: word.value ? { q: word.value } : {} }) }
const y = computed(() => (/^\d{3,4}$/.test(year.value) ? +year.value : undefined))
const d = computed(() => (word.value ? deriveWithSteps(word.value) : undefined))
const a = computed(() => (word.value && loaded.value ? runDetectors(word.value, annData.value, y.value) : undefined))
/** MO-2: last step of the old → modern derivation — «сучасний правопис: …», never over a form the lexicon attests */
const hasForm = computed(() => lexHasBool(annData.value))
const modOf = (form: string) => (loaded.value ? modernize(form, hasForm.value) : [])
const inLex = computed(() => (word.value ? searchIdx.value.map.get(key(word.value)) ?? [] : []))
const loan = computed(() => analyzeLoan(word.value, { labels: loanLabels }))
const allClaims = computed(() => Object.entries(a.value?.claims ?? {}))
const hasRusyn = computed(() => allClaims.value.some(([l]) => isRusyn(l)))
const parallelLabel = (l: string) => isRusyn(l) || (hasRusyn.value && (l === 'ZAK' || l === 'LEM'))
const claimList = computed(() => allClaims.value.filter(([l]) => !parallelLabel(l)))
const parallelClaims = computed(() => Object.fromEntries(allClaims.value.filter(([l]) => parallelLabel(l))))
const spans = computed(() => (word.value && loaded.value ? annotateSyntax(word.value, annData.value, y.value) : []))   // SPEC 60 SX-4
const open = ref<string | null>(null)
/** SPEC 63 NV-2: every form shown here leads to its page (/w, /lw or /f); the rare-lemma set loads lazily */
const light = ref<ReadonlySet<string>>()
loadLight().then(f => { light.value = new Set(f.lemmas.map(l => l[0])) }, () => undefined)
const cards = shallowRef<Map<string, { kind: 'lw' | 'ar'; id: string }[]>>()   // SPEC 63 CV-2: light / CV / archaic cards
loadCardIndex().then(ci => { cards.value = cardMap(ci) }, () => undefined)
const ctx = () => ({ lemmas: byLemma.value, hits: searchIdx.value.map, light: light.value, cards: cards.value })
/** NV-4: a form found in a witness (dictionary headword card or unlinked text spelling) is «засвідчено», not a hypothesis; filled for the input, the normalised form and every candidate */
const att = ref(new Map<string, Attested>())
watch([d, word], async () => {
  if (!d.value) return
  const forms = [...new Set([word.value, d.value.norm, ...d.value.candidates.map(c => c.form)])], arch = await loadArchaic().catch(() => undefined), m = new Map<string, Attested>()
  await Promise.all(forms.map(async f => { const r = await attestationOf(f, { arch, witness: id => witnessById.value.get(id) }); if (r) m.set(f, r) }))
  att.value = m
}, { immediate: true })
const to = (form: string) => { const l = analyzeLink(form, ctx()); return l.kind === 'word' ? l.to : att.value.get(form)?.to ?? l.to }
/** NV-3/NV-4: «сторінка слова» only when a lemma / light card stands behind the form; a dictionary headword → «картка слова»; else «сторінка написання» */
const linkLabel = (form: string) => (analyzeLink(form, ctx()).kind === 'word' ? '→ сторінка слова' : att.value.get(form)?.kind === 'card' ? '→ картка слова' : '→ сторінка написання')
const isAtt = (form: string) => att.value.has(form) && analyzeLink(form, ctx()).kind !== 'word'
const gatedRules = computed(() => (a.value?.gated ?? []).map(id => ruleOf(id)!).filter(Boolean))
</script>

<template>
  <template v-if="!embed">
  <h1>Аналіз слова</h1>
  <p class="muted">Працює у браузері: виводить сучасні кандидати з трасою правил і шукає церковнослов’янські, контактні, діалектні та розмовні ознаки — лише з посиланням на джерело правила й на дані, що його спрацювали.</p>
  <form class="row" @submit.prevent="submit">
    <input v-model="q" type="search" placeholder="напр. кънѧзь, градъ, співпадати" aria-label="Слово" style="flex:1 1 14rem" spellcheck="false" />
    <label class="sans small">рік тексту <input v-model="year" type="text" inputmode="numeric" placeholder="порожньо = сучасне" style="width:9rem" aria-describedby="yh" /></label>
    <button class="btn" type="submit">Аналізувати</button>
  </form>
  <p id="yh" class="small muted sans">Рік потрібен для хронологічних умов правил (наприклад, «ы» у тексті 1798 р. — архаїчний правопис, а не русизм).</p>

  <FormLegend />
  </template>
  <div v-if="!word" class="card muted">Введіть слово.</div>
  <template v-else-if="d && a">
    <section class="card"><h2><span>Кандидати сучасної форми</span><span class="small">норм.: <RouterLink :to="to(d.norm)" class="lang">{{ d.norm }}</RouterLink></span></h2>
      <p class="sans small">Введена форма: <RouterLink :to="formTo(word)" class="lang">{{ word }}</RouterLink>
        <template v-if="isAtt(word)"> · <span class="attested-badge">засвідчено: {{ att.get(word)!.text }}</span> <RouterLink :to="att.get(word)!.to">{{ linkLabel(word) }}</RouterLink></template></p>
      <p v-if="inLex.length" class="sans small">У словнику: <span v-for="h in inLex" :key="h.lemma" style="margin-right:.6rem"><RouterLink :to="`/w/${encodeURIComponent(h.lemma)}`">{{ h.lemma }}</RouterLink> ({{ h.via }})</span></p>
      <ul style="list-style:none;padding:0;margin:0">
        <li v-for="c in d.candidates" :key="c.form" style="margin:.5rem 0">
          <FormBadge v-if="byLemma.has(c.form) || searchIdx.map.has(key(c.form))" kind="attested" :form="c.form" label="є в словнику" />
          <FormBadge v-else-if="isAtt(c.form)" kind="attested" :form="c.form" :label="'засвідчено: ' + att.get(c.form)!.text" />
          <FormBadge v-else kind="derived" :form="c.form" label="реконструкція (гіпотеза)" />
          <RouterLink :to="to(c.form)" class="small sans"> {{ linkLabel(c.form) }}</RouterLink>
          <span v-if="c.branches" class="muted small sans"> · гілок з лексичними винятками: {{ c.branches }}</span>
          <div v-if="c.steps.length" class="trace"><button v-for="(s, i) in c.steps" :key="i" type="button" :aria-expanded="open === c.form + i" @click="open = open === c.form + i ? null : c.form + i">{{ s.from }} → {{ s.to }} · <strong>{{ s.rule }}</strong> {{ ruleById[s.rule]?.name }}</button></div>
          <div v-if="c.steps.length" class="small sans chain-links">ланцюг: <template v-for="(s, i) in c.steps" :key="'cl' + i"><RouterLink v-if="i === 0" :to="to(s.from)" class="lang">{{ s.from }}</RouterLink> → <RouterLink :to="to(s.to)" class="lang">{{ s.to }}</RouterLink> </template></div>
          <div v-else class="small muted sans">без змін (форма вже сучасна за цими правилами)</div>
          <ModernForms :mods="modOf(c.form)" />
          <template v-for="(s, i) in c.steps" :key="'e' + i"><div v-if="open === c.form + i" class="card" style="margin:.3rem 0"><EvidenceList :evidence="[ruleById[s.rule]!.cite]" /></div></template>
        </li>
      </ul>
      <p class="small muted sans">Кандидат — лише гіпотеза за правилами Шевельова; він стає зв’язком лише після збігу з формою ВЕСУМ (SPEC 10 M-3.2).</p>
    </section>

    <DeicticStructure :word="word" />
    <HeteronymReadings :form="word" />   <!-- SPEC 60 HT-2: renders only for known heteronyms -->
    <section class="card"><h2><span>Вимова · IPA</span></h2><IpaRow :variants="[]" :lemma="word" /></section>

    <section v-if="loan.foreign" class="card"><h2><span>Мова-джерело (гіпотези)</span><span class="small">правила з джерелами · research/26</span></h2>
      <p class="sans"><LoanChip :word="word" :attested="a.known || inLex.length > 0" /></p>
      <p class="small muted sans">Розпізнавання запозичення виведене з суфіксів і написання; мітка Вікісловника (якщо є) важить більше за правила. Твердження робить лише правило класу A.</p>
    </section>

    <section class="card"><h2><span>Ознаки з доказами</span></h2>
      <div v-if="!a.known" class="card" style="background:var(--warn-soft);border-color:var(--warn)" role="note">
        <strong>Нормативну перевірку ВЕСУМ недоступно офлайн.</strong> Слова «{{ word }}» немає ні в lexindex (ВЕСУМ-нестандартні + LanguageTool), ні в словнику, тому правила,
        що спрацьовують лише через <em>відсутність</em> у ВЕСУМ (усі діалектні та суфіксні/префіксні:
        <code v-for="r in gatedRules.slice(0, 8)" :key="r.id" :title="r.note">{{ r.id }} </code><template v-if="gatedRules.length > 8">…</template>), вимкнено, щоб не ставити мітку без доказів. Нижче лише те, що спрацювало.
      </div>
      <div v-if="a.lt" class="small sans">LanguageTool: <code>{{ a.lt[0] }}</code> → «{{ a.lt[1] }}»</div>
      <div v-if="a.vesum.length" class="small sans">ВЕСУМ: <code v-for="(h, i) in a.vesum" :key="i" style="margin-right:.6rem">{{ h.lemma }} {{ h.tags }}</code></div>
      <div v-if="hasRusyn" class="sans"><ClaimSet :claims="parallelClaims" /></div>
      <ul v-if="claimList.length" style="list-style:none;padding:0">
        <li v-for="[label, c] in claimList" :key="label" style="margin:.5rem 0" class="sans">
          <ClaimBadge :claim="c" :text="labelUk(label)" :tone="categoryOf(label) ?? ''" />
          <span class="small muted"> · {{ AXIS_UK[ALL_RULES.find(r => r.label === label)?.axis ?? ''] ?? '' }}</span>
        </li>
      </ul>
      <p v-else-if="!hasRusyn" class="muted sans">Жодне правило з джерелом не спрацювало — міток немає (<span class="unk">невідомо</span> ≠ «літературне»).</p>
    </section>

    <section v-if="spans.length" class="card"><h2><span>Багатослівні конструкції</span></h2>
      <p class="small muted sans">Введіть фразу («я би-м зробив», «к тобі», «д місту»), щоб побачити аналітичні форми, енклітики та скорочені прийменники. Датування джерела не наводять.</p>
      <SyntaxSpans :spans="spans" />
    </section>

    <section v-if="a.hints.length" class="card"><h2><span>Гіпотези без джерела (лише для перевірки)</span></h2>
      <p class="small muted sans">Правила з вагою 0 не мають опублікованого джерела: вони не ставлять мітку, а лише ставлять форму в чергу на ручну перевірку (SPEC 00 P-1.3, P-3.1).</p>
      <ul class="sans small"><li v-for="h in a.hints" :key="h.rule"><code>{{ h.rule }}</code> → {{ labelUk(h.label) }} <span class="muted">{{ ruleOf(h.rule)?.note }}</span> <span class="unk">без джерела</span></li></ul>
    </section>
  </template>
  <div v-else class="skeleton" />
</template>
