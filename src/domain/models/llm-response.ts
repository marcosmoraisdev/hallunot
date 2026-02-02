/**
 * LLM Response Types for Frontend Consumption
 *
 * These are minimal types containing only the fields needed by the frontend
 * for the scoring use case. Cost and other non-scoring fields are excluded.
 */

/**
 * Provider information for frontend display
 */
export interface LlmProviderResponse {
  id: string
  name: string
  doc: string
  modelCount: number
}

/**
 * Model information for frontend display and scoring
 * Excludes cost and other non-scoring fields
 */
export interface LlmModelResponse {
  id: string
  providerId: string
  providerName: string
  name: string
  family: string
  knowledgeCutoff?: string
  reasoning?: boolean
  toolCall?: boolean
  modalities?: {
    input: string[]
    output: string[]
  }
  limit?: {
    context?: number
    output?: number
  }
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

/**
 * Complete LLM list response with providers, models, and pagination
 */
export interface LlmListResponse {
  providers: LlmProviderResponse[]
  models: LlmModelResponse[]
  pagination: PaginationMeta
}
