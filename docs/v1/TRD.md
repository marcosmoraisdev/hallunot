# Hallunot v1 — Technical Requirements Document

This document outlines the technical design for Hallunot, as defined in the [PRD](./PRD.md).

## 1. Technical Architecture

### 1.1 Next.js 16 App Router Structure

```
src/app/
├── layout.tsx              # Root layout (html, body, theme provider, fonts)
├── page.tsx                # Home page (LLM selector + library browser)
├── api/
│   ├── llms/route.ts       # GET handler — returns all LLMs
│   ├── libraries/route.ts  # GET handler — paginated libraries with versions
│   └── compatibility/route.ts # GET handler — paginated compatibility scores
```

**Key Next.js 16 patterns used:**
- `params` and `searchParams` are `Promise` types (must be `await`ed).
- Route handlers use the Web `Request`/`Response` API.
- Server Components by default; `'use client'` directive only where interactivity is needed.
- Metadata API via `export const metadata` or `generateMetadata`.

### 1.2 Prisma 7 Configuration

**Schema generator:**
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Client singleton (Next.js hot-reload safe):**
```typescript
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
export default prisma
```

**Key Prisma 7 patterns:**
- Generator provider is `"prisma-client"` (not `"prisma-client-js"`).
- Import path must include `/client` suffix: `from "../generated/prisma/client"`.
- Uses `@prisma/adapter-pg` with `PrismaPg` adapter for PostgreSQL/Neon.
- Pagination via `skip` and `take` parameters on `findMany`.

### 1.3 Domain Layer (Pure TypeScript)

```
src/domain/
├── models/
│   ├── llm.ts              # LLM entity type
│   ├── library.ts          # Library + Version entity types
│   └── compatibility.ts    # Compatibility result type
└── services/
    └── scoring.ts          # score(version, llm) -> { score, risk, reason }
```

No imports from Next.js, Prisma, or any external framework. Fully unit-testable.

### 1.4 Infrastructure Layer

```
src/infrastructure/
├── db/
│   └── prisma.ts           # Prisma singleton client
└── adapters/
    └── deps-dev.ts         # deps.dev API adapter (future)
```

### 1.5 Component Architecture

```
src/components/
├── theme-toggle.tsx        # Dark/light mode switch
├── llm-selector.tsx        # LLM dropdown/list
├── library-list.tsx        # Browsable library list with search
├── version-scores.tsx      # Scored version list with color coding
├── score-badge.tsx         # Individual score display (color-coded)
├── disclaimer.tsx          # Heuristic disclaimer text
└── pagination.tsx          # Reusable pagination controls
```

All components are small, single-responsibility, no business logic.

## 2. Data Model

### LLM
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| name | String | e.g., "Claude Opus 4" |
| provider | String | e.g., "Anthropic" |
| approx_cutoff | BigInt | Unix ms timestamp |
| created_at | DateTime | Auto-set |
| updated_at | DateTime | Auto-updated |

### Library
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| name | String | e.g., "react", "next" |
| ecosystem | String | e.g., "npm", "pip", "cargo" |
| description | String? | Optional short description |
| created_at | DateTime | Auto-set |
| updated_at | DateTime | Auto-updated |

### Version
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| library_id | String | FK to Library |
| version | String | Semver string, e.g., "18.2.0" |
| release_date | BigInt | Unix ms timestamp |
| breaking | Boolean | Relative to latest version |
| created_at | DateTime | Auto-set |
| updated_at | DateTime | Auto-updated |

### Compatibility (computed, not persisted)
| Field | Type | Notes |
|-------|------|-------|
| llm_id | String | Reference |
| library_id | String | Reference |
| version | String | Version string |
| score | Number | 0-100 |
| risk | Enum | "low" / "medium" / "high" |
| reason | String | Human-readable explanation |

## 3. API Specification

### GET /api/llms
- **Response:** `{ data: LLM[] }`
- No pagination.

### GET /api/libraries
- **Query params:** `page` (default 1), `limit` (default 20)
- **Response:** `{ data: Library[], pagination: { page, limit, total, totalPages } }`
- Each library includes its versions array.

### GET /api/compatibility
- **Query params:** `llm_id` (required), `library_id` (required), `page` (default 1), `limit` (default 20)
- **Response:** `{ data: Compatibility[], pagination: { page, limit, total, totalPages } }`
- Scores are computed on-the-fly, not persisted.
