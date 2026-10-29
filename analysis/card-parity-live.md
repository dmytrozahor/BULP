# Card parity — LIVE end-to-end (SPEC 63 CP-10)

Run 2026-10-29T22:42:43.488Z against https://dmytrozahor.github.io/BULP/ (data build 202610291919-a988615); Chromium via Playwright, one fresh browser context per card (cold cache), sequential, seed 10, 10 cards per kind + the owner examples (132 cards). Re-run: `npm run e2e:cards` (script `pipelines/e2e-cards.ts`; not part of vitest).

Cell states: **data** the block renders with data; **empty** it renders the honest «немає даних …» state; **MISSING** the block is absent from the DOM although the matrix says it is shown / honest-empty; **LOADING** «завантаження…» still on screen after 10 s; **n/a** the matrix says the data cannot exist. A block counts as present if any of its panels / test ids is in the DOM after every tab was opened.

## Per-kind summary

| kind | cards | clean | with errors | blocks data | blocks empty | blocks MISSING | median first render, ms | median transfer, KiB |
|---|---|---|---|---|---|---|---|---|
| word | 10 | 4 | 6 | 194 | 75 | 7 | 389 | 887 |
| form | 10 | 8 | 2 | 202 | 71 | 6 | 415 | 920 |
| light | 10 | 10 | 0 | 168 | 74 | 19 | 403 | 862 |
| dict | 10 | 10 | 0 | 131 | 111 | 19 | 311 | 717 |
| archaic | 10 | 10 | 0 | 110 | 130 | 10 | 412 | 702 |
| name | 10 | 10 | 0 | 140 | 102 | 10 | 422 | 842 |
| orv | 10 | 10 | 0 | 145 | 99 | 7 | 471 | 851 |
| phrase | 10 | 10 | 0 | 10 | 0 | 0 | 388 | 713 |
| uv | 10 | 10 | 0 | 150 | 95 | 10 | 333 | 866 |
| att | 10 | 10 | 0 | 152 | 93 | 9 | 347 | 890 |
| unlinked | 10 | 10 | 0 | 130 | 111 | 10 | 413 | 811 |
| owner | 19 | 19 | 0 | 356 | 96 | 64 | 423 | 902 |
| persons | 2 | 2 | 0 | 1 | 0 | 0 | 12524 | 589 |
| person | 1 | 1 | 0 | 1 | 0 | 0 | 12520 | 321 |

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
| `stress` | 10/0/0 | 10/0/0 | 0/0/**10** | 0/0/**10** | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `etymology` | 2/8/0 | 3/7/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 1/9/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `senses` | 1/9/0 | 1/9/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `phrasemes` | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | 0/10/0 | n/a | 0/10/0 | 0/10/0 | 0/10/0 |
| `loan` | 1/0/0/c9 | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 | n/a | 0/0/0/c10 | 0/0/0/c10 | 0/0/0/c10 |
| `derivatives` | 3/0/**7** | 4/0/**6** | 1/0/**9** | 1/0/**9** | 0/0/**10** | 0/0/**10** | 3/0/**7** | n/a | 0/0/**10** | 1/0/**9** | 0/0/**10** |
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

- **word × derivatives** — 13 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/w/%D0%A2%D1%80%D0%BE%D1%86%D1%8C , https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%B0%D1%80%D0%B5%D0%B2%D0%BE , https://dmytrozahor.github.io/BULP/#/w/%D1%85%D0%B0%D1%85%D0%BB%D0%B0%D1%86%D1%8C%D0%BA%D0%B8%D0%B9
- **form × derivatives** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%B3%D0%B0%D0%BA%D0%BE%D0%BC%D1%8A , https://dmytrozahor.github.io/BULP/#/f/%D0%BF%D1%80%D0%BE%D0%BF%D0%B0%D0%BB%D0%B8%D0%BC , https://dmytrozahor.github.io/BULP/#/f/%D1%83%D0%B6%D0%B8%D0%B2%D0%B0%D1%8E%D1%87%D0%B8%D0%BC%D1%8A
- **light × stress** — 12 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D0%BE%D0%BB%D1%96%D1%82%D1%96%D1%8F , https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%BB%D1%83%D0%BA%D0%B0%D0%B2%D0%B8%D1%82%D0%B8 , https://dmytrozahor.github.io/BULP/#/lw/%D0%BE%D1%81%D1%83%D1%88%D1%83%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9
- **light × derivatives** — 11 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D0%BE%D0%BB%D1%96%D1%82%D1%96%D1%8F , https://dmytrozahor.github.io/BULP/#/lw/%D0%BE%D1%81%D1%83%D1%88%D1%83%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9 , https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D1%83%D0%BF%D1%83%D0%B2%D0%B0%D0%B2%D1%88%D0%B8
- **dict × stress** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B0%D0%BC%D0%BE%D0%BF%D1%80%D0%BE%D1%94%D0%BA%D1%86%D1%96%D1%8F , https://dmytrozahor.github.io/BULP/#/lw/%D1%80%D1%96%D0%B7%D0%BD%D0%BE%D0%BF%D0%BE%D1%80%D1%96%D0%B4%D0%BD%D0%B8%D0%B9 , https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D0%BE%D0%B7%D0%BB%D1%8F%D0%BA
- **dict × derivatives** — 9 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B0%D0%BC%D0%BE%D0%BF%D1%80%D0%BE%D1%94%D0%BA%D1%86%D1%96%D1%8F , https://dmytrozahor.github.io/BULP/#/lw/%D1%80%D1%96%D0%B7%D0%BD%D0%BE%D0%BF%D0%BE%D1%80%D1%96%D0%B4%D0%BD%D0%B8%D0%B9 , https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D0%BE%D0%B7%D0%BB%D1%8F%D0%BA
- **archaic × derivatives** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/ar/%D0%B0%D0%B3%D0%B3%D1%94%D0%BB%D1%8C , https://dmytrozahor.github.io/BULP/#/ar/%D1%85%D0%BF%D1%94%D0%BD%D1%94%D0%B7%D1%8C , https://dmytrozahor.github.io/BULP/#/ar/%D0%BF%D1%80%D0%B8%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD'%D1%94
- **name × derivatives** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/name/%D0%BC%D0%BE%D0%B7%D1%8A%C4%B1%D1%80%D1%8C , https://dmytrozahor.github.io/BULP/#/name/%D0%B4%D0%BC%D0%B8%D1%82%D1%80%D1%96%D1%97%D0%B2%D0%B0 , https://dmytrozahor.github.io/BULP/#/name/%D0%BA%D0%BE%D1%80%D1%8F%D1%82%D0%BE%D0%B2%D0%B8%D1%87%D1%8C
- **orv × derivatives** — 7 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/orv/%D0%BF%D0%BE%D1%80%D0%BE%D1%85%D0%BD%D0%BE , https://dmytrozahor.github.io/BULP/#/orv/%D0%B4%D0%B8%D1%82%D0%BE%D0%BA%D1%8B , https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D0%BB%D1%83%D0%B1%D1%8C%D0%BD%D1%8B%D0%B8
- **uv × derivatives** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D0%B2%D0%B0%D0%B6%D0%B8%D1%82%D1%81%D1%8F , https://dmytrozahor.github.io/BULP/#/uv/%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%BE%D0%B2%D0%B0%D1%82 , https://dmytrozahor.github.io/BULP/#/uv/%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%B5%D0%B4%D1%83
- **att × derivatives** — 9 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/uv/%D0%B4%D0%B5%D1%81%D1%8F%D1%82%D0%BE%D0%B9 , https://dmytrozahor.github.io/BULP/#/uv/%D0%BC%D0%BE%D0%BD%D0%B0%D1%80%D1%85%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B5 , https://dmytrozahor.github.io/BULP/#/uv/%D0%B3%D0%BE%D0%BB%D0%BE%D1%81%D0%BD%D1%96%D1%89%D0%B5
- **unlinked × derivatives** — 10 of the sampled cards, e.g. https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B5%D0%BB%D0%B7%D0%B8%D1%87 , https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D1%96%D0%B4%D0%BF%D1%87%D0%B0%D0%B2 , https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9
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

- `word` https://dmytrozahor.github.io/BULP/#/w/%D0%BE%D0%B1%D1%80%D1%83%D1%88%D0%B8%D1%82%D0%B8%D1%81%D1%8F — console: Error: cellEvidence: no witness #3892
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `word` https://dmytrozahor.github.io/BULP/#/w/%D0%A2%D1%80%D0%BE%D1%86%D1%8C — console: Error: cellEvidence: no witness #2916
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `word` https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%B0%D1%80%D0%B5%D0%B2%D0%BE — console: Error: cellEvidence: no witness #2335
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `word` https://dmytrozahor.github.io/BULP/#/w/%D1%81%D1%85%D0%BE%D0%B2%D0%B0%D1%82%D0%B8 — console: Error: cellEvidence: no witness #2213
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `word` https://dmytrozahor.github.io/BULP/#/w/%D1%82%D1%8C%D0%BE%D1%85%D0%BA%D0%B0%D1%82%D0%B8 — console: Error: cellEvidence: no witness #2893
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `word` https://dmytrozahor.github.io/BULP/#/w/%D1%84%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D0%B5%D1%86%D1%8C — console: Error: cellEvidence: no witness #4119
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `form` https://dmytrozahor.github.io/BULP/#/f/%D1%88%D1%8B%D0%BD%D0%BE%D1%87%D0%BA%D1%83 — console: Error: cellEvidence: no witness #2962
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https:
- `form` https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D0%B0%D0%BB%D0%BE%D0%BC%D1%8A — console: Error: cellEvidence: no witness #61
    at ms (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:1:2575)
    at se (https://dmytrozahor.github.io/BULP/assets/EpochParadigm.vue_vue_type_script_setup_true_lang-CRBoe4DA.js:103:13957)
    at https://

### HTTP 4xx responses (informational: optional shards answer 404 by design, the client treats it as «no data»)

- 61× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/lm/st/N.json
- 11× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/cd/N.json
- 5× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/lm/phr/N.json
- 2× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/unlinked/X.json
- 2× 404 https://d2i3mt3nyd56ip.cloudfront.net/data/202610291919-a988615/uv/p/X.json

## Per-card timings (cold deep link)

| kind | card | first render, ms | transfer, KiB | blocks MISSING |
|---|---|---|---|---|
| word | [обрушитися](https://dmytrozahor.github.io/BULP/#/w/%D0%BE%D0%B1%D1%80%D1%83%D1%88%D0%B8%D1%82%D0%B8%D1%81%D1%8F) | 419 | 887 | - |
| word | [Троць](https://dmytrozahor.github.io/BULP/#/w/%D0%A2%D1%80%D0%BE%D1%86%D1%8C) | 374 | 778 | derivatives |
| word | [варево](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%B0%D1%80%D0%B5%D0%B2%D0%BE) | 408 | 887 | derivatives |
| word | [сховати](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D1%85%D0%BE%D0%B2%D0%B0%D1%82%D0%B8) | 401 | 903 | - |
| word | [тьохкати](https://dmytrozahor.github.io/BULP/#/w/%D1%82%D1%8C%D0%BE%D1%85%D0%BA%D0%B0%D1%82%D0%B8) | 401 | 887 | - |
| word | [хахлацький](https://dmytrozahor.github.io/BULP/#/w/%D1%85%D0%B0%D1%85%D0%BB%D0%B0%D1%86%D1%8C%D0%BA%D0%B8%D0%B9) | 383 | 887 | derivatives |
| word | [спролетаризований](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D0%BF%D1%80%D0%BE%D0%BB%D0%B5%D1%82%D0%B0%D1%80%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9) | 374 | 887 | derivatives |
| word | [франківець](https://dmytrozahor.github.io/BULP/#/w/%D1%84%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D0%B5%D1%86%D1%8C) | 363 | 887 | derivatives |
| word | [медичний](https://dmytrozahor.github.io/BULP/#/w/%D0%BC%D0%B5%D0%B4%D0%B8%D1%87%D0%BD%D0%B8%D0%B9) | 389 | 1084 | derivatives |
| word | [негарно](https://dmytrozahor.github.io/BULP/#/w/%D0%BD%D0%B5%D0%B3%D0%B0%D1%80%D0%BD%D0%BE) | 360 | 887 | derivatives |
| form | [гакомъ](https://dmytrozahor.github.io/BULP/#/f/%D0%B3%D0%B0%D0%BA%D0%BE%D0%BC%D1%8A) | 375 | 1103 | derivatives |
| form | [приладнать](https://dmytrozahor.github.io/BULP/#/f/%D0%BF%D1%80%D0%B8%D0%BB%D0%B0%D0%B4%D0%BD%D0%B0%D1%82%D1%8C) | 449 | 812 | - |
| form | [пропалим](https://dmytrozahor.github.io/BULP/#/f/%D0%BF%D1%80%D0%BE%D0%BF%D0%B0%D0%BB%D0%B8%D0%BC) | 444 | 811 | derivatives |
| form | [уживаючимъ](https://dmytrozahor.github.io/BULP/#/f/%D1%83%D0%B6%D0%B8%D0%B2%D0%B0%D1%8E%D1%87%D0%B8%D0%BC%D1%8A) | 366 | 896 | derivatives |
| form | [шыночку](https://dmytrozahor.github.io/BULP/#/f/%D1%88%D1%8B%D0%BD%D0%BE%D1%87%D0%BA%D1%83) | 385 | 920 | derivatives |
| form | [бомбы](https://dmytrozahor.github.io/BULP/#/f/%D0%B1%D0%BE%D0%BC%D0%B1%D1%8B) | 415 | 920 | derivatives |
| form | [валомъ](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D0%B0%D0%BB%D0%BE%D0%BC%D1%8A) | 410 | 1117 | - |
| form | [исайя](https://dmytrozahor.github.io/BULP/#/f/%D0%B8%D1%81%D0%B0%D0%B9%D1%8F) | 1202 | 901 | derivatives |
| form | [вигрібать](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D0%B8%D0%B3%D1%80%D1%96%D0%B1%D0%B0%D1%82%D1%8C) | 455 | 1095 | - |
| form | [наък](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D1%8A%D0%BA) | 394 | 896 | - |
| light | [політія](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D0%BE%D0%BB%D1%96%D1%82%D1%96%D1%8F) | 752 | 861 | stress, derivatives |
| light | [злукавити](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%BB%D1%83%D0%BA%D0%B0%D0%B2%D0%B8%D1%82%D0%B8) | 403 | 885 | stress |
| light | [осушуваний](https://dmytrozahor.github.io/BULP/#/lw/%D0%BE%D1%81%D1%83%D1%88%D1%83%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9) | 415 | 884 | stress, derivatives |
| light | [купувавши](https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D1%83%D0%BF%D1%83%D0%B2%D0%B0%D0%B2%D1%88%D0%B8) | 366 | 861 | stress, derivatives |
| light | [Кізюн](https://dmytrozahor.github.io/BULP/#/lw/%D0%9A%D1%96%D0%B7%D1%8E%D0%BD) | 342 | 862 | stress, derivatives |
| light | [провинившись](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%BE%D0%B2%D0%B8%D0%BD%D0%B8%D0%B2%D1%88%D0%B8%D1%81%D1%8C) | 1249 | 860 | stress, derivatives |
| light | [пірон](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%96%D1%80%D0%BE%D0%BD) | 339 | 860 | stress, derivatives |
| light | [ліщиновий](https://dmytrozahor.github.io/BULP/#/lw/%D0%BB%D1%96%D1%89%D0%B8%D0%BD%D0%BE%D0%B2%D0%B8%D0%B9) | 335 | 886 | stress, derivatives |
| light | [застібнутий](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%B0%D1%81%D1%82%D1%96%D0%B1%D0%BD%D1%83%D1%82%D0%B8%D0%B9) | 438 | 886 | stress, derivatives |
| light | [Королькова](https://dmytrozahor.github.io/BULP/#/lw/%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE%D0%B2%D0%B0) | 371 | 862 | stress, derivatives |
| dict | [самопроєкція](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B0%D0%BC%D0%BE%D0%BF%D1%80%D0%BE%D1%94%D0%BA%D1%86%D1%96%D1%8F) | 311 | 717 | stress, derivatives |
| dict | [різнопорідний](https://dmytrozahor.github.io/BULP/#/lw/%D1%80%D1%96%D0%B7%D0%BD%D0%BE%D0%BF%D0%BE%D1%80%D1%96%D0%B4%D0%BD%D0%B8%D0%B9) | 306 | 716 | stress, derivatives |
| dict | [козляк](https://dmytrozahor.github.io/BULP/#/lw/%D0%BA%D0%BE%D0%B7%D0%BB%D1%8F%D0%BA) | 323 | 716 | stress, derivatives |
| dict | [екс-чиновниця](https://dmytrozahor.github.io/BULP/#/lw/%D0%B5%D0%BA%D1%81-%D1%87%D0%B8%D0%BD%D0%BE%D0%B2%D0%BD%D0%B8%D1%86%D1%8F) | 315 | 715 | stress, derivatives |
| dict | [Лебедєва](https://dmytrozahor.github.io/BULP/#/lw/%D0%9B%D0%B5%D0%B1%D0%B5%D0%B4%D1%94%D0%B2%D0%B0) | 320 | 716 | stress, derivatives |
| dict | [приторкання](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%B8%D1%82%D0%BE%D1%80%D0%BA%D0%B0%D0%BD%D0%BD%D1%8F) | 328 | 776 | stress, derivatives |
| dict | [старшавши](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D1%82%D0%B0%D1%80%D1%88%D0%B0%D0%B2%D1%88%D0%B8) | 303 | 718 | stress, derivatives |
| dict | [бамбулячи](https://dmytrozahor.github.io/BULP/#/lw/%D0%B1%D0%B0%D0%BC%D0%B1%D1%83%D0%BB%D1%8F%D1%87%D0%B8) | 310 | 717 | stress, derivatives |
| dict | [збалянсувавши](https://dmytrozahor.github.io/BULP/#/lw/%D0%B7%D0%B1%D0%B0%D0%BB%D1%8F%D0%BD%D1%81%D1%83%D0%B2%D0%B0%D0%B2%D1%88%D0%B8) | 302 | 716 | stress, derivatives |
| dict | [присмерджувати](https://dmytrozahor.github.io/BULP/#/lw/%D0%BF%D1%80%D0%B8%D1%81%D0%BC%D0%B5%D1%80%D0%B4%D0%B6%D1%83%D0%B2%D0%B0%D1%82%D0%B8) | 302 | 776 | stress |
| archaic | [аггєль](https://dmytrozahor.github.io/BULP/#/ar/%D0%B0%D0%B3%D0%B3%D1%94%D0%BB%D1%8C) | 410 | 692 | derivatives |
| archaic | [хпєнєзь](https://dmytrozahor.github.io/BULP/#/ar/%D1%85%D0%BF%D1%94%D0%BD%D1%94%D0%B7%D1%8C) | 399 | 702 | derivatives |
| archaic | [приказан'є](https://dmytrozahor.github.io/BULP/#/ar/%D0%BF%D1%80%D0%B8%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD'%D1%94) | 450 | 704 | derivatives |
| archaic | [згодньй](https://dmytrozahor.github.io/BULP/#/ar/%D0%B7%D0%B3%D0%BE%D0%B4%D0%BD%D1%8C%D0%B9) | 412 | 699 | derivatives |
| archaic | [отчинньй](https://dmytrozahor.github.io/BULP/#/ar/%D0%BE%D1%82%D1%87%D0%B8%D0%BD%D0%BD%D1%8C%D0%B9) | 421 | 701 | derivatives |
| archaic | [насл'єдникь](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0%D1%81%D0%BB'%D1%94%D0%B4%D0%BD%D0%B8%D0%BA%D1%8C) | 498 | 692 | derivatives |
| archaic | [на-чудо](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0-%D1%87%D1%83%D0%B4%D0%BE) | 301 | 762 | derivatives |
| archaic | [набоженний](https://dmytrozahor.github.io/BULP/#/ar/%D0%BD%D0%B0%D0%B1%D0%BE%D0%B6%D0%B5%D0%BD%D0%BD%D0%B8%D0%B9) | 310 | 760 | derivatives |
| archaic | [св'бдоцєство](https://dmytrozahor.github.io/BULP/#/ar/%D1%81%D0%B2'%D0%B1%D0%B4%D0%BE%D1%86%D1%94%D1%81%D1%82%D0%B2%D0%BE) | 390 | 702 | derivatives |
| archaic | [u:отвсюду](https://dmytrozahor.github.io/BULP/#/ar/u%3A%D0%BE%D1%82%D0%B2%D1%81%D1%8E%D0%B4%D1%83) | 549 | 845 | derivatives |
| name | [мозъıрь](https://dmytrozahor.github.io/BULP/#/name/%D0%BC%D0%BE%D0%B7%D1%8A%C4%B1%D1%80%D1%8C) | 522 | 840 | derivatives |
| name | [дмитріїва](https://dmytrozahor.github.io/BULP/#/name/%D0%B4%D0%BC%D0%B8%D1%82%D1%80%D1%96%D1%97%D0%B2%D0%B0) | 419 | 842 | derivatives |
| name | [корятовичь](https://dmytrozahor.github.io/BULP/#/name/%D0%BA%D0%BE%D1%80%D1%8F%D1%82%D0%BE%D0%B2%D0%B8%D1%87%D1%8C) | 433 | 842 | derivatives |
| name | [челебей](https://dmytrozahor.github.io/BULP/#/name/%D1%87%D0%B5%D0%BB%D0%B5%D0%B1%D0%B5%D0%B9) | 417 | 842 | derivatives |
| name | [фастов](https://dmytrozahor.github.io/BULP/#/name/%D1%84%D0%B0%D1%81%D1%82%D0%BE%D0%B2) | 409 | 866 | derivatives |
| name | [овручова](https://dmytrozahor.github.io/BULP/#/name/%D0%BE%D0%B2%D1%80%D1%83%D1%87%D0%BE%D0%B2%D0%B0) | 496 | 840 | derivatives |
| name | [род-остров](https://dmytrozahor.github.io/BULP/#/name/%D1%80%D0%BE%D0%B4-%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B2) | 384 | 842 | derivatives |
| name | [магровичь](https://dmytrozahor.github.io/BULP/#/name/%D0%BC%D0%B0%D0%B3%D1%80%D0%BE%D0%B2%D0%B8%D1%87%D1%8C) | 456 | 841 | derivatives |
| name | [персиды](https://dmytrozahor.github.io/BULP/#/name/%D0%BF%D0%B5%D1%80%D1%81%D0%B8%D0%B4%D1%8B) | 411 | 842 | derivatives |
| name | [росая](https://dmytrozahor.github.io/BULP/#/name/%D1%80%D0%BE%D1%81%D0%B0%D1%8F) | 422 | 842 | derivatives |
| orv | [порохно](https://dmytrozahor.github.io/BULP/#/orv/%D0%BF%D0%BE%D1%80%D0%BE%D1%85%D0%BD%D0%BE) | 471 | 889 | derivatives |
| orv | [объяснати](https://dmytrozahor.github.io/BULP/#/orv/%D0%BE%D0%B1%D1%8A%D1%8F%D1%81%D0%BD%D0%B0%D1%82%D0%B8) | 439 | 851 | - |
| orv | [дитокы](https://dmytrozahor.github.io/BULP/#/orv/%D0%B4%D0%B8%D1%82%D0%BE%D0%BA%D1%8B) | 451 | 850 | derivatives |
| orv | [глубьныи](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D0%BB%D1%83%D0%B1%D1%8C%D0%BD%D1%8B%D0%B8) | 457 | 850 | derivatives |
| orv | [грѣясии](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D1%80%D1%A3%D1%8F%D1%81%D0%B8%D0%B8) | 513 | 852 | derivatives |
| orv | [гугнити](https://dmytrozahor.github.io/BULP/#/orv/%D0%B3%D1%83%D0%B3%D0%BD%D0%B8%D1%82%D0%B8) | 456 | 873 | - |
| orv | [лишатия](https://dmytrozahor.github.io/BULP/#/orv/%D0%BB%D0%B8%D1%88%D0%B0%D1%82%D0%B8%D1%8F) | 478 | 850 | derivatives |
| orv | [румянѣти](https://dmytrozahor.github.io/BULP/#/orv/%D1%80%D1%83%D0%BC%D1%8F%D0%BD%D1%A3%D1%82%D0%B8) | 494 | 849 | - |
| orv | [отьчание](https://dmytrozahor.github.io/BULP/#/orv/%D0%BE%D1%82%D1%8C%D1%87%D0%B0%D0%BD%D0%B8%D0%B5) | 489 | 851 | derivatives |
| orv | [маховьскыи](https://dmytrozahor.github.io/BULP/#/orv/%D0%BC%D0%B0%D1%85%D0%BE%D0%B2%D1%8C%D1%81%D0%BA%D1%8B%D0%B8) | 433 | 850 | derivatives |
| phrase | [p641a75f5d7](https://dmytrozahor.github.io/BULP/#/p/p641a75f5d7) | 482 | 243 | - |
| phrase | [p5f61002f62](https://dmytrozahor.github.io/BULP/#/p/p5f61002f62) | 404 | 721 | - |
| phrase | [p6ffe609c20](https://dmytrozahor.github.io/BULP/#/p/p6ffe609c20) | 289 | 711 | - |
| phrase | [p607185b57c](https://dmytrozahor.github.io/BULP/#/p/p607185b57c) | 258 | 711 | - |
| phrase | [p918dad0988](https://dmytrozahor.github.io/BULP/#/p/p918dad0988) | 898 | 713 | - |
| phrase | [pdc753ceebc](https://dmytrozahor.github.io/BULP/#/p/pdc753ceebc) | 388 | 716 | - |
| phrase | [p3130135603](https://dmytrozahor.github.io/BULP/#/p/p3130135603) | 376 | 713 | - |
| phrase | [p439aba3a56](https://dmytrozahor.github.io/BULP/#/p/p439aba3a56) | 374 | 711 | - |
| phrase | [p79f413ec08](https://dmytrozahor.github.io/BULP/#/p/p79f413ec08) | 389 | 715 | - |
| phrase | [pdb58e7c97f](https://dmytrozahor.github.io/BULP/#/p/pdb58e7c97f) | 288 | 717 | - |
| uv | [отважится](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D0%B2%D0%B0%D0%B6%D0%B8%D1%82%D1%81%D1%8F) | 443 | 870 | derivatives |
| uv | [резидоват](https://dmytrozahor.github.io/BULP/#/uv/%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%BE%D0%B2%D0%B0%D1%82) | 335 | 891 | derivatives |
| uv | [произведу](https://dmytrozahor.github.io/BULP/#/uv/%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%B5%D0%B4%D1%83) | 330 | 782 | derivatives |
| uv | [дегтевой](https://dmytrozahor.github.io/BULP/#/uv/%D0%B4%D0%B5%D0%B3%D1%82%D0%B5%D0%B2%D0%BE%D0%B9) | 335 | 866 | derivatives |
| uv | [чупру](https://dmytrozahor.github.io/BULP/#/uv/%D1%87%D1%83%D0%BF%D1%80%D1%83) | 316 | 782 | derivatives |
| uv | [обвестили](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D0%B1%D0%B2%D0%B5%D1%81%D1%82%D0%B8%D0%BB%D0%B8) | 471 | 846 | derivatives |
| uv | [отвращене](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D0%B2%D1%80%D0%B0%D1%89%D0%B5%D0%BD%D0%B5) | 333 | 890 | derivatives |
| uv | [обфпует](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D0%B1%D1%84%D0%BF%D1%83%D0%B5%D1%82) | 324 | 866 | derivatives |
| uv | [траґічних](https://dmytrozahor.github.io/BULP/#/uv/%D1%82%D1%80%D0%B0%D2%91%D1%96%D1%87%D0%BD%D0%B8%D1%85) | 331 | 782 | derivatives |
| uv | [отступників](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%82%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%B8%D0%BA%D1%96%D0%B2) | 323 | 782 | derivatives |
| att | [десятой](https://dmytrozahor.github.io/BULP/#/uv/%D0%B4%D0%B5%D1%81%D1%8F%D1%82%D0%BE%D0%B9) | 329 | 891 | derivatives |
| att | [вивідатися](https://dmytrozahor.github.io/BULP/#/uv/%D0%B2%D0%B8%D0%B2%D1%96%D0%B4%D0%B0%D1%82%D0%B8%D1%81%D1%8F) | 350 | 891 | - |
| att | [монархическое](https://dmytrozahor.github.io/BULP/#/uv/%D0%BC%D0%BE%D0%BD%D0%B0%D1%80%D1%85%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B5) | 347 | 891 | derivatives |
| att | [голосніще](https://dmytrozahor.github.io/BULP/#/uv/%D0%B3%D0%BE%D0%BB%D0%BE%D1%81%D0%BD%D1%96%D1%89%D0%B5) | 342 | 782 | derivatives |
| att | [медвед](https://dmytrozahor.github.io/BULP/#/uv/%D0%BC%D0%B5%D0%B4%D0%B2%D0%B5%D0%B4) | 365 | 890 | derivatives |
| att | [сошла](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D0%BE%D1%88%D0%BB%D0%B0) | 341 | 890 | derivatives |
| att | [земниих](https://dmytrozahor.github.io/BULP/#/uv/%D0%B7%D0%B5%D0%BC%D0%BD%D0%B8%D0%B8%D1%85) | 392 | 866 | derivatives |
| att | [судара](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D1%83%D0%B4%D0%B0%D1%80%D0%B0) | 337 | 890 | derivatives |
| att | [сутю](https://dmytrozahor.github.io/BULP/#/uv/%D1%81%D1%83%D1%82%D1%8E) | 331 | 782 | derivatives |
| att | [особливой](https://dmytrozahor.github.io/BULP/#/uv/%D0%BE%D1%81%D0%BE%D0%B1%D0%BB%D0%B8%D0%B2%D0%BE%D0%B9) | 366 | 867 | derivatives |
| unlinked | [зелзич](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B5%D0%BB%D0%B7%D0%B8%D1%87) | 574 | 792 | derivatives |
| unlinked | [відпчав](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%D1%96%D0%B4%D0%BF%D1%87%D0%B0%D0%B2) | 400 | 811 | derivatives |
| unlinked | [нальной](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9) | 374 | 920 | derivatives |
| unlinked | [нальницетям](https://dmytrozahor.github.io/BULP/#/f/%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%B8%D1%86%D0%B5%D1%82%D1%8F%D0%BC) | 366 | 920 | derivatives |
| unlinked | [лиетімії](https://dmytrozahor.github.io/BULP/#/f/%D0%BB%D0%B8%D0%B5%D1%82%D1%96%D0%BC%D1%96%D1%97) | 495 | 792 | derivatives |
| unlinked | [зелзні](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B5%D0%BB%D0%B7%D0%BD%D1%96) | 377 | 811 | derivatives |
| unlinked | [можчите](https://dmytrozahor.github.io/BULP/#/f/%D0%BC%D0%BE%D0%B6%D1%87%D0%B8%D1%82%D0%B5) | 453 | 811 | derivatives |
| unlinked | [можчан](https://dmytrozahor.github.io/BULP/#/f/%D0%BC%D0%BE%D0%B6%D1%87%D0%B0%D0%BD) | 413 | 811 | derivatives |
| unlinked | [кощіїеп](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%D0%BE%D1%89%D1%96%D1%97%D0%B5%D0%BF) | 392 | 811 | derivatives |
| unlinked | [кощенем](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%D0%BE%D1%89%D0%B5%D0%BD%D0%B5%D0%BC) | 442 | 811 | derivatives |
| owner | [слово](https://dmytrozahor.github.io/BULP/#/w/%D1%81%D0%BB%D0%BE%D0%B2%D0%BE) | 564 | 1064 | - |
| owner | [вода](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%BE%D0%B4%D0%B0) | 907 | 995 | - |
| owner | [слинути](https://dmytrozahor.github.io/BULP/#/f/%D1%81%D0%BB%D0%B8%D0%BD%D1%83%D1%82%D0%B8) | 761 | 792 | - |
| owner | [линути](https://dmytrozahor.github.io/BULP/#/w/%D0%BB%D0%B8%D0%BD%D1%83%D1%82%D0%B8) | 562 | 1181 | - |
| owner | [засьпіваєш](https://dmytrozahor.github.io/BULP/#/f/%D0%B7%D0%B0%D1%81%D1%8C%D0%BF%D1%96%D0%B2%D0%B0%D1%94%D1%88) | 462 | 811 | derivatives |
| owner | [їсть](https://dmytrozahor.github.io/BULP/#/f/%D1%97%D1%81%D1%82%D1%8C) | 519 | 1204 | - |
| owner | [Полісся](https://dmytrozahor.github.io/BULP/#/w/%D0%BF%D0%BE%D0%BB%D1%96%D1%81%D1%81%D1%8F) | 383 | 1171 | derivatives |
| owner | [народ](https://dmytrozahor.github.io/BULP/#/w/%D0%BD%D0%B0%D1%80%D0%BE%D0%B4) | 438 | 902 | derivatives |
| owner | [сердце](https://dmytrozahor.github.io/BULP/#/lw/%D1%81%D0%B5%D1%80%D0%B4%D1%86%D0%B5) | 393 | 756 | stress, derivatives |
| owner | [кÿнь](https://dmytrozahor.github.io/BULP/#/f/%D0%BA%C3%BF%D0%BD%D1%8C) | 12386 | 442 | chips, kwic, witnesses, derivation, dialect, map, stats, stress, etymology, senses, phrasemes, derivatives, ipa, labels, senseTimeline, overview, pronunciation, origin, paradigm, regions, featureChips, variantFamily, contactForm, synonyms, wiktPhraseology, switches |
| owner | [вÿс](https://dmytrozahor.github.io/BULP/#/f/%D0%B2%C3%BF%D1%81) | 12377 | 442 | chips, kwic, witnesses, derivation, dialect, map, stats, stress, etymology, senses, phrasemes, derivatives, ipa, labels, senseTimeline, overview, pronunciation, origin, paradigm, regions, featureChips, variantFamily, contactForm, synonyms, wiktPhraseology, switches |
| owner | [го](https://dmytrozahor.github.io/BULP/#/w/%D0%B3%D0%BE) | 363 | 887 | derivatives |
| owner | [шо](https://dmytrozahor.github.io/BULP/#/lw/%D1%88%D0%BE) | 316 | 1009 | stress, derivatives |
| owner | [отношеніє](https://dmytrozahor.github.io/BULP/#/f/%D0%BE%D1%82%D0%BD%D0%BE%D1%88%D0%B5%D0%BD%D1%96%D1%94) | 415 | 811 | derivatives |
| owner | [тоненький](https://dmytrozahor.github.io/BULP/#/w/%D1%82%D0%BE%D0%BD%D0%B5%D0%BD%D1%8C%D0%BA%D0%B8%D0%B9) | 403 | 887 | derivatives |
| owner | [між](https://dmytrozahor.github.io/BULP/#/w/%D0%BC%D1%96%D0%B6) | 368 | 1084 | derivatives |
| owner | [керувати](https://dmytrozahor.github.io/BULP/#/w/%D0%BA%D0%B5%D1%80%D1%83%D0%B2%D0%B0%D1%82%D0%B8) | 372 | 1084 | - |
| owner | [Полісся + говір поліський](https://dmytrozahor.github.io/BULP/#/w/%D0%BF%D0%BE%D0%BB%D1%96%D1%81%D1%81%D1%8F) | 375 | 1171 | derivatives |
| owner | [вода + говір поліський](https://dmytrozahor.github.io/BULP/#/w/%D0%B2%D0%BE%D0%B4%D0%B0) | 423 | 901 | - |
| persons | [annotator (отношеніє)](https://dmytrozahor.github.io/BULP/#/annotate) | 12385 | 589 | - |
| person | [Шевченко (shevchenko)](https://dmytrozahor.github.io/BULP/#/person/shevchenko) | 12520 | 321 | - |
| persons | [/persons list](https://dmytrozahor.github.io/BULP/#/persons) | 12524 | 496 | - |
