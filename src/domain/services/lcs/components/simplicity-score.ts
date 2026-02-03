// src/domain/services/lcs/components/simplicity-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeInverse } from '../utils'

const COMPLEX_KEYWORDS = [
  'framework',
  'platform',
  'ecosystem',
  'full-stack',
  'fullstack',
  'enterprise',
  'monorepo',
  'suite',
  'sdk',
]

/**
 * Estimates conceptual scope from keywords.
 * Fewer "complex" keywords = simpler = higher score.
 */
export class SimplicityScore implements ScoreComponent<LCSContext> {
  readonly id = 'simplicity'
  readonly weight = 0.15

  calculate(ctx: LCSContext): number {
    const keywords = ctx.library.keywords.map((k) => k.toLowerCase())

    const complexCount = keywords.filter((k) =>
      COMPLEX_KEYWORDS.some((ck) => k.includes(ck))
    ).length

    // 0 complex keywords = 1.0
    // 4+ complex keywords = 0.0
    return normalizeInverse(complexCount, { min: 0, max: 4 })
  }
}
