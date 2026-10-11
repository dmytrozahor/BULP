# SPEC 00 — Principles and the Evidence Invariant

Status: **normative**. Every other spec, pipeline and UI component is subordinate to this file.
Requirement IDs (`P-…`) are referenced from code comments and tests (`tests/*.test.ts` names them in `describe` titles).

## Goal
Collect attestations of Ukrainian word forms from vetted Ukrainian / Ruthenian authors and old Kyivan manuscripts,
and — **only on evidence** — tell which forms are native, oldest, Church-Slavonic, surzhyk (Russian-contact),
dialectal, colloquial; show paradigms, variable stress, epochs and DWDS-style statistics.

## P-1 The Evidence Invariant
> User, 2026-10-11: *"all pipelines and detections should be evidence based in the project"*.

- **P-1.1** Every label the system emits is a `Claim<T>` = `{ value: T, evidence: Evidence[] }` with `evidence.length ≥ 1`.
  The only constructor that accepts zero evidence returns the value `'unknown'`. Enforced by `core/evidence.ts` (throws) and by test `P-1.1`.
- **P-1.2** An `Evidence` always has `source` (registry id), `quote` (verbatim, ≤ 300 chars) and `locator` (URL, §, chapter.section, column.line, folio).
  It also has `kind`: `Q` (verbatim from the source), `P` (paraphrase — displayed with a "paraphrase" badge), `D` (data record, e.g. a VESUM line or an attestation in context).
- **P-1.3** A *rule* (sound change, detector pattern) is itself evidence-bearing: it carries a `cite: Evidence`. A rule with no published source has weight 0
  and cannot fire a label (research/05 §3.2: *"Rules without a published source have weight 0 (user requirement)"*).
- **P-1.4** A label produced by a rule carries **two** evidences: the rule's citation *and* the attestation/data that triggered it.
- **P-1.5** Derivations keep a full trace: one step per rule, each step with its citation (`видѣти →R09→ видіти`).
- **P-1.6** Statistics display their denominators (N tokens of the sub-corpus) and link to the concordance lines that produced them.
- **P-1.7** Anything inferred (metre-derived stress, rule-generated candidates) is labelled with `method` and never shown as a dictionary fact.

## P-2 Authors
> User: *"For Ukrainian forms only rely on verified Ukrainian or Ruthen authors who identified themselves as Ruthen or Ukrainian correspondingly and always write to source for a lexem / word from which origin was the first found author."*

- **P-2.1** An author is `vetted` iff ≥1 self-identification `Evidence` with verification `fetched|scholarly`; `provisional` with only `secondary`; otherwise `unverified` (research/06 §2.2 "Pass rule").
- **P-2.2** Only texts by `vetted|provisional` authors (incl. institutional authors of Kyivan manuscripts) produce **provenance** (first attestation). Other ingested texts are kept out of the corpus entirely.
- **P-2.3** `first_attestation(lemma)` = earliest `date.to` among admissible attestations; tie-breaks per research/06 §3.2 (vetted > provisional; narrower range; autograph > copy > edition; person > institution; else co-first).
- **P-2.4** Period-appropriate labels: `ruthenian-rus` (11th–13th c., shown as "Kyivan Rus' author", never "Ukrainian author"), `ruthenian`, `malorossian`, `ukrainian`, `institutional`.

## P-3 Unknown is a first-class answer
- **P-3.1** Register, dialect, origin, surzhyk, stress status and epoch default to `unknown`. Pattern hints may *queue a form for review*, never set a label (research/08 B2).

## P-4 Engineering
- **P-4.1** Spec-driven: each spec lists requirement IDs; each ID has ≥1 test or is explicitly marked `manual`.
- **P-4.2** Rules are **data** (tables with citations); engines are small and generic. One detector engine serves CS-markers, surzhyk, dialect and register tables.
- **P-4.3** Quotes everywhere: every module starts with a doc comment quoting the source of its method.
- **P-4.4** Licences are respected and displayed: VESUM & Brown-UK CC BY-NC-SA 4.0, TOROT CC BY-NC-SA 3.0, LanguageTool LGPL-2.1 → the derived dataset is **non-commercial, share-alike**.
- **P-4.5** Downloaded material is data only: stored under `data/raw/<kind>/`, never executed (P-0.2 in pipelines).
