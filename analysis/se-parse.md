# Historical-dictionary parse (SPEC 63 SE-11)

Generated 2026-10-22 by `npm run parse:se` (pipelines/parse-se-dicts.ts); do not edit. Reused unchanged: 10.

Pass rate = passed / (candidate articles − cross-references). An article is skipped when its OCR score is below the dictionary threshold or its headword does not look like a word; nothing garbled is emitted. A headword is only a key: the build attaches a row to an existing card.

| item | dictionary | candidates | cross-refs | passed | skipped (OCR score) | skipped (headword) | skipped (no sense) | pass rate | rows | dated |
|---|---|---|---|---|---|---|---|---|---|---|
| tymch1930 | timchenko | 5794 | 573 | 3861 | 89 | 236 | 1035 | 74.0 % | 5822 | 3428 |
| 1.2.1932 | timchenko | 3264 | 314 | 2322 | 249 | 66 | 313 | 78.7 % | 5566 | 2936 |
| slovnyk33 | biletsky-nosenko | 6406 | 68 | 3661 | 2437 | 79 | 161 | 57.8 % | 4163 | 0 |
| bandurista3 | zakrevsky | 2318 | 5 | 174 | 2065 | 57 | 17 | 7.5 % | 176 | 0 |
| SUM-28 | sum16 | 32390 | 9358 | 14023 | 3603 | 3666 | 1740 | 60.9 % | 30050 | 14932 |
| SUM-28_2 | sum16 | 1274 | 376 | 505 | 121 | 187 | 85 | 56.2 % | 1146 | 543 |
| kniga1 | timchenko-materials | 5740 | 204 | 2797 | 1279 | 39 | 1421 | 50.5 % | 2927 | 835 |
| kniga2 | timchenko-materials | 5826 | 128 | 2861 | 1278 | 28 | 1531 | 50.2 % | 3032 | 935 |
| 1_20230624_20230624 | shevchenko | 5578 | 194 | 3778 | 71 | 918 | 617 | 70.2 % | 4736 | 0 |
| 2_20230624_202306 | shevchenko | 8231 | 178 | 5087 | 405 | 1346 | 1215 | 63.2 % | 6070 | 0 |

Rows per Shevelov epoch, one count per (headword spelling, sense, epoch bucket). «dated» = the date of a quotation (year, century label); «period» = only the coverage period of the dictionary (the card labels it «період», with «?» where it spans epochs).

| epoch | dated by a quotation | by the coverage period only |
|---|---|---|
| shev.proto | 0 | 0 |
| shev.old | 292 | 788 |
| shev.early_middle | 11589 | 9046 |
| shev.middle | 23901 | 9046 |
| shev.late_middle | 3716 | 4859 |
| shev.modern | 0 | 15145 |
