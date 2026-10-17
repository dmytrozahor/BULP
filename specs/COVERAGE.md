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
| M-6 | tests/gaps.test.ts › M-6 the three data files exist; core holds every kept lemma under the 256 MiB sanity cap (B-5a amendment 2026-10-17: build intermediate, the site loads cd/ + ix/ parts), each detail shard ≤ 256 KiB (epochs included), lexindex under its 64 MiB sanity cap |
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
| DV-4 | tests/dv4.test.ts › DV-4 стояти, боятися, лежати: R09j gives а/я in the stative suffix, ahead of R09 |
| DV-4 | tests/dv4.test.ts › DV-4 R09 stays for every other ѣ: видіти, жінка, поїсти, ліс; the rule is lexical (R09 branch kept for the lexicon to rank) |
| DV-4 | tests/dv4.test.ts › DV-4 R09j carries a verbatim cite (Wiktionary *stojati < *stojěti) and a research file |
| DV-4 | tests/dv4.test.ts › DV-4 біл: ru бел, be бел, pl biał, cs bíl → YC-1; сіно/seno |
| DV-4 | tests/dv4.test.ts › DV-4 сидіти ~ be сядзець (YC-2), ru сидеть has no ѣ reflex row (и = и) |
| DV-4 | tests/dv4.test.ts › DV-4 стояти ~ ru стоять ~ be стаяць, лежати ~ be ляжаць: YC-3 (j / hushing), not YC-1 |
| DV-4 | tests/dv4.test.ts › DV-4 unrelated words get no label; every row has a verbatim cite |
| DV-4 | tests/dv4.test.ts › DV-4 the Відповідники panel shows the rule on the edge |
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
| BL-12 | tests/phrasemes-bl12.test.ts › BL-12 phraseme candidates › a formula repeated in 2+ old witnesses outranks a much more frequent modern bigram |
| BL-15 | tests/cognates-bl15.test.ts › BL-15 dating of a cognate › years, ranges and centuries from the cognate’s own etymology text (research/28 §4) |
| BL-15 | tests/cognates-bl15.test.ts › BL-15 dating of a cognate › a date in a «Compare …» sentence (another language) is rejected; no date → undefined |
| BL-15 | tests/cognates-bl15.test.ts › BL-15 ET-3 flag: interval logic, vernacular only, a review prompt › fires only when ours.to < every dated counterpart’s from (a 1350 witness does not antedate «14th century») |
| BL-15 | tests/cognates-bl15.test.ts › BL-15 ET-3 flag: interval logic, vernacular only, a review prompt › a Church-Slavonic-layer attestation never fires; counterparts borrowed from Ukrainian are not compared |
| BL-15 | tests/cognates-bl15.test.ts › BL-15 harvested cognates (kaikki, Proto-Slavic graph) › хата ← *xata: Polish chata and Belarusian хата are counterparts, Russian is marked borrowed (from Ukrainian) |
| BL-12b | tests/phrasemes-bl12b.test.ts › BL-12b source families and spelling variants › Sophia inscriptions are one family, pvl_* redactions one, codex pages one |
| BL-12b | tests/phrasemes-bl12b.test.ts › BL-12b source families and spelling variants › «своемоу» and «своему» (оу/ѹ, ѣ/е, jers) fold to one spelling key |
| BL-12b | tests/phrasemes-bl12b.test.ts › BL-12b source families and spelling variants › thirty Sophia inscriptions count as ONE family: nF = 1 and they no longer outrank a formula in three independent chronicles |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 V2/V1: кінь [kinʲ] → ZAK/HUT/LEM/WPL monophthong [kunʲ], CHN/WPL-N diphthong [ku̯inʲ]; unchanged without paradigm |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 applicableDialects: кінь → ZAK, CHN, WPL …, not MDN/BOY/POD; a word with no feature → none |
| BL-13 | tests/dialect-ipa.test.ts › BL-13 every research/27 origin row has codes, a cite and (except G12) a verbatim [Q] quote |
| BL-14 | tests/ikavism.test.ts › BL-14 chain: конь → кінь, R10 step = south о > о· > у· > ü > і and north о > о· > уо > уі > і, reconstruction with the Shevelov quote |
| BL-14 | tests/ikavism.test.ts › BL-14 Львів: chain from the paradigm (Львова) has the stage Львув marked не засвідчено; no attested list contains it |
| BL-14 | tests/ikavism.test.ts › BL-14 reflexes: every reflex is a Q whose verbatim quote prints the form |
| BL-14 | tests/form-classes.test.ts › BL-14 class 1: -овъ > -ів (Львовъ → Львів; gen. pl. братовъ → братів, ковалевъ → ковалів) |
| BL-14 | tests/form-classes.test.ts › BL-14 class 3: -івл- by analogy (будовля → будівля, торговля → торгівля), a lexical branch tagged R10a, not R10 |
| BL-14 | tests/form-classes.test.ts › BL-14 class 4: pleophonic і is lexically allowed (сторонъ → сторін, берегъ → беріг), the ordinary candidate stays |
| BL-14 | tests/form-classes.test.ts › BL-14 class 5: open-syllable і in кінець-type words (R10c); the plain candidate stays |
| BL-14 | tests/form-classes.test.ts › BL-14 class 6: prothesis is shown before the ikavism (окъно → вокно → вікно) |
| BL-14 | tests/form-classes.test.ts › BL-14 class 7: the trace records which jer followed (ніс < несъ: ъ; ь for the soft jer), and несла has no і |
| BL-14 | tests/form-classes.test.ts › BL-14 class 9: new ѣ (ѣ₂) is marked for the lexemes WP «Новий ять» names (камѣнь, шѣсть), not for an etymological ѣ (дѣтина, лѣсъ) |
| BL-14 | tests/form-classes.test.ts › BL-14 class 10: written ô / ê (Galician etymological orthography) read as the ikavism marker (Львôвъ → Львів, мôй → мій, кôнь → кінь) |
| BL-14 | tests/form-classes.test.ts › BL-14 class 11: prothetic и- before л/р + jer (илвовъ → Львів, ильняний → льняний, ръжа → іржа) |
| FX-7 | manual — stress reaches the data (build writes stress-request.json, runs nlp/stress.py via UV_BIN, merges per B-3.7, warns on a stale stress.json); tests/gaps.test.ts › B-3.7 stress status is unknown |
| BL-11 | tests/ingest-dict.test.ts › BL-11 dictionary headwords from OCR djvu text |
| BL-12c | tests/phrasemes-bl12c.test.ts › BL-12c content-word phrases › contentCore trims leading and trailing function words and counts content words |
| BL-12c | tests/phrasemes-bl12c.test.ts › BL-12c content-word phrases › «і син і» is not in the top list (it is kept only in the frames debug list); «вся земля» content core is kept |
| BL-15b | tests/cognates-bl15.test.ts › BL-15b informative ET-3 flags only › a pre-1300 East-Slavic flag from the cognate set is suppressed, a pre-1300 flag against a dated Polish donor claim is kept |
| BL-15b | tests/cognates-bl15.test.ts › BL-15b informative ET-3 flags only › a dating whose wording is East Slavic / Proto-Slavic does not count; an Old East Slavic donor is no Ukrainian-specific claim; a post-1300 genuine flag stays |
| BL-1 | tests/ui.test.ts › джерело не нормативне |
| BL-2 | manual — SearchView keeps one stable input element across keyboard-language switches (f6844aa2); the IME/keyboard event cannot be simulated in SSR tests |
| BL-3 | manual — MH-nn change rows sit in a collapsed <details> in EpochParadigm.vue; tests/ui.test.ts EP-6.4 tests split the panel HTML at that spoiler |
| BL-4 | tests/numerals.test.ts › 6564 |
| BL-5 | tests/derivation.test.ts › BL-5 an existing prefix is stripped to the base verb before re-prefixing |
| BL-6 | tests/formstats.test.ts › BL-6 form statistics |
| BL-7 | tests/ui.test.ts › the grid collapses (≤ 600 px) into stacked case cards |
| BL-8 | tests/verb-paradigm.test.ts › BL-8 modern verb paradigm: робити |
| BL-9 | tests/senses.test.ts › BL-9 uk.wiktionary parser |
| BL-10 | tests/ingest-sophia.test.ts › analysis text = interpretative edition; private-use glyphs (BL-10 follow-up) |
| BL-16 | tests/nav.test.ts › BL-16 router walk: no element type is a dead end |
| BL-17 | tests/ui.test.ts › BL-17 theme tokens (light default, dark toggle) and WCAG AA contrast |
| BL-17b | tests/ui.test.ts › BL-17 theme tokens (light default, dark toggle) and WCAG AA contrast |
| BL-17c | tests/nav.test.ts › BL-17c old-letter face |
| BL-19 | tests/fx.test.ts › BL-19 а / албо / а. / á |
| BL-20 | tests/palatalization.test.ts › BL-20 second palatalization (R24) |
| UX-1 | tests/ui.test.ts › UX-1 headline and UX-2 collapsible panels each with a one-line summary |
| UX-2 | tests/ui.test.ts › UX-1 headline and UX-2 collapsible panels each with a one-line summary |
| UX-3 | tests/ui.test.ts › UX-3 placedCells counts cells with attested forms only |
| UX-4 | tests/ui.test.ts › UX-4 identical claim sets across spellings collapse into one group |
| UX-5 | tests/ui.test.ts › UX-5 the 6 most frequent spellings |
| UX-6 | tests/ui.test.ts › nav is a single non-wrapping scroll row under 700px |
| UX-7 | tests/ui.test.ts › UX-7 a word outside the lexicon gets a rule-based analysis banner in search and on the word page |
| GA-1 | manual — specs/GAPS.md is the audit document itself (re-audited by GA-2); no executable check |
| DL-1 | tests/dialect-books.test.ts › each rule cite is a Q quote from an ЕУМ article (litopys um<N>.htm) and rule ids are unique |
| DL-1 | tests/dialect-books.test.ts › the example table covers every rule:code of DIALECT_BOOK_RULES and nothing else |
| DL-1 | tests/dialect-books.test.ts › a normative VESUM hit vetoes every new row (no standard word is tagged dialectal) |
| DL-2 | tests/dialect-books.test.ts › DL-2 per dialect group: each new rule fires on its example and stays silent on the standard word |
| DL-3 | tests/dialect-books.test.ts › the a > e/i-after-soft-consonants rows are dated 1401 (XV c.) with the Shevelov quote; NDN/PKB/WPL/SYAN do not fire earlier |
| DL-3 | tests/dialect-books.test.ts › HUT ukanye is dated XIV c. (1301) and Volhynian ukanye XVI c. (1501); the dating quote joins the evidence |
| DL-3 | tests/dialect-books.test.ts › new dialect codes are named and the new groups are gated by Shevelov Q quotes |
| DL-4 | tests/dialect-books.test.ts › each lexical entry fires for its dialect(s) on its exact form and carries the book quote as the cite |
| DL-4 | tests/dialect-books.test.ts › has entries for every dialect group of the book sources, each with a Q quote, a registered source and a locator |
| DL-4 | tests/dialect-books.test.ts › Polissian rows: Arkushin (WPL) and Lysenko (MPL, CHN) entries quote the dictionary with the book locator |
| DL-5 | manual — research/31-dialect-books.md §1 logs every source with URL, access method, robots.txt/licence verdict and the sources skipped or failed; reviewed by reading it |
| DL-6 | tests/dialect-books.test.ts › DL-6 Авдеева, Словарь украинских говоров Воронежской области (2008/2012), cite-only via Сьянова 2020 › the dictionary is a registered source with both volumes and the access terms |
| DL-6 | tests/dialect-books.test.ts › DL-6 Авдеева, Словарь украинских говоров Воронежской области (2008/2012), cite-only via Сьянова 2020 › every entry: headword, one-sentence quoted gloss, village label, volume + page locator, region = a real MP territory |
| DL-6 | tests/dialect-books.test.ts › DL-6 Авдеева, Словарь украинских говоров Воронежской области (2008/2012), cite-only via Сьянова 2020 › no dialect group is asserted: the preface (p. 4) names none, so codes stay empty and no rule is generated |
| DL-6 | manual — research/31-dialect-books.md §1 logs the access search (НЭБ 403, Google Books record only, third-party PDF not opened: owner's decision) |
| DL-7 | tests/dialect-books.test.ts › DL-7 Залеський 1973 / Шило 1957: access log, no unverifiable rows › both books are logged in research/31 §1 with the route tried and the owner decision |
| DL-7 | tests/dialect-books.test.ts › DL-7 Залеський 1973 / Шило 1957: access log, no unverifiable rows › no rule or lexical entry cites a book that was not read |
| DL-8 | tests/dialect-books.test.ts › DL-8 Лукашенко–Похилевич 2006 (Північне Підляшшя): access log, nothing ingested from an unread copyrighted book › the access route and the owner decision are logged, and the target region is a real MP territory |
| DL-8 | tests/dialect-books.test.ts › DL-8 Лукашенко–Похилевич 2006 (Північне Підляшшя): access log, nothing ingested from an unread copyrighted book › no lexical entry or rule cites the edition (it was not read) |
| DL-9 | tests/dialect-books.test.ts › DL-9 Словник говірок Бузько-Інгульського межиріччя (Миколаїв, 2018): access log, nothing ingested without a locatable open copy › imprint, access search and the owner decision are logged |
| DL-9 | tests/dialect-books.test.ts › DL-9 Словник говірок Бузько-Інгульського межиріччя (Миколаїв, 2018): access log, nothing ingested without a locatable open copy › no lexical entry cites the dictionary (no copy was read) |
| AC-1 | tests/autolabel.test.ts › every table row has a verbatim meaning and the table a registered source and a locator |
| AC-1 | tests/autolabel.test.ts › articleLabels returns a verbatim slice of the article for each abbreviation and ignores look-alikes |
| AC-1 | tests/autolabel.test.ts › r2u: parseCell reads Грінченко labels from the FULL article, quote ⊂ article |
| AC-1 | tests/autolabel.test.ts › en.wiktionary sense tags → usage rows with the dataset quote + the glossary definition; unlabelled tags and non-table tags give nothing |
| AC-2 | tests/autolabel.test.ts › every stem of a gazetteer row occurs in the quote of that row (stress marks ignored) |
| AC-2 | tests/autolabel.test.ts › a region label becomes a claim carrying the article quote, the abbreviation entry of the source and the gazetteer quote |
| AC-3 | tests/autolabel.test.ts › all conditions met → a claim with the r2u quote, the VESUM absence and the Russian-dictionary verdict |
| AC-3 | tests/autolabel.test.ts › each missing condition → no claim (unknown, never a guess) |
| AC-4 | tests/autolabel.test.ts › no automatic channel imports the hand list; only the AC-5 report reads it for evaluation |
| AC-4 | tests/autolabel.test.ts › build.ts recomputes the automatic channels on every build |
| AC-5 | tests/autolabel.test.ts › analysis/auto-classification.md has coverage before/after per label type, the hand-list agreement and the tables |
| R2U-2 | tests/r2u2.test.ts › R2U-2 every r2u dictionary is a dated dictionary unit with a quoted dateCite |
| R2U-2 | tests/r2u2.test.ts › R2U-2 the Голоскевич label table quotes its own list and is wired to dictionary 11 |
| R2U-2 | tests/r2u2.test.ts › R2U-2 a Якубські headword with the leading «*» is parsed |
| R2U-2 | tests/r2u2.test.ts › R2U-2 ORTH-SYA joins the detached reflexive and folds it to modern «ся» |
| R2U-2 | tests/r2u2.test.ts › R2U-2 the real dump (when present): all pages are read, rows exist for every modelled dictionary, witnesses are noFreq |
| DP-1 | tests/dialect-pronouns.test.ts › each variant has attestations with registered source |
| DP-1 | tests/dialect-pronouns.test.ts › research/32 states the evidence, the counter-evidence and what is unknown |
| DP-2 | tests/dialect-pronouns.test.ts › prefix variants prefix every standard form, tags kept verbatim |
| DP-2 | tests/dialect-pronouns.test.ts › scope: тот gets nominative forms only |
| DP-3 | tests/dialect-pronouns.test.ts › Lemko dictionary → LEM, Boyko article → BOY |
| DP-4 | tests/dialect-pronouns.test.ts › the block is on the lemma card and every derived form links |
| DP-4 | tests/dialect-pronouns.test.ts › a derived form absent from the corpus still has a /f page |
| FD-1 | tests/dialect-pronouns.test.ts › firedRules reads the build |
| FD-2 | tests/dialect-pronouns.test.ts › FD-2/FD-3 UI: regions «засвідчено в» apart from labels |
| FD-3 | tests/dialect-pronouns.test.ts › nothing fired → empty list and the list of checked rules is non-empty |
| FD-4 | tests/dialect-pronouns.test.ts › the cell groups spellings and DP-derived variants, with chips, dating and f |
| FD-4 | tests/dialect-pronouns.test.ts › UI: table component highlights the current spelling |
| FD-5 | tests/dialect-pronouns.test.ts › ruleForms counts the lexicon forms on which a rule |
| DX-1 | tests/dialect-pronouns.test.ts › the user |
| DX-2 | tests/dialect-pronouns.test.ts › the dialect feature of an affix chip carries the affix citation |
| DX-3 | tests/dialect-pronouns.test.ts › follows «standard» to a form the literary lexicon has |
| DX-3 | tests/dialect-pronouns.test.ts › FD-4/FD-5 for deictics: the class of forms with the base там |
| SL-1 | tests/sociolect.test.ts › every listed word has a row in research/33; undocumented ones say unknown |
| SL-1 | tests/sociolect.test.ts › every process row carries source, verbatim quote and locator, and its source is registered |
| SL-2 | tests/sociolect.test.ts › parses terms (dash split outside parentheses) and abbreviations, skips captions |
| SL-2 | tests/sociolect.test.ts › public/data/sociolect.json is cite-only: ≤ 160-char glosses, locators, licence note, no page text |
| SL-3 | tests/sociolect.test.ts › the UI states «діалектна належність не встановлена» when no study claim exists |
| SL-3 | tests/sociolect.test.ts › dialect claims exist only where the study states them: quote + locator, region mapped through the AC gazetteer |
| SL-2 | tests/sociolect.test.ts › parseKroki extracts the numbered list, strict gloss pairs and the regional statement from page lines |
| SL-4 | tests/sociolect.test.ts › Plast headwords get the «пластова лексика» badge, computed from the entry (stress/case-insensitive), evidence = the quote |
| SL-4 | tests/sociolect.test.ts › VESUM presence/absence is reported; unchecked words give null |
| SL-4 | tests/sociolect.test.ts › badges render on word and form pages through ClaimBadge (evidence popover → /source card); sources are registered |
| PV-1 | tests/torot-pv.test.ts › PV-1 TOROT lemma, POS+morphology and citation-part are the token annotation |
| PV-2 | tests/torot-pv.test.ts › PV-2 ORV folds are the existing cited tables |
| PV-3 | tests/torot-pv.test.ts › PV-3 Ne tokens become name cards (/name/:id) |
| PV-4 | tests/torot-pv.test.ts › PV-4 per-witness report: link % before/after and top-50 unlinked lemmas with reasons |
| PV-5 | tests/torot-pv.test.ts › PV-5 ORV-only lemma gets a card (/orv/:id) |
| PV-6 | tests/torot-pv.test.ts › PV-6 lemmas dropped by KEEP_MIN_F get a light card /lw/:lemma |
| PV-7 | tests/torot-pv.test.ts › PV-7 nomina sacra expand with or without titlo |
| UI-1 | tests/ui-graph.test.ts › UI-1 compact header: both pages use the compact header (flex row, no heading padding), at most 3 header blocks (h1 line, first-attestation line, chips) |
| UI-1 | tests/ui-graph.test.ts › UI-1 secondary panels are accordions with counts: form page opens only KWIC / witnesses / derivation, the rest collapse and carry :count |
| UI-2 | tests/ui-graph.test.ts › UI-2 chain layout: n steps → n+1 stage nodes and n rule edges laid left to right |
| UI-2 | tests/ui-graph.test.ts › UI-2 chronology plates: no two plates overlap, arrows run chronologically, the compressed axis keeps close years apart, wide labels get wide plates |
| UI-2 | tests/ui-graph.test.ts › UI-2 legend: HTML chips with full dots and Ukrainian labels (давня / сучасна), outside the SVG so it is never clipped |
| UI-3 | tests/ui-graph.test.ts › UI-3 graph is the default: the chain renders as an SVG graph with the switch, the list is not mounted |
| UI-3 | tests/ui-graph.test.ts › UI-3 toggle switches and persists: set(list) renders the text list, is stored per panel and survives a reload; setDefault changes every panel |
| UI-3 | tests/ui-graph.test.ts › UI-3 renders without localStorage: blocked / throwing storage falls back to graph and never throws |
| UI-3 | tests/ui-graph.test.ts › UI-3 nodes link: chain stages go to /f/<form>, rule edges are buttons (open the same evidence as the list), chronology dots link to their target |
| UI-3 | tests/ui-graph.test.ts › UI-3 graphs use theme tokens only: no hard-coded colours in the graph CSS or components |
| LA-1 | tests/loan-adapt.test.ts › every rule has a registered source, a locator, a quote and a row in research/34 |
| LA-1 | tests/loan-adapt.test.ts › the Правопис quotes are verbatim paragraphs of §§ 33, 129, 133, 134 |
| LA-2 | tests/loan-adapt.test.ts › екстремітет: -ітет ← -ity, Latin/German route |
| LA-2 | tests/loan-adapt.test.ts › екстреміті: -іті ← -ity, direct English |
| LA-2 | tests/loan-adapt.test.ts › аплікейбіліті: phonetic (ей = [eɪ], § 133) + -іті |
| LA-2 | tests/loan-adapt.test.ts › аплікабіліті: graphic (a → а, лат. -abil-) + -іті |
| LA-2 | tests/loan-adapt.test.ts › всм is an abbreviation, not a loan adaptation: no rule fires |
| LA-2 | tests/loan-adapt.test.ts › the other suffix rules fire: ація, ізм, ичн-, -абельність, -абельн- |
| LA-2 | tests/loan-adapt.test.ts › normative status: VESUM present / absent / unchecked; Правопис § only where a rule cites it |
| LA-2 | tests/loan-adapt.test.ts › a standard equivalent appears only when a dictionary row gives it |
| LA-3 | tests/loan-adapt.test.ts › WordView and FormView mount the «запозичення» block; /method lists every rule with an anchor |
| PH-1 | tests/phraseme-pages.test.ts › PH-1 phraseme page components › PH-1 id is stable across case, stress and apostrophe variants and differs for other words |
| PH-1 | tests/phraseme-pages.test.ts › PH-1 phraseme page components › PH-1 syntactic pattern is computed from component POS and is unknown (undefined) when any POS is missing |
| PH-1 | tests/phraseme-pages.test.ts › PH-1 phraseme page components › PH-1 kaikki harvest quotes a gloss with source, licence and locator; a phraseme without an entry gets nothing |
| PH-1 | tests/phraseme-pages.test.ts › PH-1 phraseme page components › PH-1 built detail shards: ids are unique and every quoted statement has a source and a locator |
| PH-2 | tests/phraseme-pages.test.ts › PH-2 corpus evidence of a phraseme › PH-2 counts every occurrence, merges per century, keeps the earliest witness and caps the concordance |
| PH-2 | tests/phraseme-pages.test.ts › PH-2 corpus evidence of a phraseme › PH-2 a phraseme that is absent from the corpus has no evidence record (shown as «невідомо») |
| PH-2 | tests/phraseme-pages.test.ts › PH-2 corpus evidence of a phraseme › PH-2 component-order and lexical variants are found among the other phrasemes |
| PH-3 | tests/phraseme-pages.test.ts › PH-3 phraseme relations › PH-3 related phrasemes share a content component and are ranked by score; short function words do not relate |
| PH-3 | tests/phraseme-pages.test.ts › PH-3 phraseme relations › PH-3 /p/:id is routed and the page marks missing data as «невідомо» and scores as a model |
| UI-2 | tests/ui-graph.test.ts › UI-2 viewBox fits: it contains every plate bbox (with border and margin), the axis and its labels — nothing is clipped, also for one plate and heavy plates |
| UI-2 | tests/ui-graph.test.ts › UI-2 axis ticks: 3–6 nice year ticks for any range (single year, 38 years, nine centuries), strictly increasing |
| UI-1 | tests/ui-graph.test.ts › UI-1 panel summaries break at a word boundary with «…» and show in full as the tooltip; the CSS wraps them to 2 lines instead of cutting mid-word |
| UI-2 | tests/ui-graph.test.ts › UI-2 chain graph fits: margins on both sides, every rule label fits its edge, the date line is inside the height, epoch rows use Ukrainian names |
| NV-1 | tests/pagination.test.ts › NV-1 page size is 50 (KWIC 20) and slices are exact |
| NV-1 | tests/pagination.test.ts › NV-1 ?p= is clamped: junk, zero, negative and too large fall back into 1..pages |
| NV-1 | tests/pagination.test.ts › NV-1 the control window is «‹ 1 2 3 … 9 ›»: first, last and neighbours, gaps as … |
| NV-1 | tests/pagination.test.ts › NV-1 every long list uses the shared Pagination and the page lives in the URL (?p=) |
| NV-1 | tests/pagination.test.ts › NV-1 the pager is mobile-friendly: wraps in a row and the controls are buttons with aria labels |
| NV-2 | tests/pagination.test.ts › NV-2 a lemma of the lexicon → /w/:lemma |
| NV-2 | tests/pagination.test.ts › NV-2 a spelling the lexicon attests → /f/:form?lemma= |
| NV-2 | tests/pagination.test.ts › NV-2 a rare VESUM lemma → /lw/:lemma, anything else → /f/:form (never a dead end) |
| NV-2 | tests/pagination.test.ts › NV-2 «Аналіз слова» links the input, the normalised form, each candidate and each chain stage |
| OR-1 | tests/ocirc.test.ts › OR-1 research and evidence of every reading › OR-1 research/36 exists and answers the user hypothesis (у, ю, ü) with sources and the unknowns |
| OR-1 | tests/ocirc.test.ts › OR-1 research and evidence of every reading › OR-1 every reading carries verbatim evidence (quote ≤ 300 chars, locator, kind Q) and a period; ю is not an ô reading |
| OR-1 | tests/ocirc.test.ts › OR-1 research and evidence of every reading › OR-1 the regions are dialect codes of the IPA machinery (or GAL = orthography) |
| OR-2 | tests/ocirc.test.ts › OR-2 possible readings and IPA variants › OR-2 ô is recognised in precomposed and combining form; plain words have none |
| OR-2 | tests/ocirc.test.ts › OR-2 possible readings and IPA variants › OR-2 пôшовъ gets the readings і, у, ü, уо, и, ы each with its spelling and derived IPA; no ê readings |
| OR-2 | tests/ocirc.test.ts › OR-2 possible readings and IPA variants › OR-2 ê spellings get the ê readings including the [ʲу] one (матêрью → і / іе / ю) |
| OR-2 | tests/ocirc.test.ts › OR-2 possible readings and IPA variants › OR-2 the form page lists the panel and the picker only for ô/ê spellings |
| OR-3 | tests/ocirc.test.ts › OR-3 derivation branches from the marked etymological о › OR-3 пôшовъ: ô → о, branches south (о·, у, ü, і) and north (о·, уо, уі, і), reconstruction not attested |
| OR-3 | tests/ocirc.test.ts › OR-3 derivation branches from the marked etymological о › OR-3 ê → е chains; spellings without ô/ê have no branches; renderReading keeps other Maksymovych folds |
| PV-8 | tests/torot-pv.test.ts › PV-8 non-TOROT witnesses: cited OES folds |
| MU-1 | tests/mu-fold.test.ts › MU-1 every rule cites a read source with a locator, and its quote is in research/35 |
| MU-2 | tests/mu-fold.test.ts › MU-2 fold engine: enclitic split + past -л → -в, the chain is shown through foldById |
| MU-2 | tests/mu-fold.test.ts › MU-2 a candidate links only through VESUM with the analysis the rule states (POS / case gate) |
| MU-2 | tests/mu-fold.test.ts › MU-2 rules: loc. pl. -ех, gen. pl. -ов, short participle -ен, uncontracted -оє/-ії; proper nouns and participles are excluded where stated |
| MU-2 | tests/mu-fold.test.ts › MU-2 spelling and sound folds (кг, -ск-, е/о → і, -ніє → -ння) run in the second pass and are checked by VESUM; closed-syllable о → і is restricted; names and 1st-person verbs are refused |
| MU-3 | tests/mu-fold.test.ts › MU-3 capitalised unresolved tokens (not paragraph-first, never written lower-case) get name cards with basis capitalisation |
| MU-3 | tests/mu-fold.test.ts › MU-3 report: link % before/after per witness, rules fired, reasons for the remainder |
| MU-3 | tests/mu-fold.test.ts › MU-3 the generated report (analysis/middle-ukr-extraction.md) and its baseline exist and show a gain for Величко 1720 |
| AR-1 | tests/archaic.test.ts › AR-1 a dictionary header line becomes a lemma card: headword, variants, part of speech and brackets from the line itself, quote + locator |
| AR-1 | tests/archaic.test.ts › AR-1 /ar/:id is routed and the card marks missing data as «невідомо»/«не зафіксовано» |
| AR-2 | tests/archaic.test.ts › AR-2 every unresolved corpus token whose spelling equals a dictionary variant links to the lemma (ref a:<id>); dictionary words that VESUM knows are not archaic |
| AR-3 | tests/archaic.test.ts › AR-3 dictionary-backed lemmas are always kept; recurring unresolved clusters (≥ 3) become labelled unverified candidates; counts per epoch |
| PV-8 | tests/torot-pv.test.ts › PV-8b cited OES endings: gen. -аго, long -ыи, aorist / imperfect with stem agreement and the quoted sources in research/37 |
| GZ-1 | tests/gz.test.ts › GZ-1 ordinary VESUM forms are never bare words › an unresolved token whose own spelling is a VESUM form (FX-3 homonym loser: мати noun vs verb, раз noun vs adverb) gets a light-card ref; linked, ref-holding, non-uk and non-VESUM tokens do not |
| GZ-1 | tests/gz.test.ts › GZ-1 ordinary VESUM forms are never bare words › build wires it after the PV-6 light index and adds the raw spelling to the VESUM pass |
| GZ-2 | tests/gz.test.ts › GZ-2 cited Желехівка folds › every fold quotes its source statement and locator; there is no rule without one |
| GZ-2 | tests/gz.test.ts › GZ-2 cited Желехівка folds › refused for want of a source: -ою → -'ю, е/і (трівожу), и/і lexical, participles -уч- are not folded |
| GZ-3 | tests/gz.test.ts › GZ-3 report › analysis/galician-extraction.md states the GZ-1 root cause, before/after counts and the refused features |
| GZ-4 | tests/gz.test.ts › GZ-4 light cards › never say «рідкісна»; «мало засвідчена в нашому корпусі (f = n)» |
| GZ-4 | tests/gz.test.ts › GZ-4 light cards › standard ikavism gets its trace: покірність ~ покора proves о > і |
| GZ-5 | tests/gz.test.ts › GZ-5 cognates: same word vs same etymon › a borrowing / doublet with another meaning (пол. ksiądz «priest» vs «prince») is another word; a cousin with the same meaning is not; no gloss → no claim |
| GZ-5 | tests/gz.test.ts › GZ-5 cognates: same word vs same etymon › the panel lists such rows apart, with their meaning, and counts only correspondences |
| LA-4 | tests/loan-adapt.test.ts › -ція, -інг, -мент, -ізувати, -іст fire with their source suffix |
| LA-4 | tests/loan-adapt.test.ts › -ація still wins over -ція; every new rule has quote, locator and registered source |
| LA-4 | tests/loan-adapt.test.ts › agentive -ер fires only when the stem is itself a word (ліфтер yes, тепер no) |
| LA-4 | tests/loan-adapt.test.ts › no calque equivalent is asserted without a dictionary row (застосовність for аплікабельність has none) |
| MP-1 | tests/territories.test.ts › MP-1 every territory named in the spec is present with ≥ 1 verbatim IEU quote and a locator; unseen ones are reported, not guessed |
| MP-1 | tests/territories.test.ts › MP-1 historical.json: every territory has an outline inside the map frame, the Natural Earth licence is noted, the file is small |
| MP-1 | tests/territories.test.ts › MP-1 Кубань lies east of the Azov Sea and Берестейщина west of 28°E; Кубань reaches the frame the ukr-oblasts layer does not |
| MP-2 | tests/territories.test.ts › MP-2 each territory is a REGIONS row (polygon code in oblasts) and a witness region string matches it |
| MP-2 | tests/territories.test.ts › MP-2 dialect group only through the AC gazetteer and only where a source states the area: Берестейщина → WPL, Лемківщина → LEM, Білгородщина/Воронежчина → SLB; Кубань, Курщина unknown |
| MP-2 | tests/territories.test.ts › MP-2 drawn dashed with the label «історична українська територія», source on tap; legend explains modern vs historical borders |
| MP-3 | tests/territories.test.ts › MP-3 no hard-coded colours in MapView / RegionMap; map tokens exist for light and dark |
| MP-3 | tests/territories.test.ts › MP-3 zoom keeps the pointed place fixed, clamps to the frame, pans and resets |
| MP-3 | tests/territories.test.ts › MP-3 360 px: touch targets ≥ 44 px, page scrolls at zoom 1 (touch-action: pan-y) and the map takes the gesture once zoomed; pinch, drag, wheel and keys are wired |
| MD-1 | tests/modern.test.ts › covers every candidate source named in the spec with a decision, and separates allowed from owner-decision |
| MD-1 | tests/modern.test.ts › quotes the access terms (robots / ToS / licence) and says how each item is dated |
| MD-1 | tests/modern.test.ts › nothing from section (b) is fetched by the pipelines |
| MD-2 | tests/modern.test.ts › a candidate needs f ≥ 3, ≥ 2 sources and absence from VESUM |
| MD-2 | tests/modern.test.ts › witnesses are typed (web / social / slang-dictionary) and dated: HPLT crawl month, Wiktionary entry month, UberText unknown |
| MD-2 | tests/modern.test.ts › LA types the candidate: сторітелінг fires the cited -інг rule; no hand list |
| MD-2 | tests/modern.test.ts › vocabulary only: an entry holds counters, dates and locators, never running text or URLs of pages |
| MD-2 | tests/modern.test.ts › uk.wiktionary categories and the gloss extractor: first «#» line, markup stripped, ≤ 160 chars |
| MD-2 | tests/modern.test.ts › real data: candidates satisfy the thresholds, dates are YYYY-MM, sources are registered |
| MD-3 | tests/modern.test.ts › «сучасний сленг», «ІТ-жаргон» and «неологізм (з року)» with the first-attestation date and a claim with evidence |
| MD-3 | tests/modern.test.ts › an unlisted word has no badge; a corpus-only unknown date is stated, not invented |
| MD-3 | tests/modern.test.ts › the date kind is spelled out: crawl is not publication, entry is not first use |
| MD-3 | tests/modern.test.ts › the report counts distinct words per source and per first-attestation year |
| MD-3 | tests/modern.test.ts › the badges are wired into the word and form pages |
| NV-3 | tests/unlinked.test.ts › NV-3 the accumulator keeps count, witness count and at most 3 witnesses with token indexes |
| NV-3 | tests/unlinked.test.ts › NV-3 only word tokens are indexed (no digits or punctuation) |
| NV-3 | tests/unlinked.test.ts › NV-3 a KWIC line is cut around the token index from the text shard |
| NV-3 | tests/unlinked.test.ts › NV-3 the lookup finds an indexed spelling through the injected shard fetch |
| NV-3 | tests/unlinked.test.ts › NV-3 /f/:form for a spelling no lemma owns renders the «незв’язане написання» page, never «немає в корпусі» |
| NV-3 | tests/unlinked.test.ts › NV-3 the analyser says «сторінка слова» only for a lemma / light card, else «сторінка написання» |
| NV-3 | tests/unlinked.test.ts › NV-3 the index has a build script (data:unlinked) |
| NV-3 | tests/unlinked.test.ts › NV-3 the Сумцов «Слобожане» 1918 page: «призвичкою» and every other word token leads to a page with content |
| NV-3 | tests/unlinked.test.ts › NV-3 every text shard word token is a lexicon spelling or in the unlinked index (all witnesses) |
| NV-4 | tests/attest.test.ts › NV-4 the term locator is parsed: row ref, quote and the quoted ru | cs | de equivalents |
| NV-4 | tests/attest.test.ts › NV-4 lookup is case-insensitive: Приборниця = приборниця = ПРИБОРНИЦЯ |
| NV-4 | tests/attest.test.ts › NV-4 the build makes a card of an unlinked term-list headword and refs its text tokens; a VESUM-linked token keeps its lemma |
| NV-4 | tests/attest.test.ts › NV-4 the card shows the badge «технічний термін <рік>», the quoted equivalents and a case-insensitive id |
| NV-4 | tests/attest.test.ts › NV-4 a dictionary headword form → «засвідчено: <пам’ятка, дата>» with the card link (any letter case) |
| NV-4 | tests/attest.test.ts › NV-4 a form found nowhere stays unattested (the «гіпотеза» label is only for such rule outputs) |
| NV-4 | tests/attest.test.ts › NV-4 a spelling that occurs only in a text (unlinked index) is attested too, linking its spelling page |
| NV-4 | tests/attest.test.ts › NV-4 AnalyzeView renders the «засвідчено» badge before the «реконструкція (гіпотеза)» one |
| NV-4 | tests/attest.test.ts › NV-4 every unlinked headword of mtt1925 has an archaic.json card with its equivalents and the text token refs it |
| NV-5 | tests/unlinked.test.ts › NV-5 prefix sharding: every key lands in exactly one leaf, found again through the manifest; nothing is dropped |
| NV-5 | tests/unlinked.test.ts › NV-5 unlinked/ travels on the data branch (DIRS) and is ignored by git like ix/ and uv/; budgets are per leaf + manifest + sane total |
| NV-5 | tests/unlinked.test.ts › NV-5 the built index: total within budget, every leaf ≤ hard gz limit, every manifest small and consistent |
| HV-1 | tests/harvest.test.ts › HV-1 an item batch is written as items/<file>.gz with an index line; a new run sees it as done |
| HV-1 | tests/harvest.test.ts › HV-1 a torn last index line (killed mid-write) does not break the resume |
| HV-1 | tests/harvest.test.ts › HV-1 the launcher starts hidden detached processes, writes pids.json and logs; the status script reports items/bytes/alive |
| HV-1 | tests/harvest.test.ts › HV-1 pacing: r2u 10 s, wikis/archive ≥ 2 s; r2u/ stops on 403/429/5xx, the cap is 2 GB by default |
| HV-1 | tests/harvest.test.ts › HV-1 DECISIONS-NEEDED lists pisni.org.ua (robots Disallow /), Reddit, YouTube and modern lyrics with the reason |
| HV-2 | tests/harvest.test.ts › HV-2 wikisource: the {{заголовок}} header gives author/year/place; categories «Роботи NNNN» are the fallback date |
| HV-2 | tests/harvest.test.ts › HV-2 wikipedia/wiktionary: wikitext → plain words, vocab-only, rue region, date = touched (terminus ante quem) |
| HV-2 | tests/harvest.test.ts › HV-2 archive.org: presets are PD-dated (≤ 1925; Грушевський ≤ 1934), doc → index item with date/author/region/ocr flag |
| HV-2 | tests/harvest.test.ts › HV-2 gramoty: document links, date and word-split transcription; tagged comparative East Slavic, vocab-only |
| HV-2 | tests/harvest.test.ts › HV-2 poets (ukrlib): ≥ 30 poets of the 1980s–2000s incl. Андрухович, Бу-Ба-Бу, Лугосад; only form counts + a ≤ 2-line quote are produced |
| HV-2 | tests/harvest.test.ts › HV-2 Лукаш «Фауст»: ukrlib pagination found, translation 1955 witness metadata, vocabulary only |
| HV-2 | tests/harvest.test.ts › HV-2 Грушевський: izbornyk volume pages found, volume from the file name, first-edition years 1923–1927 |
| HV-3 | tests/harvest.test.ts › HV-3 dates: «1380-1400», «1893-05-01», archive timestamps; no year → null (undated works are not ingested) |
| HV-3 | tests/harvest.test.ts › HV-3 OCR rules and language gate: Cyrillic-only tokens kept, Latin/digit/mixed dropped as unmapped, Russian lines dropped as apparatus |
| HV-3 | tests/harvest.test.ts › HV-3 end to end on a synthetic archive dump: witness with date/licence/author/region from the index, OCR rules applied; vocab-only sources give counts only |
| HV-4 | tests/harvest.test.ts › HV-4 the work list: 5 prints 1596/1596/1619/1627/1653, each with date, place, author, PD licence and an archive.org item; the 1961/1964/1979 Німчук editions are not in it |
| HV-4 | tests/harvest.test.ts › HV-4 an item is stored as one gz with its index line (date/author/region/ocr); a second run skips it (resumable, idempotent) |
| HV-4 | tests/harvest.test.ts › HV-4 harvest:ingest turns the hv4 dump into a vocabulary-only file (family middle-ukrainian-church-slavonic, dated items, no running text) |
| PL-1 | tests/dialect-books.test.ts › PL Polissian dialects: ЕУМ-cited diphthongs, [е]/[и], [гі]/[кі]; akanye only where a source attests it › every PL row cites its own ЕУМ article (um155 East, um161 North, um168 West) with a verbatim quote that contains its example |
| PL-2 | tests/dialect-books.test.ts › PL Polissian dialects: ЕУМ-cited diphthongs, [е]/[и], [гі]/[кі]; akanye only where a source attests it › gates: the rows are undated (no dating quote), so the blanket 1798 applies; the group gates (CHN 1501, WPL 1301) lie below it |
| PL-2 | tests/dialect-books.test.ts › PL Polissian dialects: ЕУМ-cited diphthongs, [е]/[и], [гі]/[кі]; akanye only where a source attests it › no row claims akanye, hard р or ы for MPL/WPL: ЕУМ um167/um168 attest none of them; the only akanye rows are CHN (um155) and SLB (um169) |
| SV-1 | tests/dialect-books.test.ts › SV southern dialect vocabularies: access log, nothing ingested without a readable institutional copy › Чабаненко, Москаленко (Одещина) and the Одещина/Таврія/Запоріжжя search are logged with the owner decision |
| SV-2 | tests/dialect-books.test.ts › SV southern dialect vocabularies: access log, nothing ingested without a readable institutional copy › no lexical entry cites a southern dictionary (no readable copy) |
| SG-1 | tests/dialect-books.test.ts › SG song «Занедбай мене, я о тя не дбаю»: identification logged, no witness without a public-domain edition › the identification attempt (folk-song category, title «Занехай ти мене», no author/edition/year found) and the owner decision are logged |
| SG-2 | manual — research/31-dialect-books.md §1 SG-2 logs the identification, the sources searched and the owner decision; reviewed by reading it |
| CV-1 | tests/cv.test.ts › CV-1 a dictionary token without a full card gets a light card with its attestation line; a full-card lemma and an /ar spelling get none |
| CV-1 | tests/cv.test.ts › CV-1 an unresolved text token whose spelling is a CV word links to the card |
| CV-1 | tests/cv.test.ts › CV-1 attestations are de-duplicated per (witness, locator) and capped, the total is kept |
| CV-1 | tests/cv.test.ts › CV-1 shards: every key lands in exactly its bucket |
| CV-2 | tests/cv.test.ts › CV-2 card map is case- and stress-insensitive and routes by kind |
| CV-2 | tests/cv.test.ts › CV-2 the analyser links a form that only a light / CV / archaic card owns |
| CV-2 | tests/cv.test.ts › CV-2 search ranks card hits like lexicon hits (exact, prefix, case-insensitive) |
| CV-2 | tests/cv.test.ts › CV-2 SearchView, LightWordView, AnalyzeView and UnlinkedSpelling are wired to the card index |
| CV-2 | tests/cv.test.ts › CV-2 запобігти, рушничний, парада, плавний |
| CV-2 | tests/cv.test.ts › CV-2 a sample of 200 random dictionary equivalents each opens a non-empty card |
| CV-3 | tests/cv.test.ts › CV-3 lookup is case-insensitive and tolerant of the Latin B of «BЮВ» and the stress capitals of «ВИшкіл»; the source spelling is kept |
| CV-3 | tests/cv.test.ts › CV-3 a Plast headword owned by a full lemma / light / archaic card gets no second card; any other gets a bare card |
| CV-3 | tests/cv.test.ts › CV-3 the Plast links go to the word card, the source card is the secondary link |
| CV-3 | tests/cv.test.ts › CV-3 вишкіл, ВПР and КВТ each open a card that carries the Plast sense (abbreviations with their expansion); every Plast entry has a card |
| YT-1 | tests/yat.test.ts › YT-1 research/42-yat.md quotes ЕУМ «Ять» (um150), Шевельов and the нігди dictionary evidence; analysis/yat-interchange.md has per-century tables |
| YT-2 | tests/yat.test.ts › YT-2 every rule has a verbatim cite and a dialect group; no rule without a source |
| YT-2 | tests/yat.test.ts › YT-2 нѣгдѣ: standard нігді from R09 (not repeated); нігди (final -ѣ > -и, зап. діал.) and нігде as labelled hypotheses |
| YT-2 | tests/yat.test.ts › YT-2 гдѣ → гди / где |
| YT-2 | tests/yat.test.ts › YT-2 дѣти: діти (R09) is the standard; no ѣ > и branch (stressed, closed syllable) |
| YT-2 | tests/yat.test.ts › YT-2 дѣтина → дитина (lexical, standard) while дѣти has no such branch |
| YT-2 | tests/yat.test.ts › YT-2 хлѣб: хліб (R09); Polissian іе and unstressed е are hypotheses |
| YT-2 | tests/yat.test.ts › YT-2 Polissian examples sourced in ЕУМ «Західнополіський говір»: лѣсъ → ліес, сѣно → сиено, тѣсто → тиесто, мѣшокъ → мишок |
| YT-2 | tests/yat.test.ts › YT-2 gates: WPL not before 1301 (Shevelov ch. 8), unstressed monophthong e not before 1501 (MPL group; own 1401), final -и has no gate |
| YT-2 | tests/yat.test.ts › YT-2 lexical dialect rules fire only on the stems the source prints |
| YT-2 | tests/yat.test.ts › YT-2 a word without ѣ has no continuants |
| YT-3 | tests/yat.test.ts › YT-3 i17_12 is a 1622 Kyiv izbornyk unit with a vetted author; modernised orthography (not a ѣ/и witness); Компаніченко is only noted, never evidence |
| CV-4 | tests/uv.test.ts › CV-4 spellings are grouped by the fold key; the headword is the most frequent spelling; all spellings, witnesses and occurrences are kept |
| CV-4 | tests/uv.test.ts › CV-4 OCR garbage is excluded: digits, Latin and mixed script, repeated letters, and spellings seen only in OCR scans |
| CV-4 | tests/uv.test.ts › CV-4 a spelling that already owns a card is skipped; an ORV card is attached by lemma or form key |
| CV-4 | tests/uv.test.ts › CV-4 shards: stable hash, prefix file = hex of the first two letters |
| CV-4 | tests/uv.test.ts › CV-4 search finds a spelling case-insensitively by exact key or prefix (≥ 2 letters), exact first; a one-letter query finds nothing |
| CV-4 | tests/uv.test.ts › CV-4 the card and the spelling→card link load through the same shards |
| CV-4 | tests/uv.test.ts › CV-4 /uv/:id is routed; search lists the unverified block AFTER the verified results, labelled «неперевірена»; the spelling page links the card |
| CV-4 | tests/uv.test.ts › CV-4 uv/ is shipped on the data branch (DIRS) and ignored by git like lex/ and cv/ |
| CV-4 | tests/uv.test.ts › CV-4 нѣгдѣ has a card with its spellings, occurrences and a search hit |
| CV-4 | tests/uv.test.ts › CV-4 no card has digits / Latin letters, and no spelling in a card also owns a verified card |
| CV-4 | tests/uv.test.ts › CV-4 the card files stay small: every file ≤ 256 KiB |
| CV-5 | tests/uv.test.ts › CV-4 нѣгдѣ gets нігди with its CITED rule YT-FIN-I (final -ѣ > -и, зап. діал.), labelled hypothesis; a word without ѣ gets none |
| CV-5 | tests/uv.test.ts › CV-4 the card, the spelling page and the analyser show the cited forms and the «гіпотеза користувача» slot (no uncited rule: the user list is empty now) |
| CV-5 | tests/uv.test.ts › CV-5 a preceding на / в / у / по / при picks the locative analysis only when exactly one analysis is a locative |
| CV-5 | tests/uv.test.ts › CV-5 риночку: both analyses get a card with all analyses listed, the context pick is stored, the example is kept |
| CV-5 | tests/uv.test.ts › CV-5 LightWordView lists all analyses and mounts ThinCard (KWIC, dialect, derivation, senses, etymology, cognates); UnverifiedView mounts it too |
| CV-5 | tests/uv.test.ts › CV-5 /lw/риночка lists риночок (v_mis) and риночка (v_zna) as analyses of the attested spelling |
| CV-4 | manual — pending: CV-4 (unlinked spellings as «неперевірена лема» cards, searchable) is being implemented; the test row replaces this line when it lands |
| PF-1 | tests/parts.test.ts › PF-1 every key lives in exactly one leaf, found by ixLeaf from the manifest alone |
| PF-1 | tests/parts.test.ts › PF-1 searchRemote returns what the in-memory search() returns for lemma / form / paradigm hits, reading only prefix shards |
| PF-1 | tests/parts.test.ts › PF-1 shards split deeper than 2 letters when they are over the limit, never past IX_MAX |
| PF-1 | tests/budget.test.ts › lexicon / lexindex / cardindex / light / archaic / torot / sidecars are never fetched whole |
| PF-1 | tests/budget.test.ts › the paged lemma list exists page by page |
| PF-2 | tests/budget.test.ts › first load (HTML + JS + CSS + data) ≤ 500 KB |
| PF-2 | tests/budget.test.ts › a word card ≤ 300 KB on top of the home page, and a deep link to it ≤ 500 KB as a first load (core + detail + witness + sidecar shards + the card route) |
| PF-2 | tests/budget.test.ts › a search keystroke ≤ 64 KB (prefix shards + the core cards of the first rows) |
| PF-2 | tests/budget.test.ts › the service worker is shipped |
| PF-3 | tests/parts.test.ts › PF-3 the paradigm facade returns the VESUM hits of the in-memory map |
| PF-3 | tests/parts.test.ts › PF-3 annotate() over the shard facades equals annotate() over in-memory maps |
| PF-3 | tests/parts.test.ts › PF-3 runDetectors / reconstruct read the same facades |
| CV-6 | tests/sn.test.ts › CV-6 specs/user-words.txt parses the owner words with their lookups |
| CV-6 | tests/sn.test.ts › CV-6 the priority queue looks every listed word up first (ukr), then the other lookups in both scopes, deduplicated |
| CV-6 | tests/sn.test.ts › CV-6 the build gets the listed words and a listed word without a card is reported |
| CV-6 | tests/sn.test.ts › CV-6 built data: every listed word has a card |
| PF-4 | tests/build.test.ts › PF-4 a lemma whose detail alone is over the shard limit goes to part files |
| PF-5 | tests/phrasemes-pf5.test.ts › PF-5 mine() keeps 250k content-word phrasemes without a call-stack overflow |
| PF-5 | tests/phrasemes-pf5.test.ts › PF-5 spanOf is min start / max end of any number of ranges |
| PF-6 | tests/phrasemes-pf6.test.ts › PF-6 maximal() equals the old quadratic filter on random fixtures (multi-word lemmas, equal-f buckets) |
| PF-6 | tests/phrasemes-pf6.test.ts › PF-6 maximal() drops a sub-gram only when the longer gram has the same f |
| PF-6 | tests/phrasemes-pf6.test.ts › PF-6 maximal() handles 1M synthetic phrasemes in seconds |
| PF-6 | tests/phrasemes-pf6.test.ts › PF-6 collectEvidence trie matches the nested prefix targets once per occurrence |
| PF-7 | tests/data-cdn.test.ts › PF-7 resolveDataUrl: big dirs go to <base>/data/<buildId>/…, everything else stays on Pages |
| PF-7 | tests/data-cdn.test.ts › routes every CDN dir |
| PF-7 | tests/data-cdn.test.ts › no build id (pointer not yet written), no pointer, or local mode: everything stays on ./data |
| PF-7 | tests/data-cdn.test.ts › the committed pointer is well-formed |
| PF-7 | tests/data-cdn.test.ts › fetchJson, useData.get and witnessText apply dataUrl at the fetch; no other src file fetches a CDN dir directly |
| PF-7 | tests/data-cdn.test.ts › dry run calls no aws and does not move the pointer or write state |
| PF-7 | tests/data-cdn.test.ts › diffObjects / verify: missing, wrong size and unexpected objects are all reported; the manifest is allowed |
| PF-7 | tests/data-cdn.test.ts › a full upload against a fake bucket verifies, writes the manifest and moves the pointer |
| PF-7 | tests/data-cdn.test.ts › a failed verify leaves the pointer alone (the live site keeps its data) |
| PF-7 | tests/data-cdn.test.ts › pruneList keeps the newest N and the live build and ignores foreign prefixes |
| PF-7 | tests/data-cdn.test.ts › pages.yml no longer pulls data and fails the build above 800 MB |
| MM-1 | tests/fx.test.ts › MM-1 preposition recognised as pronoun › «с» tagged Pk with lemma себе (PVL) → the preposition з, never the pronoun |
| MM-1 | tests/fx.test.ts › MM-1 preposition recognised as pronoun › the reflexive enclitic сѧ stays under себе |
| MM-1 | tests/fx.test.ts › MM-1 preposition recognised as pronoun › real data (after a rebuild with MM-1): the card себе lists no «с» spelling, while сѧ stays |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › PVL хомѣки (TOROT lemma хомѣкъ) → хом’як (common noun) by R09 as a listed variant хомік, not the surname «Хомік» |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › хомѧкъ derives хом’як by R02 (ѧ > ’я after a labial) and links to the same card, with the cited Wiktionary line |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › the dictionary variants хомик / хомік (Желехівський «Хоми́к», ЕСУМ) link to хом’як; a capitalised Хомік stays the surname |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › no row says «ѣ > ’а»: the table has no cognate row for хомѣкъ and no rule id of that kind |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › the lemma-less token хомѣки also links to хом’як |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › lower-case token: the surname reading is dropped when a common noun exists; a capitalised token and a surname-only token keep it |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › no uncited sound rule: the standard derivation of хомѣки still gives хоміки (no ѣ > ’а after a labial rule exists) |
| MM-2 | tests/fx.test.ts › MM-2 хомѣки: two rule-based paths (R09 → variant хомік, R02 → хом’як), no rule ѣ > ’а › real data (after a rebuild with MM-2): a хом’як card exists with the PVL spelling, and no «Хомік» card carries хомѣки |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › Нечуй-Левицький «пілки срібної одежі» (modern text) links to пілка and never to полк |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › a modernised-orthography witness labelled non-uk: «полки» stays полк (the plain spelling is a VESUM form), the fold о > і never moves it to пілка |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › PVL / Мономах «полъкы» (regiments): R10 gives пілки, but the plain chain полки is a second candidate and frequency decides (as for богъ) |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › derivation пола → пілка: *полъка (dim. -ъка) > пілка is the cited rule path R04 + R10 (о > і in the new closed syllable), no step R-id invented |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › the dim.-of-пола claim carries its dictionary quote (Уманець–Спілка «Пола́ … здр. пі́лка»); no uncited claim |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › reconstructed old spellings of пілка (полка, полъка …) are labelled reconstruction, never confirmed by an attestation unless a callback supplies one |
| MM-3 | tests/fx.test.ts › MM-3 пілки (dim. of пола) is not полки (pl. of полк «regiment») › real data (after a rebuild with MM-3): the card пілка lists no spelling of полк (полки, полъкы, полкы …) |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › promotion: a group with a TOROT lemma in ≥ 2 witnesses is «засвідчено (TOROT + N пам’яток)», not «неперевірена лема» |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › the honest label stays when no dictionary or TOROT lemma stands behind it, or only one witness has it |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › graph: ≥ 2 known witnesses give one plate each (year = composition midpoint), one witness or unknown ids give no graph |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › R17: жечи (е before ч + и) gives no жочи; the rule still fires before a hard consonant (жена > жона, пьшено > пшоно) |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › R17 reverse: жочи never gives жечи (soft ч follows), while жона still gives жена |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › r2u / Грінченко / Желехівський / Уманець harvests hold no «жечи / жещи»: the card stays TOROT-attested, no dictionary quote is invented |
| MM-4 | tests/fx.test.ts › MM-4 жечи: TOROT lemma жети in 2 witnesses is attested, shows the witness graph, and R17 (е > о) does not fire before a soft consonant › real data (after a rebuild with MM-4, shards present): the uv group «жечи» exists with an ORV card and 2+ witnesses → confirmed |
| BQ-1 | manual — implemented: .github/ISSUE_TEMPLATE/book.yml is a GitHub issue form, validated by GitHub when an issue is opened |
| BQ-2 | tests/bq.test.ts › flags invalid fields, duplicates by url and title, dead links, robots |
| BQ-3 | tests/bq.test.ts › queue lines cite the issue and are appended idempotently |
| BQ-4 | tests/bq.test.ts › takes the latest owner comment and strips |
| BQ-5 | manual — implemented: README sections on the fork guide and on specs/Claude, commands checked against package.json |
| BQ-6 | manual — implemented: .github/ISSUE_TEMPLATE/book-list.yml is a GitHub issue form; row-by-row triage and per-row approval are planned with BQ-2 and BQ-3 |
| BQ-7 | manual — implemented: .github/ISSUE_TEMPLATE/proposal.yml and config.yml; triage of proposals into the mismatch ledger and draft specs is planned with BQ-2 |
| DO-1 | tests/do.test.ts › DO-1 a VESUM-only lemma gets a dictOnly card with no dates, no attestation lines and f = 0 |
| DO-1 | tests/do.test.ts › DO-1 an r2u-only headword gets a dictOnly card that names r2u and keeps its dictionary line (a dictionary date, not a first attestation) |
| DO-1 | tests/do.test.ts › DO-1 a VESUM headword that already has a full / light / archaic card gets no second card (ids never collide) |
| DO-1 | tests/do.test.ts › DO-1 lemmaLines reads one headword per word and joins the tags of homonyms |
| DO-2 | tests/do.test.ts › DO-2 the badge text and the source names are the specified ones |
| DO-2 | tests/do.test.ts › DO-2 a Plast headword without any dictionary line is dictionary-only too (Plast) |
| DO-2 | tests/do.test.ts › DO-2 the card view shows the status, the sources, f = 0, «Найраніше: —», labels a dictionary year as a dictionary date, and has no first-attestation text |
| DO-3 | tests/do.test.ts › DO-3 ThinCard collapses KWIC with «немає засвідчень у корпусі»; Panel prints emptyText instead of «немає даних» |
| DO-3 | tests/do.test.ts › DO-3 a card with a light row (a corpus attestation) is never rendered as dictionary-only |
| DO-4 | tests/do.test.ts › DO-4 attested lemmas and cards come from ix/ and never include a dictionary-only card; the dx/ hits come separately |
| DO-4 | tests/do.test.ts › DO-4 the page lists every attested result before any dictionary-only one (order of the sections in SearchView) |
| DO-4 | tests/do.test.ts › DO-4 an exact dictionary-only key is ranked before its prefix matches |
| DO-4 | tests/do.test.ts › DO-4 a key with a dictionary-only card only resolves through ixCards as dict: true; an attested card is not marked |
| DO-4 | tests/do.test.ts › DO-4 a key with an attested card AND a dictionary-only card is served by ix/ only (no dx row) |
| DO-5 | tests/do.test.ts › DO-5 the card index keeps dictionary-only words out of lw and boot reports the two counts separately |
| DO-5 | tests/do.test.ts › DO-5 the home page prints both counters |
| DO-5 | tests/do.test.ts › DO-5 a card the corpus attests is counted as attested, never as dictionary-only |
| DO-6 | tests/do.test.ts › DO-6 cv/ shards: bytes per card and per shard at 450k cards stay far below the 256 KiB hard limit of lex/ shards |
| DO-6 | tests/do.test.ts › DO-6 the compact entry drops the word when it is its own key, and loadCv restores it |
| DO-6 | tests/do.test.ts › DO-6 dx/ shards: the planner keeps every leaf under IX_GZ_MAX and the per-card cost is reported |
| DO-6 | tests/do.test.ts › DO-6 writeCv puts dictionary-only words into ld, not lw (cardindex.json is a build intermediate, never fetched whole) |
| DO-7 | tests/do.test.ts › DO-7 a light lemma, a GZ-1 lemma and a word a corpus text links to stay ordinary CV cards (no d) |
| DO-7 | tests/do.test.ts › DO-7 without the DO context (DICT_ONLY=0) the build is the old one: nothing is marked |
| DO-8 | tests/do.test.ts › DO-8 SPEC 63 lists DO-1…DO-8 and the build wires vesumLemmaList into buildCv |
| SN-1 | tests/sn.test.ts › SN-1 a ru→uk line documents the Russian headword as the sense; uk→ru lines document the Russian gloss |
| SN-1 | tests/sn.test.ts › SN-1 lines of one sense are grouped, the earliest source is `first`, the others `later`, years shown as range |
| SN-1 | tests/sn.test.ts › SN-1 every line gets a sense even when no gloss is readable; an undated witness leaves first null |
| SN-1 | tests/sn.test.ts › SN-1 the card view shows the sense list and numbers each line |
| SN-2 | tests/sn.test.ts › SN-2 counts Plast cards without a Plast sense, headwords without sense and undated senses; the markdown names them |
| SN-2 | tests/sn.test.ts › SN-2 the audit is an npm script that writes analysis/sense-audit.md atomically |
| SN-2 | tests/sn.test.ts › SN-2 built data: every Plast headword has a card |
| AT-1 | tests/atlas.test.ts › AT-1 АУМ т. 2 maps from the OCR |
| AT-1 | tests/atlas.test.ts › the committed extract covers all 387 maps plus 55-а, every one with a locator and a short quote |
| AT-1 | manual — АУМ т. 1 has no OCR yet (only the owner's т. 2 scan was processed); see research/44-atlas.md |
| AT-2 | tests/atlas.test.ts › AT-2 areal extent per variant |
| AT-2 | tests/atlas.test.ts › map-image readings carry the label «прочитано з карти, не вичитано» and are empty until a reading is made |
| AT-2 | manual — settlement number → name/oblast → dialect group is not resolvable from the OCR (column layout) and no map-image readings were made yet; see research/44-atlas.md |
| RS-1 | tests/robust-harvest.test.ts › RS-1 a torn index tail is terminated |
| RS-1 | tests/robust-harvest.test.ts › RS-1 r2u: a torn last index line is skipped |
| RS-1 | tests/robust-harvest.test.ts › RS-1 r2u lemmaList: an unreadable lexicon.json |
| RS-1 | tests/robust-harvest.test.ts › RS-1 a 503 then a 200 is retried |
| RS-1 | tests/robust-harvest.test.ts › RS-1 403/429 stops at once |
| RS-1 | tests/robust-harvest.test.ts › RS-1 launch.sh keeps STOPPED.json |
| RS-1 | tests/robust-harvest.test.ts › RS-1 a network failure on fetch is rethrown |
| RS-1 | tests/robust-harvest.test.ts › RS-1 swapDirs: a failure mid-swap |
| RS-1 | tests/robust-harvest.test.ts › RS-1 a missing required sidecar is fatal |
| RS-1 | tests/robust-harvest.test.ts › RS-1 commitStage swaps whole dirs |
| RS-1 | tests/robust-build.test.ts › RS-1 a python-stage failure rejects |
| RS-1 | tests/robust-build.test.ts › RS-1 freshness: a stale or missing |
| RS-1 | tests/robust-build.test.ts › RS-1 a truncated work file is fatal |
| RS-1 | manual — not yet done: writeLexicon temp-dir swap and detail-size pre-flight (waiting for the overflow fix); the scan test for direct writes to final paths |
| RS-2 | tests/stage-cache.test.ts › RS-2 cold = uncached output; warm = all hits, same output |
| RS-2 | tests/stage-cache.test.ts › RS-2 changing one input file invalidates exactly the stages that read it |
| RS-2 | tests/stage-cache.test.ts › RS-2 a source file changed: only the stages whose block references it |
| RS-2 | tests/stage-cache.test.ts › RS-2 a stage block edited: that stage and the later ones |
| RS-2 | tests/stage-cache.test.ts › RS-2 CRLF checkouts do not change a fingerprint |
| RS-2 | tests/stage-cache.test.ts › RS-2 env/flags are part of the key; --from recomputes |
| RS-2 | tests/stage-cache.test.ts › RS-2 never keyed on time |
| RS-2 | tests/stage-cache.test.ts › RS-2 a truncated, bit-flipped or missing entry is a miss |
| RS-2 | tests/stage-cache.test.ts › RS-2 a killed writer leaves only a *.tmp |
| RS-2 | tests/stage-cache.test.ts › RS-2 an entry is written to a tmp file and renamed |
| RS-2 | tests/stage-cache.test.ts › RS-2 chunked Map/Array fields round-trip exactly |
| RS-2 | tests/stage-cache.test.ts › RS-2 verify mode refuses an entry whose round trip is lossy |
| RS-2 | tests/stage-cache.test.ts › RS-2 GC keeps the last 2 entries per stage |
| RS-2 | tests/stage-cache.test.ts › RS-2 per-witness items: adding or touching one witness recomputes only that witness |
| RS-2 | tests/stage-cache.test.ts › RS-2 the item code is part of the spine |
| RS-2 | tests/stage-cache.test.ts › RS-2 the tracker fingerprints reads through the ES-module named imports |
| RS-2 | tests/stage-cache.test.ts › RS-2 every sc.run / sc.item stage of build.ts has a // #stage block |
| RS-2 | tests/stage-cache.test.ts › RS-2 a stage fingerprint covers the modules its block uses, transitively |
| RS-2 | tests/stage-cache.test.ts › RS-2 the output section after the last cached stage is not part of any fingerprint |
| RS-2 | tests/stage-cache.test.ts › RS-2 stage markers are validated |
| RS-2 | manual — full-corpus cold/warm equality is checked on the worker rebuild (BUILD_CACHE_VERIFY=1, public/data diff against the last uncached build, second run time); the corpus is not in the repository |
| AT-3 | tests/atlas.test.ts › AT-3 АУМ rows in DIALECT_BOOK_RULES |
| AT-3 | tests/atlas.test.ts › AT-3 /atlas page and site file |
| AT-3 | manual — validation of the AUM rules on the dialect witnesses (CX-9, Лєснова, Шухевич) needs data/work from the consolidated rebuild: run `tsx pipelines/dialect-literature.ts` after it |
| SL-5 | tests/plast-lch.test.ts › quotes are verbatim sentences: no split after a short abbreviation, hyphens joined, ≤ 160 chars, span pinned by from/to |
| SL-5 | tests/plast-lch.test.ts › every term is a cite-only entry of source LCH with a «с. N PDF» locator, in exactly two categories |
| SL-5 | tests/plast-lch.test.ts › the committed quotes are substrings of the OCR pages (skipped without the local OCR dump) |
| SL-5 | tests/plast-lch.test.ts › kurin slang gets its own badge and never «пластова лексика»; Plast-wide terms get the Plast badge; labels differ |
| SL-5 | tests/plast-lch.test.ts › the source is registered; /plast, the cards and the source card use the category label and the entry source |
