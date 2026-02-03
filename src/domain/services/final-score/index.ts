// src/domain/services/final-score/index.ts
import type { VersionScore, FinalVersionScore, FSOutput } from '../lcs/types'

/**
 * Final Score = LCS × LGS
 */
export function calculateFinalScores(
  versions: VersionScore[],
  lgsScore: number
): FSOutput {
  return {
    versions: versions.map((v) => ({
      version: v.version,
      lcs: v.score,
      lgs: lgsScore,
      final: Math.round(v.score * lgsScore * 100) / 100,
    })),
    formula: 'LCS × LGS',
  }
}
