/**
 * SPEC 63 DB-2 — the badge of a lemma with its MAIN chip: the region of the earliest reliable attestation (core/first-region.ts), then the secondary chips. Pure.
 *
 *   main       «перша фіксація: Волинь, 1566» + the link to that witness; when several regions share the first year each is a main chip marked «одночасно» (no region wins by the order of the data);
 *              thin evidence (one witness in the region, or the region known only from the place of publication) → the dashed hypothesis style and the word «гіпотеза»
 *   secondary  the dictionary chips (dict / place) first, with their own grade; then the other regions «Галичина, 1580», each by its own earliest year, each linking to its witness;
 *              the other signals of DB-1 (a skew of the distribution, a feature in the spelling, the CR-1 group); the old «general» chip stays neutral
 *   a dictionary that names a dialect different from the earliest region: both are shown, and both popovers say so
 * A lemma with no reliable attestation in a real region keeps the DB-1 chips unchanged.
 */
import { D } from './evidence.ts'
import { badgeChips, groupShort, hyp, isDialectRegion, type BadgeChip, type BadgeInput } from './dialect-badge.ts'
import { markByKey, markKeyOf } from './coats.ts'
import { pickFirst, witnessHref, yearText, type FrEntry, type FrRow } from './first-region.ts'

export interface FirstInput extends BadgeInput { fr?: FrEntry }

const skippedNote = (e: FrEntry, abroad: FrRow | undefined, name: (c: string) => string): string => [
  e.o ? `не враховано ${e.o} OCR-пам’яток без вичитки (OQ)` : '', e.x ? `не враховано ${e.x} пам’яток з непевною датою` : '', e.u ? `пропущено ${e.u} пам’яток без регіону` : '',
  abroad ? `ранішу фіксацію поза Україною (${name(abroad.c).replace(/^еміграція \/ поза Україною /, '')}, ${yearText(abroad)}) не враховано: еміграція — не діалект` : '',
].filter(Boolean).join('; ')

export function badgeWithFirst(inp: FirstInput): BadgeChip[] {
  const base = badgeChips(inp), pick = pickFirst(inp.fr, inp.regionName)
  if (!pick || !inp.fr) return base
  const name = inp.regionName, lemma = inp.lemma
  const markOf = (code: string) => { const k = markKeyOf(code); return k && markByKey[k] ? { k, code: markByKey[k]!.code } : { k: undefined, code: undefined } }
  const where = (r: FrRow) => `${name(r.c)}, ${yearText(r)}`
  const dictChips = base.filter(c => c.grade === 'dict' || c.grade === 'place')
  const mainCodes = pick.main.map(r => markOf(r.c).code).filter((c): c is string => !!c)
  const differs = dictChips.filter(c => !(c.code && mainCodes.includes(c.code)))
  const skip = skippedNote(inp.fr, pick.skippedAbroad, name)
  const evidenceOf = (r: FrRow) => D('CORPUS', witnessHref(r.w), `${name(r.c)}: найраніше надійне свідчення ${yearText(r)} (${r.w}); надійних пам’яток у регіоні: ${r.n}`)
  const common = (r: FrRow) => `регіон — це місце, де пам’ятку написано чи надруковано, як його знають наші дані, а не діалектна мітка слова; пам’ятка «${r.w}», ${yearText(r)}; надійних пам’яток слова в регіоні: ${r.n}${r.p ? '; регіон встановлено лише за місцем видання' : ''}`

  const mains = pick.main.map((r): BadgeChip => {
    const m = markOf(r.c), eq = pick.simul ? ' · одночасно' : ''
    const dnote = differs.length ? `. Словник називає слово «${differs.map(c => c.text).join(', ')}», а найраніша фіксація — ${name(r.c)}: це різні відомості, обидві показано` : ''
    const basis = `найраніша надійна фіксація слова в наших даних: ${common(r)}${pick.simul ? `; ще ${pick.main.length - 1} ${pick.main.length === 2 ? 'регіон має' : 'регіони мають'} той самий перший рік — їх показано нарівні` : ''}${skip ? `. ${skip}` : ''}${dnote}`
    const extra = { role: 'main' as const, year: yearText(r), witness: r.w, href: witnessHref(r.w), ...(pick.simul ? { simul: true as const } : {}) }
    if (pick.thin) return { ...hyp(`перша фіксація — ${where(r)}${eq}`, m.code, m.k ? [m.k] : [], basis, [evidenceOf(r)], 'first', lemma), ...extra }
    return { grade: 'corpus', text: `перша фіксація: ${where(r)}${eq}`, ...(m.code ? { code: m.code } : {}), marks: m.k ? [m.k] : [], basis, evidence: [evidenceOf(r)], signal: 'first', ...extra }
  })
  const seconds = pick.secondary.map((r): BadgeChip => {
    const m = markOf(r.c), thin = r.n === 1 || r.p === 1
    const basis = `інша фіксація, пізніша за головну (${where(pick.main[0]!)}): ${common(r)}`
    const extra = { role: 'secondary' as const, year: yearText(r), witness: r.w, href: witnessHref(r.w) }
    if (thin) return { ...hyp(where(r), m.code, m.k ? [m.k] : [], basis, [evidenceOf(r)], 'first', lemma), ...extra }
    return { grade: 'corpus', text: where(r), ...(m.code ? { code: m.code } : {}), marks: m.k ? [m.k] : [], basis, evidence: [evidenceOf(r)], signal: 'first', ...extra }
  })
  // the dictionary chips keep their grade and say that they differ from the earliest region, when they do
  const dicts = dictChips.map(c => (differs.includes(c) ? { ...c, role: 'secondary' as const, basis: `${c.basis}. Найраніша фіксація слова в наших даних — ${where(pick.main[0]!)}: це різні відомості, обидві показано` } : { ...c, role: 'secondary' as const }))
  const rest = base.filter(c => c.grade !== 'dict' && c.grade !== 'place' && c.grade !== 'none' && !(c.grade === 'hyp' && c.signal === 'corpus')).map(c => ({ ...c, role: 'secondary' as const }))
  // an old distribution chip of the same region as the main one would only repeat it
  const mainText = new Set(pick.main.map(r => name(r.c)))
  const rest2 = rest.filter(c => !(c.grade === 'corpus' && !c.signal && [...mainText].some(n => c.text.endsWith(n))))
  return [...mains, ...dicts, ...seconds, ...rest2]
}
export { groupShort, isDialectRegion }
