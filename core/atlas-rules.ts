/**
 * SPEC 63 AT-3: DIALECT_BOOK_RULES rows from the «Атлас української мови» т. 2 (data/atlas/aum2-maps.json, AT-1).
 * Pure data (core/rules.ts turns each row into a Rule with diaB). Every row: atlas map number, the questionnaire quote that
 * the extract's `quote` of that map contains, and the printed variants (OCR forms) with their settlement numbers — the
 * unit test re-checks all three against the extract, so a row cannot cite a form the atlas extract does not hold.
 *
 * Group: the volume covers the west (Волинь, Наддністрянщина, Закарпаття); the settlement list cannot be read from the OCR,
 * so no finer group is claimed: code SW (umbrella, research/04) with low weight, the point numbers stay in the note.
 */
export interface AumRow {
  id: string
  map: string
  re: RegExp
  /** fragment of the map's questionnaire quote (verbatim OCR) */
  q: string
  /** extracted variant forms (as in the extract) and a settlement number each must list */
  attested: [form: string, point: number][]
  example: string; standard: string
}
export const AUM_VOL2 = 'Атлас української мови, т. 2 (Волинь, Наддністрянщина, Закарпаття і суміжні землі), К., 1988'
export const AUM_ROWS: AumRow[] = [
  { id: 'AUM-84-HVASOLYA', map: '84', re: /^хвасол/, q: 'Квасоля чи хвасоля, чи фасоля', attested: [['хвасол\'а', 14]], example: 'хвасоля', standard: 'квасоля' },
  { id: 'AUM-86-HF', map: '86', re: /^(хфалит|хфіст)/, q: 'Хвіст.., хвалити... чи фіст.., фалити', attested: [['хфалити', 139], ['хф\'їст', 139]], example: 'хфалити', standard: 'хвалити' },
  { id: 'AUM-90-GNIPRO', map: '90', re: /^(гніпро|гмитро)$/, q: 'Дмитро, Дніпро', attested: [['Гн\'іїпіро', 394]], example: 'гніпро', standard: 'дніпро' },
  { id: 'AUM-61-ZAMUZH', map: '61', re: /^(замуж|замож)$/, q: 'заміж, діброва чи ... замуж', attested: [['замуж', 237], ['замож', 159]], example: 'замуж', standard: 'заміж' },
  { id: 'AUM-95-SC', map: '95', re: /^(гісць|тесць|гісц|тесц)$/, q: 'гість, тесть... чи гісць, тесць', attested: [['тесц\'', 83], ['гіст', 271]], example: 'тесць', standard: 'тесть' },
  { id: 'AUM-96-SCINA', map: '96', re: /^(сціна|скіна)$/, q: 'стіна, гості, щаєтя, капустяний чи... сціна', attested: [['сц\'їна', 112], ['ск\'їна', 229]], example: 'сціна', standard: 'стіна' },
  { id: 'AUM-99-SOLNECHNYK', map: '99', re: /^(сол(ов)?ечник|солнечник)$/, q: 'Соняшник', attested: [['соловечник', 35], ['сол\'нечник', 39]], example: 'соловечник', standard: 'соняшник' },
]
