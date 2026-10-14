# 35 — Middle Ukrainian (XVI–XVIII c.) morphology: sourced description for the MU folds (SPEC 63 MU-1)

Rule of this file (SPEC 00): a fold exists in `core/mu-fold.ts` only if a source below describes the ending; the quote is verbatim, the locator is a printed page. No source → no rule (§4).

## 1. Sources read

| id | work | access |
|---|---|---|
| **RUSL** | Русанівський В. М. *Історія української літературної мови*. К.: АртЕк, 2001. 392 с. (scan: litopys.org.ua) | `http://izbornyk.org.ua/rusaniv/ru04.htm` (ч. 2 «Літературна мова післямонгольської доби (друга половина XIII — XVI ст.)»), `…/ru05.htm` (ч. 3 «Розквіт староукраїнської літературної мови (XVII — перша чверть XVIII ст.)»); cp1251; ѣ is printed `Ђ`. Page numbers are the `/NN/` marks of the scan. |
| **PAVL** | Павленко Л. П. *Історична граматика української мови*. Луцьк, 2010 | PDF of research/11 §0.1. Old Cyrillic in the PDF is a legacy 8-bit font (research/11 §0.2): tables are decoded, quoted as paraphrase [P]; modern Ukrainian prose is verbatim [Q]. |
| **ENC** | *Українська мова. Енциклопедія*, 2000, «Історія української мови» (um27) | research/11 MH-19. |

Not reachable in this session (not cited for any rule): Жовтобрюх та ін. *Історія української мови. Морфологія* (1978), Німчук, Безпалько 1962 — no online text found; the 1978 volume appears only through ENC um187 (research/11).

## 2. Descriptions used (verbatim)

**MU-FEM (adjective/pronoun fem. sg. -ой/-ей = [ой]; gen. -ої, dat./loc. -ій)**
- RUSL ru04, с. 49–51 (мова грамот XIV–XV ст.): «у родовому відмінку однини прикметників і прикметникових займенників, уживаних в жіночому роді, виступає закінчення -oЂ/-еЂ, -oi/-ei, що вірогідно позначають /і/ з попереднім /й/: кривавоЂ, мокроЂ, молдавскоЂ, нашеі, никакоЂ, освЂценоі, рускоЂ, вашеЂ.» — the written -ой/-ей of the 1700s is the same [ой] (the scribe writes й for the glide plus і); gen. → modern -ої.
- PAVL с. 101, table «Зразок відмінювання займенникових (членних, повних) прикметників», fem.: the dat. and loc. sg. are one form, «новои» [P, decoded]; modern dat./loc. -ій. The two readings are tested against VESUM (gen. vs dat./loc. analysis), never chosen by hand.

**MU-LOC-OM (masc./neut. loc. sg. -ом → -ому/-ім)** — PAVL с. 101, same table, masc. loc.: «новомь (-ѣмь)» [P, decoded]; the ending -омь/-ом is the old loc. of full adjectives and pronouns.

**MU-LOC-PL (noun loc. pl. -ех/-ох → -ах/-ях)** — RUSL ru04, с. 68–69: «У місцевому відмінку множини переважають давні форми із закінченнями -ох, -ex, -ix: о апостолех, о болванех, о волех, дарех, по домех, на конех, людех, в смуткох, греках і под.»

**MU-GEN-PL-OV (noun gen. pl. -ов → -ів)** — PAVL с. 83: «Здавна в родовому відмінку множини виступає закінчення -ов іменників з основою на *-ŭ, яке поширюється на іменники з основою на *-ŏ/*-јŏ й поступово закономірно змінюється у флексію -ів» (also research/11 MH-11).

**MU-PAST-L (masc. past -л → -в)** — RUSL ru05, с. 118–119: «минулий час чоловічого роду однини має як суфікс -в/-ў (імиў, збавіў, зоставіў, купив-єм, всадив), так і традиційний -л (пубрал, виграл, пойшол, шукал)»; с. 91–92: «кінцеве -л в дієсловах минулого часу рясніше, ніж раніше, переходить у чоловічому роді у -в (улюбив, угодив, приходив, указав, приняв, повстанув)».

**MU-ENCL (personal enclitics of the old perfect: могл-єм = я міг)** — RUSL ru05, с. 92: «Стосовно форм минулого часу дієслів треба підкреслити ще таку особливість, як велика поширеність особових форм-рефлексів колишнього перфекта; показниками особовості виступають форми колишнього допоміжного дієслова быти або ж їх скорочені варіанти: -м, -єсь (-сь), -єсьмо (-сьмо, -сьмы), -єсьте (-сьте); при цьому вони можуть бути як у постпозиції, так і в препозиції» (examples «Єслим кого образил», «я-м рад», «Же смо єго не были годными»); с. 118: «купив-єм». Mapping used: -м → 1 sg.; -єсь/-сь → 2 sg.; -єсьмо/-сьмо/-сьмы → 1 pl.; -єсьте/-сьте → 2 pl. The remaining word must be a VESUM past-tense verb form.

**MU-SHORT-EN (short passive participle -ен → -ений)** — RUSL ru05, с. 116: «пасивні дієприкметники на -нн виступають здебільшого в короткій формі: предложенну, обагренну, принесенну, плЂненна, избранный, изгнанный, возвышенна, возданна, распаленна і под.»; PAVL с. 102: «Іменні форми якісних прикметників уживаються у фольклорі (дрібен дощик) … група колишніх іменних прикметників … винен, годен, ладен, певен». The description is of the short form in general; the m. nom. -ен of a perfective passive participle is its instance.

**MU-CONTR (uncontracted full adjectives: -ая → -а, -оє → -е, -ії/-іє → -і, -ую → -у)** — PAVL с. 103: «Займенникові прикметники в українській мові зазнали стягнення. Тому в сучасній мові нормою є вживання займенникових стягнених прикметників, що особливо виразно ілюструють форми називного відмінка: добрая > добра. У сучасній мові нестягнені форми вживаються у фольклорі: Зеленеє жито, зелене, хорошії гості у мене.»; ENC um27 (MH-19): «Проте переважали повні форми, які спершу виступали у нестягненій формі, а з 16 ст. — у стягненій». MU-CONTR-OEJU (тоею → тою, instr. fem.) is the same contraction.

## 3. How a rule is accepted

`muCandidates()` produces at most one enclitic split plus one main rule per token; `linkOptions` keeps a candidate only if VESUM lists the candidate with the analysis stated by the rule (`expect`: class, gender, case, number) and the token's own POS gate agrees; it runs after all earlier routes failed, and counts every rule as a branch. Capitalised tokens still unresolved become name cards (basis «capitalisation»): not in the corpus with a small first letter, not first in the paragraph.

## 4. Candidates without a citable source (NOT implemented)

| form | observed in Величко 1720 | why no rule |
|---|---|---|
| instr. fem. -ієй/-ею for -ією (фундацієй) | yes | no description of -ей for the instrumental found in RUSL/PAVL/ENC |
| Church Slavonic / Russian lexical doublets (откуда, егда, время, чрез, под, тогда, между, когда, где, они) | yes | would need the dictionary claim of ССУМ XIV–XV / Словник XVI–XVII ст.; neither is online in a quotable form here |
| pronoun oblique stems (всего, всему, всем, нем, нему, свой→своєго) | yes | PAVL gives only the OCS-period paradigm; no Middle Ukrainian statement found |
| irregular stems могл → міг, зостал → зостався | yes | irregular; needs the verb paradigm of the dictionary |
| hyphen artefacts (вели-кого, козако-руськіє, що-кольвек) | yes | an ingest artefact of line breaks, not a language rule |

## 5. Spelling and sound folds added for the normalised izbornyk witnesses (Загоровський 1577 и под., SPEC 63 MU)

Applied in this order, each optional: enclitic split → кг → -ск- → (second VESUM pass only) е/о → і, -ніє → -ння → one morphology rule.

- **MU-KG-G (кг → ґ)** — RUSL ru04, с. 49–50: «нового звука /ґ/, який прийшов в українську мову разом зі словами іншомовного походження; передавався він у цей час буквосполукою кг: буркгомистру, кгвалть, кгды, кголдова[т] (і голдовати), кгрунть, довкговдъ» (кгрунт → ґрунт, кгвалт → ґвалт; кгородский stays unlinked: the source names ґ only in loans).
- **MU-E-I-n (е written for ѣ → і)** — RUSL ru04, с. 49–50: «на місці етимологічного Ђ уживається е (частіше) або и (вЂчные — вечные, всЂмъ — всемъ, всимъ, всЂхъ — всихъ, дЂтем — детемъ — дитемъ, свЂдци — свидци, рЂцЂ — рЂци)»; ѣ > і is SHEV ch. 32 (R09), the same і from е in a closed syllable SHEV ch. 43 (R10). The letter alone does not tell, so one fold per position (n = 1…3) and VESUM decides.
- **MU-O-I-n (о → і in a new closed syllable)** — SHEV ch. 43 (R10 in core/phonology.ts): «Буковина першою зініціювала… звуження е та о в новозакритих складах після занепаду єрів (še·st', sto·l > šíst', stu·l)». Applied only to о followed by consonants to the end of the word or by two consonants (the syllable closed by a lost jer): под → під, войсько → військо; года, оному stay out.
- **MU-NIJE-NNJA / MU-TIJE-TTJA (-ніє → -ння, -тіє → -ття)** — SHEV 37.1 (R13): «скупчення з новопосталим j усунено в XV ст. (див. 37.1)».
- **MU-SK (-ский/-цкий → -ський/-цький)** — Правопис 2019 § 19: «к, м’який ц, ч + -ськ-(ий), -ство-(о) → -цьк-(ий), -цтв-(о): гірник — гірницький — гірництво; козак — козацький — козацтво»; also «х, ш, с + -ськ-, -ств- → -ськ-, -ств-: волох — волоський; чех — чеський».
- **MU-SHORT-AN (писан → писаний)** — same description as MU-SHORT-EN (RUSL ru05, с. 116, PAVL с. 102).
- Not a fold: ы → и is already done by derive() (R03/R05, research/03).

## 6. Requested but not implemented (no citable description found)

| form | reason |
|---|---|
| их → їх, его/ее/мое/моих (Russian pronoun forms) | no description of the Middle Ukrainian pronoun paradigm found in RUSL, PAVL, ENC, Shevelov; web search returned school material only |
| месяца → місяця (-ца → -ця), нароженя, устройствѣ | no source for the soft-sign respelling; lexical |
| е → и in names (володимерский → володимирський) | RUSL names е/и for ѣ only |
| ґородский → городський | the source gives ґ for loanwords only |
| менувати, подстароста, небытность, кастелян | lexical archaisms: they link through the Old Ukrainian dictionary witnesses / archaic cards (SPEC 63 AR), never by a fold |
