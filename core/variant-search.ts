/**
 * SPEC 63 DB-3c — search offers the variant card of a typed DIALECT FORM that no real page answers, from the reverse folds the annotator already uses (core/gal-folds.ts withGal → core/gal-soft.ts):
 * the typed word is folded back to a standard candidate, the candidate must be a form of a lemma of the lexicon (the lemma index), and the FORWARD respelling of the candidate for some dialect
 * must give exactly the typed word (the forward rule that produces it). Pure; the caller supplies the lookup (the lazy lemma index) and runs it after the query has settled, off the keystroke path.
 * A word that the lexicon already knows gets no offer (a genuine standard word is never read as a dialect form). Every offer is «виведено за правилами» (a reconstruction, never an attestation).
 */
import { withGal } from './gal-folds.ts'
import { galSoftGate } from './gal-soft.ts'
import { respell, SPELL_DIALECTS } from './respell.ts'
import { key } from './text.ts'

export interface RuleOffer { form: string; code: string; of: string; rule: string }
export interface IndexHit { lemma: string }
const VERB_LEMMA = /(?:ти|тися|тись|ть)$/
/** the fold ids whose gate needs only the lemma / the index (the uncited ones — REM, I-E, I-O — are link-only candidates and never an offer) */
const OFFER_OK = (id: string) => /^ORTH-GAL-/.test(id) && !/ORTH-GAL-(REM|I-)/.test(id)

export function ruleVariantHits(typed: string, hits: (k: string) => IndexHit[], max = 3): RuleOffer[] {
  const k = key(typed.trim()); if (!k || [...k].length < 3) return []
  if (hits(k).length) return []                                   // the lexicon knows this word: no dialect reading is offered
  const out: RuleOffer[] = []
  for (const c of withGal([{ form: k, trace: [], branches: 0 }], k)) {
    const id = c.trace.find(i => i.startsWith('ORTH-GAL-')); if (!id || c.form === k || !OFFER_OK(id)) continue
    const hs = hits(key(c.form)); if (!hs.length) continue
    for (const h of hs) {
      const verb = VERB_LEMMA.test(h.lemma), tags = verb ? 'verb:imperf:pres:3' : ''
      if (!galSoftGate(id, k, tags, kk => hits(kk).length > 0, key(h.lemma))) continue
      for (const code of SPELL_DIALECTS) {
        const r = respell(c.form, code, verb ? { pos: 'verb', fin3: true } : {})
        if (key(r.text) === k && !out.some(o => o.code === code && o.of === h.lemma)) out.push({ form: typed.trim(), code, of: h.lemma, rule: id })
        if (out.length >= max) return out
      }
    }
  }
  return out
}
