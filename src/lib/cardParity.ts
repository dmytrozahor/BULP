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
  labels: ['LabelsBlock'],                       // SPEC 63 LB-5 «Мітки»: діалект (4 класи) · регістр · тип · значення, кожне з методом і доказами
  senseTimeline: ['SenseEpochs'],
  // CP-8 (owner 2026-10-29): the rest of the card features, so that the matrix covers every feature of the card, not only the lemma-keyed panels
  overview: ['<OverviewTab'],                     // OV-11 «Огляд»: the default tab
  pronunciation: ['OvPronunciation'],             // OV-14 «Вимова»: stress + IPA in Огляд
  origin: ['data-testid="ov-origin"'],           // OV-13 «Походження»: first attestation or the honest line
  paradigm: ['<Paradigm'],                        // «Словозміна»: the VESUM table (Огляд, Форми) or the honest line
  regions: ['RegionBars'],                        // «За регіонами»: ipm per region (sidebar)
  ruFlag: ['RuBadge', 'SourceCite', '<Kwic', 'WitnessPanel'], // RF «рос. видання / джерело» on every cited line
  featureChips: ['CardRules', 'lemma-feature', 'form-feature'],  // MM-16 cited feature chips of the spelling
  variantFamily: ['VariantFamilyLine'],           // MM-29..35 variant family line
  contactForm: ['CardRules', 'contactClaims'],    // MM-36 contact form-type (суржик / язичіє / ЦС-книжна), a label of a FORM (MM-9)
  switches: ['<Spell'],                           // OV orthography + dialect switches (ViewBar is global, the card must obey them)                 // SE «Значення за епохами» (SPEC 63 SE-5/SE-6): the sense timeline over the epochs
} as const
export type BlockId = keyof typeof BLOCKS
/** the source files whose concatenation a card kind mounts (views and the shared components they reuse) */
export const KINDS = {
  word: ['src/views/WordView.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  form: ['src/views/FormView.vue', 'src/components/LemmaBlocks.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  light: ['src/views/LightWordView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  dict: ['src/views/LightWordView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  uv: ['src/views/UnverifiedView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  /** CV-4: a promoted unlinked group (≥ 2 vetted witnesses, no dictionary): the same view as `uv`, with the «засвідчене слово, немає в словниках» status */
  att: ['src/views/UnverifiedView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  unlinked: ['src/components/UnlinkedSpelling.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  archaic: ['src/views/ArchaicView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  name: ['src/views/TorotCardView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  orv: ['src/views/TorotCardView.vue', 'src/components/ThinCard.vue', 'src/components/LemmaBlocks.vue', 'src/components/WitnessBlock.vue', 'src/components/OverviewTab.vue', 'src/components/OvPronunciation.vue'],
  phrase: ['src/views/PhraseView.vue'],
} as const
export type KindId = keyof typeof KINDS
export const KIND_ROUTE: Record<KindId, string> = { word: '/w/:lemma', form: '/f/:form', light: '/lw/:lemma (corpus)', dict: '/lw/:lemma (dictionary-only, DO)', uv: '/uv/:id', att: '/uv/:id (attested-only, CV-4)', unlinked: '/f/:form (unlinked)', archaic: '/ar/:id', name: '/name/:id', orv: '/orv/:id', phrase: '/p/:id' }

const row = (c: Partial<Record<BlockId, Cell>>, base: Cell = 'empty'): Record<BlockId, Cell> =>
  Object.fromEntries((Object.keys(BLOCKS) as BlockId[]).map(b => [b, c[b] ?? base])) as Record<BlockId, Cell>
/** lemma-keyed blocks of LemmaBlocks that every thin kind has, plus the shared witness / map / stats panels */
const thin = { labels: 'shown', chips: 'shown', loan: 'shown', ipa: 'shown', derivatives: 'shown', senses: 'empty', etymology: 'empty', phrasemes: 'empty', kwic: 'empty', witnesses: 'empty', derivation: 'shown', dialect: 'shown', map: 'empty', stats: 'empty', epochs: 'na', stress: 'na' } as const
/** SE sense timeline: shown on every kind but the phrase page (SenseEpochs, collapsed until opened; empty state «немає даних про значення») */
const se = { senseTimeline: 'shown' } as const
/** CP-8: the card-wide features. Overview / pronunciation / switches / contact type are mounted by every kind; the rest are data-dependent (empty state with the «немає даних (перевірено: …)» line) */
const cp8 = { overview: 'shown', pronunciation: 'shown', origin: 'empty', paradigm: 'empty', regions: 'empty', ruFlag: 'empty', featureChips: 'empty', variantFamily: 'empty', contactForm: 'empty', switches: 'shown' } as const
/** historical spellings (ORV / archaic / Middle Ukrainian / unlinked text spelling): the switches respell modern words only, the card says so */
const hist = { switches: 'empty' } as const
export const MATRIX: Record<KindId, Record<BlockId, Cell>> = {
  word: row({ ...cp8, paradigm: 'shown', regions: 'shown', ...se, labels: 'shown', chips: 'shown', kwic: 'shown', witnesses: 'empty', epochs: 'shown', derivation: 'empty', dialect: 'shown', map: 'shown', stats: 'shown', stress: 'shown', etymology: 'empty', senses: 'empty', phrasemes: 'empty', loan: 'shown', derivatives: 'shown', ipa: 'shown' }),
  form: row({ ...cp8, paradigm: 'shown', regions: 'shown', ...thin, ...se, kwic: 'shown', witnesses: 'shown', epochs: 'shown', derivation: 'shown', map: 'shown', stats: 'shown', stress: 'shown' }),
  light: row({ ...cp8, ...thin, ...se, stress: 'empty', witnesses: 'empty' }),
  dict: row({ ...cp8, ...thin, ...se, stress: 'empty' }),
  uv: row({ ...cp8, ...hist, ...thin, ...se }),
  att: row({ ...cp8, ...hist, ...thin, ...se }),
  unlinked: row({ ...cp8, ...hist, ...thin, ...se }),
  archaic: row({ ...cp8, ...hist, ...thin, ...se }),
  name: row({ ...cp8, ...hist, ...thin, ...se }),
  orv: row({ ...cp8, ...hist, ...thin, ...se }),
  phrase: row({ labels: 'na', chips: 'na', kwic: 'shown', witnesses: 'na', epochs: 'na', derivation: 'na', dialect: 'na', map: 'na', stats: 'na', stress: 'na', etymology: 'na', senses: 'na', phrasemes: 'na', loan: 'na', derivatives: 'na', ipa: 'na', senseTimeline: 'na', overview: 'na', pronunciation: 'na', origin: 'na', paradigm: 'na', regions: 'na', ruFlag: 'shown', featureChips: 'na', variantFamily: 'na', contactForm: 'na', switches: 'na' }),
}
/** why a cell is `na` (shown next to the matrix in specs/63 CP-1) */
export const NA: Partial<Record<KindId, string>> = {
  light: 'клітинки за епохами: у легкої картки немає парадигм VESUM із датованими формами',
  phrase: 'сторінка фразеологізму багатокомпонентна: мітки, діалект, етимологія і значення подані полями PH-1…PH-3 із джерелами; одно-лемні блоки до неї не застосовні',
}
export const cellsOf = (pred: (c: Cell) => boolean): [KindId, BlockId][] => (Object.keys(MATRIX) as KindId[]).flatMap(k => (Object.keys(BLOCKS) as BlockId[]).filter(b => pred(MATRIX[k][b])).map(b => [k, b] as [KindId, BlockId]))
