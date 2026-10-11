/** LOCAL STAND-INS for the plan-40 contract fields (B0). Drop this file at merge: core/types.ts (backend branch) already declares them. */
import type { Evidence } from '../../core/evidence.ts'
export interface RegionDef { code: string; name: string; oblasts: string[]; N: number }
export type ByRegion = { code: string; f: number; N: number }[]
export interface ContractCorpus { regions?: RegionDef[]; rusynStatus?: { note: string; evidence: Evidence[] } }
export interface ContractStats { byRegion?: ByRegion }
