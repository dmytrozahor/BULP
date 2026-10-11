# 07 — DWDS-style word card and statistics: panels, formulas, UI

Researched 2026-10-11. DWDS quotes are short excerpts from the original German, because the fetch tool caps quote length. Where a page gave no formula, this report says so, and the formula comes from the primary literature instead.

## 1. What a DWDS word page contains (https://www.dwds.de/wb/Haus)

Panels in page order: lemma and grammar (gender, genitive, plural, IPA, audio) → Wortbildung (compounds with the word as first, last or inner element) → Mehrwortausdrücke → meaning overview → Bedeutungen (eWDG 1969) → Etymologie (Pfeifer) → Bedeutungsverwandte Ausdrücke (thesaurus from OpenThesaurus) → Typische Verbindungen (computed) → Verwendungsbeispiele (example sentences) → Zitationshilfe. A sidebar holds Worthäufigkeit, Geografische Verteilung (maps), Verlaufskurve, links to other dictionaries, and "Belege in Korpora".

The page notes these items:
- Typische Verbindungen: labelled "(berechnet)". A legend colours partners by part of speech: "Adjektive Substantive Verben". Each partner links into the Wortprofil.
- Verwendungsbeispiele: "vollautomatisch durch den DWDS-Beispielextraktor aus den Textsammlungen des DWDS ausgewählt" (chosen fully automatically from the DWDS text collections). There is a link for reporting a bad example.
- Maps: "Bitte beachten Sie, dass diese Karten nicht redaktionell, sondern automatisch erstellt sind." (The maps are generated automatically, not edited.)
- Verlaufskurve: two charts, "ab 1600" (DTA+Kernkorpus, 1600–1999) and "ab 1946" (newspaper corpus, 1946–2024). The caveat reads "nicht redaktionell, sondern automatisch erstellt … und Fehler enthalten können" (generated automatically and may contain errors).
- Belege (KWIC with source citation): visitors must log in to see them. Since 8 June 2026 the Verlaufskurven search also needs a login (https://www.dwds.de/d/plot).

**Lesson for us:** every computed panel carries a small "automatically generated" badge and a link to its methodology page. Our own provenance data makes this even more important.

### 1.1 Häufigkeit (frequency barometer): https://www.dwds.de/d/worthaeufigkeit
- "Das Frequenzbarometer bildet eine siebenstufige, logarithmische Skala ab." (The barometer is a seven-step logarithmic scale.)
- "Ermittelt wird die Frequenz für alle Flexionsformen eines Wortes." (It counts all inflected forms of a word, i.e. the lemma.)
- The calculation uses "sowohl die absolute Häufigkeit (Frequenz) des jeweiligen Wortes … als auch das Verhältnis dieser Zahl zur Gesamtgröße des Korpus" (both the absolute frequency and its ratio to total corpus size).
- Corpora: DWDS Kernkorpus, WebXL, the newspaper corpus (including the ZDL-Regionalkorpus), and Wikipedia (added 21 Oct 2022). A word is rated only if it occurs at least 5 times in total.
- **DWDS publishes no exact formula.** The UI shows a "selten → häufig" (rare → common) bar with filled dots. The scale has seven steps (0–6), not eight.

### 1.2 Verlaufskurve / Wortverlaufskurve: https://www.dwds.de/d/plot
("Wortverlaufskurve" is the older name of the same tool.)
- "Die Verlaufskurven zeigen die Auftretenshäufigkeit von Wörtern (genauer: Lemmata) in unseren Korpora … über einen gewissen Zeitraum an." (The curves show how often lemmas occur in the corpora over a period of time.) The x-axis is the year or decade. The y-axis is relative frequency (per million) or absolute frequency.
- `norm`: "Kategorisierungsfunktion zur Berechnung des Nenners für die Ergebnis-Skalierung pro Million Tokens" (the function that computes the denominator for scaling results per million tokens). The default is **date + text class**, which means each time slice is normalised by text-type subtotals. This corrects for unbalanced genre mix.
- `slice`: "Zeitscheiben-Breite (natürliche Zahl…" (time-slice width). The default is 1 year for the newspaper corpus and 10 years for the others. The format is S+O (width + offset), e.g. `10+0` gives 1900, 1910, and so on.
- `window`: "Fensterbreite für gleitenden Mittelwert (Glättung), als natürliche Zahl" (window width for the moving-average smoothing). **Default 3.** A value of 0 gives the raw histogram.
- `wbase`: "Invers-Distanz Glättungsbasis (reelle Zahl b)" (base for inverse-distance smoothing). Default 0, treated as 1, which weights all slices equally. `b>1` down-weights distant slices.
- `prune`: "Inverses Konfidenzintervall für Ausreißererkennung (0: kein Pruning, .05 ~ 95% Konfidenzintervall)" (inverse confidence interval for outlier detection). Outliers are replaced by linear interpolation. Default 0, or 0.05 for DTA+Kernkorpus.
- `logavg`: averages on logarithms, with a constant of ½. `logscale`: log axes. `grand`: adds an overall-total curve.
- Warning: "Gerade bei mittel- und niedrigfrequenten Wörtern (d. h. unterhalb einer Schwelle von 1 pro Million Tokens)" smoothing can distort the curve, so DWDS recommends the "Rohfrequenzen" (raw frequencies) view for such words.
- Corpora: newspaper corpus (1946–, about 25 bn tokens, the default); open-access contemporary corpora (about 3 bn); DTA-Gesamt+DWDS-Kernkorpus (1600–1999, about 371 M); ZDL-Regionalkorpus (1993–, about 12 bn; its default range starts in 2005).

### 1.3 Wortprofil: https://www.dwds.de/d/wortprofil
- Co-occurrence partners are ranked "über ein Assoziationsmaß" (by an association measure), specifically **logDice** (Rychlý 2008). The higher the score, "desto größer ist der Kookkurrenzpartner in der Wolke zu sehen" (the bigger the partner appears in the cloud).
- "Die Kookkurrenzpartner zu einem Abfragewort können wahlweise als Wortwolke oder als Tabelle dargestellt werden." (Partners can be shown as a word cloud or as a table.)
- Thresholds: "Abrufbar sind nur Kookkurrenzen, die statistisch signifikant sind, also eine Mindestfrequenz von fünf und einen logDice-Wert größer Null" haben (only significant co-occurrences are available: minimum frequency 5 and logDice > 0).
- Partners are extracted by syntactic relation from a spaCy dependency parse. The relations are subject (active/passive), accusative object, dative/genitive object, adjective attribute, genitive attribute, prepositional group, adverbial, predicative, coordination and comparative group.
- Data: version 2026v1, about 13 M texts and 7.5 bn tokens (Kernkorpus plus major newspapers plus part of the ZDL-Regionalkorpus). The tool also offers multi-word queries and a **comparison of two word profiles**.
- Literature cited on the page: Didakowski & Geyken (2014), "From DWDS corpora to a German word profile – methodological problems and solutions", OPAL 2/2014, 39–47. Geyken (2011), "Statistische Wortprofile zur schnellen Analyse der Syntagmatik in Textkorpora", in Abel & Zanin (eds.), *Korpora in Lehre und Forschung*, 115–137. Rychlý (2008), "A Lexicographer-Friendly Association Score", RASLAN 2008 (https://www.fi.muni.cz/usr/sojka/download/raslan2008/13.pdf). I could not retrieve the full text of the OPAL paper, so this report has no verbatim quote from it.

### 1.4 Regional maps: https://www.dwds.de/d/regionalangaben
- The areas follow Lameli (2013) dialect regions (e.g. D-Nordwest, CH, A), with sub-areas and meta-areas. The data comes from the ZDL-Regionalkorpus, with Webmonitor as a supplement.
- A word gets a regional label when it occurs "vorwiegend in Zeitungen bestimmter Areale" (mainly in newspapers from particular areas). "In der Arealkarte sind die Areale farblich abgegrenzt und die Zeitungsquellen in Form von Markern lokalisiert." (Areas are colour-coded and newspaper sources appear as markers.)
- DWDS does not document the normalisation or the colour scale.

### 1.5 Etymologie and Thesaurus
- Etymologie: taken verbatim from Pfeifer, *Etymologisches Wörterbuch des Deutschen*. It gives the word family (e.g. Häuschen, hausieren, Haushalt) and the word history. For us, the counterpart is the provenance narrative per word form.
- Thesaurus: OpenThesaurus (dated "04/2026"), grouped by sense. Labels such as "ugs." (colloquial), "veraltet" (obsolete) and "abwertend" (pejorative) are separated by "●".

## 2. Formulas to implement

Notation: N = corpus (or subcorpus) size in tokens; f(w) = lemma or form count; f(x,y) = co-occurrence count in a given relation or window.

### 2.1 Instances per million (ipm)
`ipm(w) = f(w) / N × 1 000 000`

For time series, follow DWDS `norm`: `ipm_t = f_t(w) / N_t × 1e6`, where N_t is the token total of slice t. Optionally normalise per (slice, genre) and average across genres, which gives DWDS's "Datum+Textklasse" behaviour.

### 2.2 Frequency class (Häufigkeitsklasse)
The Leipzig/German-linguistics convention is quoted on Wikipedia (https://en.wikipedia.org/wiki/Word_list): the class is defined "using the base 2 logarithm of the ratio between its frequency and the frequency of the most frequent item. The most common item belongs to frequency class 0 (zero) and any item that is approximately half as frequent belongs in class 1."

`HK(w) = ⌊ 0.5 − log2( f(w) / f_max ) ⌋  =  round( log2( f_max / f(w) ) )`

**Correction to the brief:** the definition **rounds**. It is not `floor(log2(f_max/f_w))`. Wikipedia's check: "outragious" has 76/3 789 654, log2 ≈ 15.6, so class 16. The Leipzig FAQ (https://wortschatz.informatik.uni-leipzig.de/en/faq-dict_portal) sits behind a bot wall, so I could not verify it there.

DWDS's 7-step barometer is its own, undocumented log scale. Recommendation: store HK (0..~25) and map it to a 0–6 dot display with fixed bins, e.g. `dots = clamp(6 − floor(HK/3), 0, 6)`. Document the bins on our methodology page.

### 2.3 Time-series smoothing (DWDS window/wbase)
Centered moving average with window w (neighbours on each side) and inverse-distance base b:

`s_t = Σ_{k=−w..w} b^{−|k|} · ipm_{t+k}  /  Σ_{k=−w..w} b^{−|k|}`  (only over existing slices)

With b = 1 this is a plain moving average, which is DWDS's default (w = 3). Always offer a raw view. When `f < ~1 ipm`, show raw counts and set w = 0. For log averaging (`logavg`), apply the average to `ln(ipm + 0.5)` and then back-transform.

### 2.4 Association measures (collocations)
Use f_x, f_y, f_xy and N. The expected count is `E = f_x · f_y / N`.

| Measure | Formula | Source |
|---|---|---|
| logDice | `14 + log2( 2·f_xy / (f_x + f_y) )`, max 14, does not depend on N | Rychlý 2008 (RASLAN); DWDS Wortprofil |
| MI | `log2( f_xy / E ) = log2( f_xy · N / (f_x · f_y) )` | Church & Hanks 1990 |
| t-score | `(f_xy − E) / √f_xy` | Church et al. 1991 |
| G² (collocation) | `2 Σ_{ij} O_ij ln(O_ij / E_ij)` over the 2×2 table O11=f_xy, O12=f_x−f_xy, O21=f_y−f_xy, O22=N−f_x−f_y+f_xy | Dunning 1993 |

For the DWDS Wortprofil, f_x and f_y are counts **within the given syntactic relation**. Apply the DWDS thresholds `f_xy ≥ 5` and `logDice > 0`. Formula summaries also appear in "Statistics used in Sketch Engine" (https://www.sketchengine.eu/wp-content/uploads/ske-statistics.pdf); its text could not be extracted here, so the formulas above follow the primary papers.

### 2.5 Comparing two subcorpora (period A vs B, region A vs B)
From the UCREL LL wizard (https://ucrel.lancs.ac.uk/llwizard.html). Let a = f in A, b = f in B, c = N_A, d = N_B:

```
E1 = c·(a+b)/(c+d)      E2 = d·(a+b)/(c+d)
G² = 2·( a·ln(a/E1) + b·ln(b/E2) )      # terms with a or b = 0 contribute 0
```

Critical values (1 d.f.): 3.84 (p<.05), 6.63 (p<.01), 10.83 (p<.001), 15.13 (p<.0001).

Also show an effect size, because G² grows with corpus size. Hardie's **Log Ratio** is `log2( (a/c) / (b/d) )`, the binary log of relative risk. Before normalising, replace a zero count with 0.5, as UCREL does. Display it as "×2.3 more frequent in A". For many regions, compute G² for each region against the rest of the corpus and colour the map by Log Ratio, masking cells where G² < 3.84.

### 2.6 Dispersion
Let k parts (texts, years, or regions) have sizes n_i, with N = Σn_i. The word occurs y_i times in part i, and its total is AF = Σy_i.

- **Gries DP** (Gries 2008, IJCL 13(4):403–437, https://stgries.info/research/2008_STG_Dispersion_IJCL.pdf): `DP = ½ Σ | y_i/AF − n_i/N |`. A value of 0 means perfectly even distribution and 1 means concentrated. Normalised version (Lijffijt & Gries 2012): `DP_norm = DP / (1 − min_i(n_i/N))`. Formulas as given in the tlda docs (https://rdrr.io/cran/tlda/man/disp_DP.html).
- **Juilland's D**: `D = 1 − (σ/ȳ) / √(k−1)`, where ȳ = AF/k and σ is the population SD of y_i. It assumes **equal-sized parts** (https://www.refsmmat.com/notebooks/dispersion.html). It also depends on k, which makes it a poorer fit for unequal regional or period subcorpora.
- **Recommendation:** use DP for its robustness to unequal parts. Display it as "evenness = 1 − DP" with a 0–1 bar. Also show "range", the number of parts where y_i > 0.

## 3. UI suggestions (Vue 3)

### 3.1 Word-card layout (desktop: 2 columns; mobile: stacked)
```
┌──────────────────────────────────────────────┬──────────────────────┐
│ ХАТА  ж.  /xɐˈtɑ/ ▶   [form chips: хати хаті…]│ Частотність ●●●●○○○  │
│ POS · gender · paradigm link                  │ 812 ipm · HK 9 · DP .12│
│ ─ Значення (senses, collapsible)              │ ─ Sparkline 1800–2025 │
│ ─ Походження (provenance timeline per form)   │ ─ Mini choropleth     │
│ ─ Типові сполучення (cloud ⇄ table toggle)    │ ─ Period bars (G²★)   │
│ ─ Приклади (KWIC, 5 shown, "більше…")         │ ─ Source mix donut    │
│ ─ Синоніми / споріднені                       │ "auto-generated ⓘ"    │
└──────────────────────────────────────────────┴──────────────────────┘
```
- Header: lemma, POS, stress, and **form chips**. Clicking a chip filters every panel to that word form. This is the core of a provenance lexicon.
- Stats sidebar: a dot barometer (0–6, with a tooltip giving ipm, HK, raw count and corpus size), an evenness bar, and the first-attested date and source.
- KWIC rows use the format `left context | **node** | right context` with a monospace-aligned node, and a citation line underneath (author, title, year, region, link). Offer sort-by-left or sort-by-right and a filter by period or region.
- Typische сполучення: group partners by relation, and colour them by POS, as DWDS's legend does. Font size scales linearly with logDice, clamped to the range 0–14. A table view lists f_xy, logDice and MI.

### 3.2 Chart types
| Panel | Chart | Notes |
|---|---|---|
| Card header | Sparkline (ipm per decade) | 120×28 px, no axes, with first and last values labelled |
| Verlaufskurve | Line chart, smoothed line over faint raw bars | Controls: slice (1/10 y), window (0–5), raw/ipm toggle, log-scale toggle; shade sparse slices where N_t is small |
| Period comparison | Horizontal bars of ipm per period | Mark bars that are significant against the previous period (G² ≥ 3.84) and label them with Log Ratio |
| Region / dialect | Choropleth of oblasts | Diverging colour scale for Log Ratio (region vs rest), grey where N is small or not significant; tooltip shows ipm, f and N |
| Collocations | Word cloud plus a sortable table | Relation tabs |
| Dispersion | A strip of tiny bars per text or year | Optional |

Libraries: plain SVG or ECharts/uPlot for the line charts. For the map, a d3-geo projection over pre-simplified GeoJSON is enough: 27 polygons, with no tile server needed.

### 3.3 Ukraine oblast polygons (verified)
1. **Natural Earth, Admin-1 States/Provinces** is **public domain**: "All versions of Natural Earth raster + vector map data found on this website are in the public domain." (https://www.naturalearthdata.com/about/terms-of-use/). GeoJSON: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson (40.7 MB, global). Filter to `adm0_a3 == "UKR"` and simplify with mapshaper (`-simplify 5% -o precision=0.001`), which should give under 100 KB. The 50m version is smaller but includes fewer countries' admin-1 units.
2. **geoBoundaries gbOpen UKR ADM1** has 27 units (24 oblasts, Crimea, Kyiv and Sevastopol cities) and ships a **ready-made simplified file**: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson. The licence is **ODbL 1.0** (source: OpenStreetMap), which requires attribution "© OpenStreetMap contributors" and share-alike on the derived database. This is not public domain. Metadata: https://www.geoboundaries.org/api/current/gbOpen/UKR/ADM1/
3. Avoid EugeneBorshch/ukraine_geojson. The GitHub API reports `license: null`, so the repo has no licence and cannot legally be reused. 0G3RA/ua-geo-set is MIT-licensed code, but its geometry provenance is unclear.

Recommendation: ship Natural Earth (public domain), filtered and simplified, as `public/geo/ukr-oblasts.json`. Key it by the ISO 3166-2 code (`UA-46` and so on, from the `iso_3166_2` property), and map our dialect regions onto oblast codes. Show Crimea and Sevastopol as part of Ukraine, which matches the Natural Earth default and ISO 3166-2:UA.

## 4. Implementation checklist
- Precompute for each (lemma, form): f, ipm, HK, DP, a per-slice series (raw f_t and N_t), and per-region f_r and N_r.
- Precompute collocations for each relation: f_xy, f_x, f_y, logDice and MI, keeping rows with f_xy ≥ 5 and logDice > 0.
- Compute the comparison stats client-side from counts (G², Log Ratio). They are cheap and depend on what the user selects.
- Store the corpus sizes N_t and N_r in their own table. Every normalised number needs its denominator.
- Show an "automatically generated" note and link to a methodology page that lists every formula above.
