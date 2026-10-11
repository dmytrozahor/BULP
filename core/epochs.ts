/**
 * Epochs in two parallel schemes (research/09). They may disagree by design:
 * > "«Енеїда», 1798 → shev.late_middle (high) … wl.new (high). This disagreement is intended." — research/09 §4
 * > "Never merge the two schemes. Store epoch_shev and epoch_wl separately." — research/09 §4
 */
import { claim, Q, P, unknown, type Claim, type Evidence } from './evidence.ts'

export type Scheme = 'shev' | 'wl'
export interface Epoch { id: string; scheme: Scheme; uk: string; en: string; start: number; end: number; fuzz: [number, number]; overlay?: boolean; cite: Evidence }

const SH = (f: string, ch: string, q: string) => Q('SHEV', `http://izbornyk.org.ua/shevelov/${f}.htm, ${ch}`, q)
const UM = (n: string, q: string) => Q('ENC', `http://litopys.org.ua/ukrmova/${n}.htm`, q)
const NOW = new Date().getFullYear()

export const EPOCHS: Epoch[] = [
  { id: 'shev.proto', scheme: 'shev', uk: 'протоукраїнська доба', en: 'Proto-Ukrainian', start: 600, end: 1049, fuzz: [50, 25],
    cite: SH('shev04', '14.1', '…як і протоукраїнська доба (від VII до XI ст.).') },
  { id: 'shev.old', scheme: 'shev', uk: 'давньоукраїнська доба', en: 'Old Ukrainian', start: 1050, end: 1386, fuzz: [25, 15],
    cite: SH('shev04', '14.1', 'За кінцеву дату давньоукраїнського періоду, нехай дуже умовну, може правити 1387 р.') },
  { id: 'shev.early_middle', scheme: 'shev', uk: 'ранньосередньоукраїнська доба', en: 'Early Middle Ukrainian', start: 1387, end: 1574, fuzz: [15, 10],
    cite: SH('shev05', '29.1', 'Отже, 1575 р. ми умовно беремо за кінцеву межу ранньосередньоукраїнського періоду.') },
  { id: 'shev.middle', scheme: 'shev', uk: 'середньоукраїнська доба', en: 'Middle Ukrainian', start: 1575, end: 1719, fuzz: [10, 10],
    cite: SH('shev06', '43.1', 'Таким чином, середньоукраїнська доба у вузькому розумінні датуватиметься 1575-1720 рр.') },
  { id: 'shev.late_middle', scheme: 'shev', uk: 'пізньосередньоукраїнська доба', en: 'Late Middle Ukrainian', start: 1720, end: 1817, fuzz: [10, 20],
    cite: SH('shev07', '57.4', 'Нижче подаються головніші пам’ятки розглядуваного періоду (приблизно з 1720 по 1818 р.)') },
  { id: 'shev.modern', scheme: 'shev', uk: 'новітня доба', en: 'Modern Ukrainian', start: 1818, end: 9999, fuzz: [20, 0],
    cite: SH('shev07', '57.4', 'від першого романтичного маніфесту (що його містить «Грамматика малороссійскаго нарѣчія» О. Павловського — 1818 р.)') },
  { id: 'wl.rus', scheme: 'wl', uk: 'давньоруська (княжа доба)', en: 'Old Rus\' (Old East Slavic)', start: 988, end: 1349, fuzz: [60, 50],
    cite: P('ENC', 'http://litopys.org.ua/ukrmova/um12.htm', 'ДАВНЬОРУСЬКА МОВА — мова народності, яка населяла Київську Русь.', 'дати 988–1349 — умовність проєкту (research/09 §4: dates_conventional=true)') },
  { id: 'wl.ruthenian', scheme: 'wl', uk: 'староукраїнська літературна мова («руська», «проста»)', en: 'Old Ukrainian / Ruthenian', start: 1350, end: 1797, fuzz: [50, 0],
    cite: UM('um102', 'СТАРОУКРАЇНСЬКА ЛІТЕРАТУРНА МОВА — поширена в 14 — 18 ст. в Україні, Білорусі, а частково і в прилеглих землях') },
  { id: 'wl.ruthenian.chancery', scheme: 'wl', uk: 'ділова староукраїнська', en: 'Chancery Ruthenian', start: 1350, end: 1550, fuzz: [50, 25], overlay: true,
    cite: UM('um102', 'Укр. і білорус. писемні мови 14 — 1-ї пол. 16 ст. представлені гол. чин. юрид. документами') },
  { id: 'wl.new', scheme: 'wl', uk: 'нова українська літературна мова', en: 'Modern Literary Ukrainian', start: 1798, end: 9999, fuzz: [0, 0],
    cite: UM('um26', '1798 виходить друком «Енеїда» І. Котляревського, від якої починає історію нова українська літературна мова.') },
  { id: 'wl.contemporary', scheme: 'wl', uk: 'сучасна українська літературна мова', en: 'Contemporary Standard Ukrainian', start: NOW - 60, end: 9999, fuzz: [10, 0], overlay: true,
    cite: UM('um108', 'У вузькому розумінні — літературна мова, яку вживають три останні покоління … часові межі її охоплюють 60 років.') },
]

export type Confidence = 'high' | 'medium' | 'low'
export interface EpochAssignment { epochs: string[]; confidence: Confidence; overlays: string[] }

const overlap = (a: number, b: number, s: number, e: number) => Math.max(0, Math.min(b, e) - Math.max(a, s) + 1)

/** research/09 §4 "Assignment algorithm": exact → high; ≥0.8 with fuzz → medium; else every epoch with share > 0.1 → low. */
export function assignEpoch([a, b]: [number, number], scheme: Scheme): Claim<EpochAssignment> {
  const pool = EPOCHS.filter(e => e.scheme === scheme)
  const main = pool.filter(e => !e.overlay), len = b - a + 1
  const overlays = pool.filter(e => e.overlay && overlap(a, b, e.start, e.end) / len >= 0.5).map(e => e.id)
  const exact = main.find(e => a >= e.start && b <= e.end)
  const ev = (ids: string[]) => ids.map(id => EPOCHS.find(e => e.id === id)!.cite)
  if (exact) return claim({ epochs: [exact.id], confidence: 'high', overlays }, ev([exact.id]))
  const shares = main.map(e => ({ e, s: overlap(a, b, e.start - e.fuzz[0], e.end + e.fuzz[1]) / len })).sort((x, y) => y.s - x.s)
  if (shares[0] && shares[0].s >= 0.8) return claim({ epochs: [shares[0].e.id], confidence: 'medium', overlays }, ev([shares[0].e.id]))
  const ids = shares.filter(x => x.s > 0.1).map(x => x.e.id).sort((x, y) => main.findIndex(e => e.id === x) - main.findIndex(e => e.id === y))
  return ids.length ? claim({ epochs: ids, confidence: 'low', overlays }, ev(ids)) : unknown()
}

export const epochById = Object.fromEntries(EPOCHS.map(e => [e.id, e])) as Record<string, Epoch>
