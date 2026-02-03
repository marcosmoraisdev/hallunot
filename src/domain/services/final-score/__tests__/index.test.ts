// src/domain/services/final-score/__tests__/index.test.ts
import { calculateFinalScores } from '../index'
import type { VersionScore } from '../../lcs/types'

describe('calculateFinalScores', () => {
  const versions: VersionScore[] = [
    {
      version: '1.0.0',
      releaseDate: '2023-01-01T00:00:00.000Z',
      recency: { value: 0.8, weight: 0.25, contribution: 0.2 },
      score: 0.75,
    },
    {
      version: '2.0.0',
      releaseDate: '2024-06-01T00:00:00.000Z',
      recency: { value: 0.4, weight: 0.25, contribution: 0.1 },
      score: 0.50,
    },
  ]

  it('calculates final = lcs × lgs', () => {
    const result = calculateFinalScores(versions, 0.8)

    expect(result.versions[0].final).toBe(0.6) // 0.75 * 0.8
    expect(result.versions[1].final).toBe(0.4) // 0.50 * 0.8
  })

  it('preserves lcs and lgs in output', () => {
    const result = calculateFinalScores(versions, 0.9)

    expect(result.versions[0].lcs).toBe(0.75)
    expect(result.versions[0].lgs).toBe(0.9)
  })

  it('includes formula for transparency', () => {
    const result = calculateFinalScores(versions, 1.0)
    expect(result.formula).toBe('LCS × LGS')
  })

  it('handles LGS = 1.0 (final equals LCS)', () => {
    const result = calculateFinalScores(versions, 1.0)

    expect(result.versions[0].final).toBe(0.75)
    expect(result.versions[1].final).toBe(0.5)
  })
})
