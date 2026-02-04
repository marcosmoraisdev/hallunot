import type { LlmProvider } from '@/domain/models/llm'
import type { ModelsDevResponseDTO } from '@/infrastructure/types/models-dev'
import { mapModelsDevResponse } from '@/infrastructure/mappers/models-dev-mapper'
import { logger } from '@/lib/logger'

const API_URL = 'https://models.dev/api.json'

/**
 * Fetches all LLM providers from the models.dev API.
 * Uses Next.js ISR caching with a 1-day revalidation period.
 *
 * @returns Promise resolving to an array of LlmProvider entities
 * @throws Error if the API request fails
 */
export async function fetchAllProviders(): Promise<LlmProvider[]> {
  logger.info("Fetching all providers from models.dev")
  const res = await fetch(API_URL, {
    next: { revalidate: 86400 }, // 1 day ISR cache
  })

  if (!res.ok) {
    logger.error({ status: res.status, statusText: res.statusText }, "Failed to fetch providers from models.dev")
    throw new Error(`models.dev API error: ${res.status} ${res.statusText}`)
  }

  const data: ModelsDevResponseDTO = await res.json()
  const providers = mapModelsDevResponse(data)
  logger.info({ providerCount: providers.length }, "Successfully fetched providers from models.dev")
  return providers
}
