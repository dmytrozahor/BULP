/**
 * SPEC 63 CX-5: south and east witness regions (user 2026-10-15: «лише північні джерела? треба іще південні та східні»).
 * Same contract as pipelines/regions.ts: a modern-oblast approximation used as a drawing aid, NOT a dialect claim (SPEC 20 B-3.6).
 * Region strings of witnesses are the historic names used in the manifest (place of writing/printing, or the milieu a folk collection names on its title page).
 * ISO 3166-2:UA: UA-23 Zaporizhzhia, UA-65 Kherson, UA-48 Mykolaiv, UA-12 Dnipropetrovsk, UA-51 Odesa, UA-43 Crimea, UA-40 Sevastopol, UA-14 Donetsk, UA-09 Luhansk, UA-71 Cherkasy.
 * Kuban is NOT here: it is a historical territory outside the state border (core/territories.ts, id «kuban»).
 */
import type { Region } from './regions.ts'

export const SOUTH_EAST: Region[] = [
  { code: 'zaporizhzhia', name: 'Запоріжжя', oblasts: ['UA-23'], match: /^Запоріжжя$|^Запорозька Січ$/ },
  { code: 'khersonshchyna', name: 'Херсонщина', oblasts: ['UA-65', 'UA-48'], match: /^Херсонщина$/ },
  { code: 'katerynoslavshchyna', name: 'Катеринославщина', oblasts: ['UA-12'], match: /^Катеринославщина$/ },
  { code: 'odeshchyna', name: 'Одещина', oblasts: ['UA-51'], match: /^Одещина$/ },
  { code: 'tavriia', name: 'Таврія', oblasts: ['UA-43', 'UA-40'], match: /^Таврія$/ },
  { code: 'donechchyna', name: 'Донеччина', oblasts: ['UA-14'], match: /^Донеччина$/ },
  { code: 'luhanshchyna', name: 'Луганщина', oblasts: ['UA-09'], match: /^Луганщина$/ },
  { code: 'cherkashchyna', name: 'Черкащина', oblasts: ['UA-71'], match: /^Черкащина$/ },
]
