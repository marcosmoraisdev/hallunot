// src/domain/services/lcs/components/recency-risk-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalize, clamp } from '../utils'

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000

/**
 * Scores based on version release date relative to LLM knowledge cutoff.
 * Versions released before cutoff = higher score.
 * Versions released after cutoff = lower score.
 */
export class RecencyRiskScore implements ScoreComponent<LCSContext> {
  readonly id = 'recency'
  readonly weight = 0.40

  calculate(ctx: LCSContext): number {
    const versionDate = ctx.version.releaseDate.getTime()
    const cutoffDate = ctx.llm.cutoffDate.getTime()
    const diffMs = versionDate - cutoffDate
    const monthsDiff = diffMs / MS_PER_MONTH

    if (monthsDiff <= 0) {
      // Released before cutoff - good
      // 0 months before = 0.5, 24+ months before = 1.0
      const monthsBefore = Math.abs(monthsDiff)
      return clamp(0.5 + normalize(monthsBefore, { min: 0, max: 24 }) * 0.5, 0, 1)
    } else {
      // Released after cutoff - risky
      // 0 months after = 0.5, 12+ months after = 0.0
      return clamp(0.5 - normalize(monthsDiff, { min: 0, max: 12 }) * 0.5, 0, 1)
    }
  }
}
