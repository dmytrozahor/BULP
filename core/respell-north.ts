/**
 * SPEC 63 OV-13 — Polissian (north dialect group) respelling rules: the reflexes of the modern і by ORIGIN and STRESS, and the stressed а/я > е of West Polissian.
 * Owner 2026-10-29: «А і поліське єкання не показується після вибору діалекту для слів, палєсся, палієсся і тд».
 *
 * Every rule fires only (1) on a letter whose origin (ѣ → R09, о/е in a new closed syllable → R10) comes from DATA (core/origin.ts: an attested old spelling replayed through the
 * derivation, or a VESUM alternation), never from the spelling alone, and (2) on a STRESSED / UNSTRESSED vowel as the source states. No origin or no stress → the rule is
 * skipped with a reason (respell.ts: «походження і не встановлено — діалектну форму не виведено»), the standard form stays. The cites are verbatim ЕУМ quotes
 * (http://litopys.org.ua/ukrmova/umNNN.htm, the pages the repo already cites in core/rules.ts and core/yat.ts). Letters outside the modern alphabet (ê, ô, ÿ) are not written:
 * MPL о > ê (стêл) has no modern spelling and is listed as «не виведено» in the spec. Sub-groups: CHN = Східне, MPL = Середнє, WPL = Західне Полісся; the
 * diphthongs of WPL (вуол, л’іес) are the NORTH variant of it only («у пн. говірках», «ще й») and are not generated for plain WPL (they are attested forms, core/ikavism.ts).
 */
import { Q, type Evidence } from './evidence.ts'
import type { Origin } from './origin.ts'
import type { Edit, SpellRule } from './respell.ts'

const E = (n: number, quote: string, note?: string): Evidence => Q('ENC', `http://litopys.org.ua/ukrmova/um${n}.htm`, quote, note)
const YAT_STRESSED = 'У пн. (поліських) говорах у наголош. позиції найчастіше вживається дифтонг іе, а в частині говорів — монофтонги и, е, ê.'
const CHN_D = E(155, 'С. (л.) г. зберігає дифтонги на місці етимологічних [о], [е] та [ě] (вуол, піеч, діед)')
const WPL_O = E(168, 'Відповідно до етимологічного [о] в новозакритих складах під наголосом виступають здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил, кіин’, віил, кін’, віл та ін.)')
const MPL_E = [E(150, YAT_STRESSED), E(161, 'ê, іе — е в середньополіс. і східнополіс. говорах: л’êс — л’есóк')]

type Org = (i: number) => Origin | null
/** replace the stressed/unstressed і whose origin satisfies `pick` by `to(code)` */
const iTo = (stressed: boolean, pick: (o: Origin) => boolean, to: (code: string) => string, notInitial = false) => (w: string, st: Set<number>, org: Org, code: string): Edit[] =>
  [...w].flatMap((c, i) => { const o = c === 'і' && st.has(i) === stressed && !(notInitial && i === 0) ? org(i) : null; return o && pick(o) ? [[i, i + 1, to(code)] as Edit] : [] })
const fromO = (o: Origin) => o.rule === 'R10' && o.src === 'о'
const fromE = (o: Origin) => (o.rule === 'R10' && o.src === 'е') || o.rule === 'R09'
const oldYat = (o: Origin) => o.rule === 'R09' && o.kind !== 'new'

export const NORTH_RULES: SpellRule[] = [
  // о in a new closed syllable, stressed: CHN diphthong уо (вуол), WPL monophthong у (кун’, вул); MPL ê has no modern letter → not generated
  { id: 'NORTH-STRESS-O', codes: { CHN: 'CHN-DIPH', WPL: 'MONO-UY' }, needs: 'origin', example: ['віл', 'вуол'], own: { CHN: CHN_D, WPL: WPL_O },
    edits: iTo(true, fromO, c => (c === 'CHN' ? 'уо' : 'у')) },
  // е / ѣ stressed: CHN іе (піеч, діед), MPL іе (ЕУМ «найчастіше … іе»); plain WPL keeps і ("ще й" іе only in the north variant)
  { id: 'NORTH-STRESS-E', codes: { CHN: 'CHN-DIPH', MPL: 'N-DIPH-IE' }, needs: 'origin', example: ['піч', 'піеч'], own: { CHN: CHN_D, MPL: MPL_E[0]! },
    edits: iTo(true, fromE, () => 'іе') },
  // ѣ unstressed: CHN, MPL > е (лес — лесок); WPL > и (мишок, писок). Not word-initial, not the «new» ѣ.
  { id: 'NORTH-UNSTR-YAT', codes: { CHN: 'YT-UNSTR-E', MPL: 'YT-UNSTR-E', WPL: 'YT-WPL-I-Y' }, needs: 'origin', example: ['лісок', 'лесок'],
    own: { CHN: MPL_E[1]!, MPL: MPL_E[1]!, WPL: E(168, 'хоч у ненаголош. позиції може бути й [и] ( мишóк, писóк та ін.)') },
    edits: iTo(false, oldYat, c => (c === 'WPL' ? 'и' : 'е'), true) },
  // WPL: stressed а after a soft or hushing consonant > е (взяв → взев, тяжко → тежко, часто → честo)
  { id: 'WPL-A-E', codes: { WPL: 'SW-A-SOFT' }, needs: 'stress', example: ['тяжко', 'тежко'],
    edits: (w, st) => [...w.matchAll(/([бвгґджзклмнпрстфхцчшщ])([яа])/g)].filter(m => (m[2] === 'я' || 'жчшщ'.includes(m[1]!)) && st.has(m.index! + 1)).map(m => [m.index! + 1, m.index! + 2, 'е'] as Edit) },
]
