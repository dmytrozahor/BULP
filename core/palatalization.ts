/**
 * Second (Slavic) palatalization of velars, as a cited rule family (BL-20; research/03 R24, research/11 «Corroboration (WUK)»). Pure.
 *
 * > "Ця модель є добре знана з праслов’янських часів; її продовженням була друга палаталізація велярних (див. розділ 3)." — Шевельов, ІФУМ, 62 (shev08.htm)
 * > "В іменників із задньоязиковими -г-, -к-, -х- у корені діє друга палаталізація перед -и, -ѣ (друзи, ворози, вълци, дуси, друзѣ, ворозѣ, вълцѣ, дусѣ…)" — uk.wikipedia «Відмінок в українській мові», §Історія
 * > PAVL p. 61 «роука–роуцѣ»; p. 74 рѣка–рѣцѣ (research/11; the Old Cyrillic is a decoded legacy font, so the PAVL pair is a [P] paraphrase)
 *
 * к, г, х → ц, з, с before ѣ and before и < *oi: dat./loc. sg. of ā-stems (руцѣ, нозѣ, сусѣ), loc. sg. and nom. pl. of ŏ-stems (друзѣ, друзи, вълци),
 * 2sg imperative of velar verbs (помози, рьци). Ukrainian keeps the alternation (руці, нозі, друзі); Russian levels it (R24).
 * Forward: `palatalize`. Backward (token → velar-stem lemma, the linking fallback): `velarCandidates`. Detector for attested pairs: `secondPalatalization`.
 */
import { claim, P, Q, type Claim, type Evidence } from './evidence.ts'

export const PAL: Record<string, string> = { к: 'ц', г: 'з', х: 'с' }
export const UNPAL: Record<string, string> = { ц: 'к', з: 'г', с: 'х' }
const VOW = 'аеиіїоуєюяѣѧѫыъь'
const skeleton = (s: string) => [...s].filter(c => !VOW.includes(c)).join('')

export const R24_CITE: Evidence[] = [
  Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev08.htm, розд. 62', 'її продовженням була друга палаталізація велярних (див. розділ 3)'),
  Q('WUK', 'https://uk.wikipedia.org/wiki/Відмінок_в_українській_мові, §Історія, тип з основою на *-ā / *-ŏ', 'В іменників із задньоязиковими -г-, -к-, -х- у корені діє друга палаталізація перед -и, -ѣ (друзи, ворози, вълци, дуси, друзѣ, ворозѣ, вълцѣ, дусѣ…)'),
  P('PAVL', 'с. 61 («роука–роуцѣ»), с. 74 («рѣка–рѣцѣ»)', 'у давальному й місцевому відмінках однини після задньоязикового кореня -ѣ: рука — руцѣ, рѣка — рѣцѣ (за research/11)'),
]

/** Forward: velar stem + ending. `form` is the stem+ending WITHOUT the alternation (e.g. 'рукѣ'), the palatalised variant is returned ('руцѣ'); null if not applicable. */
export function palatalize(form: string): string | null {
  const m = /^(.*?)([кгх])([иѣі])$/.exec(form)
  return m && m[1]!.length >= 1 ? `${m[1]}${PAL[m[2]!]}${m[3]}` : null
}

/** Backward step (rule R24r, applied to a derived token form): ц, з, с before the final и/і/ѣ → к, г, х. */
export const restoreVelar = (w: string) => w.replace(/([цзс])([иіѣ])$/, (_, c: string, v: string) => UNPAL[c]! + v)

export interface VelarCand { restored: string; lemma: string; cls: 'noun' | 'verb'; gender?: 'f' }
/** Lemma candidates (modern spelling) for a token form ending in ц/з/с + и/і/ѣ whose velar-stem lemma it may be: рука (f), друг (m), помогти / ректи (inf). */
export function velarCandidates(form: string): VelarCand[] {
  const m = /^(.+?)([цзс])([иіѣ])$/.exec(form)
  if (!m) return []
  const stem = m[1]! + UNPAL[m[2]!]!, out: VelarCand[] = m[1]!.length < 2 ? [] : [{ restored: stem + m[3]!, lemma: stem + 'а', cls: 'noun', gender: 'f' }, { restored: stem + m[3]!, lemma: stem, cls: 'noun' }]
  if (m[2] !== 'с') {
    if (m[1]!.length >= 2) out.push({ restored: stem + m[3]!, lemma: stem + 'ти', cls: 'verb' })
    if (m[3] === 'и' && skeleton(m[1]!) === m[1] && m[1]!.length >= 1) {   // vowelless stem after jer loss (рьци > рци): ректи
      const s2 = m[1]![0]! + 'е' + m[1]!.slice(1) + UNPAL[m[2]!]!
      out.push({ restored: s2 + 'и', lemma: s2 + 'ти', cls: 'verb' })
    }
  }
  return out
}

export interface PalAlt { velar: string; pal: string }
/**
 * Does `form` show the second-palatalization alternation of `lemma`'s stem? Consonant skeletons are compared (бік–боці, друг–друзі, рука–руці, помогти–помози):
 * they agree except for the stem-final velar, which appears as ц/з/с directly before a final и/і/ѣ.
 */
export function secondPalatalization(lemma: string, form: string): PalAlt | null {
  const fm = /^(.+?)([цзс])[иіѣ]$/.exec(form)
  if (!fm) return null
  const ls = lemma.replace(/(ти|ть|чи)$/, '').replace(/[аоеяь]$/, '')
  const velar = ls.slice(-1)
  if (!(velar in PAL) || PAL[velar] !== fm[2]) return null
  const a = skeleton(ls), b = skeleton(fm[1]! + fm[2]!)
  return a.length >= 2 && a.slice(0, -1) === b.slice(0, -1) && b.length === a.length ? { velar, pal: fm[2]! } : null
}

export interface PalAttested { raw: string; form: string; alt: string; f: number; via: 'R24r' | 'kept' }
export interface PalInput { raw: string; forms: string[]; f: number; viaR24r: boolean; ev: Evidence }
/** Lemma-level claim «друга палаталізація» (BL-20): the attested forms of this lemma that show the alternation; evidence = the rule's citations + the attested lines. */
export function palatalClaim(lemma: string, ins: PalInput[]): Claim<{ forms: PalAttested[] }> | undefined {
  const forms: PalAttested[] = [], ev: Evidence[] = []
  for (const i of ins) {
    const hit = i.forms.map(f => ({ f, a: secondPalatalization(lemma, f) })).find(x => x.a)
    if (!hit && !i.viaR24r) continue
    forms.push({ raw: i.raw, form: hit?.f ?? i.forms[0] ?? i.raw, alt: hit ? `${hit.a!.velar} → ${hit.a!.pal}` : '', f: i.f, via: i.viaR24r ? 'R24r' : 'kept' }); ev.push(i.ev)
  }
  if (!forms.length) return undefined
  forms.sort((a, b) => b.f - a.f || a.raw.localeCompare(b.raw))
  return claim({ forms }, [...R24_CITE, ...ev.slice(0, 4)], { method: 'R24' })
}
