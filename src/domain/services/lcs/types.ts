// src/domain/services/lcs/types.ts

/**
 * Generic interface for score components.
 * Each component contributes a normalized [0,1] value with a weight.
 */
export interface ScoreComponent<TContext = unknown> {
  readonly id: string
  readonly weight: number
  calculate(context: TContext): number
}

/**
 * Context containing all metadata needed for LCS calculation.
 */
export interface LCSContext {
  library: LibraryMetadata
  version: VersionMetadata
  llm: LLMMetadata
}

export interface LibraryMetadata {
  name: string
  language: string
  ageInYears: number
  releaseCount: number
  keywords: string[]
  stars: number
  dependentsCount: number
}

export interface VersionMetadata {
  version: string
  releaseDate: Date
}

export interface LLMMetadata {
  id: string
  name: string
  cutoffDate: Date
}

/**
 * Result of a single component calculation.
 */
export interface ComponentResult {
  value: number
  weight: number
  contribution: number
}

/**
 * Breakdown of library-wide score components.
 */
export interface LibraryScoreBreakdown {
  stability: ComponentResult
  simplicity: ComponentResult
  popularity: ComponentResult
  language: ComponentResult
}

/**
 * Score for a specific version.
 */
export interface VersionScore {
  version: string
  releaseDate: string
  recency: ComponentResult
  score: number
}

/**
 * LCS output structure.
 */
export interface LCSOutput {
  libraryScore: LibraryScoreBreakdown
  versions: VersionScore[]
}

/**
 * LGS (LLM Generic Score) output structure.
 */
export interface LGSOutput {
  score: number
  breakdown: Record<string, number> | null
}

/**
 * Final score for a version (LCS × LGS).
 */
export interface FinalVersionScore {
  version: string
  lcs: number
  lgs: number
  final: number
}

/**
 * FS (Final Score) output structure.
 */
export interface FSOutput {
  versions: FinalVersionScore[]
  formula: string
}

/**
 * Complete score response structure.
 */
export interface ScoreResponse {
  library: string
  platform: string
  llm: string
  LCS: LCSOutput
  LGS: LGSOutput
  FS: FSOutput
}
