/** SPEC 63 SE-17: the fifth owner-supplied set — Закревський (e1), Верхратський (e2), Караванський (e3), Говірки Західної Полтавщини (e4). Fixtures only; the books themselves never enter git. */
import { describe, expect, it } from 'vitest'
import { karPage, parseKaravansky, selectKarLinks, splitKarEntries, type KarRow } from '../core/se17-karavansky.ts'
import { cleanGloss, parseZakrevsky, zakSeRows, zakSpine } from '../core/se17-zakrevsky.ts'
import { lemSeRow, parseVerkhratsky } from '../core/se17-lemko.ts'
import { normPolt, poltCandidates, quoteAround, readPolt } from '../core/se17-poltava.ts'
import { SE17_ROWS } from '../core/rules-se17.ts'
import { DIALECT_SE17_RULES } from '../core/rules.ts'
import { dialectRule } from '../core/form-class.ts'
import { respell } from '../core/respell.ts'
import { baseOf } from '../core/labels.ts'
import { karavanskyPairs } from '../core/corr-src.ts'
import { synClaim } from '../core/synphr.ts'
import { RIGHTS, maxChars } from '../core/rights.ts'
import { DICT_COVER } from '../core/se.ts'
import { EVIDENCE_CAP } from '../core/rights.ts'

const page = (text: string, no = 6) => [{ text, no }]

describe('SE-17 Караванський (©): parser and word-to-word links', () => {
  const text = [
    'АБАТ, АБАТИСА, і АБАТСТВО, див.', '', 'А',
    'АБЕТКА, азбука, альфабет, алфавит; букви, літери; & абеточка.',
    'АБІТУРІЄНТ, (шкот) випускник; (що вступає до вишу) вступник.',
    'АБО сп., чи, чи то, д. альбо, р. а то /н. пришлю, а то сам привезу/.',
    'ОЧЕВИДЕЦЬ, наочний свідок, з. самовидець; п-к ОЧЕВИДНИЙ, (факт) цілком певний, явний.',
    'АРМІЯ, військо, збройні сили, ур. рать; (учених) армада; П. маса, натовп.',
    'СИПАТИ СЛОВАМИ, тріскотіти, торохкотіти.',
    'Н Е Д О В І Р О К , (відступник) ренегат; ЛАЙ. виродок.',
  ].join('\n')
  const rows = parseKaravansky(page(text))
  const by = (h: string) => rows.find(r => r.head === h)
  it('the printed spread of a scan page: printed = 2i − 2 and 2i − 1', () => { expect(karPage(6)).toBe('с. 10–11'); expect(karPage(120)).toBe('с. 238–239') })
  it('a pointer nest («див.») is no series; a running head and a phrase heading are no rows', () => {
    expect(by('абат')?.xref).toBe(true)
    expect(rows.some(r => r.head.includes(' '))).toBe(false)
    expect(splitKarEntries(page('АБАТ\n\n10\n\n11\n\nАБАТ, абат')).length).toBe(1)
  })
  it('labelled words (д., р., сов.), diminutives after «&», remarks and the «п-к» derived nest are not synonyms of the headword', () => {
    expect(by('абетка')?.senses.flat()).toEqual(['азбука', 'альфабет', 'алфавит', 'букви', 'літери'])
    expect(by('або')?.senses.flat()).toEqual(['чи'])
    expect(by('очевидець')?.senses.flat()).not.toContain('явний')
    expect(by('армія')?.senses.flat()).not.toContain('натовп')   // after the capital label П. the rest of the sense belongs to the nest word's figurative sense
    expect(by('недовірок')).toBeTruthy()
  })
  it('words after a remark are context-bound (cx), the first plain words are not', () => {
    expect(by('абітурієнт')?.senses.flat()).toEqual([])   // both senses open with a remark
    expect(by('абітурієнт')?.cx).toEqual(['випускник', 'вступник'])
  })
  it('links: ≤ 5 per headword, VESUM lemmas of one POS, mutual first, the printed order is not reproduced, page cited, no text', () => {
    const mk = (head: string, ws: string[]): KarRow => ({ head, senses: [ws], page: 'с. 10–11' })
    const R = [mk('дім', ['будинок', 'хата', 'оселя', 'житло', 'хижа', 'палата', 'будівля']), mk('будинок', ['дім']), mk('палата', ['дім'])]
    const pos = (w: string) => (['дім', 'будинок', 'хата', 'оселя', 'житло', 'хижа', 'палата', 'будівля'].includes(w) ? new Set(['noun']) : undefined)
    const { links, stats } = selectKarLinks(R, pos, 5)
    const mine = links.filter(l => l.h === 'дім')
    expect(mine.length).toBe(5)
    expect(mine.filter(l => l.m).map(l => l.t).sort()).toEqual(['будинок', 'палата'])   // the mutual ones are kept
    expect(mine.map(l => l.t)).toEqual([...mine.map(l => l.t)].sort())                 // listed alphabetically, not in the printed order
    expect(mine.every(l => l.page === 'с. 10–11')).toBe(true)
    expect(Object.keys(mine[0]!).sort()).toEqual(['h', 'm', 'n', 'page', 't'].filter(k => k in mine[0]!).sort())
    expect(stats.capped).toBe(2)
    expect(selectKarLinks(R, w => (w === 'дім' ? new Set(['noun']) : w === 'будинок' ? new Set(['verb']) : undefined)).links).toEqual([])
  })
  it('CR-1 adapter: a one-sided link between two nest words is dropped; pairs are never attached to one sense; evidence is a D page pointer', () => {
    const pos = () => new Set(['noun']), rej: Record<string, number> = {}
    const ps = karavanskyPairs([{ h: 'дім', t: 'хата', page: 'с. 10–11', n: 1 }, { h: 'дім', t: 'будинок', page: 'с. 10–11', n: 1, m: 1 }, { h: 'дім', t: 'оселя', page: 'с. 10–11' }], pos, rej)
    expect(ps.map(p => p.b).sort()).toEqual(['будинок', 'оселя'])
    expect(rej['karavansky: one-sided between two nest words']).toBe(1)
    expect(ps.every(p => p.sense === 'unspec' && p.ev.kind === 'D' && p.ev.locator === 'с. 10–11' && p.ev.quote === `${p.a} — ${p.b}`)).toBe(true)
  })
  it('the GG-12 row is a claim of kind D with the page, quoting only the two words', () => {
    const c = synClaim('дім', { t: 'будинок', r: 's', d: 'k', l: 'с. 10–11' })
    expect(c.evidence[0]!.kind).toBe('D'); expect(c.evidence[0]!.locator).toBe('с. 10–11'); expect(c.evidence[0]!.quote).toBe('дім — будинок')
  })
  it('RG-1: karavansky is registered as links (max 5, no text)', () => { expect(RIGHTS.karavansky).toEqual({ license: 'links', maxLinks: 5 }); expect(maxChars('karavansky')).toBe(0) })
})

describe('SE-17 Закревський (public domain): the scan of 1861', () => {
  const t = ['Абетка (Чигирин.) П. Абесаго, азбука. Абетній, азбучный, [Приклад.] (Квитка)', 'Абовѣмъ, П. Абожлет, (приказн. сл.) ибо, потому что.', 'Бабрати, -раю, копаться, возиться. [Лазить.] (Величко)', 'Агрусъ, (читай Авгие), крыжовникъ.', 'Бавити, забавлять, развлекать.', 'Аби, лишь бы.', 'Вабити, манить, приманивать.'].join('\n')
  const rows = parseZakrevsky(page(t, 12))
  it('printed page = scan + 244; a headword off the alphabetical spine is kept with unv, a garbled gloss with oq (never dropped)', () => {
    expect(rows[0]!.page).toBe(256)
    const off = rows.find(r => r.head === 'аби'); expect(off).toBeTruthy(); expect(off!.seq).toBe(false)
    const se = zakSeRows(off!)[0]![1]; expect(se.unv).toBe(1); expect(se.d).toBe('zakrevsky'); expect(se.l).toBe('Закревський 1861, с. 256')
    expect(zakSpine([{ head: 'абетка' }, { head: 'бабрати' }, { head: 'аби' }]).size).toBe(2)
  })
  it('cleanGloss drops the Polish / Latin debris and keeps the Russian words', () => {
    expect(cleanGloss('Ро!осхпу, обыкновенный.').text).toBe('обыкновенный.')
    expect(cleanGloss('Zoіpіса, солонка.').text).toBe('солонка.')
  })
  it('the preface is read: class 6 with the author\'s own quotation and place (LB-15 left 63 entries «невизначено» for the want of it)', () => {
    const b = baseOf('zakrevsky')!; expect(b).toBeTruthy()
    expect(b.quote).toContain('Въ составъ словаря вошли только тѣ Украинскія (Малороссійскія) слова, которыя отличны отъ Русскихъ')
    expect(b.quote).toContain('Ревель'); expect(b.quote).toContain('с. 252–254'); expect(b.region).toContain('Галичини')
  })
})

describe('SE-17 Верхратський (public domain): «Словарець лемківских виразів» of 1902', () => {
  const t = ['абко Рхв. побіч ябко Чет. Apfel.', 'абчанка ябчанка Рхв. Apfelbaum.', 'бабрати Рхв. Ту. hexenhaft. вбабрау є.', 'в1тер Св. Wind, ветер.']
  const rows = parseVerkhratsky(page(t.join('\n'), 390))
  it('printed page = scan − 2, the author\'s village abbreviations decode, OCR 1 → і in the headword', () => {
    expect(rows[0]!.page).toBe(388)
    expect(rows.find(r => r.head === 'абко')!.places).toContain('Рыхвалд')
    expect(rows.some(r => r.head === 'вітер')).toBe(true)
  })
  it('the SeRow: word-level label for a non-standard word, place-only label otherwise; a garbled gloss is oq, an off-spine headword unv', () => {
    const r = rows[0]!, a = lemSeRow(r, true)[1], b = lemSeRow(r, false)[1]
    expect(a.lb![0]).toBe('лемк.'); expect(b.lb![0]).toBe('лемк. (місце запису)'); expect(a.d).toBe('verkhratsky'); expect(a.l).toBe('Верхратський 1902, с. 388')
  })
  it('is registered: DICT_COVER and RG-1 (public domain)', () => { expect(DICT_COVER.some(d => d.id === 'verkhratsky')).toBe(true); expect(RIGHTS.verkhratsky!.license).toBe('pd') })
})

describe('SE-17 Говірки Західної Полтавщини (©): transcription → spelling for lookup', () => {
  it('soft marks, й-vowels, ї and the bar noise are normalised; a stress bar is kept on the recorded form', () => {
    expect(normPolt("м'ін'ал'ис\"")!.word).toBe('мінялись')
    expect(normPolt("йак")!.word).toBe('як')
    expect(normPolt("в'їн")!.word).toBe('він')
    expect(normPolt("Іпол'е")!.word).toBe('поле')
    expect(normPolt("Іпол'е")!.recorded).toContain('́')
    expect(normPolt('//')).toBeUndefined()
  })
  it('lookup candidates undo the recorded reflexes one at a time (типер → тепер, бул\'о → було)', () => {
    expect(poltCandidates('типер')).toContain('тепер'); expect(poltCandidates('бульо')).toContain('було'); expect(poltCandidates('жилізна')[0]).toBe('жилізна')
  })
  it('the texts are read village by village; the quotation is a short window (≤ 200 characters) at word boundaries', () => {
    const txt = ['Село Олексіївка Гребінківського району', 'Інформанти: 1. Загірна Марина Петрівна, 1911 р. н., лікнеп.', "Інф. 1: - Та йак жи ж вироб'л'ал'и / А то шо?", "Інф. 2: - Рос'казуйте ж ви //"].join('\n')
    const { villages, toks } = readPolt(page(txt, 25))
    expect(villages[0]).toMatchObject({ name: 'Олексіївка', district: 'Гребінківського' })
    expect(toks.length).toBeGreaterThan(5); expect(toks.every(t => t.village === 'Олексіївка' && t.ctx.length <= 205)).toBe(true)
    const long = Array.from({ length: 80 }, (_, i) => `слово${i}`)
    expect(quoteAround(long, 40).length).toBeLessThanOrEqual(205)
  })
  it('RG-1: poltavshchyna is a quote source (≤ 200 characters)', () => { expect(RIGHTS.poltavshchyna!.license).toBe('quote'); expect(maxChars('poltavshchyna')).toBe(200) })
})

describe("SE-17 dialect rows with the authors' own quotations", () => {
  it('every row is cited (source, locator, quote ≤ the evidence backstop) and fires on its own example', () => {
    expect(SE17_ROWS.length).toBeGreaterThanOrEqual(13)
    for (const r of SE17_ROWS) {
      const rule = dialectRule(`${r.id}:${r.code}`); expect(rule, r.id).toBeTruthy()
      expect(r.quote.length, r.id).toBeGreaterThan(30); expect(r.quote.length, r.id).toBeLessThanOrEqual(EVIDENCE_CAP)
      expect(rule!.cite.source, r.id).toBe(r.src); expect(rule!.cite.locator.length, r.id).toBeGreaterThan(10)
    }
    expect(SE17_ROWS.filter(r => r.code === 'LEM').length).toBe(8); expect(DIALECT_SE17_RULES.length).toBe(SE17_ROWS.length)
    expect(SE17_ROWS.find(r => r.id === 'LEM-DA-V')!.re.test('даколи')).toBe(true)
    expect(SE17_ROWS.find(r => r.id === 'POLT-HAMUT')!.re.test('хамут')).toBe(true)
  })
  it('respelling: Lemko меджа, даколи; Poltava хамут, улиця — each with the quotation of its own detector row', () => {
    expect(respell('межа', 'LEM').text).toBe('меджа')
    expect(respell('деколи', 'LEM').text).toBe('даколи')
    expect(respell('хомут', 'MDN').text).toBe('хамут')
    expect(respell('вулиця', 'MDN').text).toBe('улиця')
    expect(respell('межа', 'LEM').fired.some(f => f.cite.source === 'VERKH')).toBe(true)
    expect(respell('дім', 'LEM').text).toBe('дім')
  })
})
