# R39 - CX-5: south and east witnesses (SPEC 63, user 2026-10-15)

Fetched 2026-10-15. Quotes are verbatim from the cited page; archive.org OCR quotes keep the OCR errors.

## Added (all uk.wikisource, proofread scans, public domain)
| witness | region | P-2 / institutional evidence (in pipelines/nw-cx.ts) |
|---|---|---|
| Яворницький, Як жило славне запорожське низове військо, Катеринослав 1912 | Катеринославщина | «Паланка слово не наше: з турецькоі на украінську мову — фортець, чи хоч кріпость.» |
| Яворницький (зап.), Оповідання столітнього діда про Запорожців, Львів 1923 | Катеринославщина (запис 1888, Чернишівка; друк Львів) | «В селі Чернишівці, катеринославського повіта (по правім боці Дніпра, недалеко острова Томаківки , де колись була Січ) проживав у 1888 р. Іван Розсолода» |
| А. Півень, Веселымъ людямъ на втиху!, Москва 1906 | Кубань (за титулом; друк Москва) | «Сборникъ малороссійскихъ веселыхъ разсказовъ, пѣсенъ и стихотвореній изъ быта Кубанскихъ (Черноморскихъ) казаковъ, а также и изъ другихъ источниковъ.»; «Эй, нумо, браття, славни чорноморци, Ворони кони сидлаты,» (institutional author folk_kuban, provisional) |
| Г. Комарова, Починок, Одеса 1905 | Одещина | «Нашъ бидный край безъ слова замиравъ,» (Т. Шевченко, в XL роковини, с. 68) |
| М. Сумцов, Слобідсько-українські історичні пісні, Черкаси 1918 | Слобожанщина (за титулом; друк Черкаси) | «…а на Україні Російській, де зібрані найголовніші матеріяли» |
| Д. Багалій, Історія Слободської України, Харків 1918 | Слобожанщина | «Слободська Україна — се одна з частин нашого рідного краю України.» |

Bahaliy: chapters that are mostly quoted chancery documents are skipped (Автономія, Вибори до Єкатерининської Комисії, Земельна власність, Соціальний устрій), as are the bibliography, maps and figure captions.

## Skipped, with reason
- Карпенко-Карий, Кропивницький (Херсонщина/Єлисаветград): Wikisource has only 1910s-1930s prints; no fetched quote gives the place of writing or the author's self-identification.
- Руданський (Ялта, Таврія): Wikisource texts are Lviv prints (1912-1921); no per-text place-of-writing quote.
- Сковорода (Слобожанщина): Wikisource has only Хоткевич 1920 (modernised retelling with quotations in non-Ukrainian), language gate.
- Гулак-Артемовський, Метлинський poems, Щоголів: only inside the 1922 Kyiv anthologies («Струни», «20-40-ві роки», modern spelling); original editions are not on Wikisource.
- Квітка-Основ'яненко, «Малороссійскія повѣсти», Харків 1887 (ред. Потебня), user request CX-6: no copy found (archive.org advancedsearch, 7 queries, 0 relevant hits; Wikisource has only «Твори», Львів 1911, желехівка). Not vetted or ingested. A parallel agent (CX-6, nw-pum.ts) is working in the same area.
- Сумцов, «Слобожане», Харків 1918 (archive.org/details/slobozhane): OCR only (slobozhane_djvu.txt, no proofread layer; title OCR'd «СЛОБОЖННЕ», text «Собожанщина»). Not ingested. Sumtsov is vetted through the proofread 1918 songs above. OCR quotes, printed p. 4 (leaf 6): «Україна--великий, просторий і ріжноманітний край: її окремі частини в зпачній мірі розріжняються поміж себе. Зв'язує їх мова, де-які етнографичні головні прикмети і почасти історичні традиції»; «Навіть в межах самої Слобожанщини нема повної цілости природи і народнього життя, і тут нарід далеко не одноманітний. В усіх галузях життя помітна ріжниця між лісовими і степовими повітами.» No statement on the extent of Slobozhanshchyna or on Slobozhan speech was found by OCR search; this needs a human read of the scan.
- Метлинський, «Народныя южнорусскія пѣсни», Київ 1854 (archive.org/details/pisni1854, two volumes): scan with IA OCR only. The OCR is unusable (sample: «іщ языкѣ линей», «Эго тѣ восирішічішые») and the apparatus is Russian, so separating the songs needs page-level proofreading. Not ingested. P-2 evidence for Метлинський exists on Wikisource but no author record was added: «Обізвався батько рідний, Що умер за козаків» («Рідна мова», «20-40-ві роки в українській літературі», Київ 1922, ред. Дорошкевич).
- Донеччина, Луганщина, Запоріжжя/Січ (Архів Коша), Херсонщина, Таврія: no public-domain Ukrainian text with a place-of-writing quote found on Wikisource or izbornyk (searches: Донбас, Луганськ, Маріуполь, Бердянськ, Таврія, Херсон, Єлисаветград, Запорожская старина, Срезневский). Кош documents are not in the izbornyk old17/old18 indexes (research/21).
- Яворницький «Словник української мови» (Катеринослав 1920): headwords with Russian glosses; not ingested as running text.

## Code
pipelines/regions-cx.ts (south/east region rows); pipelines/regions.ts imports it (that file also carries MP-2's uncommitted territory rows); pipelines/ingest-wikisource.ts (skip and author rules); pipelines/nw-cx.ts (units and authors); region strings added to nw-izb14a/14b/18a/18b.
