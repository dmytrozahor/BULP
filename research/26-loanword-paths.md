# R26 — Loanword source-language / intermediary identification (U-27)

Run: 2026-10-12, Sonnet research agent. Obeys SPEC 00 (inferred != fact, P-1.7). Tags: [Q] verbatim from the fetched page (Правопис quotes: the slovnyk.ua mirror letter-spaces stressed syllables; spacing removed, text otherwise unchanged), [P] paraphrase, [U] unverified / not fetched.

User request U-27: *«екстремі-ті (extremity), екстремі-тет (German Extremität) … derive other rules to determine which forms are foreign»*.

## 0. Bottom line

1. There is no Правопис 2019 rule that says "-ітет = German". Правопис §§ 121–138 only fix **how a foreign sound/letter is spelled** (г/ґ/х, л/ль, и/і/ї, є/е, апостроф, подвоєння, ау/ей …). The donor/intermediary language has to be inferred from **(a) the suffix/ending, (b) the spelling pattern, (c) phonetic residue of the donor** — and then **validated against etymology labels** (en.wiktionary categories, ЕСУМ via Wiktionary refs). Each inference is a Claim with `method = LOAN-<rule id>` and a probability, never a fact (P-1.7).
2. A data-driven check on 3 246 Ukrainian lemmas that en.wiktionary labels with a single immediate donor (CC BY-SA) shows that **a handful of rules are near-deterministic** (-інг/-инг → English 26/26; -унок → Polish 11/11; -дло → Polish 5/5; -аж → French 25/27; ґ-/шл-/дз- → Polish-led) and **most of the "international" suffixes are not donor-specific** (-ація, -ізм, -ист, -ія, -ент, -ер, -ор). A rule-feature naive-Bayes classifier reaches **top-1 37 % / top-2 53 %** (5-fold CV, 3 116 single-donor lemmas, majority baseline 20 %); per-donor recall: pl 64 %, fr 57 %, en 38 %, la 38 %, tr 29 %, de 19 %, it 7 %, grc 8 %, cu 8 %, ru 2 %. So: the engine can **flag "foreign + probable donor family"** reliably only for the deterministic rules; for the rest it must show candidates, not decide.
3. U-27 specifically: **екстремі-ті** and **екстремі-тет** are two different outputs of one Latin *-itas/-itatem*: *-ітет* = the "Western-European via Polish/German/Russian" path (менталітет ← Mentalität, імунітет ← Immunität, університет ← Universität, per en.wiktionary), *-іті* = direct English `-ity` transliteration (cf. Правопис § 129 I.4 «Канзас-Сіті»). Neither *екстремітет* nor *екстремітi* is attested in uk/en Wiktionary (404) → both stay [U]; the existing attested word is **екстремізм** («Derived via Western European languages from extrēmus + -ізм») and **екстремальний**.

## 1. Sources fetched

| id | source | what | licence/terms |
|---|---|---|---|
| PRAV | slovnyk.ua/pravopys.php?prav_par=N, N = 6, 121–138 (fetched once each, 0.4 s apart) | Правопис 2019 text of the corresponding § | cite; quotes short |
| WKEN | en.wiktionary raw wikitext of 28 entries (-ація, -ізм, -ист, -унок, -аж, -ор, -ер, університет, менталітет, імунітет, рахунок, пакунок, маркетинг, гараж, комунізм, комітет, аутсорсинг, нація, екстремізм, екстремальний, екстремум, проєкт, ефір …), 2.6 s spacing, UA `BULP-research/1.0` | etymology lines | CC BY-SA |
| WKCAT | en.wiktionary `Category:Ukrainian terms borrowed from {Polish, German, Middle High German, English, French, Latin, Russian, Turkish, Italian, Ancient Greek, Old Church Slavonic, Dutch, Hungarian, Tatar}` + `derived from Turkic languages` (categorymembers API) | 3 246 distinct single-word lemmas with ≥1 donor label (sizes: pl 609, fr 690, en 506, de 431, ru 331, la 298, grc 163, tr 121, cu 121, it 77, nl 22, hu 17) | CC BY-SA |
| WPUK | uk.wikipedia extracts «Полонізм», «Германізм», «Англіцизм», «Тюркізм», «Грецизм», «Латинізм» | identification criteria quoted in the articles | CC BY-SA |
| EUM | ЕУМ «Запозичення / Іншомовні слова / Полонізм / Германізм / Англіцизм / Тюркізм» (litopys.org.ua/ukrmova) | **not fetched in this run [U]**; WPUK «Тюркізм» reproduces the ЕУ and «Українська мова» enc. versions | cite-only |
| ESUM | ЕСУМ is reached only through the `{{R:uk:ESUM|…}}` refs inside WKEN (e.g. комунізм vol. 2 p. 545; пака p. 257) | [U] page content not read |
| CORE | `public/data/lexicon.json` core cards, 9 867 cards / 12 136 distinct lowercase lemma strings incl. variants | corpus test (§6) | project |

Helper scripts (not committed): `C:\Users\User\.claude\jobs\293095c9\tmp\r26\` (`wk.mjs`, `catmem.mjs`, `analyze.mjs`, `core.mjs`, `catmem.json`, `rules.json`, `cv.json`).

## 2. Verbatim evidence

### 2.1 Правопис 2019 (spelling rules that encode donor-language residue)

| § | quote [Q] | use |
|---|---|---|
| 121 L | «Звук [ l ] у словах іншомовного походження передаємо твердим або м’яким л — залежно від того, як узвичаєне те чи те слово в українській мові»; «У новітніх запозиченнях з англійської мови звук [ l ] передається твердим л ( ланч , сейл, табл о їд , файл та ін.)» | hard л in a recent loan ⇒ English-direct (R-E9); older loans: no rule, lexical |
| 122.1 | «Звук [ g ] та близькі до нього звуки, що позначаються на письмі буквою g , звичайно передаємо буквою г» | г for g is the default (Western names) |
| 122.2 | «Буквою ґ передаємо звук [ g ] у давнозапозичених загальних назвах, таких як ґанок, ґатунок, ґвалт, ґрати, ґрунт і под. (див. § 6)» | ґ in common nouns ⇒ **old (Polish-mediated) loan**, see WPUK «Наявність звука [g] (замість природного для української мови [ɦ]), де він походить від польських g, k» |
| 122.3 | «У прізвищах та іменах людей допускається передавання звука [ g ] двома способами: … буквою г Верг і лій, Гарс і я, Г е те … і … буквою ґ Верґ і лій, Ґарс і я, Г е ґель, Ґ е те» | proper names: ґ = direct-from-donor imitation, not a chronology marker |
| 122.4 | «Звук [ h ] переважно передаємо буквою г … За традицією в окремих словах, запозичених з європейських та деяких східних мов [ h ] … передаємо буквою х : хобі, хокей, хол, холдинг, брахман, джихад, моджахед, … Аллах» | х for [h]: English (хобі, хокей, холдинг) and Eastern (джихад, Аллах); not Polish/German (which give г) |
| 123 TH Gk | «Буквосполучення th у словах грецького походження передаємо звичайно буквою т»; «У словах, узвичаєних в українській мові з ф , допускається орфографічна варіантність на зразок: … ефір і етер, … міф, міфологія і міт, мітологія, … Афіни і Атени, Борисфен і Бористен» | **ф for θ = Greek via Church Slavonic/Russian; т = direct Greek** (2019 reinstated т variants) |
| 124 | «Англійське w на позначення звука [ w ] передаємо звичайно через в : вікенд, Вашингтон …; у деяких словах за традицією через у : Уельс, уайт-спірит»; «th на позначення звука [ θ ] передаємо звичайно через т … [ð] … через з » | English-direct |
| 125 | «Французькі буквосполучення ll та ill … передаємо через й : макіяж, Війон, Шантійї. У деяких загальних і власних назвах буквосполучення -aille, -ille, -eille за традицією передаємо як -аль, -іль : ванiль, Версаль, Марсель» | French |
| 126 | «Звук [ j ] … у звукосполученнях [je], [ji], [ju], [ja] буквами є, ї, ю, я : буєр, … проєкт, проєкція, ін’єкція, суб’єкт, траєкторія, фоє» | 2019 **проєкт** (not проект); wk: «Borrowed from German Projekt, from Latin proiectus. This spelling (with -єкт-) is officially stipulated in preference to проект» |
| 127 | «Кінцеве -tr передаємо через -тр , -dr — через -др : барометр, діаметр, семестр, театр, термометр, центр, цилiндр» | all donors; no discrimination |
| 128.1 | «У загальних назвах іншомовного походження букви на позначення приголосних звичайно не подвоюємо … За традицією з подвоєнням пишемо загальні назви: аннали, бонна, білль, брутто, булла, ванна, вілла, донна, мадонна, манна, мулла, панно, пенні, тонна, дурра, мірра та слово Аллах» | double consonant in a common noun = learned/old-loan relic; в. proper names §128.3 |
| 128.4 | «Буквосполучення ck , що в англійській, німецькій, шведській … передає звук [ k ], відтворюємо українською буквою к» | — |
| 129 I | «У кінці слова іншомовне -іa передаємо звичайно через -ія : артерія, матерія, індустрія, Італія»; I.4 «У географічних назвах після приголосних, крім дж, ж, ч, ш, щ, ц і р перед наступним приголосним, крім [ j ], і в кінці слова … : Канзас-Сіті, Лісабон, Міссісіпі, Монтевідео, Ніл, Севілья, Сідней, Замбезі, Капрі, Сомалі»; I.5 «Після приголосних у кінці слова: візаві, віскі, журі, колібрі, мерсі, парі, попурі, суші, таксі, характері, шасі»; I.6 «У всіх інших випадках після б, п, в, м, ф, г, к, х, л, н перед наступним приголосним: бізнес, пілот, вібрація, академік, фінанси, графік … За усталеною традицією в ряді слів … давно засвоєні … пишемо и : башкир, вимпел, єхидна, імбир, калмик, кипарис, кисет, лиман, миля, мирт, нирка, спирт, химера»; III.1 «У загальних назвах після приголосних д, т, з (дз), с, ц, ж (дж), ч, ш, р перед наступним приголосним: дизель, динамо, диплом, директор, методика; інститут, математика, стимул, тип; позиція, фізичний; таксист, родзинка, силует, система …» | **-ті/-ки/-рі/-ші in final position = -y/-i of English/French/Italian loans (Сіті, віскі, журі, суші)**; и after д т з с ц ж ч ш р vs і elsewhere is a *spelling* rule and says nothing about donor |
| 130 | «Голосний [ e ] звичайно передаємо буквою е … Після букв на позначення голосних, після ь і апострофа … звичайно вживається буква є : конвеєр, реєстр, феєрверк, карієс, клієнт, дієз, …» ; «У словах, запозичених із французької мови, після шиплячих ж, ш пишемо українську букву у : брошура, журі, парашут» | ie → ієнт/-ієнт; -шу-/-жу- = French |
| 131 | «Буквосполучення au, ou … передаємо через ау, оу : аутсайдер, гауптвахта, маузер; Кауна…»; «У словах, що походять із давньогрецької та латинської мов, буквосполучення au звичайно передається через ав : автентичний, автомобіль, автор, авторитет, автохтон, лавра, Аврора» ; «аудієнція і авдієнція, … лауреат і лавреат, пауза і павза» | аут/ау = Germanic/English direct; ав = Latin/Greek learned (via Pol./CS) |
| 132 | «Голосні … ö, ø, oe, eu … передаємо українською буквою е : Ґете, Б’єрнсон, Кельн, Пастер, Рентген» | German/Scandinavian/French |
| 133 | «Англійські дифтонги [au], [ei], [ou] звичайно передаємо, імітуючи їхнє звучання в мові оригіналу, через ау, ей, оу : браунінг, брaузер, гейм, дисплей, Джеймс, сноуборд, шоу … Окремі слова з дифтонгами [ei] і [ou] ввійшли в українську мову в адаптованому вигляді з голосними е, о : бебібум, брек, леді, гол, готель, допінг, смокінг» | ай/ей/оу stems ⇒ recent English-direct; е/о reduced = older/non-English route |
| 134 | «Англійський звук [æ] … звичайно передаємо українською буквою а : макінтош, спам, чат, хакер … у багатьох словах за традицією цей звук передаємо через е : бізнесмен, менеджер» | — |
| 135 | «Англійський звук [ə:] … відтворюється здебільшого українським буквосполученням ер : серфінг, Берд … Деякі слова, засвоєні українською мовою в транслітерованому вигляді, передають графічну форму відповідних англійських буквосполучень: гамбургер, курсор, Вордсворт, Ірвінг» | -ер ← English -er; -ор ← English -or **or Latin -or** |
| 136 | «Німецьке буквосполучення еі … передаємо через ай (яй): Айзенах, Кайзер, Кляйн …; еu — через ой : фройляйн, Нойбранденбург. За традицією в давніших запозиченнях німецьке буквосполучення еі передаємо в транслітерованому вигляді через ей : крейда, крейцер, маркшейдер, капельмейстер, гросмейстер, штрейкбрехер, Гейне, Лейпциг, Рейн, Швейцарія»; «У запозиченнях з нідерландської мови буквосполучення ij та букву y передаємо через ей : гейзер, дрейф» | ай ← German ei (new), ей ← German ei (old) **or** English ay; Dutch -ей |
| 137 | «Подвоєння букв на позначення голосних в іншомовних власних назвах передаємо подвоєнням відповідних українських букв: Аарне, Аахен, Авраам, Заале, Кааба, Куусінен» | proper names |
| 138 | «Апостроф у словах іншомовного походження … перед я, ю, є, ї … після приголосних б, п, в, м, ф, г, к, х, ж, ч, ш, р: б’єф, комп’ютер, інтерв’ю, прем’єр, кар’єра …; Апостроф не пишемо: 1) перед йо: курйоз, серйозний; 2) коли я, ю позначають пом’якшення попереднього приголосного перед а, у: бязь, бюджет, бюро, кювет» | -'є-/-'ю = French/Latin (-ier, -iu) |

### 2.2 uk.wikipedia article criteria (CC BY-SA) [Q]

* «Полонізм» § «Виявлення полонізмів»: «Ідентифікація полонізма є непростою задачею. Сам по собі збіг українського й польського слів не може бути підставою розглядати його як польське запозичення: вони можуть мати загальнослов'янське походження. На польське походження слова вказують такі ознаки:» — then:
  * phonetic: «Наявність характерних для польської мови неповноголосних сполучень» (trot, tłut, tart: «промінь, стокротка», «длубати, слуп, тлустий», «бардзо, карк, картати, партач, паршивий, тартак»); «Збереження праслов'янського суфікса *dl: бидло, вагадло, верцадло, виделка, їдло, ковадло, кодло, падло, повидло, простирадло, ставидло, чуперадло, шмаровидло»; «Рефлекс праслов'янського *ъ як е: даремний, кепкувати, кревний, нівечити, певний, статечний, тістечко, тутешній»; «Наявність ц на місці: сполучення *tj: залицятися, обіцяти; … *kj: мацати …»; «Початкове є- у корені: єднати, виєднати, поєдинок»; «Рефлекси праслов'янських носових голосних: он, ун на місці польського ą: ксьондз, хорунжий … ен на місці польського ę: венгерець, вензель»; «Наявність звука [g] (замість природного для української мови [ɦ]), де він походить від польських g, k: аґрус, ґанок, ґніт, ґрати, ґудзик»;
  * word-formation: «Наголошений суфікс -ов(ий) у відіменникових прикметниках …: адресо́вий, безпредмето́вий, безтерміно́вий, бензино́вий, вагоно́вий»; «Суфікс -унок: малюнок, подарунок, поцілунок, рисунок, стосунок»; «Суфікс -іст(а), -ист(а): баліста, басиста, органіста, цимбалиста»; «Суфікс -ц(я) на позначення особи переважно чоловічої статі: дорадця, радця, райця»; «Префікс за- зі значенням досягнення результату: заадресувати, забавитися, запомога, запродати, зателефонувати, затитулю(у)вати»;
  * morphology: «Жіночий рід низки галіцизмів — замість чоловічого при запозиченні через російську: ґрипа, девіза, діягноза, екзекутива, екстаза, еліпса, жакета, консоля, редута (проти грип, девіз, діагноз, екзекутив, екстаз, еліпс, жакет, консоль, редут)» ; «Нульове закінчення іменників, які мають закінчення -а у разі запозичення через російську мову: діядем, монополь, теорем, цитат (проти діадема, монополія, теорема, цитата)» — **a direct Russian-vs-Polish mediation test**;
  * adaptation changes: «Поява протетичного звука [ɦ] («г») перед початковим [a]: гармата»; «Заміна польського f на хв, х: хвіртка, хурман»; «Заміна носових ę, ą на українські ен, он (у старих запозиченнях — я, ун): венгерець, вензель, ксьондз, вонпити, пончик, цвях, хорунжий».
* «Полонізм» counts: «За різними оцінками, до полонізмів можна віднести до 1 700 слів у лексиці сучасної української мови, засвідченої у словниках. За всю історію української мови було запозичено близько 17 000 слів з польської.»
* «Англіцизм» § «Особливості»: «Для запозичень з англійської мови характерні: звукосполучення -дж-: бюджет, джаз, джентльмен, джемпер; звукосполучення -ай-, -ей-: гайморит, інсайт, тролейбус, хокей; суфікс -инг (-інг): мітинг, пудинг, демпінг, тюбінг.» Also: «Англізми стали проникати в українську мову в XIX ст. через російську, польську та німецьку мови. З 2-ї половини XX ст. … посилюється процес безпосереднього запозичення».
* «Германізм»: «Такі германізми зберігають типові фонетичні (штуцер, шпиталь, лейтмотив, зумпф, купферштейн) і словотвірні (ландшафт, мітельшпіль, плексиглас, штрейкбрехер) риси німецької мови.»; «Великий приплив германізмів … частково безпосередньо, а значною мірою через польське посередництво, припадає на XIV–XV ст.»; «Пізніше … через російську мову … штат, камертон, концертмейстер, маркшейдерія, феєрверк, швейцар».
* «Тюркізм»: «Тюркізми звичайно характеризуються гармонією голосних (самі передні або самі задні голосні в слові), браком групи приголосних на початку слова і, здебільша, кінцевим наголосом.»
* «Грецизм»: «Велика кількість грецизмів прийшла в українську мову після прийняття християнства через старослов'янські переклади релігійної літератури.» ; «Грецизми переважно усвідомлюються мовцями як чужорідний елемент і зберігають ознаки свого походження.»
* «Латинізм»: «запозичені у XV-XVIII століттях внаслідок вивчення латинської мови в українських школах (абсурд, бурса, вакації, гумор, кримінал, оренда, рація, термін тощо). Частина з них увійшла в українську мову через польське посередництво, менше — через німецьке, російське, французьке».

### 2.3 en.wiktionary entries [Q] (donor/path as the entry states it)

| entry | text |
|---|---|
| -ація | «From la -ātiō … Parsable as -а + -ція.» Usage: «Frequently added to Latinate verbs ending in -ува́ти or -овати, where it replaces the entire suffix. It is often difficult to tell native Ukrainian formations of this sort from those where a Latinate foreign noun ending in -ation (en), -ation (fr), -azione (it) etc. was borrowed directly.» |
| -ізм | `{{ety|uk|:bor|fr:-isme}}`; alt. -изм, -їзм |
| -унок | «borrowed … pl:-unek, from German -ung, remodeled after the Polish diminutive -ek with diminutive -ок … substantive suffix used when rendering or borrowing Polish words which end in -unek (from German -ung), and by extension sometimes when forming nouns from native verbs, e.g. грабунок, застосунок» |
| -ор (Ukr.) | «Etymology 2: {{internationalism}} … neologism: -or, masculine agent suffix mimicking similar in numerous languages» ; syn. «-ер, -атор, -ар, -ач …» |
| університет | «Borrowed from German Universität, from Latin ūniversitās» |
| менталітет | `{{ety|uk|:bor|de:Mentalität}} Compare ru менталите́т` |
| імунітет | «Probably borrowed from German Immunität, ultimately from Latin immūnitās. Compare ru иммуните́т, be імунітэ́т, pl immunitet» |
| комітет | `{{ety|uk|:lbor|la:comitātus}}` |
| рахунок | `{{ety|uk|:bor|pl:rachunek}}` |
| пакунок | «Probably borrowed from Polish pakunek (like пака from paka), [ESUM пака 257] from German Packung. Surface analysis пакува́ти + -у́нок.» |
| маркетинг / аутсорсинг | `bor|en:marketing`, `bor|en:outsourcing` |
| гараж | `bor|fr:garage` |
| комунізм | «Borrowed from Russian коммуни́зм, from French communisme.[ESUM vol. 2 p. 545] With -і́зм suffix.» |
| нація | `bor|pl:nacja` (text=2) |
| екстремізм | «Derived via Western European languages from extrēmus + -ізм.» |
| проєкт | «Borrowed from German Projekt, from Latin proiectus. This spelling (with -єкт-) is officially stipulated in preference to проект [Правопис § 126].» |
| ефір | `bor|grc:αἰθήρ`; alt. етер |
| екстремітет | **404 — no entry in en.wiktionary** [U] |

## 3. Rule table

Columns: **id**; **pattern** (regex on the orthographic lemma); **donor / intermediary hypothesis**; **WK n (share by donor)** = lemmas matching the pattern among the 3 246 Wiktionary-labelled lemmas (multi-label); **core** = matches among our 12 136 core lemma strings; **weight** class: **A** deterministic (≥ 90 % one donor, n ≥ 10), **B** strong (≥ 60 %), **C** weak/family-only, **N** non-discriminating. A rule never outputs a fact; it produces `Claim<loan_path>` with `method`, `p`, and the evidence rows (rule §/quote).

### 3.1 Suffix / ending rules

| id | pattern | donor / path | examples | WK n (donor share) | core | wt | source+quote |
|---|---|---|---|---|---|---|---|
| L-S01 | `[іи]тет$` | Latin -itas via **German -ität** (en.wiktionary) or via Pol. -ytet / Ru. -итет (same surface); **-ет, not -ія** | університет, менталітет, імунітет, нейтралітет, муніципалітет, генералітет, раритет; комітет (Lat.), авторитет (Pl.) | 9: de 7 (78 %), la 2, pl 1 | 0 | B | WKEN «Borrowed from German Universität»; «Probably borrowed from German Immunität … Compare ru иммуните́т, pl immunitet» — **intermediary is not decidable from the form; the Polish and Russian cognates are identical** |
| L-S01b | `[іи]ті$` (final -ті/-ти after а/е: `[аеі]ті$`) | English -ty / -ity (also Fr. -té?) transliterated | Сіті, екстремі-ті (U-27, hypothesis) | WK: 0 | 0 | — | PRAV § 129 I.4 «Канзас-Сіті», I.5 «Після приголосних у кінці слова: візаві, віскі, журі …»; **rule is [P] inferred, no attested noun in -ітi in WK** |
| L-S02 | `[ая]ція$` | Latin -atio; **la 43 %, fr 28 %, pl/de 10 % each** → family "Western", donor undecidable. `-ізація/-ифікація` (fr 60 % / en 40 %) = Fr/Eng neologisms | нація (Pl.), адміністрація (Pl.), агітація (De.), глобалізація (En.), експлуатація (Fr.) | 69 (+10 -ізація) | 9 | C | WKEN -ація: «often difficult to tell native Ukrainian formations … from those where a Latinate foreign noun … was borrowed directly» |
| L-S02b | `[^ая]ція$` (-ція after a consonant: -кція, -нція, -пція) | Latin via Pol./Church-school (XV–XVIII) | протекція, елекція, кореспонденція, інтенція | 35: la 51 %, pl 23 %, ru 17 % | 10 | C | WPUK «Латинізм»: «запозичені у XV-XVIII століттях внаслідок вивчення латинської мови в українських школах … Частина з них увійшла … через польське посередництво» |
| L-S02c | `ейш[еи]?н$` (English -ation) | English direct | — | 0 / core 0 | 0 | — | brief hypothesis; **no attested Ukr. lemma in either WK or core** [U]; PRAV § 133 covers only ей/оу |
| L-S03 | `[іи]зм$` | French -isme (en.wiktionary `bor|fr:-isme`); **fr 67 %** (Russian mediation e.g. комунізм) | пацифізм, лібералізм, імпресіонізм | 46: fr 31, de 5, en 5, ru 3 | 1 | B | WKEN -ізм; комунізм «Borrowed from Russian … from French» |
| L-S04 | `[іи]ст$` | -ist, fr 61 % (all donors share) | таксист (PRAV 129 III.1), баліста (Pl.) | 28 | 17* | C | WPUK Полонізм «Суфікс -іст(а), -ист(а): баліста, басиста, органіста, цимбалиста»; *core 17 are native (лист, піст, міст, хвіст) — require a non-native stem |
| L-S05 | `(ов\|ув)ати$` (verbs) | **-ува́ти ← Polish -ować** (replacing Lat./Ger. verbal suffix); pl 65 %, de 12 %, fr 10 % | будувати, друкувати, касувати, вербувати | 60 | 157* | C | WKEN -ація usage note; *core hits mostly native -ува́ти verbs (бувати, годувати) — **not a loan marker by itself**. Strong only with a foreign stem (R-S05b) |
| L-S05b | `[іи]зувати$`, `ифікувати$` | Pol. -izować / Fr. -iser; | | 2 / 1 | 0 | — | too few to weight |
| L-S05c | `[іи]рувати$` | German -ieren (via Pol. -irować?) **or** Russian -ировать | гравірувати, полірувати (De.), буксирувати (Ru.) | 3: de 2, ru 1 | 1 (вірувати: native) | — | too few; the brief's "-ирувати/-увати (German -ieren)" is **not confirmed** as a donor discriminator: both de and ru occur |
| L-S06 | `унок$` | **Polish -unek ← German -ung**; also extends to native verbs (грабунок) | подарунок, рахунок, ґатунок, пакунок, поцілунок, стосунок | 11 / pl 11 (**100 %**) | 7 | **A** | WKEN -унок (quote above); WPUK «Суфікс -унок: малюнок, подарунок, поцілунок, рисунок, стосунок» |
| L-S07 | `[іи]нг$` | **English -ing** (direct, recent) | маркетинг, мітинг, брифінг, кейтеринг, аутсорсинг | 26 / en 26 (**100 %**) | 0 | **A** | WPUK «Англіцизм»: «суфікс -инг (-інг): мітинг, пудинг, демпінг, тюбінг». Spelling и/і: PRAV § 129 III.1 / I.6 («після т, з, д … и» vs «після б, п, в, м, ф, г, к, х, л, н … і») — e.g. маркетинг, лізинг |
| L-S08 | `мент$` | Latin -mentum; en/ru/pl/fr all ≈ 20 % | елемент, документ, інструмент, менеджмент (En.) | 18 | 9 | N | no donor discrimination |
| L-S09 | `[^а]аж$` | **French -age** (fr 25/27 = 93 %) | гараж, багаж, масаж, монтаж, макіяж (PRAV 125) | 27 / fr 25 | 5* (страж, збараж, таж, продаж native) | **A** (after loan stem) | WKEN гараж `bor|fr:garage`; PRAV § 125 макіяж, ванiль |
| L-S10 | `атор$` | Latin -ator (la 63 %) | сенатор, губернатор, фундатор | 16 | 5 | C | |
| L-S10b | `[^т]ор$` | Latin -or / English -or (PRAV 135 курсор); en 22 %, fr 22 % | автор, ректор; курсор | 23 | 34* | N | WKEN -ор: «neologism: -or, masculine agent suffix mimicking similar in numerous languages» |
| L-S10c | `ер$` | **English -er** 58 %, de 19 %, fr 18 % (менеджер, серфер vs майстер De., інженер Fr.) | менеджер, спікер, пейджер | 124 / en 72 | 34* | B/C | PRAV § 135 «ер» for [ə:]; WKEN -ер «internationalism» |
| L-S11 | `ура$` | Latin -ura (la 30 %, pl 25 %, it/de 15 %) | література, цензура, структура | 20 | 14 | C | |
| L-S12 | `[^аеєиіїоуюя]ія$` | -ia: Latin/Greek (la 33 %, fr 19 %, pl 14 %); **PRAV 129 I.2 «У кінці слова іншомовне -іa передаємо звичайно через -ія»**; Russian-mediated nouns lose it (WPUK «діядем, монополь, теорем, цитат (проти діадема, монополія, теорема, цитата)») | | 239 | 82* | N/C | |
| L-S13 | `[еа]нт$` | Latin -ens/-ans; fr 21–36 % | студент, талант, комендант, документ | 47 | 15 | N | |
| L-S16 | `(ь\|['’ʼ])(є\|ю\|я\|ї\|он)` | French -ier/-ion/-ieu; Latin | кар'єра, інтерв'ю, п'єса, ательє | 23 (fr 39 %, en 26 %) | 74* (native: сім'я, ім'я) | C | PRAV § 138 |
| L-S18 | `[^ауоеиіяюєї]і$` after consonant, stress final, indeclinable | English -y / Fr. -i / It. -i | віскі, таксі, журі, суші, мерсі | 52 (en 37 %) | 87* (native: ні, нині) | C | PRAV § 129 I.5 «візаві, віскі, журі, колібрі, мерсі, парі, попурі, суші, таксі» |
| L-S19 | `(ет+о\|ино\|елло\|ссімо)$` | Italian (-ето, -ино, -ччо) | піаніно, лібрето, скерцо | 3 / it 3 (100 %) | 6 (native: вино, решето) | C | |
| L-S20 | `ет$`, `ета$` | -et(te)/-ette: fr 41–46 % (кабінет, сюжет, банкет), grc 23 % for -ета (планета) | | 63 + 13 | 23 | C | |
| L-S24 | `дло$` | **Polish retention of Common-Slavic *dl** | бидло, ковадло, повидло, простирадло, страшидло, (core: сідло, бидло, кодло) | 5 / pl 5 (**100 %**) | 3 | **A** | WPUK «Збереження праслов'янського суфікса *dl: бидло, вагадло, верцадло …» |
| L-S27 | `(логія\|графія\|граф\|метр\|скоп\|кратія\|фон\|фобія\|філія)$` | Greek combining forms; **donor is the immediate language** (fr/de/en…), Greek only ultimate | аналогія, етимологія, орфографія, аристократія, єпископ | 13 + 9 + 5 + 1 + 2 + 8 | 2+4+0+2+1+2 | C | PRAV § 127 «барометр, діаметр» etc. |
| L-S28 | `(ус\|ум)$` (nouns, 2nd-decl. Latin) | Latin learned (la 55–57 %) | екстремум, ультиматум, консенсус | 44 | 29* (native: ум, розум, шум) | C | |
| L-S31 | `(ак\|ан\|ун\|ур\|уз\|ик)$` + L-F11 | Turkic; tr 26 % of Turkic lemmas vs 3 % of the rest (lift ≈ 9) | чабан, табун, кавун | 133 / tr 32 | 322* | C | WPUK «Тюркізм»: «гармонією голосних …, браком групи приголосних на початку слова і, здебільша, кінцевим наголосом» |

### 3.2 Phoneme / spelling residue rules

| id | pattern | donor / path | WK n (donor share) | core | wt | source |
|---|---|---|---|---|---|---|
| L-P01 | `^ґ`, `ґ` anywhere (common noun) | **old Polish-mediated** (pl 54 %) — or direct modern English/Hungarian (en 29 %, hu 8 %) | ^ґ 24; any ґ 35 (pl 16, en 12) | 4–5: ґвалт, ґречний, ґрунт, ґвалтовний, гураґан | B | PRAV §§ 6, 122.2; WPUK «Наявність звука [g] … аґрус, ґанок, ґніт, ґрати, ґудзик» |
| L-P02 | `^шл`, `^шт`, `шт`, `^ш[пртвн]` | **German (шт- 44 %, шп-, шн-, шв-) / Polish (шл- 56 %)** | `^ш[тпрлвн]` 49 (de 61 %, pl 29 %); шл- 9 (pl 5, de 3) | 38 (шлях, шляхта, што, штука, кошт) | B | WPUK «Германізм»: «штуцер, шпиталь, … штрейкбрехер»; PRAV 136 |
| L-P03 | `^дз` | Polish dz (дзьоб, дзбан); gr. delta/zeta | 3 (pl 2, grc 1) | 5 (дзвін, дзвонити …: **inherited in UA too**, no signal) | N | WPUK «дзбан» listed among «Фонетичні полонізми» |
| L-P04 | `^дж`, `дж` | **English** (75 %) | `дж` 28 (en 21, it 3); `^дж` 9 (en 7) | 9 | B | WPUK «Англіцизм»: «звукосполучення -дж-: бюджет, джаз, джентльмен, джемпер» |
| L-P05 | `(ай\|ей)[^vowel]` | English -ay/-ey (54 %) or German ei (20 %) | 104 (en 56, de 21) | 81 (native: найти, кайдани) | C | WPUK «звукосполучення -ай-, -ей-: гайморит, інсайт, тролейбус, хокей»; PRAV 133, 136 |
| L-P06 | `^ф`, `ф` | non-Slavic (ф is rare in native words); fr 27 %, en 17 %, de 17 %, pl 13 %; **ф ← θ = Greek-via-CS/Ru; т = direct Greek** | ^ф 150; ф 303 | 59 / 112 | C | PRAV 123: «ефір і етер, … міф … і міт, … Афіни і Атени, Борисфен і Бористен» |
| L-P07 | `^(анти\|архі\|гіпер\|гіпо\|мета\|пара\|епі\|ана\|діа\|еко\|гео\|тео\|нео\|аеро\|авто)` | Greek prefixes: fr 33 %, grc 25 % → ultimate Greek, intermediary Western | 52 | 33 | C | |
| L-P08 | `^(транс\|інтер\|контр\|супер\|суб)` | Latin prefixes via English (53 %) | 17 | 12 | C | |
| L-P09 | `^екс?` | Latin ex-/extr- ; fr 38 %, la 33 % | 21 | 2 | C | — **екстремі-**: Latin *extremus* |
| L-P10 | `[бвгґдзклмнпрстфхцчшщ]ю` | French u (бюро, бюджет, кювет) → «-ю- after consonant ≠ native» weak (native любов, людина) | 98 (fr 38 %) | 153* | N | PRAV 138: «бязь; бюджет, бюро, кювет» |
| L-P11 | `(кк\|нн\|лл\|рр\|сс\|пп\|тт\|мм\|бб\|дд)` | double consonant: **learned/old Western relic** | 50 | 301* (native -нн-) | N | PRAV § 128.1 «бонна, білль, брутто, вілла, донна» |
| L-P12 | vowel harmony: all vowels ∈ {а,у,и,о} but no `о`; ≥ 2 vowels | **Turkic** (tr 50 % of Turkic lemmas vs 15 % others, lift 3.3); front-only harmony: tr 4 % vs 7 % (no signal) | 532 | 2078* | C (only combined) | WPUK «Тюркізм» (quote above) |
| L-P13 | initial `ч\|щ\|ж` | Turkic (tr 14 % vs 1 %) – lift 14 but common in native too | 60 | 371* | C | |

### 3.3 Mediation (Russian vs Polish vs direct) tests

| id | test | outcome | source |
|---|---|---|---|
| L-M01 | masculine → feminine in -а (**девіза, діягноза**) vs masculine zero ending (девіз, діагноз) | feminine = Polish-mediated; zero = Russian-mediated | WPUK «Полонізм» (Q) |
| L-M02 | -ия/-ія ending present (**монополія**) vs zero (**монополь**) | present = Polish-mediated; absent = Russian | WPUK (Q) |
| L-M03 | -ація with comparable Ru/Pl cognates | undecidable (Ru реализа́ция, Pl realizacja) | WKEN реалізація: «Cognate with ru реализа́ция, be рэаліза́цыя, pl realizacja» |
| L-M04 | ф vs т for θ (Greek) | ф = via CS/Russian; т = 2019 direct Greek | PRAV § 123 |
| L-M05 | ґ in common noun | old Polish; in names modern imitation | PRAV §§ 122.2–3 |
| L-M06 | ай vs ей for German ei | ай = new direct German; ей = old (Polish/Russian-mediated) | PRAV § 136 |
| L-M07 | е/о reduced diphthong (леді, гол) vs ей/оу | older and/or non-English-direct | PRAV § 133 |
| L-M08 | lemma carries [Rus] flag in other fields (VESUM `:bad` / surzhyk list research/05) | Russian-mediated | research/05 |

## 4. Scoring approach (proposed)

1. **Feature extraction**: apply the rules above to the lemma; produce a sparse vector of rule hits (suffix, prefix, residue, mediation test). Tokens that match the rules must satisfy `lemma ∉ native list` where the rule is flagged `*` (core hits column shows native collisions: -ість, -ик, -ур, -ак … produce thousands of false hits without an "is foreign" gate).
2. **Gate (is_foreign)**: first decide foreignness, then donor. Gate = any A/B rule fired, or ≥ 2 C rules fired, or a Wiktionary/ЕСУМ etymology row says `bor`. All other lemmas are `native/unknown`.
3. **Donor scores**: naive-Bayes log-odds per donor d, `w(rule,d) = log((c(r,d)+α)/(N_d+2α)) − log((c(r,¬d)+α)/(N_¬d+2α))` with α = 0.5 on the WKCAT counts (tables in `rules.json`). Output top-2 donors with calibrated probabilities. Measured: top-1 37 %, top-2 53 % (5-fold CV, n = 3 116, baseline 20 %); **do not display anything below p = 0.6 as a statement** — display "кандидати: Pl 45 % / De 30 %".
4. **Provenance**: Claim `loan_path { donor, intermediary?, method: "LOAN-<rule>", p, evidence:[PRAV §, WPUK/WKEN quote] }`, `kind = "I"` (inferred). If the entry has an etymology row from Wiktionary/ЕСУМ, that row **overrides** (kind "S") and the rule result is shown only as a consistency check (cf. університет: Wiktionary says German, Polish *uniwersytet* is the ЕСУМ-style chain [U]).
5. **Conflict display**: always show intermediary candidates as a set (Latin → [German | Polish | Russian] → Ukrainian) because the surface form is identical (-ітет); the only discriminators in the form are L-M01/L-M02 (Pl vs Ru) and spelling residue (ф/т, ґ, ай/ей).
6. **U-27 UI**: the word card for *екстремітет* / *екстремі-ті* shows: root *extrēmus* (la), suffix *-itas* → paths [-ітет (De/Pl/Ru) | -ті (En/It direct)] and which paths have attestations; unattested forms are labelled «гіпотетична форма (правило L-S01/L-S01b), не засвідчена».

## 5. Wiktionary validation counts (en.wiktionary, 2026-10-12)

| category | members |
|---|---|
| Ukrainian terms borrowed from Polish | 614 (609 single-word, letters only) |
| … French | 691 (690) |
| … English | 510 (506) |
| … German (+ Middle High German 8) | 424 (431 incl. MHG) |
| … Russian | 333 (331) |
| … Latin (+ «learned borrowings from Latin» 10) | 299 (298) |
| … Ancient Greek | 164 (163) |
| … Old Church Slavonic | 128 (121) |
| … Turkish 17 / Tatar 2 / derived from Turkic languages 103 | 121 distinct |
| … Italian | 77 |
| … Dutch / Hungarian | 22 / 17 |

Caveat: these are **editors' labels** (immediate-source bias: «borrowed from German Universität»), incomplete for Ukrainian (a lemma like ґвалт appears under German, not Polish), and `derived from` categories were not used. They validate *patterns*, not individual etymologies.

## 6. Corpus test: our core lemma list

12 136 distinct lemma strings in `lexicon.json` cards. 538 (4.4 %) also occur in a donor category (pl 219, cu 83, tr/Turkic 38, grc 38, de 45, la 42, ru 34, fr 31, en 19, it 5, nl 4, mhg 5, hu 3, tr 2). The core is a **chronicle/old-text lexicon**, so modern international suffixes are nearly absent:

| rule | core hits |
|---|---|
| L-S01 -ітет | **0** |
| L-S07 -інг | **0** |
| L-S02c -ейшн | **0** |
| L-S03 -ізм | 1 («ізм» artefact) |
| L-S02 -ація | 9: нація, асекурація, йотація, протестація, стація, декларація, коронація, реляція, різнація |
| L-S02b -ція | 10: протекція, елекція, кондиція, кореспонденція, станція, інтенція, провінція, резиденція, субстанція, традиція |
| L-S06 -унок | 7: подарунок, фрасунок, ратунок, рятунок, трафунок, поцілунок, трунок (+ риштунки) |
| L-S24 -дло | 3: сідло, бидло, кодло |
| L-P01 ґ | 5: ґвалт, ґречний, ґвалтовний, ґрунт, гураґан |
| L-P02 шл- | 11: шлях, шляхта, шляхтич, шляхетський, шляхетний, шляхетство, шльома, шляпа, шлик, шліфований, шлючи |
| L-P02 шт | 30: што, штука, кошт, каштелян, башта, штани, штурм, муштрувати, арешт, кляштор, кришталь … (some native: што, нарешті, решта) |
| L-S09 -аж | 4 (страж, збараж, таж, продаж — **all native**: the rule needs a stem check) |
| L-S10 -атор | 5: сенатор, губернатор, фундатор, імператор, оратор |
| L-P06 ф- | 59: феодосій, фараон, филип, фома, форма, фантазія, філософ, фундамент, фонетика, фортуна, факт, фортель, фортеця, фрак, фальшивий, фляшка … |
| L-P04 дж | 9 (адже, санджак, буджак, джгут + native -джати forms) |
| L-S27 -логія/-графія | 3: аналогія, етимологія, орфографія |
| L-S20 -ет/-ета | 30: намет, поет, декрет, карета, бенкет, сонет, банкет, мушкет, мінарет, планета … (many native) |

Wiktionary-labelled core lemmas by donor (first items): Polish (219) треба, вельми, теж, хвиля, шлях, власний, замок, перший, певний, вежа, геть, шкура, скарб, поляк; German (45) міна, юра, марка, гурт, поза, трактат, камін, фонетика, проба, штурм, бунт, спис, майстер; Old Church Slavonic (83) господь, віра, піп, пророк, раб, істина, враг, власть, владика, благий; Turkic (38) козак, товар, печеніг, кайдани, туман, кобза, казна, бунчук, люлька, лиман, базар, штани, майдан, казан, ковбаса, талан, беркут; Greek (38) христос, данило, пасха, ангел, дяк, єретик, хор, євангеліє, орган, анафема; Latin (42) руїна, літера, сума, палій, лавр, календар, цвинтар, декрет, статут, цензура, доктор, катедра; French (31) том, міна, пост, талант, тур, ліга, маска, критик, трибунал, фара, банкет, мандат, профіль, роль, фрак; Russian (34) полк, смисл, союз, шов, водка, копійка, скромний, стакан; English (19) степ, коп, гей, пост, порт, рок, чекати, граф, дон, бум, поні, ром.

Findings: (1) the core's foreign layer is mostly **Polish-mediated XV–XVIII century material** (шляхта, ґвалт, -унок, -ція) and **CS/Greek** — the rules L-S06, L-S24, L-P01, L-P02, L-M01 and L-P06 (ф) matter for this corpus; -ітет/-інг/-ейшн matter for the modern UI/extremity case. (2) Rules with `*` need a native-stem gate (list of native -ак/-ан/-ур/-ик words, VESUM) to avoid thousands of false positives. (3) 538 core lemmas already have an independent Wiktionary donor label → ready-made evaluation set for the production scorer.

## 7. Open / [U]

* ЕУМ and ЕСУМ page text not fetched [U]; every rule here is supported by Правопис, Wikipedia (secondary) or Wiktionary (secondary); production claims should add ЕСУМ page + quote when the etymology row exists.
* Whether *університет* is "German" (Wiktionary) or "Polish *uniwersytet*" (typical ЕСУМ practice) is unresolved [U]; the form is identical.
* English -ity → Ukr. -іті/-ити rule L-S01b is an inference from PRAV § 129 only; no attested noun (екстремі-ті) found.
* Turkic harmony is a weak feature (lift 3.3, 50 % recall); Arabic/Persian layer inside «Тюркізм» («переважно з арабської та перської») not separated.
* Rules L-S05 (-ува́ти) and L-S05c (-ірувати) cannot discriminate German vs Polish vs Russian on the current counts; the brief's hypothesis «-ирувати = German -ieren» is **not supported** by data (3 hits).
* No Правопис rule found for -ація / -ізм / -ист / -ітет (the 2019 spelling treats sounds, not suffixes); the table uses WKEN suffix pages and WPUK instead.
