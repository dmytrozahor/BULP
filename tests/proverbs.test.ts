/** SPEC 63 GG-19 — phraseology gap: Номис (1864) and Франко (Етнографічний збірник) proverbs from the archive.org OCR. Fixtures are short invented-free excerpts shaped like the real djvu text (quoted from the scans fetched 2026-11-01). */
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { EvidenceError } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import { abbrKey, charGate, cleanName, fixCounty, foldCandidates, locatorOf, normWs, parseFranko, parseNomis, parseRegistry, placeNote, proverbWords, splitTail } from '../core/proverbs.ts'
import { IA_TITLE, PROV_SOURCE, phrClaim, type PhrRow } from '../core/synphr.ts'
import { PROVERB_WORKS, proverbItem } from '../harvest/proverbs.ts'
import { combine, writeSynPhr, type Stage } from '../pipelines/build-synphr.ts'
import { loadProverbInputs, modernise, stageProverbs } from '../pipelines/build-proverbs.ts'
import PhraseologyBlock from '../src/components/PhraseologyBlock.vue'

const REGISTER = `Наг. -г- Нагуевичі, село дрогобицького пов.

Зав. Завад. — Завадів, село стрийського пов.

Ж и д а ч. — Жидачів, місто жидачівського пов.

Ном. — Українські приказки, прислівя і таке иньше, зібрав М. Номис. С. Петербург 1864.
`
const FRANKO = `Азбука. 1. Бийте, бийте по азбуцї 1 (Наг.)

Жартобливо, коли хтось замазує сліди свого лихого вчинка.

2. Приложи сї до азбуки, будуть повні кишенї і руки. (Коб.)

Наука доводить до достатку.

— 2 —

Ч. 25—31.

Або—або. 1. Або ти, або Я, або дівка моя. (Наг.)

Війшла в приповідку звичайна поговірка.

3. Адукат готовому дивит си. (Зав.)

Се б то адвокат дивить ся лише на готові гроші.

4. Кревні сн: їх дїди на одній печи гріли ся. (Яс. С.)

— 3 —
`
const NOMIS = `Передмова, таблиця скорочень…

1. Хто за ВІРУ умірає, той собі царство
заробляє. Лаз.

2. Невірний гірш Жида, або Турка. Просте.

(*) Який. Лит.

Коли сіно в стозі, то забув о Бозі. Пл.

Чоловік стріляє, а Біг кулі носить. Ил.,
Бан., Б.

10. Як би не Бог — хто б нам помігі Просте.

Загадки 1—505.

1. Кого Бог ніколи не побачить? (такого як сам). Е.
`
const VESUM = `азбука noun:inanim:f:v_naz
 азбуки noun:inanim:f:v_rod
 азбуці noun:inanim:f:v_dav
бити verb:imperf:inf
 бийте verb:imperf:impr:p:2
приложитися verb:perf:inf
 приложися verb:perf:impr:s:2
до prep
за prep
хто noun:anim:&pron:int
собі noun:&pron:refl:v_dav
і conj:coord
бути verb:imperf:inf
 будуть verb:imperf:futr:p:3
кишеня noun:inanim:f:v_naz
 кишені noun:inanim:f:v_rod
рука noun:inanim:f:v_naz
 руки noun:inanim:f:v_rod
повний adj:m:v_naz
 повні adj:p:v_naz
вірити verb:imperf:inf
 вірою noun:inanim:f:v_oru
віра noun:inanim:f:v_naz
 віру noun:inanim:f:v_zna
умирати verb:imperf:inf
 умірає verb:imperf:pres:s:3
царство noun:inanim:n:v_naz
 царство noun:inanim:n:v_zna
заробляти verb:imperf:inf
 заробляє verb:imperf:pres:s:3
бог noun:anim:m:v_naz
 бог noun:anim:m:v_naz
 бозі noun:anim:m:v_mis
сіно noun:inanim:n:v_naz
 сіно noun:inanim:n:v_zna
стіг noun:inanim:m:v_naz
 стозі noun:inanim:m:v_mis
коли conj:subord
той adj:m:v_naz:&pron
 той adj:m:v_naz:&pron
ти noun:unanim:&pron:pers:2
Іван noun:anim:m:v_naz:prop:fname
`

describe('GG-19 the harvest and the sources', () => {
  it('harvest/proverbs.ts lists only items that archive.org returned; each index line carries licence, URL and the death year behind it; etnohr_23 (no text layer) is recorded as 404, never read', () => {
    expect(PROVERB_WORKS.map(w => w.ia)).toEqual(['nomis1864', 'etnohr_10', 'etnohr_16', 'etnohr_23', 'etnohr_24', 'etnohr_27', 'etnohr_28'])
    for (const w of PROVERB_WORKS) { const it = proverbItem(w, 10, 200, 'x'); expect(it.url).toBe(`https://archive.org/details/${w.ia}`); expect(it.licence).toContain(`† ${w.death}`); expect(w.death).toBeLessThanOrEqual(1955); expect(it.ocr).toBe(true) }
    const h = readFileSync('harvest/proverbs.ts', 'utf8'); expect(h).toContain('IA_UA'); expect(h).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i); expect(h).toContain('delayMs: 3000')
    const sx = readFileSync('data/raw/ia-proverbs/SOURCES.txt', 'utf8'); expect(sx).toContain('https://archive.org/download/nomis1864/nomis1864_djvu.txt'); expect(sx).toContain('etnohr_23'); expect(sx).toContain('NO text layer')
  })
  it('both collections are in SOURCES (public-domain note, archive.org URL) and in the evidence mapping', () => {
    for (const id of Object.values(PROV_SOURCE)) { expect(SOURCES[id]!.url).toContain('archive.org/details/'); expect(SOURCES[id]!.license).toContain('PD') }
    for (const w of PROVERB_WORKS.filter(w => w.ia !== 'etnohr_23')) expect(IA_TITLE[w.ia], w.ia).toBeTruthy()
  })
})

describe('GG-19 Франко: the register of abbreviations and the place note', () => {
  const reg = parseRegistry(REGISTER)
  it('places are read from «abbr — name, село/місто X-ського пов.»; a spaced-letter abbreviation is joined; books and sources are not places', () => {
    expect(reg.get('наг')).toMatchObject({ name: 'Нагуевичі', county: 'дрогобицький', kind: 'place' })
    expect(reg.get('зав')).toMatchObject({ name: 'Завадів', county: 'стрийський' }); expect(reg.get('завад')).toMatchObject({ name: 'Завадів' })
    expect(reg.get(abbrKey('Жидач'))).toMatchObject({ name: 'Жидачів', county: 'жидачівський' })
    expect(reg.has('ном')).toBe(false)
  })
  it('a county is repaired by at most one OCR letter and only when one county fits; a place name loses the leading dash and the spaced letters', () => {
    expect(fixCounty('жндачівський')).toBe('жидачівський'); expect(fixCounty('львіський')).toBe('львівський'); expect(fixCounty('якийсьськиймайже')).toBeUndefined(); expect(fixCounty('xyz')).toBeUndefined()
    expect(cleanName('- Нагуевичі')).toBe('Нагуевичі'); expect(cleanName('Ж и дачі в')).toBe('Жи дачів'); expect(cleanName('1 2')).toBeUndefined()
  })
  it('placeNote: grade p = a place of the register (name + county), u = anything else (OCR damage, a book, a collector); nothing is inferred', () => {
    expect(placeNote('Наг', reg)).toMatchObject({ gr: 'p', n: 'Нагуевичі', c: 'дрогобицький', ar: 'halychyna' })
    expect(placeNote('Коб', reg)).toEqual({ a: 'Коб', gr: 'u' }); expect(placeNote('Яс', reg).gr).toBe('u')
  })
})

describe('GG-19 Франко: the entries', () => {
  const rows = parseFranko(FRANKO, 'etnohr_10')
  it('«Headword. N. text (place.)»: the text stops at the place note, the headword is inherited by the numbered entries below it, the commentary is not part of the proverb', () => {
    expect(rows.map(r => [r.hw, r.no, r.text])).toEqual([
      ['Азбука', 1, 'Бийте, бийте по азбуцї 1'], ['Азбука', 2, 'Приложи сї до азбуки, будуть повні кишенї і руки.'],
      ['Або—або', 1, 'Або ти, або Я, або дівка моя.'], ['Або—або', 3, 'Адукат готовому дивит си.'], ['Або—або', 4, 'Кревні сн: їх дїди на одній печи гріли ся.']])
    expect(rows[0]!.note).toEqual(['Наг']); expect(rows[4]!.note).toEqual(['Яс', 'С'])
  })
  it('the printed page is the next «— N —» foot line, within a page of text; the locator names volume, page, headword and number', () => {
    expect(rows[0]!.page).toBe(2); expect(rows[1]!.page).toBe(2); expect(rows[2]!.page).toBe(3)
    expect(locatorOf(rows[1]!)).toBe('ЕЗ т. 10, с. 2, «Азбука» 2')
  })
  it('the quote is the verbatim OCR slice (text + place note), never longer than 280 characters', () => { expect(rows[0]!.quote).toBe('Бийте, бийте по азбуцї 1 (Наг.)'); for (const r of rows) expect(r.quote.length).toBeLessThanOrEqual(280) })
})

describe('GG-19 Номис: the entries', () => {
  const rows = parseNomis(NOMIS)
  it('the body ends at the riddles; an entry ends at the line that ends in source abbreviations («Ил., Бан., Б.»); a footnote line and an entry without a tail are dropped', () => {
    expect(rows.map(r => r.text)).toEqual(['Хто за ВІРУ умірає, той собі царство заробляє.', 'Невірний гірш Жида, або Турка.', 'Коли сіно в стозі, то забув о Бозі.', 'Чоловік стріляє, а Біг кулі носить.', 'Як би не Бог'])
    expect(rows[3]!.note).toEqual(['Ил', 'Бан', 'Б']); expect(rows.some(r => /Кого Бог/.test(r.text))).toBe(false)
  })
  it('« — » splits the variants of one entry; the printed number is exact only on the entry that carries it, the others say «після №N» and that the count is approximate', () => {
    expect(rows[4]!.variants).toEqual(['хто б нам помігі']); expect(rows[4]!.nomis).toMatchObject({ n: 10, exact: true })
    expect(rows[0]!.nomis).toMatchObject({ n: 1, exact: true }); expect(rows[2]!.nomis).toMatchObject({ n: 2, exact: false })
    expect(locatorOf(rows[0]!)).toBe('Ном. №1'); expect(locatorOf(rows[2]!)).toContain('після друкованого №2'); expect(locatorOf(rows[2]!)).toContain('наближена')
  })
  it('splitTail keeps the text before a capitalised abbreviation list and refuses a line without one', () => { expect(splitTail('Знає пес середу. ІІл.')?.note).toEqual(['ІІл']); expect(splitTail('просто речення без підпису')).toBeUndefined() })
})

describe('GG-19 the OCR quality gate and the spelling folds', () => {
  it('charGate: Cyrillic and punctuation only, 2+ words, no mid-word capitals, no digits, no Latin, length 8–300', () => {
    expect(charGate('Бог усе видат.')).toBe(true); expect(charGate('Бийте, бийте по азбуцї 1')).toBe(false); expect(charGate('Ай вай, борухай, ІІир')).toBe(false)
    expect(charGate('Говорит, аж дїру в животі вертиг*')).toBe(false); expect(charGate('Щ щур.')).toBe(false); expect(charGate('Bog is god')).toBe(false); expect(charGate('Гонори-перли!')).toBe(false)
    expect(charGate('а'.repeat(310) + ' б')).toBe(false)
  })
  it('foldCandidates: ї→і, -цця→-ться, «ть ся» glued by proverbWords; modernise keeps unknown words as printed and the initial capital', () => {
    expect(foldCandidates('азбуцї')).toContain('азбуці'); expect(foldCandidates('вживаюцця')).toContain('вживаються'); expect(foldCandidates('кінчицця')).toContain('кінчиться')
    expect(proverbWords('Вчи сї азбуки, кінчить ся')).toEqual(['Вчися', 'азбуки', 'кінчиться'])
    const known = new Set(['вчися', 'азбуці', 'азбуки'])
    const pick = (w: string) => foldCandidates(w).find(f => known.has(f))
    expect(modernise('Вчи сї азбуцї, нікому', pick)).toBe('Вчися азбуці, нікому'); expect(normWs('кіль¬\nка  слів')).toBe('кілька слів')
  })
})

describe('GG-19 the build stage: gates, lemma links, evidence, counts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg19-'))
  const vesum = join(dir, 'vesum.txt'); writeFileSync(vesum, VESUM)
  const inputs = [{ ia: 'etnohr_10', src: 'franko' as const, text: REGISTER + '\n' + FRANKO + '\n5. Бийте руки. (Наг.)\n' }, { ia: 'nomis1864', src: 'nomis' as const, text: NOMIS }]
  it('rows are filed under the content lemmas of VESUM (own headword without x, other lemmas x=1); pronouns, proper names and auxiliaries link nothing; the original spelling stays in p and the VESUM spelling goes to m', async () => {
    const { phr, stats } = await stageProverbs(inputs, vesum)
    const az = phr['азбука']!; expect(az.length).toBe(1); expect(az[0]).toMatchObject({ d: 'f', k: 'p', s: 'etnohr_10', l: 'ЕЗ т. 10, с. 2, «Азбука» 2' }); expect(az[0]!.x).toBeUndefined()
    expect(az[0]!.p).toBe('Приложи сї до азбуки, будуть повні кишенї і руки.'); expect(az[0]!.m).toContain('кишені'); expect(az[0]!.q).toContain('(Коб.)')
    expect(phr['рука']!.find(r => r.d === 'f')!.x).toBe(1); expect(phr['віра']!.find(r => r.d === 'n')).toMatchObject({ x: 1, l: 'Ном. №1' })
    expect(Object.keys(phr)).not.toContain('той'); expect(Object.keys(phr)).not.toContain('іван'); expect(Object.keys(phr)).not.toContain('бути')
    expect(stats.kept.nomis).toBeGreaterThan(0); expect(stats.registryPlaces).toBe(4)
  })
  it('the vocabulary gate drops a row whose words VESUM mostly does not know and counts it; the rejected share is reported per source', async () => {
    const bad = { ia: 'nomis1864', src: 'nomis' as const, text: '1. Хто за ВІРУ умірає, той собі царство заробляє. Лаз.\n\n2. Цюцюрюрю бабабабу фуфуфу бозі. Ст.\n' }
    const { stats } = await stageProverbs([bad], vesum)
    expect(stats.candidates.nomis).toBe(2); expect(stats.kept.nomis).toBe(1); expect(stats.vocabRejected.nomis).toBe(1); expect(stats.rejectedShare.nomis).toBe(0.5)
  })
  it('the place note of a Франко row is graded: Наг → place with county (grade p); Яс. С. → not in the register (grade u); no dialect group is asserted', async () => {
    const { phr, stats } = await stageProverbs(inputs, vesum)
    const r = phr['азбука']![0]!; expect(r.pl).toEqual([{ a: 'Коб', gr: 'u' }])
    const povni = phr['повний']![0]!; expect(povni.pl).toEqual([{ a: 'Коб', gr: 'u' }])
    expect(phr['бити']![0]!.pl![0]).toMatchObject({ a: 'Наг', n: 'Нагуевичі', c: 'дрогобицький', gr: 'p' }); expect(stats.placeResolved).toBe(1); expect(stats.placeUnresolved).toBe(1)
    expect(JSON.stringify(phr)).not.toMatch(/"(?:ar|group)"/)
  })
  it('every row passes core/evidence.ts claim() through phrClaim: source, non-empty locator, non-empty quote; a row without a locator or a quote is an EvidenceError', async () => {
    const { phr } = await stageProverbs(inputs, vesum)
    for (const [head, rows] of Object.entries(phr)) for (const r of rows) { const c = phrClaim(head, r); expect(c.evidence[0]!.source).toBe(PROV_SOURCE[r.d as 'n' | 'f']); expect(c.evidence[0]!.locator.length).toBeGreaterThan(3); expect(c.evidence[0]!.quote.length).toBeGreaterThan(5); expect(SOURCES[c.evidence[0]!.source]).toBeTruthy() }
    const row: PhrRow = { p: 'Бог усе видат.', k: 'p', d: 'f', s: 'etnohr_28' }
    expect(() => phrClaim('бог', row)).toThrow(EvidenceError); expect(() => phrClaim('бог', { ...row, l: 'ЕЗ т. 28' })).not.toThrow()
  })
  it('writeSynPhr reads the harvest (index.jsonl + items/*.gz), caches the stage atomically (reused on a rerun, torn cache rebuilt), caps rows per headword and counts the new headwords', async () => {
    const raw = mkdtempSync(join(tmpdir(), 'gg19b-')), hd = join(raw, 'data/raw/harvest/ia-proverbs')
    mkdirSync(join(hd, 'items'), { recursive: true }); mkdirSync(join(raw, 'data/raw/vesum'), { recursive: true })
    writeFileSync(join(raw, 'data/raw/vesum/dict_corp_vis.txt'), VESUM)
    writeFileSync(join(hd, 'items/nomis1864.gz'), gzipSync(NOMIS)); writeFileSync(join(hd, 'items/etnohr_23.none.gz'), gzipSync(''))
    writeFileSync(join(hd, 'index.jsonl'), [{ id: 'proverbs:nomis1864', status: 200, iaItem: 'nomis1864', source: 'nomis' }, { id: 'proverbs:etnohr_23', status: 404, iaItem: 'etnohr_23', source: 'franko' }].map(x => JSON.stringify(x)).join('\n') + '\n')
    const saved = process.env.HARVEST_DIR; delete process.env.HARVEST_DIR
    try {
      expect(loadProverbInputs(join(raw, 'data/raw/harvest')).inputs.map(i => i.ia)).toEqual(['nomis1864'])
      const st = await writeSynPhr(raw, raw, () => false)
      const phr = JSON.parse(readFileSync(join(raw, 'data/work/phr.json'), 'utf8'))
      expect(phr['віра'][0]).toMatchObject({ d: 'n', k: 'p', x: 1 }); expect(st.prov!.rows).toBeGreaterThan(0); expect(st.prov!.newHeads).toBe(st.prov!.heads); expect(st.inputs.proverbs!.pages).toBe(5)
      expect(st.prov!.stage.rejectedShare).toBeDefined()
      const cache = join(raw, 'data/work/synphr-proverbs.json'), m1 = readFileSync(cache, 'utf8')
      await writeSynPhr(raw, raw, () => false); expect(readFileSync(cache, 'utf8')).toBe(m1)
      writeFileSync(cache, '{"v":1,"src":"prov'); await writeSynPhr(raw, raw, () => false); expect(JSON.parse(readFileSync(cache, 'utf8')).src).toBe('proverbs')
    } finally { if (saved !== undefined) process.env.HARVEST_DIR = saved }
  })
  it('combine caps the printed rows per headword (own-headword first, then shortest) next to the Wiktionary rows, which keep their own cap', () => {
    const many: PhrRow[] = Array.from({ length: 40 }, (_, i) => ({ p: 'а'.repeat(i + 3) + ' бе', k: 'p', d: 'f', l: 'ЕЗ т. 10', s: 'etnohr_10', ...(i % 2 ? { x: 1 as const } : {}) }))
    const st: Stage = { v: 1, src: 'proverbs', bytes: 1, pages: 40, syn: {}, phr: { слово: many } }
    const wk: Stage = { v: 1, src: 'ukwikt', bytes: 1, pages: 1, syn: {}, phr: { слово: [{ p: 'вираз', k: 'f', d: 'u' }] } }
    const r = combine([wk, st], () => false)
    expect(r.phr['слово']!.filter(x => x.d === 'f').length).toBe(15); expect(r.phr['слово']!.filter(x => x.d === 'u').length).toBe(1)
    expect(r.stats.prov).toMatchObject({ rows: 15, heads: 1, withWikt: 1, newHeads: 0, capped: 25 })
    expect(r.stats.phrDistinct).toBe(1)
  })
  it('the main build already runs the step (GG-12/GG-13 wiring), now with the proverbs stage; the work file is sharded by build-parts as before', () => {
    const b = readFileSync('pipelines/build.ts', 'utf8'); expect(b).toContain('writeSynPhr(ROOT, ROOT'); expect(b).toContain('GG-19')
    const s = readFileSync('pipelines/build-synphr.ts', 'utf8'); expect(s).toContain('stageProverbs'); expect(s).toContain('synphr-proverbs.json'); expect(s).toContain('writeJsonAtomic')
  })
})

describe('GG-19 the card block', () => {
  const html = async (props: Record<string, unknown>) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
    const app = createSSRApp({ render: () => h(PhraseologyBlock, props as never) }); app.use(router)
    return renderToString(app)
  }
  it('printed rows get their own group: original text, the modern spelling, the locator, the place of recording where the register resolves it, the archive.org source and the OCR / no-dialect-group note; Wiktionary rows stay in their groups', async () => {
    const rows: PhrRow[] = [
      { p: 'Вчи сї азбуки, прийде хліб у руки.', m: 'Вчися азбуки, прийде хліб у руки.', k: 'p', d: 'f', l: 'ЕЗ т. 16, с. 300, «Вчити» 6', s: 'etnohr_16', pl: [{ a: 'Дрог', n: 'Дрогобич', c: 'дрогобицький', gr: 'p' }] },
      { p: 'Бог перівно ділить', k: 'p', d: 'n', x: 1, l: 'Ном. №80', s: 'nomis1864' }, { p: 'альма матер', k: 'f', d: 'u' }]
    const s = await html({ word: 'азбука', rows })
    expect(s).toContain('data-testid="phrw-print"'); expect(s).toContain('Вчи сї азбуки'); expect(s).toContain('сучасним правописом: Вчися азбуки'); expect(s).toContain('ЕЗ т. 16, с. 300'); expect(s).toContain('записано: Дрогобич (дрогобицький пов.)')
    expect(s).toContain('https://archive.org/details/etnohr_16'); expect(s).toContain('https://archive.org/details/nomis1864'); expect(s).toContain('не вичитаний'); expect(s).toContain('діалектної групи ми з нього не виводимо')
    expect(s).toContain('альма матер'); expect(s).toContain('data-testid="phrw-src"')
    const only = await html({ word: 'азбука', rows: rows.slice(0, 2) }); expect(only).not.toContain('data-testid="phrw-src"'); expect(only).toContain('(2)')
  })
  it('lazy as before: the printed rows ride in the existing lm/phr shard, nothing new is loaded by the first card render', () => {
    const v = readFileSync('src/components/PhraseologyBlock.vue', 'utf8'); expect(v).not.toMatch(/import\s+(?!type)[^\n]*proverbs\.ts/); expect(v).toContain("from '../lib/synData.ts'")
  })
})
