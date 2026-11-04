/**
 * SPEC 63 DV-1 — bulk search for dialect / variant forms of standard words in OUR data. Resumable (each stage writes its output atomically and is skipped when the output exists; DV_FORCE=1 redoes),
 * read-only on the inputs, safe to run beside a build (run it `nice -n 19`).
 *   node --experimental-strip-types pipelines/dv1-scan.ts          env DV_ROOT (a BULP root with data/raw, data/work, public/data), DV_OUT (default <root>/../dv1-out)
 * Stages: vesum (forms with analyses) → leaves (the unlinked index: totals by class, method 1 dictionary, method 2 cited folds, candidates) → m3 (correspondences, edit census) → skew (regions of the witnesses).
 * Outputs (DV_OUT): dv1-stats.json, dv1-links.json (methods 1+2), dv1-hyp.json (method 3, every rule, with regions), dv1-census.json.
 */
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { key } from '../core/text.ts'
import { vesumClass } from '../core/pos-gate.ts'
import { garbageReason } from '../core/uv-promote.ts'
import { DIALECT_LEX } from '../core/dialect-lex.ts'
import { DIALECTS } from '../core/rules.ts'
import { GAL_FOLDS } from '../core/gal-folds.ts'
import { ZHEL_FOLDS } from '../core/zhel-folds.ts'
import { ORTH1928_FOLDS } from '../core/orth1928.ts'
import { MM52_EXPECT } from '../core/gal-mm52.ts'
import { galSoftGate } from '../core/gal-soft.ts'
import { DV_RULES, DV_EXPLORED, singleGloss, isSwapPair, type DvLink } from '../core/dialect-variants.ts'
import { CARD_LEMMAS, ORD_LEMMAS } from '../core/numeral-lists.ts'
import { fileLines, scanVesum } from './vesum.ts'
import { readJson, writeJsonAtomic } from './robust.ts'
import { regionOf, REGIONS } from './regions.ts'

const ROOT = resolve(process.env.DV_ROOT ?? '.'), OUT = resolve(process.env.DV_OUT ?? resolve(ROOT, '../dv1-out'))
mkdirSync(OUT, { recursive: true })
const out = (n: string) => resolve(OUT, n), force = !!process.env.DV_FORCE
const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`)
const NONNORM = new Set(['arch', 'bad', 'subst', 'slang', 'vulg', 'obsc', 'alt', 'rare', 'dial', 'abbr'])
const WORDRE = /^[а-яіїєґ]+(?:['-][а-яіїєґ]+)*$/u

// ── vesum: key(form) → analyses ──────────────────────────────────────────────────────────────────────────────────
interface An { lemma: string; tags: string; cls: string; norm: boolean }
const forms = new Map<string, An[]>()
async function loadVesum() {
  if (forms.size) return
  const f = resolve(ROOT, 'data/raw/vesum/dict_corp_vis.txt')
  const intern = new Map<string, string>(); const I = (s: string) => intern.get(s) ?? (intern.set(s, s), s)
  let n = 0
  await scanVesum(fileLines(f), e => {
    if (!e.form) return
    const k = key(e.form); if (!k) return
    const cls = vesumClass(e.tags || e.lemmaTags), all = (e.tags + ':' + e.lemmaTags).split(':')
    const an: An = { lemma: I(e.lemma), tags: I(e.tags || e.lemmaTags), cls, norm: !all.some(t => NONNORM.has(t)) }
    const a = forms.get(k); if (!a) forms.set(k, [an]); else if (a.length < 6) a.push(an)
    if (NUMLEMMAS.has(e.lemma) && an.cls !== 'other') { const x = NF.get(k); if (!x) NF.set(k, [{ lemma: e.lemma, tags: e.tags || e.lemmaTags }]); else if (x.length < 8) x.push({ lemma: e.lemma, tags: e.tags || e.lemmaTags }) }
    n++
  })
  log(`vesum: ${n} lines, ${forms.size} keys`)
}
// ── numerals (DV-1b) ──────────────────────────────────────────────────────────────────────────────────────────────
const NUMLEMMAS = new Set([...CARD_LEMMAS, ...ORD_LEMMAS])
const NF = new Map<string, { lemma: string; tags: string }[]>()
const known = (k: string) => forms.has(k)
const normAn = (k: string): An[] => (forms.get(k) ?? []).filter(a => a.norm && !/(^|:)prop(:|$)/.test(a.tags) && a.cls !== 'other')

// ── witnesses: region, kind ─────────────────────────────────────────────────────────────────────────────────────
interface Wit { id: string; witnessType: string; region?: string; oq?: unknown; date: [number, number] }
const wit = new Map<string, Wit>()
const regionName = new Map(REGIONS.map(r => [r.code, r.name] as const))
const regionCache = new Map<string, string>()
const regionOfW = (id: string): string => {
  let r = regionCache.get(id); if (r !== undefined) return r
  const w = wit.get(id), c = w ? regionOf(w.region) : undefined
  r = c ? (regionName.get(c) ?? w?.region ?? '') : ''; regionCache.set(id, r); return r
}
const isOcr = (id: string): boolean => { const w = wit.get(id); return !!w && w.witnessType === 'ocr' && !!w.oq }

// ── dictionaries (method 1) ─────────────────────────────────────────────────────────────────────────────────────────
interface DRow { head: string; gloss: string; area: string; src: string; loc: string; q: string }
const dict = new Map<string, DRow[]>()
const addDict = (r: DRow) => { const k = key(r.head); if (!WORDRE.test(k)) return; (dict.get(k) ?? dict.set(k, []).get(k)!).push(r) }
function loadDicts() {
  const ed = resolve(ROOT, 'data/work/corr-extra')
  let n = 0
  if (existsSync(ed)) for (const f of readdirSync(ed).filter(x => x.endsWith('.json')).sort()) {
    for (const r of readJson<{ rows: { w: string[]; gloss: string; codes: string[]; src: string; loc: string; q: string; village?: string }[] }>(resolve(ed, f)).rows) {
      const g = singleGloss(r.gloss); if (!g) continue
      const area = r.codes.length ? r.codes.map(c => DIALECTS[c] ?? c).join(' + ') : (r.village ?? '')
      for (const w of r.w) { addDict({ head: w, gloss: g, area, src: r.src, loc: r.loc, q: r.q }); n++ }
    }
  }
  for (const r of DIALECT_LEX) {
    const g = singleGloss(r.gloss); if (!g) continue
    for (const w of r.w) { addDict({ head: w, gloss: g, area: r.codes.map(c => DIALECTS[c] ?? c).join(' + '), src: r.src === 'ENC' ? 'ЕУМ (litopys.org.ua)' : r.src, loc: r.loc, q: r.q }); n++ }
  }
  // fuller dialect dictionaries (all word-level rows with a one-word gloss or «те саме, що X», not only the labelled head): se-parsed
  const sp = resolve(ROOT, 'data/work/se-parsed')
  const AREA: Record<string, [string, string]> = { onyshkevych: ['Бойківщина', 'Онишкевич, Словник бойківських говірок (1984)'], sabadosh: ['Закарпаття (Сокирниця)', 'Сабадош, Словник закарпатської говірки (Сокирниця)'], bukovyna: ['Буковина', 'Словник буковинських говірок (2005)'], hutsul: ['Гуцульщина', 'Гуцульські говірки. Короткий словник (1997)'], lysenko: ['Полісся', 'Лисенко, Словник поліських говорів (1974)'], chabanenko: ['Нижня Наддніпрянщина', 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)'] }
  for (const [d, [area, src]] of Object.entries(AREA)) {
    const f = resolve(sp, d + '.json'); if (!existsSync(f)) continue
    for (const [h, r] of readJson<{ rows: [string, { g?: string; l?: string; oq?: number; unv?: number; lb?: string[]; v?: string[] }][] }>(f).rows) {
      if (r.oq || r.unv || !r.g) continue
      const g = singleGloss(r.g); if (!g || g === key(h)) continue
      addDict({ head: h, gloss: g, area: r.lb?.length ? `${area} (${r.lb[0]})` : area, src, loc: r.l ?? '', q: `${h} — ${r.g}`.slice(0, 200) }); n++
    }
  }
  // en.wiktionary through kaikki: alt_of senses (tag dialectal) and alternative forms
  const kk = resolve(ROOT, 'data/work/corr-stage-kaikki.json')
  if (existsSync(kk)) {
    for (const e of readJson<{ entries: { word: string; pos: string; forms?: { form: string }[]; senses?: { tags?: string[]; glosses?: string[]; alt_of?: { word: string }[] }[] }[] }>(kk).entries) {
      for (const s of e.senses ?? []) for (const a of s.alt_of ?? []) {
        if (!s.tags?.includes('alternative') || s.tags.some(t => ['abbreviation', 'initialism', 'ellipsis'].includes(t))) continue
        const t = singleGloss(a.word.replace(/\s+(pf|impf|m|f|n)$/, '')); if (!t) continue
        addDict({ head: e.word, gloss: t, area: s.tags.includes('dialectal') ? 'діалектне (групу не названо)' : '', src: 'Вікісловник (en)', loc: `https://en.wiktionary.org/wiki/${encodeURIComponent(e.word)}#Ukrainian`, q: `${e.word}: ${(s.glosses ?? []).join('; ')}` }); n++
      }
    }
  }
  log(`dictionary rows: ${n}, headwords ${dict.size}`)
}
/** POS of a dictionary pair: the gloss (a VESUM word) decides; a verb-shaped head needs a verb gloss, no other head is a verb */
function dictPos(head: string, gloss: string): string | undefined {
  if (/^(див|дивись|дивіться)$/.test(gloss)) return undefined   // «див.» is a see-reference, not a gloss
  const g = normAn(key(gloss)).filter(a => a.lemma === key(gloss)); if (!g.length) return undefined
  const cl = [...new Set(g.map(a => a.cls))]
  const hv = known(head) ? [...new Set((forms.get(head) ?? []).map(a => a.cls))] : []
  const verbShape = /(ти|тись|тися|ть|ться)$/.test(head)
  const pick = cl.filter(c => (hv.length ? hv.includes(c) : true) && (verbShape ? c === "verb" : c !== "verb"))
  if (pick.length <= 1) return pick[0]
  for (const c of ["noun", "adj", "adv", "numr", "prep", "conj", "part", "intj", "pron"]) if (pick.includes(c)) return c
  return pick[0]
}

// ── method 2 folds ─────────────────────────────────────────────────────────────────────────────────────────────────
const SKIP_FOLD = new Set(['ORTH-GAL-PART-HYPH', 'ORTH-GAL-FUSED', 'ORTH-GAL-PCL', 'ORTH-GAL-SYA-SEP', 'ORTH-GAL-SE'])
// only the folds the build applies to a token of ANY orthography (core/gal-folds.ts EXTRA); era-bound ones (ORTH-1928-*, 9 % of an unrestricted run were wrong) and ORTH-DAT-OVI (-ові is also a plural adjective: вамові > вам) are NOT counted
const NOT_ANY = new Set(["ORTH-DAT-OVI", ...ORTH1928_FOLDS.map(f => f.id), "ORTH-PART-HYPH", "ORTH-GAL-GEN-I"])
const FOLDS = [...ZHEL_FOLDS.filter(f => ["ORTH-ZHEL-SOFT", "ORTH-ZHEL-SKY", "ORTH-ZHEL-JE", "ORTH-ZHEL-JE-OBL"].includes(f.id)), ...GAL_FOLDS].filter((f, i, a) => !SKIP_FOLD.has(f.id) && !NOT_ANY.has(f.id) && a.findIndex(x => x.id === f.id) === i)
function foldLinks(k: string): { target: string; lemma: string; pos: string; id: string; quote: string }[] {
  const res: { target: string; lemma: string; pos: string; id: string; quote: string }[] = []
  for (const f of FOLDS) {
    let c: string; try { c = f.apply(k) } catch { continue }
    if (!c || c === k || !WORDRE.test(c) || isSwapPair(c, k)) continue
    const an = normAn(c).filter(a => {
      if (MM52_EXPECT[f.id] && !MM52_EXPECT[f.id]!(a.tags)) return false
      if (f.id === 'ORTH-ADJ-IISH' && !/^(adj|adv)/.test(a.tags)) return false
      if ((f.id === 'ORTH-VERB-OVATI' || f.id === 'ORTH-TSYA-PHON') && !/^(verb|advp)/.test(a.tags)) return false
      if (f.id.startsWith('ORTH-GAL')) { try { if (!galSoftGate(f.id, k, a.tags, x => known(x), a.lemma)) return false } catch { return false } }
      return true
    })
    if (!an.length) continue
    const a = an[0]!
    res.push({ target: c, lemma: a.lemma, pos: a.cls, id: f.id, quote: (f.cite.quote ?? '').slice(0, 160) })
  }
  return res
}

// ── leaves ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
type Entry = [string, number, number, ...(string | number)[]]
interface Stats { tokens: number; types: number; byClass: Record<string, { tokens: number; types: number }>; m1: Record<string, { tokens: number; types: number }>; m2: Record<string, { tokens: number; types: number }>; cands: number; candTokens: number }
const bump = (o: Record<string, { tokens: number; types: number }>, k: string, f: number) => { const x = (o[k] ??= { tokens: 0, types: 0 }); x.tokens += f; x.types++ }

function leaves() {
  const dir = resolve(ROOT, 'public/data/unlinked')
  const files = readdirSync(dir).filter(f => /^[0-9a-f]+\.json$/.test(f)).sort()
  const st: Stats = { tokens: 0, types: 0, byClass: {}, m1: {}, m2: {}, cands: 0, candTokens: 0 }
  const links: (DvLink & { raw: string; wits: string[]; lemma?: string; quote?: string; q2?: string })[] = []
  const cands: [string, number, number, string[], string][] = []   // key, f, nW, witnesses, raw
  let i = 0
  for (const fn of files) {
    if (++i % 5000 === 0) log(`leaves ${i}/${files.length}`)
    let d: Record<string, Entry>; try { d = JSON.parse(readFileSync(resolve(dir, fn), 'utf8')) } catch { continue }
    for (const [k, e] of Object.entries(d)) {
      const raw = e[0], f = e[1], nW = e[2], wits: string[] = []
      for (let j = 3; j + 1 < e.length; j += 2) wits.push(String(e[j]))
      st.tokens += f; st.types++
      const lower = raw.toLowerCase(), g = garbageReason(raw)
      const cls = g ? `garbage:${g}` : /[A-Za-z]/.test(raw) ? 'latin' : !WORDRE.test(k) ? 'non-word-shape' : wits.length && wits.every(isOcr) && nW <= wits.length ? 'ocr-only' : 'clean'
      bump(st.byClass, cls.startsWith('garbage') ? 'garbage' : cls, f)
      if (cls !== 'clean' && cls !== 'ocr-only') continue
      if (known(k)) { bump(st.byClass, 'vesum-known', f); continue }
      // method 1: a dictionary headword
      const dr = dict.get(k)
      if (dr) {
        let hit = false
        for (const r of dr) {
          const pos = dictPos(k, r.gloss); if (!pos || isSwapPair(r.gloss, k)) continue
          const tg = normAn(key(r.gloss)).find(a => a.cls === pos && a.lemma === key(r.gloss))!
          links.push({ form: k, raw, target: tg.lemma, lemma: tg.lemma, method: 'dict', grade: 'dict', via: r.src, pos, f, nW, area: r.area, loc: r.loc, q: r.q, wits }); hit = true
        }
        if (hit) { bump(st.m1, 'all', f); const s = dr[0]!.src; bump(st.m1, s, f); continue }
      }
      // method 2: cited folds
      if ([...k].length >= 3) {
        const fl = foldLinks(k)
        if (fl.length) { for (const x of fl) links.push({ form: k, raw, target: x.target, lemma: x.lemma, method: 'rule', grade: 'rule', via: x.id, pos: x.pos, f, nW, q: x.quote, wits }); bump(st.m2, 'all', f); bump(st.m2, fl[0]!.id, f); continue }
      }
      if (cls === 'clean' && f >= 5 && nW >= 2 && [...k].length >= 3) { cands.push([k, f, nW, wits, raw]); st.cands++; st.candTokens += f }
    }
  }
  writeJsonAtomic(out('dv1-stats.json'), JSON.stringify(st, null, 1))
  writeJsonAtomic(out('dv1-links.json'), JSON.stringify(links))
  writeJsonAtomic(out('dv1-cands.json'), JSON.stringify(cands))
  log(`leaves done: ${st.tokens} tokens, ${st.types} types, ${links.length} links (m1 ${st.m1['all']?.types ?? 0} types, m2 ${st.m2['all']?.types ?? 0} types), ${cands.length} candidates`)
}

// ── method 3: correspondences + edit census ──────────────────────────────────────────────────────────────────────────
const ALPHA = [...'абвгґдеєжзиіїйклмнопрстуфхцчшщьюяыў\'']
function m3() {
  const cands = readJson<[string, number, number, string[], string][]>(out('dv1-cands.json'))
  const hyp: { form: string; raw: string; f: number; nW: number; wits: string[]; hits: { rule: string; target: string; lemma: string; pos: string; tags: string }[] }[] = []
  const census: Record<string, { n: number; f: number; ex: [string, string, number][] }> = {}
  const ctx = (w: string, i: number) => (i === 0 ? '^' : '') + (i === w.length - 1 ? '$' : '')
  for (const [k, f, nW, wits, raw] of cands) {
    const hits: { rule: string; target: string; lemma: string; pos: string; tags: string }[] = []
    const seen = new Set<string>()
    const tryT = (c: string, rule: string) => {
      if (c === k || seen.has(c + rule) || !WORDRE.test(c) || isSwapPair(c, k)) return
      const an = normAn(c); if (!an.length) return
      seen.add(c + rule)
      const a = an.sort((x, y) => (x.lemma === c ? -1 : 0) - (y.lemma === c ? -1 : 0))[0]!
      hits.push({ rule, target: c, lemma: a.lemma, pos: a.cls, tags: a.tags })
    }
    for (const r of [...DV_RULES, ...DV_EXPLORED]) {
      const g1 = r.gen(k)
      for (const c of g1) tryT(c, r.id)
      if (DV_RULES.includes(r)) for (const c of g1) for (const r2 of DV_RULES) if (r2.id !== r.id) for (const c2 of r2.gen(c)) tryT(c2, r.id + '+' + r2.id)
    }
    if (hits.length) hyp.push({ form: k, raw, f, nW, wits, hits })
    // census: every single-letter substitution / deletion / insertion whose result is a normative VESUM form
    const L = [...k]
    const rec = (typ: string, from: string, to: string, i: number, c: string) => {
      if (!WORDRE.test(c) || isSwapPair(c, k) || !normAn(c).length) return
      const kk = `${from}>${to}${ctx(k, i)}`.replace(/^>/, '∅>')
      const x = (census[kk] ??= { n: 0, f: 0, ex: [] }); x.n++; x.f += f; if (x.ex.length < 6) x.ex.push([k, c, f]); void typ
    }
    for (let i = 0; i < L.length; i++) {
      for (const a of ALPHA) if (a !== L[i]) rec('s', L[i]!, a, i, L.slice(0, i).join('') + a + L.slice(i + 1).join(''))
      rec('d', L[i]!, '∅', i, L.slice(0, i).join('') + L.slice(i + 1).join(''))
    }
    for (let i = 0; i <= L.length; i++) for (const a of ALPHA) rec('i', '∅', a, i, L.slice(0, i).join('') + a + L.slice(i).join(''))
  }
  writeJsonAtomic(out('dv1-hyp.json'), JSON.stringify(hyp))
  const top = Object.entries(census).sort((a, b) => b[1].f - a[1].f).slice(0, 400)
  writeJsonAtomic(out('dv1-census.json'), JSON.stringify(Object.fromEntries(top)))
  log(`m3: ${hyp.length} candidates with a hit; census ${Object.keys(census).length} edit types`)
}

// ── skew: per-witness counts from the unlinked cache for the keys we show ────────────────────────────────────────────
function skew() {
  const keys = new Set<string>()
  for (const h of readJson<{ form: string }[]>(out('dv1-hyp.json'))) keys.add(h.form)
  if (existsSync(out('dv1-num.json'))) for (const h of readJson<{ hits: { form: string }[] }>(out('dv1-num.json')).hits) keys.add(h.form)
  for (const l of readJson<{ form: string; f: number; method: string }[]>(out('dv1-links.json'))) if (l.f >= 3 || l.method === 'dict') keys.add(l.form)
  const cacheDir = resolve(ROOT, 'data/work/unlinked-cache')
  const by = new Map<string, Map<string, number>>()
  let n = 0
  for (const fn of readdirSync(cacheDir)) {
    if (++n % 1000 === 0) log(`skew ${n}`)
    let d: { id: string; calls: [string, ...unknown[]][] }; try { d = JSON.parse(readFileSync(resolve(cacheDir, fn), 'utf8')) } catch { continue }
    for (const c of d.calls) { const k = key(c[0]); if (!keys.has(k)) continue; const m = by.get(k) ?? by.set(k, new Map()).get(k)!; m.set(d.id, (m.get(d.id) ?? 0) + 1) }
  }
  const res: Record<string, [string, number][]> = {}
  for (const [k, m] of by) {
    const reg = new Map<string, number>()
    for (const [w, c] of m) { const r = regionOfW(w) || '(регіон невідомий)'; reg.set(r, (reg.get(r) ?? 0) + c) }
    res[k] = [...reg].sort((a, b) => b[1] - a[1]).slice(0, 6)
    res[k + '\u0001w'] = [[String(m.size), 0]]
  }
  writeJsonAtomic(out('dv1-skew.json'), JSON.stringify(res))
  log(`skew: ${by.size} keys`)
}

/** DV-1b: dialect forms of the numerals. Reverse search: every unlinked / VESUM-non-normative spelling is reduced by single confusions (vowel swaps, ч~ш, ь, apostrophe, prothesis, the shipped and measured DV rules) and looked up among the case forms of the numerals */
const VOW = [...'оеиіуыєяаю']
function numGen(w: string): { c: string; rule: string }[] {
  const out: { c: string; rule: string }[] = [], L = [...w]
  const add = (c: string, rule: string) => { if (c !== w) out.push({ c, rule }) }
  for (let i = 0; i < L.length; i++) {
    if (VOW.includes(L[i]!)) for (const v of VOW) if (v !== L[i]) add(L.slice(0, i).join('') + v + L.slice(i + 1).join(''), `vowel ${L[i]}>${v}`)
  }
  add(w.replace(/^шт/, 'чот'), 'шт>чот'); add(w.replace(/^чт/, 'чот'), 'чт>чот'); add(w.replace(/^чьо/, 'чо'), 'ь')
  add(w.replace(/ш/, 'ч'), 'ш>ч'); add(w.replace(/ч/, 'ш'), 'ч>ш'); add(w.replace(/ц/, 'т'), 'ц>т')
  add(w.replace(/т$/, 'ть'), 'т>ть'); add(w.replace(/ь/g, ''), '-ь'); add(w.replace(/([бпвмфр])([яюєї])/, "$1'$2"), "+'"); add(w.replace(/'/g, ''), "-'")
  add(w.replace(/^[ву](?=[аеиіоуєяю])/, ''), '-в/у-'); add(w.replace(/^[ву]/, ''), '-в/у-')
  for (const r of [...DV_RULES, ...DV_EXPLORED]) for (const c of r.gen(w)) add(c, r.id)
  return out
}
function numerals() {
  const dir = resolve(ROOT, 'public/data/unlinked')
  const hits: { form: string; raw: string; f: number; nW: number; wits: string[]; tgt: string; lemma: string; tags: string; rule: string; vk: boolean }[] = []
  const files = readdirSync(dir).filter(f => /^[0-9a-f]+.json$/.test(f))
  for (const fn of files) {
    let d: Record<string, Entry>; try { d = JSON.parse(readFileSync(resolve(dir, fn), 'utf8')) } catch { continue }
    for (const [k, e] of Object.entries(d)) {
      const raw = e[0], f = e[1]; if (f < 2 || garbageReason(raw) || !WORDRE.test(k) || [...k].length < 4 || known(k)) continue
      const wits: string[] = []; for (let j = 3; j + 1 < e.length; j += 2) wits.push(String(e[j]))
      for (const g of numGen(k)) {
        if ([...g.c].length < 4) continue
        const t = NF.get(g.c); if (!t || isSwapPair(g.c, k)) continue
        hits.push({ form: k, raw, f, nW: e[2], wits, tgt: g.c, lemma: t[0]!.lemma, tags: t[0]!.tags, rule: g.rule, vk: false }); break
      }
    }
  }
  // VESUM numerals / ordinals that are not normative (штири arch …): the dialect-like forms VESUM itself lists
  const vesumNon: { form: string; lemma: string; tags: string }[] = []
  for (const [k, ans] of forms) for (const a of ans) if (!a.norm && (a.cls === 'numr' || /^(numr|adj)/.test(a.tags)) && /^(ш|че|чи|ед|єд|ід|осім|осьм|двіст|трист|п.ят|шіст|сім|дес|сор|сто|тис)/.test(k) && (NUMLEMMAS.has(a.lemma) || /(?:^|:)numr/.test(a.tags))) vesumNon.push({ form: k, lemma: a.lemma, tags: a.tags })
  writeJsonAtomic(out('dv1-num.json'), JSON.stringify({ hits, vesumNon, std: Object.fromEntries([...NF].map(([k, v]) => [k, v[0]!.lemma + '|' + v[0]!.tags])) }))
  log(`numerals: ${hits.length} corpus hits, ${vesumNon.length} VESUM non-normative, ${NF.size} standard forms`)
}

/** DV-1: rows of the dialect dictionaries labelled only «(місце запису)» whose headword VESUM lists ONLY with non-normative flags (штири arch, єден arch, тєжко slang): the SE-15 hook (pipelines/se15-scan.ts corrRowsOf) drops every place-only row because a VESUM headword looks like a standard word, which loses exactly the dialect forms VESUM happens to know */
function placeOnly() {
  const sp = resolve(ROOT, 'data/work/se-parsed'), res: { form: string; gloss: string; lemma: string; pos: string; area: string; src: string; loc: string; q: string; flags: string }[] = []
  const AREA: Record<string, [string, string, string]> = { onyshkevych: ['BOY', 'Бойківщина', 'Онишкевич, Словник бойківських говірок (1984)'], sabadosh: ['ZAK', 'Закарпаття (Сокирниця)', 'Сабадош, Словник закарпатської говірки (Сокирниця)'], bukovyna: ['', 'Буковина', 'Словник буковинських говірок (2005)'], hutsul: ['HUT', 'Гуцульщина', 'Гуцульські говірки. Короткий словник (1997)'], lysenko: ['MPL', 'Полісся', 'Лисенко, Словник поліських говорів (1974)'], chabanenko: ['STP', 'Нижня Наддніпрянщина', 'Чабаненко, Словник говірок Нижньої Наддніпрянщини (1992)'] }
  for (const [d, [, area, src]] of Object.entries(AREA)) {
    const f = resolve(sp, d + '.json'); if (!existsSync(f)) continue
    for (const [h, r] of readJson<{ rows: [string, { g?: string; l?: string; oq?: number; unv?: number; lb?: string[] }][] }>(f).rows) {
      if (r.oq || r.unv || !r.g || !/місце запису/.test(r.lb?.[0] ?? '')) continue
      const k = key(h), g = singleGloss(r.g); if (!g || g === k || !WORDRE.test(k)) continue
      const an = forms.get(k); if (!an || an.some(a => a.norm)) continue   // VESUM knows it, and only as arch / slang / …
      const pos = dictPos(k, g); if (!pos || !an.some(a => a.cls === pos) || isSwapPair(g, k)) continue
      res.push({ form: k, gloss: g, lemma: g, pos, area, src, loc: r.l ?? '', q: `${h} — ${r.g}`.slice(0, 200), flags: [...new Set(an.flatMap(a => a.tags.split(':').filter(t => NONNORM.has(t))))].join(',') })
    }
  }
  writeJsonAtomic(out('dv1-placeonly.json'), JSON.stringify(res))
  log(`place-only rows with a VESUM non-normative headword: ${res.length}`)
}

async function main() {
  const stage = (n: string) => force || !existsSync(out(n))
  const corp = readJson<{ witnesses: Wit[] }>(resolve(ROOT, 'public/data/corpus.json'))
  for (const w of corp.witnesses) wit.set(w.id, w)
  log(`witnesses ${wit.size}`)
  if (stage('dv1-cands.json') || stage('dv1-links.json')) { await loadVesum(); loadDicts(); leaves() } else log('leaves: cached')
  if (stage('dv1-hyp.json')) { await loadVesum(); m3() } else log('m3: cached')
  if (stage('dv1-num.json')) { await loadVesum(); numerals() } else log('numerals: cached')
  if (stage('dv1-placeonly.json')) { await loadVesum(); loadDicts(); placeOnly() }
  if (stage('dv1-skew.json')) skew()
  log('done')
}
main().catch(e => { console.error(e); process.exit(1) })
