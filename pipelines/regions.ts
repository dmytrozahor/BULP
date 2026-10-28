/**
 * Witness region → ISO 3166-2:UA oblast codes, for the DWDS-style regional panel (research/07 §3.3).
 *
 * > "Regions are witness regions — NOT a dialect claim." — SPEC 20 B-3.6; plan 40 F5 labels them "регіон пам'ятки".
 *
 * The right-hand side is a modern-administrative approximation of the historic region named in the witness/author record
 * (research/04 §1 names the dialect areas by the same historic regions: Полісся, Волинь, Галичина, Слобожанщина, Лівобережжя …).
 * It is a drawing aid, so each row states what it covers; a region string that does not match any row — a disputed or composite locus such as
 * «Київ або Новгород», «Галич / Волинь» (one chronicle, two regions) or «Галичина / Афон» (the author wrote on Mount Athos) — is left out of the panel
 * rather than guessed (P-3.1). Oblasts may belong to several rows (Лівобережжя ⊃ Чернігівщина, Полтавщина): a witness is counted in ONE row only.
 * Oblast codes: ISO 3166-2:UA (UA-30 Kyiv city, UA-32 Kyiv, UA-46 Lviv, UA-26 Ivano-Frankivsk, UA-61 Ternopil, UA-07 Volyn, UA-56 Rivne,
 * UA-74 Chernihiv, UA-53 Poltava, UA-59 Sumy, UA-63 Kharkiv).
 */
import { TERRITORIES } from '../core/territories.ts'
import { SOUTH_EAST } from './regions-cx.ts'
import { PLACE_RULES, placeById, placeOf } from '../core/witness-place.ts'
import { PLACE_FACTS } from '../core/place-gazetteer.ts'
export interface Region { code: string; name: string; oblasts: string[]; match: RegExp }
/** SPEC 63 MP-2: the historical Ukrainian territories (core/territories.ts) are valid witness regions, counted per territory; `oblasts` = their polygon code in public/geo/historical.json. */
const HISTORICAL: Region[] = TERRITORIES.map(t => ({ code: t.id, name: ` (історична територія)`, oblasts: [t.code], match: t.match }))

const NEVER = /(?!)/   // rows that only a PLACE can fill (SPEC 63 LB-10): no region string names them

/**
 * SPEC 63 LB-10: oblasts without a historical-region row above get an oblast-level row, named after the oblast, so that a witness printed in Вінниця / Ужгород /
 * Чернівці / Кропивницький / Суми / Кам'янець-Подільський counts in a Ukrainian region (the place is the witness region, FD-2). ISO 3166-2:UA of the oblast = the Wikidata P300 of core/place-gazetteer.ts.
 */
const OBLAST_ROWS: Region[] = [
  { code: 'sumshchyna', name: 'Сумщина (Сумська обл.)', oblasts: ['UA-59'], match: NEVER },
  { code: 'kirovohradshchyna', name: 'Кіровоградщина (Кіровоградська обл.)', oblasts: ['UA-35'], match: NEVER },
]
/** Places outside Ukraine are not a Ukrainian region: no oblast (nothing is drawn on the map), but each city is a region of its own for dispersion. */
export const ABROAD_PREFIX = 'abroad-'
const ABROAD_ROWS: Region[] = PLACE_RULES.filter(r => !PLACE_FACTS[r.id]?.oblast).map(r => ({ code: ABROAD_PREFIX + r.id, name: `еміграція / поза Україною (${r.uk})`, oblasts: [], match: NEVER }))

export const REGIONS: Region[] = [
  { code: 'kyiv', name: 'Київ і Київщина', oblasts: ['UA-30', 'UA-32'], match: /^Київ(щина)?( \(імовірно\)| \/ Переяслав)?$/ },
  { code: 'halychyna', name: 'Галичина', oblasts: ['UA-46', 'UA-26', 'UA-61'], match: /^Галичина$|^Галич$/ },
  { code: 'volyn', name: 'Волинь', oblasts: ['UA-07', 'UA-56'], match: /^Волинь$/ },
  { code: 'livoberezhzhia', name: 'Лівобережжя', oblasts: ['UA-74', 'UA-53', 'UA-59'], match: /^Лівобережжя$/ },
  { code: 'poltavshchyna', name: 'Полтавщина', oblasts: ['UA-53'], match: /^Полтав(а|щина)$/ },
  { code: 'chernihivshchyna', name: 'Чернігівщина', oblasts: ['UA-74'], match: /^Чернігівщина$/ },
  { code: 'slobozhanshchyna', name: 'Слобожанщина', oblasts: ['UA-63', 'UA-59'], match: /^Слобожанщина$/ },
  // SPEC 63 HV-6: regions named by the НТШ records' own footers (county → region, harvest/hv6-places.ts); Закарпаття UA-21, Буковина (північна) UA-77, Поділля UA-05 + UA-68
  { code: 'zakarpattia', name: 'Закарпаття', oblasts: ['UA-21'], match: /^Закарпаття$/ },
  { code: 'bukovyna', name: 'Буковина', oblasts: ['UA-77'], match: /^Буковина$/ },
  { code: 'podillia', name: 'Поділля', oblasts: ['UA-05', 'UA-68'], match: /^Поділля$/ },
  ...SOUTH_EAST,   // SPEC 63 CX-5
  ...HISTORICAL,
  ...OBLAST_ROWS,
  ...ABROAD_ROWS,
]

/** ISO 3166-2:UA oblast → region row: the row with the fewest oblasts that lists it (Полтава → Полтавщина, not Лівобережжя), except that a row listing several oblasts is never narrower than its own list */
const ONLY = REGIONS.filter(r => r.oblasts.length && !r.oblasts[0]!.startsWith('HT-'))
export const regionOfOblast = (iso: string): string | undefined => ONLY.filter(r => r.oblasts.includes(iso)).sort((a, b) => a.oblasts.length - b.oblasts.length)[0]?.code
/** SPEC 63 LB-10: the region of a place (core/witness-place.ts): its oblast's row inside Ukraine, «еміграція / поза Україною (<місто>)» outside */
export const regionOfPlaceId = (id: string): string | undefined => { const o = PLACE_FACTS[id]?.oblast; return o ? regionOfOblast(o.iso) : placeById[id] ? ABROAD_PREFIX + id : undefined }

/** Region code of a witness's free-text region (a historic region name, or — LB-10 — the ONE place it names), or undefined (unknown stays unknown, P-3.1). */
export const regionOf = (region?: string) => {
  if (!region) return undefined
  const named = REGIONS.find(r => r.match.test(region.trim()))?.code
  if (named) return named
  const p = placeOf(region)
  return p ? regionOfPlaceId(p.id) : undefined
}
