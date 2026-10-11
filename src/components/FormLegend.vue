<script setup lang="ts">
/** SPEC 30 D-4.2: legend of the three visual classes. */
import FormBadge from './FormBadge.vue'
</script>

<template>
  <div class="card flegend" role="note" aria-label="Легенда: засвідчені та реконструйовані форми">
    <div><FormBadge kind="attested" form="вѣра" label="засвідчено" /> <span class="small muted">суцільна, пряма: написання є в пам’ятці корпусу або форма є в словнику (ВЕСУМ)</span></div>
    <div><FormBadge kind="derived" form="вѣра" /> <span class="small muted">пунктирна рамка, курсив: виведено за правилами історичної фонетики (Шевельов); у корпусі не знайдено; це гіпотеза, не факт</span></div>
    <div><FormBadge kind="confirmed" form="вѣра" /> <span class="small muted">пунктирна + галочка: реконструкція, що збіглася з написанням у пам’ятці — посилання веде до прикладів</span></div>
  </div>
</template>
