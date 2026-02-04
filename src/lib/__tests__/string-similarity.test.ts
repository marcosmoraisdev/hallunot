import { describe, it, expect } from "vitest"
import { nameSimilarity } from "../string-similarity"

describe("nameSimilarity", () => {
  it("returns 1.0 for exact match (case-insensitive)", () => {
    expect(nameSimilarity("React", "react")).toBe(1.0)
    expect(nameSimilarity("lodash", "lodash")).toBe(1.0)
  })

  it("returns 0.9 when name starts with query", () => {
    expect(nameSimilarity("react-dom", "react")).toBe(0.9)
    expect(nameSimilarity("lodash.get", "lodash")).toBe(0.9)
  })

  it("returns 0.8 when name contains query as substring", () => {
    expect(nameSimilarity("@types/react", "react")).toBe(0.8)
    expect(nameSimilarity("vue-router", "router")).toBe(0.8)
  })

  it("uses levenshtein similarity for non-matching names", () => {
    const sim = nameSimilarity("anglar", "angular")
    expect(sim).toBeGreaterThan(0.5)
    expect(sim).toBeLessThan(0.9)
  })

  it("returns 0 for completely different strings", () => {
    expect(nameSimilarity("a", "zzzzzzzzz")).toBe(0)
  })

  it("ranks exact > starts-with > contains > fuzzy", () => {
    const exact = nameSimilarity("react", "react")
    const startsWith = nameSimilarity("react-dom", "react")
    const contains = nameSimilarity("@types/react", "react")
    const fuzzy = nameSimilarity("anglar", "react")

    expect(exact).toBeGreaterThan(startsWith)
    expect(startsWith).toBeGreaterThan(contains)
    expect(contains).toBeGreaterThan(fuzzy)
  })

  it("is case-insensitive", () => {
    expect(nameSimilarity("React", "REACT")).toBe(1.0)
    expect(nameSimilarity("LODASH", "lodash")).toBe(1.0)
  })
})
