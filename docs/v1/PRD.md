# Hallunot v1 — Product Requirements Document

## 1. Overview

**Hallunot** (Hallucination + Not) is a web tool that helps developers choose library/framework versions an LLM is more likely to know well, based on training data cutoff dates. The goal is to reduce hallucinations when coding with an LLM without extra context (no RAG, no web search, no MCP).

This is a **heuristic compatibility score**, not an official support indicator.

## 2. Problem Statement

When developers use LLMs for coding assistance, the model may hallucinate APIs, methods, or patterns for library versions released after its training data cutoff. There is currently no simple way to check which version of a library an LLM is likely to handle accurately. Developers waste time debugging AI-generated code that references non-existent or changed APIs.

## 3. Target Users

- Developers who use LLMs (ChatGPT, Claude, Gemini, etc.) as coding assistants.
- Teams evaluating which library versions to adopt when LLM-assisted development is part of their workflow.

## 4. Core User Flow

1. User opens Hallunot.
2. User selects an LLM from a list (e.g., "Claude Opus 4", "GPT-4o").
3. User browses available libraries (e.g., "React", "Next.js", "Express").
4. User selects a library.
5. User sees a scored list of that library's versions, color-coded by risk level.
6. User sees a simple description of the risk level (e.g., "high risk as it has breaking changes from the LLM's cutoff date, low risk as it is from before the cutoff, etc.").
7. User makes an informed decision about which version to use with their chosen LLM.

## 5. Functional Requirements

### 5.1 LLM Management

| ID | Requirement |
|----|-------------|
| FR-01 | The system shall store LLM entries with: id, name, provider, approximate training cutoff date (Unix ms), created_at, updated_at. |
| FR-02 | The system shall expose a `GET /api/llms` endpoint returning all LLMs. |
| FR-03 | LLM data is seeded manually in v1 (no admin UI for CRUD). |

### 5.2 Library & Version Management

| ID | Requirement |
|----|-------------|
| FR-04 | The system shall store libraries with: id, name, ecosystem/package manager, description, created_at, updated_at. |
| FR-05 | The system shall store versions with: id, library relation, version string, release date, breaking flag, created_at, updated_at. |
| FR-06 | The system shall expose a `GET /api/libraries` endpoint with offset-based pagination (`?page=&limit=`). |
| FR-07 | Library and version data is seeded manually or via future cron ingestion. |

### 5.3 Compatibility Scoring

| ID | Requirement |
|----|-------------|
| FR-08 | The system shall compute a compatibility score (0-100) for each (LLM, library version) pair. |
| FR-09 | Score rules (v1): |
| | - `release_date <= cutoff`: base score 85-100 (closer to cutoff = slightly lower). |
| | - `release_date` within 6 months after cutoff: score 50-70. |
| | - `release_date > cutoff + 6 months`: score 10-40. |
| | - `breaking === true`: apply -15 penalty. |
| | - Final score clamped to [0, 100]. |
| FR-10 | Risk classification: `score >= 70` = "low", `score >= 40` = "medium", `score < 40` = "high". |
| FR-11 | Each score result includes a human-readable `reason` string. |
| FR-12 | The system shall expose a `GET /api/compatibility` endpoint with pagination (`?llm_id=&library_id=&page=&limit=`). |
| FR-13 | Score computation is pure (no side effects, no DB writes for computed results). |

### 5.4 User Interface

| ID | Requirement |
|----|-------------|
| FR-14 | The UI shall provide an LLM selector (dropdown or list). |
| FR-15 | The UI shall display libraries in a browsable, searchable list. |
| FR-16 | The UI shall display version compatibility scores with color coding: green (low risk), yellow (medium risk), red (high risk). |
| FR-17 | The UI shall display a disclaimer: "This score is heuristic and aims to reduce errors without additional context." |
| FR-18 | The UI shall never use the phrase "officially supported". |
| FR-19 | The UI shall be responsive (mobile-friendly). |
| FR-20 | The UI shall support dark mode (default) and light mode with a toggle. |

## 6. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Built with Next.js 16 (App Router), TypeScript. |
| NFR-02 | Styled with Radix UI components and Tailwind CSS. |
| NFR-03 | Database: PostgreSQL with Prisma 7 ORM (Neon-compatible). |
| NFR-04 | Domain logic is pure TypeScript — zero imports from Next.js, Prisma, or any framework. |
| NFR-05 | Architecture follows DDD + Clean Architecture principles. |
| NFR-06 | Domain services must have unit test coverage (score logic is priority). |
| NFR-07 | English language throughout (code, UI, docs). |

For detailed technical design, see the [TRD document](./TRD.md).

## 7. Seed Data (v1)

### LLMs
| Name | Provider | Approx Cutoff |
|------|----------|---------------|
| GPT-4o | OpenAI | 2024-10 |
| GPT-4 Turbo | OpenAI | 2024-04 |
| Claude Opus 4 | Anthropic | 2025-03 |
| Claude Sonnet 4 | Anthropic | 2025-03 |
| Gemini 2.0 Flash | Google | 2024-08 |

### Libraries (sample)
| Name | Ecosystem |
|------|-----------|
| react | npm |
| next | npm |
| typescript | npm |
| prisma | npm |
| tailwindcss | npm |
| express | npm |
| vue | npm |
| angular | npm |
| svelte | npm |
| fastify | npm |

Each library should have at least 3-5 recent versions with real release dates and breaking flags.

## 8. Out of Scope for v1

- No real LLM API integration.
- No automated version ingestion from deps.dev or npm.
- No benchmarks or real inference tests.
- No admin UI for managing LLMs/libraries.
- No user accounts or authentication.
- No browser extension or CLI tool.
- No community contributions.

## 9. Success Criteria

- User can select an LLM and see scored library versions.
- Scores are consistent with the defined rules.
- Domain scoring logic has unit test coverage.
- UI is responsive, clean, and uses dark mode by default.
- All API endpoints work with correct pagination.
- Codebase follows clean architecture with pure domain layer.
