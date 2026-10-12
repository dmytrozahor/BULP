# R14 — usage labels & sociolects (U-5)

Status: round 1 PARTIAL, round 2 (FU-14) done 2026-10-12 for uk.wiktionary, ЕУМ and лебійська. Still [U]/blocked: sum.in.ua (unreachable), Ставицька/Кондратюк (not read), military slang dictionaries, diaspora usage.
Tags: [Q] verbatim-checked, [P] paraphrase, [U] unverified.

## 1. Sources and what was checked

| Source | Status | Evidence |
|---|---|---|
| СУМ-20 §2.8 (stylistic labels) | [Q] via local research/08 | research/08 lines 110–125 quote the §2.8 definitions from archive.org OCR, including "діал." and "розм." |
| VESUM / dict_uk `doc/tags.txt` | [Q] via local research/08 | `slang` = "сленг та (проф)жаргонізми"; `arch` = "застаріле/архаїчне/(інколи) діалектне"; `:coll` not emitted |
| СУМ-11 (sum.in.ua) | UNREACHABLE [U] | R2: WebFetch `http://sum.in.ua/` → ECONNREFUSED (62.149.28.40:443, http upgraded to https); curl `http://sum.in.ua/s/dialektyzm` and `http://www.sum.in.ua/` → no response (timeout, 20 s). Retry later or via archive.org. |
| uk.wiktionary categories + label templates | [Q] R2 | MediaWiki API (`list=allcategories`, `categorymembers`, wikitext via `generator=categorymembers&prop=revisions`). Inventory §2, samples §6. |
| ЕУМ (litopys.org.ua/ukrmova) | [Q] R2 | Fetched: АРГО (um03), ДІАЛЕКТИЗМ (um204), РОЗМОВНА МОВА (um83), ЗАСТАРІЛІ СЛОВА (um19), ПОЕТИЧНА ЛЕКСИКА (um195). Index um.htm has NO entries «Жаргон», «Сленг», «Просторіччя»; only АРГО covers жаргон/арго. |
| Лебійська мова | [Q] R2 | «Словник таємної мови лірників та шаповалів» http://litopys.org.ua/rizne/lirn.htm (≈1000 слів); ЕУМ АРГО names it. Attribution §7. |
| Ставицька, «Український жаргон» (2005) | Bibliographic only [P] | ESU lists the 2nd edition, Київ, 2005; same corpus called «Словник жарґонної лексики української мови» (2005). Not read. |
| Кондратюк, «Словник сучасного українського сленгу» (2006) | Named only [P] | Not read. |
| Military slang 2014–2024, diaspora | Not searched [U] | |

## 2. uk.wiktionary label inventory (R2, API 2026-10-12)

Mechanism: inline templates in the definition line, `{{label|uk}}` (e.g. `{{жарг.|uk}}`), plus free note `{{позначка|зах.}}` / `{{позначка|зх.-поліс.}}` (regional tag) and `{{те саме|X}}`. Wiktionary categories are filled from these templates. Template pages (namespace 10) were NOT found by prefix (`allpages` with apprefix Жарг/Розм/Діал/Лайл/Прост/Вульг/Книжн/Поет/Сленг/Іст/Церк/Фольк returned empty) → template definitions [U]; category names below are [Q].

| Category | pages (base; «/uk» variant) | Label template seen in wikitext |
|---|---|---|
| Розмовні вирази | 608; /uk 729 | `{{розм.}}`, `{{розм.\|uk}}` |
| Жаргонізми | 5; /uk 16 | `{{жарг.\|uk}}` |
| Діалектні вирази | 685; /uk 425 | `{{діал.}}` + `{{позначка\|зх.-поліс.}}` |
| Діалектизми | 25; /uk 3 | same (Західне Полісся batch) |
| Лайливі вирази | 17; /uk 31 (Лайливі слова/uk 2) | `{{лайл.\|uk}}` |
| Вульгарні вирази | 10; /uk 11 (Вульгаризми 1) | `{{вульг.\|uk}}` |
| Зневажливі вирази | 61; /uk 57 | `{{зневажл.\|uk}}` |
| Іронічні вирази | 29; /uk 25 | [U] |
| Застарілі вирази | 340; /uk 401 | `{{заст.\|uk}}` |
| Історизми | 69; /uk 252 | `{{істор.\|uk}}`, `{{іст.\|uk}}` |
| Архаїчні вирази | 1; /uk 5 | `{{арх.\|uk}}` |
| Поетичні вирази | 37; /uk 32 | `{{поет.\|uk}}` |
| Народно-поетичні вирази | 13; /uk 8 | `{{нар.-поет.\|uk}}` |
| Книжні слова | 62; /uk 59 | [U] |
| Церковнослов'янізми | 4; /uk 5 | `{{церк.-слов.}}` |
| Образні вирази | 3; /uk 50 | |
| Фольклорні терміни | 2; /uk 3 | |
| Лемківські вирази | 1 | |

Other inline label templates seen: `{{військ.|uk}}`, `{{неол.|uk}}`, `{{техн.|uk}}`, `{{зал.|uk}}`, `{{бібл.|uk}}`, `{{бот.|uk}}`, `{{зоол.|uk}}`, `{{геогр.|uk}}`, `{{прав.|uk}}`, `{{збірн.|uk}}`, `{{перен.}}`, `{{жарт.|uk}}`, `{{уроч.|uk}}`, `{{рідко.}}`, `{{недок.|uk}}`.
Not found as category names (prefix queries empty): Сленг*, Арго*, Просторічні*, Молодіжн*, Арготичн*, Табу* (only unrelated «Табуни»). Diaspora: only «Діаспора/uk» (topic, not a label). Military: no label category (only inline `{{військ.}}`). Феня: nothing.

Quality caveat [P]: labels are inconsistent (e.g. in Жаргонізми/uk «башмак» is tagged `техн.`, «бурса» and «кислотний» untagged; «благовірний» `{{жарт.}}` sits in Церковнослов'янізми). Treat as weak evidence; every label needs the entry URL as locator.

## 3. Verbatim definitions available

- [Q] СУМ-20 «розм.» (vol. 1, 2010, §2.8), via research/08: "характеризує одиниці, що належать до складу літературної мови, не виходять за рамки літературного слововживання, але використовуються переважно в усній мові".
- [Q] СУМ-20 «діал.» (research/08 line 113): "характеризує одиниці, які, зберігаючи свою територіально обмежену належність, уживаються в мові художньої літератури або в усно-розмовній мові осіб, що спілкуються літературною мовою…"
- [Q] VESUM `slang`: "сленг та (проф)жаргонізми". `arch`: "застаріле/архаїчне/(інколи) діалектне".
- [Q] ЕУМ АРГО (http://litopys.org.ua/ukrmova/um03.htm): "АРГО (франц. argot — жаргон, первісне — жебрацтво) — один з різновидів соціальних діалектів, штучно створювана умовна говірка якої-небудь вузької замкненої соціальної або профес. групи, незрозуміла для сторонніх. Іноді термін «арго» вживається на позначення певного соціального чи профес. відгалуження від загальнонар. мови (напр., А. артистів, музикантів, спортсменів, військовослужбовців та ін.), тобто в тому ж значенні, що й термін жаргон. У вужчому розумінні А. — мова «соціального дна», декласованих та антисоціальних елементів (рекетирів, злодіїв, жебраків, бомжів, картярів-шулерів тощо)."
- [Q] ЕУМ АРГО on лебійська: "В укр. мові здавна відомі А. сліпих кобзарів і лірників — т. з. лебійська або шлепецька (сліпецька) мова, а також кушнірів, кожухарів, шаповалів, рашевців (бродячих торгівців) тощо."
- [Q] ЕУМ ДІАЛЕКТИЗМ (um204.htm): "ДІАЛЕКТИЗМ (від грец. διάλεκτος — наріччя, говір) — позанормат. елемент літ. мови, що має виражену діалектну (див. Діалект) віднесеність."
- [Q] ЕУМ РОЗМОВНА МОВА (um83.htm): "РОЗМОВНА МОВА — особливий різновид літературної мови, яким послуговуються мовці в щоден. неофіц. спілкуванні."
- [Q] ЕУМ ЗАСТАРІЛІ СЛОВА (um19.htm): "слова, а також їхні окр. значення та номінат. словосполучення, що на даному етапі розвитку мови вийшли із заг. вжитку."
- [Q] ЕУМ ПОЕТИЧНА ЛЕКСИКА (um195.htm): "слова з додатковим стиліст. забарвленням, вживані в мові фольклору та худож. л-ри."
- [P] ЕУМ has no «Жаргон», «Сленг», «Просторіччя» entries (жаргон treated as synonym of арго). Other ЕУМ style entries: СТИЛІСТИЧНА СИСТЕМА um103, СТИЛЬОВІ РІЗНОВИДИ УКРАЇНСЬКОЇ МОВИ um106, ВИСОКИЙ СТИЛЬ um07, СЕРЕДНІЙ СТИЛЬ um88, ГОВІР. ГОВІРКА um164 (the last three fetched, not quoted).
- [P] СУМ-20 also has поет., нар.-поет., зах., жарг., зневажл., лайл. (research/08 line 116); definitions not verbatim-checked [U].

## 4. Unified taxonomy (proposal)

| Axis | Values | Source label examples |
|---|---|---|
| stylistic | literary, rozm, prost, knyzhn, poet, vulg/obsc, derog (зневажл.), joc (жарт.), solemn (уроч.) | розм., прост., книжн., поет., вульг., лайл., зневажл. |
| sociolect | jargon, slang, argot, youth, military, secret-trade (лебійська) | жарг., сленг, арго, військ. |
| territorial | dialectal (+ sub-region tag), western, diaspora | діал. + позначка(зх.-поліс.), зах. |
| chronological | historical, archaic, neologism | заст., арх., істор./іст., неол. |
| thematic / ritual | ritual (вечорниці, весільне), church, folk, nar.-poet | нар.-поет., церк.-слов., фольк. (вечірнє: no source label found [U]) |

Rule from research/08: a pattern match may queue a form for review but must never set a register. Only a dictionary tag or label with quote and locator sets it.

## 5. Data model

```
usage: Claim<Label>[]
Label = { axis, value, sourceLabel, sourceRef(quote+locator), definitionRef, senseIndex }
```
Labels attach to a SENSE, not a lemma (wikitext: `азіат` sense 1 neutral, sense 2 `{{заст.|uk}}, {{лайл.|uk}}`). Conflicting labels stay separate Claims; UI shows "conflict". Regional sub-tags (`{{позначка|зх.-поліс.}}`) map to research/04 dialect codes.

## 6. Samples (verbatim wikitext definition lines, uk.wiktionary; locator `https://uk.wiktionary.org/wiki/<headword>`; retrieved 2026-10-12) [Q]

Жаргонізми/uk: вумний `# {{жарг.|uk}} [[розумний]]` · джинсувати `# {{жарг.|uk}} [[заповнювати]] [[джинса|джинсою]] [[медіа]].` · дембельнути `# {{розм.|uk}}, {{жарг.|uk}} [[провести]] [[дембель]], [[демобілізація|демобілізацію]].` · задвохсотити `# {{неол.|uk}}, {{військ.|uk}}, {{жарг.|uk}} [[зробити]] [[двохсотий|двохсотим]].` · крінж `# {{неол.|uk}}, {{жарг.|uk}} [[почуття]] [[сорому]] за чиїсь дії.` · башмак `# {{техн.|uk}} пристрій, що служить опорою чому-небудь.` (noise) · бурса `# чоловіча духовна школа у XVIII — середині XIX ст.` (no label). Only 5 of 10 sampled are genuinely жарг.

Лайливі вирази/uk: байстрюк `# {{зневажл.|uk}}, {{лайл.|uk}} позашлюбний син.` · азіат `# {{заст.|uk}}, {{лайл.|uk}} про відсталу, грубу, некультурну людину.` · архаровець `# {{лайл.|uk}} [[бешкетник]], [[босяк]], [[волоцюга]].` · барахло `# {{лайл.|uk}} про погану, негідну людину.` (sense 1 `{{розм.|uk}} {{збірн.|uk}} старі речі домашнього вжитку.`) · бахур `# {{лайл.|uk}} [[розпусник]]; [[залицяльник]], [[полюбовник]].` · бестія `# {{лайл.|uk}} про лиху, хитру людину, бешкетника, крутія і т. ін.` (sense 1 `{{заст.|uk}} дикий звір.`) · байстря `# {{зневажл.|uk}}, {{лайл.|uk}} позашлюбна дитина`.

Вульгарні вирази/uk: банькатий `# {{вульг.|uk}} надто опуклий, витріщений {{позначка|(про очі)}}.` · вибити бубну `# {{вульг.|uk}} побити кого-небудь.` · падлючити `# {{недок.|uk}} {{вульг.|uk}} поводити, тримати себе [[підлий|підло]], як [[падло]].` · підсрачник `# {{вульг.|uk}} [[удар]] [[ззаду]] нижче пояса` · блядь `# {{вульг.|uk}} [[повія]]` · їбала жаба гадюку `# {{розм.|uk}} {{вульг.|uk}} Вираз, що описує безглуздий або токсичний конфлікт…`.

Зневажливі вирази/uk: бабега `# {{зневажл.|uk}} збільшене до [[баба]] 1 2, 3.` · бабище `# {{зневажл.|uk}} збільш. до [[баба]] 1 2, 3.` · баболюб `# {{зневажл.|uk}} {{те саме|бабій}} 1.` · базіка `# {{зневажл.|uk}} той, хто любить багато говорити, [[базікати]].` · базікати `# {{зневажл.|uk}} говорити багато, беззмістовно, про щось неістотне, не варте уваги.`

Розмовні вирази: автівка `# {{розм.}} {{змп|авто}}` · агукати `# {{розм.}} говорити «[[агу]]».` · агуськати `# {{розм.}} те саме, що агукати.` · адвокатувати `# {{розм.}} працювати, бути адвокатом` · аблакат `# {{розм.}} [[адвокат]] (часто самозваний)` · ава `# {{розм.}} {{те саме|аватарка}}.` · аварія (sense 2) `# {{перен.}}, {{розм.}} невдача, несподіване порушення ходу якоїсь справи; нещастя.` · австріяк `# {{розм.|uk}}, {{заст.|uk}} {{те саме|австрієць}}.` · агітка `# {{розм.}} невеликий літературний, мистецький і т. ін. твір, признач, для агітації.`

Діалектизми (Західне Полісся batch): гладишка `# {{діал.|uk}}, {{позначка|зах.}} висока кругла, перев. глиняна посудина…` · гузаха `# {{діал.}}, {{позначка|зх.-поліс.}} невеличка комаха або жучок` · ґалаха `# {{діал.}}, {{позначка|зх.-поліс.}} великий чорний птах з родини воронових` · кобилиця `# {{діал.}}, {{позначка|зх.-поліс.}} гриб з родини свинухових` · зажужвеляний `# {{діал.}}, {{позначка|зх.-поліс.}} той, що втратив м'якість, гнучкість, соковитість` · дати шитиків `# {{діал.}}, {{позначка|зх.-поліс.}} [[шитикувати|одшитикувати]]` · красноголовець, жабський (same pattern).

Застарілі / істор. / поет. / нар.-поет. / церк.-слов.: аванпост `# {{заст.|uk}} передовий [[пост]]…` · абстракт `# {{заст.|uk}} [[поняття]], створене шляхом [[абстрагування]].` · ад `# {{заст.|uk}} {{те саме|пекло}}.` · апанаж `# {{істор.|uk}} земельне [[володіння]]…` · алебарда `# {{військ.|uk}}, {{іст.|uk}} {{позначка|старовинна зброя:}} сокирка у вигляді півмісяця…` · абаза `# {{іст.|uk}} дрібна срібна [[монета]]…` · багріти `# {{поет.|uk}} набирати [[багряний колір|багряного кольору]], ставати багряним.` · видноколо `# {{поет.|uk}} [[обрій]], [[овид]], [[небокрай]], [[горизонт]].` · вночішний `# {{поет.|uk}} {{те саме|нічний}}.` · бранець `# {{нар.-поет.|uk}} [[полонений]], [[військовополонений]].` · царенко `# {{нар.-поет.|uk}} {{те саме|царевич}}.` · крин `# {{арх.|uk}} [[вода]]` / `# {{нар.-поет.|uk}} водяна лілея, біле латаття` · благовірний `# {{жарт.|uk}} [[чоловік]].` · верховний `# {{церк.-слов.}}, {{рус.}}`.

VESUM (research/08): `шо conj:subord:slang`.

## 7. Лебійська мова / арго (R2)

- [Q] «Словник таємної мови лірників та шаповалів» http://litopys.org.ua/rizne/lirn.htm — "(близько 1000 слів)". Abbreviation key (verbatim): "зп. — лірники (Західне Поділля, Гнатюк); сп. — лірники (Східне Поділля, Боржковський); ш. — новоропські шаповали (Николайчик); гл. — галицькі лірники (Студзинський за Гнатюком); ул. — українські лірники (Студзинський за Гнатюком); г. — галицькі лірники (словник Горбача)". Each sense carries a region/collector tag, so dialect-of-argot is encoded in the source.
- [Q] Sample entries (verbatim): "авлида — г. сп. корова; явлид, гавлид — г. сп. віл, бик" · "авридити — г. сп. брехати" · "альмо — г. сп. молоко; галімо, гаїмо — г. зп. молоко" · "андрус — г. зп. брат" · "арнак — г. зп. когут, півень" · "баклун — г. сп. тютюн" · "бараї — сп. ікони" · "барлуджити — г. орати" · "акруша — ш. хліб" · "ахвес — ш. Бог, церква, ікони".
- [P] Attribution (from web-search summaries of uk.wikipedia «Лебійська мова» and Гнатюк, Етнографічний збірник 1896 т.2, http://litopys.org.ua/rizne/etno01.htm; pages not opened [U]): Боржковський (Киевская старина, 1889, «Лирники», Поділля) calls it «лобурська»/«лебійська» (від «лебій» = дід); Гнатюк (Галичина) «либійська» (від «либіщак» = лірник). Round-1 "not confirmed" is resolved as [P]; verify against the originals.
- [P] Феня: no Ukrainian source found; ЕУМ АРГО's narrow sense ("мова соціального дна") is the nearest definition. Recommendation: do not auto-tag «феня»; use `sociolect:argot` with the source's own term.
- Harvestability: lirn.htm reproduces PD works (Гнатюк 1896, Боржковський 1889, Студзинський) [P] → citable and harvestable; ЕУМ cite-only.

## 8. Harvestable vs cite-only

- VESUM (`slang`, `subst`, `arch`, `bad`): harvestable (CC BY-NC-SA 4.0 per research/08).
- uk.wiktionary: API open, CC BY-SA 4.0. Harvest via `generator=categorymembers&prop=revisions` (≤50 pages/request). Rate limit hit at rapid-fire requests without User-Agent; use ≥2.5 s delay and a descriptive User-Agent. Scope ≈600 розм., ≈700 діал., ≈340 заст.; label quality caveat §2.
- СУМ-20 / goroh.pp.ua: cite only. СУМ-11 unreachable [U].
- Лірницький словник (litopys): citable/harvestable [P].
- Ставицька, Кондратюк, military dictionaries: cite only, unverified [U].

## 9. Open items

1. СУМ-11 preface/abbreviation list (sum.in.ua unreachable; try archive.org).
2. Wiktionary template names/definitions (`action=parse` on one entry).
3. Ставицька 2005 and Кондратюк 2006: scope/licence.
4. Read Гнатюк 1896 and Боржковський 1889 originals for verbatim attribution.
5. Military slang dictionaries 2014–2024; diaspora usage (1928 orthography, anglicisms).
6. «вечірнє/вечорниці»: no source label found.

## Round 2 log (fetched 2026-10-12)

- https://uk.wiktionary.org/w/api.php `list=allcategories&acprefix=` for ~45 prefixes (Жарг, Діал, Лайл, Сленг, Арго, Заст, Вульг, Прост, Книжн, Розмов, Поет, Зневаж, Військ, Церк, Фольк, Діаспор, Молод, Табу, Образ, Ласк, Іронічн, Евфем, Історизм, Регіон, Народн, Гуцул, Бойк, Лемк, Просторічні, Сленгові, Арготичн, Фене…); first run rate-limited, rerun with delay.
- `list=allpages&apnamespace=10&apprefix=` for 16 label prefixes: empty except Шаблон:Застарілий код.
- `list=categorymembers` and `generator=categorymembers&prop=revisions` for 11 categories (§6). `prop=extracts` returned empty.
- http://sum.in.ua/ (WebFetch ECONNREFUSED); http://sum.in.ua/s/dialektyzm, http://www.sum.in.ua/ (curl timeout): not reachable.
- http://litopys.org.ua/ukrmova/um.htm, um03, um204, um19, um83, um164, um195, um07, um88 (cp1251).
- http://litopys.org.ua/rizne/lirn.htm.
- Web search «лебійська мова … Боржковський Гнатюк» (uk.wikipedia, litopys etno01, gazeta.ua, irp.te.ua; not opened).
- Helper scripts: C:\Users\User\.claude\jobs\293095c9\tmp\{c,d,e}.ps1.
