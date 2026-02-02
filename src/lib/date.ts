export function msToMonths(ms: number): number {
  return ms / (30 * 24 * 60 * 60 * 1000)
}

/**
 * Converts a "YYYY-MM" string to Unix milliseconds.
 * Returns the timestamp for the first day of the month at midnight UTC.
 * Returns undefined if the input is invalid or undefined.
 */
export function knowledgeCutoffToMs(cutoff: string | undefined): number | undefined {
  if (!cutoff) return undefined

  const match = cutoff.match(/^(\d{4})-(\d{2})$/)
  if (!match) return undefined

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1 // JS months are 0-indexed

  return Date.UTC(year, month, 1)
}

export function formatDate(unixMs: number): string {
  return new Date(unixMs).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
