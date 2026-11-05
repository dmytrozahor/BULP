<script setup lang="ts">
/** SPEC 63 DB-3 / DB-3b: what the switch adds at the top of a LEMMA page: the arrow of a lexical card entered from another lemma, or the small «форми немає» note. (The dialect variant itself is a card of its own, VariantView.) Nothing for the normative switch. */
import { RouterLink } from 'vue-router'
import { dialect as dialectCode } from '../lib/views.ts'
import { NO_FORM_NOTE } from '../../core/subcard.ts'
import type { useSubcard } from '../lib/useSubcard.ts'
defineProps<{ sub: ReturnType<typeof useSubcard>; from?: string }>()
</script>

<template>
  <RouterLink v-if="sub.fromBack.value" :to="sub.fromBack.value" class="subback sans" data-testid="subcard-back">← {{ from }} <span class="muted">(нормативна лема)</span></RouterLink>
  <p v-else-if="sub.noForm.value" class="small muted sans" data-testid="subcard-noform">{{ NO_FORM_NOTE(dialectCode, sub.dialectName.value) }}</p>
</template>
