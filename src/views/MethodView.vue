<script setup lang="ts">
/**
 * Methodology rendered FROM CODE: sound rules (core/phonology RULES), detector tables (core/rules.ts), epochs (core/epochs.ts),
 * statistics (core/stats STAT_CITES) and SPEC 00 verbatim (specs/00-principles.md via ?raw). Nothing on this page is hand-copied.
 */
import { RULES } from '../../core/phonology.ts'
import { EPOCHS } from '../../core/epochs.ts'
import { STAT_CITES } from '../../core/stats.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, REGISTER_RULES, RUSYN_RULES, REGISTER_DEF, SURZHYK_DEF, RUSYN_STATUS } from '../../core/rules.ts'
import spec from '../../specs/00-principles.md?raw'
import { inlineMd, parseSpec } from '../lib/md.ts'
import { AXIS_UK, labelUk } from '../lib/format.ts'
import EvidencePopover from '../components/EvidencePopover.vue'
const sections = parseSpec(spec)
const tables = [['cs', CS_RULES], ['contact', CONTACT_RULES], ['dialect', DIALECT_RULES], ['rusyn', RUSYN_RULES], ['register', REGISTER_RULES]] as const
const formulas: [string, string, string][] = [
  ['ipm', 'ipm = f / N · 10⁶', 'ipm'], ['hk', 'HK = round(log₂(f_max / f))', 'hk'], ['dots', 'крапки = clamp(6 − ⌊HK / 3⌋, 0, 6)', 'dots'],
  ['logDice', 'logDice = 14 + log₂(2·f_xy / (f_x + f_y))', 'logDice'], ['g2', 'G² = 2·(a·ln(a/E₁) + b·ln(b/E₂)); Log Ratio = log₂((a/c)/(b/d)), 0 → 0,5', 'g2'],
  ['dp', 'DP = ½ Σ |y_i/AF − n_i/N|; рівномірність = 1 − DP', 'dp'], ['smooth', 'центроване ковзне середнє, вікно 1 (століття)', 'smooth'],
]
</script>

<template>
  <h1>Метод</h1>
  <p class="muted">Усі правила — це дані з цитатою. Правило без опублікованого джерела має вагу 0 і не може поставити мітку. Результати збірки: <RouterLink to="/report">звіт збірки</RouterLink>.</p>

  <section class="card"><h2><span>Принципи (SPEC 00, дослівно)</span></h2>
    <div v-for="s in sections" :key="s.heading">
      <h3>{{ s.heading }}</h3>
      <blockquote v-for="(q, i) in s.quotes" :key="i" class="small" style="margin:.3rem 0;border-left:3px solid var(--line);padding-left:.7rem" v-html="inlineMd(q)"></blockquote>
      <ul class="sans small"><li v-for="it in s.items" :key="it.id"><strong>{{ it.id }}</strong> <span v-html="inlineMd(it.text)"></span></li></ul>
    </div>
  </section>

  <section class="card"><h2><span>Вимоги до авторів (P-2)</span></h2>
    <p class="small sans">Автор «перевірений» (vetted), якщо є ≥ 1 самоідентифікація з перевіркою <em>fetched|scholarly</em>; «попередній» — лише з вторинним джерелом; інакше «неперевірений» і текст не входить у корпус. Мітка автора відповідає епосі: «автор Київської Русі» ≠ «український автор».</p>
    <ul class="sans small"><li v-for="s in sections.find(x => x.heading.startsWith('P-2'))?.items" :key="s.id"><strong>{{ s.id }}</strong> <span v-html="inlineMd(s.text)"></span></li></ul>
  </section>

  <section class="card"><h2><span>Звукові правила (Шевельов) — {{ RULES.length }}</span></h2>
    <div class="tablewrap"><table><thead><tr><th>id</th><th>назва</th><th>час</th><th>сфера</th><th>цитата й локатор</th></tr></thead>
      <tbody><tr v-for="r in RULES" :key="r.id"><td><code>{{ r.id }}</code></td><td>{{ r.name }}</td><td>{{ r.date }}</td><td>{{ r.scope }}</td>
        <td><EvidencePopover :evidence="[r.cite]" :heading="r.id + ' ' + r.name" :label="r.id"><span class="small" style="text-align:left">{{ r.cite.quote.slice(0, 70) }}{{ r.cite.quote.length > 70 ? '…' : '' }} <span class="badge">{{ r.cite.kind }} ⓘ</span></span></EvidencePopover></td></tr></tbody></table></div>
    <p class="small muted sans">Сфери: G — загальні; X — загальні з лексичними винятками; L — лексичні (гілки); D — діалектні (ніколи не застосовуються до стандарту). Правила M01–M06 пропущено: вони без джерела.</p>
  </section>

  <section v-for="[axis, rules] in tables" :key="axis" class="card"><h2><span>Детектор — {{ AXIS_UK[axis] }} ({{ rules.length }})</span></h2>
    <div class="tablewrap"><table><thead><tr><th>id</th><th>вісь</th><th>мітка</th><th class="num">вага</th><th>джерело</th></tr></thead>
      <tbody><tr v-for="r in rules" :key="r.id" :class="{ muted: r.weight <= 0 }">
        <td><code>{{ r.id }}</code></td><td>{{ r.axis }}</td><td>{{ labelUk(r.label) }}<div class="small muted">{{ r.note }}</div></td>
        <td class="num">{{ r.weight }}<div v-if="r.weight <= 0" class="small unk">без джерела</div></td>
        <td><EvidencePopover v-if="r.weight > 0" :evidence="[r.cite]" :heading="r.id" :label="r.id"><span class="badge">{{ r.cite.kind }} ⓘ {{ r.cite.source }}</span></EvidencePopover><span v-else class="small">гіпотеза: лише підказка для перевірки</span></td></tr></tbody></table></div>
    <template v-if="axis === 'contact'"><p class="small sans">Суржик — похідна мітка, ніколи не первинна: <EvidencePopover :evidence="[SURZHYK_DEF]" heading="Визначення суржику"><span class="badge">визначення ⓘ</span></EvidencePopover></p></template>
    <template v-if="axis === 'register'"><p class="small sans">«Розмовне» ≠ нелітературне: <EvidencePopover :evidence="[REGISTER_DEF]" heading="Позначка розм."><span class="badge">визначення ⓘ</span></EvidencePopover> Літературний регістр ніколи не виводиться.</p></template>
    <p v-if="axis === 'rusyn'" class="small sans">{{ RUSYN_STATUS.note }} <EvidencePopover :evidence="RUSYN_STATUS.evidence" heading="Статус русинської" label="статус русинської"><span class="badge">обидві позиції ⓘ</span></EvidencePopover></p>
    <p v-if="axis === 'dialect'" class="small muted sans">Діалектні правила спрацьовують лише для ненормативних форм після 1798 р. (інакше — історична форма, а не діалектизм).</p>
  </section>

  <section class="card"><h2><span>Епохи (дві схеми, не зливаються)</span></h2>
    <div class="tablewrap"><table><thead><tr><th>id</th><th>схема</th><th>назва</th><th class="num">від</th><th class="num">до</th><th>межа (цитата)</th></tr></thead>
      <tbody><tr v-for="e in EPOCHS" :key="e.id"><td><code>{{ e.id }}</code><span v-if="e.overlay" class="small muted"> накладка</span></td><td>{{ e.scheme }}</td><td>{{ e.uk }}<div class="small muted">{{ e.en }}</div></td>
        <td class="num">{{ e.start }}</td><td class="num">{{ e.end === 9999 ? '…' : e.end }}</td>
        <td><EvidencePopover :evidence="[e.cite]" :heading="e.uk" :label="e.id"><span class="small">{{ e.cite.quote.slice(0, 60) }}… <span class="badge">{{ e.cite.kind }} ⓘ</span></span></EvidencePopover></td></tr></tbody></table></div>
    <p class="small muted sans">Алгоритм: точний збіг → high; частка ≥ 0,8 з допуском → medium; інакше всі епохи з часткою &gt; 0,1 → low. «Енеїда» 1798: Шевельов — пізньосередньоукраїнська, WL — нова українська; розбіжність свідома.</p>
  </section>

  <section class="card"><h2><span>Статистика</span></h2>
    <div class="tablewrap"><table><thead><tr><th>величина</th><th>формула</th><th>джерело</th></tr></thead>
      <tbody><tr v-for="[k, f, c] in formulas" :key="k"><td><code>{{ k }}</code></td><td>{{ f }}</td>
        <td><EvidencePopover :evidence="[STAT_CITES[c]!]" :heading="k" :label="k"><span class="badge">{{ STAT_CITES[c]!.kind }} ⓘ {{ STAT_CITES[c]!.source }}</span></EvidencePopover></td></tr></tbody></table></div>
    <p class="small muted sans">Колокації: лемовне вікно ±3, f<sub>xy</sub> ≥ 3 (корпус малий; DWDS бере 5), logDice &gt; 0. Знаменники (N) показано поруч із кожним числом (P-1.6).</p>
  </section>
</template>
