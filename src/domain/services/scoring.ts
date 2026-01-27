import type { RiskLevel } from "../models/compatibility"
import { SIX_MONTHS_MS, TWELVE_MONTHS_MS } from "../../lib/constants"
import { classifyRisk } from "./risk"

export function computeScore(
  version: { releaseDate: number; breaking: boolean },
  llm: { approxCutoff: number }
): { score: number; risk: RiskLevel; reason: string } {
  const diff = version.releaseDate - llm.approxCutoff
  let score: number
  let reason: string

  if (diff <= 0) {
    // Released before or at cutoff
    const beforeMs = Math.abs(diff)
    // Versions well before cutoff get higher scores (closer to 100)
    // Versions right at cutoff get ~85
    const monthsBefore = beforeMs / (30 * 24 * 60 * 60 * 1000)
    score = Math.min(100, 85 + monthsBefore * 0.5)
    reason = `Released ${monthsBefore < 1 ? "around" : Math.round(monthsBefore) + " months before"} the LLM's training cutoff. The model likely has strong knowledge of this version.`
  } else if (diff <= SIX_MONTHS_MS) {
    // Within 6 months after cutoff: linear 70 -> 50
    const ratio = diff / SIX_MONTHS_MS
    score = 70 - ratio * 20
    reason = `Released ${Math.round(diff / (30 * 24 * 60 * 60 * 1000))} months after the LLM's training cutoff. The model may have partial knowledge of this version.`
  } else {
    // Beyond 6 months: linear 40 -> 10 (at 12 months+)
    const beyondSixMonths = diff - SIX_MONTHS_MS
    const ratio = Math.min(beyondSixMonths / (TWELVE_MONTHS_MS - SIX_MONTHS_MS), 1)
    score = 40 - ratio * 30
    reason = `Released ${Math.round(diff / (30 * 24 * 60 * 60 * 1000))} months after the LLM's training cutoff. The model is unlikely to have reliable knowledge of this version.`
  }

  if (version.breaking) {
    score -= 15
    reason += " This is a breaking release, which increases the risk of outdated or incorrect responses."
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  const risk = classifyRisk(score)

  return { score, risk, reason }
}
