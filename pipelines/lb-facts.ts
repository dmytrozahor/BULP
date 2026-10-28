/**
 * SPEC 63 LB-11 — the facts the tail classes (4–7) read, from the data the build already holds: witness metadata (region, years), the cv entry (VESUM tags, dictionary bitmask,
 * attestation lines), the light card, the archaic card. Shared by pipelines/build-labels.ts and pipelines/lb-measure.ts.
 */
import { regionOf, REGIONS } from './regions.ts'
import { baseOf, summarizeWitnesses, type TailFacts, type WitMetaLite } from '../core/labels.ts'
import { HIST_SRC } from '../core/dx-src.ts'

/** witness id → region (code, name) and years; also the region-name lookup of the corpus table */
export function witMeta(corpus: { witnesses?: { id: string; region?: string; date: [number, number] }[]; regions?: { code: string; name: string }[] } | undefined): { meta: (id: string) => WitMetaLite | undefined; regionName: (code: string) => string } {
  const names = new Map([...REGIONS.map(r => [r.code, r.name] as const), ...(corpus?.regions ?? []).map(r => [r.code, r.name] as const)])
  const by = new Map<string, WitMetaLite>()
  for (const w of corpus?.witnesses ?? []) {
    const code = regionOf(w.region), raw = w.region?.trim()
    // a region the panel table does not know (a chancery, a composite locus) is named with the witness's OWN words, never guessed into a panel region
    const region: [string, string] | undefined = code ? [code, names.get(code) ?? code] : raw && raw !== '—' ? [`raw:${raw}`, raw] : undefined
    by.set(w.id, { ...(region ? { region } : {}), from: w.date?.[0] ?? 0, to: w.date?.[1] ?? 0 })
  }
  return { meta: id => by.get(id), regionName: c => names.get(c) ?? c }
}
const isDictWitness = (id: string): boolean => /^(r2u_|plast|dsu|sum|vesum)/i.test(id)

/** a cv entry [word, tags, n, atts, extra?]: VESUM when it has tags or the VESUM bit; class 6 only when EVERY attestation is from a dictionary with a documented base */
export function cvFacts(e: unknown[] | undefined, meta: (id: string) => WitMetaLite | undefined): { facts: TailFacts; attested: boolean } {
  if (!e) return { facts: {}, attested: false }
  const tags = typeof e[1] === 'string' ? e[1] : '', atts = (e[3] as [string, string, string][] | undefined) ?? [], extra = e[4] as { d?: number } | undefined
  const dictOnly = !!extra?.d, vesum = !!tags || !!((extra?.d ?? 0) & 1)
  const ids = atts.map(a => a[0])
  const bit0 = extra?.d ?? 0, srcIds = [...new Set([...ids, ...HIST_SRC.filter(s => bit0 & s.bit).map(s => s.ids[0]!)])]
  const bases = dictOnly && !vesum && srcIds.length && srcIds.every(i => baseOf(i)) && !(bit0 & 13) ? srcIds : []
  const wit = !dictOnly ? summarizeWitnesses(ids.filter(i => !isDictWitness(i)), meta, (e[2] as number) > ids.length) : undefined
  const bit = extra?.d ?? 0, sumHead = (['sum11', 'sum20'] as const).filter(id => bit & (HIST_SRC.find(s => s.ids[0] === id)?.bit ?? 0))
  const srcNames = dictOnly && !vesum && !sumHead.length ? [...new Set([...HIST_SRC.filter(s => bit & s.bit).map(s => s.name.split(',')[0]!), ...(bit & 4 ? ['Пластові словники'] : []), ...(bit & 8 ? ['інші словники корпусу'] : [])])] : []
  return { facts: { ...(vesum ? { vesum: true } : {}), ...(sumHead.length ? { sumHead } : {}), ...(wit ? { wit } : {}), ...(bases.length ? { bases } : {}), ...(srcNames.length ? { srcNames } : {}) }, attested: !dictOnly }
}
/** a light card [lemma, tags, n, "witness|title|form"]: a VESUM lemma attested in an admitted witness */
export function lightFacts(row: [string, string, number, string], meta: (id: string) => WitMetaLite | undefined): TailFacts {
  const w = summarizeWitnesses([row[3].split('|')[0]!], meta, row[2] > 1)
  return { vesum: true, ...(w ? { wit: w } : {}) }
}
/** an archaic card: not in VESUM; the witnesses are its attestations (dictionary witnesses carry no region and add nothing) */
export function archaicFacts(a: { witnesses?: Record<string, number>; dict?: { w?: string } }, meta: (id: string) => WitMetaLite | undefined): TailFacts {
  const w = summarizeWitnesses([...Object.keys(a.witnesses ?? {}), ...(a.dict?.w ? [a.dict.w] : [])], meta)
  return w ? { wit: w } : {}
}
