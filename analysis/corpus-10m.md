# The 10M-word import: report (SPEC 63 HV / MM)

Owner goal: "more than 10 million words" in the corpus. Written 2026-10-18 from the worker logs and data (read-only). Live site: CDN build `202610172033-58e8ebf` (chain9). A corrected build, chain10, has been produced on the worker.

Source tags: **[c9]** `~/logs/chain9/build.out`; **[c10]** `~/logs/chain10/build.out`; **[R]** worker `~/BULP/analysis/REPORT.md` (generated 2026-10-17T21:28:37Z, i.e. chain9 output); **[ing]** `~/logs/ingest-<source>.out`; **[idx]** `data/raw/harvest/<src>/index.jsonl` line counts; **[du]** `du -sh public/data/*` on the worker; **[S63]** specs/63-corpus-dialects.md; **[calc]** my own arithmetic from the above. "UNVERIFIED" marks anything I could not confirm from a log.

## 1. Headline

The goal is met about 4.6 times over by witness text alone: 46,353,973 tokens in 4,336 admitted witnesses [c9, c10]. That counts tokens of admitted witnesses only (the report's denominator N). The much larger vocab-only dumps (section 4.2) sit outside that N.

## 2. Witnesses

| | chain9 | chain10 |
|---|---|---|
| found | 4,692 | 4,692 |
| admitted | 4,336 | 4,336 |
| excluded | 356 | 356 |

Sources: [c9] and [c10], first stage line. Chain10 logs only the totals; the reasons below are from the chain9 REPORT table "Exclusions (B-1.1)" [R].

Reasons for exclusion (counted by me from the table, 357 lines including the header, so off by at most 1, UNVERIFIED):
- 353 witnesses: author `pum14` has no verification record (P-2.2). These are the gr14_* witnesses (14th-century charters), 40-466 tokens each.
- 2 witnesses: the text is Russian, not Ukrainian (two Shevchenko pages on izbornyk, shev121 and shev123).
- 1 row not classified in my parse. UNVERIFIED.

The 353 `pum14` charters are small (the visible ones are 40-466 tokens each; I did not sum them). Giving `pum14` a verification record is the cheapest way to recover them.

The witness table in [R] sums to 46,499,519 tokens, which is 145,546 above N = 46,353,973. That difference equals exactly the total of the 10 witnesses whose id starts with `r` (145,546) [calc]. I did not find out why (UNVERIFIED).

## 3. Tokens and linking

| | chain9 [c9] | chain10 [c10] |
|---|---|---|
| corpus tokens N | 46,353,973 | 46,353,973 |
| linked | 34,842,554 (75.2%) | 34,842,765 (75.2%) |
| unresolved | 11,511,419 | 11,511,208 |
| lemmas (all) | 139,020 | 139,021 |
| kept lemma cards (f >= 2, pre-1400 or dictionary headword) | 74,738 | 74,739 |
| token types | 4,887,597 (4 analysis-only lyric files) | same |
| VESUM pass 1 keys with analyses | 505,527 | 505,728 |
| MU phonetic pass links | 1,512 | 1,515 |
| archaic lemmas | 12,904 dictionary, 2,341 unverified; 293,144 tokens | 12,904 dictionary, 2,319 unverified; 293,028 tokens |
| TOROT cards | 5,735 name, 34,058 ORV-only | 5,735 name, 34,034 ORV-only |
| epoch paradigms | 51,731 of 51,731 noun lemmas | 51,732 of 51,732 |
| stress | 410,725 requested, 353,132 with dictionary stress | 410,721 / 353,127 |

Linked tokens per route [c9]: direct 34,573,600; stanza-lemma 143,259; token 92,651; torot-lemma 33,044. [c10]: direct 34,573,692; token 92,770; the rest equal.

Lemma-card tiers (chain9 [c9] unless noted):
- **Kept full cards:** 74,738 (chain10: 74,739).
- **Light cards:** 58,941 lemmas fall below KEEP_MIN_F and are served as light cards (the `tc` step packs "light 59,083" into 256 shards). GZ-1 gave a light card to 40,921 unresolved VESUM-form tokens (142 new light lemmas).
- **Dictionary-only:** 293,260 cards (283,160 known to VESUM, f = 0), in 920 `dx` shards. The CV pass produced 356,533 words from 157,245 dictionary tokens, 108,919 of them already full cards and 15,753 owned by /ar (chain10: 356,534; 293,259 dictionary-only).
- **Unlinked:** 11,511,419 tokens (24.8% of N) [calc], stored in `public/data/unlinked`. Chain9's per-POS gate output shows where linking fails: U:ADV 11,035, U:VERB 4,220, U:PRON 3,916, U:ADJ 2,703, U:ADP 2,344, U:NOUN 2,260 and so on, mostly Middle Ukrainian and Church Slavonic spellings. Chain10's log has no gate lines (UNVERIFIED why).

Other outputs [c9]: collocations for 51,031 lemmas; phrases 3,000 candidates and 3,107 PH pages; etymology 17,270 lemmas; senses 2,120 of 11,374 looked-up lemmas; r2u.json 36,954 articles; cognates 3,366 lemmas; usage 6,624 lemmas; ix 999,329 keys in 4,460 shards.

## 4. Per source and per epoch

### 4.1 Witness tokens by source (parsed from [R] section 1 by id prefix; [calc])

| source (id prefix) | witnesses | tokens |
|---|---|---|
| archive.org OCR newspapers/books (`hv_ia_*`) | 966 | 40,010,549 |
| uk.wikisource (`hv_ws_*`) | 1,407 | 4,106,706 |
| Hrushevsky, hrushevsky harvest (`hv_hrushevsky_*`) | 6 | 993,819 |
| older curated witnesses (izbornyk, TOROT, Kobzar, PVL, Franko ...) | about 1,957 | about 1.39M (remainder; UNVERIFIED) |

The ingest logs agree with the first three [ing]:
- archive-ukr: 942 items, 941 witnesses, 39,159,678 tokens
- archive-hrushevsky: 35 items, 33 witnesses, 1,704,364 tokens (2 skipped as too short)
- hrushevsky: 125 items, 6 witnesses, 993,819 tokens
- wikisource-uk: 39,201 items, 1,407 witnesses, 4,106,706 tokens; skipped 36,075 "not-ukrainian-category", 1,693 undated, 26 too short

archive-ukr plus archive-hrushevsky is about 40.86M in the ingest logs against 40.01M for `hv_ia_*` in the report, a gap of about 0.85M that I did not reconcile (UNVERIFIED).

### 4.2 Vocab-only sources (0 witnesses; tokens counted by ingest [ing])

Licence-limited or non-text-grade sources: only words and attestations enter the lexicon.

| source | items | tokens |
|---|---|---|
| wikipedia-uk | 9,507 | 105,180,820 |
| wikipedia-rue (Rusyn) | 10,344 | 45,892,073 |
| HPLT 2.0 (CC0, ukr_Cyrl_1) | 40 of 300 shards | 7,518,496 |
| user books (incl. «Лісові чорти - кодекс.pdf», 1983, vocab-only, quotes at most 2 lines) | 330 | 635,372 |
| poets | 339 | 98,772 |
| faust-lukash | 29 | 68,654 |
| gramoty (birchbark) | 1,257 | 18,200 |

Total about 159.4M vocab-only tokens [calc]. They are NOT in N = 46.35M. How they feed the 293k dictionary-only cards (`dx`) and the CV pass was not traced (UNVERIFIED). On the user books: the ingest log says 330 items; the harvest index has 354 lines [idx]. The «Лісові Чорти» ingest is confirmed only by an index item id (`user-books:лісові_чорти_0024`, pdf pages 231-235, date 1983); I did not count its tokens separately.

TOROT and the other curated texts (PVL, Ilarion, Monomakh, arch, Kobzar, Franko ...) are in the remainder row of 4.1. I found no separate TOROT token total in the logs (UNVERIFIED); TOROT card counts are in section 3.

### 4.3 Per Shevelov epoch (N tokens, identical in chain9 and chain10 [c9][c10])

| epoch | tokens |
|---|---|
| shev.proto | 7,214 |
| shev.old | 259,552 |
| shev.early_middle | 148,347 |
| shev.middle | 463,197 |
| shev.late_middle | 195,475 |
| shev.modern | 45,280,188 (97.7%) |

### 4.4 Per century (start year of the composition date in the [R] witness table; approximate; [calc])

| century | tokens |
|---|---|
| 11th | 88,445 |
| 12th | 138,843 |
| 13th | 37,681 |
| 14th | 6,450 |
| 15th | 141,177 |
| 16th | 101,096 |
| 17th | 329,465 |
| 18th | 152,122 |
| 19th | 4,106,356 |
| 20th | 40,501,905 |
| 21st | 895,627 |

This sums to the table total 46,499,519, not N. The weight in the 20th century comes from the archive.org newspaper OCR, which is not proofread («не вичитано»), so those tokens are noisier than the curated ones.

## 5. Build timings and cache

Cumulative seconds from the start of the run:

| milestone | chain9 [c9] | chain10 [c10] |
|---|---|---|
| witnesses found | 58.1 | 58.2 |
| tokens done (4,336 computed) | 168.7 | 169.0 |
| VESUM pass 1 done | 251.8 | 252.8 |
| linked | 515.8 | 516.2 |
| archaic done | 869.5 | 878.7 |
| collocations / kept | 987.3 | 1006.8 |
| pass 2 done | 1239.5 | 1253.3 |
| epoch paradigms | 1327.2 | 1339.9 |
| annotate (cards) | 1569.5 | 1582.3 |
| CV cards | 2283.1 | 2308.6 |
| texts written | 2335.2 | 2362.3 |
| done | 2387.5 (about 40 min) | 2415.6 |

The `[stage-cache]` summary says "0 stage hits (saved ~0 s), 8 computed (1,454 s)" for chain9 and "(1,481 s)" for chain10: **the stage cache never hit in either build**. Chain9 started cold ("no entry"); in chain10 every stage reported "code, spine or inputs changed", so the code change invalidated all of it. Both builds recompute all 4,336 token entries ("0 entries reused").

Cache size grew from 4,807.7 MiB (chain9; tokens 1,590.8, annotate 1,473.5, phrases 709.9, link 307.2, archaic 270.8, vesum2 184.3, epochs 151.5, python 101.3, collocations 18.4) to 9,615.6 MiB (chain10; every stage holds 2 entries, tokens 8,672). Old entries are kept, which doubles the disk. A prune that keeps only the current entries would help (my suggestion, not implemented).

Chain9's vitest step logged an `EBADF` on `close` from `tests/robust-build.test.ts` (the double `closeSync` in `runLogged`, fixed in commit 91b12e73). The chain9 CDN upload then succeeded (`20:51:52 build=202610172033-58e8ebf head=47be7c8f`); the pointer push was redone manually after a rejected `cannot lock ref refs/heads/mvp` race [cdn-upload.log]. When I looked, `~/logs/chain10.status` read "RUNNING vitest since 22:06:27", so chain10's tests and upload were still in progress; its data build had finished.

## 6. Data sizes and hosting

Worker `du -sh public/data/*` [du] (disk blocks, so slightly above byte counts):

| dir | size |
|---|---|
| texts | 4.3 GB (build log: 4,372.2 MB [c9]) |
| lex | 1.2 GB (S63: 1.14 GB) |
| unlinked | 456 MB (S63: 366 MB) |
| cd | 156 MB (S63: 94 MB) |
| ix | 120 MB (S63: 109 MB) |
| lexicon.json | 58 MB (57.66 MB in [c9]) |
| uv 42 MB, tc 41 MB, cv 40 MB, lm 28 MB, dx 12 MB, wit 7.7 MB | |

The gaps between [du] and [S63] come from the spec figures being written earlier and from block rounding. The total is about 6.3 GB per S63; the dirs above add to about 6.4 GB [calc], consistent.

Raw inputs on the worker (`data/raw`) [du]: harvest 2.4 GB, kaikki 425 MB, vesum 323 MB, r2u 262 MB, hplt 151 MB, ubertext 91 MB.

Hosting decision, PF-7 [S63], owner, 2026-10-17: "host the large site data on AWS S3 + CloudFront; the app stays on GitHub Pages; nothing is dropped." Reason: GitHub refuses pushes over about 2 GB and Pages caps a site at about 1 GB. Design:
- CDN dirs: lex, texts, cv, uv, unlinked, ix, dx, cd, lm, wit, pg, tc, sum. Everything else stays on Pages.
- Private S3 bucket behind CloudFront (OAC, HTTPS, gzip and brotli, PriceClass_100, CORS for dmytrozahor.github.io and localhost:5173, immutable one-year cache).
- Objects live at `data/<buildId>/<dir>/...`, buildId `<yyyymmddHHMM>-<short sha>`; the live one is `202610172033-58e8ebf`. The bundled pointer `src/data/data-version.json` makes the switch atomic; `data:prune` keeps the newest 3 plus the live one.
- Files of 9 MB or more are stored gzipped (CloudFront compresses only up to 10 MB). Upload is resumable and verified by count and size before the pointer moves.
- The old orphan branch `ukr-lexicon-data` (B-5e) is history, not the publish target.

## 7. Still harvesting, NOT in this build

`index.jsonl` line counts, read about 22:08 UTC 2026-10-17 [idx]:

| source | worker (the copy chain9/10 used) | harvester box 3.70.112.140 |
|---|---|---|
| wikisource-uk | 76,600 | 103,450, running (`harvest/wiki.ts wikisource-uk`, up since 05:16) |
| r2u | 10,616 | 16,577, running (`harvest/r2u.ts`, started 17:54) |
| hv4 (Зизаній, Смотрицький, Беринда) | not on worker | 3 lines, `STOPPED.json` present, no process |

Other sources are only on the worker (the harvester box has just these three dirs): wikipedia-uk 1,438,066 (STOPPED), wikipedia-rue 10,349, wiktionary-uk 63,433, archive-ukr 10,000 (STOPPED), gramoty 1,257, user-books 354, hplt 299 (STOPPED), poets 339, hrushevsky 125, archive-rusyn 106, archive-hrushevsky 41, faust-lukash 29, archive-kuban 5.

The harvester is therefore ahead of the build by about 26,850 wikisource-uk lines (+35%) and about 5,960 r2u lines (+56%) [calc]. The wikisource-uk ingest is a filter: of 39,201 processed items only 1,407 became witnesses (36,075 "not-ukrainian-category"), so extra index lines do not translate one to one into witnesses. Their token yield is UNVERIFIED. Wikisource gave 4.1M of the 46.35M, so a large gain moves N only a little. I did not read hv4's `STOPPED.json`, so why it stopped is UNVERIFIED. Index lines count items found, not fetched successfully (some rows have `status: 404`, `bytes: 0`, e.g. in archive-ukr). The wikipedia-uk and HPLT ingests used part of the harvest (9,507 items of 1.44M index lines; 40 of 299 shards); the reason is UNVERIFIED (a cap or sampling in the ingest, probably).

## 8. Caveats

- Chain10 differs from chain9 by one kept lemma (74,739 against 74,738) and about 200 linked tokens, as expected from a small code change. I did not diff the two builds' outputs.
- The century and source splits in section 4 are my parse of the REPORT table, not pipeline output.
- 24.8% of tokens remain unlinked, concentrated in Middle Ukrainian and Church Slavonic spellings.
