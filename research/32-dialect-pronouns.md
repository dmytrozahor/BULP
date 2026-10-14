# R32 — Dialect demonstrative pronouns (тамтой, тот/тота/тото, сесь, отой, оцей) — SPEC 63 DP-1

Status: research report (2026-10-14). Tags: [Q] verbatim quote checked against the fetched text, [P] paraphrase, [U] not found / unknown. Evidence rule: SPEC 00 (no quote = unknown; witnesses only by self-identified Ruthenian/Ukrainian authors, P-2).

Question (user 2026-10-14): *«Variation тамтой and others … should also be derived and shown and maybe there's an evidence it's a feature for Ukrainian Western dialects?»*

## 0. Answer in short

1. **тамтой is evidenced in the Western dialects, but not as an exclusively Western feature.**
   - Western: Лемківський словничок lists «тамтой (тамтому) - той (тому)» (lemko.org, §2.4); the uk.wikipedia article «Наддністрянський говір» lists «вказівного займенника тамто́й «той»» among the grammatical features of the Nadnistrian говір (§2.5); our corpus first has the whole paradigm in Franko's Galician *Boa Constrictor* (1884).
   - Not only Western: Грінченко's entry (§2.1) carries no region label and cites Hrinchenko's own Chernihiv materials («Грин. III. 323», whose list of sources says «собранные въ Черниговской и сосѣднихъ съ ней губерніяхъ»), Hnatiuk's Galician legends («Гн. ІІ. 65») and Sheikovsky's southern-Rus dictionary («Шейк.»); our corpus has «тамтая» already in the Left-Bank *Samovydets* chronicle, 1672–1702 (§3).
   - Normative treatment: Синявський lists it as declined like той («Як той відмінюється отой, тамтой, як цей – оцей та сей», §2.6), VESUM carries it as an ordinary lemma (36 forms in our data), so for the lexicon it is a *regional-colloquial variant*, not a «Western-only» marker.
2. **Specific Carpathian forms** (not тамтой): Boyko тот/тота/тото(тоте)/тоти and сей (сесь)/ся (сеся)/се (сесе) — ЕСУ «Бойківський говір» (§2.3); Синявський lists the same forms as «по народніх говорах» variants without area (§2.6).
3. **Polish/Slovak contact**: no source consulted says that тамтой is a borrowing from Polish *tamten* / Slovak *tamten*; the similarity is not evidence → [U], not asserted (SPEC 63 DP-1: «only if a source says so»).
4. **Not found at all (reported as unknown, not derived):** тамта/тамто as separate headwords, гевтой, гетот, тотой, той-во, ов/она as dialect variants of той — no source with quote located (searched hrinchenko.com, uk.wiktionary API, goroh ЕСУМ, lemko.org, ЕСУ).

## 1. Sources actually read

| Id | Source | Locator | Access |
|---|---|---|---|
| HRINCH | Грінченко, Словарь української мови, 1907–09 | `https://hrinchenko.com/dictionary/word/{id}-{slug}`; abbreviation list `https://hrinchenko.com/sources` | raw HTML (JSON-LD `description` = entry text) |
| ESUS | Енциклопедія сучасної України, т. 3 (2004), «Бойківський говір», автор Я. К. Радевич-Винницький | `https://esu.com.ua/article-36048` | raw HTML |
| LEMKO | Лемківський Словничок (lemko.org) | `https://lemko.org/lemko2/slovnyk.html` | raw HTML |
| WUK | uk.wikipedia «Наддністрянський говір» (pageid 765780), розділ «Граматика і словотвір» | `https://uk.wikipedia.org/wiki/Наддністрянський_говір` | MediaWiki API, plain text |
| SYNYAV | Синявський О. Норми української літературної мови (1941), розд. 5 «Словозміна. Займенник», §§ 59–62 | `https://r2u.org.ua/guides/synyavsky/slovozmina_zaymennyk` | raw HTML |
| ESUM | ЕСУМ via goroh (see research/24) | `https://goroh.pp.ua/Етимологія/оцей` | cite-only |
| CORPUS | our lexicon (public/data, built 2026-10-14) | form page `/f/<spelling>` | tsx script over `tests/lexdata.ts` |
| not a source | uk.wiktionary: pages «тамтой», «тот», «сесь», «гетот» — API `missing` [Q: `"missing":""`] | | |

## 2. Attestations

### 2.1 Грінченко: тамтой (no region label)
HRINCH id 57936 (vol. 4, p. 246): «Тамтой, -а, -е. Тотъ. Грин. III. 323. Був на тамтім світі. Гн. ІІ. 65. На там-тім боці. Шейк.» [Q]
Source abbreviations (hrinchenko.com/sources) [Q]: «Грин. = Этнографическіе матеріалы, собранные въ Черниговской и сосѣднихъ съ ней губерніяхъ... Б. Д. Гринченко.» ; «Гн. = Галицько-руські народні леґенди. Зібрав Володимир Гнатюк. Тт. I и II. Л. 1902.» ; «Шейк. = Опыт южнорусскаго словаря. Трудъ К. Шейковскаго.»
Reading: the headword has no area label of its own; its three illustrations come from Chernihiv (Hrinchenko's collection), Galicia (Hnatiuk) and an all-south-Rus dictionary. The paradigm shown: nominative -а, -е; locative «тамтім» (cf. standard «тім»).

### 2.2 Грінченко: тот, отой, оцей
- HRINCH id 59087 (тот): «Тот, тота, тоте, тото́, мѣст. Тотъ, та, то. А тоті воли я купив у пана. Камен. у. Крутиться тота фицька. Шейк. Ні за сесе, ні за тото. Фр. Пр. 6. Вона тото почула. Грин. III. 346.» [Q]. Area marker «Камен. у.» = «Каменецкій уѣздъ» (abbreviation list) — the only region the entry itself names; the gazetteer (AC-2) has no row for it (Podillya is not named in the entry) → group not asserted.
- HRINCH id 36008 (отой): «Отой, ота, оте, мѣст. Вотъ тотъ. Побила мене ота чужа нива та позичений серп. Ном. № 2140.» [Q]
- HRINCH id 36193 (оцей): «Оцей, оця́, оце, мѣст. = отсе.» [Q]; ЕСУМ «оце́й»: «результат злиття … частки от і … займенника сей» [Q] (research/24 §1.2).

### 2.3 ЕСУ: Бойківський говір (Boyko)
ЕСУ т. 3, «Бойківський говір» (Я. К. Радевич-Винницький, 2004), морфологічні особливості, п. 15 [Q]: «вказівні за­ймен­ники тот (той), тотa´, тотo´ (тотe´), тотu´ або сей (сесь), ся (сеся´), се (сесe´) і обмежено нон, нонa´, нонo´» (soft hyphens in the page source removed).
Region/dialect named by the source: Бойківський говір → BOY (gazetteer row «бойк»).

### 2.4 Лемківський Словничок (Lemko)
lemko.org/lemko2/slovnyk.html [Q]: «тамди - тудою тамто, то (тото) - те (це) тамтой (тамтому) - той (тому) танір (тарелик) - тарілка» (adjacent entries of a continuous list). The site and its dictionary are Lemko-community material (language of entries: Lemko) → LEM (gazetteer row «лемк»). Self-identification of the compilers: not verified → shown with the P-2 note «компілятори не вказані».

### 2.5 uk.wikipedia: Наддністрянський говір
Розділ «Граматика і словотвір» [Q]: «у займенниках — збереження давніх енклітичних форм давального відмінка ми «мені», ти «тобі»; відмінкових форм — знахідного відмінка не́го «його», орудного відмінка неў, тоў «нею», «тією»; вказівного займенника тамто́й «той»;» — a feature list of the Nadnistrian говір (NDN); the article does not give a footnote for this sentence in the extract we read → treated as [Q] of a secondary (encyclopedic) source.

### 2.6 Синявський (norms, 1941)
Table of «той»: «Як той відмінюється отой, тамтой, як цей – оцей та сей.» [Q] — licenses the full paradigm of тамтой, отой (like той) and оцей (like цей).
§ 5, «Поруч наведених загальнолітературних форм різних займенників по народніх говорах живуть іще різноманітні варіянти їх»: «той, та, те, сей, ся, се – тот, тота, тоте, сесь, сеся, сесе» [Q] — no area named.

## 3. Our corpus (first attestations; SPEC 63 DP-1 dating)

`/f/<form>` pages; locators as in the lexicon (script: tests/lexdata.ts readFull; built 2026-10-14):

| Variant | Spelling → earliest | Witness · locator |
|---|---|---|
| тамтой | тамтая 1672–1702 (f=1) | *Самовидець* (samovydets), с. 118: «блегли сюю сторону от Черкас а [тамтая] сторона за Тясмином» |
| тамтой | тамтыхъ, тамтого, тамтому, тамтой, тамто̂мъ 1884 | *Boa Constrictor* (Franko; Galicia) I, с. 3 … IV, с. 111 |
| тамтой | тамті 1893, тамтим 1902, тамта, тамтих 1903 | Франко, *Смерть Каіна*, *Панталаха*, *Борис Граб* |
| отой | отой 1700–1799 (f=11) | o18_20, абз. 1198: «Але тепер [отой] сей світ все до себе має» |
| тот | тот 1710 (f=64) | o18_37, абз. 3 |
| оцей | оцей 1798 (f=7) | Котляревський, *Енеїда* (1798) II, с. 28 |
| тота/тото (lemma тотой, ТОТ, Тото) | тото 1700–1799; тота 1884 | o18_23 абз. 1958; Boa Constrictor I, с. 5 |

Reading: тамтой appears in the Left-Bank Cossack chronicle a century and a half before the Galician texts → the corpus does **not** support «Western-only».
сесь/сеся/сесе: not attested as such in our corpus [U].

## DX. Deictic adverbs and particle compounds (SPEC 63 DX-1…DX-3; user: «ондо (он там), тамки … отуточки, онтамека, осьтамека, озьдо … де всі ці слова в літературній мові»)

The full research (affix inventory with Грінченко / ЕСУМ / Громик quotes and locators, region per affix, the segmentation algorithm) is **research/24-deictics.md §1–§4** (R24); core/deictics.ts is its data (DX_PARTS, DX_ATTESTED, `segment`). SPEC 63 adds:
- **ондо** = он + д(е) + о — ЕСУМ «онно́»: «результат фонетичної видозміни … онде-о, з о́нде і вказівної частки о (онде-о́ › ондо́ › онно́)» [Q]; ЕСУМ variants of «о́нде»: «… ондо́, ондьо́, о́ньдо, о́ньдзе» [Q]; gloss «ось там». Area not named in the card → [U].
- **тамки / тамка** — Грінченко id 57919: «Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки, тамкива.» [Q]; Громик (WPL): «там > тáмк’і, тáмик’і … » [Q]. The suffix -ка/-ки is a *reinforcement* (research/24 §3.4).
- **Literary language.** Every form is looked up in ВЕСУМ (our lexicon's paradigm map): the chain «standard» of the dictionary row is followed until a ВЕСУМ form is found (тамки → там; озьдо → осьде → тут). If the chain ends without a ВЕСУМ form the page says «у літературній мові не зафіксовано» and lists where the form is recorded (Грінченко, ЕСУМ, Громик). СУМ-11 was not consulted (no access) → not claimed.
- Reconstructions (отуточки, онтамека, осьтамека) stay hypotheses (research/24 §2): accepted by the rule only because each segment has a sourced row.

## 4. What is derived (DP-2)

Rule (core/pronoun-variants.ts): a variant is an operation on the paradigm of its standard lemma (VESUM lines, verbatim tags):
- **prefix**: тамтой = там- + той; отой = о- + той; оцей = о- + цей. Scope: full paradigm — Синявський (§2.6) states they decline as той/цей.
- **stem**: тот- replaces т- (та → тота, те → тоте, ті → тоті; masc. nominative «тот» and neuter «тото» as given by HRINCH id 59087 / ЕСУ). Scope: nominative only — no source describes oblique cases of тот → not derived.
- **сесь**: nominative only — сей → сесь, ся → сеся, се → сесе (ЕСУ; Синявський).
Check: the rule reproduces every form of VESUM's own «тамтой» paradigm (test DP-2).
