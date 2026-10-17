/**
 * Detector rule tables (data, not code). Sources: research/03 §4 (Church Slavonic), research/05 §3.2 (contact/surzhyk),
 * research/04 §1 (dialects), research/08 B3 (register). Weight-0 rows are kept on purpose: they document
 * hypotheses that lack a published source (P-1.3) and surface only as review hints.
 */
import { Q, P, D, claim, type Claim, type Evidence } from './evidence.ts'
import { TAG, normative, modern, detect, type Ctx, type Rule, type Detection } from './detect.ts'
import { DIALECT_LEX } from './dialect-lex.ts'
import { AUM_ROWS, AUM_VOL2 } from './atlas-rules.ts'

const vline = (c: Ctx, t: string) => { const h = TAG(c, t); return h ? D('VESUM', 'dict_corp_vis.txt v6.8.6', `${c.form} ${h.tags} (лема: ${h.lemma})`) : null }
const match = (re: RegExp, s?: string) => (s && re.test(s) ? s : null)
const form = (c: Ctx, src = 'attestation') => D(src, c.year ? `рік ${c.year}` : 'введення користувача', c.norm ?? c.form)

// ── Church Slavonic vs vernacular (research/03 §4) ──────────────────────────────────────────────
const SHEV_BULG = Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev04.htm, 14.5', 'містять žd, št < dj, tj, написання типу СrъС… повноголос у них ніколи не трапляється', 'Шевельов про болгарські (церковнослов\'янські) тексти')
const SHEV_SCRIBES = Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev04.htm, 14.4', 'Деякі риси церковнослов\'янського письма відкинуто (Ж, СrěС, жд), інші частково або повністю пристосовано до місцевої вимови')

/** CS doublet: the form shows a South-Slavic reflex AND VESUM attests the East-Slavic counterpart. A proper name (:prop) is not a lexical counterpart (first full build: слава ↔ Солова, бракъ ↔ Борок). */
const doublet = (re: RegExp, swap: (m: string) => string) => (c: Ctx): Evidence | null => {
  const src = c.norm ?? c.form; if (!re.test(src)) return null
  const vern = src.replace(re, swap)
  for (const cand of [vern, ...(c.derive?.(vern) ?? [])]) {
    const h = c.inLexicon(cand).find(x => !x.tags.split(':').includes('prop'))
    if (h) return D('VESUM', 'dict_corp_vis.txt v6.8.6', `${src} ↔ ${cand} (${h.lemma}: ${h.tags})`, 'східнослов\'янський відповідник засвідчений у ВЕСУМ')
  }
  return null
}
const CS_FORM = /(^|[^аеиоуыѣяюєіїѧ])([бвгдзкмпстхчжш])([рл])([аѣ])(?=[бвгдзкмнпрстхцчшж])/

export const CS_RULES: Rule[] = [
  { id: 'CS-C1', axis: 'cs', label: 'church_slavonic', weight: 0.8, cite: SHEV_BULG, note: 'неповноголосся CraC ↔ CoroC',
    test: doublet(CS_FORM, m => m.replace(/([рл])([аѣ])$/, (_, l, v) => (v === 'а' ? `о${l}о` : `е${l}е`))) },
  { id: 'CS-C3', axis: 'cs', label: 'church_slavonic', weight: 0.7, cite: SHEV_BULG, note: 'щ < *tj ↔ ч',
    test: c => (c.inLexicon(c.form).some(h => !/arch|bad/.test(h.tags)) ? null : doublet(/щ/, () => 'ч')(c)) },
  { id: 'CS-C4', axis: 'cs', label: 'church_slavonic', weight: 0.7, cite: SHEV_SCRIBES, note: 'жд < *dj ↔ ж',
    test: c => (c.inLexicon(c.form).some(h => !/arch|bad/.test(h.tags)) ? null : doublet(/жд/, () => 'ж')(c)) },
  { id: 'CS-C9', axis: 'cs', label: 'church_slavonic', weight: 0.6, cite: SHEV_BULG, note: 'написання CrъC',
    test: c => (match(/[бвгдкмпстхчжш][рл][ъь][бвгдкмпстхчжшзн]/, c.norm) ? form(c) : null) },
  { id: 'CS-C11', axis: 'cs', label: 'church_slavonic', weight: 0.6, note: 'дієприкметники -ущ-/-ющ-/-ащ-/-ящ-',
    cite: Q('WUK', 'https://uk.wikipedia.org/wiki/Дієприкметник', 'видющий, значущий, кричущий, цілющий … запозичені зі церковнослов\'янської мови'),
    test: c => (/(ущ|ющ|ащ|ящ)(ий|а|е|і|ого|ии|ыи)$/.test(c.form) && (normative(c) || (c.year ?? 9999) < 1798) ? form(c) : null) },
  { id: 'CS-C12', axis: 'cs', label: 'church_slavonic', weight: 0, note: '-аго (без джерела, research/05 ORT-AGO)',
    cite: P('SHEV', '—', 'unsourced'), test: c => (/аго$/.test(c.form) ? form(c) : null) },
  { id: 'CS-C10', axis: 'cs', label: 'church_slavonic', weight: 0, note: 'префікси пре-/из-/воз- (без джерела)',
    cite: P('SHEV', '—', 'unsourced'), test: c => (/^(пре|из|воз|вос)/.test(c.norm ?? '') ? form(c) : null) },
]

// ── Contact layer / surzhyk (research/05 §3.2) ──────────────────────────────────────────────────
const VT = (tag: string, gloss: string) => Q('VESUM', 'doc/tags.txt (dict_uk)', `${tag} ${gloss}`)
const LTD = (q: string) => D('LT', 'rules/uk/replace.txt (LanguageTool)', q)
const ALPHA = P('WUK', 'https://uk.wikipedia.org/wiki/Українська_абетка', 'сучасна українська абетка (33 літери) не має ы, э, ъ, ё', 'research/05: Півторак, енц. «Українська мова» 2004; правила 1919 р. «стали основою всіх наступних правописів» (ENC um77)')
const notInVesum = (c: Ctx) => c.vesum.length === 0
/** ы-forms identical in Russian, Rusyn and Carpathian spelling (research/10 §5): no discriminator ⇒ ambiguous, not russianism. */
const AMBIG_Y = /^(мы|ты|вы|сын[а-яё]*|рыб[а-яё]*|был[а-яё]*)$/
const presovYo = (f: string) => /ё/.test(f) && /[ыьі]/.test(f)

export const CONTACT_RULES: Rule[] = [
  { id: 'LEX-LT', axis: 'contact', label: 'nonnormative', weight: 0.8, cite: Q('LT', 'UK_SIMPLE_REPLACE', '«X» - помилкове слово, виправлення: …'),
    test: c => (modern(c) && c.lt?.file === 'replace' ? LTD(`${c.form}=${c.lt.suggest}`) : null) },
  { id: 'LEX-LT-SOFT', axis: 'contact', label: 'not_recommended', weight: 0.4, cite: Q('LT', 'UK_SIMPLE_REPLACE_SOFT', 'нерекомендоване слово, кращий варіант'),
    test: c => (modern(c) && c.lt?.file === 'soft' ? D('LT', 'rules/uk/replace_soft.txt', `${c.form}=${c.lt.suggest}`) : null) },
  { id: 'LEX-VESUM-BAD', axis: 'contact', label: 'russianism_or_hybrid', weight: 0.8, cite: VT('bad', 'покруч'), test: c => (modern(c) ? vline(c, 'bad') : null),
    note: 'nonstandard_items.md: bad охоплює «росіянізми - кляча»' },
  { id: 'LEX-VESUM-SUBST', axis: 'contact', label: 'nonstandard', weight: 0.6, cite: VT('subst', 'нестандартні форма'), test: c => (modern(c) ? vline(c, 'subst') : null) },
  { id: 'ORT-YI', axis: 'contact', label: 'russianism_orth', weight: 0.9, cite: ALPHA, note: 'ъ/ё: вето лише за RUE-PRESOV-YO або RUSYN_STRONG; э лишається російською ознакою (research/10 §5)',
    test: c => (modern(c) && (/э/.test(c.form) || (/[ъё]/.test(c.form) && !rusynStrong(c.form) && !presovYo(c.form))) ? form(c) : null) },
  { id: 'ORT-Y', axis: 'contact', label: 'russianism_orth', weight: 0.5, cite: ALPHA, note: 'ы також у карпатських говорах і русинських стандартах (див. CARP-Y, RUE-*); вето RUSYN_STRONG, двозначні форми → ORT-Y-AMB',
    test: c => (modern(c) && /ы/.test(c.form) && !rusynStrong(c.form) && !presovYo(c.form) && !AMBIG_Y.test(c.form) ? form(c) : null) },
  { id: 'ORT-Y-AMB', axis: 'contact', label: 'ambiguous_y', weight: 0.2, cite: ALPHA, note: 'ы без русинського дискримінатора: російське / русинське / карпатське (research/10 §5); вирішувати за контекстом документа',
    test: c => (modern(c) && AMBIG_Y.test(c.form) && !rusynStrong(c.form) ? form(c) : null) },
  { id: 'ORT-OLD', axis: 'contact', label: 'archaic_orthography', weight: 0.9, note: 'до 1919: ярижка, кулішівка, руська мова — норма свого часу',
    cite: P('WUK', 'https://uk.wikipedia.org/wiki/Українська_абетка', 'дореформені правописи вживали ы, ъ, э, ё, ѣ (Котляревський писав э, Максимович ё, ѣ)'),
    test: c => (c.year !== undefined && c.year < 1919 && /[ыэъёѣ]/.test(c.norm ?? c.form) ? form(c) : null) },
  { id: 'ORT-JO', axis: 'contact', label: 'russianism_phon', weight: 0.6, cite: LTD('117 ключів містять ьо, напр. вертольот=вертоліт'),
    test: c => (modern(c) && notInVesum(c) && /ьо[тк]/.test(c.form) ? form(c) : null) },
  { id: 'MOR-PART-UCH', axis: 'contact', label: 'calque_participle', weight: 0.6, cite: Q('VESUM', 'doc/nonstandard_items.md', ':adjp:actv:imperf, e.g. «існуючий»'),
    test: c => (modern(c) && /(уч|юч|ач|яч)(ий|а|е|і|ого)$/.test(c.form) && (TAG(c, 'bad') || c.lt) ? form(c) : null) },
  { id: 'MOR-PART-SHCH', axis: 'contact', label: 'russianism_morph', weight: 0.7, cite: LTD('22 ключі -ющ/-ущ/-ящ/-ащ, напр. курящий=що палить'),
    test: c => (modern(c) && notInVesum(c) && /(ющ|ущ|ящ|ащ)(ий|а|е|і|ого)$/.test(c.form) ? form(c) : null) },
  { id: 'MOR-SHIISIA', axis: 'contact', label: 'russianism_morph', weight: 0.5, cite: LTD('залишившийся=що залишився'),
    test: c => (modern(c) && /ш(ий|ій|ая|еє)ся$/.test(c.form) ? form(c) : null) },
  { id: 'MOR-TSIA', axis: 'contact', label: 'russianism_orth', weight: 0.8, cite: P('PRAV', '§ не перевірено', 'інфінітив і дієслівні форми пишуться з -ться, не -тся'),
    test: c => (modern(c) && /тся$/.test(c.form) ? form(c) : null) },
  { id: 'PFX-VS', axis: 'contact', label: 'russianism_morph', weight: 0.4, cite: LTD('22 ключі ^вс-, напр. вскривати=викривати'),
    test: c => (modern(c) && notInVesum(c) && /^вс[^ьяюєі]/.test(c.form) ? form(c) : null) },
  { id: 'SFX-YVA', axis: 'contact', label: 'russianism_morph', weight: 0.2, cite: LTD('7 ключів -ивати, напр. визивати=викликати'),
    test: c => (modern(c) && notInVesum(c) && /ив(ати|ає)$/.test(c.form) ? form(c) : null) },
  { id: 'PFX-RAZ', axis: 'contact', label: 'russianism_morph', weight: 0, cite: P('PRAV', '—', 'unsourced'), test: c => (modern(c) && notInVesum(c) && /^раз(?!ом|ів|у$)/.test(c.form) ? form(c) : null) },
  { id: 'SFX-STVO', axis: 'contact', label: 'russianism_morph', weight: 0, cite: P('PRAV', '—', 'unsourced: -ство питомий суфікс'), test: c => (/ство$/.test(c.form) && notInVesum(c) ? form(c) : null) },
]

/** Contact labels that make a modern form "surzhyk" (research/05 §1: derived label, never primary). */
export const SURZHYK_BASIS = ['russianism_or_hybrid', 'russianism_orth', 'russianism_morph', 'russianism_phon', 'calque_participle']
export const SURZHYK_DEF = Q('ENC', 'Енциклопедія «Українська мова», 2000, с. 616 (через: Бузько, Філологічні студії, 2010, с. 63)',
  'Уживається переважно щодо українського просторіччя, засміченого невмотивовано запозиченими (унаслідок українсько-російської інтерференції) російськими елементами', 'вторинне цитування')

// ── Dialects (research/04 §1) — fire only on non-normative forms, from the feature's dated first attestation (else 1798) ────────────────────
const W = (art: string) => `https://uk.wikipedia.org/wiki/${art}`
const SRC: Record<string, string> = {
  EPL: W('Східнополіський_говір'), NOR: 'http://litopys.org.ua/ukrmova/um161.htm', MDN: 'http://litopys.org.ua/ukrmova/um166.htm', SW: W('Південно-західне_наріччя_української_мови'),
  SE: W('Південно-східне_наріччя_української_мови'), ZAK: 'http://litopys.org.ua/ukrmova/um162.htm', WPL: W('Західнополіський_говір'), MPL: W('Середньополіський_говір'), POD: W('Подільський_говір'), NDN: W('Наддністрянський_говір'),
}
/**
 * SPEC 60 DD-1/DD-2 (research/23 Round 2). Blanket gate = 1798 for rules without a dated Q source; a rule with `earliest` fires from that year,
 * but never before its dialect GROUP existed (Shevelov's chronology, DIALECT_GROUP_FROM): the gate is max(rule.earliest ?? 1798, group.from).
 */
export const DIALECT_BLANKET_GATE = 1798
const SHEV08 = 'http://izbornyk.org.ua/shevelov/shev08.htm, «Загальний огляд хронології постання українських діалектів»'
const GROUP = (from: number, quote: string) => ({ from, cite: Q('SHEV', SHEV08, quote) })
/** Dialect group → year from which the group can be named (research/23 Round 2, Shevelov ch. 8). Codes absent here (NORTH, SW) are umbrella regions with no group gate. */
export const DIALECT_GROUP_FROM: Record<string, { from: number; cite: Evidence }> = {
  NDN: GROUP(1201, 'Існування наддністрянських, надсянських, лемківських і бойківських говірок простежується від XIII ст.'),
  LEM: GROUP(1201, 'Існування наддністрянських, надсянських, лемківських і бойківських говірок простежується від XIII ст.'),
  BOY: GROUP(1201, 'Існування наддністрянських, надсянських, лемківських і бойківських говірок простежується від XIII ст.'),
  WPL: GROUP(1301, 'Імовірним часом постання … є XIV ст.'),
  ZAK: GROUP(1500, 'закарпатських — до початку XVI ст.'),
  POD: GROUP(1501, 'подільських — щойно в XVI ст.'),
  CHN: GROUP(1501, 'діалектна диференціація ледве чи могла статися раніше, ніж у XVI ст.'),
  MPL: GROUP(1501, 'щойно починаючи з XVI ст.'),
  SE: GROUP(1501, 'формування … припадає головно на XVI -XVII ст.'),
  MDN: GROUP(1501, 'формування … припадає головно на XVI -XVII ст.'),
  SLB: GROUP(1501, 'формування … припадає головно на XVI -XVII ст.'),
  STP: GROUP(1501, 'формування … припадає головно на XVI -XVII ст.'),
  HUT: GROUP(1301, 'Імовірним часом постання … є XIV ст.'),
  PKB: GROUP(1301, 'Імовірним часом постання … є XIV ст.'),
  SYAN: GROUP(1201, 'Існування наддністрянських, надсянських, лемківських і бойківських говірок простежується від XIII ст.'),
  VOL: GROUP(1401, 'волинських говірок починають оприявнюватися з XV ст.'),
}
/** The year from which a rule may fire: its own dated `earliest`, else the blanket 1798, never before the rule's group formed. */
export const ruleGate = (r: Pick<Rule, 'earliest' | 'label'>) => Math.max(r.earliest ?? DIALECT_BLANKET_GATE, DIALECT_GROUP_FROM[r.label]?.from ?? 0)
const dialectGate = (c: Ctx, gate: number) => (c.year === undefined || c.year >= gate) && !normative(c)
interface Dated { earliest: number; cite: Evidence }
const dia = (id: string, codes: string[], re: RegExp, weight: number, src: string, quote: string, dated?: Dated): Rule[] =>
  codes.map(code => {
    const r: Rule = { id: `${id}:${code}`, axis: 'dialect' as const, label: code, weight, cite: Q(['NOR', 'MDN', 'ZAK'].includes(src) ? 'ENC' : 'WUK', SRC[src]!, quote),
      test: (c: Ctx) => (dialectGate(c, ruleGate(r)) && re.test(c.form) ? form(c) : null) }
    if (dated) { r.earliest = dated.earliest; r.earliestCite = dated.cite }
    return r
  })

// ── SPEC 63 DL (research/31): features mined from the ЕУМ dialect entries (litopys.org.ua/ukrmova/um<N>.htm) and from dialect dictionaries ──
// Every row cites the ЕУМ entry of ITS OWN dialect (verbatim quote, article number = locator). Regexes run on the lower-cased accent-free form
// (`ў`, `ґ`, `ы`, `ê`, `ô` and soft-sign/apostrophe variants are kept as features); rules fire only on non-normative forms (dialectGate).
const UM = (n: number) => `http://litopys.org.ua/ukrmova/um${n}.htm`
interface DSpec { code: string; um: number; quote: string; dated?: Dated }
const diaE = (id: string, re: RegExp, weight: number, specs: DSpec[], note?: string): Rule[] =>
  specs.map(s => {
    const r: Rule = { id: `${id}:${s.code}`, axis: 'dialect' as const, label: s.code, weight, cite: Q('ENC', UM(s.um), s.quote), note,
      test: (c: Ctx) => (dialectGate(c, ruleGate(r)) && re.test(c.form) ? form(c) : null) }
    if (s.dated) { r.earliest = s.dated.earliest; r.earliestCite = s.dated.cite }
    return r
  })
const SHEV08P = 'http://izbornyk.org.ua/shevelov/shev08.htm'
const SHEV_A_SOFT: Dated = { earliest: 1401, cite: Q('SHEV', `${SHEV08P}, Гуцульщина / пд.-зх. говірки`, 'зміщення вперед і вгору артикуляції а після м’яких приголосних (š’épka ’шапка’), зафіксоване з XV ст. (але не на Гуцульщині), спершу було розвинулося в гуцульських говірках і ще встигло поширитися на інші говірки в XV ст.', 'XV ст. → 1401; віднесення до конкретних груп — [P]') }
const SHEV_UKANYE_HUT: Dated = { earliest: 1301, cite: Q('SHEV', `${SHEV08P}, Гуцульщина`, 'поява укання (ще одна зміна, датована XIV ст.)', 'XIV ст. → 1301') }
const SHEV_UKANYE_VOL: Dated = { earliest: 1501, cite: Q('SHEV', `${SHEV08P}, Волинь`, 'Укання мусило прийти з півдня в XVI ст.', 'XVI ст. → 1501') }
const SHEV_DEVOICE: Dated = { earliest: 1401, cite: Q('SHEV', `${SHEV08P}, Західне Полісся`, 'знеголошення дзвінких приголосних наприкінці слова та перед глухим приголосним, наявність протетичного v перед о- та u- незалежно від наголосу (обидві ці риси — ще з XV ст.', 'XV ст. → 1401') }

/** Rows whose cite is a dialect dictionary's own preface (Аркушин 2000, Передмова): one dialect, one locator. */
const ARK_LOC = 'https://archive.org/details/slzhdplhv (Аркушин, Словник західнополіських говірок, 2000), Передмова, «Реєстр словника»'
const diaB = (id: string, code: string, re: RegExp, weight: number, src: string, loc: string, quote: string, note?: string): Rule => {
  const r: Rule = { id: `${id}:${code}`, axis: 'dialect' as const, label: code, weight, cite: Q(src, loc, quote), note,
    test: (c: Ctx) => (dialectGate(c, ruleGate(r)) && re.test(c.form) ? form(c) : null) }
  return r
}

export const DIALECT_BOOK_RULES: Rule[] = [
  // ─ SPEC 63 AT-3: «Атлас української мови» т. 2 (core/atlas-rules.ts, data/atlas/aum2-maps.json); umbrella SW, weak: the settlement list is not readable from the OCR ─
  ...AUM_ROWS.map(r => diaB(r.id, 'SW', r.re, 0.2, 'AUM', `${AUM_VOL2}, карта ${r.map} (коментар)`,
    `${r.q} — ${r.attested.map(([f, p]) => `${f} (пункт ${p})`).join('; ')}`,
    `${r.example} ← ${r.standard}; ареал на рівні групи не визначено (AT-2): лише SW`)),
  // ─ Carpathian group (BOY, HUT, LEM, ZAK, SYAN) and the whole south-west ─
  ...diaE('SW-LABIAL-J', /[а-яіїєґ][бпвмф]й(у|е|еш|ем|емо|ете|ут|ат|еть)$/, 0.5, [
    { code: 'BOY', um: 177, quote: 'після губних відсутній епентетичний звук [л] (л’ýбйу, ўхôпйу)' },
    { code: 'HUT', um: 176, quote: 'відсутність епентетичного л’ у формах дієслів 1-ї ос. одн. і 3-ї ос. мн. теп. і майб. ч. (бáвйу, лóмйу, л’ýбйе)' },
    { code: 'LEM', um: 172, quote: 'при дієвідмінюванні у сx. лемк. говірках зберігається давня сполука губний приголосний +j (купйу, робйат)' },
    { code: 'SYAN', um: 174, quote: 'у дієсл. формах зберігається сполука губний + j (рóбйу, тéрпйу)' }], 'любйу, ломйу, купйу, робйу ← люблю, ломлю, куплю, роблю'),
  ...diaE('SW-NOM-PL-OVE', /[а-яіїєґ]{2,}[бвгґдзклмнпрстфхцчш]ове$/, 0.4, [
    { code: 'BOY', um: 177, quote: 'у наз. в. мн. серед іменників ч. р. типовими є форми на -ове (братове, сыонóве, столóве, але воўк — вóўци)' },
    { code: 'ZAK', um: 162, quote: 'У наз. в. мн. частково збереглась флексія -ове [сынове]' },
    { code: 'SYAN', um: 174, quote: 'у наз. в. мн. в деяких говірках збереглися арх. форми на -ове (ґаздóве, дідóве)' }], 'братове, синове ← брати, сини'),
  ...diaE('SW-1PL-ME', /^[а-яіїєґ]{2,}(ем|им)е$/, 0.3, [
    { code: 'BOY', um: 177, quote: 'у 1-й ос. мн. теп. ч. переважають форми на -ме (йдемé, беремé, нóсиме)' },
    { code: 'ZAK', um: 162, quote: 'У 1-й ос. мн. теп. і простого майб. ч. закінчення -ме [беремé]' }], 'береме, носиме ← беремо, носимо'),
  ...diaE('SW-3SG-CONTRACT', /^(зна|дума|чита|гада|пита|кида|копа|літа|біга|співа)(ш|т)$/, 0.4, [
    { code: 'BOY', um: 177, quote: 'в 2-й, 3-й ос. одн. (знаш, читаш, пи́таш, бíгаш, знат, чи́тат, бíгат)' },
    { code: 'ZAK', um: 162, quote: 'Стягнені форми (-айе- > -ае- > -а-) 2-ї [дýмаш] і 3-ї [думат’, думат] особи' },
    { code: 'SYAN', um: 174, quote: 'дієслова з основою на -а- мають закінчення в одн. -м, -ш, -т (гадам, гадаш, гадат)' },
    { code: 'HUT', um: 176, quote: 'стягнені закінчення -т у 3-й ос. одн. теп. ч. дієслів І дієвідміни (вони́ знат, співáт)' }], 'знаш, знат, читат ← знаєш, знає, читає'),
  ...diaE('BOY-DZH', /^(дождж|йіджч|йідж|меджи|чуджий|чуджа|чуджі|крадж[аі])$/, 0.5, [
    { code: 'BOY', um: 177, quote: 'посилення функц. навантаження африкати [дж’] (йíдж’ме, йідж’, дождж’, мéдж’и, чудж’и́й, пр’áдж’а, крáдж’а, ходж’ý)' }], 'дождж, меджи, чуджий ← дощ, межі, чужий'),
  ...diaE('SW-VN-MN', /^(мнук|мнуч[а-яіїєґ]*|[а-яіїєґ]*рімн(ий|о|а|е|і)|дамно|дрімн(ий|о|а|е|і))$/, 0.5, [
    { code: 'BOY', um: 177, quote: 'у різних бойків, говірках звукосполука вн > мн (др’імньíй, р’íмний, поутр’íмний)' },
    { code: 'POD', um: 180, quote: 'перехід в у м у сполуці вн (р’íмний, дамнó)' },
    { code: 'SYAN', um: 174, quote: 'асимілятивними змінами сполук вн, бн в мн (мнук ‘внук’, дрімни́й ‘дрібний’)' }], 'мнук, рімний, дамно ← внук, рівний, давно'),
  ...diaE('SW-KJ-GJ', /^(ґ[’']?і(д|дко|дка|дк[а-яіїєґ]*)|ґ[’']?івк[а-яіїєґ]*|к[’']?існ[а-яіїєґ]*|к[’']?іст[оаи]|к[’']?ішк[о]|ск[’']?ін[аиуо]|наґ[’']?і[а-яіїєґ]*)$/, 0.4, [
    { code: 'HUT', um: 176, quote: 'перехід [т’] в [к’], [д’] в [ґ’] (к’éшко ‘тяжко’, ґ’іт ‘дід’)' },
    { code: 'PKB', um: 175, quote: 'послідовний перехід [т’] у [к’], а [д’] у [ґ’] (ґ’іт «дід», ґ’íўка «дівка», к’íло «тіло», ниґ’íл’е «неділя»)' },
    { code: 'NDN', um: 173, quote: 'к’, ґ’ внаслідок змін т’ в к’, д’ в ґ’ (ск’інá ‘стіна’, наґ’ійя ‘надія’)' },
    { code: 'SLB', um: 169, quote: 'в окр. словах поширена заміна [т’] на [к’] (к’íсто, к’існи́й)' },
    { code: 'STP', um: 171, quote: 'заступлення [т’] на [к’] в окр. словах (к’íсно, к’íсто)' },
    { code: 'MDN', um: 166, quote: 'в окр. словах заступлення [т’] на [к’] (к’існи́й, к’íсто)' }], 'ґід, ґівка, кісно ← дід, дівка, тісно'),
  ...diaE('PKB-DEPAL-S', /^(дес|хтос|щос|шчос|чомус|кудис|кр[’']?із)$/, 0.4, [
    { code: 'PKB', um: 175, quote: 'депалаталізація [с], [ц] у кінці слів (дес, хтос, хлóпец, отéц)' },
    { code: 'HUT', um: 176, quote: 'диспалаталізація у ряді позицій, зокрема, кінця слова [ц’], [с’], [з’] (хлóпец, на вýлицу, шчос, кр’із)' }], 'дес, хтос ← десь, хтось'),
  ...diaE('MONO-UY', /^(кун|кин|вул|вил|вуз|виз|вун|вин|мист|стул|стил)[ьʼ’']?$/, 0.4, [
    { code: 'HUT', um: 176, quote: 'поширені рефлекси [и], [ы], [у], [ÿ] (вин, вын, вун ‘він’; виз, вуз ‘віз’; мист, мÿист ‘міст’)' },
    { code: 'WPL', um: 168, quote: 'виступають здебільшого монофтонги [у], [и], [і], [іи] (кун’, вул, кин’, вил, кіин’, віил, кін’, віл та ін.)' },
    { code: 'ZAK', um: 162, quote: '[у] в сx. та зх. говорах [вус «віз»]' }], 'кун, вул, виз ← кінь, віл, віз'),
  ...diaE('MPL-CLOSED-VOWEL', /[êô]/, 0.3, [
    { code: 'MPL', um: 167, quote: 'Закриті голосні ô та ê мають фонол. статус і протиставляються відкритим голосним як самост. фонеми' },
    { code: 'BOY', um: 177, quote: '[е] > [ê] як позиц. варіант перед м’якими приголосними (тêпêр’, двêр’і, дêн’, нêс’ка)' },
    { code: 'ZAK', um: 162, quote: 'перед голосними і, ÿ, у та м’якими приголосними виступає її позиц. варіант закритий /ô/' }], 'позначки ê, ô в записах говірок'),
  // ─ South-west: a > e/i after soft consonants (dated: spread in the XV c.) and protheses ─
  ...diaE('SW-A-SOFT', /^(т[’']?ежк[а-яіїєґ]*|д[’']?екува[а-яіїєґ]*|гар[’']?ич[іие]й|вз[’']?е[вў]|ш[іи]пка|чіс)$/, 0.4, [
    { code: 'NDN', um: 173, quote: 'перехід а (з *а, *ę) після м’яких (чи колишніх м’яких) приголосних в е, і, и (гар’и́чий, д’éкувати, сáж’і)', dated: SHEV_A_SOFT },
    { code: 'PKB', um: 175, quote: '[а] після м’яких приголосних переходить в [е], [и], [і] — у ненаголошеній і наголошеній позиціях — душ’é, ш’éпка і ш’и́пка, пор’и́док', dated: SHEV_A_SOFT },
    { code: 'WPL', um: 168, quote: 'у більшій частині говору наголош. звук а після м’яких і шиплячих приголосних переходить в е (вз’еў, д’éкувати, т’éжко, душ’е)', dated: SHEV_A_SOFT },
    { code: 'SYAN', um: 174, quote: 'в центр. говірках у наголошеній позиції переходить в [’е] (ч’ес, т’éжко)', dated: SHEV_A_SOFT }], 'тежко, декувати, взеў ← важко/тяжко, дякувати, взяв'),
  ...diaE('WPL-YA-E', /^й[’']?е(ма|года|блуко|блуч[а-яіїєґ]*|говор[а-яіїєґ]*|ловч[а-яіїєґ]*)$/, 0.6, [
    { code: 'WPL', um: 168, quote: 'у пн. частині говору в е переходить наголошений а після й (йéма, йéгода, йéблуко)' },
    { code: 'MPL', um: 167, quote: 'перехід а в е після й: йáловка — йеловчýк ‘підросле теля’' }], 'йеблуко, йегода ← яблуко, ягода'),
  ...diaE('SW-PROTH', /^(гоко|гоувес|гоувис|вогірок|ворих|воріх|восінь|гос[іи]нь|горати|ворати|востр[а-яіїєґ]*|вус[іи]льниц[а-яіїєґ]*)$/, 0.4, [
    { code: 'WPL', um: 168, quote: 'поширеність приставних приголосних [в], [г] (гоувéс, гóко, вýлиц’а, вýсил’ниц’а та ін.)', dated: SHEV_DEVOICE },
    { code: 'NDN', um: 173, quote: 'наявність протетичного приголосного в (ў) перед о, у та і (<*о) (ворíх, вогірóк, в’іс)' },
    { code: 'POD', um: 180, quote: 'наявність протетичних приголосних в та г перед голосними (гóс’ін’, вóс’ін’, горáти, ворáти, вор’íх, вóстрий, гóстрий)' }], 'ворих, горати, восінь ← горіх(орех), орати, осінь'),
  ...diaE('SW-DEVOICE', /^(мет|міх|сат|біп|сніх|піх|гріп)$/, 0.3, [
    { code: 'WPL', um: 168, quote: 'дзвінкі приголосні в серед. слів перед глухими і в кін. слова втрачають повністю або частково свою дзвінкість (сóлотко, сóлодко, д’íжка, моурóс, сат та ін.)', dated: SHEV_DEVOICE },
    { code: 'LEM', um: 172, quote: 'У кін. слова в багатьох говірках дзвінкі приголосні оглушуються, переходять у глухі відповідники (мет ‘мед’)' },
    { code: 'STP', um: 171, quote: 'перед глухими і в кін. слова дзвінкі приголосні оглушуються (т’áшко, міх ‘міг’)' },
    { code: 'PKB', um: 175, quote: 'переважне оглушення приголосних (біп, сат, л’íсти, тхáк’і)' }], 'мет, міх, сат ← мед, міг, сад'),
  ...diaE('SW-UKANYE', /^(муг[іи]л[аиуоі]*|кужух[а-яіїєґ]*|куожух[а-яіїєґ]*|учкур|пужар[а-яіїєґ]*|хумут|хоумут|зузул[а-яіїєґ]*|зоузул[а-яіїєґ]*|гуолубка|тоубі|суобі|пуотік|дуорозі|знуоў|коулихати|хоудім)$/, 0.3, [
    { code: 'MDN', um: 166, quote: 'укання — зміна [о] > [оу], [у] переважно перед складом з наголошеними í, ý, рідше и́ (оуб’íд, муги́ла, учкýр)' },
    { code: 'SLB', um: 169, quote: 'зміна [о] > [оу], [у] — укання помірне — переважно перед складом з наголошеним í, и́, ý, зрідка — ó, á (cуобí, боули́т’, пужáр, хоумýт)' },
    { code: 'STP', um: 171, quote: 'помірне укання — переважно перед складом з наголошеними í, ý у більшості говірок (тоубí, зоузýл’а)' },
    { code: 'HUT', um: 176, quote: 'укання відзначається перед складом з голосним високого підняття у, і (хоудíм, гуд’íўл’а, кужýх)', dated: SHEV_UKANYE_HUT },
    { code: 'LEM', um: 172, quote: 'укання — перехід [о] в [уо], [у] під наголосом і в ненаголош. позиції перед складом з голосним високого підняття [і], [у], а також перед [ў], перед складом з [а] (на дуоруозі, пуотік, знуоў, пуолуола)' },
    { code: 'WPL', um: 168, quote: 'ненаголошене [о] зближується з [у] (гуолýбка, куожýх та ін.)' },
    { code: 'VOL', um: 178, quote: 'для південноволин. говірок характерне здебільшого помірне, а не сильне «укання» (головá, молокó та ін., але гуолýпка, куожýх, йумý, дорóгуйу та ін.)', dated: SHEV_UKANYE_VOL }], 'мугила, кужух, учкур ← могила, кожух, очкур'),
  ...diaE('CHN-AKANYE', /^(гал[аую]ва|гал[аую]в[іи]|пабіегла|пабігла|малак[оа])$/, 0.5, [
    { code: 'CHN', um: 155, quote: 'для значної частини С. (л.) г. характерне акання (галавá, пабіегла, вадá)' },
    { code: 'SLB', um: 169, quote: 'Зрідка у пн. говірках С. г. визначається нейтралізація [а] : [о] — акання (малакó)' }], 'галава, малако ← голова, молоко'),
  // ─ Polissia (SPEC 63 PL, research/31 §2.3): diphthongs, [е]/[и] and [гі]/[кі] in the west, relics in the east; ЕУМ um161/um167/um168/um155, every cite verbatim ─
  ...diaE('WPL-DIPH-O', /^(вуол|вуел|вуіл|муой|муей|куін)[’']?$/, 0.7, [
    { code: 'WPL', um: 168, quote: 'у пн. говірках цієї групи, а також у надбузько-поліських зустрічаються ще й дифтонги [уо], [уе], [уі], (вуол, муой, вуел, муей, вуіл, куін’ та ін.)' }], 'вуол, муой, вуіл ← віл, мій, віл'),
  ...diaE('WPL-DIPH-E', /^хміел[’']?$/, 0.7, [
    { code: 'WPL', um: 168, quote: 'у надбузько-поліських говірках зустрічається ще дифтонг [іе] (хміел’ та ін.)' }], 'хміел ← хміль'),
  ...diaE('WPL-DIPH-YAT', /^(ліес|т[’']?иесто|с[’']?иено)$/, 0.7, [
    { code: 'WPL', um: 168, quote: 'під наголосом зустрічається ще й дифтонг [іе] чи [ие] (с’и́ено, л’іес, т’и́есто та ін.)' }], 'ліес, тиесто, сиено ← ліс, тісто, сіно'),
  ...diaE('WPL-KI-GI', /^(рокі|мурахі)$/, 0.5, [
    { code: 'WPL', um: 168, quote: 'поширені звукосполуки [гі], [кі], [xi], поряд з [ги], [ки], [хи], зокрема в пн. частині цих говірок (рокí, мурахí, нóчі та ін.)' }], 'рокі, мурахі ← роки, мурахи'),
  ...diaE('WPL-E-I-NEUTRAL', /^(сеило|теипер|теипир)$/, 0.6, [
    { code: 'WPL', um: 168, quote: 'у ненаголош. позиції [е], [и] зближуються (сеилó, теипéр, пос’íйиш та ін.)' }], 'сеило, теипер ← сило, тепер'),
  ...diaE('CHN-DIPH', /^(вуол|піеч|діед)[’']?$/, 0.7, [
    { code: 'CHN', um: 155, quote: 'С. (л.) г. зберігає дифтонги на місці етимологічних [о], [е] та [ě] (вуол, піеч, діед)' }], 'вуол, піеч, діед ← віл, піч, дід'),
  ...diaE('CHN-SOFT-LABIAL', /^нуч[’']?$/, 0.6, [
    { code: 'CHN', um: 155, quote: 'релікти давньої м’якості губних приголосних та [ч’] в частині С. (л.) г. (нуч’, п’іеч’)' }], 'нуч’ ← ніч'),
  ...diaE('CHN-PRON-NOH', /^(йійі|йем)$/, 0.6, [
    { code: 'CHN', um: 155, quote: 'займенник 3-ї ос. одн. в непрямих відмінках виступає без початкового [н] (до йійі, з йем)' }], 'до йійі, з йем ← до неї, з нею'),
  ...diaE('NORTH-A-E', /^(пети|ходеч[’']?і|йемк[’']?і)$/, 0.5, [
    { code: 'NORTH', um: 161, quote: 'чергуванні а/е : пйат’ — пети́, ход’áч’і — хóдеч’і, йáма — йемк’í' }], 'пети, ходечі ← п’яті, ходячі (північне наріччя: а/е)'),
  ...diaE('F-VARIANTS', /^(хунт|фалити|фіст|квартух|хвабрика|хорма|хвартух)$/, 0.4, [
    { code: 'STP', um: 171, quote: 'в окр. говірках вживання [ф] зам. [хв] (фали́ти, фіст) і [x] зам. [ф] (хунт)' },
    { code: 'MDN', um: 166, quote: '[ф] > [x], [кв], [хв], [п], [в], [м] (квартýх, хвáбрика, хóрма)' }], 'квартух, хорма ← фартух, форма'),
  ...diaE('EPENTH-2', /(здоровл[’']?[ая]|сімн[’']?[ая]|вимн[’']?[ая]|полумн[’']?[ая]|мн[’']?(асо|ята)|кормл[’']?[ая])$/, 0.4, [
    { code: 'NDN', um: 173, quote: 'поява на місці j епентетичного л’, рідше — н’ (здоровл’е, памн’іт’)' },
    { code: 'ZAK', um: 162, quote: 'Вторинний [л’] після історично м’якого [в] > [у] [здорóўл’а]' },
    { code: 'SLB', um: 169, quote: 'поява на місці j епентетичного [н’] (ви́мн’а)' },
    { code: 'STP', um: 171, quote: 'неоднаковий розвиток сполуки губний приголосний +j (здорóвл’а, здорóвйа)' }], 'здоровля, вимня ← здоров’я, вим’я'),
  ...diaE('SFX-ISKO', /[а-яіїєґ]{3,}иско$/, 0.3, [
    { code: 'WPL', um: 168, quote: 'поширеність, як і в пд.-зх. діалектах, іменникових утворень із суфіксом -иско відповідно до утворень із суфіксом -ишче в ін. поліських та пд.-сх. діалектах' },
    { code: 'NDN', um: 173, quote: 'функціональним посиленням окр. афіксів -иск(о) (л’óниско, віўси́ско ‘поле після льону, вівса’)' }], 'льониско, вівсиско ← льонище, вівсище'),
  ...diaE('SFX-ISHCHE', /[а-яіїєґ]{2,}ишче$/, 0.3, [
    { code: 'MPL', um: 168, quote: 'іменникових утворень із суфіксом -иско відповідно до утворень із суфіксом -ишче в ін. поліських та пд.-сх. діалектах' },
    { code: 'CHN', um: 168, quote: 'іменникових утворень із суфіксом -иско відповідно до утворень із суфіксом -ишче в ін. поліських та пд.-сх. діалектах' },
    { code: 'SE', um: 168, quote: 'іменникових утворень із суфіксом -иско відповідно до утворень із суфіксом -ишче в ін. поліських та пд.-сх. діалектах' }], 'городишче ← городище'),
  ...diaE('SFX-ISHCH-CMP', /(ішч|ишч)(ий|а|е|і|ого|ому)$/, 0.5, [
    { code: 'POD', um: 180, quote: 'творення форм вищого ступеня прикметників за допомогою суф. -ішч (добр’íшчий, син’íшчий, чеивон’íшчий)' },
    { code: 'PKB', um: 175, quote: 'утворення вищого ступеня прикметників і прислівників з суф. -ішч, -іш’-, -ч- (даўн’ішчий, менче, менчий)' }], 'добрішчий ← кращий/добріший'),
  ...diaE('SW-NO-LENGTH', /^(насін|корін|жит|знан|зіл|весіл|умін)[’']?[яаеє]$/, 0.3, [
    { code: 'POD', um: 180, quote: 'стягнення подвоєних приголосних (нас’íн’а, кор’íн’а, жит’á)' },
    { code: 'NDN', um: 173, quote: 'втрата довготи м’якими приголосними у формах іменників с. р. (жик’é, насíн’е)' },
    { code: 'SYAN', um: 174, quote: 'відсутністю подовження в іменниках с. р. типу жит’é, знан’é' },
    { code: 'VOL', um: 178, quote: 'закінчення -а з неподовженим м’яким приголосним перед ним (з’íл’а, нас’íн’а, жит’á та ін.)' }], 'насіня, житя ← насіння, життя'),
  ...diaE('SW-IM-CLITIC-PAST', /[а-яіїєґ]{2,}(ли[сзх][’']?(мо|ме|те)|[аеиіоуя]в(ім|іс|ем|ес))$/, 0.5, [
    { code: 'ZAK', um: 162, quote: 'Особові частки в 1-й і 2-й ос. одн. і мн. в мин. ч. (модифіковані форми давнього перфекта) [ходи́в-им, ходи́в-ем, ходи́ла-м; ходи́в-ис’, ходи́в-ес’, ходи́ла-с’; ходи́ли-сме, ходи́ли-с’ме, ходи́ли-сте, ходи́ли-с’те]' },
    { code: 'PKB', um: 175, quote: 'наявність «складних» форм мин. ч. — ходи́ўйім (-йем), ходи́ўйіс (-йес), ходи́лисмо' },
    { code: 'NDN', um: 173, quote: 'ос. одн. і мн. мин. ч. ходи́ў і ходи́ўйім, ходи́вем, роби́ли і роби́ли-смо' },
    { code: 'WPL', um: 168, quote: 'у ряді говірок, зокрема в надбузько-поліських, поширені складені форми майб. ч. типу ходи́лис’мо, ходи́лис’те, а також ходи́лихмо, бýл’іхмо' },
    { code: 'VOL', um: 178, quote: 'паралельно із звичайними «простими» формами мин. ч. вживаються й «складні» (ходи́вім, ходи́віс, ходи́лис’мо, ходи́лис’те та ін.)' },
    { code: 'POD', um: 180, quote: 'поширення (у західноподіл. говірках) дієслівної складеної форми мин. ч. типу роби́лис-мо, роби́лис-те)' },
    { code: 'SYAN', um: 174, quote: 'сліди арх. складених форм мин. ч. (пус’íйалам ‘посіяла’, ходи́лизмо ‘ходили’, би́листе ‘були’)' }], 'ходивім, ходилисьмо ← я ходив, ми ходили'),
  ...diaE('SW-COND-BIM', /^(бим|бым|бис|быс|бисмо|бисме|бисте|быс[ьʼ’']?ме|бысте)$/, 0.5, [
    { code: 'NDN', um: 173, quote: 'форми умов. сп. за моделлю даў бим, даў бис' },
    { code: 'ZAK', um: 162, quote: 'Творення форм умов. сп. за допомогою особ. часток [писáў бим, бым; писáў бис’, быс’; писали бисме, быс’ме тощо]' }], 'бим, бис ← б (я дав би)'),
  ...diaE('HUT-COND', /^(биех|биесь?|биесме|биесмо)$/, 0.6, [
    { code: 'HUT', um: 176, quote: 'форма умов. сп. може творитися поєднанням часток биех, би і форми мин. ч. (носи́ў биех, проси́елие биесмé)' }], 'биех, биесме'),
  ...diaE('PKB-VI-PREFIX', /^ві(пити|тратити|повісти|ган[а-яіїєґ]*)$/, 0.4, [
    { code: 'HUT', um: 176, quote: 'у префіксі ви- майже послідовно ві- (вíтратити, віповíсти)' },
    { code: 'PKB', um: 175, quote: 'активне функціонування преф. ві- (вíпити, віган’éли)' }], 'віпити, вітратити ← випити, витратити'),
  // ─ Lemko ─
  ...diaE('LEM-IJ', /^(колий|гусий|ідий|ходий)$/, 0.5, [
    { code: 'LEM', um: 172, quote: 'вимова на місці давніх [ы] та [і] як [ий] (колий ‘коли’, гусий ‘гуси’, ідий ‘іди’)' }], 'колий, ідий ← коли, іди'),
  ...diaE('LEM-W-L', /(пў[ую]|^вав[аиуіо]$|^ц[’']?івий$)/, 0.6, [
    { code: 'LEM', um: 172, quote: 'Звук [л] у позиції перед лабіалізованим голосним заступається звуком [ў] (пўух ‘плуг’, а перед нелабіалізованими голосними — звуком [в] (вава ‘лава’, ц’івий ‘цілий’)' }], 'пўух, вава ← плуг, лава'),
  ...diaE('LEM-CLITIC-V', /^(гдов[аиіу]|фчора|фчера|гмер|гмерти|хпав|хпаў|фпав|гдома)$/, 0.6, [
    { code: 'LEM', um: 172, quote: 'звуки [в], [ў] у позиції прийменника і префікса часто заступаються ін. звуками — [г] перед дзвінкими приголосними (гдова ‘вдова’), і [x], [ф] перед глухими (x коморі ‘в коморі’, фчора ‘вчора’)' },
    { code: 'SYAN', um: 174, quote: 'переходом [ў], [в] у функції префікса чи прийменника перед наст. дзвінкими в [г], перед глухими — в [x] (гмер ‘вмер’, вдома ‘вдома’, хпаў ‘впав’' }], 'гдова, фчора, гмер ← вдова, вчора, вмер'),
  ...diaE('LEM-DA', /^да(хто|кого|кому|ким|що|чий|який|яка|яке|де|куди|коли)$/, 0.6, [
    { code: 'LEM', um: 172, quote: 'наявна словотв. частка да замість де (дахто, дакому)' }], 'дахто, дакому ← дехто, декому'),
  ...diaE('LEM-PREPS', /^(ік|іґ|ґу|през)$/, 0.3, [
    { code: 'LEM', um: 172, quote: 'поширені прийменники к та його варіанти ік, ґ, іґ, ку, ґу (к лісу, ґу нам), пред, през ‘через’, ‘без’ (през готар ‘через межу’)' }], 'ік, іґ, ґу, през'),
  // ─ Polissia: adjectives with uncontracted endings, SW-type -ойе/-ейі ─
  ...diaE('ADJ-UNCONTR-NEUT', /[а-яіїєґ]{3,}(ойе|уйе|ейе)$/, 0.4, [
    { code: 'ZAK', um: 162, quote: 'Зберігають нестягнену форму -ойе [дóбройе], а в басейні р. Ужа -ой (редукція е) [дóброй]' },
    { code: 'VOL', um: 178, quote: 'у західноволин. говірках поширені нестягнені форми прикметників с. р. (дрібнóйе, зелáнуйе та ін.)' }], 'дрібнойе, зеленуйе ← дрібне, зелене'),
  ...diaE('VOL-FEM-EJI', /^(сей[іу]|тей[іу]|мей[іу]|твей[іу]|свей[іу])$|[а-яіїєґ]{3,}ей[іу]$/, 0.3, [
    { code: 'VOL', um: 178, quote: 'у род. і ор. в. одн. прикметників ж. р. у тих же говірках звичайні закінчення -ейі, -ейу (моулоудéйі, моулоудéйу, старéйі, старéйу та ін.)' }], 'старейі, тейі ← старої, тієї'),
  // ─ West Polissia (Arkushin 2000, preface: the author's own list of phonetic/morphological variants) ─
  diaB('WPL-INF-ODD', 'WPL', /^(бігті|бігчи|бихчи|біхчи|бишті)$/, 0.6, 'ARKUSHYN', ARK_LOC, 'різні форми інфінітива (БІГТІ, БІГЧИ, БІХЧИ, БИШТІ)', 'бігті, бихчи ← бігти'),
  diaB('WPL-PHON-VAR', 'WPL', /^(кень|кушка|квешка|снив|сний|бликши|лучч)$/, 0.5, 'ARKUSHYN', ARK_LOC, 'зрідка фонетичні варіанти широковживаних слів (КЕНЬ і КУНЬ "кінь", КВЕШКА і КУШКА "кішка", СНИВ і СНИЙ \'сніг\')', 'кень, кушка, снив ← кінь, кішка, сніг'),
]

/** Lexical dialectisms (core/dialect-lex.ts): one rule per word × dialect, each with the dictionary/ЕУМ quote as its cite (P-1.3); fires on the exact non-normative form. */
export const DIALECT_LEX_RULES: Rule[] = DIALECT_LEX.flatMap(e => e.codes.map(code => {
  const forms = new Set(e.w)
  const r: Rule = { id: `LEX-${e.src}:${e.w[0]}:${code}`, axis: 'dialect' as const, label: code, weight: 0.5, cite: Q(e.src, e.loc, e.q), note: `${e.w[0]} ‘${e.gloss}’`,
    test: (c: Ctx) => (dialectGate(c, ruleGate(r)) && (forms.has(c.form) || (!!c.norm && forms.has(c.norm))) ? form(c) : null) }
  return r
}))

export const DIALECT_RULES: Rule[] = [
  ...dia('N-DIPH-UO', ['CHN', 'MPL', 'WPL'], /(уо|уô|уê|уі)/, 0.8, 'EPL', 'Дифтонги на місці старих «о», «е», «ě» (вуол, піеч, діед)'),
  ...dia('N-DIPH-IE', ['CHN', 'MPL'], /(іе|иê|іê)/, 0.8, 'NOR', '[ê], іе/[є] в середньополіському говорі та чернігівському діалекті: л’êс — л\'есóк'),
  ...dia('CHN-INF-T', ['CHN'], /[аеиіяу]т[ь’']$/, 0.3, 'EPL', 'Інфінітивний суфікс -т\' при дієсл. основі на голосний (гаманіет\', бит\')'),
  ...dia('SW-INF-CHY', ['SW'], /(гчи|кчи|хчи|стричи|печи|могчи)$/, 0.5, 'SW', 'наявність форм інфінітива на -чи від дієслів з основами на задньоязиковий приголосний г, к, x (бігчи, стричи)'),
  ...dia('3SG-HARD-T', ['POD', 'NDN'], /[^т]ит$/, 0.4, 'POD', 'Твердість приголосного т у дієсловах 3-ї особи однини і множини теперішнього часу … рóбит, нóсит'),
  ...dia('SE-TRUNC-3SG', ['SE', 'MDN'], /^(зна|дума|пита|слуха|гука)$/, 0.7, 'SE', 'широко представлені усічені форми у дієсловах І дієвідміни: зна, гукá, дýма, питá'),
  ...dia('SE-1SG-NOALT', ['SE', 'POD'], /[дтзс]ю$/, 0.5, 'SE', 'дієслова 1-ї особи однини — форми типу вóз\'у, кóс\'у, сид’ý, крут’ý'),
  ...dia('SW-DAT-OVY', ['WPL', 'NDN'], /\S{2,}(ови|еви)$/, 0.5, 'WPL', 'Поширеність закінчення -ови, -еви в давальному відмінку однини іменників чоловічого роду (си́нови, брáтови …)'),
  ...dia('NORTH-ADJ-UNCONTR', ['CHN', 'NORTH'], /(айа|ейе|ийе)$/, 0.6, 'EPL', 'членних нестягнених форм ж. та с. р. (дóўгайа, жóўтейе …)'),
  ...dia('NDN-ADJ-KIJ', ['NDN'], /(кій|хій|кєй|хєй)$/, 0.6, 'NDN', 'на місці давніх сполук ки, хи в ненаголошеній позиції розвинулися сполуки кі, хі (глибóкій «глибокий»)',
    // DD-1: the southern (Galician-Podillian) ky,gy,xy > k'i,g'i,x'i is dated by Shevelov; [P] mapping of that change onto the NDN adjective ending
    { earliest: 1290, cite: Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev08.htm, «Формування діалектних груп (північної та південної)»', 'натомість на півдні аналогічний процес відбувся приблизно двома з половиною сторіччями пізніше, тобто наприкінці XIII ст.', 'наприкінці XIII ст. → 1290; віднесення до наддністрянського -кій/-хій — [P]') }),
  ...dia('CHN-INSTR-SHORT', ['CHN'], /\S{2,}ой$/, 0.4, 'EPL', 'Паралелізм іменних форм в ор. в. (рукóйу — рукóй, шóстайу — шóстай, мнóйу — мнóй)'),
  ...dia('SW-INSTR-OW', ['SW'], /(оў|еў)$/, 0.7, 'SW', 'наявність флексії -оў, -еў на місці давніх -оју, -еју … (рукóју > рукóў, рукóм …)'),
  ...dia('CARP-Y', ['BOY', 'LEM'], /ы/, 0.5, 'SW', 'у карпатських говорах наявний голосний заднього ряду [ы] (сыны, былы)'),
  ...dia('HARD-C-FINAL', ['NDN', 'POD'], /[еи]ц$/, 0.5, 'NDN', 'втрата м\'якості ць у кінці слова (хлóпиц, жнец)'),
  ...dia('R-SOFT-FINAL', ['MDN', 'SE'], /р[ь’']$/, 0.3, 'MDN', 'посилення функц. навантаження [р’] (р’áма, гр\'ад, гончáр’)'),
  ...dia('EPENTH-L-N', ['POD', 'MDN'], /(мн[’']?я|мн[’']а|вл[’']?я)/, 0.4, 'POD', 'Наявність вставних л’, н’ після губних приголосних — рипл’áх, здорóўл\'а … мн’áсо, мн’áта'),
  ...dia('F-TO-X', ['CHN', 'MDN'], /^(хв|худбол|хабрик)/, 0.2, 'EPL', 'Ослаблення «ф» → «х/хв» (худбóл, хва́ра)'),
  ...dia('CHN-PREP', ['CHN'], /^(помеж|л'а|л'е|заза|наў|ік|дак)$/, 0.7, 'EPL', 'к(ік)+дав. в. "до" (к бра́ту, ік сталý); л\'а (л\'е)+ род. в. "біля" (л\'а ха́ти, л\'е ріечки)'),
  ...dia('MPL-YON', ['MPL'], /^(йон|юн)$/, 0.7, 'MPL', 'приставний звук й у займеннику йон, юн (він)'),
  ...dia('ZAK-Y-VELAR', ['ZAK'], /[кгґх]ы/, 0.6, 'ZAK', '[ы] зберігається й після задньоязикових приголосних (гынути, ломаґы «ломаки» …)'),
  ...DIALECT_BOOK_RULES, ...DIALECT_LEX_RULES,
]

/** Dialect code → display names (research/04 §1 codes). */
export const DIALECTS: Record<string, string> = {
  CHN: 'східнополіський (чернігівський)', MPL: 'середньополіський', WPL: 'західнополіський', NORTH: 'північне наріччя',
  MDN: 'середньонаддніпрянський (київсько-полтавський)', SE: 'південно-східне наріччя', SW: 'південно-західне наріччя',
  POD: 'подільський', NDN: 'наддністрянський (галицький)', BOY: 'бойківський', LEM: 'лемківський', ZAK: 'закарпатський',
  HUT: 'гуцульський', SYAN: 'надсянський', PKB: 'покутсько-буковинський', VOL: 'волинський', SLB: 'слобожанський', STP: 'степовий',
}

// ── Rusyn standards (research/10) — a parallel, non-competing reading next to dialect:ZAK/LEM ────
/**
 * > "Мітка rusyn:* означає лише «форма відповідає нормі/практиці русинського стандарту X» і не є висновком про статус."
 * >  — research/10 §0. Quotes marked [rend] came through a renderer (Cloudflare blocks raw fetch) and await re-verification.
 */
const UPRS = (q: string) => P('UPRS', 'https://rusynsociety.com/rue/sre-standard/', q, '[rend] — не перевірено в браузері (перефразування); стандарт адвокаційної організації, не офіційна кодифікація')
const UM162 = (q: string) => Q('ENC', 'http://litopys.org.ua/ukrmova/um162.htm', q)
const UM87 = (q: string) => Q('ENC', 'http://litopys.org.ua/ukrmova/um87.htm', q)
const RUEW = (q: string) => Q('RUEWIKI', 'https://rue.wikipedia.org/wiki/Русиньскый_язык', q)
const LON = (q: string) => Q('LONKIN', 'Ломоносов-2025, тези', q)
/** research/10 §5: only non-normative forms, no 1919 gate; year ≥ 1850 because the standards (Dukhnovych-era, Kostelnik 1904/1923) are not older. */
const rusynGate = (c: Ctx) => (c.year === undefined || c.year >= 1850) && !normative(c)
const rx2 = (re: RegExp) => (c: Ctx) => (rusynGate(c) && re.test(c.form) ? form(c) : null)
const RUE = (id: string, label: string, weight: number, test: (c: Ctx) => Evidence | null, cite: Evidence): Rule => ({ id, axis: 'rusyn', label, weight, cite, test })

/** Strong Rusyn ы contexts that a russianism reading cannot explain (research/10 §3: «Four contexts separate Rusyn ы from Russian»). */
export const rusynStrong = (f: string) => /[кгґх]ы|ьы|ы\S*ти(ся)?$|(ськ|цьк|зьк)ый$/.test(f) || (/ы/.test(f) && /[іїєґ]/.test(f)) || /[ӱÿü]/.test(f)

export const RUSYN_RULES: Rule[] = [
  RUE('RUE-Y-VELAR', 'rusyn', 0.8, rx2(/[кгґх]ы/), UPRS('Буква ‹Ы› скоро фурт ся пише місто ‹И› по буквах ‹К, Ґ, Х, Г›')),
  RUE('RUE-Y-SOFT', 'rusyn', 0.9, rx2(/ьы/), UM162('[си́н’ый — сін’і]')),
  RUE('RUE-Y-MIX', 'rusyn', 0.8, c => (rusynGate(c) && /ы/.test(c.form) && /[іїєґ]/.test(c.form) ? form(c) : null), RUEW('є выходославяньскый язык')),
  RUE('RUE-Y-INF', 'rusyn', 0.6, rx2(/ы\S*ти(ся)?$/), UPRS('Інфінітивна кунцьовка -ТИ ся фурт пише через ‹И›')),
  RUE('RUE-ADJ-SKYJ', 'rusyn:subcarpathian', 0.8, rx2(/(ськ|цьк|зьк)ый$/), UPRS('Общество про русинськый розвуй')),
  RUE('RUE-ADJ-NSKYJ', 'rusyn:presov', 0.6, rx2(/(ньск|льск)ый$/), RUEW('Руси́ньскый язы́к')),
  RUE('RUE-UE', 'rusyn:subcarpathian', 0.9, rx2(/[ӱÿü]/), LON('в бережских говорах рефлекс /ü/ … авторы передают её либо графемой Ӱ, либо Ü')),
  RUE('RUE-O-U', 'rusyn:subcarpathian', 0.6, rx2(/^(кунь|пуд|стул|вун|мюд)$/), LON('могут иметь формы кунь, пуд, мюд / кÿнь, пÿд, мюд / кüнь, пüд, мюд / кінь, під, мід')),
  RUE('RUE-PRESOV-YO', 'rusyn:presov', 0.6, c => (rusynGate(c) && /ё/.test(c.form) && /[ыьі]/.test(c.form) ? form(c) : null), RUEW('в части Середнёй і Южной Европы')),
  RUE('RUE-LEX', 'rusyn', 0.4, rx2(/^(тай|фурт|тото|сеся|сесь)$/), RUEW('ай велике паноньско-русиньске')),
  RUE('PAN-SHE', 'rusyn:pannonian', 0.6, rx2(/^ше$/), UM87('змерка ше ‘смеркається’')),
  RUE('PAN-INF-C', 'rusyn:pannonian', 0.3, c => (rusynGate(c) && /[аиіе]ц$/.test(c.form) && !/ы/.test(c.form) && !normative(c) ? form(c) : null), UM87('влєчиц ше ‘волочитися’')),
  RUE('PAN-LEX', 'rusyn:pannonian', 0.6, rx2(/^(барз|слунко|єдзенє|помоц)$/), UM87('дз, ц (єдзенє ‘їжа, страва’, помоц ‘допомога’)')),
  RUE('RUE-O-CIRC', 'rusyn:subcarpathian', 0, rx2(/ô/), LON('графемы Ô, отражавшей позиционный вариант фонемы /о/'), ),
]

/** Shared rows (research/10 §3, «Shared with existing rules»): not Rusyn-specific, so they count toward `rusyn` only if a RUE-/PAN- row fired. */
const RUSYN_SHARED_IDS = ['SW-DAT-OVY', 'SW-INSTR-OW', 'CARP-Y', 'HARD-C-FINAL']
export const RUSYN_SHARED: Rule[] = DIALECT_RULES.filter(r => RUSYN_SHARED_IDS.includes(r.id.split(':')[0]!) && ['WPL', 'SW', 'BOY', 'NDN'].includes(r.label))
  .map(r => ({ ...r, id: `${r.id}>rusyn`, axis: 'rusyn' as const, label: 'rusyn' }))

/** Rusyn axis for one form (research/10 §5): RUE-/PAN- rows decide; shared rows only add evidence once one fired. */
export function detectRusyn(c: Ctx): Detection {
  const base = detect(RUSYN_RULES, c)
  return Object.keys(base.claims).length ? detect([...RUSYN_RULES, ...RUSYN_SHARED], c) : base
}

/** Neutral status note shown with every rusyn:* label (research/10 §0), with both positions' sources. */
export const RUSYN_STATUS = {
  note: 'Русинська (ISO 639-3 rue; паннонська — rsk) у Словаччині, Польщі (як лемківська), Сербії, Угорщині та ін. визнається окремою мовою з кодифікованими стандартами; українська діалектологія і держава Україна розглядають ці ідіоми як говори південно-західного наріччя української мови (закарпатський, лемківський) або як варіант української літературної мови. Мітка rusyn:* означає лише «форма відповідає нормі/практиці русинського стандарту» і не є висновком про статус.',
  evidence: [
    P('ISO', 'https://iso639-3.sil.org/code/rue', 'rue … Rusyn … Individual … Living', '[rend] — не перевірено в браузері'),
    RUEW('Класіфікація русиньского языка як языка або діалекту є предметом контроверзії.'),
    UM87('один з варіантів руської (української) літ. мови українців Закарпаття'),
    UM162('один з арх. говорів карпатської групи діалектів південно-західного наріччя'),
    LON('Русинский литературный язык Закарпатской области Украины, однако, по настоящее время остаётся официально не кодифицированным'),
  ],
}

/**
 * Collapse a detector's `rusyn*` claims into the single contract claim `{value: label}` (types.ts FormCard.claims.rusyn):
 * a specific variant label wins over the undetermined `rusyn`, then the higher noisy-OR score (research/10 §5).
 */
export function rusynClaim(claims: Record<string, Claim<true>>): Claim<string> | undefined {
  const ls = Object.keys(claims).filter(l => l.startsWith('rusyn'))
  if (!ls.length) return undefined
  const best = ls.sort((a, b) => Number(b !== 'rusyn') - Number(a !== 'rusyn') || (claims[b]!.score ?? 0) - (claims[a]!.score ?? 0))[0]!
  const c = claims[best]!
  return claim(best, c.evidence, { score: c.score, method: c.method })
}

// ── Register (research/08 B3) — literary is never inferred; only labelled colloquial or unknown ──
export const REGISTER_RULES: Rule[] = [
  { id: 'REG-SLANG', axis: 'register', label: 'colloquial', weight: 0.9, cite: VT('slang', 'сленг та (проф)жаргонізми'), test: c => vline(c, 'slang') },
  { id: 'REG-SUBST', axis: 'register', label: 'colloquial', weight: 0.7, cite: VT('subst', 'нестандартні форма'), test: c => vline(c, 'subst') },
  { id: 'REG-SHORT', axis: 'register', label: 'colloquial', weight: 0.5, cite: VT('short', 'короткі форми дієслів 3-ї особи, інфінітиви на -ть'), note: ':short охоплює й поетичні форми', test: c => vline(c, 'short') },
  { id: 'REG-VULG', axis: 'register', label: 'colloquial', weight: 0.9, cite: VT('vulg', 'вульгарне'), test: c => vline(c, 'vulg') ?? vline(c, 'obsc') },
  { id: 'REG-H-TSIA', axis: 'register', label: 'colloquial', weight: 0, cite: P('—', '—', 'no source found (research/08 B2)'), test: c => (/[^т]ця$/.test(c.form) && c.vesum.length === 0 ? form(c) : null) },
  { id: 'REG-H-TRE', axis: 'register', label: 'colloquial', weight: 0, cite: P('—', '—', 'no source found (research/08 B2)'), test: c => (c.form === 'тре' ? form(c) : null) },
]
export const REGISTER_DEF = Q('SUM20', 'т. 1 (2010), §2.8', 'характеризує одиниці, що належать до складу літературної мови, не виходять за рамки літературного слововживання, але використовуються переважно в усній мові', 'визначення позначки «розм.»: розмовне ≠ нелітературне')
