# Card parity — LIVE end-to-end (SPEC 63 CP-10)

Run 2026-10-30T00:24:45.328Z against https://dmytrozahor.github.io/BULP/ (data build 202610291919-a988615); Chromium via Playwright, one fresh browser context per card (cold cache), sequential, seed 10, 10 cards per kind + the owner examples (132 cards). Re-run: `npm run e2e:cards` (script `pipelines/e2e-cards.ts`; not part of vitest).

Cell states: **data** the block renders with data; **empty** it renders the honest «немає даних …» state; **MISSING** the block is absent from the DOM although the matrix says it is shown / honest-empty; **LOADING** «завантаження…» still on screen after 10 s; **n/a** the matrix says the data cannot exist. A block counts as present if any of its panels / test ids is in the DOM after every tab was opened.

## Per-kind summary

| kind | cards | clean | with errors | blocks data | blocks empty | blocks MISSING | median first render, ms | median transfer, KiB |
|---|---|---|---|---|---|---|---|---|
| word | 10 | 10 | 0 | 201 | 75 | 0 | 386 | 887 |
| form | 10 | 10 | 0 | 208 | 71 | 0 | 421 | 921 |
| light | 10 | 10 | 0 | 177 | 84 | 0 | 423 | 862 |
| dict | 10 | 10 | 0 | 140 | 122 | 0 | 324 | 717 |
| archaic | 10 | 10 | 0 | 120 | 130 | 0 | 328 | 703 |
| name | 10 | 10 | 0 | 150 | 102 | 0 | 353 | 842 |
| orv | 10 | 10 | 0 | 152 | 99 | 0 | 353 | 851 |
| phrase | 10 | 10 | 0 | 10 | 0 | 0 | 381 | 713 |
| uv | 10 | 10 | 0 | 160 | 96 | 0 | 356 | 867 |
| att | 10 | 10 | 0 | 161 | 93 | 0 | 371 | 891 |
| unlinked | 10 | 10 | 0 | 140 | 111 | 0 | 445 | 812 |
| owner | 19 | 19 | 0 | 366 | 98 | 52 | 466 | 902 |
| persons | 2 | 2 | 0 | 1 | 0 | 0 | 12401 | 589 |
| person | 1 | 1 | 0 | 1 | 0 | 0 | 12521 | 322 |

## Live matrix (rows = blocks, columns = kinds; cell = data/empty/MISSING counts over the sampled cards, n/a from the matrix)

| block | word | form | light | dict | archaic | name | orv | phrase | uv | att | unlinked |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `chips` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `kwic` | 10/0/0 | 10/0/0 | 10/0/0 | 1/9/0 | 1/9/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 |
| `witnesses` | 10/0/0 | 10/0/0 | 10/0/0 | 1/9/0 | 1/9/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `epochs` | 6/3/0/c1 | 6/4/0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `derivation` | 1/9/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `dialect` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `map` | 10/0/0 | 10/0/0 | 7/3/0 | 0/10/0 | 1/9/0 | 3/7/0 | 5/5/0 | n/a | 7/3/0 | 10/0/0 | 8/2/0 |
| `stats` | 10/0/0 | 10/0/0 | 9/1/0 | 0/10/0 | 1/9/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `stress` | 10/0/0 | 10/0/0 | 0/10/0 | 0/10/0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `etymology` | 2/8/0 | 3/7/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 1/9/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `senses` | 1/9/0 | 1/9/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `phrasemes` | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `loan` | 1/0/0/c9 | 0/0/0/c10 | 0/0/0/c10 | 0/1/0/c9 | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 | n/a | 0/1/0/c9 | 0/0/0/c10 | 0/0/0/c10 |
| `derivatives` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `ipa` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `labels` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `senseTimeline` | 7/3/0 | 8/2/0 | 4/6/0 | 2/8/0 | 2/8/0 | 1/9/0 | 2/8/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `overview` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `pronunciation` | 6/4/0 | 5/5/0 | 6/4/0 | 3/7/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `origin` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 0/10/0 |
| `paradigm` | 10/0/0 | 10/0/0 | 10/0/0 | 8/2/0 | 0/10/0 | 0/10/0 | 1/9/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `regions` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `ruFlag` | 6/0/0/c4 | 9/0/0/c1 | 1/0/0/c9 | 1/0/0/c9 | 0/0/0/c10 | 2/0/0/c8 | 1/0/0/c9 | 0/0/0/c10 | 5/0/0/c5 | 4/0/0/c6 | 1/0/0/c9 |
| `featureChips` | 2/8/0 | 0/10/0 | 1/9/0 | 2/8/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 1/9/0 | 0/10/0 |
| `variantFamily` | 2/8/0 | 0/10/0 | 1/9/0 | 2/8/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 1/9/0 | 0/10/0 |
| `contactForm` | 2/8/0 | 1/9/0 | 1/9/0 | 2/8/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 1/9/0 | 0/10/0 |
| `synonyms` | 5/5/0 | 5/5/0 | 7/3/0 | 8/2/0 | 4/6/0 | 4/6/0 | 2/8/0 | n/a | 8/2/0 | 4/6/0 | 1/9/0 |
| `wiktPhraseology` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | n/a | 10/0/0 | 10/0/0 | 10/0/0 |
| `switches` | 10/0/0 | 10/0/0 | 10/0/0 | 10/0/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |

## Missing blocks (MISSING in the DOM although the matrix lists the block) and errors

- **form × chips** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × kwic** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × witnesses** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × derivation** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × dialect** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × map** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × stats** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × stress** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × etymology** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × senses** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × phrasemes** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × derivatives** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × ipa** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × labels** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × senseTimeline** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × overview** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × pronunciation** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × origin** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × paradigm** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × regions** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × featureChips** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × variantFamily** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × contactForm** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × synonyms** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × wiktPhraseology** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81
- **form × switches** — 2 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81

### Cards with ERROR (console error, failed request, stuck loading, no render)

None.

### HTTP 4xx responses (informational: optional shards answer 404 by design, the client treats it as «no data»)

- 61× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/lm/st/N.json
- 10× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/cd/N.json
- 5× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/lm/phr/N.json
- 2× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/unlinked/X.json
- 2× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/uv/p/X.json

## Per-card timings (cold deep link)

| kind | card | first render, ms | transfer, KiB | blocks MISSING |
|---|---|---|---|---|
| word | [обрушитися](https://dmytrozahor.github.io/BULP/#/w/%D0%BE%D0%B1%D1%80%D1%83%D1%88%D0%B8%D1%82%D0%B8%D1%81%D1%8F) | 1020 | 956 | - |
| word | [Троць](https://dmytrozahor.github.io/BULP/#/w/%D0%A2%D1%80%D0%BE%D1%86%D1%8C) | 370 | 779 | - |
| word | [варево](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%B0%D1%80%D0%B5%D0%B2%D0%BE) | 497 | 887 | - |
| word | [сховати](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D1%85%D0%BE%D0%B2%D0%B0%D1%82%D0%B8) | 386 | 911 | - |
| word | [тьохкати](https://dmytrozahor.github.io/BULP/#/w/%D1%82%D1%8C%D0%BE%D1%85%D0%BA%D0%B0%D1%82%D0%B8) | 762 | 948 | - |
| word | [хахлацький](https://dmytrozahor.github.io/BULP/#/w/%D1%85%D0%B0%D1%85%D0%BB%D0%B0%D1%86%D1%8C%D0%BA%D0%B8%D0%B9) | 375 | 887 | - |
| word | [спролетаризований](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D0%BF%D1%80%D0%BE%D0%BB%D0%B5%D1%82%D0%B0%D1%80%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9) | 513 | 887 | - |
| word | [франківець](https://dmytrozahor.github.io/BULP/#/w/%D1%84%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D0%B5%D1%86%D1%8C) | 366 | 887 | - |
| word | [медичний](https://dmytrozahor.github.io/BULP/#/w/%D0%BC%D0%B5%D0%B4%D0%B8%D1%87%D0%BD%D0%B8%D0%B9) | 380 | 1138 | - |
| word | [негарно](https://dmytrozahor.github.io/BULP/#/w/%D0%BD%D0%B5%D0%B3%D0%B0%D1%80%D0%BD%D0%BE) | 348 | 887 | - |
| form | [гакомъ](https://dmytrozahor.github.io/BULP/#/f/%D0%B3%D0%B0%D0%BA%D0%BE%D0%BC%D1%8A) | 469 | 1084 | - |
| form | [приладнать](https://dmytrozahor.github.io/BULP/#/f/%D0%BF%D1%80%D0%B8%D0%BB%D0%B0%D0%B4%D0%BD%D0%B0%D1%82%D1%8C) | 421 | 812 | - |
| form | [пропалим](https://dmytrozahor.github.io/BULP/#/f/%D0%BF%D1%80%D0%BE%D0%BF%D0%B0%D0%BB%D0%B8%D0%BC) | 411 | 812 | - |
| form | [уживаючимъ](https://dmytrozahor.github.io/BULP/#/f/%D1%83%D0%B6%D0%B8%D0%B2%D0%B0%D1%8E%D1%87%D0%B8%D0%BC%D1%8A) | 358 | 897 | - |
| form | [шыночку](https://dmytrozahor.github.io/BULP/#/f/%D1%88%D1%8B%D0%BD%D0%BE%D1%87%D0%BA%D1%83) | 390 | 921 | - |
| form | [бомбы](https://dmytrozahor.github.io/BULP/#/f/%D0%B1%D0%BE%D0%BC%D0%B1%D1%8B) | 568 | 902 | - |
| form | [валомъ](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D0%B0%D0%BB%D0%BE%D0%BC%D1%8A) | 425 | 1117 | - |
| form | [исайя](https://dmytrozahor.github.io/BULP/#/f/%D0%B8%D1%81%D0%B0%D0%B9%D1%8F) | 381 | 921 | - |
| form | [вигрібать](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D0%B8%D0%B3%D1%80%D1%96%D0%B1%D0%B0%D1%82%D1%8C) | 460 | 1096 | - |
| form | [наък](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D1%8A%D0%BA) | 371 | 897 | - |
| light | [політія](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D0%BE%D0%BB%D1%96%D1%82%D1%96%D1%8F) | 423 | 842 | - |
| light | [злукавити](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%BB%D1%83%D0%BA%D0%B0%D0%B2%D0%B8%D1%82%D0%B8) | 1184 | 885 | - |
| light | [осушуваний](https://dmytrozahor.github.io/BULP/#/lw/%D0%BE%D1%81%D1%83%D1%88%D1%83%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9) | 384 | 884 | - |
| light | [купувавши](https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D1%83%D0%BF%D1%83%D0%B2%D0%B0%D0%B2%D1%88%D0%B8) | 460 | 861 | - |
| light | [Кізюн](https://dmytrozahor.github.io/BULP/#/lw/%D0%9A%D1%96%D0%B7%D1%8E%D0%BD) | 363 | 862 | - |
| light | [провинившись](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%BE%D0%B2%D0%B8%D0%BD%D0%B8%D0%B2%D1%88%D0%B8%D1%81%D1%8C) | 722 | 860 | - |
| light | [пірон](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%96%D1%80%D0%BE%D0%BD) | 329 | 838 | - |
| light | [ліщиновий](https://dmytrozahor.github.io/BULP/#/lw/%D0%BB%D1%96%D1%89%D0%B8%D0%BD%D0%BE%D0%B2%D0%B8%D0%B9) | 425 | 886 | - |
| light | [застібнутий](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%B0%D1%81%D1%82%D1%96%D0%B1%D0%BD%D1%83%D1%82%D0%B8%D0%B9) | 405 | 886 | - |
| light | [Королькова](https://dmytrozahor.github.io/BULP/#/lw/%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE%D0%B2%D0%B0) | 351 | 862 | - |
| dict | [самопроєкція](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B0%D0%BC%D0%BE%D0%BF%D1%80%D0%BE%D1%94%D0%BA%D1%86%D1%96%D1%8F) | 319 | 718 | - |
| dict | [різнопорідний](https://dmytrozahor.github.io/BULP/#/lw/%D1%80%D1%96%D0%B7%D0%BD%D0%BE%D0%BF%D0%BE%D1%80%D1%96%D0%B4%D0%BD%D0%B8%D0%B9) | 330 | 716 | - |
| dict | [козляк](https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D0%BE%D0%B7%D0%BB%D1%8F%D0%BA) | 324 | 716 | - |
| dict | [екс-чиновниця](https://dmytrozahor.github.io/BULP/#/lw/%D0%B5%D0%BA%D1%81-%D1%87%D0%B8%D0%BD%D0%BE%D0%B2%D0%BD%D0%B8%D1%86%D1%8F) | 336 | 716 | - |
| dict | [Лебедєва](https://dmytrozahor.github.io/BULP/#/lw/%D0%9B%D0%B5%D0%B1%D0%B5%D0%B4%D1%94%D0%B2%D0%B0) | 324 | 716 | - |
| dict | [приторкання](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%B8%D1%82%D0%BE%D1%80%D0%BA%D0%B0%D0%BD%D0%BD%D1%8F) | 338 | 776 | - |
| dict | [старшавши](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D1%82%D0%B0%D1%80%D1%88%D0%B0%D0%B2%D1%88%D0%B8) | 304 | 718 | - |
| dict | [бамбулячи](https://dmytrozahor.github.io/BULP/#/lw/%D0%B1%D0%B0%D0%BC%D0%B1%D1%83%D0%BB%D1%8F%D1%87%D0%B8) | 316 | 717 | - |
| dict | [збалянсувавши](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%B1%D0%B0%D0%BB%D1%8F%D0%BD%D1%81%D1%83%D0%B2%D0%B0%D0%B2%D1%88%D0%B8) | 313 | 717 | - |
| dict | [присмерджувати](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%B8%D1%81%D0%BC%D0%B5%D1%80%D0%B4%D0%B6%D1%83%D0%B2%D0%B0%D1%82%D0%B8) | 322 | 776 | - |
| archaic | [аггєль](https://dmytrozahor.github.io/BULP/#/ar/%D0%B0%D0%B3%D0%B3%D1%94%D0%BB%D1%8C) | 413 | 692 | - |
| archaic | [хпєнєзь](https://dmytrozahor.github.io/BULP/#/ar/%D1%85%D0%BF%D1%94%D0%BD%D1%94%D0%B7%D1%8C) | 296 | 703 | - |
| archaic | [приказан'є](https://dmytrozahor.github.io/BULP/#/ar/%D0%BF%D1%80%D0%B8%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD'%D1%94) | 301 | 704 | - |
| archaic | [згодньй](https://dmytrozahor.github.io/BULP/#/ar/%D0%B7%D0%B3%D0%BE%D0%B4%D0%BD%D1%8C%D0%B9) | 334 | 699 | - |
| archaic | [отчинньй](https://dmytrozahor.github.io/BULP/#/ar/%D0%BE%D1%82%D1%87%D0%B8%D0%BD%D0%BD%D1%8C%D0%B9) | 315 | 701 | - |
| archaic | [насл'єдникь](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0%D1%81%D0%BB'%D1%94%D0%B4%D0%BD%D0%B8%D0%BA%D1%8C) | 389 | 692 | - |
| archaic | [на-чудо](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0-%D1%87%D1%83%D0%B4%D0%BE) | 328 | 762 | - |
| archaic | [набоженний](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0%D0%B1%D0%BE%D0%B6%D0%B5%D0%BD%D0%BD%D0%B8%D0%B9) | 323 | 760 | - |
| archaic | [св'бдоцєство](https://dmytrozahor.github.io/BULP/#/ar/%D1%81%D0%B2'%D0%B1%D0%B4%D0%BE%D1%86%D1%94%D1%81%D1%82%D0%B2%D0%BE) | 312 | 702 | - |
| archaic | [u:отвсюду](https://dmytrozahor.github.io/BULP/#/ar/u%3A%D0%BE%D1%82%D0%B2%D1%81%D1%8E%D0%B4%D1%83) | 356 | 846 | - |
| name | [мозъıрь](https://dmytrozahor.github.io/BULP/#/name/%D0%BC%D0%BE%D0%B7%D1%8A%C4%B1%D1%80%D1%8C) | 472 | 841 | - |
| name | [дмитріїва](https://dmytrozahor.github.io/BULP/#/name/%D0%B4%D0%BC%D0%B8%D1%82%D1%80%D1%96%D1%97%D0%B2%D0%B0) | 338 | 842 | - |
| name | [корятовичь](https://dmytrozahor.github.io/BULP/#/name/%D0%BA%D0%BE%D1%80%D1%8F%D1%82%D0%BE%D0%B2%D0%B8%D1%87%D1%8C) | 341 | 843 | - |
| name | [челебей](https://dmytrozahor.github.io/BULP/#/name/%D1%87%D0%B5%D0%BB%D0%B5%D0%B1%D0%B5%D0%B9) | 344 | 842 | - |
| name | [фастов](https://dmytrozahor.github.io/BULP/#/name/%D1%84%D0%B0%D1%81%D1%82%D0%BE%D0%B2) | 354 | 866 | - |
| name | [овручова](https://dmytrozahor.github.io/BULP/#/name/%D0%BE%D0%B2%D1%80%D1%83%D1%87%D0%BE%D0%B2%D0%B0) | 431 | 840 | - |
| name | [род-остров](https://dmytrozahor.github.io/BULP/#/name/%D1%80%D0%BE%D0%B4-%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B2) | 353 | 842 | - |
| name | [магровичь](https://dmytrozahor.github.io/BULP/#/name/%D0%BC%D0%B0%D0%B3%D1%80%D0%BE%D0%B2%D0%B8%D1%87%D1%8C) | 307 | 842 | - |
| name | [персиды](https://dmytrozahor.github.io/BULP/#/name/%D0%BF%D0%B5%D1%80%D1%81%D0%B8%D0%B4%D1%8B) | 324 | 842 | - |
| name | [росая](https://dmytrozahor.github.io/BULP/#/name/%D1%80%D0%BE%D1%81%D0%B0%D1%8F) | 368 | 842 | - |
| orv | [порохно](https://dmytrozahor.github.io/BULP/#/orv/%D0%BF%D0%BE%D1%80%D0%BE%D1%85%D0%BD%D0%BE) | 348 | 890 | - |
| orv | [объяснати](https://dmytrozahor.github.io/BULP/#/orv/%D0%BE%D0%B1%D1%8A%D1%8F%D1%81%D0%BD%D0%B0%D1%82%D0%B8) | 334 | 852 | - |
| orv | [дитокы](https://dmytrozahor.github.io/BULP/#/orv/%D0%B4%D0%B8%D1%82%D0%BE%D0%BA%D1%8B) | 361 | 850 | - |
| orv | [глубьныи](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D0%BB%D1%83%D0%B1%D1%8C%D0%BD%D1%8B%D0%B8) | 330 | 850 | - |
| orv | [грѣясии](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D1%80%D1%A3%D1%8F%D1%81%D0%B8%D0%B8) | 408 | 852 | - |
| orv | [гугнити](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D1%83%D0%B3%D0%BD%D0%B8%D1%82%D0%B8) | 367 | 873 | - |
| orv | [лишатия](https://dmytrozahor.github.io/BULP/#/orv/%D0%BB%D0%B8%D1%88%D0%B0%D1%82%D0%B8%D1%8F) | 335 | 850 | - |
| orv | [румянѣти](https://dmytrozahor.github.io/BULP/#/orv/%D1%80%D1%83%D0%BC%D1%8F%D0%BD%D1%A3%D1%82%D0%B8) | 351 | 850 | - |
| orv | [отьчание](https://dmytrozahor.github.io/BULP/#/orv/%D0%BE%D1%82%D1%8C%D1%87%D0%B0%D0%BD%D0%B8%D0%B5) | 431 | 851 | - |
| orv | [маховьскыи](https://dmytrozahor.github.io/BULP/#/orv/%D0%BC%D0%B0%D1%85%D0%BE%D0%B2%D1%8C%D1%81%D0%BA%D1%8B%D0%B8) | 353 | 850 | - |
| phrase | [p641a75f5d7](https://dmytrozahor.github.io/BULP/#/p/p641a75f5d7) | 582 | 244 | - |
| phrase | [p5f61002f62](https://dmytrozahor.github.io/BULP/#/p/p5f61002f62) | 368 | 721 | - |
| phrase | [p6ffe609c20](https://dmytrozahor.github.io/BULP/#/p/p6ffe609c20) | 494 | 711 | - |
| phrase | [p607185b57c](https://dmytrozahor.github.io/BULP/#/p/p607185b57c) | 283 | 711 | - |
| phrase | [p918dad0988](https://dmytrozahor.github.io/BULP/#/p/p918dad0988) | 381 | 713 | - |
| phrase | [pdc753ceebc](https://dmytrozahor.github.io/BULP/#/p/pdc753ceebc) | 496 | 716 | - |
| phrase | [p3130135603](https://dmytrozahor.github.io/BULP/#/p/p3130135603) | 380 | 713 | - |
| phrase | [p439aba3a56](https://dmytrozahor.github.io/BULP/#/p/p439aba3a56) | 382 | 711 | - |
| phrase | [p79f413ec08](https://dmytrozahor.github.io/BULP/#/p/p79f413ec08) | 381 | 715 | - |
| phrase | [pdb58e7c97f](https://dmytrozahor.github.io/BULP/#/p/pdb58e7c97f) | 273 | 717 | - |
| uv | [отважится](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D0%B2%D0%B0%D0%B6%D0%B8%D1%82%D1%81%D1%8F) | 436 | 871 | - |
| uv | [резидоват](https://dmytrozahor.github.io/BULP/#/uv/%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%BE%D0%B2%D0%B0%D1%82) | 409 | 871 | - |
| uv | [произведу](https://dmytrozahor.github.io/BULP/#/uv/%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%B5%D0%B4%D1%83) | 322 | 782 | - |
| uv | [дегтевой](https://dmytrozahor.github.io/BULP/#/uv/%D0%B4%D0%B5%D0%B3%D1%82%D0%B5%D0%B2%D0%BE%D0%B9) | 339 | 867 | - |
| uv | [чупру](https://dmytrozahor.github.io/BULP/#/uv/%D1%87%D1%83%D0%BF%D1%80%D1%83) | 356 | 782 | - |
| uv | [обвестили](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D0%B1%D0%B2%D0%B5%D1%81%D1%82%D0%B8%D0%BB%D0%B8) | 427 | 846 | - |
| uv | [отвращене](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D0%B2%D1%80%D0%B0%D1%89%D0%B5%D0%BD%D0%B5) | 336 | 891 | - |
| uv | [обфпует](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D0%B1%D1%84%D0%BF%D1%83%D0%B5%D1%82) | 304 | 867 | - |
| uv | [траґічних](https://dmytrozahor.github.io/BULP/#/uv/%D1%82%D1%80%D0%B0%D2%91%D1%96%D1%87%D0%BD%D0%B8%D1%85) | 404 | 782 | - |
| uv | [отступників](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%B8%D0%BA%D1%96%D0%B2) | 336 | 782 | - |
| att | [десятой](https://dmytrozahor.github.io/BULP/#/uv/%D0%B4%D0%B5%D1%81%D1%8F%D1%82%D0%BE%D0%B9) | 321 | 891 | - |
| att | [вивідатися](https://dmytrozahor.github.io/BULP/#/uv/%D0%B2%D0%B8%D0%B2%D1%96%D0%B4%D0%B0%D1%82%D0%B8%D1%81%D1%8F) | 320 | 891 | - |
| att | [монархическое](https://dmytrozahor.github.io/BULP/#/uv/%D0%BC%D0%BE%D0%BD%D0%B0%D1%80%D1%85%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B5) | 376 | 891 | - |
| att | [голосніще](https://dmytrozahor.github.io/BULP/#/uv/%D0%B3%D0%BE%D0%BB%D0%BE%D1%81%D0%BD%D1%96%D1%89%D0%B5) | 378 | 782 | - |
| att | [медвед](https://dmytrozahor.github.io/BULP/#/uv/%D0%BC%D0%B5%D0%B4%D0%B2%D0%B5%D0%B4) | 371 | 891 | - |
| att | [сошла](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D0%BE%D1%88%D0%BB%D0%B0) | 633 | 891 | - |
| att | [земниих](https://dmytrozahor.github.io/BULP/#/uv/%D0%B7%D0%B5%D0%BC%D0%BD%D0%B8%D0%B8%D1%85) | 395 | 867 | - |
| att | [судара](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D1%83%D0%B4%D0%B0%D1%80%D0%B0) | 314 | 891 | - |
| att | [сутю](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D1%83%D1%82%D1%8E) | 356 | 782 | - |
| att | [особливой](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%81%D0%BE%D0%B1%D0%BB%D0%B8%D0%B2%D0%BE%D0%B9) | 327 | 867 | - |
| unlinked | [зелзич](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B5%D0%BB%D0%B7%D0%B8%D1%87) | 578 | 794 | - |
| unlinked | [відпчав](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D1%96%D0%B4%D0%BF%D1%87%D0%B0%D0%B2) | 555 | 812 | - |
| unlinked | [нальной](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9) | 445 | 920 | - |
| unlinked | [нальницетям](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%B8%D1%86%D0%B5%D1%82%D1%8F%D0%BC) | 412 | 920 | - |
| unlinked | [лиетімії](https://dmytrozahor.github.io/BULP/#/f/%D0%BB%D0%B8%D0%B5%D1%82%D1%96%D0%BC%D1%96%D1%97) | 521 | 793 | - |
| unlinked | [зелзні](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B5%D0%BB%D0%B7%D0%BD%D1%96) | 453 | 812 | - |
| unlinked | [можчите](https://dmytrozahor.github.io/BULP/#/f/%D0%BC%D0%BE%D0%B6%D1%87%D0%B8%D1%82%D0%B5) | 435 | 812 | - |
| unlinked | [можчан](https://dmytrozahor.github.io/BULP/#/f/%D0%BC%D0%BE%D0%B6%D1%87%D0%B0%D0%BD) | 396 | 812 | - |
| unlinked | [кощіїеп](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%D0%BE%D1%89%D1%96%D1%97%D0%B5%D0%BF) | 426 | 812 | - |
| unlinked | [кощенем](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%D0%BE%D1%89%D0%B5%D0%BD%D0%B5%D0%BC) | 383 | 812 | - |
| owner | [слово](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D0%BB%D0%BE%D0%B2%D0%BE) | 625 | 1064 | - |
| owner | [вода](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%BE%D0%B4%D0%B0) | 383 | 902 | - |
| owner | [слинути](https://dmytrozahor.github.io/BULP/#/f/%D1%81%D0%BB%D0%B8%D0%BD%D1%83%D1%82%D0%B8) | 578 | 812 | - |
| owner | [линути](https://dmytrozahor.github.io/BULP/#/w/%D0%BB%D0%B8%D0%BD%D1%83%D1%82%D0%B8) | 813 | 1272 | - |
| owner | [засьпіваєш](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B0%D1%81%D1%8C%D0%BF%D1%96%D0%B2%D0%B0%D1%94%D1%88) | 514 | 793 | - |
| owner | [їсть](https://dmytrozahor.github.io/BULP/#/f/%D1%97%D1%81%D1%82%D1%8C) | 472 | 1204 | - |
| owner | [Полісся](https://dmytrozahor.github.io/BULP/#/w/%D0%BF%D0%BE%D0%BB%D1%96%D1%81%D1%81%D1%8F) | 514 | 1151 | - |
| owner | [народ](https://dmytrozahor.github.io/BULP/#/w/%D0%BD%D0%B0%D1%80%D0%BE%D0%B4) | 433 | 902 | - |
| owner | [сердце](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B5%D1%80%D0%B4%D1%86%D0%B5) | 466 | 757 | - |
| owner | [кÿнь](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C) | 12412 | 443 | chips, kwic, witnesses, derivation, dialect, map, stats, stress, etymology, senses, phrasemes, derivatives, ipa, labels, senseTimeline, overview, pronunciation, origin, paradigm, regions, featureChips, variantFamily, contactForm, synonyms, wiktPhraseology, switches |
| owner | [вÿс](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81) | 12415 | 443 | chips, kwic, witnesses, derivation, dialect, map, stats, stress, etymology, senses, phrasemes, derivatives, ipa, labels, senseTimeline, overview, pronunciation, origin, paradigm, regions, featureChips, variantFamily, contactForm, synonyms, wiktPhraseology, switches |
| owner | [го](https://dmytrozahor.github.io/BULP/#/w/%D0%B3%D0%BE) | 479 | 888 | - |
| owner | [шо](https://dmytrozahor.github.io/BULP/#/lw/%D1%88%D0%BE) | 333 | 1069 | - |
| owner | [отношеніє](https://dmytrozahor.github.io/BULP/#/f/%D0%BE%D1%82%D0%BD%D0%BE%D1%88%D0%B5%D0%BD%D1%96%D1%94) | 437 | 812 | - |
| owner | [тоненький](https://dmytrozahor.github.io/BULP/#/w/%D1%82%D0%BE%D0%BD%D0%B5%D0%BD%D1%8C%D0%BA%D0%B8%D0%B9) | 394 | 888 | - |
| owner | [між](https://dmytrozahor.github.io/BULP/#/w/%D0%BC%D1%96%D0%B6) | 357 | 1084 | - |
| owner | [керувати](https://dmytrozahor.github.io/BULP/#/w/%D0%BA%D0%B5%D1%80%D1%83%D0%B2%D0%B0%D1%82%D0%B8) | 352 | 1084 | - |
| owner | [Полісся + говір поліський](https://dmytrozahor.github.io/BULP/#/w/%D0%BF%D0%BE%D0%BB%D1%96%D1%81%D1%81%D1%8F) | 425 | 1171 | - |
| owner | [вода + говір поліський](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%BE%D0%B4%D0%B0) | 379 | 902 | - |
| persons | [annotator (отношеніє)](https://dmytrozahor.github.io/BULP/#/annotate) | 12401 | 589 | - |
| person | [Шевченко (shevchenko)](https://dmytrozahor.github.io/BULP/#/person/shevchenko) | 12521 | 322 | - |
| persons | [/persons list](https://dmytrozahor.github.io/BULP/#/persons) | 12378 | 496 | - |

## Content checks (CP-10: the page content is verified, not only opened)

| check | result | evidence |
|---|---|---|
| Шевченко: portrait loads and has a licence line (`person.portrait`) | PASS | img naturalWidth 250; figcaption «Taras Shevchenko, Wikimedia Commons ↗, Public domain · Wikidata Q134958 ↗ · перевірено 2026-10-29» |
| Шевченко: works timeline is not empty (`person.works`) | PASS | h1 «Тарас Шевченко», 60 items; first: 1837ПРИЧИННА · 849 ток. · Київщина · українська · читати |
| a KWIC of a card shows a dotted person-mention link to /person/<id> (`person.mention`) | PASS | /f/минулість: «Тарас Шевченко» → #/person/shevchenko; title «постать — підстава: повне ім’я» (re-run of the person checks alone after the search was made robust: a fresh context per candidate, 45 s cap, neighbour words of the sidecar mentions, form pages) |
| «засьпіваєш» (Грінченко 1893) links to заспівати (`text.zaspivaesh.link`) | PASS | href #/w/заспівати; class «tok attested derived feat hit»; title «Під хмарним небом, с. 3 · лема «заспівати» · асимілятивна м’якість: західна (галицька) вимова, передана желехівкою (правопис видання Львів 1893), не діалект автора; діалектну належність джерело не наз» |
| «засьпіваєш» carries the сь+labial chip (асимілятивна м’якість, ORTH-ZHEL-SOFT) (`text.zaspivaesh.chip`) | PASS | href #/w/заспівати; class «tok attested derived feat hit»; title «Під хмарним небом, с. 3 · лема «заспівати» · асимілятивна м’якість: західна (галицька) вимова, передана желехівкою (правопис видання Львів 1893), не діалект автора; діалектну належність джерело не наз» |
| «сьпіваютьця» links to співатися (`text.spivajutcja.link`) | PASS | href #/w/співатися; class «tok attested hit»; title «Під хмарним небом, с. 3 · лема «співатися»» |
| отношеніє gets a contact class (суржик / язичіє / ЦС-книжна, MM-36) (`ann.otnoshenije`) | PASS | class «w unknown»; контактне / суржик (русизм) літературні відповідники (r2u): акуратністю, відсотково, кругом, чого, відносини, стосунок, взайомини, відношеня, ставлення, лист · російськи |
| «то їсть» → бути (через «єсть»), їсти kept as the alternative (MM-38) (`ann.jist.copula`) | PASS | href #/w/бути; ікавізм (галицьке)бути (через «єсть») — основне читання / їсти · можливе галицьке написання з ї замість є (ікавізм): «їсть» = «єсть», форма дієслова «бути»; джерела не знайдено, діалектну групу не зая |
| «видів-го»: го is read as він (через «його»), the stem видів is kept (MM-42) (`ann.vydivgo`) | PASS | href #/w/вид; енклітична форма займенника (го = його)він (через «його») — основне читання · коротка (енклітична) форма «го» = «його / єго»: форма мовця, зафіксована в тексті; мовець і говір не встановлені; джерела  |
| «шо» gets the reduction chip (розмовна редукція, MM-43) (`ann.sho`) | PASS | розмовна редукція (мовця)що (через «шо») — основне читання · розмовна редукція «що» → «шо»: форма мовця, зафіксована в тексті; мовець і говір не встановленірозмовна редукція (мо |
| «ше» gets the reduction chip (розмовна редукція, MM-43) (`ann.she`) | PASS | розмовна редукція (мовця)ще (через «ше») — основне читання · розмовна редукція «ще» → «ше»: форма мовця, зафіксована в тексті; мовець і говір не встановлені; джерела не знайдено |


### Status of the CP-10 items after this run (live, deploy 62fb4518)

- **CP-10.1, CP-10.2, CP-10.3: cleared.** 132 cards, 0 with errors (was 8 of 132), no MISSING block on any card of a matrix kind (was 7-19 per kind); `stress` on light / dict is now an honest empty (0/10/0), `derivatives` 10/0/0 on every kind.
- **CP-10.4** open (owner decision: /f/кÿнь, /f/вÿс). **CP-10.6, CP-10.7** informational, unchanged.
- **CP-10.5 fixed** (form page): `FormStress` prints the stress of the spelling from lm/st (GG-14) with its source, else the lemma stress labelled as the lemma’s, else «наголос не встановлено (перевірено: …)»; the loan adaptation of the lemma is mounted when the spelling differs from the lemma.
- **CP-10.8 fixed** the contact line «можливо також» printed raw ids («yazychie, cs»); now the Ukrainian type names (RU_KIND_UK).
- **CP-10.9 fixed** the text reader showed «засьпіваєш» as an unlinked unknown token (synchronous computed over lazily loaded prefix shards); now `settled()` as in the annotator. Live: href #/w/заспівати, chip «асимілятивна м’якість (ORTH-ZHEL-SOFT)».
- **CP-10.10** (informational) the person-mention tooltip on a KWIC link reads «постать — підстава: повне ім’я» without the name and years (cause not investigated; probably the persons index was not loaded when the tooltip was built).

### Update 2026-10-30 (live, deploy 2658a446): CP-10.4 and CP-10.10 fixed and confirmed; CP-10.7 shipped, awaits the next data publish

Run `E2E_ONLY=owner,content npm run e2e:cards` against the deployed site: 19 owner cards, 19 clean, 0 errors, **0 MISSING blocks** (was 52 before the CP-10.4 fix, because the two ÿ examples settled on the unlinked page); all content checks PASS.

- **CP-10.4 fixed.** `/f/кÿнь` -> `/w/кінь?zak=кÿнь` with «написання кÿнь зведено до кінь (закарпатське ÿ, ЕУМ um162)» (537 ms, was ~12.4 s); `/f/вÿс` -> `/w/віз?zak=вÿс` with the same note (565 ms). Live data confirmed more than one standard spelling for both (кінь + конь, a form of кінь; for вÿс: віз, віс, вез, воз), so the strict «exactly one candidate» rule would have left both owner examples unresolved. Rule as shipped (`src/lib/zakRoute.ts`): candidates collapse to the lemmas that confirm them; one lemma = redirect; several = the і-reading of ЕУМ decides (voiced spelling віз before the unvoiced віс), counting a candidate that is itself a headword as that headword only (віз is also a past form of везти); otherwise no redirect.
- **CP-10.10 fixed.** `person.mention` title is now «постать: Тарас Шевченко (1814–1861) — підстава: повне ім’я». Cause: only /persons and /person/:id loaded the persons index, so on a KWIC card the tooltip fell back to the nameless text; `personTipOf` now requests the index itself.
- **CP-10.7 shipped, not yet visible.** The presence index is written by `npm run data:presence` (last step of build:data and data:unlinked) into `lm/presence.json`, which lives in the CDN data build; the live build (202610291919-a988615) has none, so the client falls back to fetching (tested), and the 404 console lines stay until the worker rebuilds and publishes the data. Then re-run `npm run e2e:cards` and compare the 404 counts (61 + 11 + 5 in 132 cards).
