/**
 * Corpus statistics after DWDS and the corpus-linguistics literature (research/07 §2). Every function is pure;
 * callers store the denominators next to the numbers (P-1.6).
 *
 * > "Abrufbar sind nur Kookkurrenzen, die statistisch signifikant sind, also eine Mindestfrequenz von fünf und einen
 * >  logDice-Wert größer Null" — DWDS, Wortprofil
 * > "The most common item belongs to frequency class 0 (zero) and any item that is approximately half as frequent
 * >  belongs in class 1." — Wikipedia, Word list
 */
import { Q, P, type Evidence } from './evidence.ts'

export const ipm = (f: number, N: number) => N ? (f / N) * 1e6 : 0

/** Häufigkeitsklasse: round(log2(f_max / f)) — research/07 §2.2 ("the definition rounds"). */
export const freqClass = (f: number, fMax: number) => Math.round(Math.log2(fMax / f))
/** Seven-step barometer (DWDS "siebenstufige, logarithmische Skala"); bins are our documented choice. */
export const dots = (hk: number) => Math.max(0, Math.min(6, 6 - Math.floor(hk / 3)))

/** logDice = 14 + log2(2·f_xy / (f_x + f_y)), max 14 (Rychlý 2008). */
export const logDice = (fxy: number, fx: number, fy: number) => 14 + Math.log2((2 * fxy) / (fx + fy))
export const mi = (fxy: number, fx: number, fy: number, N: number) => Math.log2((fxy * N) / (fx * fy))

/** Two-corpus log-likelihood G² (UCREL) and Hardie's Log Ratio (zero → 0.5). a,b = counts; c,d = corpus sizes. */
export function compare(a: number, b: number, c: number, d: number) {
  const e1 = (c * (a + b)) / (c + d), e2 = (d * (a + b)) / (c + d)
  const t = (o: number, e: number) => (o > 0 ? o * Math.log(o / e) : 0)
  const g2 = 2 * (t(a, e1) + t(b, e2))
  const logRatio = Math.log2(((a || 0.5) / c) / ((b || 0.5) / d))
  return { g2, logRatio, p: g2 >= 15.13 ? 0.0001 : g2 >= 10.83 ? 0.001 : g2 >= 6.63 ? 0.01 : g2 >= 3.84 ? 0.05 : 1 }
}

/** Gries' DP over parts: ½ Σ |y_i/AF − n_i/N|; 0 = even, 1 = concentrated. Returns also range (parts with y_i>0). */
export function dispersion(parts: { y: number; n: number }[]) {
  const AF = parts.reduce((s, p) => s + p.y, 0), N = parts.reduce((s, p) => s + p.n, 0)
  if (!AF || !N) return { dp: 1, evenness: 0, range: 0 }
  const dp = 0.5 * parts.reduce((s, p) => s + Math.abs(p.y / AF - p.n / N), 0)
  return { dp, evenness: 1 - dp, range: parts.filter(p => p.y > 0).length }
}

/** Centred moving average with inverse-distance base b (DWDS window/wbase; b=1 = plain average). */
export const smooth = (xs: (number | null)[], w = 1, b = 1) => xs.map((_, t) => {
  let num = 0, den = 0
  for (let k = -w; k <= w; k++) { const x = xs[t + k]; if (x == null) continue; const wt = b ** -Math.abs(k); num += wt * x; den += wt }
  return den ? num / den : null
})

/** Method citations shown on the methodology page and in stat tooltips. */
export const STAT_CITES: Record<string, Evidence> = {
  ipm: P('DWDS', 'https://www.dwds.de/d/plot', 'Kategorisierungsfunktion zur Berechnung des Nenners für die Ergebnis-Skalierung pro Million Tokens'),
  hk: Q('WLIST', 'https://en.wikipedia.org/wiki/Word_list', 'The most common item belongs to frequency class 0 (zero) and any item that is approximately half as frequent belongs in class 1.'),
  dots: Q('DWDS', 'https://www.dwds.de/d/worthaeufigkeit', 'Das Frequenzbarometer bildet eine siebenstufige, logarithmische Skala ab.'),
  logDice: Q('DWDS', 'https://www.dwds.de/d/wortprofil', 'Abrufbar sind nur Kookkurrenzen, die statistisch signifikant sind, also eine Mindestfrequenz von fünf und einen logDice-Wert größer Null'),
  g2: P('UCREL', 'https://ucrel.lancs.ac.uk/llwizard.html', 'G² = 2·(a·ln(a/E1) + b·ln(b/E2)); critical values 3.84 (p<.05), 6.63, 10.83, 15.13'),
  dp: P('GRIES', 'https://stgries.info/research/2008_STG_Dispersion_IJCL.pdf', 'DP = ½ Σ |y_i/AF − n_i/N| (0 = perfectly even, 1 = concentrated)'),
  smooth: Q('DWDS', 'https://www.dwds.de/d/plot', 'Fensterbreite für gleitenden Mittelwert (Glättung), als natürliche Zahl'),
}
