/**
 * SPEC 63 GG — the Горох gap: dictionary-only cards from the historical dictionaries (GG-1…GG-3), a true 1/stride Wikipedia sample and streamed vocab files (GG-4), configurable ingest and the
 * separate vocab-only counter nVocab (GG-5). Fixture-level, offline.
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { DICT_SRC, dictInfo, dictSources, lk, type CvEntry } from '../core/cv.ts'
import { HIST_BY_ID, HIST_SRC } from '../core/dx-src.ts'
import { groupHist, independent, normHead, selectHist, type HistHead } from '../core/dx-hist.ts'
import { buildCv, type DictCtx } from '../pipelines/build-cv.ts'
import { vocabHeader, vocabTotals } from '../pipelines/vocab-n.ts'
import { coverageCounts, vocabCounts } from '../pipelines/build-parts.ts'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const H = (src: string, ...w: string[]): HistHead[] => w.map(word => ({ word, src }))
const none = () => undefined
const sel = (heads: HistHead[], opt: { have?: Record<string, 'do' | 'card'>; corpus?: Record<string, number> } = {}) => {
  const stats = {}, g = groupHist(heads, stats)
  return selectHist(g, cands => { for (const k of cands) if (opt.have?.[k]) return [k, opt.have[k]!] }, k => opt.corpus?.[k] ?? 0, stats)
}

describe('GG-1 every historical dictionary has its own bit, named with the period it describes', () => {
  it('GG-1 the bits are distinct powers of two above the DO bits, and DICT_SRC names each dictionary with its period', () => {
    const bits = HIST_SRC.map(s => s.bit)
    expect(new Set(bits).size).toBe(bits.length); for (const b of bits) { expect(b & (b - 1)).toBe(0); expect(b).toBeGreaterThan(8) }
    expect(DICT_SRC.length).toBe(4 + HIST_SRC.length)
    const names = dictSources(HIST_BY_ID['r2u_hrinch09']!.bit | HIST_BY_ID['timchenko']!.bit | 1)
    expect(names[0]).toBe('ВЕСУМ'); expect(names[1]).toContain('Грінченко'); expect(names[1]).toContain('1907–09'); expect(names[2]).toContain('Тимченко'); expect(names[2]).toContain('XIV–XVIII')
    expect(HIST_BY_ID['r2u_hrinch27']).toBe(HIST_BY_ID['r2u_hrinch09'])   // the 3rd edition shares the dictionary's bit
  })
  it('GG-1 the old DO sources keep their bits and names (DO-2 unchanged)', () => { expect(dictSources(1 | 2 | 4)).toEqual(['ВЕСУМ', 'r2u.org.ua', 'Пластові словники']) })
})

describe('GG-2 quality rules: nothing from an OCR line becomes a card without corroboration', () => {
  it('GG-2 a headword that fails headwordOk (century label, digits, too short) is rejected and counted', () => {
    const r = sel([...H('timchenko', 'ХУП', 'аб', 'ба6ка'), ...H('sum16', 'доброта')], { corpus: { доброта: 1 } })
    expect(r.news.map(n => n.word)).toEqual(['доброта']); expect(r.stats['Тимченко, Історичний словник українського язика']!.rejected).toBe(3)
  })
  it('GG-2 ONE OCR dictionary alone is dropped; with a corpus token no lemma claims it becomes a card and keeps the count', () => {
    expect(sel(H('sum16', 'пляшка')).news).toEqual([])
    const r = sel(H('sum16', 'пляшка'), { corpus: { пляшка: 4 } })
    expect(r.news).toEqual([{ key: 'пляшка', word: 'пляшка', mask: HIST_BY_ID['sum16']!.bit, c: 4 }])
  })
  it("GG-2 two INDEPENDENT dictionaries are enough; Матеріали are Тимченко's papers (one lineage) and do not count twice", () => {
    expect(sel([...H('timchenko', 'вигода'), ...H('sum16', 'вигода')]).news.map(n => n.word)).toEqual(['вигода'])
    const g = groupHist([...H('timchenko', 'вигода'), ...H('timchenko-materials', 'вигода')]); expect(independent([...g.values()][0]!)).toBe(1)
    expect(sel([...H('timchenko', 'вигода'), ...H('timchenko-materials', 'вигода')]).news).toEqual([])
  })
  it('GG-2 a typeset (r2u) headword needs no corroboration', () => { expect(sel(H('r2u_nikovsky', 'гопкати')).news.map(n => n.word)).toEqual(['гопкати']) })
  it('GG-2 folds dedupe across dictionaries: Желехівка «сьвято» and 1928 «свято» are ONE group with both bits, shown in the spelling of the lower rank', () => {
    const g = groupHist([...H('r2u_zheleh', 'сьвято'), ...H('r2u_nikovsky', 'свято')])
    expect(g.size).toBe(1); const x = [...g.values()][0]!
    expect(x.word).toBe('свято'); expect(x.mask).toBe(HIST_BY_ID['r2u_zheleh']!.bit | HIST_BY_ID['r2u_nikovsky']!.bit)
  })
  it('GG-2 a fold candidate that names an existing dictionary-only card MERGES its bit; an attested card is left alone; neither is a new card', () => {
    const r = sel(H('r2u_zheleh', 'сьвято', 'слово'), { have: { свято: 'do', слово: 'card' } })
    expect(r.news).toEqual([]); expect(r.merges).toEqual([['свято', HIST_BY_ID['r2u_zheleh']!.bit]])
    expect(r.stats['Желехівський, Малорусько-німецький словар']).toMatchObject({ merged: 1, inCards: 1, added: 0 })
  })
  it('GG-2 normHead: stress, case, apostrophe variants and homograph digits are removed before anything is compared', () => { expect(normHead('Сло́во2')).toBe('слово'); expect(normHead('Мя’со')).toBe("мя'со") })
})

describe('GG-3 buildCv integration: new cards are dictionary-only, name their dictionaries, store nothing but headword and source', () => {
  const vesumMap = new Map([[lk('абажур'), ['абажур', 'noun:inanim:m:v_naz'] as [string, string]]])
  const ctx = (heads: HistHead[], over: Partial<DictCtx> = {}, lemmaOf: [string, string[]][] = [], corpus: [string, number][] = []): DictCtx => {
    const stats = {}; return { vesum: vesumMap, owned: new Set(), attested: new Set(), hist: { groups: groupHist(heads, stats), lemmaOf: new Map(lemmaOf), corpus: new Map(corpus), stats }, ...over }
  }
  const run = (heads: HistHead[], over?: Partial<DictCtx>, lemmaOf?: [string, string[]][], corpus?: [string, number][]) => buildCv([], none, new Set(), () => false, undefined, undefined, ctx(heads, over, lemmaOf, corpus))
  it('GG-3 a © dictionary headword confirmed by a second dictionary gets a card of only the word + the two bits (no sense, no quote, no attestation line)', () => {
    const r = run([...H('sum16', 'ґелґотати'), ...H('timchenko', 'ґелґотати')]), e = new Map(r.entries).get('ґелґотати') as CvEntry
    expect(e[0]).toBe('ґелґотати'); expect(e[1]).toBe(''); expect(e[2]).toBe(0); expect(e[3]).toEqual([]); expect(e[4]).toEqual({ d: HIST_BY_ID['sum16']!.bit | HIST_BY_ID['timchenko']!.bit })
    const i = dictInfo(e)!; expect(i.dictOnly).toBe(true); expect(i.f).toBe(0); expect(i.earliest).toBeNull(); expect(i.sources.some(s => s.includes('1500–1650'))).toBe(true); expect(i.sources.some(s => s.includes('Тимченко'))).toBe(true)
    expect(r.stats.histNew).toBe(1)
  })
  it('GG-3 the bit joins the existing VESUM dictionary-only card (shared {d:1} is copied, never mutated), an owned or attested word gets nothing', () => {
    const r = run(H('r2u_hrinch09', 'абажур', 'слово', 'пісня'), { owned: new Set(['слово']), attested: new Set(['пісня']) })
    const m = new Map(r.entries); expect(m.get('абажур')![4]).toEqual({ d: 1 | HIST_BY_ID['r2u_hrinch09']!.bit })
    expect(m.has('слово')).toBe(false); expect(m.has('пісня')).toBe(false); expect(r.stats.histNew).toBe(0); expect(r.stats.histMerged).toBe(1)
    const again = run([]); expect(new Map(again.entries).get('абажур')![4]).toEqual({ d: 1 })
  })
  it('GG-3 a spelling VESUM knows as a FORM of a lemma is never a new card', () => {
    const r = run(H('r2u_nikovsky', 'абажури'), {}, [['абажури', ['абажур']]])
    expect(new Map(r.entries).has('абажури')).toBe(false); expect(r.stats.histNew).toBe(0)
  })
  it('GG-2 a single OCR headword corroborated by corpus tokens is a card with the count c, and the card says so (f stays 0)', () => {
    const r = run(H('shevchenko', 'гуляти'), {}, [], [['гуляти', 3]]), e = new Map(r.entries).get('гуляти') as CvEntry
    expect(e[4]).toEqual({ d: HIST_BY_ID['shevchenko']!.bit, c: 3 }); expect(dictInfo(e)!.status).toContain('невпізнані написання'); expect(dictInfo(e)!.f).toBe(0)
  })
  it('GG-3 DICT_HIST=0 switch and the loader are wired in build.ts; the report script exists', () => {
    const b = rd('pipelines/build.ts'); expect(b).toContain("process.env['DICT_HIST'] === '0'"); expect(b).toContain('histHeads(ROOT)'); expect(b).toMatch(/typeCount\[x\]! > 0/)
    expect(rd('pipelines/dx-hist-report.ts')).toContain('selectHist')
  })
})

describe('GG-4 the Wikipedia sample is a true 1/stride sample of BUNDLES, read once; vocab files are streamed', () => {
  it('GG-4 a bundle shared by many index lines is read ONCE (before: once per line), the stride picks bundles, docs = articles', async () => {
    const TMP = mkdtempSync(join(tmpdir(), 'gg-')); process.env.HARVEST_DIR = join(TMP, 'harvest')
    const ing = await import('../pipelines/ingest-harvest.ts')
    const root = process.env.HARVEST_DIR!, out = join(TMP, 'out'); mkdirSync(join(root, 'wikipedia-uk/items'), { recursive: true })
    const lines: string[] = []
    for (let b = 0; b < 4; b++) {
      const rows = [0, 1, 2].map(i => JSON.stringify({ text: `слово${'а'.repeat(b + 1)} спільне ${i}` }))
      writeFileSync(join(root, `wikipedia-uk/items/b${b}.gz`), gzipSync(rows.join('\n')))
      for (let i = 0; i < 3; i++) lines.push(JSON.stringify({ id: `wikipedia-uk:${b}${i}`, url: 'u', date: '2026-10-14', licence: 'CC BY-SA 4.0', bytes: 10, status: 200, title: 't', file: `b${b}` }))
    }
    writeFileSync(join(root, 'wikipedia-uk/index.jsonl'), lines.join('\n') + '\n')
    await ing.main(['--only', 'wikipedia-uk', '--out', out])
    const all = JSON.parse(readFileSync(join(out, 'harvest-vocab/wikipedia-uk.json'), 'utf8'))
    expect(all.docs).toBe(12); expect(all.tokens).toBe(12 * 2); expect(all.entries['спільне']).toMatchObject({ f: 12 })   // 12 articles, each counted once
    await ing.main(['--only', 'wikipedia-uk', '--wiki-stride', '2', '--out', out])
    const half = JSON.parse(readFileSync(join(out, 'harvest-vocab/wikipedia-uk.json'), 'utf8'))
    expect(half.docs).toBe(6); expect(half.entries['спільне']).toMatchObject({ f: 6 })   // bundles 0 and 2
    expect(Object.keys(half)).toEqual(['source', 'licence', 'family', 'vocabOnly', 'docs', 'tokens', 'entries', 'items'])   // header first
  })
  it('GG-4 writeVocabFile writes the same bytes as JSON.stringify and the header numbers read back without parsing the entries', async () => {
    const ing = await import('../pipelines/ingest-harvest.ts'), TMP = mkdtempSync(join(tmpdir(), 'gg-')), p = join(TMP, 'x.json')
    const header = { source: 'x', licence: 'L "q"', family: 'uk', vocabOnly: true, docs: 7, tokens: 123 }, entries = { 'а': { f: 2, docs: 1 }, 'б"': { f: 3, docs: 2, first: '2026-01' } }
    ing.writeVocabFile(p, header, entries, [{ id: 1 }])
    expect(readFileSync(p, 'utf8')).toBe(JSON.stringify({ ...header, entries, items: [{ id: 1 }] }))
    expect(vocabHeader(readFileSync(p, 'utf8').slice(0, 4096))).toEqual({ source: 'x', tokens: 123, docs: 7, family: 'uk' })
  })
})

describe('GG-5 ingest parameters are configurable; N and the vocab-only count are reported SEPARATELY', () => {
  it('GG-5 env.sh exposes the stride and the HPLT limit, ingest.sh uses them and re-reads a source whose parameters changed', () => {
    const env = rd('ops/worker/env.sh'), ing = rd('ops/worker/ingest.sh')
    expect(env).toContain('BULP_WIKI_STRIDE="${BULP_WIKI_STRIDE:-1}"'); expect(env).toContain('BULP_HPLT_LIMIT="${BULP_HPLT_LIMIT:-0}"')
    expect(ing).toContain('--wiki-stride "$BULP_WIKI_STRIDE"'); expect(ing).toContain('--limit "$BULP_HPLT_LIMIT"'); expect(ing).not.toContain('--wiki-stride 100'); expect(ing).not.toContain('--limit 40')
    expect(ing).toContain('echo "$*" > $D/$s'); expect(ing).toContain('[ "$(cat $D/$s)" = "$*" ]')
  })
  it('GG-5 nVocab sums the vocab-only tokens of data/work/harvest-vocab, leaves out the other language family, and is 0 without the folder', () => {
    const work = mkdtempSync(join(tmpdir(), 'gg-')); mkdirSync(join(work, 'harvest-vocab'))
    const f = (s: string, fam: string, tokens: number) => writeFileSync(join(work, 'harvest-vocab', s + '.json'), JSON.stringify({ source: s, licence: 'L', family: fam, vocabOnly: true, docs: 3, tokens, entries: { a: { f: 1, docs: 1 } }, items: [] }))
    f('wikipedia-uk', 'uk', 1000); f('hplt', 'uk', 250); f('gramoty', 'east-slavic-comparative', 99)
    writeFileSync(join(work, 'harvest-vocab', 'torn.json'), '{"source":"to')
    const t = vocabTotals(work); expect(t.nVocab).toBe(1250); expect(t.sources.map(s => s.source)).toEqual(['gramoty', 'hplt', 'wikipedia-uk'])
    expect(vocabCounts(work)).toEqual({ nVocab: 1250, vocabSources: [['gramoty', 99], ['hplt', 250], ['wikipedia-uk', 1000]] })
    expect(vocabTotals(join(work, 'nope')).nVocab).toBe(0)
  })
  it('GG-5 boot.json carries N (full text) and nVocab as two fields; the Corpus page prints both apart and says vocab-only is not in N; coverageCounts is unchanged', () => {
    const bp = rd('pipelines/build-parts.ts'), cv = rd('src/views/CorpusView.vue'), ud = rd('src/composables/useData.ts'), parts = rd('core/parts.ts')
    expect(bp).toContain('...vocabCounts('); expect(parts).toContain('nVocab?: number'); expect(ud).toContain('nVocab: b.nVocab')
    expect(cv).toContain('corpus.N'); expect(cv).toContain('corpus.nVocab'); expect(cv).toContain('не входять до N')
    expect(coverageCounts(1)).toEqual({ nAttested: 1, nDictOnly: 0 })
  })
})
