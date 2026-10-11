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
  { id: 'R04', name: 'Занепад єрів (закон Гавліка)', date: '1050–1150', scope: 'G',
    cite: Q('SHEV', S62, 'Її першим виразним проявом був занепад єрів (бл. 1050—1150 рр.)'),
    apply: havlik },
  { id: 'R10', name: 'Новий ікавізм: о, е > і в новозакритому складі', date: 'XII–XVII ст.', scope: 'X',
    cite: Q('SHEV', S62, 'Буковина першою зініціювала… звуження е та о в новозакритих складах після занепаду єрів (še·st\', sto·l > šíst\', stu·l)'),
    // blocked: second vowel of pleophony (город, берег) — research/03 §3; vowels from strong jers are / and never match
    apply: rx(`(?<![ое][рл])[ое]((?:C){1,2}ь?)${LOST}`, `і$1${LOST}`) },
  { id: 'R07', name: 'Вставні о, е в кінцевих групах', date: 'XIII–XVIII ст.', scope: 'L',
    cite: Q('SHEV', S62, 'вставні голосні е та о поширилися… (давн. укр. ogn\'ь > суч. укр. огóнь — див. 35.6)'),
    apply: seq(rx(`([бвгдзкпстх])р(ь?)${LOST}$`, `$1ер$2${LOST}`), rx(`гнь${LOST}$`, `гонь${LOST}`)) },
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
    cite: Q('SHEV', S14 + '.2', 'пьшоно проти пьшєниця'),
    apply: rx('([жчшй])е(?=C(?:[аоуиы]|$|·))', '$1о') },
  { id: 'R18', name: 'Ствердіння ж, ч, ш', date: 'XIV–XVI ст.', scope: 'G',
    cite: P('SHEV', sh(42, 'shev06'), 'Ствердіння середньопіднебінних (назва розділу 42)'),
    apply: seq(rx('([жчшщ])ю', '$1у'), rx('([жчш])я', '$1а'), rx(`([жчшщ])ь(?=$|${LOST})`, '$1')) },
  { id: 'R19', name: 'Ствердіння кінцевого р\'', date: 'XIV ст. (Полісся) → норма', scope: 'G',
    cite: P('SHEV', sh(49, 'shev06'), 'Друге ствердіння r\' (назва розділу 49)'),
    apply: rx(`рь(?=$|${LOST}|C)`, 'р') },
  { id: 'R21', name: 'Протетичні в, г', date: 'XIV–XVI ст.; h — від XVI ст.', scope: 'L',
    cite: Q('SHEV', S62, 'протетичного приголосного десь із XVI ст. почав виконувати також звук h'),
    apply: seq(rx('^у', 'ву'), rx('^о(?=C)', 'во')) },
  { id: 'R23', name: 'Стягнення прикметникових закінчень', date: 'XIV–XVI ст.', scope: 'L',
    cite: P('SHEV', sh(53, 'shev07'), 'Усічення та стягнення (назва розділу 53)'),
    apply: seq(rx('а[ѧя]$', 'а'), rx('о[ѥеє]$', 'е'), rx('ую$', 'у')) },
]

const finish = (w: string) => w.replaceAll(STRONG_O, 'о').replaceAll(STRONG_E, 'е').replaceAll(LOST, '').replace(/ъ/g, '').replace(/ѥ/g, 'є')

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

export const ruleById = Object.fromEntries(RULES.map(r => [r.id, r])) as Record<string, SoundRule>
