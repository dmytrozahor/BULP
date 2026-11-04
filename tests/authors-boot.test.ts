/** SPEC 63 PF-2: boot.json carries the vetting records without their evidence; authors.json brings it back (lossless), on demand. */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { AUTHORS, type Author } from '../pipelines/authors.ts'
import { authorsEvidence, fullAuthor, slimAuthors } from '../core/authors-boot.ts'
import { patchBootAuthors } from '../pipelines/boot-authors.ts'

const many: Author[] = [...AUTHORS, ...Array.from({ length: 300 }, (_, i): Author => ({ id: `hv_a${i}`, name: `Автор ${i}`, life: 'невідомо', label: 'ukrainian', status: 'provisional', confidence: 'implicit', region: 'Київ',
  evidence: [{ source: `https://uk.wikisource.org/?curid=${1000 + i}`, locator: 'заголовок сторінки джерела', quote: `автор = Автор ${i}`, kind: 'Q' } as Author['evidence'][number]], note: 'HV-3: автор взято з заголовка джерела' }))]

describe('PF-2 slim boot authors', () => {
  it('a record with evidence or a note loses both in boot and is flagged; the rest of its fields stay; a record with neither is untouched', () => {
    const slim = slimAuthors(many), bare: Author = { id: 'x', name: 'X', life: '', label: 'ukrainian', status: 'provisional', confidence: 'implicit', evidence: [] }
    expect(slimAuthors([bare])[0]).toBe(bare)
    for (const [i, a] of slim.entries()) { expect(a.id).toBe(many[i]!.id); expect(a.name).toBe(many[i]!.name); expect(a.region).toBe(many[i]!.region); expect(a.evidence).toEqual([]); expect(a.note).toBeUndefined(); expect(a.lazyEv).toBe(true) }
  })
  it('lossless: slim + authors.json = the full record, for every author', () => {
    const slim = slimAuthors(many), file = authorsEvidence(many)
    expect(slim.map(a => fullAuthor(a, file))).toEqual(many)
    expect(slim.map(a => fullAuthor(a, undefined))).toEqual(slim)   // before the file arrives: the slim record
  })
  it('the slim list is far smaller than the full one', () => {
    expect(gzipSync(JSON.stringify(slimAuthors(many))).length).toBeLessThan(gzipSync(JSON.stringify(many)).length * 0.6)
  })
  it('patchBootAuthors upgrades an existing boot.json once and is idempotent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bootau-'))
    try {
      writeFileSync(join(dir, 'boot.json'), JSON.stringify({ format: 1, N: 5, authors: many }))
      expect(patchBootAuthors(dir)).toEqual({ slimmed: many.length })
      const boot = JSON.parse(readFileSync(join(dir, 'boot.json'), 'utf8')), ev = JSON.parse(readFileSync(join(dir, 'authors.json'), 'utf8'))
      expect(boot.N).toBe(5); expect(boot.authors).toEqual(slimAuthors(many)); expect(ev).toEqual(authorsEvidence(many))
      expect(patchBootAuthors(dir)).toEqual({ slimmed: 0 })
      expect(JSON.parse(readFileSync(join(dir, 'authors.json'), 'utf8'))).toEqual(ev)   // a second run does not replace the file with an empty one
      expect(patchBootAuthors(join(dir, 'nope'))).toBeNull()
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
