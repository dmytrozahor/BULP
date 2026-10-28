/**
 * SPEC 63 LB-10 — fetch the Wikidata facts behind core/place-gazetteer.ts (run by hand, network; the committed core/place-gazetteer.ts is its output):
 *   npx tsx pipelines/place-gazetteer.ts > core/place-gazetteer.ts
 * For every place of core/witness-place.ts the QID below is looked up on wikidata.org (wbgetentities): the label, P17 «country» (the value without an end time P582),
 * P131 «located in the administrative territorial entity» followed upward until an item carries P300 «ISO 3166-2 code» of Ukraine (UA-…). Nothing else is read.
 * The QID choice is ours [P] (a place name is ambiguous: Рочестер, Мінден, Холм are left out for that reason); the claims are Wikidata's, with the retrieval date.
 */
import { PLACE_RULES } from '../core/witness-place.ts'

export const QIDS: Record<string, string> = {
  lviv: 'Q36036', kharkiv: 'Q42308', kyiv: 'Q1899', kolomyia: 'Q52193', odesa: 'Q1874', dnipro: 'Q48256', ternopil: 'Q156743', kherson: 'Q156732', vinnytsia: 'Q157144',
  kropyvnytskyi: 'Q158292', cherkasy: 'Q157055', chernivtsi: 'Q157725', chernihiv: 'Q157053', zhovkva: 'Q864836', 'ivano-frankivsk': 'Q156726', prylyky: 'Q1000404',
  zvenyhorodka: 'Q219836', drohobych: 'Q158821', 'kamianets-podilskyi': 'Q193965', zmiiv: 'Q1106097', rivne: 'Q156739', balta: 'Q805554', lutsk: 'Q7550', ostroh: 'Q140671',
  sumy: 'Q156752', bakhmut: 'Q706857', mariupol: 'Q37133', lysychansk: 'Q33280', kobeliaky: 'Q269538', melitopol: 'Q33349', simferopol: 'Q19566', hlukhiv: 'Q864827',
  pochaiv: 'Q149060', peremyshliany: 'Q997462', uzhhorod: 'Q156711', poltava: 'Q156747',
  vienna: 'Q1741', prague: 'Q1085', berlin: 'Q64', 'new-york': 'Q60', krakow: 'Q31487', winnipeg: 'Q2135', scranton: 'Q271395', philadelphia: 'Q1345', 'saint-petersburg': 'Q656',
  leipzig: 'Q2079', toronto: 'Q172', jena: 'Q3150', 'jersey-city': 'Q26339', moscow: 'Q649', warsaw: 'Q270', ufa: 'Q911', cleveland: 'Q37320', podebrady: 'Q683165',
  wetzlar: 'Q4178', chicago: 'Q1297', strasbourg: 'Q6602', budapest: 'Q1781', tallinn: 'Q1770', riga: 'Q1773', kalisz: 'Q52842', feldkirch: 'Q183104', brest: 'Q140147',
  vilnius: 'Q216', montreal: 'Q340', tarnow: 'Q106281', minsk: 'Q2280', geneva: 'Q71', paris: 'Q90', washington: 'Q61', edmonton: 'Q2096', munich: 'Q1726', boston: 'Q100',
  augsburg: 'Q2749', freistadt: 'Q143140', rastatt: 'Q6874', olyphant: 'Q1181743', vancouver: 'Q24639', london: 'Q84', istanbul: 'Q406', voronezh: 'Q3426', mogilev: 'Q154835',
  przemysl: 'Q208473', salzwedel: 'Q486985', hamburg: 'Q1055', detroit: 'Q12439', germany: 'Q183', 'bad-woerishofen': 'Q504579', graefenhainichen: 'Q373077',
  novorossiysk: 'Q15760', brooklyn: 'Q18419',
}
const UA = 'Q212'
interface Claim { rank?: string; mainsnak?: { datavalue?: { value?: { id?: string } | string } }; qualifiers?: Record<string, unknown> }
interface Ent { labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; claims?: Record<string, Claim[]> }
const api = async (ids: string[]): Promise<Record<string, Ent>> => {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=uk|en&ids=${ids.join('|')}`, { headers: { 'User-Agent': 'BULP-region/1.0 (https://github.com/dmytrozahor/BULP)' } })
      return ((await r.json()) as { entities: Record<string, Ent> }).entities
    } catch { await new Promise(r => setTimeout(r, 2000)) }
  }
  throw new Error('wikidata unreachable')
}
const idOf = (c: Claim): string | undefined => { const v = c.mainsnak?.datavalue?.value; return typeof v === 'object' ? v.id : undefined }
const ids = (e: Ent | undefined, p: string, current = false): string[] => {
  // current = the statements without an end time (P582), the preferred ones alone when there are any (Wikidata's own ranking)
  const cs = (e?.claims?.[p] ?? []).filter(c => c.rank !== 'deprecated' && !(current && c.qualifiers?.['P582']))
  const pref = cs.filter(c => c.rank === 'preferred')
  return (pref.length ? pref : cs).map(idOf).filter((x): x is string => !!x)
}
const lab = (e: Ent | undefined) => e?.labels?.['uk']?.value ?? e?.labels?.['en']?.value ?? ''
const isoOf = (e: Ent | undefined): string | undefined => (e?.claims?.['P300'] ?? []).map(c => c.mainsnak?.datavalue?.value).find((v): v is string => typeof v === 'string' && v.startsWith('UA-'))

async function main() {
  const cache = new Map<string, Ent>()
  const get = async (qs: string[]) => { const need = [...new Set(qs)].filter(q => !cache.has(q)); for (let i = 0; i < need.length; i += 40) { const r = await api(need.slice(i, i + 40)); for (const [k, v] of Object.entries(r)) cache.set(k, v) } }
  await get(Object.values(QIDS))
  const rows: string[] = []
  for (const r of PLACE_RULES) {
    const q = QIDS[r.id]; if (!q) { console.error('no QID for', r.id); process.exitCode = 1; continue }
    const e = cache.get(q)!
    const cs0 = ids(e, 'P17', true); await get(cs0); const cs = cs0.filter(c => (cache.get(c)?.claims?.['P297'] ?? []).length > 0)
    const country = q === 'Q183' ? q : cs[0]
    let oblast: { qid: string; iso: string; label: string } | undefined
    const chain: string[] = [q]
    if (cs.includes(UA)) {
      // breadth-first over P131 (a place may have several parents: hromada, raion, oblast); the first item with a P300 of Ukraine wins; the city itself may carry it (Київ UA-30)
      let layer = [q]; const seen = new Set([q]); const parent = new Map<string, string>(); const hits: string[] = []; const depthOf = new Map<string, number>()
      for (let depth = 0; depth < 6 && layer.length; depth++) {
        for (const n of layer) if (isoOf(cache.get(n))) { hits.push(n); depthOf.set(n, depth) }
        const next: string[] = []
        for (const n of layer) { const cur = ids(cache.get(n), 'P131', true), ps = cur.length ? cur : ids(cache.get(n), 'P131'); await get(ps); for (const p of ps) if (!seen.has(p)) { seen.add(p); parent.set(p, n); next.push(p) } }
        layer = next
      }
      // Wikidata's P131 may reach more than one oblast (a stale parent): the nearest one wins when it is unique, else the item's own Ukrainian description must name the oblast, else the place is left out
      const desc = e.descriptions?.['uk']?.value ?? ''
      const near = hits.filter(h => depthOf.get(h) === Math.min(...hits.map(x => depthOf.get(x)!)))
      const stem = (h: string) => lab(cache.get(h)).replace(/ область$/, '').slice(0, -2)
      const pathOf = (h: string) => { const p: string[] = []; for (let x: string | undefined = h; x; x = parent.get(x)) p.push(x); return p }
      // the oblast named in the item's own description, or in the description of an item on the path to it (a raion: «район в Хмельницькій області»), or the oblast whose name the place's own name starts (Полтава → Полтавська)
      const named = hits.filter(h => stem(h).length >= 4 && (desc.includes(stem(h)) || pathOf(h).some(x => (cache.get(x)?.descriptions?.['uk']?.value ?? '').includes(stem(h))) || lab(e).startsWith(stem(h).slice(0, 5))))
      const pick = hits.length === 1 ? hits[0] : named.length === 1 ? named[0] : near.length === 1 ? near[0] : undefined
      if (pick) { oblast = { qid: pick, iso: isoOf(cache.get(pick))!, label: lab(cache.get(pick)) }; for (let x: string | undefined = pick; x; x = parent.get(x)) chain.push(x) }
      else console.error('AMBIGUOUS oblast for', r.id, hits.map(h => isoOf(cache.get(h))), desc)
      const uniq = [...new Set(chain)]; chain.length = 0; chain.push(...uniq)
    }
    await get(chain)
    rows.push(`  ${JSON.stringify(r.id)}: { qid: ${JSON.stringify(q)}, label: ${JSON.stringify(lab(e))}, country: ${country ? `{ qid: ${JSON.stringify(country)}, label: ${JSON.stringify(lab(cache.get(country)))} }` : 'undefined'}${oblast ? `, oblast: { qid: ${JSON.stringify(oblast.qid)}, iso: ${JSON.stringify(oblast.iso)}, label: ${JSON.stringify(oblast.label)} }, via: ${JSON.stringify(chain.map(c => lab(cache.get(c))))}` : ''} },`)
  }
  console.log(`/**\n * GENERATED by pipelines/place-gazetteer.ts from wikidata.org (CC0), retrieved ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.\n * Per place of core/witness-place.ts: its Wikidata item, P17 «country» (current), and — inside Ukraine — the oblast reached by following P131 upward to an item with P300 «ISO 3166-2 code» UA-….\n */\nexport interface PlaceFact { qid: string; label: string; country?: { qid: string; label: string }; oblast?: { qid: string; iso: string; label: string }; via?: string[] }\nexport const PLACE_FACTS: Record<string, PlaceFact> = {\n${rows.join('\n')}\n}`)
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/place-gazetteer.ts')) await main()
