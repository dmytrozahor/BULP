/**
 * SPEC 63 PS «Постаті»: a persons index built from the witness metadata (pure; no node or DOM imports).
 * Owner 2026-10-29: «створи сторінки з постатями де можна укр лінгвістів і постатей з різних епох і народів і націй і тд подивитися які є в корпусі».
 * Nothing here is guessed: a value that no cited source states is `null` and the UI says «не встановлено».
 */
import type { Evidence } from './evidence.ts'
import { key } from './text.ts'
import type { RuFlag } from './ru-source.ts'

export interface AuthorIn { id: string; name: string; life?: string; label?: string; status?: string; region?: string; evidence?: Evidence[] }
export interface WitnessIn {
  id: string; title: string; author: string; date: [number, number]; n: number; region?: string; lang?: string; witnessType?: string
  edition?: string; ru?: RuFlag; epochShev?: { value: unknown }
}
export interface Work { id: string; title: string; y: number; yTo: number; n: number; region?: string; lang?: string; type?: string; ru?: 1 }
export interface Portrait { file: string; h: string; licence: string; author: string; page: string; qid: string; checked: string }
export interface PortraitCheck { none: true; why: 'no-confident-match' | 'ambiguous' | 'no-free-image' | 'no-years'; checked: string; qid?: string }
export interface Person {
  id: string; name: string; forms: string[]; aliases: { name: string; cite: string }[]; authorIds: string[]
  kind: 'person' | 'collective'; life: string | null; birth: number | null; death: number | null
  centuries: number[]; epochs: string[]; regions: string[]; home: string | null
  roles: string[]; linguist: null | { basis: 'research48' | 'metadata'; why: string }
  identity: null | { value: string; evidence: Evidence[] }
  langs: string[]; ru: boolean; tokens: number; works: Work[]
  portrait?: Portrait; portraitCheck?: PortraitCheck
}
/** the compact list row (index.json) */
export interface PersonRow {
  id: string; name: string; life: string | null; b: number | null; d: number | null; c: number[]; e: string[]; reg: string[]; r: string[]; ling: 0 | 1
  idn: string | null; lang: string[]; ru: 0 | 1; n: number; w: number; kind: 'person' | 'collective'; th?: { file: string; h: string; licence: string }
}
export interface PersonsIndex { format: 1; generated: string; rows: PersonRow[]; alias: Record<string, string>; shards: number }

// ── names ────────────────────────────────────────────────────────────────────────────────────────────
export const SHARDS = 16
export function shardOf(id: string): number { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 } return h % SHARDS }

const strip = (s: string) => key(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʹʼ’'`ˈ]/g, '')
const isInitial = (t: string) => /^\p{L}\.?$/u.test(t)

/** clean a metadata author name: drop parentheses (kept as `note`), embedded life dates, a trailing title after the dates, «Surname, Given» order */
export function cleanName(raw: string): { name: string; years: [number | null, number | null] | null; note: string } {
  let s = raw.trim(), note = '', years: [number | null, number | null] | null = null
  const dm = s.match(/,?\s*(\d{4})\s*[-–]\s*(\d{4})?\.?/)
  if (dm) { years = [+dm[1]!, dm[2] ? +dm[2] : null]; s = s.slice(0, dm.index) }
  s = s.replace(/\(([^)]*)\)/g, (_, g) => { note += (note ? '; ' : '') + g; return '' }).replace(/["“”«»]/g, '').replace(/\s+/g, ' ').trim()
  const parts = s.split(',').map(x => x.trim()).filter(Boolean)
  if (parts.length === 2 && !/\d/.test(s)) s = `${parts[1]} ${parts[0]}`
  else if (parts.length > 2) s = parts.slice(0, 2).reverse().join(' ')
  return { name: s.replace(/\s*[,.;]+$/, ''), years, note }
}
export function lifeYears(life?: string): { b: number | null; d: number | null } {
  if (!life) return { b: null, d: null }
  const m = life.match(/^(?:бл\.\s*)?(\d{4})\s*[–-]\s*(?:бл\.\s*)?(\d{4})?$/)
  if (m) return { b: +m[1]!, d: m[2] ? +m[2] : null }
  const n = life.match(/^нар\.\s*(\d{4})$/); if (n) return { b: +n[1]!, d: null }
  return { b: null, d: null }
}
const COLLECTIVE = /^(анонім|писарі|писар|невідомий|невизначений|народна|київський літописець|галицько-волинський|літописець|за ред)|літопис|ruthenian-редакції|institution|видавництв|издател|товариств|комісі|академі|інститут|музей|редакц|друкарн|словник|госу.?дарств|за ред/i
/** an organisation, an anonymous or unclear author, or several people in one field: not one person */
export const isCollective = (a: AuthorIn) => a.label === 'institutional' || a.id.startsWith('anon') || COLLECTIVE.test(cleanName(a.name).name) || nameTokens(cleanName(a.name).name).full.length > 3

/** name tokens without initials, folded: the identity of a full name */
export function nameTokens(name: string): { full: string[]; initials: string[] } {
  const t = name.replace(/\./g, '. ').split(/\s+/).filter(Boolean)
  const full: string[] = [], initials: string[] = []
  for (const x of t) (isInitial(x) ? initials : full).push(isInitial(x) ? strip(x).replace('.', '') : strip(x))
  return { full, initials }
}

const ROLE_WORDS: [RegExp, string][] = [[/перекладач/i, 'перекладач'], [/укладач|упорядник|складач/i, 'укладач'], [/редактор|видавець/i, 'редактор / видавець']]
const LING_TITLE = /словник|граматик|граматіка|лексис|лексикон|правопис|азбук|буквар|мовознав/i

const GIVEN = new Set('іван петро тарас борис григорій михайло микола олександр дмитро андрій василь володимир олексій сергій юрій павло федір степан богдан олекса леся олесь ольга марія катерина анна євген євгеній костянтин лев роман ярослав захарія лаврентій памва клемент данило максим мелетій кирил афанасій остап осип йосип ілля опанас панас пантелеймон агатангел віктор всеволод гнат ігор тимофій стефан теофан іоанн христя марко левко філарет леонід анатолій олег мирон ананій касіян антоній климентій єлисей сильвестр адам ернест гаврило гаврила данила кость іларіон нестор климент'.split(' ').map(x => strip(x)))
const PATRONYMIC = /(ович|евич|йович|івна|ївна|ична)$/
const SURNAME_SFX = /(ський|ська|цький|цька|зький|енко|енка|ук|юк|чук|ич|ов|ова|ев|єв|ін|їн|ий|ей|ко|ець|як|ак|ик|ний|ур)$/
/** the surname token of a folded full name, or null when it cannot be told from the given name (never guessed) */
export function surnameOf(t: string[]): string | null {
  let c = t.length === 3 ? t.filter(x => !PATRONYMIC.test(x) || t.every(y => y === x || !SURNAME_SFX.test(y))) : t
  if (c.length === 3) return null
  if (c.length === 1) return c[0]!
  if (c.length !== 2) return null
  const [a, b] = c as [string, string], ga = GIVEN.has(a), gb = GIVEN.has(b)
  if (ga !== gb) return ga ? b : a
  if (ga && gb) return null
  const sa = SURNAME_SFX.test(a), sb = SURNAME_SFX.test(b)
  return sa !== sb ? (sa ? a : b) : null
}

export interface BuildOpts { generated: string; linguists48?: string[][]; identity?: Record<string, { value: string; evidence: Evidence[] }>; portraits?: Record<string, Portrait | PortraitCheck> }

/** a pseudonym or second name the witness metadata itself states: «Грінченко (Василь Чайченко)» in the title, «(псевдонім Василь Чайченко)» in the edition */
export function pseudonymsOf(w: WitnessIn): { name: string; cite: string }[] {
  const out: { name: string; cite: string }[] = []
  const e = w.edition?.match(/псевдонім\s+([^,;)]+)/i)
  if (e) out.push({ name: e[1]!.trim(), cite: `edition ${w.id}: «${e[0]}»` })
  const t = w.title.match(/^[^(]{3,40}\(([^)]+)\)\s*[.:]/)
  if (t && /^\p{Lu}\p{L}+ \p{Lu}\p{L}+$/u.test(t[1]!.trim())) out.push({ name: t[1]!.trim(), cite: `title ${w.id}: «${w.title.slice(0, 60)}»` })
  return out
}

const cent = (y: number) => Math.floor((y - 1) / 100) + 1

export function buildPersons(authors: AuthorIn[], witnesses: WitnessIn[], o: BuildOpts): { index: PersonsIndex; persons: Person[] } {
  const byAuthor = new Map<string, WitnessIn[]>()
  for (const w of witnesses) (byAuthor.get(w.author) ?? byAuthor.set(w.author, []).get(w.author)!).push(w)
  type Rec = { a: AuthorIn; c: ReturnType<typeof cleanName>; ws: WitnessIn[]; tok: number; b: number | null; d: number | null; coll: boolean; t: ReturnType<typeof nameTokens> }
  const recs: Rec[] = []
  for (const a of authors) {
    const ws = byAuthor.get(a.id); if (!ws?.length) continue
    const c = cleanName(a.name), ly = lifeYears(a.life)
    recs.push({ a, c, ws, tok: ws.reduce((s, w) => s + (w.n || 0), 0), b: ly.b ?? c.years?.[0] ?? null, d: ly.d ?? c.years?.[1] ?? null, coll: isCollective(a), t: nameTokens(c.name) })
  }
  recs.sort((x, y) => y.tok - x.tok || x.a.id.localeCompare(y.a.id))
  // merge: exact folded full-name token set; an initials-only form joins the ONE full-name person it fits; conflicting birth years never merge
  const groups: Rec[][] = [], byKey = new Map<string, Rec[][]>()
  const compatible = (g: Rec[], r: Rec) => !g.some(x => x.b !== null && r.b !== null && x.b !== r.b)
  for (const r of recs) {
    if (r.coll || r.t.full.length < 2) continue
    const k = [...r.t.full].sort().join(' '), g = byKey.get(k)?.find(x => compatible(x, r))
    if (g) g.push(r); else { const ng = [r]; groups.push(ng); byKey.set(k, [...(byKey.get(k) ?? []), ng]) }
  }
  const placed = new Set(groups.flat())
  for (const r of recs) {
    if (placed.has(r)) continue
    let target: Rec[] | undefined
    if (!r.coll && r.t.full.length === 1 && r.t.initials.length) {
      const fit = groups.filter(g => g[0]!.t.full.includes(r.t.full[0]!) && g[0]!.t.full.some(f => f[0] === r.t.initials[0]![0]) && compatible(g, r))
      if (fit.length === 1) target = fit[0]
    }
    if (target) target.push(r); else groups.push([r])
    placed.add(r)
  }
  const persons: Person[] = []
  for (const g of groups) {
    const p0 = g[0]!, ws = g.flatMap(r => r.ws), toks = g.reduce((s, r) => s + r.tok, 0)
    const forms = [...new Set(g.map(r => r.c.name).filter(Boolean))]
    const aliases = new Map<string, string>()
    for (const w of ws) for (const ps of pseudonymsOf(w)) if (!aliases.has(ps.name)) aliases.set(ps.name, ps.cite)
    const b = g.map(r => r.b).find(x => x !== null) ?? null, d = g.map(r => r.d).find(x => x !== null) ?? null
    const life = g.map(r => r.a.life).find(l => l && l !== '—') ?? (b ? `${b}–${d ?? ''}` : null)
    const roles = new Set<string>(p0.coll ? [] : ['автор'])
    for (const r of g) for (const [re, role] of ROLE_WORDS) if (re.test(r.c.note) || re.test(r.a.name)) roles.add(role)
    let linguist: Person['linguist'] = null
    const keys48 = o.linguists48 ?? []
    const nk = new Set(p0.t.full)
    if (!p0.coll && nk.size >= 2 && keys48.some(k => [...nk].every(t => k.includes(t)))) linguist = { basis: 'research48', why: 'названо в research/48 (українські лінгвісти)' }
    if (!linguist && !p0.coll) {
      const lw = ws.find(w => w.witnessType === 'dictionary' || LING_TITLE.test(w.title))
      if (lw) { linguist = { basis: 'metadata', why: `автор «${lw.title.slice(0, 80)}» (${lw.witnessType === 'dictionary' ? 'словник' : 'за назвою праці'}), метадані корпусу` }; if (lw.witnessType === 'dictionary') roles.add('укладач словника') }
    }
    if (linguist) roles.add('лінгвіст')
    const cs = new Map<number, number>(), es = new Map<string, number>(), rg = new Map<string, number>(), lg = new Map<string, number>()
    for (const w of ws) {
      const c = cent(Math.round((w.date[0] + w.date[1]) / 2)); cs.set(c, (cs.get(c) ?? 0) + w.n)
      const ev = (w.epochShev?.value as { epochs?: string[] } | undefined)?.epochs?.[0]; if (ev) es.set(ev, (es.get(ev) ?? 0) + w.n)
      if (w.region && w.region !== 'undefined' && w.region !== '-->') rg.set(w.region, (rg.get(w.region) ?? 0) + 1)
      if (w.lang) lg.set(w.lang, (lg.get(w.lang) ?? 0) + w.n)
    }
    const top = (m: Map<string, number>, k = 6) => [...m].sort((x, y) => y[1] - x[1]).slice(0, k).map(x => x[0])
    const home = g.map(r => r.a.region).find(Boolean) ?? null
    const idr = g.find(r => r.a.label && r.a.label !== 'institutional' && (r.a.evidence?.length ?? 0) > 0)
    const identity = o.identity?.[p0.a.id] ?? (idr ? { value: LABEL_VALUE[idr.a.label!] ?? idr.a.label!, evidence: idr.a.evidence! } : null)
    const por = g.map(r => o.portraits?.[r.a.id]).find(Boolean)
    const p: Person = {
      id: p0.a.id, name: p0.c.name || p0.a.name, forms, aliases: [...aliases].map(([name, cite]) => ({ name, cite })), authorIds: g.map(r => r.a.id),
      kind: p0.coll ? 'collective' : 'person', life, birth: b, death: d,
      centuries: [...cs.keys()].sort((x, y) => x - y), epochs: top(es, 4), regions: top(rg), home, roles: [...roles], linguist, identity,
      langs: top(lg, 4), ru: ws.some(w => !!w.ru), tokens: toks,
      works: ws.map(w => ({ id: w.id, title: w.title, y: w.date[0], yTo: w.date[1], n: w.n, region: w.region && w.region !== 'undefined' && w.region !== '-->' ? w.region : undefined, lang: w.lang, type: w.witnessType, ...(w.ru ? { ru: 1 as const } : {}) }))
        .sort((x, y) => x.y - y.y || x.id.localeCompare(y.id)),
    }
    if (por) { if ('file' in por) { if (licenceOk(por.licence)) p.portrait = por } else p.portraitCheck = por }
    persons.push(p)
  }
  persons.sort((x, y) => y.tokens - x.tokens || x.id.localeCompare(y.id))
  const alias: Record<string, string> = {}
  for (const p of persons) for (const a of p.authorIds) if (a !== p.id) alias[a] = p.id
  const rows: PersonRow[] = persons.map(p => ({
    id: p.id, name: p.name, life: p.life, b: p.birth, d: p.death, c: p.centuries, e: p.epochs, reg: [...(p.home ? [p.home] : []), ...p.regions].slice(0, 4), r: p.roles, ling: p.linguist ? 1 : 0,
    idn: p.identity?.value ?? null, lang: p.langs, ru: p.ru ? 1 : 0, n: p.tokens, w: p.works.length, kind: p.kind,
    ...(p.portrait ? { th: { file: p.portrait.file, h: p.portrait.h, licence: p.portrait.licence } } : {}),
  }))
  return { index: { format: 1, generated: o.generated, rows, alias, shards: SHARDS }, persons }
}
export const LABEL_VALUE: Record<string, string> = { ukrainian: 'український автор (самоназва за цитатою)', ruthenian: 'руський (рутенський) автор', malorossian: 'малоросійський автор', 'ruthenian-rus': 'автор Київської Русі' }

export const shardsOf = (persons: Person[]): Map<number, Record<string, Person>> => {
  const m = new Map<number, Record<string, Person>>()
  for (let i = 0; i < SHARDS; i++) m.set(i, {})
  for (const p of persons) { m.get(shardOf(p.id))![p.id] = p; for (const a of p.authorIds) if (a !== p.id) m.get(shardOf(a))![a] = { ...p, id: p.id } }
  return m
}

// ── portraits (owner: «і з фотографіями»): only freely licensed Commons images, only on a confident Wikidata match ─────────
/** free licences only: public domain, CC0, CC BY, CC BY-SA (any version); NC / ND / fair use / unknown are refused */
export function licenceOk(short: string | undefined): boolean {
  const s = (short ?? '').trim().toLowerCase()
  if (!s || /fair use|non-?free|all rights|nc|nd\b|no derivatives|unknown|невідом|copyrighted|permission/.test(s)) return false
  return /^(public domain|pd([- ]|$)|cc0|cc[- ]by(-sa)?([- ]|$)|cc zero|attribution)/.test(s)
}
export interface WdCand { qid: string; labels: string[]; b: number | null; d: number | null; human: boolean; image?: string }
/** the single Wikidata candidate that is the person: a human, name fits (folded tokens), BOTH birth and death years equal ours; none or several => null (never a guess) */
export function confidentMatch(ours: { name: string; b: number | null; d: number | null }, cands: WdCand[]): { hit: WdCand | null; why: 'ok' | 'no-years' | 'no-confident-match' | 'ambiguous' } {
  if (ours.b === null || ours.d === null) return { hit: null, why: 'no-years' }
  const want = nameTokens(ours.name).full
  if (want.length < 2) return { hit: null, why: 'no-confident-match' }
  const fits = cands.filter(c => c.human && c.b === ours.b && c.d === ours.d && c.labels.some(l => { const t = nameTokens(l).full; return want.every(x => t.includes(x)) && t.length <= want.length + 1 }))
  return fits.length === 1 ? { hit: fits[0]!, why: 'ok' } : { hit: null, why: fits.length ? 'ambiguous' : 'no-confident-match' }
}
/** Commons thumbnail URL on upload.wikimedia.org from the file name and its hash dir (`h` = «a/ab»; md5 of the underscored name, computed at build) */
export function thumbUrl(file: string, h: string, width = 240): string {
  const f = file.replace(/ /g, '_'), ext = f.split('.').pop()!.toLowerCase()
  const suffix = ext === 'svg' ? '.png' : /^tiff?$/.test(ext) ? '.jpg' : ''
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h}/${encodeURIComponent(f)}/${width}px-${encodeURIComponent(f)}${suffix}`
}
export const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`

// ── mentions inside texts (owner: «…є впевненість додавай посилання на постать клікабельну в текст») ───────────────────
export interface NameForm { person: string; form: string; kind: 'full' | 'initials' | 'alias' | 'surname' }
export interface MentionCtx { date: [number, number]; region?: string; author?: string; text?: string }
export interface Mention { s: number; e: number; p: string; why: string }
export interface MentionIndex {
  /** folded surname -> persons having it */
  bySurname: Map<string, Person[]>
  /** folded full-name token string -> persons (full names and aliases) */
  byFull: Map<string, { p: Person; kind: 'full' | 'alias' }[]>
  common: (lower: string) => boolean
}
const SUFFIX = ['', 'а', 'у', 'ові', 'ом', 'і', 'ем', 'е', 'єві', 'ю', 'ою', 'ою', 'ої', 'ий', 'ого', 'ому', 'им', 'ім']
export function inflections(surname: string): string[] {
  const s = surname, out = new Set([s])
  const add = (stem: string, ends: string[]) => ends.forEach(e => out.add(stem + e))
  if (/(ий|ій|ой)$/.test(s)) add(s.slice(0, -2), ['ий', 'ого', 'ому', 'им', 'ім', 'ій', 'ої', 'ою', 'а', 'у'])
  else if (/о$/.test(s)) add(s.slice(0, -1), ['о', 'а', 'у', 'ові', 'ом', 'і', 'е'])
  else if (/а$/.test(s)) add(s.slice(0, -1), ['а', 'и', 'і', 'у', 'ою', 'о'])
  else if (/я$/.test(s)) add(s.slice(0, -1), ['я', 'і', 'ї', 'ю', 'єю', 'е'])
  else add(s, ['а', 'у', 'ові', 'ом', 'ем', 'і', 'е', 'єві', 'ю'])
  return [...out].map(x => strip(x))
}
export function mentionIndex(persons: Person[], common: (lower: string) => boolean): MentionIndex {
  const bySurname = new Map<string, Person[]>(), byFull = new Map<string, { p: Person; kind: 'full' | 'alias' }[]>()
  const push = <T,>(m: Map<string, T[]>, k: string, v: T) => { const a = m.get(k); a ? (a.includes(v) || a.push(v)) : m.set(k, [v]) }
  for (const p of persons) {
    if (p.kind !== 'person') continue
    for (const f of p.forms) {
      const t = nameTokens(f).full; if (t.length < 2) continue
      push(byFull, [...t].sort().join(' '), { p, kind: 'full' })
      const sn = surnameOf(t); if (sn) for (const inf of inflections(sn)) push(bySurname, inf, p)
    }
    for (const a of p.aliases) { const t = nameTokens(a.name).full; if (t.length >= 2) push(byFull, [...t].sort().join(' '), { p, kind: 'alias' }) }
  }
  return { bySurname, byFull, common }
}
const years = (p: Person) => `${p.birth ?? '?'}–${p.death ?? ''}`
/**
 * High-confidence mentions in `text`. Rules: capitalised tokens only; never a bare first name; a full name / documented pseudonym / initials+surname that fits ONE person is high
 * (not before the person's birth); a bare surname is high only when it is unique in the index, its lower-case form is not a common word, the text is not older than the person's
 * birth and (the witness is by this person, or it has the same home region, or the surname is not shared with any other index person).
 */
export function findMentions(text: string, ctx: MentionCtx, ix: MentionIndex): Mention[] {
  const out: Mention[] = [], re = /\p{Lu}[\p{L}’'ʼ-]*\.?/gu
  const toks = [...text.matchAll(re)].map(m => ({ s: m.index!, e: m.index! + m[0].length, t: m[0] }))
  const used = new Set<number>()
  const born = (p: Person) => p.birth === null || ctx.date[1] >= p.birth
  const take = (i: number, n: number, p: Person, why: string) => { const a = toks[i]!, b = toks[i + n - 1]!; if (!born(p)) return false; out.push({ s: a.s, e: b.e, p: p.id, why }); for (let k = i; k < i + n; k++) used.add(k); return true }
  const adjacent = (i: number) => i + 1 < toks.length && /^[\s]+$/.test(text.slice(toks[i]!.e, toks[i + 1]!.s))
  for (let i = 0; i < toks.length; i++) {
    if (used.has(i)) continue
    // two-token names: «Тарас Шевченко», «Шевченко Тарас», pseudonyms
    if (adjacent(i) && !used.has(i + 1)) {
      const a = strip(toks[i]!.t.replace(/\.$/, '')), b = strip(toks[i + 1]!.t.replace(/\.$/, ''))
      const cand = (x: string, y: string) => { const hits = new Map<Person, 'full' | 'alias'>(); for (const s of inflections(y)) { const fk = [x, s].sort().join(' '); for (const h of ix.byFull.get(fk) ?? []) hits.set(h.p, h.kind) } return hits }
      const hits = new Map<Person, 'full' | 'alias'>([...cand(a, b), ...cand(b, a)])
      if (hits.size === 1) { const [p, k] = [...hits][0]!; if (take(i, 2, p, k === 'alias' ? `псевдонім у метаданих: ${p.aliases.find(x => x.name)?.cite ?? ''}` : 'повне ім’я')) { continue } }
      // initial + surname
      const isI = (t: string) => /^\p{Lu}\.$/u.test(t)
      const sn = isI(toks[i]!.t) ? b : isI(toks[i + 1]!.t) ? a : null, ini = isI(toks[i]!.t) ? a : isI(toks[i + 1]!.t) ? b : null
      if (sn && ini) {
        const ps = (ix.bySurname.get(sn) ?? []).filter(p => p.forms.some(f => nameTokens(f).full.some(t => t[0] === ini[0]) && nameTokens(f).full.length >= 2))
        if (ps.length === 1 && take(i, 2, ps[0]!, 'ініціал + прізвище')) continue
      }
    }
    // bare surname
    const tk = toks[i]!; if (/\.$/.test(tk.t) || tk.t.length < 4) continue
    const f = strip(tk.t)
    const ps = ix.bySurname.get(f); if (!ps) continue
    if (ps.length !== 1) continue                         // shared by several persons: not linked on a bare surname
    const p = ps[0]!
    if (ix.common(f)) continue                            // a common word that equals the surname
    if (!born(p)) continue
    const near = p.birth !== null && ctx.date[1] >= p.birth + 10 && ctx.date[0] <= (p.death ?? p.birth + 90) + 60
    const own = ctx.author !== undefined && p.authorIds.includes(ctx.author), sameRegion = !!ctx.region && !!p.home && ctx.region.includes(p.home)
    if (!own && !near && !sameRegion) continue            // a bare surname needs context: the text is by this person, within his time (lifetime + 60 years), or from his region
    take(i, 1, p, own ? 'автор цього тексту' : sameRegion ? 'єдина постать з таким прізвищем у індексі; той самий регіон' : `єдина постать з таким прізвищем у індексі; текст ${ctx.date[1]} р. у межах життя й 60 років по смерті`)
  }
  return out.sort((x, y) => x.s - y.s)
}
export const mentionTip = (p: Pick<Person, 'name' | 'birth' | 'death'>, why: string) => `постать: ${p.name} (${p.birth ?? '?'}–${p.death ?? ''}) — підстава: ${why}`
export { years as lifeText }
