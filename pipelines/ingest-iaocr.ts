/**
 * SPEC 63 CX-5/CX-8: archive.org OCR text (witnessType «ocr», «OCR archive.org, не вичитано»).
 * Source = the item's own `_djvu.xml` (word boxes grouped in pages) + `_page_numbers.json` (leaf → printed page), so every token has a page locator.
 * Rules (user 2026-10-15): the OCR is NOT proofread; a token is kept only when it is made of Cyrillic letters (and combining marks / apostrophe) — tokens with Latin letters,
 * digits or mixed scripts are OCR garbage: they are counted in `dropped.unmapped` and never become words. Lines with Russian-only letters (ъ ѣ э) or Russian function words are
 * dropped as apparatus in another language (language gate, `dropped.apparatus`). Linking happens later, only through VESUM or a cited fold.
 */
import type { WitnessOut, TokenRec } from '../core/types.ts'
import type { Ingester, RawFile } from './ingest.ts'
import type { Unit } from './manifest.ts'

const RU = /[ъѣэЪѢ]|(^|\s)(что|это|или|который|которы\S*|быть|были|также|только|если|когда)(\s|$)/i
const OK = /^[\p{Script=Cyrillic}\p{M}'’ʼ]+$/u

export function parseOcr(xml: string, pn: { pages?: { leafNum: number; pageNumber: string }[] }, title: string): { tokens: TokenRec[]; unmapped: number; apparatus: number } {
  const printed = new Map((pn.pages ?? []).map(p => [p.leafNum, p.pageNumber]))
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0
  xml.split('<OBJECT').slice(1).forEach((obj, leaf) => {
    const lines = [...obj.matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)].map(l => [...l[1]!.matchAll(/<WORD[^>]*>([^<]*)<\/WORD>/g)].map(m => m[1]!.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')).join(' '))
    const pg = printed.get(leaf), loc = `${title}, ${pg ? `с. ${pg}` : `арк. ${leaf}`} (OCR)`
    // a word hyphenated at the end of a line is glued to the first word of the next one
    const joined: string[] = []
    for (const ln of lines) { const prev = joined[joined.length - 1]; if (prev !== undefined && /[\p{L}]-$/u.test(prev)) joined[joined.length - 1] = prev.slice(0, -1) + ln; else joined.push(ln) }
    for (const ln of joined) {
      const ws = ln.match(/[\p{L}\p{M}\p{N}'’ʼ]+/gu) ?? []
      if (RU.test(ln)) { apparatus += ws.length; continue }
      let n = 0
      for (const w of ws) { if (OK.test(w)) { tokens.push({ raw: w, loc, s }); n++ } else unmapped++ }
      if (n) s++
    }
  })
  return { tokens, unmapped, apparatus }
}

/**
 * CX-9 `split: 'signed'`: a collection whose records end with the collector's signature line («… зап. Петро Шекерик-Доників.»). Only the records signed by `signer` are kept;
 * everything else (other collectors' records, the editor's preface, footnote glosses, record titles) is dropped. Record = the paragraphs between two signature lines.
 * OCR noise: the signature is matched on the surname stem (Шекер…), the start of the body by `START` (first paragraph of the first record after the editor's preface).
 */
export interface SignedCfg { signer: RegExp; start: RegExp }
export const SIGNED: Record<string, SignedCfg> = {
  ez26_shekerik: { signer: /Шекер|Шекор/, start: /^Львів, 6\. V\. 1910/ },
}
const SIGNATURE = /(^|\s)([зв]ап|вал|Зап|Записав)\.?(\s|$)/
export function parseSigned(xml: string, pn: { pages?: { leafNum: number; pageNumber: string }[] }, title: string, cfg: SignedCfg): { tokens: TokenRec[]; unmapped: number; apparatus: number; records: number } {
  const printed = new Map((pn.pages ?? []).map(p => [p.leafNum, p.pageNumber]))
  const blocks: { text: string; lines: string[]; leaf: number }[] = []
  xml.split('<OBJECT').slice(1).forEach((obj, leaf) => {
    for (const par of obj.split('<PARAGRAPH').slice(1)) {
      const lines = [...par.matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)].map(l => [...l[1]!.matchAll(/<WORD[^>]*>([^<]*)<\/WORD>/g)].map(m => m[1]!.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')).join(' '))
      const joined: string[] = []
      for (const ln of lines) { const prev = joined[joined.length - 1]; if (prev !== undefined && /[\p{L}]-$/u.test(prev)) joined[joined.length - 1] = prev.slice(0, -1) + ln; else joined.push(ln) }
      const text = joined.join(' ').replace(/\s+/g, ' ').trim()
      if (text) blocks.push({ text, lines: joined, leaf })
    }
  })
  const from = blocks.findIndex(b => cfg.start.test(b.text)) + 1
  const tokens: TokenRec[] = []; let unmapped = 0, apparatus = 0, s = 0, records = 0
  let buf: typeof blocks = []
  const emit = (bs: typeof blocks) => {
    for (const b of bs) {
      const pg = printed.get(b.leaf), loc = `${title}, ${pg ? `с. ${pg}` : `арк. ${b.leaf}`} (OCR)`
      for (const ln of b.lines) {
        const ws = ln.match(/[\p{L}\p{M}\p{N}'’ʼ]+/gu) ?? []
        if (RU.test(ln)) { apparatus += ws.length; continue }
        let n = 0
        for (const w of ws) { if (OK.test(w)) { tokens.push({ raw: w, loc, s }); n++ } else unmapped++ }
        if (n) s++
      }
    }
  }
  for (const b of blocks.slice(Math.max(from, 0))) {
    if (b.text.length < 320 && SIGNATURE.test(b.text) && /(19\d\d|1[89]\d\d|Голов|від )/.test(b.text)) {
      if (cfg.signer.test(b.text)) { emit(buf); records++ } else apparatus += buf.reduce((n, x) => n + (x.text.match(/\p{L}+/gu)?.length ?? 0), 0)
      buf = []; continue
    }
    if (/^\s*[\d¹²³*]*\s*\)/.test(b.text)) { apparatus += b.text.split(/\s+/).length; continue }                 // footnote gloss (the editor's, not the collector's)
    if ((/^([IІVХX]+|\d+)\.\s\S/.test(b.text) || /^Володимир Гнатюк/.test(b.text)) && b.text.length < 90) { apparatus += b.text.split(/\s+/).length; continue }  // record title
    buf.push(b)
  }
  return { tokens, unmapped, apparatus, records }
}

function parse(u: Unit, files: RawFile[]): WitnessOut[] {
  const xml = files.find(f => /_djvu\.xml$/.test(f.url)), pn = files.find(f => /_page_numbers\.json$/.test(f.url))
  if (!xml) throw new Error(`${u.id}: no _djvu.xml among the fetched files`)
  const pnj = pn ? JSON.parse(pn.body.toString('utf8')) : {}
  const cfg = u.split === 'signed' ? SIGNED[u.id] : undefined
  if (u.split === 'signed' && !cfg) throw new Error(`${u.id}: no SIGNED config`)
  const r = cfg ? parseSigned(xml.body.toString('utf8'), pnj, u.title, cfg) : parseOcr(xml.body.toString('utf8'), pnj, u.title)
  return [{
    id: u.id, unit: u.id, title: u.title, author: u.author, url: u.urls[0]!.replace(/_djvu\.xml$/, '').replace('/download/', '/details/'), date: u.date, dateCite: u.dateCite, msDate: u.msDate,
    lang: u.lang, region: u.region, witnessType: u.witnessType, edition: u.edition, orth: u.orth, license: u.license,
    ...(u.dialect ? { dialect: u.dialect } : {}),
    dropped: { unmapped: r.unmapped, apparatus: r.apparatus }, tokens: r.tokens,
  }]
}
export default { parse } satisfies Ingester