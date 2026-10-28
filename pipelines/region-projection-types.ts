/** the part of pipelines/build-labels.ts Stats that region-projection.ts reads back from its child process */
export interface LbStatsJson { full: Record<string, number>; fullTotal: number; all: Record<string, number>; allTotal: number; alt: { name: string; cover: number; total: number }[] }
