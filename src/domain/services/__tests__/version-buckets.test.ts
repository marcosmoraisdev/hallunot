// src/domain/services/__tests__/version-buckets.test.ts
import { describe, it, expect } from "vitest"
import { groupVersionsIntoBuckets } from "../version-buckets"
import type { RiskLevel } from "../../models"

interface ScoredVersion {
  version: string
  releaseDate: number
  breaking: boolean
  score: number
  risk: RiskLevel
  reason: string
}

function makeScoredVersion(overrides: Partial<ScoredVersion> & { version: string }): ScoredVersion {
  return {
    version: overrides.version,
    releaseDate: overrides.releaseDate ?? Date.now(),
    breaking: overrides.breaking ?? false,
    score: overrides.score ?? 80,
    risk: overrides.risk ?? "low",
    reason: overrides.reason ?? "test reason",
  }
}

describe("groupVersionsIntoBuckets", () => {
  it("groups versions by major version", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 90 }),
      makeScoredVersion({ version: "1.1.0", score: 85 }),
      makeScoredVersion({ version: "2.0.0", score: 60 }),
      makeScoredVersion({ version: "2.1.0", score: 55 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets).toHaveLength(2)
  })

  it("orders buckets by highest version score (descending)", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 95 }),
      makeScoredVersion({ version: "2.0.0", score: 60 }),
      makeScoredVersion({ version: "3.0.0", score: 30 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].major).toBe(1)
    expect(buckets[0].bestScore).toBe(95)
    expect(buckets[1].major).toBe(2)
    expect(buckets[2].major).toBe(3)
  })

  it("orders versions within a bucket by score descending", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 80 }),
      makeScoredVersion({ version: "1.2.0", score: 90 }),
      makeScoredVersion({ version: "1.1.0", score: 85 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].versions[0].version).toBe("1.2.0")
    expect(buckets[0].versions[1].version).toBe("1.1.0")
    expect(buckets[0].versions[2].version).toBe("1.0.0")
  })

  it("returns empty array for empty input", () => {
    expect(groupVersionsIntoBuckets([])).toEqual([])
  })

  it("handles single version", () => {
    const versions = [makeScoredVersion({ version: "5.3.1", score: 75 })]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets).toHaveLength(1)
    expect(buckets[0].major).toBe(5)
    expect(buckets[0].versions).toHaveLength(1)
  })

  it("includes bestScore in each bucket", () => {
    const versions = [
      makeScoredVersion({ version: "2.0.0", score: 50 }),
      makeScoredVersion({ version: "2.5.0", score: 70 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].bestScore).toBe(70)
  })

  it("handles non-semver versions by using 0 as major", () => {
    const versions = [
      makeScoredVersion({ version: "latest", score: 50 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].major).toBe(0)
  })
})
