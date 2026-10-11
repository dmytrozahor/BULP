# 02 · Ukrainian morphology: paradigms, data, algorithms

Researched 2026-10-11. Every rule below names its source. Abbreviations:
**П-2019** means *Український правопис* (2019 edition, approved by КМУ постанова №437), read through the section-by-section mirror at `https://slovnyk.ua/pravopys.php?prav_par=N`. **VESUM** means `github.com/brown-uk/dict_uk`. **WP** means uk.wikipedia, article «Відміна».

---

## 1. goroh.pp.ua: what a word card contains

**Sections (tabs)** shown for every word (fetched `/Словозміна/рука`, `/Етимологія/рука`):
Тлумачення · Словозміна · Транскрипція · Римування · Синонімія · Переклад · Частота · Етимологія · Фразеологія · Морфеміка · Анаграми · Слововживання. The URL pattern is `/{Section}/{word}`.

The site's own description, from `/about`: «Горох — онлайн-бібліотека словників для всебічного та зручного дослідження української мови». The "Розділи Гороху" list on that page, verbatim:
> Тлумачення · 508 тис. слів · поповнюється користувачами · Словозміна (орфографічний словник) · 441 тис. статей · Транскрипція (фонетичний словник) · 330 тис. статей · Римування · 3 млн слів · Синоніми · 127 тис. груп · Переклади · 8 мов · Частота · корпус 260 млн слів · Етимологія · 26 тис. статей · Фразеологізми · 26 тис. одиниць · Морфеміка · 817 афіксів · Анаграми · 130 тис. слів · Слововживання (типові помилки)

**The noun paradigm (Словозміна/рука).** Tag chips at the top read «іменник», «жіночий рід», «1 відміна», «тверда група». Each chip links to a filtered list, e.g. `/Словозміна/[1 відміна | тверда група]`. Below them is one table, `<table class="table">`, with the header row «відмінок | однина | множина» and seven rows: називний, родовий, давальний, знахідний, орудний, місцевий, кличний. Each cell holds `<span class='word'>`, and the searched form carries `searched-word`.

| відмінок | однина | множина |
|---|---|---|
| називний | рука́ | ру́ки |
| родовий | руки́ | рук |
| давальний | руці́ | рука́м |
| знахідний | ру́ку | ру́ки |
| орудний | руко́ю | рука́ми |
| місцевий | руці́ | рука́х |
| кличний | ру́ко | ру́ки |

**The verb paradigm (Словозміна/писати).** Tags read «дієслово, особова форма, недоконаний вид, нерефлексивне, 1 дієвідміна». The blocks are Інфінітив (писа́ти, писать) · Наказовий спосіб (пиши́, пиши́-но; пиші́м, пиші́мо; пиші́ть, пишіте) · Майбутній час (писа́тиму … писа́тимуть, plus писа́тимем) · Теперішній час (пишу́, пи́шеш, пи́ше; пи́шем, пи́шемо, пи́шете, пи́шуть) · Минулий час (writing as чол./жін./сер. р. + множина) · Безособова форма (пи́сано). The columns are однина and множина.

**Stress in goroh.** Every form is stressed with U+0301 (COMBINING ACUTE). There is a plausible inference, not confirmed by the site: the variants «писать», «пишіте» and «пишем» match VESUM's `:short`, `:long` and `p:1` short forms exactly (see §2). So goroh's Словозміна likely derives from VESUM or ULIF «Словники України», with stress added. The site credits «"Словники України" on-line».

**Етимологія** quotes ЕСУМ («Етимологічний словник української мови Інституту мовознавства ім. О.О. Потебні НАН України»). Each entry holds prose, then variants, then a correspondence table (Слово / Мова), then bibliography (e.g. «Фасмер ІІІ 515», «Черных ІІ 127»). The page also lists a table of contents of the same-root entries (ви́ручити, рушни́к …). One excerpt: «споріднене з лит. rankа̀, пов’язаним чергуванням голосних з renkа̄, riñkti «збирати»».

---

## 2. VESUM / dict_uk

**License.** The README says, verbatim: «Dictionary data are distributed under "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License"». It also says: «Software is distributed under GPL 3.0 or above.» The **NC** clause matters for any commercial use.

**Downloadable artifacts.** GitHub release **v6.8.6** came out on 2026-09-19 (from the GitHub API):

| asset | size |
|---|---|
| `dict_corp_vis.txt.bz2` | 18.2 MB (**318.8 MB** unpacked, **6,970,759 lines, 442,458 lemmas**: verified locally) |
| `hunspell-uk_UA_6.8.6.zip` / `_nolat.zip` | 1.6 MB |
| `dict-uk_UA_nolat-6.8.6.oxt` (LibreOffice) | 1.9 MB |
| `ukrainian_dictionary-6.8.6-mozilla_nolat.xpi` | 1.6 MB |

The README describes `dict_corp_vis.txt` as «Dictionary in visual (indented) format for review, analysis or conversion». Two more outputs, `words.txt` and `lemmas.txt`, need a local build (`./gradlew expand`, «5G of free RAM»).

**Format of dict_corp_vis.txt.** The lemma sits on a line of its own, followed by its forms indented by 2 spaces. Each line is `form TAGS`, with tags joined by `:`. An optional `# comment` follows the tags. Excerpts, verbatim:

```
рука noun:inanim:f:v_naz
  руки noun:inanim:f:v_rod
  руці noun:inanim:f:v_dav
  руку noun:inanim:f:v_zna
  рукою noun:inanim:f:v_oru
  руці noun:inanim:f:v_mis
  руко noun:inanim:f:v_kly
  руки noun:inanim:p:v_naz
  рук noun:inanim:p:v_rod …
кінь noun:anim:m:v_naz    # xv2 тварина, спорт. прилад; шах. фігура
  коня noun:anim:m:v_rod
  коневі noun:anim:m:v_dav
  коню noun:anim:m:v_dav …
писати verb:imperf:inf    # rv_zna:rv_oru:rv_dav
  писать verb:imperf:inf:short
  пиши verb:imperf:impr:s:2
  пишіте verb:imperf:impr:p:2:long
зелений adj:m:v_naz:compb
  зеленого adj:m:v_rod:compb
  зеленого adj:m:v_zna:ranim:compb
заавансувати verb:perf:inf          (doc/example_indented.txt)
  заавансую verb:perf:futr:s:1
  заавансував verb:perf:past:m
  заавансовано verb:perf:impers
```

There is a variant form with alternative orthography: `заавансованости noun:inanim:f:v_rod:alt`. The tabular format (`doc/example_tabular.txt`) puts form, lemma and tags on one line: `заавансованого заавансований adjp:pasv:perf:m:v_rod`.

**Tagset** (`doc/tags.txt`, Ukrainian glosses quoted):
- POS: `noun`, `verb`, `adj`, `adv`, `advp` (дієприслівник), `prep`, `conj`, `part`, `intj`, `numr`, `noninfl`, `onomat`. Also `adjp` («дієприкметник»), `pron` (with `pers/refl/pos/dem/def/int/rel/neg/ind/gen/emph`).
- noun: `anim`, `inanim`, `unanim` («невизначена категорія истота/неістота»), `prop`, `geo`, `fname`, `lname`, `pname`.
- Cases: `v_naz v_rod v_dav v_zna v_oru v_mis v_kly`. Also `nv` («не відмінюється») and `ns` («множинний іменник»). Number is `s/p`; gender is `m/f/n`.
- verb: `imperf/perf`, `rev`, `inf futr past pres impr impers`, persons `1/2/3`. `short` means «короткі форми дієслів 3-ї особи, інфінітиви на -ть»; `long` means «наказові форми на -іте».
- adj: `compb/compc/comps`. `v_zna:ranim`/`rinanim` mark the animate or inanimate accusative (m and pl only).

**Non-normative flags.** These are the key tags for a provenance lexicon. Quoted from `doc/tags.txt`:

| tag | gloss (verbatim) | lemma count in v6.8.6 (counted by me) |
|---|---|---|
| `bad` | «покруч» | 13,898 |
| `err` (+bad) | «помилкове написання (яке часто зустрічається в текстах)» | — |
| `subst` | «нестандартні форма» | 15 lemma-level (more as form-level `:subst`) |
| `slang` | «сленг та (проф)жаргонізми» | 4,070 |
| `arch` | «застаріле/архаїчне/(інколи) діалектне» | 9,528 |
| `alt` | «альтернативне написання (не за чинним правописом)» | 1,465 |
| `rare` | «другий зн. в. для істот (в президенти), плюс декілька рідкісних форм» | 7 |
| `coll` | «розмовне слово/розмовна форма (наразі не генеруємо на виході)» | — |
| `vulg` / `obsc` | «вульгарне» / «обсценне» | 358 vulg |
| `up92` / `up19` | «за правописом 1992 (на виході конвертуємо в alt)» / «за правописом 2019 (на виході вилучаємо)» | — |
| `var` | «варіативний знах. відм.» | — |
| `:xp1..9` | «омоніми, що відрізняються парадигмою відмінювання (напр. бар - р.в. бару, бар - р.в. бара)» | — |

`doc/nonstandard_items.md` says the `bad` lemmas include «росіянізми - кляча» and «часті помилки написання - біржевий, грунт, експресо». Active participles of the type «існуючий» are tagged `:adjp:actv:imperf`, and gerunds in «-учи» (будучи, хочучи) are `bad` too. VESUM has **no separate "surzhyk" tag**. Russianisms and calques are `bad`, and substandard colloquial forms are `subst` («сьодні, шо, шоби»).

**The source of `bad` with suggested replacements.** This is the best single resource for "why non-normative". It lives in `data/dict/twisters.lst` (878 KB, 9,714 lines). The format is `lemma /affix-flags [:tags]  #> replacement1|replacement2`, e.g.:
```
кляча /n10.p1.<>                            #> шкапа|шкапина|патика|кандиба
міроприємство /n2n.p1                       #> захід
слідуючий /adj :adjp:actv:imperf           #> наступний|черговий|дальший|подальший|другий|такий
співпадати /v2.cf.advp :imperf              #> збігатися|сходитися
```
In the output these lemmas expand with `:bad` on every form (`співпадати verb:imperf:inf:bad`). LanguageTool ships the same mapping as `languagetool-language-modules/uk/.../rules/uk/replace.txt` (8,041 lines, `word=sugg1|sugg2`, LGPL-2.1). Other lexical lists in `data/dict/` are `slang.lst`, `subst.lst`, `arch.lst`, `alt.lst`, `vulgar*.lst` and `invalid.lst`.

**Source dictionary + affix rules.** These are directly portable to TS. `data/dict/base.lst` holds 239,577 lines in the form `lemma /flags :tags`, for example:
```
рука /n10.p1        кінь /n21.a.p.<>     ніч /n30.p       стіл /n21.a.u.p.@
село /n2n.p2.ovi    ім'я /n40.yu.p       рік /n21.zi.p.ke.ikl
писати /v1.cf.advp.isNo :imperf          носити /v1.it1.cf.advp.is0.it1l :imperf
```
`data/affix/n1.aff, n2.aff, n3.aff, n4.aff, v.aff, a.aff…` define the groups (`group n10`, `n20`…`n24`, `n30`…`n32`, `v1`…`v6`). Each rule has the shape `condition:` / `strip add [lemma-regex] # example @ tags`. Verbatim from `n1.aff`:
```
[^жчшщ]а:
а	и		# хата  хати 	                    @ noun:f:v_rod
а	ою		# хата  хатою 	                    @ noun:f:v_oru
га	зі		# допомога допомозі 	          @ noun:f:v_dav/v_mis
[^к]ка:
ка	ці		# ріка  ріці 		          @ noun:f:v_dav/v_mis
```
The chergyvannia rules (`n2.aff`, group n21) use regex back-references:
```
і[бвдгзклмнпрстч]:
і(.)  о\1у     # вибір  вибору                 @ noun:m:v_dav/v_mis/v_kly
ій  ою      # рій  рою        @ noun:m:v_dav/v_mis/v_kly
```
Each rule's `# example @ tags` comment is a ready-made per-form "derivation quote" for the UI.

**Stress in VESUM.** The forms carry **no stress**. Only some comments do (`адресний adj:m:v_naz    # а́дресний; адре́сний`, 1,093 lines). For stress, use `lang-uk/ukrainian-word-stress-dictionary`, `stress.txt` (72 MB): «lists word stresses for 2,931,496 word forms», «We use the COMBINING ACUTE ACCENT (U+0301) … after the stressed vowel». Words with two valid stresses carry two marks («по́ми́лка»). It is «based on "Dictionaries of Ukraine" by ULIF». No license is stated in the README, so check before redistributing it.

---

## 3. Noun declension

### 3.1 Classes
**П-2019 §66 «Поділ на відміни»** gives the classes, quoted verbatim:
- «**І відміна**: іменники переважно жін. і деякі іменники чол. роду, а також спільного роду із закінченнями -а, -я в називному відмінку однини» (вага, гиря, Микола).
- «**ІІ відміна**: а) іменники чол. роду з кінцевим приголосним основи та із закінченням -о … б) іменники середн. роду із закінченнями -о, -е, -я (крім іменників із суфіксами -ат-, -ят-, -ен- у непрямих відмінках)».
- «**IІІ відміна**: іменники жін. роду з кінцевим приголосним основи … слово мати».
- «**ІV відміна**: іменники середн. роду … із закінченнями -а, -я, що у формах родового, давального та місцевого відмінків мають суфікси -ат-, -ят-» (дівча, теля); also ім’я, плем’я, which have two patterns (with -ен- and without).

**Groups**, from **П-2019 §67** and WP «Відміна»:
- Тверда: the stem ends in a hard consonant «(крім тих, основа яких закінчується на шиплячий приголосний)».
- М’яка: «іменники жін. роду із закінченням -я», and in II, «з кінцевим м’яким приголосним основи».
- Мішана: «з основою на шиплячий приголосний» (ж, ч, ш, щ, дж).
- Masculines in -р (§67) need a lexical flag. Most are hard (сир, директор, пасажир). Some are soft (лікар→лікаря, Ігор→Ігоря, those with stress moving to the ending: букваря). Some in -яр are mixed (школяр→школяра, ковзаняр).

Algorithm: classify by gender + nominative ending + final stem consonant. Treat masculine -р, the genitive -а/-у choice and fleeting vowels as **lexical features** stored per lemma, as VESUM does with flags.

### 3.2 Ending tables (from the П-2019 §68 sample paradigms; examples are §68's own)

**I declension** (§68: машина / відмінниця / надія / площа; §74 for the vocative):

| case | тверда sg | м’яка sg | м’яка (V+я) | мішана sg | тверда pl | м’яка pl | мішана pl |
|---|---|---|---|---|---|---|---|
| Н | машин-а | відмінниц-я | наді-я | площ-а | -и | -і | -і |
| Р | -и | -і | -ї | -і | Ø (машин) | Ø+ь (відмінниць) / -й (надій) | Ø (площ) |
| Д | -і | -і | -ї | -і | -ам | -ям | -ам |
| З | -у | -ю | -ю | -у | =Н (inanimate) / =Р (animate) | | |
| О | -ою | -ею | -єю | -ею | -ами | -ями | -ами |
| М | (на) -і | -і | -ї | -і | -ах | -ях | -ах |
| К | -о | -е | -є | -е | -и | -і | -і |

Notes:
- The animate plural accusative equals the genitive (§68: «Знахідний … Оксан», «відмінниць»).
- Genitive plural: «нульове закінчення мають іменники твердої, м’якої та мішаної груп» (**§76**). A few take -ей (мишей, свиней).
- Vocative: «-о властиве іменникам твердої групи … -е набувають іменники м’якої та мішаної груп, є — … після голосного, м’якого знака та апострофа … -ю мають деякі пестливі іменники м’якої групи: бабусю, Галю» (**§74**).
- Dative and locative of г/к/х stems, from **§12** «Чергування Г, К, Х із м’якими З, Ц, С»: «У давальному і місцевому відмінках однини іменників жіночого роду першої відміни: дуга — дузі … квітка — квітці … сваха — свасі». VESUM n1.aff implements this as `га→зі`, `ка→ці`, `ха→сі`.

**II declension, masculine** (§68: козак, тигр / мудрець, обрій / меч):

| case | тверда | м’яка (C) | м’яка (-й) | мішана |
|---|---|---|---|---|
| Н sg | козак, тигр | мудрець | обрій | меч |
| Р sg | -а / -у (§82) | -я / -ю | -ю/-я | -а / -у |
| Д sg | -ові, -у | -еві, -ю | -єві, -ю | -еві, -у |
| З sg | anim =Р, inanim =Н | same | same | same |
| О sg | -ом | -ем | -єм | -ем |
| М sg | -ові, -і, -у (§86) | -і, -еві, -ю | -ю, -ї | -і, -еві, -у |
| К sg | -е / -у (§87) | -ю | -ю | -у / -е |
| Н pl | -и | -і | -ї | -і |
| Р pl | -ів | -ів | -їв | -ів |
| Д pl | -ам | -ям | -ям | -ам |
| О pl | -ами | -ями | -ями | -ами |
| М pl | -ах | -ях | -ях | -ах |

Rules quoted:
- **§82** (genitive singular): «залежно від їхнього значення мають закінчення -а, -я або -у, -ю». Names of beings, concrete objects, trees, machines, units, months and money take -а/-я. Abstract nouns, substances and collectives take -у/-ю. A generator cannot decide this, so **store the genitive ending per lemma**, as goroh and VESUM do; VESUM's `:xp` flag marks paradigm homonyms like бар/бара vs бару.
- **§83**: «-ові (у твердій групі), -еві (у мішаній групі та в м’якій після приголосного), -єві (у м’якій групі після голосного та апострофа) … Ці ж іменники набувають і закінчення -у … -ю».
- **§86** (locative): -і for unsuffixed inanimates («на столі»). -у for stems in «-к-, -ак-, -ик-, -ок-…» («у будинку, на літаку»). Г/к/х alternate before -і (**§12.2**: «байрак — (у) байраці … кожух — (у) кожусі»).
- **§87** (vocative): «-у мають іменники твердої групи, зокрема із суфіксами -ик, -ок, -к(о) … батьку, синку … -ю мають іменники м’якої групи: … вчителю, краю … -е мають безсуфіксні іменники твердої групи … Богдане, … козаче, … хлопче». Before -е, к/г/х alternate with ч/ж/ш (козак→козаче, Бог→Боже; §68 «коза-че»).
- Masculines in -о (батько, Петро) decline hard: батька, батькові, батьком, (на) батькові, voc. батьку (VESUM `group n20`).

**II declension, neuter** (§68: крило / поле, уміння / плече):

| case | тверда (-о) | м’яка (-е) | м’яка (-я, подовж.) | мішана (-е) |
|---|---|---|---|---|
| Н=З=К sg | крил-о | пол-е | умінн-я | плеч-е |
| Р | -а | -я | -я | -а |
| Д | -у | -ю | -ю | -у |
| О | -ом | -ем | -ям | -ем |
| М | -і | -і, -ю | -і | -і, -у |
| Н pl | -а | -я | -я | -і (плечі) |
| Р pl | Ø (крил; сіл with о→і) | -ів (полів) | Ø, double consonant reduced (умінь) | -ей / Ø (плечей, пліч) |
| Д/О/М pl | -ам/-ами/-ах | -ям/-ями/-ях | -ям/-ями/-ях | -ам/-има/-ах |

**III declension** (§68: тінь, подорож, гідність; §§95–96):

| case | sg | pl |
|---|---|---|
| Н=З | тінь / ніч | тін-і / ноч-і |
| Р | -і (variant -и: «гідности, … крови, любови, осени, соли» §95 Прим. 1) | -ей |
| Д | -і | -ям (after a sibilant -ам) |
| О | -ю, with doubling of the consonant: «ніччю, сіллю, тінню» (§95.3.1); no doubling after a cluster: гідністю | -ями / -ами |
| М | -і | -ях / -ах |
| К | -е (тіне, ноче) | -і |

**IV declension** (§68: курча, ім’я):

| case | курча sg | курча pl | ім’я sg | pl |
|---|---|---|---|---|
| Н=З=К | курч-а | курч-ат-а | ім’-я | ім-ен-а |
| Р | курч-ат-и | курч-ат | ім-ен-і / ім’-я | ім-ен |
| Д | курч-ат-і | -ат-ам | ім-ен-і | -ен-ам |
| О | курч-ам | -ат-ами | ім-ен-ем / ім’-ям | -ен-ами |
| М | курч-ат-і | -ат-ах | ім-ен-і | -ен-ах |

### 3.3 Alternations to implement
1. **о/е ↔ і** in the closed syllable. **П-2019 §9.1**: «звуки о, е у відкритих складах чергуються з і в закритих складах: … кінь — коня, камінь — каменя, лід — льоду … ніч — ночі — ніччю … гір — гора, ніг — нога, … сіл — село». In practice the lemma has і, and the oblique forms restore о/е (кінь→коня, стіл→стола). The genitive plural Ø-ending can *create* і (село→сіл, нога→ніг). The exceptions in §9.2 are «коли ці звуки вставні або випадні: вікно — вікон, … день — дня, сон — сну», the groups -ор-, -ер-, -ов- («вовк — вовка»), full-vowel groups (город, берег), «-енн(я)» (значень) and loanwords («агроном, інженер»). These are lexical: **flag them per lemma**, as VESUM does with `n21` vs `n20` and its `ikl` and similar flags.
2. **Fleeting vowel** (е/о «випадні», §9.2.1): день→дня, сон→сну, вітер→вітру. The reverse insertion happens in the genitive plural: казка→казок, сотня→сотень.
3. **г, к, х → з, ц, с** in the I dative/locative and the II locative (**§12**, quoted above).
4. **к, г, х → ч, ж, ш** in the II vocative (козаче, друже; §87 and §68). П-2019 §14, «Чергування Г, К, Х із Ж, Ч, Ш», is in the TOC but was not fetched.
5. **Doubling** in the III instrumental (§95.3.1).

---

## 4. Verb conjugation (П-2019 §115)

**§115.2**, verbatim: «До першої дієвідміни належать дієслова з особовими закінченнями: -у (-ю), -еш (-єш), -е (-є), -емо (-ємо), -ете (-єте), -уть (-ють). До другої дієвідміни належать дієслова з особовими закінченнями: -у (-ю), -иш (-їш), -ить (-їть), -имо (-їмо), -ите (-їте), -ать (-ять).»

| | I (ід-) | I (чу-, after a vowel) | II (бач-) | II (роб-, labial) | II (го-, after a vowel) |
|---|---|---|---|---|---|
| 1 sg | -у | -ю | -у | робл-ю | -ю |
| 2 sg | -еш | -єш | -иш | -иш | -їш |
| 3 sg | -е | -є | -ить | -ить | -їть |
| 1 pl | -емо | -ємо | -имо | -имо | -їмо |
| 2 pl | -ете | -єте | -ите | -ите | -їте |
| 3 pl | -уть | -ють | -ать | робл-ять | -ять |

- **Assigning a conjugation** (§115.3): «Дієслова, які мають в інфінітиві основу на -и, -і (-ї) або на -а (після ж, ч, ш) і в першій особі однини та в третій особі множини … ці голосні втрачають, належать до другої дієвідміни: бачи-ти — бач-у — бач-ать … сиді-ти — сидж-у … крича-ти — крич-у». Also «усі дієслова на -отіти», and «боя-тися, стоя-ти, спа-ти, біг-ти». «Усі інші дієслова належать до першої дієвідміни». Examples: «писа-ти — пиш-у»; «-ува- (-юва-) … втрачають компонент -ва-: буд-ува-ти — буд-у-ю»; «-ну-: кину-ти — кин-у»; «нес-ти — нес-у».
- Labial epenthesis (роблю, роблять) and the д/т/з/с→дж/ч/ж/ш alternation in 1sg (сиджу, лечу) are shown in §115's own samples; §§15–18 cover them in the П-2019 TOC (not fetched).
- **Irregular verbs**: «дати, їсти, відповісти … а також бути … становлять … окрему групу» (§115).
- **Future**: «бути — буду, будеш … + інфінітив», or synthetic «-му, -меш, -ме, -мемо (зрідка -мем), -мете, -муть …: пектиму, пектимеш» (§115).
- **Past**: infinitive stem + -в/-ла/-ло/-ли (писав, писала, писало, писали). This is shown by VESUM `verb:past:m/f/n/p`. §115's past subsection was not fully extracted.
- **Imperative** (§116): «-и, -ім(о), -іть» under stress, after -ну- following a consonant, and after a cluster ending in л/р. Otherwise Ø, -мо, -те: «грай, граймо, грайте; … став, ставмо, ставте».

---

## 5. Existing JS/TS libraries

| package | what it does | license | fit |
|---|---|---|---|
| `shevchenko` 3.2.2 (npm, tooleks) | «JavaScript library for declension of Ukrainian anthroponyms»: `inVocative({gender, givenName, patronymicName, familyName})` → «Тарасе … Григоровичу … Шевченку» | MIT | names only |
| `shevchenko-ext-military` | military ranks | MIT | niche |
| `dictionary-uk` 4.0.0 (wooorm) | Hunspell .aff/.dic built from brown-uk/dict_uk | GPL-3.0 | spell-check only; Hunspell flags carry **no grammatical tags** |
| `nspell`, `hunspell-asm` | Hunspell engines in JS | MIT | could expand forms, untagged |
| `@cspell/dict-uk-ua` | word list | — | no |

I found **no npm library for general Ukrainian inflection or lemmatization** (npm searches: "ukrainian morphology / declension / inflection / lemmatizer / stemmer / nlp"). The alternatives are pymorphy2-dicts-uk (Python), morfologik-ukrainian (Java, LanguageTool) and lang-uk/ukrainian-word-stress (Python). None of them runs in Node without porting.

## 6. Recommendation for the MVP
1. **Data-first.** Preprocess `dict_corp_vis.txt` in Node (it is line-oriented, so a streaming split works). Keep only the lemmas the lexicon needs and emit per-lemma JSON paradigms with the original VESUM tag strings. Show the tags as provenance («VESUM v6.8.6: `руці noun:inanim:f:v_dav`»). Respect CC BY-NC-SA: attribute, use non-commercially, share alike.
2. Join `twisters.lst` `#>` suggestions to every `:bad` lemma. This gives "russianism/calque → normative replacement" with a source line.
3. Add stress from `stress.txt` by matching on the unstressed form. Some forms are ambiguous across homographs, so prefer the stress whose lemma matches.
4. A **rule-based TS fallback**, for words that are not in the subset, implements the tables of §3.2 and §4 above. Run it as the VESUM affix engine does: condition regex → strip/add → tags, and cite the П-2019 § on each generated cell. Store the genitive -а/-у, о/і alternation, fleeting vowel and -р group as lemma flags, never as guesses.

### Sources
- goroh.pp.ua: `/Словозміна/рука`, `/Словозміна/писати`, `/Етимологія/рука`, `/about`
- github.com/brown-uk/dict_uk: README, `doc/tags.txt`, `doc/nonstandard_items.md`, `doc/example_indented.txt`, `data/dict/base.lst`, `data/dict/twisters.lst`, `data/affix/n1.aff`, `n2.aff`, `n3.aff`, `v.aff`; releases v6.8.6
- Український правопис 2019, §§9, 12, 66–68, 74, 76, 82, 83, 86, 87, 88, 89, 95, 96, 115, 116, via slovnyk.ua/pravopys.php?prav_par=N. Caveat: the mirror's duplicated second tables contain typos («гідностж-ю»), so the first copy was used.
- uk.wikipedia «Відміна» (cites Тихоша, Плющ, Караман «Рідна мова 10», 2004; Жовтобрюх et al. «Історична граматика», 1980)
- github.com/lang-uk/ukrainian-word-stress-dictionary (README.en.md, stress.txt)
- languagetool-org/languagetool, `uk/.../rules/uk/replace.txt`
- npm registry: shevchenko, dictionary-uk; github.com/tooleks/shevchenko-js README
- Not consulted directly: Вихованець and Городенська's «Теоретична морфологія української мови». The rules above rest on П-2019 instead.
