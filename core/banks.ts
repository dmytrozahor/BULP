/**
 * SW-vs-SE "bank" type of a form or a lemma (SPEC 60 BK-1, research/20 §3–§4).
 *
 * > "a 'bank' is not a dialect. ЕУМ places the SW/SE boundary at the line «Фастів — Біла Церква — Ставище — Тальне — Первомайськ — Ананьїв»
 * >  (um159), i.e. the Right-bank centre (Kyivshchyna, Cherkashchyna) belongs to the SOUTH-EASTERN dialect together with the Left bank." — research/20 §3
 * > "Evidence claim, not a fact [P-1.7]: the score ranks a text's *language* region and never overrides the witness's recorded region." — research/20 §4
 *
 * Model (research/20 §4): each matched feature i adds s_i = sign · w_i · g_i(date) · h_i to a log-odds, sign = +1 for SE (Left bank), −1 for SW;
 * P(SE) = 1/(1+exp(−c·Σ s_i)), prior 0. g_i = 0 when the text predates the feature (rows with no source date: 1798, as the dialect gate);
 * h_i = 0.5 for a scribal-norm text (Church-Slavonic-influenced spelling: spoken-language features show unevenly in written norms).
 * Fewer than two matched rows of weight ≥ 2 → "insufficient evidence", no number. The matched features, not the number, are the evidence.
 *
 * `BANK_CALIBRATION` (c = 0.8) is **the project's choice**, not a source's: it is a first calibration constant, to be tuned on witnesses of known region.
 */
import { claim, unknown, Q, P, D, type Claim, type Evidence } from './evidence.ts'
import { normative, type Ctx } from './detect.ts'

export type Side = 'SW' | 'SE'
/** Flagged calibration constant (research/20 §4.3): project choice, not a source figure. */
export const BANK_CALIBRATION = 0.8
export const BANK_CALIBRATION_NOTE = `c = ${BANK_CALIBRATION} — проєктна константа (перше калібрування), не з джерела; підлягає налаштуванню на пам'ятках із відомим регіоном (research/20 §4.3)`
/** Features with no source date are applied only to texts ≥ this year (research/20 §4.2, same as the dialect gate). */
export const BANK_DEFAULT_GATE = 1798
/** Minimum number of matched rows with weight ≥ 2 (research/20 §4.4). */
export const BANK_MIN_STRONG = 2

export type BankCtx = Ctx & { scribal?: boolean }

export interface BankFeature {
  id: string
  /** SW = Right bank (south-western dialect); SE = Left bank (south-eastern/northern, incl. the Right-bank centre) */
  side: Side
  /** research/20 weight 0–3 (project evidential strength, not a source figure); 0 = ignored */
  weight: number
  /** source date of the innovation; absent = BANK_DEFAULT_GATE */
  earliest?: number
  datedBy?: string
  cite: Evidence
  /** form-level detector over the spelling; null = the feature is real but not visible in a single spelling (kept as a documented row) */
  test: ((c: BankCtx) => Evidence | null) | null
  why?: string
}

const UM159 = (q: string, note?: string) => Q('ENC', 'http://litopys.org.ua/ukrmova/um159.htm (Південно-західне наріччя)', q, note)
const UM160 = (q: string) => Q('ENC', 'http://litopys.org.ua/ukrmova/um160.htm (Південно-східне наріччя)', q)
const SH43 = (q: string) => Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev06.htm, ch. 43', q)
const SH57 = (q: string) => Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev07.htm, ch. 57', q)
const KLY = (q: string) => Q('IZB', 'http://izbornyk.org.ua/klyment/kly01.htm, с. 19', q)

const form = (c: BankCtx) => D('attestation', c.year ? `рік ${c.year}` : 'введення користувача', c.norm ?? c.form)
const BAD = /:(bad|err|subst|alt|arch|slang|up92|short)\b/
/** a normative VESUM analysis of a candidate form */
const std = (c: BankCtx, cand: string) => c.inLexicon(cand).find(h => !BAD.test(':' + h.tags))
const via = (c: BankCtx, src: string, cand: string, h: { lemma: string; tags: string }, note: string) =>
  D('VESUM', 'dict_corp_vis.txt v6.8.6', `${src} ↔ ${cand} (${h.lemma}: ${h.tags})`, note)
/** the first candidate of `cands` that VESUM attests as a normative form, while the spelling itself is non-normative */
const viaLex = (c: BankCtx, cands: string[], note: string): Evidence | null => {
  const src = c.norm ?? c.form
  if (normative(c)) return null
  for (const cand of cands) { if (cand === src) continue; const h = std(c, cand); if (h) return via(c, src, cand, h, note) }
  return null
}

const nth = (s: string, re: RegExp, sub: (m: RegExpMatchArray) => string) => [...s.matchAll(re)].map(m => s.slice(0, m.index) + sub(m) + s.slice(m.index! + m[0].length))

/** research/20 §3, the 17 cited rows. `test: null` rows stay in the table (documented, shown in the method view) but cannot fire from one spelling. */
export const BANK_FEATURES: BankFeature[] = [
  { id: 'BK-SW-A>E', side: 'SW', weight: 3, earliest: 1401, datedBy: 'Шевельов: «зафіксоване з XV ст.» (research/23 D-A-SOFT)',
    cite: UM159('в галиц.-буков. групі говорів а після м\'яких приголосних і шиплячих змінюється на голосний перед. ряду е, и, і (час > чіс, тел\'á > тел\'é, шáпка > ши́пка)'),
    test: c => viaLex(c, nth(c.norm ?? c.form, /[чшжщ]([еиі])/g, m => m[0].slice(0, -1) + 'а'), 'у ВЕСУМ засвідчено відповідник із а після шиплячого') },
  { id: 'BK-SW-IKAVISM', side: 'SW', weight: 1,
    cite: UM159('рефлексація давніх о, е в новоутв. закритих і ненаголош. складах як і (конь > кін\', печь > піч, єсень > осін\')'), test: null,
    why: 'той самий рефлекс загальний для сучасного стандарту; у написанні не відрізняє берег' },
  { id: 'BK-SW-EOU', side: 'SW', weight: 2,
    cite: UM159('флексії -оў, -еў на місці давніх -ойу, -ейу, а також флексії -ом в ор. в. одн. іменників ж. р. (рукóйу > рукóў, рукóм …)'),
    test: c => (!normative(c) && /(оў|еў)$/.test(c.form) ? form(c) : null) },
  { id: 'BK-SW-PRON', side: 'SW', weight: 2,
    cite: UM159('збереження давніх форм дав. і ор. в. одн. особового і зворотного займенників мі, ми, ті, ти, си, м\'а, т\'а, с\'а при формах мені, тобі, собі, мене, тебе, себе в ін. говорах'),
    test: null, why: 'вимагає контексту (займенник у реченні) — детектор SX-2 (W3b)' },
  { id: 'BK-SW-FUT-PERF', side: 'SW', weight: 2,
    cite: UM159('поширення різних форм майб. ч. (бýду писáти, бýду писáв, писáтиму …); збереження давніх особ. форм дієслів 1-ї і 2-ї ос. … (носíвйем, носíлам, носíли смо …), а також форм давномин. ч. (був-йем кáзав) та форм умов. сп. (був бим робив)'),
    test: null, why: 'аналітичні форми: кілька токенів — детектор SX-1 (W3b)' },
  { id: 'BK-SW-K+DAT', side: 'SW', weight: 2,
    cite: UM159('наявність конструкцій прийменник к + іменник, займенник у дав. в. (к тóбі, зам. до тéбе)'),
    test: null, why: 'кілька токенів — детектор SX-1 (W3b)' },
  { id: 'BK-SW-DEVOICE', side: 'SW', weight: 1,
    cite: UM159('оглушення приголосних у кінці слова і перед глухими приголосними'), test: null, why: 'майже не відображається в написанні' },
  { id: 'BK-RR-HARD', side: 'SW', weight: 2,
    cite: SH57('ствердіння r\' (наявне на Волині й Поділлі, але відсутнє в карпатській діалектній групі й неконсеквентно зреалізоване в наддністрянських говірках)'),
    test: null, why: 'без пари «м\'який/твердий» в одному тексті не видно в написанні' },
  { id: 'BK-SW-HPROT', side: 'SW', weight: 1, earliest: 1500, datedBy: 'Шевельов: «протетичного h перед о-, відоме з XVI ст.» (Волинь; research/23 D-PROTH-V)',
    cite: SH43('протетичний h перед о (Західне Полісся та Волинь)… (протетичний h перед о- на Поділлі та Буковині з Покуттям)'),
    test: c => { const s = c.norm ?? c.form; return /^г[оӧ]/.test(s) ? viaLex(c, [s.slice(1)], 'у ВЕСУМ засвідчено форму без протетичного г') : null } },
  { id: 'BK-SE-E>O', side: 'SE', weight: 2,
    cite: SH57('Саме звідти поширилися такі інновації, як перехід е > о в позиції перед зубними, перехід у- > і-, нові форми прикметників (білá замість bilaja та ін.) і дієслів (пектý, печý), можливо, й уживання і на місці рефлексів давн. укр. о та е в закритих складах'),
    test: null, why: 'поширилась і в сусідні SW-говори — слабкий розрізнювач берегів; без пари форм не видно' },
  { id: 'BK-SE-PROSA', side: 'SE', weight: 1,
    cite: SH57('перетворившися на таку собі фіксацію говіркового мовлення, або східнополіського (наприклад, у Некрашевича), або південно-східного. У XVII ст. простая мова якщо й базувалася на якихось говірках, то на південно-західних.'),
    test: null, why: 'історична рамка, не ознака написання' },
  { id: 'BK-SE-F>X', side: 'SE', weight: 2, earliest: 1798, datedBy: 'ЕУМ: п.-с. наріччя «остаточно сформувалося у 19 — 20 ст.»; research/20 §3: не раніше 1798',
    cite: UM160('у більшості говорів фонема [ф] заступається звичайно [x], [хв] (týхлі, хвáбрика, бухвéт)'),
    test: c => { const s = c.norm ?? c.form; return /х/.test(s) ? viaLex(c, [s.replace(/хв/, 'ф'), s.replace(/х/, 'ф')], 'у ВЕСУМ засвідчено відповідник із ф') : null } },
  { id: 'BK-SE-NOAFFR', side: 'SE', weight: 2, earliest: 1700, datedBy: 'Шевельов: п.-с. комплекс «викшталтувані в другій половині XVI ст. та в XVII ст.»; research/20 §3: не раніше 1700 [P]',
    cite: UM160('обмежено вживаються африкати [дж], [дз], [дз\'], замість них — [д], [ж], [з] (хóд\'у, бужý, звонóк, жерелó)'),
    test: c => {
      const s = c.norm ?? c.form, out: string[] = []
      for (const m of s.matchAll(/[джз]/g)) {
        const i = m.index!, ch = m[0]
        if (ch === 'д' && /[жз]/.test(s[i + 1] ?? '')) continue
        if (ch !== 'д' && s[i - 1] === 'д') continue
        if (ch === 'д' || ch === 'ж') out.push(s.slice(0, i) + 'дж' + s.slice(i + 1))
        if (ch === 'д' || ch === 'з') out.push(s.slice(0, i) + 'дз' + s.slice(i + 1))
        if (ch !== 'д') out.push(s.slice(0, i) + 'д' + s.slice(i))
      }
      return viaLex(c, out, 'у ВЕСУМ засвідчено відповідник з африкатою')
    } },
  { id: 'BK-SE-RSOFT', side: 'SE', weight: 2, earliest: 1700, datedBy: 'див. BK-SE-NOAFFR [P]',
    cite: UM160('поширений м\'який приголосний [р\'] (р\'ама, гр\'аниц\'а, кобзар\')'),
    // final -рь is ordinary old orthography (царь) — the soft р counts only when it is marked (р’, р\') or in modern spelling
    test: c => (!normative(c) && (/р[’']/.test(c.form) || ((c.year === undefined || c.year >= 1919) && /рь$/.test(c.form))) ? form(c) : null) },
  { id: 'BK-SE-VERB', side: 'SE', weight: 2, earliest: 1700, datedBy: 'ЕУМ: слобожанські й степові говірки — заселення 16—18 ст.; research/20 §3 [P]',
    cite: UM160('у дієсловах II дієвідміни у слобожанських і степових говірках виникли форми типу нóсе, рóбе, лáзе'),
    test: c => {
      const s = c.form
      if (!/[а-яіїєґ]е$/.test(s) || normative(c)) return null
      for (const inf of [s.slice(0, -1) + 'ить', s.slice(0, -1) + 'іть']) { const h = c.inLexicon(inf).find(x => x.tags.split(':').includes('verb')); if (h) return via(c, s, inf, h, 'у ВЕСУМ засвідчено інфінітив II дієвідміни') }
      return null
    } },
  { id: 'BK-N-HARDC', side: 'SE', weight: 2, earliest: 1700, datedBy: 'Зіновіїв, рукопис 1700—1709 (kly01.htm с. 16—17, 19): ознака засвідчена в самому рукописі; раніше не перевірялась',
    cite: KLY('У рукопису переважає тверде ц — характерна риса сучасних північних говорів української мови'),
    test: c => (!normative(c) && /[иы]ц[аы]$/.test(c.form) ? form(c) : null) },
  { id: 'BK-N-LV', side: 'SE', weight: 0,
    cite: SH43('огублення l (во[w]к) … (огублення l — XVII ст.)'), test: null, why: 'зустрічається по обидва береги — ваги 0 (research/20 §3), не використовується' },
]

/** SW-vs-SE, not the Dnipro banks: the explanation shown with the chip (research/20 §3, ЕУМ um159). */
export const BANK_EXPLAIN = {
  text: 'Джерельний поділ — діалектний: південно-західне vs південно-східне наріччя, а не «правий/лівий берег Дніпра». Центральне Правобережжя (Київщина, Черкащина) належить до південно-східного наріччя разом із Лівобережжям. Це оцінка мови форми за цитованими ознаками, а не висновок про місце створення тексту: регіон пам\'ятки лишається окремим свідченням (SPEC 20 B-3.6).',
  evidence: [
    P('ENC', 'http://litopys.org.ua/ukrmova/um159.htm', 'Фастів — Біла Церква — Ставище — Тальне — Первомайськ — Ананьїв', 'межа пд.-зх. і пд.-сх. наріч (research/20 §3); центральне Правобережжя — пд.-сх. наріччя [P]'),
  ] as Evidence[],
}

export interface BankInput { form: string; norm?: string; year?: number; scribal?: boolean }
export interface BankHit { feature: BankFeature; form: string; trig: Evidence; half: boolean }
export interface BankResult {
  status: 'scored' | 'insufficient'
  type?: Side
  pSE: number; pSW: number; logit: number
  matched: BankHit[]
  /** ids of features that matched a spelling that predates their earliest date (g = 0) */
  gatedOff: string[]
  /** matched rows with weight ≥ 2 */
  strong: number
  claim: Claim<Side>
}

const gateOf = (f: BankFeature) => f.earliest ?? BANK_DEFAULT_GATE
const sigma = (x: number) => 1 / (1 + Math.exp(-x))

/**
 * Score one or several spellings together (a form, or all spellings of a lemma). A feature counts once, at its best (non-scribal, full-weight) match.
 * `lex` supplies VESUM lookups (`vesum` analyses of the spelling, `inLexicon` for candidate forms).
 */
export function bankScore(inputs: BankInput[], lex: { vesum: (f: string) => Ctx['vesum']; inLexicon: Ctx['inLexicon'] }, features: BankFeature[] = BANK_FEATURES): BankResult {
  const best = new Map<string, BankHit>(), gated = new Set<string>()
  for (const inp of inputs) {
    const c: BankCtx = { form: inp.form.toLowerCase(), norm: inp.norm, year: inp.year, scribal: inp.scribal, vesum: lex.vesum(inp.form.toLowerCase()), inLexicon: lex.inLexicon }
    for (const f of features) {
      if (!f.test || f.weight <= 0) continue
      const trig = f.test(c)
      if (!trig) continue
      if (c.year !== undefined && c.year < gateOf(f)) { gated.add(f.id); continue }
      const hit: BankHit = { feature: f, form: inp.form, trig, half: !!inp.scribal }
      const old = best.get(f.id)
      if (!old || (old.half && !hit.half)) best.set(f.id, hit)
    }
  }
  const matched = [...best.values()]
  const gatedOff = [...gated].filter(id => !best.has(id))
  const strong = matched.filter(h => h.feature.weight >= 2).length
  const logit = BANK_CALIBRATION * matched.reduce((s, h) => s + (h.feature.side === 'SE' ? 1 : -1) * h.feature.weight * (h.half ? 0.5 : 1), 0)
  const pSE = sigma(logit)
  const base = { pSE, pSW: 1 - pSE, logit, matched, gatedOff, strong }
  if (strong < BANK_MIN_STRONG || logit === 0) return { status: 'insufficient', ...base, claim: unknown() }
  const type: Side = logit > 0 ? 'SE' : 'SW'
  const ev = matched.flatMap(h => [h.feature.cite, h.trig])
  return { status: 'scored', type, ...base,
    claim: claim(type, ev, { score: +(type === 'SE' ? pSE : 1 - pSE).toFixed(3), method: `bank-model: P(SE)=σ(c·Σ±w·g·h), ${BANK_CALIBRATION_NOTE}` }) }
}
