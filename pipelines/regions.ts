/**
 * Witness region → ISO 3166-2:UA oblast codes, for the DWDS-style regional panel (research/07 §3.3).
 *
 * > "Regions are witness regions — NOT a dialect claim." — SPEC 20 B-3.6; plan 40 F5 labels them "регіон пам'ятки".
 *
 * The right-hand side is a modern-administrative approximation of the historic region named in the witness/author record
 * (research/04 §1 names the dialect areas by the same historic regions: Полісся, Волинь, Галичина, Слобожанщина, Лівобережжя …).
 * It is a drawing aid, so each row states what it covers; a region string that does not match any row (e.g. «Київ або Новгород»,
 * a disputed locus) is left out of the panel rather than guessed.
 */
export interface Region { code: string; name: string; oblasts: string[]; match: RegExp }

export const REGIONS: Region[] = [
  { code: 'kyiv', name: 'Київ і Київщина', oblasts: ['UA-30', 'UA-32'], match: /^Київ(щина)?( \(імовірно\)| \/ Переяслав)?$/ },
  { code: 'halychyna', name: 'Галичина', oblasts: ['UA-46', 'UA-26', 'UA-61'], match: /^Галичина|Галич( \/|$)/ },
  { code: 'volyn', name: 'Волинь', oblasts: ['UA-07', 'UA-56'], match: /^Волинь$|\/ Волинь$/ },
  { code: 'livoberezhzhia', name: 'Лівобережжя', oblasts: ['UA-74', 'UA-53', 'UA-59'], match: /^Лівобережжя$/ },
  { code: 'poltavshchyna', name: 'Полтавщина', oblasts: ['UA-53'], match: /^Полтав(а|щина)$/ },
  { code: 'chernihivshchyna', name: 'Чернігівщина', oblasts: ['UA-74'], match: /^Чернігівщина$/ },
  { code: 'slobozhanshchyna', name: 'Слобожанщина', oblasts: ['UA-63', 'UA-59'], match: /^Слобожанщина$/ },
]

/** Region code of a witness's free-text region, or undefined (unknown stays unknown, P-3.1). */
export const regionOf = (region?: string) => (region ? REGIONS.find(r => r.match.test(region.trim()))?.code : undefined)
