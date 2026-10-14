/**
 * SPEC 63 PV-8: Old East Slavic inflection spellings folded to the spelling that core/phonology.ts derive() already understands. Separate module (the MU agent edits mu-fold.ts).
 * A fold only proposes a candidate spelling; it becomes a link only when VESUM lists the derived modern form (build-link.ts, M-3.2). Pure.
 *
 * Sources (research/11 §2 = Павленко 2010 PAVL; research/37-oes-morphology.md = ЕУМ um101/um102/um152, uk.wikipedia, en.wiktionary — quotes verbatim there):
 *  > «плодъмь (-омь) · селъмь (-омь) · коньмь (-емь) · польмь (-емь) · мечьмь (-ьмь)» — PAVL p. 75, ŏ/jŏ-stems, instr. sg
 *  > «Д … плодомъ · селомъ · конемъ · полемъ · мечемъ» — PAVL p. 75
 *  > «традиц. церковнослов’ян. закінчення -аго (лоеваго, неумытнаго …), хоч переважає укр. -ого» — ЕУМ um102
 *  > «Прикметники мали іменну й займенникову форми (якісні — добръ, добрыи …)» — uk.wikipedia «Давньоруська мова» 3.2.2
 *  > aorist «знахъ | знахомъ … знаша», «несохъ … несоша», «несе»; imperfect «писахъ, писаше, писахомъ, писаху» — ЕУМ um152, uk.wikipedia «Імперфект»
 * NOT implemented, no quoted description held (research/37 §5): -ыимъ/-ыя/-ую, gen. fem. -еа, participles -въ/-вши/-щ-.
 */
import { Q, type Evidence } from './evidence.ts'
import { foldById } from './orthography.ts'

export interface OesFold { id: string; cite: Evidence; apply: (w: string) => string }
const PAVL75 = 'research/11 §2, ŏ/jŏ-stems (Павленко 2010, с. 75)'
const MJER = Q('PAVL', PAVL75, 'плодъмь (-омь) · селъмь (-омь) · коньмь (-емь) · польмь (-емь) · мечьмь (-ьмь)')
const EM = Q('PAVL', PAVL75, 'Д … плодомъ · селомъ · конемъ · полемъ · мечемъ')
const AGO = Q('ENC', 'http://litopys.org.ua/ukrmova/um102.htm', 'У відмінюванні прикметників трапляється в род. в. одн. ч. р. традиц. церковнослов’ян. закінчення -аго (лоеваго, неумытнаго, хр(с)толюбиваго), хоч переважає укр. -ого (цѣлого, литовского, милого, милостивого, написаного, ночного)')
const LONG = Q('WUK', 'https://uk.wikipedia.org/wiki/Давньоруська_мова, 3.2.2 Прикметник', 'Прикметники мали іменну й займенникову форми (якісні — добръ, добрыи; відносні — камѧнь, камѧный')

export const OES_FOLDS: OesFold[] = [
  { id: 'OES-MJER', cite: MJER, apply: w => w.replace(/мь$/, 'мъ') },                          // коньмь → коньмъ (final jer after м)
  { id: 'OES-EM', cite: EM, apply: w => w.replace(/([^аеиоуыѣюя])ѣмъ$/, '$1емъ').replace(/ѣмь$/, 'емь') },   // instr./dat. -ѣмъ ≈ -емъ (soft stems: конемъ)
  { id: 'OES-GEN-AGO', cite: AGO, apply: w => w.replace(/аго$/, 'ого') },
  { id: 'OES-LONG-YI', cite: LONG, apply: w => w.replace(/ыи$/, 'ий').replace(/ии$/, 'ій') },
]
export const oesFoldById = Object.fromEntries(OES_FOLDS.map(f => [f.id, f]))

/** Variant spellings of an Old-Cyrillic token (each a single fold, or a fold applied after another); the original spelling is not repeated. */
export function oesVariants(w: string): { form: string; trace: string[] }[] {
  const out = new Map<string, string[]>()
  for (const f of OES_FOLDS) { const n = f.apply(w); if (n !== w && !out.has(n)) out.set(n, [f.id]) }
  for (const [n, t] of [...out]) for (const f of OES_FOLDS) { const m = f.apply(n); if (m !== n && m !== w && !out.has(m)) out.set(m, [...t, f.id]) }
  return [...out].map(([form, trace]) => ({ form, trace }))
}

// ── PV-8b: aorist / imperfect (research/37 §2–3) ───────────────────────────────────────────────
export interface OesPast { tense: 'aorist' | 'imperfect'; id: string; ending: string; cite: Evidence }
const AOR = Q('ENC', 'http://litopys.org.ua/ukrmova/um152.htm', 'сигматичний … знахъ | знахомъ, 3 ос. зна | знаша; новий … несохъ | несохомъ, 3 ос. несе | несоша; У давньорус. мові … (сътворихъ, видѣхъ) … (рѣкохъ, несохъ, идохъ)')
const IMP = Q('WUK', 'https://uk.wikipedia.org/wiki/Імперфект', 'шляхом додавання закінчень -ахъ, -аше до основ інфінітива, якщо вона закінчувалася на -а чи -ѣ, тобто: зна-ти > зна-ахъ, видѣ-ти > видѣ-аше; писахъ, писаше, писаховѣ, писахомъ, писаху')
const flat = (s: string) => s.normalize('NFC').toLowerCase().replace(/[ъь]/g, '').replace(/ѣ/g, 'е').replace(/[ыі]/g, 'и').replace(/[ѧꙗ]/g, 'я').replace(/[ѹꙋ]/g, 'у')
/**
 * A finite past-tense verb token (Stanza ORV feats Tense=Past|VerbForm=Fin — model output) whose ending is a cited aorist / imperfect ending AND whose stem agrees with the lemma's stem.
 * The stem test is the corroboration the model lemma needs (build-link.ts, BL-19): ≥ 3 shared initial letters (jers dropped, ѣ = е) covering ≥ half of the token stem.
 */
export function oesPast(raw: string, lemma: string): OesPast | undefined {
  const w = flat(raw), l = flat(lemma).replace(/(ти|чи)$/, '')
  const rules: [RegExp, OesPast['tense']][] = [
    [/(ахом|аху|яху|аше|яше|ах|ях)$/, 'imperfect'],
    [/(охом|оша|ох)$/, 'aorist'], [/(хом|ша|шя|х)$/, 'aorist'], [/[еи]$/, 'aorist'],
  ]
  for (const [re, tense] of rules) {
    const m = re.exec(w); if (!m) continue
    const stem = w.slice(0, m.index); let k = 0; while (k < stem.length && k < l.length && stem[k] === l[k]) k++
    if (k >= Math.min(3, l.length, stem.length) && k > 0 && k * 2 >= stem.length) return { tense, id: tense === 'aorist' ? 'OES-AOR' : 'OES-IMPF', ending: m[0], cite: tense === 'aorist' ? AOR : IMP }
  }
  return undefined
}

// registered so that traceSteps() (build-link.ts) can show and cite the step; AOR / IMPF are identity steps that record the tense grammeme
for (const f of OES_FOLDS) foldById[f.id] ??= { id: f.id, era: ['orv'], branch: false, cite: f.cite, apply: f.apply }
foldById['OES-AOR'] ??= { id: 'OES-AOR', era: ['orv'], branch: false, cite: AOR, apply: w => w }
foldById['OES-IMPF'] ??= { id: 'OES-IMPF', era: ['orv'], branch: false, cite: IMP, apply: w => w }
