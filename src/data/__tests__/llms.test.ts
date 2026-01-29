import { describe, it, expect } from "vitest"
import { getAllLlms, findLlmByName, findLlmById } from "../llms"

describe("getAllLlms", () => {
  it("returns an array of LLMs", () => {
    const llms = getAllLlms()
    expect(Array.isArray(llms)).toBe(true)
    expect(llms.length).toBeGreaterThan(0)
  })

  it("each LLM has required fields", () => {
    const llms = getAllLlms()
    for (const llm of llms) {
      expect(llm).toHaveProperty("id")
      expect(llm).toHaveProperty("name")
      expect(llm).toHaveProperty("provider")
      expect(llm).toHaveProperty("approxCutoff")
      expect(typeof llm.id).toBe("string")
      expect(typeof llm.name).toBe("string")
      expect(typeof llm.provider).toBe("string")
      expect(typeof llm.approxCutoff).toBe("number")
    }
  })
})

describe("findLlmByName", () => {
  it("finds LLM by exact name", () => {
    const llm = findLlmByName("GPT-4o")
    expect(llm).toBeDefined()
    expect(llm?.name).toBe("GPT-4o")
  })

  it("finds LLM case-insensitively", () => {
    const llm = findLlmByName("gpt-4o")
    expect(llm).toBeDefined()
    expect(llm?.name).toBe("GPT-4o")
  })

  it("returns undefined for non-existent LLM", () => {
    const llm = findLlmByName("NonExistent")
    expect(llm).toBeUndefined()
  })
})

describe("findLlmById", () => {
  it("finds LLM by id", () => {
    const llm = findLlmById("gpt-4o")
    expect(llm).toBeDefined()
    expect(llm?.id).toBe("gpt-4o")
  })

  it("returns undefined for non-existent id", () => {
    const llm = findLlmById("nonexistent")
    expect(llm).toBeUndefined()
  })
})
