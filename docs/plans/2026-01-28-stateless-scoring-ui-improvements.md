# Stateless Scoring Engine + UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the database-backed architecture with a fully stateless system. LLMs are stored in a JSON file, library versions are fetched from Libraries.io on demand, scores are computed dynamically. Add Pino logging, improve UI dropdowns/pagination, and restructure the search bar UX flow.

**Architecture:** No database. LLMs are stored in `src/data/llms.json` and loaded at runtime. The scoring endpoint receives an LLM name and library name, fetches versions from Libraries.io in real-time, applies the existing pure `computeScore` function, detects breaking changes via major version heuristic, groups versions into buckets, and returns results sorted by score. Pino handles structured logging on all API routes and outgoing calls.

**Tech Stack:** Next.js 16 App Router, Radix UI, Tailwind CSS, Pino (new), @faker-js/faker (new, devDep), vitest, Libraries.io API

---

## Assumptions

1. **No database at all.** Prisma is completely removed.
2. **LLMs stored in JSON.** A static `src/data/llms.json` file contains the LLM data with the same structure as before.
3. **Libraries.io provides version data.** The existing `searchLibraries` response includes a `versions` array. We'll also add a new adapter function to fetch a single project's versions.
4. **Breaking change heuristic:** A version is "breaking" if its major version number differs from the previous version's major number (when versions are sorted chronologically). This is simple, replaceable, and clearly documented.
5. **Version buckets:** Versions are grouped by major version (e.g., all 18.x.x versions together).
6. **Pino in Next.js:** We use `pino` on the server side only. Next.js API routes run server-side, so `pino` works directly.
7. **`@faker-js/faker`** is used only in tests (devDependency) for generating realistic test data.

---

## Task 1: Install New Dependencies and Remove Prisma

**Files:**
- Modify: `package.json`

**Step 1: Install pino and @faker-js/faker**

```bash
npm install pino
npm install --save-dev @faker-js/faker
```

**Step 2: Uninstall Prisma dependencies**

```bash
npm uninstall @prisma/client @prisma/adapter-pg prisma
```

**Step 3: Verify installation**

```bash
node -e "require('pino'); console.log('pino OK')"
node -e "require('@faker-js/faker'); console.log('faker OK')"
```

Expected: Both print OK.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pino and faker, remove Prisma dependencies"
```

---

## Task 2: Remove Prisma Files and Generated Code

**Files:**
- Delete: `prisma/` directory (schema.prisma, seed.ts, migrations)
- Delete: `src/generated/prisma/` directory
- Delete: `src/infrastructure/db/prisma.ts`
- Delete: `src/infrastructure/repositories/llm-repository.ts`
- Delete: `src/infrastructure/repositories/library-repository.ts`
- Delete: `src/infrastructure/repositories/version-repository.ts`

**Step 1: Remove Prisma directory**

```bash
rm -rf prisma/
```

**Step 2: Remove generated Prisma client**

```bash
rm -rf src/generated/
```

**Step 3: Remove Prisma infrastructure files**

```bash
rm -f src/infrastructure/db/prisma.ts
rm -rf src/infrastructure/repositories/
```

**Step 4: Remove the db directory if empty**

```bash
rmdir src/infrastructure/db/ 2>/dev/null || true
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove all Prisma files and generated code"
```

---

## Task 3: Create LLM JSON Data File

**Files:**
- Create: `src/data/llms.json`

**Step 1: Create the data directory and JSON file**

```json
[
  {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "OpenAI",
    "approxCutoff": 1696118400000
  },
  {
    "id": "gpt-4-turbo",
    "name": "GPT-4 Turbo",
    "provider": "OpenAI",
    "approxCutoff": 1701388800000
  },
  {
    "id": "claude-3-5-sonnet",
    "name": "Claude 3.5 Sonnet",
    "provider": "Anthropic",
    "approxCutoff": 1711929600000
  },
  {
    "id": "claude-3-opus",
    "name": "Claude 3 Opus",
    "provider": "Anthropic",
    "approxCutoff": 1693526400000
  },
  {
    "id": "gemini-1-5-pro",
    "name": "Gemini 1.5 Pro",
    "provider": "Google",
    "approxCutoff": 1699056000000
  }
]
```

Note: Cutoff dates (Unix ms):
- GPT-4o: Oct 1, 2023
- GPT-4 Turbo: Dec 1, 2023
- Claude 3.5 Sonnet: Apr 1, 2024
- Claude 3 Opus: Sep 1, 2023
- Gemini 1.5 Pro: Nov 4, 2023

**Step 2: Commit**

```bash
git add src/data/llms.json
git commit -m "feat: add LLM data as static JSON file"
```

---

## Task 4: Create LLM Data Access Layer

**Files:**
- Create: `src/data/llms.ts`
- Test: `src/data/__tests__/llms.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/__tests__/llms.test.ts
import { describe, it, expect } from "vitest"
import { getAllLlms, findLlmByName, findLlmById } from "../llms"

describe("getAllLlms", () => {
  it("returns an array of LLMs", () => {
    const llms = getAllLlms()
    expect(Array.isArray(llms)).toBe(true)
    expect(llms.length).toBeGreaterThan(0)
  })

  it("each LLM has required fields", () => {
    const llms = getAllLlms()
    for (const llm of llms) {
      expect(llm).toHaveProperty("id")
      expect(llm).toHaveProperty("name")
      expect(llm).toHaveProperty("provider")
      expect(llm).toHaveProperty("approxCutoff")
      expect(typeof llm.id).toBe("string")
      expect(typeof llm.name).toBe("string")
      expect(typeof llm.provider).toBe("string")
      expect(typeof llm.approxCutoff).toBe("number")
    }
  })
})

describe("findLlmByName", () => {
  it("finds LLM by exact name", () => {
    const llm = findLlmByName("GPT-4o")
    expect(llm).toBeDefined()
    expect(llm?.name).toBe("GPT-4o")
  })

  it("finds LLM case-insensitively", () => {
    const llm = findLlmByName("gpt-4o")
    expect(llm).toBeDefined()
    expect(llm?.name).toBe("GPT-4o")
  })

  it("returns undefined for non-existent LLM", () => {
    const llm = findLlmByName("NonExistent")
    expect(llm).toBeUndefined()
  })
})

describe("findLlmById", () => {
  it("finds LLM by id", () => {
    const llm = findLlmById("gpt-4o")
    expect(llm).toBeDefined()
    expect(llm?.id).toBe("gpt-4o")
  })

  it("returns undefined for non-existent id", () => {
    const llm = findLlmById("nonexistent")
    expect(llm).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/data/__tests__/llms.test.ts
```

Expected: FAIL - module not found.

**Step 3: Write minimal implementation**

```typescript
// src/data/llms.ts
import type { Llm } from "@/domain/models"
import llmsData from "./llms.json"

// Type assertion since JSON import doesn't have type info
const llms: Llm[] = llmsData as Llm[]

export function getAllLlms(): Llm[] {
  return llms
}

export function findLlmByName(name: string): Llm | undefined {
  return llms.find((llm) => llm.name.toLowerCase() === name.toLowerCase())
}

export function findLlmById(id: string): Llm | undefined {
  return llms.find((llm) => llm.id === id)
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/data/__tests__/llms.test.ts
```

Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add src/data/llms.ts src/data/__tests__/llms.test.ts
git commit -m "feat: add LLM data access layer reading from JSON"
```

---

## Task 5: Create Pino Logger Utility

**Files:**
- Create: `src/lib/logger.ts`
- Test: `src/lib/__tests__/logger.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/logger.test.ts
import { describe, it, expect } from "vitest"
import { logger } from "../logger"

describe("logger", () => {
  it("exports a pino logger instance", () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.error).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.debug).toBe("function")
  })

  it("can create child loggers", () => {
    const child = logger.child({ component: "test" })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe("function")
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/logger.test.ts
```

Expected: FAIL - module not found.

**Step 3: Write minimal implementation**

```typescript
// src/lib/logger.ts
import pino from "pino"

export const logger = pino({
  name: "hallunot",
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/logger.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/logger.ts src/lib/__tests__/logger.test.ts
git commit -m "feat: add Pino logger utility"
```

---

## Task 6: Create Breaking Change Detection Service

**Files:**
- Create: `src/domain/services/breaking-changes.ts`
- Test: `src/domain/services/__tests__/breaking-changes.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/__tests__/breaking-changes.test.ts
import { describe, it, expect } from "vitest"
import { detectBreakingChanges } from "../breaking-changes"

// Factory: create a version entry
function makeVersionEntry(overrides: {
  version: string
  publishedAt: string
}) {
  return {
    version: overrides.version,
    publishedAt: overrides.publishedAt,
  }
}

describe("detectBreakingChanges", () => {
  it("marks first version as non-breaking", () => {
    const versions = [makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" })]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false)
  })

  it("marks major version bump as breaking", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(true)  // 2.0.0
  })

  it("marks minor/patch bumps as non-breaking", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.1.0", publishedAt: "2023-06-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.1.1", publishedAt: "2023-07-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result.every((v) => v.breaking === false)).toBe(true)
  })

  it("handles multiple major bumps", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.1.0", publishedAt: "2024-03-01T00:00:00Z" }),
      makeVersionEntry({ version: "3.0.0", publishedAt: "2025-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(true)  // 2.0.0
    expect(result[2].breaking).toBe(false) // 2.1.0
    expect(result[3].breaking).toBe(true)  // 3.0.0
  })

  it("handles pre-release versions gracefully", () => {
    const versions = [
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.0.1-beta.1", publishedAt: "2023-02-01T00:00:00Z" }),
      makeVersionEntry({ version: "2.0.0-rc.1", publishedAt: "2023-06-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false) // 1.0.0
    expect(result[1].breaking).toBe(false) // 1.0.1-beta.1 (same major)
    expect(result[2].breaking).toBe(true)  // 2.0.0-rc.1 (major bump)
  })

  it("returns empty array for empty input", () => {
    expect(detectBreakingChanges([])).toEqual([])
  })

  it("sorts versions by publishedAt before detecting", () => {
    const versions = [
      makeVersionEntry({ version: "2.0.0", publishedAt: "2024-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "1.0.0", publishedAt: "2023-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].version).toBe("1.0.0")
    expect(result[0].breaking).toBe(false)
    expect(result[1].version).toBe("2.0.0")
    expect(result[1].breaking).toBe(true)
  })

  it("handles versions without dots gracefully", () => {
    const versions = [
      makeVersionEntry({ version: "1", publishedAt: "2023-01-01T00:00:00Z" }),
      makeVersionEntry({ version: "2", publishedAt: "2024-01-01T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].breaking).toBe(false)
    expect(result[1].breaking).toBe(true)
  })

  it("preserves original version data with breaking flag added", () => {
    const versions = [
      makeVersionEntry({ version: "3.2.1", publishedAt: "2023-06-15T00:00:00Z" }),
    ]
    const result = detectBreakingChanges(versions)
    expect(result[0].version).toBe("3.2.1")
    expect(result[0].publishedAt).toBe("2023-06-15T00:00:00Z")
    expect(result[0]).toHaveProperty("breaking")
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/domain/services/__tests__/breaking-changes.test.ts
```

Expected: FAIL - module not found.

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/domain/services/__tests__/breaking-changes.test.ts
```

Expected: PASS (all 9 tests)

**Step 5: Commit**

```bash
git add src/domain/services/breaking-changes.ts src/domain/services/__tests__/breaking-changes.test.ts
git commit -m "feat: add breaking change detection service with major-version heuristic"
```

---

## Task 7: Create Version Bucketing Service

**Files:**
- Create: `src/domain/services/version-buckets.ts`
- Test: `src/domain/services/__tests__/version-buckets.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/__tests__/version-buckets.test.ts
import { describe, it, expect } from "vitest"
import { groupVersionsIntoBuckets } from "../version-buckets"
import type { RiskLevel } from "../../models"

interface ScoredVersion {
  version: string
  releaseDate: number
  breaking: boolean
  score: number
  risk: RiskLevel
  reason: string
}

function makeScoredVersion(overrides: Partial<ScoredVersion> & { version: string }): ScoredVersion {
  return {
    version: overrides.version,
    releaseDate: overrides.releaseDate ?? Date.now(),
    breaking: overrides.breaking ?? false,
    score: overrides.score ?? 80,
    risk: overrides.risk ?? "low",
    reason: overrides.reason ?? "test reason",
  }
}

describe("groupVersionsIntoBuckets", () => {
  it("groups versions by major version", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 90 }),
      makeScoredVersion({ version: "1.1.0", score: 85 }),
      makeScoredVersion({ version: "2.0.0", score: 60 }),
      makeScoredVersion({ version: "2.1.0", score: 55 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets).toHaveLength(2)
  })

  it("orders buckets by highest version score (descending)", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 95 }),
      makeScoredVersion({ version: "2.0.0", score: 60 }),
      makeScoredVersion({ version: "3.0.0", score: 30 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].major).toBe(1)
    expect(buckets[0].bestScore).toBe(95)
    expect(buckets[1].major).toBe(2)
    expect(buckets[2].major).toBe(3)
  })

  it("orders versions within a bucket by score descending", () => {
    const versions = [
      makeScoredVersion({ version: "1.0.0", score: 80 }),
      makeScoredVersion({ version: "1.2.0", score: 90 }),
      makeScoredVersion({ version: "1.1.0", score: 85 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].versions[0].version).toBe("1.2.0")
    expect(buckets[0].versions[1].version).toBe("1.1.0")
    expect(buckets[0].versions[2].version).toBe("1.0.0")
  })

  it("returns empty array for empty input", () => {
    expect(groupVersionsIntoBuckets([])).toEqual([])
  })

  it("handles single version", () => {
    const versions = [makeScoredVersion({ version: "5.3.1", score: 75 })]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets).toHaveLength(1)
    expect(buckets[0].major).toBe(5)
    expect(buckets[0].versions).toHaveLength(1)
  })

  it("includes bestScore in each bucket", () => {
    const versions = [
      makeScoredVersion({ version: "2.0.0", score: 50 }),
      makeScoredVersion({ version: "2.5.0", score: 70 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].bestScore).toBe(70)
  })

  it("handles non-semver versions by using 0 as major", () => {
    const versions = [
      makeScoredVersion({ version: "latest", score: 50 }),
    ]
    const buckets = groupVersionsIntoBuckets(versions)
    expect(buckets[0].major).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/domain/services/__tests__/version-buckets.test.ts
```

Expected: FAIL - module not found.

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/domain/services/__tests__/version-buckets.test.ts
```

Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add src/domain/services/version-buckets.ts src/domain/services/__tests__/version-buckets.test.ts
git commit -m "feat: add version bucketing service grouped by major version"
```

---

## Task 8: Add Libraries.io Project Versions Adapter

**Files:**
- Modify: `src/infrastructure/adapters/libraries-io.ts`
- Modify: `src/infrastructure/adapters/__tests__/libraries-io.test.ts`

**Step 1: Write the failing tests**

Add to existing test file `src/infrastructure/adapters/__tests__/libraries-io.test.ts`:

```typescript
// Add this describe block after the existing searchLibraries tests

describe("fetchProjectVersions", () => {
  it("calls Libraries.io project endpoint and returns versions", async () => {
    const mockVersions = [
      { number: "18.2.0", published_at: "2022-06-14T00:00:00.000Z" },
      { number: "18.3.0", published_at: "2024-04-25T00:00:00.000Z" },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockVersions),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    const result = await fetchProjectVersions("NPM", "react")

    expect(result).toEqual(mockVersions)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("https://libraries.io/api/NPM/react/versions")
    expect(calledUrl).toContain("api_key=test-api-key")
  })

  it("encodes library name with special characters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve([]),
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
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/infrastructure/adapters/__tests__/libraries-io.test.ts
```

Expected: FAIL - `fetchProjectVersions` is not exported.

**Step 3: Add implementation to libraries-io.ts**

Add interface near the top:

```typescript
export interface LibrariesIoVersion {
  number: string
  published_at: string
}
```

Add function at the end:

```typescript
export async function fetchProjectVersions(
  platform: string,
  projectName: string
): Promise<LibrariesIoVersion[]> {
  const key = getApiKey()
  const encodedName = encodeURIComponent(projectName)
  const searchParams = new URLSearchParams({ api_key: key })
  const url = `${BASE_URL}/${platform}/${encodedName}/versions?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/infrastructure/adapters/__tests__/libraries-io.test.ts
```

Expected: PASS (all existing + 4 new tests)

**Step 5: Commit**

```bash
git add src/infrastructure/adapters/libraries-io.ts src/infrastructure/adapters/__tests__/libraries-io.test.ts
git commit -m "feat: add fetchProjectVersions to Libraries.io adapter"
```

---

## Task 9: Update /api/llms Route to Use JSON Data

**Files:**
- Modify: `src/app/api/llms/route.ts`

**Step 1: Update the route to use JSON data instead of Prisma**

```typescript
// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { getAllLlms } from "@/data/llms"
import { logger } from "@/lib/logger"

export async function GET() {
  const log = logger.child({ route: "/api/llms" })
  log.info("incoming request")

  try {
    const llms = getAllLlms()
    log.info({ count: llms.length }, "returning LLMs")
    return NextResponse.json({ data: llms })
  } catch (err) {
    log.error({ err }, "failed to get LLMs")
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
```

**Step 2: Run the app and test**

```bash
npm run dev
# In another terminal:
curl http://localhost:3000/api/llms
```

Expected: JSON response with LLM data.

**Step 3: Commit**

```bash
git add src/app/api/llms/route.ts
git commit -m "refactor: update /api/llms to use JSON data instead of Prisma"
```

---

## Task 10: Create Stateless /api/score Endpoint

**Files:**
- Create: `src/app/api/score/route.ts`
- Test: `src/app/api/__tests__/score.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/app/api/__tests__/score.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { faker } from "@faker-js/faker"

// Mock modules
vi.mock("@/data/llms", () => ({
  getAllLlms: vi.fn(),
  findLlmByName: vi.fn(),
}))

vi.mock("@/infrastructure/adapters/libraries-io", () => ({
  fetchProjectVersions: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })),
  },
}))

import { GET } from "../score/route"
import { findLlmByName } from "@/data/llms"
import { fetchProjectVersions } from "@/infrastructure/adapters/libraries-io"

// Factory helpers
function makeLlm(overrides: Partial<{ id: string; name: string; provider: string; approxCutoff: number }> = {}) {
  return {
    id: overrides.id ?? faker.string.alphanumeric(10),
    name: overrides.name ?? "GPT-4o",
    provider: overrides.provider ?? "OpenAI",
    approxCutoff: overrides.approxCutoff ?? new Date("2024-10-01").getTime(),
  }
}

function makeRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost:3000/api/score")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new Request(url.toString())
}

describe("GET /api/score", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 when llm param is missing", async () => {
    const res = await GET(makeRequest({ library: "react", platform: "NPM" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("llm")
  })

  it("returns 400 when library param is missing", async () => {
    const res = await GET(makeRequest({ llm: "GPT-4o", platform: "NPM" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("library")
  })

  it("returns 404 when LLM is not found", async () => {
    vi.mocked(findLlmByName).mockReturnValue(undefined)

    const res = await GET(makeRequest({ llm: "NonExistent", library: "react", platform: "NPM" }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain("LLM")
  })

  it("returns scored versions grouped into buckets on success", async () => {
    const llm = makeLlm({ name: "GPT-4o", approxCutoff: new Date("2024-10-01").getTime() })
    vi.mocked(findLlmByName).mockReturnValue(llm)
    vi.mocked(fetchProjectVersions).mockResolvedValue([
      { number: "18.2.0", published_at: "2022-06-14T00:00:00.000Z" },
      { number: "18.3.0", published_at: "2024-04-25T00:00:00.000Z" },
      { number: "19.0.0", published_at: "2025-03-01T00:00:00.000Z" },
    ])

    const res = await GET(makeRequest({ llm: "GPT-4o", library: "react", platform: "NPM" }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toBeDefined()
    expect(json.data.llm).toBe("GPT-4o")
    expect(json.data.library).toBe("react")
    expect(json.data.platform).toBe("NPM")
    expect(Array.isArray(json.data.buckets)).toBe(true)
    expect(json.data.buckets.length).toBeGreaterThan(0)

    const bucket = json.data.buckets[0]
    expect(bucket).toHaveProperty("major")
    expect(bucket).toHaveProperty("bestScore")
    expect(Array.isArray(bucket.versions)).toBe(true)

    const version = bucket.versions[0]
    expect(version).toHaveProperty("version")
    expect(version).toHaveProperty("score")
    expect(version).toHaveProperty("risk")
    expect(version).toHaveProperty("breaking")
    expect(version).toHaveProperty("releaseDate")
    expect(version).toHaveProperty("reason")
  })

  it("defaults platform to NPM when not provided", async () => {
    const llm = makeLlm({ name: "GPT-4o" })
    vi.mocked(findLlmByName).mockReturnValue(llm)
    vi.mocked(fetchProjectVersions).mockResolvedValue([
      { number: "1.0.0", published_at: "2023-01-01T00:00:00.000Z" },
    ])

    const res = await GET(makeRequest({ llm: "GPT-4o", library: "react" }))
    expect(res.status).toBe(200)

    expect(fetchProjectVersions).toHaveBeenCalledWith("NPM", "react")
  })

  it("returns 502 when Libraries.io fetch fails", async () => {
    const llm = makeLlm({ name: "GPT-4o" })
    vi.mocked(findLlmByName).mockReturnValue(llm)
    vi.mocked(fetchProjectVersions).mockRejectedValue(new Error("Libraries.io API error"))

    const res = await GET(makeRequest({ llm: "GPT-4o", library: "react", platform: "NPM" }))
    expect(res.status).toBe(502)
  })

  it("correctly flags breaking versions using major version heuristic", async () => {
    const llm = makeLlm({ name: "GPT-4o", approxCutoff: new Date("2024-10-01").getTime() })
    vi.mocked(findLlmByName).mockReturnValue(llm)
    vi.mocked(fetchProjectVersions).mockResolvedValue([
      { number: "1.0.0", published_at: "2023-01-01T00:00:00.000Z" },
      { number: "1.1.0", published_at: "2023-06-01T00:00:00.000Z" },
      { number: "2.0.0", published_at: "2024-01-01T00:00:00.000Z" },
    ])

    const res = await GET(makeRequest({ llm: "GPT-4o", library: "testlib", platform: "NPM" }))
    const json = await res.json()

    const allVersions = json.data.buckets.flatMap((b: { versions: { version: string; breaking: boolean }[] }) => b.versions)
    const v2 = allVersions.find((v: { version: string }) => v.version === "2.0.0")
    const v1_1 = allVersions.find((v: { version: string }) => v.version === "1.1.0")

    expect(v2.breaking).toBe(true)
    expect(v1_1.breaking).toBe(false)
  })

  it("returns empty buckets when no versions found", async () => {
    const llm = makeLlm({ name: "GPT-4o" })
    vi.mocked(findLlmByName).mockReturnValue(llm)
    vi.mocked(fetchProjectVersions).mockResolvedValue([])

    const res = await GET(makeRequest({ llm: "GPT-4o", library: "react", platform: "NPM" }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data.buckets).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/__tests__/score.test.ts
```

Expected: FAIL - module not found.

**Step 3: Write minimal implementation**

```typescript
// src/app/api/score/route.ts
import { NextResponse } from "next/server"
import { findLlmByName } from "@/data/llms"
import { fetchProjectVersions } from "@/infrastructure/adapters/libraries-io"
import { computeScore } from "@/domain/services/scoring"
import { detectBreakingChanges } from "@/domain/services/breaking-changes"
import { groupVersionsIntoBuckets } from "@/domain/services/version-buckets"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const llmName = searchParams.get("llm")?.trim()
  const libraryName = searchParams.get("library")?.trim()
  const platform = searchParams.get("platform")?.trim() || "NPM"

  const log = logger.child({ route: "/api/score", llm: llmName, library: libraryName, platform })

  log.info("incoming request")

  if (!llmName) {
    return NextResponse.json(
      { error: "llm query parameter is required" },
      { status: 400 }
    )
  }

  if (!libraryName) {
    return NextResponse.json(
      { error: "library query parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Find LLM (case-insensitive)
    const llm = findLlmByName(llmName)

    if (!llm) {
      log.warn("LLM not found")
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    // Fetch versions from Libraries.io
    let rawVersions
    const fetchStart = Date.now()
    try {
      rawVersions = await fetchProjectVersions(platform, libraryName)
      log.info(
        { fetchDurationMs: Date.now() - fetchStart, versionCount: rawVersions.length },
        "fetched versions from Libraries.io"
      )
    } catch (err) {
      log.error({ err, fetchDurationMs: Date.now() - fetchStart }, "failed to fetch versions from Libraries.io")
      return NextResponse.json(
        { error: "Failed to fetch library versions from external source" },
        { status: 502 }
      )
    }

    if (rawVersions.length === 0) {
      return NextResponse.json({
        data: {
          llm: llm.name,
          library: libraryName,
          platform,
          buckets: [],
        },
      })
    }

    // Detect breaking changes
    const versionsWithBreaking = detectBreakingChanges(
      rawVersions.map((v) => ({
        version: v.number,
        publishedAt: v.published_at,
      }))
    )

    // Score each version
    const scoredVersions = versionsWithBreaking.map((v) => {
      const releaseDate = new Date(v.publishedAt).getTime()
      const { score, risk, reason } = computeScore(
        { releaseDate, breaking: v.breaking },
        { approxCutoff: llm.approxCutoff }
      )
      return {
        version: v.version,
        releaseDate,
        breaking: v.breaking,
        score,
        risk,
        reason,
      }
    })

    // Group into buckets
    const buckets = groupVersionsIntoBuckets(scoredVersions)

    log.info(
      { totalDurationMs: Date.now() - reqStart, bucketCount: buckets.length, versionCount: scoredVersions.length },
      "scoring complete"
    )

    return NextResponse.json({
      data: {
        llm: llm.name,
        library: libraryName,
        platform,
        buckets,
      },
    })
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "unexpected error computing scores")
    return NextResponse.json(
      { error: "Failed to compute scores" },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/__tests__/score.test.ts
```

Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add src/app/api/score/route.ts src/app/api/__tests__/score.test.ts
git commit -m "feat: add stateless /api/score endpoint with bucketed results"
```

---

## Task 11: Add Pino Logging to Remaining API Routes

**Files:**
- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/api/platforms/route.ts`

**Step 1: Update search route**

```typescript
// src/app/api/search/route.ts
import { NextResponse } from "next/server"
import { searchLibraries } from "@/infrastructure/adapters/libraries-io"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const q = searchParams.get("q")?.trim()
  const platforms = searchParams.get("platforms") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "0")
  const perPage = parseInt(searchParams.get("per_page") ?? "9")
  const sort = searchParams.get("sort") ?? "stars"

  const log = logger.child({ route: "/api/search", q, platforms, page, perPage })

  log.info("incoming request")

  if (!q) {
    return NextResponse.json(
      { error: "q is required and must be non-empty" },
      { status: 400 }
    )
  }

  if (page < 0 || !Number.isInteger(page)) {
    return NextResponse.json(
      { error: "page must be a non-negative integer" },
      { status: 400 }
    )
  }

  if (perPage < 1 || perPage > 100 || !Number.isInteger(perPage)) {
    return NextResponse.json(
      { error: "per_page must be an integer between 1 and 100" },
      { status: 400 }
    )
  }

  try {
    const fetchStart = Date.now()
    const results = await searchLibraries({
      q,
      platforms,
      page,
      per_page: perPage,
      sort,
    })
    log.info(
      { fetchDurationMs: Date.now() - fetchStart, resultCount: results.length },
      "fetched from Libraries.io"
    )

    const data = results.map((r) => ({
      name: r.name,
      platform: r.platform,
      description: r.description,
      latestVersion:
        r.latest_stable_release_number ?? r.latest_release_number,
      latestReleaseAt: r.latest_stable_release_published_at,
      stars: r.stars,
      language: r.language,
      rank: r.rank,
    }))

    log.info({ totalDurationMs: Date.now() - reqStart }, "request complete")

    return NextResponse.json({ data })
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "failed to search libraries")
    return NextResponse.json(
      { error: "Failed to search libraries" },
      { status: 500 }
    )
  }
}
```

**Step 2: Update platforms route**

```typescript
// src/app/api/platforms/route.ts
import { NextResponse } from "next/server"
import { fetchPlatforms } from "@/infrastructure/adapters/libraries-io"
import { logger } from "@/lib/logger"

export async function GET() {
  const reqStart = Date.now()
  const log = logger.child({ route: "/api/platforms" })

  log.info("incoming request")

  try {
    const fetchStart = Date.now()
    const platforms = await fetchPlatforms()
    log.info(
      { fetchDurationMs: Date.now() - fetchStart, platformCount: platforms.length },
      "fetched from Libraries.io"
    )

    const data = platforms.map((p) => ({
      name: p.name,
      projectCount: p.project_count,
      color: p.color,
      defaultLanguage: p.default_language,
    }))

    log.info({ totalDurationMs: Date.now() - reqStart }, "request complete")

    return NextResponse.json({ data })
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "failed to fetch platforms")
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    )
  }
}
```

**Step 3: Verify all routes still work**

```bash
npm run dev
# Test each route
curl http://localhost:3000/api/llms
curl http://localhost:3000/api/platforms
curl "http://localhost:3000/api/search?q=react"
```

**Step 4: Commit**

```bash
git add src/app/api/search/route.ts src/app/api/platforms/route.ts
git commit -m "feat: add Pino structured logging to search and platforms routes"
```

---

## Task 12: Remove Old DB-Dependent Routes

**Files:**
- Delete: `src/app/api/libraries/route.ts`
- Delete: `src/app/api/compatibility/route.ts`

**Step 1: Remove the routes**

```bash
rm -f src/app/api/libraries/route.ts
rm -f src/app/api/compatibility/route.ts
rmdir src/app/api/libraries/ 2>/dev/null || true
rmdir src/app/api/compatibility/ 2>/dev/null || true
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated /api/libraries and /api/compatibility routes"
```

---

## Task 13: Create FilterableSelect Component

**Files:**
- Create: `src/components/filterable-select.tsx`

**Step 1: Install Radix Popover**

```bash
npm install @radix-ui/react-popover
```

**Step 2: Create the component**

```typescript
// src/components/filterable-select.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import * as Popover from "@radix-ui/react-popover"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "@/lib/cn"

export interface FilterableSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface FilterableSelectProps {
  options: FilterableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  "aria-label"?: string
}

export function FilterableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  loading = false,
  disabled = false,
  icon,
  "aria-label": ariaLabel,
}: FilterableSelectProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filter.toLowerCase()) ||
      (opt.sublabel?.toLowerCase().includes(filter.toLowerCase()) ?? false)
  )

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (open) {
      setFilter("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "flex shrink-0 cursor-pointer items-center gap-2 border-r border-border/50 px-3 py-2.5",
          "text-sm text-foreground outline-none",
          "hover:bg-muted/50 transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-muted-foreground"
        )}
        disabled={disabled || loading}
        aria-label={ariaLabel}
      >
        {icon}
        <span className="max-w-[120px] truncate">
          {loading ? "Loading..." : selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-64 rounded-xl border border-border/50 bg-card shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <ScrollArea.Root className="max-h-60">
            <ScrollArea.Viewport className="p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No results
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onValueChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none",
                      "text-foreground transition-colors",
                      "hover:bg-muted",
                      value === opt.value && "text-primary"
                    )}
                  >
                    {value === opt.value && (
                      <Check className="absolute left-1 h-3.5 w-3.5 text-primary" />
                    )}
                    <div className="flex items-center gap-2 pl-4">
                      <span>{opt.label}</span>
                      {opt.sublabel && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex w-2.5 touch-none p-0.5 transition-colors select-none"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/filterable-select.tsx package.json package-lock.json
git commit -m "feat: add FilterableSelect component with search and scroll"
```

---

## Task 14: Create LlmSelector Component

**Files:**
- Create: `src/components/llm-selector.tsx`

**Step 1: Create the component**

```typescript
// src/components/llm-selector.tsx
"use client"

import { useEffect, useState } from "react"
import { Bot } from "lucide-react"
import { FilterableSelect, type FilterableSelectOption } from "./filterable-select"
import type { Llm } from "@/domain/models"

interface LlmSelectorProps {
  value: string
  onValueChange: (llmId: string) => void
  disabled?: boolean
}

export function LlmSelector({ value, onValueChange, disabled = false }: LlmSelectorProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const options: FilterableSelectOption[] = llms.map((llm) => ({
    value: llm.id,
    label: llm.name,
    sublabel: llm.provider,
  }))

  return (
    <div className="inline-flex rounded-xl border border-border/50 bg-card">
      <FilterableSelect
        options={options}
        value={value}
        onValueChange={onValueChange}
        placeholder="Select LLM"
        loading={loading}
        disabled={disabled}
        icon={<Bot className="h-4 w-4 text-muted-foreground" />}
        aria-label="Select LLM"
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/llm-selector.tsx
git commit -m "feat: add standalone LlmSelector component"
```

---

## Task 15: Refactor UnifiedSearchBar to Remove LLM

**Files:**
- Modify: `src/components/unified-search-bar.tsx`

**Step 1: Update the component**

Remove the LLM dropdown. Keep only Platform dropdown and search input.

```typescript
// src/components/unified-search-bar.tsx
"use client"

import { useEffect, useState } from "react"
import { Layers, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { FilterableSelect, type FilterableSelectOption } from "./filterable-select"

interface Platform {
  name: string
  projectCount: number
  color: string
  defaultLanguage: string
}

interface UnifiedSearchBarProps {
  onSearch: (params: { platform: string; query: string }) => void
}

function formatProjectCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return String(count)
}

export function UnifiedSearchBar({ onSearch }: UnifiedSearchBarProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [platformsLoading, setPlatformsLoading] = useState(true)

  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetch("/api/platforms")
      .then((res) => res.json())
      .then((json) => setPlatforms(json.data ?? []))
      .catch(console.error)
      .finally(() => setPlatformsLoading(false))
  }, [])

  const isSearchDisabled = !query.trim()

  const handleSearch = () => {
    if (isSearchDisabled) return
    onSearch({
      platform: selectedPlatform,
      query: query.trim(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const platformOptions: FilterableSelectOption[] = platforms.map((p) => ({
    value: p.name,
    label: p.name,
    sublabel: `${formatProjectCount(p.projectCount)} projects`,
  }))

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-xl border border-border/50 bg-card",
        "transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
      )}
    >
      {/* Platform Dropdown */}
      <FilterableSelect
        options={platformOptions}
        value={selectedPlatform}
        onValueChange={setSelectedPlatform}
        placeholder={platformsLoading ? "Loading..." : "Platform"}
        loading={platformsLoading}
        icon={<Layers className="h-4 w-4 text-muted-foreground" />}
        aria-label="Select Platform"
      />

      {/* Search Input + Button */}
      <div className="flex flex-1 items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search libraries..."
          className={cn(
            "h-10 flex-1 bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none"
          )}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearchDisabled}
          className={cn(
            "shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground",
            "transition-colors hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          Search
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/unified-search-bar.tsx
git commit -m "refactor: remove LLM from UnifiedSearchBar, use FilterableSelect for platform"
```

---

## Task 16: Update VersionScores to Use /api/score

**Files:**
- Modify: `src/components/version-scores.tsx`

**Step 1: Update the component**

Change props to accept `llmName`, `libraryName`, `platform` (strings). Fetch from `/api/score`. Render bucketed results.

```typescript
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
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLoading(true)
    setBuckets([])
    setExpandedBuckets(new Set())

    const params = new URLSearchParams({
      llm: llmName,
      library: libraryName,
      platform,
    })

    fetch(`/api/score?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data?.buckets ?? []
        setBuckets(data)
        // Auto-expand first bucket
        if (data.length > 0) {
          setExpandedBuckets(new Set([data[0].major]))
        }
      })
      .catch(console.error)
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

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No version data available"
        description="This library has no recorded versions."
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
```

**Step 2: Commit**

```bash
git add src/components/version-scores.tsx
git commit -m "refactor: update VersionScores to display bucketed results from /api/score"
```

---

## Task 17: Update Main Page with New Flow

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update the page**

Implement the new flow:
1. Search bar (platform + query) → search results
2. Select library → show LLM selector
3. Select LLM → show version scores

```typescript
// src/app/page.tsx
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin, SearchX, FileCode2 } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { SearchResults } from "@/components/search-results"
import type { SearchResultItem } from "@/components/search-results"
import { LlmSelector } from "@/components/llm-selector"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"
import { EmptyState } from "@/components/empty-state"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedLibrary, setSelectedLibrary] = useState<{ name: string; platform: string } | null>(null)
  const [selectedLlmId, setSelectedLlmId] = useState<string>("")

  const handleSearch = useCallback(
    async (params: { platform: string; query: string }) => {
      // Clear downstream state
      setSelectedLibrary(null)
      setSelectedLlmId("")
      setSearchLoading(true)
      setHasSearched(true)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        const res = await fetch(`/api/search?${searchParams.toString()}`)
        const json = await res.json()
        setSearchResults(json.data ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  const handleSelectLibrary = useCallback((libraryName: string, platform: string) => {
    setSelectedLibrary({ name: libraryName, platform })
    setSelectedLlmId("") // Reset LLM when library changes
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Hero />

        {/* Step 1: Search for a library */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.4 }}
        >
          <SectionHeader
            step={1}
            title="Search for a library"
            subtitle="Choose a platform and search for a library"
          />
          <UnifiedSearchBar onSearch={handleSearch} />
        </motion.section>

        {/* Step 2: Select a library */}
        <AnimatePresence>
          {hasSearched && (
            <motion.section
              key="results-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={2}
                title="Select a library"
                subtitle="Choose a library from the search results"
              />
              {!searchLoading && searchResults.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No results found"
                  description="Try a different search term or platform."
                />
              ) : (
                <SearchResults
                  results={searchResults}
                  loading={searchLoading}
                  onSelectLibrary={handleSelectLibrary}
                  selectedName={selectedLibrary?.name}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Select an LLM */}
        <AnimatePresence>
          {selectedLibrary && (
            <motion.section
              key="llm-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={3}
                title="Select an LLM"
                subtitle="Choose which LLM to evaluate compatibility with"
              />
              <LlmSelector
                value={selectedLlmId}
                onValueChange={setSelectedLlmId}
                disabled={false}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 4: Version compatibility */}
        <AnimatePresence>
          {selectedLibrary && selectedLlmId && (
            <motion.section
              key="version-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={4}
                title="Version compatibility"
                subtitle="Scores based on LLM training cutoff heuristics"
              />
              <VersionScores
                llmName={selectedLlmId}
                libraryName={selectedLibrary.name}
                platform={selectedLibrary.platform || "NPM"}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Disclaimer />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Developed by Marcos Morais</span>
            <span className="text-border">|</span>
            <a
              href="https://www.linkedin.com/in/marcosmoraisdev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
            <a
              href="https://github.com/marcosmoraisdev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

**Note:** The `LlmSelector` uses LLM `id` as value, but `VersionScores` expects `llmName`. We need to update `LlmSelector` to also expose the selected LLM name, or change `VersionScores` to accept LLM id and look it up. For simplicity, let's have `LlmSelector` pass the LLM name directly.

**Step 2: Update LlmSelector to pass name instead of id**

In `src/components/llm-selector.tsx`, change the options to use `name` as value:

```typescript
const options: FilterableSelectOption[] = llms.map((llm) => ({
  value: llm.name,  // Changed from llm.id
  label: llm.name,
  sublabel: llm.provider,
}))
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/llm-selector.tsx
git commit -m "feat: update main page with new flow (search -> library -> LLM -> scores)"
```

---

## Task 18: Add Pagination to Search Results

**Files:**
- Modify: `src/components/search-results.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx to track search state**

Add state for pagination:

```typescript
const [searchPage, setSearchPage] = useState(0)
const [currentSearchParams, setCurrentSearchParams] = useState<{ platform: string; query: string } | null>(null)
```

Update `handleSearch` to store params and support page changes.

**Step 2: Add pagination callback**

```typescript
const handlePageChange = useCallback(async (newPage: number) => {
  if (!currentSearchParams) return
  setSearchPage(newPage)
  setSearchLoading(true)

  try {
    const searchParams = new URLSearchParams({
      q: currentSearchParams.query,
      page: String(newPage),
      per_page: "9",
    })
    if (currentSearchParams.platform) {
      searchParams.set("platforms", currentSearchParams.platform)
    }
    const res = await fetch(`/api/search?${searchParams.toString()}`)
    const json = await res.json()
    setSearchResults(json.data ?? [])
  } catch {
    setSearchResults([])
  } finally {
    setSearchLoading(false)
  }
}, [currentSearchParams])
```

**Step 3: Update SearchResults to show pagination**

Add simple prev/next buttons since Libraries.io doesn't return total count:

```typescript
// In SearchResults, add props:
interface SearchResultsProps {
  results: SearchResultItem[]
  loading: boolean
  onSelectLibrary: (libraryName: string, platform: string) => void
  selectedName?: string
  page?: number
  onPageChange?: (page: number) => void
}

// Add pagination UI at bottom
{onPageChange && (
  <div className="flex items-center justify-center gap-2 pt-6">
    <button
      onClick={() => onPageChange(Math.max(0, (page ?? 0) - 1))}
      disabled={(page ?? 0) === 0}
      className="..."
    >
      Previous
    </button>
    <span className="text-sm text-muted-foreground">Page {(page ?? 0) + 1}</span>
    <button
      onClick={() => onPageChange((page ?? 0) + 1)}
      disabled={results.length < 9}
      className="..."
    >
      Next
    </button>
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/components/search-results.tsx src/app/page.tsx
git commit -m "feat: add pagination to library search results"
```

---

## Task 19: Add Global cursor:pointer to Buttons

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add global style**

```css
button:not(:disabled) {
  cursor: pointer;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add cursor pointer to all non-disabled buttons"
```

---

## Task 20: Run Full Test Suite and Fix Issues

**Files:**
- All test files

**Step 1: Run all tests**

```bash
npx vitest run
```

**Step 2: Fix any failures**

**Step 3: Run lint**

```bash
npm run lint
```

**Step 4: Build**

```bash
npm run build
```

**Step 5: Fix any issues**

**Step 6: Commit**

```bash
git add -A
git commit -m "fix: resolve test, lint, and build issues"
```

---

## Task 21: Cleanup Dead Code

**Files:**
- Delete unused components
- Remove unused imports

**Step 1: Check for unused components**

```bash
grep -r "llm-list" src/
grep -r "library-list" src/
grep -r "search-input" src/
```

**Step 2: Delete unused files**

```bash
rm -f src/components/llm-list.tsx
rm -f src/components/library-list.tsx
rm -f src/components/search-input.tsx
```

**Step 3: Run tests + build**

```bash
npx vitest run && npm run build
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused components and dead code"
```

---

## Summary of Changes

| Area | What Changes |
|------|-------------|
| **Database** | Completely removed. No Prisma, no PostgreSQL. |
| **LLM storage** | JSON file at `src/data/llms.json` |
| **New dependencies** | `pino` (runtime), `@faker-js/faker` (dev), `@radix-ui/react-popover` |
| **Removed dependencies** | `@prisma/client`, `@prisma/adapter-pg`, `prisma` |
| **New files** | `src/data/llms.json`, `src/data/llms.ts`, `src/lib/logger.ts`, `src/domain/services/breaking-changes.ts`, `src/domain/services/version-buckets.ts`, `src/app/api/score/route.ts`, `src/components/filterable-select.tsx`, `src/components/llm-selector.tsx` |
| **Modified files** | `unified-search-bar.tsx`, `version-scores.tsx`, `page.tsx`, `libraries-io.ts`, API routes (logging), `globals.css` |
| **Deleted** | `prisma/` directory, `src/generated/`, `src/infrastructure/db/`, `src/infrastructure/repositories/`, `api/libraries/route.ts`, `api/compatibility/route.ts`, legacy components |
| **New tests** | ~35+ new test cases across 5 new test files |
| **UX flow** | Search (platform + query) → Select library → Select LLM → View bucketed scores |
