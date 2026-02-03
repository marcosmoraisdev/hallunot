// src/infrastructure/mappers/library-metadata-mapper.ts
import type { LibrariesIoProject } from '../adapters/libraries-io'
import type { LibraryMetadata, VersionMetadata } from '../../domain/services/lcs/types'

/**
 * Maps Libraries.io project data to domain LibraryMetadata.
 */
export function mapToLibraryMetadata(project: LibrariesIoProject): LibraryMetadata {
  const versions = project.versions ?? []
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  )

  const firstReleaseDate = sortedVersions[0]
    ? new Date(sortedVersions[0].published_at)
    : null

  const ageInYears = firstReleaseDate
    ? (Date.now() - firstReleaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0

  return {
    name: project.name,
    language: project.language ?? 'unknown',
    ageInYears,
    releaseCount: versions.length,
    keywords: project.keywords ?? [],
    stars: project.stars ?? 0,
    dependentsCount: project.dependents_count ?? 0,
  }
}

/**
 * Maps Libraries.io versions to domain VersionMetadata array.
 */
export function mapToVersionMetadata(
  versions: Array<{ number: string; published_at: string }>
): VersionMetadata[] {
  return versions.map((v) => ({
    version: v.number,
    releaseDate: new Date(v.published_at),
  }))
}
