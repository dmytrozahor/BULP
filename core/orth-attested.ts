/**
 * SPEC 63 MM-45 (owner: «чому в нас нема після переключення на старі правописи "ирод" замість "ірод"?»): ATTESTED initial и- spellings for the ORTHOGRAPHY view.
 *
 * Why: a modern word that begins with і- may have been written и- in the old orthographies (ірод: Грінченко «Ирод», Желехівський «Иро́д»). The forward rule
 * (core/orth-forward.ts ORTH-ZHEL-INIT-I) knows this only from a proto-Slavic *i- (инший < *inъ); a loanword has no proto, so the letter stayed «і?».
 * Instead of guessing, a dictionary written in or near the orthography is read: when it PRINTS the headword with initial и where the modern word has і-,
 * that spelling is the evidence (locator + verbatim quote from the r2u article, kind Q).
 *
 * Mapping dictionary -> orthography view:
 *  - Желехівський 1886 (r2u dict 21) -> `zhel`: the dictionary is written in the Желехівка itself (it created it for this work: ЕУМ um17, core/orthography.ts ZHEL).
 *  - Грінченко 1907–09 (r2u dict 12) -> `kul`: Грінченко's spelling is a DESCENDANT of кулішівка (the repo has no fold table or quote for it: R2U_DICTS gives it
 *    the era 'r2u', not 'кулішівка'), so this mapping is OURS and the evidence says so in its note; the spelling itself (the printed headword) is a verbatim quote.
 *  - максимовичівка (1827) has no dictionary in the repo: unchanged («і?»). ярижка: its own rule ORTH-YAR-I already gives и.
 *
 * Pure: the rows come from data/work/r2u-rows.json (pipelines/ingest-r2u.ts), the lemma filter from the caller.
 */
import type { Evidence } from './evidence.ts'

export type OaOrth = 'kul' | 'zhel'
export interface OaCite { /** the headword as the dictionary prints it (stress marks removed, lower case) */ form: string; /** SE-13: the modern lemma the spelling belongs to (the edit modern -> form is replayed on its forms) */ mod?: string; ev: Evidence }
export type OaEntry = Partial<Record<OaOrth, OaCite>>
export interface OaFile { format: 1; generated: string; entries: Record<string, OaEntry> }
export const OA_DICTS: { dict: number; orth: OaOrth; short: string; page: string }[] = [
  { dict: 21, orth: 'zhel', short: 'Желехівський 1886', page: 'https://r2u.org.ua/html/zheleh_details.html' },
  { dict: 12, orth: 'kul', short: 'Грінченко 1907–09', page: 'https://r2u.org.ua/html/hrinchenko_pro.html' },
]
export const OA_RULE = 'ORTH-ATT-INIT-I'
const NOTE: Record<OaOrth, string> = {
  zhel: 'Словник Желехівського (1886) писаний желехівкою; ЕУМ «Желехівка»: «буква и на початку слова читалась як [і]».',
  kul: 'Правопис Грінченка — нащадок кулішівки; це зіставлення НАШЕ (у сховищі немає цитати, що прирівнює їх), саме написання — цитата зі словника.',
}

const strip = (s: string) => s.normalize('NFC').replace(/[́]/g, '').toLowerCase()
export interface OaRow { dict: number; rowId: number | string; head: string[]; text: string; q: string; scope: string }

/** modern і- lemma -> the old и- spelling a dictionary prints for it; `have` says which modern lemmas exist */
export function attestedInitI(rows: Iterable<OaRow>, have: (lemma: string) => boolean): Record<string, OaEntry> {
  const out: Record<string, OaEntry> = {}
  for (const r of rows) {
    const d = OA_DICTS.find(x => x.dict === r.dict); if (!d) continue
    const q = strip(r.q)
    for (const h0 of r.head) {
      const h = strip(h0).replace(/[’ʼ]/g, "'")
      if (h.length < 3 || h[0] !== 'и' || !/^[\p{L}'-]+$/u.test(h)) continue
      const mod = 'і' + h.slice(1)
      // the row was found by looking up exactly this word (modern or old spelling): a cross-reference or a different article is never taken
      if (q !== mod && q !== h) continue
      if (!have(mod)) continue
      // «Иде́я … s. Іде́я»: the article only POINTS to the і- spelling, which is then the real headword; not an attestation of и-
      const t = strip(r.text)
      if (['s. ', 'см. ', 'vgl. '].some(p => { const i = t.indexOf(p + mod); return i >= 0 && !/\p{L}/u.test(t[i + p.length + mod.length] ?? ' ') })) continue
      const e = out[mod] ??= {}
      if (e[d.orth]) continue
      const ev: Evidence = { source: 'R2U', quote: r.text.slice(0, 300), locator: `${d.page} · ${d.short}, s?w=${r.q}#${r.dict}_${r.rowId}`, kind: 'Q', note: NOTE[d.orth] }
      e[d.orth] = { form: h, mod, ev }
    }
  }
  return out
}

export const OA_HEAD_RULE = 'ORTH-ATT-HEAD'
/**
 * SE-13: the ONE contiguous edit that turns the modern lemma into the attested spelling (common prefix and suffix trimmed), replayed on a form of the same lemma.
 * The lemma itself becomes the attested spelling exactly. A form takes the edit only if it starts with the edit's left context, the replaced letters and two letters of the unchanged tail
 * (so ірода -> ирода, сміху -> сьміху, but not імла) and the edit does not touch the end of the lemma (an ending such as -є is not a stem fact). null = no edit.
 */
export function attestedEdit(mod: string, form: string, w: string): { s: number; e: number; to: string } | null {
  if (mod === form) return null
  let p = 0; while (p < mod.length && p < form.length && mod[p] === form[p]) p++
  let q = 0; while (q < mod.length - p && q < form.length - p && mod[mod.length - 1 - q] === form[form.length - 1 - q]) q++
  const from = mod.slice(p, mod.length - q), to = form.slice(p, form.length - q)
  if (w === mod) return { s: p, e: p + from.length, to }
  if (q === 0) return null
  const ctx = mod.slice(0, p + from.length) + mod.slice(mod.length - q, mod.length - q + Math.min(2, q))
  return w.startsWith(ctx) ? { s: p, e: p + from.length, to } : null
}

/** SE-13 input row (data/work/zhel-parsed.json): a gated article of the full 1886 print */
export interface OaZhelIn { h: string; lm: string; q: string; v: number; p: string; lf: number }
export const ZHEL_IA = (v: number, lf: number) => `https://archive.org/details/zhelekhivsk${v}/page/n${lf}`
/** every modern lemma gets the headword spelling the 1886 print gives it (also when it equals the modern one), cite = the article (verbatim OCR slice) and the scan page */
export function attestedFromZhel(arts: Iterable<OaZhelIn>, have: (lemma: string) => boolean): Record<string, OaEntry> {
  const out: Record<string, OaEntry> = {}
  for (const a of arts) {
    const mod = strip(a.lm).replace(/[’ʼ]/g, "'"); if (!mod || !have(mod) || out[mod]?.zhel) continue
    const ev: Evidence = { source: 'ZHEL1886', quote: a.q.slice(0, 300), locator: `${ZHEL_IA(a.v, a.lf)} · Желехівський–Недільський 1886, т. ${a.v}${a.p ? ', с. ' + a.p : ''}`, kind: 'Q', note: 'Заголовне слово друку 1886 р. (желехівка); цитата — OCR archive.org, не вичитаний; сучасна лема підтверджена ВЕСУМ через зворотні правила желехівки.' }
    ;(out[mod] ??= {}).zhel = { form: a.h, mod, ev }
  }
  return out
}
