/**
 * SPEC 63 MM-52 (owner: «проаналізуй цей же текст на галицькі форми … та додай все відсутнє»; text = М. Яцків, «Огні горять», 1902, archive.org OCR, не вичитано).
 * Measured on that text (analysis/mm52-yatskiv.md): the OCR witness carries no `orth`, so the cited Желехівка folds never fired on it and the Galician grammar had no folds at all.
 * Every rule below is a BRANCHING extra candidate (era [], like core/gal-folds.ts): VESUM must list the target, the plain candidate wins every tie, and the reverse guard of
 * `galGate` drops every option made by one of these folds when VESUM already lists the token itself (never redirect a form VESUM knows). A fold may also state the analysis its
 * target must have (`MM52_EXPECT`): a noun fold never turns a token into a verb form. A rule whose statement could not be found is graded «зіставлено» (id suffix -INF, kind P)
 * and says so; nothing else is a rule. Quotes: ЕУМ «Українська мова. Енциклопедія» (litopys.org.ua/ukrmova, um162 Закарпатський, um173 Наддністрянський, um174 Надсянський говір,
 * fetched 2026-11-01), uk.wikipedia «Желехівка» (fetched 2026-11-01), Смаль-Стоцький 1892 (as quoted in core/gal-folds.ts ORTH-PART-HYPH).
 *
 *  ORTH-GAL-GEN-I    ночи, земли, хвили, очи, матери, поволи → ночі, землі, хвилі, очі, матері, поволі      (-и for -і: the old fem. soft-stem ending)
 *  ORTH-GAL-UNCONTR  дальниї, добрії, добрая, синєє, добру́ю → дальні, добрі, добра, сине, добру            (full, uncontracted adjective / pronoun endings)
 *  ORTH-GAL-GEM      питаня, писаня, весіля, каміня, житю, дрантє → питання, писання, весілля, каміння, життю, дрантя   (no lengthened consonant in neuter -ня / -ття)
 *  ORTH-GAL-APOS     пять, мясо, кровю, вязав → п'ять, м'ясо, кров'ю, в'язав                                  (no apostrophe between a labial and a yotated vowel)
 *  ORTH-GAL-1PL-M    поїдем, ходим, несем → поїдемо, ходимо, несемо                                         (short 1pl present)
 *  ORTH-GAL-LONG-INF, ORTH-GAL-GENPL-IY-INF, ORTH-GAL-ZIYI-INF: graded зіставлено (no statement found), see the cites
 *  split tokens (not folds): reflexive «ся» written apart (старав ся), fused particles (чомуж, колиб), person clitics (жеби'м, бись), see splitFused / personClitic
 */
import { P, Q } from './evidence.ts'
import type { Fold } from './orthography.ts'

const UM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
const WZ = 'https://uk.wikipedia.org/wiki/Желехівка'
const C = '[бвгґджзклмнпрстфхцчшщ]'
const R = (re: RegExp, to: string) => (w: string) => w.replace(re, to)

export const GEN_I_FOLD: Fold = {
  id: 'ORTH-GAL-GEN-I', era: [], branch: true,
  cite: Q('ENC', UM(173), 'в род. в. одн. -и (р’іли́, зеимли́, нóчи, любóви)', 'ЕУМ «Наддністрянський говір»; ЕУМ «Закарпатський говір» (um162): «У І відміні ім. ж. р. в м’якій та мішаній групах — давня флексія -и в дав. [земли] та місц. [на земли] відмінках». Обидві статті називають -и в однині; розширення на н. мн. (очи = очі) і на прислівник (поволи) — наше, за аналогією, VESUM вирішує, лише іменник чи прислівник'),
  apply: R(new RegExp(`(?<=${C})(?<![оеє]в)и$`), 'і'),   // the dative -ови / -еви (Славкови, деканови) is ORTH-DAT-OVI, not this rule
}
export const UNCONTR_FOLD: Fold = {
  id: 'ORTH-GAL-UNCONTR', era: [], branch: true,
  cite: Q('ENC', UM(174), 'нестягнені членні форми прикметників і займенників (такíйі мальíйі) поряд із стягненими та усіченими (ці дóбрі дíти; бíлы, зíмóвы)', 'ЕУМ «Надсянський говір»; ЕУМ um162 «Зберігають нестягнену форму -ойе [дóбройе]», um178 «нестягнені форми прикметників с. р. (дрібнóйе, зелáнуйе)»; повні форми -ая / -еє / -ую / -иї / -ії → стягнені -а / -е / -у / -і (дальниї → дальні); -иї замість -ийі — наша аналогія, VESUM вирішує, лише прикметник / займенник'),
  apply: w => w.replace(new RegExp(`(?<=${C})[иі]ї$`), 'і').replace(new RegExp(`(?<=${C})([ая])я$`), '$1').replace(new RegExp(`(?<=${C})([еє])є$`), '$1').replace(new RegExp(`(?<=${C})([уюї])ю$`), '$1'),
}
const GEM_RE = /(?<=[аеиіоуяюєї])([нлтдсзцчшжр])(ю|я|ям|ями|ях|ї|і)$/
export const GEM_FOLD: Fold = {
  id: 'ORTH-GAL-GEM', era: [], branch: true,
  cite: Q('WUK', WZ, 'В іменниках середнього роду не відбувалося подовження приголосних і писано закінчення є відповідно до наддніпрянського я: зїлє, житє, знанє', 'ЕУМ «Наддністрянський говір» (um173): «втрата довготи м’якими приголосними у формах іменників середнього роду (жикє́, насíнє)». Уже ORTH-ZHEL-JE розглядає закінчення -є; це правило — кінцівки -я / -ю / -ям / -ях / -і (питаня, житю, каміня), за аналогією; VESUM вирішує, лише іменник'),
  apply: w => GEM_RE.test(w) ? w.replace(GEM_RE, (_m, c: string, e: string) => c + c + e) : w.replace(new RegExp(`(?<=${C})${C}є$`), m => m[0] + 'я'),
}
export const APOS_FOLD: Fold = {
  id: 'ORTH-GAL-APOS', era: [], branch: true,
  cite: Q('WUK', WZ, 'проте роздільної вимови губних із йотованими на письмі не позначувано: бити — бю, бєш, пити — пю, пє, пєш, вюн, вяз, мякий, мясо', 'Желехівка не пише апострофа між губним і йотованою; кандидат вставляє апостроф після б п в м ф перед я ю є ї; VESUM вирішує'),
  apply: R(/(?<=[бпвмф])(?=[яюєї])/g, "'"),
}
export const PL1_M_FOLD: Fold = {
  id: 'ORTH-GAL-1PL-M', era: [], branch: true,
  cite: Q('ENC', UM(173), 'паралельне вживання закінчень 1-ї ос. мн. теп. ч. -мо і -м (несемо/несем, хóдимо/хóдим)', 'ЕУМ «Наддністрянський говір»; лише 1-ша особа множини дієслова'),
  apply: R(/(?<=[еєи])м$/, 'мо'),
}
/** graded зіставлено: kind P, the reason says that no statement was found */
const INF = (id: string, what: string, note: string): Pick<Fold, 'id' | 'cite'> => ({ id, cite: P('зауваження власника', 'SPEC 63 MM-52', what, `джерела (граматики, словника) з цим твердженням не знайдено: ${note}; зв’язок позначено «зіставлено», ознаки діалекту не показується`) })
export const LONG_INF_FOLD: Fold = {
  ...INF('ORTH-GAL-LONG-INF', 'людиї, людии → люди (власник: «давня форма з подовженням людиї має вести до люди і всі аналогічні форми»)', 'форма іменника множини на -иї / -ии'),
  era: [], branch: true, apply: R(new RegExp(`(?<=${C})и(?:ї|и)$`), 'и'),
}
export const ZIYI_INF_FOLD: Fold = {
  ...INF('ORTH-GAL-ZIYI-INF', 'станциї, поезиї → станції, поезії (-иї для -ії)', 'правопис -циї / -зиї замість -ції / -зії'),
  era: [], branch: true, apply: R(new RegExp(`(?<=${C})иї(?=$|[хмюй]|ми$)`), 'ії'),
}
export const GENPL_IY_INF_FOLD: Fold = {
  ...INF('ORTH-GAL-GENPL-IY-INF', 'дітий, людий, очий → дітей, людей, очей (род. мн. на -ий для -ей)', 'у ЕУМ і Вікіпедії для родового множини названо лише -іў / -и / -ей, не -ий'),
  era: [], branch: true, apply: R(new RegExp(`(?<=${C})ий$`), 'ей'),
}
export const MM52_FOLDS: Fold[] = [GEN_I_FOLD, UNCONTR_FOLD, GEM_FOLD, APOS_FOLD, PL1_M_FOLD, LONG_INF_FOLD, ZIYI_INF_FOLD, GENPL_IY_INF_FOLD]

const has = (t: string, ...c: string[]) => { const s = t.split(':'); return c.some(x => s.includes(x)) }
/** the analysis the target of a fold must have (every fold of the chain must agree) */
export const MM52_EXPECT: Record<string, (tags: string) => boolean> = {
  // the Желехівка rules read in a text without orth: the neuter noun of ORTH-ZHEL-JE (питанє → питання), not білє → білль
  'ORTH-ZHEL-JE': t => /^noun\b/.test(t) && has(t, 'n') && !has(t, 'prop'),
  'ORTH-ZHEL-JE-OBL': t => /^noun\b/.test(t) && !has(t, 'prop'),
  'ORTH-GAL-GEN-I': t => /^(noun|adv)\b/.test(t) && !has(t, 'prop'),
  'ORTH-GAL-UNCONTR': t => /^(adj|adjp|numr)\b/.test(t) || (/^noun\b/.test(t) && has(t, 'pron')),
  'ORTH-GAL-GEM': t => /^noun\b/.test(t) && has(t, 'n') && !has(t, 'prop'),
  'ORTH-GAL-APOS': t => !has(t, 'prop'),
  'ORTH-GAL-1PL-M': t => /^verb\b/.test(t) && has(t, '1') && has(t, 'p'),
  'ORTH-GAL-LONG-INF': t => /^noun\b/.test(t) && has(t, 'p') && has(t, 'v_naz') && !has(t, 'prop'),
  'ORTH-GAL-ZIYI-INF': t => /^noun\b/.test(t) && !has(t, 'prop'),
  'ORTH-GAL-GENPL-IY-INF': t => /^noun\b/.test(t) && has(t, 'p') && has(t, 'v_rod') && !has(t, 'prop'),
}
/** folds the reverse guard covers in an orth-less witness: the MM-52 ones and the Желехівка ones that build.ts applies to a text without `orth` (ZHEL_FOLDS + ORTH-ZHEL-TY / -TE) */
export const GUARDED_IDS: ReadonlySet<string> = new Set([...MM52_FOLDS.map(f => f.id), 'ORTH-ZHEL-SOFT', 'ORTH-ZHEL-SKY', 'ORTH-ZHEL-INIT-I', 'ORTH-ZHEL-JE', 'ORTH-ZHEL-JE-OBL', 'ORTH-ZHEL-TY', 'ORTH-ZHEL-TE'])

/**
 * The reverse guard + the analysis check, over link options. `own`: VESUM lists the token itself (any analysis). An option reached by a guarded fold is then dropped (the plain reading,
 * or the VESUM reading of the spelling, stays); otherwise every MM-52 fold of its chain must accept the analysis of the target.
 */
export function galGate<O extends { cand: { trace: string[] }; hit: { tags: string } }>(opts: O[], own: boolean, orth?: string, raw = ''): O[] {
  const ok = opts.filter(o => {
    const g = o.cand.trace.filter(i => GUARDED_IDS.has(i))
    if (!g.length) return true
    if (own && !orth) return false
    if (/(^|:)(abbr|nv)(:|$)/.test(o.hit.tags)) return false   // «бами → БАМ», «сьв → СВ»: an abbreviation / indeclinable is never the target of a spelling fold
    if (raw.length < 3 && g.some(i => i.startsWith('ORTH-GAL'))) return false   // a 2 letter token (пи) is too short for a rule that changes only its ending
    // a final -є is MM-48 / MM-49 territory (білє, забутє); in a text without orth only the noun reading ORTH-ZHEL-JE (питанє → питання) is taken, not є → е
    if (!orth && g.includes('ORTH-ZHEL-TE') && /є$/.test(raw)) return false
    return g.every(i => !MM52_EXPECT[i] || (orth && !i.startsWith('ORTH-GAL')) || MM52_EXPECT[i]!(o.hit.tags))
  })
  // -иї for -ії (партиї → партії) outranks the lengthened plural (партиї → парти): the second only when the first has no VESUM reading
  return ok.some(o => o.cand.trace.includes('ORTH-GAL-ZIYI-INF')) ? ok.filter(o => !o.cand.trace.includes('ORTH-GAL-LONG-INF')) : ok
}

// ── split tokens ───────────────────────────────────────────────────────────────────────────────────

export const SYA_SEP_ID = 'ORTH-GAL-SYA-SEP'
export const SYA_SEP_CITE = Q('WUK', WZ, 'Частку -ся писано окремо від дієслова: учить ся, являєть ся, сьміяти ся', 'Желехівка: «ся» окремо (старав ся); дієслово з наступним ся шукається як форма зворотного дієслова (старав + ся → старатися), якщо ВЕСУМ має таку форму')
/** the next token is a separated reflexive particle */
export const isReflNext = (next: string | undefined): boolean => !!next && /^(ся|сь)$/.test(next.toLowerCase())

export const FUSED_ID = 'ORTH-GAL-FUSED'
export const FUSED_CITE = Q('SMALST', 'Смаль-Стоцький, Руска правопись зі словарцем (1892), скан p. 9 (с. 12) і p. 22 (с. 19–20)', 'Противно пишемо разом слова зложені з: -б, -будь, -небудь, -де, -ж, -крат, -сь, пр. ділалаб, хвалилиб, колиб; хтож, щож', 'OCR; частка -ж / -б, написана разом з господарем (чомуж, колиб), це окрема частка: зв’язується господар; господар — ВЕСУМ-слово певного класу (див. fusedHostOk)')
const FUSED = /^(.{2,}?)(ж|б)$/
/** host + particle of a fused «чомуж», «колиб»; the caller links the host (VESUM decides first: ніж, дуже, ... keep their own link) */
export const splitFused = (w: string): { host: string; particle: string } | undefined => {
  const m = FUSED.exec(w.toLowerCase().replace(/[’ʼ`]/g, "'")); return m ? { host: m[1]!, particle: m[2]! } : undefined
}
/** the host of -ж must be a word that takes the emphatic particle (pronoun, adverb, conjunction, particle, numeral, interjection; never a preposition: віж is not в ж); of -б a conjunction / adverb / pronoun or a past verb */
export const fusedHostOk = (particle: string, tags: string): boolean =>
  particle === 'ж' ? /^(adv|conj|part|numr|intj|predic)\b/.test(tags) || has(tags, 'pron') : /^(adv|conj|part)\b/.test(tags) || has(tags, 'pron') || (/^verb\b/.test(tags) && has(tags, 'past'))

export const PCL_ID = 'ORTH-GAL-PCL'
export const PCL_CITE = Q('ENC', UM(162), 'Творення форм умов. сп. за допомогою особ. часток [писáў бим, бым; писáў бис’, быс’; писали бисме, быс’ме тощо]', 'ЕУМ «Закарпатський говір»; ЕУМ «Наддністрянський говір» (um173): «форми умов. сп. за моделлю даў бим, даў бис»; um162: «ходи́в-им, ходи́ла-м; ходи́в-ис’, ходи́ла-с’; ходи́ли-сме, ходи́ли-сте». Особовий закінчок -м / -с(ь) / -смо / -сте приєднано до сполучника або частки')
const PCL_PERSON: Record<string, string> = { м: '1 особа одн.', с: '2 особа одн.', сь: '2 особа одн.', смо: '1 особа мн.', сьмо: '1 особа мн.', сте: '2 особа мн.', сьте: '2 особа мн.' }
/** жеби'м, жебим, бись, абисте, щом → host + person marker (ЕУМ um162 / um173); undefined for anything else. The caller never splits a form VESUM lists (щось, бис). */
export const personClitic = (w: string): { host: string; clitic: string; person: string } | undefined => {
  const k = w.toLowerCase().replace(/[’ʼ`]/g, "'").replace(/'/g, '')
  const r = /^(жеби|аби|би|щоби|що)(м|сь|с|сьмо|смо|сьте|сте)$/.exec(k)
  return r ? { host: r[1]!, clitic: r[2]!, person: PCL_PERSON[r[2]!]! } : undefined
}
