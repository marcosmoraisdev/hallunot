// src/domain/services/__tests__/llm-service.test.ts
import { describe, it, expect } from "vitest"
import {
  filterAndPaginateLlms,
  mapProvidersToResponse,
  findModelById,
} from "../llm-service"
import type { LlmProvider } from "@/domain/models/llm"

// Test fixtures
function createTestProviders(): LlmProvider[] {
  return [
    {
      id: "openai",
      name: "OpenAI",
      env: ["OPENAI_API_KEY"],
      npm: "@ai-sdk/openai",
      api: "https://api.openai.com/v1",
      doc: "https://openai.com/docs",
      models: [
        {
          id: "openai/gpt-4",
          providerId: "openai",
          name: "GPT-4",
          family: "gpt",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "openai/gpt-3.5-turbo",
          providerId: "openai",
          name: "GPT-3.5 Turbo",
          family: "gpt",
          knowledgeCutoff: "2023-09",
        },
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      env: ["ANTHROPIC_API_KEY"],
      npm: "@ai-sdk/anthropic",
      api: "https://api.anthropic.com/v1",
      doc: "https://anthropic.com/docs",
      models: [
        {
          id: "anthropic/claude-3-opus",
          providerId: "anthropic",
          name: "Claude 3 Opus",
          family: "claude",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "anthropic/claude-3-sonnet",
          providerId: "anthropic",
          name: "Claude 3 Sonnet",
          family: "claude",
          knowledgeCutoff: "2024-04",
        },
      ],
    },
    {
      id: "google",
      name: "Google",
      env: ["GOOGLE_API_KEY"],
      npm: "@ai-sdk/google",
      api: "https://generativelanguage.googleapis.com/v1",
      doc: "https://ai.google/docs",
      models: [
        {
          id: "google/gemini-pro",
          providerId: "google",
          name: "Gemini Pro",
          family: "gemini",
          knowledgeCutoff: "2024-01",
        },
      ],
    },
  ]
}

describe("filterAndPaginateLlms", () => {
  describe("without filters", () => {
    it("returns all models paginated", () => {
      const providers = createTestProviders()
      const result = filterAndPaginateLlms(
        providers,
        {},
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(5)
      expect(result.pagination.total).toBe(5)
      expect(result.pagination.totalPages).toBe(1)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.perPage).toBe(10)
    })

    it("paginates correctly", () => {
      const providers = createTestProviders()

      const page1 = filterAndPaginateLlms(
        providers,
        {},
        { page: 1, perPage: 2 }
      )
      expect(page1.models).toHaveLength(2)
      expect(page1.models[0].name).toBe("GPT-4")
      expect(page1.models[1].name).toBe("GPT-3.5 Turbo")
      expect(page1.pagination.totalPages).toBe(3)

      const page2 = filterAndPaginateLlms(
        providers,
        {},
        { page: 2, perPage: 2 }
      )
      expect(page2.models).toHaveLength(2)
      expect(page2.models[0].name).toBe("Claude 3 Opus")
      expect(page2.models[1].name).toBe("Claude 3 Sonnet")

      const page3 = filterAndPaginateLlms(
        providers,
        {},
        { page: 3, perPage: 2 }
      )
      expect(page3.models).toHaveLength(1)
      expect(page3.models[0].name).toBe("Gemini Pro")
    })
  })

  describe("with provider filter", () => {
    it("filters by provider ID (case-insensitive)", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "ANTHROPIC" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.providerId === "anthropic")).toBe(true)
      expect(result.pagination.total).toBe(2)
    })

    it("returns empty when provider not found", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "nonexistent" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  describe("with search filter", () => {
    it("searches by model name (case-insensitive)", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "claude" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.name.toLowerCase().includes("claude"))).toBe(true)
    })

    it("searches by model family", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "gpt" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.family === "gpt")).toBe(true)
    })

    it("searches by provider ID", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "google" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(1)
      expect(result.models[0].name).toBe("Gemini Pro")
    })
  })

  describe("with combined filters", () => {
    it("applies both provider and search filters", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "openai", search: "turbo" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(1)
      expect(result.models[0].name).toBe("GPT-3.5 Turbo")
    })

    it("returns empty when filters have no overlap", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "openai", search: "claude" },
        { page: 1, perPage: 10 }
      )

      expect(result.models).toHaveLength(0)
    })
  })
})

describe("mapProvidersToResponse", () => {
  it("maps providers to response format", () => {
    const providers = createTestProviders()
    const result = mapProvidersToResponse(providers)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      id: "openai",
      name: "OpenAI",
      doc: "https://openai.com/docs",
      modelCount: 2,
    })
  })
})

describe("findModelById", () => {
  it("finds model by ID across providers", () => {
    const providers = createTestProviders()
    const model = findModelById(providers, "anthropic/claude-3-opus")

    expect(model).toBeDefined()
    expect(model?.name).toBe("Claude 3 Opus")
  })

  it("returns undefined when model not found", () => {
    const providers = createTestProviders()
    const model = findModelById(providers, "nonexistent/model")

    expect(model).toBeUndefined()
  })
})
