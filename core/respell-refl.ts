/**
 * SPEC 63 MM-58 — the MOBILE reflexive particle in the dialect view (owner: «на картках для дієслів коли переключаєш на діалекти де відділяється ся то так і пиши, ся / сє + дієслово»;
 * «смієт ся сміє ся / сє в цьому випадку теж можливо»; «сє до речі теж галицкий відповідник … вроді тернопільський»).
 *
 * Only what the ЕУМ states is a rule, per dialect, with the dialect's own words:
 *  PKB  um175 «наявність рухомої зворотної частки -ся як у постпозиції, так і в препозиції у різних її фонет. варіантах (с’а, са, си)»  -> main: after the verb (бою ся); also before it (ся бою); ся / са / си
 *  POD  um180 «препозитивне вживання (у західноподіл. говірках) частки ся (де с’а ти д’ла)»  -> main: before the verb (ся бою)
 * Every other dialect: no statement (NDN um173, SYAN um174, ZAK um162 (only the enclitic pronoun с’а «себе» and a fused с’мійтис’а), HUT um176, BOY um177, LEM um172, WPL um168, VOL um178): unchanged.
 * «сє» has no source in the repo: kind P, grade «за свідченням носія», the owner's words verbatim including «вроді»; it is never the main form and it names no dialect.
 * The 3rd person -ться composes with the hard -т (POD um180 / NDN um173, GAL-3T-HARD): POD's main form is «ся смієт»; the other t-forms (смієть, сміє) are variants, not silently dropped.
 */
import { P, Q, type Evidence } from './evidence.ts'

export type Place = 'post' | 'pre'
export interface ReflRule { code: string; main: Place; alt: Place[]; clitics: string[]; cite: Evidence; /** the clitic spellings the source names */ named: string }
const UM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
export const REFL_RULES: Record<string, ReflRule> = {
  PKB: { code: 'PKB', main: 'post', alt: ['pre'], clitics: ['ся', 'си', 'са'], named: 'ся, са, си',
    cite: Q('ENC', UM(175), 'наявність рухомої зворотної частки -ся як у постпозиції, так і в препозиції у різних її фонет. варіантах (с’а, са, си)', 'ЕУМ «Покутсько-буковинський говір»; the page prints the accented vowels as images (с’а = ся). The source gives no main order: the form after the verb is shown first (the way the Желехівка print writes it), the other order is a variant') },
  POD: { code: 'POD', main: 'pre', alt: [], clitics: ['ся'], named: 'ся',
    cite: Q('ENC', UM(180), 'препозитивне вживання (у західноподіл. говірках) частки ся (де с’а ти д’ла)', 'ЕУМ «Подільський говір»: the western Podolian говірки only; only the order before the verb is stated') },
}
export const SE_OWNER = P('OWNER', 'повідомлення власника, 2026-11-04', '«і сє до речі теж галицкий відповідник» … «і вроді тернопільський»', 'за свідченням носія («вроді» — власник не впевнений); у ЕУМ (um162, um173, um174, um175, um176, um177, um180) форми сє немає, діалект джерелом не названо: варіант, не основна форма')
export const T_OWNER = P('OWNER', 'повідомлення власника, 2026-11-04', '«смієт ся сміє ся / сє в цьому випадку теж можливо»', 'за свідченням носія: тверде -т або без -т перед відділеною часткою; ЕУМ: тверде -т 3-ї особи — POD um180, NDN um173 (окремо, без частки)')

/** the owner's confirmation that ALL the variants are possible in Galician in general (2026-11-04): the evidence of every shape no ЕУМ page states */
export const GAL_OWNER = P('OWNER', 'повідомлення власника, 2026-11-04', '«в цілому ці всі варіанти можливі для галицького діалекту наприклад» (смієт ся, сміє ся, смієт сє, сміє сє)', 'за свідченням носія; ЕУМ не називає цих форм (крім PKB um175, POD um180 — див. REFL_RULES)')
/** the dialects the owner calls Galician: the shapes are listed as variants for each (the main form stays the standard one where ЕУМ states nothing) */
export const GALICIAN: ReadonlySet<string> = new Set(['NDN', 'PKB', 'SYAN', 'HUT', 'BOY', 'LEM'])
/** host + clitic of a reflexive verb form (боюся -> бою + ся; сміється -> смієть + ся; боявсь -> боявв + сь) */
export const reflSplit = (w: string): { host: string; clitic: 'ся' | 'сь' } | undefined => {
  const m = /^(.{2,})(ся|сь)$/.exec(w.toLowerCase()); return m ? { host: m[1]!, clitic: m[2] as 'ся' | 'сь' } : undefined
}
export const reflText = (host: string, clitic: string, place: Place): string => (place === 'post' ? `${host} ${clitic}` : `${clitic} ${host}`)

export interface ReflVariant { text: string; grade: 'Q' | 'P'; why: string; cite: Evidence[] }
/** the host spellings of a form: the soft -ть (смієть), the hard -т (смієт: POD / NDN cited, otherwise owner), the dropped -т (сміє: owner) */
export function reflHosts(host: string, code: string): { text: string; grade: 'Q' | 'P'; why: string; cite?: Evidence }[] {
  if (!/ть$/.test(host)) return [{ text: host, grade: 'Q', why: '' }]
  const hard = host.slice(0, -1), dropped = host.slice(0, -2)
  return [{ text: host, grade: 'Q', why: '' },
    { text: hard, grade: code === 'POD' || code === 'NDN' ? 'Q' : 'P', why: 'тверде -т', cite: code === 'POD' ? undefined : T_OWNER },
    { text: dropped, grade: 'P', why: '-т опущено', cite: T_OWNER }]
}
/**
 * main form + variants of the reflexive verb `w` (a STANDARD spelling of a reflexive verb form) for dialect `code`; undefined when the dialect has no statement or `w` is not reflexive.
 * `hard` = the main form already carries the cited hard -т (the GAL-3T-HARD rule of POD).
 */
export function reflForms(w: string, code: string): { main: string; variants: ReflVariant[] } | undefined {
  const stated = REFL_RULES[code], sp = reflSplit(w); if ((!stated && !GALICIAN.has(code)) || !sp) return undefined
  const rule: ReflRule = stated ?? { code, main: 'post', alt: [], clitics: ['ся'], named: '', cite: GAL_OWNER }
  const hs = reflHosts(sp.host, code), mainHost = code === 'POD' && hs[1]?.grade === 'Q' ? hs[1] : hs[0]!
  const main = stated ? reflText(mainHost.text, sp.clitic, rule.main) : w.toLowerCase()   // no ЕУМ statement: the main form is the standard spelling, the shapes are variants
  const out: ReflVariant[] = [], seen = new Set<string>([main])
  const clitics = [...rule.clitics.map(c => (sp.clitic === 'сь' && c === 'ся' ? 'сь' : c)), 'сє']
  const places: Place[] = [rule.main, ...rule.alt]
  for (const h of hs) for (const pl of places) for (const c of clitics) {
    const text = reflText(h.text, c, pl); if (seen.has(text)) continue
    seen.add(text)
    const cites: Evidence[] = [rule.cite]
    let grade: 'Q' | 'P' = stated ? 'Q' : 'P'; const why: string[] = []
    if (pl !== rule.main) why.push(pl === 'pre' ? 'перед дієсловом' : 'після дієслова')
    if (h === hs[0] && mainHost !== hs[0]) why.push('м’яке -ть')
    if (h.why) { why.push(h.why); if (h.grade === 'P') { grade = 'P'; if (h.cite) cites.push(h.cite) } }
    if (c === 'сє') { grade = 'P'; cites.push(SE_OWNER); why.push('сє') } else if (c !== sp.clitic && c !== 'ся' && c !== 'сь') why.push(c)
    out.push({ text, grade, why: why.join(', '), cite: cites })
  }
  out.sort((a, b) => a.why.split(',').filter(Boolean).length - b.why.split(',').filter(Boolean).length || a.text.localeCompare(b.text))
  return { main, variants: out.slice(0, 24) }
}

// ── the reverse side: the same words read back (shared by the build, the annotator and «Аналіз слова») ──────────────────────────────────
/** the separated clitic tokens: ся (and the Galician сь / сє / си / са). си / са are also other words (dative pronoun си): the caller links only when the joined form is a reflexive verb. */
export const REFL_CLITIC_RE = /^(ся|сь|сє|си|са)$/
export const isReflClitic = (t: string | undefined): boolean => !!t && REFL_CLITIC_RE.test(t.toLowerCase())
/** the reflexive spellings a host token can stand for: смієт / смієть / сміє + ся = сміється; бою + ся = боюся; the VESUM lookup decides */
export function reflJoins(host: string): string[] {
  const h = host.toLowerCase().replace(/[’ʼ`]/g, "'")
  const out = [h + 'ся', h + 'сь']
  if (/т$/.test(h) && !/ть$/.test(h)) out.push(h + 'ься')
  if (/ть$/.test(h)) out.push(h.slice(0, -2) + 'ться')
  if (/[аеєиіоуюяї]$/.test(h)) out.push(h + 'ться')
  return [...new Set(out)]
}
/** «сє» (and no other spelling) is the Galician counterpart of ся: the standalone token links to the word ся */
export const toSya = (w: string): string => (w === 'сє' ? 'ся' : w)
