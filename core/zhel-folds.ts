/**
 * SPEC 63 GZ-2: cited Желехівка (Galician, Желехівський 1886) spelling folds. Every rule below quotes the source statement it implements;
 * a feature without a statement is NOT a rule (no source, no rule), see analysis/galician-extraction.md «refused». All folds branch: VESUM decides.
 * Source: uk.wikipedia «Желехівка» (text agrees with ЕУМ «Українська мова», um17), fetched 2026-10-15.
 */
import { Q } from './evidence.ts'
import type { Fold } from './orthography.ts'

const URL = 'https://uk.wikipedia.org/wiki/Желехівка'
const W = (quote: string, note?: string) => Q('WUK', URL, quote, note)
const R = (re: RegExp, to: string) => (w: string) => w.replace(re, to)

export const ZHEL_FOLDS: Fold[] = [
  { id: 'ORTH-ZHEL-SOFT', era: ['желехівка'], branch: true,
    cite: W('За допомогою ь відбито м\'якість: сьміх, сьвято, сьвіт, цьвях, цьвіркати, зьвір', 'сьв/зьв/цьв/сьм → св/зв/цв/см; «дзь» is not in the source and is not folded'),
    apply: R(/(?<=[сзц])ь(?=[вм])/g, '') },
  { id: 'ORTH-ZHEL-SKY', era: ['желехівка'], branch: true,
    cite: W('Прикметникових суфіксів -ський, -цький не пом\'якшувано: україньский, нїмецкий', '-ский/-цкий (and their inflections) → -ський/-цький'),
    apply: R(/(?<=.)([сц])к(?=и[йхмі]|ого|ому|ої|ою|а|е|у|і|им|ими)/g, '$1ьк') },
  { id: 'ORTH-ZHEL-INIT-I', era: ['желехівка'], branch: true,
    cite: W('буква и на початку слова читалась як [і]', 'initial и = і'),
    apply: R(/^и(?=.)/, 'і') },
  { id: 'ORTH-ZHEL-JE', era: ['желехівка'], branch: true,
    cite: W('писано закінчення є відповідно до наддніпрянського я: зїлє, житє, знанє', 'final -є → -я; after a soft consonant also the geminate (знанє → знання)'),
    apply: w => /[нлтдсзцчшжр]є$/.test(w) ? w.replace(/([нлтдсзцчшжр])є$/, '$1$1я') : w.replace(/є$/, 'я') },
]
