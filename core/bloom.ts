/**
 * MM-53: a compact membership filter for the normative VESUM word forms (7 M lines of dict_corp_vis.txt cannot be shipped as JSON, 319 MB).
 * Bloom filter, k = 7, 10 bits per key (false-positive rate ≈ 0.8 %): "absent" is certain, "present" is right 99.2 % of the time. It is used ONLY to decide whether a word is
 * in VESUM at all (so that the absence-based detector rules may run, src/lib/analyze.ts); a link or a «є у ВЕСУМ» badge still needs a lexicon card.
 * Layout: 'VB1\0' | n (u32 LE) | m bits (u32 LE) | k (u32 LE) | bit array. Pure.
 */
const MAGIC = [0x56, 0x42, 0x31, 0x00]
const hash = (s: string, seed: number): number => {
  let h = seed >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13
  return h >>> 0
}
export class Bloom {
  readonly bits: Uint8Array; readonly m: number; readonly k: number; readonly n: number
  constructor(bits: Uint8Array, m: number, k: number, n: number) { this.bits = bits; this.m = m; this.k = k; this.n = n }
  static create(n: number, bitsPerKey = 10, k = 7): Bloom { const m = Math.max(64, Math.ceil(n * bitsPerKey)); return new Bloom(new Uint8Array(Math.ceil(m / 8)), m, k, n) }
  private idx(s: string, i: number): number { const a = hash(s, 2166136261), b = hash(s, 0x9e3779b1) | 1; return ((a + Math.imul(i, b)) >>> 0) % this.m }
  add(s: string): void { for (let i = 0; i < this.k; i++) { const x = this.idx(s, i); this.bits[x >> 3]! |= 1 << (x & 7) } }
  has(s: string): boolean { for (let i = 0; i < this.k; i++) { const x = this.idx(s, i); if (!(this.bits[x >> 3]! & (1 << (x & 7)))) return false } return true }
  toBytes(): Uint8Array {
    const out = new Uint8Array(16 + this.bits.length), dv = new DataView(out.buffer)
    out.set(MAGIC); dv.setUint32(4, this.n, true); dv.setUint32(8, this.m, true); dv.setUint32(12, this.k, true); out.set(this.bits, 16); return out
  }
  static fromBytes(b: Uint8Array): Bloom {
    if (MAGIC.some((x, i) => b[i] !== x)) throw new Error('not a VESUM bloom file')
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
    return new Bloom(b.subarray(16), dv.getUint32(8, true), dv.getUint32(12, true), dv.getUint32(4, true))
  }
}
