# Hallunot v1 — Task Breakdown

> Each task is scoped, ordered by dependency, and includes acceptance criteria.
> Prefix legend: **P** = Project Setup, **D** = Domain, **I** = Infrastructure, **A** = API, **U** = UI, **T** = Testing, **S** = Seed Data.

---

## Phase 1: Project Scaffolding & Configuration

### P-01: Initialize Next.js 16 project

- [ ] Run `npx create-next-app@latest` with App Router, TypeScript, Tailwind CSS, ESLint.
- [ ] Verify `next` version is 16.x in `package.json`.
- [ ] Confirm project runs with `npm run dev`.
- [ ] Verify Tailwind CSS is working (test with a utility class on the root page).

**Next.js 16 specifics:**
- App Router is the default. Project structure uses `src/app/`.
- Root layout (`src/app/layout.tsx`) must define `<html>` and `<body>` tags and accept `children: React.ReactNode`.
- `params` and `searchParams` in pages/layouts are `Promise` types and must be `await`ed.

**AC:** `npm run dev` serves a page at `localhost:3000`. TypeScript compiles. Tailwind works.

---

### P-02: Install and configure Radix UI

- [ ] Install Radix UI primitives needed for v1:
  - `@radix-ui/react-select` (LLM selector)
  - `@radix-ui/react-toggle` or `@radix-ui/react-switch` (theme toggle)
  - `@radix-ui/react-separator`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-tooltip`
- [ ] Verify Radix components render correctly alongside Tailwind.

**AC:** Radix primitives import and render without errors.

---

### P-03: Install and configure Prisma 7

- [ ] Install `prisma` (dev), `@prisma/client`, and `@prisma/adapter-pg` packages.
- [ ] Run `npx prisma init` to create `prisma/schema.prisma` and `.env`.
- [ ] Configure the generator:
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
- [ ] Set `DATABASE_URL` in `.env` pointing to local PostgreSQL or Neon.
- [ ] Create the Prisma singleton client at `src/infrastructure/db/prisma.ts`:
  ```typescript
  import { PrismaClient } from "../../generated/prisma/client"
  import { PrismaPg } from "@prisma/adapter-pg"

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const globalForPrisma = global as unknown as { prisma: PrismaClient }
  const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
  export default prisma
  ```
- [ ] Add `.env` to `.gitignore`.

**Prisma 7 specifics:**
- Generator provider is `"prisma-client"` (NOT `"prisma-client-js"`).
- Import path must include `/client` suffix: `from "../../generated/prisma/client"`.
- Uses `PrismaPg` adapter from `@prisma/adapter-pg` for PostgreSQL/Neon.
- Global singleton pattern prevents multiple instances during Next.js hot reload.

**AC:** `npx prisma generate` succeeds. Prisma client can be imported without errors.

---

### P-04: Set up project directory structure

- [ ] Create the following directories:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── llms/
  │   │   ├── libraries/
  │   │   └── compatibility/
  ├── components/
  ├── domain/
  │   ├── models/
  │   └── services/
  ├── infrastructure/
  │   ├── db/
  │   └── adapters/
  └── lib/
  ```
- [ ] Ensure `src/app/layout.tsx` exists with root layout (html + body).
- [ ] Ensure `src/app/page.tsx` exists with a placeholder.

**AC:** All directories exist. Project still compiles and runs.

---

### P-05: Configure dark/light theme support

- [ ] Install `next-themes` (or implement via Radix Toggle + CSS variables).
- [ ] Set up `ThemeProvider` in root layout wrapping `{children}`.
- [ ] Configure Tailwind `darkMode: 'class'` in `tailwind.config.ts`.
- [ ] Default theme: dark.
- [ ] Create `src/components/theme-toggle.tsx` using Radix Switch or Toggle.

**AC:** Page loads in dark mode by default. Toggle switches between dark and light. Tailwind dark: classes apply correctly.

---

## Phase 2: Domain Layer (Pure TypeScript)

### D-01: Define domain model types

- [ ] Create `src/domain/models/llm.ts`:
  ```typescript
  export interface Llm {
    id: string
    name: string
    provider: string
    approxCutoff: number // Unix ms
  }
  ```
- [ ] Create `src/domain/models/library.ts`:
  ```typescript
  export interface Library {
    id: string
    name: string
    ecosystem: string
    description?: string
  }

  export interface Version {
    id: string
    libraryId: string
    version: string
    releaseDate: number // Unix ms
    breaking: boolean
  }
  ```
- [ ] Create `src/domain/models/compatibility.ts`:
  ```typescript
  export type RiskLevel = "low" | "medium" | "high"

  export interface Compatibility {
    llmId: string
    libraryId: string
    version: string
    score: number     // 0-100
    risk: RiskLevel
    reason: string
  }
  ```
- [ ] Create `src/domain/models/index.ts` barrel export.

**Constraint:** Zero imports from Next.js, Prisma, or any framework.

**AC:** All types are defined, exported, and compile. No external framework imports.

---

### D-02: Implement scoring service

- [ ] Create `src/domain/services/scoring.ts`.
- [ ] Implement the pure scoring function:
  ```typescript
  export function computeScore(
    version: { releaseDate: number; breaking: boolean },
    llm: { approxCutoff: number }
  ): { score: number; risk: RiskLevel; reason: string }
  ```
- [ ] Implement v1 rules:
  1. **release_date <= cutoff:** Calculate how far before cutoff the release is. Versions well before cutoff get higher scores (closer to 100). Versions right at cutoff get ~85.
  2. **release_date within 6 months after cutoff:** Linear interpolation from 70 (just after cutoff) down to 50 (at 6 months).
  3. **release_date > cutoff + 6 months:** Linear interpolation from 40 (at 6 months) down to 10 (at 12+ months).
  4. **Breaking penalty:** Subtract 15 if `breaking === true`.
  5. **Clamp:** Final score clamped to [0, 100].
- [ ] Implement risk classification:
  - `score >= 70` -> `"low"`
  - `score >= 40` -> `"medium"`
  - `score < 40` -> `"high"`
- [ ] Generate a human-readable `reason` string for each result.

**Constraint:** Pure function. No side effects. No external imports.

**AC:** Function compiles, accepts the specified inputs, and returns the correct output shape.

---

### D-03: Implement risk label helper

- [ ] Create `src/domain/services/risk.ts` (or colocate in scoring.ts).
- [ ] Export helper:
  ```typescript
  export function classifyRisk(score: number): RiskLevel
  ```
- [ ] Export risk label descriptions (for UI):
  ```typescript
  export const RISK_LABELS: Record<RiskLevel, string> = {
    low: "High reliability",
    medium: "May require adjustments",
    high: "High risk of outdated responses",
  }
  ```

**AC:** Risk classification matches the defined thresholds.

---

### D-04: Add shared date/constants utilities

- [ ] Create `src/lib/constants.ts`:
  - `SIX_MONTHS_MS` = 6 months in milliseconds.
  - `TWELVE_MONTHS_MS` = 12 months in milliseconds.
  - `DISCLAIMER_TEXT` = "This score is heuristic and aims to reduce errors without additional context."
- [ ] Create `src/lib/date.ts` if any date helper functions are needed (e.g., `msToMonths`, `formatDate`).

**AC:** Constants are used by the scoring service. No magic numbers in domain logic.

---

## Phase 3: Infrastructure Layer

### I-01: Define Prisma schema models

- [ ] Add the following models to `prisma/schema.prisma`:

  ```prisma
  model Llm {
    id           String   @id @default(uuid())
    name         String
    provider     String
    approxCutoff BigInt
    createdAt    DateTime @default(now()) @map("created_at")
    updatedAt    DateTime @updatedAt @map("updated_at")

    @@map("llms")
  }

  model Library {
    id          String    @id @default(uuid())
    name        String    @unique
    ecosystem   String
    description String?
    versions    Version[]
    createdAt   DateTime  @default(now()) @map("created_at")
    updatedAt   DateTime  @updatedAt @map("updated_at")

    @@map("libraries")
  }

  model Version {
    id          String   @id @default(uuid())
    library     Library  @relation(fields: [libraryId], references: [id])
    libraryId   String   @map("library_id")
    version     String
    releaseDate BigInt   @map("release_date")
    breaking    Boolean  @default(false)
    createdAt   DateTime @default(now()) @map("created_at")
    updatedAt   DateTime @updatedAt @map("updated_at")

    @@unique([libraryId, version])
    @@map("versions")
  }
  ```

- [ ] Run `npx prisma migrate dev --name init` to create the initial migration.
- [ ] Run `npx prisma generate` to regenerate the client.

**Prisma 7 specifics:**
- `@map` directives map camelCase fields to snake_case columns.
- `@@map` maps model names to table names.
- `BigInt` is used for Unix ms timestamps.
- `@relation` defines foreign keys explicitly.
- `@@unique` creates a compound unique constraint on (libraryId, version).
- `@updatedAt` auto-updates on every write.

**AC:** Migration runs. `npx prisma studio` shows the three tables. Generated client types are available.

---

### I-02: Create repository layer (data access)

- [ ] Create `src/infrastructure/repositories/llm-repository.ts`:
  ```typescript
  export async function findAllLlms(): Promise<Llm[]>
  ```
- [ ] Create `src/infrastructure/repositories/library-repository.ts`:
  ```typescript
  export async function findLibraries(page: number, limit: number): Promise<{ data: Library[]; total: number }>
  export async function findLibraryById(id: string): Promise<Library | null>
  ```
- [ ] Create `src/infrastructure/repositories/version-repository.ts`:
  ```typescript
  export async function findVersionsByLibraryId(libraryId: string, page: number, limit: number): Promise<{ data: Version[]; total: number }>
  ```
- [ ] Each repository imports the Prisma singleton from `src/infrastructure/db/prisma.ts`.
- [ ] Use Prisma's `findMany` with `skip` and `take` for pagination:
  ```typescript
  const data = await prisma.library.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: { versions: true },
  })
  const total = await prisma.library.count()
  ```

**AC:** Repository functions compile and return typed results.

---

## Phase 4: API Routes

### A-01: Implement GET /api/llms

- [ ] Create `src/app/api/llms/route.ts`.
- [ ] Implement `GET` handler:
  ```typescript
  import { NextResponse } from "next/server"

  export async function GET() {
    const llms = await findAllLlms()
    return NextResponse.json({ data: llms })
  }
  ```
- [ ] Map Prisma entities to domain types (BigInt -> number conversion for JSON serialization).

**Next.js 16 specifics:**
- Route handlers are in `route.ts` files.
- Export named functions matching HTTP methods (`GET`, `POST`, etc.).
- Return `Response` or `NextResponse`.

**AC:** `GET /api/llms` returns `{ data: [...] }` with all seeded LLMs.

---

### A-02: Implement GET /api/libraries

- [ ] Create `src/app/api/libraries/route.ts`.
- [ ] Parse `searchParams` from the request URL for `page` and `limit`.
- [ ] Implement paginated response:
  ```typescript
  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    // ... fetch and return
  }
  ```
- [ ] Return shape: `{ data: Library[], pagination: { page, limit, total, totalPages } }`.
- [ ] Include versions in each library.

**AC:** `GET /api/libraries?page=1&limit=10` returns paginated results with versions included.

---

### A-03: Implement GET /api/compatibility

- [ ] Create `src/app/api/compatibility/route.ts`.
- [ ] Require `llm_id` and `library_id` query params. Return 400 if missing.
- [ ] Fetch the LLM and the library's versions from the database.
- [ ] For each version, call `computeScore(version, llm)` from the domain service.
- [ ] Return paginated results:
  ```typescript
  { data: Compatibility[], pagination: { page, limit, total, totalPages } }
  ```
- [ ] Scores are computed on-the-fly, never persisted.

**AC:** `GET /api/compatibility?llm_id=xxx&library_id=yyy` returns scored versions. Missing params return 400.

---

### A-04: Add input validation and error handling to API routes

- [ ] Validate `page` and `limit` are positive integers.
- [ ] Validate UUID format for `llm_id` and `library_id`.
- [ ] Return 404 if LLM or library not found.
- [ ] Return consistent error shape: `{ error: string }`.
- [ ] Handle unexpected errors with 500 and generic message.

**AC:** Invalid inputs return appropriate 4xx errors. Unexpected errors return 500 without leaking internals.

---

## Phase 5: UI Components

### U-01: Build root layout with theme support

- [ ] Update `src/app/layout.tsx`:
  - Import and apply font (Inter or system font via Tailwind).
  - Wrap children with ThemeProvider.
  - Set default metadata (title: "Hallunot", description).
  - Apply base dark mode styles.

**Next.js 16 specifics:**
- Root layout must define `<html>` and `<body>`.
- Use `export const metadata: Metadata` for static metadata.

**AC:** Root layout renders with dark mode default. Theme provider wraps all children.

---

### U-02: Build ThemeToggle component

- [ ] Create `src/components/theme-toggle.tsx` as a client component (`'use client'`).
- [ ] Use Radix UI Switch or Toggle primitive.
- [ ] Toggle between dark and light themes.
- [ ] Style with Tailwind CSS.
- [ ] Place in layout header/nav.

**AC:** Toggle switches theme. Visual state reflects current theme.

---

### U-03: Build LLM Selector component

- [ ] Create `src/components/llm-selector.tsx` as a client component.
- [ ] Use Radix UI Select primitive.
- [ ] Fetch LLMs from `/api/llms` on mount (or receive as prop from server component).
- [ ] Display LLM name and provider.
- [ ] Emit selected LLM id to parent.

**AC:** Dropdown shows all LLMs. Selection triggers callback with LLM id.

---

### U-04: Build Library List component

- [ ] Create `src/components/library-list.tsx` as a client component.
- [ ] Display libraries in a grid or list layout.
- [ ] Show library name, ecosystem badge, and version count.
- [ ] Support selecting a library (click handler).
- [ ] Include pagination controls.
- [ ] Fetch from `/api/libraries?page=&limit=`.

**AC:** Libraries are displayed with pagination. Clicking a library triggers callback with library id.

---

### U-05: Build Version Scores component

- [ ] Create `src/components/version-scores.tsx` as a client component.
- [ ] Fetch from `/api/compatibility?llm_id=&library_id=`.
- [ ] Display each version with:
  - Version string.
  - Score number.
  - Color-coded risk badge (ScoreBadge component).
  - Reason text.
- [ ] Sort by version (newest first) or by score (highest first).
- [ ] Include pagination controls.

**AC:** Version scores display correctly with color coding. Pagination works.

---

### U-06: Build ScoreBadge component

- [ ] Create `src/components/score-badge.tsx`.
- [ ] Accept `score` and `risk` props.
- [ ] Render a colored badge:
  - Green background/text for `"low"` risk.
  - Yellow/amber for `"medium"` risk.
  - Red for `"high"` risk.
- [ ] Display the numeric score inside the badge.

**AC:** Badge renders with correct color for each risk level.

---

### U-07: Build Disclaimer component

- [ ] Create `src/components/disclaimer.tsx`.
- [ ] Render the disclaimer text from `src/lib/constants.ts`.
- [ ] Style as a subtle banner/footer note.

**AC:** Disclaimer is visible on the page. Text matches the defined constant.

---

### U-08: Build Pagination component

- [ ] Create `src/components/pagination.tsx` as a client component.
- [ ] Accept `page`, `totalPages`, and `onPageChange` props.
- [ ] Render previous/next buttons and page indicator.
- [ ] Disable previous on page 1, next on last page.
- [ ] Use Radix UI buttons if appropriate.

**AC:** Pagination renders correctly. Buttons enable/disable appropriately. Page changes emit callback.

---

### U-09: Compose the main page

- [ ] Update `src/app/page.tsx` to compose all components:
  1. Header with app name + ThemeToggle.
  2. LLM Selector.
  3. Library List (shown after LLM is selected).
  4. Version Scores panel (shown after library is selected).
  5. Disclaimer at the bottom.
- [ ] Manage state: `selectedLlmId`, `selectedLibraryId`.
- [ ] Flow: Select LLM -> see libraries -> select library -> see version scores.
- [ ] Responsive layout: stack on mobile, side-by-side on desktop.

**AC:** Full user flow works end-to-end. Responsive layout. Dark mode default.

---

## Phase 6: Seed Data

### S-01: Create seed script

- [ ] Create `prisma/seed.ts` (or `src/infrastructure/db/seed.ts`).
- [ ] Seed LLMs:
  | Name | Provider | Approx Cutoff |
  |------|----------|---------------|
  | GPT-4o | OpenAI | 2024-10-01 as Unix ms |
  | GPT-4 Turbo | OpenAI | 2024-04-01 as Unix ms |
  | Claude Opus 4 | Anthropic | 2025-03-01 as Unix ms |
  | Claude Sonnet 4 | Anthropic | 2025-03-01 as Unix ms |
  | Gemini 2.0 Flash | Google | 2024-08-01 as Unix ms |
- [ ] Seed libraries with real versions and release dates. At minimum:
  - **react**: 18.2.0, 18.3.0, 18.3.1, 19.0.0 (breaking), 19.1.0
  - **next**: 14.2.0, 15.0.0 (breaking), 15.1.0, 16.0.0 (breaking), 16.1.0
  - **typescript**: 5.3.0, 5.4.0, 5.5.0, 5.6.0, 5.7.0
  - **prisma**: 5.0.0, 6.0.0 (breaking), 6.19.0, 7.0.0 (breaking)
  - **tailwindcss**: 3.4.0, 3.4.1, 4.0.0 (breaking)
  - **express**: 4.18.0, 4.19.0, 5.0.0 (breaking)
  - **vue**: 3.3.0, 3.4.0, 3.5.0
  - **angular**: 17.0.0, 18.0.0 (breaking), 19.0.0 (breaking)
  - **svelte**: 4.0.0, 5.0.0 (breaking)
  - **fastify**: 4.0.0, 5.0.0 (breaking)
- [ ] Use `upsert` to make the seed script idempotent.
- [ ] Add `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to `package.json`.
- [ ] Run `npx prisma db seed`.

**AC:** `npx prisma db seed` runs without errors. `npx prisma studio` shows populated tables. Re-running seed does not duplicate data.

---

## Phase 7: Testing

### T-01: Set up testing framework

- [ ] Install `vitest` and configure for TypeScript.
- [ ] Add `test` script to `package.json`.
- [ ] Create `vitest.config.ts` with path aliases matching `tsconfig.json`.

**AC:** `npm test` runs and finds test files.

---

### T-02: Write unit tests for scoring service

- [ ] Create `src/domain/services/__tests__/scoring.test.ts`.
- [ ] Test cases:
  - Version released well before cutoff -> score ~95-100, risk "low".
  - Version released at cutoff -> score ~85, risk "low".
  - Version released 1 month after cutoff -> score ~65, risk "low".
  - Version released 3 months after cutoff -> score ~55-60, risk "medium".
  - Version released 6 months after cutoff -> score ~50, risk "medium".
  - Version released 9 months after cutoff -> score ~25, risk "high".
  - Version released 12+ months after cutoff -> score ~10, risk "high".
  - Breaking version within cutoff -> score reduced by 15, risk may change.
  - Breaking version after cutoff -> penalty stacks with time penalty.
  - Score clamping: never below 0, never above 100.
  - Edge case: release_date exactly equals cutoff.
  - Edge case: release_date exactly 6 months after cutoff.

**AC:** All tests pass. Score logic matches the defined rules.

---

### T-03: Write unit tests for risk classification

- [ ] Create `src/domain/services/__tests__/risk.test.ts`.
- [ ] Test boundary values:
  - Score 100 -> "low".
  - Score 70 -> "low".
  - Score 69 -> "medium".
  - Score 40 -> "medium".
  - Score 39 -> "high".
  - Score 0 -> "high".

**AC:** All boundary tests pass.

---

### T-04: Write API route integration tests (optional for v1)

- [ ] Test `/api/llms` returns all LLMs.
- [ ] Test `/api/libraries` pagination params.
- [ ] Test `/api/compatibility` with valid and invalid params.
- [ ] Test error responses for missing/invalid params.

**AC:** API routes return expected responses and status codes.

---

## Phase 8: Polish & Final Steps

### F-01: Add loading states

- [ ] Create `src/app/loading.tsx` for page-level loading.
- [ ] Add skeleton/loading states to LLM Selector, Library List, and Version Scores.
- [ ] Use Radix UI or Tailwind CSS animation for skeletons.

**AC:** Loading states appear while data is being fetched. No layout shift.

---

### F-02: Add error boundaries

- [ ] Create `src/app/error.tsx` as a client component for app-level errors.
- [ ] Display user-friendly error messages.
- [ ] Include a retry button.

**Next.js 16 specifics:**
- `error.tsx` must be a client component (`'use client'`).
- Receives `error` and `reset` props.

**AC:** Runtime errors show a friendly error page with retry option instead of crashing.

---

### F-03: Add responsive design polish

- [ ] Verify all components render correctly on mobile (320px), tablet (768px), and desktop (1280px).
- [ ] Ensure the LLM selector, library list, and version scores stack vertically on mobile.
- [ ] Ensure text is readable and buttons are tappable on touch devices.

**AC:** UI is functional and readable across all breakpoints.

---

### F-04: Final review and cleanup

- [ ] Remove any placeholder content.
- [ ] Ensure no "officially supported" language exists anywhere in the UI.
- [ ] Verify disclaimer is visible.
- [ ] Run `npm run build` to ensure production build succeeds.
- [ ] Run `npm test` to ensure all tests pass.
- [ ] Verify TypeScript has no type errors.

**AC:** Clean build. All tests green. No type errors. No placeholder text.

---

## Task Dependency Graph

```
P-01 ──┬── P-02
       ├── P-03 ── I-01 ── I-02 ── A-01
       ├── P-04                     A-02
       └── P-05                     A-03
                                    A-04
D-01 ── D-02 ── D-03
         │
D-04 ────┘

I-01 ── I-02 ─┬── A-01
               ├── A-02
               └── A-03 ── A-04

D-02 ──────────────── A-03

P-05 ── U-01 ── U-02
U-03 ──┐
U-04 ──┤
U-05 ──┼── U-09
U-06 ──┤
U-07 ──┤
U-08 ──┘

I-01 ── S-01

T-01 ─┬── T-02
      ├── T-03
      └── T-04

U-09 ── F-01
        F-02
        F-03
        F-04 (depends on everything)
```

## Execution Order (Suggested)

| Order | Tasks | Phase |
|-------|-------|-------|
| 1 | P-01 | Scaffold Next.js 16 project |
| 2 | P-02, P-03, P-04, P-05 (parallel) | Install deps, create dirs, configure theme |
| 3 | D-01, D-04 (parallel) | Define domain types and constants |
| 4 | D-02, D-03 | Implement scoring + risk classification |
| 5 | T-01 | Set up test framework |
| 6 | T-02, T-03 (parallel) | Test scoring logic |
| 7 | I-01 | Define Prisma schema + migrate |
| 8 | I-02 | Create repository layer |
| 9 | S-01 | Seed the database |
| 10 | A-01, A-02, A-03 (parallel) | Implement API routes |
| 11 | A-04 | Add validation/error handling |
| 12 | U-01, U-02 | Root layout + theme toggle |
| 13 | U-03, U-04, U-05, U-06, U-07, U-08 (parallel) | Build all UI components |
| 14 | U-09 | Compose main page |
| 15 | F-01, F-02, F-03 (parallel) | Loading, errors, responsive polish |
| 16 | T-04 | API integration tests |
| 17 | F-04 | Final review + cleanup |

---

**Total: 31 tasks across 8 phases.**
