import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

let savedApiKey: string | undefined

beforeEach(() => {
  savedApiKey = process.env.LIBRARIES_IO_API_KEY
  process.env.LIBRARIES_IO_API_KEY = "test-api-key"
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve([]),
      })
    )
  )
})

afterEach(() => {
  if (savedApiKey !== undefined) {
    process.env.LIBRARIES_IO_API_KEY = savedApiKey
  } else {
    delete process.env.LIBRARIES_IO_API_KEY
  }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("fetchPlatforms", () => {
  it("calls Libraries.io with API key in the URL and returns platforms", async () => {
    const mockPlatforms = [
      {
        name: "NPM",
        project_count: 100000,
        homepage: "https://npmjs.com",
        color: "#cb3837",
        default_language: "JavaScript",
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockPlatforms),
    } as unknown as Response)

    const { fetchPlatforms } = await import("../libraries-io")
    const result = await fetchPlatforms()

    expect(result).toEqual(mockPlatforms)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("https://libraries.io/api/platforms")
    expect(calledUrl).toContain("api_key=test-api-key")
  })

  it("throws when API key is missing", async () => {
    delete process.env.LIBRARIES_IO_API_KEY

    const { fetchPlatforms } = await import("../libraries-io")

    await expect(fetchPlatforms()).rejects.toThrow(
      "LIBRARIES_IO_API_KEY environment variable is not set"
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("throws on non-OK response (e.g., 429)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: () => Promise.resolve({}),
    } as unknown as Response)

    const { fetchPlatforms } = await import("../libraries-io")

    await expect(fetchPlatforms()).rejects.toThrow(
      "Libraries.io API error: 429 Too Many Requests"
    )
  })
})

describe("searchLibraries", () => {
  it("calls Libraries.io search with correct params (q, platforms, per_page, sort)", async () => {
    const mockResults = [
      {
        name: "react",
        platform: "NPM",
        description: "A JavaScript library",
        homepage: "https://reactjs.org",
        repository_url: "https://github.com/facebook/react",
        normalized_licenses: ["MIT"],
        rank: 30,
        latest_release_number: "18.2.0",
        latest_stable_release_number: "18.2.0",
        latest_stable_release_published_at: "2022-06-14T00:00:00.000Z",
        language: "JavaScript",
        stars: 200000,
        forks: 40000,
        dependents_count: 150000,
        versions: null,
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockResults),
    } as unknown as Response)

    const { searchLibraries } = await import("../libraries-io")
    const result = await searchLibraries({
      q: "react",
      platforms: "NPM",
      per_page: 10,
      sort: "stars",
    })

    expect(result).toEqual(mockResults)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("https://libraries.io/api/search")
    expect(calledUrl).toContain("api_key=test-api-key")
    expect(calledUrl).toContain("q=react")
    expect(calledUrl).toContain("platforms=NPM")
    expect(calledUrl).toContain("per_page=10")
    expect(calledUrl).toContain("sort=stars")
  })

  it("omits platforms param when not provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve([]),
    } as unknown as Response)

    const { searchLibraries } = await import("../libraries-io")
    await searchLibraries({ q: "express" })

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).not.toContain("platforms=")
  })

  it("uses default values for page, per_page, sort when not provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve([]),
    } as unknown as Response)

    const { searchLibraries } = await import("../libraries-io")
    await searchLibraries({ q: "lodash" })

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    // Only api_key and q should be present; page, per_page, sort should be absent
    expect(calledUrl).toContain("api_key=test-api-key")
    expect(calledUrl).toContain("q=lodash")
    expect(calledUrl).not.toContain("page=")
    expect(calledUrl).not.toContain("per_page=")
    expect(calledUrl).not.toContain("sort=")
  })

  it("throws on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    } as unknown as Response)

    const { searchLibraries } = await import("../libraries-io")

    await expect(searchLibraries({ q: "react" })).rejects.toThrow(
      "Libraries.io API error: 500 Internal Server Error"
    )
  })
})

describe("fetchProjectVersions", () => {
  it("calls Libraries.io project endpoint and extracts versions from project object", async () => {
    const mockVersions = [
      { number: "18.2.0", published_at: "2022-06-14T00:00:00.000Z" },
      { number: "18.3.0", published_at: "2024-04-25T00:00:00.000Z" },
    ]

    const mockProject = {
      name: "react",
      platform: "NPM",
      description: "A JavaScript library for building user interfaces",
      homepage: "https://reactjs.org",
      repository_url: "https://github.com/facebook/react",
      normalized_licenses: ["MIT"],
      rank: 30,
      latest_release_number: "18.3.0",
      latest_stable_release_number: "18.3.0",
      latest_stable_release_published_at: "2024-04-25T00:00:00.000Z",
      language: "JavaScript",
      stars: 200000,
      forks: 40000,
      dependents_count: 150000,
      versions: mockVersions,
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockProject),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    const result = await fetchProjectVersions("NPM", "react")

    expect(result).toEqual(mockVersions)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("https://libraries.io/api/NPM/react")
    expect(calledUrl).toContain("api_key=test-api-key")
  })

  it("returns empty array when project has null versions", async () => {
    const mockProject = {
      name: "some-lib",
      platform: "NPM",
      description: null,
      homepage: null,
      repository_url: null,
      normalized_licenses: [],
      rank: 0,
      latest_release_number: null,
      latest_stable_release_number: null,
      latest_stable_release_published_at: null,
      language: null,
      stars: 0,
      forks: 0,
      dependents_count: 0,
      versions: null,
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockProject),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    const result = await fetchProjectVersions("NPM", "some-lib")

    expect(result).toEqual([])
  })

  it("encodes library name with special characters", async () => {
    const mockProject = {
      name: "@angular/core",
      platform: "NPM",
      description: null,
      homepage: null,
      repository_url: null,
      normalized_licenses: [],
      rank: 0,
      latest_release_number: null,
      latest_stable_release_number: null,
      latest_stable_release_published_at: null,
      language: null,
      stars: 0,
      forks: 0,
      dependents_count: 0,
      versions: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockProject),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    await fetchProjectVersions("NPM", "@angular/core")

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("%40angular%2Fcore")
  })

  it("throws on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({}),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")

    await expect(fetchProjectVersions("NPM", "nonexistent-lib")).rejects.toThrow(
      "Libraries.io API error: 404 Not Found"
    )
  })

  it("throws when API key is missing", async () => {
    delete process.env.LIBRARIES_IO_API_KEY

    const { fetchProjectVersions } = await import("../libraries-io")

    await expect(fetchProjectVersions("NPM", "react")).rejects.toThrow(
      "LIBRARIES_IO_API_KEY environment variable is not set"
    )
  })
})
