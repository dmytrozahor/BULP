/** SPEC 63 LB-10: the witness region = the place of publication, read from the source's own metadata; abroad places are their own regions. */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { PLACE_RULES, placeOf, placeOfImprint, placeFromIaMeta, placeKey } from '../core/witness-place.ts'
import { PLACE_FACTS } from '../core/place-gazetteer.ts'
import { REGIONS, regionOf, regionOfPlaceId } from '../pipelines/regions.ts'
import { fillWitnessRegions } from '../pipelines/witness-region.ts'
import type { IaPlacesFile } from '../pipelines/ia-places.ts'

describe('LB-10 place names', () => {
  it('LB-10 every real archive.org publisher / Wikisource place string maps to its place', () => {
    const cases: [string, string][] = [
      ['Lʹviv : Prosvita', 'lviv'], ['U Lvovi : Z druk. Nauk. t-va im. Shevchenka', 'lviv'], ['Vinnipeg [Winnipeg] : Nakladom Rus\'koï knyharnï', 'winnipeg'],
      ['Videnʹ : Nakl. Soi͡uza vyzvolenni͡a Ukraïny', 'vienna'], ['Ni͡u Ĭork ; Kultura', 'new-york'], ['Jersey City, N.J. : Svoboda', 'jersey-city'], ['Kharkiv', 'kharkiv'],
      ['Типография И. и А. Давиденко (Киев)', 'kyiv'], ['Kolomyi͡a : Cherenkamy', 'kolomyia'], ['Львів', 'lviv'], ['Вінніпеґ', 'winnipeg'], ['Нью-Йорк', 'new-york'], ['Катеринослав', 'dnipro'],
    ]
    for (const [s, id] of cases) expect(placeOfImprint(s)?.id ?? placeOf(s)?.id, s).toBe(id)
  })
  it('LB-10 a composite locus, an area and an unknown name stay unmapped', () => {
    for (const s of ['Київ; Відень', 'Прага; Берлін', 'Kyïv-Berlin : Ukraïnsʹka Nakladni͡a', 'Київ / Лівобережжя', 'Галичина; Львів', 'Macmillan', '-->']) expect(placeOfImprint(s) ?? placeOf(s), s).toBeUndefined()
  })
  it('LB-10 every place has a Wikidata fact, the modern name maps back to itself, abroad places carry no oblast', () => {
    for (const r of PLACE_RULES) {
      const f = PLACE_FACTS[r.id]; expect(f, r.id).toBeTruthy(); expect(f!.qid).toMatch(/^Q\d+$/)
      expect(placeOf(r.uk)?.id, r.uk).toBe(r.id)
      if (f!.country?.qid === 'Q212') expect(f!.oblast?.iso, r.id).toMatch(/^UA-\d\d$/); else expect(f!.oblast, r.id).toBeUndefined()
      expect(regionOfPlaceId(r.id), r.id).toBeTruthy()
    }
  })
  it('LB-10 Wikidata oblast facts spot-checked', () => {
    expect(PLACE_FACTS['hlukhiv']!.oblast!.iso).toBe('UA-59'); expect(PLACE_FACTS['kropyvnytskyi']!.oblast!.iso).toBe('UA-35'); expect(PLACE_FACTS['kyiv']!.oblast!.iso).toBe('UA-30')
    expect(PLACE_FACTS['lviv']!.oblast!.iso).toBe('UA-46'); expect(PLACE_FACTS['voronezh']!.country!.label).toBe('Росія')
  })
  it('LB-10 placeKey folds spellings', () => { expect(placeKey('Lʹviv')).toBe('lviv'); expect(placeKey('Кіевъ')).toBe(placeKey('Киев')) })
})

describe('LB-10 regions', () => {
  it('LB-10 Ukrainian places land in the project regions, abroad places in their own region without an oblast', () => {
    expect(regionOf('Львів')).toBe('halychyna'); expect(regionOf('Харків')).toBe('slobozhanshchyna'); expect(regionOf('Полтава')).toBe('poltavshchyna'); expect(regionOf('Київ')).toBe('kyiv')
    expect(regionOf('Вінниця')).toBe('podillia'); expect(regionOf('Ужгород')).toBe('zakarpattia'); expect(regionOf('Суми')).toBe('sumshchyna')
    expect(regionOf('Вінніпеґ')).toBe('abroad-winnipeg'); expect(REGIONS.find(r => r.code === 'abroad-winnipeg')).toMatchObject({ oblasts: [], name: 'еміграція / поза Україною (Вінніпег)' })
    expect(new Set(REGIONS.map(r => r.code)).size).toBe(REGIONS.length)
  })
  it('LB-10 the old region strings keep their rows', () => { expect(regionOf('Галичина')).toBe('halychyna'); expect(regionOf('Київ / Лівобережжя')).toBeUndefined() })
})

describe('LB-10 archive.org metadata', () => {
  it('LB-10 publisher, corporate creator, description imprint and the series table, in that order, each with its verbatim value', () => {
    expect(placeFromIaMeta({ identifier: 'x', publisher: 'Winnipeg : Nakladom "Kanadys\'koho farmera"' })).toMatchObject({ place: 'winnipeg', field: 'publisher' })
    expect(placeFromIaMeta({ identifier: 'x', creator: ['Hnatiuk', 'Naukove tovarystvo im. SHevchenka (Lʹviv, Ukraine)'] })).toMatchObject({ place: 'lviv', field: 'creator', value: 'Naukove tovarystvo im. SHevchenka (Lʹviv, Ukraine)' })
    expect(placeFromIaMeta({ identifier: 'x', description: 'Історія України-Русі. – 2-ге вид. – Краків: Накладом Ольги Аркасової, 1912.' })).toMatchObject({ place: 'krakow', field: 'description' })
    const s = placeFromIaMeta({ identifier: 'canadianfarmer_19150101-19171228' })!
    expect(s).toMatchObject({ place: 'winnipeg', field: 'series' }); expect(s.value).toContain('Вінніпегу'); expect(s.url).toMatch(/^https:\/\/uk\.wikipedia\.org/)
    expect(placeFromIaMeta({ identifier: 'y', publisher: 'Kyïv-Berlin : Nakladnia' })).toBeUndefined()
  })
  it('LB-10 the committed table: every row names a known place, a field and a verbatim value; placed items fill the witness region and cite the field', () => {
    const f = JSON.parse(readFileSync('data/seed/ia-places.json', 'utf8')) as IaPlacesFile
    expect(f.placed).toBe(Object.keys(f.places).length); expect(f.placed).toBeGreaterThan(500)
    for (const [id, p] of Object.entries(f.places)) { expect(PLACE_RULES.some(r => r.id === p.place), id).toBe(true); expect(['publisher', 'creator', 'description', 'series']).toContain(p.field); expect(p.value.length, id).toBeGreaterThan(3) }
    const id = Object.keys(f.places).find(k => f.places[k]!.field === 'publisher')!
    const w = { id: 'hv_ia_' + id, title: 't', url: 'https://archive.org/details/' + id, region: undefined as string | undefined, regionCite: undefined as never, tokens: [1, 2, 3] as never[] }
    const rep = fillWitnessRegions([w], f)
    expect(rep.filled).toBe(1); expect(regionOf(w.region)).toBeTruthy(); expect((w.regionCite as { quote: string }).quote).toContain('publisher: ')
    const kept = { id: 'hv_ia_' + id, title: 't', url: w.url, region: 'Київ', regionCite: undefined as never, tokens: [] as never[] }
    expect(fillWitnessRegions([kept], f).filled).toBe(0); expect(kept.region).toBe('Київ')
  })
})
