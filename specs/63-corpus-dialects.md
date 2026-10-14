# SPEC 63 — Spec re-audit, corpus expansion, dialect-book features

User 2026-10-14: *"When you've done everything (check specks) your task is to expand the corpora"* · *"And analyze dialectical books to find more dialectical features which we can determine and tag — for all Ukrainian dialects!"*
Rules: SPEC 00 (evidence; P-2 author vetting; language gate), trunk `mvp`, path-limited commits, no Co-Authored-By; agents don't push; data:publish before push; `$env:UV_BIN` set for builds.

- **GA-2 re-audit**: rerun the GA-1 method over SPEC 00–62 + U-1…U-27 + BL-*; update specs/GAPS.md; fix every gap that is ≤ 1 small commit; list the rest.
- **CX corpus expansion** (priority: most words, oldest forms, vetted authors only):
  - CX-1 izbornyk originals already catalogued but not ingested (research/19, 21 manifest tables; Ostroh-circle and polemical texts, «Апокрисис» excluded as translation), plus izbornyk old17 index (catalogue first).
  - CX-2 Wikisource first editions (original orthography, proofread) of vetted authors: Шевченко (Кобзар 1840 if transcribed), Куліш, Франко (other 1880–1910 editions), Леся Українка, Грінченко, Котляревський (Наталка Полтавка first ed.), Квітка (once vetted), Марко Вовчок (excluded — not self-identified, P-2), Стефаник, Коцюбинський, Нечуй (first editions only) — each author vetted with a fetched quote or skipped.
  - CX-3 Hetmanate/Ruthenian documents with originals online (research/18: universals, chancery records, Орлик if text found).
  - CX-4 each new witness: dateCite Q, edition, orthography → folds; report per-witness tokens and link %.
- **DL dialect-book features** (all dialect groups of research/04 + historical): mine dialectological works available online (Бевзенко «Українська діалектологія», Жилко «Нариси з діалектології…», Матвіяс, АУМ commentary, ЕУМ dialect entries, Грінченко dictionary region labels, dialect dictionaries: Онишкевич (Бойківський), Пиртей (Лемківський), Гуцульський (Неґрич), Лисенко (Середнє Полісся), Аркушин (Західне Полісся)…) → new detectable marker rows (regex or diff) with [Q] cites, dated where possible (research/23 procedure), and lexical dialectisms from dialect dictionaries as `dialect` claims with region; implement into core/rules.ts DIALECT_RULES + lexical lists; report markers added per dialect.
  - **DL-1** ЕУМ-mined rows (core/rules.ts `DIALECT_BOOK_RULES`, research/31 §2): every row cites the ЕУМ article of its own dialect with a verbatim [Q] and the article number as locator; fires only on non-normative forms.
  - **DL-2** Per dialect group (BOY, HUT, LEM, ZAK, SYAN, PKB, NDN, POD, VOL, WPL, MPL, CHN, SLB, STP, MDN, SE, SW): each new rule fires on its example and is silent on the standard word.
  - **DL-3** Dated rows (Shevelov ch. 8): `earliest` + Q dating cite; new groups HUT, SYAN, PKB, VOL, SLB, STP are gated by `DIALECT_GROUP_FROM`.
  - **DL-4** Lexical dialectisms (core/dialect-lex.ts, research/31 §3): word → gloss → dialect, one verbatim [Q] and locator per entry, cite-only; Polissian priority (Arkushin WPL, Lysenko MPL+CHN, ЕУМ).
  - **DL-5** Sources, access conditions (robots.txt, licences) and rejected sources are logged in research/31 §1 (manual).
