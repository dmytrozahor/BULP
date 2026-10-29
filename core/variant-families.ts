/**
 * SPEC 63 MM-30..MM-34 (owner remarks 2026-10-29): VARIANT FAMILIES. A family is a standard head word and the spellings / short forms that vary it, each with
 * the role it plays and its source. ONE table feeds the build (core/correspondences.ts turns the members into variant rows), the annotator, the search keys,
 * the word card and «Аналіз слова» (core/word-rules.ts), so they cannot disagree.
 *
 * Source rule: a member carries a cite only when a real line was read (en.wiktionary raw entries fetched 2026-10-29, CC BY-SA; the VESUM line of public/data/lexindex.json;
 * Огоновський 1889 from specs/63 MM-21). A member WITHOUT a cite is kept, because the owner named it, but it is flagged uncited and printed as «джерела не знайдено»:
 * the link then rests on the owner's identification, no feature or dialect is claimed for it.
 */
import { D, type Evidence } from './evidence.ts'

export type VClassName = 'prep' | 'pron' | 'adv' | 'conj' | 'part' | 'noun'
/** role of a member in its family (the label is what the card prints) */
export type VRole = 'alt' | 'euphonic' | 'expanded' | 'rare' | 'prothetic' | 'dialect' | 'arch' | 'sense'
export const ROLE_UK: Record<VRole, string> = {
  alt: 'варіантна форма', euphonic: 'чергування у / в (милозвучність)', expanded: 'розширена форма', rare: 'рідкісна форма', prothetic: 'форма з протетичним у- / в-',
  dialect: 'діалектна форма', arch: 'архаїчна форма', sense: 'інше значення того самого написання',
}
export interface VCite { source: string; url: string; quote: string; note: string }
export interface VMember {
  form: string; role: VRole
  /** absent = the owner named it, no source was found */ cite?: VCite
  /** the form is also an ordinary form of another word (меж = gen. pl. of межа): it is shown as a family member but never overrides a VESUM reading */ ambiguous?: boolean
  /** peer: a member that has its own card (в beside у): shown, never redirected */ peer?: boolean
  /** only the link and the search key, no chip on a token (declension forms of весь) */ quiet?: boolean
}
export interface VFamily {
  id: string; mm: string; head: string; cls: VClassName[]
  /** one line for the card */ title: string
  /** particles that may follow a member with a hyphen (тілько-що) */ tails?: boolean
  members: VMember[]
  /** a cited feature of the HEAD (not of every member) */ feature?: { label: string; cite: VCite }
}

const WIKT = (w: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#Ukrainian`
const W = (word: string, quote: string, note: string): VCite => ({ source: 'Вікісловник (en)', url: WIKT(word), quote, note })
const ALT_V = 'Alternative forms: вві, ві, во, ув, уві (rare)'

export const VARIANT_FAMILIES: VFamily[] = [
  { id: 'VF-MIZH', mm: 'MM-30', head: 'між', cls: ['prep'], title: 'між ~ межи, меж, міжи, мендзи', members: [
    { form: 'межи', role: 'alt', cite: W('межи', 'alternative form of між', 'en.wiktionary, стаття «межи» (Ukrainian, preposition, псл. *meďu); стаття «між»: Alternative forms: меж, межи́. Огоновський 1889 (скан p. 40, примітка до § 68) вживає «межи» в тексті як звичайне прийменник') },
    { form: 'меж', role: 'alt', ambiguous: true, cite: W('між', 'Alternative forms: меж, межи́', 'en.wiktionary, стаття «між». Але меж — також родовий множини від межа, тому читання ВЕСУМ «межа» не скасовується') },
    { form: 'міжи', role: 'alt' },
    { form: 'мендзи', role: 'alt' },
  ] },
  { id: 'VF-U-V', mm: 'MM-31', head: 'у', cls: ['prep'], title: 'у ~ в, уві, вві, ві, во, ув', members: [
    { form: 'в', role: 'euphonic', peer: true, cite: W('в', 'Preposition «in, at» … (followed by a vowel); Alternative forms: у (followed by a consonant)',
      'en.wiktionary, статті «в» і «у» (Ukrainian, preposition): у — перед приголосним, в — перед голосним; посилання на шаблон Usage notes {{U:uk:у-в}} (його тіло не завантажено)') },
    { form: 'уві', role: 'expanded', cite: W('уві', 'alternative form of вві', 'en.wiktionary, стаття «уві» (preposition) → «вві»; у статті «в» перелічено як рідкісні: вві, ві, во, ув, уві') },
    { form: 'вві', role: 'expanded', cite: W('вві', 'alternative form of в. «вві» is used only before сні (dream, locative singular) or снах (dreams, locative plural), for any other words в or у are used instead',
      'en.wiktionary, стаття «вві» (Usage notes): лише перед сні / снах') },
    { form: 'ві', role: 'rare', cite: W('в', ALT_V, 'en.wiktionary, стаття «в», Alternative forms; ВЕСУМ: ві prep:arch') },
    { form: 'во', role: 'rare', ambiguous: true, cite: W('в', ALT_V, 'en.wiktionary, стаття «в», Alternative forms') },
    { form: 'ув', role: 'rare', ambiguous: true, cite: W('в', ALT_V, 'en.wiktionary, стаття «в», Alternative forms') },
  ] },
  { id: 'VF-VES', mm: 'MM-32', head: 'весь', cls: ['pron'], title: 'весь ~ увесь, ввесь (і форми усе, уся, усі …)', members: [
    { form: 'увесь', role: 'prothetic', cite: W('увесь', 'alternative form of весь (after consonants or at the beginning of a clause); Emphatic form of весь', 'en.wiktionary, стаття «увесь» (Pronoun), Usage notes {{U:uk:у-в}}') },
    { form: 'ввесь', role: 'prothetic', cite: W('весь', 'alti: ввесь, уве́сь', 'en.wiktionary, стаття «весь» (Pronoun, альтернативи ввесь, увесь); стаття «увесь», Alternative forms: ввесь') },
    ...['уся', 'усе', 'усі', 'усього', 'усьому', 'усім', 'усіх', 'усю', 'усіма', 'усією'].map((f): VMember => ({ form: f, role: 'prothetic', quiet: true, ambiguous: true,
      cite: W('увесь', 'Declension: усе́, уся́, усі́; усього́; усьому́; усі́м; усіх; усю́; усіма́', 'en.wiktionary, таблиця відмінювання «увесь»: ті самі форми з у- замість в- (всього, всьому, всім, всіх, всю, всіма)') })),
  ] },
  { id: 'VF-TILKY', mm: 'MM-33', head: 'тільки', cls: ['adv'], title: 'тільки ~ тілько, тилько (тілько-що …)', tails: true,
    feature: { label: 'західноукраїнська вимова [т’ільки] (м’який т), діалектна [тіки]', cite: W('тільки', "(Western Ukraine) т'і́льки; (dialectal) ті́ки", 'en.wiktionary, стаття «тільки», Pronunciation. Джерело називає цю вимову для написання ТІЛЬКИ; про написання тілько / тилько воно нічого не каже') },
    members: [
      { form: 'тілько', role: 'arch', cite: { source: 'VESUM', url: 'https://github.com/brown-uk/dict_uk', quote: 'тілько adv:arch; тілько conj:subord:arch; тілько part:arch',
        note: 'public/data/lexindex.json (рядки ВЕСУМ, що не є нормою): ВЕСУМ має тілько як окрему архаїчну лему; посилання на тільки там немає' } },
      { form: 'тилько', role: 'dialect' },
    ] },
  { id: 'VF-YAK', mm: 'MM-34', head: 'як', cls: ['adv', 'conj', 'pron', 'part'], title: 'як ~ яко (і како)', members: [
    { form: 'яко', role: 'arch', cite: W('яко', 'alternative form of як (Adverb, Conjunction)', 'en.wiktionary, стаття «яко» (Adverb, Conjunction); ВЕСУМ: яко conj:subord:arch') },
    { form: 'како', role: 'sense', ambiguous: true },
  ] },
]

/** the evidence of a member; an uncited one says so */
export const memberEvidence = (f: VFamily, m: VMember): Evidence =>
  m.cite ? D(m.cite.source, m.cite.url, m.cite.quote, `${m.cite.note}; «${m.form}» → «${f.head}»`)
    : D('зауваження власника', '', '', `джерела не знайдено: зв’язок «${m.form}» → «${f.head}» за зауваженням власника проєкту (SPEC 63 ${f.mm}); ознак і діалекту не заявлено`)

const byForm = new Map<string, { family: VFamily; member: VMember }>()
for (const f of VARIANT_FAMILIES) for (const m of f.members) byForm.set(m.form, { family: f, member: m })
export const familyMember = (form: string) => byForm.get(form)
/** family of a lemma: the head, or a member that is a card of its own (в, тілько) */
export const familyOfLemma = (lemma: string): VFamily | undefined => VARIANT_FAMILIES.find(f => f.head === lemma || f.members.some(m => m.form === lemma))
