// src/domain/services/lcs/__tests__/utils.test.ts
import { clamp, normalize, normalizeInverse, normalizeLog, daysSince } from '../utils'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('normalize', () => {
  it('returns 0 when value equals min', () => {
    expect(normalize(0, { min: 0, max: 100 })).toBe(0)
  })

  it('returns 1 when value equals max', () => {
    expect(normalize(100, { min: 0, max: 100 })).toBe(1)
  })

  it('returns 0.5 when value is midpoint', () => {
    expect(normalize(50, { min: 0, max: 100 })).toBe(0.5)
  })

  it('returns 0 when min equals max', () => {
    expect(normalize(50, { min: 50, max: 50 })).toBe(0)
  })

  it('clamps values outside range', () => {
    expect(normalize(-10, { min: 0, max: 100 })).toBe(0)
    expect(normalize(150, { min: 0, max: 100 })).toBe(1)
  })
})

describe('normalizeInverse', () => {
  it('returns 1 when value equals min', () => {
    expect(normalizeInverse(0, { min: 0, max: 100 })).toBe(1)
  })

  it('returns 0 when value equals max', () => {
    expect(normalizeInverse(100, { min: 0, max: 100 })).toBe(0)
  })

  it('returns 0.5 when value is midpoint', () => {
    expect(normalizeInverse(50, { min: 0, max: 100 })).toBe(0.5)
  })
})

describe('normalizeLog', () => {
  it('returns 0 for zero value', () => {
    expect(normalizeLog(0, { max: 100000 })).toBe(0)
  })

  it('returns 0 for negative values', () => {
    expect(normalizeLog(-10, { max: 100000 })).toBe(0)
  })

  it('returns 1 for max value', () => {
    expect(normalizeLog(100000, { max: 100000 })).toBeCloseTo(1, 5)
  })

  it('handles large values with diminishing returns', () => {
    const score1k = normalizeLog(1000, { max: 100000 })
    const score10k = normalizeLog(10000, { max: 100000 })
    const score100k = normalizeLog(100000, { max: 100000 })

    // Log scale: 10x increase should not give 10x score increase
    expect(score10k - score1k).toBeLessThan(score1k)
    expect(score100k).toBeCloseTo(1, 5)
  })
})

describe('daysSince', () => {
  it('returns positive days for past dates', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    expect(daysSince(tenDaysAgo)).toBeCloseTo(10, 0)
  })

  it('returns 0 for future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    expect(daysSince(tomorrow)).toBe(0)
  })

  it('returns 0 for now', () => {
    expect(daysSince(new Date())).toBeCloseTo(0, 1)
  })
})
