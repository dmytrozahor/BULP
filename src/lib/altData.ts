/** SPEC 63 MM-10: lazy loader for public/data/alt.json (VESUM :alt lemma → standard lemma); empty until the file arrives or when it is absent. */
import { shallowRef } from 'vue'
import { fetchJson } from './fetchJson.ts'
import { stdOfAlt, type AltFile } from '../../core/vesum-alt.ts'

export const altFile = shallowRef<AltFile>()
let started = false
export function loadAlt(): void {
  if (started) return
  started = true
  fetchJson('./data/alt.json').then(j => { const f = j as AltFile | null; if (f && f.format === 1) altFile.value = f }).catch(() => { started = false })
}
export function altStandardOf(word: string) { loadAlt(); return stdOfAlt(altFile.value, word) }
