<script setup lang="ts">
/** SPEC 30 D-4.2: legend of the three visual classes. SPEC 50 EP-7.6: with `epoch` it also lists the markers of the epoch-paradigm panel. */
import FormBadge from './FormBadge.vue'
defineProps<{ epoch?: boolean }>()
</script>

<template>
  <div class="card flegend" role="note" aria-label="Легенда: засвідчені та реконструйовані форми">
    <div><FormBadge kind="attested" form="вѣра" label="засвідчено" /> <span class="small muted">суцільна, пряма: написання є в пам’ятці корпусу або форма є в словнику (ВЕСУМ)</span></div>
    <div><FormBadge kind="derived" form="вѣра" /> <span class="small muted">пунктирна рамка, курсив: виведено за правилами історичної фонетики (Шевельов); у корпусі не знайдено; це гіпотеза, не факт</span></div>
    <div><FormBadge kind="confirmed" form="вѣра" /> <span class="small muted">пунктирна + галочка: реконструкція, що збіглася з написанням у пам’ятці — посилання веде до прикладів</span></div>
    <template v-if="epoch">
      <div><span class="sb">T</span> <span class="small muted">ручна розмітка TOROT</span></div>
      <div><span class="sb">M</span> <span class="small muted">модельна розмітка Stanza, не словниковий факт (P-1.7); <span class="sb">модель поза доменом</span> — текст поза доменом моделі</span></div>
      <div><span class="sb">В</span> <span class="small muted">аналіз ВЕСУМ сучасного написання</span></div>
      <div><span class="sb">≈2</span> <span class="small muted">токен міг стояти в кількох клітинках (двозначна мітка); <span class="sb">×3</span> — кількість вживань</span></div>
      <div><span class="sb cs">ЦС</span> <span class="small muted">церковнослов’янська пам’ятка руської редакції (MH-30): форма може не відбивати живу мову</span></div>
      <div><span class="sb">основа: модель</span> <span class="small muted">тип основи визначено за лемою моделі Stanza; реконструкція на ній теж модельна</span></div>
      <div><span class="derived-badge">= Н.</span> <span class="small muted">кличний збігається з називним (PAVL, с. 74)</span></div>
      <div><span class="unk">невідомо</span> <span class="small muted">у корпусі немає свідчень цієї клітинки; відсутність не доводить, що форми не було</span></div>
      <div><span class="sb note">MH-09</span> <span class="small muted">зміна, описана в граматиці: відкриває цитату й дату (або «дата в джерелі не вказана»)</span></div>
    </template>
  </div>
</template>
