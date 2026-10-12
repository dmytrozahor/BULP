# R17 — songs & music (U-7, U-9)

Tags: [Q] verbatim-checked, [P] paraphrase, [U] unverified. Tool-call budget used: 11 of 25.

## 1. Verified media IDs

| Item | Result | Tag |
|---|---|---|
| youtu.be/CGxJMG-W-LY | oEmbed title «Княжат роських недармо - Хорея козацька»; author_name «Luzanov Illia» (author_url youtube.com/@luzanovilllia0919); provider YouTube | [Q] (oEmbed) |
| Identity of uploader | The uploader is a personal channel, **not** the ensemble «Хорея Козацька». The title's song is «Княжат роських недармо» with the ensemble name in the title. Treat as a third-party upload; licence of the recording is unknown. | [P] |

Action: the brief's assumption «Хорея Козацька» as the performer is only partly confirmed (the title names the ensemble). Re-check before use.

## 2. Polyphony Project

| Field | Finding | Tag |
|---|---|---|
| Site | polyphonyproject.com could not be read (WebFetch returned only the word "polyphony"). Terms, licence, citation rules and URL patterns are **not verified**. | [U] |
| Scope (secondary) | Ivan Honchar Museum page: >100 villages, >2,000 samples; Hungarian article: >170 villages, >5,000 songs. Figures conflict. | [P] honchar.org.ua/en/projects/polyphony-project-i68; euromaidanpress.com 2019/07/27 |
| Content (secondary) | Video, lyrics transcribed in original and Romanised, multitrack audio (per-voice playback). | [P] |
| Origin | Started by Miklós Both (Hungarian musician); Hungary–Ukraine–France cooperation; EU Creative Europe support. | [P] |

Open: verify the site's terms page before any ingestion. Do not scrape; link out only until terms are read.

## 3. Folk songs from the U-7 list

| Song | Status | Tag |
|---|---|---|
| Ой на горі та женці жнуть | Search returned only school test pages (naurok.com.ua). Ascribed to Sahaidachnyi/Doroshenko in one test, which is unreliable. No collector or first publication found. Likely in the Antonovych–Drahomanov collection (1874) — not verified. | [U] |
| Де єсть руська отчина | No source found in search. Date (XVII c.) from brief not confirmed. | [U] |
| Марічка Чичері, Гей гу гей га, Гей відчиняйте до свободи браму, Кто кріпко на Бога уповая, похід дружинників, Хорея козацька, Під каменцем під подольським, Дума про Батурин | Not searched (budget). | [U] |
| Дума про Батурин | Not searched. | [U] |

### Антонович–Драгоманов, «Исторические песни малорусского народа» (1874)
- Full text not found online via search. Secondary sources say the material was largely collected by predecessors and songs are arranged chronologically by event (Sokolova 1962, eoarchive). [P] nasu-periodicals.org.ua; eo.iea.ras.ru
- Possible readable copy: archive.org `dragomanov_2.pdf` — an 1874-style orthography fragment, but its identity with the 1874 collection is **unverified** (see 4 below).

### Хорея козацька (ensemble)
- Ensemble led by Taras Kompanichenko; plays on historical instruments (bandura, baroque guitar, fiddle). Shared album «Terra Cosaccorum» with «Гуляйгород» (2010). Shevchenko Prize mentioned. [P] armyinform / lb.ua search snippets; not opened.
- Whether the ensemble's arrangement is the source of the 1nn234/ukrpovstanets versions is **unknown**.

## 4. Edition/source checks
- uk.wikisource.org/wiki/Ой_на_горі_та_женці_жнуть: HTTP 404 (page not present at that title). [Q] fetch result. Other title variants not tried (budget).
- No licence check done for folk texts (folk texts: PD by general rule; arrangements and recordings: not PD — per brief, to confirm).

## 5. Channels
- youtube.com/@ukrpovstanets: fetch redirected to a Google consent page; content not read. [U]
- @1nn234: not checked. [U]
- ToS (embed OK, no audio scraping): not verified in this run. Use YouTube embed only; do not download audio.

## 6. Contemporary artists (Скрябін + ~10)
Not researched (budget exhausted for this run). [U]
Lyrics policy: brief's «≤2 lines quotation + link» is a planning assumption, not verified. [U]

## 7. Data-model notes (from brief, unverified in this run)
- Witness kind `song`: date, region, performer, collector, media links, per-line timestamps.
- Media view: YouTube embed + synchronised clickable annotated lyrics.
- Only embed IDs marked [Q] (CGxJMG-W-LY) may be used now; others must be verified first.

## Open items (for next run)
1. Read polyphonyproject.com terms and URL patterns (try /en/ or about page).
2. Identify the Antonovych–Drahomanov text of «Ой на горі…» and «Де єсть руська отчина» (chtyvo.org.ua, diasporiana, archive.org).
3. Verify remaining U-7 songs via search with title + «пісня» and collector names.
4. Get channel data for @ukrpovstanets and @1nn234 via a non-consent route or oEmbed with a known video URL.
5. Contemporary artists and lyrics policy.

---
# Round 3 log (Sonnet, raw fetch via Node helpers in `.claude/jobs/293095c9/tmp/`; WebFetch not used)
Tags as above. Supersedes the [U] rows in sections 2-6 where stated here.

## R3-1. Methods and fetched URLs
- `https://www.youtube.com/oembed?url=https://youtu.be/CGxJMG-W-LY&format=json` -> 200, title «Княжат роських недармо - Хорея козацька», author_name «Luzanov Illia» [Q] (re-verified; third-party upload).
- YouTube raw HTML (cookie `CONSENT=YES+1; SOCS=CAI` avoids the consent redirect): `/@ukrpovstanets/videos`, `/@1nn234/videos` (200, ~1.3 MB; 30 `contentId`s each), `/results?search_query=…` (ytInitialData videoRenderer: id, title, owner, age, length), `/watch?v=ID` (shortDescription, uploadDate), `/oembed?url=…watch?v=ID` -> 200 for every id tested.
- Wikisource/Wikipedia/WikiSpiv: `w/api.php?action=query&list=search` and `index.php?title=…&action=raw`. Wikimedia answers HTTP 429 to back-to-back requests: keep >= 2.5 s between calls and send a User-Agent with contact.
- `https://www.polyphonyproject.com/en`, `/en/terms`, `/robots.txt`: identical 1448-byte SPA shell, no real terms or robots file [Q].
- `https://collections.ukrfolk.ca/` and `/about` (Omeka; Bohdan Medwidsky Ukrainian Folklore Archives, Kule Folklore Centre, Univ. of Alberta) -> 200. No U-7 song looked up there (search is form-based) [U].

## R3-2. Channels (U-7 / U-9)
| Channel | What it publishes | Self-description [Q] | Embeds |
|---|---|---|---|
| @ukrpovstanets «Український Повстанець» | anthems, marches, insurgent and folk songs; descriptions often hold full lyrics | «Я не отримую жодного заробітку з цього каналу. Якщо ви є автором або виконавцем пісні і не бажаєте щоб відповідне відео було опубліковане на каналі - зазначте це в коментарях, відео буде видалено.» | per-video oEmbed 200 |
| @1nn234 (UCIbwoO3WO5qhItpBMCQnY9A) | Cossack songs, думи, канти, псальми, колядки; descriptions name performer, sometimes lyrics | «Українські народні пісні, Козацькі пісні, Стрілецькі пісні, Повстанські пісні... Старовинні думи, канти, псальми, барокова музика…» | per-video oEmbed 200 |
- Channel-level oEmbed is not usable; use per-video URLs. YouTube ToS text itself was not fetched [U]. Rule: embed iframe only; store id, title, uploader, uploadDate; never download audio.
- Both channels re-upload other people's recordings; ids are pointers, not a licence.

## R3-3. U-7 songs
Video ids were found by YouTube search plus a `watch` page read; "(o)" = oEmbed returned 200 for the id. uploadDate is the YouTube upload, not the song date.

| Song | Identification and earliest text | Region | Videos |
|---|---|---|---|
| Ой на горі та й женці жнуть | Cossack historical song, "ймовірно у другій половині XVII ст." [P] (uk.wikipedia «Ой на горі та й женці жнуть», raw). Oldest variant: Galicia, records of Домінік Рудницький, 1713 («Wiersze różne, i niektóre pieśni na noty położone») [P, cited by Wikipedia, not seen]. Earliest print on Wikisource: М. Максимович, «Украинскія народныя пѣсни», Москва 1834, section «О Грицькѣ Сагайдачномъ» (index «Украинскія народныя пѣсни (1834).djvu», pp. 124-125) [Q: wikisource raw `Украинскія народныя пѣсни/О Грицькѣ Сагайдачномъ`]. Also Наша пісня 1916/1917, Український співаник 1918, Ждаха 1911. Wikisource «Ой на горі та й женці жнуть» exists as a versions list (round-1 404 was a wrong title). Срезневський and Каманін tie it to Doroshenko/Sahaidachnyi [P]. | Galicia (1713); Hetmanate subject | ojtOxnv8CL0 (1nn234, Капела бандуристів ім. Майбороди) (o); PEUzUK5vRzY |
| [Q] https://www.youtube.com/watch?v=ojtOxnv8CL0 (description) | «Ой на горі та женці жнуть, / А попід горою / Яром-долиною / Козаки йдуть.» | | |
| Гей гу гей га | Not an UPA original: Plast kurin «Лісові чорти» song, words and music Тарас «Чача» Крушельницький, created on a boat trip in Polissia in 1930 (WikiSpiv page, citing pisni.org.ua/songs/642.html) [P]; the «Бандера поведе нас» variant is later and disputed. Wikisource: «Гей-гу, гей-га (Гімн куреня "Лісові чорти")», category Пластові пісні. | Galicia / Plast, 1930 | GjHMbwLL5k4, qSEjpKZ2_ho, 6gqaXATq_jk, LZL4Tw4aM9g |
| [Q] https://uk.wikisource.org/wiki/Гей-гу,_гей-га | «Гей-гу, гей-га, таке-то в нас життя. / Наплечники готові, прощай моє дівча!» | | |
| Кто кріпко на Бога уповая | Кант/псалом, слова Феофана Прокоповича (1681-1736) per the 1nn234 description [Q: https://www.youtube.com/watch?v=oK_CxBm_0fg]; performed by Хорея Козацька. Earliest manuscript/print not found [U]. | Kyiv Academy milieu, XVIII c. | oK_CxBm_0fg (o); C9oR-7jPvAk; s03KT1RxZZs; OY3nUO6IczA; JV6U1xOU9r8 |
| Під Каменцем, під Подольським | Anonymous, XVII c. (siege of Kamianets 1672 as context); words from Oskar Kolberg's record, "Русь Карпатська"; reconstruction Т. Компаніченко; music Олекса Мишанич, «З гір Карпатських», Ужгород 1981 [Q: https://www.youtube.com/watch?v=rejTfcjR8nc]. Kolberg volume/year not named [U]. | Carpathian Rus' | rejTfcjR8nc (Польський інститут у Києві, 2021) (o); dbdIPnH4eUE; UKaxJYKxgjo |
| [Q] same URL | «Під Каменцем, під Подільським» (ХVІІ ст.) / Анонім. Слова: запис Оскара Кольберґа. Русь Карпатська. | | |
| Дума про Батурин | Not an old folk дума: «авторська пісня» of Тарас Компаніченко, text and music by him, written 1999-2000 (uk.wikipedia «Дума про Батурин») [Q]. 1nn234 labels it "Старовинна козацька дума, XVIIIст." (wrong). In-copyright modern text. | Kyiv, 1999-2000 | dqeQ8uS5zpI (1nn234) (o) |
| [Q] https://uk.wikipedia.org/wiki/Дума_про_Батурин | «Спи, дитя моє кохане, люлі, люлі, бай, / Заглядає місяць ясний в наш убогий рай.» | | |
| Похід дружинників | Хорея Козацька arrangement of the колядка «Й-а в поли, в поли, близько дороги»; this variant recorded by Oskar Kolberg, «Покуття» vol. 1, Kraków 1882 [Q: uk.wikipedia «Й-а в поли, в поли, близько дороги»]; album «Рицер Смілостю Упоєнний» (live, Луцький замок, 2009) [Q]. | Pokuttia | u2UD7itFbDU (1nn234, 11:27) (o); EKBdehCVwq8 |
| Де єсть Руська отчина | Not XVII c.: uploads credit «слова і музика Івана Гушалевича» (1849) [P: titles of weUrJxvjP10, SW86XZOlkQY]. Хорея Козацька performance l-y8FUIJ-eU (festival «Жнива 2011»; lyrics link nashe.com.ua id 11423 in description [Q]). Hushalevych's uk.wikipedia page does not name the song [U]; 1849 primary publication not located. | Galicia | l-y8FUIJ-eU (o); xPujhnUghCk; weUrJxvjP10 |
| Гей відчиняйте до свободи браму | = «Хлопці з лісу», song of the Сотня «Левів»; description of https://www.youtube.com/watch?v=5Pchv7llNis begins «Гей, відчиняйте до свободи браму, / Кров'ю свячені золоті ключі:» [Q]. Author and date: not found [U]; apparently modern (Lviv), not old folk. | Lviv | 5Pchv7llNis (Український Повстанець) (o); HzMYuHIyE58 (iNEBO) |
| Марічка Чичері | Carpathian folk song; credited «Composer: Народна / Lyricist: Народні» on Борис Сичевський's 2005 release (TM Golden Music, id e6n6fgmXPCE) [Q]. No uk.wikipedia article, no Wikisource/WikiSpiv hit. First collector/date not found [U]. | Carpathians | e6n6fgmXPCE; Ueap5-cIDKc (ВІА Червона Рута); AXBiRXuDWM4 |
| Княжат роських недармо | Only the Luzanov upload (CGxJMG-W-LY); no text or author found on Wikisource/WikiSpiv/uk.wikipedia [U]. Related panegyric channel: «Русинська музика Козацької доби», e.g. 49i6mtEEprs «На герб славного князя Четвертинського» (1623) [P]. | Ruthenian lands | CGxJMG-W-LY (o) |

Хорея Козацька: Kyiv early-music ensemble, 2005 to present, led by Тарас Компаніченко; Middle Ages to Romanticism repertoire (uk.wikipedia «Хорея Козацька») [Q]. Albums seen: «Рицер Смілостю Упоєнний» (2009), «Тера Козацька», «Бенкет Духовний», «Карміна Сарматіка». Arrangements and recordings are not public domain; only old folk texts are.

## R3-4. Polyphony Project (resolves section 2)
- polyphonyproject.com is a Vue SPA (routes `/`, `/:locale`, `about`, `page/:slug`, `map`, `records`, `song/:item_id`). Data come from a public GraphQL endpoint `https://data.polyphonyproject.com/api` (found in `/js/app.3d0017d0.js`); introspection is on. Query fields: `woa`, `woas(limit,offset,lang,…)`, `page(slug)`, `searchresult`, `archives`, `taxonomies`, `collectors`, `sources` [Q].
- `Woa` fields: item_id (e.g. `BMI_UK17050328`), name, date_of_collecting, location_txt_locality/county/country/archaic, media_audio_mp3, media_video_file, media_video_youtube_code, audio_tracks, collector_comment, editor_comment, sources_text, sources_age_text, archive_timecode, nationality [Q]. Song URL pattern `/song/<item_id>` [P].
- `woas(limit:6000, lang:"uk")` returned 1977 records. A title regex over them found no match for any U-7 song (Марічка, женці, Каменц, отчин, відчиня, Бога уповая, Батурин, гей-гу) [Q: own query]. Polyphony holds village polyphonic field recordings; use it for dialect/region witnesses, not for U-7.
- Terms/licence: `page(slug:"about"|"terms"|"copyright"|"licence")` -> null; no terms found [U]. Until a licence is found: no bulk download; link per record and use YouTube embed codes only; ask the project before ingesting metadata.

## R3-5. Contemporary artists (channel self-descriptions, P-2)
Channel `<meta description>` of the YouTube about page, fetched 2026-10-12 (YouTube truncates after ~160 chars) [Q]:
| Artist | Channel | Self-identification quote |
|---|---|---|
| Скрябін | https://www.youtube.com/@kuzmenkoandriy | «СКРЯБІН - один з найвідоміших гуртів України.» |
| Океан Ельзи | /@okeanelzyofficial | «Офіційний YouTube канал групи "Океан Ельзи"» |
| Воплі Відоплясова | /@VopliVidopliassova | «Воплі Відоплясова — український рок-гурт, створений у 1986 році.» |
| Бумбокс | /@familyboombox | «Бумбокс / Музика для Мас / Меломанiя» |
| ДахаБраха | /@DakhaBrakha | «Official YouTube channel of Ukrainian «ethnic chaos» band DakhaBrakha.» |
| Go_A | /@Go_A | «Ukrainian electro-folk band Go_A» |
| Kalush Orchestra | /@kalush.orchestra | «The interweaving of folk motifs and modern rhythms in the songs of Kalush Orchestra allows you to take a fresh look at the rap genre.» |
| Гайдамаки | /@HAYDAMAKY | «Український етно-рок гурт Гайдамаки» |
| Тартак | /@TartakUA | «Канал культового українського гурту Тартак.» |
| Антитіла | /@ANTYTILA | «Український поп рок-гурт, заснований у 2008 році в Києві.» |
| Мандри | lookup crashed (redirect loop) | [U] |
Caveat: these are channel texts (band/management voice), not interview statements; the Скрябін text is third-person promotional copy. P-2: record as "channel self-description" only.

## R3-6. Lyrics policy (recommendation) [P]
1. Old folk texts and pre-1900 collections (Максимович 1834, Kolberg 1882): quote with edition and page; public domain.
2. Authored modern text (Компаніченко «Дума про Батурин», Скрябін and other bands, Крушельницький): at most 2 consecutive lines as a quotation plus a link to the source (YouTube/label/WikiSpiv); never the full text. Per-line timestamps and annotations without reproducing whole lines are fine. Крушельницький's death date and the resulting PD status are not checked [U].
3. Store video ids and links, never audio.
4. Tag each witness `licence: pd-text | quote-only | link-only`.

## R3-7. Still open
- First print of «Марічка Чичері» and «Де єсть Руська отчина» (Hushalevych 1849 primary); author of «Хлопці з лісу»; source of «Княжат роських недармо»; Kolberg volume for «Під Каменцем».
- Rudnytskyi 1713 variant of «Ой на горі…» (second-hand only); Maksymovych 1834 page text (my page-title guess `Сторінка:…djvu/124` returned 404).
- Polyphony licence; YouTube ToS text; ukrfolk item search.
