// src/domain/services/lgs/calculator.ts
import { WeightedScoreAggregator } from '../lcs/aggregator'
import type { AggregatorResult } from '../lcs/aggregator'
import { CapabilityScore } from './components/capability-score'
import { LimitScore } from './components/limit-score'
import { RecencyScore } from './components/recency-score'
import { OpennessScore } from './components/openness-score'
import type { LGSContext } from './types'

/**
 * Calculates LLM Generic Score using WeightedScoreAggregator.
 * Composes 4 components: capability, limit, recency, openness.
 */
export class LGSCalculator {
  private readonly aggregator: WeightedScoreAggregator<LGSContext>

  constructor() {
    this.aggregator = new WeightedScoreAggregator<LGSContext>([
      new CapabilityScore(),
      new LimitScore(),
      new RecencyScore(),
      new OpennessScore(),
    ])
  }

  calculate(context: LGSContext): AggregatorResult {
    return this.aggregator.calculate(context)
  }
}
