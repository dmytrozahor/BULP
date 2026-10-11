import { describe, it, expect } from 'vitest'
import { parseProiel } from '../pipelines/ingest-torot.ts'
import { parseVerses, verseTokens, chapterLinks } from '../pipelines/ingest-vira.ts'
import { cleanParagraph, streamTokens, partOf, adYear, marker, findInsider, dateRange, words, pageParas, CUTS } from '../pipelines/ingest-izbornyk.ts'
import { decodeVira, decodeIzbornyk, normalizeOld } from '../core/text.ts'

const tally = () => ({ unmapped: 0, apparatus: 0 })

describe('M-2.4 TOROT tokens keep lemma / morphology / citation-part', () => {
  const xml = `<proiel><source><div><sentence id="10" status="reviewed">
    <token id="1" form="Се" citation-part="0.1" lemma="се" part-of-speech="I-" morphology="---------n" relation="voc"/>
    <token id="2" form="повѣсти" citation-part="0.1" lemma="повѣсть" part-of-speech="Nb" morphology="-p---fn--i"/>
    <token id="3" empty-token-sort="V" relation="pred"/>
  </sentence><sentence id="11"><token id="4" form="Слава" lemma="слава" part-of-speech="Nb" morphology="-s---fn--i"/></sentence></div></source></proiel>`
  const t = parseProiel(xml)
  it('skips empty tokens', () => expect(t.map(x => x.raw)).toEqual(['Се', 'повѣсти', 'Слава']))
  it('morph = pos + morphology, loc = citation-part else sentence id, s = sentence index', () => {
    expect(t[1]).toEqual({ raw: 'повѣсти', loc: '0.1', s: 0, lemma: 'повѣсть', morph: 'Nb -p---fn--i' })
    expect(t[2]).toMatchObject({ loc: '11', s: 1 })
  })
})

describe('M-2.1 віра.укр verse parse + UstavUCS3 decode', () => {
  const html = `<div class="bible-verse row"><div id="john-cs-ar-1:1" data-link="x" class="verse-number"> 1 </div>
    <div class="verse-body   cs-ostr"><span class="arch-capital">И</span>скони бэ слово. и слово бэ отъ бога.</div></div>
    <div id="matt-cs-ar-1:1" class="verse-number">1</div><div class="verse-body cs-arch">Книгы р9ства iс7ъ хв7а. Q?ъ</div>
    <div id="matt-cs-ar-14:28" class="verse-number">28</div><div class="verse-body cs-arch">ити къ себе<sup title="Описка, <span class='cs-arch'>тебе</span>" data-bs-toggle="tooltip">*</sup> по водамъ.</div>`
  const vs = parseVerses(html)
  it('finds verses and strips the capital span', () => expect(vs.map(v => v.text)).toEqual(['Искони бэ слово. и слово бэ отъ бога.', 'Книгы р9ства iс7ъ хв7а. Q?ъ', 'ити къ себе по водамъ.']))
  it('counts editorial <sup> notes', () => expect(vs.map(v => v.notes)).toEqual([0, 0, 1]))
  it('decodes э→ѣ, z→ѧ, U→ѹ, t→ѿ, w→ѡ', () => expect(decodeVira('бэ сz сUдU tвэща iw7нъ')).toBe('бѣ сѧ сѹдѹ ѿвѣща іѡ҃нъ'))
  it('letter+titlo glyphs: ©=с҃, ™=т҃, ¦=х҃, l=л҃, digits=titlo', () => {
    expect(decodeVira('х©ъ м™ри д¦а гlя iс7ъ')).toBe('хс҃ъ мт҃ри дх҃а гл҃ꙗ іс҃ъ')
    expect(normalizeOld(decodeVira('х©ъ')).norm).toBe('христосъ')
  })
  it('tokens: loc "Ін 1:1", verse index; Latin leftovers dropped and counted', () => {
    const { tokens, unmapped } = verseTokens(vs)
    expect(tokens.slice(0, 5).map(x => [x.raw, x.loc, x.s])).toEqual([['Искони', 'Ін 1:1', 0], ['бѣ', 'Ін 1:1', 0], ['слово', 'Ін 1:1', 0], ['и', 'Ін 1:1', 0], ['слово', 'Ін 1:1', 0]])
    expect(tokens.find(x => x.loc === 'Мт 1:1' && x.raw === 'іс҃ъ')).toBeTruthy()
    expect(unmapped).toBe(1)                                   // «Q?ъ»: Latin Q
    expect(tokens.some(x => /[A-Za-z]/.test(x.raw))).toBe(false)
  })
  it('chapter links of the index', () => expect(chapterLinks('<a href="https://xn--80ad6b1e.xn--j1amh/b/arch-gospel/john-cs-ar-21">21</a> <a href="/b/arch-gospel/luke-cs-ar-1#luke-cs-ar-1:1">'))
    .toEqual(['https://xn--80ad6b1e.xn--j1amh/b/arch-gospel/john-cs-ar-21', 'https://xn--80ad6b1e.xn--j1amh/b/arch-gospel/luke-cs-ar-1']))
})

describe('M-2.3 Hypatian codex split by annal', () => {
  it('year = NNNN − 5508', () => { expect(adYear(6625)).toBe(1117); expect(adYear(6708)).toBe(1200); expect(adYear(6709)).toBe(1201) })
  it('PVL ≤ 6625 < Kyiv Chronicle ≤ 6708 < Galician-Volhynian', () => {
    expect([6360, 6625, 6626, 6708, 6709, 6800].map(partOf)).toEqual(['pvl', 'pvl', 'kievchr', 'kievchr', 'gvl', 'gvl'])
    expect(partOf(undefined)).toBe('pvl')
  })
  it('annal header «В лѣто . ҂ѕ҃ . …» opens the new annal; its Cyrillic numerals are not tokens', () => {
    const paras = [`Конец старого года . В лѣто . ҂s҃ . х҃ . к҃г . ${marker('Y', 6626)} Выбѣже Ярославъ`, `${marker('C', 286)}`, 'Тоя же зимы']
    const st = { year: 6625 as number | undefined, col: '285' as string | undefined }
    const r = streamTokens(paras, [0, 0, 0], st, 0, () => tally(), s => `s.a. ${s.year}, стб. ${s.col}`)
    expect(r.items.map(i => [i.rec.raw, i.year])).toEqual([
      ['Конец', 6625], ['старого', 6625], ['года', 6625], ['В', 6626], ['лѣто', 6626], ['Выбѣже', 6626], ['Ярославъ', 6626], ['Тоя', 6626], ['же', 6626], ['зимы', 6626]])
    expect(r.items.at(-1)!.rec.loc).toBe('s.a. 6626, стб. 286')
    expect(r.items.map(i => partOf(i.year))).toEqual(['pvl', 'pvl', 'pvl', ...Array(7).fill('kievchr')])
  })
  it('insider «Руская земля» mention is found verbatim (≤ 30 words)', () => {
    const text = 'братолюбець и нищелюбець . и добръıи страдалець . за Рускую землю . сего приставление бъıс̑ маиӕ въ девѧтъıи на десѧть . и спратавше тѣло его . положиша оу ст҃ѣи Софьѣ'
    const [h] = findInsider(text, 0)
    expect(h!.quote.split(' ').length).toBeLessThanOrEqual(30)
    expect(text.replace(/\s+/g, ' ')).toContain(h!.quote)
    expect(h!.quote).toContain('за Рускую землю')
  })
})

describe('M-2.2 editorial apparatus is removed', () => {
  const clean = (h: string, yat = false) => { const st = { app: 0 }; return [cleanParagraph(h, { yat }, st), st.app] as const }
  it('variant numbers <sup>n</sup> and note letters go; supralinear <sup class="q"> letters stay', () => {
    expect(clean('Присла Романъ <sup>11</sup> <sup>Б</sup> къ Игорев<sup class="q">и̑</sup> . ни<sup class="q">м̑</sup>')).toEqual(['Присла Романъ къ Игореви̑ . ним̑', 2])
  })
  it('note refs <a href="#noteN">[n]</a>, [n], (n) and folio marks /л.18об./ are stripped; mid-word folio mark rejoins the word', () => {
    const [t, n] = clean('Господи <small><a href="#note3" name="noteref3">[3]</a></small> благослови [4] отче (5) Оу<small id="lystob18">/л.18об./</small>лѣбъ')
    expect(t).toBe('Господи благослови отче Оулѣбъ')
    expect(n).toBe(4)
  })
  it('[ЗАГОЛОВОК] and [note: …] are editorial, [текст] is an unwrapped restoration', () => {
    expect(clean('[СТАВЛЕНИЦЬКИЙ ЗАПИС] Азъ [от] бога [викреслено в рукопису: шяине] быхъ')[0]).toBe('Азъ от бога быхъ')
  })
  it('Samovydets: <i>і</i> is the editor\'s ѣ, <sup> footnotes and «*» go', () => {
    const [t] = clean('В Борисов<i>і</i> на початку року&nbsp;<sup>7</sup> починается', true)
    expect(t).toBe('В Борисовѣ на початку року починается')
  })
  it('only K1 paragraphs are read; navigation, Prym and Vary blocks are not', () => {
    const html = `<div class="dop3"><p class=K1><br><a href="ipat02.htm">Попередня</a></p><p class=Mber id="st36">36</p>
      <p class=K1>Текст <sup>1</sup> літописи</p><p class=Vary><b>Варіанты</b>: Х. послы.</p><p class=Prym>Примѣчанія: А</p><p class=K1>Кінець</p>`
    const r = pageParas(html, CUTS.hypatian!)
    expect(r.paras.map(p => p.replace(/[-]/g, '|'))).toEqual(['|C36|', 'Текст літописи', 'Кінець'])
    expect(r.apps).toEqual([0, 1, 0])
  })
  it('tokens with a Latin letter are dropped and counted', () => {
    const d = tally(); expect(words('ѕ҃s Руси lorem слово', d)).toEqual(['Руси', 'слово'].filter(Boolean)); expect(d.unmapped).toBe(2)
  })
})

describe('izbornyk decoders and Shevchenko dates', () => {
  it('Ђ → ѣ, capital run → Ѣ', () => { expect(decodeIzbornyk('закон<small>Ђ</small> ВСЂХ')).toBe('закон<small>ѣ</small> ВСѢХ') })
  it('«Датується …: …» → [min, max] year', () => {
    expect(dateRange('Датується за автографом: 14 грудня 1845 р., В’юнище.')).toEqual([1845, 1845])
    expect(dateRange('Датується орієнтовно на підставі спогадів І. М. Сошенка: кінець 1838 р. — початок 1839 р., С.-Петербург.')).toEqual([1838, 1839])
    expect(dateRange('Датується за часом опублікування в журналі (1839. — № 10) нарису: жовтень — грудень 1839 р., С.-Петербург. М. О. Максимович свідчив: «… 1859 року …» (… — 1893. — № 8)')).toEqual([1839, 1839])
    expect(dateRange('Датується орієнтовно жовтнем 1842 р. на підставі листа від 18 листопада 1842 р.: «Позавчора вернувся»')).toEqual([1842, 1842])
  })
})

// B3 (plan 40): corpus completeness — runs on the mined data/work (gitignored), skipped on a clean checkout
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { MANIFEST } from '../pipelines/manifest.ts'
import { authorById, admissible } from '../pipelines/authors.ts'
const work = (id: string) => JSON.parse(readFileSync(`data/work/${id}.json`, 'utf8'))
describe.skipIf(!existsSync('data/work/vyshensky.json'))('B3 vyshensky (izbornyk old14_19)', () => {
  const w = work('vyshensky')
  it('mined whole: ≥ 20k tokens, located, vetted author', () => {
    expect(w.tokens.length).toBeGreaterThan(20000); expect(w.tokens.every((t: { loc: string }) => t.loc)).toBe(true)
    expect(w.author).toBe('vyshensky'); expect(admissible(authorById['vyshensky'])).toBe(true)
    expect(w.date).toEqual([1588, 1600]); expect(w.dateCite.kind).toBe('Q')
  })
  it('no Latin leftovers; apparatus was removed and counted', () => { expect(w.tokens.some((t: { raw: string }) => /[A-Za-z]/.test(t.raw))).toBe(false); expect(w.dropped.apparatus).toBeGreaterThan(0) })
  it('manifest entry is ruthenian with a region', () => expect(MANIFEST.find(u => u.id === 'vyshensky')).toMatchObject({ lang: 'ruthenian', region: expect.any(String) }))
})
describe.skipIf(!existsSync('data/raw/izbornyk/shevchenko/001.html'))('B3 Shevchenko vol. 1 discovery', () => {
  const ids = readdirSync('data/work').filter(f => /^shevchenko_\d+\.json$/.test(f))
  it('whole poems volume is ingested (≥ 40 pieces, not 4)', () => expect(ids.length).toBeGreaterThanOrEqual(40))
  it('each piece has a «Датується» quote and a 1837–1861 range', () => {
    for (const f of ids) { const w = JSON.parse(readFileSync(`data/work/${f}`, 'utf8')); expect(w.dateCite.quote, f).toMatch(/^Датується/); expect(w.date[0], f).toBeGreaterThanOrEqual(1837); expect(w.date[1], f).toBeLessThanOrEqual(1861) }
  })
})
