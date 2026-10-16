<script setup lang="ts">
/**
 * /annotate — paste any text; every word is looked up (core/text.ts key()) among lexicon lemmas and historical spellings.
 * Status = underline/background; strongest claim = underline style + colour (double CS · wavy contact · dotted dialect · dashed colloquial · thin archaic).
 * Hover/focus a word → compact card (side panel, so evidence popovers stay open). Examples are real passages from the cached witnesses.
 * SPEC 00 P-3.1: unknown words stay muted and unlabelled.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { settled } from '../lib/parts.ts'
import { EPOCHS } from '../../core/epochs.ts'
import { useData } from '../composables/useData.ts'
import { annotate, annotateSyntax, summarize, type AnnotatedToken } from '../lib/annotate.ts'
import type { SyntaxSpan } from '../../core/syntax.ts'
import SyntaxSpans from '../components/SyntaxSpans.vue'
import { CATEGORIES, CATEGORY_UK } from '../lib/analyze.ts'
import { epochShort, fmtDate, fmtNum } from '../lib/format.ts'
import { EXAMPLES } from '../data/examples.ts'
import { isOldForm, textTo, wordTo, witnessTo } from '../lib/nav.ts'
import FormLegend from '../components/FormLegend.vue'
import UsageLegend from '../components/UsageLegend.vue'
import WordCard from '../components/WordCard.vue'
import { HETERONYM_FLAG, heteronymOf } from '../../core/heteronyms.ts'
const { annData, loaded } = useData()
const exId = ref(''), text = ref(''), year = ref('')
const ex = computed(() => EXAMPLES.find(e => e.id === exId.value))
watch(exId, () => { if (ex.value) { text.value = ex.value.text; year.value = String(ex.value.date[1]) } })
const y = computed(() => (/^\d{3,4}$/.test(year.value.trim()) ? +year.value : undefined))
/** SPEC 63 PF-3: the annotator reads its lookups from the prefix shards; settled() re-runs it until every shard its tokens need is in memory (one result, not a re-render per arrival) */
const tokens = shallowRef<AnnotatedToken[]>([]), spans = shallowRef<SyntaxSpan[]>([]), busy = ref(false)
let seq = 0, timer: ReturnType<typeof setTimeout> | undefined
watch([text, y, loaded], () => {
  clearTimeout(timer)
  if (!loaded.value) return
  busy.value = true
  timer = setTimeout(async () => {
    const n = ++seq, t = text.value.slice(0, 20000), yr = y.value
    const r = await settled(() => ({ tk: annotate(t, annData.value, yr), sp: annotateSyntax(t, annData.value, yr) }))
    if (n === seq) { tokens.value = r.tk; spans.value = r.sp; busy.value = false }
  }, 200)
}, { immediate: true })
const sum = computed(() => summarize(tokens.value))
const hot = ref<AnnotatedToken | null>(null)
// SPEC 60 SX-4: multi-token spans (core/syntax.ts) are drawn as a bracket underline around their tokens
const hotSpan = ref<SyntaxSpan | null>(null)
type Part = { gap: string } | { t: AnnotatedToken; i: number }
const groups = computed(() => {
  const out: { span?: SyntaxSpan; parts: Part[] }[] = []; let at = 0, cur: (typeof out)[number] | undefined
  tokens.value.forEach((t, i) => {
    const s = spans.value.find(sp => t.start < sp.end && sp.start < t.end), gap = t.start > at ? text.value.slice(at, t.start) : ''
    if (s && cur?.span === s) { if (gap) cur.parts.push({ gap }); cur.parts.push({ t, i }) }
    else { if (gap) out.push({ parts: [{ gap }] }); cur = { span: s, parts: [{ t, i }] }; out.push(cur) }
    at = t.end
  })
  if (at < text.value.length) out.push({ parts: [{ gap: text.value.slice(at, 20000) }] })
  return out
})
const shev = EPOCHS.filter(e => e.scheme === 'shev' && !e.overlay)
const maxEp = computed(() => Math.max(1, ...Object.values(sum.value.epochProfile)))
const cls = (t: AnnotatedToken) => ['w', t.status === 'attested' ? 'attested-s' : t.status, t.mark ? 'm-' + t.mark : '', t.provenance === 'derived' ? 'derived' : '', t.numeral ? 'numeral' : '', isOldForm(t.raw, y.value) ? 'old' : '', heteronymOf(t.key) ? 'het' : ''].join(' ')
const numTitle = (t: AnnotatedToken) => t.numeral ? `числівник = ${t.numeral.value}` + (t.numeral.ad ? ` (від створення світу) = ${t.numeral.ad} р. по Р.Х.` : '') : undefined
const label = (t: AnnotatedToken) => t.numeral ? numTitle(t)! : `${t.raw}: ${t.status}${t.mark ? ', ' + CATEGORY_UK[t.mark] : ''}${heteronymOf(t.key) ? ', ' + HETERONYM_FLAG : ''}`
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
        <p v-if="ex" class="small sans">Джерело: <RouterLink :to="witnessTo(ex.witness)"><strong>{{ ex.title }}</strong></RouterLink> · <RouterLink :to="textTo(ex.witness, ex.loc)">{{ ex.loc }}</RouterLink> · {{ fmtDate(ex.date) }} · <a :href="ex.url" target="_blank" rel="noopener">оригінал ↗</a>
          <span v-if="ex.note" class="muted"> · {{ ex.note }}</span> <span class="muted">· уривок скопійовано дослівно з кешованого файлу</span></p>
        <textarea v-model="text" class="src" aria-label="Текст для анотації" placeholder="Вставте текст…" spellcheck="false"></textarea>
        <div class="legend" aria-label="Легенда">
          <span><span class="sw" style="background:var(--accent-soft)"></span>є в корпусі (посилання)</span>
          <span><span class="sw" style="background:var(--surface-2)"></span>лише в індексі ВЕСУМ/LT</span>
          <span class="muted">сірий — невідомо</span>
          <span v-for="c in CATEGORIES" :key="c"><span :class="['sw', 'sw-' + c]"></span>{{ CATEGORY_UK[c] }}</span>
          <span><span class="sw" style="border-style:dashed"></span><i>реконструкція (гіпотеза)</i>: виведено правилами, у корпусі не знайдено</span>
          <RouterLink to="/derive">деривація →</RouterLink>
        </div>
        <FormLegend />
        <UsageLegend />
      </section>

      <section v-if="!loaded" class="card"><div class="skeleton" v-for="i in 3" :key="i" /></section>
      <section v-else-if="tokens.length" class="card" aria-label="Анотований текст">
        <div class="ann"><span v-for="(g, gi) in groups" :key="gi" :class="g.span ? ['syn', g.span.hint ? 'syn-hint' : ''] : undefined"
            :title="g.span ? `${g.span.modern} · ${g.span.note}` : undefined" @mouseenter="g.span && (hotSpan = g.span)"><template v-for="(p, k) in g.parts" :key="k"><template v-if="'gap' in p">{{ p.gap }}</template>
          <RouterLink v-else-if="p.t.card" :to="wordTo(p.t.card.lemma)" :class="cls(p.t)" :aria-label="label(p.t)"
            @mouseenter="hot = p.t" @focus="hot = p.t">{{ p.t.raw }}<sup v-if="p.t.provenance === 'derived'" class="derived-badge">реконстр.</sup></RouterLink>
          <RouterLink v-else-if="!p.t.numeral" :to="{ path: '/analyze', query: { q: p.t.raw } }" :class="cls(p.t)" :aria-label="label(p.t)" @mouseenter="hot = p.t" @focus="hot = p.t">{{ p.t.raw }}</RouterLink>
          <span v-else :class="cls(p.t)" tabindex="0" :aria-label="label(p.t)" :title="numTitle(p.t)" @mouseenter="hot = p.t" @focus="hot = p.t">{{ p.t.raw }}<sup v-if="p.t.numeral && p.t.numeral.start === p.t.start" class="derived-badge">= {{ p.t.numeral.ad ? p.t.numeral.ad + ' р.' : p.t.numeral.value }}</sup></span></template></span></div>
      </section>
    </div>

    <aside aria-label="Підсумок">
      <section class="card"><h2><span>Слово</span></h2>
        <WordCard v-if="hot" :t="hot" :year="y" />
        <p v-else class="small muted sans">Наведіть курсор або перейдіть Tab на слово.</p></section>

      <section v-if="spans.length" class="card"><h2><span>Багатослівні конструкції ({{ spans.length }})</span></h2>
        <p class="small muted sans">Дужка під кількома словами — аналітична форма, енклітик або скорочений прийменник (SPEC 60 SX). Мітка лише з джерелом (ЕУМ, um159); правила без джерела — «гіпотеза».</p>
        <SyntaxSpans v-if="hotSpan" :spans="[hotSpan]" />
        <details><summary class="small sans">усі конструкції тексту</summary><SyntaxSpans :spans="spans" /></details></section>

      <section v-if="sum.total" class="card"><h2><span>Підсумок</span></h2>
        <p class="sans small" style="margin-top:0"><strong style="font-size:1.4rem">{{ fmtNum(sum.pct * 100, 0) }}%</strong> слів прив’язано до лем корпусу ({{ sum.linked }} із {{ sum.total }}) ·
          виведено правилами (гіпотези): {{ sum.derived }} · лише в індексі: {{ sum.byStatus.lexindex }} · лише правила: {{ sum.byStatus.rules }} · невідомо: {{ sum.byStatus.unknown }}</p>
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
