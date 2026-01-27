import type { RiskLevel } from "@/domain/models"

interface ScoreBadgeProps {
  score: number
  risk: RiskLevel
}

export function ScoreBadge({ score, risk }: ScoreBadgeProps) {
  const styles: Record<RiskLevel, string> = {
    low: "bg-risk-low-bg text-risk-low",
    medium: "bg-risk-medium-bg text-risk-medium",
    high: "bg-risk-high-bg text-risk-high",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums tracking-tight ${styles[risk]}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          risk === "low"
            ? "bg-risk-low"
            : risk === "medium"
              ? "bg-risk-medium"
              : "bg-risk-high"
        }`}
      />
      {score}
    </span>
  )
}
