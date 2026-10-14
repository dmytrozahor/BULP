/**
 * izbornyk.org.ua one-page-one-witness ingester (kind `izbornyk-page`) — SPEC 60 NW (W5): the XIV–XVI anthology (old14_16), the XVIII anthology (old18)
 * and Клименть Зіновіїв «Приповісти посполиті» (klyment/kly08.htm).
 *
 * > "Every page also carries the primary text as `<p class=K1>`; the editorial matter (introduction, notes, bio, «Подається за …») is `<p class=Prym>`."
 * >   — ingest-izbornyk.ts (research/06b §3), confirmed for old14_16/old18 in research/19, research/21
 * > "Orthography normalisation: ъ dropped / → о; юс → у/я; оу → у; ѳ→ф; Ђ kept; titles expanded" — research/19 (old14_00 editorial note)
 * > "Твори … подані за нормами сучасного ... Ђ переведено на «і», «ы» — на «и»" — research/21 (old18_39 «Передмова»): old18 = modernised → `orth: 'modernised'`, lexical witness only
 *
 * Method. Paragraph classes read as text: K1, K1first (poem/work headings — used for `sections`), K2, K4, V1…V6 (verse), Dia (stage directions).
 * `Ima` (speaker labels) and every Prym paragraph are editorial and are not read. Per page (PAGE_CFG) an `end` marker cuts the page at a second work
 * that is not part of the witness (e.g. Горзов after Загоровський on old14_09), `sections` keeps only named K1first-headed works
 * (e.g. the Ukrainian poems of Prokopovych on old18_01, not the Latin→Ukrainian translations), `fix:'kly'` decodes the Климентій font
 * (`<small>A</small>` = ѧ, ε = є, ω = ѡ, Latin z/s = ѕ, `(х)` = supralinear letters, U+0303 = titlo). Inline apparatus is removed with
 * ingest-izbornyk.ts `cleanParagraph` (counted in `dropped.apparatus`).
 */
import type { Ingester } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { WitnessOut } from '../core/types.ts'
import { decodeIzbornyk } from '../core/text.ts'
import { cleanParagraph, streamTokens, MARKER } from './ingest-izbornyk.ts'
import { witnessOf } from './ingest-torot.ts'

export interface PageCfg {
  /** keep only the file whose URL matches (a unit may also list a second page used only as dating/vetting evidence) */
  pick?: RegExp
  /** drop everything before the first match (a page whose first work is not part of the witness, e.g. a Greek translation before Danylo's Peregrinatsiia on old14_05) */
  start?: RegExp
  /** cut the page at the first paragraph/heading matching this (applied to the decoded page html) */
  end?: RegExp
  /** K1first headings (cleaned text) of the works to keep; paragraphs before the first heading are dropped */
  sections?: RegExp[]
  fix?: 'kly'
  /** printed locator: «с.» page, «арк.» folio */
  folio?: boolean
}
export const PAGE_CFG: Record<string, PageCfg> = {
  pripovisti: { pick: /kly08\.htm$/, fix: 'kly', folio: true },
  // old14_09: Загоровський «Духовное завѣщаніе» only; the next work («СЛОВО ЄДНОГО СТАРОГО КАРПАТОРУСКОГО БОЯРА ИМЕНЕМ ГОРЗОВА», XVI–XVIII [U]) is held back (research/19)
  i14_09: { end: /<h1[^>]*>\s*(?:<[^>]*>\s*)*СЛОВО\s/ },
  // old14_05: «Поклоненіє св. града Ієрусалима» (1531) is a translation of a Greek text — only Danylo's Ruthenian redaction «Перегринація» (h2 heading) is the witness
  i14_05b: { start: /<h2[^>]*>\s*(?:<[^>]*>\s*)*ПЕРЕГРИНАЦІЯ/ },
  // old18_01: the vernacular poems dated by the edition; «Плачет пастушок» is Russian-leaning [U], the Latin/Polish pieces are modern translations (research/21 §2)
  o18_01: { sections: [/^ЕПІНІКІОН/, /^СІЄСТЬ ПІСНЬ ПОБІДНАЯ/, /^ЗА МОГИЛОЮ РЯБОЮ/] },
  // old18_18: stop before the «Додаток для сайту «Ізборник»» (1848 print in old spelling)
  o18_18: { end: /Додаток для сайту/ },
}

const K_CLASS = /<p class="?(K1first|K1|K2|K4|V\d|Dia)"?[^>]*>([\s\S]*?)<\/p>/g
const dec = (b: Buffer) => decodeIzbornyk(new TextDecoder('windows-1251').decode(b))

/** Климентій font → letters (research/20 §1; kly08 sample «Абы м(с)цъ на м&#949;н&#949;&#768; св<SMALL>Ђ</SMALL>тивъ, а sв<SMALL>Ђ</SMALL>зды»). */
export const klyHtml = (h: string) => h
  .replace(/<small id="lyst(\d+)">\/\d+\/<\/small>/gi, (_, n) => `<strong id="page${n}">${n}</strong>`)
  .replace(/<small>A<\/small>/gi, 'ѧ')
export const klyText = (s: string) => s
  .replace(/̃/g, '҃')                                       // combining tilde = titlo
  .replace(/ε/g, 'є').replace(/ω/g, 'ѡ').replace(/Ω/g, 'Ѡ')     // before NFC: ε + acute would compose to the Greek ά-block letter
  .replace(/ψ/g, 'ѱ')                                             // «ψи годовати» = псии годовати
  .replace(/[zs]/g, 'з').replace(/[ZS]/g, 'З').replace(/x/g, 'х').replace(/X/g, 'Х').replace(/g/g, 'г')   // Latin stand-ins of the font: «zапоможε», «sвѣзды», «xата», «нѣgды»
  .normalize('NFC')
  .replace(/\(([\p{L}]{1,4})\)/gu, '$1')                         // supralinear letters «м(с)цъ» belong to the word
  .replace(/\(([^()]*)\)/g, ' $1 ')                              // editorial / explanatory parentheses: words stay, brackets go

/** Paragraphs (cleaned) and per-paragraph apparatus counts of one page; honours the unit's PageCfg. */
export function pageParagraphs(html: string, cfg: PageCfg = {}): { paras: string[]; apps: number[] } {
  const a = html.search(/<div class="dop3">/)
  let region = a < 0 ? '' : html.slice(a)
  if (cfg.start) { const b = region.search(cfg.start); if (b > 0) region = region.slice(b) }
  if (cfg.end) { const b = region.search(cfg.end); if (b > 0) region = region.slice(0, b) }
  if (cfg.fix === 'kly') region = klyHtml(region)
  const paras: string[] = [], apps: number[] = []
  let keep = !cfg.sections
  for (const m of region.matchAll(K_CLASS)) {
    if (/<a\s+href="(?!#)/.test(m[2]!)) continue                  // navigation («Попередня / Головна / Наступна»)
    const st = { app: 0 }
    let t = cleanParagraph(m[2]!, {}, st)
    if (cfg.fix === 'kly') t = klyText(t)
    if (m[1] === 'K1first' && cfg.sections) { keep = cfg.sections.some(r => r.test(t)); continue }   // work heading: switches the section, is not text
    if (!keep) continue
    if (t.replace(MARKER, '').trim()) { paras.push(t); apps.push(st.app) }
  }
  return { paras, apps }
}

export default {
  parse(u: Unit, files) {
    const cfg = PAGE_CFG[u.id] ?? {}
    const dropped = { unmapped: 0, apparatus: 0 }
    const state: { page?: string } = {}
    let s = 0
    const items = (cfg.pick ? files.filter(f => cfg.pick!.test(f.url)) : files).flatMap(f => {
      const { paras, apps } = pageParagraphs(dec(f.body), cfg)
      const r = streamTokens(paras, apps, state, s, () => dropped, (st, para) => st.page ? `${cfg.folio ? 'арк.' : 'с.'} ${st.page}` : `абз. ${para}`)
      s = r.s
      return r.items
    })
    return [witnessOf(u, items.map(i => i.rec), { dropped }) as WitnessOut]
  },
} satisfies Ingester
