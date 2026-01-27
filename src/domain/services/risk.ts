import type { RiskLevel } from "../models/compatibility"

export function classifyRisk(score: number): RiskLevel {
  if (score >= 70) return "low"
  if (score >= 40) return "medium"
  return "high"
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "High reliability",
  medium: "May require adjustments",
  high: "High risk of outdated responses",
}
