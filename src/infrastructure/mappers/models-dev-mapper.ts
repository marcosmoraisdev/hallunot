import type { LlmProvider, LlmModel, LlmModelLimit, LlmModelCost } from '@/domain/models/llm'
import type {
  ModelsDevResponseDTO,
  ModelsDevProviderDTO,
  ModelsDevModelDTO,
  ModelsDevLimitDTO,
  ModelsDevCostDTO,
} from '@/infrastructure/types/models-dev'

/**
 * Maps cost DTO to domain cost type.
 * Only includes input and output costs as per domain model.
 */
function mapCost(dto: ModelsDevCostDTO): LlmModelCost {
  return {
    input: dto.input,
    output: dto.output,
  }
}

/**
 * Maps limit DTO to domain limit type.
 */
function mapLimit(dto: ModelsDevLimitDTO): LlmModelLimit {
  return {
    context: dto.context,
    output: dto.output,
  }
}

/**
 * Maps a single model from the models.dev API to domain LlmModel.
 * Converts snake_case to camelCase and injects providerId.
 */
export function mapModel(providerId: string, modelId: string, dto: ModelsDevModelDTO): LlmModel {
  return {
    id: dto.id || modelId,
    providerId,
    name: dto.name,
    family: dto.family ?? '',
    releaseDate: dto.release_date,
    lastUpdated: dto.last_updated,
    knowledgeCutoff: dto.knowledge ?? '',
    reasoning: dto.reasoning,
    toolCall: dto.tool_call,
    attachment: dto.attachment,
    structuredOutput: dto.structured_output ?? false,
    temperature: dto.temperature ? 1 : 0,
    modalities: [...dto.modalities.input, ...dto.modalities.output],
    limit: mapLimit(dto.limit),
    cost: mapCost(dto.cost),
  }
}

/**
 * Maps a provider from the models.dev API to domain LlmProvider.
 * Converts the models object map to an array.
 */
export function mapProvider(providerId: string, dto: ModelsDevProviderDTO): LlmProvider {
  const models = Object.entries(dto.models).map(([modelId, modelDto]) =>
    mapModel(providerId, modelId, modelDto)
  )

  return {
    id: dto.id || providerId,
    name: dto.name,
    env: dto.env.join(','),
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
