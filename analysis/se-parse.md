# Historical-dictionary parse (SPEC 63 SE-11)

Generated 2026-10-29 by `npm run parse:se` (pipelines/parse-se-dicts.ts); do not edit. Reused unchanged: 0.

Pass rate = passed / (candidate articles − cross-references). An article is skipped when its OCR score is below the dictionary threshold or its headword does not look like a word; nothing garbled is emitted. A headword is only a key: the build attaches a row to an existing card.

| item | dictionary | candidates | cross-refs | pointers kept (GG-18) | passed | skipped (OCR score) | skipped (headword) | skipped (no sense) | pass rate | rows | dated |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tymch1930 | timchenko | 5794 | 573 | 536 | 2661 | 89 | 236 | 2235 | 51.0 % | 4092 | 2704 |
| 1.2.1932 | timchenko | 3264 | 314 | 276 | 1837 | 249 | 66 | 798 | 62.3 % | 4470 | 2374 |
| slovnyk33 | biletsky-nosenko | 6406 | 68 | 66 | 3273 | 2437 | 79 | 549 | 51.6 % | 3672 | 0 |
| bandurista3 | zakrevsky | 2318 | 5 | 3 | 141 | 2065 | 57 | 50 | 6.1 % | 143 | 0 |
| SUM-28 | sum16 | 32390 | 9358 | 9413 | 12908 | 3603 | 3666 | 2855 | 56.0 % | 27844 | 13811 |
| SUM-28_2 | sum16 | 1274 | 376 | 371 | 437 | 121 | 187 | 153 | 48.7 % | 1016 | 490 |
| kniga1 | timchenko-materials | 5740 | 204 | 193 | 2756 | 1279 | 39 | 1462 | 49.8 % | 2886 | 821 |
| kniga2 | timchenko-materials | 5826 | 128 | 115 | 2832 | 1278 | 28 | 1560 | 49.7 % | 2998 | 928 |
| 1_20230624_20230624 | shevchenko | 5578 | 194 | 195 | 3777 | 71 | 918 | 618 | 70.2 % | 4728 | 0 |
| 2_20230624_202306 | shevchenko | 8231 | 178 | 181 | 5081 | 405 | 1346 | 1221 | 63.1 % | 6059 | 0 |

Rows per Shevelov epoch, one count per (headword spelling, sense, epoch bucket). «dated» = the date of a quotation (year, century label); «period» = only the coverage period of the dictionary (the card labels it «період», with «?» where it spans epochs).

| epoch | dated by a quotation | by the coverage period only |
|---|---|---|
| shev.proto | 0 | 0 |
| shev.old | 227 | 151 |
| shev.early_middle | 10432 | 8033 |
| shev.middle | 21620 | 8033 |
| shev.late_middle | 2995 | 4171 |
| shev.modern | 0 | 14602 |
