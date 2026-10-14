/** Stream a kaikki.org JSONL dump (Polish/Russian), keep only entries whose etymology text reaches
 * Proto-Slavic / Old Polish / Old East Slavic / Old Ruthenian. Prints URL, size and SHA-256 of the raw stream. */
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { get } from 'node:https'
import { createInterface } from 'node:readline'

const [url, out] = process.argv.slice(2)
const KEEP = /Proto-Slavic|Old Polish|Old East Slavic|Old Ruthenian/
const hash = createHash('sha256')
let bytes = 0, seen = 0, kept = 0
const ws = createWriteStream(out!)
get(url!, res => {
  res.on('data', (c: Buffer) => { bytes += c.length; hash.update(c) })
  const rl = createInterface({ input: res, crlfDelay: Infinity })
  rl.on('line', line => {
    seen++
    let e: any
    try { e = JSON.parse(line) } catch { return }
    const tpl = (e.etymology_templates ?? []) as { name: string; args: Record<string, string> }[]
    if (!KEEP.test(e.etymology_text ?? '')) return
    kept++
    ws.write(JSON.stringify({
      word: e.word, lang_code: e.lang_code, pos: e.pos, etymology_text: e.etymology_text,
      etymology_templates: tpl.map(t => ({ name: t.name, args: t.args })),
      gloss: e.senses?.[0]?.glosses?.[0],
    }) + '\n')
  })
  rl.on('close', () => {
    ws.end()
    console.log(JSON.stringify({ url, out, rawBytes: bytes, rawSha256: hash.digest('hex'), seen, kept, date: new Date().toISOString().slice(0, 10) }))
  })
})
