// src/domain/services/lcs/utils.ts

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Normalizes a value to [0,1] range.
 * Values below min → 0, above max → 1.
 */
export function normalize(
  value: number,
  options: { min: number; max: number }
): number {
  const { min, max } = options
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

/**
 * Inverse normalization - higher input → lower output.
 * Useful for "less is better" metrics (e.g., release frequency).
 */
export function normalizeInverse(
  value: number,
  options: { min: number; max: number }
): number {
  return 1 - normalize(value, options)
}

/**
 * Logarithmic normalization for values with extreme ranges (e.g., stars).
 * Prevents mega-popular libraries from dominating.
 */
export function normalizeLog(
  value: number,
  options: { max: number }
): number {
  if (value <= 0) return 0
  const logValue = Math.log10(value + 1)
  const logMax = Math.log10(options.max + 1)
  return clamp(logValue / logMax, 0, 1)
}

/**
 * Days between a date and now.
 */
export function daysSince(date: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24))
}
