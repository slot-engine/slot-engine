import assert from "assert"
import { RandomNumberGenerator } from "../service/rng"

export function hashStringToInt(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function splitCountsAcrossChunks(
  totalCounts: Record<string, number>,
  chunkSizes: number[],
) {
  const total = chunkSizes.reduce((a, b) => a + b, 0)
  const allCriteria = Object.keys(totalCounts)

  const totalCountsSum = allCriteria.reduce((s, c) => s + (totalCounts[c] ?? 0), 0)
  assert(
    totalCountsSum === total,
    `Counts (${totalCountsSum}) must match chunk total (${total}).`,
  )

  const perChunk: Array<Record<string, number>> = chunkSizes.map(() => ({}))

  for (const criteria of allCriteria) {
    const count = totalCounts[criteria] ?? 0
    if (count <= 0) {
      for (let i = 0; i < chunkSizes.length; i++) perChunk[i]![criteria] = 0
      continue
    }

    let chunks = chunkSizes.map((size) => (count * size) / total)
    chunks = chunks.map((x) => Math.floor(x))
    let assigned = chunks.reduce((a, b) => a + b, 0)
    let remaining = count - assigned

    const remainders = chunks
      .map((x, i) => ({ i, r: x - Math.floor(x) }))
      .sort((a, b) => b.r - a.r)

    for (let i = 0; i < chunkSizes.length; i++) {
      perChunk[i]![criteria] = chunks[i]!
    }

    let idx = 0
    while (remaining > 0) {
      perChunk[remainders[idx]!.i]![criteria]! += 1
      remaining--
      idx = (idx + 1) % remainders.length
    }
  }

  // Second pass: enforce per-chunk totals exactly match chunkSizes
  const chunkTotals = () =>
    perChunk.map((m) => Object.values(m).reduce((s, v) => s + v, 0))

  let totals = chunkTotals()

  const getDeficits = () => totals.map((t, i) => chunkSizes[i]! - t)

  let deficits = getDeficits()

  // Move counts from surplus chunks to deficit chunks (deterministic order)
  for (let dst = 0; dst < chunkSizes.length; dst++) {
    while (deficits[dst]! > 0) {
      // find a donor chunk with surplus
      const src = deficits.findIndex((d) => d < 0)
      assert(src !== -1, "No surplus chunk found, but deficits remain.")

      // find a criteria to move
      const crit = allCriteria.find((c) => (perChunk[src]![c] ?? 0) > 0)
      assert(crit, `No movable criteria found from surplus chunk ${src}.`)

      perChunk[src]![crit]! -= 1
      perChunk[dst]![crit] = (perChunk[dst]![crit] ?? 0) + 1

      totals[src]! -= 1
      totals[dst]! += 1
      deficits[src]! += 1
      deficits[dst]! -= 1
    }
  }

  // Final sanity
  totals = chunkTotals()
  for (let i = 0; i < chunkSizes.length; i++) {
    assert(
      totals[i] === chunkSizes[i],
      `Chunk ${i} size mismatch. Expected ${chunkSizes[i]}, got ${totals[i]}`,
    )
  }
  for (const c of allCriteria) {
    const sum = perChunk.reduce((s, m) => s + (m[c] ?? 0), 0)
    assert(sum === (totalCounts[c] ?? 0), `Chunk split mismatch for criteria "${c}"`)
  }

  return perChunk
}

export function createCriteriaSampler(counts: Record<string, number>, seed: number) {
  const rng = new RandomNumberGenerator()
  rng.setSeed(seed)

  const keys = Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0)
  const remaining = Object.fromEntries(keys.map((k) => [k, counts[k] ?? 0])) as Record<
    string,
    number
  >
  let remainingTotal = Object.values(remaining).reduce((a, b) => a + b, 0)

  return () => {
    if (remainingTotal <= 0) return "N/A"

    const roll = Math.min(
      remainingTotal - Number.EPSILON,
      rng.randomFloat(0, remainingTotal),
    )

    let acc = 0
    for (const k of keys) {
      const w = remaining[k] ?? 0
      if (w <= 0) continue
      acc += w
      if (roll < acc) {
        remaining[k] = w - 1
        remainingTotal--
        return k
      }
    }

    // Fallback
    remainingTotal--
    return keys.find((k) => (remaining[k] ?? 0) > 0) ?? "N/A"
  }
}
