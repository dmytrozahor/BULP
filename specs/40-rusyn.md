# SPEC 40-rusyn — Rusyn axis (parallel reading, neutral on status)

Depends on SPEC 00 (P-1.3 every rule cites its source, P-3.1 unknown), research/10 §0, §3, §5. Code: `core/rules.ts` (`RUSYN_RULES`, `RUSYN_SHARED`, `detectRusyn`, `rusynClaim`, `RUSYN_STATUS`, `rusynStrong`).

> "Мітка rusyn:* означає лише «форма відповідає нормі/практиці русинського стандарту» і не є висновком про статус." — `RUSYN_STATUS.note`

- **RU-1.1 Axis labels.** `rusyn` (variant undetermined), `rusyn:lemko`, `rusyn:presov`, `rusyn:pannonian`, `rusyn:subcarpathian`. A form's contract claim `claims.rusyn` has `value` = the best label (specific beats `rusyn`, then higher noisy-OR score; `rusynClaim`).
- **RU-1.2 Parallel, not competing.** `rusyn:*` is a second reading beside `dialect:ZAK`/`LEM`; neither replaces the other, and every consumer shows `CorpusMeta.rusynStatus` (both positions, with sources) next to it. Nothing here decides language-vs-dialect.
- **RU-2.1 Gate.** Rusyn rules fire only when `!normative(ctx)` (no VESUM normative analysis) and the attestation year is `undefined` (user input) or ≥ 1850. There is no 1919 gate: Rusyn codification (Dukhnovych era, Kostelnik 1904/1923) is not bound to the Ukrainian 1919 reform.
- **RU-2.2 Shared rows.** `SW-DAT-OVY`, `SW-INSTR-OW`, `CARP-Y`, `HARD-C-FINAL` (research/10 §3 "Shared with existing rules") are re-labelled `rusyn` only if at least one Rusyn-specific row (`RUE-*`, `PAN-*`) fired on the same form (`detectRusyn`), so a Boyko or Hutsul form is not labelled Rusyn by itself.
- **RU-3.1 ORT-Y veto.** `ORT-Y` (ы ⇒ `russianism_orth`) does not fire if `rusynStrong(form)` — the `RUSYN_STRONG` contexts: ы after к/г/ґ/х, ьы, `-ти` infinitive with ы, `-ськый/-цькый/-зькый`, ы together with і/ї/є/ґ, ӱ/ÿ/ü.
- **RU-3.2 Ambiguous ы.** Forms identical in Russian, Rusyn and Carpathian spelling (мы, ты, вы, сын…, рыб…, был…) with no discriminator get `ambiguous_y` (`ORT-Y-AMB`, weight 0.2) instead of `russianism_orth`; to be resolved from document context.
- **RU-3.3 Positive Russian evidence.** The `-ть` infinitive with ы (быть), э, and `-ский` are not in `RUSYN_STRONG`, so `ORT-Y`/`ORT-YI` keep firing (`быть` → `russianism_orth`; `быти` → `rusyn`, no `russianism_orth`).
- **RU-3.4 ORT-YI veto.** ё/ъ are vetoed only by `RUE-PRESOV-YO` (ё with ы/ь/і) or `RUSYN_STRONG`; `э` is never vetoed (no listed Rusyn alphabet has э).
- **RU-4.1 Evidence kind.** Quotes obtained through a renderer ([rend], rusynsociety, ISO) are `P()` (paraphrase) until browser-verified (research/10 §6).
- **RU-4.2 Every rule cites** its grammar source (`cite.source` non-empty, P-1.3); weight-0 rows (`RUE-O-CIRC`) are hints only (P-3.1).
- **RU-5.1 Lemma level.** `LemmaCard.claims.rusyn` = union of the modern (`shev.modern`) FormCards' rusyn claims (`lemmaRusyn`); absent ⇒ no Rusyn evidence. REPORT §7 lists Rusyn rule hits; a corpus of canonical Ukrainian authors is expected to produce ~0, and the report says so.
