# 04 — Dialect markers for word-form localization (Chernihiv vs Kyiv, plus other Ukrainian dialects)

Status: researched 2026-10-11. Every quote below was checked against the fetched source text. **Q** marks a verbatim quote, with stress marks, superscripts and apostrophes kept as in the source. **P** marks a paraphrase or an inference of ours.

## 0. Sources (keys used in the table)

| key | source | note |
|---|---|---|
| W-EPL | uk.wikipedia «Східнополіський говір» (title «Лівобережнополіський говір» redirects here) | Its literature list cites Железняк, УМ-2000, and АУМ т.1 |
| W-NOR | uk.wikipedia «Північне наріччя української мови». The text matches the УМ-2000 entry «Північне наріччя» by **М. В. Никончук**: http://litopys.org.ua/ukrmova/um161.htm | Checked against the litopys copy |
| W-MDN | uk.wikipedia «Середньонаддніпрянський говір». The text matches the УМ-2000 entry by **П. Ю. Гриценко**: http://litopys.org.ua/ukrmova/um166.htm | Checked against the litopys copy |
| W-SW | uk.wikipedia «Південно-західне наріччя української мови». Literature: Гриценко, УМ-2000 (um159); Бевзенко 1980; АУМ т.2 | |
| W-SE | uk.wikipedia «Південно-східне наріччя української мови». Literature: Железняк, УМ-2000 (um160); Бевзенко 1980 | |
| W-MPL, W-WPL, W-VOL, W-POD, W-NDN, W-BOY, W-HUT, W-LEM, W-SLB, W-STP | uk.wikipedia articles for Середньополіський, Західнополіський, Волинський, Подільський, Наддністрянський, Бойківський, Гуцульський, Лемківський, Слобожанський and Степовий говір | isoglosses cited «за «Атласом української мови»» |
| SHEV | Шевельов Ю. *Історична фонологія української мови*. Харків, 2002 (Ukrainian translation of *A Historical Phonology of the Ukrainian Language*, 1979). Chapters at http://litopys.org.ua/shevelov/shev04.htm, shev06.htm, shev08.htm | |

Not fetched directly: АУМ maps, Бевзенко, Матвіяс. They are cited only through the texts above.

**Transcription (P):** examples use phonetic spelling: `д'ід`, `ў`, acute stress, superscript glides. Before matching, fold accents, keep `ў` as a feature, and unify `'’ʼ`. *diff* markers need the aligned standard form; *regex* markers run on the form alone.

## 1. Marker table (machine-friendly)

Dialect codes:
- North: `CHN` = Східнополіський / Chernihiv, `MPL` = Середньополіський, `WPL` = Західнополіський, `NORTH` = all three.
- South-east: `MDN` = Середньонаддніпрянський / Kyiv-Poltava-Cherkasy, `SLB`, `STP`, `SE` = all three.
- South-west: `VOL`, `POD`, `NDN` = Наддністрянський / Galician, `HUT`, `BOY`, `LEM`, `SW` = all.

| id | dialects | kind | pattern (PCRE, after normalization) | example dialect → standard | source | quote (Q) / paraphrase (P) |
|---|---|---|---|---|---|---|
| N-DIPH-UO | CHN, MPL, WPL (north and Надбужжя) | regex | `у[оôêеиі]` in the root syllable where the standard has `і` < о: `\b\w*(уо\|уô\|уê\|уе\|уі)\w*` | вуол → віл; куін’ → кінь; туôк → тік | W-EPL; W-NOR; W-WPL | Q: «Дифтонги на місці старих «о», «е», «ě» (вуол, піеч, діед)» (W-EPL). Q: «у пн. говірках цієї групи … зустрічаються ще й дифтонги [уо], [уе], [уі], (вуол, муой, вуел, муей, вуіл, куін’ …)» (W-WPL) |
| N-DIPH-IE | CHN, MPL, (WPL relic) | regex | `і[еêе]\|иe\|иê` where the standard has `і` < е/ѣ: `\w*(іе\|иê\|іê)\w*` | піеч → піч; діед → дід; л'іес → ліс | W-EPL; W-NOR; W-WPL | Q: «[ê], іе/[є] в середньополіському говорі та чернігівському діалекті: л’êс — л'есóк» (W-NOR) |
| N-YAT-ALT | NORTH | diff | ѣ gives `е`/`и` in an unstressed slot where the standard has `і`: lemma pair (std `і` ↔ dial `е\|и`) | л'есóк → лісок; сенá → сіна; дидóк → дідок | W-NOR | Q: «у чергуванні і/и, що походять з ѣ, на волинському Поліссі: д'ід — дидóк» |
| N-MONO-UY | WPL, east MPL, LEM, HUT | diff | std `і` < о, е ↔ dial `у\|ÿ\|и` in a closed syllable: `в[уи]л`, `к[уи]н` | кун’, вил → кінь, віл; в**у**з, т**у**к (MPL-east) → віз, тік | W-WPL; W-MPL; W-SW | Q: «виступають здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил …)» (W-WPL) |
| MDN-O-KEPT | MDN (northern subdialects, i.e. the Kyiv-oblast fringe) | diff | std `і` < о ↔ dial `о` in a closed syllable | воз, кóстка, порóг, рáдост’ → віз, кістка, поріг, радість | W-MDN | Q: «переважно у пн. говірках давня фонема [о] в новоутв. закритих складах змінилася на [і] непослідовно, тому тут відзначено форми воз, кóстка. порóг, рáдост’» |
| SW-IKAVISM | SW (all), MDN core | diff | ѣ gives `і` both stressed and unstressed (no е/и alternation) | пісóк, дíло | W-SW | Q: «давній [ѣ] («ять») рефлексувався як у наголошених, так і ненаголошених позиціях (пѣсокъ > пісóк, дѣло > дíло)». P: this is the *negative* marker for NORTH |
| CHN-AKANYE | CHN; rare north SLB | diff | std unstressed `о` ↔ dial `а` | галава́, вада́, пабіегла → голова, вода, побігла; малакó (SLB) | W-EPL; W-SLB | Q: «Акання: ненаголошене «о» → «а» (галава́, пабіегла, вада́)» (W-EPL) |
| UKANYE | MDN, STP, SLB, SW, LEM | diff | std unstressed `о` ↔ dial `у` before a stressed і/у | муги́ла, учкýр, кужýх → могила, очкур, кожух | W-MDN; W-SW | Q: «укання — зміна [о] > [оу], [у] переважно перед складом з наголошеними í, ý … (оуб’íд, муги́ла, учкýр)» (W-MDN). P: weak marker, shared across many dialects |
| CHN-INF-T | CHN (all vowel stems); MDN, SLB, STP (parallel) | regex | `[аеиіяу]т[ь’']$` on an infinitive | гаманіет', бит' → говорити?, бити; ходи́т’ → ходити | W-EPL; W-MDN | Q: «Інфінітивний суфікс -т' при дієсл. основі на голосний (гаманіет', бит')» (W-EPL); Q: «інфінітив має форми на -ти і -т’» (W-MDN). P: for CHN `-т'` is categorical; for MDN it is variable, so it is only a weak CHN signal |
| SLB-INF-T | SLB vs STP | regex | `-ть$` infinitive frequency | сидіть, ходить → сидіти, ходити | W-SLB | Q: «форма інфінітива … сидіти, ходити і сидіть, ходить — сидіть, ходить (форма на -ти виступає рідко)» (second variant = STP) |
| SW-INF-CHY | SW (NDN, WPL, etc.) | regex | `[гкх]?чи$` on a velar-stem infinitive | бігчи, стричи, пе́чи, могчи́ → бігти, стригти, пекти, могти | W-SW; W-NDN; W-WPL | Q: «наявність форм інфінітива на -чи від дієслів з основами на задньоязиковий приголосний г, к, x (бігчи, стричи)» (W-SW) |
| 3SG-HARD-T | POD, NDN (hard `-т`); MDN, SLB, STP (`-т’` vs zero) | regex | II-conj. 3sg `-ит$` (hard) vs `-ит[ь’']$` vs `-е$` | рóбит, нóсит (POD); хóдит (NDN); хóде і хóдит’ (MDN); рóбе, нóсе (STP) → робить, носить, ходить | W-POD; W-NDN; W-MDN; W-STP; W-SE | Q: «Твердість приголосного т у дієсловах 3-ї особи однини і множини теперішнього часу … рóбит, нóсит, рóбл'ат, нóс'ат» (W-POD); Q: «паралельні форми з кінцевим -т’ і без нього (хóде і хóдит’)» (W-MDN) |
| HUT-3SG-ZERO | HUT | regex | 3pl/3sg loses `-т`: `хóдє`, `знат` | вони́ хóдє → ходять; знат → знають | W-HUT | Q: «втрата кінцевого -т у 3-й ос. однини теперішнього часу дієслів II дієвідміни: вони́ хóдє, біжє "ходять, біжать"» |
| SE-TRUNC-3SG | SE (MDN, SLB, STP) | regex | I-conj. 3sg `-а$` instead of `-ає`: `\b(зна\|дума\|пита\|слуха)\b` | зна, дýма, слýха → знає, думає, слухає | W-SE; W-MDN | Q: «широко представлені усічені форми у дієсловах І дієвідміни: зна, гукá, дýма, питá» (W-SE) |
| SE-1SG-NOALT | SE, POD | diff | 1sg with no д/т/з/с → ж/ч/ж/ш alternation: `[дтзс][’']?[уý]$` | вóз'у, хóд'у, крут’ý → вожу, ходжу, кручу | W-SE; W-POD; W-STP | Q: «дієслова 1-ї особи однини — форми типу вóз'у, кóс'у, сид’ý, крут’ý» (W-SE) |
| CHN-DAT-U | CHN, north MDN | regex+morph | masc./neut. Dsg `-у` where the standard prefers `-ові` | д'а́д'ку, селý, дýбу, гáйу → дядькові, селу, дубові | W-EPL; W-MDN | Q: «Закінчення «у» в дав. в. іменників ч., с. р. одн. (д'а́д'ку, селý)» (W-EPL) |
| SW-DAT-OVY | WPL, NDN, VOL-vs-NDN line | regex | Dsg `-ови$\|-еви$` (with **и**, not -ові) | си́нови, брáтови, конéви → синові, братові, коневі | W-WPL; W-NDN; W-VOL | Q: «Поширеність закінчення -ови, -еви в давальному відмінку однини іменників чоловічого роду (си́нови, брáтови, дýбови, конéви …)» (W-WPL) |
| NORTH-ADJ-TRUNC | NORTH (CHN, MPL, WPL); north MDN/SLB (plural) | regex | masc. adjective Nsg ends in `-[иі]$` with no `-й`: `\w{3,}(н\|в\|р\|л)[иі]$` on an adjective POS | дóбри, стари́, си́н'і, пр'іч’íнни → добрий, старий, синій, гарний; краси́ви (MDN-north) | W-EPL; W-NOR; W-MDN | Q: «визначальною рисою залишаються усічені прикметникові форми називного відмінка однини чоловічого роду: пр'іч’íнни ‘гарний’» (W-NOR) |
| NORTH-ADJ-UNCONTR | CHN, NORTH | regex | fem./neut./pl. adjective `-айа$\|-ейе$\|-ийе$\|-ая$\|-еє$` | дóўгайа, жóўтейе, дóбрайа, такéйе → довга, жовте, добра, таке | W-EPL; W-NOR | Q: «членних нестягнених форм ж. та с. р. (дóўгайа, жóўтейе …)» (W-EPL) |
| NDN-ADJ-KIJ | NDN (Galician) | regex | `-кій$\|-хій$` unstressed; `-кєй$` stressed | глибóкій, лихє́й → глибокий, лихий | W-NDN | Q: «на місці давніх сполук ки, хи в ненаголошеній позиції розвинулися сполуки кі, хі (глибóкій «глибокий»), у наголошеній — кє, хє (лихє́й «лихий»)». P: this is the attested basis for the "Galician -ій for -ий" heuristic |
| CHN-INSTR-SHORT | CHN; SLB parallel | regex | Isg fem. `-ой$` beside `-ою` | рукóй, мнóй → рукою, мною | W-EPL; W-SLB | Q: «Паралелізм іменних форм в ор. в. (рукóйу — рукóй, шóстайу — шóстай, мнóйу — мнóй)» (W-EPL) |
| SW-INSTR-OW | SW (NDN, HUT, VOL…); LEM `-ом` | regex | Isg fem. `-оў$\|-еў$` (or `-ов$` in plain spelling); LEM `-ом$` | рукóў, землéў, голов**о́ў** → рукою, землею; жоном, тобом (LEM) | W-SW; W-NDN; W-HUT; W-LEM | Q: «наявність флексії -оў, -еў на місці давніх -оју, -еју … (рукóју > рукóў, рукóм …)» (W-SW) |
| CHN-PRON-NO-N | CHN, SLB-north, STP | regex | pronoun oblique cases without `н`: `\b(з\|до\|у\|на\|коло)\s+(йем\|йійі\|йéйі\|йóго)\b` | до йійі, з йем → до неї, з ним | W-EPL; W-STP | Q: «Займенник 3-ї ос. одн. в непрямих відмінках виступає без початкового «н» (до йійі, з йем)» (W-EPL) |
| FUT-BUDU-INF | CHN (only this type), MDN (parallel with -тиму) | regex | `\bбуду\s+\w+т[ьи’']?\b` | буду рабит', буду слухат' → робитиму, слухатиму | W-EPL; W-MDN | Q: «Складена форма майб. ч. (буду рабит', буду слухат')» (W-EPL) |
| SW-FUT-BUDU-L | SW (NDN, LEM); `му` future in SW, WPL, HUT | regex | `\bбуду\s+\w+(в\|ў\|ла\|ли)\b`; `\b(му\|меш\|ме)\s+\w+ти\b` | бýду писáв, буду робив (LEM), му писáти, му хоуди́ти (HUT) → писатиму | W-SW; W-NDN; W-LEM; W-HUT; W-WPL | Q: «поширення різних форм майбутнього часу (бýду писáти, бýду писáв, писáтиму, му писáти)» (W-SW) |
| SW-PERF-M | NDN, WPL (Надбужжя), SW | regex | past + person clitic: `\w+(в\|ў)(йем\|єм\|ем\|ім)\b`, `\w+ли\s?(смо\|сте)\b`, `\bбим\b` | ходи́ўйім, роби́лисмо, носи́ли сте, даў бим → я ходив, ми робили, ви носили, я дав би | W-SW; W-NDN; W-WPL | Q: «збереження давніх особливих форм праслов'янського перфекта … (носи́вјем, носи́лам, носи́ли смо, носи́ли сте)» (W-SW) |
| SW-SI-CLITIC | SW: `сі/си/се` in NDN, HUT; `ся` free placement across SW; BOY keeps `ся` | regex | `\b(сі\|си\|се\|с'а)\b` as a free clitic, or postposed `-сі$` | ја с'а весел'у; як сі маєте; най-си → я веселюся; як ся маєте | W-SW; W-VOL; W-BOY; W-HUT | Q: «поширення вільного відносно зворотного дієслова розташування форманта с'а (також у формі си чи сі)» (W-SW) |
| SW-ENCL-PRON | SW | regex | `\b(ми\|ти\|мі\|ті\|м'а\|т'а)\b` as enclitic dative/accusative | дав ми → дав мені | W-SW; W-NDN | Q: «збереження давніх форм давального і орудного відмінків однини особового і зворотного займенників мі, ми, ті, ти, си, м'а, т'а, с'а» (W-SW) |
| NDN-A-E | NDN, HUT (Galician-Bukovinian) | diff/regex | `'а` after a soft consonant or sibilant gives `е/і/и`: `ч[іи]с\b`, `[чшж]і\b` | чіс, тел’é, ши́пка, гарьи́чий, сажі → час, теля, шапка, гарячий, сажа; єблуко (HUT) → яблуко | W-SW; W-NDN; W-HUT | Q: «а після м'яких приголосних і шиплячих змінюється на голосний переднього ряду е, і, и (час > чіс …)» (W-SW) |
| SW-KJ-GJ | NDN, HUT, also SLB/STP/MDN in isolated words | regex | `к'?[іє]сто\|ґ'?[іє]д\|ґ'?івк` | ґ'ід, к’íсто, ґівка → дід, тісто, дівка; к'існи́й (MDN) | W-SW; W-HUT; W-MDN | Q: «перехід м'яких приголосних д’, т’ в ґ’, к’ (д'ід > ґ'ід, т’íсто > к’íсто)» (W-SW) |
| HARD-C-FINAL | NDN, south POD, HUT | regex | final `ц$` (no `ь`) in nouns: `\w+[еи]ц$` | хлóпиц, жнец, хлóпеиц, м’íс'ац → хлопець, женець, місяць | W-NDN; W-POD; W-HUT | Q: «втрата м'якості ць у кінці слова (хлóпиц, жнец)» (W-NDN) |
| HARD-R | POD, west STP, VOL (Ternopil) | diff | std `ря/рю` ↔ dial `ра/ру` | бурáк, радóк, расни́й, зорá → буряк, рядок, рясний, зоря | W-POD; W-STP | Q: «Твердість p перед голосними — бурáк, радóк, расни́й, зорá, говóру» (W-POD) |
| R-SOFT-FINAL | MDN, SLB, STP, BOY, HUT | regex | final `р[ь’']$` | гончáр’, кобзар’, лі́кар', звірь (BOY) → гончар, кобзар | W-MDN; W-SE; W-STP; W-BOY | Q: «посилення функц. навантаження [р’] (р’áма, гр'ад, гончáр’)» (W-MDN) |
| EPENTH-L-N | POD, MDN, NDN, SLB | regex | `мн[’']?[ая]\|вл[’']?[ая]` for std `м'я/в'я` | мн’áсо, здорóўл'а, полумн'а → м'ясо, здоров'я, полум'я | W-POD; W-MDN; W-NDN | Q: «Наявність вставних л’, н’ після губних приголосних — рипл’áх, здорóўл'а, жáбл'ачий, корóўл'ачий, мн’áсо, мн’áта» (W-POD) |
| F-TO-X | CHN, MDN, SE | regex | `хв` / `х` for std `ф`: `\bхв\w+`, `\w*х(утбол\|удбол\|абрик)` | худбóл, хва́ра, хвáбрика → футбол, фара, фабрика | W-EPL; W-MDN; W-SE | Q: «Ослаблення «ф» → «х/хв» (худбóл, хва́ра)» (W-EPL). P: socially marked; weak geographic signal |
| CHN-V-W | CHN, NDN, SW | regex | syllable-final `ў` | сваеўбоди, воўлйа → свободи, воля; пóпіў (NDN) | W-EPL; W-NDN | Q: ««в» у кінці складу → «ў» (сваеўбоди, воўлйа)» (W-EPL). P: an artefact of scholarly transcription; standard orthography writes `в` |
| CHN-VOICED-FINAL | CHN (vs SW devoicing) | diff | final voiced obstruent kept vs `т/с/х` (SW, LEM, STP) | зуб, кров (CHN) vs мет ‘мед’ (LEM), міх ‘міг’ (STP) | W-EPL; W-LEM; W-STP | Q: «Збереження дзвінкості кінцевих приголосних (зуб, кров)» (W-EPL) |
| CHN-PREP | CHN | regex | `\b(пóмеж\|помеж\|л'а\|л'е\|заза\|наў\|ік)\b`; `\bк\s+\w+` | л'а ха́ти, заза мнóйу, к бра́ту → біля хати, за мною, до брата | W-EPL | Q: «к(ік)+дав. в. "до" (к бра́ту, ік сталý); л'а (л'е)+ род. в. "біля" (л'а ха́ти, л'е ріечки); заза + ор. в. (заза мнóйу)» |
| CHN-CONJ-DAK | CHN | regex | `\b(да\|дак)\b` | да, дак → та/і, але | W-EPL | Q: «Вживання сполучників да, дак у єднальній та протиставній функціях» |
| MPL-PL1-OM | far-north MPL (and CHN north) | regex | 1pl present `-ом$` | ми несом → несемо | W-MPL | Q: «форма 1-ї особи множини теперішнього часу дієслів І дієвідміни на -ом (ми несом)» |
| MPL-YON | north-east MPL (Kyiv obl.) | regex | `\b(йон\|юн)\b` | йон → він | W-MPL | Q: «приставний звук й у займеннику йон, юн (він)» |
| WPL-YA-E | WPL | regex | `'е/є` for std `я` after a soft consonant; initial `йе` for `я` | вз'еў, т’éжко, йéблуко → взяв, тяжко, яблуко | W-WPL | Q: «у північній частині говору в е переходить наголошений а після й (йéма, йéгода, йéблуко)» |
| CARP-Y | BOY, LEM (also HUT `ы`) | regex | the letter `ы` in a Ukrainian-tagged form; LEM adjective plural `-ы$` | сыны, былы, бы°к, здоровы → сини, били, бик, здорові | W-SW; W-BOY; W-LEM | Q: «у карпатських говорах наявний голосний заднього ряду [ы] (сыны, былы)» (W-SW) |
| LEM-IJ | LEM | regex | `-ий$` for old -и/-і on non-adjectives | колий, гусий, ідий → коли, гуси, іди | W-LEM | Q: «Вимова на місці давніх [ы] та [і] як [ий] (колий «коли», гусий «гуси», ідий «іди»)» |
| LEM-W-L | LEM | regex | `ў` for `л` before a rounded vowel; `в` for `л` elsewhere | пўух, вава, ц'івий → плуг, лава, цілий | W-LEM | Q: «Звук [л] у позиції перед лабіалізованим голосним заступається звуком [ў] (пўух ‘плуг’ …)» |
| HUT-MAJ | HUT (also NDN `-май` suffix) | regex | `\bмай\s+\w+ий\b` comparative | май здорóвий → здоровіший | W-HUT | Q: «вищий ступінь порівняння прикметників твориться, як правило, з допомогою частки май» |

## 2. Lexical markers (signature words, all **Q** from the cited article)

| dialect | words (dialect «gloss») | source |
|---|---|---|
| MDN (Kyiv–Poltava–Cherkasy) | «кл'уйдéриво «дятел», збóрник «очіпок», пшíнка, пшини́чка «кукурудза», ле<sup>и</sup>лéка, лилéґа «чорногуз», … мажáра «великий віз», конóшок «мала дитина», гайшáн «розбишака», вагани́ «ночви», рíпа «картопля»» | W-MDN / УМ-2000 Гриценко |
| NORTH, 'трясовина' | WPL «морóчн'а, стýбла, чáква, тлан’»; MPL «з'д'в'іж, ств’íга, драгá»; CHN (лівобережжя) «тóпкайе балóта» | W-NOR / УМ-2000 Никончук |
| MPL | «горщай» 'гончар', «щавер» 'щавель', «гумно» 'клуня', «стрєла» 'гряділь', «іди дому» | W-MPL |
| CHN | function words: да, дак, пóмеж, л'а, заза, наў (see table); the self-name «Чернігіеўскі дийалйект» | W-EPL |
| VOL vs NDN | «гора — стрих», «кусок — кавалок», «дятел — довбач», «дядько — вуйко», «яблуко — япко», «шо — же», «ся — сі, си, се» (first = VOL, second = NDN) | W-VOL |
| POD vs NDN | «хлів і обора — стайнє», «бестарка — ґара», «радуга — дуга», «кварта — горнє», «ксьов-ксьов і цонь-цонь — цісь-цьов» | W-POD |
| NDN | «вуйко і стрийко» (older generation); «тамто́й» 'той' | W-NDN |
| BOY | «головник (убивця), праще (покоління)»; «їмати» 'ловити' | W-BOY |
| HUT | «Постíў — «леміш у плузі»», «Старин’é — «батьки»»; «половик» 'яструб' | W-HUT |
| LEM | «да» for «де» («дахто, дакому») | W-LEM |
| SLB | «кобýшка — глечик, ри́га — клуня» | W-SLB |
| STP | «бакáй — ‘вибоїна, яма’», «каби́ця — ‘пічка у дворі’», «кирд — ‘велика отара овець’» | W-STP |

## 3. Chernihiv vs Kyiv: a decision recipe (P, derived from §1)

- **CHN, strongest first:** N-DIPH-* > N-YAT-ALT > CHN-AKANYE > CHN-INF-T (categorical) > CHN-DAT-U > NORTH-ADJ-TRUNC/UNCONTR > `буду`+inf > CHN-PREP/DAK.
- **MDN/Kyiv:** ikavism everywhere, `-ові/-еві`, variable `-ти/-т’`, `хóде/хóдит’`, `зна/дýма`, 1sg `вóд'у`, soft `р’`, MDN lexicon.
- **Overlap:** the northern edge of MDN keeps `о` (воз, порóг) and `-у` datives, so these two features cannot separate southern Chernihiv from northern Kyiv.
- **Border (Q, W-EPL):** «по лінії Київ — Прилуки — Конотоп і далі по річці Сейм».

## 4. Shevelov: Kyiv was originally in the Polissian/northern zone

Every item in this section is a **Q** from SHEV (shev04/06/08) unless marked otherwise.

- **Kyiv was Polissian** (shev04, ch. on Proto-Ukrainian dialects): «На сьогодні ще простежується, до того ж досить чітко, розподіл між двома основними реґіонами: Поліссям (північ) та Галичиною (південь і південний захід). Київ увіходить загалом до поліської діалектної зони, як і Волинь, — за єдиним винятком зміни "південного" типу ě > e· (див. 13.7), що нею охоплено, здається, й Київ.»
- **The northern dialect is named "Kyiv-Polissian"** (shev08): «…лише в особливому діалектному утворенні, що ми його умовно називаємо київсько-поліським наріччям. Пізніше це утворення розпалося: його північна частина вступила в процес формування білоруської мови, а південна — української.» The section heading there is «Доісторичні наріччя: північне (київсько-поліське) та…».
- **Depopulation, then return** (shev04): «Друга велика міґрація людності з Наддніпрянщини, зокрема й із Києва … спричинена розореннями … і насамкінець татарської навали 1240 р.» Then: «почався зворотний рух — заселення Київщини й суміжних земель, хоча розпал його припадає на пізніші — середньоукраїнські — часи.»
- **Mixed settlers** (shev06): «серед поселенців були носії всіх можливих українських говірок, як південно-західних, так і північних».
- **Forced removals** (shev06): «усе населення Південної Київщини перегнано на схід від Дніпра, — гетьманом Самойловичем 1678 р. і царем Петром I у 1711-1714 рр.»
- **The old split ends** (shev06): «старий поділ діалектів на київсько-поліські та південно-західні втратив чинність». The south-eastern group «ввібрало в себе й носіїв, і мовні риси обох споконвічних діалектних зон».
- **Caution:** Shevelov does not call this "southwesternization" (shev06, note 3). West Polissia: «на поліську основу накладався південний суперстрат». The south-east: «неможливо виділити якийсь субстрат чи суперстрат».
- **Supporting statement** (W-SE, Железняк): «Середньонаддніпрянський говір має виразну північну діалектну основу.»
- **(P)** W-EPL paraphrases Shevelov 1961, «Чернігівщина в формуванні нової української літературної мови»: Chernihiv speech underlay the oral language of the Hetmanate before the Poltava base displaced it. We have not checked this against the original.

## 5. Attested Chernihiv-region old texts (for provenance seeds)

From SHEV (shev04/06/07), **Q** for the names and dates:
- **Medieval inscriptions**: «чернігівська гривьна (XI ст.) з написом благального змісту»; «напис на келисі чернігівського князя Володимира Давидовича (до 1151)».
- **Hetmanate chancery books**: «Кролевецька ратушна книга (1655-1748 рр.), Остерські актові книги (1656-1668 рр.) … Стародубські актові книги (1664-1673 рр.)»; also «ратушні книги м. Кролевця (до 1748 р.) та м. Погара (1722-1795 рр.), Глухівські цехові книги».
- **Printing**: the press of «Л. Барановича в Чернігові (1679-1721 рр., пізніше відновлена)», and «новгород-сіверська (1671-1679 рр.)».
- **Любецький синодик** (P, uk.wikipedia): «оформлення сягає 1694 року»; lists Chernihiv princes from the 11th–14th centuries. It is genealogical, not dialectal, so use it for onomastics only.
- **Literature (Q, W-EPL):** «Риси чернігівського діалекту наявні у творах Ганни Барвінок, П. Куліша, С. Васильченка, П. Тичини, О. Довженка.»
- **Attested CHN forms (Q, W-EPL/W-NOR):** вуол, піеч, діед, галава́, вада́, нуоч', худбóл, д'а́д'ку, селý, рукóй, мнóй, з йем, дóбри, дóўгайа, жóўтейе, гаманіет', бит', буду рабит', л'а ха́ти, заза мнóйу, тóпкайе балóта.
- **Not found:** no verifiable "Chernihiv Gospel" turned up. Shevelov places most early manuscripts «можливо, в Києві».

## 6. Pipeline notes (P)

- **High precision:** `іе`, `уо` and `ы` are rare in standard spelling. `-ть` infinitives, final `-ц` and `ся/сі` overlap with Russian and Belarusian, so gate those on Ukrainian-language confidence first.
- **Alignment needed:** the *diff* markers (N-YAT-ALT, MDN-O-KEPT, AKANYE, UKANYE, HARD-R) need character alignment against the standard form.
- **Weighting:** weight shared markers low (F-TO-X, UKANYE, R-SOFT-FINAL). Weight single-home markers high (N-DIPH-*, CHN-AKANYE, SW-INSTR-OW, SW-PERF-M, NDN-A-E, CARP-Y, LEM-IJ).
