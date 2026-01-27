export type RiskLevel = "low" | "medium" | "high"

export interface Compatibility {
  llmId: string
  libraryId: string
  version: string
  score: number // 0-100
  risk: RiskLevel
  reason: string
}
