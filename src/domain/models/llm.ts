export interface LlmProvider {
  id: string
  name: string
  env: string[]
  npm: string
  api: string
  doc: string
  models: LlmModel[]
}

export interface LlmModel {
  id: string
  providerId: string
  name: string
  family: string
  releaseDate?: string
  lastUpdated?: string
  knowledgeCutoff?: string
  reasoning?: boolean
  toolCall?: boolean
  attachment?: boolean
  structuredOutput?: boolean
  temperature?: boolean
  openWeights?: boolean
  modalities?: {
    input: string[]
    output: string[]
  }
  limit?: {
    context?: number
    output?: number
  }
  cost?: {
    input?: number
    output?: number
    reasoning?: number
    cacheRead?: number
    cacheWrite?: number
  }
}
