/** SPEC 63 RF-8…RF-10: the 14th-c. charters (Пещак 1974), Квітка 1887, the РИБ works wired into the worker ingest. Fixture pages are quoted from the real scans. */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import type { WitnessOut } from '../core/types.ts'
import { admit } from '../pipelines/build-annotate.ts'
import { authorById } from '../pipelines/authors.ts'
import { checkCharter, PUM_SEED } from '../pipelines/ingest-pum.ts'
import { KVITKA_WORKS, kvitkaPage, kvitkaWitness } from '../pipelines/ingest-kvitka.ts'
import { polishFilter, RIB_WORKS, ribWitness } from '../pipelines/ingest-rib.ts'
import { ruOfWitness } from '../core/ru-source.ts'

const century = (d: [number, number]) => Math.floor((Math.round((d[0] + d[1]) / 2) - 1) / 100) + 1
describe('RF-8 the 82 seed charters are valid, admitted by the pum14 author record, and put 17,981 tokens into the 14th century', () => {
  const files = readdirSync(PUM_SEED).filter(f => /^gr14_\d+\.json$/.test(f))
  const ws = files.map(f => JSON.parse(readFileSync(`${PUM_SEED}/${f}`, 'utf8')) as WitnessOut)
  it('82 charters, every one valid and admitted', () => {
    expect(ws.length).toBe(82)
    ws.forEach((w, i) => { expect(checkCharter(w, files[i]!), w.id).toEqual([]); expect(admit(w, authorById['pum14']), w.id).toEqual({ ok: true }) })
  })
  it('the 14th century gets 17,981 tokens by the date midpoint; each charter keeps its own date line', () => {
    const by = new Map<number, number>(); for (const w of ws) by.set(century(w.date), (by.get(century(w.date)) ?? 0) + w.tokens.length)
    expect(by.get(14)).toBe(17981); expect(ws.reduce((n, w) => n + w.tokens.length, 0)).toBe(19020)
    const g4 = ws.find(w => w.id === 'gr14_4')!; expect(g4.date).toEqual([1301, 1301]); expect(g4.dateCite.quote).toBe('8 березня 1301 р.')
    expect(ws.every(w => w.lang === 'ruthenian' && w.witnessType === 'scholarly_ed')).toBe(true)
  })
})

describe('RF-9 Квітка: every повість dated from the 1887 notes, apparatus excluded, no ru flag', () => {
  it('each work is dated with a quoted note of the 1887 edition; an undated work would be skipped', () => {
    expect(KVITKA_WORKS.length).toBe(6)
    for (const w of KVITKA_WORKS) { expect(w.date, w.id).not.toBeNull(); expect(w.dateCite!.quote, w.id).toMatch(/18\d\d/); expect(w.dateCite!.kind).toBe('Q') }
    expect(KVITKA_WORKS.find(w => w.id === 'kvitka_marusia')!.date).toEqual([1834, 1834])
    expect('skip' in kvitkaWitness({ ...KVITKA_WORKS[0]!, date: null }, [{ n: 13, text: 'x' }])).toBe(true)
  })
  it('footnotes (also one starting inside the last line) and the running head are not text', () => {
    const page = 'МЕРТВЕЦЬКЫЙ ВЕЛЫК-ДЕНЬ. *)\nБувъ соби чоловикъ та жинка. Чоловика звалы Нечыпоромъ, а жинку Приською;\n12\nдочка у батька, дуже багатого: була й скотынка, и усяка худоба\nдо усякого такъ у вичи и лизе, ну то й звисно, що ёму на*) Въ изданіи 1834 г. помѣтка цензора: Октября 4, 1833 г.\n*) Примѣчаніе. Первое изданіе въ альманахѣ\nдругой строкой что-то'
    const k = kvitkaPage(page, /МЕРТВЕЦЬК/i)
    expect(k.text).toContain('Нечыпоромъ'); expect(k.text).toContain('що ёму на'); expect(k.text).not.toMatch(/изданіи|Примѣчаніе|помѣтка|ВЕЛЫК|что-то/)
  })
  it('the witness is Слобожанщина, lang uk, OQ-gated (ocr) and not a ru-flagged edition', () => {
    const text = Array.from({ length: 8 }, () => 'Бувъ соби чоловикъ та жинка. Чоловика звалы Нечыпоромъ, а жинку Приською').join('\n')
    const w = kvitkaWitness(KVITKA_WORKS[2]!, [{ n: 40, text }])
    expect('skip' in w).toBe(false); if ('skip' in w) return
    expect(w.region).toBe('Слобожанщина'); expect(w.witnessType).toBe('ocr'); expect(w.lang).toBe('uk'); expect(ruOfWitness(w)).toBeUndefined()
    expect(admit(w, { id: w.author, name: 'x', life: '', label: 'ukrainian', status: 'provisional', confidence: 'implicit', evidence: [{ source: 's', locator: 'l', quote: 'q', kind: 'Q' }] })).toEqual({ ok: true })
  })
})

describe('RF-10 ingest.sh runs pum14, rib and kvitka as sources; the Antirrhisis Polish column is filtered', () => {
  it('ingest.sh', () => {
    const ing = readFileSync('ops/worker/ingest.sh', 'utf8')
    for (const s of ['ingest-pum.ts', 'ingest-rib.ts', 'ingest-kvitka.ts']) expect(ing).toContain(s)
    expect(ing).toMatch(/runcmd pum14/); expect(ing).toMatch(/runcmd rib/); expect(ing).toMatch(/runcmd kvitka/)
  })
  it('Cyrillic garbage of the Polish column goes, the Ruthenian lines stay (page 265 of the volume: Polish block, then Ruthenian block)', () => {
    const page = 'Оќова тав віагогу(пеу геїірі) Стесківу\nсломіека! Сту піе міазпу іо һегеіуК,\nКіогу сегутопіаті Коѕсіоїіа Влушзкіеро\n\n(25) ! передъ тымъ и въ Костенъ-\nтинополи, коли патрыяръха самъ служъ-\nбу Божую мевалъ, апостола и еванъ-\n\nБиблиотека "Руниверс"'
    const f = polishFilter(page)
    expect(f.text).toContain('патрыяръха'); expect(f.text).not.toMatch(/сегутопіаті|Оќова|Руниверс|Влушзкіеро/); expect(f.dropped).toBeGreaterThan(8)
  })
  it('the РИБ witnesses are OCR (gated by OQ) and the Antirrhisis is the only work with the Polish filter', () => {
    expect(RIB_WORKS.filter(w => w.polish).map(w => w.id)).toEqual(['rib19_antirrhisis'])
    const w = ribWitness(RIB_WORKS[3]!, [{ n: 1, text: '377 ОТВЪТЪ КЛИРИКА 380\n' + Array.from({ length: 6 }, () => 'Отвѣтъ клирика Острожскаго Ипатію Потѣю на листъ его милости').join('\n') }])
    if ('skip' in w) throw new Error(w.skip)
    expect(w.witnessType).toBe('ocr')
  })
})
