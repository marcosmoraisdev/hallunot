import { describe, it, expect } from "vitest"
import { computeScore } from "../scoring"
import { SIX_MONTHS_MS } from "../../../lib/constants"

const CUTOFF = new Date("2024-10-01").getTime()

function makeVersion(releaseDateStr: string, breaking = false) {
  return { releaseDate: new Date(releaseDateStr).getTime(), breaking }
}

const llm = { approxCutoff: CUTOFF }

describe("computeScore", () => {
  it("version released well before cutoff -> score ~95-100, risk low", () => {
    const result = computeScore(makeVersion("2023-01-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.risk).toBe("low")
  })

  it("version released at cutoff -> score ~85, risk low", () => {
    const result = computeScore(makeVersion("2024-10-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(83)
    expect(result.score).toBeLessThanOrEqual(87)
    expect(result.risk).toBe("low")
  })

  it("version released 1 month after cutoff -> score ~65-67, risk medium", () => {
    const result = computeScore(makeVersion("2024-11-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(60)
    expect(result.score).toBeLessThanOrEqual(70)
    expect(result.risk).toBe("medium")
  })

  it("version released 3 months after cutoff -> score ~55-60, risk medium", () => {
    const result = computeScore(makeVersion("2025-01-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.score).toBeLessThanOrEqual(65)
    expect(result.risk).toBe("medium")
  })

  it("version released ~6 months after cutoff (calendar) -> score ~40, risk medium", () => {
    // Calendar 6 months (183 days) slightly exceeds our 180-day SIX_MONTHS_MS
    const result = computeScore(makeVersion("2025-04-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(38)
    expect(result.score).toBeLessThanOrEqual(50)
    expect(result.risk).toBe("medium")
  })

  it("version released 9 months after cutoff -> score ~25, risk high", () => {
    const result = computeScore(makeVersion("2025-07-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(15)
    expect(result.score).toBeLessThanOrEqual(35)
    expect(result.risk).toBe("high")
  })

  it("version released 12+ months after cutoff -> score ~10, risk high", () => {
    const result = computeScore(makeVersion("2025-10-01"), llm)
    expect(result.score).toBeGreaterThanOrEqual(5)
    expect(result.score).toBeLessThanOrEqual(15)
    expect(result.risk).toBe("high")
  })

  it("breaking version within cutoff -> score reduced by 15", () => {
    const nonBreaking = computeScore(makeVersion("2024-06-01", false), llm)
    const breaking = computeScore(makeVersion("2024-06-01", true), llm)
    expect(breaking.score).toBe(nonBreaking.score - 15)
  })

  it("breaking version after cutoff -> penalty stacks with time penalty", () => {
    const nonBreaking = computeScore(makeVersion("2025-01-01", false), llm)
    const breaking = computeScore(makeVersion("2025-01-01", true), llm)
    expect(breaking.score).toBe(nonBreaking.score - 15)
    expect(breaking.risk).not.toBe("low")
  })

  it("score never below 0", () => {
    const result = computeScore(makeVersion("2026-06-01", true), llm)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it("score never above 100", () => {
    const result = computeScore(makeVersion("2020-01-01"), llm)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it("edge case: release_date exactly equals cutoff", () => {
    const result = computeScore(makeVersion("2024-10-01"), llm)
    expect(result.score).toBe(85)
    expect(result.risk).toBe("low")
  })

  it("edge case: release_date exactly 6 months after cutoff", () => {
    // Use exact 6 months in ms from cutoff
    const sixMonthsAfter = CUTOFF + SIX_MONTHS_MS
    const result = computeScore(
      { releaseDate: sixMonthsAfter, breaking: false },
      llm
    )
    expect(result.score).toBe(50)
    expect(result.risk).toBe("medium")
  })

  it("returns a reason string", () => {
    const result = computeScore(makeVersion("2024-06-01"), llm)
    expect(result.reason).toBeTruthy()
    expect(typeof result.reason).toBe("string")
  })

  it("breaking version reason mentions breaking release", () => {
    const result = computeScore(makeVersion("2024-06-01", true), llm)
    expect(result.reason).toContain("breaking")
  })
})
