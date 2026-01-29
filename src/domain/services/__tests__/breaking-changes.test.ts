// src/domain/services/__tests__/breaking-changes.test.ts
import { describe, it, expect } from "vitest"
import { detectBreakingChanges } from "../breaking-changes"

// Factory: create a version entry
function makeVersionEntry(overrides: {
  version: string
  publishedAt: string
}) {
  return {
    version: overrides.version,
    publishedAt: overrides.publishedAt,
  }
}

describe("detectBreakingChanges", () => {
  it("marks first version as non-breaking", () => {
    const versions = [makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" })]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false)
  })

  it("marks major version bump as breaking", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(true)  // 2.0.0
  })

  it("marks minor/patch bumps as non-breaking", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.1.0", publishedAt: "2023-06-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.1.1", publishedAt: "2023-07-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result.every((v) => v.breaking === false)).toBe(true)
  })

  it("handles multiple major bumps", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.1.0", publishedAt: "2024-03-01T00:00:00Z" }),
      makeVersionEntry({ version: "3.0.0", publishedAt: "2025-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(true)  // 2.0.0
    expect(result[2].breaking).toBe(false) // 2.1.0
    expect(result[3].breaking).toBe(true)  // 3.0.0
  })

  it("handles pre-release versions gracefully", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.0.1-beta.1", publishedAt: "2023-02-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0-rc.1", publishedAt: "2023-06-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(false) // 1.0.1-beta.1 (same major)
    expect(result[2].breaking).toBe(true)  // 2.0.0-rc.1 (major bump)
  })

  it("returns empty array for empty input", () => {
    expect(detectBreakingChanges([])).toEqual([])
  })

  it("sorts versions by publishedAt before detecting", () => {
    const versions = [
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].version).toBe("1.0.0")
    expect(result[0].breaking).toBe(false)
    expect(result[1].version).toBe("2.0.0")
    expect(result[1].breaking).toBe(true)
  })

  it("handles versions without dots gracefully", () => {
    const versions = [
      makeVersionEntry({ version: "1", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2", publishedAt: "2024-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false)
    expect(result[1].breaking).toBe(true)
  })

  it("preserves original version data with breaking flag added", () => {
    const versions = [
      makeVersionEntry({ version: "3.2.1", publishedAt: "2023-06-15T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].version).toBe("3.2.1")
    expect(result[0].publishedAt).toBe("2023-06-15T00:00:00Z")
    expect(result[0]).toHaveProperty("breaking")
  })
})
