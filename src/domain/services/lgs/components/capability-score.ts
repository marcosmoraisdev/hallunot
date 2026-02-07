// src/domain/services/lgs/components/capability-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'

/**
 * Measures breadth of declared model capabilities.
 * Counts binary feature signals: reasoning, tool calling, structured output,
 * attachments, multimodal input, multimodal output.
 * Score = count / 6 (total possible signals).
 */
export class CapabilityScore implements LGSScoreComponent {
  readonly id = 'capability'
  readonly weight = 0.30

  calculate(ctx: LGSContext): number {
    const { model } = ctx
    let count = 0

    if (model.reasoning) count++
    if (model.toolCall) count++
    if (model.structuredOutput) count++
    if (model.attachment) count++
    if (model.modalities.input.length > 1) count++
    if (model.modalities.output.length > 1) count++

    return count / 6
  }
}
