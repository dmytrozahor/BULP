/** SPEC 63 NV-1: pure paging helpers shared by every long list (page size 50, KWIC 20; page number is 1-based in the URL as `?p=`). */
export const PAGE_SIZE = 50
export const KWIC_PAGE = 20

/** clamp an untrusted `?p=` value to 1..pages */
export const parsePage = (raw: unknown, pages: number): number => {
  const n = Math.floor(+String(Array.isArray(raw) ? raw[0] : raw ?? ''))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, Math.max(1, pages)) : 1
}
export const pageCount = (total: number, size = PAGE_SIZE): number => Math.max(1, Math.ceil(total / size))
export const pageSlice = <T>(items: readonly T[], page: number, size = PAGE_SIZE): T[] => items.slice((page - 1) * size, page * size)

/** «‹ 1 2 3 … 9 ›» window: first, last, and ±1 around the current page; '…' marks a gap */
export const pageWindow = (page: number, pages: number): (number | '…')[] => {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages))
  const out: (number | '…')[] = []
  let prev = 0
  for (const n of [...keep].sort((a, b) => a - b)) { if (n - prev > 1) out.push('…'); out.push(n); prev = n }
  return out
}
