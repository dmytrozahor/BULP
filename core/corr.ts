/**
 * SPEC 63 CR-1 (owner 2026-11-04: «вигадай якусь гарну схему відповідників (у т.ч. діалектних) і їх показу на сайті, кшталт на сторінці "щоби" показується "коби" і якому діалекту воно
 * належить (перша фіксація). і так взаємно для карток») — CORRESPONDENCE GROUPS. Pure (no node, no DOM): the model, the guards, the assembly of pairs into groups, the grades, the rows a card prints.
 *
 * A group is «one meaning, several words or forms» with NO privileged direction. It is stored ONCE; every member's card renders the same group with itself highlighted, so the mutual display cannot drift
 * (tests/cr1.test.ts walks every group and checks that each member's card shows all the others).
 *
 * Honest grades — what «належить діалекту» may claim (binding, owner rule «precision over recall»):
 *   dict    a dictionary or dialect description labels the form with that area (locator + quote in `ev`); printed as the area name;
 *   corpus  only a DISTRIBUTION of the form over the regions of the witnesses: printed «у корпусі переважно: Галичина (78 %)» with the minimum counts, never «галицьке»;
 *   owner   «за свідченням носія» (kind P) with the owner's quote;
 *   (none)  «говір не встановлено» — the member still shows.
 * «Перша фіксація» is the first in OUR data («перша фіксація в корпусі: 1886, <свідчення>»), a dictionary date is printed separately, a not-proofread-OCR date is excluded or marked, and it is never «first in the language».
 */
import { claim, type Evidence } from './evidence.ts'

export type Relation = 'phonetic' | 'morph' | 'lexical' | 'historical' | 'loan'
export type Grade = 'dict' | 'corpus' | 'owner' | 'hyp'
export interface CorrArea {
  /** the area as the source (or the corpus) names it */ dialect: string
  grade: Grade; ev: Evidence
  /** dialect code of core/rules.ts DIALECTS, when the area name resolves to one (the «Говір» switch) */ code?: string
  /** corpus grade only: the share of the member's tokens (0..1), the tokens and the witnesses behind it */ share?: number; tokens?: number; witnesses?: number
}
export interface CorrFirst { year: number; /** the end of a dated range (1301–1500), when it differs */ to?: number; witness: string; href: string; kind: 'corpus' | 'dict'; /** the title / locator printed next to the year */ label?: string }
export interface CorrMember {
  /** lemma */ form: string
  /** the standard member */ norm: boolean
  /** phonetic / morph = the same word varied; lexical = another word with the same meaning; historical = an older form; loan */ relation: Relation
  areas: CorrArea[]
  /** computed: the first fixation in OUR corpus (never a dictionary witness, never not-proofread OCR) */ first?: CorrFirst
  /** the first dictionary date, printed separately when it is earlier than `first` or when the corpus has none */ firstDict?: CorrFirst
  /** the earliest date that exists only in not-proofread OCR: printed «OCR, не вичитано», never as a fixation */ ocrEarlier?: number
  /** corpus tokens */ freq?: number
  /** the source of the pairing of this member with the group: ids and the evidence (locator + quote) */ src: string[]; evidence: Evidence[]
  /** the sense is not determined (a polysemous target): kept out of the top line, printed «значення не уточнено» */ unspec?: true
}
export interface CorrGroup {
  id: string
  /** short sense label, e.g. «сполучник мети» */ meaning: string
  /** VESUM POS class, every member fits it */ pos: string
  members: CorrMember[]
}
/** a shard (lm/cg/<bucket>.json): lemma key → groups; the evidence objects are interned in `ev` (see packCg / unpackCg) */
export interface CgShard { format: 1; ev: Evidence[]; g: Record<string, unknown[]> }

// ── labels (UI strings are Ukrainian) ───────────────────────────────────────────────────────────
export const REL_UK: Record<Relation, string> = { phonetic: 'та сама лексема', morph: 'та сама лексема', lexical: 'інше слово', historical: 'історична', loan: 'запозичення' }
export const GRADE_UK: Record<Grade, string> = { dict: 'за словником', corpus: 'за розподілом у корпусі', owner: 'за свідченням носія', hyp: 'гіпотеза' }
export const NO_AREA = 'говір не встановлено'
export const UNSPEC = 'значення не уточнено'
export const POS_UK: Record<string, string> = {
  noun: 'іменник', verb: 'дієслово', adj: 'прикметник', adv: 'прислівник', prep: 'прийменник', conj: 'сполучник', part: 'частка', pron: 'займенник', intj: 'вигук', numr: 'числівник',
  predic: 'предикатив', noninfl: 'незмінюване слово', adjp: 'дієприкметник', advp: 'дієприслівник', insert: 'вставне слово', onomat: 'звуконаслідування',
}
/** the minimum a corpus distribution needs before the card prints it (stated on the card) */
export const CORPUS_MIN = { tokens: 30, witnesses: 3, share: 0.6 } as const
export const CORPUS_RULE = `розподіл за регіонами пам’яток, не діалектна мітка; показано від ${CORPUS_MIN.tokens} вживань у ${CORPUS_MIN.witnesses} пам’ятках і частки від ${Math.round(CORPUS_MIN.share * 100)} %`

// ── guards ──────────────────────────────────────────────────────────────────────────────────────
const STRESS = /[̀-ͯ]/g
/** a word as a source prints it → the comparable form (no stress, NFC, lower case, ’ → ') */
export const plain = (w: string): string => w.normalize('NFC').replace(STRESS, '').replace(/[’ʼ]/g, "'").trim().toLowerCase()
/** one Cyrillic word (a hyphen or an apostrophe inside is allowed): a multi-word gloss is not a correspondence */
export const isSingleWord = (w: string): boolean => /^[а-яіїєґ]+(?:['-][а-яіїєґ]+)*$/u.test(plain(w)) && plain(w).length >= 2
/** и / і / ї / ы swaps collapse to one key: кит and кіт are different words, a pair that differs only so is never made from a spelling resemblance */
export const swapKey = (w: string): string => plain(w).replace(/[иіїы]/g, 'и')
export function lev(a: string, b: string): number {
  const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur }
  return prev[n]!
}
/** the relation of two words by their shape alone, for sources that say «alternative form» without saying how: a few letters apart = the same word varied */
export const shapeRelation = (a: string, b: string): Relation => { const x = plain(a), y = plain(b); return lev(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) / 3)) ? 'phonetic' : 'morph' }

export interface PairCheck { ok: boolean; why?: string }
/** the guards every automatic pair passes: single words, not the same word, not an и/і swap, the same POS (VESUM classes of both) */
export function checkPair(a: string, b: string, posA: ReadonlySet<string> | undefined, posB: ReadonlySet<string> | undefined): PairCheck {
  if (!isSingleWord(a) || !isSingleWord(b)) return { ok: false, why: 'multi-word' }
  if (plain(a) === plain(b)) return { ok: false, why: 'same' }
  if (swapKey(a) === swapKey(b)) return { ok: false, why: 'и/і swap' }
  if (!posA?.size || !posB?.size) return { ok: false, why: 'POS unknown' }
  if (![...posA].some(p => posB.has(p))) return { ok: false, why: 'POS differs' }
  return { ok: true }
}

// ── pairs → groups ──────────────────────────────────────────────────────────────────────────────
/** one pair as a source states it. `norm`: which word is the standard one ('a' | 'b' | 'both'), when known. `sense`: 'one' = attached to one sense, 'unspec' = the target is polysemous and the sense is not determined */
export interface CorrPair {
  a: string; b: string; pos: string; rel: Relation; src: string; ev: Evidence; sense: 'one' | 'unspec'
  /** areas of a / b as the source gives them */ areaA?: CorrArea[]; areaB?: CorrArea[]
  /** which side(s) are the standard */ norm?: 'a' | 'b' | 'both'
  meaning?: string
}
/** source order: the first sources win when a group would exceed the cap */
export const SRC_PRIORITY = ['family', 'owner', 'extra', 'dialect-lex', 'xr', 'wikt-alt', 'wikt-syn-uk', 'wikt-syn-en'] as const
export const GROUP_CAP = 12
const prio = (s: string) => { const i = (SRC_PRIORITY as readonly string[]).indexOf(s); return i < 0 ? SRC_PRIORITY.length : i }

/** merge areas without duplicates (same dialect + grade) */
const mergeAreas = (xs: CorrArea[], ys: CorrArea[] = []): CorrArea[] => { const out = [...xs]; for (const y of ys) if (!out.some(x => x.dialect === y.dialect && x.grade === y.grade)) out.push(y); return out }

export interface AssembleStats { pairs: number; edgesUsed: number; capped: number; swapBlocked?: number; unspecGroups: number; groups: number; members: number }
/**
 * Confirmed pairs (`sense: 'one'`) of one POS are merged into groups in source-priority order, a merge that would give a group of more than GROUP_CAP members is skipped (it is a polysemous bridge,
 * counted in `capped`). Each unspecified pair becomes its own two-member group with both members flagged `unspec`. A lemma may be in several groups.
 */
export function assemble(pairs: CorrPair[], meaningOf?: (pos: string, p: CorrPair) => string): { groups: CorrGroup[]; stats: AssembleStats } {
  // a word that a curated source (family, owner) put into a named meaning brings that meaning to every other pair it is in, so the wiktionary pair аби ~ щоб joins the group «сполучник мети»
  const known = new Map<string, string>(); for (const p of pairs) if (p.meaning) { known.set(`${p.pos}|${plain(p.a)}`, p.meaning); known.set(`${p.pos}|${plain(p.b)}`, p.meaning) }
  const meaningFor = meaningOf ?? ((pos: string, p: CorrPair) => known.get(`${pos}|${plain(p.a)}`) ?? known.get(`${pos}|${plain(p.b)}`) ?? POS_UK[pos] ?? pos)
  const st: AssembleStats = { pairs: pairs.length, edgesUsed: 0, capped: 0, unspecGroups: 0, groups: 0, members: 0 }
  const sorted = [...pairs].sort((x, y) => prio(x.src) - prio(y.src) || (x.a + x.b < y.a + y.b ? -1 : 1))
  type Node = { form: string; norm: boolean; rel: Relation; areas: CorrArea[]; src: Set<string>; ev: Evidence[]; unspec?: boolean }
  const key = (pos: string, meaning: string, w: string) => `${pos}\u0001${meaning}\u0001${plain(w)}`
  const parent = new Map<string, string>(), size = new Map<string, number>(), nodes = new Map<string, Node>(), members = new Map<string, Set<string>>(), posOfRoot = new Map<string, string>(), meanOfRoot = new Map<string, string>()
  const find = (k: string): string => { let r = k; while (parent.get(r) !== r) r = parent.get(r)!; return r }
  const node = (k: string, form: string): Node => nodes.get(k) ?? (nodes.set(k, { form, norm: false, rel: 'lexical', areas: [], src: new Set(), ev: [] }), parent.set(k, k), size.set(k, 1), members.set(k, new Set([k])), nodes.get(k)!)
  const unspecPairs: CorrPair[] = []
  const note = (n: Node, p: CorrPair, side: 'a' | 'b') => {
    const other = side === 'a' ? p.b : p.a
    n.areas = mergeAreas(n.areas, side === 'a' ? p.areaA : p.areaB); n.src.add(p.src)
    if (!n.ev.some(e => e.locator === p.ev.locator && e.quote === p.ev.quote)) n.ev.push(p.ev)
    if (p.norm === side || p.norm === 'both') n.norm = true
    // the relation of a variant to the standard: the pair's relation is stated of the NON-standard side; a standard side keeps 'lexical' unless it is the only information
    if (!(p.norm === side || p.norm === 'both')) n.rel = p.rel
    void other
  }
  for (const p of sorted) {
    if (p.sense === 'unspec') { unspecPairs.push(p); continue }
    const meaning = p.meaning ?? meaningFor(p.pos, p), ka = key(p.pos, meaning, p.a), kb = key(p.pos, meaning, p.b)
    const na = node(ka, p.a), nb = node(kb, p.b)
    posOfRoot.set(ka, p.pos); posOfRoot.set(kb, p.pos); meanOfRoot.set(ka, meaning); meanOfRoot.set(kb, meaning)
    const ra = find(ka), rb = find(kb)
    if (ra !== rb) {
      if (size.get(ra)! + size.get(rb)! > GROUP_CAP) { st.capped++; continue }
      // transitivity must not undo the pair guard: two components that each hold a spelling of the same word (и/і/ї/ы swap) never merge (сикірований ~ сікірований through different partners)
      const swaps = new Set([...members.get(ra)!].map(k => swapKey(nodes.get(k)!.form)))
      if ([...members.get(rb)!].some(k => swaps.has(swapKey(nodes.get(k)!.form)))) { st.swapBlocked = (st.swapBlocked ?? 0) + 1; continue }
      parent.set(rb, ra); size.set(ra, size.get(ra)! + size.get(rb)!)
      const m = members.get(ra)!; for (const x of members.get(rb)!) m.add(x); members.delete(rb)
    }
    note(na, p, 'a'); note(nb, p, 'b'); st.edgesUsed++
  }
  const groups: CorrGroup[] = []
  const toMember = (n: Node, unspec?: boolean): CorrMember => ({ form: n.form, norm: n.norm, relation: n.rel, areas: n.areas, src: [...n.src].sort(), evidence: n.ev, ...(unspec ? { unspec: true as const } : {}) })
  for (const [root, set] of members) {
    if (set.size < 2) continue
    const ms = [...set].map(k => nodes.get(k)!)
    // the standard member first, then by form
    ms.sort((x, y) => +y.norm - +x.norm || (plain(x.form) < plain(y.form) ? -1 : 1))
    const pos = posOfRoot.get(root)!, meaning = meanOfRoot.get(root)!
    groups.push({ id: groupId(pos, meaning, ms.map(m => m.form)), meaning, pos, members: ms.map(n => toMember(n)) })
  }
  const seen = new Set(groups.map(g => g.id))
  for (const p of unspecPairs) {
    const meaning = p.meaning ?? meaningFor(p.pos, p)
    // an unspecified pair already inside one confirmed group adds nothing
    if (groups.some(g => g.pos === p.pos && g.members.some(m => plain(m.form) === plain(p.a)) && g.members.some(m => plain(m.form) === plain(p.b)))) continue
    const mk = (form: string, side: 'a' | 'b'): CorrMember => ({ form, norm: p.norm === side || p.norm === 'both', relation: p.norm === side || p.norm === 'both' ? 'lexical' : p.rel, areas: (side === 'a' ? p.areaA : p.areaB) ?? [], src: [p.src], evidence: [p.ev], unspec: true })
    const ms = [mk(p.a, 'a'), mk(p.b, 'b')].sort((x, y) => +y.norm - +x.norm || (plain(x.form) < plain(y.form) ? -1 : 1))
    const id = groupId(p.pos, UNSPEC + ':' + meaning, ms.map(m => m.form))
    if (seen.has(id)) { const g = groups.find(x => x.id === id)!; for (const m of ms) { const e = g.members.find(x => plain(x.form) === plain(m.form))!; for (const s of m.src) if (!e.src.includes(s)) e.src.push(s); for (const ev of m.evidence) if (!e.evidence.some(z => z.locator === ev.locator && z.quote === ev.quote)) e.evidence.push(ev); e.areas = mergeAreas(e.areas, m.areas) } continue }
    seen.add(id); st.unspecGroups++
    groups.push({ id, meaning, pos: p.pos, members: ms })
  }
  groups.sort((x, y) => (x.id < y.id ? -1 : 1))
  st.groups = groups.length; st.members = groups.reduce((n, g) => n + g.members.length, 0)
  return { groups, stats: st }
}
/** a stable id: the POS, a short hash of the meaning and the first (standard) member */
export function groupId(pos: string, meaning: string, forms: string[]): string {
  let h = 0x811c9dc5; for (const ch of [...forms].map(plain).sort().join('|') + '#' + meaning) for (let i = 0; i < ch.length; i++) { h ^= ch.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return `cg:${pos}:${plain(forms[0] ?? '')}:${h.toString(36)}`
}

// ── corpus grade ────────────────────────────────────────────────────────────────────────────────
/**
 * The corpus «area» of a member from its tokens by witness: byWitness[id] = tokens, regionOf(id) = the witness's region (undefined = unknown). A distribution is stated only when the TOP region holds at least CORPUS_MIN.tokens
 * tokens in at least CORPUS_MIN.witnesses witnesses and CORPUS_MIN.share of the tokens of witnesses of KNOWN region. It is a distribution of the witnesses' regions, never a dialect claim.
 */
export function corpusArea(byWitness: Record<string, number>, regionOf: (id: string) => string | undefined): CorrArea | undefined {
  const reg = new Map<string, { tokens: number; wit: Set<string> }>(); let total = 0, witnesses = 0
  for (const [id, n] of Object.entries(byWitness)) {
    const r = regionOf(id); if (!r || !(n > 0)) continue
    const e = reg.get(r) ?? reg.set(r, { tokens: 0, wit: new Set() }).get(r)!
    e.tokens += n; e.wit.add(id); total += n; witnesses++
  }
  if (!total || !witnesses) return undefined
  const top = [...reg.entries()].sort((a, b) => b[1].tokens - a[1].tokens || (a[0] < b[0] ? -1 : 1))[0]
  if (!top || top[1].tokens < CORPUS_MIN.tokens || top[1].tokens / total < CORPUS_MIN.share || top[1].wit.size < CORPUS_MIN.witnesses) return undefined
  const share = top[1].tokens / total
  return {
    dialect: top[0], grade: 'corpus', share: Math.round(share * 1000) / 1000, tokens: top[1].tokens, witnesses: top[1].wit.size,
    ev: { source: 'корпус проєкту', locator: 'розподіл токенів за регіоном пам’ятки (witness.region)', quote: `${top[0]}: ${top[1].tokens} з ${total} вживань у ${top[1].wit.size} з ${witnesses} пам’яток`, kind: 'D', note: CORPUS_RULE },
  }
}

// ── what a card prints ──────────────────────────────────────────────────────────────────────────
/** the area text of one area, grade visible: dict «Надсянський говір», corpus «у корпусі переважно: Галичина (78 %)», owner «за свідченням носія: …» */
export function areaText(a: CorrArea): string {
  if (a.grade === 'corpus') return `у корпусі переважно: ${a.dialect} (${Math.round((a.share ?? 0) * 100)} %)`
  if (a.grade === 'owner') return `за свідченням носія: ${a.dialect}`
  if (a.grade === 'hyp') return `гіпотеза: ${a.dialect}`   // DV-1: a correspondence the data shows, no dictionary; never a fact
  return a.dialect
}
/** short area for a chip: dictionary / owner areas by name; a corpus distribution never becomes a chip label of a dialect (only «корп.: Галичина») */
export function areaChip(a: CorrArea): string { return a.grade === 'corpus' ? `корп.: ${a.dialect}` : a.dialect }
export function memberAreaText(m: CorrMember): string { return m.areas.length ? m.areas.map(areaText).join('; ') : NO_AREA }
export function firstText(f: CorrFirst | undefined, m?: CorrMember): string {
  const y = (x: CorrFirst) => (x.to && x.to !== x.year ? `${x.year}–${x.to}` : String(x.year))
  const parts: string[] = []
  if (f) parts.push(`перша фіксація в корпусі: ${y(f)}${f.label ? `, ${f.label}` : ''}`)
  if (m?.firstDict && (!f || m.firstDict.year < f.year)) parts.push(`у словнику з ${y(m.firstDict)}`)
  if (m?.ocrEarlier && (!f || m.ocrEarlier < f.year)) parts.push(`раніше лише в OCR, не вичитано: ${m.ocrEarlier}`)
  return parts.join('; ')
}
const TOP_MAX = 5
export interface ChipView { form: string; area?: string; year?: number; norm: boolean; self: boolean; dialectHit: boolean; unspec: boolean }
/**
 * The compact line of a card: a chip per OTHER member, at most TOP_MAX, the rest behind «ще N». Members whose sense is not determined are kept out. If a dialect is selected in the «Говір» switch (`code`),
 * the members of that dialect come first and are marked. Returns undefined when there is nothing to show.
 */
export function topLine(g: CorrGroup, lemma: string, dialectCode = ''): { chips: ChipView[]; more: number } | undefined {
  const me = plain(lemma)
  const all = g.members.filter(m => plain(m.form) !== me && !m.unspec)
  if (!all.length) return undefined
  const hit = (m: CorrMember) => !!dialectCode && m.areas.some(a => a.code === dialectCode)
  const sorted = [...all].sort((x, y) => +hit(y) - +hit(x))   // stable: the group's own order (norm first) otherwise
  const view = (m: CorrMember): ChipView => {
    const a = m.areas.find(x => x.grade !== 'corpus') ?? m.areas[0], yr = m.first?.year
    return { form: m.form, area: a ? areaChip(a) : undefined, year: yr, norm: m.norm, self: false, dialectHit: hit(m), unspec: false }
  }
  return { chips: sorted.slice(0, TOP_MAX).map(view), more: Math.max(0, sorted.length - TOP_MAX) }
}
/** the table rows of one group, the card's word highlighted, the selected dialect's members first */
export interface RowView { form: string; self: boolean; type: string; area: string; grade: Grade | ''; first: string; firstHref?: string; freq?: number; source: string; unspec: boolean; dialectHit: boolean; norm: boolean; evidence: Evidence[] }
export function tableRows(g: CorrGroup, lemma: string, dialectCode = ''): RowView[] {
  const me = plain(lemma), hit = (m: CorrMember) => !!dialectCode && m.areas.some(a => a.code === dialectCode)
  const rows = g.members.map((m): RowView => ({
    form: m.form, self: plain(m.form) === me, type: m.norm ? 'норма' : REL_UK[m.relation], area: memberAreaText(m), grade: m.areas[0]?.grade ?? '', first: firstText(m.first, m) || 'не встановлено', firstHref: m.first?.href,
    freq: m.freq, source: m.src.join(', '), unspec: !!m.unspec, dialectHit: hit(m), norm: m.norm, evidence: [...m.evidence, ...m.areas.map(a => a.ev)],
  }))
  return rows.sort((x, y) => +y.dialectHit - +x.dialectHit)
}

/** the groups a card prints, in a stable order: a group with confirmed others first */
export const groupsForCard = (gs: CorrGroup[], lemma: string): CorrGroup[] => {
  const me = plain(lemma), mine = gs.filter(g => g.members.some(m => plain(m.form) === me))
  return mine.sort((x, y) => +x.members.every(m => m.unspec) - +y.members.every(m => m.unspec) || (x.id < y.id ? -1 : 1))
}
/** the number printed in the Collapsible title: the other members over all groups of the card (each counted once) */
export const otherCount = (gs: CorrGroup[], lemma: string): number => { const me = plain(lemma); return new Set(groupsForCard(gs, lemma).flatMap(g => g.members.map(m => plain(m.form)).filter(f => f !== me))).size }

// ── shard packing: Evidence objects interned once per shard ─────────────────────────────────────
export function packCg(byLemma: Record<string, CorrGroup[]>): CgShard {
  const ev: Evidence[] = [], ix = new Map<string, number>()
  const id = (e: Evidence): number => { const k = JSON.stringify(e); let i = ix.get(k); if (i === undefined) { i = ev.length; ev.push(e); ix.set(k, i) } return i }
  const g: Record<string, unknown[]> = {}
  for (const [k, gs] of Object.entries(byLemma)) g[k] = gs.map(x => ({ ...x, members: x.members.map(m => ({ ...m, evidence: m.evidence.map(id), areas: m.areas.map(a => ({ ...a, ev: id(a.ev) })) })) }))
  return { format: 1, ev, g }
}
export function unpackCg(s: CgShard): Record<string, CorrGroup[]> {
  const out: Record<string, CorrGroup[]> = {}
  for (const [k, gs] of Object.entries(s.g)) out[k] = (gs as { members: (Omit<CorrMember, 'evidence' | 'areas'> & { evidence: number[]; areas: (Omit<CorrArea, 'ev'> & { ev: number })[] })[] }[]).map(x => ({
    ...(x as unknown as CorrGroup), members: x.members.map(m => ({ ...m, evidence: m.evidence.map(i => s.ev[i]!), areas: m.areas.map(a => ({ ...a, ev: s.ev[a.ev]! })) })),
  }))
  return out
}

/** every claim a group makes passes core/evidence.ts claim(): a member without evidence is a build error, not a silent row */
export function checkGroup(g: CorrGroup): void {
  for (const m of g.members) {
    claim(m.form, m.evidence)
    for (const a of m.areas) claim(a.dialect, a.ev)
    if (m.areas.some(a => a.grade === 'corpus' && ((a.tokens ?? 0) < CORPUS_MIN.tokens || (a.witnesses ?? 0) < CORPUS_MIN.witnesses))) throw new Error(`${m.form}: corpus area under the minimum`)
  }
}
