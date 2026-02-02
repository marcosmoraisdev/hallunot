export interface LlmProvider {
  id: string
  name: string
  env: string
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
  releaseDate: string
  lastUpdated: string
  knowledgeCutoff: string
  reasoning: boolean
  toolCall: boolean
  attachment: boolean
  structuredOutput: boolean
  temperature: number
  modalities: string[]
  limit: LlmModelLimit
  cost: LlmModelCost
}

export interface LlmModelLimit {
  context: number
  output: number
}

export interface LlmModelCost {
  input: number
  output: number
}
