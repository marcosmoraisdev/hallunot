// src/components/score-detail-dialog.tsx
"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { X, Library, Brain, Info, CircleCheck, CircleX } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { ComponentScoreList } from "./score-breakdown"
import { RISK_LABELS } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { ScoreComponentData } from "./score-breakdown"
import type { RiskLevel } from "@/domain/models"
import type { ComponentResult, LibraryScoreBreakdown, LGSScoreBreakdown } from "@/domain/services/lcs/types"

interface VersionDetail {
  version: string
  releaseDate: number
  score: number         // 0-100
  risk: RiskLevel
  lcsScore: number      // 0-1
  lgsScore: number      // 0-1
  recencyDetail: ComponentResult
}

interface LibraryMeta {
  language: string
  stars: number
  dependentsCount: number
  releaseCount: number
  ageInYears: number
  keywords: string[]
}

interface LLMCapabilities {
  reasoning: boolean
  toolCall: boolean
  structuredOutput: boolean
  attachment: boolean
  multimodalInput: boolean
  multimodalOutput: boolean
}

interface LLMMeta {
  name: string
  knowledgeCutoff: string
  contextLimit: number
  outputLimit: number
  capabilities: LLMCapabilities
}

interface ScoreDetailDialogProps {
  version: VersionDetail | null
  libraryScore: LibraryScoreBreakdown | null
  lgsBreakdown: LGSScoreBreakdown | null
  libraryMetadata: LibraryMeta | null
  llmMetadata: LLMMeta | null
  libraryName?: string
  onClose: () => void
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function getScoreBoxColor(value: number): string {
  if (value >= 0.7) return "border-risk-low/30 bg-risk-low-bg"
  if (value >= 0.4) return "border-risk-medium/30 bg-risk-medium-bg"
  return "border-risk-high/30 bg-risk-high-bg"
}

function getScoreBoxTextColor(value: number): string {
  if (value >= 0.7) return "text-risk-low"
  if (value >= 0.4) return "text-risk-medium"
  return "text-risk-high"
}

function buildLCSComponents(
  libraryScore: LibraryScoreBreakdown,
  recency: ComponentResult,
  libraryMeta: LibraryMeta | null,
  llmMeta: LLMMeta | null,
  releaseDate: number
): ScoreComponentData[] {
  const releasesPerYear = libraryMeta
    ? (libraryMeta.releaseCount / Math.max(libraryMeta.ageInYears, 0.1)).toFixed(1)
    : "N/A"

  const cutoffFormatted = llmMeta?.knowledgeCutoff
    ? formatDate(new Date(llmMeta.knowledgeCutoff).getTime())
    : "Unknown"

  const releaseDateFormatted = formatDate(releaseDate)

  const isPreCutoff = llmMeta?.knowledgeCutoff
    ? releaseDate <= new Date(llmMeta.knowledgeCutoff).getTime()
    : false

  const stabilityDescription = isPreCutoff
    ? "Released before knowledge cutoff — training data likely includes this library's release history"
    : `${releasesPerYear} releases/year — ${
        libraryScore.stability.value >= 0.7 ? "stable release cadence" :
        libraryScore.stability.value >= 0.4 ? "moderate release frequency" :
        "very frequent releases, higher volatility"
      }`

  const components: ScoreComponentData[] = [
    {
      id: "stability",
      label: "Stability",
      value: libraryScore.stability.value,
      weight: libraryScore.stability.weight,
      contribution: libraryScore.stability.contribution,
      description: stabilityDescription,
    },
    {
      id: "simplicity",
      label: "Simplicity",
      value: libraryScore.simplicity.value,
      weight: libraryScore.simplicity.weight,
      contribution: libraryScore.simplicity.contribution,
      description: `Based on keyword analysis — ${
        libraryScore.simplicity.value >= 0.7 ? "focused, simple API surface" :
        libraryScore.simplicity.value >= 0.4 ? "moderate complexity" :
        "complex ecosystem (framework, platform, enterprise keywords)"
      }`,
    },
    {
      id: "popularity",
      label: "Popularity",
      value: libraryScore.popularity.value,
      weight: libraryScore.popularity.weight,
      contribution: libraryScore.popularity.contribution,
      description: libraryMeta
        ? `${formatNumber(libraryMeta.stars)} stars, ${formatNumber(libraryMeta.dependentsCount)} dependents — more popular libraries appear more in training data`
        : "Popularity data unavailable",
    },
    {
      id: "language",
      label: "Language Affinity",
      value: libraryScore.language.value,
      weight: libraryScore.language.weight,
      contribution: libraryScore.language.contribution,
      description: libraryMeta
        ? `${libraryMeta.language} — ${
            libraryScore.language.value >= 0.9 ? "very well represented in LLM training data" :
            libraryScore.language.value >= 0.7 ? "well represented in training data" :
            "less represented in training data"
          }`
        : "Language data unavailable",
    },
    {
      id: "recency",
      label: "Recency",
      value: recency.value,
      weight: recency.weight,
      contribution: recency.contribution,
      description: `Released ${releaseDateFormatted}, cutoff ${cutoffFormatted} — ${
        recency.value >= 0.7 ? "released well before cutoff, likely in training data" :
        recency.value >= 0.4 ? "near the cutoff boundary, partial coverage likely" :
        "released after cutoff, unlikely in training data"
      }`,
    },
  ]

  // Sort by weight descending, alphabetical label as tiebreaker
  return components.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
}

function buildCapabilityTooltip(capabilities: LLMCapabilities) {
  const features = [
    { label: "Reasoning", enabled: capabilities.reasoning },
    { label: "Tool Calling", enabled: capabilities.toolCall },
    { label: "Structured Output", enabled: capabilities.structuredOutput },
    { label: "File Attachments", enabled: capabilities.attachment },
    { label: "Multimodal Input", enabled: capabilities.multimodalInput },
    { label: "Multimodal Output", enabled: capabilities.multimodalOutput },
  ]

  return (
    <div className="space-y-1">
      {features.map((f) => (
        <div key={f.label} className="flex items-center gap-2 text-[11px]">
          {f.enabled ? (
            <CircleCheck className="h-3.5 w-3.5 text-risk-low shrink-0" />
          ) : (
            <CircleX className="h-3.5 w-3.5 text-risk-high shrink-0" />
          )}
          <span className={f.enabled ? "text-card-foreground" : "text-muted-foreground"}>
            {f.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function buildLGSComponents(
  breakdown: LGSScoreBreakdown,
  llmMeta: LLMMeta | null
): ScoreComponentData[] {
  const components: ScoreComponentData[] = [
    {
      id: "capability",
      label: "Capability",
      value: breakdown.capability.value,
      weight: breakdown.capability.weight,
      contribution: breakdown.capability.contribution,
      description: `Model feature breadth (reasoning, tool calls, structured output, etc.) — ${
        breakdown.capability.value >= 0.8 ? "very capable model" :
        breakdown.capability.value >= 0.5 ? "moderately capable" :
        "limited feature set"
      }`,
      tooltip: llmMeta?.capabilities ? buildCapabilityTooltip(llmMeta.capabilities) : undefined,
    },
    {
      id: "limit",
      label: "Context & Output Limits",
      value: breakdown.limit.value,
      weight: breakdown.limit.weight,
      contribution: breakdown.limit.contribution,
      description: llmMeta
        ? `Context: ${formatNumber(llmMeta.contextLimit)} tokens, Output: ${formatNumber(llmMeta.outputLimit)} tokens`
        : "Limit data unavailable",
    },
    {
      id: "recency",
      label: "Model Recency",
      value: breakdown.recency.value,
      weight: breakdown.recency.weight,
      contribution: breakdown.recency.contribution,
      description: llmMeta?.knowledgeCutoff
        ? `Knowledge cutoff: ${formatDate(new Date(llmMeta.knowledgeCutoff).getTime())} — ${
            breakdown.recency.value >= 0.7 ? "recent model with up-to-date training" :
            breakdown.recency.value >= 0.4 ? "moderately recent model" :
            "older model, training data may be stale"
          }`
        : "Cutoff date unknown",
    },
    {
      id: "openness",
      label: "Openness",
      value: breakdown.openness.value,
      weight: breakdown.openness.weight,
      contribution: breakdown.openness.contribution,
      description: `Open weights & API compatibility — ${
        breakdown.openness.value >= 0.7 ? "open model with broad ecosystem" :
        breakdown.openness.value >= 0.3 ? "partially open" :
        "closed/proprietary model"
      }`,
    },
  ]

  // Sort by weight descending, alphabetical label as tiebreaker
  return components.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
}

export function ScoreDetailDialog({
  version,
  libraryScore,
  lgsBreakdown,
  libraryMetadata,
  llmMetadata,
  libraryName,
  onClose,
}: ScoreDetailDialogProps) {
  if (!version) return null

  const lcsComponents = libraryScore
    ? buildLCSComponents(libraryScore, version.recencyDetail, libraryMetadata, llmMetadata, version.releaseDate)
    : []

  const lgsComponents = lgsBreakdown
    ? buildLGSComponents(lgsBreakdown, llmMetadata)
    : []

  return (
    <Dialog.Root open={!!version} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <ScrollArea.Root className="max-h-[85vh] overflow-hidden">
            <ScrollArea.Viewport className="max-h-[85vh] w-full rounded-xl">
              <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Dialog.Title className="text-lg font-semibold font-mono text-card-foreground">
                      {libraryName ? `${libraryName} ` : ""}v{version.version}
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground">
                      {RISK_LABELS[version.risk]} — {formatDate(version.releaseDate)}
                    </Dialog.Description>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={version.score} risk={version.risk} />
                    <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors cursor-pointer">
                      <X className="h-4 w-4" />
                    </Dialog.Close>
                  </div>
                </div>

                {/* Formula Overview */}
                <div className="flex items-center justify-center gap-3 py-4 px-3 rounded-lg border border-border/50 bg-muted/30">
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.lcsScore))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LCS</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.lcsScore))}>
                      {Math.round(version.lcsScore * 100)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">×</span>
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.lgsScore))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LGS</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.lgsScore))}>
                      {Math.round(version.lgsScore * 100)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">=</span>
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.score / 100))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.score / 100))}>
                      {version.score}
                    </span>
                  </div>
                </div>

                {/* LCS Breakdown */}
                {lcsComponents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Library className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">Library Confidence Score</span>
                    </div>
                    <ComponentScoreList
                      title="LCS Components"
                      components={lcsComponents}
                      totalScore={version.lcsScore}
                    />
                  </div>
                )}

                {/* LGS Breakdown */}
                {lgsComponents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Brain className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">LLM Generic Score</span>
                    </div>
                    <ComponentScoreList
                      title="LGS Components"
                      components={lgsComponents}
                      totalScore={lgsBreakdown
                        ? lgsBreakdown.capability.contribution + lgsBreakdown.limit.contribution + lgsBreakdown.recency.contribution + lgsBreakdown.openness.contribution
                        : 0}
                    />
                  </div>
                )}

                {/* Metadata Footer */}
                {(libraryMetadata || llmMetadata) && (
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Info className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">Reference Data</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[11px] text-muted-foreground">
                      {libraryMetadata && (
                        <div className="space-y-1">
                          <p className="font-medium text-card-foreground text-xs">Library</p>
                          <p>Language: {libraryMetadata.language}</p>
                          <p>Stars: {formatNumber(libraryMetadata.stars)}</p>
                          <p>Dependents: {formatNumber(libraryMetadata.dependentsCount)}</p>
                          <p>Releases: {libraryMetadata.releaseCount}</p>
                          <p>Age: {libraryMetadata.ageInYears.toFixed(1)} years</p>
                        </div>
                      )}
                      {llmMetadata && (
                        <div className="space-y-1">
                          <p className="font-medium text-card-foreground text-xs">LLM</p>
                          <p>Model: {llmMetadata.name}</p>
                          <p>Cutoff: {llmMetadata.knowledgeCutoff || "Unknown"}</p>
                          <p>Context: {formatNumber(llmMetadata.contextLimit)} tokens</p>
                          <p>Output: {formatNumber(llmMetadata.outputLimit)} tokens</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex touch-none select-none p-0.5 transition-colors duration-150 ease-out data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
