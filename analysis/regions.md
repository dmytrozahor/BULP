# Witness regions: N and witness count per region (SPEC 63 CX-5)

Computed from `public/data/corpus.json` (before = `git show HEAD:public/data/corpus.json`, after = the CX-5 build of 2026-10-15) with `regionOf` from `pipelines/regions.ts`.
N = tokens of admitted witnesses whose `region` string maps to the row (a witness counts in ONE row). Region = witness region (place of writing/printing, or the milieu a folk collection names on its title page), NOT a dialect claim (SPEC 20 B-3.6).
Caveat: "before" is the committed HEAD build; the working tree also carried uncommitted changes of other agents, so the Київ / Галичина rows differ slightly for reasons other than CX-5.

| регіон | witnesses до | N до | witnesses після | N після |
|---|---:|---:|---:|---:|
| Київ і Київщина | 1827 | 402843 | 1826 | 400246 |
| Галичина | 6 | 155945 | 7 | 156381 |
| Волинь | 2 | 31885 | 5 | 45268 |
| Лівобережжя | 3 | 51056 | 3 | 51056 |
| Полтавщина | 2 | 25035 | 2 | 25035 |
| Чернігівщина | 2 | 24681 | 2 | 24681 |
| Слобожанщина | 1 | 31972 | 3 | 99675 |
| Запоріжжя | 0 | 0 | 0 | 0 |
| Херсонщина | 0 | 0 | 0 | 0 |
| Катеринославщина | 0 | 0 | 2 | 9349 |
| Одещина | 0 | 0 | 1 | 7374 |
| Таврія | 0 | 0 | 0 | 0 |
| Донеччина | 0 | 0 | 0 | 0 |
| Луганщина | 0 | 0 | 0 | 0 |
| Черкащина | 0 | 0 | 1 | 2504 |
| Кубань (історична територія) | 0 | 0 | 1 | 19211 |
| other historical territories (Берестейщина … Курщина, 11 rows) | 0 | 0 | 0 | 0 |
| region not drawn (unset, composite or disputed string) | 88 | 265353 | 82 | 244773 |

Corpus total: N 988 770 -> 1 085 553 tokens, witnesses 1931 -> 1935, 75.6 % linked after.

## Added (6 witnesses, +96 783 tokens)
| id | region | tokens | linked |
|---|---|---:|---:|
| yavornytsky1912 | Катеринославщина | 4 020 | 92.2 % |
| yavornytsky1923 | Катеринославщина | 5 329 | 95.8 % |
| pyven1906 | Кубань | 19 211 | 81.5 % |
| komarova1905 | Одещина | 7 374 | 78.9 % |
| sumtsov1918 | Слобожанщина | 3 690 | 87.2 % |
| bahaliy1918 | Слобожанщина | 64 013 | 88.9 % |

## Region metadata fixed (place known from the witness's own date quote, previously unset)
i14_17, i14_27, i14_36 -> Волинь (Острог); i14_39 -> Галичина (Львів 1609); i14_16, i14_29 -> Вільно (no map row); o18_17 -> Черкащина (Ключ Уманський); o18_27 -> Київ (Київська академія); hrinchenko1908 -> Київщина (edit sits in the working-tree manifest.ts, not in the data above; see research/39).

## Still empty on the map
Запоріжжя/Січ, Херсонщина, Таврія, Донеччина, Луганщина (reasons in research/39).
