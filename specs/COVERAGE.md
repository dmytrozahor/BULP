# Requirement coverage (P-4.1)

Every requirement id of SPEC 00 / 10 / 20 / 30 / 40-rusyn maps to at least one test (`file › text that occurs in the test file`) or is marked `manual` with the reason.
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
| M-6 | tests/gaps.test.ts › M-6 the three data files exist; core ≤ 15 MiB holds every kept lemma, each detail shard ≤ 192 KiB |
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
