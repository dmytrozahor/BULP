# R24 — Reinforced deictics (отуточки, онтамека, осьтамека, озьдо) — U-25

Status: research report (2026-10-12). Tags: [Q] verbatim-checked against fetched text, [P] paraphrase, [U] unverified / not found. Evidence rule: SPEC 00 (P-1.7: inferred != fact).

## 0. Sources actually read

| Id | Source | URL / locator | Access | Use |
|---|---|---|---|---|
| HR | Грінченко, Словарь української мови, 1907–09 (ed. 1958, vol. 3–4 pages as printed on the site) | `https://hrinchenko.com/dictionary/word/{id}-{slug}` (search: `https://hrinchenko.com/search?q=<word>`; search is rate-limited, HTTP 429 after ~10 fast requests; entry pages by id are not) | raw HTML, UTF-8 | headword entries below |
| ESUM | ЕСУМ (Мельничук ed., 1982–2012) via goroh mirror | `https://goroh.pp.ua/Етимологія/<percent-encoded word>` (card ids given as `[g:NNNN]`) | raw HTML; cards parsed per headword | etymology of ось, онде, ось-де-forms, ге, гев, ген, от, ото, оце. The mirror drops ЕСУМ volume/page; the bibliography lines inside a card are the ЕСУМ's own citations. Print is copyrighted: cite-only |
| H-tut | Ю. Громик, «Прислівники зі значенням ‘тут, у цьому місці’ в західнополіських та суміжних говірках», Науковий вісник УжНУ, Серія Філологія, вип. 24 (14 pp.) | evnuir.vnu.edu.ua handle `123456789/480` (PDF via DSpace API bitstream `d0a146cd-6ebb-4737-aee2-2320ab7c968b`) | PDF -> pdftotext | areal data, 178 villages of Volyn/Rivne/Brest/Hajnówka |
| H-ki | Ю. Громик, «Західнополіські прислівники на -ки, -ка», Східноєвропейський нац. ун-т ім. Лесі Українки | evnuir handle `123456789/2256` (same text at `/7176`) | PDF -> pdftotext | the -ка/-ки/-ечки/-ека morphology and its origin |
| H-ak | Ю. Громик, «Відзайменникові прислівники із суфіксом *-аk- …» | handle `123456789/488` | PDF | only тут/там-adjacent -ак- forms (not quoted) |
| WK-en | en.wiktionary (CC BY-SA), API `wiktionary.org/w/api.php`, wikitext | онде, ось, ген, оце | API | glosses, ESUM vol/page pointer for ось |
| WK-uk | uk.wiktionary | онде, отуто, оздо, тутечки, тамечки ... | API | **all missing** [Q: API returned `missing`] — uk.wiktionary is no source for this group |
| not reached | СУМ-11 / СУМ-20 entries (sum.in.ua), litopys UM-2000 | not fetched (see §6) | | |

Not found in any source consulted: **отуточки, онтамека, осьтамека, отуто, оздо (as such; озьдо occurs only as a ЕСУМ variant), тамечки/тутечки as headwords of their own** (they are subentries, see §2).

## 1. Component inventory

### 1.1 Deictic bases (the "root")

| Base | Gloss (source) | Evidence |
|---|---|---|
| тут | «Здѣсь», «Сюда», «Вотъ» (HR, v.4, id 59817) | [Q] «Тут нар. 1) Здѣсь. … 2) Сюда. … 3) Вотъ.» |
| там | «Тамъ», «Туда», «Тогда» (HR id 57919) | [Q] «Там нар. 1) Тамъ. … 2) Туда. 3) Тогда, въ такомъ случаѣ.» |
| ту | «= тут» (HR id 59619, «Камен. у.») | [Q] |
| туди | «Туда» (HR id 59635) | [Q] |
| де | interrogative-indefinite adverb; ESUM: «псл. *kъ-de … складається з питального займенникового кореня *kъ … і частки або суфікса -de» | [Q] ESUM card де |
| сьде | «тут» (др. сьде ‹ псл. sьde, sьdě «тут», пор. р. здесь) | [Q] ESUM card о́сьде [g:13202] |
| он | «Вонъ, вотъ» ; фразеол. «он-о́н, он-он-о́н. Вонъ тамъ.» (HR vol.3 с.54, id 35218) | [Q] |
| онде | «Вонъ тамъ» (HR vol.3 с.54); ESUM «он, там, отам, ось там» | [Q] |
| ось | «Вотъ, здѣсь.» + ось-де, ось-дечки, ось-ось-де «Вотъ гдѣ» (HR vol.3 с.74, id 35938) | [Q] |
| ото / от | HR «Ото … нар. Вотъ, вотъ то, вотъ это, вотъ такъ» (id 36006); ESUM «ото́ «от» (вказівна частка)», «псл. oto, утворене з частки о і займенникового компонента to» | [Q] |
| оце / отсе | HR «Оце нар. = отсе» (vol.3 с.81); «Отсе нар. Вотъ, вотъ это.» (с.77) | [Q] |
| ге-, гев, ген | pre-/post-posed demonstrative *(h)e: гев «тут, сюди», ген «он там (далеко)», геде́ «тут, осьде» | [Q] ESUM cards гев [g:3999], ген [g:4051], геде́ [g:4007] |
| тамтой / отой | HR «Тамтой … Тотъ» (vol.4 с.246) | [Q] |

### 1.2 Prefix particles (left of the base)

| Id | Form | Function | Evidence |
|---|---|---|---|
| P-O | о- | proclitic demonstrative (Common Slavic *o-) | ESUM ось: «результат злиття частки о і займенника се «це», який зазнав редукції» [Q]; о́сьде: «результат злиття частки о і прислівника *сьде» [Q]; ото: «утворене з частки о і займенникового компонента to» [Q] |
| P-OT | от-/ото-/отт- | demonstrative "вотъ" + base | HR: отут «= оттут» [Q], оттам «Вотъ тамъ», оттут «Вотъ здѣсь, вотъ сюда», оттуди «Вотъ туда» [Q]; ESUM оцюди́ «результат злиття частки от і прислівника сюди́ (тс › ц)» [Q]; ЕСУМ: оце́й «результат злиття … частки от і … займенника сей» [Q] |
| P-ON | он-/ан- | distal "вонъ" | ESUM онде: «псл. onъde … із займенникової основи on- «той» і частки -de»; «в українській мові пізніше могло бути переосмислене як складне утворення з частки укр. он і прислівника де» [Q]; а́нде: «результат злиття вказівної частки [*ан], співвідносної з он, і прислівника де (Німчук НЗ УжДУ 35, 45)» [Q] |
| P-OS | ось-/ос-/оз(ь)- | proximal "вотъ здесь" | ESUM о́сьде [g:13202] variants list (verbatim): «во́зьда, о́зде, о́зденька, оздиго́, оздио́, о́здички, оздо́, о́зьде, о́зьдека, о́зьдечки, озьдо́, озьдоо́» [Q]; Громик: óз’де/вóз’де «фонетичні варіанти загальновживаного осьде» [Q] |
| P-GE | ге-, ге́- | proximal-pointing, WPL/NDN/Boyko | ESUM ге́зде «осьде»: «складне утворення, до якого входить давня вказівна частка ге, редукована форма с (з) вказівної частки се, яка міститься і в частці ось, прислівника де і, в частині форм, частки -(ч)ка, -(ч)ки, о» [Q] |
| P-V/H | в-/г-/у- prothesis | prothetic before о-/а- in WPL | Громик: вóз’де, гóз’де, гун’дз’ікá, ун’дз’ікá [Q] |

### 1.3 Suffix/postposed particles (right of the base)

| Id | Form | Meaning / function | Evidence |
|---|---|---|---|
| S-O | -о, -во, -го, -ге | pointing refinement ("more exact place") | Громик: «Функцію більш точної просторової вказівки в західнополіських говірках виконують постпозитивні вказівні частки -ге та -о, -во, -го, рідше – препозитивна о-: тутгé, … тутó, … отутó, отутгó …» [Q] |
| S-KI | -ки, -ка, -ек(а/и), -ечк(а/и), -ичк(а/и), -ен’к(а/и), -ак(а/и) | "reinforcing", formally diminutive but NOT diminutive in meaning in WPL | Громик (H-ki): «в західнополіських говірках усі аналізовані вище деривати не мають здрібніло-пестливого значення й уживані безвідносно до віку як мовця, так і його співрозмовника.» [Q]; ЕСУМ а́зьдики: «ускладнене суфіксом -ки, характерним для зменшено-підсильних форм прислівників в усно-розмовній мові (пор. тепе́рки, ту́тки і под.)» [Q]. **Two views**: ЕСУМ calls them "підсилювальні частки" (Грінченко «Ум.» = diminutive: «Ум. тутка, тутки, … тутеньки, тутечка, тутечки», «Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки») [Q]; Громик: «абстраговані з іменникових форм суфікси без семантики демінутивності», -и = fossil instr. pl., -а = fossil gen. sg. masc. [Q] |
| S-N | -й (-ай/-кай) | Polish-influenced extension: тутай, тутка(й) | Громик: «У західних говорах української та білоруської мов прислівникові форми з кінцевим -й зумовлені або щонайменше підтримувані польським упливом.» [Q] |
| S-L | -ль/-ле | ablative "from": тамаль, оттамаль | ESUM о́тта́маль: «от «від», прислівник там і обмежувальна частка [ле] (› -ль)» [Q] (flagged: not deictic reinforcement but "from there") |

## 2. Attested forms (the table needed for the lexicon)

`HR`=Грінченко (id = hrinchenko.com id; page = print vol./page where seen), `ESUM`=goroh card, `H`=Громик area. Region codes follow research/04 (`WPL` Західнополіський, `MPL` Середньополіський, `NDN`, `BOY`, `HUT`, `LEM`, `SW`, `MDN`, `SLB`, `STP`). Громик's locality abbreviations are kept as given.

| Form | Segmentation | Standard counterpart (only as sourced) | Region | Source (verbatim) |
|---|---|---|---|---|
| тутка, тутки | тут-ка/-ки | тут | WPL; BOY; HUT; Bukovyna; Naddnistr. | H: «пор. буковинське тýткі, гуцульське тýткі …» [Q]; HR (id 59817) «Ум. тутка, тутки, туткива, тутенька, тутеньки, тутечка, тутечки» [Q] |
| тутечка / тутечки | тут-ечк-а/и | тут | Kyiv-region (HR cites Котл. Ен., Грин.), WPL, MPL, SLB, STP, HUT | HR id 59826 (vol.4 ст.298): «Тутечка, тутечки, нар. Ум. отъ тут.» [Q]; HR id 59817: «Мов зроду тутечка жили. Котл. Ен. III. 8.» [Q]; H: «тýтечки (Комарівка Кс, Яполоть Кс, Удрицьк Дб) … у степових [44, с. 73], слобожанських говірках [10, с. 210]» [Q] |
| отут | о-тут | оттут | general | HR vol.3 с.77 (id 36061): «Отут нар. = оттут. Ум. отутеньки, отутечки. Отутеньки ставатимем. Кролев. у. Ось зараз були отутечки. Грин. II. 142.» [Q] — **this is the attestation of the pattern of «отуточки»**: *о-тут-еч-ки* (Chernihiv/Krolevets region, Hrinchenko's own collection) |
| оттут | от-тут | тут (emph) | general | HR id 36058 (с.77): «Оттут нар. Вотъ здѣсь, вотъ сюда. … Ум. оттутеньки, оттутечки.» [Q] |
| отуточки (user form) | о-тут-оч-ки | отут / тут | [U] — not found verbatim. Closest: HR «отутечки», Громик «пінське тýточка [19, с. 37]» ([Q] via H-tut: «пор. … пінське тýточка [19, с. 37]»), «середньополіських: отýт, отутó, отýтака» [Q] | derivation by pattern (§4) = [P]; **vowel -о- vs -е- in the diminutive suffix (-очки vs -ечки)**: Pinsk тýточка is the only -оч- datum [Q-via-H] |
| отуто | о-тут-о | отут (S-O pointing) | WPL, MPL | H: «отутó» [Q], «отудó» [Q]; **HR has no entry** (search `отуто` -> 404 [Q]) |
| отам, оттам | о(т)-там | там | general | HR id 35966 (с.74): «Отам нар. = оттам. А батько де? — Отам і там. ЗОЮР. І. 250.» [Q]; id 36050 (с.77): «Оттам нар. Вотъ тамъ. Оттам на городі вовк свиню ззів. Ум. оттамечки.» [Q] |
| оттамечки | от-там-еч-ки | оттам | HR | [Q] (subentry of оттам) |
| тамечки, тамечка, таменьки, тамка, тамки | там-еч-ки / -ка / -ен’к- | там | WPL, general | HR id 57919 (vol.4): «Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки, тамкива.» [Q]; H-ki: «там > тáмк’і, тáмик’і, тáм’ік’і, тáмечки, тáмен’ки, тáмийки, тáмыйкы» and «там > тáмка, тáмкай, тáмека, тáмика, тáм’іка, тáмикий, тáмечка, тáмичка, тáм’ічка, тáмен’ка» [Q] |
| **тамека** | там-ек-а | там | WPL (Громик, area not given per village) | H-ki [Q] as above. No HR/СУМ entry (HR search `тамека` NOT FOUND) |
| **онтамека** (user) | он + там-ек-а | он там | [U] | no source has the compound. Components attested: «он-о́н. Вонъ тамъ» (HR id 35218) [Q]; тáмека (H-ki) [Q]; and the closest attested compound: «óнде ‘он там’ > óндечки … óндека, ондекá, гóндека, … вóндечка, гóндечка» [Q] (H-ki). By ESUM «в українській мові пізніше могло бути переосмислене як складне утворення з частки укр. он і прислівника де» [Q], an analytic *он + там + -ека* is **parallel to** *он + де + -ека*. Mark: construction licensed, attestation [U] |
| **осьтамека** (user) | ось + там-ек-а | ось там | [U] | no source. Parallel: ESUM онно́ «ось там»; HR ось-де, ось-дечки «Вотъ гдѣ» (id 35938) [Q]; ESUM о́сьде «ось, ось тут» [Q]. *ось + там* = unattested by sources found [U] |
| онде | он-де | «он там» | general; Ukr. inherited | HR id 35225 (vol.3 ст.54): «Онде нар. Вонъ тамъ. Він онде в шафі … Чуб. Ум. ондечки. Левиц. І. 100.» [Q]; ESUM о́нде [g:12903] «он, там, отам, ось там» |
| ондечки | он-де-чк-и | онде | WPL: óндечки (Сварицевичі Дб, Вичівка Зр — spelled óн’д’ечки) | HR: «Ум. ондечки» [Q]; H-tut: «óн’д’ечки (Сварицевичі Дб)» [Q]; ESUM variants «о́ндека, онде́лька, ондео́, о́ндечка, о́ндечки, о́ндєка, о́ндикаво, ондо́, ондьо́, о́ньдо, о́ньдзе» [Q] |
| ондо / онно | онде-о > ондо > онно | ось там | East Ukr. dial. | ESUM онно́ «ось там»: «результат фонетичної видозміни … онде-о, з о́нде і вказівної частки о (онде-о́ › ондо́ › онно́)» [Q] |
| ось | о-сь(е) | "вотъ" | all | ESUM: «результат злиття частки о і займенника се «це», який зазнав редукції; р. [восе], бр. вось, др. восе, во се» [Q]; en.wiktionary: «A merger of о + се which underwent subsequent reduction.[ESUM vol. 4 p. 230]» [Q] (WK-en) |
| ось-де, осьде, ось-дечки | ось + де (+ -чки) | ось тут | general | HR ось: «ось-де, ось-дечки, ось-ось-де. Вотъ гдѣ. Ось-осьде я, коли вам треба. Котл. Ен. І. 17.» [Q] |
| озде, озденька | о-з(ь)де | ось-де | Kamianets (HR «Камен. у.») | HR id 34892: «Озде нар. = ось-де. Камен. у. Ум. озденька.» [Q] |
| **озьдо / оздо** (user озьдо) | о-сьде-о -> озьдо | «ось тут», not «ось де» | MPL/WPL (Volyn, Rivne), Podillya, steppe | ESUM о́сьде [g:13202]: «результат злиття частки о і прислівника *сьде ‹ др. сьде, сьдѣ ‹ псл. sьde, sьdě «тут» … з пізнішим ускладненням частками о (повторно: о-сьде-о), -ка та ін.» and variants «оздо́ … озьдо́, озьдоо́» [Q]. H-tut: «У центральній та східній частинах волинськополіського ареалу склалися варіанти оз’дó (Любче Рж, Ворокомле К-К, Воєгоща К-К, Градиськ Мн, Череваха Мн, Троянівка Мн, Лишнівка Мн, Городок Мн, Оконськ Мн, Дядьковичі Рв), óз’до … що відбивають фонетичне стягнення у структурі вихідного оз’деó, пор. іншу фіксацію: озьдó [3, с. 11]. Ареал продовжено в інших поліських говорах: осьдó [23, с. 146], у подільських: оздó [24, с. 45], степових говірках: оз’дó [25, с. 164]» [Q]. Gloss in H-tut = **‘ось тут’** [Q]. So the correct mapping is озьдо = ось + сьде(тут) + о, i.e. **«ось тут»** (the 4th item in the brief `озьдо → ось тут/ось де?` is resolved: ‘ось тут’; the де in the traditional analysis is really *сьде* ‘тут’, ESUM) |
| оздо (bare) | | | | HR search `оздо` -> not found [Q]; ESUM goroh `Етимологія/оздо` -> not a headword [Q]; listed only as variant in о́сьде |
| озьдека, озьдечки, оздечки | оз(ь)де-к-а / -чк-и | ось тут | WPL, MPL | ESUM о́сьде variants «о́зьдека, о́зьдечки, о́здички» [Q]; H-tut: «вóз’деки (Римачі Лб, Забужжя Лб), вóз’даке (Петрово Ів, Заячиці Лк), óз’дечк’і (Мала Любаша Кс), вóз’дечки (Обенижі Тр), вóз’дека (Римачі Лб, Рівне Лб, Забужжя Лб), óз’дечка (Мала Любаша Кс)» [Q] |
| асьде, а́зьдики | а-сьде, а-сьде-ки | ось тут | East Polissian (ESUM) | ESUM а́зьдики «ось де, ось тут» (присл.): «форма а́сьдики зам. о́сьдеки (пор. о́сьдечки) … і а- замість о-, перенесеного з форм, де воно, очевидно, виникло в закономірній для східнополіських говірок ненаголошеній позиції (напр., асьде́ ‹ ось-де́)» [Q] |
| геде, гезде, гесде | ге-де / ге-с-де | осьде | WPL, Bukovyna? (ESUM lists «ге́здечка ж, ге́здечки Ж, ге́сде, гесде-ó»; area [U]) | ESUM ге́зде [g:4014] [Q] |
| оде, одо, одегé | о-де | ось тут | WPL, Boyko, Zakarpattia, Bukovyna | H-tut: «óде (…), óда, вóда …, пор. … бойківське óде [27, с. 15], закарпатське óде [7, с. 12], буковинське одú, гуцульське ode»; «óдек’і, óдека, вóдека, … бойківське óдека»; «одó» [Q] |
| онтам-/онтуди | | | | not found [U] (HR `онтам`, `онтуди` NOT FOUND; ESUM goroh `онтам`, `онтуди` not headwords) |
| оцюди | оц-юди | осюди | | HR id 36201 «= осюди»; ESUM «від-п. ... частки от і прислівника сюди (тс › ц)» [Q] |
| ген, гев, гевади | ге-н, ге-в | он там (далеко), тут, туди | WPL, NDN | HR id 9032 «Ген нар. 1) Вонъ тамъ.»; ESUM ген «он там (далеко)»: «складне утворення з вказівної частки he займенникового походження … і займенникової основи n-» [Q] |
| тамтой | там-той | той | | HR vol.4 с.246: «Тамтой, -а, -е. Тотъ.» [Q] |

## 3. What the sources say about the system

1. **Three-way deictic space.** Громик (H-tut) groups the ‘тут’ adverbs into (a) variants of тут + derivatives (туд, тýта, тýтки, тýтака, тýдика), (b) "деривати, що постали шляхом семантичного розвитку вказівних часток чи зрощення кількох указівних часток (во, áво, гéво, гéге, áге, он’, óн’о, áн’о та ін.)", (c) "деривати, що є результатами зрощення вказівних часток із прислівником де (гéде, óде, óз’де, óн’де, ан’óде та ін.)" [Q]. This is the segmentation grid used below.
2. **«Pointing» is gradable by stacking.** Громик: the postposed -ге/-о/-во "виконують … більш точної просторової вказівки" [Q]; forms stack up to 4 pointers (тутавовó, тутикавó, тутичкагó, отутичкавó, туткайвовó) [Q].
3. **Distal/proximal inversion in WPL.** In WPL the on-/ось- types are glossed «ось тут» (óн’де, óн’о, ан’óде in the north-east: «Наведені деривати – результати семантичного розвитку та пізнішої афіксації вказівних часток он’, ан’, споріднених із білоруською вунь [41, с. 513], українською он»), while in standard/literary the same он-/онде = «вонъ тамъ» (HR, ESUM). Do not map он- = distal universally: tag per region [Q].
4. **-ка / -ки / -еки / -ечки are NOT dependably diminutive.** Both Громик and ЕСУМ treat them as "вказівно-підсилювальні" (ЕСУМ: «зменшено-підсильних форм»); Грінченко glosses them «Ум.». For the lexicon: label S-KI as `reinforcement` with note; show Грінченко's «Ум.» as an attestation, not as the meaning.
5. **Chronology** [Q]: тута first fixed in the XIV c. [Громик ← Словник староукраїнської мови XIV–XV ст. II, с. 451]; tutaki in the XVI c. [← СУМ XVI–1-ша пол. XVII ст. вип. 2, с. 12]; туйка ‘тут’ XVI c. [Німчук]; нынhки XV c.; "-ки не засвідчені давніми слов’янськими пам’ятками" (H-ki conclusion) — so the whole -ка/-ки layer is **post-Old-Ukrainian** (late medieval to XVI c.) [Q].

## 4. Segmentation algorithm (regex / data)

Goal: given a token, return `{prefix?, base, suffixes[], gloss, confidence}`. All rules operate on lowercase, NFC, with stress marks stripped and `'`/`’`/`ь` normalised (WPL texts write soft consonants with `’`: оз’де = озьде).

### 4.1 Data tables (extend core/derivation.ts style `PrefixRow`)

```
DEICTIC_PREFIXES = [
  {id:'P-OT',  re:/^(?:от[тo]?|ото)/, gloss:'вотъ',            src:['HR оттам/оттут/оттуди','ESUM оце́й','H-tut отутó']},
  {id:'P-OS',  re:/^(?:во|го|у)?(?:ось|озь|оз|ос)(?=[дд]е|до|де|дз)/,  gloss:'ось', src:['ESUM ось','ESUM о́сьде','H-tut вóз’де']},
  {id:'P-ON',  re:/^(?:г|у|в)?(?:он’?|ан’?|он)(?=д|тут|там|ту|о$)/,   gloss:'он/вонъ|ось (WPL)', src:['ESUM онде','H-tut óн’о']},
  {id:'P-O',   re:/^о(?=т(?:ут|ам|уд|ак))/,        gloss:'о-',  src:['HR отут/отам']},
  {id:'P-GE',  re:/^(?:ге|гі|ге́)(?=с?де|н$|в)/,   gloss:'ось', src:['ESUM ге́зде/гев/ген']},
]
DEICTIC_BASES = ['тут','туд','туди','там','тамо','тамтой','де','сьде','здесь','сюди','тепер','онде','оде']  // lexical, validate via VESUM/corpus
DEICTIC_SUFFIXES (right-to-left, may stack):
  S-O:  /(?:во|го|ге|о)$/       // pointing; only after the S-KI part or a base: тутво, тутгó, ондо
  S-KI: /(?:еньк|ечк|ичк|очк|ак|ек|ик|ік|к)(?:а|и|і|е)?(?:й)?$/ 
  S-J:  /й$/                   // polish tutaj-type; attach only after S-KI
```

Order of stripping (greedy, longest-first, right to left): `S-O` -> `S-J` -> `S-KI` -> base -> `P-*`. Accept a segmentation only if the **residue after removing S-KI+S-O is in DEICTIC_BASES** (or VESUM-known adverb), otherwise reject (avoids chopping "-ка/-ки" off real nouns such as «тарілка»).

### 4.2 Worked examples (all [P]; attestation levels as in §2)

| Token | Segmentation | Rule path | Reading | Attested? |
|---|---|---|---|---|
| отутечки | о + тут + ечки | P-O + base тут + S-KI | «отут» emphatic, “вотъ тут” | [Q] HR |
| отуточки | о + тут + очки | same, with -оч- (Pinsk тýточка) | same | [U] exact form; pattern [Q] |
| тамека | там + ека | S-KI | «там» | [Q] H-ki |
| онтамека | он + там + ека | P-ON + там + S-KI | "он там" (literary/distal), or "ось тут" (WPL on-/ан’-) — ambiguous, needs `region` | [U] |
| осьтамека | ось + там + ека | P-OS + там + S-KI | "ось там" | [U] |
| озьдо | о + зьд(е) + о -> ось + сьде(тут) + о | P-OS (ось → оз before voiced д) + base сьде/де + S-O | «ось тут» | [Q] ESUM, H-tut |
| оз’дечки / вóз’дечки | (в)о + з’де + чки | P-V + P-OS + де + S-KI | «ось тут» | [Q] H-tut |
| óндечки | он + де + чки | P-ON + де + S-KI | «онде» / WPL ‘ось тут’ | [Q] HR, H-tut |
| тутгó, отутгó | (о)тут | гó | | + S-O | ‘ось тут, саме тут’ | [Q] H-tut |

Phonetic note [Q]: voicing of **сь → з(ь)** before д is regular: о́сьде ~ о́зьде (ESUM variants list both), and WPL assimilation of softness gives оз’д’е, оз’дз’е ([з’д] > [з’д’] > [з’дз’]; H-tut) — the regex for the stem must therefore allow `з?[ьʼ’]?д[зʼ’ьj]?е`.

### 4.3 Meaning matrix to display on the card

| Layer | Marker | Gloss | Confidence |
|---|---|---|---|
| distal (literary Ukr.) | он-, онде | «вонъ тамъ» (HR) | [Q] |
| proximal | ось-, оз(ь)-, ге-, о(д)е | «вотъ здесь / ось тут» | [Q] |
| emphatic | от-, ото-, о- | «вотъ» | [Q] |
| reinforcement | -ка/-ки/-ечки… | "підсилювальна частка" (ЕСУМ) / "без демінутивності" (Громик) / «Ум.» (Грінченко) | [Q] |
| pointing-more-precisely | -о/-во/-го/-ге | Громик: «більш точної просторової вказівки» | [Q] |

## 5. Regions (mapped to research/04 codes)

| Region | Forms (examples) | Evidence |
|---|---|---|
| WPL (Волинь/Рівне/Підляшшя/Брест) | тýтека, тýтика, тýтака, óз’де, вóз’дечки, óн’де, óн’д’ечки, ан’óде, óде/вóде, ге́де, гéто | H-tut, H-ki [Q] |
| MPL (Polissian, Chornobyl zone) | отýт, отутó, отýтака, оз’д’ó, осьдó, óсьдека, оньдєка | H-tut citing Говірки Чорнобильської зони (Гриценко 1996) and Лисенко 1974 [Q via H] |
| CHN / Left-bank (HR Chernihiv) | отутечки, отутеньки | HR «Кролев. у.» (Krolevets, Chernihiv gub.) [Q] |
| Podillia | оздó | H-tut citing Мельничук Писарівка [Q via H] |
| Steppe / SLB | оз’дó, тýтечки | H-tut [Q via H] |
| BOY, HUT, Bukovyna, Zakarpattia, Naddnistr. | óде, óдека, одевó, тýткі, óдикаво, óдеka, ode-ka, вýзьдевó | H-tut ← Онишкевич, Janów, Шило [Q via H] |
| NDN/Zakarpattia | а́нде, а́ндека (ЕСУМ: Німчук НЗ УжДУ 35, 45) | ESUM [Q] |
| General literary | онде, ото, ось, оце, отут, оттам | HR [Q] |

(Region codes WPL/MPL/CHN/NDN/BOY/HUT/SLB/STP follow research/04 §0 `W-*` ids; mapping from Громик's wording to those codes is [P].)

## 6. Gaps and next steps

- **СУМ-11 / СУМ-20 / ВТССУМ** entries for отут, оце, ось, онде, ото were not fetched (sum.in.ua blocks scripted use / not requested); only used via HR and ESUM. [U]
- **ЕСУМ volume/page**: the goroh mirror hides them; en.wiktionary gives «ESUM vol. 4 p. 230» for ось [Q]. For the other cards get volume/page from the printed index or litopys scans (ЕСУМ, Мельничук; djvu on litopys) before shipping a locator (U-16).
- **Dictionary of Polissian dialects (Лисенко 1974)**, **Словник західнополіських говірок (Аркушин 2000)** and **Словник бойківських говірок (Онишкевич)** are the primary dictionaries for *óсьдека, óн’д’ека, óнтам-*; not accessible online in this run. They are the best place to look for **онтамека/осьтамека** (the user's forms look like Boyko/Lemko-type or North-Zakarpattia; nothing confirms a region) [U].
- **uk.wiktionary** has no entry for any of these (API: `missing`) [Q]; do not rely on it.
- The two user examples **онтамека** and **осьтамека** are therefore marked `status:'suggestion'` (analogical, pattern-licensed) not `'attested'`. If the user has a source (text, recording) for them, record it as an attestation with locator — the segmentation pipeline above will then parse them.
- Hrinchenko's search endpoint rate-limits: 429 after ~10 queries at 350 ms; use ≥2.5 s delay or direct ids.

## 7. Implementation hints (not applied; no code changed)

- Add `core/deictics.ts` with `DEICTIC_PREFIXES / BASES / SUFFIXES` (shapes above), exporting `segmentDeictic(form): Segmentation[]` and reuse `Has` from `core/derivation.ts` for VESUM/corpus confirmation of the base.
- Each prefix/suffix row carries `{gloss, region[], source, quote, quoteTag}` so that the card can show "ось (WPL, ESUM) + тут + -ечки (Громик)" with sources (U-16).
- Standard-counterpart mapping lives in data, not rules: `{form:'отуточки', maps:'тут', basis:'pattern HR отутечки', status:'suggestion'}`.
