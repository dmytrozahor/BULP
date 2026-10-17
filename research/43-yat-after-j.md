# ѣ після j і шиплячих; відповідності ѣ у спорідненій лексиці (SPEC 63 DV-4)

Owner (2026-10-16): the word where ять «перейшов у всіх мовах в я», while the derivation gave і. Audit result: the standard R09 (ѣ > і) is wrong for the stative suffix *-ěti* after j and after ж ч ш щ; East Slavic has -ати / -яти there (Proto-Slavic *ě > *a after a palatal, *jě > *ja).

## Sources (fetched 2026-10-17, quotes verbatim)

- Wiktionary, Reconstruction:Proto-Slavic/stojati, Etymology: «From earlier *stojěti, from Proto-Balto-Slavic *stajḗˀtei, from Proto-Indo-European *sth₂éh₁yeti (“to stand”).» Descendants: Ukrainian «стоя́ти», Russian «стоя́ть», Belarusian «стая́ць», Polish «stać», Czech «stát».
- Wiktionary, Reconstruction:Proto-Slavic/ležati, Etymology: «Morphologically leg- + -ěti (stative suffix).» Descendants: Belarusian «ляжа́ць», Russian «лежа́ть», Ukrainian «лежа́ти».
- Wiktionary, Reconstruction:Proto-Slavic/slyšati: «From earlier *slyxěti»; Ukrainian «слиша́ти», Russian «слы́шать», Polish «słyszeć», Czech «slyšet» (Old Czech «slyšěti») — West Slavic keeps e/ě after š.
- Wikipedia, Proto-Slavic, fourth-class verb notes (example *slỳšati): «The infinitive in -ati was a result of iotation, which triggered the change *jě > *ja.» (via page fetch; the same article: «*ě₁ triggers the first palatalization and then becomes *a»).
- uk.wikipedia «Ять» (История): «після палаталізованих задньоязикових приголосних перейшов не в «ять», як в інших позиціях, а в [a]».
- Yat reflexes elsewhere: Wiktionary *bělъ descendants (Belarusian «бе́лы», Ukrainian «бі́лий», Russian «бе́лый», Old Polish «biały», Czech «bílý»); *sěno («се́на», «се́но», «сі́но», «siano», «seno»); *sěděti (Belarusian «сядзе́ць», Russian «сиде́ть», Ukrainian «сиді́ти», Polish «siedzieć», Czech «sedět»). Belarusian я for unstressed ě after a soft consonant is yakanye (en.wikipedia Akanye: «unstressed /e/ and /a/ after palatalised consonants preceding a stressed syllable as /a/»).

## Findings

1. The OES spelling стоѣти / боѣти ся is *stojěti* with j not written after a vowel. Modern forms are стояти, боятися, чаяти, каятися; after ж ч ш щ: лежати, кричати. Not every ѣ after a vowel or a hushing consonant follows this: ѣхати > їхати (initial jě > ї), жѣнка > жінка, чѣмъ > чим, шѣсть > шість keep the R09 reflex. So the rule is limited to the verbal suffix -ѣт(и|ь), and after hushing also -ѣл-; it is lexical (scope L): the R09 branch stays and the lexicon (VESUM) picks.
2. Rule R09j (core/phonology.ts, directly before R09): `([жчшщ])ѣ → $1а` and `([аоу])ѣ → $1я` before ти / ть / ться / ися; hushing also before л.
3. Words corrected by R09j (checked against the unit test): стоѣти > стояти, стоѣть > стоять, боѣти ся > бояти ся, боѣтисѧ > боятися, лежѣти > лежати, лежѣлъ > лежав, кричѣти > кричати, чаѣти > чаяти. Unchanged: видѣти, сидѣти (сидіти, the lexicon form; be сядзець is YC-2), жѣнка, поѣсти, лѣсъ.
4. Not found as a sourced rule: a general «ѣ > а after any hushing consonant» (no).

## Correspondences on cognate edges (core/yat-corr.ts)

YC-1 uk і ~ ru е ~ be е ~ pl ia/ie ~ cs í/e; YC-2 uk и/і ~ be я (unstressed) ~ ru е ~ pl ie ~ cs e; YC-3 after j / hushing: uk а/я ~ ru а/я ~ be я/а ~ pl e/ie ~ cs ě/e. Each row cites the descendant lines above.
