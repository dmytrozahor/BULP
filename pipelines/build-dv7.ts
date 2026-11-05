/**
 * SPEC 63 DV-7 — from the output of pipelines/dv7-scan.ts (DV7_IN, default data/work/dv7) to
 *   data/dv/hist-forms.json              the shipped historical variant forms with their areas (dialect group, grade, first fixation), read by pipelines/build-corr.ts (CR-1) and by build-dv.ts (numeral matrix)
 *   data/dv/hist-stats.json              counts per group and grade
 *   analysis/dialect-historical-forms.md the per-group report for the owner (counts, top 50 with first fixation and evidence, spot-check rates, thin groups)
 * Spot-check results of the author are kept in data/dv/hist-spotcheck.json ({ "<group>": { checked, wrong, dropRules?: [...] } }) and applied: a rule listed in dropRules is removed for that group.
 *   node --experimental-transform-types pipelines/build-dv7.ts            build
 *   node --experimental-transform-types pipelines/build-dv7.ts sample NDN 50 7   print 50 random shipped forms of a group (the spot check)
 */
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { type HistArea, type HistRow, CLASS_UK, GROUPS, GROUP_NAME, HF, RULE_UK, groupOfRegion, skewOf, type FormClass, type HistForm, type HfGrade } from '../core/dialect-hist.ts'
import { parseOwnerTsv, ownerPairKey } from '../core/dialect-variants.ts'
import { REGIONS } from './regions.ts'
import { readJson, writeJsonAtomic } from './robust.ts'
import { readFileSync } from 'node:fs'

const ROOT = resolve(process.env.DV_ROOT ?? '.'), IN = resolve(process.env.DV7_IN ?? resolve(ROOT, 'data/work/dv7'))
const regionName = new Map(REGIONS.map(r => [r.code, r.name] as const))
const nameOf = (c: string) => regionName.get(c) ?? c


export function shape(forms: HistForm[], bg: Record<string, number>, drop: Record<string, string[]> = {}, rejected = new Set<string>(), dropForms: Record<string, string[]> = {}): HistRow[] {
  const tot = Object.values(bg).reduce((a, b) => a + b, 0), out: HistRow[] = []
  for (const f of forms) {
    if (rejected.has(ownerPairKey(f.v, f.l))) continue
    if (f.via !== 'direct' && f.via !== 'torot-lemma') continue   // lemma by token / by the model mis-linked 4 of 5 in the first spot check (конци > конка, добри > добро)
    const sk = skewOf(f, bg, tot), areas: HistArea[] = []
    // per group: the region with the most tokens in that group
    const by = new Map<string, { region: string; stat: HistForm['reg'][string] }>()
    for (const [region, stat] of Object.entries(f.reg)) {
      const g = groupOfRegion(region, nameOf(region)); if (!g) continue
      const cur = by.get(g); if (!cur || stat[0] > cur.stat[0]) by.set(g, { region, stat })
    }
    for (const g of GROUPS) {
      if (f.r.some(r => drop[g]?.includes(r)) || dropForms[g]?.includes(`${f.l}|${f.v}`)) continue
      const d = f.dict?.find(x => x[0].includes(GROUP_NAME[g]!.split(' ')[0]!))
      const hit = by.get(g)
      if (d) { areas.push({ g, grade: 'dict', dict: d, ...(hit ? { region: hit.region, tokens: hit.stat[0], witnesses: hit.stat[1], y: hit.stat[2], w: hit.stat[3] } : {}) }); continue }
      if (!hit) continue
      if (sk && sk.region === hit.region) areas.push({ g, grade: 'corpus', region: hit.region, tokens: hit.stat[0], witnesses: hit.stat[1], share: Math.round(sk.share * 1000) / 1000, y: hit.stat[2], w: hit.stat[3] })
      else if (hit.stat[1] >= 2) areas.push({ g, grade: 'hyp', region: hit.region, tokens: hit.stat[0], witnesses: hit.stat[1], y: hit.stat[2], w: hit.stat[3] })
    }
    if (!areas.length) continue
    let first: HistRow['first']
    for (const [region, s] of Object.entries(f.reg)) if (groupOfRegion(region, nameOf(region)) && (!first || s[2] < first.y)) first = { y: s[2], w: s[3], region }
    out.push({ l: f.l, v: f.v, t: f.t, c: f.c, r: f.r, n: f.n, nw: f.nw, ...(first ? { first } : {}), areas })
  }
  return out
}

function main() {
  const forms = readJson<HistForm[]>(resolve(IN, 'dv7-forms.json')), bg = readJson<Record<string, number>>(resolve(IN, 'dv7-bg.json')), scan = readJson<Record<string, unknown>>(resolve(IN, 'dv7-stats.json'))
  const spotF = resolve(ROOT, 'data/dv/hist-spotcheck.json'), spot = existsSync(spotF) ? readJson<Record<string, { checked: number; wrong: number; dropRules?: string[]; dropForms?: string[]; note?: string }>>(spotF) : {}
  const drop = Object.fromEntries(Object.entries(spot).map(([g, s]) => [g, s.dropRules ?? []]))
  const rejF = resolve(ROOT, 'data/owner/variants-rejected.tsv'), conF = resolve(ROOT, 'data/owner/variants-confirmed.tsv')
  const rejected = new Set((existsSync(rejF) ? parseOwnerTsv(readFileSync(rejF, 'utf8')) : []).map(r => ownerPairKey(r.form, r.target)))
  const confirmed = new Set((existsSync(conF) ? parseOwnerTsv(readFileSync(conF, 'utf8')) : []).map(r => ownerPairKey(r.form, r.target)))
  const dropForms = Object.fromEntries(Object.entries(spot).map(([g, s]) => [g, s.dropForms ?? []]))
  const rows = shape(forms, bg, drop, rejected, dropForms)
  if (process.argv[2] === 'sample') {
    const [g, n, seed] = [process.argv[3]!, +(process.argv[4] ?? 50), +(process.argv[5] ?? 7)]
    let s = seed; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
    const a = rows.filter(r => r.areas.some(x => x.g === g)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] }
    console.log(`## ${g} ${a.length} forms`); console.log(a.slice(0, n).map(r => `${r.v}>${r.t}(${r.l})*${r.n}/${r.nw} ${r.r.map(x => x.replace('ORTH-', '')).join('+')} ${r.areas.find(x => x.g === g)!.grade}`).join('  '))
    return
  }
  mkdirSync(resolve(ROOT, 'data/dv'), { recursive: true })
  // per lemma at most 6 variants (by tokens): a CR-1 group stays readable
  const byL = new Map<string, HistRow[]>(); for (const r of rows) (byL.get(r.l) ?? byL.set(r.l, []).get(r.l)!).push(r)
  const ship: HistRow[] = []; for (const rs of byL.values()) ship.push(...rs.sort((a, b) => b.n - a.n).slice(0, 6))
  ship.sort((a, b) => (a.l < b.l ? -1 : a.l > b.l ? 1 : b.n - a.n))
  writeJsonAtomic(resolve(ROOT, 'data/dv/hist-forms.json'), JSON.stringify({ format: 1, thresholds: HF, rows: ship }))
  // stats
  const per: Record<string, { forms: number; dict: number; corpus: number; hyp: number; tokens: number }> = {}
  for (const g of GROUPS) per[g] = { forms: 0, dict: 0, corpus: 0, hyp: 0, tokens: 0 }
  for (const r of ship) for (const a of r.areas) { const p = per[a.g]!; p.forms++; p[a.grade]++; p.tokens += a.tokens ?? 0 }
  const byClass: Record<string, number> = {}; for (const r of ship) byClass[r.c] = (byClass[r.c] ?? 0) + 1
  writeJsonAtomic(resolve(ROOT, 'data/dv/hist-stats.json'), JSON.stringify({ format: 1, scan, shipped: ship.length, lemmas: byL.size, per, byClass }, null, 1))
  // report
  const L: string[] = ['# Історичні форми стандартних лем за групами говорів (SPEC 63 DV-7)', '',
    'Для кожної леми — написання зі свідчень, які після скидання чистої орфографії (ѣ, ъ, ь, ы, ѧ, ѹ, ї=і; орфографічні правила Желехівки, апостроф, ться) відрізняються від сучасної форми. Клас різниці названо, правило — з джерелом, де воно є. Регіон — це місце написання чи друку пам’ятки, а **не** діалект слова; діалектом слово називається лише за словником.', '',
    `Пороги: перекіс стверджується, якщо регіон має ≥ ${HF.tokens} уживань у ≥ ${HF.witnesses} пам’ятках, ≥ ${Math.round(HF.share * 100)} % уживань варіанта і частка в ${HF.ratio} разів більша за частку регіону в усьому надійному корпусі. Ступінь «словник» — діалектний словник містить це написання з цією лемою; «розподіл у корпусі» — перекіс за порогами; «гіпотеза» — засвідчено в регіоні ≥ 2 надійними пам’ятками, без перекосу.`,
    'Не враховано: словники як корпус, OCR без вичитки (OQ), пам’ятки з непевною датою, російськомовні, місця друку за межами України, форми, які знає VESUM. Класи з шумом російського правопису чи OCR не поставляються: ' + ['other', 'cluster', 'apostrophe', 'vowel-other'].map(c => CLASS_UK[c as FormClass]).join('; ') + '.', '',
    `Усього форм: ${ship.length} у ${byL.size} лемах (не більше 6 на лему).`, '',
    '| група | форм | словник | розподіл у корпусі | гіпотеза | вжив. | похибка (вибірка) |', '|---|---|---|---|---|---|---|']
  for (const g of GROUPS) { const p = per[g]!, s = spot[g]; L.push(`| ${GROUP_NAME[g]} | ${p.forms} | ${p.dict} | ${p.corpus} | ${p.hyp} | ${p.tokens} | ${s ? `${s.wrong} з ${s.checked} (${Math.round(100 * s.wrong / s.checked)} %)` : 'не перевірено'} |`) }
  L.push('', 'Класи (кількість форм): ' + Object.entries(byClass).map(([c, n]) => `${CLASS_UK[c as FormClass]} ${n}`).join('; ') + '.', '')
  const thin = GROUPS.filter(g => per[g]!.forms < 20)
  L.push('## Групи, де джерел замало', '', thin.length ? thin.map(g => `- ${GROUP_NAME[g]}: ${per[g]!.forms} форм` + (g === 'BOY' || g === 'HUT' || g === 'LEM' || g === 'WPL' ? ' — у корпусі немає пам’яток із регіоном цієї групи (жодного надійного свідка), тому історичних форм немає взагалі; потрібні книжки, видані чи записані в цьому краї' : '')).join('\n') : '—', '')
  for (const g of GROUPS) {
    const rs = ship.filter(r => r.areas.some(a => a.g === g)).sort((a, b) => b.areas.find(x => x.g === g)!.tokens! - a.areas.find(x => x.g === g)!.tokens! || 0).slice(0, 50)
    L.push(`## ${GROUP_NAME[g]}`, '', `Форм: ${per[g]!.forms} (словник ${per[g]!.dict}, розподіл ${per[g]!.corpus}, гіпотеза ${per[g]!.hyp}).${spot[g]?.note ? ' ' + spot[g]!.note : ''}`, '')
    if (!rs.length) { L.push('Немає даних.', ''); continue }
    L.push('| варіант | → форма (лема) | клас | правило | ступінь | вжив. / пам’яток | перша фіксація |', '|---|---|---|---|---|---|---|')
    for (const r of rs) {
      const a = r.areas.find(x => x.g === g)!, rule = r.r.map(x => RULE_UK[x] ?? x).join('; ')
      const ev = a.dict ? `${a.dict[1]}, ${a.dict[2]}: «${a.dict[3]}»` : ''
      L.push(`| ${r.v}${confirmed.has(ownerPairKey(r.v, r.l)) ? ' ✓' : ''} | ${r.t} (${r.l}) | ${CLASS_UK[r.c]} | ${rule || '—'} | ${{ dict: 'словник', corpus: `розподіл ${Math.round((a.share ?? 0) * 100)} %`, hyp: 'гіпотеза' }[a.grade]} | ${a.tokens ?? '—'} / ${a.witnesses ?? '—'} | ${a.y ? `${a.y}, ${nameOf(a.region!)}, ${a.w}` : '—'}${ev ? '; ' + ev : ''} |`)
    }
    L.push('')
  }
  L.push('## Для підтвердження', '', 'Підтверджені рядки копіюйте у `data/owner/variants-confirmed.tsv` (форма, лема, говір), відхилені — у `data/owner/variants-rejected.tsv`: вони зникають звідси і з даних.', '')
  writeJsonAtomic(resolve(ROOT, 'analysis/dialect-historical-forms.md'), L.join('\n'))
  console.log(`hist: ${ship.length} forms, ${byL.size} lemmas; per group ${JSON.stringify(Object.fromEntries(GROUPS.map(g => [g, per[g]!.forms])))}`)
}
if (process.argv[1]?.endsWith('build-dv7.ts')) main()
