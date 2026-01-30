// src/components/version-scores.tsx
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, AlertOctagon, FileCode2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { EmptyState } from "./empty-state"
import { RISK_LABELS } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { RiskLevel } from "@/domain/models"

interface VersionScoresProps {
  llmName: string
  libraryName: string
  platform: string
}

interface ScoredVersion {
  version: string
  releaseDate: number
  breaking: boolean
  score: number
  risk: RiskLevel
  reason: string
}

interface VersionBucket {
  major: number
  bestScore: number
  versions: ScoredVersion[]
}

export function VersionScores({ llmName, libraryName, platform }: VersionScoresProps) {
  const [buckets, setBuckets] = useState<VersionBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state reset for data fetch
    setLoading(true)
    setError(null)
    setBuckets([])
    setExpandedBuckets(new Set())

    const params = new URLSearchParams({
      llm: llmName,
      library: libraryName,
      platform,
    })

    fetch(`/api/score?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch scores: ${res.status}`)
        }
        return res.json()
      })
      .then((json) => {
        const data = json.data?.buckets ?? []
        setBuckets(data)
        // Auto-expand first bucket
        if (data.length > 0) {
          setExpandedBuckets(new Set([data[0].major]))
        }
      })
      .catch((err) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [llmName, libraryName, platform])

  const toggleBucket = (major: number) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(major)) {
        next.delete(major)
      } else {
        next.add(major)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={FileCode2}
        title="Failed to load scores"
        description={error}
      />
    )
  }

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No version data available"
        description="This library has no recorded versions or the API is unavailable."
      />
    )
  }

  return (
    <div className="space-y-3">
      {buckets.map((bucket) => {
        const isExpanded = expandedBuckets.has(bucket.major)
        return (
          <div
            key={bucket.major}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            {/* Bucket header */}
            <button
              type="button"
              onClick={() => toggleBucket(bucket.major)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono text-sm font-semibold">
                  v{bucket.major}.x
                </span>
                <span className="text-xs text-muted-foreground">
                  ({bucket.versions.length} version{bucket.versions.length !== 1 ? "s" : ""})
                </span>
              </div>
              <ScoreBadge score={bucket.bestScore} risk={bucket.versions[0]?.risk ?? "medium"} />
            </button>

            {/* Bucket content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/50"
                >
                  <div className="p-2 space-y-2">
                    {bucket.versions.map((item) => (
                      <div
                        key={item.version}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border border-border/30 bg-background p-3",
                          "sm:flex-row sm:items-center sm:justify-between"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-medium text-card-foreground">
                              v{item.version}
                            </span>
                            <ScoreBadge score={item.score} risk={item.risk} />
                            {item.breaking && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-medium text-risk-high">
                                <AlertOctagon className="h-3 w-3" />
                                Breaking
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {RISK_LABELS[item.risk]}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.releaseDate)}
                            </span>
                          </div>
                        </div>
                        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
