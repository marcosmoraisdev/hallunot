# Hallu<span style="color:red">not</span> — Agent Guidelines

> **Hallunot** = Hallucination + Not.
## What Is This Project?

A tool that helps developers pick library/framework versions that a given LLM is **more likely to know well**, based on training data cutoff dates. The goal is to **reduce hallucinations** when coding with an LLM without extra context (no RAG, no web search, no MCP).

This is **not** about official support. It is a heuristic compatibility score.

## Architecture

```
hallunot/
├── src/
│   ├── app/                  # Next.js App Router (pages + API routes)
│   │   ├── api/
│   │   │   ├── llms/         # GET /api/llms
│   │   │   ├── libraries/    # GET /api/libraries (paginated)
│   │   │   └── compatibility/# GET /api/compatibility (paginated)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/           # Small, focused React components
│   ├── domain/               # Core business logic (pure, no framework deps)
│   │   ├── models/           # LLM, Library, Version, Compatibility entities
│   │   └── services/         # Score calculation, risk classification
│   ├── infrastructure/       # Prisma client, external API adapters
│   │   ├── db/               # Prisma schema + migrations
│   │   └── adapters/         # deps.dev gRPC client, future data sources
│   └── lib/                  # Shared utilities (date helpers, constants)
├── prisma/
│   └── schema.prisma
├── public/
```

**Principles:** DDD + Clean Architecture. Domain logic has zero imports from Next.js, Prisma, or any framework.

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js (latest, App Router) | Keep it simple — no custom server |
| Styling | Radix UI and Tailwind CSS | Alwayys use Radix UI whenever possible. Use Tailwind CSS for utility classes. |
| Database | PostgreSQL + Prisma | Prisma for migrations + type-safe queries | Neon for database integration |
| External data | deps.dev API (gRPC) | Library name, version, release date, breaking changes source |
| Theme | Light & Dark + toggle

## Data Model (Core Entities)  - INITIAL

All entities must have audit fields: `created_at`, `updated_at`.

### LLM
```ts
{ id: string; name: string; approx_cutoff: number } // cutoff as Unix ms
```

### Library
```ts
{ id: string; name: string; versions: Version[] }
```

### Version
```ts
{ version: string; release_date: number; breaking: boolean }
```
Note: this breaking is calculated relative to latest version of the library.

### Compatibility (computed)
```ts
{ llm_id: string; library_id: string; version: string; score: number; risk: "low" | "medium" | "high"; reason: string }
```

Suggest more important fields

## Score Logic

The scoring function lives in `src/domain/services/` and must be **pure** (no side effects, easy to test and replace).

```
score(version, llm) -> { score: 0-100, risk, reason }
```

Rules (v1 — intentionally simple):

1. `release_date <= cutoff` → base score **85–100** (closer to cutoff = slightly lower)
2. `release_date` within **6 months after cutoff** → score **50–70**
3. `release_date > cutoff + 6 months` → score **10–40**
4. `breaking === true` → apply **-15 penalty** (major/breaking versions are riskier even if within cutoff)
5. Final score clamped to `[0, 100]`

**Risk labels:**
- `score >= 70` → `"low"` — "Alta confiabilidade"
- `score >= 40` → `"medium"` — "Pode exigir ajustes"
- `score < 40` → `"high"` — "Alto risco de respostas desatualizadas"

Always display the disclaimer: _"This score is heuristic and aims to reduce errors without additional context."_

## API Routes

| Endpoint | Method | Pagination | Description |
|----------|--------|------------|-------------|
| `/api/llms` | GET | No | List all LLMs |
| `/api/libraries` | GET | Yes (`?page=&limit=`) | List libraries with versions |
| `/api/compatibility` | GET | Yes (`?llm_id=&library_id=&page=&limit=`) | Computed compatibility scores |

## UI Rules

- Use Radix UI whenever possible.
- Use Tailwind CSS for utility classes.
- English language.
- Clean, minimal interface.
- Responsive design.
- Theme Dark first with switch to light. 
- Flow: Select LLM → see libraries → select library → see version scores.
- **Never** say "officially supported". Use honest language.
- Color-coded scores: green (`low`), yellow (`medium`), red (`high`).

## Coding Standards

- Written in English.
- Use TypeScript, type-safe code.
- Components: small, single-responsibility, no business logic.
- Domain layer: pure TypeScript, no framework imports, 100% unit-testable.
- Tests: unit tests for domain services (score logic is the priority).
- No premature abstractions — keep it flat until complexity demands otherwise.
- Use `context7` MCP server when looking up library version information during development.

## What NOT To Do in V1

- Do NOT integrate real LLM APIs.
- Do NOT run benchmarks or real inference tests.
- Do NOT over-engineer.
- Do NOT add features beyond the scope described here without explicit approval.
- Do NOT use phrases like "officially supported" in the UI.

## Future (Out of Scope Now)

- Automated version ingestion pipeline
- Real benchmark-based scoring
- Community contributions for LLM cutoff data
- Browser extension
- CLI tool
