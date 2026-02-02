import type { LlmProvider, LlmModel } from "../models/llm"
import type {
  LlmProviderResponse,
  LlmModelResponse,
  LlmListResponse,
  PaginationMeta,
} from "../models/llm-response"

/**
 * Filters for LLM queries
 */
export interface LlmFilters {
  /** Filter by provider ID (case-insensitive) */
  provider?: string
  /** Search models by name, family, or providerId (case-insensitive) */
  search?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed, first page = 1) */
  page: number
  /** Number of items per page */
  perPage: number
}

/**
 * Map a single provider to its response representation
 */
function mapProviderToResponse(provider: LlmProvider): LlmProviderResponse {
  return {
    id: provider.id,
    name: provider.name,
    doc: provider.doc,
    modelCount: provider.models.length,
  }
}

/**
 * Map providers to their response representation
 */
export function mapProvidersToResponse(
  providers: LlmProvider[]
): LlmProviderResponse[] {
  return providers.map(mapProviderToResponse)
}

/**
 * Map a single model to its response representation
 */
function mapModelToResponse(
  model: LlmModel,
  providerName: string
): LlmModelResponse {
  return {
    id: model.id,
    providerId: model.providerId,
    providerName,
    name: model.name,
    family: model.family,
    knowledgeCutoff: model.knowledgeCutoff,
    reasoning: model.reasoning,
    toolCall: model.toolCall,
    modalities: model.modalities,
    limit: model.limit,
  }
}

/**
 * Map models to their response representation
 * Requires a provider lookup map to resolve provider names
 */
export function mapModelsToResponse(
  models: LlmModel[],
  providerNameMap: Map<string, string>
): LlmModelResponse[] {
  return models.map((model) => {
    const providerName = providerNameMap.get(model.providerId) ?? model.providerId
    return mapModelToResponse(model, providerName)
  })
}

/**
 * Build a map from provider ID to provider name
 */
function buildProviderNameMap(providers: LlmProvider[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const provider of providers) {
    map.set(provider.id, provider.name)
  }
  return map
}

/**
 * Check if a model matches the search query
 * Searches in name, family, and providerId (case-insensitive)
 */
function modelMatchesSearch(model: LlmModel, search: string): boolean {
  const searchLower = search.toLowerCase()
  return (
    model.name.toLowerCase().includes(searchLower) ||
    model.family.toLowerCase().includes(searchLower) ||
    model.providerId.toLowerCase().includes(searchLower)
  )
}

/**
 * Find a model by its ID across all providers
 */
export function findModelById(
  providers: LlmProvider[],
  modelId: string
): LlmModel | undefined {
  for (const provider of providers) {
    const model = provider.models.find((m) => m.id === modelId)
    if (model) {
      return model
    }
  }
  return undefined
}

/**
 * Filter and paginate LLMs
 *
 * @param providers - All available LLM providers
 * @param filters - Optional filters for provider and search
 * @param pagination - Pagination parameters (0-indexed pages)
 * @returns Paginated response with providers and models
 */
export function filterAndPaginateLlms(
  providers: LlmProvider[],
  filters: LlmFilters,
  pagination: PaginationParams
): LlmListResponse {
  const { provider: providerFilter, search } = filters
  const { page, perPage } = pagination

  // Build provider name map for response transformation
  const providerNameMap = buildProviderNameMap(providers)

  // Filter providers by ID if specified
  let filteredProviders = providers
  if (providerFilter) {
    const providerFilterLower = providerFilter.toLowerCase()
    filteredProviders = providers.filter(
      (p) => p.id.toLowerCase() === providerFilterLower
    )
  }

  // Collect all models from filtered providers
  let allModels: LlmModel[] = filteredProviders.flatMap((p) => p.models)

  // Apply search filter on models
  if (search) {
    allModels = allModels.filter((model) => modelMatchesSearch(model, search))
  }

  // Calculate pagination (1-indexed)
  const total = allModels.length
  const totalPages = Math.ceil(total / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage

  // Slice models for current page
  const paginatedModels = allModels.slice(startIndex, endIndex)

  // Build pagination metadata
  const paginationMeta: PaginationMeta = {
    page,
    perPage,
    total,
    totalPages,
  }

  // Transform to response types
  const providerResponses = mapProvidersToResponse(filteredProviders)
  const modelResponses = mapModelsToResponse(paginatedModels, providerNameMap)

  return {
    providers: providerResponses,
    models: modelResponses,
    pagination: paginationMeta,
  }
}
