/**
 * SPEC 63 PF-7 — the big site data lives on S3 + CloudFront, versioned by build; the app reads it through one URL helper.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BUILD_ID_RE, CDN_DIRS, buildIdOf, resolveDataUrl, type DataVersion } from '../core/data-dirs.ts'
import { diffObjects, diffOk, expectedObjects, listRemote, localFiles, pruneList, syncArgs, upload, verify, writePointer, type Aws } from '../pipelines/data-cdn.ts'
import { dataUrl } from '../src/lib/dataUrl.ts'
import pointer from '../src/data/data-version.json'

const V: DataVersion = { format: 1, base: 'https://d123.cloudfront.net/', buildId: '202610171230-abc1234' }
const ID = '202610171230-abc1234'

describe('PF-7 resolveDataUrl: big dirs go to <base>/data/<buildId>/…, everything else stays on Pages', () => {
  it('routes every CDN dir', () => {
    for (const d of CDN_DIRS) expect(resolveDataUrl(`./data/${d}/12.json`, V)).toBe(`https://d123.cloudfront.net/data/${ID}/${d}/12.json`)
  })
  it('keeps nested paths (lm/etymology/ab.json) and ix/index.json', () => {
    expect(resolveDataUrl('./data/lm/etymology/ab.json', V)).toBe(`https://d123.cloudfront.net/data/${ID}/lm/etymology/ab.json`)
    expect(resolveDataUrl('./data/ix/index.json', V)).toContain(`/data/${ID}/ix/index.json`)
  })
  it('leaves small committed files and foreign URLs alone', () => {
    for (const u of ['./data/boot.json', './data/phr/a.json', './data/lexicon.json', './atlas/aum2.json', './geo/historical.json', 'https://x.org/data/lex/1.json']) expect(resolveDataUrl(u, V)).toBe(u)
  })
  it('no build id (pointer not yet written), no pointer, or local mode: everything stays on ./data', () => {
    expect(resolveDataUrl('./data/lex/1.json', { ...V, buildId: '' })).toBe('./data/lex/1.json')
    expect(resolveDataUrl('./data/lex/1.json', undefined)).toBe('./data/lex/1.json')
    expect(resolveDataUrl('./data/lex/1.json', V, true)).toBe('./data/lex/1.json')
  })
  it('the app helper is local under vitest/dev (no VITE_DATA_BASE) and the committed pointer is well-formed', () => {
    expect(dataUrl('./data/lex/1.json')).toBe('./data/lex/1.json')
    expect(pointer.format).toBe(1)
    expect(pointer.base).toMatch(/^https:\/\/[a-z0-9]+\.cloudfront\.net$/)
    expect(pointer.buildId === '' || BUILD_ID_RE.test(pointer.buildId)).toBe(true)
  })
  it('buildIdOf is sortable UTC time + short sha', () => {
    expect(buildIdOf(new Date('2026-10-17T12:30:45Z'), 'abcdef1234')).toBe('202610171230-abcdef1')
    expect(BUILD_ID_RE.test(buildIdOf(new Date(), 'abcdef0'))).toBe(true)
  })
})

describe('PF-7 every loader of a CDN dir goes through the helper', () => {
  it('fetchJson, useData.get and witnessText apply dataUrl at the fetch; no other src file fetches a CDN dir directly', () => {
    const src = (p: string) => readFileSync(p, 'utf8')
    expect(src('src/lib/fetchJson.ts')).toContain('fetch(dataUrl(url))')
    expect(src('src/composables/useData.ts')).toContain('fetch(dataUrl(`./data/${name}.json`))')
    expect(src('src/lib/witnessText.ts')).toContain('fetch(dataUrl(`./data/texts/')
    const direct: string[] = []
    const re = new RegExp('fetch\\(\\s*[`\'"]\\./data/(' + CDN_DIRS.join('|') + ')/')
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|vue)$/.test(e.name) && re.test(src(p))) direct.push(p) } }
    walk('src')
    expect(direct).toEqual([])
  })
})

function fixture() {
  const data = mkdtempSync(join(tmpdir(), 'cdn-data-'))
  const put = (p: string, n: number) => { mkdirSync(join(data, p, '..'), { recursive: true }); writeFileSync(join(data, p), 'x'.repeat(n)) }
  put('lex/0.json', 10); put('lex/1.json', 20); put('texts/a.json', 30); put('texts/big.json', 50); put('lm/etymology/ab.json', 5); put('lex/.hidden', 9)
  return { data }
}
const ptrFile = (data: string) => { const p = join(data, 'ptr.json'); writeFileSync(p, JSON.stringify({ format: 1, base: 'https://x.cloudfront.net', buildId: '' })); return p }

describe('PF-7 upload script', () => {
  it('localFiles lists the CDN dirs, skips dot-files and flags big files', () => {
    const { data } = fixture()
    const f = localFiles(data, CDN_DIRS, 40)
    expect(f.map(x => `${x.dir}/${x.rel}`).sort()).toEqual(['lex/0.json', 'lex/1.json', 'lm/etymology/ab.json', 'texts/a.json', 'texts/big.json'])
    expect(f.filter(x => x.big).map(x => x.rel)).toEqual(['big.json'])
    rmSync(data, { recursive: true })
  })
  it('syncArgs: immutable cache, json type, size-only, big files excluded, glob names refused', () => {
    const a = syncArgs(ID, 'texts', ['big.json'], 'b', '/d')
    expect(a.slice(0, 2)).toEqual(['s3', 'sync']); expect(a).toContain('--size-only')
    expect(a[a.indexOf('--cache-control') + 1]).toContain('immutable'); expect(a[a.indexOf('--content-type') + 1]).toBe('application/json')
    expect(a.slice(-2)).toEqual(['--exclude', 'big.json'])
    expect(a).toContain(`s3://b/data/${ID}/texts`)
    expect(() => syncArgs('i', 'texts', ['a[1].json'])).toThrow(/glob/)
  })
  it('dry run calls no aws and does not move the pointer or write state', async () => {
    const { data } = fixture(), calls: string[][] = [], ptr = ptrFile(data)
    const r = await upload({ dryRun: true, fresh: true, data, aws: a => { calls.push(a); return '' }, pointer: ptr, state: join(data, 'st.json'), dirs: ['lex', 'texts', 'lm'] })
    expect(r.ok).toBe(true); expect(r.files).toBe(5); expect(calls).toEqual([])
    expect(JSON.parse(readFileSync(ptr, 'utf8')).buildId).toBe(''); expect(existsSync(join(data, 'st.json'))).toBe(false)
    rmSync(data, { recursive: true })
  })
  it('diffObjects / verify: missing, wrong size and unexpected objects are all reported; the manifest is allowed', () => {
    const { data } = fixture()
    const files = localFiles(data, ['lex', 'lm']), { want } = expectedObjects(ID, files, {})
    const have = new Map(want); have.set(`data/${ID}/manifest.json`, 7)
    expect(diffOk(diffObjects(want, have, k => k.endsWith('manifest.json')))).toBe(true)
    have.delete(`data/${ID}/lex/0.json`); have.set(`data/${ID}/lex/1.json`, 999); have.set(`data/${ID}/lex/zz.json`, 1)
    const d = diffObjects(want, have, k => k.endsWith('manifest.json'))
    expect(d.missing).toEqual([`data/${ID}/lex/0.json`]); expect(d.wrongSize[0]).toContain('lex/1.json'); expect(d.extra).toEqual([`data/${ID}/lex/zz.json`])
    const aws: Aws = () => [...have].map(([k, n]) => `${k}\t${n}`).join('\n')
    expect(verify(ID, { data, aws, dirs: ['lex', 'lm'], state: join(data, 'none.json') }).ok).toBe(false)
    expect(listRemote(() => 'None', ID).size).toBe(0)
    rmSync(data, { recursive: true })
  })
  it('a big file expects its gzip size; one without a recorded gzip is reported', () => {
    const { data } = fixture(), files = localFiles(data, ['texts'], 40)
    expect(expectedObjects(ID, files, { 'texts/big.json': 12 }).want.get(`data/${ID}/texts/big.json`)).toBe(12)
    expect(expectedObjects(ID, files, {}).unknownBig).toEqual(['texts/big.json'])
    rmSync(data, { recursive: true })
  })
  it('a full upload against a fake bucket verifies, writes the manifest and moves the pointer', async () => {
    const { data } = fixture(), bucket = new Map<string, number>(), ptr = ptrFile(data)
    const aws: Aws = a => {
      if (a[1] === 'sync') { const dir = a[2]!.split(/[\\/]/).pop()!; for (const f of localFiles(data, [dir], 1 << 30)) bucket.set(`data/${ID}/${dir}/${f.rel}`, f.size); return '' }
      if (a[1] === 'cp') { bucket.set(a[3]!.replace(/^s3:\/\/[^/]+\//, ''), 1); return '' }
      if (a[0] === 's3api') return [...bucket].map(([k, n]) => `${k}\t${n}`).join('\n') || 'None'
      return ''
    }
    const r = await upload({ dryRun: false, fresh: true, buildId: ID, data, aws, pointer: ptr, state: join(data, 'st.json'), dirs: ['lex', 'lm'] })
    expect(r.ok).toBe(true); expect(bucket.has(`data/${ID}/manifest.json`)).toBe(true)
    expect(JSON.parse(readFileSync(ptr, 'utf8'))).toEqual({ format: 1, base: 'https://x.cloudfront.net', buildId: ID })
    rmSync(data, { recursive: true })
  })
  it('a failed verify leaves the pointer alone (the live site keeps its data)', async () => {
    const { data } = fixture(), ptr = ptrFile(data)
    const r = await upload({ dryRun: false, fresh: true, buildId: ID, data, aws: a => (a[0] === 's3api' ? 'None' : ''), pointer: ptr, state: join(data, 'st.json'), dirs: ['lex'] })
    expect(r.ok).toBe(false); expect(JSON.parse(readFileSync(ptr, 'utf8')).buildId).toBe('')
    rmSync(data, { recursive: true })
  })
  const fakeAws = (data: string, bucket: Map<string, number>): Aws => a => {
    if (a[1] === 'sync') { const id = a[3]!.split('/')[4]!, dir = a[2]!.split(/[\\/]/).pop()!; for (const f of localFiles(data, [dir], 1 << 30)) bucket.set(`data/${id}/${dir}/${f.rel}`, f.size); return '' }
    if (a[1] === 'cp') { bucket.set(a[3]!.replace(/^s3:\/\/[^/]+\//, ''), 1); return '' }
    if (a[0] === 's3api') { const p = a[a.indexOf('--prefix') + 1]!; return [...bucket].filter(([k]) => k.startsWith(p)).map(([k, n]) => k + '\t' + n).join('\n') || 'None' }
    return ''
  }
  it('PF-7 immutability: an upload gets a fresh build id, never one reused from the pointer or a finished state, and finishing closes the state', async () => {
    const { data } = fixture(), bucket = new Map<string, number>(), ptr = ptrFile(data), st = join(data, 'st.json')
    writeFileSync(st, JSON.stringify({ buildId: ID, big: {} }))   // old-format / finished state naming a live prefix
    bucket.set(`data/${ID}/lex/old.json`, 1)
    const r = await upload({ dryRun: false, fresh: false, data, aws: fakeAws(data, bucket), pointer: ptr, state: st, dirs: ['lex', 'lm'] })
    expect(r.ok).toBe(true); expect(r.buildId).not.toBe(ID)
    expect([...bucket.keys()].filter(k => k.startsWith(`data/${ID}/`))).toEqual([`data/${ID}/lex/old.json`])   // the old prefix is untouched
    expect(JSON.parse(readFileSync(st, 'utf8'))).toMatchObject({ buildId: r.buildId, done: true })
    // a completed upload is never resumed: within the same minute the new id collides and is refused, later it is simply another id
    const r2 = await upload({ dryRun: false, fresh: false, data, aws: fakeAws(data, bucket), pointer: ptr, state: st, dirs: ['lex', 'lm'] }).catch((e: Error) => e)
    if (r2 instanceof Error) expect(r2.message).toMatch(/refusing to upload/); else expect(r2.buildId).not.toBe(r.buildId)
    rmSync(data, { recursive: true })
  })
  it('PF-7 immutability: the in-progress upload of the state file is resumed into its own half-filled prefix', async () => {
    const { data } = fixture(), bucket = new Map<string, number>(), ptr = ptrFile(data), st = join(data, 'st.json')
    writeFileSync(st, JSON.stringify({ buildId: ID, startedAt: '2026-10-18T00:00:00.000Z', big: {} }))
    bucket.set(`data/${ID}/lex/partial.json`, 1)
    // the half-filled prefix has an extra, so verify reports it, but the upload itself must not refuse
    const r = await upload({ dryRun: false, fresh: false, data, aws: fakeAws(data, bucket), pointer: ptr, state: st, dirs: ['lex', 'lm'] })
    expect(r.buildId).toBe(ID); expect(JSON.parse(readFileSync(st, 'utf8')).startedAt).toBe('2026-10-18T00:00:00.000Z')
    rmSync(data, { recursive: true })
  })
  it('PF-7 immutability: refuses a non-empty prefix that is not the in-progress upload (explicit id, --new, or no state)', async () => {
    const { data } = fixture(), bucket = new Map<string, number>([[`data/${ID}/lex/x.json`, 1]]), ptr = ptrFile(data), st = join(data, 'st.json')
    const aws = fakeAws(data, bucket), calls: string[][] = []
    for (const fresh of [true, false]) await expect(upload({ dryRun: false, fresh, buildId: ID, data, aws: a => { calls.push(a); return aws(a) }, pointer: ptr, state: st, dirs: ['lex'] })).rejects.toThrow(/refusing to upload/)
    expect(calls.every(a => a[0] === 's3api')).toBe(true)   // nothing was written
    expect(JSON.parse(readFileSync(ptr, 'utf8')).buildId).toBe('')
    rmSync(data, { recursive: true })
  })
  it('writePointer keeps the base; pruneList keeps the newest N and the live build and ignores foreign prefixes', () => {
    const { data } = fixture(), ptr = ptrFile(data)
    writePointer(ID, ptr); expect(JSON.parse(readFileSync(ptr, 'utf8')).base).toBe('https://x.cloudfront.net')
    const ids = ['202610010000-aaaaaaa', '202610020000-bbbbbbb', '202610030000-ccccccc', '202610040000-ddddddd', 'junk']
    expect(pruneList(ids, 2, undefined).sort()).toEqual(['202610010000-aaaaaaa', '202610020000-bbbbbbb'])
    expect(pruneList(ids, 2, '202610010000-aaaaaaa')).toEqual(['202610020000-bbbbbbb'])
    rmSync(data, { recursive: true })
  })
})

describe('PF-7 CI does not need the big data', () => {
  it('pages.yml no longer pulls data and fails the build above 800 MB', () => {
    const y = readFileSync('.github/workflows/pages.yml', 'utf8')
    expect(y).not.toMatch(/data:pull/); expect(y).toMatch(/du -sk dist/); expect(y).toMatch(/819200/)
  })
})
