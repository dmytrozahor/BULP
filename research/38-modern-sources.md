# research/38 — modern (2018–2026) colloquial, slang and IT vocabulary: where it can be taken from (SPEC 63 MD-1)

Checked 2026-10-15 with an identified client (`BULP-ukr-lexicon/0.1 (… dmytrozah.dev@gmail.com)`), ≥ 2 s between requests. Rule (SPEC 00): source + verbatim quote + locator; a date we do not have is **unknown**, never a guess. Ingest: `pipelines/ingest-modern-wikt.ts`, `pipelines/modern_count.py`, `pipelines/ingest-modern.ts` → `public/data/modern.json`; types computed in `core/modern.ts`.

Three kinds of date appear below and are never confused:
- **crawl date** (HPLT `ts`): the page existed by then; terminus ante quem of the usage, not its publication date;
- **entry date** (Wiktionary first revision): when the word was added to the dictionary, not when it was first used;
- **none** (UberText dump): corpus snapshot only (UberText 2.0 is described as built in 2022–23; Wikipedia part "as of January 2023"); the badge shows «дата не відома».

## 1. Decision table

### (a) May be used

| source | access terms found (verbatim) | gives | date per item | what we store |
|---|---|---|---|---|
| **HPLT 2.0 cleaned, Ukrainian slice** (`HPLT/HPLT2.0_cleaned`, config `ukr_Cyrl`) | HF card `license: cc0-1.0` ("the source … is mostly Internet Archive with some additions from Common Crawl"); `huggingface.co/robots.txt` = `Allow: /`; ungated; bulk parquet shards 150–240 MB (`ukr_Cyrl_1` has 300 shards) | running web text, 1.17e9 docs total for 191 languages; column `ts`, `u` (URL) | `ts` = crawl timestamp (month used) | **vocabulary only**: token, frequency, first/last crawl month. One shard (`ukr_Cyrl_1/train-00000-of-00300`), first 120 000 documents, sampled; no text, no URLs |
| **UberText 2.0 — social** (lang-uk, `lang.org.ua/en/ubertext/`) | page has no licence text (checked: no "licen"/"CC" in the page; `lang.org.ua/robots.txt` carries only content-signal comments, no Disallow); direct download offered (`/static/downloads/ubertext2.0/social/cleansed/…bz2`, 95 MB); "social (264 public telegram channels), acquired from the project TGSearch" | running text of public Telegram channels | **none** in the `text_only` dump | **vocabulary only** (the posts belong to their authors, the dump states no licence): token + frequency, first 4 000 000 lines |
| **uk.wiktionary** (categories Неологізми/uk 102, Жаргонізми/uk 16, Інтернетний жаргон/uk 2, Інтернет-жаргон 1, Комп'ютерні терміни/uk 31) | CC BY-SA 4.0 (attribution kept in `SOURCES.WIKT`). `robots.txt` has `Disallow: /w/` for `*`; the **API** is governed by Wikimedia's API etiquette / User-Agent policy (identified client, serial requests), the same basis as the project's `usage-wikt.ts` / `senses-wikt.ts` (research/14 §2) | headword, category (= the label), first gloss | entry date = first revision timestamp | headword + gloss ≤ 160 chars (a quote, attributed) |

Not taken from UberText: `news` (3.7 GB, would need a multi-GB download; skipped for size, same method would apply) and the other subcorpora (fiction/court/wikipedia are not colloquial or not modern-slang material).

### (b) Needs the owner's decision (NOT scraped)

| source | why blocked | what it would give |
|---|---|---|
| **DOU.ua** (articles, forum, comments) | `robots.txt` allows articles, but the ToS (`dou.ua/legal/`, §2.5) say: "не здійснювати доступ до Вебсайту через автоматизовані програмні засоби з метою … автоматичного збирання розміщеної на сайті інформації без згоди Адміністрації"; §3.2 licenses works under CC BY-NC-SA 3.0 for non-commercial use, which covers the use, not the automated collection. Written consent of the Administration is needed | the best dated IT slang (post dates), but also comments (personal data) |
| **Reddit** (r/ukraine, r/Ukraine_UA) | `robots.txt`: `User-agent: * Disallow: /`, plus the Public Content Policy (restricts use; research access via r/reddit4researchers); API needs approval | dated posts |
| **Telegram public channels** (`t.me/s/…`) | no robots.txt (404); the ToS/API terms restrict bulk collection, each channel author owns the text; UberText social already covers the same material in bulk | dated posts |
| **YouTube subtitles** | robots.txt disallows `/api/`, `/comment`, `/results`; ToS forbid scraping | dated speech transcripts |
| **Мислово** (myslovo.com, user slang dictionary) | `robots.txt`: `Crawl-delay: 90` (one request per 90 s), the site is a JS shell (512 bytes of HTML), no readable ToS found; user-generated entries have unknown authors/licences | slang definitions with dates |
| **CulturaX / OSCAR Ukrainian** | HF repos gated (`uonlp/CulturaX` auto-gated, OSCAR-2301 manually gated, terms of the source crawls apply); HPLT covers the same need ungated | web text |
| **GRAC (uacorpus.org)** | no robots.txt, search interface only; no download of text, ToS not found; mostly non-modern before 2010 | dated corpus attestations |
| **Brown-UK, «Корпус Шпигун»** | Brown-UK is 2010-era balanced text (not recent); «Шпигун» not located under that name by any query | — |

### Rejected

- A hand list of "IT slang" words: the project does not hand-label (SPEC 63 AC); every badge needs a source row.
- Scraping search engines for first-use dates: no terms permit it.

## 2. What the data can and cannot say

- HPLT's shard sampled is dominated by one crawl year, so first-attestation months are "by crawl", and a word first crawled in 2022 may be older. Counts per source and per year are in `analysis/modern-vocabulary.md`.
- A neologism **candidate** is a lower-case, non-sentence-initial Cyrillic token absent from VESUM (all forms, 3.9 M) with total f ≥ 3 and occurring in ≥ 2 sources (HPLT and UberText social). It is *not* a verified neologism: typos, inflected forms of unlisted lemmas and Surzhyk pass the filter. The badge says «кандидат», the evidence says what was counted.
- Types come from existing code: LA (`analyzeLoan`: a cited suffix rule fires → «англіцизм/запозичення»), SL/AC (Wiktionary category label → «сучасний сленг» / «ІТ-жаргон» / «неологізм», the category name being the quote).
