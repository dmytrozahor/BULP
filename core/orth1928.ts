/**
 * SPEC 63 MM-10: cited folds for the 1928 (Харківський / Скрипникове) orthography of foreign words. Each rule quotes the statement it implements; a feature with no
 * statement is NOT a rule (no source, no rule). All folds branch: VESUM decides (core/orthography.ts fold()).
 * Source: uk.wikipedia «Харківський правопис» (text of the 1928 rules, §§ 54, 55, 121), fetched 2026-10-21; the ЕУМ line research/09 §3 («літеру ґ для іншомов. слів, запозичених після 1860») agrees.
 * Not folded for want of a statement: medial -ія- → -іа- (only «У кінці слова іншомовне -іа передаємо звичайно через -ія» is stated: word-final), е → і (хемія, only a word list), и/і.
 * The era list includes 'желехівка': Galician print (Франко 1903 «термінольоґія») used the same letters, and VESUM marks these spellings `:alt` (альтернативне написання); the fold only offers a
 * candidate, VESUM must list it, so no sound is claimed for Галичина beyond what the dictionary confirms.
 */
import { Q } from './evidence.ts'
import type { Fold } from './orthography.ts'

const URL = 'https://uk.wikipedia.org/wiki/Харківський_правопис'
const W = (quote: string, note?: string) => Q('WUK', URL, quote, note)

export const ORTH1928_FOLDS: Fold[] = [
  { id: 'ORTH-1928-G', era: ['1928', 'желехівка'], branch: true,
    cite: W('щождо чужого g, то в новіших запозиченнях його треба передавати через ґ', '§ 55: 1928 writes ґ in newer loanwords (термінольоґія); the current norm writes г there (термінологія)'),
    apply: w => w.replaceAll('ґ', 'г') },
  { id: 'ORTH-1928-LYO', era: ['1928', 'желехівка'], branch: true,
    cite: W('Зокрема м\'яким л віддаємо чуже l послідовно в комплексах', '§ 54: «м\'яким л (ль, ля, льо, лю)»; приклади бальо́н, бльокада, кольо́квіюм. льо → ло, лише де VESUM має результат'),
    apply: w => w.replace(/льо/g, 'ло') },
  // ля / лю → ла / лу: the same quote, but NOT offered to Желехівка witnesses (it would offer лубовою for любовою, tests/gz.test.ts); used for the 1928 alt-lemma map only
  { id: 'ORTH-1928-SOFTL', era: ['1928'], branch: true,
    cite: W('Зокрема м\'яким л віддаємо чуже l послідовно в комплексах', '§ 54: «м\'яким л (ль, ля, льо, лю)». ля / лю → ла / лу, лише де VESUM має результат'),
    apply: w => w.replace(/ля/g, 'ла').replace(/лю/g, 'лу') },
]
