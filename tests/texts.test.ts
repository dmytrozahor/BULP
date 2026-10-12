import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { textShard, writeTexts } from '../pipelines/build-texts.ts'

const w = (id: string) => ({ id, tokens: [{ raw: 'Се', loc: 'стб. 1', s: 0 }, { raw: 'повѣсти', loc: 'стб. 1', s: 0, lemma: 'повѣсть', morph: 'Nb' }] })

describe('W2-1 text shards (B-5f)', () => {
  it('shard = { id, tokens: [raw, loc, s][] } without lemma/morph', () => {
    expect(textShard(w('a'))).toEqual({ id: 'a', tokens: [['Се', 'стб. 1', 0], ['повѣсти', 'стб. 1', 0]] })
  })
  it('writeTexts writes one <id>.json per witness and replaces stale files', () => {
    const pub = mkdtempSync(join(tmpdir(), 'txt-'))
    try {
      writeTexts([w('a'), w('b')], pub); writeTexts([w('b')], pub)
      expect(readdirSync(join(pub, 'texts'))).toEqual(['b.json'])
      expect(JSON.parse(readFileSync(join(pub, 'texts', 'b.json'), 'utf8')).tokens).toHaveLength(2)
    } finally { rmSync(pub, { recursive: true, force: true }) }
  })
})
