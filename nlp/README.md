# nlp/ — Python NLP stages

Run: `uv run --project nlp python nlp/<script>.py [selftest] [--data data/work]`
Every script has a `selftest` subcommand (plain asserts). Every output names its tool + version (SPEC 00 Evidence Invariant).

| script | input | output |
|---|---|---|
| `lemmatize_orv.py` | `data/work/<id>.json` with `lang` in orv/chu-rus/ruthenian and **no** token `lemma` (non-TOROT) | `data/work/<id>.nlp.json` |
| `stress.py` | `data/work/stress-request.json` (JSON list of modern forms; built-in test list if absent) | `data/work/stress.json` |
| `russian_check.py` | `data/work/ru-request.json` (JSON list of forms; built-in test list if absent) | `data/work/ru.json` |

## lemmatize_orv.py
Stanza 1.15 `orv` (Old East Slavic), default package = `torot_nocharlm` (tokenize, lemma) + `torot_nopretrain` (pos), pretokenized: existing
`TokenRec.raw` are fed 1:1, grouped into sentences by `s` (chunked at 120 tokens). Models download to `nlp/stanza_resources/` (git-ignored).
Output: `{ "model": "stanza 1.15.0 orv/torot (...)", "created": ISO, "outOfDomain"?: true, "tokens": [ {lemma, upos, feats} | null ] }`,
same length as `tokens`. `outOfDomain: true` for `lang=ruthenian` (16th–17th c. is outside the model's training data; treat as weak evidence).
Options: `--only id,id`, `--force`. Up-to-date outputs are skipped. Speed ≈ 1800 tokens/s on CPU after ~3 s model load.
Lemmas are model predictions (class: automatic annotation), not TOROT scholarly lemmas.

## stress.py
`ukrainian-word-stress` 2.1.0 in dictionary mode (`on_ambiguity='all'`, U+0301). Internals of the trie records are used to
separate readings: one record with several accents (помилка: по́милка / поми́лка) = several admissible stresses → separate variants,
`ambiguous:false`; several records with different accents (heteronyms, за́мок/замо́к) → separate variants, `ambiguous:true`.
`positions` = 0-based vowel indices in the NFC form; unknown words and (unstressed) monosyllables → `[]`.
Output `forms: { form: [ {stressed, positions, ambiguous} ] }`. Context-free: no POS disambiguation (dictionary has no sentence).

## russian_check.py
`pymorphy3` `MorphAnalyzer(lang='ru')` and `lang='uk'`; `known` = dictionary word (`word_is_known`, parse with `is_known`), never a predictor guess.
Output `forms: { form: {known, normal_form, tag, uk:{known, normal_form, tag}} }` plus `source`, `sourceUk`, `pymorphy3` versions.
Note: OpenCorpora also lists some colloquial forms (e.g. `шо`), so `known` means "attested in the Russian dictionary", not "standard Russian".
`pymorphy3-dicts-ru` is a declared dependency in `pyproject.toml`.

## Licences
- Stanza: Apache-2.0. Stanza `orv` models are trained on TOROT (CC BY-NC-SA 3.0) — non-commercial / share-alike applies to the trained data; cite TOROT.
- pymorphy3: MIT. `pymorphy3-dicts-ru` = OpenCorpora, CC BY-SA. `pymorphy3-dicts-uk` = LanguageTool/VESUM-derived (check upstream: CC BY-NC-SA).
- ukrainian-word-stress: MIT code; the dictionary is derived from ULIF «Словники України» — rights unclear (research/08 §A). Do not redistribute the dictionary; only cite per-form results with that caveat.
