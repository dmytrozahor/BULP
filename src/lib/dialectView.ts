/**
 * SPEC 63 OV-3: attested vs generated. A form produced by core/respell.ts is a RECONSTRUCTION; it becomes «засвідчено» only when the very same spelling occurs among the
 * lemma's attested spellings, and the witness behind it is from the dialect's region or carries a SOURCED statement of that dialect group (DialectStatement.status 'sourced').
 * A Galician-printed edition (Желехівка) attesting the spelling is NOT a dialect claim: it is shown as «галицька форма / правопис видання» (MM-16 qualifier logic, core/feature-chips.ts).
 */
import { key } from '../../core/text.ts'
import type { Kwic, WitnessOut } from '../../core/types.ts'
import type { RespellCtx } from '../../core/respell.ts'

/** dialect code -> pattern of the witness-region names that belong to it. Derived from the dialect's own name (Лемківщина, Бойківщина …); a region match is NOT a claim about the author's dialect (SPEC 20 B-3.6). */
export const DIALECT_REGION: Record<string, RegExp> = {
  LEM: /Лемків/i, BOY: /Бойків/i, HUT: /Гуцул/i, ZAK: /Закарпат|Підкарпат/i, POD: /Поділ|Подільськ/i, VOL: /Волин/i, PKB: /Покутт|Буковин/i,
  SLB: /Слобожан|Слобід/i, SYAN: /Надсян|Посяння/i, NDN: /Наддністр/i, CHN: /Чернігів|Сіверщ/i, MDN: /Київщин|Полтавщин/i, WPL: /Західн\S* Полісс/i, MPL: /Середн\S* Полісс/i,
}
const GALICIAN = /Галич|Львів|Прикарпатт|Покутт|Буковин|Лемківщ|Закарпатт|Підкарпатт/i
export type AttestStatus = 'attested' | 'edition' | 'elsewhere' | 'generated'
export interface AttestForm { raw: string; byW?: Record<string, number>; kwic?: Pick<Kwic, 'w' | 'loc'>[] }
type WitnessLike = Pick<WitnessOut, 'id' | 'title'> & Partial<Pick<WitnessOut, 'region' | 'orth' | 'dialect'>>
export interface Attest { status: AttestStatus; spelling: string; witnesses: { w: string; title: string; region?: string; n: number; how: 'region' | 'sourced' | 'edition' | 'other' }[]; label: string }

export const ATTEST_LABEL: Record<AttestStatus, string> = {
  attested: 'засвідчено у пам’ятці цього говору', edition: 'галицька форма / правопис видання', elsewhere: 'засвідчено в пам’ятці іншого регіону', generated: 'за правилами (не засвідчено)',
}
export function attestOf(generated: string, forms: AttestForm[], code: string, witness: (id: string) => WitnessLike | undefined): Attest {
  const k = key(generated)
  const hits = forms.filter(f => key(f.raw) === k)
  const byW = new Map<string, number>()
  for (const f of hits) {
    if (f.byW) for (const [w, n] of Object.entries(f.byW)) byW.set(w, (byW.get(w) ?? 0) + n)
    else for (const l of f.kwic ?? []) byW.set(l.w, (byW.get(l.w) ?? 0) + 1)
  }
  const re = DIALECT_REGION[code]
  const ws = [...byW].flatMap(([w, n]) => {
    const x = witness(w); if (!x) return []
    const sourced = (x.dialect ?? []).some(d => d.status === 'sourced' && d.group === code)
    const how = sourced ? 'sourced' as const : re?.test(x.region ?? '') ? 'region' as const : x.orth === 'желехівка' || GALICIAN.test(x.region ?? '') ? 'edition' as const : 'other' as const
    return [{ w, title: x.title, region: x.region, n, how }]
  })
  const rank = { sourced: 0, region: 1, edition: 2, other: 3 } as const
  ws.sort((a, b) => rank[a.how] - rank[b.how] || b.n - a.n)
  const status: AttestStatus = !ws.length ? 'generated' : ws.some(x => x.how === 'sourced' || x.how === 'region') ? 'attested' : ws.some(x => x.how === 'edition') ? 'edition' : 'elsewhere'
  return { status, spelling: generated, witnesses: ws, label: ATTEST_LABEL[status] }
}

/** part of speech and gender from the card's VESUM tags (noun:inanim:n:v_naz): empty when the card gives none, never guessed */
export function ctxOfTags(tags?: string): Pick<RespellCtx, 'pos' | 'gender'> {
  if (!tags) return {}
  const p = tags.split(':'), head = p[0]
  const pos = head === 'verb' ? 'verb' : head === 'noun' ? 'noun' : head === 'adj' ? 'adj' : head ? 'other' : undefined
  const g = p.find(x => x === 'm' || x === 'f' || x === 'n')
  return { ...(pos ? { pos } : {}), ...(g ? { gender: g as 'm' | 'f' | 'n' } : {}) }
}
