/**
 * Modern-orthography derivation (SPEC 60 MO-1…MO-2; user U-4 «бурян -> бур'ян»). Applied as the LAST step after the historical rules
 * (core/phonology.ts) and in /analyze. Rules are DATA with a § cite (P-1.3); output = suggestions with a trace (P-1.5).
 *
 * > "Апостроф пишемо перед я, ю, є, ї: 1. Після букв на позначення губних приголосних б, п, в, м, ф: б’ю, п’ять, п’є, в’язи, солов’ї, м’ясо … 2. Після р: бур’ян, міжгір’я, пір’я, матір’ю, кур’єр" — Правопис 2019 § 7
 * > "Апостроф не пишемо, коли ря, рю, рє означають сполучення пом’якшеного р із наступними а, у, е: буряк, буряний, крякати, рябий, рюмсати, крюк" — § 7 п.2 Примітка
 * > "Апостроф не пишемо, коли перед буквою на позначення губного звука є інша буква (крім р), що належить до кореня (основи): … свято, тьмяний, цвях" — § 7 п.1 Примітка
 *
 * буряк (soft р) and бур’ян (hard р + j) are spelled alike up to the apostrophe, so no regex can decide: the apostrophe rules are LEXICAL.
 * `has` (VESUM / lexicon, injected) decides: a candidate is `vesum` only when `has(candidate)`; without that it is a `hint` (P-3.1).
 * MO-2: a word that `has` already attests is never rewritten (no suggestion at all).
 */
import { claim, D, Q, type Claim, type Evidence } from './evidence.ts'

const PRAV = (n: number, sub = '') => `https://slovnyk.ua/pravopys.php?prav_par=${n}${sub ? ` (${sub})` : ''}`
const AP = "'"
const VOW = 'аеєиіїоуюя', YA = 'яюєї', LAB = 'бпвмф'

/**
 * structural: the rule is a spelling invariant (ьо never opens a word) → `rule`.
 * lexical: the candidate is a fact only when `has` attests it, otherwise a `hint`.
 * confirmed: the rule is offered only when `has` attests the candidate (г→ґ, loanword apostrophe).
 */
export type ModMode = 'structural' | 'lexical' | 'confirmed'
export interface ModRule { id: string; section: string; mode: ModMode; name: string; cite: Evidence; variants: (w: string) => string[] }

const ins = (w: string, i: number) => w.slice(0, i) + AP + w.slice(i)
/** every position i (apostrophe goes before w[i]) where `at(i)` holds, one variant per position */
const positions = (w: string, at: (i: number) => boolean) => { const out: string[] = []; for (let i = 1; i <= w.length - 1; i++) if (at(i)) out.push(ins(w, i)); return out }
const noApos = (w: string, i: number) => w[i - 1] !== AP && w[i] !== AP

const PFX_APOS = ['без', 'від', 'з', 'об', 'під', 'роз', 'напів', 'пан', 'дит', 'камер', 'мін']

export const MODERN_RULES: ModRule[] = [
  { id: 'MO-APOS-LAB', section: '§ 7 п.1', mode: 'lexical', name: 'апостроф після губного (м’ясо, п’ять, здоров’я)',
    cite: Q('PRAV', PRAV(7, '§ 7 п.1'), 'Апостроф пишемо перед я, ю, є, ї: 1. Після букв на позначення губних приголосних б, п, в, м, ф: б’ю, п’ять, п’є, в’язи, солов’ї, м’ясо, рум’яний, (на) тімʼї, жираф’ячий, мереф’янський'),
    // Примітка: no apostrophe when another ROOT consonant (except р) precedes the labial → only word-initial or vowel/р before it
    variants: w => positionsLab(w) },
  { id: 'MO-APOS-R', section: '§ 7 п.2', mode: 'lexical', name: 'апостроф після р (бур’ян, пір’я, кур’єр)',
    cite: Q('PRAV', PRAV(7, '§ 7 п.2'), 'Після р: бур’ян, міжгір’я, пір’я, матір’ю, кур’єр, (на) подвір’ї; Валер’ян, Мар’яна, Мар’яненко',
      'Примітка: «Апостроф не пишемо, коли ря, рю, рє означають сполучення пом’якшеного р із наступними а, у, е: буряк, буряний, крякати, рябий, рюмсати, крюк» — тому лише за словником'),
    variants: w => positions(w, i => w[i - 1] === 'р' && YA.includes(w[i]!) && i >= 2 && noApos(w, i)) },
  { id: 'MO-APOS-K', section: '§ 7 п.3', mode: 'lexical', name: 'апостроф у Лук’ян',
    cite: Q('PRAV', PRAV(7, '§ 7 п.3'), 'Після к у слові Лук’ян і похідних від нього: Лук’яненко, Лук’янюк, Лук’янець'),
    variants: w => (/^лук[яюєї]/.test(w) ? [ins(w, 3)] : []) },
  { id: 'MO-APOS-PFX', section: '§ 7 п.4', mode: 'lexical', name: 'апостроф після префікса на твердий приголосний (від’їзд, з’їхати)',
    cite: Q('PRAV', PRAV(7, '§ 7 п.4'), 'Після префіксів та першої частини складних слів, що закінчуються на твердий приголосний: без’ядерний, без’язикий, від’їзд, з’єднаний, з’їхати, з’явитися, напів’європейський, об’єм, під’їхати, під’юдити, роз’юшити'),
    variants: w => PFX_APOS.filter(p => w.length > p.length && w.startsWith(p) && YA.includes(w[p.length]!)).map(p => ins(w, p.length)) },
  { id: 'MO-APOS-LOAN', section: '§ 138', mode: 'confirmed', name: 'апостроф в іншомовних словах (комп’ютер, інтерв’ю, кар’єра)',
    cite: Q('PRAV', PRAV(138, '§ 138'), 'Апостроф у словах іншомовного походження та похідних пишемо перед я, ю, є, ї … 1) після приголосних б, п, в, м, ф, г, к, х, ж, ч, ш, р: б’єф, комп’ютер, інтерв’ю, прем’єр, кар’єра',
      'Апостроф не пишемо: … 2) коли я, ю позначають пом’якшення попереднього приголосного перед а, у: бязь; бюджет, бюро, кювет — тому лише за словником'),
    variants: w => positions(w, i => 'бпвмфгкхжчшр'.includes(w[i - 1]!) && YA.includes(w[i]!) && noApos(w, i)) },
  { id: 'MO-G', section: '§ 6', mode: 'confirmed', name: 'ґ замість г (ґудзик, ґрунт)',
    cite: Q('PRAV', PRAV(6, '§ 6 п.1'), 'Буква ґ передає на письмі задньоязиковий зімкнений приголосний: 1. В українських та в давно запозичених і зукраїнізованих словах: ґанок, ґатунок, ґвалт, ґедзь, ґудзик, ґуля, … ґрунт …',
      'старі тексти пишуть г і для [ɡ]: ґ відновлюється лише за словником'),
    variants: w => { const idx = [...w].flatMap((c, i) => (c === 'г' ? [i] : [])); if (!idx.length) return []; const sub = (s: string, i: number) => s.slice(0, i) + 'ґ' + s.slice(i + 1); return [...new Set([w.replaceAll('г', 'ґ'), ...idx.slice(0, 6).map(i => sub(w, i))])] } },
  { id: 'MO-JO-INIT', section: '§ 8', mode: 'structural', name: 'йо на початку слова і після голосного (його, район)',
    cite: Q('PRAV', PRAV(8, '§ 8'), 'Буквосполучення йо передає звукосполучення й + о: 1) на початку слова та після букви, що позначає голосний: його, йому, завойований, район … 2. Буквосполучення ьо пишемо після букви для позначення м’якості приголосного перед о: всього, Ковальов, льон, сьогодні, сьомий, трьох, цього'),
    variants: w => { const o = w.replace(/^ьо/, 'йо').replace(new RegExp(`(?<=[${VOW}])ьо`, 'g'), 'йо'); return o === w ? [] : [o] } },
  { id: 'MO-JO-SOFT', section: '§ 8', mode: 'confirmed', name: 'ьо після приголосного (льон, сьогодні)',
    cite: Q('PRAV', PRAV(8, '§ 8'), 'Буквосполучення ьо пишемо після букви для позначення м’якості приголосного перед о: всього, Ковальов, льон, сьогодні, сьомий, трьох, цього',
      'курйоз, серйозний (§ 138 п.2: йо без апострофа) — тому лише за словником'),
    variants: w => { const o = w.replace(/(?<=[бвгґджзклмнпстфхцчшщ])йо/g, 'ьо'); return o === w ? [] : [o] } },
  { id: 'MO-SK', section: '§ 19', mode: 'lexical', name: '-ськ-/-ств- → -цьк-/-цтв-/-зьк-/-зтв-',
    cite: Q('PRAV', PRAV(19, '§ 19'), 'к, м’який ц, ч + -ськ-(ий), -ство-(о) → -цьк-(ий), -цтв-(о): гірник — гірницький — гірництво; козак — козацький — козацтво … 2) г, ж, з + -ськ-(ий), -ств-(о) → -зьк-(ий), -зтв-(о): Прага — празький; убогий — убозтво … 3) х, ш, с + -ськ-, -ств- → -ськ-, -ств-'),
    variants: w => {
      const o = w.replace(/[кцч](ськ|ств)/g, (_, x) => (x === 'ськ' ? 'цьк' : 'цтв')).replace(/[гжз](ськ|ств)/g, (_, x) => (x === 'ськ' ? 'зьк' : 'зтв'))
        .replace(/(?<=[ц])к(?=ий|ій|а|е|і|ого|ому|ої|им|их)/g, 'ьк').replace(/(?<=[з])к(?=ий|ій|а|е|і|ого|ому|ої|им|их)/g, 'ьк')
      return o === w ? [] : [o] } },
  { id: 'MO-GEM', section: '§ 29–30', mode: 'lexical', name: 'подовження -є > -я (життє → життя, знанє → знання)',
    cite: Q('PRAV', PRAV(30, '§ 30'), 'Приголосні д, т, з, с, л, н, ж, ш, ц, ч подовжуються (на письмі їх позначаємо двома буквами), коли вжиті після голосного: 1) перед я, ю, і, є в усіх відмінкових формах іменників середнього роду другої відміни … знаряддя, життя, мотуззя, гілля, знання, збіжжя, сторіччя'),
    variants: w => { const m = new RegExp(`^(.*[${VOW}])([дтзслнжшцч])(?:ь?є|ье|ьѥ|ѥ)$`).exec(w); return m ? [m[1]! + m[2]! + m[2]! + 'я'] : [] } },
]

/** positions for MO-APOS-LAB: labial before я ю є ї, not preceded by another root consonant (except р) */
function positionsLab(w: string): string[] {
  return positions(w, i => LAB.includes(w[i - 1]!) && YA.includes(w[i]!) && noApos(w, i)
    && (i - 1 === 0 || VOW.includes(w[i - 2]!) || w[i - 2] === 'р'))
}

export const modernRuleById = Object.fromEntries(MODERN_RULES.map(r => [r.id, r])) as Record<string, ModRule>

export interface ModStep { rule: string; section: string; from: string; to: string; cite: Evidence }
export type ModStatus = 'vesum' | 'rule' | 'hint'
export interface Modernization { form: string; steps: ModStep[]; status: ModStatus; claim: Claim<string> }
export type HasForm = (form: string) => boolean

const MAX = 24
const cap = (src: string, out: string) => (src[0] !== src[0]!.toLowerCase() ? out[0]!.toUpperCase() + out.slice(1) : out)

/**
 * MO-1/MO-2: suggestions for a modern spelling of `word` (already folded to modern Cyrillic by the historical rules).
 * Never rewrites a form `has` attests; suggestions are ordered vesum → rule → hint, fewer steps first.
 */
export function modernize(word: string, has: HasForm): Modernization[] {
  const src = word.normalize('NFC').replace(/[’ʼ`]/g, AP)
  const low = src.toLowerCase()
  if (!low || has(low)) return []
  let cands: { form: string; steps: ModStep[] }[] = [{ form: low, steps: [] }]
  for (const r of MODERN_RULES) {
    const next = [...cands]
    for (const c of cands) for (const v of r.variants(c.form)) {
      if (v !== c.form && !next.some(n => n.form === v)) next.push({ form: v, steps: [...c.steps, { rule: r.id, section: r.section, from: c.form, to: v, cite: r.cite }] })
    }
    cands = next.slice(0, MAX)
  }
  const out: Modernization[] = []
  for (const c of cands) {
    if (!c.steps.length) continue
    const hit = has(c.form)
    const modes = c.steps.map(s => modernRuleById[s.rule]!.mode)
    if (!hit && modes.includes('confirmed')) continue
    const status: ModStatus = hit ? 'vesum' : modes.every(m => m === 'structural') ? 'rule' : 'hint'
    const ev: Evidence[] = [...new Map(c.steps.map(s => [s.rule, s.cite])).values()]
    ev.push(hit ? D('VESUM', c.form, `форму «${c.form}» засвідчено у словнику`, `від «${low}»`) : D('INPUT', low, `вхідне слово «${low}»; «${c.form}» у словнику немає`, 'method: derivation (P-1.7)'))
    out.push({ form: cap(src, c.form), steps: c.steps, status, claim: claim(cap(src, c.form), ev, { method: hit ? 'derivation+lexicon' : 'derivation' }) })
  }
  const rank = { vesum: 0, rule: 1, hint: 2 } as const
  return out.sort((a, b) => rank[a.status] - rank[b.status] || a.steps.length - b.steps.length)
}
