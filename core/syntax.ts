/**
 * Multi-token (syntactic / analytic) detectors over a token window — SPEC 60 SX-1…SX-3, research/12 §B–D + Round 2.
 *
 * > "збереження давніх особ. форм дієслів 1-ї і 2-ї ос. одн. і мн. мин. ч. (носи́вйем, носи́лам, носи́ли смо, носи́ли сте),
 * >  а також форм давномин. ч. (був-йем казáв) та форм умов. сп. (був бим роби́в)" — ЕУМ «Південно-західне наріччя», um159
 * > "Синтакс. особливості П.-з. н.: наявність конструкцій прийменник к + іменник, займенник у дав. в. (к тóбі, зам. до тебе) …
 * >  поширення вільного відносно зворотного дієслова розташування форманта с'я — у препозиції чи постпозиції" — ibid.
 *
 * Same contract as core/detect.ts: a row fires a *claim* only with a published source and weight > 0 (P-1.3); a row without
 * a source has weight 0 and yields a *hint* (queue for review, no label — P-3.1). A claim carries the row's citation AND the
 * matched text (P-1.4). The sources give no dates for these forms, so every span says «датування не встановлено».
 * Pure functions: callers pass optional lexicon callbacks (dative / verb tests); without them only conservative surface
 * patterns fire (masculine l-participle in -в, pronoun datives).
 */
import { claim, D, Q, type Claim, type Evidence } from './evidence.ts'

export type SyntaxKind = 'cond' | 'past-clitic' | 'future-budu' | 'pluperfect' | 'k-dat' | 'si-free' | 'enclitic' | 'prep' | 'prep-dat'

export interface SyntaxRow {
  id: string; kind: SyntaxKind; dialect?: string; weight: number; cite?: Evidence; note: string
}
export interface SyntaxSpan {
  id: string; kind: SyntaxKind
  start: number; end: number; text: string      // char range in the input text
  modern: string                                  // suggested modern rendering (a reading, not a dictionary fact — P-1.7)
  dialect?: string                                // research/04 code (SW …)
  label?: string                                  // 'native_enclitic' for sourced enclitic rows
  weight: number; hint: boolean
  claim?: Claim<true>                             // absent for hints
  dating: string; note: string
}
export interface SyntaxOpts {
  year?: number
  /** true = the form is (also) a dative (VESUM v_dav); false = known and not dative; undefined = unknown */
  isDative?: (k: string) => boolean | undefined
  /** 'verb' = known l-participle/verb; 'other' = known noun/adjective etc.; undefined = unknown */
  verbness?: (k: string) => 'verb' | 'other' | undefined
  /** exact modern form known to the lexicon (suppresses merged-form rows) */
  isKnown?: (k: string) => boolean
}

export const UNDATED = 'датування не встановлено'
const UM159 = 'http://litopys.org.ua/ukrmova/um159.htm'
const ENC = (quote: string) => Q('ENC', UM159, quote, 'ЕУМ, «Південно-західне наріччя»; датування в джерелі не наведено')
const QF = ENC('поширення різних форм майб. ч. (бýду писáти, бýду писáв, писáтиму, му писáти)')
const QP = ENC('збереження давніх особ. форм дієслів 1-ї і 2-ї ос. одн. і мн. мин. ч. (носи́вйем, носи́лам, носи́ли смо, носи́ли сте), а також форм давномин. ч. (був-йем казáв) та форм умов. сп. (був бим роби́в)')
const QE = ENC("збереження давніх форм дав. і ор. в. одн. особового і зворотного займенників мі, ми, ті, ти, си, м'а, т'а, с'а при формах мені, тобі, собі, мене, тебе, себе в ін. говорах")
const QK = ENC('наявність конструкцій прийменник к + іменник, займенник у дав. в. (к тóбі, зам. до тебе)')
const QS = ENC("поширення вільного відносно зворотного дієслова розташування форманта с'я — у препозиції чи постпозиції")

const row = (id: string, kind: SyntaxKind, weight: number, note: string, cite?: Evidence, dialect = cite ? 'SW' : undefined): SyntaxRow =>
  ({ id, kind, dialect, weight, cite, note })

/** SX-1…SX-3 rows. Weight 0 = no published source for this exact form → hint only. */
export const SYNTAX_ROWS: SyntaxRow[] = [
  row('SX-COND', 'cond', 0.6, 'умовний спосіб: би + особовий кліт. (бим, бись, бисьмо; «би-м»)', QP),
  row('SX-COND-BUV', 'cond', 0.6, 'був + би(м) + l-дієприкметник (був бим робив)', QP),
  row('SX-PAST-CLITIC', 'past-clitic', 0.6, 'l-форма + особовий кліт. (робив-єм, носивйем, робилисмо, носили сте)', QP),
  row('SX-FUT-BUDU-L', 'future-budu', 0.5, 'буду + l-дієприкметник (буду зробив) замість буду робити / зроблю', QF),
  row('SX-PLUPERF', 'pluperfect', 0.5, 'був + l-дієприкметник (давномина форма: був казав)', QP),
  row('SX-K-DAT', 'k-dat', 0.6, 'к/ко/ік + давальний замість до + родовий (к тобі)', QK),
  row('SX-SI-FREE', 'si-free', 0.4, "вільний ся/си/сі/с'я перед або після дієслова", QS),
  row('SX-ENCL-PRON', 'enclitic', 0.5, "кліт. займенники мі, ми, ті, ти, си, м'а, т'а, с'а (також м'я, т'я, с'я — орфографічні варіанти)", QE),
  row('SX-ENCL-ORTH', 'enclitic', 0, 'мні → мені: скорочена форма без джерела серед наведених у ЕУМ'),
  row('SX-ENCL-NI', 'enclitic', 0, 'ни/ви як кліт. займенники: форм «ни», «ви» немає в цитаті ЕУМ'),
  row('SX-PREP-RED', 'prep', 0, 'скорочені прийменники д/ді/ко/ік/ув/зо/од: джерела для окремих форм немає'),
  row('SX-DO-DAT', 'prep-dat', 0, 'контамінація до + давальний (д великому місту): у ЕУМ не знайдено (research/12 Round 2)'),
]
for (const r of SYNTAX_ROWS) if (r.weight > 0 && !r.cite) throw new Error(`${r.id}: weight > 0 needs a citation (P-1.3)`)
const ROW = Object.fromEntries(SYNTAX_ROWS.map(r => [r.id, r])) as Record<string, SyntaxRow>

// ── tokens ──────────────────────────────────────────────────────────────────────────────────────
interface Tok { raw: string; k: string; start: number; end: number; gapBefore: string }
const LETTERS = /[\p{L}\p{M}'’ʼ]+/gu
const lowerKey = (s: string) => s.normalize('NFC').replace(/[́´ˊ]/g, '').replace(/[’ʼ`]/g, "'").toLowerCase()

/** Words split on hyphen too: «би-м» → би · м (the hyphen is recorded in gapBefore). */
function toks(text: string): Tok[] {
  const out: Tok[] = []
  let prevEnd = 0
  for (const m of text.matchAll(LETTERS)) {
    const trimmed = m[0].replace(/^['’ʼ]+|['’ʼ]+$/g, '')
    if (!trimmed) continue
    const start = m.index! + m[0].indexOf(trimmed)
    out.push({ raw: trimmed, k: lowerKey(trimmed), start, end: start + trimmed.length, gapBefore: text.slice(prevEnd, start) })
    prevEnd = start + trimmed.length
  }
  return out
}
const glue = (g: string) => g === '' || g === '-'          // no gap or hyphen: clitic spelled together
const space = (g: string) => /^\s+$/.test(g)               // plain whitespace: separate words
const joined = (g: string) => glue(g) || space(g)

// ── lexical helpers ─────────────────────────────────────────────────────────────────────────────
const MASC_L = /^\p{L}[\p{L}']*[аиіяєюуї][вў]$/u                 // робив, зробив, ходив (not -ов/-ев adjectives)
const FEM_PL_L = /^\p{L}[\p{L}']{2,}(ла|ли)$/u                    // робила, робили — ambiguous with nouns, needs the lexicon
function isLPart(t: Tok, o: SyntaxOpts, allowFemPl = true): boolean {
  if (/^\p{Lu}/u.test(t.raw) && t.start > 0) return false          // «був Київ», «був Львів»: capitalised → name
  const v = o.verbness?.(t.k)
  if (v === 'other') return false
  if (v === 'verb') return MASC_L.test(t.k) || (allowFemPl && /(ла|ло|ли)$/.test(t.k))
  return MASC_L.test(t.k)
}
const toInf = (k: string) => k.replace(/(ла|ло|ли)$/, '').replace(/[вў]$/, '') + 'ти'

const AUX_BUDU = new Set(['буду', 'будеш', 'буде', 'будемо', 'будете', 'будуть'])
const AUX_BUV = new Set(['був', 'була', 'було', 'були'])
const COND_CLITIC: Record<string, string> = { м: 'я', сь: 'ти', смо: 'ми', сьмо: 'ми', сте: 'ви', стє: 'ви' }
const COND_MERGED: Record<string, string> = { бим: 'я', бись: 'ти', бисьмо: 'ми', бисмо: 'ми', бисте: 'ви', бистє: 'ви' }
const PAST_CLITIC: Record<string, string> = { єм: 'я', йем: 'я', ем: 'я', ім: 'я', смо: 'ми', сьмо: 'ми', сте: 'ви', стє: 'ви' }
const ENCL_CLAIM: Record<string, string> = { мі: 'мені', ми: 'мені', ті: 'тобі', ти: 'тобі', си: 'собі', сі: 'собі', "м'а": 'мене', "м'я": 'мене', "т'а": 'тебе', "т'я": 'тебе', "с'а": 'себе', "с'я": 'себе' }
const ENCL_UNAMBIG = new Set(['мі', "м'а", "м'я", "т'а", "т'я", "с'а", "с'я"])    // not modern standalone words
const ENCL_AMBIG = new Set(['ми', 'ти', 'ті', 'си', 'сі'])                        // modern ми/ти/ті are real words → only after an l-form
const PRON_DAT: Record<string, string> = { мені: 'мене', тобі: 'тебе', собі: 'себе', йому: 'нього', їй: 'неї', їм: 'них', нам: 'нас', вам: 'вас' }
const DAT_END = /(ому|ьому|ові|еві|єві)$/
const PREP_RED: Record<string, string> = { д: 'до', ді: 'до', ко: 'до', ік: 'до', ув: 'у/в', зо: 'з/зі', од: 'від' }
const REFL = new Set(['ся', 'сі', 'си', "с'я", "с'а"])

/** Lower-level builder: sourced row → claim (cite + trigger), unsourced row → hint (P-1.3/P-1.4). */
function span(id: string, a: Tok, b: Tok, text: string, modern: string, o: SyntaxOpts, extra: Partial<SyntaxSpan> = {}): SyntaxSpan {
  const r = ROW[id]!
  const raw = text.slice(a.start, b.end)
  const trig = D('attestation', o.year ? `рік ${o.year}` : 'введення користувача', raw)
  const hint = r.weight <= 0 || !r.cite
  return {
    id, kind: r.kind, start: a.start, end: b.end, text: raw, modern, dialect: r.dialect, weight: r.weight, hint,
    claim: hint ? undefined : claim(true as const, [r.cite!, trig], { score: r.weight, method: id }),
    dating: UNDATED, note: r.note, ...extra,
  }
}

/** SX-1…SX-3: detect all analytic / enclitic / reduced-preposition spans in `text` (longest span wins on overlap). */
export function detectSyntax(text: string, o: SyntaxOpts = {}): SyntaxSpan[] {
  const T = toks(text), out: SyntaxSpan[] = []
  const at = (i: number) => T[i]
  const dative = (t: Tok | undefined): boolean => {
    if (!t) return false
    const d = o.isDative?.(t.k)
    if (d !== undefined) return d
    return t.k in PRON_DAT || DAT_END.test(t.k)
  }
  for (let i = 0; i < T.length; i++) {
    const t = T[i]!, n = at(i + 1), n2 = at(i + 2), p = at(i - 1)

    // SX-1 conditional: merged бим/бись/бисьмо, or би + м/сь/смо (hyphen or space)
    if (t.k in COND_MERGED && !o.isKnown?.(t.k)) out.push(span('SX-COND', t, t, text, `${COND_MERGED[t.k]} би`, o))
    else if (t.k === 'би' && n && n.k in COND_CLITIC && glue(n.gapBefore)) out.push(span('SX-COND', t, n, text, `${COND_CLITIC[n.k]} би`, o))
    // бим/би(м) after «був»: був бим робив
    if (AUX_BUV.has(t.k) && n && (n.k === 'бим' || (n.k === 'би' && n2 && n2.k === 'м' && glue(n2.gapBefore)))) {
      const e = n.k === 'бим' ? n2 : at(i + 3)
      if (e && space(n.gapBefore) && isLPart(e, o)) out.push(span('SX-COND-BUV', t, e, text, `${e.raw} би`, o))
    }

    // SX-1 past + person clitic: merged робивєм / робилисмо, or l-form + єм/смо/сте
    if (!o.isKnown?.(t.k)) {
      const mm = /^(\p{L}[\p{L}']*[вў])(йем|єм|ім)$/u.exec(t.k) ?? /^(\p{L}[\p{L}']*ли)(смо|сьмо|сте)$/u.exec(t.k)
      if (mm) out.push(span('SX-PAST-CLITIC', t, t, text, `${/смо|сьмо$/.test(t.k) ? 'ми' : /сте$/.test(t.k) ? 'ви' : 'я'} ${mm[1]}`, o))
    }
    if (n && n.k in PAST_CLITIC && (n.k === 'ем' ? glue(n.gapBefore) : joined(n.gapBefore))) {
      const plural = /^(смо|сьмо|сте|стє)$/.test(n.k)      // these are never modern words → the l-form need not be verified
      const ok = plural ? /(ли|в|ў|ла)$/.test(t.k) && o.verbness?.(t.k) !== 'other' && !/^\p{Lu}/u.test(t.raw) : isLPart(t, o, false)
      if (ok) out.push(span('SX-PAST-CLITIC', t, n, text, `${PAST_CLITIC[n.k]} ${t.raw}`, o))
    }

    // SX-1 future «буду + l-participle»
    if (AUX_BUDU.has(t.k) && n && space(n.gapBefore) && isLPart(n, o) && !AUX_BUV.has(n.k))
      out.push(span('SX-FUT-BUDU-L', t, n, text, `${t.raw} ${toInf(n.k)}`, o))

    // SX-1 pluperfect «був + l-participle»
    if (AUX_BUV.has(t.k) && n && space(n.gapBefore) && !AUX_BUV.has(n.k) && n.k !== 'би' && isLPart(n, o))
      out.push(span('SX-PLUPERF', t, n, text, `${n.raw} (давномин. ч.: ${t.raw} ${n.raw})`, o))

    // SX-1 к/ко/ік + dative
    if (['к', 'ко', 'ік'].includes(t.k) && n && space(n.gapBefore) && dative(n)) {
      const rep = PRON_DAT[n.k]
      out.push(span('SX-K-DAT', t, n, text, rep ? `до ${rep}` : `до ${n.raw} (род. в.)`, o))
    } else if (['к', 'ко', 'ік'].includes(t.k) && n && space(n.gapBefore)) {
      out.push(span('SX-PREP-RED', t, t, text, 'до', o))
    }

    // SX-1 free ся/си/сі
    if (REFL.has(t.k)) {
      const verbal = (x: Tok | undefined) => !!x && /(ю|єш|є|ємо|єте|ють|ять|иш|ить|имо|ите|в|ла|ли|ло|ти|ть|ш|мо|те)$/.test(x.k)
      const strict = t.k === 'си' || t.k === 'сі'                 // also ordinary words → the neighbour must look verbal
      const nOk = !!n && space(n.gapBefore) && (!strict || verbal(n)), pOk = !!p && space(t.gapBefore) && verbal(p)
      if (nOk && !(pOk && !verbal(n))) out.push(span('SX-SI-FREE', t, n!, text, `${n!.raw}ся`, o))
      else if (pOk) out.push(span('SX-SI-FREE', p!, t, text, `${p!.raw}ся`, o))
    }

    // SX-2 enclitic / short pronouns
    const encl = ENCL_CLAIM[t.k]
    const afterL = !!p && space(t.gapBefore) && (isLPart(p, o) || /(ла|ли|ло)$/.test(p.k) && o.verbness?.(p.k) === 'verb')
    if (encl && ENCL_UNAMBIG.has(t.k)) out.push(span('SX-ENCL-PRON', t, t, text, encl, o, { label: 'native_enclitic' }))
    else if (encl && ENCL_AMBIG.has(t.k) && afterL && !(n && space(n.gapBefore) && isLPart(n, o)))
      out.push(span('SX-ENCL-PRON', p!, t, text, `${p!.raw} ${encl}`, o, { label: 'native_enclitic' }))
    else if (t.k === 'мні') out.push(span('SX-ENCL-ORTH', t, t, text, 'мені', o))
    else if ((t.k === 'ни' || t.k === 'ви') && afterL) out.push(span('SX-ENCL-NI', p!, t, text, `${p!.raw} нам/вам`, o))

    // SX-3 reduced prepositions (hints) and contamination до + dative (hint)
    if (t.k in PREP_RED && t.k !== 'ко' && n && space(n.gapBefore)) {
      out.push(span('SX-PREP-RED', t, t, text, PREP_RED[t.k]!, o))
      if ((t.k === 'д' || t.k === 'ді') && (dative(n) || /[уюі]$/.test(n.k)) && !PRON_DAT[n.k]) out.push(span('SX-DO-DAT', t, n, text, `до ${n.raw} (род. в.)`, o))
    } else if (t.k === 'ко' && n && space(n.gapBefore) && !dative(n)) out.push(span('SX-PREP-RED', t, t, text, 'до', o))
    if (t.k === 'до' && n && space(n.gapBefore)) {
      const fwd = (x: Tok | undefined) => !!x && DAT_END.test(x.k) && o.isDative?.(x.k) !== false
      if (fwd(n) || (fwd(n2) && space(n2!.gapBefore) && !!n && o.verbness?.(n.k) !== 'verb' && DAT_END.test(n.k)))
        out.push(span('SX-DO-DAT', t, fwd(n) ? n : n2!, text, `до ${(fwd(n) ? n : n2!).raw} (род. в.)`, o))
    }
  }
  return resolve(out)
}

/** Longest span wins on overlap; ties → earlier row; identical ranges keep the sourced (non-hint) one. */
function resolve(spans: SyntaxSpan[]): SyntaxSpan[] {
  const sorted = [...spans].sort((a, b) => (b.end - b.start) - (a.end - a.start) || +a.hint - +b.hint || a.start - b.start)
  const kept: SyntaxSpan[] = []
  for (const s of sorted) if (!kept.some(k => s.start < k.end && k.start < s.end)) kept.push(s)
  return kept.sort((a, b) => a.start - b.start)
}
