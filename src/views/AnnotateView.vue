<script setup lang="ts">
/**
 * /annotate — paste any text; every word is looked up (core/text.ts key()) among lexicon lemmas and historical spellings.
 * Status = underline/background; strongest claim = underline style + colour (double CS · wavy contact · dotted dialect · dashed colloquial · thin archaic).
 * Hover/focus a word → compact card (side panel, so evidence popovers stay open). Examples are real passages from the cached witnesses.
 * SPEC 00 P-3.1: unknown words stay muted and unlabelled.
 */
import { computed, ref, watch } from 'vue'
import { EPOCHS } from '../../core/epochs.ts'
import { useData } from '../composables/useData.ts'
import { annotate, summarize, type AnnotatedToken } from '../lib/annotate.ts'
import { CATEGORIES, CATEGORY_UK } from '../lib/analyze.ts'
import { epochShort, fmtDate, fmtNum } from '../lib/format.ts'
import { EXAMPLES } from '../data/examples.ts'
import WordCard from '../components/WordCard.vue'
const { annData, loaded } = useData()
const exId = ref(''), text = ref(''), year = ref('')
const ex = computed(() => EXAMPLES.find(e => e.id === exId.value))
watch(exId, () => { if (ex.value) { text.value = ex.value.text; year.value = String(ex.value.date[1]) } })
const y = computed(() => (/^\d{3,4}$/.test(year.value.trim()) ? +year.value : undefined))
const tokens = computed(() => (loaded.value ? annotate(text.value.slice(0, 20000), annData.value, y.value) : []))
const sum = computed(() => summarize(tokens.value))
const hot = ref<AnnotatedToken | null>(null)
const parts = computed(() => {
  const out: ({ gap: string } | { t: AnnotatedToken; i: number })[] = []; let at = 0
  tokens.value.forEach((t, i) => { if (t.start > at) out.push({ gap: text.value.slice(at, t.start) }); out.push({ t, i }); at = t.end })
  if (at < text.value.length) out.push({ gap: text.value.slice(at, 20000) })
  return out
})
const shev = EPOCHS.filter(e => e.scheme === 'shev' && !e.overlay)
const maxEp = computed(() => Math.max(1, ...Object.values(sum.value.epochProfile)))
const cls = (t: AnnotatedToken) => ['w', t.status === 'attested' ? 'attested-s' : t.status, t.mark ? 'm-' + t.mark : '', t.provenance === 'derived' ? 'derived' : ''].join(' ')
const label = (t: AnnotatedToken) => `${t.raw}: ${t.status}${t.mark ? ', ' + CATEGORY_UK[t.mark] : ''}`
</script>

<template>
  <h1>Анотатор тексту</h1>
  <p class="muted">Вставте текст (сучасний, давньоруський, староукраїнський) або оберіть уривок із пам’яток корпусу. Слово підкреслено за найсильнішою міткою з доказом; невідомі слова лишаються без міток.</p>

  <div class="cols wide-side">
    <div>
      <section class="card">
        <div class="row sans" style="margin-bottom:.6rem">
          <label>Приклад: <select v-model="exId" aria-label="Приклад із корпусу"><option value="">— власний текст —</option><option v-for="e in EXAMPLES" :key="e.id" :value="e.id">{{ e.title }}</option></select></label>
          <label class="small">рік тексту <input v-model="year" type="text" inputmode="numeric" placeholder="порожньо = сучасний" style="width:9rem" aria-describedby="yh2" /></label>
        </div>
        <p id="yh2" class="small muted sans" style="margin:0 0 .5rem">Рік вмикає хронологічні умови правил: «ы» у тексті 1798 р. — архаїчний правопис, а не русизм.</p>
        <p v-if="ex" class="small sans">Джерело: <strong>{{ ex.title }}</strong> · {{ ex.loc }} · {{ fmtDate(ex.date) }} · <a :href="ex.url" target="_blank" rel="noopener">{{ ex.url }}</a>
          <span v-if="ex.note" class="muted"> · {{ ex.note }}</span> <span class="muted">· уривок скопійовано дослівно з кешованого файлу</span></p>
        <textarea v-model="text" class="src" aria-label="Текст для анотації" placeholder="Вставте текст…" spellcheck="false"></textarea>
        <div class="legend" aria-label="Легенда">
          <span><span class="sw" style="background:var(--accent-soft)"></span>є в корпусі (посилання)</span>
          <span><span class="sw" style="background:var(--surface-2)"></span>лише в індексі ВЕСУМ/LT</span>
          <span class="muted">сірий — невідомо</span>
          <span v-for="c in CATEGORIES" :key="c"><span :class="['sw', 'sw-' + c]"></span>{{ CATEGORY_UK[c] }}</span>
          <span><span class="sw" style="border-style:dashed"></span><i>реконструкція</i> (зарезервовано)</span>
        </div>
      </section>

      <section v-if="!loaded" class="card"><div class="skeleton" v-for="i in 3" :key="i" /></section>
      <section v-else-if="tokens.length" class="card" aria-label="Анотований текст">
        <div class="ann"><template v-for="(p, k) in parts" :key="k"><template v-if="'gap' in p">{{ p.gap }}</template>
          <RouterLink v-else-if="p.t.status === 'attested' && p.t.card" :to="`/w/${encodeURIComponent(p.t.card.lemma)}`" :class="cls(p.t)" :aria-label="label(p.t)"
            @mouseenter="hot = p.t" @focus="hot = p.t">{{ p.t.raw }}</RouterLink>
          <span v-else :class="cls(p.t)" tabindex="0" :aria-label="label(p.t)" @mouseenter="hot = p.t" @focus="hot = p.t">{{ p.t.raw }}</span></template></div>
      </section>
    </div>

    <aside aria-label="Підсумок">
      <section class="card"><h2><span>Слово</span></h2>
        <WordCard v-if="hot" :t="hot" />
        <p v-else class="small muted sans">Наведіть курсор або перейдіть Tab на слово.</p></section>

      <section v-if="sum.total" class="card"><h2><span>Підсумок</span></h2>
        <p class="sans small" style="margin-top:0"><strong style="font-size:1.4rem">{{ fmtNum(sum.pct * 100, 0) }}%</strong> слів прив’язано до лем корпусу ({{ sum.linked }} із {{ sum.total }}) ·
          лише в індексі: {{ sum.byStatus.lexindex }} · лише правила: {{ sum.byStatus.rules }} · невідомо: {{ sum.byStatus.unknown }}</p>
        <div class="bar" role="img" :aria-label="`прив’язано ${fmtNum(sum.pct * 100, 0)}%`"><i :style="{ width: sum.pct * 100 + '%' }"></i></div>
        <h3 class="small sans muted" style="margin-top:.8rem">Мітки (кількість слів)</h3>
        <ul class="sans small" style="list-style:none;padding:0;margin:0"><li v-for="c in CATEGORIES" :key="c"><span :class="['sw', 'sw-' + c]"></span>{{ CATEGORY_UK[c] }}: <strong>{{ sum.byMark[c] }}</strong></li></ul>
        <h3 class="small sans muted" style="margin-top:.8rem">Епохи першої фіксації лем (шкала Шевельова)</h3>
        <div v-for="(e, i) in shev" :key="e.id" class="small sans" style="margin:.25rem 0">
          <div class="row" style="justify-content:space-between"><span>{{ epochShort(e.id) }}</span><span>{{ sum.epochProfile[e.id] ?? 0 }}</span></div>
          <div class="bar"><i :style="{ width: ((sum.epochProfile[e.id] ?? 0) / maxEp) * 100 + '%', background: `var(--ep${i + 1})` }"></i></div>
        </div>
        <p class="small muted sans">Рахуються різні леми; знаменник — прив’язані леми тексту, не корпус.</p>
        <h3 class="small sans muted" style="margin-top:.8rem">Невідомі слова ({{ sum.unknown.length }})</h3>
        <div class="row small"><RouterLink v-for="u in sum.unknown" :key="u" :to="{ path: '/analyze', query: { q: u } }">{{ u }}</RouterLink><span v-if="!sum.unknown.length" class="muted">немає</span></div>
      </section>
    </aside>
  </div>
</template>
