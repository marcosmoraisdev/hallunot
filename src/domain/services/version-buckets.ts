// src/domain/services/version-buckets.ts
import type { RiskLevel } from "../models"

export interface ScoredVersion {
  version: string
  releaseDate: number
  breaking: boolean
  score: number
  risk: RiskLevel
  reason: string
}

export interface VersionBucket {
  major: number
  bestScore: number
  versions: ScoredVersion[]
}

function parseMajor(version: string): number {
  const match = version.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Groups scored versions by major version number and sorts buckets
 * by their highest score (descending). Within each bucket, versions
 * are sorted by score (descending).
 */
export function groupVersionsIntoBuckets(
  versions: ScoredVersion[]
): VersionBucket[] {
  if (versions.length === 0) return []

  const bucketMap = new Map<number, ScoredVersion[]>()

  for (const v of versions) {
    const major = parseMajor(v.version)
    const bucket = bucketMap.get(major) ?? []
    bucket.push(v)
    bucketMap.set(major, bucket)
  }

  const buckets: VersionBucket[] = []

  for (const [major, versionList] of bucketMap) {
    versionList.sort((a, b) => b.score - a.score)

    buckets.push({
      major,
      bestScore: versionList[0].score,
      versions: versionList,
    })
  }

  buckets.sort((a, b) => b.bestScore - a.bestScore)

  return buckets
}
