/**
 * SPEC 63 LB-10 — region coverage of the corpus and the dialect-class projection with the regions filled (analysis/region-coverage.md).
 *
 *   npx tsx pipelines/region-projection.ts --mirror <dir> [--corpus public/data/corpus.json] [--out analysis/region-coverage.md]
 *
 * <dir> is a read-only copy of the live CDN build (`<base>/data/<buildId>/…`, src/data/data-version.json): it needs lex/, cv/ and lm/se/ (a plain `curl` of the
 * objects listed in manifest.json). Nothing is written to public/data and no build runs. Steps:
 *   1. region coverage of tokens / witnesses per source, BEFORE (the region string matched by pipelines/regions.ts as it was) and AFTER (LB-10: places and archive.org metadata);
 *   2. the per-lemma witness distribution is exact: every lex shard stores byW (witness → uses) per form, so byRegion is recomputed for both region assignments;
 *      the BEFORE table is checked against the byRegion the live shards carry (must agree 100 %);
 *   3. diagnosis: of the corpus-attested lemmas, how many have f < 5 even if every witness had a region, and how many have f ≥ 5 but fewer than 5 uses in regioned witnesses;
 *   4. the label build (pipelines/build-labels.ts, with LB-8/LB-9 as committed) is run on both tables → class counts for corpus-attested lemmas and for all entries, plus the threshold variants.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LbStatsJson } from './region-projection-types.ts'
import { REGIONS, regionOf } from './regions.ts'
import { writeJsonAtomic } from './robust.ts'
import { fillWitnessRegions } from './witness-region.ts'

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const pc = (n: number, d: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} (${d ? ((100 * n) / d).toFixed(1) : '0.0'} %)`
const num = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')

interface W { id: string; url: string; region?: string; n: number; title: string }
/** the corpus «source» of a witness id (for the per-source table) */
export function sourceOf(id: string): string {
  if (id.startsWith('hv_ia_')) return 'archive.org (hv_ia_*, archive-ukr та ін.)'
  if (id.startsWith('hv_ws_')) return 'Вікіджерела (hv_ws_*)'
  if (id.startsWith('hv_lit_')) return 'HV-5 література (hv_lit_*)'
  if (id.startsWith('hv_')) return 'HV інше (hv_hrushevsky, hv_orig, hv4 …)'
  const m = /^[a-z]+/i.exec(id)?.[0] ?? id
  if (/^(rib|pum|r2u|gv|ez|sophia|i|o|dsu|kvitka|kobzar|franko|lesya|nechuy|torot)/i.test(m)) return m.toLowerCase().startsWith('rib') ? 'rib*' : m.toLowerCase().startsWith('pum') ? 'pum*' : m.toLowerCase().startsWith('r2u') ? 'r2u*' : 'ізборник / рукописні / автори (ручні маніфести)'
  return 'ізборник / рукописні / автори (ручні маніфести)'
}

async function main() {
  const mirror = resolve(arg('--mirror') ?? ''), corpusPath = resolve(arg('--corpus', 'public/data/corpus.json')!), outPath = resolve(arg('--out', 'analysis/region-coverage.md')!)
  if (!existsSync(`${mirror}/lex`)) throw new Error('--mirror <dir> with lex/, cv/, lm/se/ is required')
  const corpus = readJson<{ witnesses: W[]; N: number; regions: { code: string; N: number }[] }>(corpusPath)
  const ws = corpus.witnesses
  // ── 1. region coverage ──
  const oldCode = (r?: string) => (r ? REGIONS.find(x => x.match.test(r.trim()) && !x.code.startsWith('abroad-'))?.code : undefined)
  const before = new Map(ws.map(w => [w.id, oldCode(w.region)] as const))
  const filled = ws.map(w => ({ id: w.id, url: w.url, title: w.title, region: w.region, regionCite: undefined as undefined, tokens: { length: w.n } as unknown as never[] }))
  const rep = fillWitnessRegions(filled)
  const after = new Map(filled.map(w => [w.id, regionOf(w.region)] as const))
  const regionsOf = (m: Map<string, string | undefined>) => {
    const N = new Map<string, number>(); for (const w of ws) { const c = m.get(w.id); if (c) N.set(c, (N.get(c) ?? 0) + w.n) } return N
  }
  const Nb = regionsOf(before), Na = regionsOf(after)
  const tot = ws.reduce((s, w) => s + w.n, 0)
  const sum = (m: Map<string, number>, f: (c: string) => boolean = () => true) => [...m].filter(([c]) => f(c)).reduce((s, [, n]) => s + n, 0)
  const isAbroad = (c: string) => c.startsWith('abroad-')
  const per = new Map<string, { w: number; wb: number; wa: number; n: number; nb: number; na: number }>()
  for (const w of ws) {
    const o = per.get(sourceOf(w.id)) ?? per.set(sourceOf(w.id), { w: 0, wb: 0, wa: 0, n: 0, nb: 0, na: 0 }).get(sourceOf(w.id))!
    o.w++; o.n += w.n; if (before.get(w.id)) { o.wb++; o.nb += w.n } if (after.get(w.id)) { o.wa++; o.na += w.n }
  }
  const wb = ws.filter(w => before.get(w.id)).length, wa = ws.filter(w => after.get(w.id)).length
  const rows = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1])
  const nameOf = (c: string) => REGIONS.find(r => r.code === c)?.name ?? c
  const unmappedStr = new Map<string, { w: number; n: number }>()
  for (const w of ws) if (w.region && !after.get(w.id)) { const o = unmappedStr.get(w.region) ?? unmappedStr.set(w.region, { w: 0, n: 0 }).get(w.region)!; o.w++; o.n += w.n }
  const noStr = ws.filter(w => !filled.find(f => f.id === w.id)!.region)
  console.log(`regions: tokens with a region ${pc(sum(Nb), tot)} → ${pc(sum(Na), tot)}; witnesses ${wb} → ${wa} of ${ws.length}`)

  // ── 2. per-lemma tables from the lex shards ──
  const tmp = resolve(tmpdir(), `lb-region-${process.pid}`); rmSync(tmp, { recursive: true, force: true })
  const scen = (name: string, N: Map<string, number>) => ({ name, N, dir: `${tmp}/${name}/pub`, lex: [] as never[], codes: REGIONS.map(r => r.code).filter(c => (N.get(c) ?? 0) > 0) })
  const S = [scen('before', Nb), scen('after', Na)]
  for (const s of S) mkdirSync(`${s.dir}/lex`, { recursive: true })
  const lexFiles = readdirSync(`${mirror}/lex`).filter(f => f.endsWith('.json'))
  let lemmas = 0, mism = 0, checked = 0
  const diag = { fLt5: 0, regionFLt5: 0, ok: 0 }, diagAfter = { fLt5: 0, regionFLt5: 0, ok: 0 }
  const liveN = new Map(corpus.regions.map(r => [r.code, r.N] as const))
  for (const f of lexFiles) {
    const sh = readJson<{ lemmas?: string[]; details?: { forms: { byW?: Record<string, number> }[]; stats: { byRegion?: { code: string; f: number; N: number }[] } }[] }>(`${mirror}/lex/${f}`)
    if (!sh.lemmas || !sh.details) continue
    const outs = S.map(() => ({ lemmas: [] as string[], details: [] as unknown[] }))
    sh.lemmas.forEach((lem, i) => {
      const d = sh.details![i]!, perW = new Map<string, number>()
      for (const fm of d.forms) for (const [w, n] of Object.entries(fm.byW ?? {})) perW.set(w, (perW.get(w) ?? 0) + n)
      const fAll = [...perW.values()].reduce((a, b) => a + b, 0)
      lemmas++
      S.forEach((s, si) => {
        const m = si === 0 ? before : after, byC = new Map<string, number>()
        for (const [w, n] of perW) { const c = m.get(w); if (c) byC.set(c, (byC.get(c) ?? 0) + n) }
        const by = s.codes.map(c => ({ code: c, f: byC.get(c) ?? 0, N: s.N.get(c)! }))
        const fReg = by.reduce((a, r) => a + r.f, 0), dg = si === 0 ? diag : diagAfter
        if (fAll < 5) dg.fLt5++; else if (fReg < 5) dg.regionFLt5++; else dg.ok++
        outs[si]!.lemmas.push(lem); outs[si]!.details.push({ stats: { byRegion: by } })
        if (si === 0 && d.stats.byRegion) { checked++; const live = new Map(d.stats.byRegion.map(r => [r.code, r.f] as const)); if (by.some(r => (live.get(r.code) ?? 0) !== r.f) || d.stats.byRegion.some(r => r.N !== (liveN.get(r.code) ?? r.N))) mism++ }
      })
    })
    S.forEach((s, si) => writeJsonAtomic(`${s.dir}/lex/${f}`, JSON.stringify(outs[si])))
  }
  console.log(`lemmas ${lemmas}; BEFORE table agrees with the live byRegion on ${checked - mism}/${checked}`)

  // ── 3. the label build on both tables ──
  const repo = resolve(fileURLToPath(import.meta.url), '../..')
  const root = `${tmp}/root`; mkdirSync(`${root}/data/work`, { recursive: true }); mkdirSync(`${root}/data/raw`, { recursive: true })
  const r2u = [resolve(repo, 'data/raw/r2u'), resolve(arg('--r2u', '') ?? '')].find(p => existsSync(`${p}/index.jsonl`))
  if (r2u) symlinkSync(r2u, `${root}/data/raw/r2u`, 'junction')
  const se: Record<string, unknown> = {}
  if (existsSync(`${mirror}/lm/se`)) for (const f of readdirSync(`${mirror}/lm/se`)) Object.assign(se, readJson(`${mirror}/lm/se/${f}`))
  writeJsonAtomic(`${root}/data/work/se.json`, JSON.stringify(se))
  const results: Record<string, LbStatsJson> = {}
  for (const s of S) {
    const pub = s.dir
    for (const f of ['lexicon.json', 'usage.json', 'loanlabels.json']) if (existsSync(resolve(repo, 'public/data', f))) copyFileSync(resolve(repo, 'public/data', f), `${pub}/${f}`)
    if (existsSync(`${mirror}/cv`)) symlinkSync(`${mirror}/cv`, `${pub}/cv`, 'junction')
    const run = spawnSync(process.execPath, [resolve(repo, 'node_modules/tsx/dist/cli.mjs'), fileURLToPath(import.meta.url), '--run'], {
      cwd: `${tmp}/${s.name}`, env: { ...process.env, PARTS_DATA: pub, LB_ROOT: root, LB_OUT: `${tmp}/${s.name}/lb` }, encoding: 'utf8', maxBuffer: 1 << 28,
    })
    const line = run.stdout.split('\n').find(l => l.startsWith('STATS '))
    if (!line) throw new Error(`label build failed (${s.name}): ${run.stderr.slice(-800)}\n${run.stdout.slice(-400)}`)
    results[s.name] = JSON.parse(line.slice(6)) as LbStatsJson
    console.log(`${s.name}: ${JSON.stringify(results[s.name]!.full)}`)
  }
  rmSync(tmp, { recursive: true, force: true })

  // ── 4. the report ──
  const B = results['before']!, A = results['after']!
  const cov = (o: Record<string, number>) => (o['dict'] ?? 0) + (o['corpus'] ?? 0) + (o['general'] ?? 0)
  const covNo = (o: Record<string, number>) => cov(o) - (o['general-sum'] ?? 0)
  const cls = (o: Record<string, number>, t: number) => [
    ['діалектне за словником (a)', o['dict'] ?? 0], ['регіонально марковане (b)', o['corpus'] ?? 0], ['загальновживане за корпусом (c)', (o['general'] ?? 0) - (o['general-sum'] ?? 0)],
    ['загальновживане за словником (СУМ), LB-9', o['general-sum'] ?? 0], ['недостатньо даних (d)', o['few'] ?? 0],
  ].map(([k, n]) => `| ${k} | ${pc(n as number, t)} |`).join('\n')
  const out: string[] = []
  out.push('# Покриття регіонів і проєкція діалектного класу (SPEC 63 LB-10)', '',
    `Згенеровано \`pipelines/region-projection.ts\`: ${new Date().toISOString()}. Вхід: збірка CDN (дзеркало lex/, cv/, lm/se/ — лише читання), \`public/data/corpus.json\` (${num(ws.length)} пам'яток, ${num(tot)} токенів), \`data/seed/ia-places.json\`. Збірка даних не запускалась.`, '',
    'Регіон пам’ятки (FD-2) — **місце видання**, не діалектна мітка. Місце читається лише з метаданих джерела (поле і дослівне значення зберігаються в `regionCite`): archive.org `publisher`; корпоративний `creator`/`contributor` з місцем у дужках; рядок вихідних даних у `description`; для двох газет без місця в archive.org — довідкове видання з цитатою (`IA_SERIES`); Вікіджерела — поле «місто» шаблону заголовка. Місце → область ISO 3166-2:UA за Wikidata (`core/place-gazetteer.ts`: QID, P17, P131 → P300). Місце поза Україною → «еміграція / поза Україною (<місто>)»: не український регіон (немає області на мапі), але окремий регіон для дисперсії. Складене місце («Київ; Відень») і територія («Галичина; Львів») не відображаються.', '',
    '## 1. Частка токенів і пам’яток з регіоном', '', '| | до | після |', '|---|---:|---:|',
    `| токенів з регіоном | ${pc(sum(Nb), tot)} | ${pc(sum(Na), tot)} |`, `|   з них в Україні | ${pc(sum(Nb, c => !isAbroad(c)), tot)} | ${pc(sum(Na, c => !isAbroad(c)), tot)} |`,
    `|   з них «поза Україною» | ${pc(sum(Nb, isAbroad), tot)} | ${pc(sum(Na, isAbroad), tot)} |`, `| пам’яток з регіоном | ${pc(wb, ws.length)} | ${pc(wa, ws.length)} |`,
    `| регіонів з матеріалом (N > 0) | ${Nb.size} | ${Na.size} |`, '',
    `archive.org: ${num(rep.filled)} пам’яток отримали місце з метаданих предмета (${num(rep.tokens)} токенів; за полем: ${Object.entries(rep.byField).map(([k, n]) => `${k} ${n}`).join(', ')}).`, '',
    '### За джерелами', '', '| джерело | пам’яток | токенів | токенів з регіоном до | після |', '|---|---:|---:|---:|---:|',
    ...[...per].sort((a, b) => b[1].n - a[1].n).map(([k, o]) => `| ${k} | ${num(o.w)} | ${num(o.n)} | ${pc(o.nb, o.n)} | ${pc(o.na, o.n)} |`), '',
    '### Регіони (токени)', '', '| регіон | до | після |', '|---|---:|---:|',
    ...rows(Na).slice(0, 40).map(([c, n]) => `| ${nameOf(c)} | ${num(Nb.get(c) ?? 0)} | ${num(n)} |`), `| … ще ${Math.max(0, Na.size - 40)} регіонів | | |`, '',
    '### Рядки регіону, які лишились без відображення (найбільші)', '', '| рядок | пам’яток | токенів |', '|---|---:|---:|',
    ...[...unmappedStr].sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([k, o]) => `| ${k.replace(/\|/g, '/')} | ${o.w} | ${num(o.n)} |`), '',
    `Без жодного поля місця: ${num(noStr.length)} пам’яток, ${num(noStr.reduce((s, w) => s + w.n, 0))} токенів (серед них archive.org без publisher / creator / description-вихідних / серії).`, '',
    '## 2. Діагностика: чому клас d', '', `Лем з засвідченням у корпусі: ${num(lemmas)}. Використання лем у пам’ятках без регіону не враховується в f регіонів (\`stats.byRegion\`), тому поріг f ≥ ${5} рахується лише по пам’ятках з регіоном.`, '',
    '| причина | до | після |', '|---|---:|---:|',
    `| f < 5 у всьому корпусі (регіони не допоможуть) | ${pc(diag.fLt5, lemmas)} | ${pc(diagAfter.fLt5, lemmas)} |`,
    `| f ≥ 5 у всьому корпусі, але < 5 у пам’ятках з регіоном (**зупиняє лише відсутність регіонів**) | ${pc(diag.regionFLt5, lemmas)} | ${pc(diagAfter.regionFLt5, lemmas)} |`,
    `| f ≥ 5 у пам’ятках з регіоном (поріг f пройдено) | ${pc(diag.ok, lemmas)} | ${pc(diagAfter.ok, lemmas)} |`, '',
    '## 3. Клас діалекту: проєкція (код LB-8/LB-9 як закомічено, пороги незмінні)', '',
    '«До» = регіони як у збірці 202610222130-861b7ef, але з кодом LB-8/LB-9 (СУМ «діал.»/«зах.», теги Вікісловника, підклас СУМ); «Після» = ті самі входи + регіони LB-10. Різниця «до» − опублікований звіт (a+b+c 20,7 %) — внесок LB-8/LB-9 окремо.', '',
    `### Леми з засвідченням у корпусі (${num(B.fullTotal)})`, '', '| клас | до | після |', '|---|---:|---:|',
    ...['dict', 'corpus', 'general', 'general-sum', 'few'].map(k => {
      const v = (st: LbStatsJson) => k === 'general' ? (st.full['general'] ?? 0) - (st.full['general-sum'] ?? 0) : st.full[k] ?? 0
      const lab = { dict: 'діалектне за словником (a)', corpus: 'регіонально марковане (b)', general: 'загальновживане за корпусом (c)', 'general-sum': 'загальновживане за словником (СУМ), LB-9', few: 'недостатньо даних (d)' }[k]!
      return `| ${lab} | ${pc(v(B), B.fullTotal)} | ${pc(v(A), A.fullTotal)} |`
    }),
    `| **a+b+c без підкласу СУМ** | **${pc(covNo(B.full), B.fullTotal)}** | **${pc(covNo(A.full), A.fullTotal)}** |`, `| **a+b+c з підкласом СУМ** | **${pc(cov(B.full), B.fullTotal)}** | **${pc(cov(A.full), A.fullTotal)}** |`, '',
    `### Усі статті (${num(A.allTotal)}: картки корпусу + словникові)`, '', '| клас | до | після |', '|---|---:|---:|',
    ...['dict', 'corpus', 'general', 'general-sum', 'few'].map(k => {
      const v = (st: LbStatsJson) => k === 'general' ? (st.all['general'] ?? 0) - (st.all['general-sum'] ?? 0) : st.all[k] ?? 0
      const lab = { dict: 'діалектне за словником (a)', corpus: 'регіонально марковане (b)', general: 'загальновживане за корпусом (c)', 'general-sum': 'загальновживане за словником (СУМ), LB-9', few: 'недостатньо даних (d)' }[k]!
      return `| ${lab} | ${pc(v(B), B.allTotal)} | ${pc(v(A), A.allTotal)} |`
    }),
    `| **a+b+c без підкласу СУМ** | **${pc(covNo(B.all), B.allTotal)}** | **${pc(covNo(A.all), A.allTotal)}** |`, `| **a+b+c з підкласом СУМ** | **${pc(cov(B.all), B.allTotal)}** | **${pc(cov(A.all), A.allTotal)}** |`, '',
    '### Чутливість до порогів (лише перевірка; картки використовують «взяті пороги»), леми з засвідченням у корпусі, без підкласу СУМ', '', '| пороги | до | після |', '|---|---:|---:|',
    ...A.alt.map((a, i) => `| ${a.name} | ${pc(B.alt[i]!.cover, B.alt[i]!.total)} | ${pc(a.cover, a.total)} |`), '')
  writeJsonAtomic(outPath, out.join('\n') + '\n')
  console.log(`written ${outPath}`)
  void cls
}

/** child: run the label build on the synthetic public dir and print its Stats as one line */
async function run() {
  const { main: labels } = await import('./build-labels.ts')
  const st = labels()
  console.log('STATS ' + JSON.stringify({ full: st.full, fullTotal: st.fullTotal, all: st.all, allTotal: st.allTotal, alt: st.alt }))
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('pipelines/region-projection.ts')) await (process.argv.includes('--run') ? run() : main())
