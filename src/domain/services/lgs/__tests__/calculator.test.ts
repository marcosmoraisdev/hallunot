// src/domain/services/lgs/__tests__/calculator.test.ts
import { LGSCalculator } from '../calculator'
import type { LGSContext } from '../types'

const fullCapabilityModel: LGSContext = {
  model: {
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    attachment: true,
    modalities: { input: ['text', 'image'], output: ['text', 'image'] },
    contextLimit: 1_000_000,
    outputLimit: 100_000,
    knowledgeCutoff: new Date(),
    lastUpdated: new Date(),
    openWeights: true,
    apiCompatibility: '@ai-sdk/openai-compatible',
  },
}

const minimalModel: LGSContext = {
  model: {
    reasoning: false,
    toolCall: false,
    structuredOutput: false,
    attachment: false,
    modalities: { input: ['text'], output: ['text'] },
    contextLimit: 4_096,
    outputLimit: 1_024,
    knowledgeCutoff: new Date('2020-01-01'),
    lastUpdated: new Date('2020-01-01'),
    openWeights: false,
    apiCompatibility: '',
  },
}

describe('LGSCalculator', () => {
  const calculator = new LGSCalculator()

  it('returns high score for fully capable model', () => {
    const result = calculator.calculate(fullCapabilityModel)
    expect(result.score).toBeGreaterThan(0.8)
  })

  it('returns low score for minimal model', () => {
    const result = calculator.calculate(minimalModel)
    expect(result.score).toBeLessThan(0.3)
  })

  it('returns breakdown with all 4 components', () => {
    const result = calculator.calculate(fullCapabilityModel)

    expect(result.breakdown).toHaveLength(4)
    const ids = result.breakdown.map((b) => b.id)
    expect(ids).toContain('capability')
    expect(ids).toContain('limit')
    expect(ids).toContain('recency')
    expect(ids).toContain('openness')
  })

  it('weights sum to 1.0', () => {
    const result = calculator.calculate(fullCapabilityModel)
    const totalWeight = result.breakdown.reduce((sum, b) => sum + b.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 3)
  })

  it('score equals sum of contributions', () => {
    const result = calculator.calculate(fullCapabilityModel)
    const sumContributions = result.breakdown.reduce((sum, b) => sum + b.contribution, 0)
    expect(result.score).toBeCloseTo(sumContributions, 2)
  })
})
