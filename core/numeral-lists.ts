/** SPEC 63 DV-1b: the standard numerals of the map (VESUM lemmas). Pure. */
export const CARD_LEMMAS = "один два три чотири п'ять шість сім вісім дев'ять десять одинадцять дванадцять тринадцять чотирнадцять п'ятнадцять шістнадцять сімнадцять вісімнадцять дев'ятнадцять двадцять тридцять сорок п'ятдесят шістдесят сімдесят вісімдесят дев'яносто сто двісті триста чотириста п'ятсот шістсот сімсот вісімсот дев'ятсот тисяча обидва".split(' ')
export const ORD_LEMMAS = "перший другий третій четвертий п'ятий шостий сьомий восьмий дев'ятий десятий одинадцятий дванадцятий тринадцятий чотирнадцятий п'ятнадцятий шістнадцятий сімнадцятий вісімнадцятий дев'ятнадцятий двадцятий тридцятий сороковий п'ятдесятий шістдесятий сімдесятий вісімдесятий дев'яностий сотий тисячний".split(' ')
/**
 * Corpus spellings that the HAND CHECK of dv1-num.json (790 spellings with f >= 5 in >= 2 witnesses, reached from the numeral forms by single vowel / ь / apostrophe / ч~ш / шт~чот confusions) accepted as
 * plausible DIALECT forms of a cardinal. Everything else was rejected: Russian spelling (двух, шестой, двадцать, семь), old-orthography endings (-аго, -ой, -ая, final ь), OCR (чість, чотире), ordinals (all
 * hits were orthographic or Russian), forms of other words. Accepted forms are shown as hypotheses (grade «гіпотеза»), with their distribution over the regions of the witnesses.
 */
export const NUM_ACCEPT: string[] = ["чтири", "чотери", "чьотири", "чєтири", "читири", "четирма", "чатири", "чотори", "штирма", "штирьох",
  "десить", "десеть", "десіть", "десети", "десити", "десуть", "десать", "двадцеть", "семдесят", "семсот",
  "еден", "един", "една", "воден", "водин", "обадва", "обидви",
  "тисеча", "тисеч", "тисечу", "тесячі", "тесяч", "тасяч", "тасячі", "тасячу", "тисача", "тисач", "тисачі", "тисачу", "тристо"]
