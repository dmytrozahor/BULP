/**
 * Stem-type assignment for nouns (SPEC 50 EP-4): Old Ukrainian lemma + gender → PAVL stem type and model lemma, by data rules each carrying its PAVL citation (P-1.3).
 * The criteria are PAVL pp. 71–74 (quotes checked against the page images); first match wins; no rule → unknown (P-3.1).
 * -ц- stems (птица) are deliberately left to no rule: PAVL gives no criterion for their softness (SPEC 50 ST-14, open question).
 */
import { claim, unknown, type Claim, type Evidence, Q } from './evidence.ts'
import type { StemType, StemValue } from './types.ts'

type G = StemValue['gender']
export interface StemRule { id: string; cite: Evidence; type: StemType; model: string | ((lemma: string) => string); score?: number; test: (lemma: string, g: G) => boolean }

const P71 = (q: string) => Q('PAVL', 'с. 71, Давні типи відмінювання за детермінативом', q)
const P72 = (q: string) => Q('PAVL', 'с. 72, Давні типи відмінювання за детермінативом', q)
const P74 = (q: string) => Q('PAVL', 'с. 74, «Особливості давнього відмінювання іменників»', q)
const U_LIST = ['сынъ', 'волъ', 'полъ', 'вьрхъ', 'медъ', 'домъ', 'ледъ', 'чинъ', 'садъ', 'рядъ', 'разъ', 'пиръ', 'солодъ', 'миръ', 'станъ', 'низъ', 'долъ', 'олъ']
const S_LIST = ['небо', 'слово', 'тѣло', 'око', 'ухо', 'чюдо']
const UU_LIST = ['буки', 'мърки', 'цьрки']   // PAVL writes the -ū nominative -и (graphic «ы» in the model боукы)
const HUSH = /[жчшщ]$/
/** lemma as compared: lower case, TOROT homonym suffix (#1) removed, graphic variants of я and е unified */
export const lemmaKey = (l: string) => l.normalize('NFC').toLowerCase().replace(/#\d+$/, '').replace(/[ꙗѩѧ]/g, 'я').replace(/є/g, 'е')
const ends = (l: string, re: RegExp) => re.test(lemmaKey(l))

export const STEM_RULES: StemRule[] = [
  { id: 'ST-01', type: 'u', model: 'сынъ', score: 0.5, test: (l, g) => g === 'm' && U_LIST.includes(lemmaKey(l)),
    cite: P71('Сюди з меншою або більшою мірою достовірності можна віднести такі слова: сынъ, волъ, полъ, вьрхъ, медъ, домъ, ледъ, чинъ, садъ, рядъ, разъ, пиръ, солодъ, миръ, станъ, низъ, долъ, олъ.') },
  { id: 'ST-02', type: 's', model: 'небо', test: (l, g) => g === 'n' && S_LIST.includes(lemmaKey(l)),
    cite: P72('іменники середнього роду з основою на *-s: небо, слово, тѣло, око, ухо, чюдо, які закінчувалися в називному відмінку на -о') },
  { id: 'ST-03', type: 'men', model: 'имꙗ', test: (l, g) => g === 'n' && ends(l, /мя$/),
    cite: P72('б) іменники середнього роду на *-еn(-mеn), які в називному відмінку однини оформлялися за допомогою -мя: племя, тѣмя, ім’я') },
  { id: 'ST-04', type: 'nt', model: 'телꙗ', test: (l, g) => g === 'n' && ((ends(l, /я$/) && !ends(l, /мя$/)) || lemmaKey(l) === 'отроча'),
    cite: P72('в) іменники середнього роду на *-ат (-ят), що означали недорослих істот і мали в прямому відмінку закінчення -а, -я: теля, отроча, дитя') },
  { id: 'ST-05', type: 'r', model: 'мати', test: l => ['мати', 'дъчи'].includes(lemmaKey(l)),
    cite: P72('ґ) два іменники жіночого роду на -r, оформлені в називному відмінку однини закінченням -и: мати, дъчи.') },
  { id: 'ST-06', type: 'uu', model: 'боукы', test: (l, g) => g === 'f' && (ends(l, /ы$/) || UU_LIST.includes(lemmaKey(l))),
    cite: P72('Іменники жіночого роду на *-ū. Це ті, що в називному відмінку однини мали закінчення -и … буки, мърки, цьрки – род. однини букве, мъркве, церкве.') },
  { id: 'ST-07', type: 'i', model: 'зꙗть', test: (l, g) => g === 'm' && (ends(l, /[бпвдтс]ь$/) || ['звѣрь', 'огнь', 'угль'].includes(lemmaKey(l))),
    cite: P71('Критерії їх розрізнення такі. По-перше, слід пам’ятати, що іменники, які мали фінальну частину бь, пь, вь, дь, ть, сь, належали до основ на *-ĭ. Крім того, сюди увійшли такі слова: звѣрь, огнь, угль') },
  { id: 'ST-08', type: 'i', model: 'печь', test: (l, g) => g === 'f' && ends(l, /ь$/),
    cite: P71('Іменники чоловічого й жіночого роду на *-ĭ. У називному відмінку однини вони закінчувалися на -ь: медвѣдь, гость, гусь, ночь, путь, рать, печь.') },
  { id: 'ST-09', type: 'o', model: 'плодъ', test: (l, g) => g === 'm' && ends(l, /ъ$/),
    cite: P71('У називному відмінку однини іменники чоловічого роду закінчувалися на -ъ чи -ь, а іменники середнього роду − на -о, -е: братъ, столъ, дворь, край, конь, вои, князь; село, поле, знание, дѣло.') },
  { id: 'ST-10', type: 'jo', model: l => (HUSH.test(lemmaKey(l).replace(/[ьйи]$/, '')) ? 'мечь' : 'конь'), test: (l, g) => g === 'm' && ends(l, /[ьйи]$/),
    cite: P71('У називному відмінку однини іменники чоловічого роду закінчувалися на -ъ чи -ь, а іменники середнього роду − на -о, -е: братъ, столъ, дворь, край, конь, вои, князь; село, поле, знание, дѣло.') },
  { id: 'ST-11', type: 'o', model: 'село', test: (l, g) => g === 'n' && ends(l, /о$/),
    cite: P71('У називному відмінку однини іменники чоловічого роду закінчувалися на -ъ чи -ь, а іменники середнього роду − на -о, -е: братъ, столъ, дворь, край, конь, вои, князь; село, поле, знание, дѣло.') },
  { id: 'ST-12', type: 'jo', model: 'поле', test: (l, g) => g === 'n' && ends(l, /е$/),
    cite: P71('У називному відмінку однини іменники чоловічого роду закінчувалися на -ъ чи -ь, а іменники середнього роду − на -о, -е: братъ, столъ, дворь, край, конь, вои, князь; село, поле, знание, дѣло.') },
  { id: 'ST-13', type: 'a', model: 'рѣка', test: (l, g) => g !== 'n' && ends(l, /[^аеиоуыѣъьйюяжчшщц]а$/),
    cite: P71('Іменники чоловічого, жіночого й спільного роду на *-ā /*-јā. У називному відмінку однини вони мали, як правило, закінчення -а/-йа, рідше – флексію -і (графічне и): сестра, рука, риба, жажа, судия, староста, сирота, пустини, княгини.') },
  { id: 'ST-14', type: 'ja', model: l => (HUSH.test(lemmaKey(l).replace(/а$/, '')) && ends(l, /а$/) ? 'доуша' : 'землꙗ'), test: (l, g) => g !== 'n' && (ends(l, /я$/) || ends(l, /[жчшщ]а$/) || (g === 'f' && ends(l, /[ыи]ни$/))),
    cite: P74('для основ на *-ŏ/*-јŏ та *-ā/-jā існували твердий і м’який варіанти відмінювання. Мішаної групи як парадигматичного підтипу в праслов’янській мові не існувало, оскільки шиплячі приголосні в той час були м’якими') },
]
export const stemRuleById = Object.fromEntries(STEM_RULES.map(r => [r.id, r])) as Record<string, StemRule>

/** First matching rule for an Old Ukrainian lemma of known gender (EP-4.2); undefined = no rule. */
export function assignStem(old: string, gender: G): StemValue & { score?: number } | undefined {
  const r = STEM_RULES.find(x => x.test(old, gender))
  return r ? { type: r.type, model: typeof r.model === 'string' ? r.model : r.model(old), old, gender, rule: r.id, ...(r.score !== undefined ? { score: r.score } : {}) } : undefined
}

/**
 * EP-4.3 / P-1.4: the stem claim carries the rule's citation, the lemma record (`lemmaEv`: where the Old Ukrainian lemma was read — TOROT or Stanza) and the gender evidence.
 * `method` is the rule id, with «+stanza» when the lemma is a model output (SPEC 50 D4): such a claim and the reconstructions built on it are model-based (P-1.7).
 */
export function stemClaim(old: string, gender: G | undefined, lemmaEv: Evidence, genderEv: Evidence[], fromStanza: boolean): Claim<StemValue> {
  const v = gender ? assignStem(old, gender) : undefined
  if (!v) return unknown()
  const { score, ...value } = v
  return claim(value, [stemRuleById[v.rule]!.cite, lemmaEv, ...genderEv], { score, method: v.rule + (fromStanza ? '+stanza' : '') })
}
