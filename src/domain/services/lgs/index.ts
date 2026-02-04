// src/domain/services/lgs/index.ts
import type { LGSOutput, LGSScoreBreakdown, ComponentResult } from '../lcs/types'
import type { LGSContext } from './types'
import { LGSCalculator } from './calculator'
import type { ComponentBreakdown } from '../lcs/aggregator'

const calculator = new LGSCalculator()

function toComponentResult(b: ComponentBreakdown): ComponentResult {
  return {
    value: b.rawValue,
    weight: b.weight,
    contribution: b.contribution,
  }
}

/**
 * Calculates LLM Generic Score from model metadata.
 */
export function calculateLGS(context: LGSContext): LGSOutput {
  const result = calculator.calculate(context)

  const findComponent = (id: string) =>
    result.breakdown.find((b) => b.id === id)!

  const breakdown: LGSScoreBreakdown = {
    capability: toComponentResult(findComponent('capability')),
    limit: toComponentResult(findComponent('limit')),
    recency: toComponentResult(findComponent('recency')),
    openness: toComponentResult(findComponent('openness')),
  }

  return {
    score: Math.round(result.score * 100) / 100,
    breakdown,
  }
}
