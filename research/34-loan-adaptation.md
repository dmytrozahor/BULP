# 34 — Adaptation of foreign words (SPEC 63 LA-1)

Retrieved 2026-10-14. Rules are in `core/loan-adapt.ts` (LOAN_RULES); each has a verbatim quote + locator. Where a published text states no rule, none is added.

## Sources read
- Український правопис (2019), розд. «Правопис слів іншомовного походження», §§ 121–140 (https://slovnyk.ua/pravopys.php?prav_ver=2019&prav_par=N). Stress marks in the page markup are dropped from quotes.
- en.wiktionary (CC BY-SA 4.0): -ity, -able, -ability, Ukrainian -ація, -ізм, -ичний, університет.
- Not reachable / not used: academic PDFs (Жабокрицький–Дзира, КНУТД; ЛНУ «Україністика») — binary PDF, no text extractor on the host; uk.wiktionary has no suffix entries and no entries for the user's words; Словник іншомовних слів (nmetau.edu.ua/file/126.pdf) not read (PDF).

## Rules found (engine)
| id | Ukrainian | source | route | evidence |
|---|---|---|---|---|
| LA-itet | -ітет | -ity (лат. -itas, нім. -ität) | latin | EWIKT університет: «Borrowed from German Universität, from Latin ūniversitās, ūniversitātis.»; EWIKT -ity: «from Latin -itātem, from -itās» |
| LA-iti | -іті | -ity | direct-en | EWIKT -ity: «/əti/, /ɪti/»; PRAV § 129 I.5: «Після приголосних у кінці слова: візаві, віскі, журі, …» |
| LA-acija | -ація | -ation/-atio | latin | EWIKT -ація: «From Latin -ātiō, an alternative form of -tiō.» |
| LA-izm | -ізм | -ism | latin | EWIKT -ізм: «Borrowed from French -isme.» |
| LA-ichn | -ичн-/-ічн- | -ic | graphic | PRAV § 33 п. 2 («пишемо похідний суфікс -ичн- (ий)»); EWIKT -ичний |
| LA-abelnist | -абельність | -ability | graphic | EWIKT -ability: «… from Latin -abilitas, -ibilitas» |
| LA-abeln | -абельн- | -able (лат. -ābilis) | graphic | EWIKT -able: «borrowed from Old French -able, from Latin -ābilis» |
| LA-ejbil | -ейбіл- | -abil- read as «able» | phonetic | PRAV § 133 («імітуючи їхнє звучання в мові оригіналу, через ау, ей, оу»); EWIKT -able (paraphrase: confusion with the word able) |
| LA-abil | -абіл- | -abil- (лат. -abilis) | graphic | EWIKT -ity: «Final -ble changes to -bil before this suffix due to its Latin origin»; PRAV § 134 («звук [æ] … передаємо українською буквою а») |

## LA-4 additions (2026-10-15)
| id | Ukrainian | source | route | evidence (en.wiktionary, quotes machine-checked against the live page) |
|---|---|---|---|---|
| LA-cija | -ція | -tion | latin | -ція: «abstract noun-forming suffix: -tion (used in adapted borrowings of Latinate nouns ending in -tion)»; «Ultimately from Latin -tiō.» |
| LA-ing | -інг/-инг | -ing | direct-en | маркетинг «Borrowed from English marketing.»; моніторинг «… monitoring.»; тренінг «… training.» |
| LA-ment | -мент | -ment | direct-en | менеджмент «Borrowed from English management.»; -ment «From Middle English -ment, from Old French -ment, from Latin -mentum.» |
| LA-izuvaty | -ізувати/-изувати | -ize | latin | модернізувати «From French moderniser + Ukrainian -ува́ти (-uváty).»; -ize «from Middle French -iser, from Late Latin -izāre, from Ancient Greek -ίζω (-ízō)» |
| LA-ist | -іст/-ист | -ist | latin | -ist «from Old French -iste and Latin -ista, from Ancient Greek -ιστής (-istḗs)»; програміст «From програ́ма (prohráma) + -і́ст (-íst).» |
| LA-er | -ер | -er (агентивний) | direct-en | -ер «masculine agent suffix mimicking similar in numerous languages»; ліфт + -ер → ліфтер. Fires only if the stem is itself a word (else тепер, вітер…). |

Calques: slovnyk.ua (СУМ-11) has «застосовність — Можливість застосувати, використати що-небудь» and has no entry аплікабельність, but no dictionary found pairs applicability ↔ застосовність or -ability ↔ -ність (searched en.wiktionary, slovnyk.ua, web: no bilingual entry). So no equivalent is asserted. Academic PDFs (journals) remain unreadable on this host; no HTML copy found for suffix correspondences.

## Rules read but not engine-detectable (no firing pattern)
- PRAV § 128 п. 1: «У загальних назвах іншомовного походження букви на позначення приголосних звичайно не подвоюємо» (appl → апл); п. 2 prefix doubling kept (іммігрант).
- PRAV § 129, § 130, § 134 (a/е for [æ]: «у багатьох словах за традицією цей звук передаємо через е»), § 140 (indeclinable loan nouns -і/-у/-о…).

## Not added (no source found)
calque equivalents (застосовність for applicability: no dictionary row ingested; the engine shows an equivalent only from a dictionary row).

## The five words (SL-1 words)
- всм — not a loan adaptation (abbreviation of «в сенсі/в смислі»; see research/33). No LA rule fires.
- екстремітет — екстрем… + -ity, LA-itet, Latin/German route (cf. університет ← Universität).
- екстреміті — екстрем… + -ity, LA-iti, direct English.
- аплікейбіліті — аплік… + -abil-ity: LA-iti + LA-ejbil, phonetic ([eɪ] → ей, § 133).
- аплікабіліті — аплік… + -abil-ity: LA-iti + LA-abil, graphic (letter a → а, § 134; -bil- from the Latin form of -able before -ity).
