// src/domain/services/breaking-changes.ts

export interface VersionInput {
  version: string
  publishedAt: string
}

export interface VersionWithBreaking extends VersionInput {
  breaking: boolean
}

/**
 * Extracts the major version number from a version string.
 * Handles semver (1.2.3), pre-release (2.0.0-rc.1), and bare numbers (3).
 */
function parseMajor(version: string): number {
  const match = version.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Detects breaking changes in a list of versions.
 *
 * Heuristic: A version is considered breaking if its major version
 * number differs from the previous version's major number
 * (when sorted chronologically by publishedAt).
 *
 * This is intentionally simple and will later be replaced by
 * LLM-based analysis.
 */
export function detectBreakingChanges(
  versions: VersionInput[]
): VersionWithBreaking[] {
  if (versions.length === 0) return []

  const sorted = [...versions].sort(
    (a, b) =>
      new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  )

  return sorted.map((v, i) => {
    if (i === 0) {
      return { ...v, breaking: false }
    }

    const prevMajor = parseMajor(sorted[i - 1].version)
    const currMajor = parseMajor(v.version)

    return { ...v, breaking: currMajor !== prevMajor }
  })
}
