/**
 * Ordered sound changes Old Kyivan / Old Ukrainian → modern standard Ukrainian (research/03 §2, after G. Y. Shevelov).
 *
 * > "Періодизація історії постання й розвитку звукової та фонемної систем української мови ґрунтується в цій книзі
 * >  на цілковито зовнішньому чиннику — характері писемних свідчень." — Шевельов, ІФУМ, 14.1
 * > "Because of the lexical rules (L), generate candidates and rank them against the modern lexicon (СУМ/ULIF/VESUM).
 * >  Keep the rule trace (ids) for the provenance explanation." — research/03 §2.2
 *
 * Scopes: G general · X general-with-lexical-exceptions (branches: applied | not) · L lexical (branches) · D dialectal (never applied).
 * Rules M01–M06 are omitted: research/03 marks them "[P/other] … not from Shevelov", so they have no citation (P-1.3).
 */
import { Q, P, type Evidence } from './evidence.ts'
import { normalizeOld, type NormOpts } from './text.ts'
import { R24_CITE, restoreVelar } from './palatalization.ts'

const sh = (ch: number, file: string) => `${'http://izbornyk.org.ua/shevelov/'}${file}.htm, розд. ${ch}`
const S14 = sh(14, 'shev04'), S62 = sh(62, 'shev08')

export type Scope = 'G' | 'X' | 'L' | 'D'
export interface SoundRule { id: string; name: string; date: string; scope: Scope; cite: Evidence; apply: (w: string) => string }

const C = 'бвгґджзйклмнпрстфхцчшщ'       // consonants
const V = 'аеиоуыѣѧѫюяєѥіїъь'
const STRONG_O = '', STRONG_E = '', LOST = '·'   // vocalised strong jers; trace of a lost weak jer
const re = (src: string, f = 'g') => new RegExp(src.replaceAll('C', `[${C}]`).replaceAll('V', `[${V}]`), f)
const rx = (src: string, to: string) => (w: string) => w.replace(re(src), to)
const seq = (...fs: ((w: string) => string)[]) => (w: string) => fs.reduce((s, f) => f(s), w)

/** Havlík's law, right to left: a jer is strong iff the next nucleus is a weak jer; word-final jers are weak. */
export function havlik(w: string): string {
  const out = [...w]; let nextWeakJer = false; let seenNucleus = false
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i]!
    if (c === 'ъ' || c === 'ь') {
      const weak: boolean = !seenNucleus || !nextWeakJer
      out[i] = weak ? (c === 'ь' && i > 0 && C.includes(out[i - 1]!) ? 'ь' + LOST : LOST) : (c === 'ъ' ? STRONG_O : STRONG_E)
      nextWeakJer = weak; seenNucleus = true
    } else if (V.includes(c)) { nextWeakJer = false; seenNucleus = true }
  }
  return out.join('')
}

export const RULES: SoundRule[] = [
  { id: 'R02', name: 'Деназалізація ѧ > я, ѫ > у', date: 'X ст.', scope: 'G',
    cite: Q('SHEV', S14 + '.2', 'злиття ę з а, oн з u'),
    apply: seq(rx('([жчшщц])ѧ', '$1а'), rx("(^|V|р)([бпвмф])ѧ", "$1$2'я"), rx('ѧ', 'я'), rx('ѫ', 'у')) },
  { id: 'R14', name: 'бы > бу (губне огублення)', date: 'середньоукр.', scope: 'L',
    cite: P('SHEV', sh(54, 'shev07'), 'Діалектна асимілятивна лабіалізація неогублених голосних (назва розділу 54)'),
    apply: rx('^(по|за|при|до|від)?бы', '$1бу') },
  { id: 'R03', name: 'ky, gy, xy > k\'i, g\'i, x\'i', date: 'пн.: поч. іст. періоду; пд.: кін. XIII ст.', scope: 'G',
    cite: Q('SHEV', S62, 'у північних діалектах мала місце зміна сполук ky, gy, xy на k\'i, g\'i, х\'і; натомість на півдні … наприкінці XIII ст. (див. 15.4)'),
    apply: rx('([кгх])ы', '$1и') },
  { id: 'R05', name: 'Напружені єри: -ыи > -ий, -ии > -ій', date: 'XI–XII ст.', scope: 'G',
    cite: P('SHEV', sh(17, 'shev04'), 'Еволюція у, і, ъ та ь в позиції поряд із j (назва розділу 17)'),
    apply: seq(rx('ыи$', 'ий'), rx('ии$', 'ій')) },
  { id: 'R13', name: 'C + j: подовження, -ьѥ > -ття', date: 'XV ст.', scope: 'G',
    cite: Q('SHEV', S62, 'скупчення з новопосталим j усунено в XV ст. (див. 37.1)'),
    apply: seq(rx('([тдсзлнцчжш])ь[ѥеѧя]$', '$1$1я'), rx("рь[ѥеѧя]$", "р'я"), rx("([бпвмф])ь[ѥеѧя]$", "$1'я")) },
  { id: 'R06', name: 'CъrC > CorC, CьrC > CerC, CъlC > ColC', date: 'XII ст.', scope: 'G',
    cite: P('SHEV', sh(18, 'shev04'), 'Еволюція єрів перед сонантом між двома приголосними (сполуки CъSC, CьSC) (назва розділу 18)'),
    apply: seq(rx('(C)ъ([рл])(?=C)', '$1о$2'), rx('(C)ьр(?=C)', '$1ер'), rx('(C)ьл(?=C)', '$1ол')) },
  { id: 'R21c', name: 'Зняття протетичного и- перед л, р (илвов > львов, ильняний > льняний)', date: 'XIV–XVII ст.', scope: 'L',
    cite: Q('WPUK', 'https://uk.wikipedia.org/wiki/Назви_Львова', 'приставного «и» перед звуками «л» та «р», головно коли після них була редукована голосна', 'воєводі Илвовскомъ (1371), до Илвова (1407); research/27 §3.4 кл. 11'),
    apply: seq(rx('^и([лр]ь)', '$1'), rx('^ил(?=C)', 'ль')) },
  { id: 'R04', name: 'Занепад єрів (закон Гавліка)', date: '1050–1150', scope: 'G',
    cite: Q('SHEV', S62, 'Її першим виразним проявом був занепад єрів (бл. 1050—1150 рр.)'),
    apply: havlik },
  { id: 'R21', name: 'Протетичні в, г', date: 'XIV–XVI ст.; h — від XVI ст.', scope: 'L',
    cite: Q('SHEV', S62, 'протетичного приголосного десь із XVI ст. почав виконувати також звук h'),
    apply: seq(rx('^у', 'ву'), rx('^о(?=C)', 'во')) },   // before R10 (research/27 §3.4 кл. 6): окно → вокно → вікно
  { id: 'R21d', name: 'Протетичне и- перед л, р + редукований голосний (иржа)', date: 'XIV–XVI ст.', scope: 'L',
    cite: Q('WPUK', 'https://uk.wikipedia.org/wiki/Назви_Львова', 'приставного «и» перед звуками «л» та «р», головно коли після них була редукована голосна', 'research/27 §3.4 кл. 11'),
    apply: rx(`^([рл])(?=${LOST})`, 'и$1') },
  { id: 'R10', name: 'Новий ікавізм: о, е > і в новозакритому складі', date: 'XII–XVII ст.', scope: 'X',
    cite: Q('SHEV', S62, 'Буковина першою зініціювала… звуження е та о в новозакритих складах після занепаду єрів (še·st\', sto·l > šíst\', stu·l)'),
    // blocked: second vowel of pleophony (город, берег) — research/03 §3; vowels from strong jers are / and never match
    apply: rx(`(?<![ое][рл])[ое]((?:C){1,2}ь?)${LOST}`, `і$1${LOST}`) },
  // BL-14 / research/27 §3.4: lexical branches around R10 (scope L: both the applied and the plain candidate are kept)
  { id: 'R10a', name: 'Аналогійне о > і в -овл- (будівля, торгівля, зимівля)', date: 'XIX–XX ст.', scope: 'L',
    cite: Q('WPUK', 'https://uk.wikipedia.org/wiki/Ікавізм', 'нефонетично, бо в наступому складі ніколи не було зредукованого ь чи ъ', 'буд-овл-я → буд-івл-я; research/27 §3.4 кл. 3'),
    apply: rx('(?<=C)овл(?=[яюєіь])', 'івл') },
  { id: 'R10b', name: 'Повноголосне і: беріг, сторін (лексична перевизначеність винятку R10)', date: 'діал.; ґен. мн.', scope: 'L',
    cite: Q('SHEV', sh(57, 'shev07'), 'у закритих складах у повноголосих сполуках (типу бéрег > діал. бéріг, storon > сторíн ґен. мн.)', 'research/27 §3.4 кл. 4'),
    apply: seq(rx(`^(бер)е(г${LOST})`, '$1і$2'), rx(`^(стор)о(н${LOST})`, '$1і$2')) },   // only the lexemes the source names: город, берег (nom. sg.) stay blocked
  { id: 'R10c', name: 'і у відкритому складі: кінець-тип (-ьць)', date: 'пізніша акомодація, не R10', scope: 'L',
    cite: Q('SHEV', sh(57, 'shev07'), 'появу і у відкритих складах замість о та е в словах типу кінéць', 'research/27 §3.4 кл. 5'),
    apply: rx(`^(C)[ое](?=C${STRONG_E}цьь?${LOST}$)`, '$1і') },
  { id: 'R07', name: 'Вставні о, е в кінцевих групах', date: 'XIII–XVIII ст.', scope: 'L',
    cite: Q('SHEV', S62, 'вставні голосні е та о поширилися… (давн. укр. ogn\'ь > суч. укр. огóнь — див. 35.6)'),
    apply: seq(rx(`([бвгдзкпстх])р(ь?)${LOST}$`, `$1ер$2${LOST}`), rx(`гнь${LOST}$`, `гонь${LOST}`)) },
  // DV-4 (research/43-yat-after-j.md): the stative suffix -ѣ- (*-ěti) after j (written without j after a vowel: стоѣти = *stojěti) or after ж ч ш щ gives -а-/-я-, not і. Lexical (scope L): the plain R09 branch stays, the modern lexicon decides.
  { id: 'R09j', name: 'ѣ > а/я після j і шиплячих у суфіксі -ѣти (стоѣти > стояти, лежѣти > лежати)', date: 'праслов’янська, у східнослов’янських усталена', scope: 'L',
    cite: Q('WIKT', 'https://en.wiktionary.org/wiki/Reconstruction:Proto-Slavic/stojati', 'From earlier *stojěti', 'ЕС: *stojěti > *stojati; нащадки: uk стоя́ти, ru стоя́ть, be стая́ць (research/43-yat-after-j.md)'),
    apply: seq(rx('([жчшщ])ѣ(?=т[иь]|л(?:·|$|[аоиы]))', '$1а'), rx('([аоу])ѣ(?=т(?:и|ь|ься|ися))', '$1я')) },
  { id: 'R09', name: 'ѣ > і (ї на початку та після голосного)', date: 'XIII–XIV ст.', scope: 'G',
    cite: P('SHEV', sh(32, 'shev05'), 'Просунення вперед е· з перетворенням його на і (назва розділу 32)'),
    apply: seq(rx("(^|[аеиоуєїюяі'])ѣ", '$1ї'), rx('ѣ', 'і')) },
  { id: 'R12', name: 'ѥ у новозакритому складі > ї', date: 'давньо- → середньоукр.', scope: 'G',
    cite: P('SHEV', sh(17, 'shev04'), 'Еволюція у, і, ъ та ь в позиції поряд із j (розд. 9, 10, 17)'),
    apply: rx(`ѥ(?=(?:C)+ь?${LOST})`, 'ї') },
  { id: 'R11', name: 'Злиття і та у > и', date: 'XIII–XIV ст.', scope: 'G',
    cite: Q('SHEV', S62, 'Результатом злиття і та у на півдні був звук у, а на півночі — передніший звук у'),
    apply: seq(rx('ы', 'и'), rx('^и', 'і')) },
  { id: 'R15', name: 'Ствердіння губних у кінці складу', date: 'XIII ст.', scope: 'G',
    cite: Q('SHEV', S62, 'ствердіння губних наприкінці складу (див. 26.3)'),
    apply: rx(`([бпвмф])ь(?=$|${LOST}|C)`, '$1') },
  { id: 'R16', name: 'l > w після о, е', date: 'від XIV ст.', scope: 'G',
    cite: Q('SHEV', S62, 'l > v після о (див. 30.1)'),
    apply: rx(`([ое${STRONG_O}${STRONG_E}])л(?=$|${LOST}|C)`, '$1в') },
  { id: 'R16p', name: 'l > w у дієприкметнику на -лъ (ходилъ > ходив)', date: 'від XIV ст.', scope: 'L',
    cite: Q('SHEV', S62, 'l > v після о (див. 30.1)', 'поширення на -илъ/-алъ: research/03 R16 "l-participle -лъ# → -в (masc. sg.)"'),
    apply: rx(`([аиуяы])л${LOST}$`, `$1в${LOST}`) },
  { id: 'R17', name: 'е > о після шиплячих перед твердим', date: 'XII–XIII ст.', scope: 'L',
    cite: Q('SHEV', S14 + '.2', 'пьшоно проти пьшєниця', 'умова «перед твердим приголосним» — рядок R17 у research/03; Шевельов у цитаті умови не формулює; м’який (шиплячий або й) наступний приголосний умову не виконує (MM-4: жечи ≠ жочи)'),
    apply: rx('([жчшй])е(?=(?![жчшщй])C(?:[аоуиы]|$|·))', '$1о') },
  { id: 'R18', name: 'Ствердіння ж, ч, ш', date: 'XIV–XVI ст.', scope: 'G',
    cite: P('SHEV', sh(42, 'shev06'), 'Ствердіння середньопіднебінних (назва розділу 42)'),
    apply: seq(rx('([жчшщ])ю', '$1у'), rx('([жчш])я', '$1а'), rx(`([жчшщ])ь(?=$|${LOST})`, '$1')) },
  { id: 'R19', name: 'Ствердіння кінцевого р\'', date: 'XIV ст. (Полісся) → норма', scope: 'G',
    cite: P('SHEV', sh(49, 'shev06'), 'Друге ствердіння r\' (назва розділу 49)'),
    apply: rx(`рь(?=$|${LOST}|C)`, 'р') },
  { id: 'R23', name: 'Стягнення прикметникових закінчень', date: 'XIV–XVI ст.', scope: 'L',
    cite: P('SHEV', sh(53, 'shev07'), 'Усічення та стягнення (назва розділу 53)'),
    apply: seq(rx('а[ѧя]$', 'а'), rx('о[ѥеє]$', 'е'), rx('ую$', 'у')) },
  // R24 «kept»: ц/з/с from the second palatalization survive (руцѣ → руці); ѣ → і is R09. Identity here, so it never appears in a forward trace.
  { id: 'R24', name: 'Друга палаталізація (к, г, х > ц, з, с перед ѣ, и) зберігається', date: 'праслов’янська; в укр. зберігається', scope: 'G', cite: R24_CITE[0]!, apply: w => w },
]

/** Rules used only to LINK a token back to a lemma (not part of the forward derive loop; present in ruleById for traces and the UI). */
export const LINK_RULES: SoundRule[] = [
  { id: 'R24r', name: 'Друга палаталізація навпаки: ц, з, с > к, г, х перед ѣ, и (лема з основою на задньоязичний)', date: 'праслов’янська', scope: 'L', cite: R24_CITE[0]!, apply: restoreVelar },
]

export const finish = (w: string) => w.replaceAll(STRONG_O, 'о').replaceAll(STRONG_E, 'е').replaceAll(LOST, '').replace(/ъ/g, '').replace(/ѥ/g, 'є')

export interface Candidate { form: string; trace: string[]; branches: number }
export interface Derivation { input: string; norm: string; titlo?: string; candidates: Candidate[] }

const MAX = 32
/** P-1.5: derive modern candidates, each with the ordered list of rule ids that changed it. */
export function derive(raw: string, opts: NormOpts = {}): Derivation {
  const { norm, titlo } = normalizeOld(raw, opts)
  let cands: Candidate[] = [{ form: norm, trace: [], branches: 0 }]
  for (const r of RULES) {
    if (r.scope === 'D') continue
    const next: Candidate[] = []
    for (const c of cands) {
      const out = r.apply(c.form)
      if (out === c.form) { next.push(c); continue }
      next.push({ form: out, trace: [...c.trace, r.id], branches: c.branches })
      if (r.scope !== 'G') next.push({ ...c, branches: c.branches + 1 })
    }
    cands = next.slice(0, MAX)
  }
  const seen = new Map<string, Candidate>()
  for (const c of cands) { const f = finish(c.form); if (!seen.has(f)) seen.set(f, { ...c, form: f }) }
  return { input: raw, norm, titlo, candidates: [...seen.values()] }
}

export const ruleById = Object.fromEntries([...RULES, ...LINK_RULES].map(r => [r.id, r])) as Record<string, SoundRule>
