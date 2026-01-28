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
  const url = `${BASE_URL}/platforms?api_key=${key}`

  const res = await fetch(url, { next: { revalidate: 86400 } })

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
  if (params.page) searchParams.set("page", String(params.page))
  if (params.per_page) searchParams.set("per_page", String(params.per_page))
  if (params.sort) searchParams.set("sort", params.sort)

  const url = `${BASE_URL}/search?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
