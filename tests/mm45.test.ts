/**
 * SPEC 63 MM-45 (owner: «чому в нас нема після переключення на старі правописи "ирод" замість "ірод"?»): the orthography view writes an ATTESTED initial и- (Грінченко 1907–09 -> кулішівка,
 * Желехівський 1886 -> желехівка); a word with no attestation and no etymology keeps the honest «і?»; ярижка is untouched (it already gives иродъ).
 */
import { describe, it, expect } from 'vitest'
import { attestedInitI, OA_RULE, type OaRow } from '../core/orth-attested.ts'
import { toOrth } from '../core/orth-forward.ts'
import { show } from '../src/lib/views.ts'
import { LM_NAMES } from '../core/parts.ts'

const row = (dict: number, rowId: number, q: string, head: string[], text: string): OaRow => ({ dict, rowId, q, scope: 'ukr', head, text })
const HRINCH = 'Ирод и И́рід, -да, м. / 1) Иродъ. Ирод-царь за Христом ганявся. Колядка. / 2) Злодѣй. А він мене і побачив, ирод.'
const ZHEL = 'И́ро́д, m. Herodes; * Teufel, m. и́родовий, a. teuflisch.'
const rows = [
  row(12, 1, 'ірод', ['И́рід'], 'И́рід, -рода, м. См. Ирод.'),                  // a cross-reference under the other query: not taken
  row(12, 2, 'ирод', ['Ирод', 'И́рід'], HRINCH),
  row(21, 3, 'ірод', ['И́ро́д'], ZHEL),
  row(21, 4, 'ідея', ['Иде́я'], 'Иде́я, иди́ля, идо́л etc. s. Іде́я etc.'),     // points to the і- spelling: not an attestation
  row(21, 5, 'ко', ['Ик'], 'Ик, praep. mit dem Dativ. s. Ко, к (къ)'),          // found by another query: not taken
  row(18, 6, 'ірод', ['Ирод'], 'Ирод (1927 orthography)'),                        // a dictionary that is not mapped
]
const have = (l: string) => ['ірод', 'ідея', 'ік'].includes(l)

describe('MM-45 attested initial и-', () => {
  const t = attestedInitI(rows, have)
  it('keeps the printed headword of the right dictionary, with locator and verbatim quote', () => {
    expect(Object.keys(t)).toEqual(['ірод'])
    expect(t['ірод']!.kul!.form).toBe('ирод'); expect(t['ірод']!.zhel!.form).toBe('ирод')
    expect(t['ірод']!.kul!.ev).toMatchObject({ source: 'R2U', kind: 'Q' })
    expect(t['ірод']!.kul!.ev.quote).toContain('Ирод-царь за Христом ганявся'); expect(t['ірод']!.kul!.ev.locator).toContain('#12_2')
    expect(t['ірод']!.zhel!.ev.quote).toContain('Herodes'); expect(t['ірод']!.zhel!.ev.locator).toContain('#21_3')
    expect(t['ірод']!.kul!.ev.note).toContain('НАШЕ')   // Грінченко = кулішівка is our mapping, said so
  })
  it('ірод is «ирод» in кулішівка and желехівка (with the attested cite), ярижка stays иродъ, максимовичівка is not guessed', () => {
    const attInitI = t['ірод']
    for (const o of ['kul', 'zhel'] as const) {
      const r = toOrth('ірод', o, { attInitI })
      expect(r.text).toBe('ирод'); expect(r.unsure).toBe(0)
      expect(r.segs[0]).toMatchObject({ text: 'и', from: 'і', rule: OA_RULE })
      expect(r.rules.find(x => x.id === OA_RULE)!.cite.quote).toContain(o === 'kul' ? 'Ирод-царь' : 'Herodes')
    }
    expect(toOrth('ірод', 'yar').text).toBe('иродъ'); expect(toOrth('ірод', 'yar', { attInitI }).text).toBe('иродъ')
    expect(toOrth('ірод', 'max', { attInitI }).text).toBe('і?родъ')
  })
  it('forms share the stem (ірода -> ирода); another word is not changed by the lemma attestation', () => {
    const attInitI = t['ірод']
    expect(toOrth('ірода', 'kul', { attInitI }).text).toBe('ирода'); expect(toOrth('ірода', 'zhel', { attInitI }).text).toBe('ирода')
    expect(toOrth('імла', 'kul', { attInitI }).text).toBe('імла'); expect(toOrth('імла', 'zhel', { attInitI }).text).toBe('і?мла')
  })
  it('a word with no attestation and no etymology stays «і?» (желехівка) / unchanged (кулішівка); the proto rule still works', () => {
    expect(toOrth('ірод', 'zhel').text).toBe('і?род'); expect(toOrth('ірод', 'kul').text).toBe('ірод')
    expect(toOrth('інший', 'zhel', { proto: '*inъ' }).text).toBe('инший')
    expect(toOrth('ірод', 'zhel', { attInitI: { kul: t['ірод']!.kul } }).text).toBe('і?род')   // a кулішівка cite is not a желехівка cite
  })
  it('the view (views.ts show) puts the cite on the piece', () => {
    const s = show('ірод', '', 'kul', { attInitI: t['ірод'] })
    expect(s.text).toBe('ирод'); expect(s.pieces[0]).toMatchObject({ kind: 'orth', rule: OA_RULE }); expect(s.pieces[0]!.ev!.quote).toContain('Ирод-царь')
    expect(show('ірод', '', 'zhel').text).toBe('і?род')
  })
  it('the sidecar is lazy and sharded (PF-2)', () => { expect(LM_NAMES).toContain('oa') })
})
