/**
 * SPEC 63 CX-6 — parafia.org.ua Psalter 1643 (nw-translit.ts): the psalm verses of one kafisma page → tokens.
 * A verse is `<p><sup>n</sup> …</p>`; red rubrics (doxologies, «Алилуя», «(три́жди)», psalm titles) and the prayers after the kafisma (1715) are not read.
 * A red drop-cap initial `<font color="red">В</font>оску́ю` is a letter of the word and is kept. Stress marks (U+0301, `&iacute;` = і́) stay in `raw`
 * as SOURCE-STATED stress (core/text.ts strips them for the search key): non-normative, a modern transliterator's marks (BL-1).
 */
import type { Ingester, RawFile } from './ingest.ts'
import type { Unit } from './manifest.ts'
import type { TokenRec, WitnessOut } from '../core/types.ts'
import { words } from './ingest-izbornyk.ts'
import { witnessOf } from './ingest-torot.ts'
import { KAFISMA_FIRST, KAFISMA_SLUGS } from './nw-translit.ts'

const ENT: Record<string, string> = { iacute: 'і́', Iacute: 'І́', rsquo: '’', lsquo: '’', ndash: '–', mdash: '—', laquo: '«', raquo: '»', nbsp: ' ', amp: '&', hellip: '…', quot: '"' }
export const dec = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(\w+);/g, (m, n) => ENT[n] ?? ' ')

/** Verses of a kafisma page: [{psalm, verse, text}]; the region ends at the first «Моли́тви …» heading (prayers from the 1715 Psalter). */
export function verses(html: string, firstPsalm: number): { psalm: number; verse: string; text: string }[] {
  const body = html.slice(0, html.indexOf('class="postmetadata"') > 0 ? html.indexOf('class="postmetadata"') : undefined)   // verses are the only `<p><sup>n</sup>` paragraphs: heading markup varies, prayers have no verse numbers
  let psalm = firstPsalm
  const out: { psalm: number; verse: string; text: string }[] = []
  for (const m of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const raw = m[1]!
    const head = /^\s*Псал\S{0,3}м\s+(\d+)(?!\d)/.exec(dec(raw.replace(/<[^>]+>/g, '')).normalize('NFC').replace(/\s+/g, ' ').trim())
    if (head) { psalm = +head[1]!; continue }
    const v = /^<sup>(\d+)<\/sup>/.exec(raw); if (!v) continue
    const text = raw.replace(/^<sup>\d+<\/sup>/, '')
      .replace(/<font color="red">((?:<i>)?[^<]*(?:<\/i>)?)<\/font>/g, (_, i: string) => { const t = i.replace(/<[^>]+>/g, '').normalize('NFC'); return t.replace(/\p{M}/gu, '').length === 1 ? t : ' ' })   // drop caps kept, rubrics out
      .replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
    out.push({ psalm, verse: v[1]!, text: dec(text).normalize('NFC').replace(/\s+/g, ' ').trim() })
  }
  return out
}
export default {
  parse(u: Unit, files: RawFile[]): WitnessOut[] {
    const dropped = { unmapped: 0, apparatus: 0 }, tokens: TokenRec[] = []
    let s = 0
    for (const f of files) {
      const k = KAFISMA_SLUGS.findIndex(slug => f.url.includes(`/${slug}/`)); if (k < 0) continue
      for (const v of verses(f.body.toString('utf8'), KAFISMA_FIRST[k]!)) {
        const loc = `каф. ${k + 1}, пс. ${v.psalm}, ст. ${v.verse}`
        for (const w of words(v.text, dropped)) tokens.push({ raw: w, loc, s })
        s++
      }
    }
    console.log(`${u.id}: ${s} verses, ${tokens.length} tokens`)
    return [witnessOf(u, tokens, { dropped, licenceNote: 'ліцензія джерела (parafia.org.ua) не вказана; використано з дозволу власника проєкту 2026-10-15; транслітерація з наголосами, не оригінальна орфографія 1643' })]
  },
} satisfies Ingester
