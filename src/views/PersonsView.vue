<script setup lang="ts">
/**
 * SPEC 63 PS /persons — «Постаті»: who is in the corpus (owner 2026-10-29: «створи сторінки з постатями де можна укр лінгвістів і постатей з різних епох і народів і націй і тд подивитися які є в корпусі»).
 * Filters: епоха (століття), роль, регіон, народ/нація (лише названі в джерелі + «не встановлено»), мова творів; search by name; sort by tokens. Data: persons/index.json, lazy.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Pagination from '../components/Pagination.vue'
import RuBadge from '../components/RuBadge.vue'
import { usePage } from '../composables/usePage.ts'
import { loadPersonsIndex, personsIndex, personsLoaded } from '../lib/personsData.ts'
import { thumbUrl } from '../../core/persons.ts'
import { key } from '../../core/text.ts'
import { personTo } from '../lib/nav.ts'
import { fmtNum } from '../lib/format.ts'
import { LANG_UK, centuryUk, personRows, sortRows, type PersonFilter } from '../lib/personsView.ts'
loadPersonsIndex()
const route = useRoute(), router = useRouter()
const q = ref(String(route.query.q ?? '')), cen = ref(String(route.query.c ?? '')), role = ref(String(route.query.r ?? '')), reg = ref(String(route.query.g ?? ''))
const idn = ref(String(route.query.n ?? '')), lang = ref(String(route.query.l ?? '')), sort = ref(String(route.query.s ?? 'n')), coll = ref(route.query.k === '1')
watch([q, cen, role, reg, idn, lang, sort, coll], () => {
  const query: Record<string, string | undefined> = { q: q.value || undefined, c: cen.value || undefined, r: role.value || undefined, g: reg.value || undefined, n: idn.value || undefined, l: lang.value || undefined, s: sort.value === 'n' ? undefined : sort.value, k: coll.value ? '1' : undefined }
  router.replace({ path: route.path, query: query as typeof route.query })
})
const rows = computed(() => personsIndex.value?.rows ?? [])
const filter = computed<PersonFilter>(() => ({ q: key(q.value.trim()), century: cen.value ? +cen.value : undefined, role: role.value || undefined, region: reg.value || undefined, identity: idn.value || undefined, lang: lang.value || undefined, collective: coll.value }))
const list = computed(() => sortRows(personRows(rows.value, filter.value), sort.value))
const opts = computed(() => {
  const c = new Set<number>(), r = new Set<string>(), g = new Map<string, number>(), n = new Set<string>(), l = new Set<string>()
  for (const x of rows.value) { x.c.forEach(v => c.add(v)); x.r.forEach(v => r.add(v)); x.reg.forEach(v => g.set(v, (g.get(v) ?? 0) + 1)); if (x.idn) n.add(x.idn); x.lang.forEach(v => l.add(v)) }
  return { c: [...c].sort((a, b) => a - b), r: [...r].sort(), g: [...g].sort((a, b) => b[1] - a[1]).slice(0, 60).map(x => x[0]).sort((a, b) => a.localeCompare(b, 'uk')), n: [...n].sort(), l: [...l].sort() }
})
const pg = usePage(computed(() => list.value.length))
const thumb = (r: { th?: { file: string; h: string } }) => (r.th ? thumbUrl(r.th.file, r.th.h, 60) : '')
</script>

<template>
  <section class="card">
    <h1>Постаті</h1>
    <p class="muted small sans">Автори, укладачі й лінгвісти, чиї твори є в корпусі, зведені за іменем із метаданих пам’яток (псевдоніми — лише там, де їх називають метадані або джерело). Народ/нація, дати й портрет показані лише зі згаданим джерелом; інакше «не встановлено».</p>
    <div v-if="!personsLoaded" class="skeleton" style="height:5rem" />
    <p v-else-if="!personsIndex" class="muted sans" data-testid="persons-absent">Даних про постаті ще немає (перевірено: persons/index.json відсутній; потрібна збірка даних).</p>
    <template v-else>
      <div class="row sans small" style="flex-wrap:wrap;gap:.5rem">
        <input v-model="q" type="search" placeholder="Ім’я: Шевченко, Грінченко…" aria-label="Пошук за іменем" autocomplete="off" spellcheck="false" />
        <select v-model="cen" aria-label="Епоха (століття)"><option value="">усі епохи</option><option v-for="c in opts.c" :key="c" :value="String(c)">{{ centuryUk(c) }}</option></select>
        <select v-model="role" aria-label="Роль"><option value="">усі ролі</option><option v-for="r in opts.r" :key="r" :value="r">{{ r }}</option></select>
        <select v-model="reg" aria-label="Регіон"><option value="">усі регіони</option><option v-for="g in opts.g" :key="g" :value="g">{{ g }}</option></select>
        <select v-model="idn" aria-label="Народ / нація"><option value="">народ: усі</option><option v-for="n in opts.n" :key="n" :value="n">{{ n }}</option><option value="—">не встановлено</option></select>
        <select v-model="lang" aria-label="Мова творів"><option value="">усі мови творів</option><option v-for="l in opts.l" :key="l" :value="l">{{ LANG_UK[l] ?? l }}</option></select>
        <select v-model="sort" aria-label="Сортування"><option value="n">за обсягом у корпусі</option><option value="name">за іменем</option><option value="year">за часом</option></select>
        <label><input v-model="coll" type="checkbox" /> колективи й анонімні автори</label>
      </div>
      <p class="small muted sans">{{ fmtNum(list.length) }} із {{ fmtNum(rows.length) }}</p>
      <p v-if="!list.length" class="muted sans" data-testid="persons-empty">Нікого не знайдено (перевірено: {{ fmtNum(rows.length) }} постатей, фільтри вище).</p>
      <ul class="results persons">
        <li v-for="r in pg.slice(list)" :key="r.id">
          <RouterLink :to="personTo(r.id)">
            <img v-if="r.th" :src="thumb(r)" :alt="`портрет: ${r.name}`" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" style="object-fit:cover;vertical-align:middle;margin-right:.4rem;border-radius:3px" />
            <span class="lem">{{ r.name }}</span>
            <span class="small sans muted"> {{ r.life ?? 'роки життя не встановлено' }}</span>
          </RouterLink>
          <span class="small sans"> · <template v-if="r.r.length">{{ r.r.join(', ') }}</template><span v-if="r.ling" class="badge" title="лінгвіст (research/48 або автор словника/граматики в метаданих)"> лінгвіст</span>
            · {{ fmtNum(r.n) }} токенів, {{ r.w }} пам’яток<template v-if="r.c.length"> · {{ r.c.map(centuryUk).join(', ') }}</template><template v-if="r.reg.length"> · {{ r.reg.slice(0, 2).join(', ') }}</template>
            <template v-if="r.kind === 'collective'"> · колектив / анонім</template> <RuBadge v-if="r.ru" :flag="{ kind: 'edition', why: 'є пам’ятки з російських видань' }" /></span>
        </li>
      </ul>
      <Pagination v-if="pg.pages.value > 1" :page="pg.page.value" :pages="pg.pages.value" :total="list.length" @go="pg.go" />
    </template>
  </section>
</template>
