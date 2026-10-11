/**
 * Detector rule tables (data, not code). Sources: research/03 §4 (Church Slavonic), research/05 §3.2 (contact/surzhyk),
 * research/04 §1 (dialects), research/08 B3 (register). Weight-0 rows are kept on purpose: they document
 * hypotheses that lack a published source (P-1.3) and surface only as review hints.
 */
import { Q, P, D, type Evidence } from './evidence.ts'
import { TAG, normative, modern, type Ctx, type Rule } from './detect.ts'

const vline = (c: Ctx, t: string) => { const h = TAG(c, t); return h ? D('VESUM', 'dict_corp_vis.txt v6.8.6', `${c.form} ${h.tags} (лема: ${h.lemma})`) : null }
const match = (re: RegExp, s?: string) => (s && re.test(s) ? s : null)
const form = (c: Ctx, src = 'attestation') => D(src, c.year ? `рік ${c.year}` : 'введення користувача', c.norm ?? c.form)

// ── Church Slavonic vs vernacular (research/03 §4) ──────────────────────────────────────────────
const SHEV_BULG = Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev04.htm, 14.5', 'містять žd, št < dj, tj, написання типу СrъС… повноголос у них ніколи не трапляється', 'Шевельов про болгарські (церковнослов\'янські) тексти')
const SHEV_SCRIBES = Q('SHEV', 'http://izbornyk.org.ua/shevelov/shev04.htm, 14.4', 'Деякі риси церковнослов\'янського письма відкинуто (Ж, СrěС, жд), інші частково або повністю пристосовано до місцевої вимови')

/** CS doublet: the form shows a South-Slavic reflex AND VESUM attests the East-Slavic counterpart. */
const doublet = (re: RegExp, swap: (m: string) => string) => (c: Ctx): Evidence | null => {
  const src = c.norm ?? c.form; if (!re.test(src)) return null
  const vern = src.replace(re, swap)
  for (const cand of [vern, ...(c.derive?.(vern) ?? [])]) {
    const h = c.inLexicon(cand)[0]
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

export const CONTACT_RULES: Rule[] = [
  { id: 'LEX-LT', axis: 'contact', label: 'nonnormative', weight: 0.8, cite: Q('LT', 'UK_SIMPLE_REPLACE', '«X» - помилкове слово, виправлення: …'),
    test: c => (modern(c) && c.lt?.file === 'replace' ? LTD(`${c.form}=${c.lt.suggest}`) : null) },
  { id: 'LEX-LT-SOFT', axis: 'contact', label: 'not_recommended', weight: 0.4, cite: Q('LT', 'UK_SIMPLE_REPLACE_SOFT', 'нерекомендоване слово, кращий варіант'),
    test: c => (modern(c) && c.lt?.file === 'soft' ? D('LT', 'rules/uk/replace_soft.txt', `${c.form}=${c.lt.suggest}`) : null) },
  { id: 'LEX-VESUM-BAD', axis: 'contact', label: 'russianism_or_hybrid', weight: 0.8, cite: VT('bad', 'покруч'), test: c => (modern(c) ? vline(c, 'bad') : null),
    note: 'nonstandard_items.md: bad охоплює «росіянізми - кляча»' },
  { id: 'LEX-VESUM-SUBST', axis: 'contact', label: 'nonstandard', weight: 0.6, cite: VT('subst', 'нестандартні форма'), test: c => (modern(c) ? vline(c, 'subst') : null) },
  { id: 'ORT-YI', axis: 'contact', label: 'russianism_orth', weight: 0.9, cite: ALPHA, test: c => (modern(c) && /[эъё]/.test(c.form) ? form(c) : null) },
  { id: 'ORT-Y', axis: 'contact', label: 'russianism_orth', weight: 0.5, cite: ALPHA, note: 'ы також у карпатських говорах (див. CARP-Y)', test: c => (modern(c) && /ы/.test(c.form) ? form(c) : null) },
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

// ── Dialects (research/04 §1) — fire only on non-normative forms from 1798 on ────────────────────
const W = (art: string) => `https://uk.wikipedia.org/wiki/${art}`
const SRC: Record<string, string> = {
  EPL: W('Східнополіський_говір'), NOR: 'http://litopys.org.ua/ukrmova/um161.htm', MDN: 'http://litopys.org.ua/ukrmova/um166.htm', SW: W('Південно-західне_наріччя_української_мови'),
  SE: W('Південно-східне_наріччя_української_мови'), WPL: W('Західнополіський_говір'), MPL: W('Середньополіський_говір'), POD: W('Подільський_говір'), NDN: W('Наддністрянський_говір'),
}
const dialectGate = (c: Ctx) => (c.year === undefined || c.year >= 1798) && !normative(c)
const dia = (id: string, codes: string[], re: RegExp, weight: number, src: string, quote: string): Rule[] =>
  codes.map(code => ({ id: `${id}:${code}`, axis: 'dialect' as const, label: code, weight, cite: Q(src === 'NOR' || src === 'MDN' ? 'ENC' : 'WUK', SRC[src]!, quote),
    test: (c: Ctx) => (dialectGate(c) && re.test(c.form) ? form(c) : null) }))

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
  ...dia('NDN-ADJ-KIJ', ['NDN'], /(кій|хій|кєй|хєй)$/, 0.6, 'NDN', 'на місці давніх сполук ки, хи в ненаголошеній позиції розвинулися сполуки кі, хі (глибóкій «глибокий»)'),
  ...dia('CHN-INSTR-SHORT', ['CHN'], /\S{2,}ой$/, 0.4, 'EPL', 'Паралелізм іменних форм в ор. в. (рукóйу — рукóй, шóстайу — шóстай, мнóйу — мнóй)'),
  ...dia('SW-INSTR-OW', ['SW'], /(оў|еў)$/, 0.7, 'SW', 'наявність флексії -оў, -еў на місці давніх -оју, -еју … (рукóју > рукóў, рукóм …)'),
  ...dia('CARP-Y', ['BOY', 'LEM'], /ы/, 0.5, 'SW', 'у карпатських говорах наявний голосний заднього ряду [ы] (сыны, былы)'),
  ...dia('HARD-C-FINAL', ['NDN', 'POD'], /[еи]ц$/, 0.5, 'NDN', 'втрата м\'якості ць у кінці слова (хлóпиц, жнец)'),
  ...dia('R-SOFT-FINAL', ['MDN', 'SE'], /р[ь’']$/, 0.3, 'MDN', 'посилення функц. навантаження [р’] (р’áма, гр\'ад, гончáр’)'),
  ...dia('EPENTH-L-N', ['POD', 'MDN'], /(мн[’']?я|мн[’']а|вл[’']?я)/, 0.4, 'POD', 'Наявність вставних л’, н’ після губних приголосних — рипл’áх, здорóўл\'а … мн’áсо, мн’áта'),
  ...dia('F-TO-X', ['CHN', 'MDN'], /^(хв|худбол|хабрик)/, 0.2, 'EPL', 'Ослаблення «ф» → «х/хв» (худбóл, хва́ра)'),
  ...dia('CHN-PREP', ['CHN'], /^(помеж|л'а|л'е|заза|наў|ік|дак)$/, 0.7, 'EPL', 'к(ік)+дав. в. "до" (к бра́ту, ік сталý); л\'а (л\'е)+ род. в. "біля" (л\'а ха́ти, л\'е ріечки)'),
  ...dia('MPL-YON', ['MPL'], /^(йон|юн)$/, 0.7, 'MPL', 'приставний звук й у займеннику йон, юн (він)'),
]

/** Dialect code → display names (research/04 §1 codes). */
export const DIALECTS: Record<string, string> = {
  CHN: 'східнополіський (чернігівський)', MPL: 'середньополіський', WPL: 'західнополіський', NORTH: 'північне наріччя',
  MDN: 'середньонаддніпрянський (київсько-полтавський)', SE: 'південно-східне наріччя', SW: 'південно-західне наріччя',
  POD: 'подільський', NDN: 'наддністрянський (галицький)', BOY: 'бойківський', LEM: 'лемківський',
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
