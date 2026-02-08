// src/components/version-scores.tsx
"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  avgScore: number
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
    capabilities: {
      reasoning: boolean
      toolCall: boolean
      structuredOutput: boolean
      attachment: boolean
      multimodalInput: boolean
      multimodalOutput: boolean
    }
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

// Enriched data consolidated into a single state object
interface EnrichedData {
  libraryScore: LibraryScoreBreakdown | null
  lgsBreakdown: LGSScoreBreakdown | null
  libraryMeta: ScoreAPIResponse["libraryMetadata"] | null
  llmMeta: ScoreAPIResponse["llmMetadata"] | null
}

const EMPTY_ENRICHED: EnrichedData = {
  libraryScore: null,
  lgsBreakdown: null,
  libraryMeta: null,
  llmMeta: null,
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
    const avg = vers.length > 0
      ? Math.round(vers.reduce((sum, v) => sum + v.score, 0) / vers.length)
      : 0
    buckets.push({
      major,
      avgScore: avg,
      versions: vers,
    })
  }

  // Sort buckets by major version descending (newest first)
  buckets.sort((a, b) => b.major - a.major)

  return buckets
}

// --- Extracted sub-components (not exported) ---

interface VersionCardProps {
  version: DisplayVersion
  onSelect: (v: DisplayVersion) => void
}

const VersionCard = React.memo(function VersionCard({ version: item, onSelect }: VersionCardProps) {
  const handleClick = useCallback(() => onSelect(item), [onSelect, item])
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onSelect(item)
      }
    },
    [onSelect, item]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 rounded-lg border border-border/30 bg-background p-3 cursor-pointer",
        "hover:bg-muted/50 transition-colors"
      )}
    >
      <span className="font-mono text-sm font-medium text-card-foreground">
        v{item.version}
      </span>
      <ScoreBadge score={item.score} risk={item.risk} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
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
  )
})

interface BucketContentProps {
  bucket: VersionBucket
  searchQuery: string
  onUpdateSearch: (major: number, query: string) => void
  onSelectVersion: (v: DisplayVersion) => void
}

function BucketContent({ bucket, searchQuery, onUpdateSearch, onSelectVersion }: BucketContentProps) {
  const filteredVersions = useMemo(() => {
    if (!searchQuery) return bucket.versions
    return bucket.versions.filter((v) => v.version.includes(searchQuery))
  }, [bucket.versions, searchQuery])

  const handleSearchChange = useCallback(
    (q: string) => onUpdateSearch(bucket.major, q),
    [onUpdateSearch, bucket.major]
  )

  return (
    <div className="p-2 space-y-2">
      {bucket.versions.length > 10 && (
        <VersionSearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          totalCount={bucket.versions.length}
          filteredCount={filteredVersions.length}
        />
      )}

      {filteredVersions.map((item) => (
        <VersionCard
          key={item.version}
          version={item}
          onSelect={onSelectVersion}
        />
      ))}
    </div>
  )
}

// --- Main component ---

export function VersionScores({ llmId, libraryName, platform }: VersionScoresProps) {
  const [buckets, setBuckets] = useState<VersionBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set())
  const lastFetchKey = useRef("")

  // Enriched data for detail dialog (single state to avoid multiple re-render cycles)
  const [enrichedData, setEnrichedData] = useState<EnrichedData>(EMPTY_ENRICHED)
  const [dialogVersion, setDialogVersion] = useState<DisplayVersion | null>(null)
  const [searchQueries, setSearchQueries] = useState<Map<number, string>>(new Map())

  const { libraryScore, lgsBreakdown, libraryMeta, llmMeta } = enrichedData

  useEffect(() => {
    const key = `${llmId}-${libraryName}-${platform}`
    if (lastFetchKey.current === key) return
    lastFetchKey.current = key

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

        // Store enriched data in a single state update
        setEnrichedData({
          libraryScore: json.LCS?.libraryScore as unknown as LibraryScoreBreakdown ?? null,
          lgsBreakdown: json.LGS?.breakdown ?? null,
          libraryMeta: json.libraryMetadata ?? null,
          llmMeta: json.llmMetadata ?? null,
        })
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

  const toggleBucket = useCallback((major: number) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(major)) {
        next.delete(major)
      } else {
        next.add(major)
      }
      return next
    })
  }, [])

  const updateSearch = useCallback((major: number, query: string) => {
    setSearchQueries((prev) => {
      const next = new Map(prev)
      if (query) {
        next.set(major, query)
      } else {
        next.delete(major)
      }
      return next
    })
  }, [])

  const handleSelectVersion = useCallback((v: DisplayVersion) => {
    setDialogVersion(v)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogVersion(null)
  }, [])

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
        const avgRisk = classifyRisk(bucket.avgScore)
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
              <ScoreBadge score={bucket.avgScore} risk={avgRisk} />
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
                  <BucketContent
                    bucket={bucket}
                    searchQuery={searchQueries.get(bucket.major) ?? ""}
                    onUpdateSearch={updateSearch}
                    onSelectVersion={handleSelectVersion}
                  />
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
        libraryName={libraryName}
        onClose={handleCloseDialog}
      />
    </div>
  )
}
