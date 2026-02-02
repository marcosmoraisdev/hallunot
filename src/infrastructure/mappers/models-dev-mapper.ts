import type { LlmProvider, LlmModel } from '@/domain/models/llm'
import type {
  ModelsDevResponseDTO,
  ModelsDevProviderDTO,
  ModelsDevModelDTO,
} from '@/infrastructure/types/models-dev'

/**
 * Maps a single model from the models.dev API to domain LlmModel.
 * Converts snake_case to camelCase and injects providerId.
 */
export function mapModel(
  providerId: string,
  modelId: string,
  dto: ModelsDevModelDTO
): LlmModel {
  // Create a unique ID by combining provider and model to avoid duplicates
  // since the same model ID can appear across multiple providers
  const baseId = dto.id || modelId
  return {
    id: `${providerId}/${baseId}`,
    providerId,
    name: dto.name,
    family: dto.family ?? "",
    releaseDate: dto.release_date,
    lastUpdated: dto.last_updated,
    knowledgeCutoff: dto.knowledge,
    reasoning: dto.reasoning,
    toolCall: dto.tool_call,
    attachment: dto.attachment,
    structuredOutput: dto.structured_output,
    temperature: dto.temperature,
    modalities: dto.modalities,
    limit: dto.limit,
    cost: dto.cost
      ? {
          input: dto.cost.input,
          output: dto.cost.output,
          reasoning: dto.cost.reasoning,
          cacheRead: dto.cost.cache_read,
          cacheWrite: dto.cost.cache_write,
        }
      : undefined,
  }
}

/**
 * Maps a provider from the models.dev API to domain LlmProvider.
 * Converts the models object map to an array.
 */
export function mapProvider(
  providerId: string,
  dto: ModelsDevProviderDTO
): LlmProvider {
  const models = Object.entries(dto.models).map(([modelId, modelDto]) =>
    mapModel(providerId, modelId, modelDto)
  )

  return {
    id: dto.id || providerId,
    name: dto.name,
    env: dto.env,
    npm: dto.npm,
    api: dto.api,
    doc: dto.doc,
    models,
  }
}

/**
 * Maps the complete models.dev API response to domain LlmProvider array.
 * Transforms the provider object map to an array of LlmProvider entities.
 */
export function mapModelsDevResponse(data: ModelsDevResponseDTO): LlmProvider[] {
  return Object.entries(data).map(([providerId, providerDto]) =>
    mapProvider(providerId, providerDto)
  )
}
