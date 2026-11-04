/** SPEC 63 CQ-2: stale work files (tombstones), ITEM_PARAMS in every item source's marker, date plausibility (dateUncertain), archive.org metadata sidecar, composite volumes. */
import { describe, it, expect } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { witnessFrom, textTokens } from '../pipelines/ingest-harvest.ts'
import { DATE_VERIFIED, modernForDate, resolveDate, statedYears, titleRange, titleYear } from '../pipelines/date-gate.ts'
import { Incr } from '../pipelines/incr-manifest.ts'
import { metaLine } from '../harvest/archive.ts'

const ARCH = { id: 'x', url: 'https://archive.org/details/x', licence: 'PD', bytes: 1, status: 200, title: 'Книга' }
const OPTS = { lang: 'uk' as const, witnessType: 'ocr', edition: 'e', authorId: 'a', loc: 'l', dateQuote: 'q', autoOldOrth: true }
const wf = (src: string, id: string, title: string, date: string, text: string, extra: object = {}) => witnessFrom(src, { ...ARCH, title, date }, id, text, { ...OPTS, ...extra })
// modern-spelling Ukrainian (і ї є ґ above a quarter of the tokens, no ъ ѣ), as in the Soviet translations of Marx
const MODERN = Array.from({ length: 400 }, () => 'Але лише із заведенням машин робітник починає боротися проти самого засобу виробництва і його їжі та єдиної ґрунтової рєвізії').join('\n')

describe('CQ-2 fix 1: work files of items the gates skip are removed (tombstone = the skipped manifest entry)', () => {
  const setup = () => {
    const out = mkdtempSync(join(tmpdir(), 'cq2-')), inc = new Incr(out, false, () => {})
    for (const id of ['hv_ia_keep', 'hv_ia_gone', 'hv_ling_old', 'hv_ws_other']) { writeFileSync(join(out, id + '.json'), '{}'); writeFileSync(join(out, id + '.nlp.json'), '{}') }
    return { out, inc }
  }
  const manifest = (out: string, src: string, items: object) => { mkdirSync(join(out, 'ingest-manifest'), { recursive: true }); writeFileSync(join(out, 'ingest-manifest', src + '.json'), JSON.stringify({ format: 1, source: src, params: 'p', items })) }
  it('an archive work file that no manifest refers to is removed with its .nlp.json; referenced and foreign-prefix files stay', () => {
    const { out, inc } = setup()
    manifest(out, 'archive-ukr', { a: { sig: 's', wid: 'hv_ia_keep' }, b: { sig: 's', skipped: 'non-cyrillic' } })
    manifest(out, 'linguists', {})
    const gone = inc.sweepOrphans(['hv_ia_', 'hv_ling_'], ['archive-ukr', 'linguists'])
    expect(gone.sort()).toEqual(['hv_ia_gone', 'hv_ling_old'])
    expect(existsSync(join(out, 'hv_ia_gone.json'))).toBe(false); expect(existsSync(join(out, 'hv_ia_gone.nlp.json'))).toBe(false)
    expect(existsSync(join(out, 'hv_ia_keep.json'))).toBe(true); expect(existsSync(join(out, 'hv_ws_other.json'))).toBe(true)
  })
  it('nothing is removed while a needed source has no manifest (a source never ingested has no orphans), or when a manifest is torn', () => {
    const { out, inc } = setup()
    manifest(out, 'archive-ukr', {})
    expect(inc.sweepOrphans(['hv_ia_'], ['archive-ukr', 'archive-rusyn'])).toEqual([]); expect(existsSync(join(out, 'hv_ia_gone.json'))).toBe(true)
    manifest(out, 'archive-rusyn', {}); writeFileSync(join(out, 'ingest-manifest', 'hv6.json'), '{torn')
    expect(inc.sweepOrphans(['hv_ia_'], ['archive-ukr', 'archive-rusyn'])).toEqual([]); expect(existsSync(join(out, 'hv_ia_gone.json'))).toBe(true)
  })
  it('the ingest runs the sweep after the archive sources, never in a --limit run', () => {
    const src = readFileSync('pipelines/ingest-harvest.ts', 'utf8')
    expect(src).toMatch(/!ctx\.limit && \(!only \|\| ARCHIVE\.includes\(only\) \|\| only === 'linguists'\)\) ctx\.inc\.sweepOrphans\(\['hv_ia_', 'hv_ling_'\]/)
  })
})

describe('CQ-2 fix 2: ITEM_PARAMS is part of every item source marker', () => {
  it('ingest.sh keeps the gate parameters and the metadata line count in the done-marker signature; the parameters changed to gate3-cq2', () => {
    const sh = readFileSync('ops/worker/ingest.sh', 'utf8').replace(/\r\n/g, '\n')
    expect(sh).toMatch(/ITEM_PARAMS = .*pipelines\/ingest-harvest\.ts/); expect(sh).toMatch(/local sig="\$\* idx=.* \$gp meta=\$mp"/)
    expect(readFileSync('pipelines/ingest-harvest.ts', 'utf8')).toMatch(/const ITEM_PARAMS = 'gate3-cq2'/)
  })
  it('the manifest params of an archive source also carry the metadata count (a new sidecar line re-reads the source)', () => {
    expect(readFileSync('pipelines/ingest-harvest.ts', 'utf8')).toMatch(/ITEM_PARAMS \+ \(ARCHIVE\.includes\(name\) \? `\|meta=\$\{readIaMeta\(name\)\.size\}` : ''\)/)
  })
})

describe('CQ-2 fix 3: dateUncertain', () => {
  it('heuristic: dated before 1890, >= 2000 tokens, no ъ ѣ, і ї є ґ over a quarter of the tokens; a text with ъ ѣ or a later date is not touched', () => {
    const toks = MODERN.toLowerCase().split(/\s+/)
    expect(modernForDate([1867, 1867], toks)).toBe(true); expect(modernForDate([1895, 1895], toks)).toBe(false); expect(modernForDate([1867, 1867], toks.slice(0, 1500))).toBe(false)
    expect(modernForDate([1867, 1867], toks.map((t, i) => (i % 3 ? t : t + 'ъ')))).toBe(false)
  })
  it('stated years: only publisher / imprint / notes / description count, not the creator life years; one later year = the edition, the own year = confirmed, none = flag', () => {
    const kap = { id: 'k', date: '1867', description: 'Karl Marx, Das Kapital , Band I, Buch I, Kharkiv, Proletar, 1933 [Ukrainian edition].' }
    expect(statedYears(kap)).toEqual([1933]); expect(resolveDate([1867, 1867], kap)).toMatchObject({ kind: 'edition', year: 1933 })
    expect(resolveDate([1885, 1885], { id: 'p', date: '1885', year: '1885', publisher: 'Wien: G.Heinrich' }).kind).toBe('confirmed')
    expect(resolveDate([1842, 1842], { id: 'e', description: 'Харьковъ: Въ Университетской типографіи, 1842.' }).kind).toBe('confirmed')
    expect(resolveDate([1850, 1850], { id: 'c', publisher: 'Kyïv-Berlin : Ukraïnsʹka Nakladni͡a' }).kind).toBe('none')
    expect(resolveDate([1850, 1850], { id: 'c', description: 'printed 1921, reprinted 1933' }).kind).toBe('none')   // two different later years: never a guess
    expect(resolveDate([1867, 1867], undefined).kind).toBe('none')
  })
  it('an OCR witness with modern spelling under an old date and no stated edition is written with dateUncertain; counted (tokens kept), date untouched', () => {
    const w = wf('archive-ukr', 'hv_ia_marx', 'Капітал', '1867', MODERN)
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.dateUncertain?.why).toMatch(/сучасної орфографії при даті 1867/); expect(w.date).toEqual([1867, 1867]); expect(w.tokens.length).toBeGreaterThan(5000); expect(w.excludeReason).toBeUndefined() }
  })
  it('the edition year stated in the metadata replaces the date (cited), clears the flag and warns that the PD-by-date rule does not apply after 1925', () => {
    const meta = { id: 'k', date: '1867', description: 'Karl Marx, Das Kapital , Band I, Buch I, Kharkiv, Proletar, 1933 [Ukrainian edition].' }
    const w = wf('archive-ukr', 'hv_ia_kapitaltom1x', 'Kapital Tom 1', '1867', MODERN, { meta })
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.date).toEqual([1933, 1933]); expect(w.dateUncertain).toBeUndefined(); expect(w.dateCite.quote).toMatch(/1933/); expect(w.licenceNote).toMatch(/1933/) }
  })
  it('known wrong dates after the heuristic cut (Kapital vol. 2-3, dated 1893 / 1894) are resolved the same way; a confirmed or allow-listed item is not flagged', () => {
    const w = wf('archive-ukr', 'hv_ia_kapitaltom2x', 'Kapital Tom 2', '1893', MODERN)
    expect('skip' in w ? '' : w.dateUncertain?.why).toMatch(/1893/)
    const conf = wf('archive-ukr', 'hv_ia_pelesz', 'Pelesz', '1885', MODERN, { meta: { id: 'p', year: '1885', publisher: 'Wien: G.Heinrich' } })
    expect('skip' in conf).toBe(false); if (!('skip' in conf)) expect(conf.dateUncertain).toBeUndefined()
    expect(Object.keys(DATE_VERIFIED).length).toBeGreaterThan(0)
    const ver = wf('archive-ukr', Object.keys(DATE_VERIFIED)[0]!, 'Нѣмецка граматика', '1876', MODERN)
    expect('skip' in ver).toBe(false); if (!('skip' in ver)) expect(ver.dateUncertain).toBeUndefined()
  })
  it('only OCR sources are judged: a hand-transcribed wikisource page with the same text keeps its date unflagged', () => {
    const w = wf('wikisource-uk', 'hv_ws_1', 'Капітал', '1867', MODERN)
    expect('skip' in w).toBe(false); if (!('skip' in w)) expect(w.dateUncertain).toBeUndefined()
  })
  it('build: a dateUncertain witness is excluded from first attestation and epoch statistics (exc), still counted; the cards say why', () => {
    const b = readFileSync('pipelines/build.ts', 'utf8')
    expect(b).toMatch(/exc = !!oqx\?\.excluded \|\| !!w\.dateUncertain/)
    expect(readFileSync('src/views/WitnessView.vue', 'utf8')).toContain('дата невірогідна: {{ w.dateUncertain.why }}')
    expect(readFileSync('src/views/TextsView.vue', 'utf8')).toContain('дата невірогідна: {{ cur.dateUncertain.why }}')
    expect(readFileSync('src/components/Kwic.vue', 'utf8')).toContain('data-testid="date-uncertain-badge"')
    expect(readFileSync('core/types.ts', 'utf8')).toMatch(/dateUncertain\?: \{ why: string \}/)
  })
})

describe('CQ-2 fix 4: composite volumes and issue years', () => {
  it('«(1914-1918)» with the metadata date 1914 gives the range and the flag (issue unknown); other titles are untouched', () => {
    expect(titleRange('Ранок; Канадійський ранок = Canadian Morning (1914-1918)', [1914, 1914])).toEqual([1914, 1918])
    expect(titleRange('Canadian Morning (1918-1923)', [1914, 1914])).toBeNull(); expect(titleRange('Svoboda 1902', [1902, 1902])).toBeNull()
    const w = wf('archive-ukr', 'hv_ia_ranok', 'Ранок; Канадійський ранок = Canadian Morning (1914-1918)', '1914-01-01', 'Прівнає пори і мість сишьоватого вигляду вістане сі молоде касує. '.repeat(40))
    expect('skip' in w).toBe(false)
    if (!('skip' in w)) { expect(w.date).toEqual([1914, 1918]); expect(w.dateUncertain?.why).toMatch(/1914–1918.*номер випуску невідомий/) }
  })
  it('an issue that states its year in the title while the metadata date is a wide range gets that year (cited); a narrow date is not touched', () => {
    expect(titleYear('Peremysʹkì Eparhìâlʹnì Vìdomostì. Rik 1934, č. 1', [1889, 1939])).toBe(1934)
    expect(titleYear('Bukovina. R. 13, č. 49 (1897)', [1890, 1900])).toBe(1897); expect(titleYear('Bukovina (1897)', [1897, 1897])).toBeNull()
    const w = wf('archive-ukr', 'hv_ia_pev', 'Peremysʹkì Eparhìâlʹnì Vìdomostì. Rik 1934, č. 1', '1889-1939', Array.from({ length: 40 }, () => 'Нашу Церковь свята і наш народ, молимо Бога про благодать і поміч, щоби наш').join(String.fromCharCode(10)))
    expect('skip' in w).toBe(false); if (!('skip' in w)) { expect(w.date).toEqual([1934, 1934]); expect(w.dateCite.quote).toMatch(/Rik 1934/) }
  })
})

describe('CQ-2 harvester: the metadata sidecar', () => {
  it('metaLine keeps the fields that can state an edition, strips HTML, cuts long text; a 404 is a missing line (not fetched again)', () => {
    const l = metaLine('abc', { date: '1867', publisher: 'Wien', description: '<div>Karl Marx</div> <b>1933</b> ' + 'x'.repeat(2000), creator: 'Marx (1818-1883)', subject: ['a'] })
    expect(Object.keys(l).sort()).toEqual(['date', 'description', 'id', 'publisher']); expect(String(l.description)).toMatch(/^Karl Marx 1933/); expect(String(l.description).length).toBeLessThanOrEqual(800)
    expect(metaLine('zzz', undefined)).toEqual({ id: 'zzz', missing: true })
  })
  it('archive.ts has the --meta mode, paced like the other fast modes, and the ingest lists the flagged items without metadata', () => {
    const a = readFileSync('harvest/archive.ts', 'utf8'); expect(a).toContain("process.argv.includes('--meta')"); expect(a).toMatch(/'--retry-404'.*'--meta'/)
    expect(readFileSync('pipelines/ingest-harvest.ts', 'utf8')).toContain('date-flagged.json')
  })
  it('textTokens is unchanged by CQ-2: Ukrainian lines keep their tokens', () => {
    expect(textTokens('Він читав книгу', 'l').tokens.length).toBe(3)
  })
})
