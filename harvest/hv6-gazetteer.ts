/**
 * SPEC 63 HV-6b: builds `data/seed/hv6-villages.json`, the CITED gazetteer for villages that a footer names without a county («Зап. … у Керестурі»).
 * Source (c) of the order: Wikidata (CC0), one SPARQL query per batch of village labels (language uk): items that are human settlements (Q486972) with a label equal to the village name and a
 * P131 (located in the administrative territorial entity) chain that reaches an item with an ISO 3166-2 code (P300). A village is written ONLY when its label denotes exactly one Wikidata settlement
 * (otherwise it is ambiguous: «Тростянець» = 19 settlements) and its ISO subdivision maps to a region of the project (ISO_REGION); each row keeps QID, label, administrative unit, URL and the retrieval date.
 * At use (`footerByVillage` in harvest/hv6.ts) the region must also be a region that the SAME volume already places by county footers, because a label that is unique in Wikidata can still be another
 * settlement than the one the editor meant («Керестур» is a Romanian village in Wikidata, the volume means Руски Керестур in Бачка).
 * Usage: tsx harvest/hv6-gazetteer.ts <dir with <archive id>.txt djvu texts>   (resumable: re-run rewrites the file atomically; 2 s pacing; Wikidata terms: CC0, UA header)
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { HV6_VOLUMES, footerVillages } from './hv6.ts'
import { villageKey, GAZ_PATH, type GazVillage } from './hv6b.ts'
import { UA, sleep, writeAtomic } from './lib.ts'

/** ISO 3166-2 subdivision → region string of pipelines/regions.ts (oblast-level, only where the oblast is wholly one historical region; UA-61 spans Galicia and Volhynia and is left out) */
export const ISO_REGION: Record<string, string> = {
  'UA-21': 'Закарпаття', 'UA-77': 'Буковина', 'UA-46': 'Галичина', 'UA-26': 'Галичина', 'UA-74': 'Чернігівщина', 'UA-53': 'Полтавщина', 'UA-63': 'Слобожанщина',
  'RS-VO': 'Бачка', 'RO-AR': 'Банат', 'RO-TM': 'Банат', 'RO-MM': 'Мармарощина', 'RO-SV': 'Південна Буковина', 'SK-PV': 'Пряшівщина', 'SK-KI': 'Пряшівщина',
}
const SPARQL = 'https://query.wikidata.org/sparql'
export interface WdRow { l: string; item: string; iso: string; isoL: string }
export function resolveRows(rows: WdRow[], retrieved: string): Record<string, GazVillage> {
  const by = new Map<string, WdRow[]>()
  for (const r of rows) by.set(villageKey(r.l), [...(by.get(villageKey(r.l)) ?? []), r])
  const out: Record<string, GazVillage> = {}
  for (const [key, rs] of by) {
    if (new Set(rs.map(r => r.item)).size !== 1) continue   // ambiguous: several settlements carry the label
    const isos = [...new Set(rs.map(r => r.iso))].filter(i => ISO_REGION[i]), regions = new Set(isos.map(i => ISO_REGION[i]!))
    if (regions.size !== 1) continue
    const r = rs.find(x => ISO_REGION[x.iso])!, qid = r.item.split('/').pop()!
    out[key] = { region: ISO_REGION[r.iso]!, iso: isos, qid, label: r.l, admin: r.isoL || r.iso, url: `https://www.wikidata.org/wiki/${qid}`, retrieved }
  }
  return out
}

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('usage: tsx harvest/hv6-gazetteer.ts <dir with djvu texts>'); process.exit(1) }
  const names = new Map<string, string>()
  for (const v of HV6_VOLUMES) {
    const p = `${dir}/${v.ia}.txt`
    if (!existsSync(p)) continue
    for (const n of footerVillages(readFileSync(p, 'utf8'), v.year)) names.set(villageKey(n), n)
  }
  // Ukrainian locatives («у Керестурі») → try the nominative stems as labels too (-і/-ї → none; -ах/-ях → -и; the label list is a superset, the unique-QID rule keeps it safe)
  const labels = new Set<string>()
  for (const n of names.values()) {
    labels.add(n)
    const s = n.replace(/[іїи]$/u, ''); if (s !== n && s.length >= 4) { labels.add(s); labels.add(s + 'а'); labels.add(s + 'ь') }
    if (/(ах|ях)$/u.test(n)) { labels.add(n.replace(/(ах|ях)$/u, 'и')); labels.add(n.replace(/ах$/u, 'а')) }
    if (/ові$/u.test(n)) labels.add(n.replace(/ові$/u, ''))
  }
  const all = [...labels], rows: WdRow[] = [], retrieved = new Date().toISOString().slice(0, 10)
  console.log(`${names.size} village names from footers without a county, ${all.length} label variants`)
  for (let i = 0; i < all.length; i += 25) {
    const vals = all.slice(i, i + 25).map(n => `"${n.replace(/"/g, '')}"@uk`).join(' ')
    const q = `SELECT ?l ?item ?iso ?isoL WHERE { VALUES ?l { ${vals} } ?item rdfs:label ?l . ?item wdt:P31/wdt:P279* wd:Q486972 . ?item wdt:P131* ?a . ?a wdt:P300 ?iso . OPTIONAL { ?a rdfs:label ?isoL FILTER(lang(?isoL)='uk') } }`
    const r = await fetch(`${SPARQL}?format=json&query=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA, accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(120_000) })
    if (r.status !== 200) { console.error(`HTTP ${r.status} at batch ${i}; stopped (nothing written)`); process.exit(2) }
    const j = await r.json() as { results: { bindings: Record<string, { value: string }>[] } }
    for (const b of j.results.bindings) rows.push({ l: b.l!.value, item: b.item!.value, iso: b.iso!.value, isoL: b.isoL?.value ?? '' })
    await sleep(2000)
  }
  const gaz = resolveRows(rows, retrieved)
  mkdirSync('data/seed', { recursive: true })
  writeAtomic(GAZ_PATH, JSON.stringify(gaz, null, 1))
  console.log(`${Object.keys(gaz).length} villages resolved uniquely (of ${labels.size} labels, ${new Set(rows.map(r => villageKey(r.l))).size} with any Wikidata hit)`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hv6-gazetteer.ts')) await main()
