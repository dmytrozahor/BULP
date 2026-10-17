/**
 * SPEC 63 MU: Middle Ukrainian (XVI–XVIII c.) morphology folds for witnesses already put into modern letters (orth «modernised» / «ізборник-нормалізований»).
 * Every rule maps a token to a candidate modern form AND states which VESUM analysis may confirm it (`expect`); build-link.ts accepts a candidate only when VESUM lists the
 * form with such an analysis (and the token's own POS gate, if any, agrees). No source → no rule: rules for which no citable description was found are listed in
 * research/35-middle-ukr-morphology.md §4 and NOT implemented. Pure (no node/DOM imports).
 *
 * Sources (full text read for this module; quotes verbatim, Old Cyrillic of the printed edition kept):
 *  RUSL  Русанівський В. М. Історія української літературної мови. К.: АртЕк, 2001. http://izbornyk.org.ua/rusaniv/ (ru04 = ч. «Літературна мова післямонгольської доби»; ru05 = «Розквіт староукраїнської літературної мови»)
 *  PAVL  Павленко Л. П. Історична граматика української мови. Луцьк, 2010 (research/11)
 */
import { P, Q, type Evidence } from './evidence.ts'
import { SOURCES } from './sources.ts'
import { ruleById } from './phonology.ts'
import type { Fold } from './orthography.ts'

// the registry line belongs to core/sources.ts; registered here so that this change does not touch a file other agents are editing (move it there when convenient)
if (!SOURCES['RUSL']) SOURCES['RUSL'] = { title: 'Русанівський В. М. Історія української літературної мови: підручник. К.: АртЕк, 2001. 392 с. (скан і обробка litopys.org.ua)', url: 'http://izbornyk.org.ua/rusaniv/ru.htm', year: '2001' }

/** Orthographies (WitnessOut.orth) of the witnesses whose text is Middle Ukrainian written in modern letters. */
export const MU_ORTH = new Set(['modernised', 'ізборник-нормалізований'])

export interface MuFold extends Fold { group: 'encl' | 'orth' | 'phon' | 'main'; expect: (tags: string) => boolean; person?: string }

const RU4 = 'http://izbornyk.org.ua/rusaniv/ru04.htm', RU5 = 'http://izbornyk.org.ua/rusaniv/ru05.htm'
const FEM_GEN = Q('RUSL', `${RU4}, с. 49–51 (мова українських грамот XIV–XV ст.)`, 'у родовому відмінку однини прикметників і прикметникових займенників, уживаних в жіночому роді, виступає закінчення -oЂ/-еЂ, -oi/-ei, що вірогідно позначають /і/ з попереднім /й/: кривавоЂ, мокроЂ, молдавскоЂ, нашеі, никакоЂ, освЂценоі, рускоЂ, вашеЂ.')
const FEM_DAT: Evidence = P('PAVL', 'с. 101, «Зразок відмінювання займенникових (членних, повних) прикметників», тверда група, жін. рід одн. (шрифт PDF декодовано з cp1251: [Q*], research/11 §0.2)', 'у таблиці жіночого роду цілих прикметників давальний і місцевий відмінки однини записані як «новои»', 'тобто закінчення -ой/-ои = [ой]; сучасне закінчення давального/місцевого — -ій')
const LOC_M: Evidence = P('PAVL', 'с. 101, та сама таблиця, чол. рід, місцевий відмінок одн. [Q*]', 'М. «новомь (-ѣмь)» — закінчення -омь у місцевому відмінку чол. роду цілих прикметників', 'сучасне закінчення — -ому/-ім')
const LOC_PL = Q('RUSL', `${RU4}, с. 68–69 (мова «Кирилового Апокрисиса»/полемічної пам’ятки кінця XVI ст.)`, 'У місцевому відмінку множини переважають давні форми із закінченнями -ох, -ex, -ix: о апостолех, о болванех, о волех, дарех, по домех, на конех, людех, в смуткох, греках і под.')
const PAST_L = Q('RUSL', `${RU5}, с. 118–119 (мова інтермедій до драми Я. Гаватовича, 1619 р.)`, 'минулий час чоловічого роду однини має як суфікс -в/-ў (імиў, збавіў, зоставіў, купив-єм, всадив), так і традиційний -л (пубрал, виграл, пойшол, шукал)', 'також с. 91–92: «кінцеве -л в дієсловах минулого часу рясніше, ніж раніше, переходить у чоловічому роді у -в (улюбив, угодив, приходив, указав, приняв, повстанув)»')
const ENCL = Q('RUSL', `${RU5}, с. 92 (мова українських панегіриків і драм кінця XVII ст.)`, 'велика поширеність особових форм-рефлексів колишнього перфекта; показниками особовості виступають форми колишнього допоміжного дієслова быти або ж їх скорочені варіанти: -м, -єсь (-сь), -єсьмо (-сьмо, -сьмы), -єсьте (-сьте); при цьому вони можуть бути як у постпозиції, так і в препозиції', 'приклади: «Єслим кого образил», «я-м рад», «Же смо єго не были годными»; с. 118: «купив-єм»')
const SHORT = Q('RUSL', `${RU5}, с. 116 (панегірики початку XVIII ст.)`, 'пасивні дієприкметники на -нн виступають здебільшого в короткій формі: предложенну, обагренну, принесенну, плЂненна, избранный, изгнанный, возвышенна, возданна, распаленна і под.', 'PAVL с. 102: «Іменні форми якісних прикметників уживаються у фольклорі (дрібен дощик) … група колишніх іменних прикметників … винен, годен, ладен, певен»')
const GEN_SG_A = Q('ENC', 'http://litopys.org.ua/ukrmova/um27.htm (Русанівський, «Історія української мови»); Павленко с. 81', 'в род. в. одн. усталюється вживання закінчень -а та -у, які можуть взаємозамінюватися: става — ставу, листа — листу', 'PAVL с. 81: -а з *-ŏ, -у з *-ŭ; так само полка — полку, року — рока (MM-3: «з полка» не є формою пілка)')
const CONTR = Q('PAVL', 'с. 103', 'Займенникові прикметники в українській мові зазнали стягнення. Тому в сучасній мові нормою є вживання займенникових стягнених прикметників, що особливо виразно ілюструють форми називного відмінка: добрая > добра. У сучасній мові нестягнені форми вживаються у фольклорі: Зеленеє жито, зелене, хорошії гості у мене.', 'ЕУМ «Історія української мови» (um27): «Проте переважали повні форми, які спершу виступали у нестягненій формі, а з 16 ст. — у стягненій»')
const GEN_PL = Q('PAVL', 'с. 83', 'Здавна в родовому відмінку множини виступає закінчення -ов іменників з основою на *-ŭ, яке поширюється на іменники з основою на *-ŏ/*-јŏ й поступово закономірно змінюється у флексію -ів')
const KG = Q('RUSL', `${RU4}, с. 49–50 (мова українських грамот XIV–XV ст.)`, 'нового звука /ґ/, який прийшов в українську мову разом зі словами іншомовного походження; передавався він у цей час буквосполукою кг: буркгомистру, кгвалть, кгды, кголдова[т] (і голдовати), кгрунть, довкговдъ')
const YAT_E = Q('RUSL', `${RU4}, с. 49–50 (мова українських грамот XIV–XV ст.)`, 'на місці етимологічного Ђ уживається е (частіше) або и (вЂчные — вечные, всЂмъ — всемъ, всимъ, всЂхъ — всихъ, дЂтем — детемъ — дитемъ, свЂдци — свидци, рЂцЂ — рЂци)', 'ѣ > і — Шевельов (core/phonology.ts R09); у новозакритому складі — R10 (SHEV ch. 43)')
const CLOSED = ruleById['R10']!.cite    // SHEV: е, о > і у новозакритих складах
const LENGTH = ruleById['R13']!.cite   // SHEV 37.1: скупчення з новопосталим j усунено в XV ст. (-ьѥ > -ття / -ння)
const SK = Q('PRAV', 'https://slovnyk.ua/pravopys.php, § 19 (research/13 S10c)', 'к, м’який ц, ч + -ськ-(ий), -ство-(о) → -цьк-(ий), -цтв-(о): гірник — гірницький — гірництво; козак — козацький — козацтво', 'також: «х, ш, с + -ськ-, -ств- → -ськ-, -ств-: волох — волоський; чех — чеський»; сучасне написання суфікса — -ськ-(ий)')

const seg = (t: string) => t.split(':')
const isAdjLike = (t: string) => /^(adj|adjp|numr)\b/.test(t) || (/^noun\b/.test(t) && seg(t).includes('pron'))
const hasCase = (t: string, ...c: string[]) => c.some(x => seg(t).includes(x))
const R = (re: RegExp, to: string | ((...m: string[]) => string)) => (w: string) => w.replace(re, to as string)

/** replace the n-th match of `re` (one fold per position, so that a recorded rule id re-applies deterministically in the trace) */
const nth = (re: RegExp, n: number, to: string) => (w: string) => { let i = 0; return w.replace(re, m => (++i === n ? to : m)) }
const mk = (id: string, group: MuFold['group'], cite: Evidence, apply: (w: string) => string, expect: MuFold['expect'], person?: string): MuFold => ({ id, era: ['mu'], branch: false, cite, apply, group, expect, ...(person ? { person } : {}) })

export const MU_FOLDS: MuFold[] = [
  // enclitic personal endings of the old perfect (могл-єм = я міг): the token is split, the person/number is carried in the rule id
  mk('MU-ENCL-1SG', 'encl', ENCL, R(/-(?:єм|ем|м)$/, ''), t => /^verb\b/.test(t) && hasCase(t, 'past'), '1 особа одн.'),
  mk('MU-ENCL-2SG', 'encl', ENCL, R(/-(?:єсь|есь|сь)$/, ''), t => /^verb\b/.test(t) && hasCase(t, 'past'), '2 особа одн.'),
  mk('MU-ENCL-1PL', 'encl', ENCL, R(/-(?:єсьмо|есьмо|сьмо|сьмы|смо|смы)$/, ''), t => /^verb\b/.test(t) && hasCase(t, 'past'), '1 особа мн.'),
  mk('MU-ENCL-2PL', 'encl', ENCL, R(/-(?:єсьте|есьте|сьте)$/, ''), t => /^verb\b/.test(t) && hasCase(t, 'past'), '2 особа мн.'),
  // past masculine -л → -в (рушил → рушив, тішился → тішився)
  mk('MU-PAST-L', 'main', PAST_L, R(/л(ся)?$/, 'в$1'), t => /^verb\b/.test(t) && hasCase(t, 'past') && hasCase(t, 'm')),
  // full adjectives and adjectival pronouns, fem. sg.: -ой/-ей = [ой]: gen. -ої, dat./loc. -ій
  mk('MU-FEM-OJ-GEN', 'main', FEM_GEN, R(/ой$/, 'ої'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_rod')),
  mk('MU-FEM-EJ-GEN', 'main', FEM_GEN, R(/ей$/, 'ої'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_rod')),
  mk('MU-FEM-EJ-GEN2', 'main', FEM_GEN, R(/([ею])й$/, '$1ї'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_rod')),
  mk('MU-FEM-OJ-DAT', 'main', FEM_DAT, R(/ой$/, 'ій'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_dav', 'v_mis')),
  mk('MU-FEM-EJ-DAT', 'main', FEM_DAT, R(/[ее]й$/, 'ій'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_dav', 'v_mis')),
  mk('MU-FEM-EJ-DAT2', 'main', FEM_DAT, R(/[єе]й$/, 'їй'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_dav', 'v_mis')),
  // masc./neut. loc. sg. -ом (→ -ому / -ім)
  mk('MU-LOC-OM-U', 'main', LOC_M, R(/ом$/, 'ому'), t => isAdjLike(t) && hasCase(t, 'v_mis') && (hasCase(t, 'm') || hasCase(t, 'n'))),
  mk('MU-LOC-OM-IM', 'main', LOC_M, R(/ом$/, 'ім'), t => isAdjLike(t) && hasCase(t, 'v_mis') && (hasCase(t, 'm') || hasCase(t, 'n'))),
  // noun loc. pl. -ех/-ох (→ -ах/-ях)
  mk('MU-LOC-PL-EH-AH', 'main', LOC_PL, R(/(?:ех|ох)$/, 'ах'), t => /^noun\b/.test(t) && !hasCase(t, 'prop') && hasCase(t, 'v_mis') && hasCase(t, 'p')),
  mk('MU-LOC-PL-EH-JAH', 'main', LOC_PL, R(/(?:ех|ох)$/, 'ях'), t => /^noun\b/.test(t) && !hasCase(t, 'prop') && hasCase(t, 'v_mis') && hasCase(t, 'p')),
  // noun gen. pl. -ов → -ів
  mk('MU-GEN-PL-OV', 'main', GEN_PL, R(/ов$/, 'ів'), t => /^noun\b/.test(t) && hasCase(t, 'v_rod') && hasCase(t, 'p')),
  // masc. gen. sg. -а for -у (з полка = з полку): first pass, so that the phonetic о > і fold never reaches a noun's old genitive (MM-3: полка is not пілка)
  mk('MU-GEN-SG-A', 'main', GEN_SG_A, R(/а$/, 'у'), t => /^noun\b/.test(t) && !hasCase(t, 'prop') && hasCase(t, 'm') && hasCase(t, 'v_rod') && !hasCase(t, 'p')),
  // short (nominal) passive participles / adjectives -ен → -ений
  mk('MU-SHORT-EN', 'main', SHORT, R(/ен$/, 'ений'), t => /^(adj|adjp)\b/.test(t) && hasCase(t, 'm') && hasCase(t, 'v_naz')),
  mk('MU-SHORT-AN', 'main', SHORT, R(/ан$/, 'аний'), t => /^(adj|adjp)\b/.test(t) && hasCase(t, 'm') && hasCase(t, 'v_naz')),
  // spelling: кг = ґ; -ский/-цкий → -ський/-цький
  mk('MU-KG-G', 'orth', KG, R(/кг/g, 'ґ'), () => true),
  mk('MU-SK', 'orth', SK, R(/(?<=[^ь])([сц])к(?=(?:ий|ого|ому|им|ім|их|ой|ом|ая|ую|ое|ые|ие|ими|ою|ої|ій|ые)$)/, (_m: string, c: string) => c + 'ьк'), () => true),
  // phonetic (second VESUM pass only): е/о → і (ѣ written е, new ikavism), -ніє/-тіє → -ння/-ття
  ...[1, 2, 3].map(n => mk(`MU-E-I-${n}`, 'phon', YAT_E, nth(/е/g, n, 'і'), () => true)),
  ...[1, 2, 3].map(n => mk(`MU-O-I-${n}`, 'phon', CLOSED, nth(/о(?=[бвгґджзйклмнпрстфхцчшщь]+$|[бвгґджзйклмнпрстфхцчшщ]{2})/g, n, 'і'), () => true)),
  mk('MU-NIJE-NNJA', 'phon', LENGTH, R(/(?<=[аеє])н(?:іє|іе|ие|ія|ье|ьє)$/, 'ння'), () => true),
  mk('MU-TIJE-TTJA', 'phon', LENGTH, R(/(?<=[аеє])т(?:іє|іе|ие|ія|ье|ьє)$/, 'ття'), () => true),
  // uncontracted full adjectives (-ая → -а, -оє → -е, -ії → -і, -ую → -у …)
  mk('MU-CONTR-A', 'main', CONTR, R(/(?:ая|яя)$/, 'а'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_naz')),
  mk('MU-CONTR-E', 'main', CONTR, R(/(?:ое|оє|ее|еє)$/, 'е'), t => isAdjLike(t) && (hasCase(t, 'n') || hasCase(t, 'f')) && hasCase(t, 'v_naz', 'v_zna')),
  mk('MU-CONTR-IE', 'main', CONTR, R(/(?:ії|іє|ые|ие)$/, 'і'), t => isAdjLike(t) && !hasCase(t, 'adjp') && hasCase(t, 'p') && hasCase(t, 'v_naz', 'v_zna')),
  mk('MU-CONTR-UJU', 'main', CONTR, R(/ую$/, 'у'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_zna')),
  mk('MU-CONTR-JUJU', 'main', CONTR, R(/юю$/, 'ю'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_zna')),
  mk('MU-CONTR-OEJU', 'main', CONTR, R(/о[её]ю$/, 'ою'), t => isAdjLike(t) && hasCase(t, 'f') && hasCase(t, 'v_oru')),
]
export const muById = Object.fromEntries(MU_FOLDS.map(f => [f.id, f])) as Record<string, MuFold>
const ENCLS = MU_FOLDS.filter(f => f.group === 'encl'), MAINS = MU_FOLDS.filter(f => f.group === 'main')

export interface MuCandidate { form: string; trace: string[]; last: MuFold }
const ORTH_KG = MU_FOLDS.filter(f => f.id === 'MU-KG-G'), ORTH_SK = MU_FOLDS.filter(f => f.id === 'MU-SK'), PHONS = MU_FOLDS.filter(f => f.group === 'phon')
/**
 * Candidate modern forms of one (lower-cased, modern-letter) token. Stages, each optional and at most one rule: [enclitic split] → [кг → ґ] → [-ск- → -ськ-] → [phonetic: е/о → і, -ніє → -ння; only with `phon`,
 * the build passes it for tokens still unresolved after the first VESUM pass] → [one morphology rule]. At least one rule must change the word; the last rule applied states what VESUM must confirm.
 */
export function muCandidates(raw: string, phon = false): MuCandidate[] {
  const out: MuCandidate[] = [], stages: MuFold[][] = [ENCLS, ORTH_KG, ORTH_SK, ...(phon ? [PHONS] : []), MAINS]
  let cur: { form: string; trace: string[]; last?: MuFold }[] = [{ form: raw, trace: [] }]
  for (const st of stages) {
    const next = [...cur]
    for (const b of cur) for (const f of st) { const o = f.apply(b.form); if (o !== b.form && o && !o.includes('-')) next.push({ form: o, trace: [...b.trace, f.id], last: f }) }
    cur = next.slice(0, 600)
  }
  for (const c of cur) if (c.last) out.push({ form: c.form, trace: c.trace, last: c.last })
  return out
}
