<script setup lang="ts">
/** DWDS Frequenzbarometer: «siebenstufige, logarithmische Skala» (research/07 §1.1, core/stats.ts dots()). 6 dots, filled = dots (0–6). */
import { fmtNum } from '../lib/format.ts'
const props = defineProps<{ dots: number; ipm?: number; hk?: number; f?: number; N?: number }>()
const tip = () => `${props.dots}/6` + (props.ipm != null ? ` · ${fmtNum(props.ipm, 1)} ipm` : '') + (props.hk != null ? ` · HK ${props.hk}` : '') + (props.f != null ? ` · f=${props.f}` : '') + (props.N ? ` · N=${fmtNum(props.N)}` : '')
</script>
<template>
  <svg class="dots" viewBox="0 0 84 14" width="84" height="14" role="img" :aria-label="`Частотність ${tip()}`"><title>{{ tip() }}</title>
    <circle v-for="i in 6" :key="i" :cx="7 + (i - 1) * 14" cy="7" r="5" :class="i <= dots ? 'on' : 'off'" />
  </svg>
</template>
