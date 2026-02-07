# Security Hardening for Production Release

**Date:** 2026-02-07
**Scope:** Production-ready security for open-source deployment on Vercel
**Status:** Approved

## Context

Hallunot is being prepared for production as an open-source app deployed on Vercel. A security audit identified gaps in headers, input validation, rate limiting, environment safety, and error handling.

## Findings Summary

- No security headers configured
- Manual, inconsistent input validation across API routes
- No rate limiting on API routes
- No `.env.example` or runtime env validation
- Mixed logging (`console.error` + Pino)
- No dependency audit script

## Design

### 1. Security Headers (`next.config.ts`)

Add `headers()` function returning:

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | geolocation=(), microphone=(), camera=() |
| X-DNS-Prefetch-Control | on |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |

No CSP in this iteration — add later with report-only mode.

### 2. Input Validation with Zod (`src/lib/validation.ts`)

New dependency: `zod`

Schemas for each route:

- `/api/search` — `q` (1-200 chars), `page` (positive int), `per_page` (1-100), `platforms` (optional, max 50), `sort` (optional enum)
- `/api/llms` — `page` (positive int), `per_page` (1-100), `provider` (optional, max 100), `q` (optional, max 200)
- `/api/score` — `llm` (1-200 chars), `library` (1-200 chars), `platform` (optional, max 50, default "NPM")

Replace manual validation in route handlers with Zod `.safeParse()`.

### 3. Rate Limiting (`src/lib/rate-limit.ts`)

In-memory sliding window counter. No new dependencies.

- 30 requests/minute per IP
- Returns 429 with `Retry-After` header when exceeded
- Resets on Vercel cold starts (acceptable for abuse prevention)

Applied to all 4 API routes via a shared helper.

### 4. Environment Safety

- Create `.env.example` with placeholder values
- Create `src/lib/env.ts` with Zod validation for required env vars
- Fail fast at startup with clear error messages

### 5. Log Cleanup

- Replace `console.error` with Pino logger in platforms route
- Truncate logged query strings to 100 chars

### 6. Dependency Audit

- Run `npm audit` and fix findings
- Add `"audit": "npm audit"` script to package.json

## Files Changed

| File | Action |
|------|--------|
| `next.config.ts` | Edit — add security headers |
| `src/lib/validation.ts` | Create — Zod schemas |
| `src/lib/rate-limit.ts` | Create — in-memory rate limiter |
| `src/lib/env.ts` | Create — env var validation |
| `.env.example` | Create — template for contributors |
| `src/app/api/search/route.ts` | Edit — use Zod + rate limit |
| `src/app/api/llms/route.ts` | Edit — use Zod + rate limit |
| `src/app/api/score/route.ts` | Edit — use Zod + rate limit |
| `src/app/api/platforms/route.ts` | Edit — Pino logger + rate limit |
| `package.json` | Edit — add zod dep + audit script |

## Out of Scope

- Content-Security-Policy (follow-up with report-only mode)
- Upstash Redis rate limiting (upgrade path if needed)
- Automated Dependabot setup (GitHub repo setting, not code)
- Monitoring/observability infrastructure
