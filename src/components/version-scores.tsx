// src/components/version-scores.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, FileCode2, ChevronDown, ChevronRight, TrendingUp } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { EmptyState } from "./empty-state"
import { RISK_LABELS, classifyRisk } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import { ScoreDetailDialog } from "./score-detail-dialog"
import { VersionSearchBar } from "./version-search-bar"
import type { LibraryScoreBreakdown, LGSScoreBreakdown } from "@/domain/services/lcs/types"
import type { RiskLevel } from "@/domain/models"

interface VersionScoresProps {
  llmId: string
  llmName: string
  libraryName: string
  platform: string
}

interface DisplayVersion {
  version: string
  releaseDate: number
  score: number // 0-100 for display
  risk: RiskLevel
  recencyContribution: number
  lcsScore: number   // 0-1
  lgsScore: number   // 0-1
  recencyDetail: { value: number; weight: number; contribution: number }
}

interface VersionBucket {
  major: number
  bestScore: number
  versions: DisplayVersion[]
}

// API response types
interface LCSVersionScore {
  version: string
  releaseDate: string
  recency: { value: number; weight: number; contribution: number }
  score: number
}

interface FSVersionScore {
  version: string
  lcs: number
  lgs: number
  final: number
}

interface ScoreAPIResponse {
  library: string
  platform: string
  llm: string
  libraryMetadata: {
    language: string
    stars: number
    dependentsCount: number
    releaseCount: number
    ageInYears: number
    keywords: string[]
  }
  llmMetadata: {
    name: string
    knowledgeCutoff: string
    contextLimit: number
    outputLimit: number
  }
  LCS: {
    libraryScore: Record<string, { value: number; weight: number; contribution: number }>
    versions: LCSVersionScore[]
  }
  LGS: {
    score: number
    breakdown: {
      capability: { value: number; weight: number; contribution: number }
      limit: { value: number; weight: number; contribution: number }
      recency: { value: number; weight: number; contribution: number }
      openness: { value: number; weight: number; contribution: number }
    } | null
  }
  FS: {
    versions: FSVersionScore[]
    formula: string
  }
}

function parseMajorVersion(version: string): number {
  const match = version.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function transformToDisplayVersions(
  lcsVersions: LCSVersionScore[],
  fsVersions: FSVersionScore[],
  lgsScore: number
): DisplayVersion[] {
  // Create a map for quick FS score lookup
  const fsMap = new Map<string, FSVersionScore>()
  for (const fs of fsVersions) {
    fsMap.set(fs.version, fs)
  }

  return lcsVersions.map((lcs) => {
    const fs = fsMap.get(lcs.version)
    // Use final score if available, otherwise use LCS score
    // Convert from 0-1 to 0-100 for display
    const scoreNormalized = fs?.final ?? lcs.score
    const score = Math.round(scoreNormalized * 100)

    return {
      version: lcs.version,
      releaseDate: new Date(lcs.releaseDate).getTime(),
      score,
      risk: classifyRisk(score),
      recencyContribution: lcs.recency.contribution,
      lcsScore: fs?.lcs ?? lcs.score,
      lgsScore: fs?.lgs ?? lgsScore,
      recencyDetail: lcs.recency,
    }
  })
}

function groupIntoBuckets(versions: DisplayVersion[]): VersionBucket[] {
  const bucketMap = new Map<number, DisplayVersion[]>()

  for (const v of versions) {
    const major = parseMajorVersion(v.version)
    const existing = bucketMap.get(major) ?? []
    existing.push(v)
    bucketMap.set(major, existing)
  }

  const buckets: VersionBucket[] = []
  for (const [major, vers] of bucketMap) {
    // Sort versions by release date descending
    vers.sort((a, b) => b.releaseDate - a.releaseDate)
    buckets.push({
      major,
      bestScore: vers[0]?.score ?? 0,
      versions: vers,
    })
  }

  // Sort buckets by major version descending (newest first)
  buckets.sort((a, b) => b.major - a.major)

  return buckets
}

export function VersionScores({ llmId, llmName, libraryName, platform }: VersionScoresProps) {
  const [buckets, setBuckets] = useState<VersionBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set())
  const lastFetchKey = useRef("")

  // Enriched data for detail dialog
  const [libraryScore, setLibraryScore] = useState<LibraryScoreBreakdown | null>(null)
  const [lgsBreakdown, setLgsBreakdown] = useState<LGSScoreBreakdown | null>(null)
  const [libraryMeta, setLibraryMeta] = useState<ScoreAPIResponse["libraryMetadata"] | null>(null)
  const [llmMeta, setLlmMeta] = useState<ScoreAPIResponse["llmMetadata"] | null>(null)
  const [dialogVersion, setDialogVersion] = useState<DisplayVersion | null>(null)
  const [searchQueries, setSearchQueries] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    const key = `${llmId}-${libraryName}-${platform}`
    if (lastFetchKey.current === key) return
    lastFetchKey.current = key

    setLoading(true)
    setError(null)
    setBuckets([])
    setExpandedBuckets(new Set())
    setLibraryScore(null)
    setLgsBreakdown(null)
    setLibraryMeta(null)
    setLlmMeta(null)
    setDialogVersion(null)
    setSearchQueries(new Map())

    const params = new URLSearchParams({
      llm: llmId,
      library: libraryName,
      platform,
    })

    fetch(`/api/score?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || `Failed to fetch scores: ${res.status}`)
          })
        }
        return res.json()
      })
      .then((json: ScoreAPIResponse) => {
        if (lastFetchKey.current !== key) return

        const lcsVersions = json.LCS?.versions ?? []
        const fsVersions = json.FS?.versions ?? []

        if (lcsVersions.length === 0) {
          setBuckets([])
          return
        }

        const displayVersions = transformToDisplayVersions(lcsVersions, fsVersions, json.LGS?.score ?? 0)
        const groupedBuckets = groupIntoBuckets(displayVersions)

        setBuckets(groupedBuckets)

        // Store enriched data for the detail dialog
        setLibraryScore(json.LCS?.libraryScore as unknown as LibraryScoreBreakdown ?? null)
        setLgsBreakdown(json.LGS?.breakdown ?? null)
        setLibraryMeta(json.libraryMetadata ?? null)
        setLlmMeta(json.llmMetadata ?? null)
      })
      .catch((err) => {
        if (lastFetchKey.current !== key) return
        console.error(err)
        setError(err.message)
      })
      .finally(() => {
        if (lastFetchKey.current !== key) return
        setLoading(false)
      })
  }, [llmId, libraryName, platform])

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

  const updateSearch = (major: number, query: string) => {
    setSearchQueries((prev) => {
      const next = new Map(prev)
      if (query) {
        next.set(major, query)
      } else {
        next.delete(major)
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
        const bestRisk = bucket.versions[0]?.risk ?? "medium"
        return (
          <div
            key={bucket.major}
            className="rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer"
          >
            {/* Bucket header */}
            <button
              type="button"
              onClick={() => toggleBucket(bucket.major)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 cursor-pointer",
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
              <ScoreBadge score={bucket.bestScore} risk={bestRisk} />
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
                    {/* Search bar for large buckets */}
                    {bucket.versions.length > 10 && (
                      <VersionSearchBar
                        value={searchQueries.get(bucket.major) ?? ""}
                        onChange={(q) => updateSearch(bucket.major, q)}
                        totalCount={bucket.versions.length}
                        filteredCount={
                          bucket.versions.filter((v) =>
                            v.version.includes(searchQueries.get(bucket.major) ?? "")
                          ).length
                        }
                      />
                    )}

                    {/* Version list (filtered) */}
                    {(() => {
                      const query = searchQueries.get(bucket.major) ?? ""
                      const filtered = query
                        ? bucket.versions.filter((v) => v.version.includes(query))
                        : bucket.versions
                      return filtered.map((item) => (
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
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDialogVersion(item)
                                }}
                                className="cursor-pointer"
                              >
                                <ScoreBadge score={item.score} risk={item.risk} />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {RISK_LABELS[item.risk]}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.releaseDate)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                Recency: {Math.round(item.recencyContribution * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      <ScoreDetailDialog
        version={dialogVersion}
        libraryScore={libraryScore}
        lgsBreakdown={lgsBreakdown}
        libraryMetadata={libraryMeta}
        llmMetadata={llmMeta}
        onClose={() => setDialogVersion(null)}
      />
    </div>
  )
}
