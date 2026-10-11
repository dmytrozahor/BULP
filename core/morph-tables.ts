/**
 * Noun model paradigms of the East Slavic written language of the earliest monuments: Павленко 2010 (PAVL), «Зразки відмінювання іменників», pp. 74–77 (SPEC 50 EP-5, D1).
 * Transcribed by eye from the rendered page images (research/11 O-1 resolved 2026-10-11), not from the text layer. Notes:
 *  - PAVL prints the iotated a as «ꙗ» (U+A657), neither я nor ѧ: kept verbatim (core/text.ts N07 folds ꙗ → ѧ, so spellings with ѧ still compare equal);
 *  - PAVL's font draws е as є in places (полє, доушє); it is one letter, written е here; ѣ ъ ь ы оу are as printed;
 *  - «(-омь)» after a form is PAVL's variant ending (same stem); the first form is the main one.
 * Each cell keeps the printed row as its quote, so every reconstructed form can cite the cell it came from (P-1.3, P-1.5).
 */
import { Q, type Evidence } from './evidence.ts'
import { CASE_UK, DUAL_UK, NOUN_KEYS, parseNounKey } from './cells.ts'
import type { CellKey, StemType } from './types.ts'

export interface ModelCell { ends: string[]; obl: boolean; row: string; cite: Evidence }   // ends[0] = main ending, the rest PAVL variants; obl = the oblique stem of a consonant type is used
export interface Model { lemma: string; type: StemType; gender: 'm' | 'f' | 'n'; stem: string; obl?: string; nom: string; table: string; cells: Record<CellKey, ModelCell> }

interface Table { id: string; page: string; title: string; cols: [lemma: string, type: StemType, gender: Model['gender'], stem: string, obl?: string][]; rows: string }
const T = (id: string, page: string, title: string, cols: Table['cols'], rows: string): Table => ({ id, page, title, cols, rows })

export const PAVL_TABLES: Table[] = [
  T('a', '74–75', 'Іменники з основою на *-ā/-jā', [['рѣка', 'a', 'f', 'рѣк'], ['землꙗ', 'ja', 'f', 'земл'], ['доуша', 'ja', 'f', 'доуш']], `
sg.nom рѣка | землꙗ | доуша
sg.gen рѣкы | землѣ | доушѣ
sg.dat рѣцѣ | земли | доуши
sg.acc рѣку | землю | доушоу
sg.ins рѣкою | землею | доушею
sg.loc рѣцѣ | земли | доуши
sg.voc рѣко | земле | доуше
pl.nom рѣкы | землѣ | доушѣ
pl.gen рѣкъ | земль | доушь
pl.dat рѣкамъ | землꙗмъ | доушамъ
pl.acc рѣкы | землѣ | доушѣ
pl.ins рѣками | землꙗми | доушами
pl.loc рѣкахъ | землꙗхъ | доушахъ
pl.voc рѣкы | землѣ | доушѣ
du.nav рѣцѣ | земли | доуши
du.gl рѣку | землю | доушоу
du.di рѣкама | землꙗма | душама`),
  T('o', '75', 'Іменники з основою на *-ŏ/-jŏ', [['плодъ', 'o', 'm', 'плод'], ['село', 'o', 'n', 'сел'], ['конь', 'jo', 'm', 'кон'], ['поле', 'jo', 'n', 'пол'], ['мечь', 'jo', 'm', 'меч']], `
sg.nom плодъ | село | конь | поле | мечь
sg.gen плода | села | конꙗ | полꙗ | меча
sg.dat плоду | селу | коню | полю | мечу
sg.acc плодъ | село | конь | поле | мечь
sg.ins плодъмь (-омь) | селъмь (-омь) | коньмь (-емь) | польмь (-емь) | мечьмь (-ьмь)
sg.loc плодѣ | селѣ | кони | поли | мечи
sg.voc плоде | село | коню | поле | мечу
pl.nom плоди | села | кони | полꙗ | мечи
pl.gen плодъ | селъ | конь | поль | мечь
pl.dat плодомъ | селомъ | конемъ | полемъ | мечемъ
pl.acc плоды | села | конѣ | полꙗ | мечѣ
pl.ins плоды | селы | кони | поли | мечи
pl.loc плодѣхъ | селѣхъ | конихъ | полихъ | мечихъ
pl.voc плоди | села | кони | полꙗ | мечи
du.nav плода | селѣ | конꙗ | поли | меча
du.gl плоду | селу | коню | полю | мечу
du.di плодома | селома | конема | полема | мечема`),
  T('u', '76', 'Іменники з основою на *-ŭ', [['сынъ', 'u', 'm', 'сын']], `
sg.nom сынъ
sg.gen сыноу
sg.dat сынови
sg.acc сынъ (-а)
sg.ins сынъмъ
sg.loc сыноу
sg.voc сыноу
pl.nom сынове
pl.gen сыновъ
pl.dat сынъмъ
pl.acc сыны
pl.ins сынъми
pl.loc сынъхъ
pl.voc сынове
du.nav сыны
du.gl сыноу
du.di сынъма`),
  T('uu', '76', 'Іменники з основою на *-ū', [['боукы', 'uu', 'f', 'боук', 'боукъв']], `
sg.nom боукы
sg.gen боукъве
sg.dat боукъви
sg.acc боукъвь
sg.ins боукъвью (-ию)
sg.loc боукъве
sg.voc боукы
pl.nom боукъви
pl.gen боукъвъ
pl.dat боукъвамъ
pl.acc боукъвы
pl.ins боукъвами
pl.loc боукъвахъ
du.nav боукъви (-ѣ)
du.gl боукъвоу
du.di боукъвама`),
  T('i', '76–77', 'Іменники з основою на *-ĭ', [['печь', 'i', 'f', 'печ'], ['чьсть', 'i', 'f', 'чьст'], ['зꙗть', 'i', 'm', 'зꙗт']], `
sg.nom печь | чьсть | зꙗть
sg.gen печи | чьсти | зꙗти
sg.dat печи | чьсти | зꙗти
sg.acc печь | чьсть | зꙗть (-ꙗ)
sg.ins печью (-ию) | чьстью (-ию) | зꙗтьмь
sg.loc печи | чьсти | зꙗти
sg.voc печи | чьсти | зꙗти
pl.nom печи | чьсти | зꙗти (-ье)
pl.gen печьи (-ии) | чьстьи (-ии) | зꙗтьи (-ии)
pl.dat печьмъ | чьстьмъ | зꙗтьмъ
pl.acc печи | чьсти | зꙗти
pl.ins печьми | чьстьми | зꙗтьми
pl.loc печьхъ | чьстьхъ | зꙗтьхъ
pl.voc печи | чьсти | зꙗтье (-и)
du.nav печи | чьсти | зꙗти
du.gl печью (-ию) | чьстью (-ию) | зꙗтью (-ию)
du.di печьма | чьстьма | зꙗтьма`),
  T('cons', '77', 'Іменники з основою на приголосний', [['мати', 'r', 'f', 'мат', 'матер'], ['имꙗ', 'men', 'n', 'им', 'имен'], ['телꙗ', 'nt', 'n', 'тел', 'телꙗт'], ['небо', 's', 'n', 'неб', 'небес']], `
sg.nom мати | имꙗ | телꙗ | небо
sg.gen матере | имене (-и) | телꙗте (-и) | небесе
sg.dat матери | имени | телꙗти | небеси
sg.acc матерь | имꙗ | телꙗ | небо
sg.ins матерью (-ию) | именьмь | телꙗтьмь | небесьмь
sg.loc матери (-е) | имене (-и) | телꙗти (-и) | небесе (-и)
sg.voc мати | имꙗ | телꙗ | небо
pl.nom матере (-и) | имена | телꙗта | небеса
pl.gen матеръ (-ии) | именъ | телꙗтъ | небесъ
pl.dat матерьмъ | именьмъ | телꙗтьмъ | небесьмъ
pl.acc матери (-е) | имена | телꙗта | небеса
pl.ins матерьми | имены | телꙗты | небесы
pl.loc матерьхъ | именьхъ | телꙗтьхъ | небесьхъ
pl.voc матере (-и)
du.nav матери | имени (-ѣ) | телꙗти (-ѣ) | небеси (-ѣ)
du.gl матеру (-ию) | имену | телꙗту | небесу
du.di матерьма | именьма | телꙗтьма | небесьма`),
]

const ROW_LABEL = (k: CellKey) => { const p = parseNounKey(k)!; return p.num === 'du' ? (p.cell === 'nav' ? 'Н., З., К.' : p.cell === 'gl' ? 'Р., М.' : 'Д., О.') : CASE_UK[p.cell as keyof typeof CASE_UK].slice(0, 1) + '.' }
void DUAL_UK

/** velar → second palatalisation product (EP-5.3) */
export const PAL: Record<string, string> = { к: 'ц', г: 'з', х: 'с' }
/** graphic variants that stand for one letter when endings are matched */
export const foldG = (s: string) => s.replace(/[ꙗѩѧ]/g, 'я').replace(/є/g, 'е')

/** Ending of `form` after the model's stem (or its second-palatalised variant, or the oblique stem): the longest matching base wins; falls back to the stage-N reading (доушама ≈ душама). */
function split(m: { stem: string; obl?: string }, form: string): { ending: string; obl: boolean } {
  const bases = [[m.stem, false], [m.stem.replace(/[кгх]$/, c => PAL[c]!), false], ...(m.obl ? [[m.obl, true] as const] : [])] as [string, boolean][]
  const hit = bases.filter(([b]) => form.startsWith(b)).sort((a, b) => b[0].length - a[0].length)[0]
  if (hit) return { ending: form.slice(hit[0].length), obl: hit[1] }
  const n = (s: string) => s.replace(/оу/g, 'у'), hn = bases.filter(([b]) => n(form).startsWith(n(b))).sort((a, b) => n(b[0]).length - n(a[0]).length)[0]
  if (!hn) throw new Error(`morph-tables: «${form}» does not start with the stem of ${m.stem}`)
  return { ending: n(form).slice(n(hn[0]).length), obl: hn[1] }
}

const parseForm = (s: string) => { const m = /^(\S+)(?: \(-(\S+)\))?$/.exec(s.trim()); if (!m) throw new Error(`morph-tables: cannot parse «${s}»`); return [m[1]!, ...(m[2] ? [m[2]] : [])] as const }

export const MODELS: Model[] = PAVL_TABLES.flatMap(t => t.cols.map(([lemma, type, gender, stem, obl], ci) => {
  const model: Model = { lemma, type, gender, stem, obl, nom: '', table: t.id, cells: {} }
  for (const line of t.rows.trim().split('\n')) {
    const sp = line.indexOf(' '), key = line.slice(0, sp), cols = line.slice(sp + 1).split(' | ')
    if (!cols[ci]) continue
    const [main, ...vars] = parseForm(cols[ci]!)
    const { ending, obl: o } = split(model, main)
    const ends = [ending, ...vars]
    model.cells[key] = { ends, obl: o, row: `${ROW_LABEL(key)} ${cols.map(c => c.trim()).join('  ')}`, cite: Q('PAVL', `с. ${t.page}, «Зразки відмінювання іменників», ${t.title}, ${key.startsWith('sg') ? 'однина' : key.startsWith('pl') ? 'множина' : 'двоїна'}`, `${ROW_LABEL(key)} ${cols.map(c => c.trim()).join('  ')}`) }
  }
  model.nom = model.cells['sg.nom']!.ends[0]!
  return model
}))
export const modelByLemma = Object.fromEntries(MODELS.map(m => [m.lemma, m])) as Record<string, Model>
void NOUN_KEYS

/** Павленко 2010, «Зразки відмінювання іменників» (pp. 74–77): the table titles give the stem types as «основа на *-ā/-jā», «*-ŏ/-jŏ», «*-ŭ», «*-ū», «*-ĭ», «приголосний»; the Ukrainian short names follow. */
export const STEM_LABEL: Record<StemType, { proto: string; uk: string }> = {
  a: { proto: '*-ā', uk: 'а-основа' }, ja: { proto: '*-jā', uk: 'ја-основа' },
  o: { proto: '*-ŏ', uk: 'о-основа' }, jo: { proto: '*-jŏ', uk: 'јо-основа' },
  u: { proto: '*-ŭ', uk: 'у-основа (ŭ)' }, uu: { proto: '*-ū', uk: 'у-основа (ū)' }, i: { proto: '*-ĭ', uk: 'і-основа' },
  s: { proto: '*-s', uk: 'основа на приголосний (*-s)' }, r: { proto: '*-r', uk: 'основа на приголосний (*-r)' },
  men: { proto: '*-n', uk: 'основа на приголосний (*-n)' }, nt: { proto: '*-nt', uk: 'основа на приголосний (*-nt)' },
}
/** «с. 74» etc.: the page of the PAVL table that holds the model word (undefined for a model PAVL does not print). */
export const stemSample = (type: StemType, model: string) => {
  const m = modelByLemma[model], t = m && PAVL_TABLES.find(x => x.id === m.table)
  return { ...STEM_LABEL[type], model, page: t ? `с. ${t.page}` : undefined }
}
