# R22 — Etymology sources and data model (U-22)

Tags: [Q] verbatim-checked in this session · [P] paraphrase · [U] unverified / not fetched (cap reached).
Budget: 6 tool calls used of 25. Five-word sample limited to хата; рука, кінь, свіча, місто are [U].

## 1. Sources

| id | source | access | licence / terms | status |
|---|---|---|---|---|
| ESUM | ЕСУМ (Інститут мовознавства ім. О.О. Потебні НАН України) | print; web mirror goroh.pp.ua/Етимологія/<w> | print copyright; web mirror terms not visible | [Q] mirror shows the ЕСУМ label after entries; no licence on page. Cite-only. |
| Fasmer | Фасмер–Трубачев | print; archive.org scans [U] | print | [Q] bibliography line on хата page: «Фасмер–Трубачев IV 226» |
| Wiktionary uk | uk.wiktionary.org API (`action=query&prop=extracts&explaintext=1`) | JSON API | CC BY-SA (Wikimedia default) [P] | [Q] API returns Етимологія section text; no licence in response |
| Wiktionary en / kaikki | kaikki.org Ukrainian JSONL | `kaikki.org-dictionary-Ukrainian.jsonl`, ~286.8 MB | Wiktionary CC BY-SA; page asks academic citation of Tatu Ylonen | [Q] page marked DEPRECATED, "will be removed in the near future"; extracted 2026-10-03 from enwiktionary dump 2026-09-02. Field names not listed on page [U]. |
| Brückner, Boryś, Holub–Lyer, Sławski, Miklosich | print | — | print | [Q] listed in хата bibliography; not fetched |
| ЭССЯ | Этимологический словарь славянских языков | print | print | [U] not fetched |

## 2. Verbatim samples

1. **хата** (goroh ЕСУМ excerpts) [Q]:
   - «з української мови слово поширилося в російську, польську та інші слов’янські;»
   - «запозичене в давньоруські діалекти із пізньоскіфсько-сарматського \*xata (‹ ір. kata)»
   - bibliography: «Фасмер–Трубачев IV 226» [Q]
   - uk.wiktionary API excerpt [Q]: «Від д.-рус. хата, від котрого також виникли укр. хата, рос. хата, білор. хата, пол. chata, чеськ. chata,»
   - Note: the goroh page mixes ЕСУМ text with other discussion (Nostratic, Finno-Ugric, German theories). The ЕСУМ attribution for the Iranian sentence was not confirmed on the page [U].
2. **рука**, 3. **кінь**, 4. **свіча**, 5. **місто**: not fetched [U]. Next step: same goroh + uk.wiktionary calls, ≤2 per word.

## 3. Harvest plan and licence

- Project licence is CC BY-NC-SA. Wiktionary (CC BY-SA) content is compatible only if ShareAlike and attribution are kept on the derived etymology field; the NC clause is a further constraint to check with the user [P, legal review needed].
- ЕСУМ text is copyrighted print: do not bulk-harvest. Store only short quoted excerpts with citation and locator, and link to the mirror URL.
- Wiktionary via API: harvest per lemma with `prop=extracts`, cache with revision id, attribute «Wiktionary, CC BY-SA» plus revision date.
- kaikki.org is deprecated and may disappear; prefer the live API. If bulk is needed, pin the 2026-10-03 file and record its SHA-256 [P].

## 4. Data model (extracted content separate from project hypotheses)

```
EtymologyEntry {
  lemma: string
  extracted: [{                       // dictionary content, provenance-bound
    source: "ESUM" | "Fasmer" | "wiktionary_uk" | "wiktionary_en" | "Bruckner" | ...
    text: string                      // verbatim short excerpt
    quote_tag: "Q" | "P" | "U"
    locator: string                   // volume/page or revision id
    bibliography: string[]
    retrieved: date
    licence: string
  }]
  hypotheses: [{                      // project-side claims, never shown as dictionary fact
    id, author, status: "proposed" | "accepted" | "rejected",
    claim: string,
    evidence: [{ corpus_witness, locator, quote }],
    date
  }]
}
```

Automatic flag: when a corpus first attestation (from witness dating) is earlier than the dictionary's dated first attestation, or later than a terminus the dictionary states, emit `attestation_conflict` on the entry. The flag prompts review and does not correct anything. It uses the witness dating rule from research/09 [P].

## 5. Open items

- Verify kaikki JSONL field names (etymology_text, etc.) by reading the first lines of the file (≈290 MB; use range request) [U].
- Verify ЕСУМ online licence/terms on the official site [U].
- Samples for рука, кінь, свіча, місто [U].
- Wiktionary uk API licence string at the source page [U].

## Round 2 results (FU-22, Sonnet)

Round-1 tag "budget 6 of 25 calls" is superseded. Items below resolved by fetching; the "Open items" in section 5 are updated here.

### R2-A. Verbatim samples (goroh ЕСУМ mirror) [Q]
URL pattern (must be percent-encoded UTF-8; raw Cyrillic in curl from this shell silently returns the "Про сайт" page): `https://goroh.pp.ua/%D0%95%D1%82%D0%B8%D0%BC%D0%BE%D0%BB%D0%BE%D0%B3%D1%96%D1%8F/<percent-encoded lemma>` (HTTP 200, page title «РУКА — ЕТИМОЛОГІЯ | Горох — українські словники»). The page lists several ЕСУМ entries (all words in the same ЕСУМ article cluster), and for the headword the reconstruction chain is in `<li>` fragments; entry headings/volume numbers are not exposed in the HTML text, so page locator = goroh URL only (no ЕСУМ volume/page) [P].

| lemma | excerpt (verbatim, goroh page text) | tag |
|---|---|---|
| рука | «споріднене з лит. rankа̀, пов’язаним чергуванням голосних з renkа̄, riñkti «збирати», parankа̀ «збір, збирання», лтс. rа̄oka, прус. rancko, ( зн. в. rānkan) « тс. »; псл. rǫka «рука»;» | [Q] |
| кінь | «псл. konь, – не зовсім ясне; очевидно, становить етимологічну єдність з псл. komonь «кінь», укр. комонь і псл. kobyla, укр. коби́ла , але взаємний фонетичний стосунок цієї групи слів поки що задовільно не з’ясований;» | [Q] |
| свіча | «псл. světъ ‹ *svoit-;» followed by «р. бр. м. свет , др. свѣтъ , п. świat, ч. svět, слц. svet, вл. нл. swět, полаб. svet, болг. свят , схв. све̑ т , сви̏ jет , слн. svêtel «світлий», стсл. свѣтѣ;» (the свіча article derives from *světъ; the text shown is the cognate chain, headword line not isolated) | [Q] text; [P] that it belongs to свіча |
| місто | «псл. *město «місце», давніше, очевидно, «накидане на землю покриття для розташування», пов’язане з metati, mesti «кидати»;» | [Q] |

Caveat [P]: goroh renders each ЕСУМ entry as a bullet list of fragments without entry-level attribution in the text I extracted; do not store these as sole evidence of ЕСУМ authorship without checking the print/scan volume.

### R2-B. uk.wiktionary API `prop=extracts` [Q]
Request: `https://uk.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=<percent-encoded>`. A User-Agent with contact is required: unidentified rapid requests got «You are making too many requests to the API» (throttle). `prop=extracts` returns an extract for only ONE title per request (multi-title call filled only кінь); query lemmas one at a time with ≥1 s gap. No licence text in the response (project: CC BY-SA, cite the page).

| lemma | pageid | "Етимологія" section as returned | tag |
|---|---|---|---|
| хата | 59579 | «Від д.-рус. хата, від котрого також виникли укр. хата, рос. хата, білор. хата, пол. chata, чеськ. chata, словац. chata, в.-луж. chata. — Запозичене в давньоруські діалекти із пізньоскіфсько-сарматського *xata (< іранськ. kata), спорідненого з іранськ. kad «будинок»…» | [Q] |
| рука | 5036 | «Від ??» (literal placeholder, i.e. EMPTY) | [Q] |
| кінь | 11249 | «Від псл. konь» | [Q] |
| місто | 5031 | «Від праслов'янської форми *město, від якої також виникли д.-рус. мѣсто «місце; поле; площа; селення», ст.-слов. мѣсто (д.-грец. τόπος, χωρίον), укр. місце, укр. місто (знач. з поль.), болг. място…» | [Q] |
| свіча | — | page `свіча` does not exist on uk.wiktionary (`missing`); `свічка` (pageid 34350) has «Від ??» (empty) | [Q] |

Finding: uk.wiktionary etymology coverage is patchy (2 of 5 empty/missing, 1 is a bare «Від псл. konь»). Treat as thin supplement; en.wiktionary/kaikki and ЕСУМ are richer. The `Від ??` placeholder must be filtered at harvest.

### R2-C. kaikki.org Ukrainian JSONL [Q]
- Index `https://kaikki.org/dictionary/Ukrainian/index.html` links `kaikki.org-dictionary-Ukrainian.jsonl`; a ranged request (`curl -r 0-60000`) works (server honours Range), so no need to download the ~287 MB file to probe.
- One JSON object per line = one word/POS. Top-level keys of the first record (word `собака`, lang_code `uk`, pos `noun`): `pos, head_templates, forms, inflection_templates, descendants, etymology_text, etymology_links, etymology_templates, sounds, word, lang, lang_code, categories, senses`.
- `senses[0]` keys: `links, synonyms, glosses, id, derived, categories`.
- `etymology_text` sample (English): «Inherited from Old Ruthenian соба́ка (sobáka), from Old East Slavic собака (sobaka), from Proto-Slavic *sobaka, derived from Middle Iranian *sabāka-, from West Iranian *spaka, from …» (truncated by me).
- Etymology is English prose plus structured `etymology_templates` (names such as inh/der) which give a machine-readable chain, useful for epoch-linking [P].

### R2-D. Updated open items
- kaikki field names: DONE (above). Whether `etymology_text` is present for each of the 5 lemmas: not checked [U].
- ЕСУМ online licence on the official site and goroh terms: still [U] (goroh «Про сайт» page was returned for malformed URLs; not read for terms).
- Wiktionary licence string: still not in API response; cite page footer [U].
- For «Фасмер» scans on archive.org: not fetched [U].

### Round 2 log (URLs fetched)
- https://goroh.pp.ua/Етимологія/{рука,кінь,свіча,місто,хата} (percent-encoded; raw Cyrillic form returned the generic «Про сайт» page)
- https://uk.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles={хата,рука,кінь,свіча,свічка,місто} (first attempts throttled)
- https://kaikki.org/dictionary/Ukrainian/index.html
- https://kaikki.org/dictionary/Ukrainian/kaikki.org-dictionary-Ukrainian.jsonl (Range 0-60000)
