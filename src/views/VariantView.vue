<script setup lang="ts">
/**
 * SPEC 63 DB-3b — the card of a DIALECT VARIANT of a lemma: /v/<dialect>/<form>?of=<lemma>. A full card of its own (header + chips, tabs Огляд / Форми / Історія / Значення / Поширення / Джерела,
 * the statistics column, the map), NOT a panel above the standard card.
 * > owner 2026-11-04: «не підкартка в картці а підкартка типу окрема картка для леми»
 * The dialect is in the URL, so a shared link works under any switch setting. Every number is the variant's OWN, computed at route time from the parent lemma's spelling data (core/variant-card.ts):
 * its spellings' tokens, witnesses, first reliable fixation, regions, centuries, examples. What the variant cannot have of its own (senses, etymology) is shown labelled «від леми …»; where
 * nothing exists the card says «немає даних» / «у корпусі не засвідчено». Header grade: «засвідчена форма» (a printed form) or «виведено за правилами» (a reconstruction, with its rule and cite).
 */
import { computed, defineAsyncComponent, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { DIALECTS } from '../../core/rules.ts'
import { key } from '../../core/text.ts'
import { variantPlan } from '../../core/subcard.ts'
import { variantStats, type VForm } from '../../core/variant-card.ts'
import { badgeWithFirst } from '../../core/dialect-first.ts'
import { firstRegions } from '../../core/first-region.ts'
import { groupShort, hyp, type BadgeChip } from '../../core/dialect-badge.ts'
import { GROUP_MARK, markByKey } from '../../core/coats.ts'
import { useData } from '../composables/useData.ts'
import { corrOf } from '../lib/corrData.ts'
import { dialect as switchDialect, show } from '../lib/views.ts'
import { ctxOfTags } from '../lib/dialectView.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import { witnessTo, wordTo } from '../lib/nav.ts'
import CardLayout from '../components/CardLayout.vue'
import CardTabs from '../components/CardTabs.vue'
import Panel from '../components/Panel.vue'
import DialectBadge from '../components/DialectBadge.vue'
import EvidenceList from '../components/EvidenceList.vue'
import Kwic from '../components/Kwic.vue'
import RegionBars from '../components/RegionBars.vue'
import RegionMap from '../components/RegionMap.vue'
import FreqCurve from '../components/FreqCurve.vue'
import SensesBlock from '../components/SensesBlock.vue'
import EtymologyBlock from '../components/EtymologyBlock.vue'
const props = defineProps<{ dialect: string; form: string }>()
const route = useRoute(), router = useRouter()
const { byLemma, loaded, corpus, witnessById, fullOf } = useData()
const of = computed(() => (typeof route.query.of === 'string' ? route.query.of : ''))
const dname = computed(() => DIALECTS[props.dialect] ?? '')
const card = computed(() => (of.value ? byLemma.value.get(of.value) : undefined))
const full = computed(() => fullOf(card.value))
const groups = computed(() => (of.value ? corrOf(of.value) : []))
const shown = computed(() => (card.value ? show(card.value.lemma, props.dialect, '2019', ctxOfTags(card.value.paradigm[0]?.tags)) : undefined))
const forms = computed<VForm[]>(() => (full.value?.forms ?? []).map(f => ({ raw: f.raw, modern: f.modern, f: f.f, date: f.date, ...(f.ocrOnly ? { ocrOnly: true as const } : {}), ...(f.byW ? { byW: f.byW } : {}), kwic: f.kwic })))
/** the form may be a paradigm form of the lemma (ходит of ходити): the respelling that gives exactly this form decides */
const shownMatch = computed(() => { const s = shown.value; if (!card.value || !s) return s; if (key(s.text) === key(props.form)) return s; for (const p of card.value.paradigm) { const x = show(p.form, props.dialect, '2019', ctxOfTags(p.tags)); if (x.respelled && key(x.text) === key(props.form)) return x } return s })
const attestedSpelling = computed(() => forms.value.some(f => key(f.raw) === key(props.form) || (f.modern && key(f.modern) === key(props.form))))
const plan = computed(() => (card.value && groups.value !== undefined && shown.value ? variantPlan(of.value, props.dialect, props.form, groups.value, shownMatch.value, attestedSpelling.value, f => byLemma.value.has(f)) : undefined))
const stats = computed(() => variantStats(forms.value, props.form, key, id => witnessById.value.get(id), corpus.value?.regions, corpus.value?.N, corpus.value?.centurySizes))
const attested = computed(() => stats.value.f > 0)
const wait = computed(() => !loaded.value || (!!card.value && (!full.value || groups.value === undefined)))
const fired = computed(() => (plan.value?.kind === 'rule' ? shownMatch.value?.respelled?.fired ?? [] : []))
const paradigm = computed(() => {
  const seen = new Set<string>(), out: { from: string; to: string }[] = []
  for (const p of card.value?.paradigm ?? []) { const to = show(p.form, props.dialect, '2019', ctxOfTags(p.tags)).text; if (to !== p.form && !seen.has(p.form)) { seen.add(p.form); out.push({ from: p.form, to }) } }
  return out
})
/** the variant's OWN first-fixation chips (by witness region), plus the chip of the dialect itself with its honest grade */
const chips = computed<BadgeChip[]>(() => {
  const p = plan.value; if (!p) return []
  const mk = GROUP_MARK[props.dialect], code = props.dialect
  const dchip: BadgeChip = p.grade === 'attested'
    ? { grade: 'dict', text: groupShort(code), code, marks: mk ? [mk] : [], basis: `${p.note}: «${p.form}»`, evidence: p.ev }
    : hyp(groupShort(code), code, mk ? [mk] : [], `${p.note}: «${p.form}» — реконструкція за правилами говору «${dname.value}»; засвідченого написання немає`, fired.value.map(x => x.cite), 'spelling', p.form)
  const regs = corpus.value?.regions ?? []
  const byName = new Map(regs.map(r => [r.name, r.code] as const))
  const by: Record<string, number> = {}; for (const w of stats.value.byWitness) by[w.w] = w.n
  const fr = firstRegions(by, id => { const w = witnessById.value.get(id); return w ? { id, date: w.date, witnessType: w.witnessType, region: w.region, oq: (w as { oq?: unknown }).oq, dateUncertain: (w as { dateUncertain?: unknown }).dateUncertain } : undefined }, w => { const c = byName.get((w.region ?? '').trim()); return c ? { code: c, place: false } : undefined })
  const rest = fr ? badgeWithFirst({ d: { c: 'few' }, regionName: c => regs.find(r => r.code === c)?.name ?? c, lemma: p.form, fr }).filter(c => c.role) : []
  return [dchip, ...rest]
})
// the switch changed on the variant page: the URL decides what this card is, but a new switch value answers with that dialect's variant of the lemma (or the standard card)
watch(switchDialect, (n, o) => {
  if (n === o || !of.value) return
  if (!n) { router.replace({ path: wordTo(of.value), query: { std: '1' } }); return }
  if (n !== props.dialect) router.replace({ path: wordTo(of.value) })   // the lemma page answers the new dialect (variant card, lexical card or a note)
})
const back = computed(() => ({ path: wordTo(of.value), query: { std: '1' } }))
const stat = computed(() => ({ f: stats.value.f, ipm: stats.value.ipm }))
</script>

<template>
  <div v-if="wait"><div class="skeleton" style="height:3rem;width:50%" /><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <div v-else-if="!of || !card" class="card" role="status" data-testid="variant-nolemma">
    <h1>Варіант «{{ form }}» ({{ dname || dialect }})</h1>
    <p class="sans">Не вказано лему, до якої належить варіант, або такої леми немає в корпусі. <RouterLink to="/">До пошуку →</RouterLink></p>
  </div>
  <div v-else-if="!plan" class="card" role="status" data-testid="variant-none">
    <RouterLink :to="back" class="subback sans" data-testid="subcard-back">← {{ of }} <span class="muted">(нормативна лема)</span></RouterLink>
    <h1>«{{ form }}» — немає такого варіанта леми «{{ of }}» у говорі «{{ dname || dialect }}»</h1>
    <p class="sans small muted">Ні група відповідників, ні правила говору, ні написання леми в корпусі не дають цієї форми. Невідоме залишається невідомим.</p>
  </div>
  <article v-else class="variantcard" data-testid="variant-card" :data-dialect="dialect" :data-kind="plan.kind" :data-attested="attested ? '1' : '0'">
    <RouterLink :to="back" class="subback sans" data-testid="subcard-back" :aria-label="`назад до нормативної леми ${of}`">← {{ of }} <span class="muted">(нормативна лема)</span></RouterLink>
    <header class="wordhead headline compact">
      <div class="hwrow"><h1 class="lemma" data-testid="variant-form">{{ plan.form }}</h1><DialectBadge :lemma="plan.form" :chips-in="chips" /></div>
      <p class="hl-line sans" data-testid="variant-grade">
        <span :class="['badge', plan.grade === 'attested' ? 'dialect' : 'subderived']" :title="plan.note">{{ plan.grade === 'attested' ? 'засвідчена форма' : 'виведено за правилами' }}</span>
        <span class="muted"> · варіант леми <RouterLink :to="back">{{ of }}</RouterLink> у говорі «{{ dname }}» · {{ plan.note }}</span>
      </p>
      <p v-if="!attested" class="sans" data-testid="variant-unattested"><strong>У корпусі не засвідчено.</strong> <span class="muted">Жодне написання леми «{{ of }}» у даних не збігається з «{{ plan.form }}»; чисел цього варіанта немає (не підставлено числа леми).</span></p>
    </header>
    <CardLayout>
      <CardTabs>
        <template #overview>
          <Panel id="v-first" title="Перша фіксація цього написання" :open="true" :empty="!stats.first" empty-text="немає даних (у корпусі не засвідчено)" :summary="stats.first ? fmtDate(stats.first.date) : ''">
            <p v-if="stats.first" class="sans" data-testid="variant-first"><strong>{{ fmtDate(stats.first.date) }}</strong> · «{{ stats.first.form }}»
              <template v-if="stats.first.witness"> · <RouterLink :to="witnessTo(stats.first.witness)">{{ witnessById.get(stats.first.witness)?.title ?? stats.first.witness }}</RouterLink></template>
              <span class="muted small"> — найраніше надійне свідчення САМЕ цього написання (без OCR низької якості й без словників)</span></p>
          </Panel>
          <Panel id="v-ev" title="Словникові рядки, що називають цю форму" :open="plan.ev.length > 0" :empty="!plan.ev.length" empty-text="немає (форму виведено за правилами)" :summary="`${plan.ev.length}`"><EvidenceList :evidence="plan.ev" /></Panel>
        </template>
        <template #forms>
          <Panel id="v-forms" title="Написання цього варіанта в корпусі" :open="true" :empty="!stats.forms.length" empty-text="не засвідчено" :summary="`${stats.forms.length}`">
            <ul class="sans small"><li v-for="f in stats.forms" :key="f.raw"><span class="lang">{{ f.raw }}</span> · {{ f.f }} ужив. · від {{ fmtDate(f.date) }}<span v-if="f.ocrOnly" class="muted"> (лише OCR низької якості)</span></li></ul>
          </Panel>
          <Panel id="v-par" title="Форми парадигми в цьому говорі" :open="true" :empty="!paradigm.length" empty-text="немає змін" :summary="`${paradigm.length}`">
            <p class="small sans muted" style="margin-top:0">Виведено за правилами говору «{{ dname }}» з парадигми леми «{{ of }}»; це реконструкція, не засвідчення.</p>
            <p class="small sans" data-testid="variant-paradigm"><template v-for="(p, i) in paradigm" :key="p.from"><template v-if="i"> · </template><span class="muted">{{ p.from }}</span> → <strong>{{ p.to }}</strong></template></p>
          </Panel>
          <Panel v-if="fired.length" id="v-rules" title="Правила, за якими виведено форму" :open="true" :summary="`${fired.length}`">
            <ul class="small sans" data-testid="variant-rules"><li v-for="x in fired" :key="x.rule"><code>{{ x.rule }}</code> {{ x.from }} → {{ x.to }} · «{{ x.cite.quote }}» <span class="muted">({{ x.cite.source }}, {{ x.cite.locator }})</span></li></ul>
          </Panel>
        </template>
        <template #history>
          <Panel id="v-ety" :title="`Етимологія — від леми «${of}»`" :open="false" summary="успадковано від леми (не окремі дані варіанта)"><EtymologyBlock :lemma="of" /></Panel>
        </template>
        <template #meanings>
          <Panel id="v-sn" :title="`Значення — від леми «${of}»`" :open="true" summary="успадковано від леми (не окремі дані варіанта)"><SensesBlock :lemma="of" /></Panel>
        </template>
        <template #spread>
          <Panel id="v-map" title="За регіонами пам’яток" :open="true" :empty="!stats.byRegion.length" empty-text="немає даних (у корпусі не засвідчено)" summary="карта: регіони пам’яток цього написання; герб — місце першої фіксації">
            <RegionMap :by="stats.byRegion" :chips="chips" />
          </Panel>
        </template>
        <template #sources>
          <Panel id="v-wit" title="Пам’ятки цього написання" :open="true" :empty="!stats.byWitness.length" empty-text="не засвідчено" :summary="`${stats.byWitness.length}`">
            <ul class="sans small"><li v-for="w in stats.byWitness.slice(0, 12)" :key="w.w"><RouterLink :to="witnessTo(w.w)">{{ witnessById.get(w.w)?.title ?? w.w }}</RouterLink><span class="muted"> · {{ w.n }} ужив.<template v-if="witnessById.get(w.w)"> · {{ fmtDate(witnessById.get(w.w)!.date) }}</template></span></li></ul>
          </Panel>
          <Panel id="v-kw" title="Приклади цього написання" :open="true" :empty="!stats.kwic.length" empty-text="не засвідчено" :summary="`${stats.kwic.length}`"><Kwic :lines="stats.kwic" :lemma="plan.form" /></Panel>
        </template>
      </CardTabs>
      <template #side>
        <Panel id="v-st" title="Статистика цього написання" :open="true" :empty="!attested" empty-text="немає даних (у корпусі не засвідчено)" :summary="attested ? `f = ${fmtNum(stat.f)}` : ''">
          <dl class="sidecounts small sans" data-testid="variant-stats">
            <dt>уживань</dt><dd data-testid="variant-f">{{ fmtNum(stat.f) }}</dd>
            <dt>на млн (ipm)</dt><dd>{{ stat.ipm === undefined ? 'немає даних' : fmtNum(stat.ipm, 1) }}</dd>
            <dt>перша фіксація</dt><dd>{{ stats.first ? fmtDate(stats.first.date) : 'немає даних' }}</dd>
            <dt>пам’яток</dt><dd>{{ stats.byWitness.length }}</dd>
          </dl>
          <p class="small muted sans">Усі числа — цього написання, не леми «{{ of }}».</p>
        </Panel>
        <Panel id="v-tc" title="За століттями" :open="true" :empty="!stats.byCentury.length" empty-text="немає даних" :summary="`${stats.byCentury.length} століть`"><FreqCurve :series="stats.byCentury" :sizes="corpus?.centurySizes ?? {}" /></Panel>
        <Panel id="v-sr" title="За регіонами" :open="true" :empty="!stats.byRegion.length" empty-text="немає даних" summary="ipm у регіоні = f / N слів пам’яток регіону"><RegionBars :by="stats.byRegion" /></Panel>
      </template>
    </CardLayout>
  </article>
</template>
