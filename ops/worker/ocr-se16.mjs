#!/usr/bin/env node
/**
 * SPEC 63 SE-16: column-aware re-OCR of the owner-supplied ЕСУМ scans (esum1..6.pdf). The SE-14 run used Tesseract `--psm 3`, which on about a third of the
 * two-column pages reads the two columns line by line («…паски ковдра», [дьбрга\ «тс.» Л, ст. 110; Schuster-Sewc…»). Here the gutter is found from the ink profile of a
 * 100-dpi render (the longest low-ink run in the middle third of the body band), the page is cut there with `pdftoppm -x -W` at 300 dpi and each column is read with `--psm 4`.
 * Output `<out>/esum<v>/page_NNNN.txt` = running head left, running head right, blank line, left column, blank line, right column, printed page number (last line, when read).
 * © policy: the text stays on the worker / in the git-ignored data/raw; never git, never CDN. Resumable (an existing non-empty page file is skipped), nice 19, OMP_THREAD_LIMIT=4, PAR pages at once.
 * Usage (one process per shard, PAR of them, `ops/worker/ocr-se16.sh` starts them): SHARD=0..PAR-1 SE14=~/work/se14-ocr OUT=~/work/se16-ocr PAR=4 nohup node ops/worker/ocr-se16.mjs [vols 1..6] > ~/logs/se16-ocr.out 2>&1 &
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SE14 = process.env.SE14 ?? join(process.env.HOME, 'work/se14-ocr'), OUT = process.env.OUT ?? join(process.env.HOME, 'work/se16-ocr'), PAR = Number(process.env.PAR ?? 4), SHARD = Number(process.env.SHARD ?? 0)
const env = { ...process.env, TESSDATA_PREFIX: join(SE14, 'tessdata'), OMP_THREAD_LIMIT: '4' }
const LANG = 'ukr+rus+lat+grc+deu'
const run = (cmd, args) => execFileSync('nice', ['-n', '19', cmd, ...args], { env, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 })

/** x (in 100-dpi pixels) of the gutter between the two columns, and the width/height of the render */
export function gutter(pgm) {
  const m = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(pgm.subarray(0, 40).toString('latin1')); if (!m) return undefined
  const w = +m[1], h = +m[2], off = pgm.length - w * h
  const y0 = Math.floor(h * 0.1), y1 = Math.floor(h * 0.92), band = y1 - y0, ink = new Array(w).fill(0)
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (pgm[off + y * w + x] < 150) ink[x]++
  const lim = band * 0.012, from = Math.floor(w * 0.33), to = Math.floor(w * 0.67)
  let best = { len: 0, at: -1 }, run = 0
  for (let x = from; x <= to; x++) {
    if (ink[x] <= lim) { run++; if (run > best.len) best = { len: run, at: x - Math.floor(run / 2) } } else run = 0
  }
  if (best.len < 5) { // no clean gutter: the smoothed minimum of the middle third
    let mn = Infinity, at = Math.floor(w / 2)
    for (let x = from; x <= to - 8; x++) { let s = 0; for (let k = 0; k < 8; k++) s += ink[x + k]; if (s < mn) { mn = s; at = x + 4 } }
    best = { len: 0, at }
  }
  return { w, h, x: best.at, len: best.len }
}
const tess = img => run('tesseract', [img, 'stdout', '-l', LANG, '--psm', '4']).toString('utf8')
const paras = t => t.replace(/\r/g, '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)

function page(v, i) {
  const p = String(i).padStart(4, '0'), dir = join(OUT, `esum${v}`), file = join(dir, `page_${p}.txt`)
  if (existsSync(file) && readFileSync(file).length) return
  const tmp = join(dir, `tmp_${p}`), pdf = join(SE14, `esum${v}.pdf`)
  try {
    const small = run('pdftoppm', ['-r', '100', '-gray', '-f', String(i), '-l', String(i), pdf]).toString('latin1')
    const g = gutter(Buffer.from(small, 'latin1'))
    if (!g) return
    const sc = 3, gx = g.x * sc, W = g.w * sc, H = g.h * sc, texts = []
    for (const [name, x, wid] of [['L', 0, gx], ['R', gx, W - gx]]) {
      run('pdftoppm', ['-r', '300', '-gray', '-f', String(i), '-l', String(i), '-x', String(x), '-y', '0', '-W', String(wid), '-H', String(H), '-png', pdf, `${tmp}${name}`])
      const img = execFileSync('sh', ['-c', `ls ${tmp}${name}*.png | head -1`]).toString().trim()
      texts.push(tess(img)); rmSync(img, { force: true })
    }
    const [L, R] = texts.map(paras)
    // the running heads: the first short single-word paragraph of each column
    const head = a => (a.length && /^\S{1,24}$/.test(a[0].split('\n')[0]) && !a[0].includes('\n') ? a.shift() : '')
    const hl = head(L), hr = head(R)
    // the printed page number: a lone 1-4 digit line at the start or end of a column
    let no = ''
    for (const a of [R, L]) for (const k of [0, a.length - 1]) if (!no && a[k] && /^\d{1,4}$/.test(a[k])) { no = a[k]; a.splice(k, 1) }
    const body = [hl, hr, '', ...L.flatMap(s => [s, '']), ...R.flatMap(s => [s, '']), no].join('\n')
    writeFileSync(`${file}.tmp`, body); renameSync(`${file}.tmp`, file)
  } catch (e) { console.error(`esum${v} p${i}: ${e.message?.slice(0, 80)}`) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const vols = process.argv.slice(2).map(Number).filter(Boolean); if (!vols.length) vols.push(1, 2, 3, 4, 5, 6)
  for (const v of vols) {
    mkdirSync(join(OUT, `esum${v}`), { recursive: true })
    const info = execFileSync('pdfinfo', [join(SE14, `esum${v}.pdf`)]).toString(), N = +/Pages:\s+(\d+)/.exec(info)[1]
    console.log(new Date().toISOString(), `esum${v}: ${N} pages`)
    if (process.env.PAGES) { for (const i of process.env.PAGES.split(',').map(Number)) page(v, i); continue }   // a test run on chosen pages
    for (let i = SHARD + 1; i <= N; i += PAR) page(v, i)
    console.log(new Date().toISOString(), `esum${v} done`)
    if (SHARD === 0) writeFileSync(join(OUT, `esum${v}`, 'DONE.shard0'), '')
  }
}
