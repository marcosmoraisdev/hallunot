// src/domain/services/lcs/__tests__/aggregator.test.ts
import { WeightedScoreAggregator } from '../aggregator'
import type { ScoreComponent } from '../types'

function createMockComponent(
  id: string,
  weight: number,
  value: number
): ScoreComponent<unknown> {
  return {
    id,
    weight,
    calculate: () => value,
  }
}

describe('WeightedScoreAggregator', () => {
  it('throws if weights do not sum to 1.0', () => {
    const components = [
      createMockComponent('a', 0.5, 1),
      createMockComponent('b', 0.3, 1),
    ]
    expect(() => new WeightedScoreAggregator(components)).toThrow(
      'Component weights must sum to 1.0'
    )
  })

  it('accepts weights that sum to 1.0', () => {
    const components = [
      createMockComponent('a', 0.6, 1),
      createMockComponent('b', 0.4, 1),
    ]
    expect(() => new WeightedScoreAggregator(components)).not.toThrow()
  })

  it('clamps component values to [0,1]', () => {
    const components = [
      createMockComponent('a', 0.5, 1.5), // Over 1
      createMockComponent('b', 0.5, -0.5), // Under 0
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    expect(result.breakdown[0].rawValue).toBe(1) // Clamped from 1.5
    expect(result.breakdown[1].rawValue).toBe(0) // Clamped from -0.5
  })

  it('returns correct weighted sum', () => {
    const components = [
      createMockComponent('a', 0.6, 1.0),
      createMockComponent('b', 0.4, 0.5),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    // 0.6 * 1.0 + 0.4 * 0.5 = 0.6 + 0.2 = 0.8
    expect(result.score).toBeCloseTo(0.8, 5)
  })

  it('includes breakdown with contributions', () => {
    const components = [
      createMockComponent('a', 0.7, 0.8),
      createMockComponent('b', 0.3, 0.6),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    expect(result.breakdown).toHaveLength(2)
    
    expect(result.breakdown[0].id).toBe('a')
    expect(result.breakdown[0].rawValue).toBe(0.8)
    expect(result.breakdown[0].weight).toBe(0.7)
    expect(result.breakdown[0].contribution).toBeCloseTo(0.56, 5) // 0.8 * 0.7
    
    expect(result.breakdown[1].id).toBe('b')
    expect(result.breakdown[1].rawValue).toBe(0.6)
    expect(result.breakdown[1].weight).toBe(0.3)
    expect(result.breakdown[1].contribution).toBeCloseTo(0.18, 5) // 0.6 * 0.3
  })

  it('returns component info for introspection', () => {
    const components = [
      createMockComponent('stability', 0.6, 1),
      createMockComponent('recency', 0.4, 1),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const info = aggregator.getComponentInfo()

    expect(info).toEqual([
      { id: 'stability', weight: 0.6 },
      { id: 'recency', weight: 0.4 },
    ])
  })
})
