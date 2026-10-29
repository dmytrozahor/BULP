<script setup lang="ts">
/**
 * SPEC 63 PS /person/:id — one person: dates / region / identity with their sources, roles, the works in the corpus (timeline), the «мова автора» class (LB-14) where a
 * dictionary of this author's language exists, the RF flag, the portrait (Commons, free licence only, with attribution), links back. Every empty value says what was checked.
 */
import { computed } from 'vue'
import { loadPersonsIndex, personOf, personsIndex } from '../lib/personsData.ts'
import { commonsPage, thumbUrl } from '../../core/persons.ts'
import { HIST_DICTS } from '../../core/labels.ts'
import { fmtNum } from '../lib/format.ts'
import { authorTo, personTo, witnessTo, textTo } from '../lib/nav.ts'
import { LANG_UK, centuryUk } from '../lib/personsView.ts'
import EvidenceList from '../components/EvidenceList.vue'
import RuBadge from '../components/RuBadge.vue'
import { nameTokens } from '../../core/persons.ts'
const props = defineProps<{ id: string }>()
loadPersonsIndex()
const pid = computed(() => personsIndex.value?.alias[props.id] ?? props.id)
const p = computed(() => personOf(pid.value))
const authorDict = computed(() => {
  const x = p.value; if (!x) return undefined
  const sn = nameTokens(x.name).full
  return HIST_DICTS.find(d => d.kind === 'author' && sn.length > 1 && sn.some(t => t.length > 4 && d.scope.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t.slice(0, -1))))
})
const langsUk = computed(() => (p.value?.langs ?? []).map(l => LANG_UK[l] ?? l).join(', '))
const total = computed(() => p.value?.works.reduce((s, w) => s + w.n, 0) ?? 0)
const maxN = computed(() => Math.max(1, ...(p.value?.works.map(w => w.n) ?? [1])))
const yr = (y: number, t: number) => (y === t ? String(y) : `${y}–${t}`)
</script>

<template>
  <p class="small sans"><RouterLink to="/persons">← усі постаті</RouterLink></p>
  <div v-if="p === undefined" class="skeleton" style="height:5rem" />
  <section v-else-if="p === null" class="card" data-testid="person-absent">
    <h1>Постать не знайдено</h1>
    <p class="muted sans">Запису «{{ id }}» немає в індексі постатей (перевірено: persons/s*.json). Можливо, потрібна нова збірка даних; картка автора: <RouterLink :to="authorTo(id)">/author/{{ id }}</RouterLink>.</p>
  </section>
  <article v-else class="card person">
    <header class="row" style="gap:1rem;align-items:flex-start;flex-wrap:wrap">
      <figure v-if="p.portrait" style="margin:0;max-width:260px" data-testid="portrait">
        <img :src="thumbUrl(p.portrait.file, p.portrait.h, 250)" :alt="`портрет: ${p.name}`" width="250" loading="lazy" referrerpolicy="no-referrer" style="max-width:100%;height:auto;border-radius:4px" />
        <figcaption class="small sans muted">{{ p.portrait.author }}, <a :href="commonsPage(p.portrait.file)" target="_blank" rel="noopener">Wikimedia Commons ↗</a>, {{ p.portrait.licence }} · <a :href="`https://www.wikidata.org/wiki/${p.portrait.qid}`" target="_blank" rel="noopener">Wikidata {{ p.portrait.qid }} ↗</a> · перевірено {{ p.portrait.checked }}</figcaption>
      </figure>
      <div style="flex:1;min-width:14rem">
        <h1>{{ p.name }}</h1>
        <p class="sans small">
          <template v-if="p.life">{{ p.life }}</template><span v-else class="muted">роки життя: не встановлено (перевірено: метадані корпусу)</span>
          <template v-if="p.home"> · край автора: {{ p.home }}</template>
          <span v-if="p.kind === 'collective'" class="badge"> колектив / анонім / невизначений автор</span>
          <RuBadge v-if="p.ru" :flag="{ kind: 'edition', why: 'частина пам’яток — з російських видань' }" />
        </p>
        <p v-if="!p.portrait" class="small muted sans" data-testid="no-portrait">портрета немає у вільному доступі (перевірено: Wikidata/Commons<template v-if="p.portraitCheck">, {{ p.portraitCheck.checked }}; причина: {{ ({ 'no-years': 'у метаданих немає обох років життя для певного збігу', ambiguous: 'кілька можливих збігів у Wikidata', 'no-confident-match': 'певного збігу в Wikidata немає', 'no-free-image': 'зображення немає або воно не вільне' } as Record<string, string>)[p.portraitCheck.why] }}</template><template v-else>: ще не перевірялося</template>)</p>
        <p class="sans small"><strong>Ролі:</strong> <template v-if="p.roles.length">{{ p.roles.join(', ') }}</template><span v-else class="muted">не встановлено</span>
          <span v-if="p.linguist" class="badge" :title="p.linguist.why"> лінгвіст</span><span v-if="p.linguist" class="muted"> — {{ p.linguist.why }}</span></p>
        <p class="sans small"><strong>Народ / нація:</strong>
          <template v-if="p.identity">{{ p.identity.value }}</template><span v-else class="muted">не встановлено (перевірено: ветинг автора P-2.1 без самоназви; Wikidata не опитувалась для цього поля)</span></p>
        <EvidenceList v-if="p.identity" :evidence="p.identity.evidence" />
        <p class="sans small"><strong>Мови творів:</strong> <template v-if="p.langs.length">{{ langsUk }}</template><span v-else class="muted">не встановлено</span></p>
        <p class="sans small"><strong>Епохи:</strong> {{ p.centuries.map(centuryUk).join(', ') || 'не встановлено' }}<template v-if="p.epochs.length"> · {{ p.epochs.join(', ') }}</template></p>
        <p class="sans small"><strong>Місця видань:</strong> <template v-if="p.regions.length">{{ p.regions.join(', ') }}</template><span v-else class="muted">не встановлено (у метаданих пам’яток місця немає)</span></p>
        <p v-if="p.forms.length > 1 || p.aliases.length" class="sans small"><strong>Форми імені:</strong> {{ p.forms.join('; ') }}
          <template v-for="a in p.aliases" :key="a.name"> · псевдонім <em>{{ a.name }}</em> <span class="muted">({{ a.cite }})</span></template></p>
        <p class="sans small"><RouterLink v-for="a in p.authorIds" :key="a" :to="authorTo(a)" style="margin-right:.6rem">картка автора ({{ a }}) →</RouterLink></p>
      </div>
    </header>
    <h2>Мова автора (LB-14)</h2>
    <p v-if="authorDict" class="sans small">У корпусі є словник мови цього автора: <strong>{{ authorDict.short }}</strong> — слова, засвідчені лише ним, мають клас «мова автора» (слабкий доказ). <RouterLink to="/labels-method#hist">як це визначається →</RouterLink></p>
    <p v-else class="sans small muted">Немає словника мови цього автора в реєстрі класів (перевірено: HIST_DICTS, LB-14).</p>
    <h2>Діалектні риси в текстах</h2>
    <p class="sans small muted">немає даних (перевірено: окремі виміри рис за автором ще не збудовано; риси по пам’ятках дивіться на сторінках пам’яток).</p>
    <h2>Твори в корпусі ({{ p.works.length }}; {{ fmtNum(total) }} токенів)</h2>
    <ol class="timeline sans small" style="list-style:none;padding:0" data-testid="works">
      <li v-for="w in p.works" :key="w.id" style="margin:.25rem 0">
        <span class="muted" style="display:inline-block;min-width:5.5rem">{{ yr(w.y, w.yTo) }}</span>
        <RouterLink :to="witnessTo(w.id)">{{ w.title }}</RouterLink>
        <span class="muted"> · {{ fmtNum(w.n) }} ток.<template v-if="w.region"> · {{ w.region }}</template><template v-if="w.lang"> · {{ LANG_UK[w.lang] ?? w.lang }}</template></span>
        <RuBadge v-if="w.ru" :flag="{ kind: 'edition', why: 'російське видання (див. картку пам’ятки)' }" />
        · <RouterLink :to="textTo(w.id)">читати</RouterLink>
        <span aria-hidden="true" style="display:block;height:3px;background:var(--accent,#888);opacity:.35" :style="{ width: Math.max(2, Math.round(60 * w.n / maxN)) + '%' }" />
      </li>
    </ol>
    <p class="small muted sans">Постать <RouterLink :to="personTo(p.id)">{{ p.id }}</RouterLink> зведена з {{ p.authorIds.length }} запис(ів) автора за нормалізованим іменем; псевдоніми — лише з метаданих.</p>
  </article>
</template>
