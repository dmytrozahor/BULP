# SPEC 30 — Bidirectional derivation pipelines (final phase)

> User, 2026-10-11: *"at the very last implement derivation pipelines which would derive words and forms from each other
> (old ukrainian form -> suggestion for modern form, vice-versa; suggestion of a derivation using principles in historical
> phonology, i.e. ikavism), they should be also visually differentiated in the interface."*

Depends on SPEC 00 (P-1.5 trace, P-1.7 inferred ≠ fact), SPEC 10 M-3 (forward rules), SPEC 20 (attestations).

## D-1 Forward: old → modern (`core/phonology.ts derive`, exists)
- **D-1.1** Output = ranked candidates; each with ordered trace `[rule, from, to, cite]` and `branches`.
- **D-1.2** Status of a candidate: `attested-modern` (VESUM form, D-evidence) > `suggested` (no VESUM form). Never `fact`.

## D-2 Backward: modern → old (`core/reverse.ts`, new)
- **D-2.1** Each forward sound rule that is invertible declares `invert` (a branching generator): R09 і → ѣ | і; R10 і → о | е (in a closed syllable, i.e. when an
  oblique form of the paradigm shows о/е: кінь–коня, піч–печі — the paradigm (VESUM) is the evidence for the choice); R16 в → л (after о/е; -в past → -лъ);
  R04 restore final ъ after a hard consonant / ь after a soft one, restore jers in clusters only when a strong-vowel alternation exists (сон–сну → сънъ);
  R11 и → ы | и (after hard consonants); R02 я → ѧ, у → ѫ | у; R03 ки/ги/хи → кы/гы/хы; R13 -ття → -тьѥ; R18 жа/ча/ша → жѧ/чѧ/шѧ; R21 drop prothetic в/г.
- **D-2.2** Generation is constrained by **round-trip**: a backward candidate is kept only if `derive(candidate)` reproduces the modern form (P-1.5 consistency).
- **D-2.3** Ranking: candidates **attested** in the corpus (same normalised spelling in any admitted witness) first, marked `confirmed-by-attestation`
  with the attestation as evidence; then by fewest branches; cap 12.
- **D-2.4** Every backward candidate carries `method: 'reconstruction'` and the inverted trace; the UI labels it "реконструкція (гіпотеза)".

## D-3 Principle explainer ("suggestion of a derivation")
- **D-3.1** Given a pair (old, modern) — typed by the user or taken from a FormCard — find the shortest rule path old →… modern and explain each step
  with the rule's Shevelov quote; if no path exists, say so (unknown), never invent a rule.
- **D-3.2** Given a modern form, list which historical-phonology principles *could* apply (e.g. ikavism if і in a closed syllable alternates with о/е in the paradigm),
  each with the paradigm forms as evidence (`D('VESUM', …, 'кінь / коня')`).

## D-4 Visual differentiation (UI)
- **D-4.1** Three visual classes, everywhere (word card, timeline, annotator, analyze): **attested** (solid, normal), **derived/suggested** (dashed outline, italic, badge "реконструкція"),
  **confirmed reconstruction** (dashed + check mark "підтверджено пам'яткою" linking to the KWIC).
- **D-4.2** A legend explains the classes; colour is never the only signal (shape + text badge).
- **D-4.3** Route `/derive?from=&dir=old2new|new2old`: interactive derivation with step-by-step trace (each step expandable with the citation).

## Tests (`tests/reverse.test.ts`)
кінь → {конь} (round-trip), піч → печь, віра → вѣра, ходив → ходилъ, київ → киѥвъ/кыѥвъ; every backward candidate passes round-trip; city/город gets no ikavism reversal (pleophony exception).
