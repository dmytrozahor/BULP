# archive.org harvest funnel: where the 18,516 lines went (build next8, run 20261104T004507Z)

Read-only audit on the AWS worker, 2026-11-04. Nothing in `~/BULP` was changed; the scripts ran from `~/funnel` at nice 19 and replay the gate of `pipelines/ingest-harvest.ts` (`textTokens`, `witnessFrom`, `runArchive`) on every status-200 harvest item. Inputs: `data/raw/harvest/<src>/index.jsonl` + `items/`, `data/work/ingest-manifest/*.json`, `data/work/hv_*.json`, `public/data/wit/*.json` (n, linked per witness), `~/logs/runs/20261104T004507Z/{ingest,build.a1}.out`.

## 1. The short answer

1. **The 18,516 lines are 10,000 items.** 8,516 lines are append-only retry lines (`404>200` 8,496, `404>404` 17, `404>500` 3). The ingest reads only status-200 lines.
2. **The harvest itself stopped at 10,000 of 24,031 matches** (`log.txt`: `numFound 24031`; `advancedsearch` page 101 was the last, `STOPPED.json` reason DONE). 14,031 matching items were never listed. This is the largest single gap, and it is not in the pipeline.
3. **68% of the 10,000 items are Galician Sejm documents** (6,839 ids "Kadencja ..., Alegata do Sprawozdań Stenograficznych" / "Sprawozdanie Stenograficzne", archive.org language `pol;ukr` 6,212, `pol` 625). 6,598 of them were fetched; the ingest dropped 5,819 (88%) as `too-short` because they are Latin-script Polish and have no Cyrillic tokens. That drop is correct and is the whole reason 9,438 items give only 2,663 new witnesses.
4. **But 779 of the Kadencja documents got in** (602,662 tokens): archive.org's Ukrainian OCR read the Polish pages as Cyrillic look-alike junk (`Копігоїціаса па се роіггебпет`), which passes the Cyrillic-token gate and, because short words like `па`, `со`, `і`, `я` are real Ukrainian words, is even linked at 65-79%.
5. **The gate has no language test at all**, only (a) a Cyrillic-letter token filter and (b) a line filter for Russian apparatus (`ъ ѣ э Ъ Ѣ` or 9 Russian function words anywhere in the line). So Polish OCR junk and Russian-language books pass, while Galician Ukrainian in etymological orthography (`ъ`, `ѣ`) is partly deleted.

## 2. Funnel with exact counts

### 2.1 Index to witness, per source set

Lines = lines of `index.jsonl`; ids = distinct `id`. "read" = status-200 lines that reached `witnessFrom` or a manifest check.

| source | lines | ids | final 200 | final 404 | final 5xx | already-in-manifest | unchanged (not read) | read this run | too-short | duplicate | **witnesses written this run** | tokens this run |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| archive-ukr | 18,516 | 10,000 | 9,438 | 173 | 389 | 1 | 941 | 8,496 | 5,827 | 6 | **2,663** | 15,737,521 |
| archive-rusyn | 121 | 106 | 102 | 1 | 3 | 0 | 0 | 102 | 61 | 1 | **40** | 444,024 |
| archive-kuban | 7 | 5 | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 1 | **4** | 86,672 |
| archive-hrushevsky | 46 | 41 | 40 | 0 | 1 | 0 | 0 | 40 | 3 | 8 | **29** | 1,951,294 |
| linguists | 26 | 26 | 26 | 0 | 0 | 0 | 0 | 26 | 1 | 0 | **25** | 1,610,887 |
| archive-hv5-authors | 28 | 28 | 27 | 1 | 0 | 1 | 0 | 26 | 0 | 0 | **26** | 502,280 |
| **sum** | 18,744 | 10,206 | 9,638 | 175 | 393 | 2 | 941 | 8,695 | 5,892 | 16 | **2,787** | 20,332,678 |

Checks: archive-ukr 9,438 = 1 + 941 + 8,496; 8,496 = 2,663 + 5,827 + 6. The 941 "unchanged" items are the witnesses already built before (937 witnesses + 4 duplicates), so the build's `6114 reused, 2735 computed` is this table: 2,787 files rewritten this run, 2,735 with no token-cache entry (the other ~50 have identical content to cached ones). Build totals: 9,064 found, 8,849 admitted, 215 excluded. All 6,604 `hv_*` files are admitted; the 215 exclusions are `excludeReason` Russian-language pieces (Shevchenko etc., ingest-izbornyk) and authors without a vetting record, none from the archive sets.

The index has no year/PD, size or language filter of its own: the PD rule (`date:[1000 TO 1925]`, 1934 for Hrushevsky) and `language:(ukr OR Ukrainian)` are in the harvester query (`harvest/archive.ts`), so every one of the 10,000 ids already passed them. Years of the 9,438 fetched: 9,395 (99.5%) are dated 1850 or later, 43 earlier. No item is `undated` (0 `undated` skips). `ingest-harvest.ts` itself has exactly three item filters: status, `too-short` (< 20 Cyrillic tokens after the line gate) and cross-source duplicates; plus the invisible fourth, the line gate, which removes tokens inside admitted witnesses.

### 2.2 Filter by filter

| filter | items (archive-ukr unless stated) | what they are | right? |
|---|---|---|---|
| Not harvested (query depth 10,000 of 24,031) | 14,031 ids | alphabetically after `jbc.bj.uj.edu.pl.DIGCZAS002004_08_1_450` (sort `identifier asc`) | **No**: a harvester limit, content unknown |
| status 404 final | 173 (156 never retried, 17 retried twice) | `iaFile: ''`, archive.org has no `_djvu.txt` in the item metadata: Bukovina, Svoboda, Ruska Rada, Věstnik, Gosudarstvennye-dohody issues | Mostly right (no text exists), but all 173 are Ukrainian press or Russian budgets, none Sejm |
| status 5xx final | 389 (384×500, 4×502, 1×504); 241 are Kadencja, **148 are other Ukrainian press** (Bukovina, Ruslan, Věstnik) | transient server errors; `--retry-404` retries only 404 | **No for the 148**: never retried |
| already-in-manifest | 1 | url already ingested by `pipelines/manifest.ts` | right |
| duplicate (witness id / url / content hash) | 10 in archive-ukr (6 this run), 8 hrushevsky, 1 rusyn, 1 kuban | `etnohr_*` = hv6 per-record witnesses, Hrushevsky volumes, `hrammatyka_1818` = linguists | right (same text from a better-ranked source) |
| too-short (< 20 Cyrillic tokens) | 5,827 archive-ukr + 61 rusyn + 3 hrushevsky + 1 linguists = 5,892 | see 2.3 | 5,884 right, 8 arguable |
| line gate (inside admitted witnesses) | 7,970,545 tokens removed from 3,724 archive witnesses vs. a gate of Russian function words only | `ъ ѣ э` in a line deletes the whole line | partly wrong, see 2.4 |

Examples (20 random each, seeded). Final 404: Житє і слово т. 6 1897 (`iaFile` empty), Svoboda 1916 and 1922, Bukovina 1905 č. 70, 79, 21, 45/46, 1896/97 č. 281, Ruska Rada 1902-1905, Věstnik 1901-1917, Общая государственная роспись 1915. Final 500: 13 of 20 were Kadencja Alegata/Sprawozdania (V-VII), the others Bukovina 1909 č. 81, Ruslan 1911 č. 54, Věstnik 1891, 1894, 1895, 1909 Soderžanê, Gosudarstvennye-dohody 1905. Verdict: the 404s have no text file on archive.org (right, unless the file exists under another derivative name), the 500s are transient and should be retried.

### 2.3 too-short (5,892 items): language and script of what was dropped

| class | items | note |
|---|---|---|
| Kadencja/Sejm, Latin-script Polish (0 Cyrillic letters) | 5,816 | `pl` stop-word hit 5,717 of 5,886 Latin-dominant items |
| Kadencja near-empty (< 300 letters) | 3 | |
| other Latin-script: Carpatho-Rusyn books OCR'd as Latin junk | about 49 of the 61 rusyn items | `lang=sla`, `cyr=0`, text `BBMb, AKO Če3b TBOEŇ KPBIKOU`: the Cyrillic page was OCR'd with a Latin model |
| other Latin-script: genuinely foreign (Hungarian, German, French, Czech, English, Polish, Latin, Slovak) | 12 rusyn + 3 hrushevsky + 1 linguists + 5 archive-ukr | `Die ukrainische Frage`, `Abrégé de l'histoire de l'Ukraine`, `Ruthenische Grammatik`, Samorząd Krzemieniecki (Polish) |
| Cyrillic text killed by the line gate | **1** | Věstnik Peremyskoi Eparhìi 1912 č. 11: kept 15, would keep 218 |
| Ukrainian postcard captions | 2 | 9 and 16 tokens, right |

Total 5,816 + 3 + 49 + 21 + 1 + 2 = 5,892.

20 random examples of the 5,827 archive-ukr too-short (seeded): all 20 were `[Kadencja VII/VI/III, sesja .., al. ..] Alegata do Sprawozdań Stenograficznych` with `cyr=0`, `lat` 448-36,400, `pl` stop-words 3-357, kept 0-6 tokens. Examples: `Kadencja VII sesja V al. 133` (48,276 B, `przez połączenie pewnej liczby obecnie od- dzielnie istniejących gmin`), `al. 74` (645 B), `Kadencja VI sesja III al. 244` (34,171 B, `kwotę 5.000 zł. na pokrycie kosztów`). **Verdict: all correct, 20/20.** Non-Kadencja too-short items (8 in archive-ukr, listed in section 2.3 table above): 7 correct, 1 wrongly dropped (Věstnik 1912/11).

Good texts wrongly dropped as whole items: **1** (218 tokens) in the 5,892. The 61 rusyn items are not wrongly dropped by the code: the OCR text on archive.org is junk, so a re-OCR is the only way to get them.

### 2.4 The line gate inside admitted witnesses (the real "wrongly dropped" volume)

`RU = /[ъѣэЪѢ]|что|это|или|который|быть|были|также|только|если|когда/` applies to the whole OCR line (`oldOrth=false` for every archive source). Galician and Bukovinian Ukrainian before about 1920 is printed with `ъ ѣ` (Věstnik Peremyskoi Eparhìi, Ruskij Sion, Ukrainian folklore collections), so those lines are thrown away as "Russian apparatus".

| measure (archive-ukr witnesses, 3,600) | witnesses | tokens |
|---|---|---|
| kept by the gate (all 3,724 archive witnesses written from these items) | 3,724 | 59,076,992 |
| would additionally be kept with Russian function words only (`oldOrth`) | 3,724 | +7,970,545 |
| of that, in archive-ukr witnesses that are Ukrainian-dominant (Ukrainian stop-words >= Russian, not Latin-dominant) | 2,513 | **2,001,689** |
| of that, in witnesses losing >= 30% of their lines | 269 | 1,749,601 (they keep only 768,862) |
| of that, losing >= 50% | 258 | 1,572,587 |
| in archive-ukr witnesses that are Russian-dominant (the gate is right here) | 123 | 4,042,339 |

231 Věstnik issues alone lose 510,229 tokens; the rest are Ukrainian folklore volumes printed in the Russian-Empire orthography (`Малорусские сказки` 181,777; `Песни любовные, семейные` 160,061; `Изъ устъ народа` 85,727; `Апокріфи старозавітні` 81,815; `Старосветский бандуриста` 117,287). Upper bound: some of these lines are the Russian commentary of the folklorists, which is what the gate wants to remove, so 1.6-2.0M tokens is a ceiling, not an estimate.

20 random examples of witnesses losing >= 50% (all Ukrainian-dominant): Věstnik 1900/12 (kept 5,357 of 11,667), Věstnik 1896/2 (111 of 765), Věstnik 1897/4 (406 of 2,709), Věstnik 1890/10 (542 of 7,319), Ruskij Sion 1880/3 (1,193 of 11,956), `Сборник материалов по малорусскому фольклору` 1902 (16,878 of 78,865), Věstnik 1899/6 (888 of 2,656), 1899/5 (556 of 2,422), 1891 Soderžanê (97 of 330), 1898/3 (504 of 2,258), 1903/13 (168 of 550), 1903/15 (131 of 1,205), 1905/2 (1,723 of 7,424), 1894/8 (318 of 1,563), 1900/2 (762 of 6,121), 1898/12 (502 of 1,410), 1893/6 (2,263 of 5,089), 1907/4 (327 of 3,470), 1906/14 (372 of 5,700), 1907/12 (112 of 1,117). **Verdict: 20/20 wrongly cut** (Ukrainian text with `ъ`/`ѣ`, e.g. `Коли тамъ искуситель приступивъ до него, рекъ ему`).

## 3. Admitted witnesses: language purity of the new archive set

New = written by this ingest and not from wikisource: 2,792 witnesses, 21,321,772 tokens (31% of N = 68,212,711), linked 75.7% (16,133,434). The rest of the corpus is linked 76.4% (46,890,939 tokens), so the new set accounts for only 0.2 points of the drop to 76.2%. Per source linked share: archive-ukr 76.1%, rusyn 60.2%, kuban 69.5%, hrushevsky 84.4%, linguists 53.6%, hv5-authors 81.7%.

### 3.1 Class counts (new set)

Definitions, all measured on the witness's own admitted tokens (`data/work/hv_*.json`) and `public/data/wit` n/linked:
LAT = non-Cyrillic words dropped by the token filter are > 50% of all words (the page is Latin text with a few Cyrillic look-alike OCR tokens); RU = not LAT, at least 20 Russian-only function words (`что это как его они ...`) and more than twice the Ukrainian-only ones (`що це як його вони ...`); GARB = not LAT/RU and linked < 30%; MIX = not suspect but 20-50% of words non-Cyrillic.

| class | new witnesses | tokens | % of new tokens | % of N | linked share of the class |
|---|---|---|---|---|---|
| LAT (Polish/German/Latin OCR junk) | 933 | 1,162,528 | 5.5% | 1.7% | 65.7% |
| of which title Kadencja/Sprawozdanie/Alegat | 777 | 578,869 | 2.7% | 0.8% | 68.2% |
| RU (Russian-language books) | 31 | 581,143 | 2.7% | 0.9% | 39.9% |
| GARB (linked < 30%, not LAT/RU) | 4 | 76,649 | 0.4% | 0.1% | 24.5% |
| **suspect total** | **968** | **1,820,320** | **8.5%** | **2.7%** | 55.7% |
| MIX (part junk, part good) | 213 | 2,367,018 | 11.1% | 3.5% | 61.9% |
| clean (2,792 - 968 - 213) | 1,611 | 17,134,434 | 80.4% | | 79.7% |

**New witnesses under 30% linked: 178**, but they hold only 97,310 tokens (0.46% of the new tokens, 173 of them < 15%, 20,558 tokens): single tiny pages of OCR junk. Under 50% linked: 484 witnesses, 2,268,868 tokens. So "linked < 30%" is the wrong alarm: the LAT/Kadencja junk is linked at 65-79% (short Ukrainian words) and slips under it. The existing OQ gate (`core/ocr-quality.ts`, S = linked share x (1 - hapax rate)) marks 365 low + 265 garbage among the new ones but keeps them in N; it only blocks first attestations.

Biggest suspect witnesses by tokens (new): Библія 31 книга Ветхаго Завѣта 1874 (115,307 tokens, ru stop-words 4,460 vs uk 153, Russian Synodal text), Holmskìj Narodnyj Kalendar' 1901 (81,323, ru 722 vs uk 51), Матерiалы Для Географiи И Статистики Россiи Екатеринославской 1862 (79,245), Русско-малороссийский словарь т.1 1897 (68,872, linked 24%; a Russian-Ukrainian dictionary counted as Ukrainian text), Materiały Ukraińskiej Ludowo-Republikańskiej Partii 1919 (62,664, unmapped 51%, Polish), Kadencja VII/VI Alegata volumes (46,450 and 44,187 tokens, 96% non-Cyrillic).

### 3.2 Random sample of 30 new witnesses (seeded, from the 2,792)

Verdict is a read of the first 40 tokens from the middle of the witness and the title.

| # | witness | year | tokens | linked | verdict |
|---|---|---|---|---|---|
| 1 | Bukovina 1896 č. 89 | 1896 | 5,870 | 88% | Ukrainian, clean |
| 2 | Kadencja IV sesja II pos. 10 | 1878 | 259 | 60% | **BAD** Polish, junk `бйВшК г'я'ьььььи` |
| 3 | Věstnik Peremyskoi 1915 č. 7 | 1915 | 1,874 | 73% | Ukrainian, clean |
| 4 | Věstnik 1904 č. 5 | 1904 | 683 | 57% | Ukrainian/Ruthenian, noisy |
| 5 | Věstnik 1900 č. 8 | 1900 | 229 | 58% | Ruthenian, noisy |
| 6 | Věstnik 1897 Soderžanê | 1897 | 320 | 57% | Ruthenian, clean |
| 7 | Věstnik 1914 č. 7 | 1914 | 875 | 64% | Ukrainian, clean |
| 8 | Věstnik 1917 č. 12 | 1917 | 580 | 84% | Ukrainian, clean |
| 9 | Věstnik 1912 č. 7 | 1912 | 352 | 41% | mixed (Latin ecclesiastical text read as `Ргої Веаііѕѕіте Раф`) |
| 10 | Kadencja II sesja II pos. 26 | 1868 | 233 | 70% | **BAD** Polish junk |
| 11 | Kadencja I sesja III pos. 50 | 1866 | 216 | 67% | **BAD** |
| 12 | Věstnik 1917 č. 3 | 1917 | 4,909 | 86% | Ukrainian, clean |
| 13 | Kadencja I sesja III pos. 33 | 1866 | 527 | 68% | **BAD** |
| 14 | Kadencja II sesja I pos. 6 | 1867 | 84 | 70% | **BAD** |
| 15 | Věstnik 1900 č. 2 | 1900 | 762 | 47% | Ruthenian, clean |
| 16 | Kadencja III sesja I pos. 8 | 1870 | 372 | 77% | **BAD** |
| 17 | Kadencja I sesja IV pos. 16 | 1866 | 525 | 65% | **BAD** |
| 18 | Kadencja III sesja II pos. 4 | 1871 | 65 | 55% | **BAD** |
| 19 | Історія про гарну Маґельону 1918 | 1918 | 19,355 | 91% | Ukrainian, clean |
| 20 | Kadencja I sesja III pos. 32 | 1866 | 303 | 69% | **BAD** |
| 21 | Письмо Аристея к Филократу (Ivanitsky) | 1916 | 4,411 | 37% | **BAD** Russian + German citations |
| 22 | Svoboda 1902 | 1902 | 6,180 | 89% | Ukrainian, clean |
| 23 | Peremysʹkì Eparhìâlʹnì Vìdomostì 1922 | 1922 | 3,300 | 79% | Ukrainian, clean |
| 24 | Словник московсько-український (Dubrovskiy) | 1918 | 152,501 | 51% | **suspect** half of every entry is the Russian headword |
| 25 | Holmskìj Narodnyj Kalendar' 1903 | 1903 | 14,627 | 46% | **suspect** Russian-dominant (ru 105, uk 28) |
| 26 | Общая государственная роспись 1916 | 1916 | 37,808 | 47% | **BAD** Russian, tables |
| 27 | Věstnik 1910 č. 16 | 1910 | 116 | 64% | **BAD** junk (`Ваши ао аа а а сы ег сот`) |
| 28 | Kadencja II sesja II (Stenograficzne Sprawozdania, whole period) | 1868 | 10,372 | 67% | **BAD** Polish, 606,129 non-Cyrillic words dropped |
| 29 | Народна Часопись 1907 č. 277 | 1907 | 4,340 | 80% | Ukrainian, clean |
| 30 | Pravda 1896 | 1896 | 4,064 | 85% | Ukrainian, clean |

Result: 14 clean, 13 bad, 3 suspect/mixed. By witnesses 43% bad (population: 34.7% suspect, 7.6% MIX); by tokens the sample is dominated by one dictionary (Dubrovskiy 152,501 of 276,112), so the population figure (8.5% of new tokens suspect) is the one to use. Mean linked share of the 30 is 66%; of the 13 bad ones median 67%, which is why a linked-share threshold does not find them.

20 random examples per class, for the record (seeded): RU class (Věstnik issues with Ruthenian orthography are NOT Russian and are not in RU; the RU class is the Bible, Holm calendars, state budgets, Gogol `Вечера на хуторѣ` (ru 188 vs uk 7), `Пища и питье крестьян-малороссов` 1899, Soderžanie, Bantysh-Kamensky 1822, Danyliv 1910 Russian commentary); LAT class (Kadencja Alegata and Sprawozdania, Bukovina/Věstnik pages that are German/Latin tables, Wrocław archive `Materiały dotyczące Jurka Tiutiunnyka` 1921, 70,194 tokens, 47% non-Cyrillic).

## 4. Effect on N

| scenario | N (68,212,711 now) | linked share |
|---|---|---|
| now | 68,212,711 | 76.2% (51,976,052) |
| drop LAT + RU + GARB of the new set (968 witnesses) | 66,392,391 (-1,820,320) | 76.76% |
| also drop MIX of the new set (213) | 64,025,373 | 77.31% |

The same three classes among witnesses from earlier builds (archive, written before this ingest): LAT 15 witnesses / 119,434 tokens, RU 36 / 1,786,531, MIX 12 / 284,309. Over all archive witnesses (3,727, 59.49M tokens): LAT 948 / 1,281,962, RU 67 / 2,367,674, MIX 225 / 2,651,327.

Suspect share of the current N: 1.82M new + 1.91M old = **3.73M tokens, 5.5% of N** (certain junk or non-Ukrainian). MIX adds 2.65M (3.9% of N) that is partly good. Removing all certain suspects (new and old) gives N of about 64.5M and a linked share of about 77.2%. On the other side the line gate loses up to 1.6-2.0M good tokens (section 2.4), so the net bias of N from the archive ingest is roughly +1.7M to +2.1M tokens of dishonest text, 2.5-3% of N.

## 5. Recommended fix (not applied, owner decides)

Order by value:

1. **Page/line language gate in `textTokens`** (ingest-harvest.ts): drop a line when more than 50% of its words are non-Cyrillic (Latin junk lines), and skip the whole item when the share of non-Cyrillic words over the item is > 50% (this single rule removes all 933 LAT witnesses, 1.16M tokens, and would have kept the other 5,819 Kadencja items out as before). Bump `ITEM_PARAMS` so the manifest reruns. Expected: N -1.16M new (-1.28M with the old ones), linked +0.4 pt.
2. **Document-level Russian test** at ingest: count Russian-only vs Ukrainian-only function words; if ru >= 20 and ru > 2 x uk, set `excludeReason` (the existing mechanism that already excludes Shevchenko's Russian poems, `core/types.ts:43`) instead of silently admitting. Expected: -0.58M new (31 witnesses), -2.37M over all archive witnesses; also keeps the Russian dictionary side (Dubrovskiy 152k, Русско-малороссийский 69k) out of Ukrainian N or routes it to vocabulary-only.
3. **Replace the unconditional `ъ ѣ э` line rule** by `oldOrth = true` when the item is Ukrainian-dominant (uk stop-words >= ru) and dated before 1925 (all archive items are); keep dropping lines with Russian function words. Expected: +1.6-2.0M good tokens (ceiling), mostly Věstnik, Ruskij Sion, folklore volumes; linked share about neutral.
4. **Harvester**: retry the 148 non-Kadencja 5xx ids and the 173 404s once more with `--retry-404` extended to 5xx; skip the 241 Kadencja 5xx; and continue past the 10,000 depth limit (search by `identifier` ranges or the scraping API with a cursor) to reach the 14,031 unharvested ids. Expected: roughly +0.3-1.9M tokens from the 321 retryable ids (Bukovina and Svoboda issues average about 5-6k tokens); the 14,031 are unknown and, if the Sejm series continues, may again be mostly Polish, so rule 1 should land first.
5. Optional: add a pre-filter on the harvest query (`-title:Kadencja -title:Sprawozdanie`) to stop fetching 6,839 Polish Sejm ids; and a re-OCR list for the 45 Carpatho-Rusyn Cyrillic books that archive.org OCR'd as Latin (rusyn set, `cyr=0`).

Net expected effect of 1+2+3: N about 68.2M - 3.7M (new and old suspects) + up to 2.0M recovered = about 66.5M (64.5M if nothing is recovered), linked share about 77%. N shrinks by 2-5%, but the composition becomes honest: about 3.7M tokens of non-Ukrainian or junk text leave and up to 2M of real Ukrainian text come back.

## 6. Reproduction

Scripts (not committed, they live in `~/funnel` on the worker): `st.js` (index status/sequence), `mf.js` (manifest outcomes), `items.js` (replays `textTokens` with `oldOrth` false/true on all 9,638 status-200 items and counts letters/stop-words per language), `wits.js` (per-witness stop-words, non-Cyrillic share, n/linked from `public/data/wit`), `an1..an7.js` (tables above). The sample uses a fixed LCG seed so it can be re-drawn.
