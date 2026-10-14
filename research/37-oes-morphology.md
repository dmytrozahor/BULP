# 37 — Old East Slavic inflection spellings: aorist, imperfect, long adjectives (SPEC 63 PV-8)

Researched 2026-10-15. **[Q]** = verbatim from a page I downloaded myself (`curl`, windows-1251 decoded; the site's font glyph «Ђ» stands for ѣ, «Ж (юс великий)» for ѫ — here written as ѣ / ѫ). **[Q\*]** = verbatim as returned by the fetch tool for uk.wikipedia / en.wiktionary (secondary, CC BY-SA; a model-summarised fetch: re-check before relying on wording).

## 1. Sources found
| id | work | locator |
|---|---|---|
| ENC | Українська мова. Енциклопедія. К., 2000, статті В. М. Русанівського | http://litopys.org.ua/ukrmova/um152.htm «Аорист»; um101 «Староукраїнська мова … граматика»; um102 «Староукраїнська літературна мова»; um27 |
| WUK | uk.wikipedia «Імперфект», «Аорист», «Давньоруська мова» (3.2.2) | https://uk.wikipedia.org/wiki/Імперфект etc. |
| EWIKT | en.wiktionary, entry «хвалити» (Old Church Slavonic conjugation table) | https://en.wiktionary.org/wiki/хвалити |

Not found online in citable form: ЕУМ has no «Імперфект» or «Повні прикметники» article (all 520 ЕУМ pages scanned); izbornyk.org.ua/istgram does not exist (the home page lists only Русанівський, Німчук, Ужевич, ЕУМ as grammar works).

## 2. Aorist
- [Q] ENC um152: «У праслов'ян. мові збереглися форми тематичного кореневого і сигматичного (із суфіксом -ş- , який ще в праслов'ян. період перейшов у -x- , що у відповідних фонет. умовах дав -ш- ) А.» — table: тематичний кореневий «могъ | могомъ», «2 ос. може», «3 ос. може | могѫ»; сигматичний «знахъ | знахомъ», «3 ос. зна | знаша»; новий «несохъ | несохомъ», «3 ос. несе | несоша».
- [Q] ENC um152: «У давньорус. мові від дієслів з основою або коренем на голосний утворювалися форми старого А. (сътворихъ, видѣхъ), а від дієслів з основою на приголосний — форми нового А. (рѣкохъ, несохъ, идохъ). До традиц. закінчень у 3-й ос. одн. і мн. могло ще додаватися закінчення -ть : несеть, сьтворить, несошать, створишать.»
- [Q] ENC um101: «аорист — хвалихъ, рѣхъ; імперфект — несѣахъ».
- [Q\*] WUK «Аорист»: 1sg «быхъ, бѣхъ, хвалихъ»; 1pl «быхомъ, бѣхомъ, хвалихомъ»; 3pl «бышѧ, бѣша, хвалишѧ»; new aorist «двигохъ, рекохъ, вѣдохъ», 3pl «двигошѧ»; быхъ paradigm: sg «быхъ, бы(стъ), би», pl «быхомъ, быстє, бышѧ».
- [Q\*] EWIKT хвалити (OCS): aorist sg «хвалихъ; хвали (2, 3)»; pl «хвалихомъ, хвалисте, хвалишѧ».
- Reading used by the rule: 2sg/3sg aorist = bare stem + «е» (несе, може) or «и» (хвали); 1sg -хъ/-охъ; 1pl -хомъ/-охомъ; 3pl -ша/-шѧ/-оша. Tense and person come from the Stanza ORV feats (model output); the rule only adds the ending + stem corroboration.

## 3. Imperfect
- [Q\*] WUK «Імперфект»: «шляхом додавання закінчень -ахъ, -аше до основ інфінітива, якщо вона закінчувалася на -а чи -ѣ, тобто: зна-ти > зна-ахъ, видѣ-ти > видѣ-аше»; «-ѣахъ, -ѣаше»; «писааховѣ, писаахомъ, писаахѫ»; «сполука -аа- надалі скоротилася в -а-»; «писахъ, писаше, писаховѣ, писахомъ, писаху». OES example: «А древляне живяху звѣриньскимъ образомъ, жиуще скотьски: убиваху другъ друга, ядяху вся нечисто».
- [Q\*] EWIKT хвалити: imperfect «хвалꙗахъ / хвалꙗаше / хвалꙗахомъ / хвалꙗашете / хвалꙗахѫ».
- Reading used: -ахъ/-ахомъ/-аше/-аху/-яху (+ -ѣахъ).

## 4. Long (compound) adjectives and genitive endings
- [Q\*] WUK «Давньоруська мова» 3.2.2: «Прикметники мали іменну й займенникову форми (якісні — добръ, добрыи; відносні — камѧнь, камѧный; вищий ступінь порівняння — добрѣи, добрѣишии)».
- [Q] ENC um102: «У відмінюванні прикметників трапляється в род. в. одн. ч. р. традиц. церковнослов’ян. закінчення -аго (лоеваго, неумытнаго, хр(с)толюбиваго), хоч переважає укр. -ого (цѣлого, литовского, милого, милостивого, написаного, ночного); у род. в. одн. ж. р. прикметників і прикм. займенників виступає закінчення -оѣ / -еѣ, -оі/-еі, де кінцеві ѣ, і позначають йотований [і]: кривавоѣ, мокроѣ, молдавскоѣ, нашеі, никакоѣ, освеценоі, рускоѣ, вашеѣ.»
- Reading used: gen. sg. m./n. -аго → -ого; nom. sg. long -ыи/-ии → -ий/-ій.

## 5. Not found (no rule implemented)
-ыимъ/-ыимь instrumental/dative long forms, -ыя/-ыѣ, -ую/-ыю, gen. fem. -еа/-ыя as OES spellings, participles -въ/-вши/-щ-, dat. pl. -омъ/-емь paradigm statement beyond PAVL p. 75 (research/11 §2): no verbatim description retrieved. Jer loss and ѣ → і are already covered by core/phonology.ts rules (Шевельов, research/03).
