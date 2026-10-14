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
