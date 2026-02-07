// src/domain/services/__tests__/llm-service.test.ts
import { describe, it, expect } from "vitest"
import {
  filterAndPaginateLlms,
  mapProvidersToResponse,
  findModelById,
  sortProviders,
  sortModels,
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
          releaseDate: "2024-03-01",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "openai/gpt-3.5-turbo",
          providerId: "openai",
          name: "GPT-3.5 Turbo",
          family: "gpt",
          releaseDate: "2023-06-01",
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
          releaseDate: "2024-04-01",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "anthropic/claude-3-sonnet",
          providerId: "anthropic",
          name: "Claude 3 Sonnet",
          family: "claude",
          releaseDate: "2024-03-01",
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
          releaseDate: "2024-02-01",
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

    it("paginates correctly with sorted models", () => {
      const providers = createTestProviders()
      // Sorted order: Claude 3 Opus (2024-04), Claude 3 Sonnet (2024-03, anthropic priority),
      //               GPT-4 (2024-03, openai priority), Gemini Pro (2024-02), GPT-3.5 Turbo (2023-06)

      const page1 = filterAndPaginateLlms(
        providers,
        {},
        { page: 1, perPage: 2 }
      )
      expect(page1.models).toHaveLength(2)
      expect(page1.models[0].name).toBe("Claude 3 Opus")
      expect(page1.models[1].name).toBe("Claude 3 Sonnet")
      expect(page1.pagination.totalPages).toBe(3)

      const page2 = filterAndPaginateLlms(
        providers,
        {},
        { page: 2, perPage: 2 }
      )
      expect(page2.models).toHaveLength(2)
      expect(page2.models[0].name).toBe("GPT-4")
      expect(page2.models[1].name).toBe("Gemini Pro")

      const page3 = filterAndPaginateLlms(
        providers,
        {},
        { page: 3, perPage: 2 }
      )
      expect(page3.models).toHaveLength(1)
      expect(page3.models[0].name).toBe("GPT-3.5 Turbo")
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

describe("sortProviders", () => {
  it("sorts prioritized providers first, then alphabetical", () => {
    const providers = [
      { id: "mistral", name: "Mistral" },
      { id: "openai", name: "OpenAI" },
      { id: "cohere", name: "Cohere" },
      { id: "anthropic", name: "Anthropic" },
      { id: "google", name: "Google" },
    ]

    const sorted = sortProviders(providers)
    expect(sorted.map((p) => p.id)).toEqual([
      "anthropic",
      "google",
      "openai",
      "cohere",
      "mistral",
    ])
  })

  it("handles all non-prioritized providers alphabetically", () => {
    const providers = [
      { id: "mistral", name: "Mistral" },
      { id: "cohere", name: "Cohere" },
      { id: "ai21", name: "AI21" },
    ]

    const sorted = sortProviders(providers)
    expect(sorted.map((p) => p.id)).toEqual(["ai21", "cohere", "mistral"])
  })
})

describe("sortModels", () => {
  it("sorts by release date descending (newest first)", () => {
    const models = [
      { id: "a", providerId: "openai", name: "Old", family: "f", releaseDate: "2023-01-01" },
      { id: "b", providerId: "openai", name: "New", family: "f", releaseDate: "2024-06-01" },
      { id: "c", providerId: "openai", name: "Mid", family: "f", releaseDate: "2024-01-01" },
    ] as LlmModel[]

    const sorted = sortModels(models)
    expect(sorted.map((m) => m.name)).toEqual(["New", "Mid", "Old"])
  })

  it("uses provider priority as tiebreaker for same release date", () => {
    const models = [
      { id: "a", providerId: "openai", name: "GPT-4", family: "f", releaseDate: "2024-03-01" },
      { id: "b", providerId: "anthropic", name: "Claude", family: "f", releaseDate: "2024-03-01" },
      { id: "c", providerId: "google", name: "Gemini", family: "f", releaseDate: "2024-03-01" },
    ] as LlmModel[]

    const sorted = sortModels(models)
    // anthropic=0, google=1, openai=2
    expect(sorted.map((m) => m.name)).toEqual(["Claude", "Gemini", "GPT-4"])
  })

  it("pushes models without releaseDate to the bottom", () => {
    const models = [
      { id: "a", providerId: "openai", name: "No Date", family: "f" },
      { id: "b", providerId: "openai", name: "Has Date", family: "f", releaseDate: "2023-01-01" },
    ] as LlmModel[]

    const sorted = sortModels(models)
    expect(sorted.map((m) => m.name)).toEqual(["Has Date", "No Date"])
  })

  it("sorts no-date models by provider priority among themselves", () => {
    const models = [
      { id: "a", providerId: "openai", name: "GPT-X", family: "f" },
      { id: "b", providerId: "anthropic", name: "Claude-X", family: "f" },
    ] as LlmModel[]

    const sorted = sortModels(models)
    expect(sorted.map((m) => m.name)).toEqual(["Claude-X", "GPT-X"])
  })
})

describe("filterAndPaginateLlms sorting", () => {
  it("returns providers sorted by priority in response", () => {
    const providers = createTestProviders()
    const result = filterAndPaginateLlms(providers, {}, { page: 1, perPage: 10 })

    // Providers: openai, anthropic, google in fixture
    // Sorted: anthropic(0), google(1), openai(2)
    expect(result.providers.map((p) => p.id)).toEqual([
      "anthropic",
      "google",
      "openai",
    ])
  })

  it("returns models sorted by release date with search filter", () => {
    const providers = createTestProviders()
    // Search "gpt" matches GPT-4 (2024-03) and GPT-3.5 Turbo (2023-06)
    const result = filterAndPaginateLlms(
      providers,
      { search: "gpt" },
      { page: 1, perPage: 10 }
    )

    expect(result.models).toHaveLength(2)
    expect(result.models[0].name).toBe("GPT-4")
    expect(result.models[1].name).toBe("GPT-3.5 Turbo")
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
