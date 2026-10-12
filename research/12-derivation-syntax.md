# R12 — derivation & syntax (U-1, U-2, U-3, U-12)

Status: PARTIAL, round 2 added at bottom (A prefixes, B-D SW syntax now [Q] from Правопис § 31 and ЕУМ um159). Tags: [Q] verbatim-checked, [P] paraphrase, [U] unverified.
Only one primary-adjacent search pass was possible. The Правопис 2019 official text was NOT retrieved; no § quotes below are [Q].

## A. Prefix inventory (U-1)

| Prefix family | Allomorph rule (secondary source, [P]) | Notes | Status |
|---|---|---|---|
| з- / с- / зі- | с- before к, п, т, ф, х (сказати, спитати, стиснути); з- before other consonants and vowels (зшити, зорати); зі- before consonant clusters (зігріти, зіпсувати) | rule from naurok.com.ua teaching material, not the Правопис | [P][U] |
| роз- / розі- | always з-; розі- before clusters | voicing variants before voiceless consonants allowed | [P][U] |
| без-, через- | always з- spelling | | [P][U] |
| від-/віді-/од-, ви-, при-, пере-, пре-, на-, за-, по-, у-/в-, об-/обі-, під-/піді-, над-/наді-, до-, недо-, перед-, про- | NOT checked | need Правопис §§ and Shevelov | [U] |

Open: verbatim Правопис 2019 §§ for з-/с-/зі-; aspect pairs; -ся/-сь placement; historical въз-/вы-/из-/отъ-/съ-; CS из-/воз-/пре- vs vernacular; dialect од-/зо- (dialect side covered in research/04, W-SW/W-SE codes); regex tables; VESUM paradigm confirmation.

## B. Analytic forms (U-2)

- Conditional «би» + clitic (бим, бись, бисьмо): modern pedagogy gives «past + би/б» for unreal conditionals [P]. Historical dating, regions and the clitic forms were not verified. Research/04 row SW-PERF-M records «даў бим» → «я дав би» as a dialect (NDN/WPL/SW) form [Q via research/04, W-SW].
- Past + person clitic (зробивєм, робилисмо): research/04 SW-PERF-M, quote «збереження давніх особливих форм праслов'янського перфекта … (носи́вјем, носи́лам, носи́ли смо, носи́ли сте)» [Q via research/04, W-SW].
- SW «буду + l-participle» and «був + l-participle» pluperfect: not verified.
- «буду робити» vs «робитиму»: research/02 gives the modern future «бути — буду … + інфінітив» and synthetic «-му, -меш…» (§115) [Q via research/02 locator §115]. Historical dating not verified.
- Old Ukrainian dative absolute and accusativus/dativus cum infinitivo: not verified. Searches returned no usable source. Candidate sources to fetch: Shevelov *Syntax of Modern Literary Ukrainian* (1963); Жовтобрюх (ред.) *Історія української мови. Морфологія* (1978, no online copy per research/11); ЕУМ «Граматика» (encyclopediaofukraine.com), ukrmova.iul-nasu.org.ua.

2–3-token detection patterns (draft, [U]):
- conditional: `\b(би|б)\b` after a past-tense token; `\bбим\b|\bбись\b|\bбисьмо\b`
- future «буду»: `\bбуду\b` + infinitive token (`-ти$`)
- pluperfect: `\bбув\b|\bбула\b` + l-participle (`-л[аиоі]?$`)

## C. Native enclitics (U-3)

Research/04 and research/02 cover only local dialect pronoun forms (e.g. «ся — сі, си, се», VOL vs NDN, W-VOL). Dating, regional distribution and nativeness evidence for мні/мені, тобі/тебі, собі/себі, м'я, т'я, с'я, ми, ти, си, ни, ви were NOT retrieved. Status [U]. Candidate sources: Павленко 2010 pp. 61–130 (PAVL, per research/11); ЕУМ entries on займенники.

## D. Reduced prepositions (U-12)

Not researched in this pass. Need: attestation of д/ді/до, к/ко/ік, в/у/ув, з/із/зі/зо, од/від; к+dat vs до+gen; contaminated government до+dat (example «д велик_ому міст_у»). Research/04 dialect rows may hold some regional evidence; not yet grepped. [U].

## Gaps (open [U] items, for next pass)
1. Правопис 2019 official text (§§ on prefixes) — fetch the NAS/IM text, not a teaching site.
2. Shevelov *Syntax* (1963) and historical syntax on dative absolute / cum infinitivo.
3. Native enclitic dating (Павленко 2010 pp. 61–130).
4. Reduced preposition attestations, with token-pair regexes.
5. VESUM paradigm check for derivatives (not run; no VESUM query in this pass).

Sources consulted: naurok.com.ua (prefix teaching material, [P]); research/02, 04, 11 (grep only).

## Round 2 results (Sonnet; supersedes [U] rows above where stated)

### A (resolved for з-/зі-/зо-, від-/роз- etc., пре-/при-/прі-). Source: Правопис 2019, slovnyk.ua `pravopys.php?prav_par=31` ([Q], § 31 «Правопис префіксів»)
| Rule | Verbatim quote | Status |
|---|---|---|
| з-/с- | «Префікс з- перед буквами на позначення глухих приголосних к, п, т, ф, х переходить у с-: сказати, спалахнути, стовкти, сфотографувати, схилити. Перед усіма іншими буквами пишемо з (зрідка із)» (§ 31.1) | [Q] |
| зі-/зо- | «Коли ж корінь слова починають дві букви на позначення приголосних, пишемо префікс зі-: зібгати, зігнути, зіпсувати, зісталити…»; «У деяких словах можна паралельно вживати префікси зі- та зо-: зігрівати і зогрівати, зімліти і зомліти» (§ 31.1) | [Q] |
| без-/від-/між-/над-/об-/перед-/під-/понад-/роз-/через- | «кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин» (§ 31.2) — so no роз-/рос- alternation, no розі- in the norm | [Q] |
| пре- | «вживаємо в якісних прикметниках і похідних від них прислівниках для вираження найвищого ступеня вияву ознаки: прегарний, прекрасний, пречудово… а також у словах … старослов'янського походження: преосвящений, преподобний, престол» (§ 31.3) | [Q] |
| при- | дієслова «наближення, приєднання, частковість дії, результат дії» (прибігти, прибудувати); іменники/прикметники «просторового прилягання» (пригірок, прибережний); «неповноти ознаки» (приста́рку́ватий) (§ 31.3) | [Q] |
| прі- | «Префікс прі- вживаємо тільки в словах прізвисько, прізвище, прірва» (§ 31.3) | [Q] |
| вилучення | розі- and віді-/од-: NOT in § 31 (norm has none); од- remains dialect/older (see research/04). | [Q] by absence |
Also fetched: § 25 (прийменник з/із/зі/зо, euphony) and § 23 (у/в) — slovnyk.ua prav_par=25, 23 (euphony rules on prepositions; relevant to D, not quoted in full). Aspect pairs, -ся/-сь placement, въз-/вы-/из-/отъ-/съ-, CS из-/воз-: NOT resolved ([U]); Правопис is synchronic.

### B/C/D (resolved from ЕУМ «Південно-західне наріччя», `http://litopys.org.ua/ukrmova/um159.htm`, [Q])
- «збереження давніх форм дав. і ор. в. одн. особового і зворотного займенників мі, ми, ті, ти, си, м'а, т'а, с'а при формах мені, тобі, собі, мене, тебе, себе в ін. говорах» — enclitics = SW (and "інші") dialect retention; confirms research/04 SW-ENCL-PRON. Dating: NOT stated ([U]).
- «поширення різних форм майб. ч. (бýду писáти, бýду писáв, писáтиму, му писáти)» — SW-FUT-BUDU-L [Q].
- «збереження давніх особ. форм дієслів 1-ї і 2-ї ос. одн. і мн. мин. ч. (носи́вйем, носи́лам, носи́ли смо, носи́ли сте), а також форм давномин. ч. (був-йем казáв) та форм умов. сп. (був бим роби́в)» — past+clitic, pluperfect «був + l-part.», conditional «бим» [Q]. Note «був бим робив» = conditional with auxiliary «був».
- «Синтакс. особливості П.-з. н.: наявність конструкцій прийменник к + іменник, займенник у дав. в. (к тóбі, зам. до тебе) … поширення вільного відносно зворотного дієслова розташування форманта с'я — у препозиції чи постпозиції» — k+dat (U-12) and free ся [Q]. Contamination «до + dat» (д великому місту): NOT found ([U]).
- ЕУМ «Дієслово» (um208.htm) [Q]: «Укр. мова має чотири часові значення: теперішнього, минулого, давноминулого й майбутнього часу»; moods «наказового (піди, зроби), умовного (пішов би, зробив би), спонукального (іти б тобі) і бажального (ти б пішов)». Standard pluperfect/«би» categories attested.
- ЕУМ «Давньоруська мова» (um12.htm) [Q]: «Форми мин. ч. були прості (аорист, імперфект) і складені (перфект, плюсквамперфект)… виникнення єдиної форми мин. ч. на основі перфекта, нових форм умов. та нак. способів» — historical frame for B; no dates for би-м.

### Still [U]
Dated first attestations of бим/бись, буду+l-ptc, був+l-ptc, enclitic мі/ти/м'а; dative absolute, acc./dat. cum infinitivo; до+dat contamination; PAVL pp. 61–130 pronoun section (no local text found by grep of research/11, which covers nouns only). ЕУМ index um.htm is a partial list: no separate entries «Префікс», «Енклітики», «Умовний спосіб», «Плюсквамперфект», «Давальний самостійний», «Інфінітив» exist (fetched; not found).

### Round 2 log (URLs fetched)
- https://slovnyk.ua/pravopys.php?prav_par=1 (WebFetch, TOC only); prav_par=18–60 (curl; titles listed; 31, 25, 23 read)
- http://litopys.org.ua/ukrmova/um.htm (index; https fails cert), um159.htm, um208.htm, um12.htm, um152.htm (Аорист, no relevant content)
- local: research/04 rows SW-PERF-M, SW-FUT-BUDU-L, SW-ENCL-PRON; research/11 (grep)
