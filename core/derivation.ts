/**
 * Derivation by prefixes (SPEC 60 DV-1…DV-2; user U-1 «ділати -> зділати, переділати, відділати (ся!)»).
 *
 * > "Префікс з- перед буквами на позначення глухих приголосних к, п, т, ф, х переходить у с-: сказати, спалахнути, стовкти, сфотографувати, схилити.
 * >  Перед усіма іншими буквами пишемо з (зрідка із)" — Правопис 2019 § 31.1 (research/12 Round 2)
 * > "Коли ж корінь слова починають дві букви на позначення приголосних, пишемо префікс зі-: зібгати, зігнути, зіпсувати" — § 31.1
 * > "кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин" — § 31.2
 *
 * The prefix table is DATA (P-4.2): every row carries a `cite` (P-1.3). Rows whose allomorph/meaning was not quoted from the Правопис
 * (пере-, на-, за-, по-, у-/в-, до-, недо-, про-, і всі доповнення віді-/розі-/од-…) have `weight: 0` — they are hints (P-3.1): the generated
 * candidate is shown only as a suggestion (`hint`), and is a fact only when VESUM / the corpus attest the form (D-evidence).
 * Output is `method: 'derivation'` (P-1.7): a suggestion is never a dictionary fact.
 */
import { claim, D, P, Q, type Claim, type Evidence } from './evidence.ts'

const PRAV = 'https://slovnyk.ua/pravopys.php?prav_par=31'
const q = (quote: string) => Q('PRAV', `${PRAV} (§ 31)`, quote)
const noQuote = (what: string) => P('PRAV', `${PRAV} (§ 31 «Правопис префіксів»)`, `§ 31 «Правопис префіксів»: ${what} — форму не цитовано в research/12`, 'weight 0: гіпотеза без прямої цитати')

const V = '[аеєиіїоуюя]'
/** a stem opening with two consonant letters (cluster) → зі-/ві… allomorph; apostrophe/ь/й count as part of the consonant run only for ь */
const CLUSTER = /^[бвгґджзклмнпрстфхцчшщ]{2}/
const VOICELESS_START = /^[кптфх]/
const APOS_STEM = /^[яюєї]/

/** One allomorph: `when` tests the stem; the first matching alternative gives the surface prefix. Last alternative has no `when`. */
export interface Allo { when?: RegExp; form: string }
export interface PrefixRow {
  id: string
  /** canonical prefix shown in the UI */
  prefix: string
  allo: Allo[]
  /** 0 = no quoted source: candidates are hints (P-1.3, P-3.1) */
  weight: 0 | 1
  /** prefix is closed-class: it only occurs in listed words (прі-): never productively generated */
  closed?: string[]
  /** meaning (uk), when quoted */
  meaning?: string
  cite: Evidence
}

export const PREFIXES: PrefixRow[] = [
  { id: 'PFX-Z', prefix: 'з-', weight: 1,
    allo: [{ when: VOICELESS_START, form: 'с' }, { when: CLUSTER, form: 'зі' }, { form: 'з' }],
    cite: q('Префікс з- перед буквами на позначення глухих приголосних к, п, т, ф, х переходить у с-: сказати, спалахнути, стовкти, сфотографувати, схилити. Перед усіма іншими буквами пишемо з (зрідка із)') },
  { id: 'PFX-ZO', prefix: 'зо-', weight: 0, allo: [{ when: CLUSTER, form: 'зо' }],
    cite: q('У деяких словах можна паралельно вживати префікси зі- та зо-: зігрівати і зогрівати, зімліти і зомліти') },
  { id: 'PFX-ROZ', prefix: 'роз-', weight: 1, allo: [{ form: 'роз' }],
    cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-BEZ', prefix: 'без-', weight: 1, allo: [{ form: 'без' }], cite: q('безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-VID', prefix: 'від-', weight: 1, allo: [{ form: 'від' }], cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-OD', prefix: 'од-', weight: 0, allo: [{ form: 'од' }], cite: noQuote('од- не входить до § 31: діалектне/давнє (research/04)') },
  { id: 'PFX-VYI', prefix: 'віді-', weight: 0, allo: [{ when: CLUSTER, form: 'віді' }], cite: noQuote('віді- немає в нормі (research/12 Round 2: вилучення)') },
  { id: 'PFX-VY', prefix: 'ви-', weight: 0, allo: [{ form: 'ви' }], cite: noQuote('ви-') },
  { id: 'PFX-PRY', prefix: 'при-', weight: 1, allo: [{ form: 'при' }], meaning: 'наближення, приєднання, частковість дії, результат дії',
    cite: q('наближення, приєднання, частковість дії, результат дії (прибігти, прибудувати); просторового прилягання (пригірок, прибережний); неповноти ознаки') },
  { id: 'PFX-PRE', prefix: 'пре-', weight: 1, allo: [{ form: 'пре' }], meaning: 'найвищий ступінь ознаки; старослов’янські слова',
    cite: q('вживаємо в якісних прикметниках і похідних від них прислівниках для вираження найвищого ступеня вияву ознаки: прегарний, прекрасний, пречудово… а також у словах … старослов’янського походження: преосвящений, преподобний, престол') },
  { id: 'PFX-PRI', prefix: 'прі-', weight: 1, allo: [{ form: 'прі' }], closed: ['прізвисько', 'прізвище', 'прірва'],
    cite: q('Префікс прі- вживаємо тільки в словах прізвисько, прізвище, прірва') },
  { id: 'PFX-PERE', prefix: 'пере-', weight: 0, allo: [{ form: 'пере' }], cite: noQuote('пере-') },
  { id: 'PFX-NA', prefix: 'на-', weight: 0, allo: [{ form: 'на' }], cite: noQuote('на-') },
  { id: 'PFX-ZA', prefix: 'за-', weight: 0, allo: [{ form: 'за' }], cite: noQuote('за-') },
  { id: 'PFX-PO', prefix: 'по-', weight: 0, allo: [{ form: 'по' }], cite: noQuote('по-') },
  { id: 'PFX-U', prefix: 'у-', weight: 0, allo: [{ form: 'у' }], cite: noQuote('у-') },
  { id: 'PFX-V', prefix: 'в-', weight: 0, allo: [{ form: 'в' }], cite: noQuote('в- (чергування у/в у прийменниках — §23, до префікса не застосовано)') },
  { id: 'PFX-OB', prefix: 'об-', weight: 1, allo: [{ form: 'об' }], cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-OBI', prefix: 'обі-', weight: 0, allo: [{ when: CLUSTER, form: 'обі' }], cite: noQuote('обі- немає в нормі') },
  { id: 'PFX-PID', prefix: 'під-', weight: 1, allo: [{ form: 'під' }], cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-PIDI', prefix: 'піді-', weight: 0, allo: [{ when: CLUSTER, form: 'піді' }], cite: noQuote('піді- немає в нормі') },
  { id: 'PFX-NAD', prefix: 'над-', weight: 1, allo: [{ form: 'над' }], cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-NADI', prefix: 'наді-', weight: 0, allo: [{ when: CLUSTER, form: 'наді' }], cite: noQuote('наді- немає в нормі') },
  { id: 'PFX-DO', prefix: 'до-', weight: 0, allo: [{ form: 'до' }], cite: noQuote('до-') },
  { id: 'PFX-NEDO', prefix: 'недо-', weight: 0, allo: [{ form: 'недо' }], cite: noQuote('недо-') },
  { id: 'PFX-PERED', prefix: 'перед-', weight: 1, allo: [{ form: 'перед' }], cite: q('кінцевий дзвінкий приголосний перед наступним глухим не змінюємо: безкорисливий, відкриття, відстань, обпалити, передплатити, підтримка, розтягнути, розчин') },
  { id: 'PFX-PRO', prefix: 'про-', weight: 0, allo: [{ form: 'про' }], cite: noQuote('про-') },
]

/** § 7 п.4: after a prefix ending in a hard consonant, я ю є ї take the apostrophe (від’їзд, з’їхати, роз’юшити). */
const APOS_CITE = Q('PRAV', 'https://slovnyk.ua/pravopys.php?prav_par=7 (§ 7 п.4)', 'Після префіксів та першої частини складних слів, що закінчуються на твердий приголосний: без’ядерний, без’язикий, від’їзд, з’єднаний, з’їхати, з’явитися, напів’європейський, об’єм, під’їхати, під’юдити, роз’юшити')

export type DerivStatus = 'vesum' | 'corpus' | 'suggestion'
export interface Derivative {
  prefix: string
  row: string
  form: string
  reflexive: boolean
  status: DerivStatus
  /** weight-0 row: the prefix rule has no quoted source → the candidate is a hint unless attested */
  hint: boolean
  claim: Claim<string>
}
/** Existence oracle: 'vesum' (D-evidence from VESUM), 'corpus' (attested in the corpus) or null. Injected so tests can mock VESUM. */
export type Has = (form: string) => 'vesum' | 'corpus' | null | undefined | false

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[’ʼ`]/g, "'")

/** Surface form of prefix + stem (allomorph by stem, apostrophe per § 7 п.4). */
export function attach(row: PrefixRow, stem: string): { form: string; apostrophe: boolean } {
  const allo = row.allo.find(a => !a.when || a.when.test(stem))
  if (!allo) return { form: '', apostrophe: false }
  const ends = allo.form[allo.form.length - 1]!
  const apostrophe = APOS_STEM.test(stem) && !new RegExp(V).test(ends) && ends !== 'ь'
  return { form: allo.form + (apostrophe ? "'" : '') + stem, apostrophe }
}

/** BL-5: surface prefixes (all allomorphs) longest first; used to peel an existing prefix off a verb lemma. */
const SURFACE = [...new Set(PREFIXES.filter(p => !p.closed).flatMap(p => p.allo.map(a => a.form)))].sort((x, y) => y.length - x.length)
/** `base` = surface prefix + a verb that `has` attests (в+робити, пере+дати) → that verb; else undefined. Longest prefix first, apostrophe at the join dropped. */
export function stripPrefix(base: string, has: Has): string | undefined {
  for (const p of SURFACE) {
    if (base.length <= p.length + 2 || !base.startsWith(p)) continue
    const rest = base.slice(p.length).replace(/^'/, '')
    if (/ти$/.test(rest) && has(rest)) return rest
  }
  return undefined
}

/**
 * DV-2: candidate prefixed lemmas of `lemma` (+ reflexive -ся), classified against `has`.
 * Attested ones (any verb or noun) are always returned; unattested candidates are returned (as `suggestion`) only for verbs
 * (lemma in -ти / -тися) so a noun does not produce 25 meaningless reconstructions.
 */
export function derivatives(lemma: string, has: Has): Derivative[] {
  const base0 = norm(lemma).trim()
  const reflexiveIn = /ся$/.test(base0), base = reflexiveIn ? base0.slice(0, -2) : base0
  const verb = /ти$/.test(base)
  const out: Derivative[] = []
  const seen = new Set<string>()
  // BL-5: a lemma that is already prefix + attested verb (вробити = в- + робити) is derived from that base; stacking on the whole lemma (обвробити) is kept only when attested
  const root = verb ? stripPrefix(base, has) : undefined
  const stem = root ?? base
  for (const row of PREFIXES) {
    if (row.closed) { for (const w of row.closed) if (w === row.prefix.slice(0, -1) + base && has(w) && !seen.has(w)) { seen.add(w); out.push(make(row, w, false, has(w) as 'vesum' | 'corpus', lemma)) } continue }
    const { form } = attach(row, stem)
    if (!form || form === base) continue
    if (root) { const whole = attach(row, base).form; for (const refl of [false, true]) { const f = refl ? whole + 'ся' : whole; if (whole && f !== base0 && !seen.has(f) && has(f)) { seen.add(f); out.push(make(row, f, refl, has(f) as 'vesum' | 'corpus', lemma)) } } }
    for (const refl of verb ? [false, true] : [false]) {
      const f = refl ? form + 'ся' : form
      if (seen.has(f)) continue
      const hit = has(f) || null
      if (!hit && !verb) continue
      seen.add(f)
      out.push(make(row, f, refl, hit, lemma))
    }
  }
  const rank = (d: Derivative) => (d.status === 'suggestion' ? 1 : 0) * 4 + (d.hint ? 2 : 0) + (d.reflexive ? 1 : 0)
  return out.sort((a, b) => rank(a) - rank(b))   // stable: table order inside a rank
}

function make(row: PrefixRow, form: string, reflexive: boolean, hit: 'vesum' | 'corpus' | null, lemma: string): Derivative {
  const ev: Evidence[] = [row.cite]
  if (form.includes("'") && !lemma.includes("'")) ev.push(APOS_CITE)
  if (hit) ev.push(D(hit === 'vesum' ? 'VESUM' : 'CORPUS', form, `форму «${form}» засвідчено (${hit === 'vesum' ? 'ВЕСУМ' : 'корпус'})`, `від «${lemma}»`))
  else ev.push(D('INPUT', form, `«${row.prefix}» + «${lemma}» → «${form}» (не засвідчено)`, 'method: derivation (P-1.7)'))
  const status: DerivStatus = hit ?? 'suggestion'
  return { prefix: row.prefix, row: row.id, form, reflexive, status, hint: row.weight === 0, claim: claim(form, ev, { method: hit ? undefined : 'derivation' }) }
}

export const prefixById = Object.fromEntries(PREFIXES.map(p => [p.id, p])) as Record<string, PrefixRow>
