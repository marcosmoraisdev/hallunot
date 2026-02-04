// src/domain/services/lgs/types.ts
import type { ScoreComponent } from '../lcs/types'

/**
 * Context for LGS calculations.
 * Contains all LLM metadata needed by score components.
 */
export interface LGSContext {
  model: {
    reasoning: boolean
    toolCall: boolean
    structuredOutput: boolean
    attachment: boolean
    modalities: { input: string[]; output: string[] }
    contextLimit: number
    outputLimit: number
    knowledgeCutoff?: Date
    lastUpdated?: Date
    openWeights: boolean
    apiCompatibility: string
  }
}

/**
 * Type alias for LGS-specific score components.
 */
export type LGSScoreComponent = ScoreComponent<LGSContext>
