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
  cls: 'pron'
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
]

const byOld = new Map<string, Correspondence>()
for (const c of CORRESPONDENCES) for (const o of c.old) byOld.set(o, c)
/** The correspondence for an old lemma (case-insensitive), if the table has a cited row for it. */
export const correspondenceFor = (oldLemma: string | undefined): Correspondence | undefined => (oldLemma ? byOld.get(oldLemma.normalize('NFC').toLowerCase()) : undefined)
export const corrEvidence = (c: Correspondence, oldLemma: string): Evidence => D('ЕСУМ (goroh.pp.ua)', c.url, c.quote, `${c.note}; «${oldLemma}» → «${c.modern}»`)
