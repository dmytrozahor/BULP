/** MM-53: lazy loader of public/data/vesum.bloom (core/bloom.ts) — the normative VESUM form set as a Bloom filter, fetched only by /analyze. */
import { shallowRef } from 'vue'
import { Bloom } from '../../core/bloom.ts'
import { key } from '../../core/text.ts'

export const vesumBloom = shallowRef<Bloom | null>(null)
let started = false
export async function loadVesumBloom(): Promise<void> {
  if (started) return; started = true
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/vesum.bloom`)
    if (!r.ok) throw new Error(String(r.status))
    vesumBloom.value = Bloom.fromBytes(new Uint8Array(await r.arrayBuffer()))
  } catch { started = false }   // stays null: the page keeps the offline banner
}
/** true / false = the form is / is not in VESUM (a «true» is right 99.2 %); undefined = the filter is not loaded */
export const inVesum = (form: string): boolean | undefined => vesumBloom.value?.has(key(form))
