# Requirement coverage (P-4.1)

Every requirement id of SPEC 00 / 10 / 20 / 30 / 40-rusyn / 50 maps to at least one test (`file › text that occurs in the test file`) or is marked `manual` with the reason.
`tests/coverage.test.ts` fails if an id is missing here, if a referenced file or test text does not exist, or if an id disappears from the specs.
Sections without dotted ids (M-4, M-6, B-4, B-5, B-6) are listed under their heading id.

| id | test or manual |
|---|---|
| P-1.1 | tests/core.test.ts › rejects a claim without evidence |
| P-1.2 | tests/gaps.test.ts › quote is cut to 300 chars |
| P-1.3 | tests/core.test.ts › detector rules |
| P-1.4 | tests/core.test.ts › rule claims carry rule cite + trigger (P-1.4) |
| P-1.5 | tests/gaps.test.ts › every candidate lists the rule ids that changed it |
| P-1.6 | tests/gaps.test.ts › REPORT states the denominator convention |
| P-1.7 | tests/gaps.test.ts › a Stanza-lemma link says it is a model prediction |
| P-2.1 | tests/gaps.test.ts › a vetted author has ≥ 1 quote |
| P-2.2 | tests/build.test.ts › excluded / unverified status → refused |
| P-2.3 | tests/build.test.ts › earliest date.to wins |
| P-2.4 | tests/gaps.test.ts › 11th–13th c. authors are never labelled Ukrainian |
| P-3.1 | tests/core.test.ts › unsourced rules only hint (P-3.1) |
| P-4.1 | tests/coverage.test.ts › every id has a row |
| P-4.2 | tests/core.test.ts › detectors |
| P-4.3 | tests/gaps.test.ts › core/*.ts and pipelines/*.ts |
| P-4.4 | tests/gaps.test.ts › REPORT names the non-commercial share-alike licences |
| P-4.5 | manual — data/raw is only ever read as text or bytes by pipelines/ingest*.ts (no eval and no import of downloaded files); reviewed by reading the ingesters |
| M-1.1 | tests/gaps.test.ts › every unit declares the required fields |
| M-1.2 | tests/gaps.test.ts › every manifest author has a record |
| M-1.3 | tests/gaps.test.ts › the Kyivan-recension Church Slavonic units |
| M-1.4 | tests/gaps.test.ts › only the Archangel Gospel comes from віра.укр |
| M-2.1 | tests/ingest-old.test.ts › decodes э→ѣ, z→ѧ, U→ѹ, t→ѿ, w→ѡ |
| M-2.2 | tests/ingest-old.test.ts › editorial apparatus is removed |
| M-2.3 | tests/ingest-old.test.ts › PVL ≤ 6625 < Kyiv Chronicle |
| M-2.4 | tests/ingest-old.test.ts › morph = pos + morphology |
| M-3.1 | tests/core.test.ts › M-3.1 worked derivations |
| M-3.2 | tests/gaps.test.ts › a candidate that is not a VESUM form never becomes a link |
| M-3.3 | tests/gaps.test.ts › M-3.3 unresolved = N − linked |
| M-4 | tests/build.test.ts › every known claim re-constructs through claim() |
| M-5.1 | tests/gaps.test.ts › M-5.1 ipm = f/N·1e6 |
| M-5.2 | tests/core.test.ts › HK rounds: 76 of 3 789 654 → 16 |
| M-5.3 | tests/core.test.ts › DP: even = 0 |
| M-5.4 | tests/core.test.ts › G² is symmetric and zero for equal rates |
| M-5.5 | tests/gaps.test.ts › M-5.5 collocations |
| M-5.6 | tests/core.test.ts › smoothing keeps nulls out |
| M-6 | tests/gaps.test.ts › M-6 the three data files exist; core ≤ 15 MiB holds every kept lemma, each detail shard ≤ 256 KiB |
| B-1.1 | tests/build.test.ts › author record without evidence needs a Q authorEvidence |
| B-2.1 | tests/build.test.ts › B-2.1 ambiguity resolution order |
| B-2.2 | tests/build.test.ts › nothing → undefined (unresolved tokens are never guessed, B-2.2) |
| B-3.1 | tests/gaps.test.ts › B-3.1 each form card |
| B-3.2 | tests/build.test.ts › B-3.2 LT-only nonnormative → russianism_or_hybrid needs BOTH conditions |
| B-3.3 | manual — originClaim needs a full FormAcc/Chosen graph; its outputs are checked on the built data (tests/build.test.ts › every known claim re-constructs through claim()) and read in REPORT §5 |
| B-3.4 | tests/gaps.test.ts › B-3.4 oldest is no younger than any stored spelling |
| B-3.5 | tests/build.test.ts › B-3.5 first-attestation tie-breaks |
| B-3.6 | tests/gaps.test.ts › B-3.6 region is evidence, never a dialect label |
| B-3.7 | tests/gaps.test.ts › B-3.7 stress status is unknown |
| B-4 | tests/gaps.test.ts › B-4 ipm = f/N·1e6 over the stored N |
| B-5 | tests/build.test.ts › B-5 core / detail split |
| B-6 | tests/gaps.test.ts › REPORT has the eight sections of B-6 |
| D-1.1 | tests/core.test.ts › видѣти → видіти via R09 |
| D-1.2 | manual — attested-modern vs suggested is a UI classification (src/views/DeriveView.vue, frontend F4); the data side is the derive() candidate list verified by tests/core.test.ts › M-3.1 worked derivations |
| D-2.1 | tests/reverse.test.ts › кінь + paradigm → конь (ikavism R10), no кѣнь |
| D-2.2 | tests/reverse.test.ts › every candidate passes the round-trip (D-2.2) |
| D-2.3 | tests/reverse.test.ts › D-2.3 attested candidates rank first and are confirmed |
| D-2.4 | tests/gaps.test.ts › reverse candidates are labelled method=reconstruction |
| D-3.1 | tests/reverse.test.ts › explain(конь, кінь) = R04, R10 |
| D-3.2 | tests/reverse.test.ts › principles: ikavism supported by paradigm |
| D-4.1 | manual — UI (frontend plan 40 F4); verified by the frontend's screenshots |
| D-4.2 | manual — UI (frontend plan 40 F4) |
| D-4.3 | manual — UI route /derive (frontend plan 40 F4) |
| RU-1.1 | tests/rusyn.test.ts › specific variant label wins over the undetermined rusyn |
| RU-1.2 | tests/rusyn.test.ts › status note is neutral and cites both positions |
| RU-2.1 | tests/rusyn.test.ts › no 1919 gate, but ≥ 1850; normative forms never fire |
| RU-2.2 | tests/rusyn.test.ts › shared rows add evidence only when a RUE-/PAN- row fired |
| RU-3.1 | tests/rusyn.test.ts › быти → rusyn, no russianism_orth |
| RU-3.2 | tests/rusyn.test.ts › ambiguous ы (мы, сын, рыба, был) → ambiguous_y |
| RU-3.3 | tests/rusyn.test.ts › быть → russianism_orth |
| RU-3.4 | tests/rusyn.test.ts › э stays a russianism signal; ё with ы is vetoed by RUE-PRESOV-YO |
| RU-4.1 | tests/rusyn.test.ts › renderer quotes are paraphrases (P) |
| RU-4.2 | tests/rusyn.test.ts › every Rusyn rule cites its source (P-1.3) |
| RU-5.1 | tests/build.test.ts › lemma rusyn = best of the forms |
| EP-1.1 | tests/epoch-paradigm.test.ts › EP-1.1 split/merge keeps epochs; core has none |
| EP-1.2 | tests/epoch-paradigm.test.ts › EP-1.2 contract fixture |
| EP-1.3 | tests/epoch-paradigm.test.ts › EP-1.3 every stored form has src |
| EP-1.4 | tests/epoch-paradigm.test.ts › EP-1.4 a cell with 6 spellings |
| EP-1.5 | tests/build.test.ts › B-5 size budget over the built data |
| EP-2.1 | tests/epoch-paradigm.test.ts › torot morph wins over stanza feats |
| EP-2.2 | tests/epoch-paradigm.test.ts › EP-2.2 decoders: proiel, ud, vesum |
| EP-2.3 | tests/epoch-paradigm.test.ts › EP-2.3 / EP-2.4 underspecified → amb or dropped |
| EP-2.4 | tests/epoch-paradigm.test.ts › dual g and l → du.gl |
| EP-2.5 | tests/epoch-paradigm.test.ts › EP-2.5 every cell form yields a valid claim |
| EP-3.1 | tests/epoch-paradigm.test.ts › untagged tokens are counted, not placed |
| EP-3.2 | tests/epoch-paradigm.test.ts › shev epoch of the witness |
| EP-3.3 | tests/epoch-paradigm.test.ts › grid mismatch |
| EP-3.4 | tests/epoch-paradigm.test.ts › stanza lemma and gender disagreement → conflict |
| EP-3.5 | tests/epoch-paradigm.test.ts › modern «руки» under рука → 4 keys, amb 4, raw unfolded |
| EP-3.6 | tests/epoch-paradigm.test.ts › first ex = earliest witness |
| EP-3.7 | tests/epoch-paradigm.test.ts › N = placed + conflict + underspecified |
| EP-3.8 | tests/epoch-paradigm.test.ts › no dual loss inferred from absence |
| EP-4.1 | tests/epoch-paradigm.test.ts › EP-4.1/4.2 stem rules on old lemmas |
| EP-4.2 | tests/epoch-paradigm.test.ts › every STEM_RULES row has a Q cite |
| EP-4.3 | tests/epoch-paradigm.test.ts › stem claim evidence = rule cite + lemma record |
| EP-5.1 | tests/epoch-paradigm.test.ts › no reconstruction after shev.old |
| EP-5.2 | tests/epoch-paradigm.test.ts › рука / имя reconstructions |
| EP-5.3 | tests/epoch-paradigm.test.ts › velar alternation нога / вълкъ |
| EP-5.4 | tests/epoch-paradigm.test.ts › reconstructions carry method and cited trace |
| EP-5.5 | tests/epoch-paradigm.test.ts › confirmation only in the same cell |
| EP-5.6 | tests/epoch-paradigm.test.ts › vocative = nominative marker |
| EP-6.1 | tests/epoch-paradigm.test.ts › every MH entry has a Q cite |
| EP-6.2 | tests/epoch-paradigm.test.ts › dual column only where attested after shev.old |
| EP-6.3 | tests/epoch-paradigm.test.ts › epoch without witnesses is disabled |
| EP-6.4 | tests/ui.test.ts › EP-6.4 MH-09 is attached to pl.dat |
| EP-7.1 | tests/ui.test.ts › EP-7.1 tabs in shev order with N |
| EP-7.2 | tests/ui.test.ts › EP-7.2 epochGrid: 7 case rows |
| EP-7.3 | tests/ui.test.ts › EP-7.3 three classes, each with a text badge |
| EP-7.4 | tests/ui.test.ts › EP-7.4 an empty cell says |
| EP-7.5 | tests/ui.test.ts › EP-7.5 cell evidence |
| EP-7.6 | tests/ui.test.ts › EP-7.6 legend lists the epoch markers |
| EP-7.7 | tests/ui.test.ts › EP-7.7 / D2 / D3: model badge with out-of-domain mark |
| EP-8.1 | tests/gaps.test.ts › REPORT has the epoch-paradigm subsection with denominators |
| DD-1 | tests/dialect-dating.test.ts › a dated rule does not fire before its first attestation, and fires from it |
| DD-2 | tests/dialect-dating.test.ts › claim evidence and method list the oldest feature first, undated last |
| DD-3 | tests/dialect-dating.test.ts › the detector context carries no region |
| IP-1 | tests/ipa.test.ts › вовк: в = [w] initially before /ɔ/, [u̯] after a vowel before a consonant |
| IP-2 | tests/ipa.test.ts › Polissian (CHN): вуол -> diphthong [u̯ɔ], derived; standard is unchanged |
| IP-3 | tests/ipa.test.ts › IP-3 WordCard includes IpaRow, one IPA per stress variant with a dialect toggle |
| SX-1 | tests/syntax.test.ts › conditional «я би-м зробив»: би + clitic м → SW claim with um159 Q cite and trigger |
| SX-2 | tests/syntax.test.ts › «мні» is a weight-0 hint (not in the ЕУМ quote) |
| SX-3 | tests/syntax.test.ts › «д місту» → hint д→до, and до+dative contamination hint; never a claim |
| SX-4 | tests/syntax.test.ts › spans are char ranges into the input (for the bracket underline) |
| DV-1 | tests/derivation.test.ts › lists the prefixes of SPEC 60 DV-1 |
| DV-2 | tests/derivation.test.ts › ділати → зділати, переділати, відділати, відділатися (U-1) |
| DV-3 | tests/derivation.test.ts › DV-3 DerivativesBlock «Похідні» is included in WordCard and /derive has the prefix mode |
| MO-1 | tests/modernize.test.ts › бурян → бур'ян (§ 7 п.2, confirmed by the lexicon) |
| MO-2 | tests/modernize.test.ts › MO-2 modernize runs as the last step in /derive (old → modern) and in /analyze |
| BK-1 | tests/banks.test.ts › Zynoviiv 1705: hard ц + marked soft р give SE |
| BK-2 | tests/banks.test.ts › BankChip is wired into the word card and the annotator popover |
| MV-1 | tests/ui.test.ts › MV-1 IIIF panel shows the attribution «Saint Sophia, University of Gothenburg — CC BY-NC», lazy image, no transcription |
| MV-2 | tests/ui.test.ts › MV-2 chips link out with rel=noopener and the «джерело/проєкт» label; nothing renders without a match |
| DX-1 | tests/deictics.test.ts › segments the generic shape prefix + base + reinforcement + pointing |
| DX-2 | tests/deictics.test.ts › озьдо = о + сьде + о «ось тут» with the ЕСУМ quote (attested claim, no method) |
| DX-3 | tests/deictics.test.ts › DeicticStructure «Будова» is in the word card, the annotator popover and /analyze |
| NP-1 | tests/places.test.ts › NP-1 VESUM prop/geo/fname/lname/patr give a D-evidence claim; Stanza alone is a flagged model claim |
| NP-2 | tests/places.test.ts › NP-2 PlaceScan clusters spellings with earliest witness, adds reconstructions, and the claim has two evidences |
| NP-3 | tests/places.test.ts › NP-3 route and nav exist; Leaflet is imported dynamically (lazy chunk) with OSM attribution; word card has «на мапі» |
| HT-1 | tests/heteronyms.test.ts › every heteronym has ≥ 2 readings with distinct stress, a vowel at each position, and evidence on each reading |
| HT-2 | tests/heteronyms.test.ts › HeteronymReadings is in the word card, the word view, and the annotator flags heteronyms «наголос розрізняє значення» |
| HT-3 | tests/heteronyms.test.ts › is not a heteronym and not a reading; the unverified assertion and the one dictionary stress are both recorded |
| ET-1 | tests/etymology.test.ts › ET-1 sources are verbatim Q evidence with CC BY-SA attribution; hypotheses stay a separate empty-by-default list |
| ET-2 | tests/etymology.test.ts › ET-2 ЕСУМ via goroh: ≤ 2 clauses verbatim, ≤ 300 chars, locator is the goroh URL; other headwords are ignored |
| ET-3 | tests/etymology.test.ts › ET-3 antedates: corpus earlier than the dictionary century; postdates only for explicit «attested» |
| LW-1 | tests/loanwords.test.ts › class A rows are exactly the near-deterministic ones (≥ 90 % one donor, n ≥ 10, or all 5 of -дло) |
| LW-2 | tests/loanwords.test.ts › університет: the label (de, en.wiktionary quote) is the answer; the -ітет rule agrees (no conflict) |
| LW-3 | tests/loanwords.test.ts › екстремітет: hypothesis only — no claim, no label, flagged as a hypothetical form |
| UL-1 | tests/usage.test.ts › UL-1 VESUM slang/arch/vulg/obsc and Wiktionary categories give claims; each carries D evidence with a locator and the CC BY-SA note |
| NW-7 | tests/songs.test.ts › NW-7 lyrics policy: authored songs carry at most 2 quoted lines, never audio; the licence tag matches |
| FX-1 | tests/fx.test.ts › a pronoun / conjunction never links to a common noun; a noun does |
| FX-2 | tests/fx.test.ts › азъ → я (pronoun), not the modern noun аз; мене/мною/мнѣ under я |
| FX-3 | tests/fx.test.ts › same witness and date: the commoner spelling is the first attestation (мя vs ми case) |
| FX-4 | manual — build, data:publish and push are release steps (build:data budgets are enforced by tests/gaps.test.ts › M-6; data branch by tests/data-branch.test.ts) |
| FX-5 | tests/fx.test.ts › paradigm kind by POS |
| FX-6 | tests/fx.test.ts › FX-6: real nouns place most tagged tokens in cells |
| FX-8 | tests/epoch-pron.test.ts › tokens are PLACED in the pron grid, not conflicted |
| BL-18 | tests/songs-bl18.test.ts › BL-18 folk songs and максимовичівка |
| BL-6c | tests/formstats-bl6c.test.ts › BL-6c true form counts |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 V2/V1: кінь [kinʲ] → ZAK/HUT/LEM/WPL monophthong [kunʲ], CHN/WPL-N diphthong [ku̯inʲ]; unchanged without paradigm |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 applicableDialects: кінь → ZAK, CHN, WPL …, not MDN/BOY/POD; a word with no feature → none |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 every research/27 origin row has codes, a cite and (except G12) a verbatim [Q] quote |
| FX-7 | manual — stress reaches the data (build writes stress-request.json, runs nlp/stress.py via UV_BIN, merges per B-3.7, warns on a stale stress.json); tests/gaps.test.ts › B-3.7 stress status is unknown |
| BL-11 | tests/ingest-dict.test.ts › BL-11 dictionary headwords from OCR djvu text |
