/**
 * SPEC 63 CP-11 — a page for every original (base) form and every derived form, even without evidence («Виправ аби завжди оригінальна форма мала свою сторінку, це також стосується
 * всіх похідних форм. Навіть без доказів, як гіпотези»; trigger: «Чому існує байдики але не байдик?»).
 *
 * Pure rules, no data: the browser (src/lib/hypothesis.ts) checks the candidates against the indexes it already loads. A hypothetical form is NEVER a word of the lexicon:
 * its claim carries `method: 'hypothesis'` and kind-P evidence «джерела не знайдено» (or the rule's own cite), the page wears the badge HYP_BADGE and the grade HYP_GRADE,
 * which never says «засвідчено». A form that some source attests has a real page (/w, /lw, /ar) and is never graded here.
 */
import { claim, P, type Claim, type Evidence } from './evidence.ts'
import { key } from './text.ts'

export const HYP_BADGE = 'гіпотеза, без доказів'
export const HYP_GRADE = 'гіпотетична форма: у жодному джерелі не засвідчена'
export const HYP_NO_SOURCE = 'джерела не знайдено'

export interface HypRule {
  id: string
  /** what the rule does, in Ukrainian; shown on the page */
  uk: string
  /** the pattern, e.g. «-ик / -ики» */
  pattern: string
  cite: Evidence
}
const noSource = (id: string, what: string): Evidence => P('INPUT', `core/hypothesis.ts ${id}`, `${HYP_NO_SOURCE}: ${what}`, 'method: hypothesis (P-1.7)')

export const RULES: Record<string, HypRule> = {
  'SG-M': { id: 'SG-M', pattern: '-ик / -ики', uk: 'однина відтворена за зразком відміни чоловічого роду: нульове закінчення в називному однини, -и / -і в множині (р. мн. -ів)', cite: noSource('SG-M', 'відміна: нульове закінчення ~ -и') },
  'SG-M-SOFT': { id: 'SG-M-SOFT', pattern: '-ь / -і', uk: 'однина відтворена за зразком м’якої відміни чоловічого роду: основа на м’який приголосний + -ь, у множині -і (р. мн. -ів)', cite: noSource('SG-M-SOFT', 'м’яка відміна: -ь ~ -і') },
  'SG-F-A': { id: 'SG-F-A', pattern: '-а / -и', uk: 'однина відтворена за зразком відміни на -а: називний однини на -а, у множині -и (р. мн. без закінчення)', cite: noSource('SG-F-A', 'відміна на -а ~ -и') },
  'SG-F-JA': { id: 'SG-F-JA', pattern: '-я / -і', uk: 'однина відтворена за зразком відміни на -я: називний однини на -я, у множині -і (р. мн. без закінчення)', cite: noSource('SG-F-JA', 'відміна на -я ~ -і') },
  'SG-F-SOFT': { id: 'SG-F-SOFT', pattern: '-ь / -і', uk: 'однина відтворена за зразком третьої відміни: називний однини на -ь, у множині -і (р. мн. -ей)', cite: noSource('SG-F-SOFT', 'третя відміна: -ь ~ -і, -ей') },
  'SG-N-O': { id: 'SG-N-O', pattern: '-о / -а', uk: 'однина відтворена за зразком середнього роду: називний однини на -о, у множині -а', cite: noSource('SG-N-O', 'середній рід -о ~ -а') },
  'SG-N-E': { id: 'SG-N-E', pattern: '-е / -я', uk: 'однина відтворена за зразком середнього роду: називний однини на -е, у множині -я', cite: noSource('SG-N-E', 'середній рід -е ~ -я') },
  'DV-UVATY': { id: 'DV-UVATY', pattern: 'X → X-увати', uk: 'дієслівний суфікс -ува- / -юва-: дієслово утворене від іменної основи', cite: noSource('DV-UVATY', 'суфікс -ува-/-юва-') },
  'DV-NNYA': { id: 'DV-NNYA', pattern: 'X-ати → X-ання', uk: 'віддієслівний іменник на -ння (-ування, -ання): дію названо від дієслова', cite: noSource('DV-NNYA', 'суфікс -нн(я)') },
  'DV-STVO': { id: 'DV-STVO', pattern: 'X → X-ство', uk: 'іменниковий суфікс -ств(о): абстрактне поняття від іменної основи', cite: noSource('DV-STVO', 'суфікс -ств(о)') },
}

// ── plurale tantum → the singular ───────────────────────────────────────────────────────────────

/** VESUM tags of a noun that has no singular: plural number (`:p:`) and the `ns` flag (байдики noun:inanim:p:v_naz:ns) */
export const isPluralOnly = (tags: string | undefined): boolean => !!tags && /(^|[: ])noun/.test(tags) && /(^|:)p(:|$)/.test(tags) && /(^|:)ns(\s|:|$)/.test(tags)

export interface Singular { form: string; rule: HypRule }
const VOWEL = /[аеєиіїоуюя]$/
const SOFT_CONS = /[дтзснцлр]$/

/**
 * The nominative-singular candidates of a plural-only noun, by the regular declension of the stem; best first. `genPl` (the genitive plural, when known) decides the gender class:
 * -ів / -їв = masculine, -ей = soft third declension, no such ending = feminine / neuter; without it the order is masculine, feminine, neuter.
 */
export function singularOf(plural: string, genPl?: string): Singular[] {
  const p = key(plural), g = genPl ? key(genPl) : undefined
  if (p.length < 3) return []
  const out: Singular[] = []
  const add = (form: string, id: string) => { if (form.length >= 2 && !out.some(o => o.form === form)) out.push({ form, rule: RULES[id]! }) }
  const stem = p.slice(0, -1), last = p.slice(-1)
  const masc = !g || /(ів|їв)$/.test(g), soft3 = !g || /ей$/.test(g), noEnd = !g || !/(ів|їв|ей)$/.test(g)
  const order: [boolean, () => void][] = []
  if (last === 'и') {
    order.push([masc && !VOWEL.test(stem), () => add(stem, 'SG-M')])
    order.push([noEnd && !VOWEL.test(stem), () => add(stem + 'а', 'SG-F-A')])
  } else if (last === 'і') {
    order.push([masc && !VOWEL.test(stem), () => add(SOFT_CONS.test(stem) ? stem + 'ь' : stem, SOFT_CONS.test(stem) ? 'SG-M-SOFT' : 'SG-M')])
    order.push([soft3 && !VOWEL.test(stem), () => add(stem + 'ь', 'SG-F-SOFT')])
    order.push([noEnd && /[цсз]$/.test(stem), () => add(stem + 'я', 'SG-F-JA')])
  } else if (last === 'а') {
    order.push([!!stem, () => add(stem + 'о', 'SG-N-O')])
  } else if (last === 'я') {
    order.push([!!stem, () => add(stem + 'е', 'SG-N-E')])
  }
  for (const [ok, f] of order) if (ok) f()
  return out
}

/** the plural-only forms a singular may be the original of (to look up in VESUM): regular plural endings of the stem */
export function pluralCandidates(sg: string): string[] {
  const s = key(sg), out = new Set<string>()
  if (s.length < 3) return []
  if (/[бвгґджзклмнпрстфхцчшщ]$/.test(s)) out.add(s + 'и').add(s + 'і')
  if (/ь$/.test(s)) out.add(s.slice(0, -1) + 'і')
  if (/а$/.test(s)) out.add(s.slice(0, -1) + 'и')
  if (/ця$/.test(s)) out.add(s.slice(0, -2) + 'ці')
  if (/я$/.test(s)) out.add(s.slice(0, -1) + 'і')
  if (/о$/.test(s)) out.add(s.slice(0, -1) + 'а')
  if (/е$/.test(s)) out.add(s.slice(0, -1) + 'я')
  out.delete(s)
  return [...out]
}

// ── derivation: base ↔ derived ──────────────────────────────────────────────────────────────────

export interface Rel { form: string; rule: HypRule }

/** the words derived from `base` by the suffix rules of this module (candidates only: the caller checks which exist) */
export function derivedCandidates(base: string): Rel[] {
  const b = key(base)
  if (b.length < 3 || /(ти|тись|ся)$/.test(b)) return []
  const out: Rel[] = []
  if (/[бвгґджзклмнпрстфхцчшщь]$/.test(b) && !/ь$/.test(b)) {
    out.push({ form: b + 'увати', rule: RULES['DV-UVATY']! }, { form: b + 'ування', rule: RULES['DV-NNYA']! }, { form: b + 'ство', rule: RULES['DV-STVO']! })
  } else if (/[аеєиіїоуюя]$/.test(b)) {
    out.push({ form: b.slice(0, -1) + 'ювати', rule: RULES['DV-UVATY']! })
  }
  return out
}

/** the bases a word may be derived from, one step (the caller may follow the chain: байдикування → байдикувати → байдик) */
export function baseCandidates(word: string): Rel[] {
  const w = key(word), out: Rel[] = []
  let m: RegExpMatchArray | null
  if ((m = w.match(/^(.{3,})(ув|юв)ання$/))) out.push({ form: m[1]! + m[2]! + 'ати', rule: RULES['DV-NNYA']! })
  else if ((m = w.match(/^(.{3,})(ян|ан)ня$/))) out.push({ form: m[1]! + m[2]!.slice(0, -1) + 'ти', rule: RULES['DV-NNYA']! })
  if ((m = w.match(/^(.{3,}?)(ув|юв)ати(ся)?$/))) out.push({ form: m[1]!, rule: RULES['DV-UVATY']! })
  if ((m = w.match(/^(.{3,})ство$/))) out.push({ form: m[1]!, rule: RULES['DV-STVO']! })
  return out
}

/** the claim of a hypothetical form: kind-P evidence (the rule's own cite plus «джерела не знайдено»), method `hypothesis`; it passes claim() */
export function hypClaim(form: string, rule: HypRule, from: string): Claim<string> {
  return claim(form, [rule.cite, noSource(rule.id, `«${form}» виведено з «${from}»`)], { method: 'hypothesis' })
}

// ── CP-11c: labels on a reconstructed form ──────────────────────────────────────────────────────

export const ARCHAIC_NOTE = 'давня (архаїчна) форма — відтворення за давньою відміною (і-основа)'
export const RU_COINCIDE_NOTE = 'збігається з російським написанням, не русизм'
/** the proto-Slavic stems that the i-stem rule is known for (kind P: no etymology file of the repo holds them, to be checked against ЕСУМ) */
const PROTO: Record<string, string> = { 'дверь': '*dvьrь' }
export interface FormNotes {
  /** the form is an old-declension reconstruction (SG-F-SOFT: a soft-sign singular of the old i-stems, дверь) */
  archaic?: { uk: string; stem: string; proto?: string; cite: Evidence }
}
/** the labels of a hypothetical form that its rule knows: the declension / stem class, the proto form when known (P) */
export function formNotes(form: string, rule: HypRule): FormNotes {
  if (rule.id !== 'SG-F-SOFT') return {}
  const proto = PROTO[key(form)]
  return { archaic: { uk: ARCHAIC_NOTE, stem: 'давня і-основа', proto,
    cite: P('INPUT', 'core/hypothesis.ts SG-F-SOFT', `${ARCHAIC_NOTE}${proto ? `; праслов’янська форма ${proto}` : ''}: ${HYP_NO_SOURCE} у сховищі, перевірити за ЕСУМ`, 'method: hypothesis (P-1.7)') } }
}
