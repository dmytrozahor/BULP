/**
 * BUILD step SPEC 63 LB: the «Мітки» entry of every lemma → public/data/lm/lb/<bucket>.json (4096 buckets by lk(word), like lm/se) and analysis/labels-coverage.md.
 * Runs AFTER build.ts + build-parts.ts (reads their output) and does not need the 300 MB kaikki dump: `npx tsx pipelines/build-labels.ts`.
 *
 * Inputs (all optional except the lexicon; a missing one is reported, never invented):
 *   data/raw/r2u/{index.jsonl,pages/}   the dictionaries' own labels, parsed with core/dict-labels.ts tables (LB-2) → hits for ALL headwords, not only kept lemmas
 *   public/data/lexicon.json + lex/*.json   cards (pos, VESUM tags, claims) and the witness-region table of each lemma (stats.byRegion)
 *   public/data/usage.json              VESUM / uk.wiktionary / en.wiktionary (kaikki) / r2u usage rows
 *   public/data/cv/*.json               dictionary-only entries (VESUM tag line)
 *   public/data/loanlabels.json         donor labels
 *   data/work/se.json                   sense rows with the labels printed on each sense (СУМ and the others)
 * Env: PARTS_DATA (public/data), LB_ROOT (repo root holding data/), LB_OUT (output dir for lm/lb, default PARTS_DATA/lm/lb).
 * RS-1: shards are written under lm/lb.next and swapped in after all succeeded.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { lk } from '../core/cv.ts'
import { fold } from '../core/orthography.ts'
import { seBucket } from '../core/parts.ts'
import { unpackCore } from '../core/pack.ts'
import { assembleEntry, CLASS_UK, SUM_NONRESTRICTIVE, SUM_NORM_UK, dialectOf, TH, type LbEntry, type RegionCount, type Thresholds } from '../core/labels.ts'
import { DICT_LABEL_TABLES, EXTRA_LABEL_TABLES, scanArticle, scanBracketed, tableOfDict, wireHit, type DictHit } from '../core/dict-labels.ts'
import { nodesOf, plainOf, parseCell, r2uDictById, rowUrl } from './r2u.ts'
import { tokenRaw } from './ingest-r2u.ts'
import { swapDir, writeJsonAtomic } from './robust.ts'

const PUB = process.env.PARTS_DATA ?? 'public/data', ROOT = process.env.LB_ROOT ?? '.', OUT = process.env.LB_OUT ?? `${PUB}/lm/lb`
const readJson = <T>(p: string): T | undefined => { try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : undefined } catch { return undefined } }

export interface DictScan { hits: Map<string, DictHit[]>; per: Record<string, { articles: number; labelled: number; hits: number; lemmas: number; byAbbr: Record<string, number> }> }

/** LB-2: read the r2u dump once; every label of a table → hits keyed by lk(target word). `known` filters to entries that have a card. */
export function scanR2u(dir: string, known: (k: string) => boolean): DictScan {
  const hits = new Map<string, DictHit[]>(), per: DictScan['per'] = {}, seen = new Set<string>()
  const idx = resolve(dir, 'index.jsonl'); if (!existsSync(idx)) return { hits, per }
  const targets = new Map<string, Set<string>>()
  for (const line of readFileSync(idx, 'utf8').split('\n')) {
    if (!line) continue
    let l: { q: string; scope: string; file: string; status: number }; try { l = JSON.parse(line) } catch { continue }
    if (l.status !== 200) continue
    let html: string; try { html = gunzipSync(readFileSync(resolve(dir, 'pages', l.file))).toString('utf8') } catch { continue }
    for (const m of html.matchAll(/<td id="(\d+)_(\d+)" class="result_row[a-z_]*">([\s\S]*?)<\/td>/g)) {
      const dict = +m[1]!, rowId = +m[2]!, id = `${dict}_${rowId}`
      const table = tableOfDict(dict), d = r2uDictById[dict]
      if (!table || !d || seen.has(id)) continue
      seen.add(id)
      const p = (per[table.short] ??= { articles: 0, labelled: 0, hits: 0, lemmas: 0, byAbbr: {} }); p.articles++
      const nodes = nodesOf(m[3]!), text = plainOf(nodes), url = rowUrl(l.q, l.scope, { dict, rowId })
      const found = table.attach === 'article' ? scanArticle(table, text) : scanBracketed(table, text)
      if (!found.length) continue
      p.labelled++
      let heads: string[] = []
      if (table.attach === 'article') heads = parseCell(dict, rowId, m[3]!)?.head ?? []
      for (const h of found) {
        const words = table.attach === 'article' ? heads : [h.word!]
        const wire = wireHit(table, h, url)
        for (const w of words) {
          const cands = fold(tokenRaw(w), d.orth).map(c => lk(c.form)), ks = [...new Set(cands)].filter(known)
          for (const k of ks.length ? ks : []) {
            const list = hits.get(k) ?? hits.set(k, []).get(k)!
            if (list.some(x => x.t === wire.t && x.a === wire.a && x.u === wire.u)) continue
            list.push(wire); p.hits++; p.byAbbr[h.row.abbr] = (p.byAbbr[h.row.abbr] ?? 0) + 1
            ;(targets.get(table.short) ?? targets.set(table.short, new Set()).get(table.short)!).add(k)
          }
        }
      }
    }
  }
  for (const [s, set] of targets) per[s]!.lemmas = set.size
  return { hits, per }
}

export interface Stats {
  full: Record<string, number>
  fullTotal: number
  all: Record<string, number>
  allTotal: number
  register: { withLabel: number; total: number; bySrc: Record<string, number> }
  type: { total: number; withWordType: number }
  sense: { rows: number; labelled: number }
  /** LB-8: lemmas per label of the sources that are not r2u dumps (СУМ-11, СУМ-20, en/uk.Вікісловник): «<table id>: <label>» → lemmas; plain «діал.» rows without a table as «<source>: діал.» */
  src: Record<string, number>
  /** class counts of the corpus cards under other thresholds (a sensitivity check, not what the cards use) */
  alt: { name: string; cover: number; total: number }[]
}
const ALT: { name: string; th: Partial<Thresholds> }[] = [
  { name: 'взяті пороги', th: {} }, { name: 'f ≥ 3 (регіон ≥ 2 вживань)', th: { fMin: 3, fRegionMin: 2 } }, { name: '≥ 2 регіони для «загальновживаного»', th: { k: 2 } },
  { name: 'f ≥ 3 і ≥ 2 регіони', th: { fMin: 3, fRegionMin: 2, k: 2 } }, { name: 'DP ≤ 0.8', th: { dpMax: 0.8 } },
]
const bump = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1 }

export function main(): Stats {
  const t0 = Date.now()
  const lexicon = readJson<unknown>(`${PUB}/lexicon.json`)
  if (!lexicon) throw new Error(`${PUB}/lexicon.json is missing (run build:data first)`)
  const cards = unpackCore(lexicon)
  const usageFile = readJson<{ lemmas: Record<string, [string, string, string][]> }>(`${PUB}/usage.json`)
  const usage = new Map(Object.entries(usageFile?.lemmas ?? {}).map(([k, v]) => [lk(k), v]))
  const loan = readJson<{ labels: Record<string, [string, string]> }>(`${PUB}/loanlabels.json`)
  const seFile = readJson<Record<string, { rows: { d: string; n?: number; lb?: string[]; g?: string; u?: string; l?: string; v?: string[] }[] }>>(resolve(ROOT, 'data/work/se.json'))
  // witness-region tables from the detail shards
  const byRegion = new Map<string, RegionCount[]>()
  const lexDir = `${PUB}/lex`
  if (existsSync(lexDir)) for (const f of readdirSync(lexDir)) {
    if (!f.endsWith('.json')) continue
    const s = readJson<{ lemmas?: string[]; details?: { stats?: { byRegion?: RegionCount[] } }[] }>(`${lexDir}/${f}`); if (!s?.lemmas) continue
    s.lemmas.forEach((l, i) => { const b = s.details?.[i]?.stats?.byRegion; if (b?.length) byRegion.set(lk(l), b) })
  }
  // dictionary-only entries
  const cvTags = new Map<string, string>()
  const cvDir = `${PUB}/cv`
  if (existsSync(cvDir)) for (const f of readdirSync(cvDir)) {
    const s = readJson<Record<string, unknown[]>>(`${cvDir}/${f}`); if (!s) continue
    for (const [k, e] of Object.entries(s)) cvTags.set(lk(k), typeof e[1] === 'string' ? e[1] : '')
  }
  const cardKeys = new Set(cards.map(c => lk(c.lemma)))
  const known = (k: string) => cardKeys.has(k) || cvTags.has(k) || usage.has(k)
  const scan = scanR2u(resolve(ROOT, 'data/raw/r2u'), known)
  console.log(`labels: r2u scanned (${Object.entries(scan.per).map(([s, p]) => `${s} ${p.articles} статей / ${p.labelled} з позначкою / ${p.hits} позначок / ${p.lemmas} лем`).join('; ')})`)

  const entries = new Map<string, LbEntry>()
  const st: Stats = { full: {}, fullTotal: 0, all: {}, allTotal: 0, register: { withLabel: 0, total: 0, bySrc: {} }, type: { total: 0, withWordType: 0 }, sense: { rows: 0, labelled: 0 }, src: {}, alt: ALT.map(a => ({ name: a.name, cover: 0, total: 0 })) }
  const seRows = (k: string) => (seFile?.[k]?.rows ?? []).filter(r => r.lb?.length).map(r => ({ n: r.n, d: r.d, lb: r.lb!, ...(r.g ? { g: r.g } : {}), ...(r.u ? { u: r.u } : {}), ...(r.v ? { v: r.v } : {}) }))
  /** LB-9: the lemma's headword in СУМ-11 / СУМ-20 (one entry per dictionary; restricted = a sense carries a label other than the non-restrictive ones) */
  const sumRows = (k: string) => {
    const by = new Map<string, { d: string; n: number; restricted: boolean; u?: string; l?: string }>()
    for (const r of seFile?.[k]?.rows ?? []) {
      if (r.d !== 'sum11' && r.d !== 'sum20') continue
      const x = by.get(r.d) ?? by.set(r.d, { d: r.d, n: 0, restricted: false }).get(r.d)!
      x.n++; if ((r.lb ?? []).some(l => !SUM_NONRESTRICTIVE.has(l.trim().toLowerCase()))) x.restricted = true
      if (!x.u && r.u) x.u = r.u; if (!x.l && r.l) x.l = r.l
    }
    return [...by.values()]
  }
  const count = (e: LbEntry, full: boolean) => {
    st.allTotal++; bump(st.all, e.d.c); if (e.d.sub === 'sum') bump(st.all, 'general-sum'); st.register.total++; if (e.r.length) { st.register.withLabel++; for (const s of new Set(e.r.map(r => r[1]))) bump(st.register.bySrc, s) }
    st.type.total++; if (e.t.length) st.type.withWordType++
    for (const h of e.d.dict ?? []) if (EXTRA_LABEL_TABLES.some(t => t.id === h.t)) bump(st.src, `${h.t}: ${h.a}`)
    for (const [s] of e.d.plain ?? []) bump(st.src, `${s === 'w' ? 'uk.Вікісловник' : s === 'k' ? 'en.Вікісловник' : 'СУМ'}: діал. (регіон не вказано)`)
    if (full) { st.fullTotal++; bump(st.full, e.d.c); if (e.d.sub === 'sum') bump(st.full, 'general-sum'); if (e.d.c === 'dict') bump(st.full, e.d.strict ? 'dict-strict' : 'dict-place') }
    if (e.d.c === 'dict') bump(st.all, e.d.strict ? 'dict-strict' : 'dict-place')
  }
  for (const c of cards) {
    const k = lk(c.lemma), tc: Record<string, number> = {}
    for (const q of c.paradigm) for (const t of new Set(q.tags.split(':'))) tc[t] = (tc[t] ?? 0) + 1
    const dia = Object.values(c.claims.dialect ?? {}) as { evidence: { source: string; quote: string; locator: string }[] }[]
    const claimDict: [string, string, string][] = []
    for (const [code, cl] of Object.entries(c.claims.dialect ?? {})) { const c2 = cl as { method?: string; evidence: { source: string; quote: string; locator: string }[] }; const ev = /^LEX-/.test(c2.method ?? '') ? c2.evidence.find(e => e.source === 'ENC') : undefined; if (ev) claimDict.push([code, ev.quote, ev.locator]) }
    void dia
    const prop = c.claims.proper as { value: unknown; evidence: { quote: string; locator: string }[] } | undefined
    const cs = c.claims.origin as { value: unknown; evidence: { quote: string; locator: string }[] }
    const e = assembleEntry({
      by: byRegion.get(k), dict: scan.hits.get(k) ?? [], usage: usage.get(k) ?? [], tagCount: tc, nForms: c.paradigm.length, se: seRows(k), pos: c.pos, paradigmKind: c.paradigmKind, lemma: c.lemma, sum: sumRows(k),
      tagLine: c.paradigm[0]?.tags, kind: 'full',
      ...(prop && prop.value !== 'unknown' && prop.evidence[0] ? { proper: { kind: String(prop.value), quote: prop.evidence[0].quote, locator: prop.evidence[0].locator } } : {}),
      ...(cs.value === 'church_slavonic' && cs.evidence[0] ? { cs: { quote: cs.evidence[0].quote, locator: cs.evidence[0].locator } } : {}),
      ...(loan?.labels[c.lemma] ? { loan: loan.labels[c.lemma]! } : {}), claimDict,
    })
    entries.set(k, e); count(e, true)
    const by = byRegion.get(k)
    ALT.forEach((a, i) => { const r = dialectOf(e.d.dict ?? [], e.d.plain ?? [], by, { ...TH, ...a.th }); st.alt[i]!.total++; if (r.c !== 'few') st.alt[i]!.cover++ })
  }
  for (const [k, tags] of cvTags) {
    if (entries.has(k)) continue
    const e = assembleEntry({ dict: scan.hits.get(k) ?? [], usage: usage.get(k) ?? [], se: seRows(k), sum: sumRows(k), lemma: k, tagLine: tags, kind: 'dict', ...(loan?.labels[k] ? { loan: loan.labels[k]! } : {}) })
    entries.set(k, e); count(e, false)
  }
  if (seFile) for (const e of Object.values(seFile)) for (const r of e.rows) { st.sense.rows++; if (r.lb?.length) st.sense.labelled++ }

  // write the shards: only entries that carry something beyond the default «немає даних»
  const parts = new Map<number, Record<string, LbEntry>>()
  let written = 0
  for (const [k, e] of entries) {
    if (e.d.c === 'few' && !e.d.corp && !e.r.length && !e.t.length && !e.s && !e.p) continue
    const b = seBucket(k); ;(parts.get(b) ?? parts.set(b, {}).get(b)!)[k] = e; written++
  }
  const next = `${OUT}.next`
  rmSync(next, { recursive: true, force: true }); mkdirSync(next, { recursive: true })
  for (const [b, p] of parts) writeJsonAtomic(`${next}/${b}.json`, JSON.stringify(p))
  mkdirSync(resolve(OUT, '..'), { recursive: true }); swapDir(next, OUT)
  writeReport(st, scan, written, parts.size)
  console.log(`labels: ${entries.size} entries (${st.fullTotal} corpus cards), ${written} written in ${parts.size} shards, ${((Date.now() - t0) / 1000).toFixed(1)} s; classes(all): ${JSON.stringify(st.all)}; classes(corpus cards): ${JSON.stringify(st.full)}`)
  return st
}

const pc = (n: number, d: number) => `${n} (${d ? ((100 * n) / d).toFixed(1) : '0.0'} %)`
function writeReport(st: Stats, scan: DictScan, written: number, shards: number): void {
  const cls = (o: Record<string, number>, tot: number) => (['dict', 'corpus', 'general', 'few'] as const).flatMap(c => [`| ${c === 'general' ? CLASS_UK[c] + ' (за корпусом)' : CLASS_UK[c]} | ${pc(c === 'general' ? (o.general ?? 0) - (o['general-sum'] ?? 0) : o[c] ?? 0, tot)} |`, ...(c === 'general' ? [`| ${SUM_NORM_UK} | ${pc(o['general-sum'] ?? 0, tot)} |`] : []), ...(c === 'dict' ? [`|   з них: мітка позначає слово діалектним / регіональним | ${pc(o['dict-strict'] ?? 0, tot)} |`, `|   з них: словник лише називає місце запису (повіт, губернію) | ${pc(o['dict-place'] ?? 0, tot)} |`] : [])]).join('\n')
  const cov = (o: Record<string, number>) => (o.dict ?? 0) + (o.corpus ?? 0) + (o.general ?? 0)
  const covNoSum = (o: Record<string, number>) => cov(o) - (o['general-sum'] ?? 0)
  const text = [
    '# Покриття міток (SPEC 63 LB)', '',
    `Згенеровано \`pipelines/build-labels.ts\`: ${new Date().toISOString()}. Пороги: f ≥ ${TH.fMin}; регіон ≥ ${TH.fRegionMin} вживань, LR ≥ ${TH.lrMin}, p < ${TH.alpha}/(число регіонів з матеріалом) (Бонферроні), регіонів з матеріалом ≥ ${TH.regionsMin}; «загальновживане»: регіонів ≥ ${TH.k}, DP ≤ ${TH.dpMax}.`, '',
    `## Діалектний клас — леми з засвідченням у корпусі (${st.fullTotal})`, '', '| клас | леми |', '|---|---|', cls(st.full, st.fullTotal),
    `| **a+b+c без підкласу СУМ** | **${pc(covNoSum(st.full), st.fullTotal)}** |`, `| **a+b+c з підкласом СУМ (LB-9)** | **${pc(cov(st.full), st.fullTotal)}** |`, '',
    '### Чутливість до порогів (лише для перевірки; картки використовують «взяті пороги»)', '', '| пороги | клас визначено |', '|---|---|', ...st.alt.map(a => `| ${a.name} | ${pc(a.cover, a.total)} |`), '',
    `## Діалектний клас — усі статті (${st.allTotal}: картки корпусу + словникові)`, '', '| клас | статті |', '|---|---|', cls(st.all, st.allTotal),
    `| **a+b+c без підкласу СУМ** | **${pc(covNoSum(st.all), st.allTotal)}** |`, `| **a+b+c з підкласом СУМ (LB-9)** | **${pc(cov(st.all), st.allTotal)}** |`, '',
    '## Позначки словників (діалектні / територіальні / вжиток), прочитані з власних списків скорочень', '',
    '| словник | статей у дампі | статей з позначкою | позначок | лем із позначкою |', '|---|---|---|---|---|',
    ...Object.entries(scan.per).map(([s, p]) => `| ${s} | ${p.articles} | ${p.labelled} | ${p.hits} | ${p.lemmas} |`), '',
    ...Object.entries(scan.per).map(([s, p]) => `- ${s}: ${Object.entries(p.byAbbr).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([a, n]) => `«${a}» ${n}`).join(', ') || 'позначок не знайдено'}`), '',
    '## Мітки нових джерел (LB-8): лем із міткою', '', ...(Object.keys(st.src).length ? Object.entries(st.src).sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`) : ['- немає даних (ні СУМ, ні Вікісловника у вхідних файлах)']),
    '', 'ВЕСУМ (dict_uk doc/tags.txt): територіальних тегів немає; `arch` («застаріле/архаїчне/(інколи) діалектне») діалектним слово не робить.', '',
    `## Регістр / вжиток`, '', `- лем із хоча б однією позначкою: ${pc(st.register.withLabel, st.register.total)}; решта — «нейтральне (немає позначок у словниках)» з переліком перевірених джерел.`,
    `- за джерелами (лема може мати кілька): ${Object.entries(st.register.bySrc).map(([s, n]) => `${s} ${n}`).join(', ') || '—'}`, '',
    `## Тип`, '', `- лем зі словесним типом (власна назва, абревіатура, запозичення, ЦС, архаїзм …): ${pc(st.type.withWordType, st.type.total)}; частина мови і морфологічний клас показані завжди.`, '',
    `## Значення (позначки на значеннях)`, '', `- рядків значень у SE: ${st.sense.rows}, з позначкою на значенні: ${st.sense.labelled}.`, '',
    `Записано ${written} записів у ${shards} шардах lm/lb.`,
  ]
  if (existsSync('analysis')) writeJsonAtomic('analysis/labels-coverage.md', text.join('\n') + '\n')
}

if (process.argv[1]?.endsWith('build-labels.ts')) main()
void DICT_LABEL_TABLES
