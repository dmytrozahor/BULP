/**
 * Proper names and places (SPEC 60 NP-1, NP-2; research/15). Pure: no node or DOM imports.
 *
 * > "VESUM tags prop, geo, fname, lname, pname, patr (research/02 §2): filter, not proof." — research/15 §3
 * > "Wikidata gives only coordinates and modern labels … Historical names must come from our corpus (§5) and the project's own variant table." — research/15 §6
 * > "Method [Q, reproducible]: tokens whose raw starts with a capital, strip combining marks/titlo, match a stem regex." — research/15 §1
 *
 * Gazetteer rows: QID and P625 were fetched from query.wikidata.org on 2026-10-12 (CC0); a QID is resolved by its Ukrainian label and, where several
 * Wikidata items share it, the one the chronicle context needs is chosen (`note` says so; [P] = project choice, not a source statement).
 * A stem is a regular expression over the folded key (placeKey) of a capitalised token; derived adjectives and ethnonyms fold into the city (research/15 §5 caveat).
 */
import { claim, D, type Claim, type Evidence } from './evidence.ts'
import { reverse } from './reverse.ts'

export type PlaceKind = 'city' | 'river' | 'country' | 'region'
export interface Place {
  id: string; name: string; kind: PlaceKind
  /** word-card lemma the place is linked to (it may be absent from the lexicon) */
  lemma: string
  qid: string
  /** P625 as [lat, lon] */
  pt: [number, number]
  /** a river has two P625 points (source, mouth) */
  line?: [[number, number], [number, number]]
  stem: string
  note?: string
}

const wd = (name: string, kind: PlaceKind, qid: string, lat: number, lon: number, stem: string, extra: Partial<Place> = {}): Place =>
  ({ id: qid, name, kind, lemma: name, qid, pt: [lat, lon], stem, ...extra })

export const PLACES: Place[] = [
  wd('Київ', 'city', 'Q1899', 50.45, 30.523611, '^(ки[ѧӕ]?[еє]в|кы[еє]в|ків|киї?в|кіе?в|къ?[еє]в|кїе?в|кие?в|киӕне|кине|киѧне|кыѥв|киѥв|кыїв)'),
  wd('Чернігів', 'city', 'Q157053', 51.493889, 31.294722, '^черниг|^чернігів'),
  wd('Галич', 'city', 'Q146450', 49.112778, 24.721667, '^галич(?!ан)', { note: 'Галич над Дністром; інші Q134375 (Росія), Q369732 (Словаччина) — [P] вибір за контекстом літописів' }),
  wd('Володимир', 'city', 'Q33544', 50.848056, 24.322222, '^володим', { note: 'Володимир-Волинський [P]; регулярний вираз не відрізняє міста від князя Володимира (research/15 §5)' }),
  wd('Переяслав', 'city', 'Q639839', 50.065, 31.445, '^переѧ?ӕ?сла|^переслав|^переяслав'),
  wd('Смоленськ', 'city', 'Q2337', 54.782778, 32.045278, '^смолен|^смолнѧ?'),
  wd('Новгород', 'city', 'Q2235', 58.52099, 31.27579, '^нов[ауо]?город|^новгород', { name: 'Новгород', lemma: 'Новгород', note: 'Великий Новгород (Q2235)' }),
  wd('Дніпро', 'river', 'Q40855', 55.8721, 33.7239, '^дн[іѣи]пр|^днѣпр', { line: [[55.8721, 33.7239], [46.4964, 32.2872]], note: 'ріка: два P625 (витік, гирло); на мапі — пряма лінія між ними, не русло' }),
  wd('Москва', 'city', 'Q649', 55.750556, 37.6175, '^москв|^моско'),
  wd('Україна', 'country', 'Q212', 49, 32, '^україн|^украін|^вкраїн|^вкраін|^украин|^украї', { note: 'центроїд сучасної держави (P625); історичні межі іншого змісту' }),
  wd('Чигирин', 'city', 'Q161980', 49.083333, 32.666667, '^чигирин'),
  wd('Литва', 'country', 'Q37', 55.2, 24, '^литв|^литов', { note: 'сучасна держава Q37; історична Литва (Q2419712) — окремий Q, центроїд (25, 55)' }),
  wd('Крим', 'region', 'Q7835', 45, 34, '^крим|^кримъ', { note: 'Кримський півострів (Q7835); Wikidata-мітка «Крим» належить порту Q4242882' }),
  wd('Запоріжжя', 'city', 'Q157835', 47.85, 35.1175, '^запорож|^запоріж|^запорожь', { note: 'у джерелах XVII ст. найчастіше Запорозька Січ/Низ, а не місто (research/15 §5) — [P]' }),
  wd('Львів', 'city', 'Q36036', 49.841952, 24.031592, '^львів|^лвів|^лвов|^львов|^лвови', { note: 'основа збігається з Лев/Левъ (особове ім’я)' }),
  wd('Суздаль', 'city', 'Q15757', 56.421111, 40.448889, '^соуждал|^суздал'),
  wd('Рязань', 'city', 'Q2746', 54.63, 39.7425, '^рѧзан|^рязан'),
  wd('Ростов', 'city', 'Q193342', 57.183333, 39.416667, '^ростов(?!ич)', { note: 'Ростов Великий [P]; Ростов-на-Дону (Q908) — пізніше місто' }),
  wd('Курськ', 'city', 'Q3159', 51.737222, 36.187222, '^курск'),
  wd('Туров', 'city', 'Q265670', 52.071667, 27.72972, '^туров', { name: 'Туров', lemma: 'Туров' }),
  wd('Пінськ', 'city', 'Q204150', 52.115278, 26.103056, '^пинск|^пинеск|^пінськ'),
  wd('Корсунь', 'city', 'Q219766', 49.426111, 31.280556, '^корсун', { note: 'Корсунь-Шевченківський [P]; у ПВЛ Корсунь може бути й Херсонес — не розрізняється' }),
  wd('Полтава', 'city', 'Q156747', 49.589444, 34.551389, '^полтав'),
  wd('Батурин', 'city', 'Q149016', 51.333333, 32.883333, '^батурин'),
  wd('Дорогобуж', 'city', 'Q3920582', 50.618889, 26.566389, '^дорогобуж', { note: 'Дорогобуж на Горині (Рівненщина) [P]; смоленський Q135446 — альтернатива' }),
  wd('Звенигород', 'city', 'Q2026890', 49.732778, 24.246944, '^звенигор', { note: 'Звенигород Галицький [P]; московський Q136834 — альтернатива' }),
  wd('Луцьк', 'city', 'Q7550', 50.747778, 25.324444, '^луцьк|^лучьск|^луцк|^лоуцьск'),
  wd('Полоцьк', 'city', 'Q200797', 55.483333, 28.8, '^полоцк|^полотеск|^полоч'),
  wd('Волинь', 'region', 'Q7530', 50.738889, 25.323333, '^волын|^волин', { note: 'область; «Володимер» без -ь — місто, не регіон' }),
  wd('Теребовля', 'city', 'Q1020091', 49.3, 25.7, '^теребов', { note: 'у джерелах Теребовль' }),
  wd('Перемишль', 'city', 'Q208473', 49.78345, 22.78424, '^перемы?ш'),
  wd('Царгород', 'city', 'Q16869', 41.01224, 28.976018, '^цариград|^цр҃?ьград|^царьград|^царгор|^цсарьград', { name: 'Царгород', lemma: 'Царгород', note: 'Константинополь (Q16869)' }),
  wd('Острог', 'city', 'Q140671', 50.333333, 26.516667, '^острог'),
]
export const placeById = Object.fromEntries(PLACES.map(p => [p.id, p])) as Record<string, Place>

/** Capitalised token → folded key (research/15 §1): no combining marks / titlo / superscripts, lower case, Cyrillic letters only, dotless ı removed. */
export const placeKey = (raw: string): string =>
  raw.normalize('NFC').toLowerCase().replace(/[̀-ͯ҃-҉ⷠ-ⷿ꙯-꙽]/g, '').replace(/[^а-яіїєґѣъыѥѧӕıѫ]/g, '').replace(/ı/g, '')
const isCap = (raw: string) => /^[А-ЯІЇЄҐ]/.test(raw)
const REs = PLACES.map(p => [p, new RegExp(p.stem)] as const)
/** The place a capitalised spelling belongs to (first matching stem), or undefined. */
export function placeOf(raw: string): Place | undefined {
  if (!isCap(raw)) return undefined
  const k = placeKey(raw)
  return REs.find(([, re]) => re.test(k))?.[0]
}

export const WIKIDATA = (qid: string) => `https://www.wikidata.org/wiki/${qid}`
/** The gazetteer fact is a data record (D): Wikidata P625 as fetched. */
export const placeEvidence = (p: Pick<Place, 'qid' | 'name' | 'pt'>): Evidence =>
  D('WIKIDATA', WIKIDATA(p.qid), `${p.qid} (${p.name}) P625 Point(${p.pt[1]} ${p.pt[0]})`, 'координати Wikidata (CC0); історичні написання — з корпусу, не з Wikidata')

// ── output (public/data/places.json) ─────────────────────────────────────────────────────────────
export interface PlaceVariant { raw: string; f: number; w: string; loc: string; date: [number, number] }
export interface PlaceRecon { form: string; rules: string[]; confirmed: boolean }
export interface PlaceOut extends Omit<Place, 'stem'> {
  n: number; nW: number
  /** the corpus spelling cluster (attested), most frequent first, ≤ 40; w/loc/date = the earliest witness of that spelling */
  variants: PlaceVariant[]
  /** derive() backwards from the modern name (core/reverse.ts): hypotheses (P-1.7); confirmed = an attested spelling folds to the same key */
  recon: PlaceRecon[]
  earliest?: { w: string; date: [number, number]; loc: string; raw: string }
  witnesses: { w: string; f: number }[]
}
export interface PlacesFile {
  format: 1; generated: string; N: number
  source: { coords: string; licence: string; tiles: string; attribution: string }
  places: PlaceOut[]
}

/** Accumulates capitalised tokens of admitted witnesses into per-place spelling clusters (NP-2). */
export class PlaceScan {
  private acc = new Map<string, { n: number; sp: Map<string, PlaceVariant>; w: Map<string, number> }>()
  add(w: { id: string; date: [number, number] }, tok: { raw: string; loc: string }): void {
    const p = placeOf(tok.raw); if (!p) return
    let a = this.acc.get(p.id); if (!a) this.acc.set(p.id, a = { n: 0, sp: new Map(), w: new Map() })
    a.n++; a.w.set(w.id, (a.w.get(w.id) ?? 0) + 1)
    const k = tok.raw.normalize('NFC'), v = a.sp.get(k)
    if (!v) a.sp.set(k, { raw: k, f: 1, w: w.id, loc: tok.loc, date: w.date })
    else { v.f++; if (w.date[1] < v.date[1]) { v.w = w.id; v.loc = tok.loc; v.date = w.date } }
  }
  result(): PlaceOut[] {
    return PLACES.flatMap(p => {
      const a = this.acc.get(p.id); if (!a) return []
      const all = [...a.sp.values()].sort((x, y) => y.f - x.f || x.raw.localeCompare(y.raw, 'uk'))
      const { stem: _s, ...rest } = p
      const attested = new Set(all.map(v => placeKey(v.raw).replace(/ӕ|ѧ/g, 'ѧ')))
      const recon = reverse(placeKey(p.name)).candidates.map(c => ({ form: c.form, rules: c.trace.map(t => t.rule), confirmed: attested.has(c.form) }))
        .sort((a, b) => +b.confirmed - +a.confirmed).slice(0, 8)   // confirmed first (sort is stable)
      const first = [...all].sort((x, y) => x.date[1] - y.date[1] || y.f - x.f)[0]!
      return [{ ...rest, n: a.n, nW: a.w.size, variants: all.slice(0, 40), recon, earliest: { w: first.w, date: first.date, loc: first.loc, raw: first.raw }, witnesses: [...a.w].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([w, f]) => ({ w, f })) }]
    })
  }
}

/** A place claim for the word card / map popup: value = the Wikidata QID, evidence = the coordinate record + the earliest corpus attestation (P-1.4). */
export function placeClaim(p: PlaceOut): Claim<string> {
  const ev: Evidence[] = [placeEvidence(p)]
  if (p.earliest) ev.push(D(p.earliest.w, p.earliest.loc, p.earliest.raw, `найраніша фіксація в корпусі (${p.n} токенів)`))
  return claim(p.qid, ev, { method: 'gazetteer+stem' })
}

// ── NP-1 proper-name claim ───────────────────────────────────────────────────────────────────────
export type NameKind = 'geo' | 'fname' | 'lname' | 'pname' | 'patr' | 'prop' | 'name'
const KIND_TAGS: NameKind[] = ['geo', 'fname', 'lname', 'pname', 'patr']
/** VESUM lemma tags → the proper-name kind (`prop` alone = unspecified proper noun); undefined when the lemma is not a proper noun. */
export function nameKindOf(tags: string): NameKind | undefined {
  const t = new Set(tags.split(':'))
  const k = KIND_TAGS.find(x => t.has(x))
  return k ?? (t.has('prop') ? 'prop' : undefined)
}
export const NAME_KIND_UK: Record<NameKind, string> = { geo: 'топонім', fname: 'ім’я', lname: 'прізвище', pname: 'по батькові', patr: 'по батькові', prop: 'власна назва', name: 'власна назва (модель)' }

export interface NameEvidence {
  vesum?: string                                                   // the lemma's VESUM tag line
  torot?: { w: string; loc: string; raw: string; morph: string; n: number; of: number }
  stanza?: { w: string; loc: string; raw: string; n: number; of: number }
}
/**
 * NP-1: VESUM prop/geo/fname/lname/patr → a dictionary claim (D); PROIEL `Ne` (manual TOROT annotation, D); Stanza PROPN (model output, P-1.7: only if ≥ 2 tokens and ≥ 70 % PROPN).
 * Returns undefined when nothing supports it (the card then carries no `proper` claim — P-3.1).
 */
export function properClaim(lemma: string, e: NameEvidence, vesumLoc: string): Claim<NameKind> | undefined {
  const ev: Evidence[] = [], methods: string[] = []
  let kind: NameKind | undefined
  if (e.vesum && nameKindOf(e.vesum)) { kind = nameKindOf(e.vesum); ev.push(D('VESUM', vesumLoc, `${lemma} ${e.vesum}`)); methods.push('vesum') }
  if (e.torot && e.torot.n / e.torot.of >= 0.5) { ev.push(D('TOROT', `${e.torot.w}: ${e.torot.loc}`, `${e.torot.raw} · ${e.torot.morph}`, `PROIEL «Ne» (власна назва), ${e.torot.n} з ${e.torot.of} токенів леми з розміткою`)); methods.push('proiel-Ne') }
  if (e.stanza && e.stanza.n >= 2 && e.stanza.n / e.stanza.of >= 0.7) { ev.push(D('stanza orv', `${e.stanza.w}: ${e.stanza.loc}`, `${e.stanza.raw} → PROPN`, `модельна розмітка, не словниковий факт (P-1.7); ${e.stanza.n} з ${e.stanza.of} токенів`)); methods.push('stanza-PROPN(model)') }
  if (!ev.length) return undefined
  return claim<NameKind>(kind ?? 'name', ev, { method: methods.join('+') })
}
