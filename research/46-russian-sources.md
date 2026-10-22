# 46. Russian sources: evidence and flag decisions / Російські джерела: докази й рішення про позначку

Updated / Оновлено: 2026-10-21 (SPEC 63 RF-1…RF-7). English first, then Ukrainian (as in README). Every quotation below was read on the page named in the line; where no quotation supports a claim, the claim is not made and the text says «no evidence found».

---

# English

## 1. Why the word card shows «рос. видання» / «рос. джерело»

Owner, 2026-10-21: «mark every russian source as such because they may overwrite or ignore ukrainian features, and it is well known (find an evidence for that and notify in a word card when a source is russian)».

The badge text is a caution: *«Російське видання/джерело: можливе нівелювання або ігнорування українських рис»* («possible levelling or ignoring of Ukrainian features»). It does **not** say that a given edition altered its text. The flag says the *edition or the description* is Russian, never that the Ukrainian text is.

## 2. Evidence

Searches covered: Огієнко «Історія української літературної мови», Шевельов, Грушевський, Німчук, ЕСУ / ЕІУ on the Archaeographic Commission, and the Wikipedia pages below. Only the pages in this section were opened and quoted.

### 2.1 Supported: the Kyiv Archaeographic Commission was an imperial body with imperial-Russian aims

- uk.wikipedia, «Київська археографічна комісія» (https://uk.wikipedia.org/wiki/Київська_археографічна_комісія), as returned by the fetch tool: «створена 31 травня 1843 року для розбору давніх актів при Київському, Волинському і Подільському генерал-губернаторі»; «з «Високого дозволу» (по Высочайшему соизволению) імператора Миколи I»; «Хоча однією з цілей Комісії було просування імперсько-російських ідеологічних тверджень».
- What it supports: an edition by this commission (Величко 1848–64, Грабянка 1854, АЮЗР) comes from an institution that had an ideological aim. It does **not** say that the commission changed any text.

### 2.2 Supported: Russian imperial policy denied the Ukrainian language and restricted its printing

- uk.wikipedia, «Валуєвський циркуляр» (https://uk.wikipedia.org/wiki/Валуєвський_циркуляр): «Жодної особливої малоросійської мови не було, немає й бути не може»; «заборонялась публікація релігійних, навчальних і освітніх книг»; «Якщо в 1860—1863 рр. друком з'явилося 114 назв книжок українською мовою» … «у 1864—1869 рр. це число зменшилося до 24 назв»; for the Ems decree (1876): «видання творів українською мовою заборонялося практично повністю».
- uk.wikipedia, «Ярижка» (https://uk.wikipedia.org/wiki/Ярижка): «Після 1876 року використання ярижки стало обов'язковим через заборону вживання української мови»; the censorship «допускала до друку тільки тексти написані чи надруковані російською кириличною абеткою»; «ъ і ь пишуться в цілому за російською системою».
- What it supports: for Ukrainian texts printed in the Russian Empire (and so for Moscow / St Petersburg prints) the spelling and the alphabet were set by Russian rules, and the very existence of the language was denied officially. It supports «ignoring», not a specific editor's changes.
- Counter-evidence in the same article: «у випадках протиріччя російського етимологічного написання українській вимові» … «при написанні використовувалась фонетика» (the yaryzhka was phonetic where Russian etymological spelling clashed with Ukrainian pronunciation). So a yaryzhka print is not automatically «levelled».

### 2.3 Neutral or against: facts that do not support a claim of alteration

- «Історія Русів»: «окремим виданням рукопис трактату видав лише 1846 року в Москві Осип Бодянський» (https://uk.wikipedia.org/wiki/Історія_русів); the same page gives the title as «Исторія Русовъ» and says «написаний найімовірніше … російською мовою». The page names no change made by Бодянський. The Encyclopedia of Ukraine entry «Bodiansky, Osyp» says he «unfailingly defended the independence of the Ukrainian language and literature» (https://www.encyclopediaofukraine.com/pages%5CB%5CO%5CBodianskyOsyp.htm). Flag: Moscow edition (place), no claim of alteration.
- Грабянка: «У 1854 літопис опублікувала Київська археографічна комісія з найповнішім і найдавнішим списком» (https://uk.wikipedia.org/wiki/Літопис_Грабянки). This speaks for the edition's textual care, not against it.
- Величко: the Kyiv commission printed it in 1848–64 («Працю вперше опубліковано у чотирьох томах у 1848–64 Київською археографічною комісією»); the Baturyn edition of 2020 «вперше за 300 років було видано саме в такому вигляді, в якому автор створював його спочатку» (https://uk.wikipedia.org/wiki/Літопис_Самійла_Величка). The page does not say what the earlier prints changed. This is the nearest statement to «earlier edition differs from the author's text»; it is weak and unspecific.

### 2.4 No evidence found

- A scholarly statement (Огієнко, Шевельов, Німчук, ЕСУ / ЕІУ) that the Archaeographic Commission or other Russian editions **normalised, Russified or re-spelled** Ukrainian / Ruthenian texts: **no evidence found** by my searches (three searches over those names; no page opened gave such a sentence). The warning therefore rests on 2.1 and 2.2 and is worded «можливе» (possible).
- A scholarly statement that Russian-language **dictionaries** (Даль, Фасмер, Закревський, Уманець–Спілка) ignored or distorted Ukrainian lexis: **no evidence found**. The `dictionary` flag is applied only because the dictionary's glosses are Russian (a fact from its own metadata), not because of any proven distortion.
- A statement about the orthography of Потебня's 1887 Kharkiv edition other than my own look at its pages (the text uses an own Ukrainian orthography, the preface is Russian): no scholarly quotation was opened.
- Openly searched for but not opened: Огієнко's chapters on the 19th century, Шевельов's «Внесок Галичини…», Німчук's papers on archaeographic editions (the PDFs found were library records or closed pages).

## 3. Flag decisions (RF-1, `core/ru-source.ts`)

Decided from the source's own metadata only (place and publisher in the edition statement, declared gloss language `DICT_COVER.lang`).

| kind | rule | sources decided |
|---|---|---|
| `edition` | edition statement names СПб. / Москва / Петербург, an Archaeographic or Temporary Commission, РИБ, АЮЗР / Акты ЮЗР, ПСРЛ, «Исторія Русовъ» (Moscow 1846), «Летопись событий в Юго-Западной России» | in the current corpus (public/data/corpus.json, 5,468 witnesses): **8**: kievchr, gvl (ПСРЛ т. 2, СПб. 1908), eneida1798, eneida1808, kobzar1840 (СПб.), hv_ia_aruzr_3_1, hv_ia_arhuzr_1_7, hv_ia_auzr_3_4 (АЮЗР, archive.org OCR). Registry: MAKSYM1834 (Москва 1834). Owner books: РИБ т. 4 (Палінодія), РИБ т. 19 (7 works) = **8** witnesses configured, data pending OCR |. SG-3 (2026-10-22): `song_duma_mazepy` (Бантыш-Каменский, Источники малороссійской исторіи, ч. 2, Москва 1859) — `edition` by the «Москва» rule; the text is the Ukrainian copy of Kochubei, the card shows «рос. видання»
| `dictionary` | declared gloss language Russian (`DICT_COVER.lang = 'ru'`); ru.wiktionary rows | witnesses in the corpus: **8** (r2u_umanets, r2u_hrinch09, r2u_hrinch27, r2u_nikovsky, r2u_krymsky, r2u_izyumov, r2u_doroshenko, r2u_yakubski); declared without a corpus witness yet: **3** (timchenko-materials, biletsky-nosenko, zakrevsky: «мову глос перевірити (?)» in se.ts). Registry: R2U, HRINCH, OPENCORPORA, AVDEEVA (**4**) |
| `apparatus` | the edition statement says the preface / notes are Russian-language while the text is Ukrainian | registry: FBRU, LONKIN (Russian-language articles, **2**); Потебня, Харьковъ 1887 (preface and notes Russian; text in the edition's own Ukrainian orthography, not changed to Russian) once its OCR is ingested |

Not flagged (decided, with reason):
- «Грамоти XIV ст.», Київ: Наукова думка, 1974 (Академія наук УРСР, Інститут мовознавства ім. О. О. Потебні; упорядник М. М. Пещак): a Ukrainian SSR publication in Kyiv. Not a Russian edition.
- Копистенський «Книга о вірі єдиній»: the original Kyiv print c. 1620, with no editor.
- Зизаній «Лексис» 1596–1946 (reprint ed. Др. Ярослав Рудницький): title page names neither a Russian place nor a Russian institution.
- Львів, Прага, Київ (pre-1917 or later) imprints without a Russian institution in the statement: not flagged. Kyiv and Kharkiv were inside the Russian Empire before 1917, but the rule uses the edition statement, not the empire's borders; a statement-based rule can miss an imperial imprint (stated limitation).
- Ukrainian-gloss and non-Russian-gloss dictionaries: Желехівський (de), СУМ XIV–XV / XVI–XVII / Тимченко / Шевченко (uk), Wiktionary (uk, en).

## 4. Evidence link in the UI

Every badge links to this file (https://github.com/dmytrozahor/BULP/blob/mvp/research/46-russian-sources.md).

---

# Українською

## 1. Чому картка слова показує «рос. видання» / «рос. джерело»

Власник, 2026-10-21: «mark every russian source as such because they may overwrite or ignore ukrainian features… notify in a word card when a source is russian».

Текст позначки — застереження: *«Російське видання/джерело: можливе нівелювання або ігнорування українських рис»*. Він **не** стверджує, що конкретне видання змінило текст. Позначка каже, що російським є *видання або опис*, а не український текст.

## 2. Докази

Пошук охоплював Огієнка («Історія української літературної мови»), Шевельова, Грушевського, Німчука, статті ЕСУ / ЕІУ про Археографічну комісію та сторінки Вікіпедії нижче. Відкрито й процитовано лише ті сторінки, що названі в цьому розділі.

### 2.1 Підтверджено: Київська археографічна комісія — імперська установа з імперсько-російськими цілями

- uk.wikipedia, «Київська археографічна комісія»: «створена 31 травня 1843 року для розбору давніх актів при Київському, Волинському і Подільському генерал-губернаторі»; «з «Високого дозволу» (по Высочайшему соизволению) імператора Миколи I»; «Хоча однією з цілей Комісії було просування імперсько-російських ідеологічних тверджень».
- Що це підтверджує: видання комісії (Величко 1848–64, Грабянка 1854, АЮЗР) походить від установи з ідеологічною метою. Воно **не** каже, що комісія змінювала тексти.

### 2.2 Підтверджено: імперська політика заперечувала українську мову й обмежувала друк

- uk.wikipedia, «Валуєвський циркуляр»: «Жодної особливої малоросійської мови не було, немає й бути не може»; «заборонялась публікація релігійних, навчальних і освітніх книг»; «Якщо в 1860—1863 рр. друком з'явилося 114 назв книжок українською мовою» … «у 1864—1869 рр. це число зменшилося до 24 назв»; про Емський указ (1876): «видання творів українською мовою заборонялося практично повністю».
- uk.wikipedia, «Ярижка»: «Після 1876 року використання ярижки стало обов'язковим через заборону вживання української мови»; цензура «допускала до друку тільки тексти написані чи надруковані російською кириличною абеткою»; «ъ і ь пишуться в цілому за російською системою».
- Що це підтверджує: для українських текстів, надрукованих у Російській імперії (отже, для московських і петербурзьких друків), абетку й правопис визначали російські правила, а саме існування мови офіційно заперечувалося. Це підтверджує «ігнорування», а не конкретні правки редакторів.
- Протилежний доказ у тій самій статті: «у випадках протиріччя російського етимологічного написання українській вимові» … «при написанні використовувалась фонетика». Отже, друк ярижкою не є автоматично «нівельованим».

### 2.3 Нейтральне або проти: факти, які не підтверджують тверджень про зміну тексту

- «Історія Русів»: «окремим виданням рукопис трактату видав лише 1846 року в Москві Осип Бодянський»; сторінка дає назву «Исторія Русовъ» і каже «написаний найімовірніше … російською мовою». Змін Бодянського не названо. У «Encyclopedia of Ukraine» про Бодянського: «unfailingly defended the independence of the Ukrainian language and literature». Позначка: московське видання (за місцем), без твердження про зміну.
- Грабянка: «У 1854 літопис опублікувала Київська археографічна комісія з найповнішім і найдавнішим списком». Це свідчить про текстологічну ретельність видання, а не проти неї.
- Величко: комісія видала 1848–64 («Працю вперше опубліковано у чотирьох томах у 1848–64 Київською археографічною комісією»); батуринське видання 2020 р. «вперше за 300 років було видано саме в такому вигляді, в якому автор створював його спочатку». Що змінювали попередні друки, сторінка не каже. Це найближче до «видання відрізняється від авторського тексту», але слабке й неконкретне.

### 2.4 Доказів не знайдено

- Наукове твердження (Огієнко, Шевельов, Німчук, ЕСУ / ЕІУ), що Археографічна комісія чи інші російські видання **нормалізували, русифікували або переписували правопис** українських/руських текстів: **доказів не знайдено** (три пошуки за цими іменами; жодна відкрита сторінка не дала такого речення). Застереження тому спирається на 2.1 і 2.2 і сформульоване як «можливе».
- Наукове твердження, що російськомовні **словники** (Даль, Фасмер, Закревський, Уманець–Спілка) ігнорували чи спотворювали українську лексику: **доказів не знайдено**. Позначка `dictionary` ставиться лише тому, що тлумачення словника російські (факт з його метаданих), а не через доведене спотворення.
- Твердження про орфографію харківського видання Потебні 1887 р. поза моїм переглядом його сторінок (текст має власну українську орфографію, передмова російська): наукової цитати не відкрито.
- Шукали, але не відкрили: розділи Огієнка про XIX ст., «Внесок Галичини…» Шевельова, статті Німчука про археографічні видання (знайдені PDF були бібліотечними записами або закритими сторінками).

## 3. Рішення про позначку (RF-1, `core/ru-source.ts`)

Рішення ухвалюються лише за метаданими джерела (місце й видавець у відомостях про видання, заявлена мова тлумачень `DICT_COVER.lang`). Таблиця — в англійській частині (розділ 3): `edition` — 8 свідчень у поточному корпусі (kievchr, gvl, eneida1798, eneida1808, kobzar1840, три АЮЗР) + MAKSYM1834 + 8 налаштованих праць із РИБ т. 4 і т. 19 (дані чекають на OCR); `dictionary` — 8 свідчень (r2u_*) + 3 оголошені словники (timchenko-materials, biletsky-nosenko, zakrevsky) + 4 джерела реєстру (R2U, HRINCH, OPENCORPORA, AVDEEVA); `apparatus` — 2 джерела реєстру (FBRU, LONKIN) і Потебня 1887 після імпорту.

Не позначено: «Грамоти XIV ст.» (Київ: Наукова думка, 1974; АН УРСР) — київське видання УРСР, не російське; Копистенський «Книга о вірі єдиній» — оригінальний київський друк; Зизаній «Лексис» (передрук Рудницького) — титул не називає російського місця чи установи; видання зі Львова, Праги та Києва без російської установи у відомостях; словники з українськими, німецькими й англійськими тлумаченнями. Обмеження: правило спирається на відомості про видання, а не на межі імперії, тому імперський друк без таких слів воно може пропустити.

## 4. Посилання на докази в інтерфейсі

Кожна позначка веде на цей файл (https://github.com/dmytrozahor/BULP/blob/mvp/research/46-russian-sources.md).
