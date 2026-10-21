/**
 * SPEC 63 MM-9: labelled contact (surzhyk) correspondences. Owner 2026-10-21: «MM9 це суржик» — Псіхіческе is a Russian-Ukrainian mixed form (Ukrainian і/е letters, Russian suffix -ическ-),
 * not an old Galician spelling. A correspondence says: this FORM is a contact form whose literary counterpart is X; the Russian form is shown as a VARIANT («російський варіант»), never as a source.
 * Contact labels belong to the FORM (annotator token, /f form view, spelling sub-cards), never to the lemma card (SPEC 63 MM-9 rule 2).
 *
 * Basis, all cited:
 *  - the Ukrainian side: Правопис § 33 п. 2 («пишемо похідний суфікс -ичн- (ий)», research/34 LA-ichn): adjectives from foreign stems take -ичн-/-ічн-;
 *  - the definition of the label: SURZHYK_DEF (ЕУМ «Суржик»);
 *  - the counterpart must be a VESUM-attested form: `lookup` (VESUM line = D-evidence). No counterpart in the lexicon, no link.
 * NOT cited (no source found, so only a probe and never a sound rule): псі- ~ пси- (the stem is tried as written and with і → и; the result counts only if the lexicon lists it),
 * and the Russian ending shape (-ческое) used to display the variant. Both are disclosed on the card as «реконструкція».
 */
import { D, Q, type Evidence } from './evidence.ts'
import type { VesumHit } from './types.ts'
import { key } from './text.ts'

export const ICHESK = /[иі]чес[ь]?к(?=(?:ий|а|е|і|ого|ому|ої|ою|им|их|ими|ій|ое|ая|ие)?$)/
const PR33 = 'https://slovnyk.ua/pravopys.php?prav_ver=2019&prav_par=33'
export const ICHESK_CITE: Evidence = Q('PRAV', PR33, 'Після букв д, т, з, с, ц, ж, ч, ш, р у прикметниках, утворених від основ іншомовного походження, пишемо похідний суфікс -ичн- (ий)', '§ 33, п. 2: український відповідник суфікса -ическ- (рос.) / -ічеськ- (суржик)')
const NORMATIVE = (h: VesumHit) => !/:(bad|err|subst|alt|arch|slang|vulg|obsc|short)\b/.test(':' + h.tags)

export interface ContactCorr {
  id: 'MOR-ICHESK'; form: string
  /** літературний відповідник (VESUM form) */ standard: string
  /** російський варіант (реконструкція, не джерело) */ ruVariant: string
  evidence: Evidence[]
}
const RU_END: Record<string, string> = { е: 'ое', а: 'ая', і: 'ие' }
/** Russian-looking variant of the mixed form: і → и, soft sign dropped, and a bare -е/-а/-і after -ческ- widened to -ое/-ая/-ие (display only) */
export const ruVariantOf = (w: string): string => key(w).replace(/і/g, 'и').replace(/ь(?=к)/g, '').replace(/(чес?к)([еаи])$/, (_, a: string, b: string) => a + (RU_END[b === 'и' ? 'і' : b] ?? b))

export function contactCorr(word: string, lookup: (w: string) => VesumHit[]): ContactCorr | undefined {
  const k = key(word); if (!ICHESK.test(k) || lookup(k).length) return undefined
  const stems = [...new Set([k, k.replace(/і/g, 'и')])]
  for (const s of stems) for (const suf of ['ічн', 'ичн']) {
    const std = s.replace(ICHESK, suf), h = lookup(std).find(NORMATIVE)
    if (h && std !== k) return { id: 'MOR-ICHESK', form: k, standard: std, ruVariant: ruVariantOf(k),
      evidence: [ICHESK_CITE, D('VESUM', 'dict_corp_vis.txt v6.8.6', `${std} ${h.tags} (лема: ${h.lemma})`, 'літературний відповідник засвідчений у ВЕСУМ')] }
  }
  return undefined
}
