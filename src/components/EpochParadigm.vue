<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/**
 * SPEC 50 EP-7: paradigm per historical epoch next to the modern VESUM grid. Tabs = shev epochs (EP-7.1); cells in three classes by shape + text
 * (EP-7.3): attested (solid, source badge), reconstruction (dashed, italic, «реконструкція»), confirmed reconstruction (dashed + ✓).
 * Every shown form opens its evidence (EP-7.5); a cell without any is «невідомо», never «—» (EP-7.4, P-3.1).
 */
import { computed, ref } from 'vue'
import type { Claim } from '../../core/evidence.ts'
import { cellEvidence, SRC_NOTE } from '../../core/cells.ts'
import type { MorphChange } from '../../core/morph-history.ts'
import type { CellForm, EpochParadigms, StemValue, WitnessMeta } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { epochGrid, epochTabs, type GCell } from '../lib/epochGrid.ts'
import { placedCells } from '../lib/ux.ts'
import Spell from './Spell.vue'
import { epochName, epochShort, fmtDate } from '../lib/format.ts'
import { stemSample } from '../../core/morph-tables.ts'
import { epochById } from '../../core/epochs.ts'
import AuthorBadge from './AuthorBadge.vue'
import ClaimBadge from './ClaimBadge.vue'
import EvidencePopover from './EvidencePopover.vue'
import FormLegend from './FormLegend.vue'
const props = defineProps<{ epochs?: EpochParadigms; loading?: boolean; spellings?: string[]; start?: string; witnesses?: WitnessMeta[]; sizes?: Record<string, number>; noLegend?: boolean; kind?: string; /** SPEC 63 OV-1: modern spelling of a historical one (the card's forms), so the cells show the baseline orthography */ modernOf?: (raw: string) => string | undefined }>()
const emit = defineEmits<{ kwic: [raw: string] }>()
const { corpus, ensureCorpus } = useData()
if (!props.witnesses) ensureCorpus()   // cell examples index corpus.witnesses

const tabs = computed(() => epochTabs(props.epochs?.paradigms ?? [], props.sizes ?? corpus.value?.epochSizes ?? {}))
const chosen = ref(props.start ?? '')   // user's pick; until then the default tab follows the data (the shard may arrive after mount)
const sel = computed(() => chosen.value || tabs.value.default)
const oldEp = (s: string) => isOldForm(s, epochById[sel.value]?.end)
const cur = computed(() => tabs.value.tabs.find(t => t.id === sel.value))
const stem = computed(() => (props.epochs && props.epochs.stem.value !== 'unknown' ? (props.epochs.stem.value as StemValue) : undefined))
/** D4 / P-1.7: a stem assigned from a Stanza lemma is model-based, and so is every reconstruction built on it */
const sample = computed(() => stem.value ? stemSample(stem.value.type, stem.value.model) : undefined)
const modelStem = computed(() => !!props.epochs && (!!props.epochs.stem.method?.includes('stanza')))
const isVerb = computed(() => props.kind === 'verb')   // BL-8: verb grid — attested cells only, no stem type
const isPron = computed(() => props.kind === 'pron')   // FX-5: pronominal grid — no stem type, attested cells only
const grid = computed(() => epochGrid(cur.value?.p, sel.value, stem.value, props.kind))
const years = (id: string) => { const e = epochById[id]!; return `${e.start}${e.end >= 9999 ? '–…' : '–' + e.end}` }
const dropTxt = (p: NonNullable<typeof cur.value>['p']) => p && [p.dropped.conflict && `${p.dropped.conflict} з конфліктом міток`, p.dropped.underspecified && `${p.dropped.underspecified} з неповною міткою`, p.dropped.untagged && `${p.dropped.untagged} без розмітки`].filter(Boolean).join(', ')

const wOf = (f: CellForm) => (props.witnesses ?? corpus.value?.witnesses)?.[f.ex[0]]
const evOf = (f: CellForm) => cellEvidence(f, props.epochs!, { witnesses: props.witnesses ?? corpus.value?.witnesses ?? [] })
// CP-10.1: the full witness list arrives after the grid may already be open (ensureCorpus); until then a cell has no evidence to show (never throw while rendering)
const evsOf = (f: CellForm) => (props.witnesses ?? corpus.value?.witnesses)?.[f.ex[0]] ? [evOf(f)] : []
const isCs = (f: CellForm) => wOf(f)?.lang === 'chu-rus'
const ood = (f: CellForm) => f.src === 'stanza' && !!wOf(f)?.outOfDomain
const SRC_LET = { torot: 'T', stanza: 'M', vesum: 'В' } as const
const multi = (f: CellForm) => { const e = wOf(f)?.epochShev.value; return e && e !== 'unknown' && e.epochs.length > 1 ? e.epochs.map(epochShort).join(', ') : '' }
const noteTitle = (n: MorphChange) => `${n.id} · ${n.what}`
const cellId = (c: GCell) => c.key
/** UX-3: nothing placed in any cell → only the summary line (N, conflicts); the grid stays behind «показати таблицю» (nothing removed) */
const placed = computed(() => placedCells(props.epochs))
const totalN = computed(() => (props.epochs?.paradigms ?? []).reduce((n, p) => n + p.N, 0))
const dropped = computed(() => (props.epochs?.paradigms ?? []).reduce((a, p) => ({ conflict: a.conflict + p.dropped.conflict, underspecified: a.underspecified + p.dropped.underspecified, untagged: a.untagged + p.dropped.untagged }), { conflict: 0, underspecified: 0, untagged: 0 }))
const dropTxtAll = computed(() => dropTxt({ dropped: dropped.value } as any))
const forceGrid = ref(false)
const gridOn = computed(() => placed.value > 0 || forceGrid.value)
</script>

<template>
  <div class="epar">
    <div v-if="loading" class="skeleton" style="height:9rem" aria-label="завантаження історичних парадигм" />
    <p v-else-if="!epochs" class="muted small sans">історичні парадигми: немає даних</p>
    <template v-else>
      <p v-if="!placed" class="small sans epsum" role="status">Жодної форми не розміщено в клітинках: N = {{ totalN }}<template v-if="dropTxtAll"> · {{ dropTxtAll }}</template>.
        <span class="unk">невідомо</span> ≠ «форми не було».
        <button v-if="!forceGrid" type="button" class="chip small sans" @click="forceGrid = true">показати порожню таблицю</button></p>
      <template v-if="gridOn">
      <p v-if="isVerb" class="small sans muted" style="margin:.2rem 0 .4rem">дієслівна сітка: час/спосіб × особа × число; лише засвідчені форми й лише групи, що трапляються в цій добі (реконструкції дієслів немає: таблиці не процитовано). Модельна розмітка Stanza не розрізняє аорист, імперфект і перфект, тому такі токени не розміщено.</p>
      <p v-else-if="isPron" class="small sans muted" style="margin:.2rem 0 .4rem">займенникова сітка: відмінок × число, без типу основи; лише засвідчені форми (реконструкції займенників немає: таблиці не процитовано).</p>
      <div v-else class="row small sans" style="margin-bottom:.4rem">
        <span class="muted">тип основи:</span>
        <template v-if="stem">
          <ClaimBadge :claim="epochs.stem as Claim<unknown>" :text="`${sample!.proto} (${sample!.uk})`" />
          <span class="stem-sample">зразок відмінювання: <i lang="cu">{{ sample!.model }}</i><template v-if="sample!.page"> (Павленко, {{ sample!.page }})</template></span>
          <span class="muted">· {{ stem.rule }}</span>
          <span v-if="modelStem" class="derived-badge" title="тип основи визначено за лемою моделі Stanza, не за ручною розміткою (P-1.7)">основа: модель</span>
        </template>
        <span v-else class="unk" tabindex="0" title="жодне правило не спрацювало — реконструкції немає (P-3.1)">невідомо</span>
      </div>
      <div class="etabs" role="tablist" aria-label="Епохи (за Шевельовим)">
        <button v-for="t in tabs.tabs" :key="t.id" type="button" role="tab" :class="['etab', { off: t.disabled }]" :aria-selected="sel === t.id"
          :aria-disabled="t.disabled || undefined" :title="t.disabled ? 'у корпусі немає пам’яток цієї доби (N = 0)' : epochName(t.id)" @click="chosen = t.id">
          <strong>{{ epochShort(t.id) }}</strong> <span class="muted">{{ years(t.id) }}</span><br /><span class="small">N = {{ t.N }}</span>
        </button>
      </div>
      <div class="epanel" role="tabpanel">
        <p v-if="cur?.disabled" class="small sans unk">у корпусі немає пам’яток цієї доби (N = 0): клітинок і реконструкції немає</p>
        <template v-else>
          <p class="small sans muted" style="margin:.2rem 0">{{ epochName(sel) }}, N = {{ cur?.N ?? 0 }}
            <template v-if="dropTxt(cur?.p)"> · не розміщено в клітинках: {{ dropTxt(cur?.p) }}</template>
            <template v-if="!cur?.p"> · лему в цій добі не знайдено: усі клітинки невідомі</template></p>
          <p v-if="sel === 'shev.modern'" class="small sans muted" style="margin:.2rem 0">повна парадигма ВЕСУМ — у таблиці вище; тут — написання з пам’яток у клітинках.</p>
          <template v-else-if="isPron || isVerb" />
          <p v-else-if="!grid.reconstructed && (sel === 'shev.proto' || sel === 'shev.old')" class="small sans muted" style="margin:.2rem 0">реконструкції немає: <span class="unk">невідомо</span> (тип основи не визначено або немає таблиці).</p>
          <p v-else-if="!['shev.proto', 'shev.old'].includes(sel)" class="small sans muted" style="margin:.2rem 0">реконструкції для цієї доби немає: цитованої таблиці парадигм немає (EP-5.1).</p>
          <div class="tablewrap">
            <table class="etable">
              <thead><tr><th scope="col"></th><th v-for="c in grid.cols" :key="c.id" scope="col">{{ c.label }}</th></tr></thead>
              <tbody>
                <tr v-for="r in grid.rows" :key="r.label">
                  <th scope="row">{{ r.label }}</th>
                  <td v-for="(c, i) in r.cells" :key="i" :class="{ na: !c }" :colspan="r.span" :data-cell="c && cellId(c)" :data-col="grid.cols[i]?.label">
                    <template v-if="c">
                      <span v-if="c.tag" class="small muted dutag">{{ c.tag }}</span>
                      <!-- attested: solid -->
                      <EvidencePopover v-for="f in c.att" :key="f.raw" :evidence="evsOf(f)" :heading="`${f.raw} · ${c.key}`" :label="`${f.raw}, ${c.key}`"
                        :meta="`${f.n} ${f.n === 1 ? 'вживання' : 'вживань'} у цій добі`">
                        <span class="ef att"><strong :class="['lang', 'attested', { old: oldEp(f.raw) }]"><Spell v-if="modernOf?.(f.raw)" :w="modernOf(f.raw)!" :raw="f.raw" quiet /><template v-else>{{ f.raw }}</template></strong><sup v-if="f.n > 1" class="muted">×{{ f.n }}</sup>
                          <span class="sb" :title="SRC_NOTE[f.src]">{{ SRC_LET[f.src] }}</span><span v-if="f.amb && f.amb > 1" class="sb" :title="`токен міг стояти в ${f.amb} клітинках`">≈{{ f.amb }}</span>
                          <span v-if="isCs(f)" class="sb cs" title="церковнослов’янська пам’ятка руської редакції (MH-30): форма може не відбивати живу мову">ЦС</span>
                          <span v-if="ood(f)" class="sb" title="текст поза доменом моделі Stanza">модель поза доменом</span></span>
                        <template #extra>
                          <div class="small" style="margin-top:.3rem"><span class="muted">пам’ятка: </span><AuthorBadge v-if="wOf(f)" :author="wOf(f)!.author" :witness="wOf(f)!.id" /> · {{ wOf(f) ? fmtDate(wOf(f)!.date) : '' }}</div>
                          <div v-if="f.ctx" class="small"><span class="muted">контекст: </span>{{ f.ctx }}</div>
                          <div v-if="multi(f)" class="small muted">датування пам’ятки неточне: вона належить до кількох діб ({{ multi(f) }})</div>
                          <div v-if="isCs(f)" class="small muted">ЦС: церковнослов’янський текст руської редакції (MH-30), у сітці давньоукраїнської доби позначений окремо.</div>
                          <button v-if="spellings?.includes(f.raw)" type="button" class="chip small sans" @click="emit('kwic', f.raw)">приклади «{{ f.raw }}» (KWIC) →</button>
                        </template>
                      </EvidencePopover>
                      <!-- pronoun grid: enclitic (short) forms as a marked sub-row of the cell -->
                      <div v-if="c.enc?.length" class="encrow small">
                        <EvidencePopover v-for="f in c.enc" :key="'e' + f.raw" :evidence="evsOf(f)" :heading="`${f.raw} · ${c.key} · енклітична форма`" :label="`${f.raw}, ${c.key}, енклітична форма`"
                          :meta="`${f.n} ${f.n === 1 ? 'вживання' : 'вживань'} у цій добі`">
                          <span class="ef att enc"><span class="sb" title="коротка (енклітична) форма; визначено за написанням у клітинці">енкл.</span> <strong :class="['lang', 'attested', { old: oldEp(f.raw) }]"><Spell v-if="modernOf?.(f.raw)" :w="modernOf(f.raw)!" :raw="f.raw" quiet /><template v-else>{{ f.raw }}</template></strong><sup v-if="f.n > 1" class="muted">×{{ f.n }}</sup>
                            <span class="sb" :title="SRC_NOTE[f.src]">{{ SRC_LET[f.src] }}</span><span v-if="isCs(f)" class="sb cs" title="церковнослов’янська пам’ятка руської редакції (MH-30)">ЦС</span></span>
                        </EvidencePopover>
                      </div>
                      <!-- reconstruction: dashed -->
                      <EvidencePopover v-for="r in c.rec" :key="'r' + r.form" :evidence="[...r.trace.flatMap(s => s.cite), ...(r.confirmedBy ?? []).flatMap(evsOf)]"
                        :heading="`${r.form} · реконструкція · ${c.key}`" :label="`реконструкція ${r.form}, ${c.key}`" meta="не засвідчено: виведено за таблицею парадигм (P-1.7)">
                        <span class="ef rec"><strong :class="['lang', 'derived', { old: oldEp(r.form) }]">{{ r.form }}</strong><span class="derived-badge">реконструкція</span>
                          <span v-if="r.variant" class="sb" title="варіант цієї клітинки у джерелі">варіант</span>
                          <span v-if="modelStem" class="sb" title="тип основи визначено за моделлю Stanza (P-1.7)">основа: модель</span>
                          <span v-if="r.confirmedBy" class="derived-badge ok" title="збігається з написанням у пам’ятці в цій самій клітинці">✓ підтверджено пам’яткою</span></span>
                        <template #extra>
                          <ol class="small esteps"><li v-for="s in r.trace" :key="s.rule"><strong>{{ s.rule }}</strong> {{ s.from }} → {{ s.to }}</li></ol>
                          <div v-if="r.confirmedBy" class="small">підтверджено написанням «{{ r.confirmedBy.map(x => x.raw).join('», «') }}» (докази нижче, D).</div>
                        </template>
                      </EvidencePopover>
                      <EvidencePopover v-if="c.eq" :evidence="[c.eq.cite]" :heading="`${c.key}: = називний`" :label="`${c.key} збігається з називним`">
                        <span class="ef rec"><span class="derived-badge">= Н.</span></span>
                      </EvidencePopover>
                      <span v-if="c.more" class="small muted">+{{ c.more }} ін. вживань</span>
                      <span v-if="c.unknown" class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1); відсутність у корпусі не доводить, що форми не було">невідомо</span>
                      <span v-if="c.notes.length" class="notemark">
                        <EvidencePopover v-for="n in c.notes" :key="n.id" :evidence="n.cite" :heading="noteTitle(n)" :meta="n.dated ?? 'дата в джерелі не вказана'" :label="n.id">
                          <span class="sb note">{{ n.id }}</span></EvidencePopover></span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
          <details v-if="grid.notes.length" class="enotes-spoiler small sans"><summary>Правила відмінювання та зміни, засвідчені граматикою ({{ grid.notes.length }})</summary>
          <ul class="small sans enotes" aria-label="Зміни, засвідчені граматикою">
            <li v-for="n in grid.notes" :key="n.id">
              <EvidencePopover :evidence="n.cite" :heading="noteTitle(n)" :meta="n.dated ?? 'дата в джерелі не вказана'" :label="n.id"><span class="badge">{{ n.id }} <i class="evmark" aria-hidden="true">ⓘ{{ n.cite.length }}</i></span></EvidencePopover>
              {{ n.what }} · <span :class="{ unk: !n.dated }">{{ n.dated ?? 'дата в джерелі не вказана' }}</span>
              <template v-if="n.keys?.some(k => k.startsWith('du.')) && grid.duHidden && !cur?.disabled"> · двоїни в цій добі в корпусі не засвідчено, колонку приховано</template>
            </li>
          </ul></details>
      </div>
      <FormLegend v-if="!noLegend" epoch />
      </template>
    </template>
  </div>
</template>
