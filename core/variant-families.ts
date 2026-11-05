/**
 * SPEC 63 MM-30..MM-34 (owner remarks 2026-10-29): VARIANT FAMILIES. A family is a standard head word and the spellings / short forms that vary it, each with
 * the role it plays and its source. ONE table feeds the build (core/correspondences.ts turns the members into variant rows), the annotator, the search keys,
 * the word card and «Аналіз слова» (core/word-rules.ts), so they cannot disagree.
 *
 * Source rule: a member carries a cite only when a real line was read (en.wiktionary raw entries fetched 2026-10-29, CC BY-SA; the VESUM line of public/data/lexindex.json;
 * Огоновський 1889 from specs/63 MM-21). A member WITHOUT a cite is kept, because the owner named it, but it is flagged uncited and printed as «джерела не знайдено»:
 * the link then rests on the owner's identification, no feature or dialect is claimed for it.
 */
import { D, P, type Evidence } from './evidence.ts'

export type VClassName = 'prep' | 'pron' | 'adv' | 'conj' | 'part' | 'noun' | 'predic' | 'noninfl'
/** role of a member in its family (the label is what the card prints) */
export type VRole = 'alt' | 'euphonic' | 'expanded' | 'rare' | 'prothetic' | 'dialect' | 'arch' | 'sense' | 'reduced'
export const ROLE_UK: Record<VRole, string> = {
  alt: 'варіантна форма', euphonic: 'чергування у / в (милозвучність)', expanded: 'розширена форма', rare: 'рідкісна форма', prothetic: 'форма з протетичним у- / в-',
  dialect: 'діалектна форма', arch: 'архаїчна форма', sense: 'інше значення того самого написання', reduced: 'розмовна редукція (мовця)',
}
export interface VCite { source: string; url: string; quote: string; note: string }
export interface VMember {
  form: string; role: VRole
  /** absent = the owner named it, no source was found */ cite?: VCite
  /** MM-52b: the owner's statement, verbatim (the quote of the evidence when there is no cite) and the relation it states */ owner?: { quote: string; relation: string }
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

const OWNER_ODYN = { quote: 'один єден теж галицка риса', relation: 'єден = один (галицька лексична форма; Галичина, ступінь: за свідченням носія); близьке свідчення ЕУМ um173 «Наддністрянський говір»: «у числівниках — формальна структура числівників один … йід’н, йед’н, … (йедин йц’ік’)» (написання з й- і з голосним, що видруковано зображенням: це не те саме написання єден, тож для самого написання джерела не знайдено)' }
const OWNER_JAKYJ = { quote: 'єкий для галицкого діалекту на який', relation: 'єкий = який (галицька форма, а > е після й; Галичина, ступінь: за свідченням носія). ЕУМ um175 (PKB): «Лише після й перехід [а] в [е], [і] обмежений (йійц, йек, пйес…) східнонадпрутською групою говірок»; загального правила я- > є- джерело не дає, лише ця група' }
const OWNER_SHTYRY = { quote: 'штери штири теж діалектне', relation: 'форма числівника чотири (діалектна, область не названа; ступінь: за свідченням носія)' }
const OWNER_JAKYJ2 = { quote: 'який теж за галицкою рисою має бути йкий їкий єкий', relation: 'йкий, їкий = який (галицька форма; Галичина, ступінь: за свідченням носія; джерела не знайдено)' }
const UM162 = (quote: string): VCite => ({ source: 'ЕУМ', url: 'https://litopys.org.ua/ukrmova/um162.htm', quote: 'Функціонують ' + quote.replace(/^питальні /, 'питальні ') + (quote.includes('що') || quote.includes('хто') ? '' : ''), note: 'ЕУМ «Закарпатський говір», Морфологія: «Функціонують питальні займенники тко, ко «хто», што»' })
const OWNER_JAK = { quote: '1. tak, 2. ну галицкого жеж 3. так, і є ще заки', relation: 'єк, йк, їк = як (галицькі форми; Галичина, ступінь: за свідченням носія; джерела, крім ВЕСУМ-мітки arch для єк, не знайдено)' }
const OWNER_KILKO = { quote: '1. tak, 2. ну галицкого жеж 3. так, і є ще заки', relation: 'кілько = скільки (галицька форма; Галичина, ступінь: за свідченням носія); Желехівський подає скілько' }
const ZHEL = (quote: string, note: string): VCite => ({ source: 'Желехівський, Малорусько-німецький словар (1886), r2u', url: 'https://r2u.org.ua/html/zheleh_details.html', quote, note })
const OWNER_KURVOI = { quote: 'Курвої це прийменник від курва, редукований', relation: 'присвійний прикметник від курва, редукована форма мовця (курвиної → курвої); власник написав «прийменник», маючи на увазі прикметник' }
export const VARIANT_FAMILIES: VFamily[] = [
  // MM-43 (owner remark 2026-10-29: «ну коли редукцію робить мовець»): the speaker's own colloquial reduction, recorded in direct speech / dialect and folk texts. Corpus counts (BULP data/work shards, 2026-10-29):
  // шо 799 tokens in 10 witnesses (ez26_shekerik 724, cheremshyna1940 51), ше 93 in 6 (ez26_shekerik 71), шоб 7 in 2 (kobzar1876 5, rusalka1837 2), тра 7 in 6. Sources are cited only where en.wiktionary has the line.
  { id: 'VF-SHCHO', mm: 'MM-43', head: 'що', cls: ['pron', 'conj'], title: 'що ~ шо (розмовна редукція)', members: [
    { form: 'шо', role: 'reduced', cite: W('шо', 'Conversational form of що (ščo). [colloquial, dialectal] alternative form of що', 'en.wiktionary, стаття «шо» (Ukrainian, pron, tags colloquial / dialectal; діалектної групи стаття не називає — групу не заявлено)') },
  ] },
  { id: 'VF-SHCHOB', mm: 'MM-43', head: 'щоб', cls: ['conj'], title: 'щоб ~ шоб (розмовна редукція)', members: [
    { form: 'шоб', role: 'reduced', cite: W('шоб', '(colloquial) alternative form of щоб (ščob)', 'en.wiktionary, стаття «шоб» (Ukrainian, conj, tags alt-of / colloquial)') },
  ] },
  { id: 'VF-SHCHE', mm: 'MM-43', head: 'ще', cls: ['adv', 'part'], title: 'ще ~ ше (розмовна редукція)', members: [ { form: 'ше', role: 'reduced' } ] },
  { id: 'VF-TREBA', mm: 'MM-43', head: 'треба', cls: ['predic', 'noninfl', 'adv'], title: 'треба ~ тра, тре (розмовна редукція)', members: [ { form: 'тра', role: 'reduced' } ] },
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
  // MM-59 (owner: «один єден теж галицка риса»): єден (єдна, єдно, єдного …) is a LEXICAL Galician form of один, not a sound rule (no о → є is generalised). No ЕУМ page and no dictionary text we hold gives it (Желехівський / Грінченко are not in the repo as text):
  // kind P, «за свідченням носія», area Галичина = the owner's word. VESUM lists every one of these spellings as an ARCHAIC numeral (єден numr:arch), so each is ambiguous: the VESUM reading wins, the family is shown beside it.
  { id: 'VF-ODYN', mm: 'MM-59', head: 'один', cls: ['pron'], title: 'один ~ єден (єдна, єдно, єдного …), галицька форма', members:
    ['єден', 'єдна', 'єдно', 'єдного', 'єдному', 'єдним', 'єдній', 'єдну', 'єдної', 'єдною', 'єдні', 'єдних', 'єдними'].map((form): VMember => ({ form, role: 'dialect', ambiguous: true, owner: OWNER_ODYN })) },
  // MM-60 (owner: «єкий для галицкого діалекту на який»): єкий (єка, єке, єкі, єкого …) is the Galician spelling of який. The owner states it for «галицкий діалект»; ЕУМ um175 PKB has the general statement «Лише після й перехід [а] в [е], [і] обмежений (йійц, йек, пйес…) східнонадпрутською групою говірок» (a > е after й, limited to ONE group of говірки): the spelling єкий and the area are the owner's, kind P. The family is limited to the який paradigm: якось, якийсь, якраз are NOT added (no source, no owner word).
  { id: 'VF-JAKYJ', mm: 'MM-60', head: 'який', cls: ['pron'], title: 'який ~ єкий (єка, єке, єкого …), галицька форма', members:
    [...['єкий', 'єка', 'єке', 'єкі', 'єкого', 'єкому', 'єким', 'єкою', 'єкої', 'єку', 'єких', 'єкими', 'єкій'].map((form): VMember => ({ form, role: 'dialect', owner: OWNER_JAKYJ })),
      // MM-60b (owner: «який теж за галицкою рисою має бути йкий їкий єкий»): the same paradigm with й- and ї-; VESUM lists none of these spellings
      ...['йкий', 'йка', 'йке', 'йкі', 'йкого', 'йкому', 'йким', 'йкою', 'йкої', 'йку', 'йких', 'йкими', 'йкій', 'їкий', 'їка', 'їке', 'їкі', 'їкого', 'їкому', 'їким', 'їкою', 'їкої', 'їку', 'їких', 'їкими', 'їкій'].map((form): VMember => ({ form, role: 'dialect', owner: OWNER_JAKYJ2 }))] },
  // MM-60c (owner: «ну і всі інші перетворення для питань»): question words with a SOURCE. ЕУМ «Закарпатський говір» (um162): «Функціонують питальні займенники тко, ко «хто», што». ко and што are also VESUM readings (ко = abbreviation, што = a non-standard pronoun): ambiguous, the VESUM reading wins.
  { id: 'VF-ZAK-KTO', mm: 'MM-60c', head: 'хто', cls: ['pron'], title: 'хто ~ тко, ко (закарпатський говір)', members: [
    { form: 'тко', role: 'dialect', cite: UM162('питальні займенники тко, ко «хто»') }, { form: 'ко', role: 'dialect', ambiguous: true, cite: UM162('питальні займенники тко, ко «хто»') } ] },
  { id: 'VF-ZAK-SHTO', mm: 'MM-60c', head: 'що', cls: ['pron'], title: 'що ~ што (закарпатський говір)', members: [ { form: 'што', role: 'dialect', ambiguous: true, cite: UM162('питальні займенники … што') } ] },
  // MM-62 (owner: «штери штири теж діалектне»): шти́ри and its forms are dialect forms of чотири. en.wiktionary (kaikki uk): шти́ри «four», tag dialectal, forms штирьо́х, штирьо́м, штирма́ (no area named); ЕУМ um173 (Наддністрянський говір) lists «шти́ри» among its numerals and um174 (Надсянський) prints «штири кап’с’ц’і»: both name an area, the Вікісловник does not, so none is claimed. штери and штирі: the owner's words, kind P. штири and штирі are also VESUM noun forms (штир): ambiguous, VESUM wins.
  { id: 'VF-SHTYRY', mm: 'MM-62', head: 'чотири', cls: ['pron'], title: 'чотири ~ штири, штери (штирьох, штирьом, штирма), діалектні форми', members: [
    { form: 'штири', role: 'dialect', ambiguous: true, cite: W('штири', 'шти́ри • numeral, «four (4)», tags: dialectal; forms: штирьо́х, штирьо́м, штирма́', 'en.wiktionary / kaikki uk, стаття «штири» (num): позначка dialectal, діалект не названо; ЕУМ um173 (NDN) «шти́ри» у переліку числівників, um174 (SYAN) «штири кап’с’ц’і»') },
    ...['штирьох', 'штирьом', 'штирма'].map((form): VMember => ({ form, role: 'dialect', cite: W('штири', 'forms of шти́ри: штирьо́х, штирьо́м, штирма́', 'en.wiktionary / kaikki uk, стаття «штири» (num), declension: позначка dialectal, діалект не названо') })),
    ...['штери', 'штирі'].map((form): VMember => ({ form, role: 'dialect', ambiguous: form === 'штирі', owner: OWNER_SHTYRY })),
  ] },
  // MM-60d (owner, asked about єк / йк / їк, кілько, the forms of котрий … and заки: «1. tak, 2. ну галицкого жеж 3. так, і є ще заки»). Galician forms, kind P (the owner's confirmation); VESUM lists єк (adv / conj / part, arch), кілько (numr, arch), заки (conj, arch) and кількох (a form of кілька): those are ambiguous, VESUM wins.
  // Желехівський (r2u, 1886) is a real source for скілько and заки; it does not name an area, the area Галичина is the owner's.
  { id: 'VF-JAK', mm: 'MM-60d', head: 'як', cls: ['adv', 'conj'], title: 'як ~ єк, йк, їк (галицькі форми)', members: [
    { form: 'єк', role: 'dialect', ambiguous: true, owner: OWNER_JAK }, { form: 'йк', role: 'dialect', owner: OWNER_JAK }, { form: 'їк', role: 'dialect', owner: OWNER_JAK } ] },
  { id: 'VF-KILKO', mm: 'MM-60d', head: 'скільки', cls: ['adv', 'pron'], title: 'скільки ~ кілько, скілько (галицькі форми)', members: [
    { form: 'скілько', role: 'dialect', ambiguous: true, cite: ZHEL('Скі́льки, скі́лько, adv. wie viel? so viel; о скі́лько in wiefern, insofern.', 'Желехівський (1886): скільки й скілько — один заголовок; область словник не називає') },
    ...['кілько', 'кількох', 'кільком', 'кількома'].map((form): VMember => ({ form, role: 'dialect', ambiguous: true, owner: OWNER_KILKO })) ] },
  { id: 'VF-ZAKI', mm: 'MM-60d', head: 'поки', cls: ['conj', 'adv'], title: 'поки ~ заки, закиль, заким, закинь (галицька сполучник)', members: [
    { form: 'заки', role: 'dialect', ambiguous: true, cite: ZHEL('За́ки, за́киль, за́ким, за́кинь, conj. während (kurzer Zeit), bis; bevor, ehe.', 'Желехівський (1886): «während (kurzer Zeit), bis; bevor, ehe» = поки, доки; перш ніж; en.wiktionary (kaikki uk, «заки», dialectal): so long as, while; until, before; synonym поки. Область — Галичина — за свідченням власника, словник її не називає') },
    ...['закиль', 'заким', 'закинь'].map((form): VMember => ({ form, role: 'dialect', cite: ZHEL('За́ки, за́киль, за́ким, за́кинь, conj. während (kurzer Zeit), bis; bevor, ehe.', 'Желехівський (1886): форма того самого заголовка; область словник не називає') })) ] },
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
  // MM-52 (owner: «жеби'м теж має розпізнаватися»): жеби = щоб, Надсяння / Лемківщина; the person clitic -м / -сь / -смо / -сте that follows it is split by core/gal-mm52.ts
  { id: 'VF-ZHEBY', mm: 'MM-52', head: 'щоб', cls: ['conj'], title: 'щоб ~ жеби (Надсяння, Лемківщина)', members: [
    { form: 'жеби', role: 'dialect', cite: { source: 'ЕУМ «Надсянський говір» (um174)', url: 'https://litopys.org.ua/ukrmova/um174.htm', quote: 'сполучнику жы (вуган’еў ‘виганяв’, жыбу < жеби ‘щоби’, робиў бу ‘би’)',
      note: 'ЕУМ, стаття «Надсянський говір»: жеби ‘щоби’ названо вихідною формою сполучника; ВЕСУМ має жеби як окрему архаїчну лему (conj:subord:arch)' } },
  ] },
  // MM-52b (owner: «Курвої це прийменник від курва, редукований»; прикметник is meant): a possessive adjective of курва, reduced by the speaker (курвиної → курвої, «до курвої мами»).
  // VESUM has no курвин; the link goes to курва. No cited general pattern for the speaker's reduction of -ин- / -ов- possessives was found in the repo (only per-word MM-43 rows), so this is NOT generalised: only the case forms below.
  { id: 'VF-KURVOI', mm: 'MM-52b', head: 'курва', cls: ['noun'], title: 'курва ~ курвої (присвійний прикметник, редукована форма мовця)', members: [
    ...['курвої', 'курвого', 'курвому'].map((form): VMember => ({ form, role: 'reduced', owner: OWNER_KURVOI })),
    ...['курвій', 'курву'].map((form): VMember => ({ form, role: 'reduced', ambiguous: true, owner: OWNER_KURVOI })),   // also ordinary forms of курва (dat./loc., acc.): VESUM wins
  ] },
]

/** the evidence of a member; an uncited one says so */
export const memberEvidence = (f: VFamily, m: VMember): Evidence =>
  m.cite ? D(m.cite.source, m.cite.url, m.cite.quote, `${m.cite.note}; «${m.form}» → «${f.head}»`)
    : P('зауваження власника', `SPEC 63 ${f.mm}`, m.owner?.quote ?? `«${m.form}» → «${f.head}»`, m.owner ? `${m.owner.relation}; «${m.form}» → «${f.head}»; ступінь: за свідченням носія (не засвідчено); джерела (словника, граматики) не знайдено` : `джерела не знайдено: зв’язок «${m.form}» → «${f.head}» за зауваженням власника проєкту (SPEC 63 ${f.mm}); ознак і діалекту не заявлено`)

const byForm = new Map<string, { family: VFamily; member: VMember }>()
for (const f of VARIANT_FAMILIES) for (const m of f.members) byForm.set(m.form, { family: f, member: m })
export const familyMember = (form: string) => byForm.get(form)
/** family of a lemma: the head, or a member that is a card of its own (в, тілько) */
export const familyOfLemma = (lemma: string): VFamily | undefined => VARIANT_FAMILIES.find(f => f.head === lemma || f.members.some(m => m.form === lemma))
