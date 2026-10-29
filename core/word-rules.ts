/**
 * SPEC 63 MM-29..MM-36: THE shared rule function of the client. The annotator (src/lib/annotate.ts), the search keys (src/lib/search.ts queryKeys) and «Аналіз слова» (AnalyzeView, which the
 * search page embeds for a word outside the lexicon) call the same functions, so a spelling gets the same variant family, the same feature pair and the same contact class everywhere.
 * Pure (no node imports); the lexicon is reached through the `known` callback.
 *
 *  - variantHit      a spelling that is a member of a variant family (core/variant-families.ts): межи / мендзи → між, увесь → весь, тілько-що → тільки, уві → у, како → як;
 *  - featurePairs    the cited feature that links two spellings in BOTH directions: керовати → керувати AND керувати → керовати (-ова- ~ -ува-, MM-19 / MM-35), міст-ові / містові → міст (MM-29);
 *  - ruClassOf       the Russian-headword classifier of MM-25 (core/ru-contact.ts) with the r2u index.
 */
import { key } from './text.ts'
import { familyMember, memberEvidence, ROLE_UK, type VFamily, type VMember } from './variant-families.ts'
import { ZHEL_FOLDS } from './zhel-folds.ts'
import { ZAK_FOLDS, RDC_FOLD } from './zak-folds.ts'
import { toDatStem, toOvati, toUvati, splitHyphenParticle, DAT_OVI_FOLD, VERB_OVATI_FOLD } from './gal-folds.ts'
import { classifyRu, type RuClass, type RuCtx, type RuLookups } from './ru-contact.ts'
import type { Evidence } from './evidence.ts'
import { copulaReading, copulaKeys, type CopulaCtx, type CopulaReading } from './copula-ikavism.ts'
import { shortReading, shortKeys, type ShortCtx, type ShortReading } from './short-forms.ts'

export interface VariantHit {
  family: VFamily; member: VMember
  /** the particle after a hyphen (тілько-що → «що») */ tail?: string
  /** the head the spelling belongs to */ head: string
  /** «варіантна форма», «чергування у / в …» */ roleUk: string
  /** the member's source, or the line «джерела не знайдено» */ evidence: Evidence
  /** the member has no source: the link is the owner's identification */ uncited: boolean
  /** the sense was named by the owner (како → як): listed beside the ordinary reading, never instead of it */ sense: boolean
}
const hit = (family: VFamily, member: VMember, tail?: string): VariantHit => ({ family, member, tail, head: family.head, roleUk: ROLE_UK[member.role], evidence: memberEvidence(family, member), uncited: !member.cite, sense: member.role === 'sense' })

/** a (lower-case, key()ed) spelling that belongs to a family; a hyphenated tail (тілько-що) is stripped for families that allow it */
export function variantHit(k: string): VariantHit | undefined {
  const e = familyMember(k)
  if (e) return hit(e.family, e.member)
  const sp = splitHyphenParticle(k)
  const t = sp && familyMember(sp.host)
  return sp && t && t.family.tails ? hit(t.family, t.member, sp.particle) : undefined
}
/** extra search keys: the head of the family (a peer such as в keeps only itself) */
export const variantKeys = (k: string): string[] => { const h = variantHit(k); return [...(h && !h.member.peer ? [key(h.head)] : []), ...copulaKeys(k), ...shortKeys(k)] }
/** the family a card lemma belongs to, with the other members, for the card line */
export { familyOfLemma } from './variant-families.ts'

export interface FeaturePair {
  /** feature rule id (core/feature-chips.ts FEATURES, cited fold in core/gal-folds.ts) */ rule: 'ORTH-VERB-OVATI' | 'ORTH-DAT-OVI' | 'ORTH-ZHEL-SOFT' | 'ORTH-RDC' | 'ORTH-ZAK-Y' | 'ORTH-ZAK-Y-V' | 'ORTH-ZAK-Y-E' | 'ORTH-ZAK-Y-E-V' | 'ORTH-ZAK-Y-O' | 'ORTH-ZAK-Y-O-V' | 'ORTH-ZAK-O'
  /** 'forward' = the cited fold direction (-ова- → -ува-); 'reverse' = the counterpart seen from the standard side (-ува- → -ова-) */ direction: 'forward' | 'reverse'
  from: string; to: string; known: boolean
  /** Ukrainian one-line statement of the direction */ text: string
  cite: Evidence
}
/**
 * The cited sound / spelling feature that links `word` with a counterpart, both ways. Only the counterpart that the lexicon knows is reported as known; an unknown counterpart is still listed
 * (known: false) for the reverse direction, because the standard word is the page the user is on.
 */
export function featurePairs(word: string, known: (k: string) => boolean): FeaturePair[] {
  const w = key(word), out: FeaturePair[] = []
  const up = toUvati(w), op = toOvati(w), dat = toDatStem(w)
  if (up !== w) out.push({ rule: 'ORTH-VERB-OVATI', direction: 'forward', from: w, to: up, known: known(key(up)), cite: VERB_OVATI_FOLD.cite,
    text: `«${w}» — давніша форма на -ова-; сучасна на -ува-: «${up}» (Огоновський 1889 § 38: суфікс -ова-ти старший, -ува-ти від основи теперішнього часу)` })
  if (op !== w) out.push({ rule: 'ORTH-VERB-OVATI', direction: 'reverse', from: w, to: op, known: known(key(op)), cite: VERB_OVATI_FOLD.cite,
    text: `«${w}» — сучасна форма на -ува-; давніша / галицька друкована форма — на -ова-: «${op}» (те саме правило, зворотний напрям)` })
  if (dat !== w && !known(w) && known(key(dat))) out.push({ rule: 'ORTH-DAT-OVI', direction: 'forward', from: w, to: dat, known: true, cite: DAT_OVI_FOLD.cite,
    text: `«${w}» — давальний відмінок на -ові, прикріплений до незміненої основи «${dat}» (західна форма; стандартна форма має чергування, мостові)` })
  // MM-37: сь / зь / ць before a hard labial (засьпіваєш, сьвіт, цьвях): the cited Желехівка spelling, shown in Аналіз слова for a word with no witness context
  const soft = ZHEL_FOLDS.find(f => f.id === 'ORTH-ZHEL-SOFT')!, sf = soft.apply(w)
  if (sf !== w && !known(w) && known(key(sf))) out.push({ rule: 'ORTH-ZHEL-SOFT', direction: 'forward', from: w, to: sf, known: true, cite: soft.cite,
    text: `«${w}» — ь після с, з, ц перед губним: правопис Желехівки (друковані галицькі видання); сучасна форма «${sf}». Діалектну належність цього написання джерело не називає (джерела не знайдено)` })
  // MM-40: -рдц- → -рц- (сердце → серце), the older spelling; MM-41: ÿ ü ӱ ô in a Cyrillic word (вÿс → віз): a candidate counts only when the lexicon knows it, and never for a known word
  if (!known(w)) for (const f of [RDC_FOLD, ...ZAK_FOLDS]) {
    const to = f.apply(w)
    if (to !== w && known(key(to)) && !out.some(p => p.to === key(to))) out.push({ rule: f.id as FeaturePair['rule'], direction: 'forward', from: w, to: key(to), known: true, cite: f.cite,
      text: f === RDC_FOLD ? `«${w}» — давніша (середньоукраїнська) форма з -рдц-; сучасна «${to}» (власний корпус, свідки з датами у цитаті). Діалект не заявляється`
        : `«${w}» — літера ${/[ôê]/.test(w) ? 'ô' : 'ÿ'}, якою ЕУМ (um162) друкує закарпатську вимову; стандартне слово «${to}». Район не заявляється` })
  }
  return out
}

export interface RuleLook {
  /** the spelling is known to the lexicon / VESUM */ known: (k: string) => boolean
  /** MM-25: Russian headwords of the r2u ru→uk dictionaries (index sidecar `ru`); absent = no Russianism is detected */ ru?: Pick<RuLookups, 'ruHead' | 'isDialect'>
}
export interface WordRules { variant?: VariantHit; pairs: FeaturePair[]; ruClass?: RuClass; /** MM-38: the Galician-ikavism copula reading of їсть, beside (never instead of) їсти */ copula?: CopulaReading; /** MM-42 / MM-43: the short-form reading (го = його, тре = треба, шо = що …) with its chip; branching where the short form is also a word */ short?: ShortReading }
export function wordRules(raw: string, look: RuleLook, ctx: RuCtx & CopulaCtx & ShortCtx = {}): WordRules {
  const k = key(raw)
  if (!k) return { pairs: [] }
  const variant = variantHit(k)
  const pairs = featurePairs(k, look.known)
  const ruClass = look.ru && !look.known(k) ? classifyRu(raw, ctx, { ...look.ru, isUkrainian: look.known }) : undefined
  return { variant, pairs, ruClass, copula: copulaReading(k, ctx), short: shortReading(raw, ctx) }
}
