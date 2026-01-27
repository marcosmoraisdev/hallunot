import { describe, it, expect } from "vitest"
import { classifyRisk, RISK_LABELS } from "../risk"

describe("classifyRisk", () => {
  it("score 100 -> low", () => {
    expect(classifyRisk(100)).toBe("low")
  })

  it("score 70 -> low", () => {
    expect(classifyRisk(70)).toBe("low")
  })

  it("score 69 -> medium", () => {
    expect(classifyRisk(69)).toBe("medium")
  })

  it("score 40 -> medium", () => {
    expect(classifyRisk(40)).toBe("medium")
  })

  it("score 39 -> high", () => {
    expect(classifyRisk(39)).toBe("high")
  })

  it("score 0 -> high", () => {
    expect(classifyRisk(0)).toBe("high")
  })
})

describe("RISK_LABELS", () => {
  it("has labels for all risk levels", () => {
    expect(RISK_LABELS.low).toBe("High reliability")
    expect(RISK_LABELS.medium).toBe("May require adjustments")
    expect(RISK_LABELS.high).toBe("High risk of outdated responses")
  })
})
