// src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts
import { mapToLibraryMetadata } from '../library-metadata-mapper'
import type { LibrariesIoProject } from '../../adapters/libraries-io'

const mockProject: LibrariesIoProject = {
  name: 'test-lib',
  platform: 'NPM',
  description: 'A test library',
  homepage: 'https://example.com',
  repository_url: 'https://github.com/test/test-lib',
  normalized_licenses: ['MIT'],
  rank: 10,
  keywords: ['utility', 'framework'],
  latest_release_number: '2.0.0',
  latest_release_published_at: '2024-06-01T00:00:00.000Z',
  latest_stable_release_number: '2.0.0',
  latest_stable_release_published_at: '2024-06-01T00:00:00.000Z',
  language: 'JavaScript',
  stars: 5000,
  forks: 200,
  dependents_count: 1000,
  versions: [
    { number: '1.0.0', published_at: '2020-01-01T00:00:00.000Z' },
    { number: '1.5.0', published_at: '2022-06-01T00:00:00.000Z' },
    { number: '2.0.0', published_at: '2024-06-01T00:00:00.000Z' },
  ],
}

describe('mapToLibraryMetadata', () => {
  it('maps name correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.name).toBe('test-lib')
  })

  it('maps language correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.language).toBe('JavaScript')
  })

  it('calculates ageInYears from first version', () => {
    const result = mapToLibraryMetadata(mockProject)
    // First version: 2020-01-01, should be ~4-6 years old
    expect(result.ageInYears).toBeGreaterThan(4)
    expect(result.ageInYears).toBeLessThan(7)
  })

  it('counts releases correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.releaseCount).toBe(3)
  })

  it('maps keywords correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.keywords).toEqual(['utility', 'framework'])
  })

  it('maps stars correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.stars).toBe(5000)
  })

  it('maps dependentsCount correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.dependentsCount).toBe(1000)
  })

  it('handles missing language', () => {
    const project = { ...mockProject, language: null }
    const result = mapToLibraryMetadata(project as unknown as LibrariesIoProject)
    expect(result.language).toBe('unknown')
  })

  it('handles empty versions array', () => {
    const project = { ...mockProject, versions: [] }
    const result = mapToLibraryMetadata(project)
    expect(result.ageInYears).toBe(0)
    expect(result.releaseCount).toBe(0)
  })

  it('handles missing keywords', () => {
    const project = { ...mockProject, keywords: undefined as unknown as string[] }
    const result = mapToLibraryMetadata(project)
    expect(result.keywords).toEqual([])
  })
})
