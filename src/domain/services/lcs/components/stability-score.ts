// src/domain/services/lcs/components/stability-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeInverse } from '../utils'

/**
 * Measures API volatility based on release frequency.
 * Fewer releases per year = more stable = higher score.
 */
export class StabilityScore implements ScoreComponent<LCSContext> {
  readonly id = 'stability'
  readonly weight = 0.30

  calculate(ctx: LCSContext): number {
    const { ageInYears, releaseCount } = ctx.library

    if (ageInYears <= 0) return 0.5 // New library, neutral score

    const releasesPerYear = releaseCount / ageInYears

    // 0-2 releases/year = very stable (1.0)
    // 20+ releases/year = very volatile (0.0)
    return normalizeInverse(releasesPerYear, { min: 2, max: 20 })
  }
}
