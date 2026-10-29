/**
 * SPEC 63 MM-42 / MM-43 (owner remarks 2026-10-29):
 *  MM-42 «"го" в старих українських пам'ятках це може бути єго» — the token «го» (and the clitic «-го» after a hyphen: «видів-го», «дай-го») can be the short (enclitic) form of його / єго,
 *        genitive / accusative of він. A BRANCHING, DISAMBIGUATED reading beside the interjection «го!» (never a silent choice, like MM-38 їсть / єсть):
 *          - hyphenated «-го» → він (certain: an interjection is never joined to a verb by a hyphen), in every text;
 *          - an apostrophe before it («’го») → він (the elision mark), in every text;
 *          - lower-case «го» in an old / middle Ukrainian (≤ 1800), Galician-print (Желехівка, Максимовичівка) or Galician / Hutsul / Carpathian text, or an isolated word (Аналіз слова, search):
 *              after a preposition, after a digit (5-го квітня), capitalised inside a clause, followed by «!», repeated («го го», «го-го») → NOT the pronoun (OCR fragment, ordinal ending, interjection);
 *              next to a verb, or after би / не / як / щоб … (the second-position clitic slot) → він, the interjection kept as the alternative; no cue → «неоднозначно», the ordinary reading stays first;
 *          - modern standard text without the hyphen pattern: the current reading only.
 *  MM-43 «ну коли редукцію робить мовець» — the speaker's own colloquial reduction (шо, шоб, ше, тра: core/variant-families.ts, role 'reduced') and the ambiguous «тре» (= треба, but also 3sg of терти):
 *        a chip «розмовна редукція (мовця)» whose qualifier (MM-16) says whose form it is: запис фольклору / мова персонажа / форма автора (region) — never a dialect group, no source names one.
 *        Editorial abbreviations (г., ст., т. зв.) are not in any table here and get no chip.
 *
 * Evidence: «го» has NO dictionary / grammar line in the repo (the grammars Огоновський 1889 / Смаль-Стоцький 1892, 1914 exist only as OCR on the worker; the uk.wiktionary «го» page is not in the
 * dumps of the repo): «джерела не знайдено». What exists is the corpus: Русалка Днѣстровая (Буда 1837) «Мати го не пускає», «Воўня го сѣпає»; Шекерик-Доників (Гуцульщина, 1910) «би го имили».
 * They are attestations of the form in context, not a statement about its dialect; no dialect group is claimed.
 */
import { P, type Evidence } from './evidence.ts'
import { isGalician, type FeatureChip, type FeatureQualifier } from './feature-chips.ts'
import { key } from './text.ts'
import { splitHyphenParticle } from './gal-folds.ts'
import { familyMember, memberEvidence } from './variant-families.ts'

/** a family member of role 'reduced' (шо, шоб, ше, тра) */
const reducedHit = (k: string) => { const e = familyMember(k); return e && e.member.role === 'reduced' ? { head: e.family.head, evidence: memberEvidence(e.family, e.member), uncited: !e.member.cite } : undefined }

export const GO_RULE = 'ENCL-GO'
export const ELIDED_RULE = 'ELIS-GO'
export const REDUCED_RULE = 'REDUCED-SPEECH'
const GAL_ORTH = ['желехівка', 'максимовичівка']
const OLD_YEAR = 1800
const DIALECT_REGION = /Гуцул|Бойк|Лемк|Покутт|Закарпатт|Підкарпатт|Буковин|Наддністр|Прикарпатт|Галич|Львів/i
const PREP = new Set(['у', 'в', 'на', 'при', 'з', 'із', 'зі', 'до', 'за', 'для', 'від', 'по', 'над', 'під', 'про', 'через', 'без', 'між', 'о', 'ко', 'къ', 'съ', 'ся'])
const CLITIC_HOST = new Set(['би', 'не', 'як', 'щоб', 'аби', 'бо', 'коли', 'що', 'та', 'а', 'і', 'й', 'ж', 'же', 'то', 'вже', 'ще', 'ні', 'бодай', 'ні'])
const NOM_SUBJ = new Set(['він', 'вона', 'воно', 'вони', 'я', 'ти', 'ми', 'ви', 'хто', 'що', 'ніхто', 'мати', 'вода', 'молодиця', 'дівка'])

export interface ShortCtx {
  orth?: string; witnessRegion?: string; authorRegion?: string; year?: number
  /** the witness is a folk / song record or a character's speech (the annotator's caller knows; absent = unknown) */ genre?: 'folklore' | 'speech'
  /** a single word with no witness (Аналіз слова, search) */ isolated?: boolean
  prev?: string; next?: string
  /** the token starts a sentence */ sentStart?: boolean
  /** the raw (case-preserved) token */ raw?: string
  /** the text character(s) directly before / after the token: ordinal digits, «!» */ before?: string; after?: string
  /** an apostrophe-like character stood directly before the word (’го) */ lead?: boolean
  /** VESUM tags of a (key()ed) spelling */ tagsOf?: (k: string) => string[]
}
export type ShortVerdict = 'full' | 'ambiguous'
export interface ShortReading {
  rule: string; kind: 'enclitic' | 'elision' | 'reduction'
  /** 'full' = the long form is the reading (його); 'ambiguous' = both are shown, «неоднозначно»; the ordinary reading stays first */ verdict: ShortVerdict
  form: string; full: string; fullLemma: string
  readings: { lemma: string; via?: string; default?: boolean; note?: string }[]
  cues: string[]
  chip: FeatureChip; evidence: Evidence
}

export const GO_EVIDENCE: Evidence = P('OWNER', 'повідомлення власника, 2026-10-29 (MM-42, «го» = єго)', '"го" в старих українських пам\'ятках це може бути єго',
  'джерела не знайдено: словникового / граматичного рядка про енклітичне «го» у сховищі немає (Огоновський 1889, Смаль-Стоцький 1892 / 1914 — лише OCR на worker, не перевірені; uk.wiktionary «го» не в дампах). ' +
  'Свідчення корпусу (форма в контексті): Русалка Днѣстровая, Буда 1837 «Мати го не пускає», «Воўня го сѣпає»; Шекерик-Доників, Гуцульщина 1910 «би го имили». Діалектну групу не заявлено')

/** MM-16 qualifier of a short form: whose form it is, from what the witness states */
export function shortQualifier(c: ShortCtx): { qualifier: FeatureQualifier; text: string } {
  if (c.genre === 'folklore') return { qualifier: 'folklore', text: 'запис фольклору (форма мовця, зафіксована збирачем); діалектну групу джерело не називає' }
  if (c.genre === 'speech') return { qualifier: 'speaker', text: 'мова персонажа (пряма мова)' }
  if (c.year !== undefined && c.year <= OLD_YEAR) return { qualifier: 'older', text: 'давніша форма (старий / середній період), не діалект автора' }
  const r = c.authorRegion ?? c.witnessRegion
  if (r && (isGalician(r) || DIALECT_REGION.test(r))) return { qualifier: 'author', text: `форма в тексті автора / запису з регіону «${r}»; діалектну належність джерело не називає (джерела не знайдено)` }
  if (c.orth && GAL_ORTH.includes(c.orth)) return { qualifier: 'edition', text: `правопис видання (${c.orth}), не діалект автора` }
  return { qualifier: 'neutral', text: 'форма мовця, зафіксована в тексті; мовець і говір не встановлені' }
}

function gate(c: ShortCtx): boolean {
  if (c.isolated) return true
  if (c.year !== undefined && c.year <= OLD_YEAR) return true
  if (c.orth && GAL_ORTH.includes(c.orth)) return true
  const r = c.authorRegion ?? c.witnessRegion
  return !!r && (isGalician(r) || DIALECT_REGION.test(r))
}
const hasTag = (t: string[], re: RegExp) => t.some(x => re.test(x))

const goChip = (c: ShortCtx, elided: boolean, verdict: ShortVerdict): FeatureChip => {
  const q = shortQualifier(c)
  return { rule: elided ? ELIDED_RULE : GO_RULE, feature: elided ? 'скорочена (елідована) форма' : 'енклітична форма займенника (го = його)',
    label: elided ? '’го = його (апостроф позначає випадіння)' : 'го = його, єго (коротка форма Р. / З. одн. займенника він, воно)', qualifier: q.qualifier, cite: GO_EVIDENCE,
    text: `${elided ? 'елідована форма «’го» = «його»' : 'коротка (енклітична) форма «го» = «його / єго»'}: ${q.text}; джерела не знайдено${verdict === 'ambiguous' ? '; неоднозначно: вигук «го!» лишається основним читанням' : ''}` }
}

/** MM-42: the enclitic «го» (also «-го» after a hyphen, «’го»); undefined = the token has only its ordinary reading */
export function goReading(raw: string, c: ShortCtx = {}): ShortReading | undefined {
  const k = key(raw)
  const sp = splitHyphenParticle(k)
  const hyph = !!sp && sp.particle === 'го'
  if (!hyph && k !== 'го') return undefined
  const cues: string[] = []
  const mk = (verdict: ShortVerdict, elided = false): ShortReading => ({ rule: elided ? ELIDED_RULE : GO_RULE, kind: elided ? 'elision' : 'enclitic', verdict, form: hyph ? 'го' : k, full: 'його', fullLemma: 'він', cues, evidence: GO_EVIDENCE,
    chip: goChip(c, elided, verdict),
    readings: verdict === 'full' ? [{ lemma: 'він', via: 'його', default: true }, ...(hyph ? [] : [{ lemma: 'го', note: 'вигук' }])] : [{ lemma: 'го', note: 'вигук', default: true }, { lemma: 'він', via: 'його' }] })
  if (hyph) { cues.push(`«${sp!.host}-го»: частка через дефіс — вигук «го» з дієсловом дефісом не сполучається`); return mk('full') }
  if (c.lead) { cues.push('апостроф перед «го» — позначка випадіння (’го = його)'); return mk('full', true) }
  const rc = c.raw ?? raw
  if (rc !== rc.toLowerCase()) return undefined                                  // «Го ловач», a name or a sentence-initial exclamation: not the clitic
  if (c.before && /\d[-–]?$/.test(c.before)) return undefined                    // 5-го квітня: the ordinal ending
  if (c.prev && PREP.has(c.prev)) return undefined                               // «в го родинно»: after a preposition the pronoun is нього; an OCR fragment
  if (c.prev === 'го' || c.next === 'го' || (c.after && /^\s*!/.test(c.after))) return undefined   // «го го», «го!»: the interjection
  if (!gate(c)) return undefined                                                 // modern standard text without the hyphen / apostrophe pattern
  const tags = c.tagsOf ?? (() => [] as string[])
  const verbNext = !!c.next && hasTag(tags(c.next), /^verb/), verbPrev = !!c.prev && hasTag(tags(c.prev), /^verb/)
  if (verbNext) cues.push(`наступне слово «${c.next}» — дієслово (додаток-енклітика перед присудком)`)
  if (verbPrev) cues.push(`попереднє слово «${c.prev}» — дієслово`)
  if (c.prev && CLITIC_HOST.has(c.prev)) cues.push(`після «${c.prev}» — друге місце енклітики`)
  if (c.isolated) return mk('ambiguous')
  return mk(cues.length ? 'full' : 'ambiguous')
}

/** MM-43: «тре» = треба (clipping, en.wiktionary) but also the 3sg of терти («він тре»): branching, the VESUM reading never replaced silently */
const TRE_CITE: Evidence = P('Вікісловник (en)', 'https://en.wiktionary.org/wiki/тре#Ukrainian', 'Clipping of тре́ба (tréba). [colloquial, predicative] got to, have got to, have to',
  'en.wiktionary, стаття «тре» (adj / predicative, colloquial); діалектної групи стаття не називає. «тре» — також форма 3 ос. одн. дієслова терти (ВЕСУМ), тому читання неоднозначне')
export function treReading(raw: string, c: ShortCtx = {}): ShortReading | undefined {
  const k = key(raw); if (k !== 'тре') return undefined
  if ((c.raw ?? raw) !== (c.raw ?? raw).toLowerCase() && !c.sentStart) return undefined
  const tags = c.tagsOf ?? (() => [] as string[]), cues: string[] = []
  const inf = !!c.next && hasTag(tags(c.next), /inf/)
  if (inf) cues.push(`наступне слово «${c.next}» — інфінітив («тре йти» = треба йти)`)
  if (c.prev && NOM_SUBJ.has(c.prev)) return undefined                              // «він тре»: терти
  const verdict: ShortVerdict = inf ? 'full' : 'ambiguous', q = shortQualifier(c)
  const chip: FeatureChip = { rule: REDUCED_RULE, feature: 'розмовна редукція (мовця)', label: 'тре = треба (усічення)', qualifier: q.qualifier, cite: TRE_CITE,
    text: `розмовне усічення «треба»: ${q.text}${verdict === 'ambiguous' ? '; неоднозначно: «тре» також форма дієслова «терти» (ВЕСУМ), основне читання лишається' : ''}` }
  return { rule: REDUCED_RULE, kind: 'reduction', verdict, form: k, full: 'треба', fullLemma: 'треба', cues, chip, evidence: TRE_CITE,
    readings: verdict === 'full' ? [{ lemma: 'треба', via: 'тре', default: true }, { lemma: 'терти', note: 'він тре' }] : [{ lemma: 'терти', via: 'тре', default: true, note: 'він тре (ВЕСУМ)' }, { lemma: 'треба', via: 'тре' }] }
}

/** MM-43: a family member of role 'reduced' (шо, шоб, ше, тра): the linking is the family's; this gives the chip with the qualifier */
export function reducedReading(raw: string, c: ShortCtx = {}): ShortReading | undefined {
  const k = key(raw), h = reducedHit(k)
  if (!h || ((c.raw ?? raw) !== (c.raw ?? raw).toLowerCase() && !c.sentStart)) return undefined
  const q = shortQualifier(c)
  const chip: FeatureChip = { rule: REDUCED_RULE, feature: 'розмовна редукція (мовця)', label: `${k} = ${h.head} (розмовна редукція)`, qualifier: q.qualifier, cite: h.evidence,
    text: `розмовна редукція «${h.head}» → «${k}»: ${q.text}${h.uncited ? '; джерела не знайдено, діалектну групу не заявлено' : ''}` }
  return { rule: REDUCED_RULE, kind: 'reduction', verdict: 'full', form: k, full: h.head, fullLemma: h.head, cues: [], chip, evidence: h.evidence, readings: [{ lemma: h.head, via: k, default: true }] }
}

/** the one entry of wordRules: whichever short-form reading applies to the spelling */
export const shortReading = (raw: string, c: ShortCtx = {}): ShortReading | undefined => goReading(raw, c) ?? treReading(raw, c) ?? reducedReading(raw, c)
/** can the spelling carry a short-form reading at all (the annotator asks before building the context) */
export const isShortCandidate = (k: string): boolean => k === 'го' || k === 'тре' || k.endsWith('-го') || !!reducedHit(k)
/** extra search key: «го» also finds його (він); ordered AFTER the typed key */
export const shortKeys = (k: string): string[] => (k === 'го' ? ['його'] : (() => { const sp = splitHyphenParticle(k); return sp?.particle === 'го' ? ['його'] : [] })())
