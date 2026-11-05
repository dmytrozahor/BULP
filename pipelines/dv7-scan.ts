/**
 * SPEC 63 DV-7 — historical variant forms of standard lemmas per region of the witnesses (core/dialect-hist.ts). READ-ONLY on the build output; run on the worker as `nice -n 19` from a separate directory:
 *   DV_ROOT=~/BULP DV_OUT=~/dv7-out node --experimental-transform-types pipelines/dv7-scan.ts
 * Reads public/data/lex/*.json (forms[].byW, derivation, link) and corpus.json; the dialect dictionaries (data/work/se-parsed, corr-extra) only to attach `dict` to a variant that a dictionary lists.
 * Output (DV_OUT): dv7-forms.json (HistForm[]), dv7-bg.json (reliable tokens per region), dv7-stats.json. Atomic, resumable per file.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { DIALECT_LEX } from '../core/dialect-lex.ts'
import { DIALECTS } from '../core/rules.ts'
import { classOf, foldBoth, HF_BAD_RULES, isPureOrth, HF_NOISE, HF_OFFER, lowerKey, type FormClass, type HistForm, type RegionStat } from '../core/dialect-hist.ts'
import { singleGloss } from '../core/dialect-variants.ts'
import { fileLines, scanVesum } from './vesum.ts'
import { key as textKey } from '../core/text.ts'
import { readJson, writeJsonAtomic } from './robust.ts'
import { REGIONS, regionOf } from './regions.ts'
import { isDialectRegion } from '../core/dialect-badge.ts'

const ROOT = resolve(process.env.DV_ROOT ?? '.'), OUT = resolve(process.env.DV_OUT ?? resolve(ROOT, '../dv7-out'))
mkdirSync(OUT, { recursive: true })
const PUB = resolve(ROOT, 'public/data')
const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`)
const WORDRE = /^[а-яіїєґ]+(?:['-][а-яіїєґ]+)*$/u
const regionName = new Map(REGIONS.map(r => [r.code, r.name] as const))

interface Wit { id: string; date: [number, number]; witnessType: string; region?: string; oq?: unknown; dateUncertain?: unknown; lang?: string; n?: number }
const wits = new Map(readJson<{ witnesses: Wit[] }>(resolve(PUB, 'corpus.json')).witnesses.map(w => [w.id, w] as const))
/** reliable witness → region code, or undefined with the reason counted */
const skip: Record<string, number> = { dictionary: 0, ocr: 0, dateUncertain: 0, noRegion: 0, abroad: 0, russian: 0 }
const regCache = new Map<string, string | null>()
function regionOfWit(id: string): string | null {
  const hit = regCache.get(id); if (hit !== undefined) return hit
  const w = wits.get(id); let r: string | null = null
  if (!w) r = null
  else if (w.witnessType === 'dictionary') r = null
  else if (w.oq) r = null
  else if (w.dateUncertain) r = null
  else if (/^(ru|rus)/.test(w.lang ?? '')) r = null
  else { const c = regionOf(w.region); r = c && isDialectRegion(c, regionName.get(c) ?? '') ? c : null }
  regCache.set(id, r); return r
}

// dictionaries: headword → rows
const dict = new Map<string, { gloss: string; area: string; src: string; loc: string; q: string }[]>()
function loadDicts() {
  const add = (h: string, g: string | undefined, area: string, src: string, loc: string, q: string) => { const k = lowerKey(h); if (!g || !WORDRE.test(k)) return; (dict.get(k) ?? dict.set(k, []).get(k)!).push({ gloss: g, area, src, loc, q }) }
  for (const r of DIALECT_LEX) for (const w of r.w) add(w, singleGloss(r.gloss), r.codes.map(c => DIALECTS[c] ?? c).join(' + '), r.src === 'ENC' ? 'ЕУМ (litopys.org.ua)' : r.src, r.loc, r.q)
  const sp = resolve(ROOT, 'data/work/se-parsed')
  const AREA: Record<string, [string, string]> = { onyshkevych: ['Бойківщина', 'Онишкевич, Словник бойківських говірок (1984)'], sabadosh: ['Закарпаття', 'Сабадош, Словник закарпатської говірки (Сокирниця)'], bukovyna: ['Буковина', 'Словник буковинських говірок (2005)'], hutsul: ['Гуцульщина', 'Гуцульські говірки. Короткий словник (1997)'], lysenko: ['Полісся', 'Лисенко, Словник поліських говорів (1974)'], chabanenko: ['Степ (Нижня Наддніпрянщина)', 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)'] }
  for (const [d, [area, src]] of Object.entries(AREA)) {
    const f = resolve(sp, d + '.json'); if (!existsSync(f)) continue
    for (const [h, r] of readJson<{ rows: [string, { g?: string; l?: string; oq?: number; unv?: number }][] }>(f).rows) { if (r.oq || r.unv || !r.g) continue; add(h, singleGloss(r.g), area, src, r.l ?? '', `${h} — ${r.g}`.slice(0, 200)) }
  }
  log(`dictionary headwords ${dict.size}`)
}

const vesum = new Set<string>()
async function main() {
  await scanVesum(fileLines(resolve(ROOT, 'data/raw/vesum/dict_corp_vis.txt')), e => { if (e.form) vesum.add(textKey(e.form)) })
  log(`vesum forms ${vesum.size}`)
  loadDicts()
  const forms = new Map<string, HistForm>(), bg: Record<string, number> = {}
  const cls: Record<string, number> = {}, st = { lemmas: 0, formsSeen: 0, withVariant: 0, badRule: 0, orthOnly: 0, noEdit: 0, vesumKnown: 0, pureOrth: 0 }
  for (const w of wits.values()) { const r = regionOfWit(w.id); if (r) bg[r] = (bg[r] ?? 0) + (w.n ?? 0) }
  const files = readdirSync(resolve(PUB, 'lex')).filter(f => f.endsWith('.json'))
  let i = 0
  for (const fn of files) {
    if (++i % 3000 === 0) log(`lex ${i}/${files.length}`)
    let sh: { lemmas: string[]; details: { forms?: { link?: { value?: { form?: string; route?: string } }; derivation?: { rule: string; from: string }[]; kwic?: { node?: string }[]; byW?: Record<string, number>; ocrOnly?: true }[] }[] }
    try { sh = JSON.parse(readFileSync(resolve(PUB, 'lex', fn), 'utf8')) } catch { continue }
    sh.lemmas.forEach((lemma, li) => {
      if (!lemma || lemma[0] !== lemma[0]!.toLowerCase() || !WORDRE.test(lemma)) return
      st.lemmas++
      for (const fm of sh.details[li]?.forms ?? []) {
        if (fm.ocrOnly) continue
        st.formsSeen++
        const t = lowerKey(fm.link?.value?.form ?? ''), v = lowerKey(fm.derivation?.[0]?.from ?? fm.kwic?.[0]?.node ?? '')
        if (!t || !v || v === t || !WORDRE.test(v) || !WORDRE.test(t)) continue
        if (vesum.has(textKey(v))) { st.vesumKnown++; continue }   // a form VESUM knows is never offered as a variant (кит / кіт)
        const rules = (fm.derivation ?? []).map(d => d.rule)
        if (rules.some(r => HF_BAD_RULES.test(r))) { st.badRule++; continue }
        if (isPureOrth(rules)) { st.pureOrth++; continue }
        const c = classOf(foldBoth(v), foldBoth(t))
        if (foldBoth(v) === foldBoth(t)) { st.orthOnly++; continue }
        if (!c) { st.noEdit++; continue }
        cls[c] = (cls[c] ?? 0) + 1
        if (HF_NOISE.has(c as FormClass)) continue
        // per region from the reliable witnesses
        const reg: Record<string, RegionStat> = {}; let n = 0; const wset = new Set<string>()
        for (const [id, k] of Object.entries(fm.byW ?? {})) {
          const r = regionOfWit(id); if (!r) continue
          const w = wits.get(id)!, e = reg[r] ?? (reg[r] = [0, 0, 99999, ''])
          e[0] += k; e[1]++; if (w.date[0] < e[2] || (w.date[0] === e[2] && id < e[3])) { e[2] = w.date[0]; e[3] = id }
          n += k; wset.add(id)
        }
        if (n < HF_OFFER.tokens || wset.size < HF_OFFER.witnesses) continue
        const key = `${lemma}|${v}|${t}`, o = forms.get(key)
        if (o) { o.n += n; o.nw += wset.size; for (const [r, e] of Object.entries(reg)) { const x = o.reg[r]; if (!x) o.reg[r] = e; else { x.splice(0, 2, x[0] + e[0], x[1] + e[1]); if (e[2] < x[2]) { x[2] = e[2]; x[3] = e[3] } } }; continue }
        st.withVariant++
        const d = (dict.get(v) ?? []).filter(x => x.gloss === lemma).map(x => [x.area, x.src, x.loc, x.q] as [string, string, string, string])
        forms.set(key, { l: lemma, v, t, c: c as FormClass, via: fm.link?.value?.route, r: [...new Set(rules)], n, nw: wset.size, reg, ...(d.length ? { dict: d.slice(0, 3) } : {}) })
      }
    })
  }
  const arr = [...forms.values()]
  writeJsonAtomic(resolve(OUT, 'dv7-forms.json'), JSON.stringify(arr))
  writeJsonAtomic(resolve(OUT, 'dv7-bg.json'), JSON.stringify(bg))
  writeJsonAtomic(resolve(OUT, 'dv7-stats.json'), JSON.stringify({ ...st, kept: arr.length, byClass: cls, skip }, null, 1))
  log(`done: ${arr.length} variant forms; ${JSON.stringify(st)}; classes ${JSON.stringify(cls)}`)
}
main().catch(e => { console.error(e); process.exit(1) })
