<script setup lang="ts">
/** SPEC 63 OV-12: DWDS-like card layout: the word information in the main column, the statistics in a right-hand sidebar that stays visible across the tabs (sticky on desktop; below the content on a phone). */
</script>

<template>
  <div class="card-layout">
    <div class="cl-main"><slot /></div>
    <aside class="statside" aria-label="Статистика" data-testid="stat-sidebar"><slot name="side" /></aside>
  </div>
</template>
