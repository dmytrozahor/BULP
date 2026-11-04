<script setup lang="ts">
/** SPEC 63 DB-3: everything the subcard adds at the top of a lemma page: the dialect subcard (with the back arrow), or the arrow of a lexical card entered as a subcard, or the small «форми немає» note. Renders nothing for the normative switch. */
import { RouterLink } from 'vue-router'
import { dialect as dialectCodeRef } from '../lib/views.ts'
import type { ViewCtx } from '../lib/views.ts'
import { NO_FORM_NOTE } from '../../core/subcard.ts'
import type { SubForm, useSubcard } from '../lib/useSubcard.ts'
import DialectSubcard from './DialectSubcard.vue'
const dialectCode = dialectCodeRef
defineProps<{ lemma: string; sub: ReturnType<typeof useSubcard>; forms?: SubForm[]; paradigm?: { form: string; tags: string }[]; ctx?: ViewCtx; from?: string }>()
</script>

<template>
  <DialectSubcard v-if="sub.active.value && sub.plan.value" :lemma="lemma" :plan="sub.plan.value" :dialect-name="sub.dialectName.value" :back="sub.back.value" :forms="forms" :paradigm="paradigm" :ctx="ctx" />
  <RouterLink v-else-if="sub.fromBack.value" :to="sub.fromBack.value" class="subback sans" data-testid="subcard-back">← {{ from }} <span class="muted">(нормативна лема)</span></RouterLink>
  <p v-else-if="sub.noForm.value" class="small muted sans" data-testid="subcard-noform">{{ NO_FORM_NOTE(dialectCode, sub.dialectName.value) }}</p>
</template>
