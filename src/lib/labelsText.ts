/** SPEC 63 LB-5: the words of the «Мітки» block, as pure functions (tested; the components only lay them out). Every label is value + method + evidence. */
import {
  CHECKED_REGISTER, classUk, HOW, KIND_UK, REG_SRC_UK, TH, TYPE_SRC_UK, VESUM_TAGS, VESUM_TAGS_URL, VESUM_TYPE, WORD_TYPES, areaUk, regAbbr, regUk,
  type DialectResult, type LbEntry, type RegItem, type TypeItem,
} from '../../core/labels.ts'
import { DICT_LABEL_TABLES, tableById, type DictHit } from '../../core/dict-labels.ts'
import { DIALECTS } from '../../core/rules.ts'

export const METHODS_PATH = '/labels-method'
export const METHODS_TITLE = 'Як визначаються мітки'

export interface HitView { dict: string; abbr: string; meaning: string; list: string; quote: string; url: string; area: string; group: string; place: boolean; variant: boolean; word?: string; gov?: string }
export function hitView(h: DictHit): HitView {
  const t = tableById(h.t), row = t?.rows.find(r => r.abbr === h.a) ?? t?.rows.find(r => h.a.endsWith(r.abbr))
  const grp = [...(h.g ? [DIALECTS[h.g] ?? h.g] : [])]
  return {
    dict: t?.short ?? (h.t === 'claim' ? 'ЕУМ та словники діалектів (цитата в картці)' : h.t), abbr: h.a,
    meaning: row?.meaning ?? (h.t === 'claim' ? h.q : ''), list: t?.list ?? h.u, quote: h.q, url: h.u,
    area: h.v ? areaUk(h.v) : h.place ?? (h.g ? DIALECTS[h.g] ?? h.g : ''), group: grp.join(', '), place: !!h.p, variant: !!h.variant, ...(h.w ? { word: h.w } : {}), ...(h.gq ? { gov: h.gq } : {}),
  }
}

/** one line: the class and its value */
export function dialectHeadline(d: DialectResult, regionName: (code: string) => string): string {
  if (d.c === 'dict') {
    const hv = (d.dict ?? []).map(hitView)
    const areas = [...new Set([...(d.areas ?? []).map(areaUk), ...hv.filter(h => !h.place && h.area).map(h => h.area), ...hv.filter(h => h.place).map(h => h.area)])].filter(Boolean)
    const groups = (d.groups ?? []).map(g => DIALECTS[g] ?? g)
    if (d.strict === false) return `словник записав слово в: ${areas.slice(0, 4).join(', ')}${areas.length > 4 ? '…' : ''}`
    return `діалектне за словником${areas.length ? ': ' + areas.slice(0, 4).join(', ') + (areas.length > 4 ? '…' : '') : ' (область не названо)'}${groups.length ? ` · група говорів: ${groups.slice(0, 3).join(', ')}` : ''}`
  }
  if (d.c === 'corpus' && d.corp?.top) {
    const t = d.corp.top
    return `засвідчено переважно в пам’ятках з ${regionName(t.code)} (LR ${t.lr.toFixed(1)}, G² ${t.g2.toFixed(1)})`
  }
  if (d.c === 'general') return `загальновживане: засвідчено в ${d.corp!.att} з ${d.corp!.nReg} регіонів (DP ${d.corp!.dp.toFixed(2)})`
  return `недостатньо даних: ${d.need ?? ''}`
}
/** the plain-Ukrainian «як визначено» of the dialect value (tooltip) */
export function dialectHow(d: DialectResult): string {
  const base = d.c === 'dict' && d.strict === false
    ? 'Словник не називає слово діалектним, а лише вказує, де його записали (повіт чи губернія). Це не діалектна мітка.'
    : HOW[d.c]
  return `${classUk(d)}. ${base} Детально: «${METHODS_TITLE}».`
}

export interface RegView { id: string; abbr: string; full: string; sources: { src: string; srcUk: string; detail: string; url?: string; sense?: number }[] }
export function regViews(items: RegItem[]): RegView[] {
  const by = new Map<string, RegView>()
  for (const [id, src, detail, url, sense] of items) {
    const v = by.get(id) ?? by.set(id, { id, abbr: regAbbr(id), full: regUk(id), sources: [] }).get(id)!
    const det = src === 'd' ? detail.split('\t').slice(0, 3).join(' · ') : src === 'v' ? `${detail} — ${VESUM_TAGS[detail]?.def ?? ''}` : src === 's' ? detail.split('\t').join(': ') : detail.split('\t').join(' — ')
    v.sources.push({ src, srcUk: REG_SRC_UK[src], detail: det, ...(url ? { url } : {}), ...(sense !== undefined ? { sense } : {}) })
  }
  return [...by.values()]
}
export const regTitle = (v: RegView): string => `${v.full}. Як визначено: ${v.sources.map(s => `${s.srcUk}${s.sense ? ` (значення ${s.sense})` : ''}`).join('; ')}.`
export const NEUTRAL = 'нейтральне (немає позначок у словниках)'
export const neutralChecked = (): string[] => CHECKED_REGISTER
export const SURZHYK_NOTE = 'Суржик — властивість окремої форми (він визначається за формою, а не за лемою): дивіться мітки написань.'

export interface TypeView { typ: string; uk: string; src: string; srcUk: string; detail: string; url?: string }
export function typeViews(items: TypeItem[]): TypeView[] {
  return items.map(([typ, src, detail, url]) => ({
    typ, uk: WORD_TYPES[typ] ?? typ, src, srcUk: TYPE_SRC_UK[src], url,
    detail: src === 'v' ? `${detail} — ${VESUM_TYPE[detail]?.def ?? 'тег ВЕСУМ'}` : src === 'd' ? detail.split('\t').slice(0, 3).join(' · ') : detail.split('\t').join(': '),
  }))
}
export const typeBase = (e: LbEntry): string => [e.p ?? 'частина мови не встановлена', e.k ? KIND_UK[e.k] ?? e.k : '', e.m ?? ''].filter(Boolean).join(' · ')
export const formTagsLine = (e: LbEntry): string => (e.f ?? []).map(([t, n, m]) => `${t} (${VESUM_TAGS[t]?.def.replace(/^\S+\s+/, '') ?? t}): ${n} з ${m} форм`).join('; ')

export const THRESHOLDS_LINE = `f ≥ ${TH.fMin}; регіон ≥ ${TH.fRegionMin} вживань, LR ≥ ${TH.lrMin}, p < ${TH.alpha}/k (Бонферроні); ≥ ${TH.regionsMin} регіони з матеріалом; «загальновживане»: ≥ ${TH.k} регіонів, DP ≤ ${TH.dpMax}`
export { VESUM_TAGS_URL, DICT_LABEL_TABLES }
