/**
 * SPEC 63 CP-1 — the card-parity matrix (owner 2026-10-21: «all features of ours should be implemented on each word card»). Pure data: card kind × feature block.
 * `shown`   the block renders on this card kind (through the component named in BLOCKS, reused from the full card, never copied);
 * `empty`   shown, and collapsed with an honest empty state when the data is absent (never fabricated);
 * `build`   the data exists upstream but the build does not emit it for this kind: a CP-n build item in specs/63;
 * `pending` the block is being built by another SPEC 63 step (SE sense timeline); the mount slot `<!-- SE-SLOT -->` is in the layout;
 * `na`      the data cannot exist for this kind (reason in NA).
 * tests/card-parity.test.ts walks it: every shown/empty cell's component tag must occur in the sources the kind mounts.
 */
export type Cell = 'shown' | 'empty' | 'build' | 'pending' | 'na'
export const BLOCKS = {
  chips: ['UsageChips', 'LoanChip'],              // header chips: usage / register / loan labels
  kwic: ['Kwic'],
  witnesses: ['WitnessPanel', 'WitnessBlock', 'AttestGraph'],                    // graph / список / типово
  epochs: ['EpochParadigm'],                      // клітинки за епохами
  derivation: ['DerivationSteps'],                // rule chains + rule candidates
  dialect: ['DialectBlock'],                      // FD / DV chips, class table
  map: ['RegionMap'],
  stats: ['Panel id="t-st"', 'Dots'],             // spelling stats, ipm
  stress: ['StressForms', 'renderStress'],
  etymology: ['EtymologyBlock', 'CognatesPanel'],
  senses: ['SensesBlock'],
  phrasemes: ['PhrasePanel'],
  loan: ['LoanAdaptBlock'],
  derivatives: ['DerivativesBlock', 'DimLine'],              // похідні (DV-3)
  ipa: ['IpaRow'],
  senseTimeline: ['SenseEpochs'],                 // SE «Значення за епохами» (SPEC 63 SE-5/SE-6): the sense timeline over the epochs
} as const
export type BlockId = keyof typeof BLOCKS
/** the source files whose concatenation a card kind mounts (views and the shared components they reuse) */
export const KINDS = {
  word: ['src/views/WordView.vue', 'src/components/WitnessBlock.vue'],
  form: ['src/views/FormView.vue', 'src/components/LemmaBlocks.vue'],
  light: ['src/views/LightWordView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue'],
  dict: ['src/views/LightWordView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue'],
  uv: ['src/views/UnverifiedView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue'],
  /** CV-4: a promoted unlinked group (≥ 2 vetted witnesses, no dictionary): the same view as `uv`, with the «засвідчене слово, немає в словниках» status */
  att: ['src/views/UnverifiedView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue'],
  unlinked: ['src/components/UnlinkedSpelling.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue'],
  archaic: ['src/views/ArchaicView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue'],
  name: ['src/views/TorotCardView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue'],
  orv: ['src/views/TorotCardView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue'],
  phrase: ['src/views/PhraseView.vue'],
} as const
export type KindId = keyof typeof KINDS
export const KIND_ROUTE: Record<KindId, string> = { word: '/w/:lemma', form: '/f/:form', light: '/lw/:lemma (corpus)', dict: '/lw/:lemma (dictionary-only, DO)', uv: '/uv/:id', att: '/uv/:id (attested-only, CV-4)', unlinked: '/f/:form (unlinked)', archaic: '/ar/:id', name: '/name/:id', orv: '/orv/:id', phrase: '/p/:id' }

const row = (c: Partial<Record<BlockId, Cell>>, base: Cell = 'empty'): Record<BlockId, Cell> =>
  Object.fromEntries((Object.keys(BLOCKS) as BlockId[]).map(b => [b, c[b] ?? base])) as Record<BlockId, Cell>
/** lemma-keyed blocks of LemmaBlocks that every thin kind has, plus the shared witness / map / stats panels */
const thin = { chips: 'shown', loan: 'shown', ipa: 'shown', derivatives: 'shown', senses: 'empty', etymology: 'empty', phrasemes: 'empty', kwic: 'empty', witnesses: 'empty', derivation: 'shown', dialect: 'shown', map: 'empty', stats: 'empty', epochs: 'na', stress: 'na' } as const
/** SE sense timeline: shown on every kind but the phrase page (SenseEpochs, collapsed until opened; empty state «немає даних про значення») */
const se = { senseTimeline: 'shown' } as const
export const MATRIX: Record<KindId, Record<BlockId, Cell>> = {
  word: row({ ...se, chips: 'shown', kwic: 'shown', witnesses: 'empty', epochs: 'shown', derivation: 'empty', dialect: 'shown', map: 'shown', stats: 'shown', stress: 'shown', etymology: 'empty', senses: 'empty', phrasemes: 'empty', loan: 'shown', derivatives: 'shown', ipa: 'shown' }),
  form: row({ ...thin, ...se, kwic: 'shown', witnesses: 'shown', epochs: 'shown', derivation: 'shown', map: 'shown', stats: 'shown', stress: 'shown' }),
  light: row({ ...thin, ...se, stress: 'empty', witnesses: 'empty' }),
  dict: row({ ...thin, ...se, stress: 'empty' }),
  uv: row({ ...thin, ...se }),
  att: row({ ...thin, ...se }),
  unlinked: row({ ...thin, ...se }),
  archaic: row({ ...thin, ...se }),
  name: row({ ...thin, ...se }),
  orv: row({ ...thin, ...se }),
  phrase: row({ chips: 'na', kwic: 'shown', witnesses: 'na', epochs: 'na', derivation: 'na', dialect: 'na', map: 'na', stats: 'na', stress: 'na', etymology: 'na', senses: 'na', phrasemes: 'na', loan: 'na', derivatives: 'na', ipa: 'na', senseTimeline: 'na' }),
}
/** why a cell is `na` (shown next to the matrix in specs/63 CP-1) */
export const NA: Partial<Record<KindId, string>> = {
  light: 'клітинки за епохами: у легкої картки немає парадигм VESUM із датованими формами',
  phrase: 'сторінка фразеологізму багатокомпонентна: мітки, діалект, етимологія і значення подані полями PH-1…PH-3 із джерелами; одно-лемні блоки до неї не застосовні',
}
export const cellsOf = (pred: (c: Cell) => boolean): [KindId, BlockId][] => (Object.keys(MATRIX) as KindId[]).flatMap(k => (Object.keys(BLOCKS) as BlockId[]).filter(b => pred(MATRIX[k][b])).map(b => [k, b] as [KindId, BlockId]))
