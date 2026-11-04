/**
 * SPEC 63 CR-1 — the SOURCES of correspondence pairs, as pure adapters (input rows → CorrPair[] + reject counts). Precision over recall: every pair passes core/corr.ts checkPair (single words, not an
 * и/і swap, the same POS) and carries evidence (core/evidence.ts). The pipeline (pipelines/build-corr.ts) feeds the adapters with the files it reads; tests feed them fixtures.
 *   1 family      core/variant-families.ts (MM-30..52): head ~ member, the cite of the member (or the owner's statement)
 *   2 wikt-alt    en.wiktionary through kaikki: forms tagged «alternative» and senses `alt_of` (tags dialectal / dated / colloquial)
 *   3 wikt-syn-*  synonyms of en.wiktionary (kaikki) and uk.wiktionary (the dump): a pair is attached to a sense only when it can be (mutual listing, or one sense on both sides), else «значення не уточнено»
 *   4 xr          dictionary cross-references «Те саме, що» (GG-18, lm/xr rows)
 *   5 dialect-lex dialect dictionaries / descriptions of the repo (core/dialect-lex.ts): a headword whose gloss is ONE standard word; the hook `extra` takes SE-14 (Чабаненко) rows in the same shape
 *   6 owner       pairs the owner named (щоб ~ щоби ~ коби ~ жеби ~ аби) that no dictionary of the repo states: grade `owner`, said so
 */
import { D, P, Q, type Evidence } from './evidence.ts'
import { VARIANT_FAMILIES, memberEvidence, type VFamily, type VMember, type VRole } from './variant-families.ts'
import { DIALECTS } from './rules.ts'
import { DIALECT_LEX } from './dialect-lex.ts'
import { checkPair, isSingleWord, plain, shapeRelation, swapKey, type CorrArea, type CorrPair, type Relation } from './corr.ts'
import type { Ptr } from './xref.ts'
import type { SynRow } from './synphr.ts'

export type PosOf = (w: string) => ReadonlySet<string> | undefined
/** how many meanings a word has in its POS (en.wiktionary through kaikki), undefined = unknown */
export type SenseN = (w: string, pos: string) => number | undefined
const senseOf = (n: SenseN | undefined, w: string, pos: string): 'one' | 'unspec' => { const k = n?.(w, pos); return k !== undefined && k > 1 ? 'unspec' : 'one' }
export interface Rejects { [why: string]: number }
const bump = (r: Rejects, why: string) => { r[why] = (r[why] ?? 0) + 1 }

// ── 1 families ──────────────────────────────────────────────────────────────────────────────────
const ROLE_REL: Record<VRole, Relation> = { alt: 'phonetic', euphonic: 'phonetic', expanded: 'phonetic', rare: 'phonetic', prothetic: 'phonetic', dialect: 'phonetic', arch: 'historical', sense: 'lexical', reduced: 'phonetic' }
/** the meaning label of a family whose POS name alone is too coarse */
export const FAMILY_MEANING: Record<string, string> = { 'VF-SHCHOB': 'сполучник мети', 'VF-ZHEBY': 'сполучник мети' }
/** the areas a family member's own cite states (nothing is inferred from the role «dialect» alone) */
const FAMILY_AREAS = (f: VFamily, m: VMember): CorrArea[] => {
  if (f.id === 'VF-ZHEBY' && m.form === 'жеби' && m.cite) return [{ dialect: 'надсянський говір', code: 'SYAN', grade: 'dict', ev: memberEvidence(f, m) }]
  if (f.id === 'VF-SHCHO' && m.form === 'шо' && m.cite) return [{ dialect: 'діалектне (групу не названо)', grade: 'dict', ev: memberEvidence(f, m) }]
  return []
}
export function familyPairs(families: readonly VFamily[] = VARIANT_FAMILIES): CorrPair[] {
  const out: CorrPair[] = []
  for (const f of families) {
    const pos = f.cls[0]!
    for (const m of f.members) {
      if (m.quiet || !isSingleWord(m.form) || !isSingleWord(f.head)) continue   // declension forms of весь are forms of a lemma, not lemmas
      out.push({ a: f.head, b: m.form, pos, rel: ROLE_REL[m.role], src: 'family', ev: memberEvidence(f, m), sense: m.role === 'sense' ? 'unspec' : 'one', areaB: FAMILY_AREAS(f, m), norm: 'a', meaning: FAMILY_MEANING[f.id] })
    }
  }
  return out
}

// ── 6 owner ─────────────────────────────────────────────────────────────────────────────────────
const OWNER_QUOTE = 'щоб ~ щоби ~ коби ~ жеби ~ аби'
const KOBY_CITE = D('Вікісловник (en), стаття «каб» (білоруська), етимологія', 'https://en.wiktionary.org/wiki/каб#Belarusian',
  'Cognate with Russian кабы (kaby), dialectal Ukrainian коби (koby) and коб (kob), Carpathian Rusyn кеби (keby).',
  'стаття називає коби «діалектним українським» спорідненим словом до каб (conj, «in order to»); групи говорів не названо; що коби = щоб, стаття не стверджує')
/** the owner-named set, as far as no dictionary of the repo states it (щоби, жеби, аби are stated by their own sources and come from the families / kaikki) */
export function ownerPairs(): CorrPair[] {
  const own = P('зауваження власника', 'SPEC 63 CR-1', OWNER_QUOTE, 'ступінь: за свідченням носія; словникового джерела для коби = щоб у репозиторії не знайдено (шукали: kaikki uk / be / orv, research/, ЕУМ, ДСУМ, Грінченко не завантажено); діалектність коби — за en.Вікісловником (стаття «каб»)')
  // ся ~ сє (owner 2026-11-04): no ЕУМ / dialect-dictionary statement found in the repo yet (MM-58 looks for it); upgrade the areas to `dict` when one lands
  const sieEv = P('зауваження власника', 'SPEC 63 CR-1', 'і сє до речі теж галицкий відповідник; і вроді тернопільський', 'ступінь: за свідченням носія; словникового джерела не знайдено')
  const sieGal: CorrArea = { dialect: 'Галичина', grade: 'owner', ev: P('зауваження власника', 'SPEC 63 CR-1', 'і сє до речі теж галицкий відповідник', 'за свідченням носія') }
  const sieTern: CorrArea = { dialect: 'Тернопільщина (невпевнено)', grade: 'owner', ev: P('зауваження власника', 'SPEC 63 CR-1', 'і вроді тернопільський', 'за свідченням носія, невпевнено: власник пише «вроді»') }
  const dial: CorrArea = { dialect: 'діалектне (групу не названо)', grade: 'dict', ev: KOBY_CITE }
  return [
    { a: 'ся', b: 'сє', pos: 'part', rel: 'phonetic', src: 'owner', ev: sieEv, sense: 'one', areaB: [sieGal, sieTern], norm: 'a', meaning: 'зворотна частка' },
    { a: 'щоб', b: 'коби', pos: 'conj', rel: 'lexical', src: 'owner', ev: own, sense: 'one', areaB: [dial], norm: 'a', meaning: 'сполучник мети' },
  ]
}
/** evidence of the second kind a member carries beside the owner's statement */
export const OWNER_EXTRA_EV: Record<string, Evidence[]> = { коби: [KOBY_CITE] }

// ── 2 + 3 en.wiktionary through kaikki ──────────────────────────────────────────────────────────
export const KK_POS: Record<string, string> = { conj: 'conj', noun: 'noun', adj: 'adj', verb: 'verb', adv: 'adv', prep: 'prep', particle: 'part', pron: 'pron', intj: 'intj', num: 'numr', det: 'pron' }
export interface KkSense { glosses?: string[]; tags?: string[]; alt_of?: { word: string; extra?: string }[]; form_of?: unknown[]; synonyms?: { word: string; extra?: string }[] }
export interface KkEntry { word: string; pos: string; forms?: { form: string; tags?: string[] }[]; senses?: KkSense[]; synonyms?: { word: string }[] }
const kkUrl = (w: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(plain(w))}#Ukrainian`
/** a sense that is a meaning of the word, not a pointer (form-of / alt-of) */
const isMeaning = (s: KkSense) => !s.form_of && !s.alt_of && !!s.glosses?.length
export interface KkIndex { senseCount: Map<string, number>; syn: Map<string, Set<string>> }
const kk = (w: string, pos: string) => `${plain(w)}|${pos}`
/** pass 1 over the dump: how many meanings each word has per POS, and who lists whom as a sense-level synonym */
export function kaikkiIndexAdd(ix: KkIndex, e: KkEntry): void {
  const pos = KK_POS[e.pos]; if (!pos) return
  ix.senseCount.set(kk(e.word, pos), (ix.senseCount.get(kk(e.word, pos)) ?? 0) + (e.senses ?? []).filter(isMeaning).length)
  const s = ix.syn.get(kk(e.word, pos)) ?? ix.syn.set(kk(e.word, pos), new Set()).get(kk(e.word, pos))!
  for (const se of e.senses ?? []) for (const y of se.synonyms ?? []) s.add(plain(y.word))
}
export function kaikkiPairs(e: KkEntry, ix: KkIndex, posOf: PosOf, rej: Rejects): CorrPair[] {
  const pos = KK_POS[e.pos]; if (!pos) return []
  const out: CorrPair[] = [], me = plain(e.word)
  const push = (p: CorrPair) => {
    const c = checkPair(p.a, p.b, posOf(p.a), posOf(p.b)); if (!c.ok) { bump(rej, `${p.src}: ${c.why}`); return }
    out.push(p)
  }
  // alternative forms listed on the page: «forms» tagged alternative
  for (const f of e.forms ?? []) {
    if (!f.tags?.includes('alternative')) continue
    const t = plain(f.form)
    push({ a: e.word, b: t, pos, rel: shapeRelation(e.word, t), src: 'wikt-alt', sense: 'one', norm: undefined,
      ev: D('Вікісловник (en)', kkUrl(e.word), `${e.word}: alternative form ${f.form}`, `en.wiktionary, стаття «${e.word}», поле forms (tags: alternative); вид і діалект стаття не уточнює`) })
  }
  for (const s of e.senses ?? []) {
    // alt_of: «alternative form of X» with its qualifier tags
    for (const a of s.alt_of ?? []) {
      if (!s.tags?.includes('alternative') || s.tags.includes('abbreviation') || s.tags.includes('initialism') || s.tags.includes('ellipsis')) { bump(rej, 'wikt-alt: not an alternative form'); continue }
      const t = plain(a.word.replace(/\s+(pf|impf|m|f|n)$/, ''))
      const rel: Relation = s.tags.some(x => x === 'dated' || x === 'obsolete' || x === 'archaic') ? 'historical' : shapeRelation(e.word, t)
      const areaA: CorrArea[] = s.tags.includes('dialectal') ? [{ dialect: 'діалектне (групу не названо)', grade: 'dict', ev: D('Вікісловник (en)', kkUrl(e.word), `${e.word}: ${(s.glosses ?? []).join('; ')} [dialectal]`, `en.wiktionary, стаття «${e.word}», помітка dialectal; групу говорів стаття не називає`) }] : []
      push({ a: t, b: e.word, pos, rel, src: 'wikt-alt', sense: 'one', areaB: areaA, norm: 'a',
        ev: D('Вікісловник (en)', kkUrl(e.word), `${e.word}: ${(s.glosses ?? []).join('; ')}`, `en.wiktionary, стаття «${e.word}» (alt_of ${t}; tags ${s.tags.join(', ')})`) })
    }
    // synonyms of a sense
    for (const y of s.synonyms ?? []) {
      const t = plain(y.word)
      const mutual = ix.syn.get(kk(t, pos))?.has(me) ?? false
      const one = (ix.senseCount.get(kk(e.word, pos)) ?? 0) === 1 && (ix.senseCount.get(kk(t, pos)) ?? 0) === 1
      // spot-check 2026-11-04 (50 random pairs): a one-sided listing attached by «one sense on both sides» was wrong in 2 of 14; only a mutual listing is a confirmed sense, a one-sided one with one meaning on both sides is kept as «значення не уточнено», the rest is dropped
      if (!mutual && !one) { bump(rej, 'wikt-syn-en: sense not determinable (one-sided, polysemous)'); continue }
      push({ a: e.word, b: t, pos, rel: 'lexical', src: 'wikt-syn-en', sense: mutual ? 'one' : 'unspec',
        ev: D('Вікісловник (en)', kkUrl(e.word), `${e.word}: synonyms ${t}${s.glosses?.[0] ? ` (sense: ${s.glosses[0]})` : ''}`, `en.wiktionary, стаття «${e.word}», synonyms${mutual ? '; зворотний зв’язок є на сторінці «' + t + '»' : one ? '; по одному значенню з обох боків' : '; значення цілі не уточнено'}`) })
    }
  }
  return out
}

// ── 3b uk.wiktionary ────────────────────────────────────────────────────────────────────────────
/** rows of the uk.wiktionary stage (core/synphr.ts SynRow, relation `s`, edition `u`), keyed by lower-case head. A pair is confirmed only when both pages list each other. */
export function ukWiktPairs(syn: Record<string, SynRow[]>, posOf: PosOf, rej: Rejects): CorrPair[] {
  const out: CorrPair[] = []
  const lists = new Map<string, Set<string>>()
  for (const [h, rows] of Object.entries(syn)) lists.set(plain(h), new Set(rows.filter(r => r.r === 's' && r.d === 'u').map(r => plain(r.t))))
  for (const [h, rows] of Object.entries(syn)) for (const r of rows) {
    if (r.r !== 's' || r.d !== 'u') continue
    const a = plain(h), b = plain(r.t), c = checkPair(a, b, posOf(a), posOf(b)); if (!c.ok) { bump(rej, `wikt-syn-uk: ${c.why}`); continue }
    if (a > b && lists.get(b)?.has(a)) continue   // the mutual pair is emitted once, from the smaller head
    const mutual = lists.get(b)?.has(a) ?? false
    if (!mutual) { bump(rej, 'wikt-syn-uk: one-sided listing'); continue }   // spot-check 2026-11-04: one-sided uk.wiktionary rows were wrong in ~14 % of 50 random pairs (vandalism, loose senses); mutual ones only
    const pos = [...posOf(a)!].find(p => posOf(b)!.has(p))!
    out.push({ a, b, pos, rel: 'lexical', src: 'wikt-syn-uk', sense: 'one',
      ev: D('Вікісловник (uk)', `https://uk.wiktionary.org/wiki/${encodeURIComponent(a)}`, `${a}: Синоніми: ${b}${r.g ? ` (значення ${r.n ?? '?'}: ${r.g})` : ''}`, `uk.wiktionary, розділ «Синоніми»${mutual ? '; зворотний зв’язок є на сторінці «' + b + '»' : '; значення цілі не уточнено'}`) })
  }
  return out
}

// ── 3c Караванський (SE-17, © — word-to-word links only, owner's option b) ──────────────────────
/** the published links of pipelines/se17-scan.ts (≤ 5 per headword, VESUM lemmas of one POS); each pair is evidence of the kind D = a pointer to the printed spread, never a quoted row. The CR-1 mutual-listing guard applies where
 *  both ends are nest words of the dictionary (`n`): a one-sided link between two nest words is dropped. The series of a nest holds several senses, so a pair is never attached to one sense (`unspec`). */
export interface KarLinkRow { h: string; t: string; page: string; m?: 1; n?: 1 }
export function karavanskyPairs(links: readonly KarLinkRow[], posOf: PosOf, rej: Rejects): CorrPair[] {
  const out: CorrPair[] = [], seen = new Set<string>()
  for (const l of links) {
    const a = plain(l.h), b = plain(l.t), c = checkPair(a, b, posOf(a), posOf(b)); if (!c.ok) { bump(rej, `karavansky: ${c.why}`); continue }
    if (l.n && !l.m) { bump(rej, 'karavansky: one-sided between two nest words'); continue }
    const k = a < b ? `${a}|${b}` : `${b}|${a}`; if (seen.has(k)) continue; seen.add(k)
    const pos = [...posOf(a)!].find(p => posOf(b)!.has(p))!
    out.push({ a, b, pos, rel: 'lexical', src: 'karavansky', sense: 'unspec',
      ev: D('Караванський, Практичний словник синонімів української мови (Київ: Українська книга, 2000)', l.page, `${a} — ${b}`, 'SE-17: сторінка словника, на якій заголовне слово має це слово у синонімічному ряду; слова обрано за ВЕСУМ (одна частина мови), ряд, позначки й приклади не відтворюються') })
  }
  return out
}

// ── 4 dictionary cross-references───────────────────────────────────────────────────────────────
export const DICT_NAME: Record<string, string> = { sum11: 'СУМ-11', sum20: 'СУМ-20', hrinchenko: 'Грінченко', zheleh: 'Желехівський' }
/** `xr` = data/work/xr.json (lk(head) → pointer rows); only «Те саме, що» (kind `same`). A spelling variant (a few letters apart) is the same word; any other target may be a polysemous word: `unspec`. */
export function xrPairs(xr: Record<string, Omit<Ptr, 'h'>[]>, posOf: PosOf, rej: Rejects, senseN?: SenseN): CorrPair[] {
  const out: CorrPair[] = []
  for (const [h, rows] of Object.entries(xr)) for (const r of rows) {
    if (r.k !== 'same') continue
    const c = checkPair(h, r.t, posOf(h), posOf(r.t)); if (!c.ok) { bump(rej, `xr: ${c.why}`); continue }
    const rel = shapeRelation(h, r.t), pos = [...posOf(h)!].find(p => posOf(r.t)!.has(p))!
    const d = DICT_NAME[r.d] ?? r.d
    out.push({ a: h, b: r.t, pos, rel: rel === 'phonetic' ? 'phonetic' : 'lexical', src: 'xr', sense: rel === 'phonetic' ? 'one' : senseOf(senseN, r.t, pos),
      ev: D(d, r.l ?? d, `${h}: те саме, що ${r.t}`, `GG-18: покажчик словника «Те саме, що» (структура статті, без тексту; GG-7)`) })
  }
  return out
}

// ── 5 dialect dictionaries ──────────────────────────────────────────────────────────────────────
/** coarse shape of a word, to match the POS of a dialect headword (not in VESUM) with the POS of its standard gloss */
const shapeOf = (w: string): string => (/(ти|тись|тися|ть)$/.test(w) ? 'verb' : /(ий|ій|ий|ого|ої)$/.test(w) ? 'adj' : 'noun')
export interface LexRow { w: string[]; gloss: string; codes: string[]; src: string; loc: string; q: string; village?: string; region?: string }
export function dialectLexPairs(rows: readonly LexRow[], posOf: PosOf, rej: Rejects, srcId = 'dialect-lex', senseN?: SenseN): CorrPair[] {
  const out: CorrPair[] = []
  for (const r of rows) {
    const g = plain(r.gloss)
    if (!isSingleWord(g)) { bump(rej, `${srcId}: multi-word gloss`); continue }
    const gp = posOf(g); if (!gp?.size) { bump(rej, `${srcId}: gloss not in VESUM`); continue }
    for (const w of r.w) {
      const a = plain(w)
      if (!isSingleWord(a) || a === g) { bump(rej, `${srcId}: not a single word`); continue }
      if (swapKey(a) === swapKey(g)) { bump(rej, `${srcId}: и/і swap`); continue }   // spot-check: «стрыйко» for «стрийко» is a spelling, not a dialect word
      // DV-1b: a numeral / adverb / pronoun gloss (штири ~ чотири) has no noun-adj-verb shape; one class of the gloss and a head that is not verb-shaped fix the POS
      const sh = shapeOf(a), pos = [...gp].find(p => p === sh) ?? (gp.size === 1 && NONSHAPE.has([...gp][0]!) && sh !== 'verb' ? [...gp][0] : undefined)
      if (!pos) { bump(rej, `${srcId}: POS shape differs`); continue }
      if (posOf(a)?.size && ![...posOf(a)!].includes(pos)) { bump(rej, `${srcId}: POS differs`); continue }
      const ev = Q(r.src === 'ENC' ? 'ЕУМ (litopys.org.ua)' : r.src, r.loc, r.q, `слово «${a}» ← «${g}»`)
      const areas: CorrArea[] = r.codes.length ? r.codes.map(c => ({ dialect: DIALECTS[c] ?? c, code: c, grade: 'dict' as const, ev })) : r.village ? [{ dialect: r.village, grade: 'dict' as const, ev }] : []
      out.push({ a: g, b: a, pos, rel: 'lexical', src: srcId, ev, sense: senseOf(senseN, g, pos), areaB: areas, norm: 'a' })
    }
  }
  return out
}
const NONSHAPE: ReadonlySet<string> = new Set(['numr', 'adv', 'pron', 'prep', 'conj', 'part'])
export const dialectLexRows = (): LexRow[] => DIALECT_LEX as LexRow[]

// ── 7 DV-1: owner confirmations and hypotheses ───────────────────────────────────────────────────────────────────
import { ownerEvidence, DV_HYP_NOTE, type OwnerRow, type DvLink } from './dialect-variants.ts'
/** data/owner/variants-confirmed.tsv: each confirmed line is an owner-graded pair (evidence kind P); the target must be a VESUM word of one class and the form must not be an и/і swap of it */
export function ownerTsvPairs(rows: readonly OwnerRow[], posOf: PosOf, rej: Rejects): CorrPair[] {
  const out: CorrPair[] = []
  for (const r of rows) {
    const a = plain(r.target), b = plain(r.form), c = checkPair(a, b, posOf(a), posOf(b) ?? posOf(a))
    if (!c.ok && c.why !== 'POS unknown') { bump(rej, `owner-tsv: ${c.why}`); continue }
    const pos = [...(posOf(a) ?? [])][0]; if (!pos) { bump(rej, 'owner-tsv: target not in VESUM'); continue }
    const ev = ownerEvidence(r)
    out.push({ a, b, pos, rel: 'phonetic', src: 'owner', ev, sense: 'one', norm: 'a', areaB: [{ dialect: r.area || 'говір не названо', grade: 'owner', ev }] })
  }
  return out
}
/** hypotheses of data/work/dv1: a pair of the shipped correspondences, graded «гіпотеза»; sense 'unspec' keeps it a two-member group of its own, so a hypothesis never bridges two groups */
export function hypothesisPairs(rows: readonly DvLink[], posOf: PosOf, rej: Rejects): CorrPair[] {
  const out: CorrPair[] = []
  for (const r of rows) {
    if (r.method !== 'hypothesis') continue
    const a = plain(r.target), b = plain(r.form), pa = posOf(a)
    if (!pa?.size || posOf(b)?.size || swapKey(a) === swapKey(b)) { bump(rej, 'dv1-hyp: guard'); continue }   // VESUM knows the form: never redirected
    const pos = r.pos && pa.has(r.pos) ? r.pos : [...pa][0]!
    const reg = (r.regions ?? []).slice(0, 2).map(([n, t]) => `${n}: ${t}`).join('; ')
    const ev = D('гіпотеза DV-1', `pipelines/dv1-scan.ts ${r.via}`, `${b} → ${a} (${r.f} вживань у ${r.nW} пам’ятках${reg ? '; ' + reg : ''})`, DV_HYP_NOTE)
    out.push({ a, b, pos, rel: 'phonetic', src: 'dv1-hyp', ev, sense: 'unspec', norm: 'a', areaB: [{ dialect: `за відповідником ${r.via}`, grade: 'hyp', ev }] })
  }
  return out
}
