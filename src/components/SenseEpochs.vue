<script setup lang="ts">
/**
 * SPEC 63 SE-5 «Значення за епохами» (owner: «у кожній картці послідовно має бути видно як змінювався сенс залежно від епохи»). ONE self-contained block for every card kind:
 * a timeline over the six Shevelov epochs; each epoch lists the senses of the dictionaries that document it (dictionary, print years, coverage period, gloss, dated quote), the
 * corpus contexts assigned to a sense by evidence (SE-3) and the transitions into the sense with their type (only when a source names it) and status. An epoch without evidence is a
 * gap, never filled. The data (lm/se shard) is fetched when the panel is first opened (Panel mounts its body then). `entry` replaces the fetch (tests, previews).
 */
import { computed } from 'vue'
import { epochById } from '../../core/epochs.ts'
import { atOf, dictById, timeline, typeName, UNTYPED, type SeEntry, type SeRow, type TlItem } from '../../core/se.ts'
import { seLoaded, seOf } from '../lib/seData.ts'
import Panel from './Panel.vue'
import RuBadge from './RuBadge.vue'
import { ruOfDict } from '../../core/ru-source.ts'
const props = defineProps<{ word: string; /** card kind, for the test id and the host's layout */ kind?: 'full' | 'light' | 'dict' | 'orv' | 'arch' | 'mu'; open?: boolean; entry?: SeEntry }>()
const data = computed(() => props.entry ?? seOf(props.word))
const loaded = computed(() => !!props.entry || seLoaded(props.word))
const cells = computed(() => (data.value ? timeline(data.value) : []))
const nSenses = computed(() => data.value?.groups.length ?? 0)
const years = (a: number | null | undefined, b: number | null | undefined) => (a == null ? '' : a === b ? String(a) : `${a}–${b}`)
const ep = (id: string) => epochById[id]
const epName = (id: string) => ep(id)?.uk ?? id
const epYears = (id: string) => { const e = ep(id); return e ? `${e.start}–${e.end > 3000 ? '…' : e.end}` : '' }
const edition = (d: string) => years(dictById(d)?.edition[0], dictById(d)?.edition[1])
function rowAt(r: SeRow): string {
  const at = atOf(r)
  if (at.basis === 'quote') return `цитата ${years(at.a, at.b)}`
  if (at.basis === 'modern') return 'сучасне вживання · джерело не датує значення'
  return at.basis === 'period' ? `період ${years(at.a, at.b)} (рік видання ${edition(r.d)} не є датою значення)` : `мова свого часу ${years(at.a, at.b)}`
}
const gloss = (i: number) => data.value!.groups[i]!.rows.map(r => data.value!.rows[r]!).find(r => r.g)?.g
const glossOrNone = (i: number) => gloss(i) ?? 'слово засвідчене (текст значення словника не взято)'
const rowsOf = (it: TlItem) => it.rows.map(i => ({ i, r: data.value!.rows[i]! }))
const intoOf = (g: number) => data.value!.trans.filter(t => t.to === g)
const kwOf = (g: number) => (data.value!.kw ?? []).filter(k => k.g === g)
const status: Record<string, string> = { cited: 'цитовано', inferred: 'виведено', hypothesis: 'гіпотеза' }
const confMark = (it: TlItem) => (it.span || it.conf === 'low' ? ' ?' : '')
</script>

<template>
  <Panel :id="`se-${kind ?? 'card'}`" :open="open ?? false" title="Значення за епохами · Sense evolution" :summary="data ? `${nSenses} значень у словниках` : (loaded ? 'немає даних' : 'розгорніть, щоб завантажити')" :empty="loaded && !data" empty-text="немає даних про значення"
    info="Послідовність значень за епохами Шевельова. Кожне значення — зі словника з його періодом охоплення (історичний словник описує давнішу мову, ніж рік друку); дата цитати переважає період. Перехід між значеннями має тип лише тоді, коли його називає джерело; інакше «зміна значення (тип не вказано джерелом)». Епоха без свідчень — прогалина, не заповнюється.">
    <div class="se sans" :data-testid="`se-${kind ?? 'card'}`">
      <template v-if="data">
        <ol class="se-tl">
          <li v-for="c in cells" :key="c.epoch" class="se-ep" :class="{ gap: c.gap }" :data-epoch="c.epoch">
            <h3 class="small"><strong>{{ epName(c.epoch) }}</strong> <span class="muted">{{ epYears(c.epoch) }}</span></h3>
            <p v-if="c.gap" class="small muted se-gap">немає даних<template v-if="c.unassigned"> · {{ c.unassigned }} контекстів корпусу без прив’язки до значення</template></p>
            <template v-else>
              <div v-for="it in c.items" :key="it.group" class="se-sense">
                <p style="margin:.1rem 0"><span class="se-gloss">{{ glossOrNone(it.group) }}</span><span class="muted small">{{ confMark(it) }}</span>
                  <span v-if="data.groups[it.group]!.rows.length > 1 && data.groups[it.group]!.sc !== null" class="small muted"> · зіставлено, збіг {{ data.groups[it.group]!.sc }} · {{ data.groups[it.group]!.link === 'xref' ? 'за відсилкою словника' : 'виведено (inferred)' }}</span></p>
                <ul class="small" style="margin:.1rem 0 .1rem 1rem;padding:0">
                  <li v-for="x in rowsOf(it)" :key="x.i"><strong>{{ dictById(x.r.d)?.short ?? x.r.d }}</strong><template v-if="ruOfDict(x.r.d)"> <RuBadge :flag="ruOfDict(x.r.d)" /></template><template v-if="x.r.u"> <a class="se-art small" data-testid="se-article" :href="x.r.u" target="_blank" rel="noopener noreferrer" title="стаття на офіційному сайті словника">стаття ↗</a></template> <span class="muted">({{ edition(x.r.d) }}) · {{ rowAt(x.r) }}</span>
                    <template v-if="x.r.n"> №{{ x.r.n }}</template><template v-if="x.r.g && x.r.g !== glossOrNone(it.group)"> — {{ x.r.g }}</template><span v-if="x.r.m === 'd'" class="muted"> · за правилами виведення від «{{ x.r.l }}»</span><span v-if="x.r.s" class="muted"> · {{ x.r.s }}</span><template v-if="x.r.t?.length"> · <em>{{ x.r.t.map(t => typeName(t[0])).join(', ') }}</em></template>
                    <span v-if="x.r.q" class="muted"> · «{{ x.r.q }}»</span><span v-if="x.r.l" class="muted"> [{{ x.r.l }}]</span></li>
                </ul>
                <p v-for="(t, ti) in intoOf(it.group)" :key="ti" class="small se-arrow">⟵ з «{{ glossOrNone(t.from) }}» · {{ t.type ? typeName(t.type) + ' («' + t.label + '»)' : UNTYPED }} · <strong>{{ status[t.status] }}</strong></p>
                <p v-for="(k, ki) in kwOf(it.group)" :key="ki" class="small muted">корпус {{ years(k.k.date[0], k.k.date[1]) }}: …{{ k.k.left }} <strong>{{ k.k.node }}</strong> {{ k.k.right }}… ({{ k.k.via === 'quote' ? 'за цитатою словника' : 'за ключовим словом у значенні' }})</p>
              </div>
              <p v-if="c.unassigned" class="small muted">+ {{ c.unassigned }} контекстів корпусу без прив’язки до значення</p>
            </template>
          </li>
        </ol>
        <p class="small muted">Періоди охоплення словників, а не роки друку; прогалини — немає свідчень у джерелах проєкту (SPEC 63 SE).</p>
      </template>
      <p v-else class="small muted">{{ loaded ? 'немає даних про значення' : 'завантаження…' }}</p>
    </div>
  </Panel>
</template>

<style scoped>
.se-tl { list-style: none; margin: 0; padding: 0 0 0 .6rem; border-left: 2px solid var(--line); }
.se-ep { margin: .5rem 0; padding-left: .6rem; }
.se-ep h3 { margin: 0 0 .15rem; }
.se-ep.gap { opacity: .75; }
.se-gap { font-style: italic; }
.se-sense { margin: .35rem 0; padding: .25rem .5rem; background: var(--surface-2); border-radius: var(--r); }
.se-gloss { font-family: var(--serif); font-size: 1.05rem; }
.se-arrow { color: var(--accent); }
</style>
