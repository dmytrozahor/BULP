<script setup lang="ts">
/** SPEC 63 OV-2/OV-5: the two global switches (говір, правопис), remembered per viewer. Only dialects with ≥ 1 cited respelling rule and orthographies with a cited fold table are listed. */
import { dialect, orth, setDialect, setOrth } from '../lib/views.ts'
import { DIALECT_BRANCHES } from '../../core/respell.ts'
import { DIALECTS } from '../../core/rules.ts'
import { ORTHS } from '../../core/orth-forward.ts'
</script>

<template>
  <div class="viewbar sans small" role="group" aria-label="Говір і правопис" data-testid="viewbar">
    <label>Говір
      <select :value="dialect" aria-label="Говір: слова пишуться сучасним правописом з ознаками говору" @change="setDialect(($event.target as HTMLSelectElement).value)">
        <option value="">нормативна</option>
        <optgroup v-for="b in DIALECT_BRANCHES" :key="b.id" :label="b.label"><option v-for="c in b.codes" :key="c" :value="c">{{ DIALECTS[c] }}</option></optgroup>
      </select></label>
    <label>Правопис
      <select :value="orth" aria-label="Правопис, яким написано слова" @change="setOrth(($event.target as HTMLSelectElement).value)">
        <option v-for="o in ORTHS" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select></label>
  </div>
</template>
