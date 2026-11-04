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

## 7. CQ-1 result: the fixes measured (2026-11-04)

Implemented as SPEC 63 CQ-1 (`pipelines/lang-gate.ts`, `textTokens` / `witnessFrom` in `pipelines/ingest-harvest.ts`, `ITEM_PARAMS = 'gate2-cq1'`, `harvest/archive.ts`, `harvest/ia-text.ts`; tests `tests/cq1.test.ts`). Measured by replaying the real `witnessFrom` on all 9,638 status-200 items of the worker's harvest (`~/cq1/repo`, nice 19, read-only on `~/BULP`, no build). Archive witnesses of the next8 build: 3,746 admitted by the old gate (3,743 matched to `public/data/wit`), 61,102,414 tokens.

| fix | witnesses | tokens | audit prediction |
|---|---|---|---|
| 1 item gate, >50 % non-Cyrillic words (`non-cyrillic`) | 870 removed (777 Sejm titles) | -948,704 (Sejm -578,869) | 933 / -1.16M new set, 948 / -1.28M all archive witnesses |
| 1 line gate, >50 % non-Cyrillic words in a line | 216,940 lines in kept items | -166,214 | not predicted |
| 1 Polish look-alike detector (`polishLookalike`) | 0 extra | 0 | 779 Kadencja docs (all caught by the item gate) |
| 2 Russian-language document, `excludeReason` (OCR sources) | 158 | -3,938,669 | 31 new + 36 old / -0.58M new, -2.37M all |
| 3 pre-1925 Ukrainian-dominant `oldOrth` | 1,530 witnesses gain lines, +1 item admitted (Věstnik 1912/11, 218 tokens) | +2,093,916 | up to +1.6-2.0M |
| archive witnesses, N | 3,743 | 61,102,414 -> 58,147,133 (-2,955,281) | |
| **corpus N** | | 68,212,711 -> **65,257,430** (63.16M without gate 3) | 66.5M (64.5M without recovery) |
| **linked share** | | 76.20 % -> **77.85 %** | about 77 % |

The linked share assumes that each removed or recovered token is linked at the share of its own witness (public/data/wit n and linked); the real figure comes with the next build. N is lower than predicted (65.26M against 66.5M) because gate 2 finds 158 Russian documents, not 67: the audit counted the stop words in the admitted tokens, where the old line gate had already deleted most Russian lines; the replay counts them in the raw text.

**Gate 1 and the Polish look-alike detector.** The 50 % item gate alone removes 949 of the 952 Sejm-titled items that passed the Cyrillic-token check (931 of them have >= 90 % non-Cyrillic words). The two Sejm-titled survivors are `Kadencja III, sesja III, al. 26` (1872) and a Wrocław ministry file. **The first is real Ruthenian text in old orthography** (`ъ къкЗоЗ обли- гавтами черезъ край ... комисїя`), so a title test alone would delete a Ukrainian witness: the title only counts together with a fragment profile. What separates look-alike Polish from Ukrainian is the share of the Cyrillic tokens that are Polish-reading fragments (`ро со па сі пе пі піс пів рр ре ра фо ша уп оо ы кк діа`): median 0.10, 75th percentile 0.15, 90th 0.19 over the 950 gated Sejm items; maximum 0.112 over the 2,857 Cyrillic items that pass (a Latin-transliterated primer); the two Sejm-titled survivors 0.002 and 0.013. Limits: fragment share > 0.15 alone, or > 0.03 together with a Sejm title; OCR sources only. Single letters `р с` are not counted (they are the abbreviations `р.` `с.` of real documents: a first version with them flagged a Ukrainian ministry order `Наказ МКТ ...` on the local wikisource sample). In the present harvest the detector finds nothing the item gate has not removed already; it guards the new items of the scrape.

**Gate 2, evidence and decisions.** Rule: at least 20 Russian-only function words (`что это как его они она также только который которые если когда был была были быть или нет ещё уже между после потому чтобы очень этот эта эти меня`) and more than twice the Ukrainian-only ones (`що це як його вони вона також тільки який які якщо коли був була були бути або немає ще чи дуже цей ця ці мене але щоб вже між після`; forms shared by both languages such as `тебе тому перед` are in neither set). Spot-check of 30 of the 158 exclusions (seeded, the middle of the text read): 26 Russian-language books (21 state budgets `Общая государственная роспись`, Aristeas, Pososhkov, Kulish's Russian novellas, Holm calendars, a church history, an ethnographic collection), **1 wrong** (`Отрывок малорусского простонародного лечебного травника`, a Little-Russian medical text of 1,091 tokens, ru 72 vs uk 29), **2 arguable** (`Акты, относящиеся к истории Южной и Западной России` t. 6 and `Архив Юго-Западной России` ч. 3 т. 1: Ruthenian chancery documents inside a Russian-language edition; ru 4001 vs uk 140 and 2853 vs 207). Error rate 1/30 (3 %), 3/30 (10 %) counting the arguable ones. The exclusions with a ratio between 2 and 4 (39 witnesses, 676,262 tokens) hold the wrong case and most of the arguable ones (Стародубська актова книга 1693, `Малороссийские исторические песни и думы`, `Грамматика малороссийского наречия` 1818, `Новый Пролом`) but also 16 of the 21 budgets; the ratio is left at the specified 2 and can be moved in `isRussianDoc` (`pipelines/lang-gate.ts`).
- **Bilingual dictionaries, by evidence.** Dubrovskiy's `Словник московсько-український` (152,501 tokens): ru 135 vs uk 1008, **not** excluded (headwords carry no function words, the Ukrainian explanations do). `Русско-малороссийский словарь` t. 1: ru 379 vs uk 478, not excluded. `Українсько-російський словник` (1909, two copies, 65k tokens each) and `Словарь малороссийских идиомов` (68,805): ratio 2.1-2.2, **excluded**. So the document test treats dictionaries inconsistently; the Russian headwords of the first two (about 220k tokens) stay in N. A dictionary needs its own rule (vocabulary-only routing by genre); not done here, recorded as an open decision.
- Ukrainian text quoting Russian stays (test: 12 Ukrainian lines against 3 Russian ones); old-orthography Ukrainian (`ъ ѣ`, no Russian function words) is not Russian (test).
- **Only OCR sources are judged** (archive-*, linguists). The same test on the local uk.wikisource sample (32,851 items) would exclude 21 items, about 11,000 tokens: Shevchenko's Russian `Автобіографія`, the Turgenev and Polonsky memoirs of Shevchenko, Maksymovych `Книжная старина Южноруская`, Hrinchenko's Russian preface (all correct), but also 18th-century chancery documents (`Генеральне слідство про маєтності Лубенського полку`, `Інструкція о судахъ 1730`, `Повний список ... Розумовського` 1750) and Pavlovsky's grammar. Wikisource is hand-transcribed and the existing exclusion mechanism handles its Russian pieces, so wikisource stays as it was; the 21 are an open decision for the owner.

**Gate 3: 30 recovered lines, spot-check** (seeded, one line from each of 30 of the 1,530 gaining witnesses; Věstnik Peremyskoi Eparhìi 17, Bukovina 8, Gromadsʹkij Vìstnik 5): 18 are real Ruthenian/Ukrainian lines or names (`щобы нашь нардодъ ... молёмъ Бога`, `Зразу віддано „Въетникъ“ в руки`, priest names), **11 OCR noise** (`ВЪЕТНИЕЪ`, `018 биет Эрођее іп гад.`, `ЕЭ`, `разом 7 ИСЭ`; 6 of them contain `Э`), **1 Russian** (`общею характеристикою переселенцевь изъ отдЪльныхъ мБетностей Россіи`). So 60 % good lines, 37 % noise lines (very short, low weight in tokens), 3 % Russian. The letter `э Э` was part of the old rule; the audit's oldOrth keeps lines with it. An extra line rule on `э Э` would remove most noise lines at the cost of a few real lines; not applied because the instruction was function words only. The recovered 2.09M tokens are a ceiling, not an estimate.

**Real Ukrainian is not hit** (local sample = the main clone's `data/raw/harvest`, the real `witnessFrom`, the old rule replayed beside it): uk.wikisource 32,851 items 19,238,483 -> 19,107,187 tokens (-0.68 %); Шевченко 378 items 178,287 -> 176,930 (-0.76 %), 0 excluded; Франко 670 items 654,871 -> 653,546 (-0.20 %), 0 excluded; Кобзар 269 items 103,109 -> 103,063 (-0.04 %). Where the tokens went: 9 Шевченко-Кобзар and 1 Франко item that are Latin transliterations (`Kobzar’/Do Osnowianenka`: about 109 look-alike tokens each) and the lines of German / Polish / French quotations (89 lines, 378 Cyrillic tokens in these three groups, among them Franko's critical prose typed with a Latin `i`, `соцiальних`). Every pure-Ukrainian line of «Заповіт» and «Каменярі» keeps every token (test). Hrushevsky (125 pages): 993,823 -> 993,037 (-0.08 %). The manifest witnesses (Kobzar and the others in `pipelines/manifest.ts`) do not pass `textTokens` at all.

**Harvester** (box 3.70.112.140, directory `~/BULP-cq1` = copy of `harvest/*.ts`, writing into `~/BULP/data/raw/harvest/archive-ukr`, log `~/logs/cq1-archive.out`, script `~/BULP-cq1/chain.sh`; the running r2u harvest was not touched). `--retry-5xx` retried the 148 non-Kadencja ids (179 lines appended; downloads that failed stay candidates). `--scrape` lists the preset query through the Scraping API: 15,677 hits with the Sejm titles excluded (`count=1000`; with `count=100` the cursor does not advance, so 1000 is used). `--retry-404 --all` (the 173 404s) runs after it: its downloads fail slowly (`curl` timeouts on `dlibra.kul.pl` items), so it was moved behind the scrape. archive.org robots.txt disallows only `/control/` and `/report/`; requests are paced at 1 s (metadata) plus 1.5 s (download); the User-Agent has no e-mail.

## 8. CQ-1b: tighter recovery, old-Ukrainian allowance, dictionaries out of N (2026-11-04)

Owner decisions after section 7: (1) add the `э Э` line rule to the recovery and re-sample; (2) keep the Russian-test ratio at 2, add an allowance for old-Ukrainian markers if a signal separates the wrongly excluded text, leave the Ruthenian chancery documents in Russian editions excluded; (3) bilingual dictionaries must not count in running-text N; (4) gate 2 stays off on wikisource. Re-measured with the same replay (real `witnessFrom`, all 9,638 items, worker, nice 19, no build).

| | before (section 7) | CQ-1b |
|---|---|---|
| gate 3 recovered | +2,093,916 tokens, 1,530 witnesses | **+2,003,800 tokens, 1,374 witnesses** (266,303 recovered lines) |
| Russian-language documents excluded | 158 / 3,938,669 | 155 / 3,807,361 |
| bilingual dictionaries excluded | 0 as such (2 by the Russian test, 130,217) | **11 / 994,906** |
| archive witnesses, N | 58,147,133 | 57,357,745 |
| **corpus N** | 65,257,430 | **64,468,042** |
| linked share | 77.85 % | **78.24 %** (same assumption as section 7) |

**1. Recovery sample, fresh 50 lines** (reservoir sample, different seed, over all 266,303 recovered lines of the non-excluded items): 10 bad of 50 = **20 %** (not over the 20 % line, so the VESUM requirement was not added). The bad lines: 6 Church-Slavonic/uppercase OCR noise (4 of them from `Izbornik of Sviatoslav (1073)`: `ант Късбклоужеепуо`), 1 `рдкъ 1910 я`, 1 `(УпЖцкІВ уѣ-ідъ)`, 2 Russian-looking (`Для чего, Для иніормацій Запедно-Европейскихъ парламентовь о русскихъ`, `да въ теплом» б%ЪльЪ и одежд не можеть`). 40 lines are Ruthenian / Ukrainian (Věstnik 15, folklore volumes 12, Ruskij Sion 4, Bukovina 4, names and addresses), several with OCR noise inside real words. The earlier sample had 12 of 30 bad (40 %); the `э` rule alone brings it to 20 % and the recovered total falls by 90,116 tokens (2.09M to 2.00M; part of that is the dictionaries now excluded). If the owner wants less, the next step is the VESUM-known word of 4+ letters per line (not built: it needs the lexicon index inside the ingest) or leaving out the Izbornik of Sviatoslav (a Church Slavonic text, not Ukrainian-dominant by nature).

**2. Russian-test allowance.** Signal: share of old-Ukrainian marker words (`тогды тоды теды такьже такъже єсть єго єй єст`) among the tokens. The wrongly excluded medical text `Отрывок малорусского простонародного лечебного травника` has **13.8 per mille**; the highest of the other 157 excluded documents is 5.0 (a church history, 129k tokens), next 1.9 (Стародубська актова книга 1693) and 1.5; the budgets, memoirs and novellas have 0.0-0.6. Rule: a Russian-tested document with at least 200 tokens and at least 1 % marker words is kept. It frees exactly that one text (1,091 tokens): the signal is fitted on a single case and it separates it by a factor of 2.8 from the next one, which is all the evidence there is; a future old-Ukrainian text with fewer of these words is still excluded. Wikisource is not judged (unchanged).
Left excluded as decided, for the owner's list (Ruthenian chancery documents inside Russian-language editions): `archive-ukr` **`auzr-6`** (Акты, относящиеся к истории Южной и Западной России, т. 6, 1869, 13,092 tokens, ru 4001 vs uk 140) and **`aruzr-3-1`** (Архив Юго-Западной России, ч. 3, т. 1: Акты о козаках 1500-1648, 1863, 16,918 tokens, ru 2853 vs uk 207). Other documents of the same kind that the test also excludes, from the table in section 7: `Архив Юго-Западной России` ч. 1 т. 7 (80,527), ч. 3 (131,602), ч. 8 т. 3 (63,422), `Актовая книга Стародубскаго городового уряда 1693` (3,767).

**3. Bilingual dictionaries.** Rule (`isBilingualDictionary`, `pipelines/lang-gate.ts`): the title has a dictionary word (словарь, словник, dictionary, slovar, kyshenk, ...) and a language pair joined by a hyphen (русско-украинский, Ukrainian-English, українсько-московський, ...). A match sets `excludeReason` («двомовний словник — не суцільний текст; його зміст іде в картки через словникові конвеєри, не через корпус»), OCR sources only, before the Russian test. Excluded from N, **11 witnesses, 994,906 tokens**: Уманець–Спілка (169,410), Дубровський `Словник московсько-український` (152,496), the pocket Ukrainian-English (142,905), `Русско-украинский словарь` вип. I (135,869), Словник українсько-московський (98,528), `Русско-малороссийский словарь` т. 1 (68,864), `Українсько-російський словник` (64,927 + 65,290, previously by the Russian test), `Опыт русско-украинского словаря` (35,561), `Kyshenkovy rusko-anhlisky` (28,782) and `Uche'nyk anhliyskoi movy` (32,274, an English textbook with a vocabulary; a borderline match: its title carries both a dictionary word and the pair). Not matched on purpose: monolingual dictionaries (`Історичний словник українського язика` 538,555 tokens, `Словар чужих слів`, `Знадоби до словаря южноруского`). The nine newly excluded dictionaries hold 864,689 tokens. Dictionary content reaches the cards through the dictionary pipelines (SE), not through N.

Harvest status at the time of writing: see the CQ-1 harvest paragraph above; `~/logs/cq1-archive.out` on 3.70.112.140.

## 9. Reconciliation of next10 (run 20261104T172723Z) against the CQ-1 replay (2026-11-04, read-only)

next10: N 74,179,148, linked 57,115,802 (77.0 %), 9,520 witnesses found, 9,151 admitted, 369 excluded; the ingest line `archive-ukr: 9,907 items -> 3,210 witnesses, 64,762,396 tokens`. The replay of sections 7/8 predicted N 64,468,042 and 78.24 %: **+9,711,106 tokens**. Method: the work files `data/work/hv_*.json` of the current ingest read one by one (`~/cq1/n10.js`, nice 19, ionice idle, no write to `~/BULP`), the next8 baseline `~/funnel/wits.jsonl` (n = build n for every `hv_` witness), the replay `drive2.jsonl`, and the index. The total checks out to the token.

**The answer: (a) and (c), not (b) and not (d).**

| step | tokens | N |
|---|---|---|
| next8 N | | 68,212,711 |
| the 3,727 archive witnesses of next8 under the CQ-1/CQ-1b gates, replayed on the same baseline (59,487,631 -> 55,604,996) | -3,882,635 | 64,330,076 |
| **(a) new items**: 469 status-200 items added to the index after the audit (146.7 MB of OCR text) -> 456 new witnesses, 9,322,088 tokens; admitted 431 = 8,363,395, excluded 25 = 958,693 (not in N) | +8,363,395 | 72,693,471 |
| **(c1) stale work files**: 868 archive-ukr items that the gate now skips (425 `non-cyrillic` and 445 `too-short` files, 868 of them not excluded) keep the work file written by an earlier ingest, and the build reads it | +905,750 | 73,599,221 |
| **(c2) five sets not re-ingested**: the run printed `skip archive-rusyn / archive-kuban / archive-hrushevsky / archive-hv5-authors / linguists`, so their witnesses still come from the old gate (rusyn +55,023, kuban +77, hrushevsky +78,560, hv5-authors +19,003, linguists +427,264) | +579,927 | **74,179,148** |

The first line of the earlier prediction (64,468,042) differs from the corrected replay (64,330,076) by 137,966: it subtracted per-witness numbers of the next9 build from next8's N. All of next10's growth is in `hv_ia`/`hv_ling` (+5,966,437 admitted); the non-`hv_` part of N is identical in next8 and next10 (1,849,379), and every other `hv_` prefix is unchanged (hv_ws 5,360,685, hv_hrushevsky 993,819, hv_ez 60,320, hv_lit 39,499, hv_orig 421,378). (b) gate 3 recovered what it measured: the 3,727 old witnesses carry 2.0M recovered tokens inside the -3.88M net; replay and work file agree to the token on 2,788 of 2,852 witnesses and differ by -6,627 tokens in net on 61 others. (d) no double counting: 13 cross-source duplicates are skipped by the ingest, the `etnohr_*` volumes stay with hv6, one pair has identical title and token count (`sumtsov0malyunki` / `sumtsov10`, small), no url is shared by two witnesses.

**(c) is a pipeline bug, in two parts.** (c1) the ingest only writes witnesses; when a changed gate makes an item `skip`, its old work file is not deleted (`0 deleted` counts only vanished items). 870 old files remain (948,704 tokens, 425 of them the 893,363-token `non-cyrillic` class that CQ-1 was meant to remove: `[Kadencja VII, sesja II] Alegata` 46,450, `[Kadencja VI, sesja VI]` 44,187, `Gyakorlati kisorosz (Ruszin) nyelvtan` 26,189 twice ...), and `build` takes every `hv_*.json` in `data/work`. (c2) a changed `ITEM_PARAMS` is applied only to the sources the run reads; the other archive sets were skipped as "unchanged" although the rules changed. They hold 36 witnesses that CQ-1/CQ-1b exclude (570,451 tokens: `Русско-украинский словарь` 135,872, `Русско-малороссийский словарь` 68,872, `Опыт русско-украинского словаря` 35,561, `Объяснения малорусских и сродных народных песен` 119,105 + 26,695, `Украинский народ в его прошлом и настоящем` 18,970, ...). Fix proposals, not applied: (1) after an item-source run delete (or overwrite with an `excludeReason` tombstone) every work file of that source that the run did not write, using the ids of the previous manifest; (2) make `ITEM_PARAMS` part of every item source's signature in the same ingest, and have `ingest.sh` run all six archive sets when it changes. Expected effect of both: N -905,750 -579,927 = about 72.69M, linked share up by about 0.4 point.

**(a) the new items**, 469 items (not 270; the index grew from 18,516 to 19,008 lines during the day, the harvester box scrape plus the earlier retries). Tokens by title: `Ранок / Канадійський ранок 1914-1918` **2,187,061 in one witness** (23.5 % of all new tokens), Svoboda 237 issues 2,047,107 (1893-1902, 1916), Kapital (Marx, Ukrainian translation) 4 volumes 883,000, Bukovina 50 issues 315,723, Записки НТШ 314,201, Pelesz `Liturgika` 222,628, Бюлетень НКО УСРР 1924-25 three volumes 315,000, Ruslan 18 issues 121,445, Canadian calendars 4 about 260,000. By decade of the date: 1890s 231 witnesses, 1900s 96, 1910s 40, 1920s 53. Excluded as Russian (958,693 tokens): Bible 1889 (230,365), Maksymovych `Собрание сочинений` (194,107), two state budgets, `Сборник императорского русского исторического общества`, `Списки иерархов`, `Мир с Богом человіку` (OCR junk of a Church Slavonic print).

**Language and OCR check, the 30 largest new witnesses** (all read at the middle of the text; `uk` and `ru` = Ukrainian-only and Russian-only function words): 7 are the excluded Russian ones above. Of the 23 admitted, **all 23 are Ukrainian by function words** (uk >= ru, in 22 of them uk >= 4x ru) and 19 are clean to acceptable OCR (Ranok: noisy but real Galician-orthography text, e.g. `прівнає пори і мість сишьоватого вигляду вістане сі молоде`; Svoboda: real, `ь ъ` endings, `вь томі`, `изь старого края`, some junk words). Four have noisy OCR or mixed languages: `Записки НТШ` (English OCR junk inside: `ТНЕ СОМСЕРТ ОК ІХТЕСВАІ`), `Українсько-руський архів` (the first third is junk), the Wrocław `Materiały Sztabu Partyzancko-Powstańczego` (47 % tokens of 1-2 letters) and `Wybrane numery gazet lwowskich` (readable). Sample of 6 of the 237 Svoboda issues: all real Ukrainian-American Ruthenian text, 21 % of the tokens carry `і ї є ґ`, uk:ru function words 62,663 : 7,737; Bukovina + Ruslan 68 issues 437,168 tokens, uk:ru 20,662 : 921. So the new set is **not junk by language**; what is wrong with it is the date.

**A second bug the check found: wrong dates.** The archive.org `date` of a translation or reprint is often the year of the original. `Kapital Tom 1` is dated 1867, `Tom 2` 1893, `Tom 3` 1894, `Капітал` 1867, `Походження Сім'ї, Приватної Власності І Держави` 1884: these are Soviet-era Ukrainian translations in modern orthography (`Маркс Капітал т ОБОРОТ КАПІТАЛУ`), 1,236,611 tokens in six witnesses that would give modern Ukrainian words first attestations of 1867-1894. A heuristic (date before 1890, no `ъ ѣ`, `і ї є ґ` over 25 % of the tokens, at least 2,000 tokens) lists 41 witnesses with 1,926,615 tokens; it also catches true modern-orthography reprints (`Енеїда` 1842 in two copies, `Pelesz Liturgika` 1885 may be real), so it can only quarantine for a decision, not delete. Fix proposal: a date-plausibility flag in `witnessFrom` (orthography versus date) that sets the witness's date range to unknown or excludes it from first-attestation, plus a title block-list for Marx/Engels translations. The single-witness concentration is a second problem: `Ранок` 1914-1918 is one witness dated 1914 with 2.19M tokens; splitting by issue or giving it the range 1914-1918 would fix its attestation dates.

**Linked share.** The 9.85M tokens that the corrected replay did not expect (new items 8.36M plus stale and not re-ingested 1.49M) carry 6.78M linked tokens, i.e. 68.8 %; the rest of N is at about the predicted 78.2 %. That, not a different gate, is why next10 reads 77.0 % instead of 78.24 %. Without (c1) and (c2) and with the Marx volumes quarantined, N would be about 71.5M.

## 10. CQ-2: stale work files, gate parameters in every marker, unreliable dates (2026-11-04)

Approved after section 9. Code: `pipelines/incr-manifest.ts` (`sweepOrphans`), `ops/worker/ingest.sh` (marker), `pipelines/date-gate.ts` + `witnessFrom` (`dateUncertain`), `harvest/archive.ts --meta`, `pipelines/build.ts` (`exc`), cards `WitnessView`, `TextsView`, `Kwic`; `ITEM_PARAMS = 'gate3-cq2'`; tests `tests/cq2.test.ts`.

**1. Stale work files.** The ingest removes every `hv_ia_*` / `hv_ling_*` work file (and its `.nlp.json`) that no ingest manifest refers to, after the archive sources have run (not in a `--limit` run, and only when the manifests of all six archive sets and linguists exist). The tombstone is the item's `skipped` entry in the manifest (reason `non-cyrillic`, `too-short`, ...). Effect on next10's work files: the 870 stale files (948,704 tokens; 868 of them in N: 921,868) go at the next ingest.
**2. ITEM_PARAMS in every marker.** `ingest.sh` puts the `ITEM_PARAMS` line of `pipelines/ingest-harvest.ts` and the number of lines of the metadata sidecar into the done-marker signature of every harvest source, so a changed gate re-reads all six archive sets (and the others); the manifest params of an archive source carry the sidecar size too.
**3. Dates.** `witnessFrom` (OCR sources only) sets `dateUncertain: { why }` and leaves the tokens in N when (a) the title states a composite range («(1914-1918)») and the metadata date is only the first year: the date becomes the range; or (b) the text is modern spelling under an old date (dated before 1890, at least 2000 tokens, no `ъ ѣ`, `і ї є ґ` over a quarter of the tokens) or the id is on the short `DATE_SUSPECT` list (Marx, Kapital vol. 2-3, dated 1893 / 1894, which the 1890 cut misses) and the archive.org metadata does not confirm it. Order of evidence, never a guess: the year in the title («Rik 1934», «(1897)») for an issue whose metadata date is a wide range; the edition year stated in the metadata (`publisher`, `imprint`, `notes`, `description`; read by `harvest/archive.ts --meta` into `ia-meta.jsonl`): the item's own year in these fields or `year` + a named publisher confirms the date, exactly one later year becomes the date (cited, and a licence note when it is after 1925), several different later years change nothing; then `DATE_VERIFIED` (three entries, each with its reason). Build: `exc` in `pipelines/build.ts` includes `dateUncertain`, i.e. no first attestation, no oldest form, no per-century or per-epoch count, no spelling date, still counted in N, f and ipm. Cards: the text card (`WitnessView`, `TextsView`) prints «дата невірогідна: …», the concordance row a badge; a form dated only by such a witness reads «лише ненадійні свідчення».
- Metadata read for the 41 witnesses of the section 9 heuristic (and the three later Kapital volumes): 16 confirmed by a stated year (Dragomanov, Hromada, Sumtsov, Kulish, the Enejida 1842 copy with the printer in the metadata, Pelesz with `year` 1885 and `Wien: G.Heinrich`, Hatsuk, Partytsky, Verkhratsky ...), 3 verified by hand (`DATE_VERIFIED`: Шараневич 1863, the Lviv German grammar 1876, Kulish's Hramatka 1857 printed in his own press), **4 re-dated by a stated edition year: Kapital t. 1 1867 -> 1933 (Kharkiv, Proletar), t. 2 1893 -> 1932, t. 3 ch. 1 1894 -> 1936 (Kyiv, Partvydav), t. 3 ch. 2 1894 -> 1930 (Kyiv, Derzhvydav), 882,594 tokens**, with a licence note: editions of 1930-1936 are outside the project's «PD by date <= 1925» rule, their rights are not clarified (owner decision: kept in N as instructed); the rest stays flagged with the reason «рік видання не названо в метаданих».
- Replayed on the next10 work files (`n10.jsonl`, the same heuristics, the 44 metadata lines): **31 witnesses dateUncertain in N, 14,733,428 tokens**: 10 composite volumes (the Canadian press `Канадійський фармер` 1904-19xx, 1906-, 1910-, 1915-, 1918- (5 volumes, 7.27M tokens), `Ранок` 1905-1913, 1914-1918, 1918-1923 (6.44M), `Етнографічний вісник (1925-1930)`, a Wrocław collection of emigre periodicals) and 21 modern-spelling ones (`Капітал` 287,917, `Світ по частинах розглянутий` 55,951 (the 1696 text in a modern edition), Engels `Походження Сім'ї` 66,100, Korolenko's `Cherkes` 14,334, Kostomarov `Dvi rusky narodnosty` 20,123, the second copy of the Enejida 45,043, `Збірник творів Ієремії Галки` 45,636, Pravda dated 1830, junk pages, ...). 30 of the 31 were already in next8.
- **Ранок is not split by issue**: the file has no usable issue markers (the `Ч. 479` strings are the street address «Stella Ave. Winnipeg», `Число 1.` numbers a Bible story column). Rule used: the range stated in the title and the flag (the issue is unknown, so no first attestation at the range's start).
- Size check, not a bug: the flagged composite volumes are 14.7M tokens, 20 % of N, so the epoch statistics of the 1900-1923 press now rest on the dated issues only (Svoboda, Bukovina, Ruslan, the Peremyshl Věstnik, ...).

**Live first attestations that this already touched (next8, the committed `public/data/lexicon.json`, 90,885 cards; count only):** the first attestation of **15,859 cards (17.4 %)** comes from a witness that is dateUncertain under these rules: **12,465** from the 21 modern-spelling witnesses (4,644 from `Капітал` 1867 alone, 3,634 from `Світ по частинах` 1696, 688 from Engels 1884, 777 from `Cherkes` 1850, 712 from Kostomarov 1861 ...) and **3,394** from the 9 composite volumes (1,092 from `Канадійський фармер` 1904-, 586 and 444 from `Ранок`, ...). They lose that attestation at the next build; the next-oldest vetted witness takes over (some of these cards will have no first attestation in the corpus at all, which the card then says).

**Predicted next11, labelled with its baseline.** Baseline: the observed next10 (run 20261104T172723Z): N 74,179,148, linked 57,115,802 (77.00 %), work files read on 2026-11-04. Prediction = baseline minus what CQ-2 and CQ-1/1b take out of the work files: the stale 868 admitted work files -905,750 (they are in no manifest), the five archive sets re-ingested under the CQ-1/1b gates -579,927 (36 of their witnesses are excluded, the rest lose line-gate and gain oldOrth tokens), and the dateUncertain / re-dated witnesses change **nothing** in N. **Predicted N = 72,693,471** (the same figure as the section 9 chain next8 + replay + new items). Linked: the removed 1,485,677 tokens are Latin / junk pages at about 65 % (section 3 of this file), so the estimate is **about 56.15M / 72.69M = 77.2 %**; not measured. Not in the prediction: archive items harvested after 2026-11-04 21:00 (the scrape on the harvester box is at 19,865 index lines and keeps adding), and the metadata of newly flagged items (they are written with the flag until `ia-meta.jsonl` has their line).

**Operations.** `ia-meta.jsonl` (44 lines: the 41 + the 3 later Kapital volumes) is on the harvester box in `~/BULP/data/raw/harvest/archive-ukr/`; it has to reach the worker with the other harvest data before the ingest (it is read from `data/raw/harvest/<source>/ia-meta.jsonl`). For flagged items without a line the ingest writes `<out>/date-flagged.json`; the harvester fetches them with `tsx harvest/archive.ts archive-ukr --meta <file>` when no other archive harvester is running (it writes the same `STOPPED.json`), and the next ingest picks the lines up (the marker includes the sidecar size).
