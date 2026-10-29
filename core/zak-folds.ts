/**
 * SPEC 63 MM-40 / MM-41 (owner remarks on OV-14, 2026-10-29): two LINKING folds. Like the Galician-grammar folds of core/gal-folds.ts they have era [] (fold() never applies them by orth),
 * the build adds them as one-more-branch candidates for every token, VESUM / our cards decide, and the plain candidate always wins a tie: a token with a real reading never reaches them.
 *
 *  ORTH-ZAK-Y(-E|-O)  вÿс, кÿнь, хл’ÿў, привÿх, мн’ÿт → віз, кінь, хлів, привів, мед: the letters ÿ (U+00FF), ü (U+00FC), ӱ (U+04F1) that ЕУМ um162 prints for the Transcarpathian reflex of
 *                     etymological о, е, ѣ in a new closed syllable. Three folds (і / е / о) because the source glosses show all three (вÿс «віз» і; мн’ÿт «мед» е; the unchanged о of the
 *                     standard word is a third hypothesis, so VESUM decides). ў → в, softness mark ’ → ь / dropped.
 *  ORTH-ZAK-O         хôжу → хожу: ô (U+00F4), the closed variant of о in ЕУМ um162 (ôс’ін’); ê (U+00EA) → е is the same reading and is NOT in the quote (disclosed in the note).
 *  ORTH-RDC           сердце, сердцем, сердца → серце, серцем, серця (-рдц- → -рц-): the older (Middle Ukrainian) spelling, evidence = our own corpus attestations, NO dialect claim.
 *
 * Guard: a token is a Transcarpathian-marked word only when every letter is Cyrillic or one of the marker letters and it has ≥ 2 Cyrillic letters: «für», «Müller», «hôtel», «Mücke»
 * (Latin words, German / Hungarian / French quotations) never fold. Latin look-alike letters inside a Cyrillic word are NOT handled (see specs/63 MM-41: no OCR evidence in the local data).
 */
import { P, Q } from './evidence.ts'
import type { Fold } from './orthography.ts'

const UM162 = 'http://litopys.org.ua/ukrmova/um162.htm'
const Y_RE = /[ÿüӱ]/, O_RE = /[ôê]/
/** every letter is Cyrillic or a marker letter (ÿ ü ӱ ô ê) and at least two letters are Cyrillic */
export function isZakMarked(w: string): boolean {
  const letters = [...w].filter(c => /\p{L}/u.test(c))
  const cyr = letters.filter(c => /\p{Script=Cyrillic}/u.test(c)).length
  return cyr >= 2 && letters.every(c => /\p{Script=Cyrillic}|[ÿüôê]/u.test(c)) && (Y_RE.test(w) || O_RE.test(w))
}
const norm = (w: string, y: 'і' | 'е' | 'о' | undefined): string => {
  const s = w.replace(/[ÿüӱ]/g, y ?? '$&').replace(/ô/g, 'о').replace(/ê/g, 'е').replace(/ў/g, 'в').replace(/[’ʼ`]/g, "'")
  return s.replace(/'$/, 'ь').replace(/'/g, (_m, i: number) => /[бпвмфр]/.test(s[i - 1] ?? '') && /[яюєї]/.test(s[i + 1] ?? '') ? "'" : '')
}
/** the source prints the word-final consonant as pronounced: [вус «віз»], [мн’ут «мед»]; the spelling restores the voiced one */
const VOICED: Record<string, string> = { с: 'з', т: 'д', к: 'г', п: 'б', ш: 'ж', ф: 'в' }
const voice = (w: string): string => w.replace(/[сткпшф]$/, c => VOICED[c]!)
const zak = (y: 'і' | 'е' | 'о', v = false) => (w: string): string => {
  if (!(isZakMarked(w) && Y_RE.test(w))) return w
  const n = norm(w, y), r = v ? voice(n) : n
  return r === n && v ? w : r
}
const zakO = (w: string): string => isZakMarked(w) && !Y_RE.test(w) ? norm(w, undefined) : w

const Y_CITE = Q('ENC', UM162, 'Континуанти етимологічного [о] в новозакритих складах: [у] в сx. та зх. говорах [вус «віз»], [ÿ] в центральних [вÿс].',
  'ЕУМ друкує ÿ (U+00FF); ü (U+00FC) і ӱ (U+04F1) — ті самі графеми в інших текстах. Друга цитата того ж гасла: «[мн’ут «мед»; мн’ÿт, т’ÿтка, прин’ÿс, привÿх «привів»]» (е, і) і «[д’ÿўка, хл’ÿў]» (ѣ): ÿ стоїть за о, е, ѣ, тому кандидатів три (і, е, о). Район джерело називає тільки для ÿ < о (центральні, надборжавсько-латорицькі, березькі); для тексту район не відомий і не заявляється')
const O_CITE = Q('ENC', UM162, '(о > ÿ, е > і, у: кун’, ôс’ін’, прин’ýс)',
  'ЕУМ друкує ô для закритого варіанта о (ôс’ін’; хôжу, хôд’ат — гасло um162). Читання ê → е у цитаті ЕУМ не засвідчене: це та сама логіка, кандидат для зв’язування, ВЕСУМ вирішує. Діалектний район не заявляється')
const mk = (id: string, cite: typeof Y_CITE, apply: (w: string) => string): Fold => ({ id, era: [], branch: true, cite, apply })
export const ZAK_Y_FOLD = mk('ORTH-ZAK-Y', Y_CITE, zak('і'))
export const ZAK_Y_E_FOLD = mk('ORTH-ZAK-Y-E', Y_CITE, zak('е'))
export const ZAK_Y_O_FOLD = mk('ORTH-ZAK-Y-O', Y_CITE, zak('о'))
export const ZAK_Y_V_FOLD = mk('ORTH-ZAK-Y-V', Y_CITE, zak('і', true))
export const ZAK_Y_E_V_FOLD = mk('ORTH-ZAK-Y-E-V', Y_CITE, zak('е', true))
export const ZAK_Y_O_V_FOLD = mk('ORTH-ZAK-Y-O-V', Y_CITE, zak('о', true))
export const ZAK_O_FOLD = mk('ORTH-ZAK-O', O_CITE, zakO)

/**
 * -рдц- → -рц- with the endings of the older spelling modernised the way the form requires (сердца → серця: ца → ця; сердци → серці; сердцах → серцях; сердцами → серцями).
 * Fires only on a word with «рдц» (сердце, сердцевина, сердцем); a word without it is untouched.
 */
const RDC = /^(.*?)рдц(.*)$/
export const toRc = (w: string): string => {
  const m = RDC.exec(w); if (!m) return w
  const rest = m[2]!.replace(/^а$/, 'я').replace(/^и$/, 'і').replace(/^ѣ$/, 'і').replace(/^ах$/, 'ях').replace(/^ам$/, 'ям').replace(/^ами$/, 'ями')
  return m[1]! + 'рц' + rest
}
export const RDC_FOLD: Fold = {
  id: 'ORTH-RDC', era: [], branch: true,
  cite: P('IZB', 'public/data/archaic.json u:сердце, u:сердца, u:сердцем, u:сердци, u:сердцах, u:сердцу, u:сердцю; свідки i14_04 (1408–1410), i14_07, i14_14 (1581–1587), i14_17 (Волинь 1598–1599), i14_27 (Острог 1581), i14_32, o18_26 (Прокопович 1705), i14_39, i17_01',
    'сердце ×19, сердцѣ ×1; сердца ×24; сердцем ×10; сердци ×8; сердцах ×4; сердцу ×4; сердцю ×3',
    'власний корпус: 73 токени, 12 свідків, 1408–1705 (середньоукраїнська доба); форма з -рдц- — давніша (середньоукраїнська) написання слова серце, зафіксоване в нашому корпусі. Діалект не заявляється: у прочитаних статтях ЕУМ (um162, 166, 172–178, 180) ознаки -рдц- немає'),
  apply: toRc,
}
/** applied to the RAW token by withGal (the derive step has already turned ô into і, core/text.ts N00, so the candidate form cannot be used) */
export const ZAK_FOLDS: Fold[] = [ZAK_Y_FOLD, ZAK_Y_V_FOLD, ZAK_Y_E_FOLD, ZAK_Y_E_V_FOLD, ZAK_Y_O_FOLD, ZAK_Y_O_V_FOLD, ZAK_O_FOLD]
export const ALL_ZAK_FOLDS: Fold[] = [...ZAK_FOLDS, RDC_FOLD]
