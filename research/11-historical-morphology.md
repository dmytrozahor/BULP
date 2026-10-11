# 11 — Historical morphology: Old Ukrainian paradigms, their change into Modern Ukrainian, tag sources in the corpus

Researched 2026-10-11 for SPEC 50 (epoch paradigms). Legend as in research/09: **[Q]** = verbatim, checked against text I downloaded myself (`curl` + `iconv`/`pdftotext`); **[Q\*]** = verbatim but from a text layer with a decoded legacy font (see §0.2); **[P]** = paraphrase or our own design decision; **[D]** = data count produced from `data/work/*` by a script (§5).

## 0. Sources

### 0.1 Accessed and used
| id (proposed for core/sources.ts) | work | access | used for |
|---|---|---|---|
| **PAVL** | Павленко Л. П. *Історична граматика української мови*: навч. посіб. Луцьк: Волин. нац. ун-т ім. Лесі Українки, 2010. 208 с. (recommended by the Ministry of Education; pp. 61–130 = «Морфологія») | DSpace record `https://evnuir.vnu.edu.ua/handle/123456789/341`; PDF via REST `https://evnuir.vnu.edu.ua/server/api/core/bitstreams/737c931c-584f-4a4f-9af3-f2370901a3af/content` (1,472,673 B). PDF page = printed page. | stem-type tables (pp. 74–77), membership lists (pp. 71–73), change narrative (pp. 78–87), adjectives (pp. 98–103), verbs (pp. 111–125) |
| **ENC** (exists) | *Українська мова. Енциклопедія*. К., 2000 — entries «ІСТОРІЯ УКРАЇНСЬКОЇ МОВИ» (В. М. Русанівський) `http://litopys.org.ua/ukrmova/um27.htm`; «ДВОЇНА» (М. А. Жовтобрюх; lit.: «ІУМ. Морфологія. К., 1978») `um187.htm`; «АОРИСТ» (В. М. Русанівський) `um152.htm` | plain HTTP, cp1251 → UTF-8. The site writes ѣ as `Ђ` and ѧ as `А` (font encoding; quoted verbatim). | dated chronology |
| **SHEV** (exists) | Шевельов, *Історична фонологія*, ch. 14 `http://izbornyk.org.ua/shevelov/shev04.htm` (§14.4, §14.5); ch. 62 `shev08.htm` | as research/03 | 3 sg -ть, instr. sg -ъмь, CS soft endings, dat. sg -ovi (dialect) |
| **TOROT** (exists) | annotation header of `ostromir-col.xml` (release on GitHub, local copy `data/raw/torot/ostromir/000.xml`, lines 60–160) | local | PROIEL positional tag values (§4.1) |
| **WUK** (exists) | uk.wikipedia «Відмінок в українській мові», rev. 41107449 (2023-12-10), §Історія (tables per stem type). Its «Джерела» list Павленко 2010, «сторінки=74-87» first (plus two Russian OCS/ORus textbooks). | MediaWiki API `action=parse&prop=wikitext` | corroboration of PAVL tables (hard/soft ā and ŏ with руцѣ/друзи); quote for the second palatalisation in reconstructions |

### 0.2 Text-layer note for PAVL
PAVL sets Old Cyrillic in a legacy 8-bit font. `pdftotext -enc UTF-8` gives cp1251 bytes as Latin-1 characters; I decoded them (script `dec.cjs`, cp1251) and mapped the four ASCII substitutes by context: `h`→**ѣ** (роуцh = роуцѣ), `r`→**ы** (сrнъ = сынъ, рrбh = рыбѣ), `"`→**я/ѧ** (земл" = земля), `³`→**і**, `±`→**Я**, `~`/`º`→**є/ѥ**. Quotes containing Old Cyrillic are therefore **[Q\*]**; the `"` glyph may be ѧ rather than я — **verify against the page image before display** (open question O-1). Modern-Ukrainian prose in PAVL extracted cleanly and is **[Q]**.

### 0.3 Not accessible (not cited for any ending)
- Безпалько–Бойко–Бевзенко–Грицютенко *Історична граматика української мови* (1962): no online copy found.
- Самійленко *Нариси з історичної морфології української мови* (1964–70), Бевзенко *Історична морфологія* (1960), Жовтобрюх (ред.) *Історія української мови. Морфологія* (1978), *Історична граматика української мови* (1980): no online copy found; **chtyvo.org.ua closed** (its PDFs now return the page «Завершення проєкту Чтиво»), so Брус М. *Історична граматика… Тематичні таблиці* (2016) and the chtyvo mirror of PAVL are also gone. archive.org search returned nothing usable for Cyrillic queries.
- Shevelov HP79 body chapters (morphology is outside its scope anyway; research/03 §0).
- Півторак, Німчук: no grammar text with paradigms found online in this session.
These are cited only second-hand where PAVL/ENC name them (e.g. PAVL p. 67 n. 2 cites Бевзенко 1960, p. 15); we never copy an ending from a source we did not read.

---

## 1. Stem types and their modern fate

[Q] PAVL p. 69: «Існували такі типи відмінювання іменників за особливостями детермінатива: *-ā/-јā, *-ŏ/-јŏ, *-ŭ, *-ū, *ĭ, *-n, *-r, *-s, *-t.»

[Q] PAVL p. 74: «для основ на *-ŏ/*-јŏ та *-ā/-jā існували твердий і м’який варіанти відмінювання. Мішаної групи як парадигматичного підтипу в праслов’янській мові не існувало, оскільки шиплячі приголосні в той час були м’якими»

Membership criteria (all PAVL p. 71–72, [Q]/[Q\*]):
| type | criterion / list (verbatim) | modern declension (PAVL p. 73–74) |
|---|---|---|
| ā/jā | «Іменники чоловічого, жіночого й спільного роду на *-ā /*-јā. У називному відмінку однини вони мали, як правило, закінчення -а/-йа, рідше – флексію -і (графічне и): сестра, рука, риба, жажа, судия, староста, сирота, пустини, княгини.» | I |
| ŏ/jŏ | «Іменники чоловічого й середнього роду на *-ŏ /*-јŏ. У називному відмінку однини іменники чоловічого роду закінчувалися на -ъ чи -ь, а іменники середнього роду − на -о, -е: братъ, столъ, дворь, край, конь, вои, князь; село, поле, знание, дѣло.» | II |
| ŭ | «Сюди з меншою або більшою мірою достовірності можна віднести такі слова: сынъ, волъ, полъ, вьрхъ, медъ, домъ, ледъ, чинъ, садъ, рядъ, разъ, пиръ, солодъ, миръ, станъ, низъ, долъ, олъ.» | II |
| ĭ | «Іменники чоловічого й жіночого роду на *-ĭ. У називному відмінку однини вони закінчувалися на -ь: медвѣдь, гость, гусь, ночь, путь, рать, печь.» Criterion for masc.: «іменники, які мали фінальну частину бь, пь, вь, дь, ть, сь, належали до основ на *-ĭ. Крім того, сюди увійшли такі слова: звѣрь, огнь, угль» | masc → II, fem → III |
| ū | «Іменники жіночого роду на *-ū. Це ті, що в називному відмінку однини мали закінчення -и … буки, мърки, цьрки – род. однини букве, мъркве, церкве.» | I (кров, любов → III) |
| consonant | «а) іменники чоловічого роду з основою на *-еn … камы, пламы або -ень (корень, кремень, ремень); б) іменники середнього роду на *-еn(-mеn) … племя, тѣмя, ³м’я; в) іменники середнього роду на *-ат (-ят) … теля, отроча, дитя; г) іменники середнього роду з основою на *-s: небо, слово, тѣло, око, ухо, чюдо …; ґ) два іменники жіночого роду на -r … мати, дъчи.» | n-masc, s → II; men, nt → IV; мати → III |

Number/case system (PAVL p. 74, [Q]): «У двоїні існувало тільки три відмінкові форми … називний, знахідний і кличний відмінки; родовий і місцевий відмінки; давальний та орудний відмінки.» — «Кличний відмінок уживався в іменниках чоловічого й жіночого роду однини. У множині та двоїні він збігався із формою називного відмінка. Кличний відмінок іменників середнього роду в усіх числових варіантах збігався із називним і знахідним.»

## 2. Ending tables (PAVL «Зразки відмінювання іменників», pp. 74–77) [Q\*]

Order of rows: Н Р Д З О М К; dual: Н.З.К · Р.М · Д.О. Variants in brackets are PAVL's.

**ā/jā** (p. 74–75) — рѣка · земля · доуша
| | sg | pl | du |
|---|---|---|---|
| Н | рѣка · земля · доуша | рѣкы · землѣ · доушѣ | Н.З.К рѣцѣ · земли · доуши |
| Р | рѣкы · землѣ · доушѣ | рѣкъ · земль · доушь | Р.М рѣку · землю · доушоу |
| Д | рѣцѣ · земли · доуши | рѣкамъ · землямъ · доушамъ | Д.О рѣкама · земляма · душама |
| З | рѣку · землю · доушоу | рѣкы · землѣ · доушѣ | |
| О | рѣкою · землею · доушею | рѣками · землями · доушами | |
| М | рѣцѣ · земли · доуши | рѣкахъ · земляхъ · доушахъ | |
| К | рѣко · земле · доуше | рѣкы · землѣ · доушѣ | |

**ŏ/jŏ** (p. 75) — плодъ · село · конь · поле · мечь
| | sg | pl | du |
|---|---|---|---|
| Н | плодъ · село · конь · поле · мечь | плоди · села · кони · поля · мечи | Н.З.К плода · селѣ · коня · поли · меча |
| Р | плода · села · коня · поля · меча | плодъ · селъ · конь · поль · мечь | Р.М плоду · селу · коню · полю · мечу |
| Д | плоду · селу · коню · полю · мечу | плодомъ · селомъ · конемъ · полемъ · мечемъ | Д.О плодома · селома · конема · полема · мечема |
| З | = Н | плоды · села · конѣ · поля · мечѣ | |
| О | плодъмь (-омь) · селъмь (-омь) · коньмь (-емь) · польмь (-емь) · мечьмь (-ьмь) | плоды · селы · кони · поли · мечи | |
| М | плодѣ · селѣ · кони · поли · мечи | плодѣхъ · селѣхъ · конихъ · полихъ · мечихъ | |
| К | плоде · село · коню · поле · мечу | = Н | |

**ŭ** (p. 76) — сынъ: sg Н сынъ, Р сыноу, Д сынови, З сынъ (-а), О сынъмъ, М сыноу, К сыноу; pl сынове, сыновъ, сынъмъ, сыны, сынъми, сынъхъ, сынове; du Н.З.К сыны, Р.М сыноу, Д.О сынъма.

**ū** (p. 76) — боукы: sg боукы, боукъве, боукъви, боукъвь, боукъвью (-ию), боукъве, К боукы; pl боукъви, боукъвъ, боукъвамъ, боукъвы, боукъвами, боукъвахъ; du боукъви (-ѣ), боукъвоу, боукъвама.

**ĭ** (p. 76–77) — печь (f) · чьсть (f) · зять (m): sg Н печь·чьсть·зять, Р/Д/М/К печи·чьсти·зяти, З печь·чьсть·зять (-я), О печью (-ию)·чьстью (-ию)·зятьмь; pl Н печи·чьсти·зяти (-ье), Р печьи (-ии)·чьстьи (-ии)·зятьи (-ии), Д печьмъ·чьстьмъ·зятьмъ, З печи·чьсти·зяти, О печьми·чьстьми·зятьми, М печьхъ·чьстьхъ·зятьхъ, К печи·чьсти·зятье (-и); du Н.З.К печи·чьсти·зяти, Р.М печью (-ию)·чьстью (-ию)·зятью (-ию), Д.О печьма·чьстьма·зятьма.

**consonant** (p. 77) — мати (r) · имя (men) · теля (nt) · небо (s): sg Р матере·имене (-и)·теляте (-и)·небесе, Д матери·имени·теляти·небеси, З матерь·имя·теля·небо, О матерью (-ию)·именьмь·телятьмь·небесьмь, М матери (-е)·имене (-и)·теляти (-и)·небесе (-и), К мати·имя·теля·небо; pl Н матере (-и)·имена·телята·небеса, Р матеръ (-ии)·именъ·телятъ·небесъ, Д матерьмъ·именьмъ·телятьмъ·небесьмъ, З матери (-е)·имена·телята·небеса, О матерьми·имены·теляты·небесы, М матерьхъ·именьхъ·телятьхъ·небесьхъ, К матере (-и); du Н.З.К матери·имени (-ѣ)·теляти (-ѣ)·небеси (-ѣ), Р.М матеру (-ию)·имену·теляту·небесу, Д.О матерьма·именьма·телятьма·небесьма.
No model paradigm is given for masc. n-stems (камы, корень) → SPEC 50 reconstructs nothing for them.

**Corroboration (WUK, §Тип з основою на *-ā / *-ŏ)**: same endings for рука/рыба/земля/душа and городъ/другъ/братъ/село/отьць/мужь/конь/краи/полѥ, with velar alternation in the cells with -ѣ/-и: [Q] «В іменників із задньоязиковими -г-, -к-, -х- у корені діє друга палаталізація перед -и, -ѣ (друзи, ворози, вълци, дуси, друзѣ, ворозѣ, вълцѣ, дусѣ…)». Differences from PAVL: instr. sg -омь vs PAVL -ъмь (-омь); soft instr. pl and dual given with краѥма etc. SPEC 50 uses PAVL as the primary table and WUK only for the velar rule; PAVL shows the same alternation (p. 61 «роука–роуцѣ»; p. 74 рѣка–рѣцѣ).

**Short (nominal) adjectives** (PAVL p. 98–99) [Q\*]: «Іменні прикметники змінювалися як іменнники з основою на *-ŏ/-јŏ та з основою на *-ā/-јā.» Sample добръ, синь / добро, сине / добра, синя (sg Р добра·синя / добры·синѣ; Д доброу·синю / добрѣ·сини; …; du Н.З добра·синя / добрѣ·сини; Р.М добру·синю; Д.О доброма·синема). **Long (pronominal) adjectives** p. 101–102 (новыи, нового, новому …; синии, синего …) — the extracted layout is scrambled; only masc. Н/Р/Д are safe to quote until checked against the page image.

**Verbs** (PAVL p. 111, 113, 114) [Q\*]: present I кл. несу, несеши (-шь), несеть, несемъ, несете, несуть, du несевѣ, несета, несета; IV кл. хвалю, хвалиши (-шь), хвалить, хвалимъ, хвалите, хвалять, хваливѣ, хвалита, хвалита; athematic есмь, еси, есть, есмъ, есте, суть, есвѣ, еста, еста. Sigmatic aorist ведохъ, веде, веде, ведохомъ, ведосте, ведоша, du ведоховѣ, ведоста, ведосте (-а); быхъ, бы, бы … Imperfect писахъ, писаше, писаше (-ть), писахомъ, писасте, писаху (-ть), du писаховѣ, писаста, писаста. Perfect «писалъ, -ла, -ло» + есмь/еси/есть …. ENC um152 (Русанівський) gives the same aorist schema incl. dual (знахъ … знаховѣ, знаста, знаста).

## 3. Chronology of changes (input for `core/morph-history.ts`)

| id | change | epoch / date | evidence (verbatim) |
|---|---|---|---|
| MH-01 | dual lost in nouns, replaced by plural | from 13th c. (shev.old) | ENC um27 [Q]: «Уже в 13 ст. пам’ятки укр. мови засвідчують утрату в іменниках форм двоїни і заміну їх на форми множини. Проте залишки двоїни в діалектах спорадично зберігаються досі (дві відрі, дві руці).» PAVL p. 84 [Q]: «…цей процес засвідчують пам’ятки давньої української мови ще в ХІІІ ст.» |
| MH-02 | dual kept in the written (bookish) language | to the 19th c. | ENC um187 (Жовтобрюх) [Q]: «Форми ж Д. іменників, прикметників, неособ. займенників та дієслів у пам’ятках давньорус. мови вживаються паралельно з мн. досить часто; фіксує їх і староукр. літ. мова аж до 19 ст.» |
| MH-03 | dual relics in Modern Ukrainian | modern | um187 [Q]: «залишки форм Д. зберігаються у закінченні -има в іменниках очима, плечима, дверима, грошима (хоч частіше грішми) та в наголошуванні іменників у сполученні з числівниками два, три, чотири: два бра́ти, дві сестри́, дві руки́»; dialects: «дві сестрі, три вербі, чотири відрі» |
| MH-04 | dual in verbs | still 14th–15th c. | um27 [Q]: «Часові парадигми у 14 — 15 ст., поряд з одниною і множиною, зберігали ще й форми двоїни.» |
| MH-05 | stem-type merger by gender (ŭ into ŏ; ū into ā) | Old Ukrainian period (no single date) | um27 [Q]: «Відбувається об’єднання спільною грамат. формою іменників кол. и-основ та а-основ (букы, цьркы, моркы — буква, церква, морква). Іменники з кол. о-основами об’єднуються з й- осно«ами [sic] (домъ, медъ, чинъ, станъ — і рабъ, конь та ін.).» PAVL p. 78 [Q]: «вже наприкінці дописемного періоду розвитку мови почалося змішування типів відмінювання іменників.» |
| MH-06 | gen. sg masc. -а / -у interchangeable | Old Ukr. → modern | um27 [Q]: «в род. в. одн. усталюється вживання закінчень -а та -у, які можуть взаємозамінюватися: става — ставу, листа — листу»; PAVL p. 81: -а from ŏ, -у from ŭ |
| MH-07 | dat. sg masc. -ови/-еви | already 11th–12th c. (Ізб. 1073/1076, Руська Правда, Гал. Єв. 1144) | um27 [Q]: «іменникове закінчення -ови/-еви у дав. в. одн. ч. p. [sic]» (in the list of 11th–12th c. features); PAVL p. 81 [Q]: «-у/-ю, -ові/-еві/-єві. Перше властиве іменникам із давньою основою на *-ŏ/*-јŏ, друге – іменникам із детермінативом *-ŭ» |
| MH-08 | loc. sg masc. -ові/-у/-і | Old Ukr. → modern (undated) | PAVL p. 82 [Q]: «за походженням -ові, -еві, -єві – це закінчення давального відмінка однини іменників з основою на *-ŭ. … пізніше стало способом вираження місцевого відмінка … Сучасне закінчення -у, -ю – це за походженням давнє закінчення місцевого відмінка однини іменників з основою на *-ŭ» |
| MH-09 | dat. pl -ом → -ам (ā-type ending spreads) | from 13th c. | um27 [Q]: «У дав. в. мн. іменників тривалий час зберігається давнє закінчення -ом (городомъ, тывуномъ, вЂкомъ, послухомъ), хоч уже з 13 ст. його витісняє флексія -ам» |
| MH-10 | instr. pl -ы/-и, -ми vs -ами compete | Old/Middle Ukr. | um27 [Q]: «В ор. в. мн. традиційні флексії -и, -ы з о-основ) і -ми (з і-основ) конкурують з флексією -ами а-основ: с бояры, с ужитки … з лугами, законами»; PAVL p. 83: «Цей тривалий уніфікаційний процес завершився вже в українській мові.» |
| MH-11 | gen. pl masc. -овъ → -ів; zero kept in a few (чобіт) | Old Ukr. → modern | PAVL p. 83 [Q]: «Здавна в родовому відмінку множини виступає закінчення -ов іменників з основою на *-ŭ, яке поширюється на іменники з основою на *-ŏ/*-јŏ й поступово закономірно змінюється у флексію -ів» |
| MH-12 | gen. pl fem. ā: zero ending after jer loss | Old Ukr. | PAVL p. 80 [Q]: «У родовому відмінку праслов’янські закінчення -ъ, -ь опинилися в слабкій позиції й занепали. Унаслідок цього утворилися нульові флексії» |
| MH-13 | nom. pl masc. replaced by acc. pl (сыны, городы) | "досить рано" | PAVL p. 82 [Q]: «досить рано відбувається вживання форм знахідного відмінка замість називного: рабы, сыны, городы» |
| MH-14 | instr. sg fem. ā -ою/-ею retained | throughout | PAVL p. 79 [Q]: «Праслов’янські закінчення орудного відмінка -ою/-ею/-єю загалом збережені й у сучасній мові» |
| MH-15 | instr. sg fem. consonant-final: gemination before -у(-ю) | from 17th c. | um27 [Q]: «В ор. в. одн. іменників ж. р. на приголосний з 17 ст. подовжується кінцевий приголосний основи перед закінченням -у(-ю): зъ челяддю» |
| MH-16 | instr. sg neut. -ям | from 16th c. | PAVL p. 82 [Q]: «Закінчення -ям для іменників середнього роду на -я з’явилося в пам’ятках української мови, починаючи з ХVІ ст.» |
| MH-17 | vocative retained | throughout | um27 [Q]: «закріплення у ній таких, наявних ще в давньорус. період, форм, як клич, в. [sic]»; PAVL p. 79: «Кличний відмінок здавна зафіксований писемними пам’ятками як важлива ознака морфологічної системи української мови.» |
| MH-18 | IV declension formed (neut. n-, t-stems) | 14th–16th c. | um27 [Q]: «З іменників с. р. з кол. основами на -ęt- та -męв 14 — 16 ст. формується сучасна IV відміна.» [sic; ę is `&#281;` in the page source, the stem «-mę(n)-» lost its end in the HTML] |
| MH-19 | short adjectives active; long forms uncontracted, then contracted | short: 14th–15th c.; contraction from 16th c. | um27 [Q]: «У 14-15 ст. в укр. мові активно функціонували давні короткі форми прикметників … Проте переважали повні форми, які спершу виступали у нестягненій формі, а з 16 ст. — у стягненій» |
| MH-20 | nominal vs pronominal adjectives fully separated | 1st half of 19th c. | PAVL p. 102 [Q]: «повне розмежування іменних і займенникових прикметників остаточно завершилося тільки в першій половині ХІХ ст.» |
| MH-21 | aorist almost absent from vernacular charters; literary/CS device after | 14th–15th c.; 16th–18th c. literary | um152 [Q]: «У мові укр. грамот 14—15 ст. форми А. майже не вживалися. Протягом наступних століть їх інколи використовували як літ. прийом.»; um27 [Q]: «Форми аориста ще вживалися і в староукр. літ. мові 16 — 18 ст.» |
| MH-22 | imperfect hardly attested | Old Ukr. | um27 [Q]: «Імперфект пам’ятки укр. мови майже не фіксують.» |
| MH-23 | perfect → sole past tense, auxiliary lost; pluperfect → давноминулий | 16th–18th c. (per um27 context) | um27 [Q]: «Кол. перфект у цей час стає єдиною формою мин. ч., а плюсквамперфект — давномин. часу.»; PAVL p. 114: «у ньому відбулася втрата допоміжного дієслова» |
| MH-24 | 3 sg present -ть: written -ть or Ø already in Ізб. 1073; later -е (I–III cl.) vs -ить (IV cl.); ходе dialectal | 11th c. → modern | SHEV §14.4 [Q]: «3 ос. одн. і мн. на -ть або Ø проти ст. ц. сл. -тъ»; SHEV §14.5 [Q]: «у 3 ос. одн. типу нєсЂть, суч. несе́»; PAVL p. 111 [Q]: «дієслова І, ІІ, ІІІ класу набули флексії -е, -є на відміну від дієслів ІV класу, які в цій формі зберегли закінчення -ить»; PAVL p. 112: «хвале, робе, ходе – південно-східні говори» |
| MH-25 | 1 pl -мо | 11th–12th c. | um27 [Q]: «флексія -мо в 1 ос. мн. різних часових форм» (11th–12th c. list); PAVL p. 119 imperative «несѣмъ … (-мо)» |
| MH-26 | infinitive -ти (also -т, -ть, -чи) | attested from the oldest texts | PAVL p. 124 [Q]: «інфінітив має форми на -ти, -т, -ть, -чи: нести, ходит, знать, печи, що зафіксовано й найдавнішими пам’ятками, проте літературна мова надає перевагу інфінітивній фіналі -ти» |
| MH-27 | supine lost | to end of 14th c.; gone by end of 15th c. | PAVL p. 125 [Q]: «спорадично форми супіна трапляються в пам’ятках до кінця ХІV ст.» … «Наприкінці ХV ст. конструкції із супіном уже не вживалися.» |
| MH-28 | synthetic future -му, -меш | from early 16th c. | um27 [Q]: «Вона фіксується у староукр. літ. мові від поч. 16 ст. (спиратиметьсА, діспутоватимет, не спатимет, умЂтимуть).» |
| MH-29 | instr. sg masc./neut. written -ъмь (vs OCS -омь) | 11th c. (Ізб. 1073) | SHEV §14.4 [Q]: «інстр. одн. чол./сер. роду на -ъмь проти ст. ц. сл. -омь» |
| MH-30 | CS marker: -є for -ѣ in soft endings (gen. sg fem., nom. pl fem., acc.) | Old Ukr. CS texts | SHEV §14.4 [Q]: «вживання є замість Ђ у закінченнях м’якої відміни — ґен. одн. жін. роду, ном. мн. жін. роду, ак. чол. і жін. роду тощо» |

Gaps (no dated source read): exact dates for MH-08, MH-10, MH-11, MH-13 → the UI shows them undated ("дата в джерелі не вказана").

## 4. Tag decoding

### 4.1 TOROT / PROIEL positional morphology (`TokenRec.morph = "<pos> <10 chars>"`)
Field order and values = the `<morphology>` header of the TOROT XML (lines 60–160 of `data/raw/torot/ostromir/000.xml`) [D]. Observed counts are pvl_lav (55,088 tokens) [D].

| pos | field | values (header `summary`) | observed in pvl_lav |
|---|---|---|---|
| 1 | person | 1 first, 2 second, 3 third, x uncertain | 1:1802 2:1327 3:9591 |
| 2 | number | s singular, **d dual**, p plural, x | s:26115 p:9472 **d:759** |
| 3 | tense | p present, i imperfect, r perfect, s resultative, a aorist, u past, l pluperfect, f future, t future perfect, x | p:4648 a:4163 u:1294 i:818 s:394 f:123 |
| 4 | mood | i indicative, s subjunctive, m imperative, o optative, n infinitive, p participle, d gerund, g gerundive, u supine, x, y, e, f, h, t | i:7232 p:2782 n:914 m:512 u:22 |
| 5 | voice | a active, m middle, p passive, e middle or passive, x | a:11076 p:364 |
| 6 | gender | m, f, n, p (m/f), o (m/n), r (f/n), q (m/f/n), x | m:18055 f:5336 n:4002 q:1201 p:8 |
| 7 | case | n nom, a acc, o oblique, g gen, c gen/dat, e acc/dat, d dat, b abl, i instr, l loc, **v vocative**, x, z no case | n:8964 a:7687 g:4885 d:3537 l:1736 i:1660 v:154 c:1 |
| 8 | degree | p positive, c comparative, s superlative, x, z | p:2970 c:110 s:1 |
| 9 | strength | w weak, s strong, t weak or strong | s:3914 w:1854 t:51 |
| 10 | inflection | n non-inflecting, i inflecting | i:37326 n:17762 |

Examples [D]: `повѣсти/повѣсть Nb -p---fn--i` (nom pl f), `кнѧже/кънязь Nb -s---mv--i` (voc sg), `руцѣ/рука Nb -d---fa--i` (dual acc), `языку/языкъ Nb -d---mg--i` (dual gen), `нача/начати V- 3saia----i` (3 sg aorist), `живѧхо/жити V- 3piia----i` (3 pl imperfect), `пошла/поити#1 V- -sspafn-si` (resultative participle = l-form). Adjective strength: `нб҃сьныи/небесьныи A- -s---mnpwi` — the long form is tagged **w(eak)**; so weak ≈ long/definite, strong ≈ short/nominal [P, from the data; the header gives no gloss]. Dual gen/loc are tagged g or l individually (`языку … mg`, `лѣту … nl`), so SPEC 50 merges them into PAVL's single Р.М dual cell. **TOROT carries no inflection-class (stem type) field** → stem type must come from §1 rules.

### 4.2 Stanza UD feats (`<witness>.nlp.json`)
Format: `{model, created, outOfDomain?, tokens: [{lemma, upos, feats} | null]}`, **1:1 by index** with `WitnessOut.tokens` (nlp/lemmatize_orv.py docstring «(1:1 with tokens)»; build.ts drops a file whose length differs). All 7 files align [D]. Model: «stanza 1.15.0 orv/torot (lemma torot_nocharlm, pos torot_nopretrain; TOROT treebank)»; `outOfDomain: true` for samovydets and vyshensky.
Observed feature values over all stanza witnesses [D]: Case=Nom 40839, Acc 28906, Gen 26718, Dat 18728, Ins 10483, Loc 7680, **Voc 534**; Number=Sing 124331, Plur 35947, **Dual 1119**; Gender=Masc 91342, Fem 24567, Neut 16054; Person 1/2/3; Tense=Past 28446, Pres 22030, Fut 567; Mood=Ind/Imp; VerbForm=Fin 27385, Part 13085, PartRes 6365, Inf 4161, Sup 134; Voice=Act/Pass; Aspect=Perf/Imp; Degree=Pos/Cmp; **Variant=Short 22588**. UD has no aorist/imperfect value: past finite forms are only `Tense=Past|VerbForm=Fin`.

| cell axis | PROIEL (pos) | UD |
|---|---|---|
| case | 7: n a g d i l v (+ c/e/o underspecified) | Case=Nom Acc Gen Dat Ins Loc Voc |
| number | 2: s d p | Number=Sing Dual Plur |
| gender | 6: m f n (+ p o r q) | Gender=Masc Fem Neut |
| person | 1 | Person |
| tense | 3: p a i u s f l | Tense=Pres Past Fut (aorist/imperfect not distinguished) |
| mood/form | 4: i m n p u … | Mood=Ind Imp; VerbForm=Fin Inf Part PartRes Sup |
| short/long adj | 9: s / w | Variant=Short / absent |

Quality notes [D]: stanza finds far fewer duals than TOROT — dual nouns 65 of 46,595 stanza-tagged shev.old nouns (0.14 %) vs 192 of 15,251 TOROT nouns (1.26 %) — so **absence of a stanza dual is not evidence of absence**. Out-of-domain errors are visible in samovydets: `войни/воинъ Case=Gen|Gender=Fem`, `раду/радъ … Gender=Fem` (lemma wrong, gender right), `зватися` tagged NOUN.

### 4.3 VESUM tags (modern witnesses)
research/02 §2: cases `v_naz v_rod v_dav v_zna v_oru v_mis v_kly`, number `p` (singular has only gender `m/f/n`). A modern token is placed in every cell whose VESUM line (same lemma) has its spelling; several lines → ambiguous placement (руки = v_rod sg, v_naz/v_zna/v_kly pl).

## 5. Data coverage [D] (script over `data/work`, 2026-10-11; admitted witnesses only)

| shev epoch | witnesses | N tokens | TOROT-tagged (noun / adj / pron / verb) | stanza-tagged (noun+propn / adj / pron+det / verb+aux) | dual (noun) T / S | voc (noun) T / S | verb: aorist / imperf (T only) |
|---|---|---|---|---|---|---|---|
| shev.proto | ilarion | 6,807 | — | 1,905 / 616 / 817 / 1,234 | — / 1 | — / 21 | — |
| shev.old | ostromir, arch, monomakh, pvl_lav, kievchr, gvl | 236,845 | 15,251 / 3,045 / 7,338 / 11,506 | 46,595 / 9,469 / 24,812 / 38,051 | 192 / 65 | 151 / 478 | 4,171 / 819 |
| shev.early_middle | **none in corpus** | 0 | — | — | — | — | — |
| shev.middle | vyshensky, samovydets (outOfDomain) | 63,594 | — | 15,775 / 6,583 / 6,782 / 11,845 | — / 2 | — / 35 | — |
| shev.late_middle | eneida1798 | 12,638 | — (VESUM via direct link: 10,288 linked) | — | — | — | — |
| shev.modern | shevchenko_*, kulish1882, lesya1892, franko1893/1905, hrinchenko1908 | 117,803 | — (VESUM: 105,495 linked) | — | — | — | — |

TOROT lemma counts (pvl_lav): 2,251 noun, 657 adjective, 1,514 verb lemmas. Distinct (epoch, lemma, tag-cell, spelling) tuples in pre-modern witnesses: **69,601** (size estimate for SPEC 50).

## 6. Open questions
- O-1 Verify PAVL's `"` glyph (я vs ѧ) and the long-adjective table against page images (pp. 74–77, 101–102).
- O-2 Is PAVL (2010 textbook) acceptable as the primary paradigm source until Безпалько 1962 / ІУМ. Морфологія 1978 are obtained (library scan)?
- O-3 Undated changes (MH-08, -10, -11, -13): accept "undated" or source dates later?
- O-4 Pronoun tables (PAVL pp. 88–97) not yet excerpted; needed for SPEC 50 phase 2.
- O-5 Stanza tags in out-of-domain Ruthenian witnesses — show (with model badge) or exclude?
- O-6 Church Slavonic witnesses (arch, ostromir) in Old Ukrainian grids — mark (MH-30) or exclude?
