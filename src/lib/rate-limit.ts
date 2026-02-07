import { NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  limited: boolean
  ip: string
  remaining: number
  retryAfter?: number
  response?: NextResponse
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 30

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return "unknown"
}

export function rateLimit(request: Request): RateLimitResult {
  cleanup()

  const ip = getClientIp(request)
  const now = Date.now()

  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { limited: false, ip, remaining: MAX_REQUESTS - 1 }
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      limited: true,
      ip,
      remaining: 0,
      retryAfter,
      response: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      ),
    }
  }

  return { limited: false, ip, remaining: MAX_REQUESTS - entry.count }
}
