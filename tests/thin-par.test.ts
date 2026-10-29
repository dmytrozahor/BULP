/** SPEC 63 CP-9: the VESUM-paradigm sidecar of the lemmas without a full card (core/thin-par.ts, pipelines/build-thin-par.ts): data shape on a fixture in VESUM visual format. */
import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PAR_BUCKETS, PAR_HOMONYMS, ParBuilder, parBucket, parOfShard, type ParShard } from '../core/thin-par.ts'
import { scanVesum } from '../pipelines/vesum.ts'
import { thinParFiles, writeThinPar } from '../pipelines/build-thin-par.ts'

const FIXTURE = [
  'абажур noun:inanim:m:v_naz', '  абажур noun:inanim:m:v_naz', '  абажура noun:inanim:m:v_rod', '  абажури noun:inanim:p:v_naz',
  'мати noun:anim:f:v_naz', '  мати noun:anim:f:v_naz', '  матері noun:anim:f:v_rod',
  'мати verb:imperf:inf', '  мати verb:imperf:inf', '  маю verb:imperf:pres:s:1',
  'вода noun:inanim:f:v_naz', '  вода noun:inanim:f:v_naz', '  води noun:inanim:f:v_rod',
  'нині adv', 'Київ noun:inanim:m:v_naz:prop:geo', '  Київ noun:inanim:m:v_naz:prop:geo', '  Києва noun:inanim:m:v_rod:prop:geo',
]
const build = async (skip: string[] = []) => { const b = new ParBuilder(new Set(skip)); await scanVesum(FIXTURE, e => b.add(e)); return b }
const shardOf = (m: Map<number, ParShard>, k: string) => m.get(parBucket(k))

describe('CP-9 thin-lemma VESUM paradigm sidecar', () => {
  it('CP-9 every VESUM lemma without a full card gets its paradigm, tags verbatim, in the shard of lk(lemma)', async () => {
    const m = (await build()).finish()
    const abazhur = parOfShard(shardOf(m, 'абажур'), 'Абажур')!
    expect(abazhur).toHaveLength(1)
    expect(abazhur[0]!.lemma).toBe('абажур'); expect(abazhur[0]!.tags).toBe('noun:inanim:m:v_naz')
    expect(abazhur[0]!.paradigm.map(p => `${p.form} ${p.tags}`)).toEqual(['абажур noun:inanim:m:v_naz', 'абажура noun:inanim:m:v_rod', 'абажури noun:inanim:p:v_naz'])
    expect(parOfShard(shardOf(m, 'київ'), 'київ')![0]!.lemma).toBe('Київ')   // proper names are found by the folded key, the written lemma is kept
    expect(PAR_BUCKETS).toBe(1024); for (const k of m.keys()) expect(k).toBeLessThan(PAR_BUCKETS)
  })
  it('CP-9 homonyms of one key stay apart (мати n / v), an indeclinable head is a paradigm of its head line, a lemma VESUM lacks has no entry', async () => {
    const m = (await build()).finish(), mati = parOfShard(shardOf(m, 'мати'), 'мати')!
    expect(mati.map(x => x.tags)).toEqual(['noun:anim:f:v_naz', 'verb:imperf:inf']); expect(mati.length).toBeLessThanOrEqual(PAR_HOMONYMS)
    expect(parOfShard(shardOf(m, 'нині'), 'нині')![0]!.paradigm).toEqual([])
    expect(parOfShard(shardOf(m, 'неіснуєслово'), 'неіснуєслово')).toBeUndefined(); expect(parOfShard(undefined, 'вода')).toBeUndefined()
  })
  it('CP-9 a lemma that has a full card is skipped (its paradigm is in the lexicon); forms share one tag table per shard', async () => {
    const b = await build(['вода', 'Київ']), m = b.finish()
    expect(parOfShard(shardOf(m, 'вода'), 'вода')).toBeUndefined(); expect(parOfShard(shardOf(m, 'київ'), 'київ')).toBeUndefined(); expect(parOfShard(shardOf(m, 'абажур'), 'абажур')).toBeDefined()
    const s = shardOf(m, 'абажур')!; expect(new Set(s.tags).size).toBe(s.tags.length)
  })
  it('CP-9 writeThinPar writes data/work/thinpar/<bucket>.json atomically, replaces an older run, and reports sizes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'thinpar-'))
    try {
      const s = await writeThinPar(root, FIXTURE, ['вода'])
      expect(s.lemmas).toBe(5); expect(s.forms).toBeGreaterThan(5); expect(s.gzBytes).toBeGreaterThan(0)
      const files = thinParFiles(root); expect(files).toHaveLength(s.shards)
      expect(readdirSync(join(root, 'data/work')).filter(f => f.endsWith('.next'))).toEqual([])
      const j = JSON.parse(readFileSync(join(root, 'data/work/thinpar', `${parBucket('абажур')}.json`), 'utf8')) as ParShard
      expect(j.format).toBe(1); expect(parOfShard(j, 'абажур')).toBeDefined()
      await writeThinPar(root, ['нині adv'], [])   // second run replaces the first completely
      expect(thinParFiles(root)).toHaveLength(1); expect(existsSync(join(root, 'data/work/thinpar', `${parBucket('абажур')}.json`))).toBe(parBucket('абажур') === parBucket('нині'))
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('CP-9 the build chain runs the step before build-parts, and build-parts shards it into lm/par', () => {
    expect(readFileSync('package.json', 'utf8')).toMatch(/build\.ts && tsx pipelines\/build-thin-par\.ts && tsx pipelines\/build-stress-src\.ts && tsx pipelines\/build-parts\.ts/)
    expect(readFileSync('pipelines/build-parts.ts', 'utf8')).toContain("fresh('lm/par')")
  })
})
