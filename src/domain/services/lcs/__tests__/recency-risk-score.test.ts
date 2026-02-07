// src/domain/services/lcs/__tests__/recency-risk-score.test.ts
import { RecencyRiskScore } from '../components/recency-risk-score'
import type { LCSContext } from '../types'

function createContext(
  versionReleaseDate: Date,
  llmCutoffDate: Date
): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars: 1000,
      dependentsCount: 100,
    },
    version: { version: '1.0.0', releaseDate: versionReleaseDate },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: llmCutoffDate },
  }
}

describe('RecencyRiskScore', () => {
  const scorer = new RecencyRiskScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('recency')
    expect(scorer.weight).toBe(0.40)
  })

  it('returns high score when version released well before cutoff (12 months)', () => {
    const cutoff = new Date('2024-06-01')
    const release = new Date('2023-06-01') // 12 months before
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.7)
  })

  it('returns low score when version released after cutoff (6 months)', () => {
    const cutoff = new Date('2024-01-01')
    const release = new Date('2024-07-01') // 6 months after
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeLessThan(0.3)
  })

  it('returns mid score when version released near cutoff', () => {
    const cutoff = new Date('2024-06-01')
    const release = new Date('2024-06-01') // exactly at cutoff
    const ctx = createContext(release, cutoff)
    const score = scorer.calculate(ctx)
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.7)
  })

  it('returns very low score for versions released 12+ months after cutoff', () => {
    const cutoff = new Date('2024-01-01')
    const release = new Date('2025-01-01') // 12 months after
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeLessThan(0.1)
  })
})
