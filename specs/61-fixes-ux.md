# SPEC 61 — Linking fixes, spec-gap audit, UX load reduction

Source: user feedback 2026-10-12 with screenshots of the word card «аз» (live site): *"read the spec to find out what you didn't implement or underimplemented for now · optimize UI/UX to decrease info load on the end user · and fix the behavior in here · Not all you did include"*, plus again «отуточки», «онтамека», «осьтамека», «озьдо» "в кінці кінців".
Subordinate to SPEC 00. Trunk-based, path-limited commits, one commit per id group, no Co-Authored-By. COVERAGE rows for every id.

## Observed defects (screenshots)
- D1 Old pronoun «азъ» (TOROT pronoun, 'I') is linked to VESUM **noun** «аз» (ч.р., аз/аза/азові…); forms ми, мя, мене, мною, мнѣ, мнѣ, мъноѭ gathered under it.
- D2 «Перша фіксація: 1037–1050 · мя» but «найдавніша форма: ми» — first-attestation form and oldest form disagree for the same date.
- D3 Epoch paradigm panel: stem type «невідомо», N = 25 all «з конфліктом міток», every cell «невідомо», dual column shown, table overflows horizontally on a phone (МНОЖИНА cut).
- D4 The same claim «архаїчний правопис (норма свого часу) 0.9» repeated on every spelling; policy sentence «Літературний регістр ніколи не виводиться…» printed inline.
- D6 Conjunction/particle «да» (TOROT C-/Df) linked to VESUM **noun** «ДА» (ч.р.) — same root cause as D1; its epoch panel shows 46 tokens «з конфліктом міток».
- D7 "absence of declination" (user): epoch paradigms show only «невідомо» cells (all tokens in conflict) and pronouns have no pronominal paradigm; uninflected words still get a noun grid.
- D5 Implemented features not reachable/visible for words outside the corpus (e.g. deictics отуточки/онтамека/осьтамека/озьдо only via /analyze; nothing in search).

## FX — linking (backend)
- **FX-1 POS gate**: a link (any route, B-2) is accepted only if the source POS (PROIEL/TOROT part-of-speech, Stanza UPOS) is compatible with the VESUM POS (mapping table PROIEL↔UD↔VESUM in core, cited from TOROT/UD/VESUM docs); incompatible candidates are skipped, next candidate/route tried; none → unresolved (B-2.2).
- **FX-2 Suppletive / lexical correspondences**: `core/correspondences.ts` table old lemma → modern lemma for items not derivable by sound rules (азъ/язъ → я; есмь/быти → бути; сь/сии → цей?; иже …), each row with an ЕСУМ (goroh) or Shevelov Q cite, else not used. Pronoun forms then link by VESUM *form* lookup under the modern lemma with POS = pron (мене, мені, мною → я).
- **FX-3 Consistency**: the first-attestation form = the earliest attested spelling by the same tie-break as `oldest` (B-3.4/B-3.5 unified); grouping of FormCards under a lemma requires POS agreement.
- **FX-5 Paradigm by POS**: modern paradigm and epoch paradigm are chosen by the lemma's POS — nouns: case × number (SPEC 50); pronouns: pronominal grid (case × number, no stem type; person/gender columns where VESUM tags carry them); adjectives/participles: gender × case; verbs: VESUM verb layout; uninflected POS (conj, part, prep, adv, intj): no paradigm panels at all, a one-line «незмінне слово».
- **FX-6 Epoch placement**: investigate why every token lands in «конфлікт міток» (EP-3.4) for these lemmas; after FX-1/FX-2 relinking, re-verify placement on real nouns (e.g. рука, земля, князь, градъ/город, сынъ) and pronouns (я, ти, себе); report placed/conflict/underspecified per test lemma in REPORT §epoch.
- **FX-4** rebuild data, data:publish first, then the code is pushed (orchestrator pushes).

## GA — spec-gap audit
- **GA-1** `specs/GAPS.md`: for every requirement id in SPEC 00/10/20/30/40/50/60 (and briefs U-1…U-27): status implemented / partial / missing / implemented-but-not-reachable-in-UI, with evidence (file:line or test name) and a one-line fix. Prioritised top-15 list at the top.

## UX — reduce information load
Principle: **summary first, evidence on demand** (the Evidence Invariant is kept — every claim stays one tap away, but is not printed by default).
- **UX-1 Word-card headline**: lemma · POS · stress (one line) · IPA (one line) · first attestation (author, year, one line) · ≤ 5 key chips (origin, register, dialect/type, loan route, Rusyn) · «more» expands.
- **UX-2 Collapsible panels with one-line summaries** (Provenance, Paradigm, Epoch paradigms, Derivatives, Etymology, Statistics, KWIC, Map, Media); a panel whose content is only `unknown` is collapsed and says «немає даних» (one line) instead of grids of «невідомо».
- **UX-3 Epoch paradigm**: when placed = 0 show only the summary line (N, conflicts) — no grid; dual column only where attested (EP-6.2 already); mobile layout without horizontal overflow (stack singular/plural or a case-per-row list).
- **UX-4 Badge consolidation**: identical claims across spellings render once with «у N формах»; policy notes (P-3.1 etc.) move into a single ⓘ tooltip per panel.
- **UX-5 Form chips**: show the 6 most frequent + «+N», grouped by epoch; chips are buttons that filter the card.
- **UX-6 Mobile nav**: compact (scrollable row or menu); no wrapped 2-line nav.
- **UX-7 Reachability (D5)**: search falls back to on-the-fly analysis for words not in the lexicon (deictic segmentation, derivation, loan route, heteronyms, Rusyn, IPA) with a clear «немає в корпусі — аналіз за правилами» banner; /analyze linked from every «не знайдено».

## Order
FX (backend, rebuild) ∥ GA (read-only audit) ∥ UX (src only). After all three: integrate GA top-15 items as follow-up work packages.
