import { describe, it, expect } from "vitest"

describe("GET /api/platforms", () => {
  it("should be defined as a module", async () => {
    const mod = await import("../route")
    expect(mod.GET).toBeDefined()
  })
})
