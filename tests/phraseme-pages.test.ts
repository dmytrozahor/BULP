import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { collectEvidence, detailShardOf, phraseId, phraseKey, phraseVariants, relatedBy, syntaxPattern, type PhrasesDetailShard } from '../core/phraseme-pages.ts'
import type { PhraseDoc, Phraseme } from '../core/phrasemes.ts'
import { harvestKaikkiPhrases } from '../pipelines/phrase-dict.ts'
import type { Kwic } from '../core/types.ts'

const ph = (lemmas: string[], score = 1): Phraseme => ({ lemmas, spellings: [], f: 3, witnesses: [], nW: 2, families: [], nF: 2, dates: [1100, 1200], score, method: 'collocation+archaism', components: { logDice: 1, mi: 1, pre1400: 1, pre1600: 1, old: 1, archaism: 1, witnesses: 2, families: 2 } })
const doc = (wid: string, date: [number, number], keys: number[]): PhraseDoc => ({ wid, date, old: true, keys, seg: keys.map(() => 0) })

describe('PH-1 phraseme page components', () => {
  it('PH-1 id is stable across case, stress and apostrophe variants and differs for other words', () => {
    expect(phraseId(['ахіллесова', "п'ята"])).toBe(phraseId(['Ахіллесо́ва', 'п’ята']))
    expect(phraseId(['біла', 'ворона'])).not.toBe(phraseId(['біла', 'ворона', 'x']))
    expect(phraseId(['~грѣхъ', 'ради'])).toMatch(/^p[0-9a-f]{10}$/)
    expect(phraseKey(['~Грѣхъ', 'Ради'])).toBe('грѣхъ ради')
    expect(detailShardOf(phraseId(['a', 'b']))).toMatch(/^[0-9a-f]$/)
  })
  it('PH-1 syntactic pattern is computed from component POS and is unknown (undefined) when any POS is missing', () => {
    expect(syntaxPattern(['прикметник', 'іменник, ж.р.'])).toBe('Adj+N')
    expect(syntaxPattern(['прийменник', 'іменник, ч.р.'])).toBe('Prep+N')
    expect(syntaxPattern(['прикметник', ''])).toBeUndefined()
    expect(syntaxPattern([])).toBeUndefined()
  })
  it('PH-1 kaikki harvest quotes a gloss with source, licence and locator; a phraseme without an entry gets nothing', () => {
    const kk = harvestKaikkiPhrases(process.cwd())
    if (!kk.size) return   // raw dump not present
    const e = kk.get(phraseKey(['точка', 'зору']))?.[0]
    expect(e?.gloss[0]).toMatchObject({ licence: 'CC BY-SA 4.0' })
    expect(e?.gloss[0]?.loc).toContain('senses[0].glosses')
    expect(kk.get(phraseKey(['цього', 'нема', 'ніде']))).toBeUndefined()
  }, 180000)
  it('PH-1 built detail shards: ids are unique and every quoted statement has a source and a locator', () => {
    const dir = 'public/data/phr'
    if (!existsSync(dir)) return
    const seen = new Set<string>(); let quoted = 0
    for (const f of readdirSync(dir)) {
      const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as PhrasesDetailShard
      for (const [id, d] of Object.entries(j.details)) {
        expect(seen.has(id), id).toBe(false); seen.add(id); expect(detailShardOf(id) + '.json').toBe(f)
        for (const q of [...(d.gloss ?? []), ...(d.etymology ?? []), ...(d.tags ?? []), ...(d.synonyms ?? [])]) { quoted++; expect(q.src && q.loc && q.licence, id).toBeTruthy() }
      }
    }
    expect(seen.size).toBeGreaterThan(10); expect(quoted).toBeGreaterThan(0)
  })
})

describe('PH-2 corpus evidence of a phraseme', () => {
  const kw = (wi: number, ti: number, n: number): Kwic => ({ w: 'w' + wi, loc: String(ti), left: '', node: 'n' + n, right: '', date: [1000 + wi * 100, 1050 + wi * 100] })
  it('PH-2 counts every occurrence, merges per century, keeps the earliest witness and caps the concordance', () => {
    const p = ph(['a', 'b'])
    const docs = [doc('w0', [1000, 1050], [0, 1, 9, 0, 1]), doc('w1', [1100, 1150], [0, 1]), doc('w2', [1200, 1250], [0, 9, 1])]
    const ev = collectEvidence(docs, new Map([[p, [0, 1]]]), kw, 2).get(p)!
    expect(ev.n).toBe(3); expect(ev.byCentury).toEqual({ 11: 2, 12: 1 })
    expect(ev.earliest).toMatchObject({ w: 'w0' }); expect(ev.kwic.length).toBe(2)
  })
  it('PH-2 a phraseme that is absent from the corpus has no evidence record (shown as «невідомо»)', () => {
    const p = ph(['a', 'b'])
    expect(collectEvidence([doc('w0', [1000, 1050], [0, 9, 1])], new Map([[p, [0, 1]]]), kw).has(p)).toBe(false)
  })
  it('PH-2 component-order and lexical variants are found among the other phrasemes', () => {
    const p = ph(['з', 'щит']), swap = ph(['щит', 'з']), lex = ph(['на', 'щит']), other = ph(['біла', 'ворона'])
    const v = phraseVariants(p, [p, swap, lex, other])
    expect(v.order).toEqual([swap]); expect(v.lexical.length).toBe(1)
  })
})

describe('PH-3 phraseme relations', () => {
  it('PH-3 related phrasemes share a content component and are ranked by score; short function words do not relate', () => {
    const p = ph(['біла', 'ворона']), a = ph(['біла', 'хата'], 2), b = ph(['на', 'хата'], 5), c = ph(['чорна', 'ворона'], 1)
    expect(relatedBy(p, [p, a, b, c])).toEqual([a, c])
  })
  it('PH-3 /p/:id is routed and the page marks missing data as «невідомо» and scores as a model', () => {
    expect(readFileSync('src/router.ts', 'utf8')).toContain("path: '/p/:id'")
    const v = readFileSync('src/views/PhraseView.vue', 'utf8')
    expect(v).toContain('невідомо'); expect(v).toContain('це оцінка моделі, а не словниковий факт')
    expect(readFileSync('src/views/PhrasesView.vue', 'utf8')).toContain('phraseTo(')
    expect(readFileSync('src/components/PhrasePanel.vue', 'utf8')).toContain('phraseTo(')
    expect(readFileSync('src/components/Kwic.vue', 'utf8')).toContain('phraseTo(')
  })
})
