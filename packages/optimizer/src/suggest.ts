import type { OptimizationTarget } from "./types"

export interface SuggestTargetsInput {
  /** Book counts per ResultSet criteria. */
  criteriaBookCounts: Record<string, number>
  /** Highest payout multiplier observed (e.g. from LUT or maxWinX). */
  maxWinX: number
  /** Total simulated books (optional; inferred from counts). */
  totalBooks?: number
}

/**
 * Heuristic optimizer targets: absorber `0`, hitRates from book shares,
 * dedicated maxwin if present.
 */
export function suggestOptimizationTargets(
  input: SuggestTargetsInput,
): Record<string, OptimizationTarget> {
  const counts = input.criteriaBookCounts
  const total =
    input.totalBooks ?? Object.values(counts).reduce((a, b) => a + b, 0)
  const targets: Record<string, OptimizationTarget> = {}

  const names = Object.keys(counts)
  const hasZero = names.includes("0")
  const hasMax = names.includes("maxwin")

  if (hasZero) targets["0"] = {}

  for (const name of names) {
    if (name === "0") continue
    const n = counts[name] ?? 0
    if (n <= 0) continue
    if (name === "maxwin") {
      const share = total > 0 ? n / total : 0
      const hitRate = Math.max(1, Math.round(share > 0 ? 1 / share : 100_000))
      targets.maxwin = { hitRate: Math.max(hitRate, 10_000) }
      continue
    }
    const share = total > 0 ? n / total : 0
    targets[name] = { hitRate: Math.max(1, Math.round(1 / Math.max(share, 1e-6))) }
  }

  if (!hasZero) {
    const absorber = names.find((n) => n !== "maxwin") ?? names[0]
    if (absorber && targets[absorber]) {
      delete targets[absorber].hitRate
    } else if (absorber) {
      targets[absorber] = {}
    }
  }

  void input.maxWinX
  return targets
}
