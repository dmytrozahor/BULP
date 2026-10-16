/**
 * SPEC 63 NV-4: «засвідчено: <пам’ятка, дата>» — is a form that is NOT a lexicon spelling nevertheless found in a witness? Two sources, both committed data:
 * the archaic/dictionary lemma cards (public/data/archaic.json: headwords of dictionary witnesses incl. term lists, plus the corpus tokens linked to them) and the
 * unlinked-spelling index (NV-3: words that occur in a text but own no lemma). «реконструкція (гіпотеза)» stays for rule outputs found in neither.
 */
import { archId, type ArchEntry, type ArchFile } from '../../core/archaic.ts'
import { fetchShard, lookupUnlinked, type ShardFetch } from './unlinked.ts'
import { formTo } from './nav.ts'

export interface Attested { text: string; to: string; kind: 'card' | 'spelling' }
/** `arch`: the whole file (tests) or an async per-card lookup (the app: tc/arch shards) */
export interface AttestDeps { arch?: ArchFile | ((form: string) => Promise<ArchEntry | undefined>); witness: (id: string) => { title: string; date: [number, number] } | undefined; shard?: ShardFetch }

const maps = new WeakMap<ArchFile, Map<string, ArchEntry>>()
export function archIndex(f: ArchFile): Map<string, ArchEntry> {
  let m = maps.get(f); if (m) return m
  m = new Map()
  for (const e of f.entries) for (const k of [e.id, e.head, ...e.variants, ...e.forms.map(x => x.raw)]) { const a = archId(k); if (a && !m.has(a)) m.set(a, e) }
  maps.set(f, m); return m
}
const fmt = (d: [number, number]) => (d[0] === d[1] ? `${d[0]}` : `${d[0]}–${d[1]}`)
export async function attestationOf(form: string, deps: AttestDeps): Promise<Attested | undefined> {
  const e = typeof deps.arch === 'function' ? await deps.arch(form) : deps.arch && archIndex(deps.arch).get(archId(form))
  if (e) {
    const d = e.dict ?? undefined, w = d ? deps.witness(d.w) : e.first ? deps.witness(e.first.w) : undefined, date = d?.date ?? e.first?.date
    return { text: `${w?.title ?? d?.w ?? e.first?.w ?? 'пам’ятка'}${date ? `, ${fmt(date)}` : ''}`, to: `/ar/${encodeURIComponent(e.id)}`, kind: 'card' }
  }
  const u = await lookupUnlinked(form, deps.shard ?? fetchShard)
  if (u) {
    const id = String(u[3] ?? ''), w = deps.witness(id)
    return { text: `${w?.title ?? id}${w ? `, ${fmt(w.date)}` : ''}`, to: formTo(form), kind: 'spelling' }
  }
  return undefined
}
