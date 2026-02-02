/**
 * DTO types for the models.dev API response.
 * These types represent the raw API response structure and use snake_case
 * as that's how the data comes from the API.
 *
 * API endpoint: https://models.dev/api.json
 */

/**
 * Cost information for a model (per million tokens).
 */
export interface ModelsDevCostDTO {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  reasoning?: number;
  reasoning_read?: number;
  input_audio?: number;
  output_audio?: number;
}

/**
 * Token limits for a model.
 */
export interface ModelsDevLimitDTO {
  context: number;
  output: number;
}

/**
 * Input/output modalities supported by a model.
 */
export interface ModelsDevModalitiesDTO {
  input: string[];
  output: string[];
}

/**
 * Interleaved reasoning configuration (for reasoning models).
 */
export interface ModelsDevInterleavedDTO {
  field: string;
}

/**
 * A single model from the models.dev API.
 */
export interface ModelsDevModelDTO {
  id: string;
  name: string;
  family?: string;
  release_date: string;
  last_updated: string;
  knowledge?: string;
  reasoning: boolean;
  tool_call: boolean;
  attachment: boolean;
  structured_output?: boolean;
  temperature: boolean;
  modalities: ModelsDevModalitiesDTO;
  open_weights: boolean;
  limit: ModelsDevLimitDTO;
  cost: ModelsDevCostDTO;
  interleaved?: ModelsDevInterleavedDTO;
}

/**
 * A provider from the models.dev API.
 */
export interface ModelsDevProviderDTO {
  id: string;
  name: string;
  env: string[];
  npm: string;
  api: string;
  doc: string;
  models: Record<string, ModelsDevModelDTO>;
}

/**
 * The complete API response from models.dev.
 * Object keyed by provider ID.
 */
export type ModelsDevResponseDTO = Record<string, ModelsDevProviderDTO>;
