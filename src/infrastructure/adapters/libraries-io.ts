export interface LibrariesIoVersion {
  number: string
  published_at: string
}

export interface LibrariesIoPlatform {
  name: string
  project_count: number
  homepage: string
  color: string
  default_language: string | null
}

export interface LibrariesIoSearchResult {
  name: string
  platform: string
  description: string | null
  homepage: string | null
  repository_url: string | null
  normalized_licenses: string[]
  rank: number
  latest_release_number: string | null
  latest_stable_release_number: string | null
  latest_stable_release_published_at: string | null
  language: string | null
  stars: number
  forks: number
  dependents_count: number
  versions: { number: string; published_at: string }[] | null
}

export interface LibrariesIoProject {
  name: string
  platform: string
  description: string | null
  homepage: string | null
  repository_url: string | null
  normalized_licenses: string[]
  rank: number
  latest_release_number: string | null
  latest_stable_release_number: string | null
  latest_stable_release_published_at: string | null
  language: string | null
  stars: number
  forks: number
  dependents_count: number
  versions: LibrariesIoVersion[]
}

export interface SearchLibrariesParams {
  q: string
  platforms?: string
  page?: number
  per_page?: number
  sort?: string
}

const BASE_URL = "https://libraries.io/api"

function getApiKey(): string {
  const key = process.env.LIBRARIES_IO_API_KEY
  if (!key) {
    throw new Error("LIBRARIES_IO_API_KEY environment variable is not set")
  }
  return key
}

export async function fetchPlatforms(): Promise<LibrariesIoPlatform[]> {
  const key = getApiKey()
  const searchParams = new URLSearchParams({ api_key: key })
  const url = `${BASE_URL}/platforms?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 86400 } }) // 1 day

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function searchLibraries(
  params: SearchLibrariesParams
): Promise<LibrariesIoSearchResult[]> {
  const key = getApiKey()
  const searchParams = new URLSearchParams({ api_key: key, q: params.q })

  if (params.platforms) searchParams.set("platforms", params.platforms)
  if (params.page !== undefined) searchParams.set("page", String(params.page))
  if (params.per_page !== undefined) searchParams.set("per_page", String(params.per_page))
  if (params.sort) searchParams.set("sort", params.sort)

  const url = `${BASE_URL}/search?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } }) // 5 minutes

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function fetchProjectVersions(
  platform: string,
  projectName: string
): Promise<LibrariesIoVersion[]> {
  const key = getApiKey()
  const encodedName = encodeURIComponent(projectName)
  const searchParams = new URLSearchParams({ api_key: key })
  const url = `${BASE_URL}/${platform}/${encodedName}?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  const project: LibrariesIoProject = await res.json()
  return project.versions ?? []
}
