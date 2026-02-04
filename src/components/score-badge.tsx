import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import type { RiskLevel } from "@/domain/models"

interface ScoreBadgeProps {
  score: number
  risk: RiskLevel
}

const riskConfig: Record<
  RiskLevel,
  { icon: typeof CheckCircle2; bg: string; text: string }
> = {
  low: {
    icon: CheckCircle2,
    bg: "bg-risk-low-bg",
    text: "text-risk-low",
  },
  medium: {
    icon: AlertTriangle,
    bg: "bg-risk-medium-bg",
    text: "text-risk-medium",
  },
  high: {
    icon: AlertCircle,
    bg: "bg-risk-high-bg",
    text: "text-risk-high",
  },
}

export function ScoreBadge({ score, risk }: ScoreBadgeProps) {
  const config = riskConfig[risk]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        "transition-all",
        config.bg,
        config.text
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {score}% Match
    </span>
  )
}
