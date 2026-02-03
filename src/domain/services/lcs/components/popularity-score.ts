// src/domain/services/lcs/components/popularity-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeLog } from '../utils'

/**
 * Uses adoption as proxy for training data exposure.
 * Log-scaled to prevent mega-projects from dominating.
 */
export class PopularityScore implements ScoreComponent<LCSContext> {
  readonly id = 'popularity'
  readonly weight = 0.20

  calculate(ctx: LCSContext): number {
    const { stars, dependentsCount } = ctx.library

    // Combine stars and dependents (both log-scaled)
    const starsScore = normalizeLog(stars, { max: 100_000 })
    const dependentsScore = normalizeLog(dependentsCount, { max: 10_000 })

    // Weighted average: dependents slightly more meaningful
    return starsScore * 0.4 + dependentsScore * 0.6
  }
}
