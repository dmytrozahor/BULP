/**
 * Reinforced deictics (SPEC 60 DX-1…DX-2; user U-25 «отуточки, онтамека, осьтамека, озьдо»), research/24.
 *
 * > "Функцію більш точної просторової вказівки в західнополіських говірках виконують постпозитивні вказівні частки -ге та -о, -во, -го,
 * >  рідше – препозитивна о-: тутгé, … тутó, … отутó, отутгó …" — Громик, Прислівники зі значенням ‘тут’ (research/24 §1.3)
 * > "результат злиття частки о і прислівника *сьде ‹ др. сьде, сьдѣ ‹ псл. sьde, sьdě «тут» … з пізнішим ускладненням частками о
 * >  (повторно: о-сьде-о), -ка та ін." — ЕСУМ, о́сьде (research/24 §2)
 * > "Отут нар. = оттут. Ум. отутеньки, отутечки. … Ось зараз були отутечки." — Грінченко, vol. 3 с. 77
 *
 * Model: a deictic adverb = [prefix] + base + [reinforcement -ка/-ки/-ечки…] + [pointing -о/-во/-го/-ге]. The inventory is DATA (P-4.2):
 * every part row carries a Q/P `cite` (P-1.3); an attested form carries the dictionary quote (a claim, P-1.1); a form no source has
 * (отуточки, онтамека, осьтамека) is returned as a **reconstruction** (`method: 'derivation'`, SPEC 30 D-4 style, P-1.7) whose evidence is the
 * citations of its parts plus the input — never a dictionary fact. `-ка/-ки/-ечки` are labelled `reinforcement`, not diminutive: Грінченко
 * says «Ум.», Громик and ЕСУМ say the forms are not diminutive in meaning (research/24 §3.4); both views are quoted.
 * Distal/proximal is regional: on-/ан’- is «вонъ там» in literary Ukrainian (Грінченко, ЕСУМ) but «ось тут» in West Polissian (Громик), so
 * a prefix row lists its regions and the reading of a form with он- carries the note.
 */
import { claim, P, Q, type Claim, type Evidence } from './evidence.ts'

export type DxRole = 'prefix' | 'base' | 'suffix'
export type DxKind = 'proximal' | 'distal' | 'emphatic' | 'base' | 'reinforcement' | 'pointing'
export const DX_KIND_UK: Record<DxKind, string> = {
  proximal: 'ближній (ось)', distal: 'далекий (он)', emphatic: 'вказівний «вотъ»', base: 'основа', reinforcement: 'підсилення (-ка/-ки)', pointing: 'уточнення місця (-о/-го)',
}

export interface DxPartRow { id: string; role: DxRole; label: string; kind: DxKind; meaning: string; regions: string[]; cite: Evidence; note?: string }

const HR = (id: string, page: string, quote: string) => Q('HRINCH', `hrinchenko.com/dictionary/word/${id.split('-')[0]} (id ${id.split('-')[0]}, ${page})`, quote)
const ES = (card: string, quote: string) => Q('ESUM', `https://goroh.pp.ua/Етимологія/${card}`, quote)
const HT = (quote: string) => Q('HROMYK', 'Громик Ю., Прислівники зі значенням ‘тут, у цьому місці’ в західнополіських та суміжних говірках (evnuir.vnu.edu.ua/123456789/480)', quote)
const HK = (quote: string) => Q('HROMYK', 'Громик Ю., Західнополіські прислівники на -ки, -ка (evnuir.vnu.edu.ua/123456789/2256)', quote)

/** Component inventory (DX-1): prefixes, bases, suffixes — each with the source quote it rests on. */
export const DX_PARTS: DxPartRow[] = [
  { id: 'P-O', role: 'prefix', label: 'о-', kind: 'emphatic', meaning: 'вотъ', regions: [],
    cite: ES('ось', 'результат злиття частки о і займенника се «це», який зазнав редукції') },
  { id: 'P-OT', role: 'prefix', label: 'от-', kind: 'emphatic', meaning: 'вотъ', regions: [],
    cite: HR('36058-ottut', 'vol. 3 с. 77', 'Оттут нар. Вотъ здѣсь, вотъ сюда. … Ум. оттутеньки, оттутечки.') },
  { id: 'P-ON', role: 'prefix', label: 'он-', kind: 'distal', meaning: 'он', regions: [],
    cite: ES('онде', 'в українській мові пізніше могло бути переосмислене як складне утворення з частки укр. он і прислівника де'),
    note: 'у літературній мові «вонъ тамъ» (Грінченко, ЕСУМ); у західнополіських говірках ті самі он’-/ан’- мають значення «ось тут» (Громик)' },
  { id: 'P-OS', role: 'prefix', label: 'ось-', kind: 'proximal', meaning: 'ось', regions: [],
    cite: HR('35938-os', 'vol. 3 с. 74', 'ось-де, ось-дечки, ось-ось-де. Вотъ гдѣ. Ось-осьде я, коли вам треба. Котл. Ен. І. 17.'),
    note: 'сь → з(ь) перед д: осьде ~ озьде (ЕСУМ перелічує обидва варіанти)' },
  { id: 'P-GE', role: 'prefix', label: 'ге-', kind: 'proximal', meaning: 'ось', regions: ['WPL', 'NDN'],
    cite: ES('гезде', 'складне утворення, до якого входить давня вказівна частка ге, редукована форма с (з) вказівної частки се, яка міститься і в частці ось, прислівника де і, в частині форм, частки -(ч)ка, -(ч)ки, о') },
  { id: 'B-TUT', role: 'base', label: 'тут', kind: 'base', meaning: 'тут', regions: [], cite: HR('59817-tut', 'vol. 4', 'Тут нар. 1) Здѣсь. … 2) Сюда. … 3) Вотъ.') },
  { id: 'B-TAM', role: 'base', label: 'там', kind: 'base', meaning: 'там', regions: [], cite: HR('57919-tam', 'vol. 4', 'Там нар. 1) Тамъ. … 2) Туда. 3) Тогда, въ такомъ случаѣ.') },
  { id: 'B-TUDY', role: 'base', label: 'туди', kind: 'base', meaning: 'туди', regions: [], cite: P('HRINCH', 'hrinchenko.com/dictionary/word/59635 (id 59635, vol. 4)', 'туди — «Туда» (Грінченко), переказ статті') },
  { id: 'B-DE', role: 'base', label: 'де', kind: 'base', meaning: 'де', regions: [],
    cite: ES('де', 'псл. *kъ-de … складається з питального займенникового кореня *kъ … і частки або суфікса -de'), note: 'потребує префікса (інакше «де» + «ка» — не вказівний прислівник)' },
  { id: 'B-SDE', role: 'base', label: 'сьде', kind: 'base', meaning: 'тут', regions: [],
    cite: ES('осьде', 'результат злиття частки о і прислівника *сьде ‹ др. сьде, сьдѣ ‹ псл. sьde, sьdě «тут»'), note: 'сьде → зьде/зде перед дзвінким; е випадає перед -о (озьдо)' },
  { id: 'S-KI', role: 'suffix', label: '-ка/-ки/-ек(а)/-ечк(и)/-очк(и)', kind: 'reinforcement', meaning: 'підсилення',
    regions: ['WPL', 'MPL', 'BOY', 'HUT', 'SLB', 'STP'],
    cite: HK('в західнополіських говірках усі аналізовані вище деривати не мають здрібніло-пестливого значення й уживані безвідносно до віку як мовця, так і його співрозмовника.'),
    note: 'Грінченко позначає «Ум.», ЕСУМ — «зменшено-підсильні форми»; Громик — не зменшувальні. Тут: підсилення (research/24 §3.4)' },
  { id: 'S-O', role: 'suffix', label: '-о/-во/-го/-ге', kind: 'pointing', meaning: 'точніше вказує місце', regions: ['WPL', 'MPL'],
    cite: HT('Функцію більш точної просторової вказівки в західнополіських говірках виконують постпозитивні вказівні частки -ге та -о, -во, -го, рідше – препозитивна о-: тутгé, … тутó, … отутó, отутгó …') },
]
const PART = Object.fromEntries(DX_PARTS.map(p => [p.id, p])) as Record<string, DxPartRow>

/** Surface forms by part id (longest first inside a role). `needsPrefix`/`needsO`: the surface exists only in that frame. */
interface Surface { s: string; needsO?: boolean }
const PREFIX_SURF: [string, string[]][] = [
  ['P-OS', ['ось', 'озь', 'оз', 'ос']], ['P-OT', ['ото', 'отт', 'от']], ['P-ON', ['он', 'ан']], ['P-GE', ['ге', 'гі']], ['P-O', ['о']],
]
const BASE_SURF: [string, Surface[], boolean][] = [   // [id, surfaces, needsPrefix]
  ['B-TUDY', [{ s: 'туди' }], false], ['B-TUT', [{ s: 'тут' }], false], ['B-TAM', [{ s: 'там' }], false],
  ['B-SDE', [{ s: 'сьде' }, { s: 'зьде' }, { s: 'зде' }, { s: 'сде' }, { s: 'зьд', needsO: true }, { s: 'сьд', needsO: true }, { s: 'зд', needsO: true }], true],
  ['B-DE', [{ s: 'де' }, { s: 'д', needsO: true }], true],   // ондо = он + д(е) + о: е випадає перед -о (ЕСУМ: онде-о › ондо́)
]
const KI = '(?:еньк|ечк|ичк|очк|ак|ек|ик|ік)[аиіе]?|к[аиіе]'
const SUFFIX_RE = new RegExp(`^(${KI})?(во|го|ге|о)?$`)

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[́]/g, '').replace(/[’ʼ'`]/g, 'ь').replace(/-/g, '')

export interface DxPart { id: string; text: string; role: DxRole; label: string; kind: DxKind; meaning: string; regions: string[]; cite: Evidence; note?: string }
const mk = (id: string, text: string): DxPart => { const r = PART[id]!; return { id, text, role: r.role, label: r.label, kind: r.kind, meaning: r.meaning, regions: r.regions, cite: r.cite, note: r.note } }

/** An attested form (DX-2): its own segmentation is given, so ЕСУМ's о+сьде+о is kept rather than a regex's guess. */
export interface DxAttested { form: string; parts: [id: string, text: string][]; reading: string; standard?: string; regions: string[]; evidence: Evidence[]; note?: string }
export const DX_ATTESTED: DxAttested[] = [
  { form: 'отут', parts: [['P-O', 'о'], ['B-TUT', 'тут']], reading: 'вотъ тут', standard: 'оттут', regions: [],
    evidence: [HR('36061-otut', 'vol. 3 с. 77', 'Отут нар. = оттут. Ум. отутеньки, отутечки. Отутеньки ставатимем. Кролев. у. Ось зараз були отутечки. Грин. II. 142.')] },
  { form: 'оттут', parts: [['P-OT', 'от'], ['B-TUT', 'тут']], reading: 'вотъ тут, вотъ сюди', standard: 'тут', regions: [],
    evidence: [HR('36058-ottut', 'vol. 3 с. 77', 'Оттут нар. Вотъ здѣсь, вотъ сюда. … Ум. оттутеньки, оттутечки.')] },
  { form: 'отутечки', parts: [['P-O', 'о'], ['B-TUT', 'тут'], ['S-KI', 'ечки']], reading: 'вотъ тут (підсилено)', standard: 'отут', regions: ['CHN'],
    evidence: [HR('36061-otut', 'vol. 3 с. 77', 'Отут нар. = оттут. Ум. отутеньки, отутечки. Отутеньки ставатимем. Кролев. у. Ось зараз були отутечки. Грин. II. 142.')],
    note: 'Грінченко (Кролевецький пов.) — прямий зразок для «отуточки»' },
  { form: 'туточка', parts: [['B-TUT', 'тут'], ['S-KI', 'очка']], reading: 'тут (підсилено)', standard: 'тут', regions: ['WPL'],
    evidence: [HT('пор. … пінське тýточка [19, с. 37]')] },
  { form: 'тутечки', parts: [['B-TUT', 'тут'], ['S-KI', 'ечки']], reading: 'тут (підсилено)', standard: 'тут', regions: ['CHN', 'WPL', 'MPL', 'SLB', 'STP'],
    evidence: [HR('59826-tutechka', 'vol. 4 с. 298', 'Тутечка, тутечки, нар. Ум. отъ тут.')] },
  { form: 'оттам', parts: [['P-OT', 'от'], ['B-TAM', 'там']], reading: 'вотъ там', standard: 'там', regions: [],
    evidence: [HR('36050-ottam', 'vol. 3 с. 77', 'Оттам нар. Вотъ тамъ. Оттам на городі вовк свиню ззів. Ум. оттамечки.')] },
  { form: 'отам', parts: [['P-O', 'о'], ['B-TAM', 'там']], reading: 'вотъ там', standard: 'оттам', regions: [],
    evidence: [HR('35966-otam', 'vol. 3 с. 74', 'Отам нар. = оттам. А батько де? — Отам і там. ЗОЮР. І. 250.')] },
  { form: 'оттамечки', parts: [['P-OT', 'от'], ['B-TAM', 'там'], ['S-KI', 'ечки']], reading: 'вотъ там (підсилено)', standard: 'оттам', regions: [],
    evidence: [HR('36050-ottam', 'vol. 3 с. 77', 'Оттам нар. Вотъ тамъ. Оттам на городі вовк свиню ззів. Ум. оттамечки.')] },
  { form: 'тамечки', parts: [['B-TAM', 'там'], ['S-KI', 'ечки']], reading: 'там (підсилено)', standard: 'там', regions: ['WPL'],
    evidence: [HR('57919-tam', 'vol. 4', 'Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки, тамкива.')] },
  { form: 'тамека', parts: [['B-TAM', 'там'], ['S-KI', 'ека']], reading: 'там (підсилено)', standard: 'там', regions: ['WPL'],
    evidence: [HK('там > тáмка, тáмкай, тáмека, тáмика, тáм’іка, тáмикий, тáмечка, тáмичка, тáм’ічка, тáмен’ка')], note: 'у СУМ/Грінченка немає; лише Громик (говірки)' },
  { form: 'онде', parts: [['P-ON', 'он'], ['B-DE', 'де']], reading: 'вонъ там', standard: 'там', regions: [],
    evidence: [HR('35225-onde', 'vol. 3 с. 54', 'Онде нар. Вонъ тамъ. Він онде в шафі … Чуб. Ум. ондечки. Левиц. І. 100.')] },
  // SPEC 63 DX: «ондо (он там)» and «тамки» (user 2026-10-14)
  { form: 'ондо', parts: [['P-ON', 'он'], ['B-DE', 'д'], ['S-O', 'о']], reading: 'ось там', standard: 'онде', regions: [],
    evidence: [ES('онно', 'результат фонетичної видозміни … онде-о, з о́нде і вказівної частки о (онде-о́ › ондо́ › онно́)'),
      ES('онде', 'о́ндека, онде́лька, ондео́, о́ндечка, о́ндечки, о́ндєка, о́ндикаво, ондо́, ондьо́, о́ньдо, о́ньдзе')],
    note: 'ЕСУМ: онно́ «ось там» ← онде + о; ареал у картці ЕСУМ не названо → регіон невідомий' },
  { form: 'тамки', parts: [['B-TAM', 'там'], ['S-KI', 'ки']], reading: 'там (підсилено)', standard: 'там', regions: ['WPL'],
    evidence: [HR('57919-tam', 'vol. 4', 'Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки, тамкива.'), HK('там > тáмк’і, тáмик’і, тáм’ік’і, тáмечки, тáмен’ки, тáмийки, тáмыйкы')] },
  { form: 'тамка', parts: [['B-TAM', 'там'], ['S-KI', 'ка']], reading: 'там (підсилено)', standard: 'там', regions: ['WPL'],
    evidence: [HR('57919-tam', 'vol. 4', 'Ум. таменька, таменьки, тамечка, тамечки, тамка, та́мки, тамкива.'), HK('там > тáмка, тáмкай, тáмека, тáмика, тáм’іка, тáмикий, тáмечка, тáмичка, тáм’ічка, тáмен’ка')] },
  { form: 'ондечки', parts: [['P-ON', 'он'], ['B-DE', 'де'], ['S-KI', 'чки']], reading: 'вонъ там (підсилено); у WPL «ось тут»', standard: 'онде', regions: ['WPL'],
    evidence: [HR('35225-onde', 'vol. 3 с. 54', 'Онде нар. Вонъ тамъ. Він онде в шафі … Чуб. Ум. ондечки. Левиц. І. 100.'), HT('óн’д’ечки (Сварицевичі Дб)')] },
  { form: 'осьде', parts: [['P-O', 'о'], ['B-SDE', 'сьде']], reading: 'ось тут', standard: 'тут', regions: [],
    evidence: [ES('осьде', 'результат злиття частки о і прислівника *сьде ‹ др. сьде, сьдѣ ‹ псл. sьde, sьdě «тут»')], note: 'Грінченко ділить ось-де (ось + де); ЕСУМ — о + сьде' },
  { form: 'осьдечки', parts: [['P-OS', 'ось'], ['B-DE', 'де'], ['S-KI', 'чки']], reading: 'ось тут (підсилено)', standard: 'осьде', regions: [],
    evidence: [HR('35938-os', 'vol. 3 с. 74', 'ось-де, ось-дечки, ось-ось-де. Вотъ гдѣ. Ось-осьде я, коли вам треба. Котл. Ен. І. 17.')] },
  { form: 'озде', parts: [['P-O', 'о'], ['B-SDE', 'зде']], reading: 'ось тут', standard: 'осьде', regions: ['POD'],
    evidence: [HR('34892-ozde', 'vol. 3', 'Озде нар. = ось-де. Камен. у. Ум. озденька.')] },
  { form: 'озьдо', parts: [['P-O', 'о'], ['B-SDE', 'зьд'], ['S-O', 'о']], reading: 'ось тут', standard: 'осьде', regions: ['MPL', 'WPL', 'POD', 'STP'],
    evidence: [ES('осьде', 'результат злиття частки о і прислівника *сьде ‹ др. сьде, сьдѣ ‹ псл. sьde, sьdě «тут» … з пізнішим ускладненням частками о (повторно: о-сьде-о), -ка та ін.'),
      ES('осьде', 'во́зьда, о́зде, о́зденька, оздиго́, оздио́, о́здички, оздо́, о́зьде, о́зьдека, о́зьдечки, озьдо́, озьдоо́')],
    note: 'о + сьде + о: «ось тут» (не «ось де»); приклад U-25' },
  { form: 'озьдечки', parts: [['P-O', 'о'], ['B-SDE', 'зьде'], ['S-KI', 'чки']], reading: 'ось тут (підсилено)', standard: 'осьде', regions: ['WPL', 'MPL'],
    evidence: [ES('осьде', 'во́зьда, о́зде, о́зденька, оздиго́, оздио́, о́здички, оздо́, о́зьде, о́зьдека, о́зьдечки, озьдо́, озьдоо́'), HT('вóз’дечки (Обенижі Тр)')] },
]
const ATT_BY_FORM = new Map(DX_ATTESTED.map(a => [a.form, a]))
const stemOf = (t: string) => t.replace(/[аиіе]$/, '')

export interface DxSegmentation {
  form: string
  parts: DxPart[]
  reading: string
  standard?: string
  status: 'attested' | 'reconstruction'
  regions: string[]
  /** attested: the dictionary quote(s) + part cites; reconstruction: part cites + the input (method: derivation) */
  claim: Claim<string>
  /** reconstruction only: for each part, the attested forms that contain the same part (id + stem) */
  support: { part: string; text: string; attestedIn: string[] }[]
  /** every part has an attested form that contains it (reconstruction is "built from attested parts") */
  fullySupported: boolean
  note?: string
}

function support(parts: DxPart[], self: string): DxSegmentation['support'] {
  return parts.map(p => ({
    part: p.id, text: p.text,
    attestedIn: DX_ATTESTED.filter(a => a.form !== self && a.parts.some(([id, t]) => id === p.id && (p.role === 'suffix' ? stemOf(t) === stemOf(p.text) : t === p.text))).map(a => a.form),
  }))
}

const reading = (parts: DxPart[]) => {
  const pre = parts.find(p => p.role === 'prefix'), base = parts.find(p => p.role === 'base'), ki = parts.some(p => p.id === 'S-KI'), o = parts.some(p => p.id === 'S-O')
  return [pre?.meaning, base?.meaning].filter(Boolean).join(' ') + (ki ? ' (підсилено)' : '') + (o ? ' (точніше)' : '')
}

function attestedSeg(a: DxAttested): DxSegmentation {
  const parts = a.parts.map(([id, t]) => mk(id, t))
  return { form: a.form, parts, reading: a.reading, standard: a.standard, status: 'attested', regions: a.regions,
    claim: claim(a.reading, [...a.evidence, ...[...new Set(parts.map(p => p.id))].map(id => PART[id]!.cite)]),
    support: [], fullySupported: true, note: a.note }
}

/** Generic parse (right-to-left stripping of research/24 §4.1): [prefix] + base + [S-KI] + [S-O]; the residue must be exactly these parts. */
function parse(w: string): DxPart[][] {
  const out: DxPart[][] = []
  const prefixes: [string, string][] = [['', ''], ...PREFIX_SURF.flatMap(([id, ss]) => ss.map(s => [id, s] as [string, string]))]
  for (const [pid, ps] of prefixes) {
    if (!w.startsWith(ps)) continue
    const rest = w.slice(ps.length)
    for (const [bid, surfs, needsPrefix] of BASE_SURF) {
      if (needsPrefix && !pid) continue
      for (const b of surfs) {
        if (!rest.startsWith(b.s)) continue
        const m = SUFFIX_RE.exec(rest.slice(b.s.length))
        if (!m) continue
        const [, ki, o] = m
        if (b.needsO && !o) continue
        if (!pid && !ki && !o) continue          // a bare base is not a segmentation
        const parts: DxPart[] = []
        if (pid) parts.push(mk(pid, ps))
        parts.push(mk(bid, b.s))
        if (ki) parts.push(mk('S-KI', ki))
        if (o) parts.push(mk('S-O', o))
        out.push(parts)
      }
    }
  }
  return out
}

/**
 * DX-1/DX-2: all segmentations of `input` as a reinforced deictic. Attested rows first (a claim with the dictionary quote), then
 * reconstructions (`method: 'derivation'`, evidence = cites of the parts + the input). Returns [] when nothing parses (P-3.1).
 */
export function segment(input: string): DxSegmentation[] {
  const w = norm(input)
  if (!w) return []
  const out: DxSegmentation[] = []
  const sig = (ps: DxPart[]) => ps.map(p => p.text).join('+')
  const att = ATT_BY_FORM.get(w)
  if (att) out.push(attestedSeg(att))
  const taken = new Set(att ? [att.parts.map(([, t]) => t).join('+')] : [])
  const gen = parse(w).sort((a, b) => a.length - b.length || b[0]!.text.length - a[0]!.text.length)
  for (const parts of gen) {
    if (taken.has(sig(parts))) continue
    taken.add(sig(parts))
    if (att) continue                                  // an attested form is not also "reconstructed"
    const sup = support(parts, w)
    const rd = reading(parts)
    const on = parts.find(p => p.id === 'P-ON')
    const ev: Evidence[] = [...new Set(parts.map(p => p.id))].map(id => PART[id]!.cite)
    ev.push(P('INPUT', w, `«${parts.map(p => p.text).join(' + ')}» → «${w}» (не засвідчено; складено за зразком засвідчених частин)`, 'method: derivation (P-1.7)'))
    out.push({
      form: w, parts, reading: rd, status: 'reconstruction', regions: [...new Set(parts.flatMap(p => p.regions))],
      claim: claim(rd, ev, { method: 'derivation' }), support: sup, fullySupported: sup.every(s => s.attestedIn.length > 0),
      note: on ? PART['P-ON']!.note : undefined,
    })
  }
  return out
}

/** Convenience for the UI: the best segmentation (attested first) or undefined. */
export const bestSegmentation = (form: string) => segment(form)[0]
/** The inventory re-exported by role for display. */
export const dxPartsByRole = (role: DxRole) => DX_PARTS.filter(p => p.role === role)
