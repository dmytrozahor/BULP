/**
 * SPEC 63 YT-2: documented continuants of ѣ (ять) other than the standard і (R09, core/phonology.ts, NOT repeated here), each a cited rule with a
 * dialect group and a gate year (research/42-yat.md). Nothing below is a spelling the corpus «proves»; a candidate is a HYPOTHESIS labelled with its dialect.
 *
 * > "У пн. (поліських) говорах у наголош. позиції найчастіше вживається дифтонг іе, а в частині говорів — монофтонги и, е, ê. У ненаголош. позиції виступають е або и з твердим поперед. приголосним" — ЕУМ «Ять» (um150)
 *
 * Method: a rule rewrites ONE ѣ of the normalised old spelling (stress is unknown to the analyser, so every position is a separate hypothesis; a rule with
 * `stress` says which one the source describes); the result is then run through the ordinary derive() so R09 turns every remaining ѣ into і and the other
 * sound rules apply as usual (reuse, not a copy of R09). The standard derivation stays untouched.
 * Gate: max(rule.earliest, DIALECT_GROUP_FROM[group].from) via core/rules.ts ruleGate — never before the group existed (Shevelov ch. 8).
 */
import { Q, type Evidence } from './evidence.ts'
import { derive, type Candidate } from './phonology.ts'
import { normalizeOld, type NormOpts } from './text.ts'
import { ruleGate } from './rules.ts'

export interface YatRule {
  id: string
  name: string
  /** DIALECT_GROUP_FROM / DIALECTS code (STD = the standard language, lexical branch; SW = south-west umbrella) */
  group: string
  /** which ѣ the source describes */
  stress: 'stressed' | 'unstressed' | 'final' | 'any'
  /** own dating (year from which the rule may fire), if the sources give one; the group gate applies on top */
  earliest?: number
  dated?: Evidence
  cite: Evidence[]
  /** lexical rules fire only on the stems the source prints */
  lexical: boolean
  /** every form this rule can make from the old spelling (one ѣ rewritten per variant) */
  variants: (w: string) => string[]
}

const EUM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
const E = (n: number, q: string, note?: string) => Q('ENC', EUM(n), q, note)
const WYAT = (q: string, note?: string) => Q('WUK', 'https://uk.wikipedia.org/wiki/Ять', q, note)
const SHEV3 = (q: string) => Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev04.htm, розд. 14.3', q)

const positions = (w: string, ok: (i: number) => boolean): number[] => [...w].flatMap((c, i) => (c === 'ѣ' && ok(i) ? [i] : []))
const sub = (w: string, i: number, to: string) => w.slice(0, i) + to + w.slice(i + 1)
const each = (to: string, ok: (w: string, i: number) => boolean = () => true) => (w: string) => [...new Set(positions(w, i => ok(w, i)).map(i => sub(w, i, to)))]
/** lexical: only words matching `stem`; the ѣ of the first capture group's position is rewritten. */
const lex = (stem: RegExp, to: string) => (w: string) => { const m = stem.exec(w); return m ? [w.slice(0, m.index) + m[0].replace('ѣ', to) + w.slice(m.index + m[0].length)] : [] }

const FIN = (w: string, i: number) => i === w.length - 1

export const YAT_RULES: YatRule[] = [
  { id: 'YT-FIN-I', name: 'Кінцевий ненаголошений -ѣ > -и в прислівниках на -гдѣ (нигдѣ → нигди → нігди); зап. діал.', group: 'SW', stress: 'final', lexical: true,
    cite: [
      Q('R2U', 'r2u Кримський–Єфремов · s?w=ще#1_27453714', 'Никогда́, нрч. – ніко́ли, (диал., зап.) ні́гди, ні́ґди[е]', 'словникова помета «диал., зап.»: форма нігди засвідчена; механізм — ненаголошений ѣ > и (ЕУМ «Ять», um150)'),
      Q('HRINCH', 'r2u Грінченко s.v. Запевне (rowId 29442750), цитата з Чуб. V. 137', 'запевне тим серцем нігди не зблудиш', 'фольклорний запис Чубинського, XIX ст.'),
      E(150, 'У ненаголош. позиції виступають е або и з твердим поперед. приголосним'),
      E(167, 'у ненаголош. позиції рефлекс -и (немá дóл’і, вôн на пóл’і, мéж’і)', 'середньополіський говір: ненаголошене закінчення колишнього -ѣ дає -и (іменникові закінчення, не прислівник)')],
    variants: w => /гдѣ$/.test(w) ? [w.slice(0, -1) + 'и'] : [] },
  { id: 'YT-FIN-E', name: 'Кінцевий ненаголошений -ѣ > -е в прислівниках на -гдѣ (нигде; середньополіські/східнополіські говірки)', group: 'MPL', stress: 'final', lexical: true,
    cite: [E(150, 'У ненаголош. позиції виступають е або и з твердим поперед. приголосним'), E(167, 'послідовна нейтралізація в ненаголош. позиції протиставлень ě, е — е: с’êн’і — сенéй')],
    variants: w => /гдѣ$/.test(w) ? [w.slice(0, -1) + 'е'] : [] },
  { id: 'YT-STD-I', name: 'Ненаголошений ѣ перед наголошеним складом > и в окремих словах літературної мови (дитина, сидіти, мизинець)', group: 'STD', stress: 'unstressed', lexical: true,
    cite: [WYAT('У деяких словах ě у ненаголошеному складі з наступним наголошеним перейшов в', 'приклади статті: дитина, сидіти, мизинець; у наголошеному стані й у закритому складі (діти, сідниці) переходу немає')],
    variants: w => [lex(/^д(ѣ)тин/, 'и')(w), lex(/^с(ѣ)дѣ(ти|ть|ли|л)/, 'и')(w), lex(/^м(ѣ)зинец/, 'и')(w)].flat() },
  { id: 'YT-UNSTR-E', name: 'Ненаголошений ѣ > е (діед — дедок, лес — лесок): північні й середньополіські говірки', group: 'MPL', stress: 'unstressed', earliest: 1401, lexical: false,
    dated: WYAT('в ненаголошених складах відбулася монофтонгізація', 'північне наріччя: ненаголошена монофтонгізація «не пізніше початку XV ст.» (стаття «Ять», розд. про датування)'),
    cite: [E(161, 'ê, іе — е в середньополіс. і східнополіс. говорах: л’êс — л’есóк'), E(167, 'послідовна нейтралізація в ненаголош. позиції протиставлень ě, е — е: с’êн’і — сенéй')],
    variants: each('е', (w, i) => i > 0) },
  { id: 'YT-STRESS-E-CLOSED', name: 'Наголошений ѣ > ê (закрите е): середньополіський, східнополіський', group: 'MPL', stress: 'stressed', lexical: false,
    cite: [E(161, 'ê, іе — е в середньополіс. і східнополіс. говорах: л’êс — л’есóк'), E(167, 'ê розвинулося на місці о в новозакритих складах', 'ê — закриті голосні як самостійні фонеми (д’êн’ ‘подінь’ — д’ен’ ‘день’); ЕУМ дає ê і для ѣ: с’êн’і')],
    variants: each('ê', (w, i) => i > 0 && !FIN(w, i)) },
  { id: 'YT-STRESS-IE', name: 'Наголошений ѣ > іе / ие (діед, ліес, с’иено, т’иесто, хміел’): поліські говірки', group: 'WPL', stress: 'stressed', lexical: false,
    cite: [E(168, 'під наголосом зустрічається ще й дифтонг [іе] чи [ие] (с’и́ено, л’іес, т’и́есто та ін.)'), SHEV3('збереженням і е як рефлексу ě'), E(150, 'У пн. (поліських) говорах у наголош. позиції найчастіше вживається дифтонг іе')],
    variants: w => [...each('іе', (x, i) => !FIN(x, i))(w), ...each('ие', (x, i) => !FIN(x, i) && i > 0)(w)] },
  { id: 'YT-WPL-I-Y', name: 'Ненаголошений ѣ > и в західнополіських говірках (мишок, писок)', group: 'WPL', stress: 'unstressed', lexical: false,
    cite: [E(168, 'хоч у ненаголош. позиції може бути й [и] ( мишóк, писóк та ін.)')],
    variants: each('и', (w, i) => i > 0 && !FIN(w, i)) },
  { id: 'YT-ZAK-YU', name: 'ѣ > ÿ (лабіалізований і) перед в/ў: д’ÿўка, хл’ÿў; закарпатські говірки', group: 'ZAK', stress: 'any', lexical: false,
    cite: [E(162, 'У деяких говірках в позиції перед у фонема [і] < [ Ђ ] переходить в [ÿ] (лабіалізований і) [д’ÿўка, хл’ÿў]')],
    variants: w => positions(w, i => /^[вў]/.test(w.slice(i + 1))).map(i => sub(w, i, 'ÿ')) },
  { id: 'YT-NDN-U-I', name: 'ѣ > у, и в окремих словах: д’ура, видро; наддністрянські говірки', group: 'NDN', stress: 'any', lexical: true,
    cite: [E(173, 'нерегулярний розвиток окр. давніх голосних — *ě > у (д’урá ‘ діра’), * ě > и (видрó)')],
    variants: w => [lex(/^д(ѣ)р/, 'у')(w), lex(/^в(ѣ)др/, 'и')(w)].flat() },
  { id: 'YT-SLB-VAR', name: 'ѣ > и, е, о в окремих словах: цилувати, целувати, хрен, хрон; слобожанські говірки', group: 'SLB', stress: 'any', lexical: true,
    cite: [E(169, 'непослідовні зміни давніх фонем: [ě] > [і], [и], [е], [о] (хр’ін і хрон, хр’ен, ц’ілувáти і цилувáти, целувáти)')],
    variants: w => [lex(/^ц(ѣ)лов/, 'и')(w), lex(/^ц(ѣ)лов/, 'е')(w), lex(/^хр(ѣ)н/, 'е')(w), lex(/^хр(ѣ)н/, 'о')(w)].flat() },
  { id: 'YT-STEP-VAR', name: 'ѣ > и, у в окремих словах: дирка, цулувати; степові говірки', group: 'STP', stress: 'any', lexical: true,
    cite: [E(171, 'неоднаковий розвиток [ě] — переважно як [і] , зрідка — як [и] , [е], [о], [у] (ди́рка, ц’ул’увáти)')],
    variants: w => [lex(/^д(ѣ)рк/, 'и')(w), lex(/^ц(ѣ)лов/, 'у')(w)].flat() },
]

export const yatRuleById = Object.fromEntries(YAT_RULES.map(r => [r.id, r])) as Record<string, YatRule>
/** The year from which the rule may fire (own dating, else the dialect group's gate; STD/SW have none → 0). */
export const yatGate = (r: YatRule) => ruleGate({ earliest: r.earliest ?? 0, label: r.group })

export interface YatCandidate extends Candidate { rule: string; group: string; dated?: Evidence; gate: number; status: 'hypothesis' }

/** Hypotheses for every dialect continuant of ѣ in `raw`. `year` (when known) drops rules gated later. The standard candidates are `derive(raw)`; none of those is repeated. */
export function yatContinuants(raw: string, opts: NormOpts & { year?: number } = {}): YatCandidate[] {
  const { norm } = normalizeOld(raw, opts), base = new Set(derive(raw, opts).candidates.map(c => c.form)), out = new Map<string, YatCandidate>()
  if (!norm.includes('ѣ')) return []
  for (const r of YAT_RULES) {
    const gate = yatGate(r)
    if (opts.year !== undefined && opts.year < gate) continue
    for (const v of r.variants(norm)) {
      for (const c of derive(v, { ...opts, oldI: false }).candidates) {
        if (base.has(c.form)) continue
        const key = c.form + '|' + r.id; if (out.has(key)) continue
        out.set(key, { ...c, trace: [r.id, ...c.trace], rule: r.id, group: r.group, dated: r.dated, gate, status: 'hypothesis' })
      }
    }
  }
  return [...out.values()]
}
