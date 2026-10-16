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
  cls: 'pron' | 'noun'
  /** 'etymology' = ЕСУМ quote (default); 'cognate' = MM-2: no sound rule is cited, the link rests on VESUM + attested cognates, and is labelled so */
  kind?: 'etymology' | 'cognate'
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
  // MM-2 (owner screenshot «хом'як може», PVL 16.15 хомѣки): ѣ after a labial gave 'а / я in ru хомяк, be хамяк (хом'як), but no Шевельов / ЕУМ passage for such a rule has been fetched,
  // so NO sound rule is added before R09 (SPEC 63 DV-4 stays open for it). The word is linked by VESUM + the cognates alone, and the card says so.
  { old: ['хомѣкъ', 'хомякъ', 'хомѣки', 'хомѣкы'], modern: "хом'як", cls: 'noun', kind: 'cognate', url: 'https://en.wiktionary.org/wiki/хом%27як',
    quote: 'Cognate with Russian хомя́к (xomják), Belarusian хамя́к (xamják), Polish chomik.',
    note: 'Вікісловник (kaikki.org uk, hom\'як): споріднені ru хомяк, be хамяк; зіставлення за спорідненими формами, а не за звуковим правилом (правила ѣ > \'а після губного немає: джерела не знайдено)' },
]

const byOld = new Map<string, Correspondence>()
for (const c of CORRESPONDENCES) for (const o of c.old) byOld.set(o, c)
/** The correspondence for an old lemma (case-insensitive), if the table has a cited row for it. */
export const correspondenceFor = (oldLemma: string | undefined): Correspondence | undefined => (oldLemma ? byOld.get(oldLemma.normalize('NFC').toLowerCase()) : undefined)
export const corrEvidence = (c: Correspondence, oldLemma: string): Evidence => D(c.kind === 'cognate' ? 'Вікісловник (споріднені форми)' : 'ЕСУМ (goroh.pp.ua)', c.url, c.quote, `${c.note}; «${oldLemma}» → «${c.modern}»${c.kind === 'cognate' ? ' [за спорідненими формами, без звукового правила]' : ''}`)
