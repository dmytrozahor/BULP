/**
 * SPEC 63 DV-4: the sound correspondence behind a cognate pair, shown on the edge of the cognate graph / in the «Відповідники» table.
 * Pure. Rows are the regular reflexes of Proto-Slavic ě in the neighbouring languages, each backed by VERBATIM Wiktionary descendant lines (fetched 2026-10-17).
 * No row without a cite; a pair that fits no row gets no label (never a guessed rule). Detection is a positional test on the written forms, not a derivation.
 */
import { D, type Evidence } from './evidence.ts'
import type { CogLang } from './cognates.ts'

export interface YatCorr {
  id: string
  label: string
  /** the Ukrainian letters at the reflex position */
  uk: string[]
  /** reflexes by language, as written; a language not listed has no row here */
  by: Partial<Record<CogLang, string[]>>
  /** the reflex position must follow one of these (j-vowel or hushing consonant) */
  after?: RegExp
  cite: Evidence[]
}
const W = (pivot: string, q: string, note: string) => D('WIKT', `https://en.wiktionary.org/wiki/Reconstruction:Proto-Slavic/${encodeURIComponent(pivot)}`, q, note)

export const YAT_CORR: YatCorr[] = [
  { id: 'YC-1', label: 'ě: uk і ~ ru е ~ be е ~ pl ia/ie', uk: ['і'], by: { ru: ['е'], be: ['е'], pl: ['ia', 'ie'] },
    cite: [
      W('bělъ', 'Belarusian: "бе́лы" (bjély); Ukrainian: "бі́лий" (bílyj); Russian: "бе́лый" (bélyj); Old Polish: "biały"; Czech: "bílý"', 'нащадки *bělъ (Вікісловник, fetched 2026-10-17)'),
      W('sěno', 'Belarusian: "се́на"; Russian: "се́но"; Ukrainian: "сі́но"; Polish: "siano"; Czech: "seno"', 'нащадки *sěno (Вікісловник, fetched 2026-10-17)')] },
  { id: 'YC-2', label: 'ě: uk и/і ~ be я (ненаголошене, якання) ~ ru е ~ pl ie', uk: ['и', 'і'], by: { ru: ['е'], be: ['я'], pl: ['ie'] },
    cite: [W('sěděti', 'Belarusian: "сядзе́ць"; Russian: "сиде́ть"; Ukrainian: "сиді́ти"; Polish: "siedzieć"; Czech: "sedět"', 'нащадки *sěděti (Вікісловник, fetched 2026-10-17); be я — ненаголошений ě після м’якого (також W: Yakanye «unstressed /e/ and /a/ after palatalised consonants … as /a/»)')] },
  { id: 'YC-3', label: 'ě після j / шиплячого: uk а/я ~ ru а/я ~ be я/а (ě > a, jě > ja)', uk: ['а', 'я'], by: { ru: ['а', 'я'], be: ['я', 'а'], pl: ['e', 'ie'] }, after: /[жчшщаоуеи]/,
    cite: [
      W('stojati', 'From earlier *stojěti … Ukrainian: "стоя́ти"; Russian: "стоя́ть"; Belarusian: "стая́ць"', 'Вікісловник: *stojati < *stojěti; нащадки *stojati'),
      W('ležati', 'Morphologically leg- + -ěti (stative suffix) … Belarusian: "ляжа́ць"; Russian: "лежа́ть"; Ukrainian: "лежа́ти"', 'Вікісловник: *ležati = *leg- + *-ěti'),
      W('slyšati', 'From earlier *slyxěti … Ukrainian: "слиша́ти"; Russian: "слы́шать"; Polish: "słyszeć"; Czech: "slyšet"', 'Вікісловник: *slyšati < *slyxěti; польська й чеська зберігають e/ě')] },
]

const norm = (s: string) => s.normalize('NFC').replace(/́/g, '').replace(/̀/g, '').toLowerCase().replace(/ё/g, 'е').replace(/ў/g, 'у').replace(/ґ/g, 'г')

const LAT_C: Record<string, string> = { b: 'б', v: 'в', w: 'в', g: 'г', d: 'д', z: 'з', k: 'к', l: 'л', ł: 'л', m: 'м', n: 'н', p: 'п', r: 'р', s: 'с', t: 'т', f: 'ф', h: 'х', c: 'ц', j: 'й' }
const VOW = /[аеиоуыіїєюяaeiouyáéíóúěę]/g
const skel = (x: string) => [...x].map(cyr).join('').replace(VOW, '')
/** the consonant after the reflex may differ by a regular Belarusian reflex (т ~ ц in -ць) */
const same = (c: string, u: string) => c === u || (u === 'т' && c === 'ц')
const cyr = (ch: string) => LAT_C[ch] ?? ch
/** The yat correspondence rows that fit the written pair (uk word, cognate of language `l`): the words share the prefix before the reflex, carry a listed reflex there and the same consonant after it. */
export function yatEdge(uk: string, l: CogLang, w: string): YatCorr[] {
  const u = norm(uk), c = norm(w), key = l === 'zlw-opl' ? 'pl' : l, out: YatCorr[] = []
  for (const r of YAT_CORR) {
    const alts = (r.by as Record<string, string[] | undefined>)[key]; if (!alts) continue
    for (let i = 1; i < u.length - 1; i++) {
      if (!r.uk.includes(u[i]!)) continue
      if (r.after && !r.after.test(u[i - 1]!)) continue
      const pre = u.slice(0, i), nxt = u[i + 1]!
      if (skel(pre) !== skel(c.slice(0, i))) continue
      if (alts.some(a => c.startsWith(a, i) && same(cyr(norm(c[i + a.length] ?? '')), nxt)) && !out.includes(r)) out.push(r)
    }
  }
  return out
}
