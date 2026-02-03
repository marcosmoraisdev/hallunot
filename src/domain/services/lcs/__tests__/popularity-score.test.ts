// src/domain/services/lcs/__tests__/popularity-score.test.ts
import { PopularityScore } from '../components/popularity-score'
import type { LCSContext } from '../types'

function createContext(stars: number, dependentsCount: number): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars,
      dependentsCount,
    },
    version: { version: '1.0.0', releaseDate: new Date() },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: new Date() },
  }
}

describe('PopularityScore', () => {
  const scorer = new PopularityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('popularity')
    expect(scorer.weight).toBe(0.20)
  })

  it('returns 0 for zero stars and dependents', () => {
    const ctx = createContext(0, 0)
    expect(scorer.calculate(ctx)).toBe(0)
  })

  it('returns high score for popular libraries', () => {
    const ctx = createContext(100000, 10000)
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.9)
  })

  it('uses log scale - 10k stars is not 10x better than 1k', () => {
    const score1k = new PopularityScore().calculate(createContext(1000, 100))
    const score10k = new PopularityScore().calculate(createContext(10000, 1000))

    // With log scale, 10x increase should give much less than 10x score increase
    expect(score10k / score1k).toBeLessThan(2)
  })

  it('weights dependents more than stars', () => {
    const highStars = createContext(100000, 100)
    const highDependents = createContext(100, 10000)

    // Same order of magnitude but dependents weighted 0.6 vs stars 0.4
    const starsScore = scorer.calculate(highStars)
    const dependentsScore = scorer.calculate(highDependents)

    expect(dependentsScore).toBeGreaterThan(starsScore)
  })
})
