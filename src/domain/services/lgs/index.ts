// src/domain/services/lgs/index.ts
import type { LGSOutput } from '../lcs/types'

/**
 * LLM Generic Score - placeholder returning 1.0 until implemented.
 * Future: hallucination rate, consistency, context awareness, etc.
 */
export function calculateLGS(_llmId: string): LGSOutput {
  return {
    score: 1.0,
    breakdown: null,
  }
}
