/**
 * SPEC 63 CV-4b: boot.json must always carry nUvAtt (attested-only cards of uv/meta.json) and nEntries = nAttested + nDictOnly + nUvAtt.
 * build:data writes boot.json BEFORE data:unlinked writes uv/meta.json, so data:unlinked calls patchBootUv afterwards (atomic, RS-1; idempotent).
 */
import { existsSync, readFileSync } from 'node:fs'
import { writeJsonAtomic } from './robust.ts'

export const bootEntries = (b: { nAttested?: number; nLemmas?: number; nDictOnly?: number; nUvAtt?: number }): number => (b.nAttested ?? b.nLemmas ?? 0) + (b.nDictOnly ?? 0) + (b.nUvAtt ?? 0)

/** read uv/meta.json `attested` (0 when absent) */
export const readUvAttested = (dir: string): number => {
  try { return Number((JSON.parse(readFileSync(`${dir}/uv/meta.json`, 'utf8')) as { attested?: number }).attested) || 0 } catch { return 0 }
}

/** set nUvAtt and nEntries in <dir>/boot.json from <dir>/uv/meta.json; returns the patched boot, or null when there is no boot.json yet */
export function patchBootUv(dir: string): Record<string, unknown> | null {
  const p = `${dir}/boot.json`
  if (!existsSync(p)) return null
  const b = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown> & { nAttested?: number; nLemmas?: number; nDictOnly?: number; nUvAtt?: number }
  b.nUvAtt = readUvAttested(dir); b.nEntries = bootEntries(b)
  writeJsonAtomic(p, JSON.stringify(b))
  return b
}
