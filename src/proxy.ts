import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

function extractParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    params[key] = value.length > 100 ? value.slice(0, 100) + "..." : value
  }
  return params
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const params = extractParams(searchParams)

  const rl = rateLimit(request)

  const log = logger.child({
    route: pathname,
    method: request.method,
    ip: rl.ip,
  })

  if (rl.limited) {
    log.warn(
      { params, retryAfter: rl.retryAfter },
      `-> ${request.method} ${pathname} [429 Too Many Requests] retry in ${rl.retryAfter}s`
    )
    return rl.response
  }

  log.info(
    { params, remaining: rl.remaining },
    `-> ${request.method} ${pathname}${searchParams.size > 0 ? `?${searchParams}` : ""} [${rl.remaining} req left]`
  )

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
