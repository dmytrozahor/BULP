/**
 * SPEC 61 FX-2: lexical correspondences old lemma → modern VESUM lemma for items that no sound rule derives (suppletive pronoun paradigms).
 * Each row carries a VERBATIM quote of ЕСУМ as served by goroh.pp.ua, fetched 2026-10-12 (page text, Ukrainian). A row without a fetched quote is not in this table
 * (e.g. есмь/быти → бути: the ЕСУМ page «бути» gave only «є … др. есть», no quote for есмь — not used).
 * The correspondence only names the modern LEMMA; the token is still linked through VESUM (M-3.2) and must pass the POS gate (core/pos-gate.ts), `pron` here.
 */
import { D, type Evidence } from './evidence.ts'

export interface Correspondence {
  /** old lemmas (TOROT lemma or Stanza lemma, lower case, before sound derivation) */
  old: string[]
  modern: string
  /** VESUM POS class the modern lemma must have (core/pos-gate.ts VClass) */
  cls: 'pron' | 'noun' | 'adv'
  /** 'etymology' = ЕСУМ quote (default); 'cognate' = no sound rule is cited, the link rests on VESUM + attested cognates, and is labelled so;
   *  'variant' (MM-2) = the regular rule `rule` gives a listed variant spelling (`variants`) of the modern lemma, which stays the standard form;
   *  'rule' (MM-2) = the regular rule `rule` gives the modern lemma itself, the row only carries the cited line */
  kind?: 'etymology' | 'cognate' | 'variant' | 'rule' | 'cs'
  /** 'cs' (MM-7) = a cited Church Slavonic ↔ East Slavic word correspondence (ЕСУМ); no sound rule is claimed for the suffix (-ствиѥ ↔ -ство has no quote) */
  /** sound-rule id (core/phonology.ts) behind a 'variant' / 'rule' row */
  rule?: string
  /** modern variant spellings of `modern` (lower case, dictionary-cited): the lemma-less token with exactly this spelling links to `modern` */
  variants?: string[]
  url: string
  quote: string
  note: string
}

export const CORRESPONDENCES: Correspondence[] = [
  { old: ['азъ', 'язъ', 'мене', 'мънѣ', 'мьнѣ', 'мъною'], modern: 'я', cls: 'pron', url: 'https://goroh.pp.ua/Етимологія/я',
    quote: 'р. бр. я, др. язъ, я,', note: 'ЕСУМ, стаття «я»: др. язъ; непрямі відмінки — «др. мене, мънѣ (мьнѣ), мъною,» (псл. mene, mьně, mъnojǫ)' },
  { old: ['тебе', 'тебѣ', 'тобѣ', 'тобою'], modern: 'ти', cls: 'pron', url: 'https://goroh.pp.ua/Етимологія/тебе',
    quote: 'др. тебе, тебѣ, тобѣ, тобою', note: 'ЕСУМ, стаття «тебе»: непрямі відмінки займенника «ти» (ти: «др. ты»)' },
  { old: ['насъ'], modern: 'ми', cls: 'pron', url: 'https://goroh.pp.ua/Етимологія/ми',
    quote: 'псл. my з кореневим приголосним m-, що протистоїть приголосному n- в yсix непрямих відмінках (nаsъ і т. д.);', note: 'ЕСУМ, стаття «ми»: m- у називному, n- у непрямих відмінках (суплетивізм)' },
  { old: ['васъ'], modern: 'ви', cls: 'pron', url: 'https://goroh.pp.ua/Етимологія/вас',
    quote: 'псл. vasъ пов’язане з vy «ви»;', note: 'ЕСУМ, стаття «вас»: непрямі відмінки пов’язані з «ви»' },
  { old: ['сей'], modern: 'цей', cls: 'pron', url: 'https://goroh.pp.ua/Етимологія/цей',
    quote: 'утвореної з вказівної частки от(о) і вказівного займенника сей', note: 'ЕСУМ, стаття «цей»: цей < от(о) + сей' },
  // MM-2 (owner screenshot «хом'як може», PVL 16.15 хомѣки). Two RULE-based paths to the card хом'як; there is no rule ѣ > 'а and none is added (no cite, no rule):
  //  (1) хомѣкъ / хомѣки / хомѣкы → хомік by R09 (ѣ > і): the regular reflex. хомик / хомік are listed variants of хом'як (ЕСУМ) and Желехівський prints «Хоми́к»; the card хом'як is the standard form.
  //  (2) хомѧкъ → хом'як by R02 (ѧ > 'я after a labial, core/phonology.ts), no correspondence needed for the link; the row only carries the cited line.
  // OES has both ѣ and ѧ in this word; the variation is unexplained (ЕСУМ: «надійної етимології не має»).
  { old: ['хомѣкъ', 'хомѣки', 'хомѣкы'], modern: "хом'як", cls: 'noun', kind: 'variant', rule: 'R09', variants: ['хомік', 'хомик'], url: "https://goroh.pp.ua/Етимологія/хом'як",
    quote: 'хомлєк, хомляк, хомняк, хомєк, хомик, хомік',
    note: 'ЕСУМ, стаття «хом\'як»: варіанти хомик, хомік; «надійної етимології не має». Желехівський 1886: «Хоми́к, m. Hamster, m. s. Хома́ II.»; в ДСС ѣ і ѧ у цьому слові чергуються, причина не з\'ясована. Правила ѣ > \'а немає' },
  { old: ['хомѧкъ', 'хомѧки', 'хомѧкы'], modern: "хом'як", cls: 'noun', kind: 'rule', rule: 'R02', url: 'https://en.wiktionary.org/wiki/хомяк#Russian',
    quote: 'Inherited from Old East Slavic хомѧкъ (xomękŭ), хомѣкъ (xoměkŭ), from Proto-Slavic *xomě̀kъ',
    note: 'Вікісловник (ru хомяк): праслов\'янське *xomě̀kъ має в давньоруській обидві форми, хомѧкъ і хомѣкъ; причина варіювання ѣ ~ ѧ не з\'ясована (ЕСУМ: «надійної етимології не має»)' },
  // MM-5 (owner file «съпостати це сопостат супостат іменник а не дієслово.png»): Stanza ORV lemmatised сопостат as the VERB съпостати (model). The NOUN супостат is in VESUM and in Wiktionary's
  // etymology (OES супостатъ < *sǫpostatъ). The spelling relation сопостат / съпостат ~ сѫпостатъ has no quote (the 'о' for ѫ is not stated in a source), so the link is a labelled cognate row, not a sound rule.
  { old: ['съпостати', 'съпостатъ', 'сопостат', 'сопостаты', 'сопостата', 'сопостатъ'], modern: 'супостат', cls: 'noun', kind: 'cognate', url: 'https://en.wiktionary.org/wiki/супостат',
    quote: 'Inherited from Old East Slavic супостатъ (supostatŭ), from Proto-Slavic *sǫpostatъ.',
    note: 'Вікісловник (uk супостат): давньоруське супостатъ < псл. *sǫpostatъ; сопостат / съпостат — те саме слово, написання з о / ъ на місці ѫ у джерелі не цитується (модельна лема Stanza «съпостати» — дієслово — хибна)' },
  // MM-7 (owner file «цѣсарьствие без сучасного відповідника хоча є царство.png»): ЕСУМ «цар»: царь < цѣсарь, so цѣсарьствие / цесарьствие ~ царство. -ствиѥ ↔ -ство (ЦС ↔ укр.) is NOT quoted anywhere in the project: ЦС correspondence, no sound rule.
  { old: ['цѣсарьствие', 'цесарьствие', 'цѣсарьство', 'цесарьство', 'цѣсарство', 'цесарство', 'цѣсарьствиѥ', 'цесарьствиѥ', 'царьствие', 'царствие'], modern: 'царство', cls: 'noun', kind: 'cs', url: 'https://goroh.pp.ua/Етимологія/цар',
    quote: 'р. царь виникло в результаті скорочення др. цѣсарь, стсл. цѣсарь › цьсарь, що походять від імені Caesar',
    note: 'ЕСУМ, стаття «цар»: цар(ь) < цѣсарь (скорочення). Суфікс ЦС -ьствиѥ ↔ укр. -ство у джерелі не цитується, тому це ЦС-відповідність, а не звукове правило; VESUM має цісарство і царство' },
  // MM-11 (owner file «легінь злито з легені легенів і немає діалектного лигінь 1.png»): the Hutsul / Carpathian form of легінь «young man». NO dictionary line was found (VESUM, Желехівський / r2u pages,
  // the dsu14 and uk.wiktionary dumps have no лигінь / лиґінь); the only source is the corpus: Етноґрафічний збірник т. 19 (Коломийки, т. III, 1907), «Ішов лиґінь до дівчини», and 2 tokens in т. 33 (1912).
  // The identification with легінь rests on that context, so the row is a labelled variant, not a sound rule (no е > и rule is cited).
  { old: ['лигінь', 'лиґінь'], modern: 'легінь', cls: 'noun', kind: 'variant', variants: ['лигінь', 'лиґінь'], url: 'https://archive.org/details/etnohr_19',
    quote: 'Ішов лиґінь до дівчини',
    note: 'Корпус: Етноґрафічний збірник. Т. 19. Коломийки. Том III (1907, OCR), s. 7239; також т. 33 (1912, демонологія). Словникового рядка немає; тотожність з легінь за контекстом (юнак іде до дівчини)' },
  // MM-8b (owner file «даль перша фіксація з невичитаного OCR і злиті прислівники далі дале.png»): the old spellings дале / далѣ are the ADVERB далі, not forms of the noun даль. Wiktionary's etymology
  // of the adverb: Old Ruthenian далѣ, Old East Slavic дале. A lemma-less token with exactly one of these spellings links to the adverb (modern тексти 'далі' stay ambiguous: no POS evidence).
  { old: ['дале', 'далѣ', 'далї'], modern: 'далі', cls: 'adv', kind: 'cognate', url: 'https://en.wiktionary.org/wiki/далі#Ukrainian',
    quote: 'Inherited from Old Ruthenian далѣ (dalě), from Old East Slavic дале (dale), from Proto-Slavic *daľe.',
    note: 'Вікісловник (uk далі, adv): «further, onwards, forth»; дале / далѣ — давньоруська і староруська форма цього прислівника, а не словоформа іменника даль' },
]

const byOld = new Map<string, Correspondence>()
for (const c of CORRESPONDENCES) for (const o of c.old) byOld.set(o, c)
/** The correspondence for an old lemma (case-insensitive), if the table has a cited row for it. */
export const correspondenceFor = (oldLemma: string | undefined): Correspondence | undefined => (oldLemma ? byOld.get(oldLemma.normalize('NFC').toLowerCase()) : undefined)
/** MM-2: modern variant spelling (хомік, хомик) → the row whose standard lemma it varies */
export const variantFor = (form: string): Correspondence | undefined => CORRESPONDENCES.find(c => c.variants?.includes(form))
const label = (c: Correspondence) => c.kind === 'cognate' ? 'Вікісловник (споріднені форми)' : c.kind === 'cs' ? 'ЕСУМ (ЦС-відповідність)' : c.kind === 'rule' ? 'Вікісловник (ru хомяк)' : 'ЕСУМ (goroh.pp.ua)'
export const corrEvidence = (c: Correspondence, oldLemma: string): Evidence => D(label(c), c.url, c.quote,
  `${c.note}; «${oldLemma}» → «${c.modern}»${c.kind === 'cs' ? ' [ЦС-відповідність, без звукового правила]' : c.kind === 'cognate' ? ' [за спорідненими формами, без звукового правила]' : c.rule ? ` [за правилом ${c.rule}${c.kind === 'variant' ? '; ' + (c.variants ?? []).join(' / ') + " — варіанти, стандартна форма " + c.modern : ''}]` : ''}`)
